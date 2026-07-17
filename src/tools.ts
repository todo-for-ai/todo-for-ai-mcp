/**
 * MCP tool definitions for todo-for-ai.
 *
 * Each tool is a {@link Tool} object consumed by the MCP SDK's
 * ListToolsRequestSchema handler.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
        {
          name: 'get_project_tasks_by_name',
          description: 'Get all pending tasks for a project by project name, sorted by creation time',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: {
                type: 'string',
                description: 'The name of the project to get tasks for',
              },
              status_filter: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['todo', 'in_progress', 'review'],
                },
                description: 'Filter tasks by status (default: todo, in_progress, review)',
                default: ['todo', 'in_progress', 'review'],
              },
            },
            required: ['project_name'],
          },
        },
        {
          name: 'get_task_by_id',
          description: 'Get detailed task information by task ID',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The ID of the task to retrieve',
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'submit_task_feedback',
          description: 'Submit feedback for a completed or in-progress task',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The ID of the task to provide feedback for',
              },
              project_name: {
                type: 'string',
                description: 'The name of the project this task belongs to',
              },
              feedback_content: {
                type: 'string',
                description: 'The feedback content describing what was done',
              },
              status: {
                type: 'string',
                enum: ['in_progress', 'review', 'done', 'cancelled'],
                description: 'The new status of the task after feedback',
              },
              ai_identifier: {
                type: 'string',
                description: 'Identifier of the AI providing feedback (optional)',
              },
            },
            required: ['task_id', 'project_name', 'feedback_content', 'status'],
          },
        },
        {
          name: 'create_task',
          description: 'Create a new task in the specified project',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'integer',
                description: 'The ID of the project to create the task in',
              },
              title: {
                type: 'string',
                description: 'The title of the task',
              },
              content: {
                type: 'string',
                description: 'The detailed content/description of the task',
              },
              status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
                description: 'The initial status of the task (default: todo)',
                default: 'todo',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'The priority of the task (default: medium)',
                default: 'medium',
              },
              assignee: {
                type: 'string',
                description: 'The person assigned to this task (optional)',
              },
              due_date: {
                type: 'string',
                description: 'The due date in YYYY-MM-DD format (optional)',
              },
              estimated_hours: {
                type: 'number',
                description: 'Estimated hours to complete the task (optional)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags associated with the task (optional)',
              },
              related_files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files related to this task (optional)',
              },
              is_ai_task: {
                type: 'boolean',
                description: 'Whether this task was created by AI (default: true)',
                default: true,
              },
              ai_identifier: {
                type: 'string',
                description: 'Identifier of the AI creating the task (optional)',
              },
            },
            required: ['project_id', 'title'],
          },
        },
        {
          name: 'get_project_info',
          description: 'Get detailed project information including statistics and configuration. Provide either project_id or project_name.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'integer',
                description: 'The ID of the project to retrieve (optional if project_name is provided)',
              },
              project_name: {
                type: 'string',
                description: 'The name of the project to retrieve (optional if project_id is provided)',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_agents',
          description: 'List Agent identities available to the current user',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active', 'paused', 'offline', 'disabled'],
                description: 'Optional Agent status filter',
              },
              search: {
                type: 'string',
                description: 'Optional search text for Agent name or description',
              },
              page: {
                type: 'integer',
                description: 'Page number',
                default: 1,
              },
              per_page: {
                type: 'integer',
                description: 'Page size',
                default: 20,
              },
            },
            required: [],
          },
        },
        {
          name: 'create_agent',
          description: 'Create an Agent identity and declare its collaboration capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Agent display name',
              },
              description: {
                type: 'string',
                description: 'Optional Agent purpose or operating notes',
              },
              kind: {
                type: 'string',
                enum: ['assistant', 'autonomous', 'coordinator', 'external'],
                description: 'Agent kind',
                default: 'assistant',
              },
              status: {
                type: 'string',
                enum: ['active', 'paused', 'offline', 'disabled'],
                description: 'Initial Agent status',
                default: 'active',
              },
              provider: {
                type: 'string',
                description: 'Optional provider name',
              },
              model: {
                type: 'string',
                description: 'Optional model or runtime identifier',
              },
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Capability keywords used for automatic task matching',
              },
              config: {
                type: 'object',
                description: 'Optional Agent configuration metadata',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'self_register_agent',
          description: 'Self-register an Agent into the platform. If an agent with the same name+provider already exists, it updates the record (idempotent). Use this when an external Agent starts up and wants to announce itself.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Agent display name' },
              description: { type: 'string', description: 'Agent purpose or operating notes' },
              kind: { type: 'string', enum: ['assistant', 'autonomous', 'coordinator', 'external'], description: 'Agent kind (default: autonomous)' },
              provider: { type: 'string', description: 'Provider name (used with name for idempotent lookup)' },
              model: { type: 'string', description: 'Model or runtime identifier' },
              capabilities: { type: 'array', items: { type: 'string' }, description: 'Capability keywords' },
              config: { type: 'object', description: 'Configuration metadata' },
              collaboration_role: { type: 'string', enum: ['leader', 'follower', 'standalone'], description: 'Collaboration role' },
            },
            required: ['name'],
          },
        },
        {
          name: 'discover_agents',
          description: 'Find available Agents by capability, role, or kind. Useful for discovering which agents can handle a specific type of work.',
          inputSchema: {
            type: 'object',
            properties: {
              capability: { type: 'array', items: { type: 'string' }, description: 'Filter by capability keywords' },
              collaboration_role: { type: 'string', enum: ['leader', 'follower', 'standalone'], description: 'Filter by collaboration role' },
              kind: { type: 'string', enum: ['assistant', 'autonomous', 'coordinator', 'external'], description: 'Filter by kind' },
              status: { type: 'string', enum: ['active', 'paused', 'offline', 'disabled'], description: 'Filter by status (default: active)' },
            },
          },
        },
        {
          name: 'update_agent',
          description: 'Update an Agent identity, status, model metadata, or capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID',
              },
              name: {
                type: 'string',
                description: 'Agent display name',
              },
              description: {
                type: 'string',
                description: 'Optional Agent purpose or operating notes',
              },
              kind: {
                type: 'string',
                enum: ['assistant', 'autonomous', 'coordinator', 'external'],
                description: 'Agent kind',
              },
              status: {
                type: 'string',
                enum: ['active', 'paused', 'offline', 'disabled'],
                description: 'Agent availability status',
              },
              provider: {
                type: 'string',
                description: 'Optional provider name',
              },
              model: {
                type: 'string',
                description: 'Optional model or runtime identifier',
              },
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Capability keywords used for automatic task matching',
              },
              config: {
                type: 'object',
                description: 'Optional Agent configuration metadata',
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'heartbeat_agent',
          description: 'Record a heartbeat for an Agent and optionally update its availability status',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID',
              },
              status: {
                type: 'string',
                enum: ['active', 'paused', 'offline', 'disabled'],
                description: 'Optional new Agent status',
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_recommended_tasks',
          description: 'List unassigned tasks that match an Agent\'s capabilities, sorted by relevance score. Agents can use this to discover tasks they are best suited for.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID to find tasks for',
              },
              limit: {
                type: 'integer',
                description: 'Max tasks to return (default 10, max 50)',
              },
              project_id: {
                type: 'integer',
                description: 'Optional project ID filter',
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_review_queue',
          description: 'List Agent assignments that need human feedback or final review',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['all', 'human_feedback', 'final_review'],
                description: 'Optional review queue filter',
                default: 'all',
              },
              page: {
                type: 'integer',
                description: 'Page number',
                default: 1,
              },
              per_page: {
                type: 'integer',
                description: 'Page size',
                default: 20,
              },
            },
            required: [],
          },
        },
        {
          name: 'list_agent_assignments',
          description: 'List task assignments for an Agent',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID',
              },
              state: {
                type: 'string',
                enum: ['assigned', 'claimed', 'running', 'waiting_human', 'review', 'done', 'failed', 'cancelled', 'expired'],
                description: 'Optional assignment state filter',
              },
              page: {
                type: 'integer',
                description: 'Page number',
                default: 1,
              },
              per_page: {
                type: 'integer',
                description: 'Page size',
                default: 20,
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_task_assignments',
          description: 'List Agent assignments for a task, including active leases and assigned Agents',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID',
              },
              state: {
                type: 'string',
                enum: ['active', 'assigned', 'claimed', 'running', 'waiting_human', 'review', 'done', 'failed', 'cancelled', 'expired'],
                description: 'Optional assignment state filter. Use active for non-terminal assignments with live leases.',
              },
              page: {
                type: 'integer',
                description: 'Page number',
                default: 1,
              },
              per_page: {
                type: 'integer',
                description: 'Page size',
                default: 20,
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'list_task_events',
          description: 'List collaboration events for a task so Agents can inspect handoffs, claims, review requests, and lease expirations',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID',
              },
              page: {
                type: 'integer',
                description: 'Page number',
                default: 1,
              },
              per_page: {
                type: 'integer',
                description: 'Page size',
                default: 20,
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'post_task_event',
          description: 'Post a collaboration message to a task timeline so Agents can communicate: leave notes, ask/answer questions, hand off work to another Agent, raise blockers, or record decisions. Provide agent_id to post as that Agent, omit it to post as the human owner. Other Agents read these via list_task_events.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID to post the event to',
              },
              content: {
                type: 'string',
                description: 'The message text. Required unless payload is provided.',
              },
              event_type: {
                type: 'string',
                enum: ['message', 'note', 'question', 'answer', 'handoff', 'blocker', 'decision', 'info'],
                description: 'The kind of collaboration event. Defaults to message.',
                default: 'message',
              },
              agent_id: {
                type: 'integer',
                description: 'Optional Agent ID to post as. The Agent must belong to the caller. Omit to post as the human owner.',
              },
              to_agent_id: {
                type: 'integer',
                description: 'Optional Agent ID to direct this message at (an @mention). The message surfaces in that Agent\'s inbox via get_agent_inbox. Use to ask a specific Agent a question or hand context to it.',
              },
              payload: {
                type: 'object',
                description: 'Optional structured metadata to attach (e.g. handoff target, referenced files). Merged with content.',
                additionalProperties: true,
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'get_agent_inbox',
          description: 'Retrieve collaboration messages directed at a specific Agent (its @mention inbox) across all of the owner\'s tasks. Returns events where another Agent or the human set to_agent_id to this Agent. Supports incremental polling via since_id. Use this so an Agent can check "what was sent to me" and respond.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID whose inbox to read',
              },
              since_id: {
                type: 'integer',
                description: 'Only return directed events with an id greater than this (incremental polling). Returns latest_id to use as the next since_id.',
              },
              per_page: {
                type: 'integer',
                description: 'Maximum number of directed events to return (default 20, max 100)',
              },
              include_self: {
                type: 'boolean',
                description: 'Include messages the Agent itself sent that are addressed to it (default false)',
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'handoff_task',
          description: 'Hand off a task from its current Agent to another Agent. Cancels the active assignment (if any) and creates a fresh assignment + run for the target Agent, recording a handoff event on the timeline. Use this to transfer live work when an Agent is blocked, finished its part, or a more suitable Agent should take over.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task to hand off',
              },
              to_agent_id: {
                type: 'integer',
                description: 'The Agent ID that should receive the task. Must belong to the caller and be active/paused-free.',
              },
              from_assignment_id: {
                type: 'integer',
                description: 'Optional source assignment ID to hand off. Must match the task\'s current active assignment. Omit to use the active assignment automatically.',
              },
              lease_seconds: {
                type: 'integer',
                description: 'Lease duration for the new assignment in seconds',
                default: 1800,
              },
              reason: {
                type: 'string',
                description: 'Why the task is being handed off (shown on the timeline)',
              },
              notes: {
                type: 'string',
                description: 'Optional notes attached to the new assignment',
              },
            },
            required: ['task_id', 'to_agent_id'],
          },
        },
        {
          name: 'dispatch_tasks',
          description: 'Coordinator auto-dispatch: have a coordinator Agent distribute claimable (unassigned) tasks across the owner\'s available (online, idle) worker Agents using capability scoring. Each worker takes at most one task per round to spread load; every match creates an assignment + run and records a task_dispatched event. Use this to orchestrate multi-Agent work instead of claiming tasks one by one.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The coordinator Agent ID that performs the dispatch (must belong to the caller and not be disabled/paused)',
              },
              project_id: {
                type: 'integer',
                description: 'Optional project filter; only dispatch claimable tasks from this project',
              },
              max_assignments: {
                type: 'integer',
                description: 'Maximum number of tasks to dispatch in this round (1-20)',
                default: 20,
              },
              lease_seconds: {
                type: 'integer',
                description: 'Lease duration for each new assignment in seconds',
                default: 1800,
              },
              match_capabilities: {
                type: 'boolean',
                description: 'Score tasks against each worker Agent\'s capabilities to pick the best match. When false, dispatch by task priority/FIFO order.',
                default: true,
              },
              require_capability_match: {
                type: 'boolean',
                description: 'Only dispatch a task to an Agent when there is a positive capability match (score > 0). Tasks with no matching Agent are left unassigned.',
                default: false,
              },
              candidate_agent_ids: {
                type: 'array',
                items: { type: 'integer' },
                description: 'Optional allowlist of worker Agent IDs to consider; omit to consider all eligible Agents',
              },
              include_self: {
                type: 'boolean',
                description: 'Allow the coordinator Agent itself to also receive a task',
                default: false,
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'create_subtask',
          description: 'Create a child task under a parent task so an Agent can decompose work. The child inherits the parent\'s project and is linked via parent_task_id. A subtask_created event is recorded on the parent timeline. Other Agents can then claim the subtask independently.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The parent task ID under which to create the subtask',
              },
              title: {
                type: 'string',
                description: 'Subtask title (1-500 characters)',
              },
              content: {
                type: 'string',
                description: 'Optional detailed description (Markdown)',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Subtask priority (default: medium)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional capability / topic tags for the subtask',
              },
              agent_id: {
                type: 'integer',
                description: 'Optional Agent ID posting as the creator. Must belong to the caller.',
              },
            },
            required: ['task_id', 'title'],
          },
        },
        {
          name: 'list_notifications',
          description: 'List persistent notifications for the current user. Notifications are created when collaboration events (claim, dispatch, handoff, message, question, etc.) happen on tasks the user owns. Use this to catch up on missed events when coming back online.',
          inputSchema: {
            type: 'object',
            properties: {
              since_id: {
                type: 'integer',
                description: 'Only return notifications with id greater than this value (incremental polling)',
              },
              unread_only: {
                type: 'boolean',
                description: 'If true, only return unread notifications (default: false)',
              },
              per_page: {
                type: 'integer',
                description: 'Page size (default: 50, max: 200)',
              },
            },
          },
        },
        {
          name: 'mark_notifications_read',
          description: 'Mark one or more notifications as read. Pass all=true to mark everything read, or pass an array of IDs to mark specific items.',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: { type: 'integer' },
                description: 'List of notification IDs to mark as read',
              },
              all: {
                type: 'boolean',
                description: 'If true, mark ALL unread notifications as read (ignores ids)',
              },
            },
          },
        },
        {
          name: 'get_shared_context',
          description: 'Read shared context entries for a task. Agents use the shared context to persist intermediate results, references, scratch notes, or structured data that other Agents need. If key is provided, only the matching entry is returned; otherwise all entries are returned.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID whose shared context to read',
              },
              key: {
                type: 'string',
                description: 'Optional specific key to look up (omit to list all)',
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'set_shared_context',
          description: 'Create or update a shared context entry for a task (upsert by task_id + key). Use this to store intermediate results, plans, references, or notes that other Agents on the same task can read later.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID',
              },
              key: {
                type: 'string',
                description: 'Context key (e.g. "research_summary", "code_plan", "decisions")',
              },
              value: {
                type: 'string',
                description: 'Context value (Markdown or JSON string)',
              },
              agent_id: {
                type: 'integer',
                description: 'Optional Agent ID authoring this entry',
              },
            },
            required: ['task_id', 'key', 'value'],
          },
        },
        {
          name: 'delete_shared_context',
          description: 'Delete a shared context entry by its ID.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID',
              },
              entry_id: {
                type: 'integer',
                description: 'The shared context entry ID to delete',
              },
            },
            required: ['task_id', 'entry_id'],
          },
        },
        {
          name: 'get_run_logs',
          description: 'Retrieve append-only log entries for a specific Agent run. Agents write logs during execution to record progress, tool calls, decisions, and errors. Supports incremental polling with since_id.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: {
                type: 'integer',
                description: 'The AgentRun ID whose logs to retrieve',
              },
              since_id: {
                type: 'integer',
                description: 'Only return log entries with id > since_id (incremental polling)',
              },
              level: {
                type: 'string',
                enum: ['debug', 'info', 'warn', 'error'],
                description: 'Filter by log level',
              },
              per_page: {
                type: 'integer',
                description: 'Page size (default 100, max 500)',
              },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'append_run_logs',
          description: 'Append log entries to a specific Agent run. Use this during execution to record progress, tool calls, decisions, and errors for later replay and debugging.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: {
                type: 'integer',
                description: 'The AgentRun ID',
              },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level: {
                      type: 'string',
                      enum: ['debug', 'info', 'warn', 'error'],
                      description: 'Log level (default: info)',
                    },
                    message: {
                      type: 'string',
                      description: 'Log message',
                    },
                    meta: {
                      type: 'object',
                      description: 'Optional structured metadata',
                    },
                  },
                  required: ['message'],
                },
                description: 'Array of log entries to append (max 50 per call)',
              },
            },
            required: ['run_id', 'entries'],
          },
        },
        {
          name: 'list_task_templates',
          description: 'List reusable task templates owned by the current user. Templates define default title, content, priority, tags, and capabilities for quickly creating new tasks.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'create_task_template',
          description: 'Create a reusable task template. Templates let you quickly create new tasks with predefined title, content, priority, tags, and required capabilities.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Template name (e.g. "Code Review", "Bug Fix")' },
              description: { type: 'string', description: 'Template description' },
              title_template: { type: 'string', description: 'Default task title' },
              content_template: { type: 'string', description: 'Default task content (Markdown)' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Default priority' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Default tags' },
              is_ai_task: { type: 'boolean', description: 'Default is_ai_task flag' },
              capabilities: { type: 'array', items: { type: 'string' }, description: 'Required agent capabilities' },
            },
            required: ['name'],
          },
        },
        {
          name: 'instantiate_task_template',
          description: 'Create a new task from a template. The task inherits the template\'s title, content, priority, tags, and is_ai_task. You can override title and content.',
          inputSchema: {
            type: 'object',
            properties: {
              template_id: { type: 'integer', description: 'The template ID to instantiate' },
              project_id: { type: 'integer', description: 'The project ID to create the task in' },
              title: { type: 'string', description: 'Override template title (optional)' },
              content: { type: 'string', description: 'Override template content (optional)' },
            },
            required: ['template_id', 'project_id'],
          },
        },
        // --- Workflow tools ---
        {
          name: 'list_workflows',
          description: 'List workflow definitions. A workflow is a DAG of steps that coordinate multiple Agents in sequence or parallel (e.g. "code review → test → deploy").',
          inputSchema: {
            type: 'object',
            properties: {
              is_active: { type: 'boolean', description: 'Filter by active status' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
          },
        },
        {
          name: 'create_workflow',
          description: 'Create a new workflow definition with steps. Each step specifies required Agent capabilities, optional task template, and dependency edges (depends_on). The system picks a matching Agent at runtime.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Workflow display name' },
              description: { type: 'string', description: 'Workflow description' },
              definition: { type: 'object', description: 'Optional full workflow definition JSON' },
              is_active: { type: 'boolean', description: 'Whether the workflow can be launched (default true)' },
              steps: {
                type: 'array',
                description: 'Workflow steps',
                items: {
                  type: 'object',
                  properties: {
                    step_key: { type: 'string', description: 'Unique key within the workflow (e.g. "review")' },
                    name: { type: 'string', description: 'Step display name' },
                    description: { type: 'string', description: 'Step description' },
                    order: { type: 'integer', description: 'Display/execution order hint' },
                    required_capabilities: { type: 'array', items: { type: 'string' }, description: 'Capabilities the Agent must have' },
                    agent_id: { type: 'integer', description: 'Specific Agent to use (overrides capability matching)' },
                    task_template_id: { type: 'integer', description: 'Task template to instantiate for this step' },
                    depends_on: { type: 'array', items: { type: 'string' }, description: 'List of step_key values this step depends on' },
                    timeout_seconds: { type: 'integer', description: 'Step-level timeout in seconds' },
                    retry_count: { type: 'integer', description: 'Number of automatic retries on failure' },
                    on_failure: { type: 'string', enum: ['abort', 'skip', 'continue'], description: 'What to do on failure (default: abort)' },
                  },
                  required: ['step_key'],
                },
              },
            },
            required: ['name', 'steps'],
          },
        },
        {
          name: 'get_workflow',
          description: 'Get a single workflow definition with its steps.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'update_workflow',
          description: 'Update a workflow definition and its steps (full replacement of steps if provided).',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
              name: { type: 'string', description: 'New name' },
              description: { type: 'string', description: 'New description' },
              definition: { type: 'object', description: 'New definition JSON' },
              is_active: { type: 'boolean', description: 'Whether the workflow can be launched' },
              steps: {
                type: 'array',
                description: 'Replacement steps (if provided, all existing steps are replaced)',
                items: {
                  type: 'object',
                  properties: {
                    step_key: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    order: { type: 'integer' },
                    required_capabilities: { type: 'array', items: { type: 'string' } },
                    agent_id: { type: 'integer' },
                    task_template_id: { type: 'integer' },
                    depends_on: { type: 'array', items: { type: 'string' } },
                    timeout_seconds: { type: 'integer' },
                    retry_count: { type: 'integer' },
                    on_failure: { type: 'string', enum: ['abort', 'skip', 'continue'] },
                  },
                  required: ['step_key'],
                },
              },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'delete_workflow',
          description: 'Delete a workflow definition.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'launch_workflow',
          description: 'Launch a new run of a workflow. Creates tasks for each step, assigns matching Agents, and starts entry-point steps (those with no dependencies).',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow definition ID' },
              project_id: { type: 'integer', description: 'Project ID for spawned tasks' },
              root_task_id: { type: 'integer', description: 'Optional root task to attach the workflow to' },
              context: { type: 'object', description: 'Run-level context/parameters passed to steps' },
            },
            required: ['workflow_id', 'project_id'],
          },
        },
        {
          name: 'list_workflow_runs',
          description: 'List workflow runs for the current user.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Filter by workflow ID' },
              status: { type: 'string', description: 'Filter by status (pending/running/succeeded/failed/cancelled)' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
          },
        },
        {
          name: 'get_workflow_step_stats',
          description: 'Per-step-key execution stats across the user workflow runs: total/succeeded/failed/skipped, success rate, and average duration. Reveals bottleneck and chronic-failure steps.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max number of step keys to return (1-100, default 30)' },
            },
          },
        },
        {
          name: 'get_workflow_run_duration_percentiles',
          description: 'Daily trend of workflow run duration percentiles (P50/P90/P95). For each day, aggregates completed WorkflowRun durations and returns percentiles. Useful for spotting regressions in workflow execution time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_workflow_step_failure_rate',
          description: 'Per-step-key failure rate ranking. For each step_key: total runs, failed count, failure rate percentage. Sorted by failure rate descending. Reveals which workflow steps are the least reliable.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max step keys returned (1-50, default 15)' },
            },
          },
        },
        {
          name: 'get_workflow_step_cofailure_matrix',
          description: 'Step-key co-failure matrix. For each failed workflow run, collects failed step_keys. Builds a symmetric co-occurrence matrix showing which steps tend to fail together, indicating shared failure causes or cascading failures.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Matrix dimension / max step keys (2-15, default 8)' },
            },
          },
        },
        {
          name: 'get_workflow_step_retry_topology',
          description: 'Step retry topology. Groups WorkflowStepRun by step_key, counting retries (attempt>1), first-attempt success rate, and retry success rate. Reveals whether retries actually recover failures and which steps are most retried.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max step keys returned (1-30, default 15)' },
            },
          },
        },
        {
          name: 'get_workflow_step_hourly_distribution',
          description: 'Step execution hour-of-day distribution. Groups WorkflowStepRun by (step_key, hour) based on started_at. Returns per-step hourly distribution and business-hours ratio. Reveals which steps run during business hours vs overnight.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max step keys returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_workflow_step_dependency_bottleneck',
          description: 'Workflow step dependency bottleneck analysis. Computes DAG critical path (longest duration path) per workflow, identifies bottleneck steps by their share of total critical path time. Reveals which steps dominate workflow execution time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max workflows returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_capability_gap_analysis',
          description: 'Agent capability gap analysis. Compares each agent\'s declared capabilities against actual experience domains. Identifies gaps (unclaimed expertise) and overclaims (unsupported capabilities) with coverage scores.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 10)' },
              min_confidence: { type: 'number', description: 'Minimum experience confidence threshold (0.0-1.0, default 0.5)' },
            },
          },
        },
        {
          name: 'get_collaboration_graph_timeline',
          description: 'Day-by-day collaboration graph snapshots for timeline replay. Returns bucketed (day/week) snapshots of collaboration edges between agents, showing how collaboration patterns evolve over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 14)' },
              bucket: { type: 'string', description: 'Bucket type: day or week (default day)' },
              limit: { type: 'integer', description: 'Max edges per snapshot (1-200, default 50)' },
            },
          },
        },
        {
          name: 'get_task_allocation_fairness',
          description: 'Task allocation fairness analysis. Computes Gini coefficient and Lorenz curve for task distribution across agents. Identifies allocation inequality: Gini 0 = equal, 1 = all tasks to one agent.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_workflow_similarity_matrix',
          description: 'Workflow run similarity matrix. Computes pairwise Jaccard similarity between workflow run step_key sets. Returns matrix and most/least similar run pairs. Reveals how consistent workflow executions are.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max workflow definitions (1-10, default 5)' },
              max_runs: { type: 'integer', description: 'Max runs per workflow (2-50, default 20)' },
            },
          },
        },
        {
          name: 'get_agent_run_resource_trend',
          description: 'Per-agent daily run count and average duration trend. Returns sparkline-friendly daily series for run count and average duration per agent over the lookback window.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 14)' },
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_workflow_failed_steps_by_duration',
          description: 'Rank failed workflow steps by average wall-clock duration (finished - started). Per step_key: failures count, avg/median/max duration in seconds, sorted by avg duration descending. Reveals which failing steps burn the most time before giving up.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max number of step keys to return (1-100, default 20)' },
            },
          },
        },
        {
          name: 'get_workflow_run_trend',
          description: 'Daily workflow run outcome trend: per-day succeeded vs failed counts over the last N days (default 30), using finished_at. Useful for charting workflow reliability over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_workflow_success_rate_by_workflow',
          description: 'Per-workflow run success rate comparison over the last N days (default 30). Returns top workflows by total finished runs with succeeded/failed/cancelled counts, success_rate, and avg_duration. Reveals which workflows are most/least reliable.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max workflows to return (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_workflow_run',
          description: 'Get a single workflow run with step details.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'get_workflow_run_console',
          description: 'Step-level real-time console for a workflow run. Aggregates each step run with its sandbox execution, effective params (runtime overrides merged with definition), recent run logs, duration, and any conflicts tied to the run — a single payload for monitoring/intervening on a running workflow.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              log_limit: { type: 'integer', description: 'Max recent RunLog entries per step (1-50, default 5)' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'cancel_workflow_run',
          description: 'Cancel a running workflow. All pending/running steps are cancelled.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'pause_workflow_run',
          description: 'Pause a running workflow. Already-running steps continue, but no new steps will be started until resumed.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'resume_workflow_run',
          description: 'Resume a paused workflow. The DAG engine re-evaluates which steps can start.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'retry_workflow_run',
          description: 'Retry a failed workflow by resetting failed/skipped steps and re-advancing the DAG.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
            },
            required: ['run_id'],
          },
        },
        {
          name: 'complete_workflow_step',
          description: 'Mark a workflow step as completed (or failed) and advance the DAG. This is the callback that Agents call when they finish a step. The result_summary is automatically saved to SharedContext for downstream steps.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key from the workflow definition' },
              success: { type: 'boolean', description: 'Whether the step succeeded (default true)' },
              error: { type: 'string', description: 'Error message if the step failed' },
              result_summary: { type: 'string', description: 'Summary of the step result, automatically saved to SharedContext for downstream steps to read' },
            },
            required: ['run_id', 'step_key'],
          },
        },
        {
          name: 'register_capabilities',
          description: 'Register new capabilities for an Agent at runtime. Use mode "merge" to add capabilities without removing existing ones, or "replace" to overwrite the full list. This lets Agents self-discover and advertise new skills.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'The Agent ID to update' },
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of capability strings to register',
              },
              mode: {
                type: 'string',
                enum: ['merge', 'replace'],
                description: 'How to apply: "merge" adds to existing capabilities (default), "replace" overwrites',
              },
            },
            required: ['agent_id', 'capabilities'],
          },
        },
        {
          name: 'escalate_overdue_tasks',
          description: 'Trigger priority auto-escalation for overdue tasks. Tasks past their due date that are not yet urgent will have their priority bumped one level (low→medium→high→urgent). Can be called by a cron job or manually.',
          inputSchema: {
            type: 'object',
            properties: {
              overdue_after_days: {
                type: 'integer',
                description: 'Number of days past due date before escalation (default: 1)',
                default: 1,
              },
            },
          },
        },
        {
          name: 'list_audit_logs',
          description: 'Query the immutable audit trail for platform operations. Supports filtering by action type, resource type, actor, and project.',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'Filter by action (e.g. agent.created, task.claimed, workflow.launched)' },
              resource_type: { type: 'string', description: 'Filter by resource type (agent, task, workflow_run)' },
              resource_id: { type: 'integer', description: 'Filter by resource ID' },
              actor_type: { type: 'string', description: 'Filter by actor type (human, agent, system)' },
              actor_agent_id: { type: 'integer', description: 'Filter by agent actor ID' },
              project_id: { type: 'integer', description: 'Filter by project ID' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
          },
        },
        {
          name: 'list_security_events',
          description: 'Unified security event feed: aggregates sandbox violations, agent conflicts, and security-relevant audit entries (sandbox./conflict./reputation./workflow_step_overridden) into a single time-ordered list. Each event is normalized to {event_type, occurred_at, severity, agent_id, title, detail, source, source_id, workflow_run_id}.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Filter to events involving this agent' },
              workflow_run_id: { type: 'integer', description: 'Filter to events tied to this workflow run' },
              event_type: { type: 'string', description: 'Filter by event source type: sandbox_violation | conflict | audit' },
              severity: { type: 'string', description: 'Filter by severity: INFO | WARNING | CRITICAL' },
              since: { type: 'string', description: 'Only events after this ISO 8601 datetime' },
              until: { type: 'string', description: 'Only events before this ISO 8601 datetime (use with since for a range)' },
              search: { type: 'string', description: 'Keyword search (case-insensitive) on event title/detail' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
          },
        },
        {
          name: 'export_security_events',
          description: 'Export the unified security event feed as CSV or JSON text (up to 1000 rows). Accepts the same filters as list_security_events (agent_id, workflow_run_id, event_type, severity, since, until, search) plus format (csv | json, default csv). CSV columns: occurred_at, event_type, severity, agent_id, workflow_run_id, source, source_id, title, detail. JSON returns the full normalized event objects.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Filter to events involving this agent' },
              workflow_run_id: { type: 'integer', description: 'Filter to events tied to this workflow run' },
              event_type: { type: 'string', description: 'Filter by event source type: sandbox_violation | conflict | audit' },
              severity: { type: 'string', description: 'Filter by severity: INFO | WARNING | CRITICAL' },
              since: { type: 'string', description: 'Only events after this ISO 8601 datetime' },
              until: { type: 'string', description: 'Only events before this ISO 8601 datetime' },
              search: { type: 'string', description: 'Keyword search (case-insensitive) on event title/detail' },
              format: { type: 'string', description: 'Export format: csv (default) | json' },
            },
          },
        },
        {
          name: 'security_events_daily_trend',
          description: 'Daily aggregation of security events for trend visualization. Reuses the same filters as list_security_events (agent_id, workflow_run_id, event_type, severity, since, until, search). Returns days: [{date, sandbox_violation, conflict, audit, total}] sorted ascending, and totals: {sandbox_violation, conflict, audit, total}.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Filter to events involving this agent' },
              workflow_run_id: { type: 'integer', description: 'Filter to events tied to this workflow run' },
              event_type: { type: 'string', description: 'Filter by event source type: sandbox_violation | conflict | audit' },
              severity: { type: 'string', description: 'Filter by severity: INFO | WARNING | CRITICAL' },
              since: { type: 'string', description: 'Only events after this ISO 8601 datetime' },
              until: { type: 'string', description: 'Only events before this ISO 8601 datetime' },
              search: { type: 'string', description: 'Keyword search (case-insensitive) on event title/detail' },
            },
          },
        },
        {
          name: 'security_events_by_agent',
          description: 'Per-agent aggregation of security events for ranking. Reuses the same filters as list_security_events. Returns agents: [{agent_id, name, total, sandbox_violation, conflict, audit, CRITICAL, WARNING, INFO}] sorted by total desc (top 50). Events without an agent_id are grouped under agent_id=null named "(无 Agent)".',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Filter to events involving this agent' },
              workflow_run_id: { type: 'integer', description: 'Filter to events tied to this workflow run' },
              event_type: { type: 'string', description: 'Filter by event source type: sandbox_violation | conflict | audit' },
              severity: { type: 'string', description: 'Filter by severity: INFO | WARNING | CRITICAL' },
              since: { type: 'string', description: 'Only events after this ISO 8601 datetime' },
              until: { type: 'string', description: 'Only events before this ISO 8601 datetime' },
              search: { type: 'string', description: 'Keyword search (case-insensitive) on event title/detail' },
            },
          },
        },
        {
          name: 'health_check',
          description: 'Run a full platform health check: expire stale agents, expire stale leases, and escalate overdue tasks. Designed to be called periodically by a cron job. Returns a summary of actions taken.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'broadcast_message',
          description: 'Send a broadcast message from one Agent to all other active Agents owned by the same user. Useful for coordination signals like "pause all tasks" or "new priority: urgent".',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'The Agent ID sending the broadcast' },
              content: { type: 'string', description: 'Broadcast message content' },
              task_id: { type: 'integer', description: 'Optional task ID to attach the event to' },
              event_type: { type: 'string', description: 'Event type label (default: "broadcast")' },
              payload: { type: 'object', description: 'Extra structured payload' },
            },
            required: ['agent_id', 'content'],
          },
        },
        {
          name: 'collaboration_metrics',
          description: 'Retrieve aggregate collaboration metrics for the dashboard: task completion rates, agent utilization, workflow success rates, handoff counts, daily trends, and top agents.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'integer', description: 'Scope metrics to a specific project (optional)' },
              days: { type: 'integer', description: 'Look-back window in days (default 7, max 90)' },
            },
          },
        },
        {
          name: 'list_workflow_triggers',
          description: 'List scheduled workflow triggers owned by the current user.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Filter by workflow ID' },
              is_active: { type: 'boolean', description: 'Filter by active status' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
          },
        },
        {
          name: 'create_workflow_trigger',
          description: 'Create a scheduled trigger for a workflow. Supports cron expressions for recurring runs and one-shot schedules.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID to trigger' },
              name: { type: 'string', description: 'Human-readable trigger name' },
              cron_expr: { type: 'string', description: 'Cron expression (e.g. "0 9 * * 1-5" for weekdays 9am). Must provide either cron_expr or one_shot_at.' },
              one_shot_at: { type: 'string', description: 'ISO datetime string for a one-shot trigger. After firing, the trigger deactivates.' },
              is_active: { type: 'boolean', description: 'Whether the trigger is enabled (default true)' },
              project_id: { type: 'integer', description: 'Default project_id for runs' },
              root_task_id: { type: 'integer', description: 'Default root_task_id for runs' },
              context_override: { type: 'object', description: 'Optional context JSON merged into each run' },
            },
            required: ['workflow_id', 'name'],
          },
        },
        {
          name: 'update_workflow_trigger',
          description: 'Update a workflow trigger. Only provided fields are changed.',
          inputSchema: {
            type: 'object',
            properties: {
              trigger_id: { type: 'integer', description: 'Trigger ID to update' },
              name: { type: 'string', description: 'Trigger name' },
              cron_expr: { type: 'string', description: 'Cron expression' },
              one_shot_at: { type: 'string', description: 'One-shot ISO datetime' },
              is_active: { type: 'boolean', description: 'Enable/disable trigger' },
              project_id: { type: 'integer', description: 'Project ID' },
              root_task_id: { type: 'integer', description: 'Root task ID' },
              context_override: { type: 'object', description: 'Context JSON override' },
            },
            required: ['trigger_id'],
          },
        },
        {
          name: 'delete_workflow_trigger',
          description: 'Delete a workflow trigger.',
          inputSchema: {
            type: 'object',
            properties: {
              trigger_id: { type: 'integer', description: 'Trigger ID to delete' },
            },
            required: ['trigger_id'],
          },
        },
        {
          name: 'fire_due_triggers',
          description: 'Check all active workflow triggers and fire those that are due. Designed to be called periodically by an external scheduler.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'mark_offline_agents',
          description: 'Scan all active/paused agents and mark those whose last heartbeat exceeds the offline threshold (30 min) as OFFLINE. Cancels their running assignments. Designed to be called periodically.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'timeout_workflow_steps',
          description: 'Scan all running workflow steps and mark those that have exceeded their timeout_seconds as FAILED, then advance the affected workflows. Designed to be called periodically.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'send_agent_message',
          description: 'Send a direct message from one Agent to another. Delivered via SSE (real-time) and Notification (persistent). Optionally attached to a task.',
          inputSchema: {
            type: 'object',
            properties: {
              from_agent_id: { type: 'integer', description: 'Source Agent ID' },
              to_agent_id: { type: 'integer', description: 'Target Agent ID' },
              content: { type: 'string', description: 'Message content' },
              task_id: { type: 'integer', description: 'Optional task ID to attach the message to' },
              message_type: { type: 'string', description: 'Message type label (default: "direct_message")' },
              metadata: { type: 'object', description: 'Extra structured metadata' },
            },
            required: ['from_agent_id', 'to_agent_id', 'content'],
          },
        },
        {
          name: 'get_agent_messages',
          description: 'Get recent direct messages for an Agent (both sent and received).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              page: { type: 'integer', description: 'Page number' },
              per_page: { type: 'integer', description: 'Items per page' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'get_agent_collaborators',
          description: 'Aggregate an Agent\'s collaboration partners from direct-message audit logs — top partners by message count, with sent/received split. Useful for understanding which Agents collaborate most with this one.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              limit: { type: 'integer', description: 'Max partners to return (1-50, default 10)' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'collaboration_graph',
          description: 'Platform-wide Agent collaboration graph from direct-message audit logs — nodes (agents with message totals) and undirected edges (message counts between pairs). Useful for visualizing the collaboration network.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max edges to return (1-200, default 50)' },
              since: { type: 'string', description: 'ISO date/datetime lower bound (inclusive)' },
              until: { type: 'string', description: 'ISO date/datetime upper bound (inclusive)' },
            },
          },
        },
        {
          name: 'list_channels',
          description: 'List collaboration channels. Multiple Agents can join a channel to discuss and coordinate on tasks.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'integer', description: 'Filter by project ID' },
              task_id: { type: 'integer', description: 'Filter by task ID' },
            },
          },
        },
        {
          name: 'create_channel',
          description: 'Create a collaboration channel for multi-Agent discussion. Agents can be auto-added as members.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Channel name' },
              description: { type: 'string', description: 'Channel description' },
              project_id: { type: 'integer', description: 'Project scope (optional)' },
              task_id: { type: 'integer', description: 'Task scope (optional)' },
              agent_ids: { type: 'array', items: { type: 'integer' }, description: 'Agent IDs to add as initial members' },
            },
            required: ['name'],
          },
        },
        {
          name: 'send_channel_message',
          description: 'Send a message to a collaboration channel. All channel members will receive the message.',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: { type: 'integer', description: 'Channel ID' },
              agent_id: { type: 'integer', description: 'Sender Agent ID (null for human)' },
              content: { type: 'string', description: 'Message content' },
              message_type: { type: 'string', description: 'Message type (text, system, action)' },
            },
            required: ['channel_id', 'content'],
          },
        },
        {
          name: 'list_channel_messages',
          description: 'List messages in a collaboration channel, in chronological order.',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: { type: 'integer', description: 'Channel ID' },
              page: { type: 'integer', description: 'Page number (default 1)' },
              per_page: { type: 'integer', description: 'Messages per page (default 50)' },
            },
            required: ['channel_id'],
          },
        },
        {
          name: 'list_workflow_templates',
          description: 'List built-in workflow templates for common multi-Agent collaboration patterns (e.g. code review pipeline, research & report, bug fix flow).',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Filter by category (devops, research, review, development, coordination)' },
            },
          },
        },
        {
          name: 'get_workflow_template',
          description: 'Get details of a specific workflow template by key.',
          inputSchema: {
            type: 'object',
            properties: {
              template_key: { type: 'string', description: 'Template key (e.g. "code_review_pipeline", "research_and_report")' },
            },
            required: ['template_key'],
          },
        },
        {
          name: 'instantiate_workflow_template',
          description: 'Create a workflow from a built-in template. Optionally override name and project context.',
          inputSchema: {
            type: 'object',
            properties: {
              template_key: { type: 'string', description: 'Template key to instantiate' },
              name: { type: 'string', description: 'Override workflow name (optional)' },
              project_id: { type: 'integer', description: 'Project ID for the workflow (optional)' },
              root_task_id: { type: 'integer', description: 'Root task ID (optional)' },
            },
            required: ['template_key'],
          },
        },
        {
          name: 'claim_agent_task',
          description: 'Claim a specific task or the next claimable task for an Agent',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID',
              },
              task_id: {
                type: 'integer',
                description: 'Optional specific task ID to claim',
              },
              project_id: {
                type: 'integer',
                description: 'Optional project filter when claiming the next available task',
              },
              lease_seconds: {
                type: 'integer',
                description: 'Lease duration in seconds',
                default: 1800,
              },
              match_capabilities: {
                type: 'boolean',
                description: 'When claiming automatically, prefer tasks whose tags or text match the Agent capabilities',
                default: true,
              },
              dispatch_source: {
                type: 'string',
                enum: ['human'],
                description: 'Set to "human" when a coordinator or UI is manually dispatching a specific task to the Agent',
              },
              dispatch_notes: {
                type: 'string',
                description: 'Optional notes to store in run_metadata.dispatch_notes for a manual dispatch',
              },
              run_metadata: {
                type: 'object',
                description: 'Optional runtime metadata',
              },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'update_agent_assignment',
          description: 'Update an Agent assignment state, progress, feedback, or execution result',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'integer',
                description: 'The Agent ID',
              },
              assignment_id: {
                type: 'integer',
                description: 'The assignment ID',
              },
              state: {
                type: 'string',
                enum: ['assigned', 'claimed', 'running', 'waiting_human', 'review', 'done', 'failed', 'cancelled', 'expired'],
                description: 'New assignment state',
              },
              progress_rate: {
                type: 'integer',
                description: 'Progress percent from 0 to 100',
              },
              notes: {
                type: 'string',
                description: 'Internal assignment notes',
              },
              feedback_content: {
                type: 'string',
                description: 'Human-readable task feedback',
              },
              output_summary: {
                type: 'string',
                description: 'Execution output summary',
              },
              error: {
                type: 'string',
                description: 'Execution error details',
              },
              lease_seconds: {
                type: 'integer',
                description: 'Extend lease by this duration in seconds',
              },
              task_status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
                description: 'Optional task status override',
              },
              run_metadata: {
                type: 'object',
                description: 'Optional runtime metadata',
              },
            },
            required: ['agent_id', 'assignment_id'],
          },
        },
        {
          name: 'update_task_assignment',
          description: 'Update a task assignment as the current user or coordinator. Use this to approve, resume, or cancel items from list_review_queue.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The task ID',
              },
              assignment_id: {
                type: 'integer',
                description: 'The assignment ID',
              },
              state: {
                type: 'string',
                enum: ['assigned', 'claimed', 'running', 'waiting_human', 'review', 'done', 'failed', 'cancelled', 'expired'],
                description: 'New assignment state',
              },
              progress_rate: {
                type: 'integer',
                description: 'Progress percent from 0 to 100',
              },
              notes: {
                type: 'string',
                description: 'Internal assignment notes',
              },
              feedback_content: {
                type: 'string',
                description: 'Human-readable task feedback',
              },
              output_summary: {
                type: 'string',
                description: 'Execution output summary',
              },
              error: {
                type: 'string',
                description: 'Execution error details',
              },
              lease_seconds: {
                type: 'integer',
                description: 'Extend lease by this duration in seconds',
              },
              task_status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
                description: 'Optional task status override',
              },
              run_metadata: {
                type: 'object',
                description: 'Optional runtime metadata',
              },
            },
            required: ['task_id', 'assignment_id'],
          },
        },
        {
          name: 'list_collaboration_templates',
          description: 'List collaboration templates (built-in and user-created). Each template defines a team of Agents that work together.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Filter by category (review, research, devops, development, coordination)' },
            },
          },
        },
        {
          name: 'create_collaboration_template',
          description: 'Create a custom collaboration template defining a team of Agents.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Template name' },
              description: { type: 'string', description: 'Template description' },
              category: { type: 'string', description: 'Template category' },
              agent_specs: {
                type: 'array',
                description: 'Array of agent specifications',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Agent name' },
                    kind: { type: 'string', description: 'Agent kind (autonomous, coordinator, manual)' },
                    capabilities: { type: 'array', items: { type: 'string' }, description: 'Agent capabilities' },
                    collaboration_role: { type: 'string', description: 'Role in collaboration (leader, follower, standalone)' },
                  },
                  required: ['name'],
                },
              },
              workflow_id: { type: 'integer', description: 'Optional workflow ID to attach' },
            },
            required: ['name', 'agent_specs'],
          },
        },
        {
          name: 'delete_collaboration_template',
          description: 'Delete a user-created collaboration template.',
          inputSchema: {
            type: 'object',
            properties: {
              template_id: { type: 'integer', description: 'Template ID to delete' },
            },
            required: ['template_id'],
          },
        },
        {
          name: 'instantiate_collaboration_template',
          description: 'Instantiate a collaboration template: creates the Agents, a collaboration channel, and optionally launches the attached workflow.',
          inputSchema: {
            type: 'object',
            properties: {
              template_key: { type: 'string', description: 'Template key (e.g. "builtin:code_review_squad") or numeric ID' },
              project_id: { type: 'integer', description: 'Project ID for the instantiated agents and workflow' },
            },
            required: ['template_key'],
          },
        },
        {
          name: 'list_knowledge_entries',
          description: 'List knowledge entries for an Agent. Agents store insights, patterns, and solutions for cross-task reuse.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              domain: { type: 'string', description: 'Filter by knowledge domain' },
              entry_type: { type: 'string', description: 'Filter by type (insight, pattern, solution, reference, rule)' },
              tag: { type: 'string', description: 'Filter by tag' },
              search: { type: 'string', description: 'Search in title and content' },
              include_content: { type: 'boolean', description: 'Include full content (default true)', default: true },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'create_knowledge_entry',
          description: 'Create a knowledge entry for an Agent. Store insights, patterns, or solutions for future reuse.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              title: { type: 'string', description: 'Short descriptive title' },
              content: { type: 'string', description: 'Knowledge content (markdown, JSON, etc.)' },
              domain: { type: 'string', description: 'Knowledge domain (e.g. python, frontend, devops)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
              entry_type: { type: 'string', description: 'Type: insight, pattern, solution, reference, rule', default: 'insight' },
              source_task_id: { type: 'integer', description: 'Task that generated this knowledge' },
              confidence: { type: 'number', description: 'Confidence score 0.0-1.0', default: 1.0 },
              shared_with_project: { type: 'boolean', description: 'Share with project members', default: false },
              project_id: { type: 'integer', description: 'Project scope if shared' },
            },
            required: ['agent_id', 'title', 'content'],
          },
        },
        {
          name: 'get_knowledge_entry',
          description: 'Get a specific knowledge entry by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              entry_id: { type: 'integer', description: 'Knowledge entry ID' },
            },
            required: ['agent_id', 'entry_id'],
          },
        },
        {
          name: 'update_knowledge_entry',
          description: 'Update a knowledge entry (title, content, tags, confidence, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              entry_id: { type: 'integer', description: 'Knowledge entry ID' },
              title: { type: 'string', description: 'New title' },
              content: { type: 'string', description: 'New content' },
              domain: { type: 'string', description: 'New domain' },
              tags: { type: 'array', items: { type: 'string' }, description: 'New tags' },
              confidence: { type: 'number', description: 'New confidence score' },
              is_valid: { type: 'boolean', description: 'Mark as valid/invalid' },
              shared_with_project: { type: 'boolean', description: 'Toggle project sharing' },
            },
            required: ['agent_id', 'entry_id'],
          },
        },
        {
          name: 'delete_knowledge_entry',
          description: 'Delete (invalidate) a knowledge entry.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              entry_id: { type: 'integer', description: 'Knowledge entry ID' },
            },
            required: ['agent_id', 'entry_id'],
          },
        },
        {
          name: 'search_knowledge',
          description: 'Search an Agent\'s knowledge base by query, domain, or tags. Returns entries ranked by confidence and access frequency.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              q: { type: 'string', description: 'Search query' },
              domain: { type: 'string', description: 'Filter by domain' },
              tags: { type: 'string', description: 'Comma-separated tags' },
              entry_type: { type: 'string', description: 'Filter by type' },
              limit: { type: 'integer', description: 'Max results (default 20, max 100)', default: 20 },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_shared_knowledge',
          description: 'List knowledge entries shared with projects the current user is a member of.',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Filter by domain' },
              entry_type: { type: 'string', description: 'Filter by type' },
              search: { type: 'string', description: 'Search in title and content' },
            },
          },
        },
        {
          name: 'auto_extract_knowledge',
          description: 'Auto-extract knowledge from an Agent\'s recently completed tasks. Generates knowledge entries from task summaries and results.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              limit: { type: 'integer', description: 'Max tasks to process (default 10, max 50)', default: 10 },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_workflow_versions',
          description: 'List version history for a workflow. Each update creates a snapshot.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'get_workflow_version',
          description: 'Get a specific version snapshot of a workflow.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
              version_number: { type: 'integer', description: 'Version number' },
            },
            required: ['workflow_id', 'version_number'],
          },
        },
        {
          name: 'rollback_workflow',
          description: 'Rollback a workflow to a specific version. Creates a snapshot of the current version first.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
              version: { type: 'integer', description: 'Target version number to rollback to' },
            },
            required: ['workflow_id', 'version'],
          },
        },
        {
          name: 'diff_workflow_versions',
          description: 'Compare two versions of a workflow. Returns added, removed, and modified steps.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'integer', description: 'Workflow ID' },
              v1: { type: 'integer', description: 'First version number' },
              v2: { type: 'integer', description: 'Second version number' },
            },
            required: ['workflow_id', 'v1', 'v2'],
          },
        },
        {
          name: 'list_protocols',
          description: 'List collaboration protocols (proposals, votes, consensus, auctions, handoffs) with optional filters.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'integer', description: 'Filter by project' },
              status: { type: 'string', description: 'Filter by status (open, voting, accepted, rejected, expired, cancelled)' },
              protocol_type: { type: 'string', description: 'Filter by type (proposal, vote, consensus, auction, handoff)' },
              initiator_agent_id: { type: 'integer', description: 'Filter by initiator agent' },
            },
          },
        },
        {
          name: 'create_protocol',
          description: 'Create a collaboration protocol (proposal, vote, consensus, auction, or handoff) for structured multi-Agent decision making.',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_type: { type: 'string', description: 'Protocol type: proposal, vote, consensus, auction, handoff' },
              title: { type: 'string', description: 'Protocol title / proposal subject' },
              description: { type: 'string', description: 'Detailed description' },
              initiator_agent_id: { type: 'integer', description: 'Agent who initiates the protocol' },
              channel_id: { type: 'integer', description: 'Associated channel (optional)' },
              project_id: { type: 'integer', description: 'Project scope (optional)' },
              task_id: { type: 'integer', description: 'Related task (optional)' },
              config: { type: 'object', description: 'Protocol-specific config (e.g. quorum, timeout, auction rules)' },
              deadline: { type: 'string', description: 'ISO 8601 deadline (optional)' },
            },
            required: ['protocol_type', 'title', 'initiator_agent_id'],
          },
        },
        {
          name: 'get_protocol',
          description: 'Get a protocol with all its messages/responses.',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: { type: 'integer', description: 'Protocol ID' },
            },
            required: ['protocol_id'],
          },
        },
        {
          name: 'respond_to_protocol',
          description: 'Respond to a protocol (vote, bid, accept, reject, counter-proposal, comment). Some responses auto-resolve the protocol.',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: { type: 'integer', description: 'Protocol ID' },
              agent_id: { type: 'integer', description: 'Responding agent ID' },
              message_type: { type: 'string', description: 'Type: vote, bid, accept, reject, comment, counter_proposal' },
              content: { type: 'string', description: 'Message content' },
              payload: { type: 'object', description: 'Structured data (e.g. {choice: "for"}, {amount: 100})' },
            },
            required: ['protocol_id', 'agent_id', 'message_type'],
          },
        },
        {
          name: 'resolve_protocol',
          description: 'Manually resolve a protocol (force accept/reject/cancel).',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: { type: 'integer', description: 'Protocol ID' },
              resolution: { type: 'string', description: 'Resolution: accepted, rejected, cancelled' },
              result: { type: 'object', description: 'Optional result data' },
            },
            required: ['protocol_id', 'resolution'],
          },
        },
        {
          name: 'get_agent_reputation',
          description: 'Get the reputation record for an Agent. Reputation affects task assignment priority.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_reputations',
          description: 'List reputation records for all your Agents, ranked by score.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'recalculate_reputation',
          description: 'Recalculate an Agent\'s reputation from scratch based on task history.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'get_agent_reputation_history',
          description: 'Get the timeline of notable reputation changes for an Agent (failures and quality-feedback deltas), reconstructed from audit events. Each point carries the resulting score, so this is useful for charting the reputation trend over time.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              limit: { type: 'integer', description: 'Max number of points to return (1-500, default 100)' },
              since: { type: 'string', description: 'ISO timestamp lower bound (inclusive)' },
              until: { type: 'string', description: 'ISO timestamp upper bound (inclusive)' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_agent_experiences',
          description: 'List experiences for an Agent. Experiences capture success/failure patterns from past tasks.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_type: { type: 'string', description: 'Filter by type: success_pattern, failure_pattern, strategy, optimization, anti_pattern' },
              domain: { type: 'string', description: 'Filter by domain (e.g. python, frontend, devops)' },
              task_type: { type: 'string', description: 'Filter by task type' },
              is_shared: { type: 'string', description: 'Filter by shared status (true/false)' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'create_agent_experience',
          description: 'Manually create an experience record for an Agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_type: { type: 'string', description: 'Type: success_pattern, failure_pattern, strategy, optimization, anti_pattern' },
              domain: { type: 'string', description: 'Knowledge domain' },
              task_type: { type: 'string', description: 'Category of task' },
              capabilities_used: { type: 'array', items: { type: 'string' }, description: 'Capabilities relevant to this experience' },
              strategy: { type: 'string', description: 'Strategy or approach used' },
              outcome_pattern: { type: 'string', description: 'What happened — success factors or failure reasons' },
              key_learnings: { type: 'string', description: 'Concise takeaways for future similar tasks' },
              confidence: { type: 'number', description: 'Confidence score 0.0-1.0 (default 0.7)' },
              is_shared: { type: 'boolean', description: 'Whether to share with other agents (default false)' },
            },
            required: ['agent_id', 'experience_type', 'strategy'],
          },
        },
        {
          name: 'get_agent_experience',
          description: 'Get a specific experience record for an Agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_id: { type: 'integer', description: 'Experience ID' },
            },
            required: ['agent_id', 'experience_id'],
          },
        },
        {
          name: 'update_agent_experience',
          description: 'Update an experience record for an Agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_id: { type: 'integer', description: 'Experience ID' },
              strategy: { type: 'string', description: 'Updated strategy' },
              outcome_pattern: { type: 'string', description: 'Updated outcome pattern' },
              key_learnings: { type: 'string', description: 'Updated key learnings' },
              confidence: { type: 'number', description: 'Updated confidence 0.0-1.0' },
              is_shared: { type: 'boolean', description: 'Whether to share with other agents' },
              is_valid: { type: 'boolean', description: 'Whether this experience is still valid' },
            },
            required: ['agent_id', 'experience_id'],
          },
        },
        {
          name: 'delete_agent_experience',
          description: 'Delete (soft-delete) an experience record for an Agent.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_id: { type: 'integer', description: 'Experience ID' },
            },
            required: ['agent_id', 'experience_id'],
          },
        },
        {
          name: 'recommend_experiences',
          description: 'Recommend relevant experiences for an Agent given a task context. Searches own and shared experiences.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              domain: { type: 'string', description: 'Task domain' },
              task_type: { type: 'string', description: 'Task type' },
              capabilities: { type: 'string', description: 'Comma-separated capabilities' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'get_experiences_stats',
          description: 'Aggregate AgentExperience stats for the current user: totals, breakdowns by domain/task_type/experience_type, shared count, total reuses, average confidence. Reveals where the collective knowledge base is concentrated.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_experiences_low_confidence',
          description: 'List the current user valid experiences with confidence below max_confidence (default 0.5), sorted by confidence ascending. Each entry includes agent_id, domain, task_type, experience_type, confidence, times_reused, key_learnings excerpt. Surfaces weak knowledge entries needing reinforcement or removal.',
          inputSchema: {
            type: 'object',
            properties: {
              max_confidence: { type: 'number', description: 'Confidence threshold (default 0.5)' },
              limit: { type: 'integer', description: 'Max entries returned (default 20)' },
            },
          },
        },
        {
          name: 'get_experiences_scatter',
          description: 'Confidence × reuse-count scatter points for the user valid experiences. One point per experience: confidence, times_reused, domain, task_type, experience_type. Reveals whether high-confidence experiences actually get reused more. Caps via limit (default 200, most-reused first).',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max points returned (1-500, default 200)' },
            },
          },
        },
        {
          name: 'get_experiences_reuse_trend',
          description: 'Daily reuse + decay trend for the user valid experiences. Buckets experiences by last-reused (or creation) date. Per day: experiences reused, total reuse count, average confidence, decayed count (confidence<0.5). Reveals whether reuse keeps knowledge fresh or stale entries linger.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_experiences_confidence_decay_forecast',
          description: 'Confidence decay forecast using linear regression on daily averages. Projects 7 days ahead, reports regression slope, R-squared, and estimated days until average confidence drops below 0.5. Reveals whether the experience pool is decaying and when the decay threshold might be crossed.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Historical lookback window in days (7-365, default 30)' },
            },
          },
        },
        {
          name: 'get_experiences_decay_by_domain',
          description: 'Per-domain decay comparison for the user valid experiences. Aggregates by domain: total, active (confidence>=0.5), decayed (confidence<0.5), average confidence, total reuses. Sorted by decayed count descending. Reveals which knowledge domains have the most stale entries.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max domains returned (1-50, default 15)' },
            },
          },
        },
        {
          name: 'get_experiences_decay_by_task_type',
          description: 'Per-task-type decay comparison for the user valid experiences. Same as decay-by-domain but grouped by task_type. Reveals which task categories have the most stale / low-confidence entries.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max task types returned (1-50, default 15)' },
            },
          },
        },
        {
          name: 'get_experiences_confidence_distribution',
          description: 'Confidence interval distribution for the user valid experiences. Buckets into 5 intervals (0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0) with count, percentage, and average reuses. Reveals whether the experience pool is mostly high- or low-confidence.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_experiences_source_distribution',
          description: 'Experience count by creation source. Groups by origin: manual (no workflow run), workflow (has source_workflow_run_id), auto_step (has source_step_key but no workflow). Per-source: count, percentage, avg confidence, avg reuses. Reveals where the experience pool comes from.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_experiences_propagation_chain',
          description: 'Experience sharing propagation chain. Groups shared experiences by source agent with shared_count, total_reuses, top domains, and top propagated experiences. Reveals which agents contribute most to collective learning and how knowledge flows.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max source agents returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_experiences_skill_coverage_radar',
          description: 'Per-Agent skill coverage radar across experience domains. Returns top N domains and per-agent normalized scores (0-100) for radar/spider chart rendering. Reveals skill gaps and specialization patterns across the agent fleet.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 6)' },
              domains: { type: 'integer', description: 'Max domain axes (3-12, default 8)' },
            },
          },
        },
        {
          name: 'get_task_stats',
          description: 'Aggregate task lifecycle stats for the current user projects: total, by_status, by_priority, completion/cancellation rates, average lifecycle duration (hours) for done tasks, lifecycle duration buckets (0-1h ... >7d), average completion rate. Reveals throughput bottlenecks and abandonment.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_task_overdue_trend',
          description: 'Daily overdue task trend by due_date: per-day overdue count (due_date<now, status not done/cancelled) plus per-priority breakdown. Reveals whether overdue workload is accumulating over time and which priorities bear the brunt.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_task_overdue_by_assignee',
          description: 'Overdue task count grouped by assignee (Agent). Per agent: overdue count, by-priority breakdown, earliest overdue due_date. Sorted by overdue count descending. Reveals which agents bear the heaviest overdue burden.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_task_overdue_clustering',
          description: 'Overdue task clustering analysis by project and priority. Per cluster: project name, priority, count, avg days overdue, representative task titles. Reveals where overdue tasks concentrate and why.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max clusters returned (1-30, default 15)' },
            },
          },
        },
        {
          name: 'get_task_completion_by_priority',
          description: 'Task completion rate by priority. Groups tasks by priority with total/done/cancelled/completion_rate. Reveals whether high-priority tasks are delivered at a comparable rate to low-priority ones.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_task_completion_rate_by_project',
          description: 'Task completion rate snapshot comparison across projects. Groups tasks by project with total/done/in_progress/cancelled/completion_rate. Reveals which projects have the best/worst delivery rates.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max projects returned (1-30, default 10)' },
            },
          },
        },
        {
          name: 'get_task_priority_trend',
          description: 'Daily task priority distribution trend. Groups tasks by created_at date and priority level (critical/high/medium/low) over the last N days. Reveals how the task priority mix shifts over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_task_completion_forecast',
          description: 'Task completion forecast based on historical velocity. Computes daily done-task velocity over the lookback window, extrapolates to estimate when remaining tasks will be completed, with per-priority breakdown.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Velocity lookback window in days (7-365, default 30)' },
            },
          },
        },
        {
          name: 'get_task_completion_by_project',
          description: 'Daily task completion trend grouped by project. Buckets done tasks by calendar day of completed_at and project_id, returning per-project daily series plus totals (top N by total completed). Reveals which projects are actively delivering over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max projects returned (1-20, default 8)' },
            },
          },
        },
        {
          name: 'get_task_completion_by_assignee',
          description: 'Daily task completion trend grouped by assignee (Agent). Buckets done assignments by calendar day of completed_at and agent_id, returning per-agent daily series plus totals (top N by total completed). Reveals which agents are actively delivering over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 8)' },
            },
          },
        },
        {
          name: 'get_workflow_failure_correlation',
          description: 'Cross-dimension correlation between failed workflow steps and collaboration conflicts / sandbox violations. For each failed step, checks whether a conflict or sandbox violation involving the same Agent occurred within ±window_hours. Reports co-occurrence rates and top agents whose failures most coincide with conflicts/violations.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              window_hours: { type: 'integer', description: 'Correlation time window in hours (default 2)' },
            },
          },
        },
        {
          name: 'get_workflow_failure_correlation_by_step',
          description: 'Per-step-key failure correlation with conflicts / sandbox violations. Aggregates the same ±window_hours co-occurrence by step_key, returning for each step: failed count, with_conflict, with_violation, and rates. Reveals which steps most often trigger coordination breakdowns or sandbox escapes.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              window_hours: { type: 'integer', description: 'Correlation time window in hours (default 2)' },
            },
          },
        },
        {
          name: 'get_agent_productivity',
          description: 'Per-Agent productivity stats for the current user: total assignments, done, failed, cancelled, expired, in-progress, completion rate, and average completion duration (hours) for done assignments. Reveals each Agent throughput and reliability.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              limit: { type: 'integer', description: 'Max agents returned (default 20)' },
            },
          },
        },
        {
          name: 'get_agent_run_resource_usage',
          description: 'Agent run resource usage ranking. Per-agent: total runs, total wall-clock hours, average run duration in minutes. Sorted by total hours descending. Reveals which agents consume the most execution time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max agents returned (1-50, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_trend',
          description: 'Daily Agent assignment completion trend for the current user. Per-day done and failed TaskAssignment counts within the window, plus totals. Reveals whether throughput is rising or falling over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_alerts',
          description: 'Low-efficiency Agent alert list for the current user. Returns Agents whose completion rate < min_completion_rate (default 50) OR failure rate > max_failure_rate (default 30), with at least min_assignments (default 3) assignments. Each entry includes productivity fields and triggering reasons. Surfaces Agents needing attention.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              min_completion_rate: { type: 'number', description: 'Completion rate threshold (default 50)' },
              max_failure_rate: { type: 'number', description: 'Failure rate threshold (default 30)' },
              min_assignments: { type: 'integer', description: 'Minimum assignments to consider (default 3)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_by_kind',
          description: 'Productivity comparison grouped by Agent kind for the current user. For each kind (assistant/worker/orchestrator/...), aggregates assignments into totals, done, failed, cancelled, expired, in_progress, agent count, average completion rate, average failure rate, and average completion hours. Surfaces how each Agent class performs relative to its peers of the same kind.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_hourly_heatmap',
          description: 'Hour-of-day × Agent completion heatmap. Buckets done assignments by the hour (0-23) of completed_at and agent_id, returning a matrix plus per-agent totals and the fleet peak hour. Reveals when each Agent is most productive.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max agents returned (1-50, default 15)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_calendar_heatmap',
          description: 'Date × Agent completion calendar heatmap. Buckets done assignments by calendar date (YYYY-MM-DD) and agent_id over the last N days. Returns a {agent_id: {date: count}} matrix, per-agent totals, and date_range. Ideal for GitHub-style contribution calendars per agent.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 90)' },
              limit: { type: 'integer', description: 'Max agents returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_productivity_weekly_comparison',
          description: 'Week-over-week Agent productivity comparison. Returns per-agent done counts for current week vs previous week with change percentage. Reveals which agents are ramping up or slowing down.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max agents returned (1-30, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_failure_reasons',
          description: 'Distribution of Agent run failure reasons. Buckets FAILED AgentRun rows by a normalized error type (first line of the error text, lowercased, truncated to 80 chars). Returns per-reason counts and affected agent names, sorted by count. Surfaces the most common failure causes across the fleet.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max reasons returned (1-50, default 15)' },
            },
          },
        },
        {
          name: 'get_agent_failure_error_patterns',
          description: 'Agent failure error pattern clustering. Groups FAILED AgentRun rows by error text prefix, returning pattern clusters with count, affected agents, peak hour, and hourly distribution. Reveals systemic failure patterns and timing correlations.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max patterns returned (1-20, default 10)' },
              prefix_len: { type: 'integer', description: 'Error text prefix length for grouping (10-120, default 40)' },
            },
          },
        },
        {
          name: 'get_conflicts_sandbox_correlation',
          description: 'Cross-dimension correlation between Agent conflicts and sandbox violations. For each conflict, checks whether a sandbox violation involving a conflict party occurred within ±window_hours. Reports co-occurrence rate, breakdown by conflict_type, and top agents whose conflicts most coincide with violations.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              window_hours: { type: 'integer', description: 'Correlation time window in hours (default 2)' },
            },
          },
        },
        {
          name: 'get_agent_health',
          description: 'Per-Agent composite health score (0-100) for the current user, combining reputation (0.4), assignment completion rate (0.3), conflict penalty (0.15), and sandbox violation penalty (0.15). Also returns raw sub-scores. Reveals a single comparable metric across all Agents.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days for productivity/conflict/violation sub-scores (default 30)' },
            },
          },
        },
        {
          name: 'get_agent_health_trend',
          description: 'Daily reputation-derived health trend for the current user Agents. Aggregates reputation.update audit entries by day: average new_score (last-seen per agent that day), positive delta count, negative delta count. Also annotates per-day conflict event count and sandbox violation count so drops in reputation can be correlated with incidents. Optional agent_id drills down to a single Agent. A proxy for whether fleet health is rising or falling over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              agent_id: { type: 'integer', description: 'Optional: drill down to a single Agent ID (omit for fleet-wide trend)' },
            },
          },
        },
        {
          name: 'get_agent_health_state_transitions',
          description: 'Agent health state transition flow. Classifies each agent-day as healthy/degraded/critical based on reputation score thresholds. Counts state-to-state transitions, returning a flow suitable for Sankey visualization. Reveals how often agents degrade or recover.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (7-365, default 30)' },
            },
          },
        },
        {
          name: 'get_agent_health_alerts',
          description: 'Low-health Agent alert list for the current user. Returns Agents whose composite health_score < min_health_score (default 60), with triggering reasons (low reputation / low completion / conflicts / violations) and concrete improvement recommendations. Optional w_reputation/w_completion/w_conflict/w_violation override the default sub-score weights (0.4/0.3/0.15/0.15, normalised to 1). Each entry includes full health fields. Surfaces Agents needing attention.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
              min_health_score: { type: 'number', description: 'Health score threshold (default 60)' },
              w_reputation: { type: 'number', description: 'Reputation sub-score weight (default 0.4)' },
              w_completion: { type: 'number', description: 'Completion sub-score weight (default 0.3)' },
              w_conflict: { type: 'number', description: 'Conflict sub-score weight (default 0.15)' },
              w_violation: { type: 'number', description: 'Violation sub-score weight (default 0.15)' },
            },
          },
        },
        {
          name: 'share_agent_experience',
          description: 'Share an Agent\'s experience with other agents in the same domain.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              experience_id: { type: 'integer', description: 'Experience ID to share' },
            },
            required: ['agent_id', 'experience_id'],
          },
        },
        {
          name: 'learn_from_experience',
          description: 'An Agent internalizes a shared experience from another Agent for collective learning.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID that will learn' },
              experience_id: { type: 'integer', description: 'Shared experience ID to learn from' },
            },
            required: ['agent_id', 'experience_id'],
          },
        },
        {
          name: 'list_shared_experiences',
          description: 'List shared experiences from other Agents that this Agent can learn from.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              domain: { type: 'string', description: 'Filter by domain' },
              task_type: { type: 'string', description: 'Filter by task type' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'auto_extract_experiences',
          description: 'Auto-extract experiences from an Agent\'s recent task outcomes (last 7 days).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'authorize_cross_project_agent',
          description: 'Authorize an Agent to work in a different project. Requires ADMIN/OWNER access to the target project.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID to authorize' },
              project_id: { type: 'integer', description: 'Target project ID' },
              role_in_project: { type: 'string', description: 'Role in target project: contributor, reviewer, observer (default: contributor)' },
              capabilities_override: { type: 'array', items: { type: 'string' }, description: 'Override capabilities for this project' },
              max_concurrent_tasks: { type: 'integer', description: 'Max concurrent tasks in this project (default: 3)' },
            },
            required: ['agent_id', 'project_id'],
          },
        },
        {
          name: 'revoke_cross_project_agent',
          description: 'Revoke an Agent\'s cross-project authorization.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              project_id: { type: 'integer', description: 'Project ID' },
            },
            required: ['agent_id', 'project_id'],
          },
        },
        {
          name: 'list_agent_cross_projects',
          description: 'List all projects an Agent is authorized to work in.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'list_project_external_agents',
          description: 'List all external Agents authorized to work in a project.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'integer', description: 'Project ID' },
            },
            required: ['project_id'],
          },
        },
        {
          name: 'discover_cross_project_agents',
          description: 'Discover agents across all accessible projects, optionally filtered by capability.',
          inputSchema: {
            type: 'object',
            properties: {
              capability: { type: 'string', description: 'Filter by capability' },
            },
          },
        },
        {
          name: 'find_capable_agents_cross_project',
          description: 'Find agents across all accessible projects that have specific capabilities.',
          inputSchema: {
            type: 'object',
            properties: {
              capabilities: { type: 'string', description: 'Comma-separated capabilities to search for' },
              project_id: { type: 'integer', description: 'Optional project ID filter' },
            },
            required: ['capabilities'],
          },
        },
        {
          name: 'apply_experience_decay',
          description: 'Apply time-based confidence decay to an Agent\'s experiences. Older, unused experiences lose confidence.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              days_threshold: { type: 'integer', description: 'Min age in days before decay (default 30)' },
              decay_rate: { type: 'number', description: 'Decay factor per cycle (default 0.02)' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'validate_experience',
          description: 'Cross-validate an experience by another Agent. Confirm or refute accuracy to adjust confidence.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Validator Agent ID' },
              experience_id: { type: 'integer', description: 'Experience ID to validate' },
              is_accurate: { type: 'boolean', description: 'Whether the experience is accurate (true = validate, false = refute)' },
            },
            required: ['agent_id', 'experience_id', 'is_accurate'],
          },
        },
        {
          name: 'get_experience_validation_stats',
          description: 'Get validation statistics for an Agent\'s experiences (confidence distribution, shared count, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'decay_all_experiences',
          description: 'System maintenance: apply decay to all agents\' experiences. Typically called by scheduled jobs.',
          inputSchema: {
            type: 'object',
            properties: {
              days_threshold: { type: 'integer', description: 'Min age in days before decay (default 30)' },
              decay_rate: { type: 'number', description: 'Decay factor per cycle (default 0.02)' },
            },
          },
        },
        {
          name: 'suggest_capability_adaptation',
          description: 'Suggest capability adaptations for an Agent based on its experience patterns. Returns suggested additions/removals.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'apply_capability_adaptation',
          description: 'Apply capability adaptations to an Agent (add or remove capabilities).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              additions: { type: 'array', items: { type: 'string' }, description: 'Capabilities to add' },
              removals: { type: 'array', items: { type: 'string' }, description: 'Capabilities to remove' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'find_cross_project_tasks',
          description: 'Find claimable tasks across all projects an Agent is authorized for.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              limit: { type: 'integer', description: 'Max tasks to return (default 20)' },
            },
            required: ['agent_id'],
          },
        },
        {
          name: 'claim_cross_project_task',
          description: 'Claim a task from a cross-project for an Agent. Requires cross-project authorization.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              task_id: { type: 'integer', description: 'Task ID to claim' },
              lease_seconds: { type: 'integer', description: 'Lease duration in seconds (default 1800)' },
            },
            required: ['agent_id', 'task_id'],
          },
        },
        {
          name: 'get_protocol_analytics',
          description: 'Get analytics for collaboration protocols: usage by type, resolution rates, participation.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Look-back window in days (default 30)' },
            },
          },
        },
        {
          name: 'add_deliberation_message',
          description: 'Add a deliberation message (argument/evidence/comment) to a deliberation protocol. Enables multi-round discussion before voting.',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: { type: 'integer', description: 'Protocol ID' },
              agent_id: { type: 'integer', description: 'Agent ID adding the message' },
              message_type: { type: 'string', description: 'Type: comment, argument, evidence' },
              content: { type: 'string', description: 'Message content' },
            },
            required: ['protocol_id', 'agent_id', 'message_type', 'content'],
          },
        },
        {
          name: 'list_sandboxes',
          description: 'List Agent sandbox policies owned by the current user. Optionally filter by agent_id or active_only.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Filter by Agent ID' },
              active_only: { type: 'boolean', description: 'Only active sandboxes (default false)' },
              include_stats: { type: 'boolean', description: 'Include execution/violation stats (default true)' },
            },
          },
        },
        {
          name: 'create_sandbox',
          description: 'Create a new Agent sandbox policy governing tool/network/filesystem/resource access during execution.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Sandbox name' },
              description: { type: 'string', description: 'Sandbox description' },
              agent_id: { type: 'integer', description: 'Agent to bind this sandbox to (optional)' },
              security_level: { type: 'string', description: 'strict | moderate | permissive (default moderate)' },
              allowed_tools: { type: 'array', items: { type: 'string' }, description: 'Whitelist of tool names' },
              blocked_tools: { type: 'array', items: { type: 'string' }, description: 'Blocklist of tool names' },
              allowed_network_hosts: { type: 'array', items: { type: 'string' }, description: 'Allowed egress hosts' },
              fs_write_paths: { type: 'array', items: { type: 'string' }, description: 'Allowed write path roots' },
              fs_read_paths: { type: 'array', items: { type: 'string' }, description: 'Allowed read path roots' },
              max_memory_mb: { type: 'integer', description: 'Max memory in MB (0 = unlimited)' },
              max_cpu_seconds: { type: 'integer', description: 'Max CPU seconds (0 = unlimited)' },
              max_output_tokens: { type: 'integer', description: 'Max output tokens (0 = unlimited)' },
              timeout_seconds: { type: 'integer', description: 'Hard wall-clock timeout (0 = no timeout)' },
            },
            required: ['name', 'security_level'],
          },
        },
        {
          name: 'get_sandbox',
          description: 'Get a sandbox policy by ID.',
          inputSchema: {
            type: 'object',
            properties: { sandbox_id: { type: 'integer', description: 'Sandbox ID' } },
            required: ['sandbox_id'],
          },
        },
        {
          name: 'update_sandbox',
          description: 'Update an existing sandbox policy.',
          inputSchema: {
            type: 'object',
            properties: {
              sandbox_id: { type: 'integer', description: 'Sandbox ID' },
              name: { type: 'string' },
              description: { type: 'string' },
              security_level: { type: 'string' },
              allowed_tools: { type: 'array', items: { type: 'string' } },
              blocked_tools: { type: 'array', items: { type: 'string' } },
              allowed_network_hosts: { type: 'array', items: { type: 'string' } },
              fs_write_paths: { type: 'array', items: { type: 'string' } },
              fs_read_paths: { type: 'array', items: { type: 'string' } },
              max_memory_mb: { type: 'integer' },
              max_cpu_seconds: { type: 'integer' },
              max_output_tokens: { type: 'integer' },
              timeout_seconds: { type: 'integer' },
              is_active: { type: 'boolean' },
            },
            required: ['sandbox_id'],
          },
        },
        {
          name: 'delete_sandbox',
          description: 'Delete a sandbox policy (only if no active executions reference it).',
          inputSchema: {
            type: 'object',
            properties: { sandbox_id: { type: 'integer', description: 'Sandbox ID' } },
            required: ['sandbox_id'],
          },
        },
        {
          name: 'bind_agent_sandbox',
          description: 'Bind a sandbox policy to an Agent (replaces any existing active binding).',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'integer', description: 'Agent ID' },
              sandbox_id: { type: 'integer', description: 'Sandbox ID to bind' },
            },
            required: ['agent_id', 'sandbox_id'],
          },
        },
        {
          name: 'get_agent_sandbox',
          description: 'Get the active sandbox bound to an Agent (if any).',
          inputSchema: {
            type: 'object',
            properties: { agent_id: { type: 'integer', description: 'Agent ID' } },
            required: ['agent_id'],
          },
        },
        {
          name: 'check_sandbox_action',
          description: 'Dry-run check whether an action (tool/network/fs_write) is permitted under a sandbox policy.',
          inputSchema: {
            type: 'object',
            properties: {
              sandbox_id: { type: 'integer', description: 'Sandbox ID' },
              action: { type: 'string', description: 'tool | network | fs_write' },
              target: { type: 'string', description: 'Tool name, host, or path to check' },
            },
            required: ['sandbox_id', 'action', 'target'],
          },
        },
        {
          name: 'start_sandbox_execution',
          description: 'Start a new sandboxed execution for an Agent. Freezes the policy snapshot and returns the execution record + policy envelope.',
          inputSchema: {
            type: 'object',
            properties: {
              sandbox_id: { type: 'integer', description: 'Sandbox ID' },
              agent_id: { type: 'integer', description: 'Executing Agent ID' },
              run_id: { type: 'integer', description: 'Associated AgentRun ID (optional)' },
              step_run_id: { type: 'integer', description: 'Associated WorkflowStepRun ID (optional)' },
            },
            required: ['sandbox_id', 'agent_id'],
          },
        },
        {
          name: 'complete_sandbox_execution',
          description: 'Mark a sandboxed execution as completed with aggregated usage stats.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_id: { type: 'integer', description: 'Execution ID' },
              output_summary: { type: 'string', description: 'Execution output summary' },
              error: { type: 'string', description: 'Error message if any' },
              peak_memory_mb: { type: 'integer' },
              cpu_seconds: { type: 'integer' },
              output_tokens: { type: 'integer' },
              tool_calls: { type: 'integer' },
              network_calls: { type: 'integer' },
            },
            required: ['execution_id'],
          },
        },
        {
          name: 'revoke_sandbox_execution',
          description: 'Manually revoke (terminate) a running sandboxed execution.',
          inputSchema: {
            type: 'object',
            properties: { execution_id: { type: 'integer', description: 'Execution ID' } },
            required: ['execution_id'],
          },
        },
        {
          name: 'report_sandbox_violation',
          description: 'Report a policy violation during a sandboxed execution. Optionally terminate the execution.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_id: { type: 'integer', description: 'Execution ID' },
              violation_type: { type: 'string', description: 'disallowed_tool | network_blocked | fs_write_blocked | fs_read_blocked | resource_limit | timeout | capability_exceed' },
              attempted_action: { type: 'string', description: 'What the agent tried to do' },
              detail: { type: 'string', description: 'Why it was blocked' },
              terminate: { type: 'boolean', description: 'Whether to terminate the execution (default false)' },
            },
            required: ['execution_id', 'violation_type'],
          },
        },
        {
          name: 'get_sandbox_execution',
          description: 'Get a sandbox execution record with its violations.',
          inputSchema: {
            type: 'object',
            properties: { execution_id: { type: 'integer', description: 'Execution ID' } },
            required: ['execution_id'],
          },
        },
        {
          name: 'list_sandbox_executions',
          description: 'List executions under a sandbox policy.',
          inputSchema: {
            type: 'object',
            properties: {
              sandbox_id: { type: 'integer', description: 'Sandbox ID' },
              status: { type: 'string', description: 'Filter by execution status' },
              agent_id: { type: 'integer', description: 'Filter by Agent ID' },
            },
            required: ['sandbox_id'],
          },
        },
        {
          name: 'get_sandbox_dashboard',
          description: 'Get aggregate sandbox stats for the current user: total sandboxes, executions, violations, breakdowns.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_sandbox_violation_trend',
          description: 'Daily sandbox violation counts + by-type breakdown over the last N days (default 30). Useful for spotting whether a policy change or Agent change is producing more violations.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_sandbox_violations_by_agent',
          description: 'Per-Agent sandbox violation counts over the last N days, top N by total, enriched with name/kind and a by-violation-type sub-count. Reveals which Agents most frequently attempt disallowed actions.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max number of agents (1-100, default 20)' },
            },
          },
        },
        {
          name: 'get_sandbox_template_usage',
          description: 'Sandbox policy template instantiation stats: per-template usage count and how many instances were bound to an Agent. Reveals which preset templates are most popular.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_step_sandbox_execution',
          description: 'Get the sandboxed execution (if any) bound to a workflow step run. Surfaces the auto-started execution + frozen policy snapshot + violations.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key' },
            },
            required: ['run_id', 'step_key'],
          },
        },
        {
          name: 'report_step_sandbox_violation',
          description: 'Report a sandbox policy violation for a workflow step execution. If terminate_step is true, the step is marked FAILED and the sandboxed execution is marked VIOLATED.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key' },
              violation_type: { type: 'string', description: 'disallowed_tool | network_blocked | fs_write_blocked | fs_read_blocked | resource_limit | timeout | capability_exceed' },
              attempted_action: { type: 'string', description: 'What the agent tried to do' },
              detail: { type: 'string', description: 'Why it was blocked' },
              terminate_step: { type: 'boolean', description: 'Whether to terminate the step (default false)' },
            },
            required: ['run_id', 'step_key', 'violation_type'],
          },
        },
        {
          name: 'set_step_runtime_override',
          description: 'Dynamically reconfigure a not-yet-terminal workflow step (runtime overrides). Only PENDING/WAITING steps accept start-time params; RUNNING steps accept only timeout_seconds/retry_count.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key' },
              overrides: {
                type: 'object',
                description: 'Override keys: agent_id, required_capabilities, timeout_seconds, retry_count, on_failure, condition, task_template_id, sub_workflow_id',
                properties: {
                  agent_id: { type: 'integer' },
                  required_capabilities: { type: 'array', items: { type: 'string' } },
                  timeout_seconds: { type: 'integer' },
                  retry_count: { type: 'integer' },
                  on_failure: { type: 'string' },
                  condition: { type: 'object' },
                  task_template_id: { type: 'integer' },
                  sub_workflow_id: { type: 'integer' },
                },
              },
              merge: { type: 'boolean', description: 'Merge with existing overrides (default true); false replaces them' },
            },
            required: ['run_id', 'step_key', 'overrides'],
          },
        },
        {
          name: 'clear_step_runtime_override',
          description: 'Clear runtime overrides for a workflow step run, reverting to the workflow definition.',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key' },
            },
            required: ['run_id', 'step_key'],
          },
        },
        {
          name: 'get_step_effective_params',
          description: 'Get the effective parameters for a workflow step run (runtime overrides merged with the step definition).',
          inputSchema: {
            type: 'object',
            properties: {
              run_id: { type: 'integer', description: 'Workflow run ID' },
              step_key: { type: 'string', description: 'Step key' },
            },
            required: ['run_id', 'step_key'],
          },
        },
        {
          name: 'scan_conflicts',
          description: 'Run a conflict detection scan: duplicate claims, stale assignments, protocol deadlocks. Creates conflict records for new issues.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_conflicts',
          description: 'List collaboration conflicts for the current user, optionally filtered by status/type.',
          inputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Filter by status: detected|acknowledged|resolving|resolved|ignored' },
              type: { type: 'string', description: 'Filter by conflict type' },
              active_only: { type: 'boolean', description: 'Only unresolved (default true)' },
            },
          },
        },
        {
          name: 'get_conflict',
          description: 'Get a conflict record by ID.',
          inputSchema: {
            type: 'object',
            properties: { conflict_id: { type: 'integer', description: 'Conflict ID' } },
            required: ['conflict_id'],
          },
        },
        {
          name: 'resolve_conflict',
          description: 'Resolve a conflict with a chosen strategy. For duplicate claims, FIRST_WINS/HIGHEST_REPUTATION/LEAST_LOADED also revokes losing assignments; for stale assignments, AUTO_RETRY expires them.',
          inputSchema: {
            type: 'object',
            properties: {
              conflict_id: { type: 'integer', description: 'Conflict ID' },
              strategy: { type: 'string', description: 'first_wins | highest_reputation | least_loaded | manual | auto_retry | split | escalate' },
              description: { type: 'string', description: 'Resolution note' },
            },
            required: ['conflict_id', 'strategy'],
          },
        },
        {
          name: 'acknowledge_conflict',
          description: 'Mark a conflict as acknowledged (seen).',
          inputSchema: {
            type: 'object',
            properties: { conflict_id: { type: 'integer', description: 'Conflict ID' } },
            required: ['conflict_id'],
          },
        },
        {
          name: 'ignore_conflict',
          description: 'Dismiss a conflict without action.',
          inputSchema: {
            type: 'object',
            properties: { conflict_id: { type: 'integer', description: 'Conflict ID' } },
            required: ['conflict_id'],
          },
        },
        {
          name: 'get_conflicts_dashboard',
          description: 'Aggregate conflict stats for the current user: totals, active count, breakdowns by type/status/severity.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_conflicts_trend',
          description: 'Daily conflict detection vs resolution counts over the last N days (default 30). Each bucket has {date, detected, resolved}. Useful for seeing whether conflicts accumulate faster than they are cleared.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_conflicts_by_agent',
          description: 'Per-Agent conflict involvement counts (total + active), top N by total, enriched with name/kind. Reveals which Agents are most conflict-prone.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max number of agents to return (1-100, default 20)' },
            },
          },
        },
        {
          name: 'get_conflicts_strategy_stats',
          description: 'Resolution strategy effectiveness: per-strategy usage count and recurrence rate (fraction of resolved conflicts whose task later saw another conflict). High recurrence flags strategies that suppress rather than solve.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_sandbox_templates',
          description: 'List preset sandbox policy templates (read_only_research, code_generation, data_analysis, full_autonomy, sandboxed_review).',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'instantiate_sandbox_template',
          description: 'Create a sandbox policy from a preset template, optionally overriding fields and binding to an agent.',
          inputSchema: {
            type: 'object',
            properties: {
              template_key: { type: 'string', description: 'Template key (e.g. code_generation)' },
              name: { type: 'string', description: 'Override sandbox name' },
              agent_id: { type: 'integer', description: 'Agent to bind to (optional)' },
              overrides: { type: 'object', description: 'Field overrides (allowed_tools, timeout_seconds, etc.)' },
            },
            required: ['template_key'],
          },
        },
        {
          name: 'auto_resolve_conflicts',
          description: 'Maintenance: scan for conflicts and auto-resolve low-severity ones (INFO/WARNING) using their suggested strategy if it is safe (auto_retry/least_loaded). CRITICAL conflicts are never auto-resolved.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'orchestrate',
          description: 'Global collaboration orchestrator: runs the full multi-Agent maintenance cycle in one call — (1) health (stale agents, expired leases, overdue escalation), (2) workflow step timeouts + re-advance, (3) fire due workflow triggers, (4) conflict detection + auto-resolution. Designed to be called by an external scheduler every few minutes. Returns a per-stage summary.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_orchestrator_status',
          description: 'Return the state of the built-in orchestrator scheduler (enabled/disabled) and the last orchestration cycle summary, if the scheduler is enabled via ORCHESTRATOR_ENABLED.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_orchestrator_history',
          description: 'Return recent orchestration run records for trend analysis — per-run stats (stale agents, timed-out steps, triggers fired, conflicts auto-resolved, duration, errors, triggered_by manual|scheduler) plus trend aggregates.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max records to return (1-100, default 20)' },
              triggered_by: { type: 'string', description: 'Filter by trigger source: manual | scheduler' },
            },
          },
        },
        {
          name: 'orchestrator_daily_trend',
          description: 'Daily aggregation of orchestration runs, aligned with the security events daily-trend time dimension so the two can be rendered on a unified timeline. Each day includes runs, manual/scheduler split, triggers fired, conflicts resolved, errors, and avg duration.',
          inputSchema: {
            type: 'object',
            properties: {
              triggered_by: { type: 'string', description: 'Filter by trigger source: manual | scheduler' },
              since: { type: 'string', description: 'ISO date/datetime lower bound (inclusive)' },
              until: { type: 'string', description: 'ISO date/datetime upper bound (inclusive)' },
            },
          },
        },
        {
          name: 'get_task_dependency_chain',
          description: 'Task dependency chain analysis. Finds root tasks with subtask hierarchies, computes chain depth, total tasks, completion progress.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max chains returned (1-20, default 10)' },
              project_id: { type: 'integer', description: 'Optional project filter' },
            },
          },
        },
        {
          name: 'get_agent_skill_matching',
          description: 'Agent skill matching recommendation. For unassigned in-progress tasks, match task keywords to agent capabilities and experience domains.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max tasks returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_workflow_step_duration_histogram',
          description: 'Workflow step duration histogram. Buckets completed step durations into time ranges (0-10s, 10-30s, 30-60s, 60-120s, 120-300s, 300s+) per step_key.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 30)' },
              limit: { type: 'integer', description: 'Max step keys returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_task_comment_sentiment_trend',
          description: 'Task comment sentiment trend. Aggregates comment events by day and classifies sentiment (positive/negative/neutral) based on keyword matching.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 30)' },
            },
          },
        },
        {
          name: 'get_agent_task_handoff_stats',
          description: 'Agent task handoff statistics. Aggregates handoff events by (from_agent, to_agent) pairs, counts frequency and average handoff duration.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 30)' },
              limit: { type: 'integer', description: 'Max handoff pairs returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_channel_activity_trend',
          description: 'Channel activity trend. Per-channel daily message count sparkline and active member count over the lookback window.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-90, default 14)' },
              limit: { type: 'integer', description: 'Max channels returned (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_workload_forecast',
          description: 'Forecast each Agent near-future task load via linear regression on daily assignment counts. Returns per-agent slope, multi-day forecast, and recent average.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (7-90, default 30)' },
              horizon: { type: 'integer', description: 'Forecast days (1-14, default 3)' },
              limit: { type: 'integer', description: 'Max agents (1-20, default 10)' },
            },
          },
        },
        {
          name: 'get_knowledge_propagation_network',
          description: 'Cross-Agent knowledge propagation network. Nodes are Agents sharing experiences, edges connect contributors weighted by reuse count. Reveals which Agents propagate knowledge most broadly.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 90)' },
              limit: { type: 'integer', description: 'Max nodes/edges (1-50, default 20)' },
            },
          },
        },
        {
          name: 'get_workflow_step_bottleneck_timeline',
          description: 'Per-step daily average duration timeline. Tracks how each workflow step avg duration changes over time to spot regressions or improvements.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (7-90, default 30)' },
              limit: { type: 'integer', description: 'Max step keys (1-15, default 8)' },
            },
          },
        },
        {
          name: 'get_protocol_decision_latency',
          description: 'Collaboration protocol decision latency analysis. For resolved protocols, computes creation-to-resolution latency aggregated by protocol type (avg/median/min/max).',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 30)' },
            },
          },
        },
        {
          name: 'get_task_rework_analysis',
          description: 'Task rework analysis. Finds tasks reverted from done/review back to in_progress/todo, counts per-task rework, total reworked tasks, and per-project rework rate.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max tasks (1-30, default 15)' },
            },
          },
        },
        {
          name: 'get_agent_specialization_evolution',
          description: 'Track how each Agent domain coverage evolves over time. Weekly distinct domain count series, revealing specialization vs generalization trends.',
          inputSchema: {
            type: 'object',
            properties: {
              weeks: { type: 'integer', description: 'Lookback window in weeks (2-26, default 12)' },
              limit: { type: 'integer', description: 'Max agents (1-15, default 8)' },
            },
          },
        },
        {
          name: 'get_agent_experiences_decay_alerts',
          description: 'Flag Agents whose experience-base confidence is declining. Compares older-half vs newer-half average confidence within the window and returns agents whose confidence dropped beyond a threshold with a recommended action.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (7-365, default 30)' },
              min_drop: { type: 'number', description: 'Minimum confidence drop to flag (0.02-0.5, default 0.1)' },
              limit: { type: 'integer', description: 'Max alerts (1-30, default 10)' },
            },
          },
        },
        {
          name: 'get_agent_cross_project_efficiency',
          description: 'Measure realized value of cross-project Agent authorizations. For each authorization into a project owned by the user, counts completed tasks in the host project within the window. Identifies utilized vs idle (unused) authorizations with a utilization rate.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max authorizations (1-50, default 20)' },
            },
          },
        },
        {
          name: 'get_agent_capability_supply_demand',
          description: 'Analyze supply vs demand for each capability. Supply = agents declaring the capability; demand = active tasks requiring it. Identifies bottleneck (demand exceeds supply), missing (demand, no supply), surplus, and balanced capabilities so owners can rebalance the fleet skills against task requirements.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max capabilities (1-50, default 20)' },
            },
          },
        },
        {
          name: 'get_workflow_structural_complexity',
          description: 'Analyze design-time structural complexity of active workflows. For each workflow computes DAG metrics from step dependencies: step count, max dependency depth (longest chain), total edges, average fan-in/fan-out, and root/leaf step counts. Reveals overly deep or tangled workflow designs.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max workflows (1-50, default 20)' },
            },
          },
        },
        {
          name: 'get_agent_idle_ranking',
          description: 'Rank Agents by idle duration. Idle time is measured from the most recent of last_seen_at and the latest TaskAssignment activity (completed_at / heartbeat). Classifies each Agent as active (<24h), idle (1-7d), stale (7-30d), dormant (>30d), or never, surfacing stale/dormant Agents for cleanup.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Max agents (1-50, default 20)' },
            },
          },
        },
];
