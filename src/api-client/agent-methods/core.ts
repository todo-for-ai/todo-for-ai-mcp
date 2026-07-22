import type { Agent, AgentInboxResult, AgentRun, ClaimAgentTaskArgs, ClaimAgentTaskResult, CreateAgentArgs, GetAgentInboxArgs, HeartbeatAgentArgs, ListAgentAssignmentsArgs, ListAgentsArgs, ListResult, TaskAssignment, UpdateAgentArgs, UpdateAgentAssignmentArgs } from '../../types.js';
import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

export async function listAgents(helpers: MethodHelpers, args: ListAgentsArgs): Promise<ListResult<Agent>> {
  logger.info('[API_CLIENT] Listing agents', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents', {
      params: helpers.compactParams({
        status: args.status,
        search: args.search,
        page: args.page,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListResult<Agent>>(response.data);
  }, 'listAgents');
}

export async function createAgent(helpers: MethodHelpers, args: CreateAgentArgs): Promise<Agent> {
  logger.info('[API_CLIENT] Creating agent', {
    name: args.name,
    kind: args.kind,
    status: args.status,
    capabilityCount: args.capabilities?.length || 0,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents', helpers.compactParams({
      name: args.name,
      description: args.description,
      kind: args.kind,
      status: args.status,
      provider: args.provider,
      model: args.model,
      capabilities: args.capabilities,
      config: args.config,
    }));

    return helpers.unwrapApiData<Agent>(response.data);
  }, 'createAgent');
}

export async function selfRegisterAgent(helpers: MethodHelpers, args: { name: string; description?: string; kind?: string; provider?: string; model?: string; capabilities?: string[]; config?: Record<string, unknown>; collaboration_role?: string }): Promise<Agent> {
  logger.info(`[API_CLIENT] Self-registering agent "${args.name}"`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/self-register', helpers.compactParams(args));
    return helpers.unwrapApiData<Agent>(response.data);
  }, `selfRegisterAgent("${args.name}")`);
}

export async function discoverAgents(helpers: MethodHelpers, args?: { capability?: string[]; collaboration_role?: string; kind?: string; status?: string }): Promise<Agent[]> {
  logger.info(`[API_CLIENT] Discovering agents`);

  return helpers.executeWithRetry(async () => {
    const params: Record<string, any> = {};
    if (args?.capability) params.capability = args.capability;
    if (args?.collaboration_role) params.collaboration_role = args.collaboration_role;
    if (args?.kind) params.kind = args.kind;
    if (args?.status) params.status = args.status;
    const response = await helpers.client.get('agents/discover', { params });
    return helpers.unwrapApiData<Agent[]>(response.data);
  }, 'discoverAgents');
}

export async function updateAgent(helpers: MethodHelpers, args: UpdateAgentArgs): Promise<Agent> {
  logger.info(`[API_CLIENT] Updating agent ${args.agent_id}`, {
    name: args.name,
    kind: args.kind,
    status: args.status,
    capabilityCount: args.capabilities?.length,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/${args.agent_id}`, helpers.compactParams({
      name: args.name,
      description: args.description,
      kind: args.kind,
      status: args.status,
      provider: args.provider,
      model: args.model,
      capabilities: args.capabilities,
      config: args.config,
    }));

    return helpers.unwrapApiData<Agent>(response.data);
  }, `updateAgent(${args.agent_id})`);
}

export async function heartbeatAgent(helpers: MethodHelpers, args: HeartbeatAgentArgs): Promise<Agent> {
  logger.info(`[API_CLIENT] Recording heartbeat for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/heartbeat`, helpers.compactParams({
      status: args.status,
    }));

    return helpers.unwrapApiData<Agent>(response.data);
  }, `heartbeatAgent(${args.agent_id})`);
}

export async function listRecommendedTasks(helpers: MethodHelpers, args: { agent_id: number; limit?: number; project_id?: number }): Promise<any[]> {
  logger.info(`[API_CLIENT] Listing recommended tasks for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const params: Record<string, any> = {};
    if (args.limit) params.limit = args.limit;
    if (args.project_id) params.project_id = args.project_id;
    const response = await helpers.client.get(`agents/${args.agent_id}/recommended-tasks`, { params });
    return helpers.unwrapApiData<any[]>(response.data);
  }, `listRecommendedTasks(${args.agent_id})`);
}

export async function listAgentAssignments(helpers: MethodHelpers, args: ListAgentAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
  logger.info(`[API_CLIENT] Listing assignments for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${args.agent_id}/assignments`, {
      params: helpers.compactParams({
        state: args.state,
        page: args.page,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListResult<TaskAssignment>>(response.data);
  }, `listAgentAssignments(${args.agent_id})`);
}

export async function getAgentInbox(helpers: MethodHelpers, args: GetAgentInboxArgs): Promise<AgentInboxResult> {
  logger.info(`[API_CLIENT] Fetching inbox for agent ${args.agent_id}`, {
    sinceId: args.since_id,
  });

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      since_id: args.since_id,
      per_page: args.per_page,
      include_self: args.include_self,
    });
    const response = await helpers.client.get(`agents/${args.agent_id}/inbox`, { params });

    return helpers.unwrapApiData<AgentInboxResult>(response.data);
  }, `getAgentInbox(${args.agent_id})`);
}

export async function claimAgentTask(helpers: MethodHelpers, args: ClaimAgentTaskArgs): Promise<ClaimAgentTaskResult | null> {
  logger.info(`[API_CLIENT] Claiming task for agent ${args.agent_id}`, {
    taskId: args.task_id,
    projectId: args.project_id,
  });

  return helpers.executeWithRetry(async () => {
    const runMetadata = {
      ...(args.run_metadata || {}),
      ...(args.dispatch_notes ? { dispatch_notes: args.dispatch_notes } : {}),
    };
    const response = await helpers.client.post(`agents/${args.agent_id}/claim`, helpers.compactParams({
      task_id: args.task_id,
      project_id: args.project_id,
      lease_seconds: args.lease_seconds,
      match_capabilities: args.match_capabilities,
      dispatch_source: args.dispatch_source,
      run_metadata: Object.keys(runMetadata).length > 0 ? runMetadata : undefined,
    }));

    return helpers.unwrapApiData<ClaimAgentTaskResult | null>(response.data);
  }, `claimAgentTask(${args.agent_id})`);
}

export async function updateAgentAssignment(helpers: MethodHelpers, args: UpdateAgentAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
  logger.info(`[API_CLIENT] Updating assignment ${args.assignment_id} for agent ${args.agent_id}`, {
    state: args.state,
    progressRate: args.progress_rate,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(
      `agents/${args.agent_id}/assignments/${args.assignment_id}`,
      helpers.compactParams({
        state: args.state,
        progress_rate: args.progress_rate,
        notes: args.notes,
        feedback_content: args.feedback_content,
        output_summary: args.output_summary,
        error: args.error,
        lease_seconds: args.lease_seconds,
        task_status: args.task_status,
        run_metadata: args.run_metadata,
      })
    );

    return helpers.unwrapApiData<{ assignment: TaskAssignment; run: AgentRun | null }>(response.data);
  }, `updateAgentAssignment(${args.assignment_id})`);
}

export async function getAgentCapabilityGapAnalysis(helpers: MethodHelpers, limit = 10, minConfidence = 0.5): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent capability gap analysis (limit=${limit}, min_confidence=${minConfidence})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/capability-gap-analysis', { params: { limit, min_confidence: minConfidence } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentCapabilityGapAnalysis');
}

export async function getAgentRunResourceTrend(helpers: MethodHelpers, days = 14, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent run resource trend (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/run-resource-trend', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentRunResourceTrend');
}

export async function healthCheck(helpers: MethodHelpers): Promise<{ stale_agents: number; stale_agent_ids: number[]; expired_leases: number; escalated_tasks: number; escalated_task_ids: number[] }> {
  logger.info('[API_CLIENT] Running health check');

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/health-check');
    return helpers.unwrapApiData<any>(response.data);
  }, 'healthCheck');
}

export async function markOfflineAgents(helpers: MethodHelpers): Promise<{ marked_offline: number; agent_ids: number[] }> {
  logger.info(`[API_CLIENT] Marking offline agents`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/mark-offline-agents');
    return helpers.unwrapApiData<{ marked_offline: number; agent_ids: number[] }>(response.data);
  }, 'markOfflineAgents');
}

export async function getAgentCollaborators(helpers: MethodHelpers, args: { agent_id: number; limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting collaborators for agent ${args.agent_id}`);
  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ limit: args.limit });
    const response = await helpers.client.get(`agents/${args.agent_id}/collaborators`, { params });
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentCollaborators(${args.agent_id})`);
}
