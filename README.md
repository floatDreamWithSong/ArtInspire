# ArtInspire Backend

基于 NestJS 的后端服务，集成了微信登录、用户管理和智能体聊天功能。

## 功能模块

### 用户模块 (Wechat)
- 微信小程序登录
- 手机号绑定
- JWT 认证
- 用户权限管理

### 智能体模块 (Agent)
- 基于 Mastra 框架的智能体功能
- 《柳林风声》角色聊天机器人
- RAG (检索增强生成) 系统
- 流式聊天响应
- 对话记忆存储

## 技术栈

- **框架**: NestJS
- **数据库**: PostgreSQL + Prisma ORM
- **缓存**: Redis
- **认证**: JWT
- **AI框架**: Mastra
- **向量数据库**: PgVector
- **API文档**: Swagger

## 环境配置

创建 `.env` 文件并配置以下变量：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_here

# 微信配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# OpenAI配置 (用于Mastra Agent)
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# PgVector配置 (用于RAG)
PG_VECTOR_CONNECTION_STRING=postgresql://username:password@localhost:5432/vector_database

# 管理员密码
ADMIN_PASSWORD=your_admin_password
```

## 安装和运行

```bash
# 安装依赖
pnpm install

# 数据库迁移
pnpm prisma:migrate:dev

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build:swc

# 生产环境启动
pnpm start:prod
```

## API 文档

启动服务后访问 `http://localhost:3000/api` 查看 Swagger API 文档。

## 主要接口

### 用户相关
- `POST /wechat/login` - 微信登录
- `POST /wechat/bind-phone` - 绑定手机号

### 智能体相关
- `POST /agent/chat` - 与角色聊天
- `GET /agent/characters` - 获取可用角色
- `POST /agent/rag/init` - 初始化RAG系统

## 项目结构

```
src/
├── modules/
│   ├── wechat/          # 微信模块
│   └── agent/           # 智能体模块
│       ├── mastra/      # Mastra 相关服务
│       ├── dto/         # 数据传输对象
│       └── constant/    # 常量和故事内容
├── common/              # 通用组件
│   ├── guards/          # 守卫
│   ├── pipes/           # 管道
│   ├── utils/           # 工具类
│   └── config/          # 配置
└── types/               # 类型定义
```

## 开发说明

1. 确保 PostgreSQL 已安装并配置 pgvector 扩展
2. 配置所有必要的环境变量
3. 运行数据库迁移
4. 调用 `/agent/rag/init` 初始化RAG系统
5. 开始开发和测试 