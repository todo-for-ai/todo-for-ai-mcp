/**
 * MCP tool definitions for todo-for-ai - part 1 of 4.
 *
 * Auto-split from tools.ts for maintainability.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolsPart1: Tool[] = [
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
        }
];
