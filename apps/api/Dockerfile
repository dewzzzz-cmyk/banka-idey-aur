FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm exec prisma generate

COPY packages/types/src ./packages/types/src
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./

RUN cd apps/api && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]
