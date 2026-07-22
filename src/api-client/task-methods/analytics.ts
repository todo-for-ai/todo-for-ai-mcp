/**
 * Task analytics operations
 */
import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

export async function getTaskAllocationFairness(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task allocation fairness (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/task-allocation-fairness', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskAllocationFairness');
}

export async function escalateOverdueTasks(helpers: MethodHelpers, args?: { overdue_after_days?: number }): Promise<{ escalated_count: number; task_ids: number[] }> {
  logger.info('[API_CLIENT] Escalating overdue tasks', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/escalate-overdue', helpers.compactParams(args || {}));
    return helpers.unwrapApiData<{ escalated_count: number; task_ids: number[] }>(response.data);
  }, 'escalateOverdueTasks');
}

export async function fireDueTriggers(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Firing due workflow triggers`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/fire-triggers');
    return helpers.unwrapApiData<any>(response.data);
  }, 'fireDueTriggers');
}

export async function getTaskStats(helpers: MethodHelpers): Promise<any> {
  logger.info('[API_CLIENT] Getting task lifecycle stats');
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/stats');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskStats');
}

export async function getTaskOverdueTrend(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task overdue trend (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/overdue-trend', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskOverdueTrend');
}

export async function getTaskOverdueByAssignee(helpers: MethodHelpers, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting task overdue by assignee (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/overdue-by-assignee', { params: { limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskOverdueByAssignee');
}

export async function getTaskOverdueClustering(helpers: MethodHelpers, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting task overdue clustering (limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/overdue-clustering', { params: { limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskOverdueClustering');
}

export async function getTaskCompletionByPriority(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task completion by priority (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/completion-by-priority', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCompletionByPriority');
}

export async function getTaskCompletionRateByProject(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting task completion rate by project (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/completion-rate-by-project', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCompletionRateByProject');
}

export async function getTaskPriorityTrend(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task priority trend (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/priority-trend', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskPriorityTrend');
}

export async function getTaskCompletionForecast(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task completion forecast (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/completion-forecast', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCompletionForecast');
}

export async function getTaskCompletionByProject(helpers: MethodHelpers, days = 30, limit = 8): Promise<any> {
  logger.info(`[API_CLIENT] Getting task completion by project (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/completion-by-project', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCompletionByProject');
}

export async function getTaskCompletionByAssignee(helpers: MethodHelpers, days = 30, limit = 8): Promise<any> {
  logger.info(`[API_CLIENT] Getting task completion by assignee (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/completion-by-assignee', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCompletionByAssignee');
}

export async function getTaskDependencyChain(helpers: MethodHelpers, limit = 10, projectId?: number): Promise<any> {
  logger.info('[API_CLIENT] Getting task dependency chain', { limit, projectId });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/dependency-chain', {
      params: helpers.compactParams({ limit, project_id: projectId }),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskDependencyChain');
}

export async function getTaskCommentSentimentTrend(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info('[API_CLIENT] Getting task comment sentiment trend', { days });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/comment-sentiment-trend', {
      params: { days },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskCommentSentimentTrend');
}

export async function getTaskReworkAnalysis(helpers: MethodHelpers, days = 30, limit = 15): Promise<any> {
  logger.info('[API_CLIENT] Getting task rework analysis', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('tasks/rework-analysis', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskReworkAnalysis');
}
