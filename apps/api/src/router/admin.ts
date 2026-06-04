import { z } from 'zod'
import { router, adminProcedure, protectedProcedure, curatorProcedure } from '../trpc.js'
import { CAT_LABELS } from '@portal/types'

export const adminRouter = router({
  updatePrompt: adminProcedure
    .input(z.object({ body: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const latest = await ctx.prisma.aiPrompt.findFirst({
        orderBy: { version: 'desc' },
      })
      const newVersion = (latest?.version ?? 0) + 1
      await ctx.prisma.aiPrompt.updateMany({ data: { isActive: false } })
      return ctx.prisma.aiPrompt.create({
        data: {
          version: newVersion,
          body: input.body,
          isActive: true,
          createdById: ctx.user.id,
        },
      })
    }),

  getPrompt: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.aiPrompt.findFirst({
      orderBy: { version: 'desc' },
      where: { isActive: true },
    })
  }),

  manageUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({ orderBy: { name: 'asc' } })
  }),

  setUserActive: adminProcedure
    .input(z.object({ userId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: input.isActive },
      })
    }),

  getCategories: protectedProcedure.query(async () => {
    return Object.entries(CAT_LABELS).map(([key, label]) => ({ key, label }))
  }),

  upsertCategory: adminProcedure
    .input(z.object({ key: z.string(), label: z.string() }))
    .mutation(async () => {
      // Categories are defined in @portal/types; this is a stub for future dynamic categories
      return { ok: true }
    }),

  uploadKnowledge: adminProcedure
    .input(z.object({ title: z.string(), body: z.string(), chunkType: z.string().default('regulation') }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.knowledgeChunk.create({
        data: { title: input.title, body: input.body, chunkType: input.chunkType },
      })
    }),

  getDirections: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.direction.findMany({ orderBy: { name: 'asc' } })
  }),

  upsertDirection: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        curatorId: z.string().optional(),
        categories: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.prisma.direction.update({
          where: { id: input.id },
          data: { name: input.name, curatorId: input.curatorId, categories: input.categories },
        })
      }
      return ctx.prisma.direction.create({
        data: { name: input.name, curatorId: input.curatorId, categories: input.categories },
      })
    }),

  getAuditLog: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.ideaStatusLog.findMany({
      include: {
        idea: { select: { cardData: true } },
        actor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }),

  getRewardRegistry: curatorProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rewardAssignment.findMany({
      include: {
        idea: {
          include: { author: { select: { name: true, email: true, dept: true } } },
        },
        assignedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),
})
