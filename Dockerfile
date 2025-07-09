# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# 运行时镜像
FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
