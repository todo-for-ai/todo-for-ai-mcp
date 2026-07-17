import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function getConflictsSandboxCorrelation(helpers: MethodHelpers, days = 30, windowHours = 2): Promise<any> {
  logger.info(`[API_CLIENT] Getting conflicts-sandbox correlation (days=${days}, window=${windowHours}h)`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/conflicts/sandbox-correlation', {
      params: { days, window_hours: windowHours },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getConflictsSandboxCorrelation');
}

export async function listSandboxes(helpers: MethodHelpers, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing sandboxes`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandboxes', {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listSandboxes');
}

export async function createSandbox(helpers: MethodHelpers, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Creating sandbox ${data?.name}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/sandboxes', data);
    return helpers.unwrapApiData<any>(response.data);
  }, 'createSandbox');
}

export async function getSandbox(helpers: MethodHelpers, sandboxId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/sandboxes/${sandboxId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getSandbox(${sandboxId})`);
}

export async function updateSandbox(helpers: MethodHelpers, sandboxId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Updating sandbox ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/sandboxes/${sandboxId}`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `updateSandbox(${sandboxId})`);
}

export async function deleteSandbox(helpers: MethodHelpers, sandboxId: number): Promise<any> {
  logger.info(`[API_CLIENT] Deleting sandbox ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/sandboxes/${sandboxId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `deleteSandbox(${sandboxId})`);
}

export async function checkSandboxAction(helpers: MethodHelpers, sandboxId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Checking sandbox action ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/sandboxes/${sandboxId}/check`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `checkSandboxAction(${sandboxId})`);
}

export async function startSandboxExecution(helpers: MethodHelpers, sandboxId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Starting sandbox execution for sandbox ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/sandboxes/${sandboxId}/executions`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `startSandboxExecution(${sandboxId})`);
}

export async function completeSandboxExecution(helpers: MethodHelpers, executionId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Completing sandbox execution ${executionId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/executions/${executionId}/complete`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `completeSandboxExecution(${executionId})`);
}

export async function revokeSandboxExecution(helpers: MethodHelpers, executionId: number): Promise<any> {
  logger.info(`[API_CLIENT] Revoking sandbox execution ${executionId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/executions/${executionId}/revoke`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `revokeSandboxExecution(${executionId})`);
}

export async function reportSandboxViolation(helpers: MethodHelpers, executionId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Reporting sandbox violation for execution ${executionId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/executions/${executionId}/violation`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `reportSandboxViolation(${executionId})`);
}

export async function getSandboxExecution(helpers: MethodHelpers, executionId: number): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox execution ${executionId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/executions/${executionId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getSandboxExecution(${executionId})`);
}

export async function listSandboxExecutions(helpers: MethodHelpers, sandboxId: number, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing sandbox executions for sandbox ${sandboxId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/sandboxes/${sandboxId}/executions`, {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `listSandboxExecutions(${sandboxId})`);
}

export async function getSandboxDashboard(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox dashboard`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandboxes/dashboard');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getSandboxDashboard');
}

export async function getSandboxViolationTrend(helpers: MethodHelpers, args: { days?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox violation trend`);
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandboxes/violation-trend', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getSandboxViolationTrend');
}

export async function getSandboxTemplateUsage(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox template usage`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandboxes/template-usage');
    return helpers.unwrapApiData<any>(response.data);
  }, 'getSandboxTemplateUsage');
}

export async function getStepSandboxExecution(helpers: MethodHelpers, runId: number, stepKey: string): Promise<any> {
  logger.info(`[API_CLIENT] Getting sandbox execution for step ${stepKey} in run ${runId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/sandbox-execution`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getStepSandboxExecution(${runId},${stepKey})`);
}

export async function reportStepSandboxViolation(helpers: MethodHelpers, runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Reporting sandbox violation for step ${stepKey} in run ${runId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/sandbox-violation`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `reportStepSandboxViolation(${runId},${stepKey})`);
}

export async function listSandboxTemplates(helpers: MethodHelpers): Promise<any> {
  logger.info(`[API_CLIENT] Listing sandbox templates`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/sandbox-templates');
    return helpers.unwrapApiData<any>(response.data);
  }, 'listSandboxTemplates');
}

export async function instantiateSandboxTemplate(helpers: MethodHelpers, templateKey: string, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Instantiating sandbox template ${templateKey}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/sandbox-templates/${encodeURIComponent(templateKey)}/instantiate`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `instantiateSandboxTemplate(${templateKey})`);
}
