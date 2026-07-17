import type { CompleteWorkflowStepArgs, CreateWorkflowArgs, LaunchWorkflowArgs, ListResult, UpdateWorkflowArgs, WorkflowItem, WorkflowRunItem } from '../types.js';
import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function listWorkflows(helpers: MethodHelpers, args?: { is_active?: boolean; page?: number; per_page?: number }): Promise<ListResult<WorkflowItem>> {
  logger.info('[API_CLIENT] Listing workflows');

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<ListResult<WorkflowItem>>(response.data);
  }, 'listWorkflows');
}

export async function createWorkflow(helpers: MethodHelpers, args: CreateWorkflowArgs): Promise<WorkflowItem> {
  logger.info(`[API_CLIENT] Creating workflow "${args.name}"`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/workflows', helpers.compactParams({
      name: args.name,
      description: args.description,
      definition: args.definition,
      is_active: args.is_active,
      steps: args.steps,
    }));
    return helpers.unwrapApiData<WorkflowItem>(response.data);
  }, `createWorkflow(${args.name})`);
}

export async function getWorkflow(helpers: MethodHelpers, args: { workflow_id: number }): Promise<WorkflowItem> {
  logger.info(`[API_CLIENT] Getting workflow ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflows/${args.workflow_id}`);
    return helpers.unwrapApiData<WorkflowItem>(response.data);
  }, `getWorkflow(${args.workflow_id})`);
}

export async function updateWorkflow(helpers: MethodHelpers, args: UpdateWorkflowArgs): Promise<WorkflowItem> {
  logger.info(`[API_CLIENT] Updating workflow ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/workflows/${args.workflow_id}`, helpers.compactParams({
      name: args.name,
      description: args.description,
      definition: args.definition,
      is_active: args.is_active,
      steps: args.steps,
    }));
    return helpers.unwrapApiData<WorkflowItem>(response.data);
  }, `updateWorkflow(${args.workflow_id})`);
}

export async function deleteWorkflow(helpers: MethodHelpers, args: { workflow_id: number }): Promise<void> {
  logger.info(`[API_CLIENT] Deleting workflow ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    await helpers.client.delete(`agents/workflows/${args.workflow_id}`);
  }, `deleteWorkflow(${args.workflow_id})`);
}

export async function launchWorkflow(helpers: MethodHelpers, args: LaunchWorkflowArgs): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Launching workflow ${args.workflow_id} in project ${args.project_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflows/${args.workflow_id}/runs`, helpers.compactParams({
      project_id: args.project_id,
      root_task_id: args.root_task_id,
      context: args.context,
    }));
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `launchWorkflow(${args.workflow_id})`);
}

export async function listWorkflowRuns(helpers: MethodHelpers, args?: { workflow_id?: number; status?: string; page?: number; per_page?: number }): Promise<ListResult<WorkflowRunItem>> {
  logger.info('[API_CLIENT] Listing workflow runs');

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflow-runs', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<ListResult<WorkflowRunItem>>(response.data);
  }, 'listWorkflowRuns');
}

export async function getWorkflowStepStats(helpers: MethodHelpers, args?: { limit?: number }): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow step stats');
  const params: Record<string, string> = {};
  if (args?.limit) params.limit = String(args.limit);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-stats', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepStats');
}

export async function getWorkflowRunDurationPercentiles(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow run duration percentiles (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/run-duration-percentiles', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowRunDurationPercentiles');
}

export async function getWorkflowStepFailureRate(helpers: MethodHelpers, days = 30, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow step failure rate (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-failure-rate', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepFailureRate');
}

export async function getWorkflowStepCofailureMatrix(helpers: MethodHelpers, days = 30, limit = 8): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow step co-failure matrix (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-cofailure-matrix', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepCofailureMatrix');
}

export async function getWorkflowStepRetryTopology(helpers: MethodHelpers, days = 30, limit = 15): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow step retry topology (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-retry-topology', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepRetryTopology');
}

export async function getWorkflowStepHourlyDistribution(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow step hourly distribution (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-hourly-distribution', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepHourlyDistribution');
}

export async function getWorkflowStepDependencyBottleneck(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow step dependency bottleneck (days=${days}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-dependency-bottleneck', { params: { days, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepDependencyBottleneck');
}

export async function getWorkflowSimilarityMatrix(helpers: MethodHelpers, days = 30, limit = 5, maxRuns = 20): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow similarity matrix (days=${days}, limit=${limit}, max_runs=${maxRuns})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/similarity-matrix', { params: { days, limit, max_runs: maxRuns } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowSimilarityMatrix');
}

export async function getWorkflowFailedStepsByDuration(helpers: MethodHelpers, args?: { days?: number; limit?: number }): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow failed steps by duration');
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  if (args?.limit) params.limit = String(args.limit);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/failed-steps/by-duration', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowFailedStepsByDuration');
}

export async function getWorkflowRunTrend(helpers: MethodHelpers, args?: { days?: number }): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow run trend');
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/run-trend', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowRunTrend');
}

export async function getWorkflowSuccessRateByWorkflow(helpers: MethodHelpers, args?: { days?: number; limit?: number }): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow success rate by workflow');
  const params: Record<string, string> = {};
  if (args?.days) params.days = String(args.days);
  if (args?.limit) params.limit = String(args.limit);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/success-rate-by-workflow', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowSuccessRateByWorkflow');
}

export async function getWorkflowRun(helpers: MethodHelpers, args: { run_id: number }): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Getting workflow run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflow-runs/${args.run_id}`);
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `getWorkflowRun(${args.run_id})`);
}

export async function getWorkflowRunConsole(helpers: MethodHelpers, args: { run_id: number; log_limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow run console ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflow-runs/${args.run_id}/console`, {
      params: helpers.compactParams({
        log_limit: args.log_limit,
      }),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, `getWorkflowRunConsole(${args.run_id})`);
}

export async function cancelWorkflowRun(helpers: MethodHelpers, args: { run_id: number }): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Cancelling workflow run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-runs/${args.run_id}/cancel`);
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `cancelWorkflowRun(${args.run_id})`);
}

export async function pauseWorkflowRun(helpers: MethodHelpers, args: { run_id: number }): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Pausing workflow run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-runs/${args.run_id}/pause`);
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `pauseWorkflowRun(${args.run_id})`);
}

export async function resumeWorkflowRun(helpers: MethodHelpers, args: { run_id: number }): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Resuming workflow run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-runs/${args.run_id}/resume`);
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `resumeWorkflowRun(${args.run_id})`);
}

export async function retryWorkflowRun(helpers: MethodHelpers, args: { run_id: number }): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Retrying workflow run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-runs/${args.run_id}/retry`);
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `retryWorkflowRun(${args.run_id})`);
}

export async function completeWorkflowStep(helpers: MethodHelpers, args: CompleteWorkflowStepArgs): Promise<WorkflowRunItem> {
  logger.info(`[API_CLIENT] Completing workflow step ${args.step_key} in run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(
      `agents/workflow-runs/${args.run_id}/steps/${args.step_key}/complete`,
      helpers.compactParams({
        success: args.success,
        error: args.error,
      })
    );
    return helpers.unwrapApiData<WorkflowRunItem>(response.data);
  }, `completeWorkflowStep(${args.run_id}/${args.step_key})`);
}

export async function listWorkflowTriggers(helpers: MethodHelpers, args?: { workflow_id?: number; is_active?: boolean; page?: number; per_page?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Listing workflow triggers`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      workflow_id: args?.workflow_id,
      is_active: args?.is_active,
      page: args?.page,
      per_page: args?.per_page,
    });
    const response = await helpers.client.get('agents/workflow-triggers', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listWorkflowTriggers');
}

export async function createWorkflowTrigger(helpers: MethodHelpers, args: { workflow_id: number; name: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Creating workflow trigger for workflow ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/workflow-triggers', helpers.compactParams(args));
    return helpers.unwrapApiData<any>(response.data);
  }, `createWorkflowTrigger(${args.workflow_id})`);
}

export async function updateWorkflowTrigger(helpers: MethodHelpers, args: { trigger_id: number; name?: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Updating workflow trigger ${args.trigger_id}`);

  return helpers.executeWithRetry(async () => {
    const { trigger_id, ...body } = args;
    const response = await helpers.client.put(`agents/workflow-triggers/${trigger_id}`, helpers.compactParams(body));
    return helpers.unwrapApiData<any>(response.data);
  }, `updateWorkflowTrigger(${args.trigger_id})`);
}

export async function deleteWorkflowTrigger(helpers: MethodHelpers, triggerId: number): Promise<any> {
  logger.info(`[API_CLIENT] Deleting workflow trigger ${triggerId}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/workflow-triggers/${triggerId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `deleteWorkflowTrigger(${triggerId})`);
}

export async function timeoutWorkflowSteps(helpers: MethodHelpers): Promise<{ timed_out: number; steps: Array<{ step_key: string; run_id: number; elapsed_seconds: number; timeout_seconds: number }> }> {
  logger.info(`[API_CLIENT] Checking workflow step timeouts`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/maintenance/timeout-workflow-steps');
    return helpers.unwrapApiData<any>(response.data);
  }, 'timeoutWorkflowSteps');
}

export async function listWorkflowTemplates(helpers: MethodHelpers, args?: { category?: string }): Promise<any> {
  logger.info(`[API_CLIENT] Listing workflow templates`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ category: args?.category });
    const response = await helpers.client.get('agents/workflow-templates', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listWorkflowTemplates');
}

export async function getWorkflowTemplate(helpers: MethodHelpers, templateKey: string): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow template ${templateKey}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflow-templates/${templateKey}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getWorkflowTemplate(${templateKey})`);
}

export async function instantiateWorkflowTemplate(helpers: MethodHelpers, args: { template_key: string; name?: string; project_id?: number; root_task_id?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Instantiating workflow template ${args.template_key}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflow-templates/${args.template_key}/instantiate`, helpers.compactParams(args));
    return helpers.unwrapApiData<any>(response.data);
  }, `instantiateWorkflowTemplate(${args.template_key})`);
}

export async function listWorkflowVersions(helpers: MethodHelpers, args: { workflow_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Listing workflow versions for ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflows/${args.workflow_id}/versions`);
    return helpers.unwrapApiData<any>(response.data);
  }, `listWorkflowVersions(${args.workflow_id})`);
}

export async function getWorkflowVersion(helpers: MethodHelpers, args: { workflow_id: number; version_number: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow version ${args.version_number} for ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflows/${args.workflow_id}/versions/${args.version_number}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getWorkflowVersion(${args.workflow_id}, v${args.version_number})`);
}

export async function rollbackWorkflow(helpers: MethodHelpers, args: { workflow_id: number; version: number }): Promise<any> {
  logger.info(`[API_CLIENT] Rolling back workflow ${args.workflow_id} to version ${args.version}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/workflows/${args.workflow_id}/rollback`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `rollbackWorkflow(${args.workflow_id}, v${args.version})`);
}

export async function diffWorkflowVersions(helpers: MethodHelpers, args: { workflow_id: number; v1: number; v2: number }): Promise<any> {
  logger.info(`[API_CLIENT] Diffing workflow versions v${args.v1} vs v${args.v2} for ${args.workflow_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/workflows/${args.workflow_id}/diff/${args.v1}/${args.v2}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `diffWorkflowVersions(${args.workflow_id})`);
}

export async function getWorkflowFailureCorrelation(helpers: MethodHelpers, days = 30, windowHours = 2): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow failure correlation (days=${days}, window=${windowHours}h)`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/failure-correlation', {
      params: { days, window_hours: windowHours },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowFailureCorrelation');
}

export async function getWorkflowFailureCorrelationByStep(helpers: MethodHelpers, days = 30, windowHours = 2): Promise<any> {
  logger.info(`[API_CLIENT] Getting workflow failure correlation by step (days=${days}, window=${windowHours}h)`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/failure-correlation-by-step', {
      params: { days, window_hours: windowHours },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowFailureCorrelationByStep');
}

export async function getWorkflowStepDurationHistogram(helpers: MethodHelpers, days = 30, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow step duration histogram', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-duration-histogram', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepDurationHistogram');
}

export async function getWorkflowStepBottleneckTimeline(helpers: MethodHelpers, days = 30, limit = 8): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow step bottleneck timeline', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/step-bottleneck-timeline', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStepBottleneckTimeline');
}

export async function getWorkflowStructuralComplexity(helpers: MethodHelpers, limit = 20): Promise<any> {
  logger.info('[API_CLIENT] Getting workflow structural complexity', { limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/workflows/structural-complexity', {
      params: { limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getWorkflowStructuralComplexity');
}
