import { z } from 'zod'
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
    .query(async ({ ctx }) => {
      const ideas = await ctx.prisma.idea.findMany({
        where: { status: { in: ['list', 'expert', 'work', 'done'] } },
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
    .mutation(async ({ input }) => {
      evaluateIdea(input.ideaId).catch((e) =>
        console.error('[AI eval] requestEvaluation failed for', input.ideaId, e?.message)
      )
      return { queued: true }
    }),

  // Temporary debug endpoint — synchronously evaluates and returns result or error
  debugEval: curatorProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await evaluateIdea(input.ideaId)
        return { ok: true, overall: result.overall, summary: result.summary.slice(0, 100) }
      } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e).slice(0, 300) }
      }
    }),
})
