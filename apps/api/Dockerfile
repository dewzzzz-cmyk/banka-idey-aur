FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Compile @portal/types to JS so Node.js can require() it at runtime
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.build.json ./packages/types/
RUN cd packages/types && npx tsc -p tsconfig.build.json

COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm exec prisma generate

COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/

RUN cd apps/api && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

# Copy compiled @portal/types dist (Node.js requires JS, not TS)
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Copy prisma schema and generate client (needs openssl)
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm exec prisma generate

COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]
