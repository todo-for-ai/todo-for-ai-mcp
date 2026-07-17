import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function orchestrate(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Running global orchestration`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/orchestrate', {});
    return helpers.unwrapApiData<any>(response.data);
  }, 'orchestrate');
}

export async function getOrchestratorStatus(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Getting orchestrator status`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/maintenance/orchestrator/status');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getOrchestratorStatus');
}

export async function listOrchestratorHistory(helpers: MethodHelpers, args?: { limit?: number; triggered_by?: string }): Promise<any> {
  logger.info('[API_CLIENT] Listing orchestrator history', args);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/maintenance/orchestrator/history', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listOrchestratorHistory');
}

export async function orchestratorDailyTrend(helpers: MethodHelpers, args?: { triggered_by?: string; since?: string; until?: string }): Promise<any> {
  logger.info('[API_CLIENT] Fetching orchestrator daily trend', args);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/maintenance/orchestrator/daily-trend', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'orchestratorDailyTrend');
}
