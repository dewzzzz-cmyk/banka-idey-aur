import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'

const periodInput = z.object({
  period: z.enum(['quarter', 'half', 'year']).default('quarter'),
})

function periodStart(period: 'quarter' | 'half' | 'year') {
  const now = new Date()
  const months = period === 'quarter' ? 3 : period === 'half' ? 6 : 12
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return d
}

export const analyticsRouter = router({
  getKpi: protectedProcedure.input(periodInput).query(async ({ ctx, input }) => {
    const since = periodStart(input.period)
    const [totalIdeas, inWork, done, authors] = await Promise.all([
      ctx.prisma.idea.count({ where: { createdAt: { gte: since } } }),
      ctx.prisma.idea.count({ where: { status: 'work' } }),
      ctx.prisma.idea.count({ where: { status: 'done', updatedAt: { gte: since } } }),
      ctx.prisma.idea
        .groupBy({ by: ['authorId'], where: { createdAt: { gte: since } } })
        .then((r) => r.length),
    ])
    return { totalIdeas, inWork, done, uniqueAuthors: authors }
  }),

  getFunnel: protectedProcedure.input(periodInput).query(async ({ ctx, input }) => {
    const since = periodStart(input.period)
    const statuses = ['draft', 'mod', 'rework', 'list', 'expert', 'work', 'done'] as const
    const counts = await Promise.all(
      statuses.map((s) =>
        ctx.prisma.idea.count({ where: { status: s, createdAt: { gte: since } } })
      )
    )
    return statuses.map((s, i) => ({ status: s, count: counts[i] }))
  }),

  getRatings: protectedProcedure.input(periodInput).query(async ({ ctx, input }) => {
    const since = periodStart(input.period)
    const ideas = await ctx.prisma.idea.findMany({
      where: {
        status: { in: ['list', 'expert', 'work', 'done'] },
        createdAt: { gte: since },
      },
      include: {
        author: { select: { name: true, dept: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { votes: { _count: 'desc' } },
      take: 20,
    })
    return ideas.map((i) => ({
      id: i.id,
      title: (i.cardData as any).title ?? '',
      votes: i._count.votes,
      status: i.status,
      authorName: i.isAnonymous ? 'Аноним' : i.author.name,
    }))
  }),

  getEffectSummary: protectedProcedure.input(periodInput).query(async ({ ctx, input }) => {
    const since = periodStart(input.period)
    const impls = await ctx.prisma.implementation.findMany({
      where: {
        effectFact: { not: null },
        updatedAt: { gte: since },
      },
      include: {
        idea: { select: { cardData: true } },
      },
    })
    return impls.map((i) => ({
      title: (i.idea.cardData as any).title ?? '',
      effectFact: i.effectFact,
    }))
  }),
})
