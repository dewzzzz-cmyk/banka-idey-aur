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
    { preValidation: fastifyPassport.authenticate('local', { session: true }) },
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
    req.session.destroy()
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
