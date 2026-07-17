/**
 * MCP tool definitions for todo-for-ai - part 4 of 4.
 *
 * Auto-split from tools.ts for maintainability.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolsPart4: Tool[] = [
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
        }
];
