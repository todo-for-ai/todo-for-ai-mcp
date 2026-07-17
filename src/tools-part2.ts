/**
 * MCP tool definitions for todo-for-ai - part 2 of 4.
 *
 * Auto-split from tools.ts for maintainability.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolsPart2: Tool[] = [
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
        }
];
