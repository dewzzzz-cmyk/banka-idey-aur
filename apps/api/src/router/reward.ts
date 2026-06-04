import { z } from 'zod'
import { router, curatorProcedure } from '../trpc.js'

export const rewardRouter = router({
  assignGrade: curatorProcedure
    .input(
      z.object({
        ideaId: z.string(),
        grade: z.enum(['S', 'M', 'L']),
        amount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rewardAssignment.upsert({
        where: { ideaId: input.ideaId },
        update: {
          grade: input.grade,
          amount: input.amount,
          assignedById: ctx.user.id,
        },
        create: {
          ideaId: input.ideaId,
          grade: input.grade,
          amount: input.amount,
          assignedById: ctx.user.id,
        },
      })
    }),

  listForExport: curatorProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rewardAssignment.findMany({
      include: {
        idea: {
          include: {
            author: { select: { name: true, email: true, dept: true } },
          },
        },
        assignedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),
})
