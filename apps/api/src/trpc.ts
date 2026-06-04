import { initTRPC, TRPCError } from '@trpc/server'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from './db.js'
import type { User } from '@prisma/client'

export interface Context {
  req: FastifyRequest
  res: FastifyReply
  user: User | null
  prisma: typeof prisma
}

export async function createContext({
  req,
  res,
}: {
  req: FastifyRequest
  res: FastifyReply
}): Promise<Context> {
  const user = (req.user as User | null) ?? null
  // Re-check is_active on every request
  if (user && !user.isActive) {
    return { req, res, user: null, prisma }
  }
  return { req, res, user, prisma }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const curatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ['curator', 'committee', 'admin', 'owner']
  if (!ctx.user.roles.some((r: string) => allowed.includes(r))) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.roles.includes('admin')) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})
