import type { Agent, AgentInboxResult, AgentRun, ClaimAgentTaskArgs, ClaimAgentTaskResult, CreateAgentArgs, GetAgentInboxArgs, HeartbeatAgentArgs, ListAgentAssignmentsArgs, ListAgentsArgs, ListResult, TaskAssignment, UpdateAgentArgs, UpdateAgentAssignmentArgs } from '../types.js';
import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

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

export async function listAuditLogs(helpers: MethodHelpers, args?: { action?: string; resource_type?: string; resource_id?: number; actor_type?: string; actor_agent_id?: number; project_id?: number; page?: number; per_page?: number }): Promise<any> {
  logger.info('[API_CLIENT] Listing audit logs', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/audit-logs', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData(response.data);
  }, 'listAuditLogs');
}

export async function listSecurityEvents(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; page?: number; per_page?: number }): Promise<any> {
  logger.info('[API_CLIENT] Listing security events', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listSecurityEvents');
}

export async function exportSecurityEvents(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; format?: string }): Promise<string> {
  logger.info('[API_CLIENT] Exporting security events', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/export', {
      params: helpers.compactParams(args || {}),
      responseType: 'text',
      transformResponse: (data: any) => data,
    });
    // When responseType is text, axios returns the raw string in response.data.
    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  }, 'exportSecurityEvents');
}

export async function securityEventsDailyTrend(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
  logger.info('[API_CLIENT] Fetching security events daily trend', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/daily-trend', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'securityEventsDailyTrend');
}

export async function securityEventsByAgent(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
  logger.info('[API_CLIENT] Fetching security events by agent', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/by-agent', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'securityEventsByAgent');
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

export async function sendAgentMessage(helpers: MethodHelpers, args: { from_agent_id: number; to_agent_id: number; content: string; task_id?: number; message_type?: string; metadata?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Sending message from agent ${args.from_agent_id} to agent ${args.to_agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.from_agent_id}/message/${args.to_agent_id}`, helpers.compactParams({
      content: args.content,
      task_id: args.task_id,
      message_type: args.message_type,
      metadata: args.metadata,
    }));
    return helpers.unwrapApiData<any>(response.data);
  }, `sendAgentMessage(${args.from_agent_id}->${args.to_agent_id})`);
}

export async function getAgentMessages(helpers: MethodHelpers, args: { agent_id: number; page?: number; per_page?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting messages for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      page: args.page,
      per_page: args.per_page,
    });
    const response = await helpers.client.get(`agents/${args.agent_id}/messages`, { params });
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentMessages(${args.agent_id})`);
}

export async function getAgentCollaborators(helpers: MethodHelpers, args: { agent_id: number; limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting collaborators for agent ${args.agent_id}`);
  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ limit: args.limit });
    const response = await helpers.client.get(`agents/${args.agent_id}/collaborators`, { params });
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentCollaborators(${args.agent_id})`);
}

export async function getAgentReputation(helpers: MethodHelpers, args: { agent_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting reputation for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${args.agent_id}/reputation`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentReputation(${args.agent_id})`);
}

export async function listReputations(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Listing reputations`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/reputations');
    return helpers.unwrapApiData<any>(response.data);
  }, 'listReputations');
}

export async function recalculateReputation(helpers: MethodHelpers, args: { agent_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Recalculating reputation for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/reputation/recalculate`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `recalculateReputation(${args.agent_id})`);
}

export async function getAgentReputationHistory(helpers: MethodHelpers, args: { agent_id: number; limit?: number; since?: string; until?: string }): Promise<any> {
  logger.info(`[API_CLIENT] Getting reputation history for agent ${args.agent_id}`);

  const params: Record<string, string> = {};
  if (args.limit) params.limit = String(args.limit);
  if (args.since) params.since = args.since;
  if (args.until) params.until = args.until;

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${args.agent_id}/reputation/history`, { params });
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentReputationHistory(${args.agent_id})`);
}

export async function listAgentExperiences(helpers: MethodHelpers, agentId: number, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing experiences for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/experiences`, {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `listAgentExperiences(${agentId})`);
}

export async function createAgentExperience(helpers: MethodHelpers, agentId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Creating experience for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `createAgentExperience(${agentId})`);
}

export async function getAgentExperience(helpers: MethodHelpers, agentId: number, experienceId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting experience ${experienceId} for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/experiences/${experienceId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentExperience(${agentId}, ${experienceId})`);
}

export async function updateAgentExperience(helpers: MethodHelpers, agentId: number, experienceId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Updating experience ${experienceId} for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/${agentId}/experiences/${experienceId}`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `updateAgentExperience(${agentId}, ${experienceId})`);
}

export async function deleteAgentExperience(helpers: MethodHelpers, agentId: number, experienceId: number): Promise<any> {
  logger.info(`[API_CLIENT] Deleting experience ${experienceId} for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/${agentId}/experiences/${experienceId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `deleteAgentExperience(${agentId}, ${experienceId})`);
}

export async function recommendExperiences(helpers: MethodHelpers, agentId: number, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Recommending experiences for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/experiences/recommend`, {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `recommendExperiences(${agentId})`);
}

export async function getExperiencesStats(helpers: MethodHelpers): Promise<any> {
  logger.info('[API_CLIENT] Getting experiences stats');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/stats');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesStats');
}

export async function getAgentProductivity(helpers: MethodHelpers, days = 30, limit = 20): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivity');
}

export async function getAgentRunResourceUsage(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent run resource usage (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/run-resource-usage', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentRunResourceUsage');
}

export async function getAgentProductivityTrend(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity trend (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/trend', {
      params: { days },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityTrend');
}

export async function getAgentProductivityAlerts(helpers: MethodHelpers, params: { days?: number; min_completion_rate?: number; max_failure_rate?: number; min_assignments?: number } = {}): Promise<any> {
  logger.info('[API_CLIENT] Getting agent productivity alerts');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/alerts', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityAlerts');
}

export async function getAgentProductivityByKind(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity by-kind (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/by-kind', {
      params: { days },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityByKind');
}

export async function getAgentProductivityHourlyHeatmap(helpers: MethodHelpers, days = 30, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity hourly heatmap (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/hourly-heatmap', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityHourlyHeatmap');
}

export async function getAgentProductivityCalendarHeatmap(helpers: MethodHelpers, days = 90, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity calendar heatmap (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/calendar-heatmap', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityCalendarHeatmap');
}

export async function getAgentProductivityWeeklyComparison(helpers: MethodHelpers, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent productivity weekly comparison (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/productivity/weekly-comparison', { params: { limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentProductivityWeeklyComparison');
}

export async function getAgentFailureReasons(helpers: MethodHelpers, days = 30, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent failure reasons (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/failure-reasons', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentFailureReasons');
}

export async function getAgentFailureErrorPatterns(helpers: MethodHelpers, days = 30, limit = 10, prefixLen = 40): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent failure error patterns (days=${days}, limit=${limit}, prefix=${prefixLen})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/failure-error-patterns', {
      params: { days, limit, prefix_len: prefixLen },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentFailureErrorPatterns');
}

export async function getAgentHealth(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent composite health (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/health', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentHealth');
}

export async function getAgentHealthTrend(helpers: MethodHelpers, days = 30, agentId?: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent health trend (days=${days}, agentId=${agentId ?? 'all'})`);
  return helpers.executeWithRetry(async () => {
    const params: any = { days };
    if (agentId != null) params.agent_id = agentId;
    const response = await helpers.client.get('agents/health/trend', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentHealthTrend');
}

export async function getAgentHealthStateTransitions(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting agent health state transitions (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/health/state-transitions', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentHealthStateTransitions');
}

export async function getAgentHealthAlerts(helpers: MethodHelpers, params: { days?: number; min_health_score?: number; w_reputation?: number; w_completion?: number; w_conflict?: number; w_violation?: number } = {}): Promise<any> {
  logger.info('[API_CLIENT] Getting agent health alerts');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/health/alerts', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentHealthAlerts');
}

export async function getExperiencesLowConfidence(helpers: MethodHelpers, maxConfidence = 0.5, limit = 20): Promise<any> {
  logger.info(`[API_CLIENT] Getting low-confidence experiences (max=${maxConfidence})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/low-confidence', {
      params: { max_confidence: maxConfidence, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesLowConfidence');
}

export async function getExperiencesScatter(helpers: MethodHelpers, limit = 200): Promise<any> {
  logger.info('[API_CLIENT] Getting experiences scatter points');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/scatter', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesScatter');
}

export async function getExperiencesReuseTrend(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences reuse trend for ${days} days`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/reuse-trend', {
      params: { days },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesReuseTrend');
}

export async function getExperiencesConfidenceDecayForecast(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences confidence decay forecast (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/confidence-decay-forecast', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesConfidenceDecayForecast');
}

export async function getExperiencesDecayByDomain(helpers: MethodHelpers, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences decay by domain (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/decay-by-domain', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesDecayByDomain');
}

export async function getExperiencesDecayByTaskType(helpers: MethodHelpers, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences decay by task type (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/decay-by-task-type', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesDecayByTaskType');
}

export async function getExperiencesConfidenceDistribution(helpers: MethodHelpers): Promise<any> {
  logger.info('[API_CLIENT] Getting experiences confidence distribution');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/confidence-distribution');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesConfidenceDistribution');
}

export async function getExperiencesSourceDistribution(helpers: MethodHelpers): Promise<any> {
  logger.info('[API_CLIENT] Getting experiences source distribution');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/source-distribution');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesSourceDistribution');
}

export async function getExperiencesPropagationChain(helpers: MethodHelpers, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences propagation chain (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/propagation-chain', { params: { limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesPropagationChain');
}

export async function getExperiencesSkillCoverageRadar(helpers: MethodHelpers, limit = 6, domains = 8): Promise<any> {
  logger.info(`[API_CLIENT] Getting experiences skill coverage radar (limit=${limit}, domains=${domains})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/skill-coverage-radar', { params: { limit, domains } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getExperiencesSkillCoverageRadar');
}

export async function shareAgentExperience(helpers: MethodHelpers, agentId: number, experienceId: number): Promise<any> {
  logger.info(`[API_CLIENT] Sharing experience ${experienceId} for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences/${experienceId}/share`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `shareAgentExperience(${agentId}, ${experienceId})`);
}

export async function learnFromExperience(helpers: MethodHelpers, agentId: number, experienceId: number): Promise<any> {
  logger.info(`[API_CLIENT] Agent ${agentId} learning from experience ${experienceId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences/${experienceId}/learn`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `learnFromExperience(${agentId}, ${experienceId})`);
}

export async function listSharedExperiences(helpers: MethodHelpers, agentId: number, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing shared experiences for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/experiences/shared`, {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `listSharedExperiences(${agentId})`);
}

export async function autoExtractExperiences(helpers: MethodHelpers, agentId: number): Promise<any> {
  logger.info(`[API_CLIENT] Auto-extracting experiences for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences/auto-extract`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `autoExtractExperiences(${agentId})`);
}

export async function authorizeCrossProjectAgent(helpers: MethodHelpers, args: { agent_id: number; project_id: number; role_in_project?: string; capabilities_override?: string[]; max_concurrent_tasks?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Authorizing agent ${args.agent_id} for project ${args.project_id}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/cross-project/authorize', args);
    return helpers.unwrapApiData<any>(response.data);
  }, `authorizeCrossProjectAgent(${args.agent_id}, ${args.project_id})`);
}

export async function revokeCrossProjectAgent(helpers: MethodHelpers, agentId: number, projectId: number): Promise<any> {
  logger.info(`[API_CLIENT] Revoking agent ${agentId} from project ${projectId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/cross-project/revoke', { agent_id: agentId, project_id: projectId });
    return helpers.unwrapApiData<any>(response.data);
  }, `revokeCrossProjectAgent(${agentId}, ${projectId})`);
}

export async function listAgentCrossProjects(helpers: MethodHelpers, agentId: number): Promise<any> {
  logger.info(`[API_CLIENT] Listing cross-project access for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/cross-project`);
    return helpers.unwrapApiData<any>(response.data);
  }, `listAgentCrossProjects(${agentId})`);
}

export async function listProjectExternalAgents(helpers: MethodHelpers, projectId: number): Promise<any> {
  logger.info(`[API_CLIENT] Listing external agents for project ${projectId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/projects/${projectId}/external-agents`);
    return helpers.unwrapApiData<any>(response.data);
  }, `listProjectExternalAgents(${projectId})`);
}

export async function discoverCrossProjectAgents(helpers: MethodHelpers, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Discovering cross-project agents`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/cross-project/discover-agents', {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'discoverCrossProjectAgents');
}

export async function findCapableAgentsCrossProject(helpers: MethodHelpers, params: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Finding capable agents cross-project with capabilities: ${params.capabilities}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/cross-project/capable-agents', {
      params: helpers.compactParams(params),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `findCapableAgentsCrossProject(${params.capabilities})`);
}

export async function applyExperienceDecay(helpers: MethodHelpers, agentId: number, params?: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Applying experience decay for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences/decay`, params || {});
    return helpers.unwrapApiData<any>(response.data);
  }, `applyExperienceDecay(${agentId})`);
}

export async function validateExperience(helpers: MethodHelpers, agentId: number, experienceId: number, data: { is_accurate: boolean }): Promise<any> {
  logger.info(`[API_CLIENT] Validating experience ${experienceId} by agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/experiences/${experienceId}/validate`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `validateExperience(${agentId}, ${experienceId})`);
}

export async function getExperienceValidationStats(helpers: MethodHelpers, agentId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting validation stats for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/experiences/validation-stats`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getExperienceValidationStats(${agentId})`);
}

export async function decayAllExperiences(helpers: MethodHelpers, params?: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Decaying all experiences`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/decay-all-experiences', params || {});
    return helpers.unwrapApiData<any>(response.data);
  }, 'decayAllExperiences');
}

export async function suggestCapabilityAdaptation(helpers: MethodHelpers, agentId: number): Promise<any> {
  logger.info(`[API_CLIENT] Suggesting capability adaptation for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/adapt-capabilities`);
    return helpers.unwrapApiData<any>(response.data);
  }, `suggestCapabilityAdaptation(${agentId})`);
}

export async function applyCapabilityAdaptation(helpers: MethodHelpers, agentId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Applying capability adaptation for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/adapt-capabilities`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `applyCapabilityAdaptation(${agentId})`);
}

export async function bindAgentSandbox(helpers: MethodHelpers, agentId: number, data: { sandbox_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Binding sandbox ${data.sandbox_id} to agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/sandbox/bind`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `bindAgentSandbox(${agentId})`);
}

export async function getAgentSandbox(helpers: MethodHelpers, agentId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/sandbox`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentSandbox(${agentId})`);
}

export async function getSandboxViolationsByAgent(helpers: MethodHelpers, args: { days?: number; limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox violations by agent`);
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  if (args?.limit) params.limit = String(args.limit);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandboxes/violations-by-agent', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getSandboxViolationsByAgent');
}

export async function getConflictsByAgent(helpers: MethodHelpers, args: { limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflicts by agent`);
  const params: Record<string, string> = {};
  if (args?.limit) params.limit = String(args.limit);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts/by-agent', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getConflictsByAgent');
}

export async function getAgentSkillMatching(helpers: MethodHelpers, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting agent skill matching', { limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/skill-matching', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentSkillMatching');
}

export async function getAgentTaskHandoffStats(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting agent task handoff stats', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/task-handoff-stats', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentTaskHandoffStats');
}

export async function getAgentWorkloadForecast(helpers: MethodHelpers, days = 30, horizon = 3, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting agent workload forecast', { days, horizon, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workload-forecast', {
      params: { days, horizon, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentWorkloadForecast');
}

export async function getAgentSpecializationEvolution(helpers: MethodHelpers, weeks = 12, limit = 8): Promise<any> {
  logger.info('[API_CLIENT] Getting agent specialization evolution', { weeks, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/specialization-evolution', {
      params: { weeks, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentSpecializationEvolution');
}

export async function getAgentExperiencesDecayAlerts(helpers: MethodHelpers, days = 30, minDrop = 0.1, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting agent experiences decay alerts', { days, minDrop, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/experiences/decay-alerts', {
      params: { days, min_drop: minDrop, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentExperiencesDecayAlerts');
}

export async function getAgentCrossProjectEfficiency(helpers: MethodHelpers, days = 30, limit = 20): Promise<any> {
  logger.info('[API_CLIENT] Getting agent cross-project efficiency', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/cross-project-efficiency', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentCrossProjectEfficiency');
}

export async function getAgentCapabilitySupplyDemand(helpers: MethodHelpers, limit = 20): Promise<any> {
  logger.info('[API_CLIENT] Getting agent capability supply-demand', { limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/capability-supply-demand', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentCapabilitySupplyDemand');
}

export async function getAgentIdleRanking(helpers: MethodHelpers, limit = 20): Promise<any> {
  logger.info('[API_CLIENT] Getting agent idle ranking', { limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/idle-ranking', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getAgentIdleRanking');
}
