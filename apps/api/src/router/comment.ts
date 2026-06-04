import { z } from 'zod'
import { router, protectedProcedure, curatorProcedure } from '../trpc.js'

export const commentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        ideaId: z.string(),
        includeInternal: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.comment.findMany({
        where: {
          ideaId: input.ideaId,
          isInternal: input.includeInternal ? undefined : false,
          parentId: null,
        },
        include: {
          author: { select: { name: true, dept: true } },
          replies: {
            include: { author: { select: { name: true, dept: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  add: protectedProcedure
    .input(
      z.object({
        ideaId: z.string(),
        body: z.string().min(1),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: {
          ideaId: input.ideaId,
          authorId: ctx.user.id,
          body: input.body,
          parentId: input.parentId,
        },
        include: { author: { select: { name: true, dept: true } } },
      })
    }),

  addInternal: curatorProcedure
    .input(z.object({ ideaId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: {
          ideaId: input.ideaId,
          authorId: ctx.user.id,
          body: input.body,
          isInternal: true,
        },
        include: { author: { select: { name: true, dept: true } } },
      })
    }),
})
