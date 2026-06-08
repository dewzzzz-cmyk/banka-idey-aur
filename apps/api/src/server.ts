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
