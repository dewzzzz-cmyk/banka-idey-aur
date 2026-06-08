import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, curatorProcedure } from '../trpc.js'
import { evaluateIdea } from '../ai/evaluate.js'

export const aiRouter = router({
  // Streaming happens via POST /api/ai/stream (SSE, not tRPC)
  // This procedure informs the frontend where to stream
  sendMessage: protectedProcedure
    .input(z.object({ sessionId: z.string().optional(), message: z.string() }))
    .mutation(async () => {
      return { streaming: true, endpoint: '/api/ai/stream' }
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aiSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
      })
    }),

  checkDuplicate: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ ctx, input }) => {
      const term = input.text.trim()
      // Prisma JSON path filters are unreliable on JSONB — use raw SQL for text search
      const matchedIds = term
        ? (await ctx.prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "ideas"
            WHERE status IN ('list','expert','work','done')
              AND "cardData"::text ILIKE ${`%${term}%`}
            LIMIT 5
          `).map((r) => r.id)
        : null
      const ideas = await ctx.prisma.idea.findMany({
        where: {
          status: { in: ['list', 'expert', 'work', 'done'] },
          ...(matchedIds !== null ? { id: { in: matchedIds } } : {}),
        },
        select: { id: true, cardData: true },
        take: 5,
      })
      return {
        similarIdeas: ideas.map((i) => ({
          id: i.id,
          title: (i.cardData as any).title ?? '',
        })),
      }
    }),

  requestEvaluation: curatorProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUnique({ where: { id: input.ideaId } })
      if (!idea) throw new TRPCError({ code: 'NOT_FOUND', message: 'Идея не найдена' })
      evaluateIdea(input.ideaId).catch((e) =>
        console.error('[AI eval] requestEvaluation failed for', input.ideaId, e?.message)
      )
      return { queued: true }
    }),
})
