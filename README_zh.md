# Todo for AI MCP 服务器

**中文版本** | [English](README.md)

一个模型上下文协议 (MCP) 服务器，为 AI 助手提供对 Todo for AI 任务管理系统的访问。这使得 AI 助手能够通过标准化接口检索任务、获取项目信息、创建新任务和提交任务反馈。

> 🚀 **立即体验**: 访问 [https://todo4ai.org/](https://todo4ai.org/) 体验我们的产品！

## 功能特性

- 🔍 **获取项目任务**: 检索特定项目的待处理任务，支持状态过滤
- 📋 **获取任务详情**: 获取包含项目上下文的单个任务详细信息
- ➕ **创建任务**: 创建支持完整元数据的新任务
- ✅ **提交反馈**: 更新任务状态并提供完成反馈
- 📊 **项目信息**: 获取全面的项目统计和最近任务
- 🔄 **自动重试**: 内置网络故障重试机制
- 📝 **全面日志**: 详细的日志记录，支持可配置级别
- ⚙️ **灵活配置**: 环境变量和配置文件支持
- 🛡️ **类型安全**: 完整的 TypeScript 支持和严格类型检查
- 🚀 **性能优化**: 增量编译的优化构建
- 🌐 **HTTP 传输**: 使用可流式 HTTP 协议的现代 HTTP 通信
- 🔒 **安全性**: DNS 重绑定保护、CORS 支持和来源验证
- 📡 **实时通信**: 支持服务器发送事件 (SSE) 的实时通信
- 🔄 **会话管理**: 自动会话处理，支持超时和清理

## 安装

### 从 npm 安装 (推荐)

```bash
npm install -g @todo-for-ai/mcp
```

### 从源码安装

```bash
git clone <repository-url>
cd todo-mcp
npm install
npm run build
npm link
```

## 配置

### 传输类型

MCP 服务器使用 **HTTP 传输**: 现代基于 HTTP 的通信，支持服务器发送事件 (SSE) 的实时通信。

### 环境变量

创建 `.env` 文件或设置环境变量：

```bash
# 必需: API 认证令牌
TODO_API_TOKEN=your-api-token

# 可选: Todo API 基础 URL (默认: https://todo4ai.org/todo-for-ai/api/v1)
TODO_API_BASE_URL=http://localhost:50110/todo-for-ai/api/v1

# 可选: API 超时时间，毫秒 (默认: 10000)
TODO_API_TIMEOUT=10000

# HTTP 传输配置
# 可选: HTTP 服务器端口 (默认: 3000)
TODO_HTTP_PORT=3000

# 可选: HTTP 服务器主机 (默认: 127.0.0.1)
TODO_HTTP_HOST=127.0.0.1

# 可选: 会话超时时间，毫秒 (默认: 300000 = 5分钟)
TODO_SESSION_TIMEOUT=300000

# 可选: 启用 DNS 重绑定保护 (默认: true)
TODO_DNS_PROTECTION=true

# 可选: CORS 允许的来源 (逗号分隔，默认: http://localhost:*,https://localhost:*)
TODO_ALLOWED_ORIGINS=http://localhost:*,https://localhost:*

# 可选: 最大并发连接数 (默认: 100)
TODO_MAX_CONNECTIONS=100

# 可选: 日志级别 (默认: info)
LOG_LEVEL=info

# 可选: 环境 (默认: development)
NODE_ENV=development
```

### 配置文件

或者，创建 `config.json` 文件：

```json
{
  "apiBaseUrl": "https://todo4ai.org/todo-for-ai/api/v1",
  "apiTimeout": 10000,
  "apiToken": "your-api-token",
  "logLevel": "info"
}
```

## 使用方法

### 命令行

#### HTTP 传输

```bash
# 在默认端口 3000 启动 HTTP 传输
todo-for-ai-mcp --api-token your-token

# 自定义端口和主机的 HTTP 传输
todo-for-ai-mcp --api-token your-token --http-port 8080 --http-host 0.0.0.0

# 带会话超时和安全选项的 HTTP 传输
todo-for-ai-mcp --api-token your-token \
  --session-timeout 600000 \
  --dns-protection \
  --allowed-origins "http://localhost:*,https://localhost:*"

# 使用环境变量进行 HTTP 传输
TODO_API_TOKEN=your-token \
TODO_HTTP_PORT=3000 \
TODO_HTTP_HOST=127.0.0.1 \
todo-for-ai-mcp

# 使用环境变量
TODO_API_BASE_URL=http://your-server:8080 TODO_API_TOKEN=your-token todo-for-ai-mcp

# 使用命令行参数
todo-for-ai-mcp --api-base-url http://your-server:8080 --api-token your-token --log-level debug

# 混合配置 (CLI 参数优先于环境变量)
TODO_API_BASE_URL=http://localhost:50110 todo-for-ai-mcp --api-token your-token --log-level info
```

### IDE 集成

#### Claude Desktop

> **注意**: Claude Desktop 目前支持 Stdio 传输。对于 HTTP 传输支持，您需要单独启动服务器并使用支持 HTTP 传输的自定义 MCP 客户端。

**传统 Stdio 配置 (如果支持):**

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "-y", "@todo-for-ai/mcp@latest",
        "--api-token", "your-api-token-here"
      ]
    }
  }
}
```

**使用环境变量的替代方案:**

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": ["-y", "@todo-for-ai/mcp@latest"],
      "env": {
        "TODO_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

## 可用工具

### 1. get_project_tasks_by_name

按名称获取项目的所有待处理任务。

**参数:**
- `project_name` (字符串，必需): 项目名称
- `status_filter` (数组，可选): 按任务状态过滤 (默认: ["todo", "in_progress", "review"])

**示例:**
```json
{
  "project_name": "我的项目",
  "status_filter": ["todo", "in_progress"]
}
```

### 2. get_task_by_id

获取特定任务的详细信息。

**参数:**
- `task_id` (整数，必需): 要检索的任务 ID

**示例:**
```json
{
  "task_id": 123
}
```

### 3. create_task

在指定项目中创建新任务。

**参数:**
- `project_id` (整数，必需): 项目 ID
- `title` (字符串，必需): 任务标题
- `content` (字符串，可选): 任务内容/描述
- `status` (字符串，可选): 初始状态 (默认: "todo")
- `priority` (字符串，可选): 任务优先级 (默认: "medium")
- `due_date` (字符串，可选): 截止日期，YYYY-MM-DD 格式
- `assignee` (字符串，可选): 分配给的人员
- `tags` (数组，可选): 与任务关联的标签
- `is_ai_task` (布尔值，可选): 是否为 AI 任务 (默认: true)
- `ai_identifier` (字符串，可选): AI 标识符 (默认: "MCP Client")

### 4. submit_task_feedback

为任务提交反馈并更新状态。

**参数:**
- `task_id` (整数，必需): 任务 ID
- `project_name` (字符串，必需): 项目名称
- `feedback_content` (字符串，必需): 反馈描述
- `status` (字符串，必需): 新状态 ("in_progress", "review", "done", "cancelled")
- `ai_identifier` (字符串，可选): AI 标识符 (默认: "MCP Client")

### 5. get_project_info

获取详细的项目信息，包括统计和最近任务。

**参数:**
- `project_id` (整数，可选): 要检索的项目 ID
- `project_name` (字符串，可选): 要检索的项目名称

*注意: 必须提供 project_id 或 project_name 中的一个。*

## 开发

### 前置要求

- Node.js 18+
- npm 或 yarn
- Todo for AI 后端服务器运行中

### 设置

```bash
# 克隆并安装
git clone <repository-url>
cd todo-mcp
npm install

# 复制环境文件
cp .env.example .env
# 编辑 .env 配置您的设置

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test

# 代码检查
npm run lint
```

## 故障排除

### 常见问题

1. **连接失败**
   - 确保 Todo for AI 后端正在运行
   - 检查 `TODO_API_BASE_URL` 是否正确
   - 验证网络连接

2. **认证错误**
   - 检查是否需要 API 令牌
   - 验证 `TODO_API_TOKEN` 设置是否正确

3. **找不到工具**
   - 确保 MCP 服务器在 IDE 中正确注册
   - 检查 IDE 配置语法
   - 配置更改后重启 IDE

### 调试模式

启用调试日志：

```bash
LOG_LEVEL=debug todo-for-ai-mcp
```

### 健康检查

测试与 Todo API 的连接：

```bash
curl http://localhost:50110/api/health
```

## 许可证

MIT License - 详见 LICENSE 文件。

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 添加测试
5. 提交 Pull Request

## 支持

如有问题和疑问：
- 在 GitHub 上创建 issue
- 查看故障排除部分
- 启用调试模式查看日志

---

**🌟 准备增强您的 AI 工作流程了吗？** 访问 [https://todo4ai.org/](https://todo4ai.org/) 体验 AI 驱动的任务管理的强大功能！
