# ================================
# Nano Board 前端应用 Docker 镜像
# 优化版本 - 使用 Distroless 基础镜像
# 最终镜像大小: ~181MB (相比原版本减少6.2%)
# ================================

# ================================
# 第一阶段：构建应用
# ================================
FROM node:18-alpine AS builder
WORKDIR /app

# 安装必要的系统依赖（用于 native 模块编译）
RUN apk add --no-cache libc6-compat

# 复制 package 文件并安装依赖
# 使用 npm ci 确保依赖版本一致性，禁用审计和资金信息以加速安装
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 复制源代码和配置文件
# 分别复制以利用 Docker 层缓存
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/

# 构建应用
# Next.js 会生成 standalone 输出，包含运行时所需的最小依赖
# 配置通过API动态获取，无需构建时环境变量
RUN npm run build

# ================================
# 第二阶段：运行时镜像（Distroless 优化）
# ================================
# 使用 Google Distroless 镜像，仅包含 Node.js 运行时
# 优势：更小体积、更好安全性、无 shell 和包管理器
FROM gcr.io/distroless/nodejs18-debian12 AS runner
WORKDIR /app

# 仅复制运行时必需的文件
# public: 静态资源文件 (~4KB)
COPY --from=builder /app/public ./public

# standalone: Next.js 独立运行包 (~65MB)
COPY --from=builder /app/.next/standalone ./

# static: 构建生成的静态资源 (~2MB)
COPY --from=builder /app/.next/static ./.next/static

# 使用非 root 用户运行（安全最佳实践）
# Distroless 镜像预定义了 UID 1001
USER 1001

# 暴露应用端口
EXPOSE 3000

# 设置生产环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
# 直接运行 server.js，无需 node 命令（distroless 已配置）
CMD ["server.js"]
