import 'fastify'
import type { User } from '@prisma/client'

declare module 'fastify' {
  interface PassportUser extends User {}
  interface Session {
    passport?: { user?: string }
  }
}
