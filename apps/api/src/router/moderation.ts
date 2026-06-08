import { z } from 'zod'
import { router, curatorProcedure } from '../trpc.js'
import { evaluateIdea } from '../ai/evaluate.js'
import { MODERATED_STATUSES } from '@portal/types'
import { enqueueNotification, enqueueReindex } from '../jobs/index.js'

export const moderationRouter = router({
  setStatus: curatorProcedure
    .input(
      z.object({
        ideaId: z.string(),
        status: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUniqueOrThrow({
        where: { id: input.ideaId },
      })
      const updated = await ctx.prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: input.status },
      })
      await ctx.prisma.ideaStatusLog.create({
        data: {
          ideaId: input.ideaId,
          fromStatus: idea.status,
          toStatus: input.status,
          actorId: ctx.user.id,
          comment: input.comment,
        },
      })
      const STATUS_POINTS: Record<string, number> = {
        list: 20, expert: 30, work: 50, done: 100,
      }
      const pts = STATUS_POINTS[input.status]
      if (pts) {
        await ctx.prisma.pointLedger.create({
          data: { userId: idea.authorId, delta: pts, reason: 'status_' + input.status, refIdeaId: input.ideaId },
        }).catch(() => {})
      }
      if (input.status === 'done') {
        await ctx.prisma.userBadge.create({
          data: { userId: idea.authorId, badgeType: 'idea_realized' },
        }).catch(() => {})
      }
      await enqueueNotification({
        userId: idea.authorId,
        text: `Статус вашей идеи «${(idea.cardData as any).title ?? 'без названия'}» изменён`,
        icon: ['work', 'done'].includes(input.status) ? 'checkCircle' : 'bell',
        accent: ['work', 'done'].includes(input.status),
      })
      if (MODERATED_STATUSES.includes(input.status as any)) {
        await enqueueReindex(input.ideaId)
      }
      // Re-evaluate when idea returns to moderation queue
      if (input.status === 'mod') {
        evaluateIdea(input.ideaId).catch((e) =>
          console.error('[AI eval] Failed for', input.ideaId, e?.message)
        )
      }
      return updated
    }),

  assignImplementer: curatorProcedure
    .input(
      z.object({
        ideaId: z.string(),
        assigneeId: z.string(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.implementation.upsert({
        where: { ideaId: input.ideaId },
        update: {
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
        create: {
          ideaId: input.ideaId,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      })
    }),

  addInternalNote: curatorProcedure
    .input(z.object({ ideaId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: {
          ideaId: input.ideaId,
          authorId: ctx.user.id,
          body: input.body,
          isInternal: true,
        },
      })
    }),

  linkDuplicate: curatorProcedure
    .input(z.object({ ideaId: z.string(), originalIdeaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: 'duplicate' },
      })
      await ctx.prisma.ideaStatusLog.create({
        data: {
          ideaId: input.ideaId,
          fromStatus: updated.status,
          toStatus: 'duplicate',
          actorId: ctx.user.id,
          comment: `Дубликат идеи ${input.originalIdeaId}`,
        },
      })
      return updated
    }),
})
