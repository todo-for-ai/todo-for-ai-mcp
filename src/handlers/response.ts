import type { Agent, AgentRun, ClaimAgentTaskResult, ListResult, ReviewQueueItem, TaskAssignment, TaskEvent } from '../types.js';
import type { ToolResponse } from './types.js';

export function toToolResponse(summary: string, data?: unknown) {
  const text = data === undefined
    ? summary
    : `${summary}\n\nJSON:\n${JSON.stringify(data, null, 2)}`;

  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(item => String(item)).filter(Boolean);
}

export function formatStrategy(strategy: unknown): string {
  if (strategy === 'capability_match') {
    return 'capability match';
  }
  if (strategy === 'priority_fifo') {
    return 'priority FIFO';
  }
  return strategy ? String(strategy) : 'specific task';
}

export function formatClaimMode(mode: unknown): string {
  if (mode === 'manual_dispatch') {
    return 'manual dispatch';
  }
  if (mode === 'agent_claim') {
    return 'Agent claim';
  }
  return mode ? String(mode) : 'unspecified claim mode';
}

export function formatAgentLine(agent: Agent): string {
  const model = [agent.provider, agent.model].filter(Boolean).join('/');
  const capabilities = agent.capabilities.length > 0 ? agent.capabilities.join(', ') : 'no capabilities';
  const activeAssignments = agent.stats?.active_assignments ?? 0;
  const totalRuns = agent.stats?.total_runs ?? 0;
  const runtime = model ? ` ${model}` : '';

  return `- #${agent.id} ${agent.name} [${agent.status}/${agent.kind}]${runtime}; capabilities: ${capabilities}; active assignments: ${activeAssignments}; total runs: ${totalRuns}`;
}

export function formatTaskLabel(assignment: TaskAssignment): string {
  return `#${assignment.task_id} ${assignment.task?.title || 'untitled task'}`;
}

export function formatAssignmentLine(assignment: TaskAssignment): string {
  const agentLabel = assignment.agent ? `${assignment.agent.name} (#${assignment.agent.id})` : `Agent #${assignment.agent_id}`;
  const lease = assignment.lease_expires_at ? `; lease expires: ${assignment.lease_expires_at}` : '';
  const heartbeat = assignment.last_heartbeat_at ? `; last heartbeat: ${assignment.last_heartbeat_at}` : '';

  return `- assignment #${assignment.id}: ${formatTaskLabel(assignment)} -> ${agentLabel}; state: ${assignment.state}; progress: ${assignment.progress_rate ?? 0}%${lease}${heartbeat}`;
}

export function getCapabilityMatch(run?: AgentRun | null): Record<string, unknown> | null {
  const capabilityMatch = run?.run_metadata?.capability_match;
  return isRecord(capabilityMatch) ? capabilityMatch : null;
}

export function formatCapabilityMatch(run?: AgentRun | null): string {
  const capabilityMatch = getCapabilityMatch(run);
  if (!capabilityMatch) {
    return 'Match: specific task or no automatic match metadata.';
  }

  const score = typeof capabilityMatch.score === 'number' ? capabilityMatch.score : 0;
  const matchedCapabilities = toStringList(capabilityMatch.matched_capabilities);
  const matchedTags = toStringList(capabilityMatch.matched_tags);
  const matchedText = toStringList(capabilityMatch.matched_text);
  const lines = [
    `Match: ${formatStrategy(capabilityMatch.strategy)}; score: ${score}.`,
  ];

  if (matchedCapabilities.length > 0) {
    lines.push(`Matched capabilities: ${matchedCapabilities.join(', ')}.`);
  }
  if (matchedTags.length > 0) {
    lines.push(`Matched task tags: ${matchedTags.join(', ')}.`);
  }
  if (matchedText.length > 0) {
    lines.push(`Matched task/project text: ${matchedText.join(', ')}.`);
  }

  return lines.join('\n');
}

export function summarizeListAgents(result: ListResult<Agent>): string {
  const lines = [
    `Agents: ${result.items.length} returned, ${result.pagination.total} total.`,
    ...result.items.map(agent => formatAgentLine(agent)),
  ];

  if (result.items.length === 0) {
    lines.push('No Agents matched the current filters.');
  }

  return lines.join('\n');
}

export function summarizeReviewQueue(result: ListResult<ReviewQueueItem>): string {
  const lines = [
    `Review queue: ${result.items.length} returned, ${result.pagination.total} total.`,
  ];

  if (result.items.length === 0) {
    lines.push('No assignments currently need human feedback or final review.');
  } else {
    for (const item of result.items) {
      const assignment = item.assignment;
      const title = item.task?.title || assignment.task?.title || 'untitled task';
      const agent = item.agent?.name || assignment.agent?.name || `Agent #${assignment.agent_id}`;
      lines.push(`- ${item.action}: task #${assignment.task_id} ${title}; assignment #${assignment.id}; ${agent}; state: ${assignment.state}; progress: ${assignment.progress_rate ?? 0}%.`);
    }
    if (result.items.some(item => item.action === 'human_feedback')) {
      lines.push('Next for human_feedback: call update_task_assignment with state "running", task_status "in_progress", and feedback_content for the Agent.');
    }
    if (result.items.some(item => item.action === 'final_review')) {
      lines.push('Next for final_review: call update_task_assignment with state/task_status "done" to approve, or state "running" with feedback_content to request changes.');
    }
  }

  return lines.join('\n');
}

export function summarizeAssignments(result: ListResult<TaskAssignment>, label: string): string {
  const lines = [
    `${label}: ${result.items.length} returned, ${result.pagination.total} total.`,
  ];

  if (result.items.length === 0) {
    lines.push('No assignments matched the current filters.');
  } else {
    lines.push(...result.items.map(assignment => formatAssignmentLine(assignment)));
  }

  return lines.join('\n');
}

export function summarizeTaskEvents(result: ListResult<TaskEvent>): string {
  const lines = [
    `Task events: ${result.items.length} returned, ${result.pagination.total} total.`,
  ];

  if (result.items.length === 0) {
    lines.push('No collaboration events have been recorded for this task.');
  } else {
    for (const event of result.items) {
      const actor = event.actor_agent?.name || event.actor_user?.email || event.actor_type;
      const payload = isRecord(event.payload) ? event.payload : {};
      const assignment = payload.assignment_id ? ` assignment #${payload.assignment_id};` : '';
      const state = payload.new_state ? ` state: ${payload.old_state || '?'} -> ${payload.new_state};` : '';
      const match = isRecord(payload.capability_match)
        ? ` match: ${formatStrategy(payload.capability_match.strategy)}, score ${typeof payload.capability_match.score === 'number' ? payload.capability_match.score : 0};`
        : '';
      const claimMode = payload.claim_mode ? ` mode: ${formatClaimMode(payload.claim_mode)};` : '';
      const feedback = typeof payload.feedback_excerpt === 'string' && payload.feedback_excerpt
        ? ` feedback: ${payload.feedback_excerpt};`
        : '';

      lines.push(`- ${event.created_at}: ${event.event_type} by ${actor};${assignment}${state}${claimMode}${match}${feedback}`);
    }
  }

  return lines.join('\n');
}

export function summarizeClaim(result: ClaimAgentTaskResult | null): string {
  if (!result) {
    return [
      'No claimable task found.',
      'Next: call list_agents to verify the Agent is active, or list project tasks/review queue to inspect pending work.',
    ].join('\n');
  }

  const assignment = result.assignment;
  const claimMode = result.run.run_metadata?.claim_mode;
  const lines = [
    `Claimed task #${assignment.task_id} for Agent #${result.agent.id} ${result.agent.name}.`,
    `Assignment #${assignment.id}; run #${result.run.id}; state: ${assignment.state}; progress: ${assignment.progress_rate ?? 0}%.`,
    `Claim mode: ${formatClaimMode(claimMode)}.`,
    assignment.lease_expires_at ? `Lease expires: ${assignment.lease_expires_at}.` : 'No lease expiration returned.',
    formatCapabilityMatch(result.run),
    'Next: inspect the task, execute the work, then call update_agent_assignment with progress and output_summary. Use state "waiting_human" for questions, "review" for final review, or "done" when execution is complete.',
  ];

  return lines.join('\n');
}

export function summarizeAssignmentUpdate(result: { assignment: TaskAssignment; run: AgentRun | null }): string {
  const assignment = result.assignment;
  const run = result.run;
  const lines = [
    `Updated assignment #${assignment.id} for task #${assignment.task_id}.`,
    `State: ${assignment.state}; progress: ${assignment.progress_rate ?? 0}%; run status: ${run?.status || 'none'}.`,
  ];

  if (assignment.lease_expires_at) {
    lines.push(`Lease expires: ${assignment.lease_expires_at}.`);
  }
  if (assignment.state === 'done') {
    lines.push('Next: task is ready for human final review.');
  } else if (assignment.state === 'waiting_human') {
    lines.push('Next: wait for feedback or use list_review_queue to monitor the human-feedback queue.');
  } else if (assignment.state === 'running') {
    lines.push('Next: continue execution and send periodic progress or heartbeat updates before the lease expires.');
  }

  return lines.join('\n');
}
