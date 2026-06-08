import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'
import type { IdeaCardData, IdeaStatus, IdeaCategory } from '@portal/types'
import { MODERATED_STATUSES } from '@portal/types'
import { enqueueNotification, enqueueReindex } from '../jobs/index.js'

const cardDataSchema = z.object({
  title: z.string().default(''),
  problem: z.string().default(''),
  who: z.string().default(''),
  proposal: z.string().default(''),
  resources: z.string().default(''),
  effect: z.string().default(''),
  effectEstimate: z.string().default(''),
  openQuestions: z.string().default(''),
})

export const ideaRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        category: z.string().optional(),
        mine: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}
      if (input.status) where.status = input.status
      if (input.category) where.category = input.category
      if (input.mine) where.authorId = ctx.user.id

      const canSeeAnon = ctx.user.roles.some((r: string) =>
        ['curator', 'admin', 'owner', 'committee'].includes(r)
      )

      const [ideas, total] = await Promise.all([
        ctx.prisma.idea.findMany({
          where,
          include: {
            author: { select: { name: true, dept: true } },
            _count: { select: { votes: true, comments: true } },
            votes: { where: { userId: ctx.user.id }, select: { id: true } },
            implementation: {
              select: {
                assigneeId: true,
                dueDate: true,
                effectFact: true,
                assignee: { select: { name: true } },
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          skip: input.offset,
          take: input.limit,
        }),
        ctx.prisma.idea.count({ where }),
      ])

      return {
        items: ideas.map((i) => ({
          id: i.id,
          status: i.status as IdeaStatus,
          category: i.category as IdeaCategory,
          cardData: i.cardData as unknown as IdeaCardData,
          isConfidential: i.isConfidential,
          isAnonymous: i.isAnonymous,
          authorId: i.isAnonymous && !canSeeAnon ? 'anonymous' : i.authorId,
          authorName: i.isAnonymous && !canSeeAnon ? 'Аноним' : i.author.name,
          authorDept: i.isAnonymous && !canSeeAnon ? '' : i.author.dept,
          votes: i._count.votes,
          votedByMe: i.votes.length > 0,
          comments: i._count.comments,
          views: i.viewCount,
          createdAt: i.createdAt.toISOString(),
          assigneeName: (i.implementation as any)?.assignee?.name ?? undefined,
          dueDate: (i.implementation as any)?.dueDate?.toISOString() ?? undefined,
          effectFact: (i.implementation as any)?.effectFact ?? undefined,
        })),
        total,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          author: { select: { name: true, dept: true } },
          _count: { select: { votes: true, comments: true } },
          votes: { where: { userId: ctx.user.id }, select: { id: true } },
          implementation: { include: { assignee: { select: { name: true } } } },
          rewardAssignment: true,
          statusLogs: {
            include: { actor: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      await ctx.prisma.idea.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      })
      return { ...idea, votedByMe: idea.votes.length > 0 }
    }),

  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        cardData: cardDataSchema,
        category: z.string().default('proc'),
        isAnonymous: z.boolean().default(false),
        isConfidential: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.prisma.idea.update({
          where: { id: input.id, authorId: ctx.user.id },
          data: { cardData: input.cardData, category: input.category },
        })
      }
      return ctx.prisma.idea.create({
        data: {
          authorId: ctx.user.id,
          status: 'draft',
          category: input.category,
          cardData: input.cardData,
          isAnonymous: input.isAnonymous,
          isConfidential: input.isConfidential,
        },
      })
    }),

  submit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUniqueOrThrow({
        where: { id: input.id, authorId: ctx.user.id },
      })
      const updated = await ctx.prisma.idea.update({
        where: { id: input.id },
        data: { status: 'mod' },
      })
      await ctx.prisma.ideaStatusLog.create({
        data: {
          ideaId: input.id,
          fromStatus: idea.status,
          toStatus: 'mod',
          actorId: ctx.user.id,
        },
      })
      await ctx.prisma.pointLedger.create({
        data: {
          userId: ctx.user.id,
          delta: 10,
          reason: 'idea_submitted',
          refIdeaId: input.id,
        },
      })
      return updated
    }),

  vote: protectedProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.vote.create({
          data: { userId: ctx.user.id, ideaId: input.ideaId },
        })
      } catch {
        // Ignore duplicate vote (unique constraint)
      }
      // Award 5 points to idea author when someone votes
      const votedIdea = await ctx.prisma.idea.findUnique({
        where: { id: input.ideaId },
        select: { authorId: true },
      })
      if (votedIdea && votedIdea.authorId !== ctx.user.id) {
        await ctx.prisma.pointLedger.create({
          data: { userId: votedIdea.authorId, delta: 5, reason: 'idea_voted', refIdeaId: input.ideaId },
        }).catch(() => {})
      }
      return { ok: true }
    }),

  unvote: protectedProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.vote.deleteMany({
        where: { userId: ctx.user.id, ideaId: input.ideaId },
      })
      return { ok: true }
    }),

  getMyPoints: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.pointLedger.aggregate({
      where: { userId: ctx.user.id },
      _sum: { delta: true },
    })
    return { total: result._sum.delta ?? 0 }
  }),
})
