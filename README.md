# Nano Board

简单白板 - 自托管网页白板应用

## 特性

- 📝 文本编辑：支持普通文本和Markdown模式
- 🖼️ 图片支持：拖拽上传、粘贴图片
- 📁 文件上传：支持各种文件类型
- 🔒 密码保护：可选的访问密码验证
- 💾 自动保存：内容自动保存到本地文件

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 构建镜像
docker build -t nano-board .

# 运行容器
docker run -p 3000:3000 -v $(pwd)/data:/app/data nano-board

# 启用密码验证和存储限制
docker run -p 3000:3000 \
  -e ENABLE_PASSWORD_AUTH=true \
  -e ACCESS_PASSWORD=your_password \
  -e MAX_DATA_DIR_SIZE=1073741824 \
  -v $(pwd)/data:/app/data \
  nano-board
```

## 使用说明

### 基本操作

- **添加内容**：双击空白区域创建文本框
- **编辑文本**：双击文本块进入编辑模式
- **上传图片**：拖拽图片文件到白板
- **上传文件**：拖拽任意文件到白板
- **粘贴内容**：Ctrl+V 粘贴图片或文本

### 模式切换

- **普通模式**：基础文本编辑
- **Markdown模式**：支持Markdown语法渲染

## 配置

### 环境变量

#### 安全配置
- `ENABLE_PASSWORD_AUTH`: 是否启用密码验证 (true/false)
- `ACCESS_PASSWORD`: 访问密码 (默认: nano2024)

#### 存储限制配置
- `MAX_FILE_SIZE`: 单个文件最大大小，字节 (默认: 10485760 = 10MB)
- `MAX_FILE_COUNT`: 最大文件数量 (默认: 100)
- `MAX_DATA_DIR_SIZE`: data目录总大小限制，字节 (默认: 524288000 = 500MB)

### 配置示例

```bash
# 开发环境 - 不启用密码
ENABLE_PASSWORD_AUTH=false

# 生产环境 - 启用密码和存储限制
ENABLE_PASSWORD_AUTH=true
ACCESS_PASSWORD=your_secure_password
MAX_FILE_SIZE=10485760          # 10MB
MAX_FILE_COUNT=100              # 100个文件
MAX_DATA_DIR_SIZE=524288000     # 500MB总限制
```

### Docker Compose 配置

```yaml
version: '3.8'
services:
  nano-board:
    image: garonix/nano-board:latest
    container_name: nano-board
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - ENABLE_PASSWORD_AUTH=true
      - ACCESS_PASSWORD=nano2025
      - MAX_FILE_SIZE=10485760
      - MAX_FILE_COUNT=100
      - MAX_DATA_DIR_SIZE=524288000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

## 技术栈

- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- 本地文件存储

## 许可证

MIT License
