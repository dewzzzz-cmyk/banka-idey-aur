import type { FastifyInstance } from 'fastify'
import fastifyPassport from '@fastify/passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { prisma } from '../db.js'

// Test credentials — replace with real LDAP when LDAP_URL is set
const TEST_CREDENTIALS: Record<string, string> = {
  'anna@can.ru':    'test123',
  'curator@can.ru': 'test123',
  'impl@can.ru':    'test123',
  'admin@can.ru':   'test123',
  'owner@can.ru':   'test123',
  'marat@can.ru':   'test123',
  'olga@can.ru':    'test123',
  'igor@can.ru':    'test123',
  'sergey@can.ru':  'test123',
}

// In-memory rate limiter for login (max 10 per minute per IP)
const _loginAttempts = new Map<string, { count: number; resetMs: number }>()
function _checkLoginRate(ip: string): boolean {
  const now = globalThis.Date.now()
  const e = _loginAttempts.get(ip)
  if (e && now < e.resetMs) {
    if (e.count >= 10) return false
    e.count++
  } else {
    if (_loginAttempts.size > 5000) for (const [k, v] of _loginAttempts) if (now >= v.resetMs) _loginAttempts.delete(k)
    _loginAttempts.set(ip, { count: 1, resetMs: now + 60_000 })
  }
  return true
}

export async function registerAuth(app: FastifyInstance) {
  // Local strategy (fallback when no LDAP_URL)
  fastifyPassport.use(
    'local',
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const emailLower = email.toLowerCase().trim()
          const expected = TEST_CREDENTIALS[emailLower]
          if (!expected || expected !== password) return done(null, false)

          const user = await prisma.user.findUnique({ where: { email: emailLower } })
          if (!user || !user.isActive) return done(null, false)
          return done(null, user)
        } catch (err) {
          return done(err)
        }
      }
    )
  )

  fastifyPassport.registerUserSerializer(async (user: any) => user.id)
  fastifyPassport.registerUserDeserializer(async (id: string) => {
    return prisma.user.findUnique({ where: { id } })
  })

  // POST /api/auth/login
  app.post(
    '/api/auth/login',
    {
      preValidation: [
        async (req: any, reply: any) => {
          if (!_checkLoginRate(req.ip ?? req.socket?.remoteAddress ?? 'unknown')) {
            return reply.code(429).send({
              statusCode: 429, error: 'Too Many Requests',
              message: 'Слишком много попыток входа. Попробуйте через минуту.',
            })
          }
        },
        fastifyPassport.authenticate('local', { session: true }),
      ],
    },
    async (req, reply) => {
      const user = req.user as any
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          dept: user.dept,
          roles: user.roles,
          createdAt: user.createdAt,
        },
      })
    }
  )

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (req, reply) => {
    await (req.session as any).destroy()
    return reply.send({ ok: true })
  })

  // GET /api/auth/me
  app.get('/api/auth/me', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ error: 'Unauthorized' })
    const user = req.user as any
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        dept: user.dept,
        roles: user.roles,
        createdAt: user.createdAt,
      },
    })
  })
}
