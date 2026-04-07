FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/engine/package.json apps/engine/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/zod-schemas/package.json packages/zod-schemas/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/engine/node_modules ./apps/engine/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/zod-schemas/node_modules ./packages/zod-schemas/node_modules
COPY . .
RUN pnpm --filter @promotionos/db build 2>/dev/null || true
RUN pnpm --filter @promotionos/types build 2>/dev/null || true
RUN pnpm --filter @promotionos/zod-schemas build 2>/dev/null || true
RUN pnpm --filter @promotionos/engine build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/engine/dist ./dist
COPY --from=builder /app/apps/engine/package.json ./
COPY --from=builder /app/apps/engine/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/server.js"]
