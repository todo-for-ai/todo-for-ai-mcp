import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

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