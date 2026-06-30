# Todo for AI MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to the Todo for AI task management system. This allows AI assistants to retrieve tasks, get project information, create new tasks, and submit task feedback through a standardized interface.

## Features

- 🔍 **Get Project Tasks**: Retrieve pending tasks for a specific project with status filtering
- 📋 **Get Task Details**: Fetch detailed information about individual tasks with project context
- ➕ **Create Tasks**: Create new tasks with full metadata support
- ✅ **Submit Feedback**: Update task status and provide completion feedback
- 📊 **Project Information**: Get comprehensive project statistics and recent tasks
- 🔄 **Automatic Retry**: Built-in retry mechanism for network failures
- 📝 **Comprehensive Logging**: Detailed logging with configurable levels
- ⚙️ **Flexible Configuration**: Environment variables and config file support
- 🛡️ **Type Safety**: Full TypeScript support with strict type checking
- 🚀 **Performance**: Optimized build with incremental compilation

## Installation

### From npm (Recommended)

```bash
npm install -g @todo-for-ai/mcp
```

### From Source

```bash
git clone <repository-url>
cd todo-mcp
npm install
npm run build
npm link
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required: Todo API base URL
TODO_API_BASE_URL=http://localhost:50110/todo-for-ai/api/v1

# Optional: API timeout in milliseconds (default: 10000)
TODO_API_TIMEOUT=10000

# Optional: API authentication token
TODO_API_TOKEN=your-api-token

# Optional: Log level (default: info)
LOG_LEVEL=info

# Optional: Environment (default: development)
NODE_ENV=development
```

### Configuration File

Alternatively, create a `config.json` file:

```json
{
  "apiBaseUrl": "http://localhost:50110",
  "apiTimeout": 10000,
  "apiToken": "",
  "logLevel": "info"
}
```

## Usage

### Command Line

```bash
# Start the MCP server with default configuration
todo-for-ai-mcp

# With environment variables
TODO_API_BASE_URL=http://your-server:8080 TODO_API_TOKEN=your-token todo-for-ai-mcp

# With command line arguments
todo-for-ai-mcp --api-base-url http://your-server:8080 --api-token your-token --log-level debug

# Mixed configuration (CLI args take priority over environment variables)
TODO_API_BASE_URL=http://localhost:50110 todo-for-ai-mcp --api-token your-token --log-level info
```

#### Configuration Options

The MCP server supports configuration through both command line arguments and environment variables, with the following priority order:

**Priority: Command Line Arguments > Environment Variables > Defaults**

| Configuration | CLI Argument | Environment Variable | Default |
|---------------|--------------|---------------------|---------|
| API Base URL | `--api-base-url`, `--base-url` | `TODO_API_BASE_URL` | `http://localhost:50110/todo-for-ai/api/v1` |
| API Token | `--api-token`, `--token` | `TODO_API_TOKEN` | None |
| API Timeout | `--api-timeout`, `--timeout` | `TODO_API_TIMEOUT` | `10000` (ms) |
| Log Level | `--log-level` | `LOG_LEVEL` | `info` |

**Examples:**

```bash
# Using command line arguments
todo-for-ai-mcp --api-base-url http://localhost:50110/todo-for-ai/api/v1 --api-token your-token --log-level debug

# Using environment variables
export TODO_API_BASE_URL="http://localhost:50110/todo-for-ai/api/v1"
export TODO_API_TOKEN="your-token"
export LOG_LEVEL="info"
todo-for-ai-mcp

# Mixed approach (CLI args override env vars)
TODO_API_BASE_URL=http://localhost:50110 todo-for-ai-mcp --log-level debug
```

### IDE Integration

#### Claude Desktop

Add to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": ["-y", "@todo-for-ai/mcp@latest"],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110/todo-for-ai/api/v1",
        "TODO_API_TOKEN": "your-api-token-here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Alternative with command line arguments:**

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "-y", "@todo-for-ai/mcp@latest",
        "--api-base-url", "http://localhost:50110/todo-for-ai/api/v1",
        "--api-token", "your-api-token-here",
        "--log-level", "info"
      ]
    }
  }
}
```

#### Cursor IDE

Add to your Cursor configuration:

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": ["-y", "@todo-for-ai/mcp@latest"],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110/todo-for-ai/api/v1",
        "TODO_API_TOKEN": "your-api-token-here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Local Development

For development with local Todo for AI server:

```json
{
  "mcpServers": {
    "todo-for-ai-local": {
      "command": "node",
      "args": ["/path/to/todo-mcp/dist/index.js"],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## Available Tools

### 1. get_project_tasks_by_name

Get all pending tasks for a project by name.

**Parameters:**
- `project_name` (string, required): Name of the project
- `status_filter` (array, optional): Filter by task status (default: ["todo", "in_progress", "review"])

**Example:**
```json
{
  "project_name": "My Project",
  "status_filter": ["todo", "in_progress"]
}
```

### 2. get_task_by_id

Get detailed information about a specific task.

**Parameters:**
- `task_id` (integer, required): ID of the task to retrieve

**Example:**
```json
{
  "task_id": 123
}
```

### 3. create_task

Create a new task in the specified project.

**Parameters:**
- `project_id` (integer, required): ID of the project
- `title` (string, required): Task title
- `content` (string, optional): Task content/description
- `status` (string, optional): Initial status (default: "todo")
- `priority` (string, optional): Task priority (default: "medium")
- `due_date` (string, optional): Due date in YYYY-MM-DD format
- `assignee` (string, optional): Person assigned to the task
- `tags` (array, optional): Tags associated with the task
- `is_ai_task` (boolean, optional): Whether this is an AI task (default: true)
- `ai_identifier` (string, optional): AI identifier (default: "MCP Client")

**Example:**
```json
{
  "project_id": 10,
  "title": "Implement new feature",
  "content": "Add user authentication to the application",
  "status": "todo",
  "priority": "high",
  "due_date": "2024-12-31",
  "tags": ["authentication", "security"]
}
```

### 4. submit_task_feedback

Submit feedback and update status for a task.

**Parameters:**
- `task_id` (integer, required): ID of the task
- `project_name` (string, required): Name of the project
- `feedback_content` (string, required): Feedback description
- `status` (string, required): New status ("in_progress", "review", "done", "cancelled")
- `ai_identifier` (string, optional): AI identifier (default: "MCP Client")

**Example:**
```json
{
  "task_id": 123,
  "project_name": "My Project",
  "feedback_content": "Completed the implementation as requested",
  "status": "done",
  "ai_identifier": "Claude"
}
```

### 5. get_project_info

Get detailed project information including statistics and recent tasks.

**Parameters:**
- `project_id` (integer, optional): ID of the project to retrieve
- `project_name` (string, optional): Name of the project to retrieve

*Note: Either project_id or project_name must be provided.*

**Example:**
```json
{
  "project_name": "My Project"
}
```

### 6. list_agents

List Agent identities available to the current user.

Agent collaboration tools return a short operational summary first, followed by a `JSON:` block with the complete API response. Use the summary for the next action and the JSON block for exact IDs, states, lease timestamps, match scores, and event payloads.

**Parameters:**
- `status` (string, optional): Filter by Agent status (`active`, `paused`, `offline`, `disabled`)
- `search` (string, optional): Search Agent name or description
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Page size (default: 20)

**Example:**
```json
{
  "status": "active",
  "per_page": 20
}
```

### 7. create_agent

Create an Agent identity and declare its collaboration capabilities.

**Parameters:**
- `name` (string, required): Agent display name
- `description` (string, optional): Agent purpose or operating notes
- `kind` (string, optional): Agent kind (`assistant`, `autonomous`, `coordinator`, `external`; default: `assistant`)
- `status` (string, optional): Initial Agent status (`active`, `paused`, `offline`, `disabled`; default: `active`)
- `provider` (string, optional): Provider name
- `model` (string, optional): Model or runtime identifier
- `capabilities` (array of strings, optional): Capability keywords used for automatic task matching
- `config` (object, optional): Agent configuration metadata

**Example:**
```json
{
  "name": "Frontend Builder",
  "kind": "autonomous",
  "provider": "openai",
  "model": "gpt-5-codex",
  "capabilities": ["frontend", "react", "typescript", "ui"]
}
```

### 8. update_agent

Update an Agent identity, status, model metadata, or capabilities.

**Parameters:**
- `agent_id` (integer, required): ID of the Agent
- `name` (string, optional): Agent display name
- `description` (string, optional): Agent purpose or operating notes
- `kind` (string, optional): Agent kind (`assistant`, `autonomous`, `coordinator`, `external`)
- `status` (string, optional): Agent status (`active`, `paused`, `offline`, `disabled`)
- `provider` (string, optional): Provider name
- `model` (string, optional): Model or runtime identifier
- `capabilities` (array of strings, optional): Capability keywords used for automatic task matching
- `config` (object, optional): Agent configuration metadata

**Example:**
```json
{
  "agent_id": 1,
  "status": "active",
  "capabilities": ["frontend", "react", "typescript", "review"]
}
```

### 9. heartbeat_agent

Record an Agent heartbeat and optionally update its availability status.

**Parameters:**
- `agent_id` (integer, required): ID of the Agent
- `status` (string, optional): New Agent status (`active`, `paused`, `offline`, `disabled`)

**Example:**
```json
{
  "agent_id": 1,
  "status": "active"
}
```

### 10. list_review_queue

List Agent assignments that need human feedback or final review.

For `human_feedback` items, resume the assignment with `update_task_assignment` using `state: "running"`, `task_status: "in_progress"`, and `feedback_content` so the worker Agent receives the human response. For `final_review` items, approve with `state: "done"` and `task_status: "done"`, or send changes back with `state: "running"` plus `feedback_content`.

**Parameters:**
- `action` (string, optional): Filter queue by `all`, `human_feedback`, or `final_review` (default: `all`)
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Page size (default: 20)

**Example:**
```json
{
  "action": "final_review",
  "per_page": 20
}
```

### 11. list_agent_assignments

List task assignments for an Agent.

**Parameters:**
- `agent_id` (integer, required): ID of the Agent
- `state` (string, optional): Assignment state filter
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Page size (default: 20)

**Example:**
```json
{
  "agent_id": 1,
  "state": "running"
}
```

### 12. list_task_assignments

List Agent assignments for a task. Use `state: "active"` to see current non-terminal assignments with live leases.

**Parameters:**
- `task_id` (integer, required): ID of the task
- `state` (string, optional): Assignment state filter, or `active`
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Page size (default: 20)

**Example:**
```json
{
  "task_id": 42,
  "state": "active"
}
```

### 13. list_task_events

List collaboration events for a task so Agents can inspect handoffs, claims, review requests, assignment updates, and lease expirations.

**Parameters:**
- `task_id` (integer, required): ID of the task
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Page size (default: 20)

**Example:**
```json
{
  "task_id": 42,
  "per_page": 20
}
```

### 14. claim_agent_task

Claim a specific task, or the next claimable task, for an Agent. Claiming creates an assignment, starts an Agent run, and records a task collaboration event.

**Parameters:**
- `agent_id` (integer, required): ID of the Agent
- `task_id` (integer, optional): Specific task ID to claim
- `project_id` (integer, optional): Project filter when claiming the next available task
- `lease_seconds` (integer, optional): Lease duration in seconds (default: 1800)
- `match_capabilities` (boolean, optional): Prefer tasks whose tags or text match the Agent capabilities when claiming automatically (default: true)
- `dispatch_source` (string, optional): Set to `human` when manually dispatching a specific task to the Agent
- `dispatch_notes` (string, optional): Notes stored in `run_metadata.dispatch_notes` for a manual dispatch
- `run_metadata` (object, optional): Runtime metadata

**Example:**
```json
{
  "agent_id": 1,
  "project_id": 10,
  "lease_seconds": 1800,
  "match_capabilities": true
}
```

Manual dispatch example:
```json
{
  "agent_id": 1,
  "task_id": 42,
  "lease_seconds": 1800,
  "dispatch_source": "human",
  "dispatch_notes": "Focus on the API contract and update tests before marking review."
}
```

### 15. update_agent_assignment

Update an Agent assignment state, progress, feedback, lease, or execution result. Marking an assignment as `done` moves the task to `review` so a human can approve the final completion.

**Parameters:**
- `agent_id` (integer, required): ID of the Agent
- `assignment_id` (integer, required): ID of the assignment
- `state` (string, optional): New assignment state
- `progress_rate` (integer, optional): Progress percent from 0 to 100
- `notes` (string, optional): Internal assignment notes
- `feedback_content` (string, optional): Human-readable task feedback
- `output_summary` (string, optional): Execution output summary
- `error` (string, optional): Execution error details
- `lease_seconds` (integer, optional): Extend lease by this duration in seconds
- `task_status` (string, optional): Optional task status override
- `run_metadata` (object, optional): Runtime metadata

**Example:**
```json
{
  "agent_id": 1,
  "assignment_id": 42,
  "state": "done",
  "progress_rate": 100,
  "feedback_content": "Implementation completed and ready for review."
}
```

### 16. update_task_assignment

Update a task assignment as the current user or coordinator. Use this with items from `list_review_queue` to approve final review, resume work, cancel an assignment, or add human feedback without acting as the worker Agent.

**Parameters:**
- `task_id` (integer, required): ID of the task
- `assignment_id` (integer, required): ID of the assignment
- `state` (string, optional): New assignment state
- `progress_rate` (integer, optional): Progress percent from 0 to 100
- `notes` (string, optional): Internal assignment notes
- `feedback_content` (string, optional): Human-readable task feedback
- `output_summary` (string, optional): Execution output summary
- `error` (string, optional): Execution error details
- `lease_seconds` (integer, optional): Extend lease by this duration in seconds
- `task_status` (string, optional): Optional task status override
- `run_metadata` (object, optional): Runtime metadata

**Examples:**
```json
{
  "task_id": 42,
  "assignment_id": 7,
  "state": "done",
  "progress_rate": 100,
  "task_status": "done"
}
```

```json
{
  "task_id": 42,
  "assignment_id": 7,
  "state": "running",
  "task_status": "in_progress",
  "feedback_content": "Please address the review comments and continue."
}
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Todo for AI backend server running

### Setup

```bash
# Clone and install
git clone <repository-url>
cd todo-mcp
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Development mode
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

### Project Structure

```
todo-mcp/
├── src/
│   ├── index.ts          # Main entry point
│   ├── server.ts         # MCP server implementation
│   ├── api-client.ts     # Todo API client
│   ├── config.ts         # Configuration management
│   ├── logger.ts         # Logging utilities
│   ├── error-handler.ts  # Error handling
│   └── types.ts          # TypeScript types
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure Todo for AI backend is running
   - Check `TODO_API_BASE_URL` is correct
   - Verify network connectivity

2. **Authentication Errors**
   - Check if API token is required
   - Verify `TODO_API_TOKEN` is set correctly

3. **Tool Not Found**
   - Ensure MCP server is properly registered in IDE
   - Check IDE configuration syntax
   - Restart IDE after configuration changes

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug todo-for-ai-mcp
```

### Health Check

Test connection to Todo API:

```bash
curl http://localhost:50110/api/health
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs with debug mode enabled
