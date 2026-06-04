import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'

export const implementationRouter = router({
  updateSteps: protectedProcedure
    .input(
      z.object({
        ideaId: z.string(),
        steps: z.array(z.object({ label: z.string(), done: z.boolean() })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.implementation.update({
        where: { ideaId: input.ideaId },
        data: { steps: input.steps },
      })
    }),

  setEffectFact: protectedProcedure
    .input(z.object({ ideaId: z.string(), effectFact: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.implementation.update({
        where: { ideaId: input.ideaId },
        data: { effectFact: input.effectFact },
      })
    }),
})
