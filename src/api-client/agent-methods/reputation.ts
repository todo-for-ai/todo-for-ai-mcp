import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

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