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

# 启用密码验证
docker run -p 3000:3000 \
  -e ENABLE_PASSWORD_AUTH=true \
  -e ACCESS_PASSWORD=your_password \
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

- `ENABLE_PASSWORD_AUTH`: 是否启用密码验证 (true/false)
- `ACCESS_PASSWORD`: 访问密码 (默认: nano2024)

### 配置示例

```bash
# 开发环境 - 不启用密码
ENABLE_PASSWORD_AUTH=false

# 生产环境 - 启用密码
ENABLE_PASSWORD_AUTH=true
ACCESS_PASSWORD=your_secure_password
```

## 技术栈

- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- 本地文件存储

## 许可证

MIT License
