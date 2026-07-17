import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function scanConflicts(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Scanning for conflicts`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/conflicts/scan', {});
    return helpers.unwrapApiData<any>(response.data);
  }, 'scanConflicts');
}

export async function listConflicts(helpers: MethodHelpers, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing conflicts`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts', {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listConflicts');
}

export async function getConflict(helpers: MethodHelpers, conflictId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflict ${conflictId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/conflicts/${conflictId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getConflict(${conflictId})`);
}

export async function resolveConflict(helpers: MethodHelpers, conflictId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Resolving conflict ${conflictId} with strategy ${data?.strategy}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/conflicts/${conflictId}/resolve`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `resolveConflict(${conflictId})`);
}

export async function ignoreConflict(helpers: MethodHelpers, conflictId: number): Promise<any> {
  logger.info(`[API_CLIENT] Ignoring conflict ${conflictId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/conflicts/${conflictId}/ignore`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `ignoreConflict(${conflictId})`);
}

export async function getConflictsDashboard(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflicts dashboard`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts/dashboard');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getConflictsDashboard');
}

export async function getConflictsTrend(helpers: MethodHelpers, args: { days?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflicts trend`);
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts/trend', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getConflictsTrend');
}

export async function getConflictsStrategyStats(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflicts strategy stats`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts/strategy-stats');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getConflictsStrategyStats');
}

export async function autoResolveConflicts(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Auto-resolving conflicts`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/auto-resolve-conflicts', {});
    return helpers.unwrapApiData<any>(response.data);
  }, 'autoResolveConflicts');
}
