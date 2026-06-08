import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifySession from '@fastify/session'
import fastifyPassport from '@fastify/passport'
import connectPgSimple from 'connect-pg-simple'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { createContext } from './trpc.js'
import { appRouter } from './router/index.js'
import { registerAuth } from './auth/strategy.js'
import { registerWorkers } from './jobs/workers.js'
import { prisma } from './db.js'
import { streamChatHandler } from './ai/stream.js'

async function main() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV !== 'production'
        ? { level: 'info' }
        : { level: 'warn' },
    trustProxy: true,
    bodyLimit: 1_048_576, // 1 MB — prevents oversized payload DoS
  })

  // Cookie (required by @fastify/session)
  await app.register(fastifyCookie)

  // CORS — allow configured origin(s) in prod, all in dev
  const corsOrigin: string | string[] | boolean = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : process.env.NODE_ENV !== 'production'
  await app.register(fastifyCors, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // Session store (connect-pg-simple compatible with @fastify/session)
  const PgStore = connectPgSimple(fastifySession as any)
  const sessionStore = new (PgStore as any)({
    conString: process.env.DATABASE_URL!,
    createTableIfMissing: true,
  })

  // Sessions
  await app.register(fastifySession, {
    secret: process.env.SESSION_SECRET ?? 'fallback_secret_change_in_production_32chars',
    cookie: {
      secure: true,          // always HTTPS (Railway terminates TLS)
      httpOnly: true,
      sameSite: 'none',      // cross-origin cross-site fetch (frontend ≠ api subdomain)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: sessionStore,
    saveUninitialized: false,
  })

  // Passport
  await app.register(fastifyPassport.initialize())
  await app.register(fastifyPassport.secureSession())

  // Auth routes (login / logout / me)
  await registerAuth(app)

  // tRPC
  await app.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: { router: appRouter, createContext },
  })

  // AI streaming (SSE, outside tRPC)
  app.post('/api/ai/stream', streamChatHandler)

  // Rewards XLSX export
  app.get('/api/export/rewards', async (req, reply) => {
    if (!req.user) return reply.status(401).send()
    const rewards = await prisma.rewardAssignment.findMany({
      include: {
        idea: { include: { author: true } },
        assignedBy: { select: { name: true } },
      },
    })
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Реестр вознаграждений')
    ws.columns = [
      { header: 'Автор', key: 'author', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Идея', key: 'title', width: 45 },
      { header: 'Грейд', key: 'grade', width: 8 },
      { header: 'Сумма, ₽', key: 'amount', width: 15 },
      { header: 'Назначил', key: 'assignedBy', width: 20 },
      { header: 'Дата', key: 'date', width: 15 },
    ]
    rewards.forEach((r) => {
      ws.addRow({
        author: r.idea.author.name,
        email: r.idea.author.email,
        title: (r.idea.cardData as any).title ?? '',
        grade: r.grade,
        amount: r.amount ?? '',
        assignedBy: r.assignedBy.name,
        date: r.createdAt.toLocaleDateString('ru-RU'),
      })
    })
    const buf = await wb.xlsx.writeBuffer()
    return reply
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      .header('Content-Disposition', 'attachment; filename=rewards.xlsx')
      .send(buf)
  })

  // Analytics XLSX export
  app.get('/api/export/analytics', async (req, reply) => {
    if (!req.user) return reply.status(401).send()
    const query = req.query as Record<string, string>
    const period = (['quarter', 'half', 'year'] as const).includes(query.period as any)
      ? (query.period as 'quarter' | 'half' | 'year')
      : 'year'
    const months = period === 'quarter' ? 3 : period === 'half' ? 6 : 12
    const since = new Date(); since.setMonth(since.getMonth() - months)

    const STATUS_LABELS: Record<string, string> = {
      draft: 'Черновики', mod: 'На модерации', rework: 'На доработке',
      list: 'В общем списке', expert: 'На экспертизе', work: 'Взято в работу', done: 'Реализовано',
    }
    const periodLabel = period === 'quarter' ? 'Квартал' : period === 'half' ? 'Полугодие' : 'Год'

    const [totalIdeas, inWork, done, authorGroups, funnelCounts, topIdeas] = await Promise.all([
      prisma.idea.count({ where: { createdAt: { gte: since } } }),
      prisma.idea.count({ where: { status: 'work' } }),
      prisma.idea.count({ where: { status: 'done', updatedAt: { gte: since } } }),
      prisma.idea.groupBy({ by: ['authorId'], where: { createdAt: { gte: since } } }),
      Promise.all(
        (['draft','mod','rework','list','expert','work','done'] as const).map((s) =>
          prisma.idea.count({ where: { status: s, createdAt: { gte: since } } })
        )
      ),
      prisma.idea.findMany({
        where: { status: { in: ['list','expert','work','done'] }, createdAt: { gte: since } },
        include: { author: { select: { name: true, dept: true } }, _count: { select: { votes: true } } },
        orderBy: { votes: { _count: 'desc' } },
        take: 20,
      }),
    ])

    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Банка Идей · АУР'

    // Sheet 1: KPI summary
    const ws1 = wb.addWorksheet('Сводка KPI')
    ws1.columns = [{ header: 'Показатель', key: 'k', width: 35 }, { header: 'Значение', key: 'v', width: 20 }]
    ws1.addRow({ k: 'Период', v: periodLabel })
    ws1.addRow({ k: 'Идей подано', v: totalIdeas })
    ws1.addRow({ k: 'В работе (активные)', v: inWork })
    ws1.addRow({ k: 'Реализовано за период', v: done })
    ws1.addRow({ k: 'Уникальных авторов', v: authorGroups.length })
    if (totalIdeas > 0) ws1.addRow({ k: 'Конверсия в реализацию', v: `${Math.round((done / totalIdeas) * 100)}%` })

    // Sheet 2: Funnel
    const ws2 = wb.addWorksheet('Воронка по статусам')
    ws2.columns = [{ header: 'Статус', key: 'status', width: 25 }, { header: 'Количество', key: 'count', width: 15 }]
    const funnelStatuses = ['draft','mod','rework','list','expert','work','done'] as const
    funnelStatuses.forEach((s, i) => ws2.addRow({ status: STATUS_LABELS[s] ?? s, count: funnelCounts[i] }))

    // Sheet 3: Top ideas
    const ws3 = wb.addWorksheet('Топ идей')
    ws3.columns = [
      { header: '№', key: 'rank', width: 6 },
      { header: 'Название', key: 'title', width: 50 },
      { header: 'Автор', key: 'author', width: 25 },
      { header: 'Отдел', key: 'dept', width: 25 },
      { header: 'Голосов', key: 'votes', width: 12 },
      { header: 'Статус', key: 'status', width: 20 },
    ]
    topIdeas.forEach((idea, i) => {
      ws3.addRow({
        rank: i + 1,
        title: (idea.cardData as any).title ?? '',
        author: idea.isAnonymous ? 'Аноним' : idea.author.name,
        dept: idea.isAnonymous ? '' : idea.author.dept,
        votes: idea._count.votes,
        status: STATUS_LABELS[idea.status] ?? idea.status,
      })
    })

    const buf = await wb.xlsx.writeBuffer()
    const filename = `analytics-${period}-${new Date().toISOString().slice(0,10)}.xlsx`
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buf)
  })

  // Health check
  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', ts: new Date().toISOString() }
  })

  // Start background workers
  try {
    await registerWorkers()
  } catch (e) {
    console.warn('[pg-boss] Workers init failed (non-fatal):', e)
  }

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`[api] Listening on :${port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
