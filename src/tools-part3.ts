/**
 * MCP tool definitions for todo-for-ai - part 3 of 4.
 *
 * Auto-split from tools.ts for maintainability.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolsPart3: Tool[] = [
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
        }
];
