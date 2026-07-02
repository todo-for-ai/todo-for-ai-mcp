import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TodoApiClient } from './api-client.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';
import type {
  Agent,
  AgentRun,
  ClaimAgentTaskResult,
  ListResult,
  ReviewQueueItem,
  TaskAssignment,
  TaskEvent,
} from './types.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

export class TodoMcpServer {
  private server: Server;
  private apiClient: TodoApiClient;
  private instanceId: string;

  constructor() {
    // Generate unique instance ID for concurrent support
    this.instanceId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[MCP_SERVER] Starting TodoMcpServer initialization...', {
      instanceId: this.instanceId,
      version: VERSION,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      configLogLevel: CONFIG.logLevel
    });

    logger.debug('[MCP_SERVER] Creating MCP Server instance...', {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      capabilities: ['tools'],
      instanceId: this.instanceId
    });

    this.server = new Server(
      {
        name: 'todo-for-ai-mcp',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    logger.info(`[MCP_SERVER] MCP Server instance created: ${this.instanceId}`, {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      instanceId: this.instanceId
    });

    logger.debug('[MCP_SERVER] Initializing API client...', {
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasToken: !!CONFIG.apiToken,
      timeout: CONFIG.apiTimeout,
      instanceId: this.instanceId
    });

    this.apiClient = new TodoApiClient(CONFIG);

    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId
    });
    this.setupHandlers();

    logger.info('[MCP_SERVER] TodoMcpServer initialization complete', {
      instanceId: this.instanceId,
      handlersSetup: true,
      apiClientReady: true,
      serverReady: true
    });
  }

  private toToolResponse(summary: string, data?: unknown) {
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => String(item)).filter(Boolean);
  }

  private formatStrategy(strategy: unknown): string {
    if (strategy === 'capability_match') {
      return 'capability match';
    }
    if (strategy === 'priority_fifo') {
      return 'priority FIFO';
    }
    return strategy ? String(strategy) : 'specific task';
  }

  private formatClaimMode(mode: unknown): string {
    if (mode === 'manual_dispatch') {
      return 'manual dispatch';
    }
    if (mode === 'agent_claim') {
      return 'Agent claim';
    }
    return mode ? String(mode) : 'unspecified claim mode';
  }

  private formatAgentLine(agent: Agent): string {
    const model = [agent.provider, agent.model].filter(Boolean).join('/');
    const capabilities = agent.capabilities.length > 0 ? agent.capabilities.join(', ') : 'no capabilities';
    const activeAssignments = agent.stats?.active_assignments ?? 0;
    const totalRuns = agent.stats?.total_runs ?? 0;
    const runtime = model ? ` ${model}` : '';

    return `- #${agent.id} ${agent.name} [${agent.status}/${agent.kind}]${runtime}; capabilities: ${capabilities}; active assignments: ${activeAssignments}; total runs: ${totalRuns}`;
  }

  private formatTaskLabel(assignment: TaskAssignment): string {
    return `#${assignment.task_id} ${assignment.task?.title || 'untitled task'}`;
  }

  private formatAssignmentLine(assignment: TaskAssignment): string {
    const agentLabel = assignment.agent ? `${assignment.agent.name} (#${assignment.agent.id})` : `Agent #${assignment.agent_id}`;
    const lease = assignment.lease_expires_at ? `; lease expires: ${assignment.lease_expires_at}` : '';
    const heartbeat = assignment.last_heartbeat_at ? `; last heartbeat: ${assignment.last_heartbeat_at}` : '';

    return `- assignment #${assignment.id}: ${this.formatTaskLabel(assignment)} -> ${agentLabel}; state: ${assignment.state}; progress: ${assignment.progress_rate ?? 0}%${lease}${heartbeat}`;
  }

  private getCapabilityMatch(run?: AgentRun | null): Record<string, unknown> | null {
    const capabilityMatch = run?.run_metadata?.capability_match;
    return this.isRecord(capabilityMatch) ? capabilityMatch : null;
  }

  private formatCapabilityMatch(run?: AgentRun | null): string {
    const capabilityMatch = this.getCapabilityMatch(run);
    if (!capabilityMatch) {
      return 'Match: specific task or no automatic match metadata.';
    }

    const score = typeof capabilityMatch.score === 'number' ? capabilityMatch.score : 0;
    const matchedCapabilities = this.toStringList(capabilityMatch.matched_capabilities);
    const matchedTags = this.toStringList(capabilityMatch.matched_tags);
    const matchedText = this.toStringList(capabilityMatch.matched_text);
    const lines = [
      `Match: ${this.formatStrategy(capabilityMatch.strategy)}; score: ${score}.`,
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

  private summarizeListAgents(result: ListResult<Agent>): string {
    const lines = [
      `Agents: ${result.items.length} returned, ${result.pagination.total} total.`,
      ...result.items.map(agent => this.formatAgentLine(agent)),
    ];

    if (result.items.length === 0) {
      lines.push('No Agents matched the current filters.');
    }

    return lines.join('\n');
  }

  private summarizeReviewQueue(result: ListResult<ReviewQueueItem>): string {
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

  private summarizeAssignments(result: ListResult<TaskAssignment>, label: string): string {
    const lines = [
      `${label}: ${result.items.length} returned, ${result.pagination.total} total.`,
    ];

    if (result.items.length === 0) {
      lines.push('No assignments matched the current filters.');
    } else {
      lines.push(...result.items.map(assignment => this.formatAssignmentLine(assignment)));
    }

    return lines.join('\n');
  }

  private summarizeTaskEvents(result: ListResult<TaskEvent>): string {
    const lines = [
      `Task events: ${result.items.length} returned, ${result.pagination.total} total.`,
    ];

    if (result.items.length === 0) {
      lines.push('No collaboration events have been recorded for this task.');
    } else {
      for (const event of result.items) {
        const actor = event.actor_agent?.name || event.actor_user?.email || event.actor_type;
        const payload = this.isRecord(event.payload) ? event.payload : {};
        const assignment = payload.assignment_id ? ` assignment #${payload.assignment_id};` : '';
        const state = payload.new_state ? ` state: ${payload.old_state || '?'} -> ${payload.new_state};` : '';
        const match = this.isRecord(payload.capability_match)
          ? ` match: ${this.formatStrategy(payload.capability_match.strategy)}, score ${typeof payload.capability_match.score === 'number' ? payload.capability_match.score : 0};`
          : '';
        const claimMode = payload.claim_mode ? ` mode: ${this.formatClaimMode(payload.claim_mode)};` : '';
        const feedback = typeof payload.feedback_excerpt === 'string' && payload.feedback_excerpt
          ? ` feedback: ${payload.feedback_excerpt};`
          : '';

        lines.push(`- ${event.created_at}: ${event.event_type} by ${actor};${assignment}${state}${claimMode}${match}${feedback}`);
      }
    }

    return lines.join('\n');
  }

  private summarizeClaim(result: ClaimAgentTaskResult | null): string {
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
      `Claim mode: ${this.formatClaimMode(claimMode)}.`,
      assignment.lease_expires_at ? `Lease expires: ${assignment.lease_expires_at}.` : 'No lease expiration returned.',
      this.formatCapabilityMatch(result.run),
      'Next: inspect the task, execute the work, then call update_agent_assignment with progress and output_summary. Use state "waiting_human" for questions, "review" for final review, or "done" when execution is complete.',
    ];

    return lines.join('\n');
  }

  private summarizeAssignmentUpdate(result: { assignment: TaskAssignment; run: AgentRun | null }): string {
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

  private setupHandlers(): void {
    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId,
      handlersToSetup: ['ListTools', 'CallTool']
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('[MCP_SERVER] ListTools request received', {
        instanceId: this.instanceId,
        timestamp: new Date().toISOString()
      });
      logger.debug('Received list_tools request');
      
      const tools: Tool[] = [
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
          name: 'get_task_stats',
          description: 'Aggregate task lifecycle stats for the current user projects: total, by_status, by_priority, completion/cancellation rates, average lifecycle duration (hours) for done tasks, lifecycle duration buckets (0-1h ... >7d), average completion rate. Reveals throughput bottlenecks and abandonment.',
          inputSchema: { type: 'object', properties: {} },
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
          description: 'Daily reputation-derived health trend for the current user Agents. Aggregates reputation.update audit entries by day: average new_score (last-seen per agent that day), positive delta count, negative delta count. Also annotates per-day conflict event count and sandbox violation count so drops in reputation can be correlated with incidents. A proxy for whether fleet health is rising or falling over time.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window in days (default 30)' },
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
      ];

      logger.info(`Returning ${tools.length} available tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const callStartTime = Date.now();

      logger.info(`[MCP_SERVER] ========== TOOL CALL START ==========`, {
        requestId,
        toolName: name,
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        callStartTime
      });

      logger.info(`[MCP_SERVER] Tool call received: ${name}`, {
        requestId,
        toolName: name,
        hasArgs: !!args,
        argsCount: args ? Object.keys(args).length : 0,
        argsKeys: args ? Object.keys(args) : [],
        argsSize: args ? JSON.stringify(args).length : 0,
        instanceId: this.instanceId,
        memoryUsage: process.memoryUsage()
      });

      logger.debug(`[MCP_SERVER] Tool call full arguments: ${name}`, {
        requestId,
        args,
        argsStringified: JSON.stringify(args, null, 2)
      });

      try {
        let result;
        const startTime = Date.now();

        switch (name) {
          case 'get_project_tasks_by_name':
            logger.info(`[MCP_SERVER] Executing get_project_tasks_by_name`, {
              requestId,
              instanceId: this.instanceId,
              projectName: args?.project_name,
              hasProjectName: !!args?.project_name
            });
            result = await this.handleGetProjectTasksByName(args);
            break;

          case 'get_task_by_id':
            logger.info(`[MCP_SERVER] Executing get_task_by_id`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              hasTaskId: !!args?.task_id
            });
            result = await this.handleGetTaskById(args);
            break;

          case 'submit_task_feedback':
            logger.info(`[MCP_SERVER] Executing submit_task_feedback`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              status: args?.status,
              hasContent: !!args?.feedback_content
            });
            result = await this.handleSubmitTaskFeedback(args);
            break;

          case 'create_task':
            logger.info(`[MCP_SERVER] Executing create_task`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              title: args?.title,
              priority: args?.priority
            });
            result = await this.handleCreateTask(args);
            break;

          case 'get_project_info':
            logger.info(`[MCP_SERVER] Executing get_project_info`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              projectName: args?.project_name,
              hasProjectId: !!args?.project_id,
              hasProjectName: !!args?.project_name
            });
            result = await this.handleGetProjectInfo(args);
            break;

          case 'list_agents':
            logger.info(`[MCP_SERVER] Executing list_agents`, {
              requestId,
              instanceId: this.instanceId,
              status: args?.status,
              search: args?.search
            });
            result = await this.handleListAgents(args);
            break;

          case 'create_agent':
            logger.info(`[MCP_SERVER] Executing create_agent`, {
              requestId,
              instanceId: this.instanceId,
              name: args?.name,
              kind: args?.kind,
              status: args?.status
            });
            result = await this.handleCreateAgent(args);
            break;

          case 'self_register_agent':
            logger.info(`[MCP_SERVER] Executing self_register_agent`, { requestId, instanceId: this.instanceId, name: args?.name, provider: args?.provider });
            result = await this.handleSelfRegisterAgent(args);
            break;

          case 'discover_agents':
            logger.info(`[MCP_SERVER] Executing discover_agents`, { requestId, instanceId: this.instanceId, capability: args?.capability, role: args?.collaboration_role });
            result = await this.handleDiscoverAgents(args);
            break;

          case 'update_agent':
            logger.info(`[MCP_SERVER] Executing update_agent`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              kind: args?.kind,
              status: args?.status
            });
            result = await this.handleUpdateAgent(args);
            break;

          case 'heartbeat_agent':
            logger.info(`[MCP_SERVER] Executing heartbeat_agent`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              status: args?.status
            });
            result = await this.handleHeartbeatAgent(args);
            break;

          case 'list_recommended_tasks':
            logger.info(`[MCP_SERVER] Executing list_recommended_tasks`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListRecommendedTasks(args);
            break;

          case 'list_review_queue':
            logger.info(`[MCP_SERVER] Executing list_review_queue`, {
              requestId,
              instanceId: this.instanceId,
              action: args?.action
            });
            result = await this.handleListReviewQueue(args);
            break;

          case 'list_agent_assignments':
            logger.info(`[MCP_SERVER] Executing list_agent_assignments`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              state: args?.state
            });
            result = await this.handleListAgentAssignments(args);
            break;

          case 'list_task_assignments':
            logger.info(`[MCP_SERVER] Executing list_task_assignments`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              state: args?.state
            });
            result = await this.handleListTaskAssignments(args);
            break;

          case 'list_task_events':
            logger.info(`[MCP_SERVER] Executing list_task_events`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id
            });
            result = await this.handleListTaskEvents(args);
            break;

          case 'create_subtask':
            logger.info(`[MCP_SERVER] Executing create_subtask`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              title: args?.title,
            });
            result = await this.handleCreateSubtask(args);
            break;

          case 'post_task_event':
            logger.info(`[MCP_SERVER] Executing post_task_event`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              eventType: args?.event_type,
              agentId: args?.agent_id
            });
            result = await this.handlePostTaskEvent(args);
            break;

          case 'get_agent_inbox':
            logger.info(`[MCP_SERVER] Executing get_agent_inbox`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              sinceId: args?.since_id
            });
            result = await this.handleGetAgentInbox(args);
            break;

          case 'handoff_task':
            logger.info(`[MCP_SERVER] Executing handoff_task`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              toAgentId: args?.to_agent_id
            });
            result = await this.handleHandoffTask(args);
            break;

          case 'dispatch_tasks':
            logger.info(`[MCP_SERVER] Executing dispatch_tasks`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              projectId: args?.project_id,
              maxAssignments: args?.max_assignments
            });
            result = await this.handleDispatchTasks(args);
            break;

          case 'list_notifications':
            logger.info(`[MCP_SERVER] Executing list_notifications`, {
              requestId,
              instanceId: this.instanceId,
              sinceId: args?.since_id,
              unreadOnly: args?.unread_only,
            });
            result = await this.handleListNotifications(args);
            break;

          case 'mark_notifications_read':
            logger.info(`[MCP_SERVER] Executing mark_notifications_read`, {
              requestId,
              instanceId: this.instanceId,
              all: args?.all,
              idsCount: Array.isArray(args?.ids) ? args.ids.length : 0,
            });
            result = await this.handleMarkNotificationsRead(args);
            break;

          case 'claim_agent_task':
            logger.info(`[MCP_SERVER] Executing claim_agent_task`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              taskId: args?.task_id,
              projectId: args?.project_id
            });
            result = await this.handleClaimAgentTask(args);
            break;

          case 'get_shared_context':
            logger.info(`[MCP_SERVER] Executing get_shared_context`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              key: args?.key,
            });
            result = await this.handleGetSharedContext(args);
            break;

          case 'set_shared_context':
            logger.info(`[MCP_SERVER] Executing set_shared_context`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              key: args?.key,
            });
            result = await this.handleSetSharedContext(args);
            break;

          case 'delete_shared_context':
            logger.info(`[MCP_SERVER] Executing delete_shared_context`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              entryId: args?.entry_id,
            });
            result = await this.handleDeleteSharedContext(args);
            break;

          case 'get_run_logs':
            logger.info(`[MCP_SERVER] Executing get_run_logs`, {
              requestId,
              instanceId: this.instanceId,
              runId: args?.run_id,
              sinceId: args?.since_id,
            });
            result = await this.handleGetRunLogs(args);
            break;

          case 'append_run_logs':
            logger.info(`[MCP_SERVER] Executing append_run_logs`, {
              requestId,
              instanceId: this.instanceId,
              runId: args?.run_id,
              entryCount: Array.isArray(args?.entries) ? args.entries.length : 0,
            });
            result = await this.handleAppendRunLogs(args);
            break;

          case 'list_task_templates':
            logger.info(`[MCP_SERVER] Executing list_task_templates`, { requestId, instanceId: this.instanceId });
            result = await this.handleListTaskTemplates(args);
            break;

          case 'create_task_template':
            logger.info(`[MCP_SERVER] Executing create_task_template`, { requestId, instanceId: this.instanceId });
            result = await this.handleCreateTaskTemplate(args);
            break;

          case 'instantiate_task_template':
            logger.info(`[MCP_SERVER] Executing instantiate_task_template`, { requestId, instanceId: this.instanceId });
            result = await this.handleInstantiateTaskTemplate(args);
            break;

          case 'list_workflows':
            logger.info(`[MCP_SERVER] Executing list_workflows`, { requestId, instanceId: this.instanceId });
            result = await this.handleListWorkflows(args);
            break;

          case 'create_workflow':
            logger.info(`[MCP_SERVER] Executing create_workflow`, { requestId, instanceId: this.instanceId, name: args?.name });
            result = await this.handleCreateWorkflow(args);
            break;

          case 'get_workflow':
            logger.info(`[MCP_SERVER] Executing get_workflow`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id });
            result = await this.handleGetWorkflow(args);
            break;

          case 'update_workflow':
            logger.info(`[MCP_SERVER] Executing update_workflow`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id });
            result = await this.handleUpdateWorkflow(args);
            break;

          case 'delete_workflow':
            logger.info(`[MCP_SERVER] Executing delete_workflow`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id });
            result = await this.handleDeleteWorkflow(args);
            break;

          case 'launch_workflow':
            logger.info(`[MCP_SERVER] Executing launch_workflow`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id, projectId: args?.project_id });
            result = await this.handleLaunchWorkflow(args);
            break;

          case 'list_workflow_runs':
            logger.info(`[MCP_SERVER] Executing list_workflow_runs`, { requestId, instanceId: this.instanceId });
            result = await this.handleListWorkflowRuns(args);
            break;

          case 'get_workflow_step_stats':
            logger.info(`[MCP_SERVER] Executing get_workflow_step_stats`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowStepStats(args);
            break;

          case 'get_workflow_run_trend':
            logger.info(`[MCP_SERVER] Executing get_workflow_run_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowRunTrend(args);
            break;

          case 'get_workflow_run':
            logger.info(`[MCP_SERVER] Executing get_workflow_run`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handleGetWorkflowRun(args);
            break;

          case 'get_workflow_run_console':
            logger.info(`[MCP_SERVER] Executing get_workflow_run_console`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handleGetWorkflowRunConsole(args);
            break;

          case 'cancel_workflow_run':
            logger.info(`[MCP_SERVER] Executing cancel_workflow_run`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handleCancelWorkflowRun(args);
            break;

          case 'pause_workflow_run':
            logger.info(`[MCP_SERVER] Executing pause_workflow_run`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handlePauseWorkflowRun(args);
            break;

          case 'resume_workflow_run':
            logger.info(`[MCP_SERVER] Executing resume_workflow_run`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handleResumeWorkflowRun(args);
            break;

          case 'retry_workflow_run':
            logger.info(`[MCP_SERVER] Executing retry_workflow_run`, { requestId, instanceId: this.instanceId, runId: args?.run_id });
            result = await this.handleRetryWorkflowRun(args);
            break;

          case 'complete_workflow_step':
            logger.info(`[MCP_SERVER] Executing complete_workflow_step`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key });
            result = await this.handleCompleteWorkflowStep(args);
            break;

          case 'register_capabilities':
            logger.info(`[MCP_SERVER] Executing register_capabilities`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleRegisterCapabilities(args);
            break;

          case 'escalate_overdue_tasks':
            logger.info(`[MCP_SERVER] Executing escalate_overdue_tasks`, { requestId, instanceId: this.instanceId });
            result = await this.handleEscalateOverdueTasks(args);
            break;

          case 'list_audit_logs':
            logger.info(`[MCP_SERVER] Executing list_audit_logs`, { requestId, instanceId: this.instanceId });
            result = await this.handleListAuditLogs(args);
            break;

          case 'list_security_events':
            logger.info(`[MCP_SERVER] Executing list_security_events`, { requestId, instanceId: this.instanceId });
            result = await this.handleListSecurityEvents(args);
            break;

          case 'export_security_events':
            logger.info(`[MCP_SERVER] Executing export_security_events`, { requestId, instanceId: this.instanceId });
            result = await this.handleExportSecurityEvents(args);
            break;

          case 'security_events_daily_trend':
            logger.info(`[MCP_SERVER] Executing security_events_daily_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleSecurityEventsDailyTrend(args);
            break;

          case 'security_events_by_agent':
            logger.info(`[MCP_SERVER] Executing security_events_by_agent`, { requestId, instanceId: this.instanceId });
            result = await this.handleSecurityEventsByAgent(args);
            break;

          case 'health_check':
            logger.info(`[MCP_SERVER] Executing health_check`, { requestId, instanceId: this.instanceId });
            result = await this.handleHealthCheck();
            break;

          case 'broadcast_message':
            logger.info(`[MCP_SERVER] Executing broadcast_message`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleBroadcastMessage(args);
            break;

          case 'collaboration_metrics':
            logger.info(`[MCP_SERVER] Executing collaboration_metrics`, { requestId, instanceId: this.instanceId });
            result = await this.handleCollaborationMetrics(args);
            break;

          case 'list_workflow_triggers':
            logger.info(`[MCP_SERVER] Executing list_workflow_triggers`, { requestId, instanceId: this.instanceId });
            result = await this.handleListWorkflowTriggers(args);
            break;

          case 'create_workflow_trigger':
            logger.info(`[MCP_SERVER] Executing create_workflow_trigger`, { requestId, instanceId: this.instanceId });
            result = await this.handleCreateWorkflowTrigger(args);
            break;

          case 'update_workflow_trigger':
            logger.info(`[MCP_SERVER] Executing update_workflow_trigger`, { requestId, instanceId: this.instanceId });
            result = await this.handleUpdateWorkflowTrigger(args);
            break;

          case 'delete_workflow_trigger':
            logger.info(`[MCP_SERVER] Executing delete_workflow_trigger`, { requestId, instanceId: this.instanceId });
            result = await this.handleDeleteWorkflowTrigger(args);
            break;

          case 'fire_due_triggers':
            logger.info(`[MCP_SERVER] Executing fire_due_triggers`, { requestId, instanceId: this.instanceId });
            result = await this.handleFireDueTriggers();
            break;

          case 'mark_offline_agents':
            logger.info(`[MCP_SERVER] Executing mark_offline_agents`, { requestId, instanceId: this.instanceId });
            result = await this.handleMarkOfflineAgents();
            break;

          case 'timeout_workflow_steps':
            logger.info(`[MCP_SERVER] Executing timeout_workflow_steps`, { requestId, instanceId: this.instanceId });
            result = await this.handleTimeoutWorkflowSteps();
            break;

          case 'send_agent_message':
            logger.info(`[MCP_SERVER] Executing send_agent_message`, { requestId, instanceId: this.instanceId, from: args?.from_agent_id, to: args?.to_agent_id });
            result = await this.handleSendAgentMessage(args);
            break;

          case 'get_agent_messages':
            logger.info(`[MCP_SERVER] Executing get_agent_messages`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetAgentMessages(args);
            break;

          case 'get_agent_collaborators':
            logger.info(`[MCP_SERVER] Executing get_agent_collaborators`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetAgentCollaborators(args);
            break;

          case 'collaboration_graph':
            logger.info(`[MCP_SERVER] Executing collaboration_graph`, { requestId, instanceId: this.instanceId });
            result = await this.handleCollaborationGraph(args);
            break;

          case 'list_channels':
            logger.info(`[MCP_SERVER] Executing list_channels`, { requestId, instanceId: this.instanceId });
            result = await this.handleListChannels(args);
            break;

          case 'create_channel':
            logger.info(`[MCP_SERVER] Executing create_channel`, { requestId, instanceId: this.instanceId, name: args?.name });
            result = await this.handleCreateChannel(args);
            break;

          case 'send_channel_message':
            logger.info(`[MCP_SERVER] Executing send_channel_message`, { requestId, instanceId: this.instanceId, channelId: args?.channel_id });
            result = await this.handleSendChannelMessage(args);
            break;

          case 'list_channel_messages':
            logger.info(`[MCP_SERVER] Executing list_channel_messages`, { requestId, instanceId: this.instanceId, channelId: args?.channel_id });
            result = await this.handleListChannelMessages(args);
            break;

          case 'list_workflow_templates':
            logger.info(`[MCP_SERVER] Executing list_workflow_templates`, { requestId, instanceId: this.instanceId });
            result = await this.handleListWorkflowTemplates(args);
            break;

          case 'get_workflow_template':
            logger.info(`[MCP_SERVER] Executing get_workflow_template`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowTemplate(args);
            break;

          case 'instantiate_workflow_template':
            logger.info(`[MCP_SERVER] Executing instantiate_workflow_template`, { requestId, instanceId: this.instanceId });
            result = await this.handleInstantiateWorkflowTemplate(args);
            break;

          case 'update_agent_assignment':
            logger.info(`[MCP_SERVER] Executing update_agent_assignment`, {
              requestId,
              instanceId: this.instanceId,
              agentId: args?.agent_id,
              assignmentId: args?.assignment_id,
              state: args?.state
            });
            result = await this.handleUpdateAgentAssignment(args);
            break;

          case 'update_task_assignment':
            logger.info(`[MCP_SERVER] Executing update_task_assignment`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              assignmentId: args?.assignment_id,
              state: args?.state
            });
            result = await this.handleUpdateTaskAssignment(args);
            break;

          case 'list_collaboration_templates':
            logger.info(`[MCP_SERVER] Executing list_collaboration_templates`, { requestId, instanceId: this.instanceId });
            result = await this.handleListCollaborationTemplates(args);
            break;

          case 'create_collaboration_template':
            logger.info(`[MCP_SERVER] Executing create_collaboration_template`, { requestId, instanceId: this.instanceId, name: args?.name });
            result = await this.handleCreateCollaborationTemplate(args);
            break;

          case 'delete_collaboration_template':
            logger.info(`[MCP_SERVER] Executing delete_collaboration_template`, { requestId, instanceId: this.instanceId, templateId: args?.template_id });
            result = await this.handleDeleteCollaborationTemplate(args);
            break;

          case 'instantiate_collaboration_template':
            logger.info(`[MCP_SERVER] Executing instantiate_collaboration_template`, { requestId, instanceId: this.instanceId, templateKey: args?.template_key });
            result = await this.handleInstantiateCollaborationTemplate(args);
            break;

          case 'list_knowledge_entries':
            logger.info(`[MCP_SERVER] Executing list_knowledge_entries`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListKnowledgeEntries(args);
            break;

          case 'create_knowledge_entry':
            logger.info(`[MCP_SERVER] Executing create_knowledge_entry`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleCreateKnowledgeEntry(args);
            break;

          case 'get_knowledge_entry':
            logger.info(`[MCP_SERVER] Executing get_knowledge_entry`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, entryId: args?.entry_id });
            result = await this.handleGetKnowledgeEntry(args);
            break;

          case 'update_knowledge_entry':
            logger.info(`[MCP_SERVER] Executing update_knowledge_entry`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, entryId: args?.entry_id });
            result = await this.handleUpdateKnowledgeEntry(args);
            break;

          case 'delete_knowledge_entry':
            logger.info(`[MCP_SERVER] Executing delete_knowledge_entry`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, entryId: args?.entry_id });
            result = await this.handleDeleteKnowledgeEntry(args);
            break;

          case 'search_knowledge':
            logger.info(`[MCP_SERVER] Executing search_knowledge`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleSearchKnowledge(args);
            break;

          case 'list_shared_knowledge':
            logger.info(`[MCP_SERVER] Executing list_shared_knowledge`, { requestId, instanceId: this.instanceId });
            result = await this.handleListSharedKnowledge(args);
            break;

          case 'auto_extract_knowledge':
            logger.info(`[MCP_SERVER] Executing auto_extract_knowledge`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleAutoExtractKnowledge(args);
            break;

          case 'list_workflow_versions':
            logger.info(`[MCP_SERVER] Executing list_workflow_versions`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id });
            result = await this.handleListWorkflowVersions(args);
            break;

          case 'get_workflow_version':
            logger.info(`[MCP_SERVER] Executing get_workflow_version`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id, version: args?.version_number });
            result = await this.handleGetWorkflowVersion(args);
            break;

          case 'rollback_workflow':
            logger.info(`[MCP_SERVER] Executing rollback_workflow`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id, version: args?.version });
            result = await this.handleRollbackWorkflow(args);
            break;

          case 'diff_workflow_versions':
            logger.info(`[MCP_SERVER] Executing diff_workflow_versions`, { requestId, instanceId: this.instanceId, workflowId: args?.workflow_id });
            result = await this.handleDiffWorkflowVersions(args);
            break;

          case 'list_protocols':
            logger.info(`[MCP_SERVER] Executing list_protocols`, { requestId, instanceId: this.instanceId });
            result = await this.handleListProtocols(args);
            break;

          case 'create_protocol':
            logger.info(`[MCP_SERVER] Executing create_protocol`, { requestId, instanceId: this.instanceId, type: args?.protocol_type });
            result = await this.handleCreateProtocol(args);
            break;

          case 'get_protocol':
            logger.info(`[MCP_SERVER] Executing get_protocol`, { requestId, instanceId: this.instanceId, protocolId: args?.protocol_id });
            result = await this.handleGetProtocol(args);
            break;

          case 'respond_to_protocol':
            logger.info(`[MCP_SERVER] Executing respond_to_protocol`, { requestId, instanceId: this.instanceId, protocolId: args?.protocol_id, agentId: args?.agent_id });
            result = await this.handleRespondToProtocol(args);
            break;

          case 'resolve_protocol':
            logger.info(`[MCP_SERVER] Executing resolve_protocol`, { requestId, instanceId: this.instanceId, protocolId: args?.protocol_id });
            result = await this.handleResolveProtocol(args);
            break;

          case 'get_agent_reputation':
            logger.info(`[MCP_SERVER] Executing get_agent_reputation`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetAgentReputation(args);
            break;

          case 'list_reputations':
            logger.info(`[MCP_SERVER] Executing list_reputations`, { requestId, instanceId: this.instanceId });
            result = await this.handleListReputations();
            break;

          case 'recalculate_reputation':
            logger.info(`[MCP_SERVER] Executing recalculate_reputation`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleRecalculateReputation(args);
            break;

          case 'get_agent_reputation_history':
            logger.info(`[MCP_SERVER] Executing get_agent_reputation_history`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetAgentReputationHistory(args);
            break;

          case 'list_agent_experiences':
            logger.info(`[MCP_SERVER] Executing list_agent_experiences`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListAgentExperiences(args);
            break;

          case 'create_agent_experience':
            logger.info(`[MCP_SERVER] Executing create_agent_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleCreateAgentExperience(args);
            break;

          case 'get_agent_experience':
            logger.info(`[MCP_SERVER] Executing get_agent_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleGetAgentExperience(args);
            break;

          case 'update_agent_experience':
            logger.info(`[MCP_SERVER] Executing update_agent_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleUpdateAgentExperience(args);
            break;

          case 'delete_agent_experience':
            logger.info(`[MCP_SERVER] Executing delete_agent_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleDeleteAgentExperience(args);
            break;

          case 'recommend_experiences':
            logger.info(`[MCP_SERVER] Executing recommend_experiences`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleRecommendExperiences(args);
            break;

          case 'get_experiences_stats':
            logger.info(`[MCP_SERVER] Executing get_experiences_stats`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetExperiencesStats(args);
            break;

          case 'get_experiences_low_confidence':
            logger.info(`[MCP_SERVER] Executing get_experiences_low_confidence`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetExperiencesLowConfidence(args);
            break;

          case 'get_task_stats':
            logger.info(`[MCP_SERVER] Executing get_task_stats`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetTaskStats(args);
            break;

          case 'get_workflow_failure_correlation':
            logger.info(`[MCP_SERVER] Executing get_workflow_failure_correlation`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowFailureCorrelation(args);
            break;

          case 'get_workflow_failure_correlation_by_step':
            logger.info(`[MCP_SERVER] Executing get_workflow_failure_correlation_by_step`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowFailureCorrelationByStep(args);
            break;

          case 'get_agent_productivity':
            logger.info(`[MCP_SERVER] Executing get_agent_productivity`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentProductivity(args);
            break;

          case 'get_agent_productivity_trend':
            logger.info(`[MCP_SERVER] Executing get_agent_productivity_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentProductivityTrend(args);
            break;

          case 'get_agent_productivity_alerts':
            logger.info(`[MCP_SERVER] Executing get_agent_productivity_alerts`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentProductivityAlerts(args);
            break;

          case 'get_agent_productivity_by_kind':
            logger.info(`[MCP_SERVER] Executing get_agent_productivity_by_kind`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentProductivityByKind(args);
            break;

          case 'get_conflicts_sandbox_correlation':
            logger.info(`[MCP_SERVER] Executing get_conflicts_sandbox_correlation`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetConflictsSandboxCorrelation(args);
            break;

          case 'get_agent_health':
            logger.info(`[MCP_SERVER] Executing get_agent_health`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentHealth(args);
            break;

          case 'get_agent_health_trend':
            logger.info(`[MCP_SERVER] Executing get_agent_health_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentHealthTrend(args);
            break;

          case 'get_agent_health_alerts':
            logger.info(`[MCP_SERVER] Executing get_agent_health_alerts`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentHealthAlerts(args);
            break;

          case 'share_agent_experience':
            logger.info(`[MCP_SERVER] Executing share_agent_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleShareAgentExperience(args);
            break;

          case 'learn_from_experience':
            logger.info(`[MCP_SERVER] Executing learn_from_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleLearnFromExperience(args);
            break;

          case 'list_shared_experiences':
            logger.info(`[MCP_SERVER] Executing list_shared_experiences`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListSharedExperiences(args);
            break;

          case 'auto_extract_experiences':
            logger.info(`[MCP_SERVER] Executing auto_extract_experiences`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleAutoExtractExperiences(args);
            break;

          case 'authorize_cross_project_agent':
            logger.info(`[MCP_SERVER] Executing authorize_cross_project_agent`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, projectId: args?.project_id });
            result = await this.handleAuthorizeCrossProjectAgent(args);
            break;

          case 'revoke_cross_project_agent':
            logger.info(`[MCP_SERVER] Executing revoke_cross_project_agent`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, projectId: args?.project_id });
            result = await this.handleRevokeCrossProjectAgent(args);
            break;

          case 'list_agent_cross_projects':
            logger.info(`[MCP_SERVER] Executing list_agent_cross_projects`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListAgentCrossProjects(args);
            break;

          case 'list_project_external_agents':
            logger.info(`[MCP_SERVER] Executing list_project_external_agents`, { requestId, instanceId: this.instanceId, projectId: args?.project_id });
            result = await this.handleListProjectExternalAgents(args);
            break;

          case 'discover_cross_project_agents':
            logger.info(`[MCP_SERVER] Executing discover_cross_project_agents`, { requestId, instanceId: this.instanceId });
            result = await this.handleDiscoverCrossProjectAgents(args);
            break;

          case 'find_capable_agents_cross_project':
            logger.info(`[MCP_SERVER] Executing find_capable_agents_cross_project`, { requestId, instanceId: this.instanceId, capabilities: args?.capabilities });
            result = await this.handleFindCapableAgentsCrossProject(args);
            break;

          case 'apply_experience_decay':
            logger.info(`[MCP_SERVER] Executing apply_experience_decay`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleApplyExperienceDecay(args);
            break;

          case 'validate_experience':
            logger.info(`[MCP_SERVER] Executing validate_experience`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, experienceId: args?.experience_id });
            result = await this.handleValidateExperience(args);
            break;

          case 'get_experience_validation_stats':
            logger.info(`[MCP_SERVER] Executing get_experience_validation_stats`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetExperienceValidationStats(args);
            break;

          case 'decay_all_experiences':
            logger.info(`[MCP_SERVER] Executing decay_all_experiences`, { requestId, instanceId: this.instanceId });
            result = await this.handleDecayAllExperiences(args);
            break;

          case 'suggest_capability_adaptation':
            logger.info(`[MCP_SERVER] Executing suggest_capability_adaptation`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleSuggestCapabilityAdaptation(args);
            break;

          case 'apply_capability_adaptation':
            logger.info(`[MCP_SERVER] Executing apply_capability_adaptation`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleApplyCapabilityAdaptation(args);
            break;

          case 'find_cross_project_tasks':
            logger.info(`[MCP_SERVER] Executing find_cross_project_tasks`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleFindCrossProjectTasks(args);
            break;

          case 'claim_cross_project_task':
            logger.info(`[MCP_SERVER] Executing claim_cross_project_task`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, taskId: args?.task_id });
            result = await this.handleClaimCrossProjectTask(args);
            break;

          case 'get_protocol_analytics':
            logger.info(`[MCP_SERVER] Executing get_protocol_analytics`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetProtocolAnalytics(args);
            break;

          case 'add_deliberation_message':
            logger.info(`[MCP_SERVER] Executing add_deliberation_message`, { requestId, instanceId: this.instanceId, protocolId: args?.protocol_id });
            result = await this.handleAddDeliberationMessage(args);
            break;

          case 'list_sandboxes':
            logger.info(`[MCP_SERVER] Executing list_sandboxes`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleListSandboxes(args);
            break;

          case 'create_sandbox':
            logger.info(`[MCP_SERVER] Executing create_sandbox`, { requestId, instanceId: this.instanceId, name: args?.name });
            result = await this.handleCreateSandbox(args);
            break;

          case 'get_sandbox':
            logger.info(`[MCP_SERVER] Executing get_sandbox`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id });
            result = await this.handleGetSandbox(args);
            break;

          case 'update_sandbox':
            logger.info(`[MCP_SERVER] Executing update_sandbox`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id });
            result = await this.handleUpdateSandbox(args);
            break;

          case 'delete_sandbox':
            logger.info(`[MCP_SERVER] Executing delete_sandbox`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id });
            result = await this.handleDeleteSandbox(args);
            break;

          case 'bind_agent_sandbox':
            logger.info(`[MCP_SERVER] Executing bind_agent_sandbox`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id, sandboxId: args?.sandbox_id });
            result = await this.handleBindAgentSandbox(args);
            break;

          case 'get_agent_sandbox':
            logger.info(`[MCP_SERVER] Executing get_agent_sandbox`, { requestId, instanceId: this.instanceId, agentId: args?.agent_id });
            result = await this.handleGetAgentSandbox(args);
            break;

          case 'check_sandbox_action':
            logger.info(`[MCP_SERVER] Executing check_sandbox_action`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id, action: args?.action });
            result = await this.handleCheckSandboxAction(args);
            break;

          case 'start_sandbox_execution':
            logger.info(`[MCP_SERVER] Executing start_sandbox_execution`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id, agentId: args?.agent_id });
            result = await this.handleStartSandboxExecution(args);
            break;

          case 'complete_sandbox_execution':
            logger.info(`[MCP_SERVER] Executing complete_sandbox_execution`, { requestId, instanceId: this.instanceId, executionId: args?.execution_id });
            result = await this.handleCompleteSandboxExecution(args);
            break;

          case 'revoke_sandbox_execution':
            logger.info(`[MCP_SERVER] Executing revoke_sandbox_execution`, { requestId, instanceId: this.instanceId, executionId: args?.execution_id });
            result = await this.handleRevokeSandboxExecution(args);
            break;

          case 'report_sandbox_violation':
            logger.info(`[MCP_SERVER] Executing report_sandbox_violation`, { requestId, instanceId: this.instanceId, executionId: args?.execution_id, violationType: args?.violation_type });
            result = await this.handleReportSandboxViolation(args);
            break;

          case 'get_sandbox_execution':
            logger.info(`[MCP_SERVER] Executing get_sandbox_execution`, { requestId, instanceId: this.instanceId, executionId: args?.execution_id });
            result = await this.handleGetSandboxExecution(args);
            break;

          case 'list_sandbox_executions':
            logger.info(`[MCP_SERVER] Executing list_sandbox_executions`, { requestId, instanceId: this.instanceId, sandboxId: args?.sandbox_id });
            result = await this.handleListSandboxExecutions(args);
            break;

          case 'get_sandbox_dashboard':
            logger.info(`[MCP_SERVER] Executing get_sandbox_dashboard`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetSandboxDashboard(args);
            break;

          case 'get_sandbox_violation_trend':
            logger.info(`[MCP_SERVER] Executing get_sandbox_violation_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetSandboxViolationTrend(args);
            break;

          case 'get_sandbox_violations_by_agent':
            logger.info(`[MCP_SERVER] Executing get_sandbox_violations_by_agent`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetSandboxViolationsByAgent(args);
            break;

          case 'get_sandbox_template_usage':
            logger.info(`[MCP_SERVER] Executing get_sandbox_template_usage`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetSandboxTemplateUsage(args);
            break;

          case 'get_step_sandbox_execution':
            logger.info(`[MCP_SERVER] Executing get_step_sandbox_execution`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key });
            result = await this.handleGetStepSandboxExecution(args);
            break;

          case 'report_step_sandbox_violation':
            logger.info(`[MCP_SERVER] Executing report_step_sandbox_violation`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key, violationType: args?.violation_type });
            result = await this.handleReportStepSandboxViolation(args);
            break;

          case 'set_step_runtime_override':
            logger.info(`[MCP_SERVER] Executing set_step_runtime_override`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key });
            result = await this.handleSetStepRuntimeOverride(args);
            break;

          case 'clear_step_runtime_override':
            logger.info(`[MCP_SERVER] Executing clear_step_runtime_override`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key });
            result = await this.handleClearStepRuntimeOverride(args);
            break;

          case 'get_step_effective_params':
            logger.info(`[MCP_SERVER] Executing get_step_effective_params`, { requestId, instanceId: this.instanceId, runId: args?.run_id, stepKey: args?.step_key });
            result = await this.handleGetStepEffectiveParams(args);
            break;

          case 'scan_conflicts':
            logger.info(`[MCP_SERVER] Executing scan_conflicts`, { requestId, instanceId: this.instanceId });
            result = await this.handleScanConflicts(args);
            break;

          case 'list_conflicts':
            logger.info(`[MCP_SERVER] Executing list_conflicts`, { requestId, instanceId: this.instanceId, status: args?.status, type: args?.type });
            result = await this.handleListConflicts(args);
            break;

          case 'get_conflict':
            logger.info(`[MCP_SERVER] Executing get_conflict`, { requestId, instanceId: this.instanceId, conflictId: args?.conflict_id });
            result = await this.handleGetConflict(args);
            break;

          case 'resolve_conflict':
            logger.info(`[MCP_SERVER] Executing resolve_conflict`, { requestId, instanceId: this.instanceId, conflictId: args?.conflict_id, strategy: args?.strategy });
            result = await this.handleResolveConflict(args);
            break;

          case 'acknowledge_conflict':
            logger.info(`[MCP_SERVER] Executing acknowledge_conflict`, { requestId, instanceId: this.instanceId, conflictId: args?.conflict_id });
            result = await this.handleAcknowledgeConflict(args);
            break;

          case 'ignore_conflict':
            logger.info(`[MCP_SERVER] Executing ignore_conflict`, { requestId, instanceId: this.instanceId, conflictId: args?.conflict_id });
            result = await this.handleIgnoreConflict(args);
            break;

          case 'get_conflicts_dashboard':
            logger.info(`[MCP_SERVER] Executing get_conflicts_dashboard`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetConflictsDashboard(args);
            break;

          case 'get_conflicts_trend':
            logger.info(`[MCP_SERVER] Executing get_conflicts_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetConflictsTrend(args);
            break;

          case 'get_conflicts_by_agent':
            logger.info(`[MCP_SERVER] Executing get_conflicts_by_agent`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetConflictsByAgent(args);
            break;

          case 'get_conflicts_strategy_stats':
            logger.info(`[MCP_SERVER] Executing get_conflicts_strategy_stats`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetConflictsStrategyStats(args);
            break;

          case 'list_sandbox_templates':
            logger.info(`[MCP_SERVER] Executing list_sandbox_templates`, { requestId, instanceId: this.instanceId });
            result = await this.handleListSandboxTemplates(args);
            break;

          case 'instantiate_sandbox_template':
            logger.info(`[MCP_SERVER] Executing instantiate_sandbox_template`, { requestId, instanceId: this.instanceId, templateKey: args?.template_key });
            result = await this.handleInstantiateSandboxTemplate(args);
            break;

          case 'auto_resolve_conflicts':
            logger.info(`[MCP_SERVER] Executing auto_resolve_conflicts`, { requestId, instanceId: this.instanceId });
            result = await this.handleAutoResolveConflicts(args);
            break;

          case 'orchestrate':
            logger.info(`[MCP_SERVER] Executing orchestrate`, { requestId, instanceId: this.instanceId });
            result = await this.handleOrchestrate(args);
            break;

          case 'get_orchestrator_status':
            logger.info(`[MCP_SERVER] Executing get_orchestrator_status`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetOrchestratorStatus(args);
            break;

          case 'list_orchestrator_history':
            logger.info(`[MCP_SERVER] Executing list_orchestrator_history`, { requestId, instanceId: this.instanceId });
            result = await this.handleListOrchestratorHistory(args);
            break;

          case 'orchestrator_daily_trend':
            logger.info(`[MCP_SERVER] Executing orchestrator_daily_trend`, { requestId, instanceId: this.instanceId });
            result = await this.handleOrchestratorDailyTrend(args);
            break;

          default:
            const error = new Error(`Unknown tool: ${name}`);
            logger.error(`[MCP_SERVER] Unknown tool requested`, {
              requestId,
              instanceId: this.instanceId,
              toolName: name,
              error: error.message,
              availableTools: [
                'get_project_tasks_by_name',
                'get_task_by_id',
                'submit_task_feedback',
                'create_task',
                'get_project_info',
                'list_agents',
                'create_agent',
                'self_register_agent',
                'discover_agents',
                'update_agent',
                'heartbeat_agent',
                'list_recommended_tasks',
                'list_review_queue',
                'list_agent_assignments',
                'list_task_assignments',
                'list_task_events',
                'create_subtask',
                'post_task_event',
                'get_agent_inbox',
                'handoff_task',
                'dispatch_tasks',
                'list_notifications',
                'mark_notifications_read',
                'get_shared_context',
                'set_shared_context',
                'delete_shared_context',
                'get_run_logs',
                'append_run_logs',
                'list_task_templates',
                'create_task_template',
                'instantiate_task_template',
                'claim_agent_task',
                'update_agent_assignment',
                'update_task_assignment',
                'list_workflows',
                'create_workflow',
                'get_workflow',
                'update_workflow',
                'delete_workflow',
                'launch_workflow',
                'list_workflow_runs',
                'get_workflow_step_stats',
                'get_workflow_run_trend',
                'get_workflow_run',
                'get_workflow_run_console',
                'cancel_workflow_run',
                'pause_workflow_run',
                'resume_workflow_run',
                'retry_workflow_run',
                'complete_workflow_step',
                'register_capabilities',
                'escalate_overdue_tasks',
                'list_audit_logs',
                'list_security_events',
                'export_security_events',
                'security_events_daily_trend',
                'security_events_by_agent',
                'health_check',
                'broadcast_message',
                'collaboration_metrics',
                'list_workflow_triggers',
                'create_workflow_trigger',
                'update_workflow_trigger',
                'delete_workflow_trigger',
                'fire_due_triggers',
                'mark_offline_agents',
                'timeout_workflow_steps',
                'send_agent_message',
                'get_agent_messages',
                'get_agent_collaborators',
                'collaboration_graph',
                'list_channels',
                'create_channel',
                'send_channel_message',
                'list_channel_messages',
                'list_workflow_templates',
                'get_workflow_template',
                'instantiate_workflow_template',
                'list_collaboration_templates',
                'create_collaboration_template',
                'delete_collaboration_template',
                'instantiate_collaboration_template',
                'list_knowledge_entries',
                'create_knowledge_entry',
                'get_knowledge_entry',
                'update_knowledge_entry',
                'delete_knowledge_entry',
                'search_knowledge',
                'list_shared_knowledge',
                'auto_extract_knowledge',
                'list_workflow_versions',
                'get_workflow_version',
                'rollback_workflow',
                'diff_workflow_versions',
                'list_protocols',
                'create_protocol',
                'get_protocol',
                'respond_to_protocol',
                'resolve_protocol',
                'get_agent_reputation',
                'list_reputations',
                'recalculate_reputation',
                'get_agent_reputation_history',
                'list_agent_experiences',
                'create_agent_experience',
                'get_agent_experience',
                'update_agent_experience',
                'delete_agent_experience',
                'recommend_experiences',
                'get_experiences_stats',
                'get_experiences_low_confidence',
                'get_task_stats',
                'get_workflow_failure_correlation',
                'get_workflow_failure_correlation_by_step',
                'get_agent_productivity',
                'get_agent_productivity_trend',
                'get_agent_productivity_alerts',
                'get_agent_productivity_by_kind',
                'get_conflicts_sandbox_correlation',
                'get_agent_health',
                'get_agent_health_trend',
                'get_agent_health_alerts',
                'share_agent_experience',
                'learn_from_experience',
                'list_shared_experiences',
                'auto_extract_experiences',
                'authorize_cross_project_agent',
                'revoke_cross_project_agent',
                'list_agent_cross_projects',
                'list_project_external_agents',
                'discover_cross_project_agents',
                'find_capable_agents_cross_project',
                'apply_experience_decay',
                'validate_experience',
                'get_experience_validation_stats',
                'decay_all_experiences',
                'suggest_capability_adaptation',
                'apply_capability_adaptation',
                'find_cross_project_tasks',
                'claim_cross_project_task',
                'get_protocol_analytics',
                'add_deliberation_message',
                'list_sandboxes',
                'create_sandbox',
                'get_sandbox',
                'update_sandbox',
                'delete_sandbox',
                'bind_agent_sandbox',
                'get_agent_sandbox',
                'check_sandbox_action',
                'start_sandbox_execution',
                'complete_sandbox_execution',
                'revoke_sandbox_execution',
                'report_sandbox_violation',
                'get_sandbox_execution',
                'list_sandbox_executions',
                'get_sandbox_dashboard',
                'get_sandbox_violation_trend',
                'get_sandbox_violations_by_agent',
                'get_sandbox_template_usage',
                'get_step_sandbox_execution',
                'report_step_sandbox_violation',
                'set_step_runtime_override',
                'clear_step_runtime_override',
                'get_step_effective_params',
                'scan_conflicts',
                'list_conflicts',
                'get_conflict',
                'resolve_conflict',
                'acknowledge_conflict',
                'ignore_conflict',
                'get_conflicts_dashboard',
                'get_conflicts_trend',
                'get_conflicts_by_agent',
                'get_conflicts_strategy_stats',
                'list_sandbox_templates',
                'instantiate_sandbox_template',
                'auto_resolve_conflicts',
                'orchestrate',
                'get_orchestrator_status',
                'list_orchestrator_history',
                'orchestrator_daily_trend'
              ]
            });
            throw error;
        }

        const duration = Date.now() - startTime;
        const totalCallDuration = Date.now() - callStartTime;

        logger.info(`[MCP_SERVER] Tool call completed successfully: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          duration: `${duration}ms`,
          totalCallDuration: `${totalCallDuration}ms`,
          hasResult: !!result,
          resultType: typeof result,
          resultSize: result ? JSON.stringify(result).length : 0,
          memoryUsage: process.memoryUsage()
        });

        logger.debug(`[MCP_SERVER] Tool call result structure: ${name}`, {
          requestId,
          result: result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
        });

        logger.info(`[MCP_SERVER] ========== TOOL CALL END ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: true,
          totalDuration: `${totalCallDuration}ms`,
          timestamp: new Date().toISOString()
        });

        return result;
      } catch (error) {
        const totalCallDuration = Date.now() - callStartTime;

        logger.error(`[MCP_SERVER] Tool call failed: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          toolName: name,
          totalCallDuration: `${totalCallDuration}ms`,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          args,
          memoryUsage: process.memoryUsage()
        });

        logger.error(`[MCP_SERVER] ========== TOOL CALL END (ERROR) ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: false,
          totalDuration: `${totalCallDuration}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    });
  }

  private async handleGetProjectTasksByName(args: any) {
    const result = await this.apiClient.getProjectTasksByName(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetTaskById(args: any) {
    const result = await this.apiClient.getTaskById(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSubmitTaskFeedback(args: any) {
    const result = await this.apiClient.submitTaskFeedback(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCreateTask(args: any) {
    const result = await this.apiClient.createTask(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetProjectInfo(args: any) {
    const handlerStartTime = Date.now();
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[MCP_SERVER] ========== HANDLER START: handleGetProjectInfo ==========', {
      handlerId,
      instanceId: this.instanceId,
      args,
      hasProjectId: !!args?.project_id,
      hasProjectName: !!args?.project_name,
      timestamp: new Date().toISOString()
    });

    logger.debug('[MCP_SERVER] handleGetProjectInfo input validation', {
      handlerId,
      projectId: args?.project_id,
      projectName: args?.project_name,
      argsType: typeof args,
      argsKeys: args ? Object.keys(args) : [],
      isValidInput: !!(args?.project_id || args?.project_name)
    });

    try {
      logger.info('[MCP_SERVER] handleGetProjectInfo calling API client...', {
        handlerId,
        instanceId: this.instanceId,
        apiMethod: 'getProjectInfo',
        args
      });

      const apiCallStartTime = Date.now();
      const result = await this.apiClient.getProjectInfo(args);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('[MCP_SERVER] handleGetProjectInfo API call successful', {
        handlerId,
        instanceId: this.instanceId,
        apiCallDuration: `${apiCallDuration}ms`,
        projectId: result.id,
        projectName: result.name,
        projectStatus: result.status,
        hasStats: !!result.statistics,
        hasRecentTasks: !!result.recent_tasks,
        resultSize: JSON.stringify(result).length,
        resultKeys: Object.keys(result)
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo API result details', {
        handlerId,
        result: result,
        statistics: result.statistics,
        recentTasks: result.recent_tasks
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo preparing response...', {
        handlerId,
        responseFormat: 'MCP tool response',
        contentType: 'text',
        willStringify: true
      });

      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      const handlerDuration = Date.now() - handlerStartTime;
      logger.info('[MCP_SERVER] handleGetProjectInfo response prepared', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        responseSize: JSON.stringify(response).length,
        contentType: response.content[0]?.type,
        contentCount: response.content.length,
        textLength: response.content[0]?.text?.length
      });

      logger.info('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: true,
        totalDuration: `${handlerDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      const handlerDuration = Date.now() - handlerStartTime;

      logger.error('[MCP_SERVER] handleGetProjectInfo failed', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        args,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.error('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo (ERROR) ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: false,
        totalDuration: `${handlerDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  private async handleListAgents(args: any) {
    const result = await this.apiClient.listAgents(args || {});

    return this.toToolResponse(this.summarizeListAgents(result), result);
  }

  private async handleCreateAgent(args: any) {
    const result = await this.apiClient.createAgent(args);

    return this.toToolResponse(`Created Agent #${result.id} ${result.name} with status ${result.status}.`, result);
  }

  private async handleSelfRegisterAgent(args: any) {
    const result = await this.apiClient.selfRegisterAgent(args);
    const isNew = result.created_at === result.updated_at;
    const summary = isNew
      ? `Self-registered new Agent #${result.id} "${result.name}" (${result.kind}).`
      : `Re-registered existing Agent #${result.id} "${result.name}" — updated capabilities/config.`;
    return this.toToolResponse(summary, result);
  }

  private async handleDiscoverAgents(args: any) {
    const result = await this.apiClient.discoverAgents(args);
    const items = Array.isArray(result) ? result : [];
    if (items.length === 0) {
      return this.toToolResponse('No matching agents found.', result);
    }
    const lines = items.map((a: any) => {
      const caps = (a.capabilities || []).slice(0, 5).join(', ');
      const role = a.collaboration_role || 'standalone';
      return `- #${a.id} ${a.name} (${a.kind}, ${role})${caps ? ` — caps: ${caps}` : ''}`;
    });
    return this.toToolResponse(`Found ${items.length} agent(s):\n${lines.join('\n')}`, result);
  }

  private async handleUpdateAgent(args: any) {
    const result = await this.apiClient.updateAgent(args);

    return this.toToolResponse(`Updated Agent #${result.id} ${result.name}; status: ${result.status}; kind: ${result.kind}.`, result);
  }

  private async handleHeartbeatAgent(args: any) {
    const result = await this.apiClient.heartbeatAgent(args);

    return this.toToolResponse(`Heartbeat recorded for Agent #${result.id} ${result.name}; status: ${result.status}; last_seen_at: ${result.last_seen_at || 'not returned'}.`, result);
  }

  private async handleListRecommendedTasks(args: any) {
    const result = await this.apiClient.listRecommendedTasks(args);
    const items = Array.isArray(result) ? result : [];
    if (items.length === 0) {
      return this.toToolResponse(`No recommended tasks found for Agent #${args.agent_id}.`, result);
    }
    const lines = items.map((item: any, i: number) => {
      const t = item.task;
      const matched = [...(item.matched_capabilities || []), ...(item.matched_tags || [])].slice(0, 5).join(', ');
      const missing = (item.missing_required || []).join(', ');
      let line = `${i + 1}. Task #${t.id} "${t.title}" (score: ${item.score})`;
      if (matched) line += ` — matched: ${matched}`;
      if (missing) line += ` — missing: ${missing}`;
      return line;
    });
    return this.toToolResponse(`Recommended tasks for Agent #${args.agent_id}:\n${lines.join('\n')}`, result);
  }

  private async handleListReviewQueue(args: any) {
    const result = await this.apiClient.listReviewQueue(args || {});

    return this.toToolResponse(this.summarizeReviewQueue(result), result);
  }

  private async handleListAgentAssignments(args: any) {
    const result = await this.apiClient.listAgentAssignments(args);

    return this.toToolResponse(this.summarizeAssignments(result, `Assignments for Agent #${args?.agent_id}`), result);
  }

  private async handleListTaskAssignments(args: any) {
    const result = await this.apiClient.listTaskAssignments(args);

    return this.toToolResponse(this.summarizeAssignments(result, `Assignments for task #${args?.task_id}`), result);
  }

  private async handleListTaskEvents(args: any) {
    const result = await this.apiClient.listTaskEvents(args);

    return this.toToolResponse(this.summarizeTaskEvents(result), result);
  }

  private async handleCreateSubtask(args: any) {
    const result = await this.apiClient.createSubtask(args);
    const summary = `Created subtask #${result.id} "${result.title}" under task #${args.task_id}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleListNotifications(args: any) {
    const result = await this.apiClient.listNotifications(args || {});
    const lines = [`Notifications (${result.unread_count} unread):`];
    for (const n of result.items) {
      const readMark = n.is_read ? '✓' : '●';
      const agentLabel = n.agent_name ? ` from ${n.agent_name}` : '';
      const taskLabel = n.task_title ? ` on "${n.task_title}"` : (n.task_id ? ` on task #${n.task_id}` : '');
      lines.push(`  ${readMark} #${n.id} [${n.event_type}]${agentLabel}${taskLabel} — ${n.created_at}`);
    }
    return this.toToolResponse(lines.join('\n'), result);
  }

  private async handleMarkNotificationsRead(args: any) {
    const result = await this.apiClient.markNotificationsRead(args);
    const summary = args.all
      ? `Marked all notifications as read (${result.marked_count} items).`
      : `Marked ${result.marked_count} notification(s) as read.`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetSharedContext(args: any) {
    const entries = await this.apiClient.getSharedContext(args);
    if (!entries || entries.length === 0) {
      return this.toToolResponse(`No shared context found for task #${args.task_id}.`, []);
    }
    const lines = [`Shared context for task #${args.task_id}:`];
    for (const e of entries) {
      const author = e.author_agent_name || e.author_user_name || 'unknown';
      lines.push(`  [${e.key}] (by ${author}, updated ${e.updated_at}):`);
      lines.push(`    ${e.value.length > 200 ? e.value.substring(0, 200) + '...' : e.value}`);
    }
    return this.toToolResponse(lines.join('\n'), entries);
  }

  private async handleSetSharedContext(args: any) {
    const result = await this.apiClient.setSharedContext(args);
    const summary = `Shared context "${args.key}" saved for task #${args.task_id}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleDeleteSharedContext(args: any) {
    await this.apiClient.deleteSharedContext(args);
    return this.toToolResponse(`Shared context entry #${args.entry_id} deleted from task #${args.task_id}.`, { deleted: true });
  }

  private async handleGetRunLogs(args: any) {
    const result = await this.apiClient.getRunLogs(args);
    if (!result.items || result.items.length === 0) {
      return this.toToolResponse(`No log entries found for run #${args.run_id}.`, result);
    }
    const lines = [`Run #${args.run_id} logs (${result.items.length} entries, latest_id=${result.latest_id}):`];
    for (const log of result.items) {
      const levelTag = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : log.level === 'debug' ? '🔍' : 'ℹ️';
      lines.push(`  ${levelTag} [${log.level}] #${log.id}: ${log.message}`);
      if (log.meta && Object.keys(log.meta).length > 0) {
        lines.push(`    meta: ${JSON.stringify(log.meta)}`);
      }
    }
    return this.toToolResponse(lines.join('\n'), result);
  }

  private async handleAppendRunLogs(args: any) {
    const result = await this.apiClient.appendRunLogs(args);
    return this.toToolResponse(`Appended ${result.length} log entries to run #${args.run_id}.`, result);
  }

  private async handleListTaskTemplates(_args: any) {
    const templates = await this.apiClient.listTaskTemplates();
    if (!templates || templates.length === 0) {
      return this.toToolResponse('No task templates found.', []);
    }
    const lines = ['Task templates:'];
    for (const t of templates) {
      const capStr = t.capabilities?.length ? ` [${t.capabilities.join(', ')}]` : '';
      lines.push(`  #${t.id} "${t.name}" — priority: ${t.priority}, is_ai_task: ${t.is_ai_task}${capStr}`);
    }
    return this.toToolResponse(lines.join('\n'), templates);
  }

  private async handleCreateTaskTemplate(args: any) {
    const result = await this.apiClient.createTaskTemplate(args);
    return this.toToolResponse(`Task template "${result.name}" created (ID #${result.id}).`, result);
  }

  private async handleInstantiateTaskTemplate(args: any) {
    const result = await this.apiClient.instantiateTaskTemplate(args);
    const taskTitle = result?.title || 'Untitled';
    const taskId = result?.id || '?';
    return this.toToolResponse(`Task #${taskId} "${taskTitle}" created from template #${args.template_id}.`, result);
  }

  // --- Workflow handlers ---

  private async handleListWorkflows(args: any) {
    const result = await this.apiClient.listWorkflows(args);
    const items = result?.items || [];
    const lines = items.map((w: any) => {
      const stepCount = w.steps?.length || 0;
      const active = w.is_active ? 'active' : 'inactive';
      return `  • #${w.id} "${w.name}" — ${stepCount} step(s), ${active}`;
    });
    const summary = lines.length
      ? `Found ${items.length} workflow(s):\n${lines.join('\n')}`
      : 'No workflows found.';
    return this.toToolResponse(summary, result);
  }

  private async handleCreateWorkflow(args: any) {
    const result = await this.apiClient.createWorkflow(args);
    const stepCount = result?.steps?.length || 0;
    const summary = `Workflow #${result.id} "${result.name}" created with ${stepCount} step(s).`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetWorkflow(args: any) {
    const result = await this.apiClient.getWorkflow(args);
    const steps = result?.steps || [];
    const stepLines = steps.map((s: any) => {
      const deps = s.depends_on?.length ? ` (depends: ${s.depends_on.join(', ')})` : ' (entry point)';
      const caps = s.required_capabilities?.length ? ` [${s.required_capabilities.join(', ')}]` : '';
      return `  ${s.order ?? 0}. ${s.step_key}: ${s.name}${caps}${deps}`;
    });
    const summary = `Workflow #${result.id} "${result.name}"\n${stepLines.join('\n')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleUpdateWorkflow(args: any) {
    const result = await this.apiClient.updateWorkflow(args);
    const stepCount = result?.steps?.length || 0;
    return this.toToolResponse(`Workflow #${result.id} "${result.name}" updated (${stepCount} steps).`, result);
  }

  private async handleDeleteWorkflow(args: any) {
    await this.apiClient.deleteWorkflow(args);
    return this.toToolResponse(`Workflow #${args.workflow_id} deleted.`, { deleted: true });
  }

  private async handleLaunchWorkflow(args: any) {
    const result = await this.apiClient.launchWorkflow(args);
    const stepRuns = result?.step_runs || [];
    const started = stepRuns.filter((sr: any) => sr.status === 'running').length;
    const pending = stepRuns.filter((sr: any) => sr.status === 'pending').length;
    const summary = `Workflow run #${result.id} launched (status: ${result.status}). ${started} step(s) started, ${pending} pending.`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetWorkflowStepStats(args: any) {
    const result = await this.apiClient.getWorkflowStepStats(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => {
        const rate = Math.round((it.success_rate || 0) * 100);
        const dur = typeof it.avg_duration_seconds === 'number' ? `${it.avg_duration_seconds}s` : '?';
        const retry = it.retries > 0 ? ` 重试${it.retries}` : '';
        return `• ${it.step_key}: ${it.total}次 成功${rate}% 失败${it.failed} 均${dur}${retry}`;
      })
      .join('\n');
    return this.toToolResponse(`工作流步骤统计:\n${summary || '暂无步骤运行数据'}`, result);
  }

  private async handleGetWorkflowRunTrend(args: any) {
    const result = await this.apiClient.getWorkflowRunTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const recent = trend.slice(-7)
      .map((t: any) => `• ${t.date}: 成功 ${t.succeeded} / 失败 ${t.failed} / 失败步骤 ${t.failed_steps ?? 0}`)
      .join('\n');
    return this.toToolResponse(
      `工作流运行趋势 (近 ${d?.days || 30} 天): 累计成功 ${d?.total_succeeded || 0}, 累计失败 ${d?.total_failed || 0}, 累计失败步骤 ${d?.total_failed_steps || 0}\n${recent || '暂无数据'}`,
      result,
    );
  }

  private async handleListWorkflowRuns(args: any) {
    const result = await this.apiClient.listWorkflowRuns(args);
    const items = result?.items || [];
    const lines = items.map((r: any) => {
      const stepCount = r.step_runs?.length || 0;
      const done = (r.step_runs || []).filter((sr: any) => sr.status === 'succeeded').length;
      return `  • Run #${r.id} — workflow #${r.workflow_id}, status: ${r.status}, steps: ${done}/${stepCount} done`;
    });
    const summary = lines.length
      ? `Found ${items.length} workflow run(s):\n${lines.join('\n')}`
      : 'No workflow runs found.';
    return this.toToolResponse(summary, result);
  }

  private async handleGetWorkflowRun(args: any) {
    const result = await this.apiClient.getWorkflowRun(args);
    const stepRuns = result?.step_runs || [];
    const lines = stepRuns.map((sr: any) => {
      const agent = sr.agent_id ? ` (Agent #${sr.agent_id})` : '';
      const task = sr.task_id ? ` → task #${sr.task_id}` : '';
      return `  • ${sr.step_key}: ${sr.status}${agent}${task}`;
    });
    const summary = `Workflow run #${result.id} (status: ${result.status})\n${lines.join('\n')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetWorkflowRunConsole(args: any) {
    const result = await this.apiClient.getWorkflowRunConsole(args);
    const wf = result?.workflow_run || {};
    const steps = result?.steps || [];
    const sm = result?.summary || {};
    const conflicts = result?.conflicts || [];
    const stepLines = steps.map((s: any) => {
      const sr = s.step_run || {};
      const eff = s.effective_params || {};
      const overrides = Object.keys(sr.runtime_overrides || {}).length
        ? ` [overrides: ${Object.keys(sr.runtime_overrides).join(',')}]`
        : '';
      const sb = s.sandbox_execution ? ` 🛡️exec#${s.sandbox_execution.id}:${s.sandbox_execution.status}` : '';
      const dur = (s.duration_seconds != null) ? ` ${(s.duration_seconds as number).toFixed(0)}s` : '';
      const logs = (s.recent_logs || []).length
        ? ` logs:${(s.recent_logs as any[]).length}`
        : '';
      const agent = sr.agent_id ? ` (Agent #${sr.agent_id})` : '';
      return `  • ${sr.step_key}: ${sr.status}${agent}${sb}${dur}${overrides}${logs}`;
    });
    const conflictLines = conflicts.length
      ? conflicts.map((c: any) => `    ⚠ ${c.title || c.conflict_type} [${c.status}/${c.severity}]`)
      : ['    (none)'];
    const summary = [
      `Console — Workflow run #${wf.id} (status: ${wf.status})`,
      `Progress: ${sm.progress_percent ?? 0}% | total=${sm.total_steps ?? 0} running=${sm.running_count ?? 0} failed=${sm.failed_count ?? 0} pending=${sm.pending_count ?? 0}`,
      'Steps:',
      ...stepLines,
      'Conflicts:',
      ...conflictLines,
    ].join('\n');
    return this.toToolResponse(summary, result);
  }

  private async handleCancelWorkflowRun(args: any) {
    const result = await this.apiClient.cancelWorkflowRun(args);
    return this.toToolResponse(`Workflow run #${args.run_id} cancelled.`, result);
  }

  private async handlePauseWorkflowRun(args: any) {
    const result = await this.apiClient.pauseWorkflowRun(args);
    return this.toToolResponse(`Workflow run #${args.run_id} paused. Running steps continue but no new steps will start.`, result);
  }

  private async handleResumeWorkflowRun(args: any) {
    const result = await this.apiClient.resumeWorkflowRun(args);
    return this.toToolResponse(`Workflow run #${args.run_id} resumed. DAG engine re-evaluating steps.`, result);
  }

  private async handleRetryWorkflowRun(args: any) {
    const result = await this.apiClient.retryWorkflowRun(args);
    const retriedSteps = result?.step_runs?.filter((sr: any) => (sr.attempt || 1) > 1).map((sr: any) => sr.step_key) || [];
    const summary = retriedSteps.length > 0
      ? `Workflow run #${args.run_id} retry started. Retried steps: ${retriedSteps.join(', ')}`
      : `Workflow run #${args.run_id} retry started.`;
    return this.toToolResponse(summary, result);
  }

  private async handleCompleteWorkflowStep(args: any) {
    const result = await this.apiClient.completeWorkflowStep(args);
    const success = args?.success !== false;
    const summary = success
      ? `Step "${args.step_key}" in run #${args.run_id} completed successfully. Workflow status: ${result.status}.`
      : `Step "${args.step_key}" in run #${args.run_id} failed. Workflow status: ${result.status}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleRegisterCapabilities(args: any) {
    const result = await this.apiClient.registerCapabilities(args);
    const mode = args?.mode || 'merge';
    const capCount = result?.capabilities?.length || 0;
    const summary = `Agent #${args.agent_id} capabilities ${mode === 'replace' ? 'replaced' : 'updated'}: now has ${capCount} capabilities (${(result?.capabilities || []).join(', ')}).`;
    return this.toToolResponse(summary, result);
  }

  private async handleEscalateOverdueTasks(args: any) {
    const result = await this.apiClient.escalateOverdueTasks(args);
    const count = result?.escalated_count ?? 0;
    const summary = count > 0
      ? `Escalated ${count} overdue task(s). Task IDs: ${(result?.task_ids || []).join(', ')}`
      : 'No overdue tasks found to escalate.';
    return this.toToolResponse(summary, result);
  }

  private async handleListAuditLogs(args: any) {
    const result = await this.apiClient.listAuditLogs(args);
    const items = result?.items || [];
    const lines = items.map((log: any) => {
      const actor = log.actor_agent_name || log.actor_user_email || log.actor_type;
      return `  • [${log.created_at}] ${actor} ${log.action} on ${log.resource_type}#${log.resource_id}`;
    });
    const summary = lines.length
      ? `Found ${items.length} audit log entry(ies):\n${lines.join('\n')}`
      : 'No audit log entries found.';
    return this.toToolResponse(summary, result);
  }

  private async handleListSecurityEvents(args: any) {
    const result = await this.apiClient.listSecurityEvents(args);
    const items = result?.items || [];
    const lines = items.map((e: any) => {
      const agent = e.agent_id ? ` Agent#${e.agent_id}` : '';
      const run = e.workflow_run_id ? ` run#${e.workflow_run_id}` : '';
      return `  • [${e.occurred_at}] ${e.severity} ${e.event_type}${agent}${run} — ${e.title}`;
    });
    const summary = lines.length
      ? `Found ${items.length} security event(s) (total=${result?.pagination?.total ?? items.length}):\n${lines.join('\n')}`
      : 'No security events found.';
    return this.toToolResponse(summary, result);
  }

  private async handleExportSecurityEvents(args: any) {
    const csv = await this.apiClient.exportSecurityEvents(args);
    const rowCount = csv ? csv.trim().split('\n').length - 1 : 0;
    const summary = rowCount > 0
      ? `Exported ${rowCount} security event(s) as CSV (columns: occurred_at, event_type, severity, agent_id, workflow_run_id, source, source_id, title, detail).`
      : 'No security events matched the filters; CSV header only.';
    return this.toToolResponse(summary, { csv, row_count: rowCount });
  }

  private async handleSecurityEventsDailyTrend(args: any) {
    const result = await this.apiClient.securityEventsDailyTrend(args);
    const d = result?.data || result;
    const days = d?.days || [];
    const totals = d?.totals || {};
    const lines = days.map((day: any) =>
      `  • ${day.date}: 沙盒违规 ${day.sandbox_violation} · 冲突 ${day.conflict} · 审计 ${day.audit} · 合计 ${day.total}`
    );
    const summary = days.length
      ? `安全事件按天趋势 (${days.length} 天, 累计 沙盒违规 ${totals.sandbox_violation ?? 0}/冲突 ${totals.conflict ?? 0}/审计 ${totals.audit ?? 0}/合计 ${totals.total ?? 0}):\n${lines.join('\n')}`
      : '无安全事件趋势数据。';
    return this.toToolResponse(summary, result);
  }

  private async handleSecurityEventsByAgent(args: any) {
    const result = await this.apiClient.securityEventsByAgent(args);
    const d = result?.data || result;
    const agents = d?.agents || [];
    const lines = agents.map((a: any) => {
      const name = a.name || (a.agent_id ? `Agent#${a.agent_id}` : '(无 Agent)');
      return `  • ${name}: 合计 ${a.total} (沙盒违规 ${a.sandbox_violation}/冲突 ${a.conflict}/审计 ${a.audit}, 高危 ${a.CRITICAL}/警告 ${a.WARNING}/普通 ${a.INFO})`;
    });
    const summary = agents.length
      ? `安全事件按 Agent 排行 (前 ${agents.length}):\n${lines.join('\n')}`
      : '无安全事件按 Agent 聚合数据。';
    return this.toToolResponse(summary, result);
  }

  private async handleHealthCheck() {
    const result = await this.apiClient.healthCheck();
    const summary = `Health check complete: ${result?.stale_agents ?? 0} stale agent(s), ${result?.expired_leases ?? 0} expired lease(s), ${result?.escalated_tasks ?? 0} escalated task(s).`;
    return this.toToolResponse(summary, result);
  }

  private async handleBroadcastMessage(args: any) {
    const result = await this.apiClient.broadcastMessage(args);
    const count = result?.recipient_count ?? 0;
    const summary = `Broadcast sent from Agent #${args.agent_id} to ${count} active Agent(s).`;
    return this.toToolResponse(summary, result);
  }

  private async handleCollaborationMetrics(args: any) {
    const result = await this.apiClient.collaborationMetrics(args);
    const t = result?.tasks ?? {};
    const a = result?.agents ?? {};
    const w = result?.workflows ?? {};
    const summary = [
      `Collaboration Metrics (last ${result?.window_days ?? 7} days):`,
      `Tasks: ${t.total} total, ${t.done} done (${t.completion_rate}%), ${t.in_progress} in progress, ${t.blocked} blocked`,
      `Agents: ${a.total} total, ${a.active} active, ${a.utilization_pct}% utilization`,
      `Workflows: ${w.total_runs} runs, ${w.success_rate}% success rate, ${w.running} running`,
      `Handoffs: ${result?.handoffs ?? 0}`,
    ].join('\n');
    return this.toToolResponse(summary, result);
  }

  private async handleListWorkflowTriggers(args: any) {
    const result = await this.apiClient.listWorkflowTriggers(args);
    const items = result?.items ?? [];
    const summary = items.length === 0
      ? 'No workflow triggers found.'
      : `Found ${items.length} trigger(s): ${items.map((t: any) => `"${t.name}" (id=${t.id}, ${t.is_active ? 'active' : 'inactive'}, next: ${t.next_fire_at ?? 'N/A'})`).join('; ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleCreateWorkflowTrigger(args: any) {
    const result = await this.apiClient.createWorkflowTrigger(args);
    const summary = `Created trigger "${args.name}" (id=${result?.id}) for workflow #${args.workflow_id}. Next fire: ${result?.next_fire_at ?? 'N/A'}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleUpdateWorkflowTrigger(args: any) {
    const result = await this.apiClient.updateWorkflowTrigger(args);
    const summary = `Updated trigger #${args.trigger_id}. Active: ${result?.is_active}, Next fire: ${result?.next_fire_at ?? 'N/A'}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleDeleteWorkflowTrigger(args: any) {
    await this.apiClient.deleteWorkflowTrigger(args.trigger_id);
    return this.toToolResponse(`Deleted trigger #${args.trigger_id}.`);
  }

  private async handleFireDueTriggers() {
    const result = await this.apiClient.fireDueTriggers();
    const count = result?.fired_count ?? 0;
    const summary = count === 0
      ? 'No due triggers found.'
      : `Fired ${count} trigger(s): ${result.fired.map((f: any) => `"${f.trigger_name}" → run #${f.workflow_run_id}`).join(', ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleMarkOfflineAgents() {
    const result = await this.apiClient.markOfflineAgents();
    const count = result?.marked_offline ?? 0;
    const summary = count === 0
      ? 'All agents are online. No offline agents detected.'
      : `Marked ${count} agent(s) offline: IDs ${result.agent_ids.join(', ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleTimeoutWorkflowSteps() {
    const result = await this.apiClient.timeoutWorkflowSteps();
    const count = result?.timed_out ?? 0;
    const summary = count === 0
      ? 'No timed-out workflow steps found.'
      : `Timed out ${count} step(s): ${result.steps.map((s: any) => `run #${s.run_id}/${s.step_key} (${s.elapsed_seconds}s > ${s.timeout_seconds}s)`).join(', ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleSendAgentMessage(args: any) {
    const result = await this.apiClient.sendAgentMessage(args);
    const summary = `Message sent from Agent #${args.from_agent_id} to Agent #${args.to_agent_id}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetAgentMessages(args: any) {
    const result = await this.apiClient.getAgentMessages(args);
    const items = result?.items ?? [];
    const summary = items.length === 0
      ? `No messages for Agent #${args.agent_id}.`
      : `${items.length} message(s) for Agent #${args.agent_id}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetAgentCollaborators(args: any) {
    const result = await this.apiClient.getAgentCollaborators(args);
    const d = result?.data || result;
    const collaborators = d?.collaborators || [];
    const totalPartners = d?.total_partners ?? 0;
    const lines = collaborators.map((c: any) =>
      `  • ${c.name} (Agent#${c.agent_id}): 发 ${c.sent} / 收 ${c.received} / 合计 ${c.total}`
    );
    const summary = lines.length
      ? `Agent #${args.agent_id} 协作伙伴 (${totalPartners} 个, 展示前 ${collaborators.length}):\n${lines.join('\n')}`
      : `Agent #${args.agent_id} 暂无协作伙伴。`;
    return this.toToolResponse(summary, result);
  }

  private async handleCollaborationGraph(args: any) {
    const result = await this.apiClient.collaborationGraph(args);
    const d = result?.data || result;
    const nodes = d?.nodes || [];
    const edges = d?.edges || [];
    const totalEdges = d?.total_edges ?? 0;
    const lines = edges.map((e: any) => {
      const fwd = e.source_to_target ?? 0;
      const rev = e.target_to_source ?? 0;
      const dir = fwd && rev
        ? `${e.source}→${e.target}:${fwd} ${e.target}→${e.source}:${rev}`
        : `${e.source}↔${e.target}`;
      return `  • ${dir}: 共 ${e.count} 条`;
    });
    const summary = lines.length
      ? `Agent 协作关系图 (${nodes.length} 节点, ${edges.length} 边, 共 ${totalEdges} 条关系):\n${lines.join('\n')}`
      : '暂无协作关系数据。';
    return this.toToolResponse(summary, result);
  }

  private async handleListChannels(args: any) {
    const result = await this.apiClient.listChannels(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'No channels found.'
      : `${items.length} channel(s): ${items.map((c: any) => `"${c.name}" (${(c.members || []).length} members)`).join(', ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleCreateChannel(args: any) {
    const result = await this.apiClient.createChannel(args);
    const memberCount = (result?.members || []).length;
    return this.toToolResponse(`Channel "${result.name}" created (ID: ${result.id}) with ${memberCount} member(s).`, result);
  }

  private async handleSendChannelMessage(args: any) {
    const result = await this.apiClient.sendChannelMessage(args);
    return this.toToolResponse(`Message sent to channel #${args.channel_id}.`, result);
  }

  private async handleListChannelMessages(args: any) {
    const result = await this.apiClient.listChannelMessages(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? `No messages in channel #${args.channel_id}.`
      : `${items.length} message(s) in channel #${args.channel_id}.`;
    return this.toToolResponse(summary, result);
  }

  private async handleListWorkflowTemplates(args: any) {
    const result = await this.apiClient.listWorkflowTemplates(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'No workflow templates found.'
      : `${items.length} template(s): ${items.map((t: any) => `"${t.name}" (${t.key}, ${t.category}, ${t.step_count} steps)`).join('; ')}`;
    return this.toToolResponse(summary, result);
  }

  private async handleGetWorkflowTemplate(args: any) {
    const result = await this.apiClient.getWorkflowTemplate(args.template_key);
    const summary = `Template "${result.name}" (${result.key}): ${result.step_count} steps — ${result.description}`;
    return this.toToolResponse(summary, result);
  }

  private async handleInstantiateWorkflowTemplate(args: any) {
    const result = await this.apiClient.instantiateWorkflowTemplate(args);
    const summary = `Workflow "${result.name}" (id=${result.id}) created from template "${args.template_key}".`;
    return this.toToolResponse(summary, result);
  }

  private async handlePostTaskEvent(args: any) {
    const event = await this.apiClient.postTaskEvent(args);

    const actor = event.actor_agent?.name || event.actor_user?.email || event.actor_type;
    const summary = `Posted ${event.event_type} to task #${event.task_id} as ${actor} (event #${event.id}).`;

    return this.toToolResponse(summary, event);
  }

  private async handleGetAgentInbox(args: any) {
    const result = await this.apiClient.getAgentInbox(args);

    const count = result.items?.length ?? 0;
    const summary = count === 0
      ? `Inbox for Agent #${args.agent_id} is empty.`
      : `Inbox for Agent #${args.agent_id}: ${count} directed message(s).`;

    return this.toToolResponse(summary, result);
  }

  private async handleHandoffTask(args: any) {
    const result = await this.apiClient.handoffTask(args);

    const from = result.from_assignment?.agent?.name
      || (result.from_assignment ? `Agent #${result.from_assignment.agent_id}` : 'unassigned');
    const to = result.assignment.agent?.name || `Agent #${result.assignment.agent_id}`;
    const summary = `Handed off task #${result.assignment.task_id} from ${from} to ${to} (assignment #${result.assignment.id}, run #${result.run.id}).`;

    return this.toToolResponse(summary, result);
  }

  private async handleDispatchTasks(args: any) {
    const result = await this.apiClient.dispatchTasks(args);

    const coordinator = result.coordinator?.name || `Agent #${args.agent_id}`;
    const lines = result.assignments.map((item) => {
      const to = item.agent?.name || `Agent #${item.assignment.agent_id}`;
      const matchNote = item.score > 0
        ? `score ${item.score} [${item.matched_capabilities.join(', ')}]`
        : item.strategy;
      return `  • task #${item.assignment.task_id} → ${to} (${matchNote}, assignment #${item.assignment.id})`;
    });
    const header = `Coordinator ${coordinator} dispatched ${result.summary.dispatched}/${result.summary.claimable_tasks} claimable task(s) across ${result.summary.available_agents} available Agent(s).`;
    const summary = lines.length ? `${header}\n${lines.join('\n')}` : header;

    return this.toToolResponse(summary, result);
  }

  private async handleClaimAgentTask(args: any) {
    const result = await this.apiClient.claimAgentTask(args);

    return this.toToolResponse(this.summarizeClaim(result), result || { message: 'No claimable task found' });
  }

  private async handleUpdateAgentAssignment(args: any) {
    const result = await this.apiClient.updateAgentAssignment(args);

    return this.toToolResponse(this.summarizeAssignmentUpdate(result), result);
  }

  private async handleUpdateTaskAssignment(args: any) {
    const result = await this.apiClient.updateTaskAssignment(args);

    return this.toToolResponse(this.summarizeAssignmentUpdate(result), result);
  }

  private async handleListCollaborationTemplates(args: any) {
    const params: Record<string, string> = {};
    if (args?.category) params.category = args.category;
    const result = await this.apiClient.listCollaborationTemplates(params);
    const templates = result?.data || result || [];
    const items = Array.isArray(templates) ? templates : [];
    const summary = items.map((t: any) => `• ${t.name} (${t.is_builtin ? '内置' : '自定义'}, ${t.category || '未分类'}): ${t.description || '无描述'}`).join('\n');
    return this.toToolResponse(`协作模板列表 (${items.length}):\n${summary || '无模板'}`, result);
  }

  private async handleCreateCollaborationTemplate(args: any) {
    const result = await this.apiClient.createCollaborationTemplate(args);
    return this.toToolResponse(`协作模板已创建: ${args?.name}`, result);
  }

  private async handleDeleteCollaborationTemplate(args: any) {
    const result = await this.apiClient.deleteCollaborationTemplate(args?.template_id);
    return this.toToolResponse(`协作模板已删除 (ID: ${args?.template_id})`, result);
  }

  private async handleInstantiateCollaborationTemplate(args: any) {
    const result = await this.apiClient.instantiateCollaborationTemplate(args);
    const data = result?.data || result;
    const agentCount = data?.agents?.length || 0;
    const channelId = data?.channel?.id;
    const wfRunId = data?.workflow_run?.id;
    return this.toToolResponse(
      `模板已实例化: ${agentCount} 个 Agent 已创建${channelId ? `, 频道 #${channelId}` : ''}${wfRunId ? `, 工作流运行 #${wfRunId}` : ''}`,
      result
    );
  }

  private async handleListKnowledgeEntries(args: any) {
    const result = await this.apiClient.listKnowledgeEntries(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((e: any) => `• [${e.entry_type || 'insight'}] ${e.title} (${e.domain || '未分类'}, 置信度: ${e.confidence ?? 1.0})`).join('\n');
    return this.toToolResponse(`知识库 (${data?.total || items.length} 条):\n${summary || '暂无知识条目'}`, result);
  }

  private async handleCreateKnowledgeEntry(args: any) {
    const result = await this.apiClient.createKnowledgeEntry(args);
    return this.toToolResponse(`知识条目已创建: ${args?.title}`, result);
  }

  private async handleGetKnowledgeEntry(args: any) {
    const result = await this.apiClient.getKnowledgeEntry(args);
    const data = result?.data || result;
    return this.toToolResponse(`知识条目: ${data?.title || ''}\n${data?.content || ''}`, result);
  }

  private async handleUpdateKnowledgeEntry(args: any) {
    const result = await this.apiClient.updateKnowledgeEntry(args);
    return this.toToolResponse(`知识条目已更新 (ID: ${args?.entry_id})`, result);
  }

  private async handleDeleteKnowledgeEntry(args: any) {
    const result = await this.apiClient.deleteKnowledgeEntry(args);
    return this.toToolResponse(`知识条目已删除 (ID: ${args?.entry_id})`, result);
  }

  private async handleSearchKnowledge(args: any) {
    const result = await this.apiClient.searchKnowledge(args);
    const items = Array.isArray(result?.data || result) ? (result?.data || result) : [];
    const summary = items.map((e: any) => `• [${e.confidence ?? 1.0}] ${e.title}: ${(e.content || '').substring(0, 100)}...`).join('\n');
    return this.toToolResponse(`搜索结果 (${items.length} 条):\n${summary || '无匹配'}`, result);
  }

  private async handleListSharedKnowledge(args: any) {
    const result = await this.apiClient.listSharedKnowledge(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((e: any) => `• ${e.title} (${e.domain || '未分类'}, Agent #${e.agent_id})`).join('\n');
    return this.toToolResponse(`共享知识 (${data?.total || items.length} 条):\n${summary || '暂无共享知识'}`, result);
  }

  private async handleAutoExtractKnowledge(args: any) {
    const result = await this.apiClient.autoExtractKnowledge(args);
    const data = result?.data || result;
    return this.toToolResponse(`自动提取完成: 创建了 ${data?.entries_created || 0} 条知识条目`, result);
  }

  private async handleListWorkflowVersions(args: any) {
    const result = await this.apiClient.listWorkflowVersions(args);
    const data = result?.data || result;
    const current = data?.current_version || '?';
    const versions = data?.versions || [];
    const summary = versions.map((v: any) => `• v${v.version_number}: ${v.change_summary || '无变更说明'} (${v.created_at || ''})`).join('\n');
    return this.toToolResponse(`工作流版本历史 (当前: v${current}):\n${summary || '无版本记录'}`, result);
  }

  private async handleGetWorkflowVersion(args: any) {
    const result = await this.apiClient.getWorkflowVersion(args);
    const data = result?.data || result;
    const steps = data?.steps_snapshot || [];
    return this.toToolResponse(`工作流版本 v${args?.version_number}: ${steps.length} 个步骤`, result);
  }

  private async handleRollbackWorkflow(args: any) {
    const result = await this.apiClient.rollbackWorkflow(args);
    return this.toToolResponse(`工作流已回滚到版本 ${args?.version}`, result);
  }

  private async handleDiffWorkflowVersions(args: any) {
    const result = await this.apiClient.diffWorkflowVersions(args);
    const data = result?.data || result;
    const added = (data?.added_steps || []).join(', ') || '无';
    const removed = (data?.removed_steps || []).join(', ') || '无';
    const modified = (data?.modified_steps || []).join(', ') || '无';
    return this.toToolResponse(`版本差异 v${args?.v1} → v${args?.v2}:\n新增: ${added}\n删除: ${removed}\n修改: ${modified}`, result);
  }

  private async handleListProtocols(args: any) {
    const result = await this.apiClient.listProtocols(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((p: any) => `• [${p.protocol_type}] ${p.title} (${p.status}, 发起者: Agent #${p.initiator_agent_id})`).join('\n');
    return this.toToolResponse(`协作协议 (${data?.total || items.length}):\n${summary || '暂无协议'}`, result);
  }

  private async handleCreateProtocol(args: any) {
    const result = await this.apiClient.createProtocol(args);
    return this.toToolResponse(`协作协议已创建: ${args?.title} (${args?.protocol_type})`, result);
  }

  private async handleGetProtocol(args: any) {
    const result = await this.apiClient.getProtocol(args);
    const data = result?.data || result;
    const msgs = data?.messages || [];
    const msgSummary = msgs.map((m: any) => `  • Agent #${m.agent_id} [${m.message_type}]: ${(m.content || '').substring(0, 80)}`).join('\n');
    return this.toToolResponse(
      `协议: ${data?.title}\n类型: ${data?.protocol_type} | 状态: ${data?.status}\n响应 (${msgs.length}):\n${msgSummary || '  暂无响应'}`,
      result
    );
  }

  private async handleRespondToProtocol(args: any) {
    const result = await this.apiClient.respondToProtocol(args);
    return this.toToolResponse(`已响应协议 #${args?.protocol_id}: ${args?.message_type}`, result);
  }

  private async handleResolveProtocol(args: any) {
    const result = await this.apiClient.resolveProtocol(args);
    return this.toToolResponse(`协议 #${args?.protocol_id} 已${args?.resolution}`, result);
  }

  private async handleGetAgentReputation(args: any) {
    const result = await this.apiClient.getAgentReputation(args);
    const data = result?.data || result;
    return this.toToolResponse(
      `Agent #${args?.agent_id} 声誉: ${data?.score?.toFixed(1) || '50.0'} (${data?.completed_tasks || 0} 完成, ${data?.failed_tasks || 0} 失败, 成功率: ${data?.success_rate?.toFixed(1) || '0'}%)`,
      result
    );
  }

  private async handleListReputations() {
    const result = await this.apiClient.listReputations();
    const items = Array.isArray(result?.data || result) ? (result?.data || result) : [];
    const summary = items.map((r: any) => `• Agent #${r.agent_id}: ${r.score?.toFixed(1) || '50.0'} (${r.completed_tasks || 0}/${r.total_tasks || 0} 完成)`).join('\n');
    return this.toToolResponse(`声誉排行:\n${summary || '暂无数据'}`, result);
  }

  private async handleRecalculateReputation(args: any) {
    const result = await this.apiClient.recalculateReputation(args);
    const data = result?.data || result;
    return this.toToolResponse(`Agent #${args?.agent_id} 声誉已重新计算: ${data?.score?.toFixed(1) || '50.0'}`, result);
  }

  private async handleGetAgentReputationHistory(args: any) {
    const result = await this.apiClient.getAgentReputationHistory(args);
    const data = result?.data || result;
    const points = Array.isArray(data?.points) ? data.points : [];
    const summary = points.slice(-10).map((p: any) => {
      const delta = typeof p.score_delta === 'number' ? (p.score_delta >= 0 ? `+${p.score_delta}` : `${p.score_delta}`) : '?';
      const when = p.at ? String(p.at).slice(0, 19).replace('T', ' ') : '?';
      const ctx = [
        p.step_key ? `步骤${p.step_key}` : null,
        p.task_id ? `任务#${p.task_id}` : null,
        p.workflow_run_id ? `工作流#${p.workflow_run_id}` : null,
      ].filter(Boolean).join(' ');
      return `• ${when}: ${p.success ? '成功' : '失败'} ${delta} → ${typeof p.new_score === 'number' ? p.new_score.toFixed(1) : '?'}${ctx ? ` (${ctx})` : ''}`;
    }).join('\n');
    return this.toToolResponse(
      `Agent #${args?.agent_id} 声誉历史 (当前 ${typeof data?.current_score === 'number' ? data.current_score.toFixed(1) : '?'}, 共 ${points.length} 个变化点):\n${summary || '暂无声誉变化记录'}`,
      result
    );
  }

  private async handleListAgentExperiences(args: any) {
    const params: Record<string, string> = {};
    if (args?.experience_type) params.experience_type = args.experience_type;
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    if (args?.is_shared) params.is_shared = args.is_shared;
    const result = await this.apiClient.listAgentExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = data?.experiences || data?.items || [];
    return this.toToolResponse(
      `Agent #${args?.agent_id} 经验列表: ${items.length} 条经验\n${items.map((e: any) => `- [${e.experience_type}] ${e.domain || '无域'}: ${e.strategy?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  }

  private async handleCreateAgentExperience(args: any) {
    const result = await this.apiClient.createAgentExperience(args?.agent_id, {
      experience_type: args?.experience_type,
      domain: args?.domain,
      task_type: args?.task_type,
      capabilities_used: args?.capabilities_used,
      strategy: args?.strategy,
      outcome_pattern: args?.outcome_pattern,
      key_learnings: args?.key_learnings,
      confidence: args?.confidence,
      is_shared: args?.is_shared,
    });
    const data = result?.data || result;
    return this.toToolResponse(`经验已创建: #${data?.id} [${data?.experience_type}] ${data?.domain || ''}`, result);
  }

  private async handleGetAgentExperience(args: any) {
    const result = await this.apiClient.getAgentExperience(args?.agent_id, args?.experience_id);
    const data = result?.data || result;
    return this.toToolResponse(
      `经验 #${data?.id}: [${data?.experience_type}] ${data?.domain || '无域'}\n策略: ${data?.strategy}\n结果模式: ${data?.outcome_pattern}\n关键学习: ${data?.key_learnings}\n置信度: ${data?.confidence}`,
      result,
    );
  }

  private async handleUpdateAgentExperience(args: any) {
    const updateData: Record<string, any> = {};
    if (args?.strategy !== undefined) updateData.strategy = args.strategy;
    if (args?.outcome_pattern !== undefined) updateData.outcome_pattern = args.outcome_pattern;
    if (args?.key_learnings !== undefined) updateData.key_learnings = args.key_learnings;
    if (args?.confidence !== undefined) updateData.confidence = args.confidence;
    if (args?.is_shared !== undefined) updateData.is_shared = args.is_shared;
    if (args?.is_valid !== undefined) updateData.is_valid = args.is_valid;
    const result = await this.apiClient.updateAgentExperience(args?.agent_id, args?.experience_id, updateData);
    const data = result?.data || result;
    return this.toToolResponse(`经验 #${args?.experience_id} 已更新`, result);
  }

  private async handleDeleteAgentExperience(args: any) {
    const result = await this.apiClient.deleteAgentExperience(args?.agent_id, args?.experience_id);
    return this.toToolResponse(`经验 #${args?.experience_id} 已删除`, result);
  }

  private async handleRecommendExperiences(args: any) {
    const params: Record<string, string> = {};
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    if (args?.capabilities) params.capabilities = args.capabilities;
    const result = await this.apiClient.recommendExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(
      `Agent #${args?.agent_id} 推荐经验: ${items.length} 条\n${items.map((e: any) => `- [${e.experience_type}] ${e.domain || '无域'}: ${e.key_learnings?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  }

  private async handleGetExperiencesStats(args: any) {
    const result = await this.apiClient.getExperiencesStats();
    const data = result?.data || result || {};
    const total = data.total ?? 0;
    const byDomain = data.by_domain || {};
    const byTaskType = data.by_task_type || {};
    const byType = data.by_experience_type || {};
    const domainEntries = Object.entries(byDomain).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
    const taskEntries = Object.entries(byTaskType).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
    const typeEntries = Object.entries(byType);
    const bucketEntries = Object.entries(data.by_confidence_bucket || {});
    const topReused = data.top_reused || [];
    const matrix = data.by_domain_tasktype || {};
    const matrixSummary = Object.entries(matrix).slice(0, 5).map(([d, tasks]: any) => `${d}:{${Object.entries(tasks).map(([t, c]: any) => `${t}=${c}`).join(',')}}`).join('; ');
    return this.toToolResponse(
      `经验库统计: 共 ${total} 条有效经验\n` +
        `按经验类型: ${typeEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按域(top8): ${domainEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按任务类型(top8): ${taskEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `置信度分布: ${bucketEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `共享: ${data.shared ?? 0} 条, 累计复用: ${data.total_reuses ?? 0} 次, 平均置信度: ${data.avg_confidence ?? 0}\n` +
        `复用最多(top5): ${topReused.slice(0, 5).map((e: any) => `#${e.id} ${e.domain}/${e.experience_type}(${e.times_reused}次,置信${e.confidence})`).join('; ') || '无'}\n` +
        `域×任务类型矩阵(top5域): ${matrixSummary || '无'}`,
      result,
    );
  }

  private async handleGetExperiencesLowConfidence(args: any) {
    const maxConfidence = typeof args?.max_confidence === 'number' ? args.max_confidence : 0.5;
    const limit = typeof args?.limit === 'number' ? args.limit : 20;
    const result = await this.apiClient.getExperiencesLowConfidence(maxConfidence, limit);
    const data = result?.data || result || {};
    const maxConf = data.max_confidence ?? maxConfidence;
    const items = data.items || [];
    const lines = items.map((e: any, i: number) =>
      `${i + 1}. #${e.id} agent=${e.agent_id} ${e.domain}/${e.task_type}/${e.experience_type} 置信度=${e.confidence} 复用=${e.times_reused}次 ${e.key_learnings ? `摘要:${e.key_learnings}` : '无摘要'}`,
    );
    return this.toToolResponse(
      `低置信度经验清单(置信度<${maxConf}): 共 ${items.length} 条\n` +
        (lines.length ? lines.join('\n') : '暂无低置信度经验'),
      result,
    );
  }

  private async handleGetTaskStats(args: any) {
    const result = await this.apiClient.getTaskStats();
    const data = result?.data || result || {};
    const total = data.total ?? 0;
    const byStatus = data.by_status || {};
    const byPriority = data.by_priority || {};
    const buckets = data.lifecycle_buckets || {};
    const statusEntries = Object.entries(byStatus);
    const priorityEntries = Object.entries(byPriority);
    const bucketEntries = Object.entries(buckets);
    return this.toToolResponse(
      `任务生命周期统计: 共 ${total} 个任务\n` +
        `完成率: ${data.completion_rate ?? 0}%, 取消率: ${data.cancellation_rate ?? 0}% (完成 ${data.done_count ?? 0}, 取消 ${data.cancelled_count ?? 0})\n` +
        `按状态: ${statusEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按优先级: ${priorityEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `平均完成率: ${data.avg_completion_rate ?? 0}%, 已完成任务平均生命周期: ${data.avg_lifecycle_hours ?? '—'} 小时\n` +
        `生命周期分布(已完成): ${bucketEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `逾期: ${data.overdue_count ?? 0} 个 (有截止日 ${data.with_due_date ?? 0} 个, 逾期率 ${data.overdue_rate ?? 0}%)\n` +
        `按项目(top10): ${(data.by_project || []).map((p: any) => `${p.name}=${p.count}`).join(', ') || '无'}\n` +
        `优先级×状态矩阵: ${Object.entries(data.by_priority_status || {}).map(([p, sts]: any) => `${p}:{${Object.entries(sts).map(([s, c]: any) => `${s}=${c}`).join(',')}}`).join('; ') || '无'}`,
      result,
    );
  }

  private async handleGetWorkflowFailureCorrelation(args: any) {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await this.apiClient.getWorkflowFailureCorrelation(days, windowHours);
    const data = result?.data || result || {};
    const total = data.total_failed_steps ?? 0;
    const top = data.top_agents || [];
    return this.toToolResponse(
      `失败步骤跨维度关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h窗口):\n` +
        `失败步骤总数: ${total}\n` +
        `伴随冲突: ${data.with_conflict ?? 0} (${data.conflict_rate ?? 0}%)\n` +
        `伴随沙盒违规: ${data.with_violation ?? 0} (${data.violation_rate ?? 0}%)\n` +
        `同时伴随两者: ${data.with_both ?? 0} (${data.both_rate ?? 0}%)\n` +
        `关联最多的 Agent(top8): ${top.map((a: any) => `${a.name}#${a.agent_id}(失败${a.failed_steps}/冲突${a.with_conflict}/违规${a.with_violation})`).join(', ') || '无'}`,
      result,
    );
  }

  private async handleGetWorkflowFailureCorrelationByStep(args: any) {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await this.apiClient.getWorkflowFailureCorrelationByStep(days, windowHours);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `按步骤的失败关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h):\n` +
        `${items.map((it: any) => `- ${it.step_key}: 失败${it.failed} 冲突${it.with_conflict}(${it.conflict_rate}%) 违规${it.with_violation}(${it.violation_rate}%)${Object.keys(it.conflict_types || {}).length ? ` 类型[${Object.entries(it.conflict_types).map(([t, c]: any) => `${t}=${c}`).join(', ')}]` : ''}`).join('\n') || '无失败步骤'}`,
      result,
    );
  }

  private async handleGetAgentProductivity(args: any) {
    const days = args?.days ?? 30;
    const limit = args?.limit ?? 20;
    const result = await this.apiClient.getAgentProductivity(days, limit);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `Agent 产出效率(近${data.days ?? days}天):\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 分配${a.total} 完成${a.done}(率${a.completion_rate}%) 失败${a.failed} 取消${a.cancelled} 过期${a.expired} 进行中${a.in_progress} 平均完成${a.avg_completion_hours ?? '—'}h`).join('\n') || '无分配'}`,
      result,
    );
  }

  private async handleGetAgentProductivityTrend(args: any) {
    const days = args?.days ?? 30;
    const result = await this.apiClient.getAgentProductivityTrend(days);
    const data = result?.data || result || {};
    const trend = data.trend || [];
    return this.toToolResponse(
      `Agent 产出趋势(近${data.days ?? days}天): 累计完成 ${data.total_done ?? 0}, 失败 ${data.total_failed ?? 0}\n` +
        `${trend.map((b: any) => `${b.date}: 完成${b.done} 失败${b.failed}`).join('\n') || '无数据'}`,
      result,
    );
  }

  private async handleGetAgentProductivityAlerts(args: any) {
    const params: any = {};
    if (args?.days != null) params.days = args.days;
    if (args?.min_completion_rate != null) params.min_completion_rate = args.min_completion_rate;
    if (args?.max_failure_rate != null) params.max_failure_rate = args.max_failure_rate;
    if (args?.min_assignments != null) params.min_assignments = args.min_assignments;
    const result = await this.apiClient.getAgentProductivityAlerts(params);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `低效率 Agent 预警(近${data.days ?? 30}天, 完成率<${data.min_completion_rate ?? 50}% 或 失败率>${data.max_failure_rate ?? 30}%, 最少${data.min_assignments ?? 3}次分配): ${items.length} 个\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 分配${a.total} 完成${a.done}(率${a.completion_rate}%) 失败${a.failed}(率${a.failure_rate}%) 原因[${(a.reasons || []).join('; ')}]`).join('\n') || '无预警'}`,
      result,
    );
  }

  private async handleGetAgentProductivityByKind(args: any) {
    const days = args?.days ?? 30;
    const result = await this.apiClient.getAgentProductivityByKind(days);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `按 Agent kind 产出效率对比(近${data.days ?? days}天): ${items.length} 类\n` +
        `${items.map((k: any) => `- ${k.kind}: Agent数${k.agent_count} 分配${k.total} 完成${k.done}(率${k.completion_rate}%) 失败${k.failed}(率${k.failure_rate}%) 平均完成${k.avg_completion_hours ?? 'N/A'}h`).join('\n') || '无数据'}`,
      result,
    );
  }

  private async handleGetConflictsSandboxCorrelation(args: any) {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await this.apiClient.getConflictsSandboxCorrelation(days, windowHours);
    const data = result?.data || result || {};
    const total = data.total_conflicts ?? 0;
    const byType = data.by_conflict_type || {};
    const top = data.top_agents || [];
    const typeEntries = Object.entries(byType);
    return this.toToolResponse(
      `冲突↔沙盒违规关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h):\n` +
        `冲突总数: ${total}, 伴随沙盒违规: ${data.with_violation ?? 0} (${data.violation_rate ?? 0}%)\n` +
        `按冲突类型: ${typeEntries.map(([k, v]: any) => `${k}=${v.with_violation}/${v.total}(${v.rate}%)`).join(', ') || '无'}\n` +
        `关联最多的 Agent(top8): ${top.map((a: any) => `${a.name}#${a.agent_id}(冲突${a.conflicts}/伴随违规${a.with_violation})`).join(', ') || '无'}`,
      result,
    );
  }

  private async handleGetAgentHealth(args: any) {
    const days = args?.days ?? 30;
    const result = await this.apiClient.getAgentHealth(days);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `Agent 综合健康度(近${data.days ?? days}天, 声誉0.4+完成0.3+冲突0.15+违规0.15):\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}[${a.status ?? '?'}]: 健康${a.health_score} (声誉${a.sub_scores.reputation}/完成${a.sub_scores.completion}/冲突${a.sub_scores.conflict}/违规${a.sub_scores.violation}; 完成率${a.completion_rate ?? '—'}% 冲突${a.conflicts} 违规${a.sandbox_violations})`).join('\n') || '无 Agent'}`,
      result,
    );
  }

  private async handleGetAgentHealthTrend(args: any) {
    const days = args?.days ?? 30;
    const result = await this.apiClient.getAgentHealthTrend(days);
    const data = result?.data || result || {};
    const trend = data.trend || [];
    return this.toToolResponse(
      `Agent 健康度趋势(近${data.days ?? days}天): 累计正向 ${data.total_positive ?? 0}, 负向 ${data.total_negative ?? 0}, 冲突 ${data.total_conflicts ?? 0}, 违规 ${data.total_violations ?? 0}\n` +
        `${trend.map((b: any) => `${b.date}: 平均声誉${b.avg_reputation ?? '—'} 正向${b.positive} 负向${b.negative} 冲突${b.conflicts ?? 0} 违规${b.sandbox_violations ?? 0}`).join('\n') || '无数据'}`,
      result,
    );
  }

  private async handleGetAgentHealthAlerts(args: any) {
    const params: any = {};
    if (args?.days != null) params.days = args.days;
    if (args?.min_health_score != null) params.min_health_score = args.min_health_score;
    if (args?.w_reputation != null) params.w_reputation = args.w_reputation;
    if (args?.w_completion != null) params.w_completion = args.w_completion;
    if (args?.w_conflict != null) params.w_conflict = args.w_conflict;
    if (args?.w_violation != null) params.w_violation = args.w_violation;
    const result = await this.apiClient.getAgentHealthAlerts(params);
    const data = result?.data || result || {};
    const items = data.items || [];
    return this.toToolResponse(
      `低健康 Agent 预警(近${data.days ?? 30}天, 健康分<${data.min_health_score ?? 60}): ${items.length} 个\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 健康${a.health_score} (声誉${a.sub_scores.reputation}/完成${a.sub_scores.completion}/冲突${a.sub_scores.conflict}/违规${a.sub_scores.violation}; 原因[${(a.reasons || []).join('; ')}])\n  建议: ${(a.recommendations || []).join(' | ') || '暂无'}`).join('\n') || '无预警'}`,
      result,
    );
  }

  private async handleShareAgentExperience(args: any) {
    const result = await this.apiClient.shareAgentExperience(args?.agent_id, args?.experience_id);
    return this.toToolResponse(`经验 #${args?.experience_id} 已分享给同域其他 Agent`, result);
  }

  private async handleLearnFromExperience(args: any) {
    const result = await this.apiClient.learnFromExperience(args?.agent_id, args?.experience_id);
    const data = result?.data || result;
    return this.toToolResponse(`Agent #${args?.agent_id} 已学习经验 #${args?.experience_id}，内化为经验 #${data?.id}`, result);
  }

  private async handleListSharedExperiences(args: any) {
    const params: Record<string, string> = {};
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    const result = await this.apiClient.listSharedExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = data?.experiences || data?.items || [];
    return this.toToolResponse(
      `Agent #${args?.agent_id} 可学习的共享经验: ${items.length} 条\n${items.map((e: any) => `- [${e.experience_type}] Agent#${e.agent_id}: ${e.key_learnings?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  }

  private async handleAutoExtractExperiences(args: any) {
    const result = await this.apiClient.autoExtractExperiences(args?.agent_id);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(`Agent #${args?.agent_id} 自动提取了 ${items.length} 条经验`, result);
  }

  private async handleAuthorizeCrossProjectAgent(args: any) {
    const result = await this.apiClient.authorizeCrossProjectAgent({
      agent_id: args?.agent_id,
      project_id: args?.project_id,
      role_in_project: args?.role_in_project,
      capabilities_override: args?.capabilities_override,
      max_concurrent_tasks: args?.max_concurrent_tasks,
    });
    const data = result?.data || result;
    return this.toToolResponse(`Agent #${args?.agent_id} 已授权访问项目 #${args?.project_id}，角色: ${data?.role_in_project || 'contributor'}`, result);
  }

  private async handleRevokeCrossProjectAgent(args: any) {
    const result = await this.apiClient.revokeCrossProjectAgent(args?.agent_id, args?.project_id);
    return this.toToolResponse(`Agent #${args?.agent_id} 的项目 #${args?.project_id} 跨项目授权已撤销`, result);
  }

  private async handleListAgentCrossProjects(args: any) {
    const result = await this.apiClient.listAgentCrossProjects(args?.agent_id);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(
      `Agent #${args?.agent_id} 已授权访问 ${items.length} 个项目\n${items.map((a: any) => `- 项目 #${a.project_id} (${a.project_name || ''}) 角色: ${a.role_in_project}`).join('\n')}`,
      result,
    );
  }

  private async handleListProjectExternalAgents(args: any) {
    const result = await this.apiClient.listProjectExternalAgents(args?.project_id);
    const data = result?.data || result;
    const items = data?.agents || data?.items || (Array.isArray(data) ? data : []);
    return this.toToolResponse(
      `项目 #${args?.project_id} 有 ${items.length} 个外部 Agent\n${items.map((a: any) => `- Agent #${a.agent_id} (${a.agent_name || ''}) 角色: ${a.role_in_project}`).join('\n')}`,
      result,
    );
  }

  private async handleDiscoverCrossProjectAgents(args: any) {
    const params: Record<string, string> = {};
    if (args?.capability) params.capability = args.capability;
    const result = await this.apiClient.discoverCrossProjectAgents(params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(
      `发现 ${items.length} 个跨项目 Agent\n${items.map((a: any) => `- Agent #${a.agent_id} (${a.agent_name || ''}) 来源: ${a.source}, 项目: ${a.available_projects?.join(', ')}`).join('\n')}`,
      result,
    );
  }

  private async handleFindCapableAgentsCrossProject(args: any) {
    const params: Record<string, string> = { capabilities: args?.capabilities };
    if (args?.project_id) params.project_id = String(args.project_id);
    const result = await this.apiClient.findCapableAgentsCrossProject(params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(
      `找到 ${items.length} 个具备能力的 Agent\n${items.map((a: any) => `- ${a.agent_name} (匹配: ${a.matched_capabilities?.join(', ')}) 来源: ${a.source}, 得分: ${a.match_score}`).join('\n')}`,
      result,
    );
  }

  private async handleApplyExperienceDecay(args: any) {
    const result = await this.apiClient.applyExperienceDecay(args?.agent_id, {
      days_threshold: args?.days_threshold,
      decay_rate: args?.decay_rate,
    });
    const data = result?.data || result;
    return this.toToolResponse(`Agent #${args?.agent_id} 经验衰减完成，影响了 ${data?.decayed_count || 0} 条经验`, result);
  }

  private async handleValidateExperience(args: any) {
    const result = await this.apiClient.validateExperience(args?.agent_id, args?.experience_id, {
      is_accurate: args?.is_accurate,
    });
    const data = result?.data || result;
    return this.toToolResponse(
      `经验 #${args?.experience_id} 已被 Agent #${args?.agent_id} ${args?.is_accurate ? '验证通过' : '反驳'}，新置信度: ${data?.confidence}`,
      result,
    );
  }

  private async handleGetExperienceValidationStats(args: any) {
    const result = await this.apiClient.getExperienceValidationStats(args?.agent_id);
    const data = result?.data || result;
    return this.toToolResponse(
      `Agent #${args?.agent_id} 经验统计: 总计 ${data?.total_experiences || 0}, 已共享 ${data?.shared_experiences || 0}, 高置信度 ${data?.high_confidence || 0}, 低置信度 ${data?.low_confidence || 0}, 平均置信度 ${data?.average_confidence || 0}`,
      result,
    );
  }

  private async handleDecayAllExperiences(args: any) {
    const result = await this.apiClient.decayAllExperiences({
      days_threshold: args?.days_threshold,
      decay_rate: args?.decay_rate,
    });
    const data = result?.data || result;
    return this.toToolResponse(`全量经验衰减完成，影响了 ${data?.decayed_count || 0} 条经验`, result);
  }

  private async handleSuggestCapabilityAdaptation(args: any) {
    const result = await this.apiClient.suggestCapabilityAdaptation(args?.agent_id);
    const data = result?.data || result;
    const additions = Object.keys(data?.suggested_additions || {});
    const removals = Object.keys(data?.suggested_removals || {});
    return this.toToolResponse(
      `Agent #${args?.agent_id} 能力自适应建议:\n建议添加: ${additions.length > 0 ? additions.join(', ') : '无'}\n建议移除: ${removals.length > 0 ? removals.join(', ') : '无'}\n当前能力: ${(data?.current_capabilities || []).join(', ')}`,
      result,
    );
  }

  private async handleApplyCapabilityAdaptation(args: any) {
    const result = await this.apiClient.applyCapabilityAdaptation(args?.agent_id, {
      additions: args?.additions,
      removals: args?.removals,
    });
    const data = result?.data || result;
    return this.toToolResponse(
      `Agent #${args?.agent_id} 能力已调整: 添加 ${data?.additions_applied?.join(', ') || '无'}, 移除 ${data?.removals_applied?.join(', ') || '无'}\n新能力: ${(data?.new_capabilities || []).join(', ')}`,
      result,
    );
  }

  private async handleFindCrossProjectTasks(args: any) {
    const params: Record<string, string> = {};
    if (args?.limit) params.limit = String(args.limit);
    const result = await this.apiClient.findCrossProjectTasks(args?.agent_id, params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return this.toToolResponse(
      `Agent #${args?.agent_id} 跨项目可领取任务: ${items.length} 个\n${items.map((t: any) => `- [${t.match?.score || 0}分] ${t.task?.title} (项目: ${t.project?.name}, 角色: ${t.role_in_project})`).join('\n')}`,
      result,
    );
  }

  private async handleClaimCrossProjectTask(args: any) {
    const result = await this.apiClient.claimCrossProjectTask(args?.agent_id, args?.task_id, {
      lease_seconds: args?.lease_seconds,
    });
    const data = result?.data || result;
    return this.toToolResponse(
      `Agent #${args?.agent_id} 已领取跨项目任务 #${args?.task_id} (任务: ${data?.task?.title || ''})`,
      result,
    );
  }

  private async handleGetProtocolAnalytics(args: any) {
    const params: Record<string, string> = {};
    if (args?.days) params.days = String(args.days);
    const result = await this.apiClient.getProtocolAnalytics(params);
    const data = result?.data || result;
    const byType = data?.by_type || {};
    const byStatus = data?.by_status || {};
    return this.toToolResponse(
      `协议分析 (近 ${data?.window_days || 30} 天):\n` +
      `总协议数: ${data?.total_protocols || 0}, 解决率: ${data?.resolution_rate || 0}%\n` +
      `按类型: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `平均消息数: ${data?.avg_messages_per_protocol || 0}`,
      result,
    );
  }

  private async handleAddDeliberationMessage(args: any) {
    const result = await this.apiClient.addDeliberationMessage(args?.protocol_id, {
      agent_id: args?.agent_id,
      message_type: args?.message_type,
      content: args?.content,
    });
    return this.toToolResponse(
      `已向协议 #${args?.protocol_id} 添加 ${args?.message_type} 消息`,
      result,
    );
  }

  // ---- Increment 85: Agent collaboration sandbox handlers ----

  private async handleListSandboxes(args: any) {
    const params: Record<string, string> = {};
    if (args?.agent_id) params.agent_id = String(args.agent_id);
    if (args?.active_only) params.active_only = 'true';
    params.include_stats = args?.include_stats === false ? 'false' : 'true';
    const result = await this.apiClient.listSandboxes(params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return this.toToolResponse(
      `沙盒策略列表 (共 ${total} 个):\n` +
      items.map((s: any) => `• #${s.id} ${s.name} [${s.security_level}] agent=${s.agent_id || '未绑定'} 执行=${s.stats?.total_executions || 0} 违规=${s.stats?.violations || 0} ${s.is_active ? '活跃' : '停用'}`).join('\n'),
      result,
    );
  }

  private async handleCreateSandbox(args: any) {
    const payload: Record<string, any> = {
      name: args?.name,
      security_level: args?.security_level || 'moderate',
    };
    for (const k of ['description', 'agent_id', 'allowed_tools', 'blocked_tools', 'allowed_network_hosts', 'fs_write_paths', 'fs_read_paths', 'max_memory_mb', 'max_cpu_seconds', 'max_output_tokens', 'timeout_seconds']) {
      if (args?.[k] !== undefined) payload[k] = args[k];
    }
    const result = await this.apiClient.createSandbox(payload);
    const s = result?.data?.sandbox || result?.data || result;
    return this.toToolResponse(`已创建沙盒策略 #${s?.id} "${s?.name}" [${s?.security_level}]`, result);
  }

  private async handleGetSandbox(args: any) {
    const result = await this.apiClient.getSandbox(args?.sandbox_id);
    const s = result?.data?.sandbox || result?.data || result;
    return this.toToolResponse(
      `沙盒 #${s?.id} "${s?.name}" [${s?.security_level}]\n` +
      `工具允许: ${(s?.allowed_tools || []).join(', ') || '无'}\n` +
      `工具禁止: ${(s?.blocked_tools || []).join(', ') || '无'}\n` +
      `网络允许: ${(s?.allowed_network_hosts || []).join(', ') || '无'}\n` +
      `写入路径: ${(s?.fs_write_paths || []).join(', ') || '无'}\n` +
      `超时: ${s?.timeout_seconds || 0}s, 内存: ${s?.max_memory_mb || 0}MB, CPU: ${s?.max_cpu_seconds || 0}s, 输出Token: ${s?.max_output_tokens || 0}`,
      result,
    );
  }

  private async handleUpdateSandbox(args: any) {
    const { sandbox_id, ...rest } = args || {};
    const result = await this.apiClient.updateSandbox(sandbox_id, rest);
    return this.toToolResponse(`已更新沙盒策略 #${sandbox_id}`, result);
  }

  private async handleDeleteSandbox(args: any) {
    const result = await this.apiClient.deleteSandbox(args?.sandbox_id);
    return this.toToolResponse(`已删除沙盒策略 #${args?.sandbox_id}`, result);
  }

  private async handleBindAgentSandbox(args: any) {
    const result = await this.apiClient.bindAgentSandbox(args?.agent_id, { sandbox_id: args?.sandbox_id });
    return this.toToolResponse(`已将沙盒 #${args?.sandbox_id} 绑定到 Agent #${args?.agent_id}`, result);
  }

  private async handleGetAgentSandbox(args: any) {
    const result = await this.apiClient.getAgentSandbox(args?.agent_id);
    const s = result?.data?.sandbox;
    if (!s) return this.toToolResponse(`Agent #${args?.agent_id} 未绑定沙盒策略`, result);
    return this.toToolResponse(`Agent #${args?.agent_id} 绑定沙盒 #${s.id} "${s.name}" [${s.security_level}]`, result);
  }

  private async handleCheckSandboxAction(args: any) {
    const result = await this.apiClient.checkSandboxAction(args?.sandbox_id, {
      action: args?.action,
      target: args?.target,
    });
    const d = result?.data || result;
    return this.toToolResponse(
      `沙盒 #${args?.sandbox_id} 检查 ${d?.action} "${d?.target}": ${d?.allowed ? '允许' : '拒绝'}${d?.reason ? ' — ' + d.reason : ''}`,
      result,
    );
  }

  private async handleStartSandboxExecution(args: any) {
    const payload: Record<string, any> = { agent_id: args?.agent_id };
    if (args?.run_id) payload.run_id = args.run_id;
    if (args?.step_run_id) payload.step_run_id = args.step_run_id;
    const result = await this.apiClient.startSandboxExecution(args?.sandbox_id, payload);
    const e = result?.data?.execution || result?.data || result;
    return this.toToolResponse(
      `已启动沙盒执行 #${e?.id} (沙盒 #${args?.sandbox_id}, Agent #${args?.agent_id})\n策略快照已冻结，状态: ${e?.status}`,
      result,
    );
  }

  private async handleCompleteSandboxExecution(args: any) {
    const { execution_id, ...rest } = args || {};
    const result = await this.apiClient.completeSandboxExecution(execution_id, rest);
    const e = result?.data?.execution || result?.data || result;
    return this.toToolResponse(
      `沙盒执行 #${execution_id} 已完成 (状态: ${e?.status}, 工具调用: ${e?.tool_calls || 0}, 网络调用: ${e?.network_calls || 0})`,
      result,
    );
  }

  private async handleRevokeSandboxExecution(args: any) {
    const result = await this.apiClient.revokeSandboxExecution(args?.execution_id);
    return this.toToolResponse(`已吊销沙盒执行 #${args?.execution_id}`, result);
  }

  private async handleReportSandboxViolation(args: any) {
    const payload: Record<string, any> = { violation_type: args?.violation_type };
    if (args?.attempted_action) payload.attempted_action = args.attempted_action;
    if (args?.detail) payload.detail = args.detail;
    if (args?.terminate !== undefined) payload.terminate = args.terminate;
    const result = await this.apiClient.reportSandboxViolation(args?.execution_id, payload);
    const v = result?.data?.violation || result?.data || result;
    return this.toToolResponse(
      `已记录沙盒违规 (执行 #${args?.execution_id}, 类型: ${v?.violation_type})${args?.terminate ? ' — 执行已终止' : ''}`,
      result,
    );
  }

  private async handleGetSandboxExecution(args: any) {
    const result = await this.apiClient.getSandboxExecution(args?.execution_id);
    const e = result?.data?.execution || result?.data || result;
    const violations = e?.violations || [];
    return this.toToolResponse(
      `沙盒执行 #${e?.id} 状态: ${e?.status}\n` +
      `工具调用: ${e?.tool_calls || 0}, 网络调用: ${e?.network_calls || 0}, 内存峰值: ${e?.peak_memory_mb || 0}MB\n` +
      `违规记录 (${violations.length} 条):\n` +
      (violations.length ? violations.map((v: any) => `  • [${v.violation_type}] ${v.attempted_action || ''} — ${v.detail || ''}`).join('\n') : '  无'),
      result,
    );
  }

  private async handleListSandboxExecutions(args: any) {
    const params: Record<string, string> = {};
    if (args?.status) params.status = args.status;
    if (args?.agent_id) params.agent_id = String(args.agent_id);
    const result = await this.apiClient.listSandboxExecutions(args?.sandbox_id, params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return this.toToolResponse(
      `沙盒执行列表 (共 ${total} 条):\n` +
      items.map((e: any) => `• #${e.id} Agent#${e.agent_id} ${e.status} 调用=${e.tool_calls || 0} 起=${e.started_at || ''}${e.ended_at ? ' 止=' + e.ended_at : ''}`).join('\n'),
      result,
    );
  }

  private async handleGetSandboxDashboard(args: any) {
    const result = await this.apiClient.getSandboxDashboard();
    const d = result?.data || result;
    const byLevel = d?.by_level || {};
    const byStatus = d?.by_status || {};
    return this.toToolResponse(
      `沙盒仪表盘:\n` +
      `沙盒总数: ${d?.total_sandboxes || 0}, 执行总数: ${d?.total_executions || 0}, 运行中: ${d?.running_executions || 0}, 违规总数: ${d?.total_violations || 0}\n` +
      `按级别: ${Object.entries(byLevel).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      result,
    );
  }

  private async handleGetSandboxViolationTrend(args: any) {
    const result = await this.apiClient.getSandboxViolationTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const total = trend.reduce((s: number, t: any) => s + (t.count || 0), 0);
    const byType = d?.by_type || {};
    const typeLine = Object.entries(byType).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ');
    const recent = trend.slice(-7).map((t: any) => `• ${t.date}: ${t.count}`).join('\n');
    return this.toToolResponse(
      `沙盒违规趋势 (近 ${d?.days || 30} 天): 累计 ${total}\n${recent || '暂无数据'}\n按类型: ${typeLine || '无'}`,
      result,
    );
  }

  private async handleGetSandboxViolationsByAgent(args: any) {
    const result = await this.apiClient.getSandboxViolationsByAgent(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.name || 'Agent'} #${it.agent_id} [${it.kind || '?'}]: ${it.total} 次`)
      .join('\n');
    return this.toToolResponse(`沙盒违规按 Agent (近 ${d?.days || 30} 天, top ${items.length}):\n${summary || '暂无违规'}`, result);
  }

  private async handleGetSandboxTemplateUsage(args: any) {
    const result = await this.apiClient.getSandboxTemplateUsage();
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.template_key}: ${it.uses} 次 (绑定 Agent ${it.bound_to_agent})`)
      .join('\n');
    return this.toToolResponse(`沙盒模板使用统计:\n${summary || '暂无实例化记录'}`, result);
  }

  private async handleGetStepSandboxExecution(args: any) {
    const result = await this.apiClient.getStepSandboxExecution(args?.run_id, args?.step_key);
    const e = result?.data?.execution;
    if (!e) return this.toToolResponse(`工作流运行 #${args?.run_id} 步骤 "${args?.step_key}" 无沙盒执行`, result);
    const violations = e.violations || [];
    return this.toToolResponse(
      `步骤 "${args?.step_key}" 沙盒执行 #${e.id} 状态: ${e.status}\n` +
      `工具调用: ${e.tool_calls || 0}, 网络调用: ${e?.network_calls || 0}\n` +
      `策略级别: ${(result?.data?.policy || {}).security_level || '-'}\n` +
      `违规记录 (${violations.length} 条):\n` +
      (violations.length ? violations.map((v: any) => `  • [${v.violation_type}] ${v.attempted_action || ''}`).join('\n') : '  无'),
      result,
    );
  }

  private async handleReportStepSandboxViolation(args: any) {
    const payload: Record<string, any> = { violation_type: args?.violation_type };
    if (args?.attempted_action) payload.attempted_action = args.attempted_action;
    if (args?.detail) payload.detail = args.detail;
    if (args?.terminate_step !== undefined) payload.terminate_step = args.terminate_step;
    const result = await this.apiClient.reportStepSandboxViolation(args?.run_id, args?.step_key, payload);
    const d = result?.data || result;
    return this.toToolResponse(
      `已记录步骤沙盒违规 (运行 #${args?.run_id}, 步骤 "${args?.step_key}", 类型: ${d?.violation?.violation_type})${d?.step_terminated ? ' — 步骤已终止' : ''}`,
      result,
    );
  }

  private async handleSetStepRuntimeOverride(args: any) {
    const payload: Record<string, any> = { overrides: args?.overrides || {} };
    if (args?.merge !== undefined) payload.merge = args.merge;
    const result = await this.apiClient.setStepRuntimeOverride(args?.run_id, args?.step_key, payload);
    const d = result?.data || result;
    const eff = d?.effective_params || {};
    return this.toToolResponse(
      `已为运行 #${args?.run_id} 步骤 "${args?.step_key}" 应用运行时覆盖\n` +
      `有效参数: agent=${eff.agent_id ?? '-'}, timeout=${eff.timeout_seconds ?? '-'}s, retry=${eff.retry_count ?? '-'}, on_failure=${eff.on_failure ?? '-'}, caps=[${(eff.required_capabilities || []).join(',')}]`,
      result,
    );
  }

  private async handleClearStepRuntimeOverride(args: any) {
    const result = await this.apiClient.clearStepRuntimeOverride(args?.run_id, args?.step_key);
    return this.toToolResponse(`已清除运行 #${args?.run_id} 步骤 "${args?.step_key}" 的运行时覆盖`, result);
  }

  private async handleGetStepEffectiveParams(args: any) {
    const result = await this.apiClient.getStepEffectiveParams(args?.run_id, args?.step_key);
    const d = result?.data || result;
    const eff = d?.effective_params || {};
    const overrides = d?.overrides || {};
    return this.toToolResponse(
      `步骤 "${args?.step_key}" (运行 #${args?.run_id}) 有效参数:\n` +
      `agent_id=${eff.agent_id ?? '-'}, required_capabilities=[${(eff.required_capabilities || []).join(',')}], timeout=${eff.timeout_seconds ?? '-'}s, retry=${eff.retry_count ?? '-'}, on_failure=${eff.on_failure ?? '-'}\n` +
      `condition=${eff.condition ? JSON.stringify(eff.condition) : '-'}, task_template=${eff.task_template_id ?? '-'}, sub_workflow=${eff.sub_workflow_id ?? '-'}\n` +
      `运行时覆盖: ${Object.keys(overrides).length ? JSON.stringify(overrides) : '无'}`,
      result,
    );
  }

  // ---- Increment 89: Conflict detection & resolution handlers ----

  private async handleScanConflicts(args: any) {
    const result = await this.apiClient.scanConflicts();
    const d = result?.data || result;
    const conflicts = d?.conflicts || [];
    return this.toToolResponse(
      `冲突扫描完成: 检测到 ${d?.detected || 0} 个新冲突\n` +
      conflicts.map((c: any) => `• #${c.id} [${c.conflict_type}/${c.severity}] ${c.title}`).join('\n'),
      result,
    );
  }

  private async handleListConflicts(args: any) {
    const params: Record<string, string> = {};
    if (args?.status) params.status = args.status;
    if (args?.type) params.type = args.type;
    if (args?.active_only !== undefined) params.active_only = String(args.active_only);
    const result = await this.apiClient.listConflicts(params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return this.toToolResponse(
      `冲突列表 (共 ${total} 个):\n` +
      items.map((c: any) => `• #${c.id} [${c.conflict_type}/${c.status}/${c.severity}] ${c.title}`).join('\n'),
      result,
    );
  }

  private async handleGetConflict(args: any) {
    const result = await this.apiClient.getConflict(args?.conflict_id);
    const c = result?.data?.conflict || result?.data || result;
    return this.toToolResponse(
      `冲突 #${c?.id} [${c?.conflict_type}/${c?.status}]\n` +
      `标题: ${c?.title}\n描述: ${c?.description || '-'}\n` +
      `涉及 Agent: ${(c?.agent_ids || []).join(', ') || '-'}\n` +
      `建议策略: ${c?.suggested_strategy || '-'}\n` +
      `证据: ${c?.evidence ? JSON.stringify(c.evidence) : '-'}`,
      result,
    );
  }

  private async handleResolveConflict(args: any) {
    const payload: Record<string, any> = { strategy: args?.strategy };
    if (args?.description) payload.description = args.description;
    const result = await this.apiClient.resolveConflict(args?.conflict_id, payload);
    const d = result?.data || result;
    const actions = d?.actions || [];
    return this.toToolResponse(
      `冲突 #${args?.conflict_id} 已解决 (策略: ${args?.strategy})${actions.length ? '\n执行动作:\n' + actions.map((a: string) => `  • ${a}`).join('\n') : ''}`,
      result,
    );
  }

  private async handleAcknowledgeConflict(args: any) {
    const result = await this.apiClient.acknowledgeConflict(args?.conflict_id);
    return this.toToolResponse(`冲突 #${args?.conflict_id} 已确认`, result);
  }

  private async handleIgnoreConflict(args: any) {
    const result = await this.apiClient.ignoreConflict(args?.conflict_id);
    return this.toToolResponse(`冲突 #${args?.conflict_id} 已忽略`, result);
  }

  private async handleGetConflictsDashboard(args: any) {
    const result = await this.apiClient.getConflictsDashboard();
    const d = result?.data || result;
    const byType = d?.by_type || {};
    const byStatus = d?.by_status || {};
    const bySev = d?.by_severity || {};
    const lat = d?.resolution_latency || {};
    const fmtDur = (s: any) => {
      if (typeof s !== 'number') return '?';
      if (s < 60) return `${s.toFixed(0)}s`;
      if (s < 3600) return `${(s / 60).toFixed(1)}m`;
      if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
      return `${(s / 86400).toFixed(1)}d`;
    };
    const latLine = lat?.count ? `解决耗时: 均${fmtDur(lat.avg_seconds)} 中位${fmtDur(lat.median_seconds)} 最长${fmtDur(lat.max_seconds)} (${lat.count}个)` : '解决耗时: 暂无';
    return this.toToolResponse(
      `冲突仪表盘:\n` +
      `总数: ${d?.total || 0}, 活跃: ${d?.active || 0}\n` +
      `${latLine}\n` +
      `按类型: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按严重度: ${Object.entries(bySev).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      result,
    );
  }

  private async handleGetConflictsTrend(args: any) {
    const result = await this.apiClient.getConflictsTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const totalDetected = trend.reduce((s: number, t: any) => s + (t.detected || 0), 0);
    const totalResolved = trend.reduce((s: number, t: any) => s + (t.resolved || 0), 0);
    const recent = trend.slice(-10)
      .map((t: any) => `• ${t.date}: 检测 ${t.detected || 0} / 解决 ${t.resolved || 0}`)
      .join('\n');
    return this.toToolResponse(
      `冲突趋势 (近 ${d?.days || 30} 天): 累计检测 ${totalDetected}, 累计解决 ${totalResolved}\n${recent || '暂无数据'}`,
      result,
    );
  }

  private async handleGetConflictsByAgent(args: any) {
    const result = await this.apiClient.getConflictsByAgent(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.name || 'Agent'} #${it.agent_id} [${it.kind || '?'}]: 共 ${it.total} (活跃 ${it.active})`)
      .join('\n');
    return this.toToolResponse(`冲突按 Agent 分布 (top ${items.length}):\n${summary || '暂无冲突数据'}`, result);
  }

  private async handleGetConflictsStrategyStats(args: any) {
    const result = await this.apiClient.getConflictsStrategyStats();
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.strategy}: 用 ${it.uses} 次, 复发 ${it.recurrences} (${(it.recurrence_rate * 100).toFixed(0)}%)`)
      .join('\n');
    return this.toToolResponse(`冲突解决策略效果:\n${summary || '暂无已解决冲突'}`, result);
  }

  private async handleListSandboxTemplates(args: any) {
    const result = await this.apiClient.listSandboxTemplates();
    const templates = result?.data?.templates || result?.templates || [];
    return this.toToolResponse(
      `沙盒策略模板 (共 ${templates.length} 个):\n` +
      templates.map((t: any) => `• ${t.key} — ${t.name} [${t.security_level}]: ${t.description}`).join('\n'),
      result,
    );
  }

  private async handleInstantiateSandboxTemplate(args: any) {
    const payload: Record<string, any> = {};
    if (args?.name) payload.name = args.name;
    if (args?.agent_id) payload.agent_id = args.agent_id;
    if (args?.overrides) payload.overrides = args.overrides;
    const result = await this.apiClient.instantiateSandboxTemplate(args?.template_key, payload);
    const s = result?.data?.sandbox || result?.data || result;
    return this.toToolResponse(`已从模板 "${args?.template_key}" 创建沙盒策略 #${s?.id} "${s?.name}" [${s?.security_level}]`, result);
  }

  private async handleAutoResolveConflicts(args: any) {
    const result = await this.apiClient.autoResolveConflicts();
    const d = result?.data || result;
    const resolved = d?.auto_resolved || 0;
    const skipped = d?.skipped || 0;
    return this.toToolResponse(
      `冲突自动解决完成: 检测到 ${d?.detected || 0} 个新冲突, 自动解决 ${resolved} 个, 跳过 ${skipped} 个`,
      result,
    );
  }

  private async handleOrchestrate(args: any) {
    const result = await this.apiClient.orchestrate();
    const d = result?.data || result;
    const lines = [
      `编排完成 (耗时 ${d?.duration_seconds ?? '?'}s):`,
      `  健康: 离线 Agent ${d?.stale_agents ?? 0}, 过期租约 ${d?.expired_leases ?? 0}, 升级任务 ${d?.escalated_tasks ?? 0}`,
      `  工作流超时: ${d?.timed_out_steps ?? 0} 个步骤`,
      `  触发器: 触发 ${d?.triggers_fired ?? 0} 个 (run IDs: ${(d?.trigger_run_ids || []).join(',') || '无'})`,
      `  冲突: 检测 ${d?.conflicts_detected ?? 0}, 自动解决 ${d?.conflicts_auto_resolved ?? 0}, 跳过 ${d?.conflicts_skipped ?? 0}`,
    ];
    if (d?.errors?.length) {
      lines.push(`  错误 (${d.errors.length}): ${d.errors.join('; ')}`);
    }
    return this.toToolResponse(lines.join('\n'), result);
  }

  private async handleGetOrchestratorStatus(args: any) {
    const result = await this.apiClient.getOrchestratorStatus();
    const d = result?.data || result;
    const enabled = d?.enabled ? '运行中' : '未运行';
    const last = d?.last_run;
    const lastLine = last
      ? `上次运行: ${last.summary} (耗时 ${last.duration_seconds}s)`
      : '上次运行: 无';
    return this.toToolResponse(`编排调度器状态: ${enabled}\n${lastLine}`, result);
  }

  private async handleListOrchestratorHistory(args: any) {
    const result = await this.apiClient.listOrchestratorHistory(args);
    const d = result?.data || result;
    const items = d?.items || [];
    const trend = d?.trend || {};
    const lines = items.map((r: any) => {
      const errs = r.error_count > 0 ? ` ⚠${r.error_count}err` : '';
      return `  • [${r.created_at}] ${r.triggered_by} · ${r.summary}${errs} (${r.duration_seconds}s)`;
    });
    const summary = lines.length
      ? `编排历史 (${items.length} 条, 均耗时 ${trend.avg_duration ?? 0}s, 累计触发 ${trend.total_triggers_fired ?? 0}, 累计解决冲突 ${trend.total_conflicts_resolved ?? 0}, 累计错误 ${trend.total_errors ?? 0}):\n${lines.join('\n')}`
      : '无编排历史记录。';
    return this.toToolResponse(summary, result);
  }

  private async handleOrchestratorDailyTrend(args: any) {
    const result = await this.apiClient.orchestratorDailyTrend(args);
    const d = result?.data || result;
    const days = d?.days || [];
    const totals = d?.totals || {};
    const lines = days.map((day: any) => {
      const src = `${day.manual_runs}手/${day.scheduler_runs}调`;
      return `  • ${day.date}: ${day.runs} 次 (${src}) · 触发 ${day.triggers_fired} · 解决冲突 ${day.conflicts_resolved} · 错误 ${day.errors} · 均 ${day.avg_duration}s`;
    });
    const summary = lines.length
      ? `编排按天趋势 (${days.length} 天, 共 ${totals.runs ?? 0} 次, 累计触发 ${totals.triggers_fired ?? 0}, 累计解决冲突 ${totals.conflicts_resolved ?? 0}, 累计错误 ${totals.errors ?? 0}):\n${lines.join('\n')}`
      : '无编排按天趋势数据。';
    return this.toToolResponse(summary, result);
  }

  async run(): Promise<void> {
    logger.info('[MCP_SERVER] Starting Todo for AI MCP Server...', {
      instanceId: this.instanceId,
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasApiToken: !!CONFIG.apiToken,
      logLevel: CONFIG.logLevel,
      version: VERSION
    });

    logger.debug('[MCP_SERVER] Creating transport...', {
      transportType: 'StdioServerTransport',
      instanceId: this.instanceId
    });

    const transport = new StdioServerTransport();

    logger.debug('[MCP_SERVER] Connecting to transport...', {
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });

    try {
      await this.server.connect(transport);

      logger.info('[MCP_SERVER] Todo for AI MCP Server is running', {
        instanceId: this.instanceId,
        apiBaseUrl: CONFIG.apiBaseUrl,
        connected: true,
        ready: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[MCP_SERVER] Failed to start MCP Server', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
