# Nano Board

极简自托管网页白板应用，专注于纯文本编辑和Markdown渲染。

## ✨ 特性

- 📝 **极简文本编辑**：类似大型文本编辑器的直观界面
- 🎨 **Markdown支持**：实时预览和语法高亮
- 🖼️ **图片粘贴**：支持Ctrl+V直接粘贴图片
- � **简单认证**：前端密码验证保护
- � **本地存储**：内容自动保存到项目本地文件
- ⚡ **轻量级**：移除复杂功能，专注核心体验

## 🚀 快速开始

### 开发环境

1. **克隆项目**
```bash
git clone <repository-url>
cd nano-board
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量（可选）**
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量文件
# 设置 ENABLE_PASSWORD_AUTH=true 启用密码验证
# 设置 ACCESS_PASSWORD=your_password 自定义访问密码
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 生产部署

#### Docker 部署（推荐）

1. **构建镜像**
```bash
docker build -t nano-board .
```

2. **运行容器**
```bash
# 基本运行（不启用密码验证）
docker run -p 3000:3000 -v $(pwd)/data:/app/data nano-board

# 启用密码验证
docker run -p 3000:3000 \
  -e ENABLE_PASSWORD_AUTH=true \
  -e ACCESS_PASSWORD=your_secure_password \
  -v $(pwd)/data:/app/data \
  nano-board
```

#### 手动部署

1. **构建项目**
```bash
npm run build
```

2. **启动生产服务器**
```bash
npm start
```

## 📖 使用说明

### 基本操作

- **添加文本块**：双击白板空白区域或点击工具栏"文本"按钮
- **编辑文本**：双击文本块进入编辑模式，Ctrl+Enter保存，Esc取消
- **添加图片**：拖放图片文件到白板或点击工具栏"图片"按钮
- **移动元素**：拖拽元素到新位置
- **调整大小**：选中元素后拖拽右下角的调整手柄
- **删除元素**：选中元素后点击删除按钮

### Markdown 支持

- 切换到Markdown模式可以使用以下语法：
  - `# 标题` - 各级标题
  - `**粗体**` - 粗体文本
  - `*斜体*` - 斜体文本
  - `[链接](url)` - 链接
  - `` `代码` `` - 行内代码
  - `- 列表项` - 无序列表

### 图片处理

- 支持的格式：JPEG、PNG、GIF、WebP
- 默认大小限制：5MB（可在设置中调整）
- 支持粘贴剪贴板中的图片
- 可以重置为原始大小或适应宽度

## ⚙️ 配置选项

### 环境变量配置

应用支持通过环境变量进行配置，主要配置项如下：

#### 密码验证控制
- **`ENABLE_PASSWORD_AUTH`**：控制是否启用密码验证功能
  - `true`：启用密码验证，用户需要输入密码才能访问应用
  - `false` 或未设置：禁用密码验证，直接进入应用（默认）
  - 适用场景：在不同部署环境中灵活控制访问权限

- **`ACCESS_PASSWORD`**：自定义访问密码（可选）
  - 仅在 `ENABLE_PASSWORD_AUTH=true` 时生效
  - 未设置时使用默认密码：`nano2024`
  - 生产环境建议设置自定义密码

#### 其他配置选项
- **图片大小限制**：设置单张图片的最大大小
- **允许的图片格式**：配置支持的图片文件类型
- **默认样式**：设置默认字体大小、颜色等

### 配置示例

#### 开发环境配置
```bash
# .env.local 文件
ENABLE_PASSWORD_AUTH=false  # 开发时不启用密码验证
```

#### 生产环境配置
```bash
# 环境变量或 .env.production 文件
ENABLE_PASSWORD_AUTH=true
ACCESS_PASSWORD=your_secure_production_password
```

#### Docker 部署配置
```bash
# 通过环境变量传递
docker run -p 3000:3000 \
  -e ENABLE_PASSWORD_AUTH=true \
  -e ACCESS_PASSWORD=secure_password_123 \
  -v $(pwd)/data:/app/data \
  nano-board

# 或通过 docker-compose.yml
version: '3.8'
services:
  nano-board:
    image: nano-board
    ports:
      - "3000:3000"
    environment:
      - ENABLE_PASSWORD_AUTH=true
      - ACCESS_PASSWORD=secure_password_123
    volumes:
      - ./data:/app/data
```

## 🛠️ 技术栈

- **前端框架**：Next.js 15 + React 19
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **拖拽功能**：react-dnd
- **Markdown渲染**：react-markdown
- **数据库**：SQLite + Prisma
- **认证**：NextAuth.js
- **日志**：Winston
- **类型检查**：TypeScript

## 📁 项目结构

```
nano-board/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React组件
│   │   ├── Board.tsx          # 白板画布
│   │   ├── TextBlock.tsx      # 文本块组件
│   │   ├── ImageBlock.tsx     # 图片块组件
│   │   └── Toolbar.tsx        # 工具栏
│   ├── lib/                   # 工具库
│   │   ├── logger.ts          # 日志配置
│   │   └── utils.ts           # 通用工具函数
│   ├── stores/                # 状态管理
│   │   ├── boardStore.ts      # 白板状态
│   │   └── settingsStore.ts   # 应用设置
│   └── types/                 # TypeScript类型定义
├── docs/                      # 中文文档
├── docker/                    # Docker配置
├── prisma/                    # 数据库Schema
└── tests/                     # 测试文件
```

## 🧪 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch
```

## 📝 开发指南

详细的开发文档请查看 [docs](./docs/) 目录：

- [开发环境搭建](./docs/开发环境搭建.md)
- [架构设计](./docs/架构设计.md)
- [API文档](./docs/API文档.md)
- [部署指南](./docs/部署指南.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有开源项目的贡献者们！
