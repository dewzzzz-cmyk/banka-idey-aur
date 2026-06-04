import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'

export const notificationRouter = router({
  listMy: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    })
    return { count }
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        await ctx.prisma.notification.updateMany({
          where: { id: input.id, userId: ctx.user.id },
          data: { isRead: true },
        })
      } else {
        await ctx.prisma.notification.updateMany({
          where: { userId: ctx.user.id, isRead: false },
          data: { isRead: true },
        })
      }
      return { ok: true }
    }),
})
