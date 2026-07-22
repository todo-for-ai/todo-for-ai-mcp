/**
 * Cross-project and workflow task operations
 */
import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

export async function findCrossProjectTasks(helpers: MethodHelpers, agentId: number, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Finding cross-project tasks for agent ${agentId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${agentId}/cross-project-tasks`, {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `findCrossProjectTasks(${agentId})`);
}

export async function claimCrossProjectTask(helpers: MethodHelpers, agentId: number, taskId: number, data?: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Agent ${agentId} claiming cross-project task ${taskId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${agentId}/claim-cross-project-task/${taskId}`, data || {});
    return helpers.unwrapApiData<any>(response.data);
  }, `claimCrossProjectTask(${agentId}, ${taskId})`);
}

export async function setStepRuntimeOverride(helpers: MethodHelpers, runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Setting runtime override for step ${stepKey} in run ${runId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/override`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `setStepRuntimeOverride(${runId},${stepKey})`);
}

export async function clearStepRuntimeOverride(helpers: MethodHelpers, runId: number, stepKey: string): Promise<any> {
  logger.info(`[API_CLIENT] Clearing runtime override for step ${stepKey} in run ${runId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/override`);
    return helpers.unwrapApiData<any>(response.data);
  }, `clearStepRuntimeOverride(${runId},${stepKey})`);
}

export async function getStepEffectiveParams(helpers: MethodHelpers, runId: number, stepKey: string): Promise<any> {
  logger.info(`[API_CLIENT] Getting effective params for step ${stepKey} in run ${runId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/effective-params`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getStepEffectiveParams(${runId},${stepKey})`);
}