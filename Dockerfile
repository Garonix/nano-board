# ================================
# Nano Board - 极简自托管网页白板
# 多阶段Docker构建配置
# ================================

# ================================
# 阶段1: 依赖安装阶段
# ================================
FROM node:20-alpine AS deps

# 设置工作目录
WORKDIR /app

# 安装系统依赖（用于某些npm包的编译）
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

# 复制包管理文件
COPY package.json package-lock.json* ./

# 安装依赖
# 使用npm ci进行更快、更可靠的依赖安装
RUN npm ci --frozen-lockfile

# ================================
# 阶段2: 构建阶段
# ================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 从依赖阶段复制node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码和配置文件
COPY . .

# 设置构建时环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 设置默认的环境变量用于构建
ENV ENABLE_PASSWORD_AUTH=false
ENV ACCESS_PASSWORD=nano2024

# 构建应用
RUN npm run build

# ================================
# 阶段3: 运行时阶段
# ================================
FROM node:20-alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非root用户以提高安全性
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 安装运行时必需的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 复制Next.js构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建数据目录并设置权限
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data && \
    chmod 755 /app/data

# 创建日志目录
RUN mkdir -p /app/logs && \
    chown -R nextjs:nodejs /app/logs && \
    chmod 755 /app/logs

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 使用dumb-init作为PID 1进程，确保信号正确处理
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server.js"]
