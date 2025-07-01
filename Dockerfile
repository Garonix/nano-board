# 使用官方Node.js 18 Alpine镜像作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖（用于sharp等native模块）
RUN apk add --no-cache libc6-compat

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码（仅复制必要文件）
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS runner
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的运行时文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
