import type { Agent, AgentRun, AppendRunLogsArgs, CreateSubtaskArgs, CreateTaskArgs, CreateTaskTemplateArgs, DeleteSharedContextArgs, DispatchTasksArgs, DispatchTasksResult, GetProjectInfoArgs, GetProjectTasksArgs, GetRunLogsArgs, GetRunLogsResult, GetSharedContextArgs, GetTaskByIdArgs, HandoffTaskArgs, HandoffTaskResult, InstantiateTaskTemplateArgs, ListResult, ListReviewQueueArgs, ListTaskAssignmentsArgs, ListTaskEventsArgs, PostTaskEventArgs, Project, RegisterCapabilitiesArgs, ReviewQueueItem, RunLogEntry, SetSharedContextArgs, SharedContextEntry, SubmitTaskFeedbackArgs, Task, TaskAssignment, TaskEvent, TaskTemplate, UpdateTaskAssignmentArgs } from '../types.js';
import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function getProjectTasksByName(helpers: MethodHelpers, args: GetProjectTasksArgs): Promise<any> {
  logger.info(`Getting tasks for project: ${args.project_name}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post<any>('mcp/call', {
      name: 'get_project_tasks_by_name',
      arguments: {
        project_name: args.project_name,
        status_filter: args.status_filter || ['todo', 'in_progress', 'review'],
      },
    });

    const result = response.data;

    if (result.error) {
      throw new Error(result.error);
    }

    logger.info(`Found ${result.total_tasks || 0} tasks for project: ${args.project_name}`);
    return result;
  }, `getProjectTasksByName(${args.project_name})`);
}

export async function getTaskById(helpers: MethodHelpers, args: GetTaskByIdArgs): Promise<Task> {
  logger.info(`Getting task details for ID: ${args.task_id}`);
  
  try {
    const response = await helpers.client.post<Task>('mcp/call', {
      name: 'get_task_by_id',
      arguments: {
        task_id: args.task_id,
      },
    });

    const result = response.data;
    
    if ('error' in result) {
      throw new Error((result as any).error);
    }

    logger.info(`Retrieved task: ${(result as Task).title}`);
    return result as Task;
  } catch (error) {
    logger.error(`Failed to get task ${args.task_id}:`, error);
    throw error;
  }
}

export async function submitTaskFeedback(helpers: MethodHelpers, args: SubmitTaskFeedbackArgs): Promise<any> {
  logger.info(`Submitting feedback for task ${args.task_id} in project ${args.project_name}`);
  
  try {
    const response = await helpers.client.post<any>('mcp/call', {
      name: 'submit_task_feedback',
      arguments: {
        task_id: args.task_id,
        project_name: args.project_name,
        feedback_content: args.feedback_content,
        status: args.status,
        ai_identifier: args.ai_identifier || 'MCP Client',
      },
    });

    const result = response.data;
    
    if (result.error) {
      throw new Error(result.error);
    }

    logger.info(`Successfully submitted feedback for task ${args.task_id}`);
    return result;
  } catch (error) {
    logger.error(`Failed to submit feedback for task ${args.task_id}:`, error);
    throw error;
  }
}

export async function createTask(helpers: MethodHelpers, args: CreateTaskArgs): Promise<Task> {
  logger.info(`Creating task "${args.title}" in project ${args.project_id}`);

  try {
    const response = await helpers.client.post<Task>('mcp/call', {
      name: 'create_task',
      arguments: {
        project_id: args.project_id,
        title: args.title,
        content: args.content,
        status: args.status || 'todo',
        priority: args.priority || 'medium',
        assignee: args.assignee,
        due_date: args.due_date,
        estimated_hours: args.estimated_hours,
        tags: args.tags,
        related_files: args.related_files,
        is_ai_task: args.is_ai_task !== undefined ? args.is_ai_task : true,
        ai_identifier: args.ai_identifier || 'MCP Client',
      },
    });

    const result = response.data;

    if ('error' in result) {
      throw new Error((result as any).error);
    }

    logger.info(`Successfully created task: ${(result as Task).title}`);
    return result as Task;
  } catch (error) {
    logger.error(`Failed to create task "${args.title}":`, error);
    throw error;
  }
}

export async function getProjectInfo(helpers: MethodHelpers, args: GetProjectInfoArgs): Promise<Project> {
  const apiCallStartTime = Date.now();
  const apiCallId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  logger.info('[API_CLIENT] ========== API CALL START: getProjectInfo ==========', {
    apiCallId,
    timestamp: new Date().toISOString(),
    args
  });

  // Validate that at least one identifier is provided
  if (!args.project_id && !args.project_name) {
    const error = new Error('Either project_id or project_name must be provided');
    logger.error('[API_CLIENT] getProjectInfo validation failed', {
      apiCallId,
      args,
      error: error.message,
      validationRule: 'project_id OR project_name required'
    });
    throw error;
  }

  const identifier = args.project_id ? `ID ${args.project_id}` : `name "${args.project_name}"`;
  logger.info(`[API_CLIENT] getProjectInfo starting for ${identifier}`, {
    apiCallId,
    project_id: args.project_id,
    project_name: args.project_name,
    identifier,
    hasToken: !!helpers.config.apiToken,
    tokenPrefix: helpers.config.apiToken ? helpers.config.apiToken.substring(0, 8) + '...' : 'none',
    baseURL: helpers.config.apiBaseUrl,
    timeout: helpers.config.apiTimeout
  });

  try {
    logger.debug('[API_CLIENT] Preparing MCP call request', {
      apiCallId,
      endpoint: 'mcp/call',
      method: 'POST',
      toolName: 'get_project_info',
      arguments: args,
      fullUrl: `${helpers.config.apiBaseUrl}/mcp/call`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': helpers.config.apiToken ? 'Bearer ***' : 'none',
        'User-Agent': helpers.client.defaults.headers['User-Agent']
      }
    });

    const requestPayload = {
      name: 'get_project_info',
      arguments: {
        project_id: args.project_id,
        project_name: args.project_name,
      },
    };

    logger.debug('[API_CLIENT] Request payload prepared', {
      apiCallId,
      payload: requestPayload,
      payloadSize: JSON.stringify(requestPayload).length
    });

    const httpCallStartTime = Date.now();
    logger.info('[API_CLIENT] Making HTTP request...', {
      apiCallId,
      url: '/mcp/call',
      method: 'POST',
      timestamp: new Date().toISOString()
    });

    const response = await helpers.client.post<Project>('mcp/call', requestPayload);
    const httpCallDuration = Date.now() - httpCallStartTime;

    logger.info('[API_CLIENT] HTTP response received', {
      apiCallId,
      httpCallDuration: `${httpCallDuration}ms`,
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataType: typeof response.data,
      dataSize: response.data ? JSON.stringify(response.data).length : 0,
      headers: {
        'content-type': response.headers['content-type'],
        'content-length': response.headers['content-length']
      }
    });

    logger.debug('[API_CLIENT] Response data details', {
      apiCallId,
      data: response.data,
      dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : []
    });

    const result = response.data;

    logger.debug('[API_CLIENT] Checking for error in response', {
      apiCallId,
      hasError: 'error' in result,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
    });

    if ('error' in result) {
      const errorMsg = (result as any).error;
      logger.error('[API_CLIENT] MCP call returned error', {
        apiCallId,
        error: errorMsg,
        identifier,
        fullResponse: result
      });
      throw new Error(errorMsg);
    }

    const project = result as Project;
    const totalDuration = Date.now() - apiCallStartTime;

    logger.info(`[API_CLIENT] getProjectInfo successful for ${identifier}`, {
      apiCallId,
      totalDuration: `${totalDuration}ms`,
      projectName: project.name,
      projectId: project.id,
      projectStatus: project.status,
      hasStats: !!project.statistics,
      hasRecentTasks: !!(project as any).recent_tasks,
      totalTasks: project.total_tasks,
      completionRate: project.completion_rate
    });

    logger.info('[API_CLIENT] ========== API CALL END: getProjectInfo ==========', {
      apiCallId,
      success: true,
      totalDuration: `${totalDuration}ms`,
      timestamp: new Date().toISOString()
    });

    return project;
  } catch (error) {
    const totalDuration = Date.now() - apiCallStartTime;

    logger.error(`[API_CLIENT] getProjectInfo failed for ${identifier}`, {
      apiCallId,
      totalDuration: `${totalDuration}ms`,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      args,
      config: {
        baseURL: helpers.config.apiBaseUrl,
        timeout: helpers.config.apiTimeout,
        hasToken: !!helpers.config.apiToken
      }
    });

    logger.error('[API_CLIENT] ========== API CALL END: getProjectInfo (ERROR) ==========', {
      apiCallId,
      success: false,
      totalDuration: `${totalDuration}ms`,
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

export async function listReviewQueue(helpers: MethodHelpers, args: ListReviewQueueArgs): Promise<ListResult<ReviewQueueItem>> {
  logger.info('[API_CLIENT] Listing Agent review queue', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/review-queue', {
      params: helpers.compactParams({
        action: args.action,
        page: args.page,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListResult<ReviewQueueItem>>(response.data);
  }, 'listReviewQueue');
}

export async function listTaskAssignments(helpers: MethodHelpers, args: ListTaskAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
  logger.info(`[API_CLIENT] Listing assignments for task ${args.task_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/tasks/${args.task_id}/assignments`, {
      params: helpers.compactParams({
        state: args.state,
        page: args.page,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListResult<TaskAssignment>>(response.data);
  }, `listTaskAssignments(${args.task_id})`);
}

export async function listTaskEvents(helpers: MethodHelpers, args: ListTaskEventsArgs): Promise<ListResult<TaskEvent>> {
  logger.info(`[API_CLIENT] Listing collaboration events for task ${args.task_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/tasks/${args.task_id}/events`, {
      params: helpers.compactParams({
        page: args.page,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListResult<TaskEvent>>(response.data);
  }, `listTaskEvents(${args.task_id})`);
}

export async function postTaskEvent(helpers: MethodHelpers, args: PostTaskEventArgs): Promise<TaskEvent> {
  logger.info(`[API_CLIENT] Posting collaboration event for task ${args.task_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/tasks/${args.task_id}/events`, helpers.compactParams({
      event_type: args.event_type,
      content: args.content,
      agent_id: args.agent_id,
      to_agent_id: args.to_agent_id,
      payload: args.payload,
    }));

    return helpers.unwrapApiData<TaskEvent>(response.data);
  }, `postTaskEvent(${args.task_id})`);
}

export async function handoffTask(helpers: MethodHelpers, args: HandoffTaskArgs): Promise<HandoffTaskResult> {
  logger.info(`[API_CLIENT] Handing off task ${args.task_id} to agent ${args.to_agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/tasks/${args.task_id}/handoff`, helpers.compactParams({
      to_agent_id: args.to_agent_id,
      from_assignment_id: args.from_assignment_id,
      lease_seconds: args.lease_seconds,
      reason: args.reason,
      notes: args.notes,
    }));

    return helpers.unwrapApiData<HandoffTaskResult>(response.data);
  }, `handoffTask(${args.task_id})`);
}

export async function dispatchTasks(helpers: MethodHelpers, args: DispatchTasksArgs): Promise<DispatchTasksResult> {
  logger.info(`[API_CLIENT] Coordinator ${args.agent_id} dispatching tasks`, {
    projectId: args.project_id,
    maxAssignments: args.max_assignments,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/dispatch`, helpers.compactParams({
      project_id: args.project_id,
      max_assignments: args.max_assignments,
      lease_seconds: args.lease_seconds,
      match_capabilities: args.match_capabilities,
      require_capability_match: args.require_capability_match,
      candidate_agent_ids: args.candidate_agent_ids,
      include_self: args.include_self,
    }));

    return helpers.unwrapApiData<DispatchTasksResult>(response.data);
  }, `dispatchTasks(${args.agent_id})`);
}

export async function createSubtask(helpers: MethodHelpers, args: CreateSubtaskArgs): Promise<any> {
  logger.info(`[API_CLIENT] Creating subtask under task ${args.task_id}`, {
    title: args.title,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/tasks/${args.task_id}/subtasks`, helpers.compactParams({
      title: args.title,
      content: args.content,
      priority: args.priority,
      tags: args.tags,
      agent_id: args.agent_id,
    }));

    return helpers.unwrapApiData(response.data);
  }, `createSubtask(${args.task_id})`);
}

export async function updateTaskAssignment(helpers: MethodHelpers, args: UpdateTaskAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
  logger.info(`[API_CLIENT] Updating assignment ${args.assignment_id} for task ${args.task_id}`, {
    state: args.state,
    progressRate: args.progress_rate,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(
      `agents/tasks/${args.task_id}/assignments/${args.assignment_id}`,
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
  }, `updateTaskAssignment(${args.assignment_id})`);
}

export async function getSharedContext(helpers: MethodHelpers, args: GetSharedContextArgs): Promise<SharedContextEntry[]> {
  logger.info(`[API_CLIENT] Getting shared context for task ${args.task_id}`, {
    key: args.key,
  });

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ key: args.key });
    const response = await helpers.client.get(`agents/tasks/${args.task_id}/shared-context`, { params });

    return helpers.unwrapApiData<SharedContextEntry[]>(response.data);
  }, `getSharedContext(${args.task_id})`);
}

export async function setSharedContext(helpers: MethodHelpers, args: SetSharedContextArgs): Promise<SharedContextEntry> {
  logger.info(`[API_CLIENT] Setting shared context for task ${args.task_id}`, {
    key: args.key,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/tasks/${args.task_id}/shared-context`, helpers.compactParams({
      key: args.key,
      value: args.value,
      agent_id: args.agent_id,
    }));

    return helpers.unwrapApiData<SharedContextEntry>(response.data);
  }, `setSharedContext(${args.task_id})`);
}

export async function deleteSharedContext(helpers: MethodHelpers, args: DeleteSharedContextArgs): Promise<void> {
  logger.info(`[API_CLIENT] Deleting shared context entry ${args.entry_id} for task ${args.task_id}`);

  return helpers.executeWithRetry(async () => {
    await helpers.client.delete(`agents/tasks/${args.task_id}/shared-context/${args.entry_id}`);
  }, `deleteSharedContext(${args.entry_id})`);
}

export async function getRunLogs(helpers: MethodHelpers, args: GetRunLogsArgs): Promise<GetRunLogsResult> {
  logger.info(`[API_CLIENT] Getting run logs for run ${args.run_id}`, {
    sinceId: args.since_id,
    level: args.level,
  });

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      since_id: args.since_id,
      level: args.level,
      per_page: args.per_page,
    });
    const response = await helpers.client.get(`agents/runs/${args.run_id}/logs`, { params });

    return helpers.unwrapApiData<GetRunLogsResult>(response.data);
  }, `getRunLogs(${args.run_id})`);
}

export async function appendRunLogs(helpers: MethodHelpers, args: AppendRunLogsArgs): Promise<RunLogEntry[]> {
  logger.info(`[API_CLIENT] Appending ${args.entries.length} log entries to run ${args.run_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/runs/${args.run_id}/logs`, {
      entries: args.entries,
    });

    return helpers.unwrapApiData<RunLogEntry[]>(response.data);
  }, `appendRunLogs(${args.run_id})`);
}

export async function listTaskTemplates(helpers: MethodHelpers): Promise<TaskTemplate[]> {
  logger.info('[API_CLIENT] Listing task templates');

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/task-templates');
    return helpers.unwrapApiData<TaskTemplate[]>(response.data);
  }, 'listTaskTemplates');
}

export async function createTaskTemplate(helpers: MethodHelpers, args: CreateTaskTemplateArgs): Promise<TaskTemplate> {
  logger.info(`[API_CLIENT] Creating task template "${args.name}"`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/task-templates', helpers.compactParams({
      name: args.name,
      description: args.description,
      title_template: args.title_template,
      content_template: args.content_template,
      priority: args.priority,
      tags: args.tags,
      is_ai_task: args.is_ai_task,
      capabilities: args.capabilities,
    }));

    return helpers.unwrapApiData<TaskTemplate>(response.data);
  }, `createTaskTemplate(${args.name})`);
}

export async function instantiateTaskTemplate(helpers: MethodHelpers, args: InstantiateTaskTemplateArgs): Promise<any> {
  logger.info(`[API_CLIENT] Instantiating template ${args.template_id} into project ${args.project_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/task-templates/${args.template_id}/instantiate`, helpers.compactParams({
      project_id: args.project_id,
      title: args.title,
      content: args.content,
    }));

    return helpers.unwrapApiData(response.data);
  }, `instantiateTaskTemplate(${args.template_id})`);
}

export async function getTaskAllocationFairness(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info(`[API_CLIENT] Getting task allocation fairness (days=${days})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/task-allocation-fairness', { params: { days } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getTaskAllocationFairness');
}

export async function registerCapabilities(helpers: MethodHelpers, args: RegisterCapabilitiesArgs): Promise<Agent> {
  logger.info(`[API_CLIENT] Registering capabilities for agent ${args.agent_id}`, {
    capabilities: args.capabilities,
    mode: args.mode,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/${args.agent_id}`, helpers.compactParams({
      capabilities: args.capabilities,
      _capability_mode: args.mode || 'merge',
    }));
    return helpers.unwrapApiData<Agent>(response.data);
  }, `registerCapabilities(${args.agent_id})`);
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

export async function testConnection(helpers: MethodHelpers): Promise<boolean> {
  try {
    logger.info('Testing connection to Todo API...');
    const response = await helpers.client.get('/health');
    logger.info('Connection test successful');
    return true;
  } catch (error) {
    logger.error('Connection test failed:', error);
    return false;
  }
}
