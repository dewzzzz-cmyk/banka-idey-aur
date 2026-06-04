import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'

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
})
