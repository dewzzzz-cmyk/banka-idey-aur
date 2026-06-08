import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { evaluateIdea } from '../ai/evaluate.js'
import type { IdeaCardData, IdeaStatus, IdeaCategory, AiEvaluation } from '@portal/types'
import { MODERATED_STATUSES } from '@portal/types'
import { enqueueNotification, enqueueReindex } from '../jobs/index.js'

const cardDataSchema = z.object({
  title:          z.string().max(200).default(''),
  problem:        z.string().max(5000).default(''),
  who:            z.string().max(2000).default(''),
  proposal:       z.string().max(5000).default(''),
  resources:      z.string().max(2000).default(''),
  effect:         z.string().max(2000).default(''),
  effectEstimate: z.string().max(500).default(''),
  openQuestions:  z.string().max(2000).default(''),
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

      const isPrivileged = ctx.user.roles.some((r: string) =>
        ['curator', 'admin', 'owner', 'committee'].includes(r)
      )
      const canSeeAnon = isPrivileged

      const andClauses: any[] = []

      // Draft visibility: non-privileged users only see their own drafts
      if (!isPrivileged) {
        if (input.status === 'draft') {
          // Explicitly requesting drafts: only own drafts
          where.authorId = ctx.user.id
        } else if (!input.status && !input.mine) {
          // General listing: exclude other users' drafts
          andClauses.push({
            OR: [
              { status: { not: 'draft' } },
              { status: 'draft', authorId: ctx.user.id },
            ],
          })
        }
      }

      // Confidential ideas: only visible to author or privileged roles
      if (!isPrivileged && !input.mine) {
        andClauses.push({
          OR: [
            { isConfidential: false },
            { isConfidential: true, authorId: ctx.user.id },
          ],
        })
      }

      // Search: Prisma JSON path filters are unreliable on JSONB in PostgreSQL,
      // so we use a raw SQL query to get matching IDs, then filter by them.
      if (input.search?.trim()) {
        const term = `%${input.search.trim()}%`
        const matchingIds = await ctx.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Idea"
          WHERE "cardData"::text ILIKE ${term}
        `
        // Always add id filter — empty array → no results (correct behaviour)
        where.id = { in: matchingIds.map((r) => r.id) }
      }

      if (andClauses.length > 0) where.AND = andClauses

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
        items: ideas.map((i) => {
          // Author anonymization: hide identity unless privileged OR own idea
          const hideAuthor = i.isAnonymous && !canSeeAnon && i.authorId !== ctx.user.id
          return {
            id: i.id,
            status: i.status as IdeaStatus,
            category: i.category as IdeaCategory,
            cardData: i.cardData as unknown as IdeaCardData,
            isConfidential: i.isConfidential,
            isAnonymous: i.isAnonymous,
            authorId:   hideAuthor ? 'anonymous' : i.authorId,
            authorName: hideAuthor ? 'Аноним'    : i.author.name,
            authorDept: hideAuthor ? ''           : i.author.dept,
            votes: i._count.votes,
            votedByMe: i.votes.length > 0,
            comments: i._count.comments,
            views: i.viewCount,
            createdAt: i.createdAt.toISOString(),
            assigneeName: (i.implementation as any)?.assignee?.name ?? undefined,
            dueDate: (i.implementation as any)?.dueDate?.toISOString() ?? undefined,
            effectFact: (i.implementation as any)?.effectFact ?? undefined,
            aiEvaluation: (i.aiEvaluation as AiEvaluation | null) ?? undefined,
          }
        }),
        total,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUnique({
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
      if (!idea) throw new TRPCError({ code: 'NOT_FOUND', message: 'Идея не найдена' })
      await ctx.prisma.idea.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      })
      return { ...idea, votedByMe: idea.votes.length > 0, aiEvaluation: idea.aiEvaluation as AiEvaluation | null | undefined }
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
      const idea = await ctx.prisma.idea.findUnique({
        where: { id: input.id },
      })
      if (!idea) throw new TRPCError({ code: 'NOT_FOUND', message: 'Идея не найдена' })
      if (idea.authorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Нет доступа к этой идее' })
      }
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
      // fire-and-forget — does not block the response
      evaluateIdea(input.id).catch((e) =>
        console.error('[AI eval] Failed for', input.id, e?.message)
      )
      return updated
    }),

  vote: protectedProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Self-vote guard: look up the idea author before allowing the vote
      const targetIdea = await ctx.prisma.idea.findUnique({
        where: { id: input.ideaId },
        select: { authorId: true },
      })
      if (!targetIdea) throw new TRPCError({ code: 'NOT_FOUND', message: 'Идея не найдена' })
      if (targetIdea.authorId === ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Нельзя голосовать за собственную идею' })
      }

      try {
        await ctx.prisma.vote.create({
          data: { userId: ctx.user.id, ideaId: input.ideaId },
        })
      } catch {
        // Ignore duplicate vote (unique constraint)
      }
      // Award 5 points to idea author
      await ctx.prisma.pointLedger.create({
        data: { userId: targetIdea.authorId, delta: 5, reason: 'idea_voted', refIdeaId: input.ideaId },
      }).catch(() => {})
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
