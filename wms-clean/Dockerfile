# Updated 2026-02-27T07:45:00Z - GCP Cloud Run 部署（使用 node:20 避免 Alpine 下 Prisma WASM 路径问题）
ARG NODE_VERSION=20

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund
RUN npx prisma generate

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs
RUN mkdir -p public .next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
