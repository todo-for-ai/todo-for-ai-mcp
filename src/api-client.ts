import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  TodoConfig,
  ApiResponse,
  ApiError,
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  CreateTaskArgs,
  GetProjectInfoArgs,
  ListAgentsArgs,
  CreateAgentArgs,
  UpdateAgentArgs,
  HeartbeatAgentArgs,
  ListAgentAssignmentsArgs,
  ListTaskAssignmentsArgs,
  ListTaskEventsArgs,
  PostTaskEventArgs,
  GetAgentInboxArgs,
  AgentInboxResult,
  HandoffTaskArgs,
  HandoffTaskResult,
  DispatchTasksArgs,
  DispatchTasksResult,
  CreateSubtaskArgs,
  ListReviewQueueArgs,
  ClaimAgentTaskArgs,
  ClaimAgentTaskResult,
  UpdateAgentAssignmentArgs,
  UpdateTaskAssignmentArgs,
  ListNotificationsArgs,
  ListNotificationsResult,
  MarkNotificationsReadArgs,
  GetSharedContextArgs,
  SetSharedContextArgs,
  DeleteSharedContextArgs,
  SharedContextEntry,
  GetRunLogsArgs,
  GetRunLogsResult,
  AppendRunLogsArgs,
  RunLogEntry,
  TaskTemplate,
  CreateTaskTemplateArgs,
  InstantiateTaskTemplateArgs,
  Agent,
  TaskAssignment,
  TaskEvent,
  ReviewQueueItem,
  AgentRun,
  ListResult,
  Task,
  Project,
} from './types.js';
import { logger } from './logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { MethodHelpers } from './api-client/context.js';

import * as taskMethods from './api-client/task-methods.js';
import * as agentMethods from './api-client/agent-methods/index.js';
import * as workflowMethods from './api-client/workflow-methods.js';
import * as knowledgeMethods from './api-client/knowledge-methods.js';
import * as messagingMethods from './api-client/messaging-methods.js';
import * as sandboxMethods from './api-client/sandbox-methods.js';
import * as conflictMethods from './api-client/conflict-methods.js';
import * as orchestratorMethods from './api-client/orchestrator-methods.js';
import * as protocolMethods from './api-client/protocol-methods.js';


// Extend Axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
    };
  }
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;
}

export class TodoApiClient {
  private client: AxiosInstance;
  private config: TodoConfig;
  private retryConfig: RetryConfig;

  constructor(config: TodoConfig) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
    };

    logger.info('[API_CLIENT] Initializing TodoApiClient', {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      hasToken: !!config.apiToken,
      tokenPrefix: config.apiToken ? config.apiToken.substring(0, 8) + '...' : 'none'
    });

    // Normalize baseURL - ensure it doesn't end with a slash for consistent axios behavior
    let normalizedBaseUrl = config.apiBaseUrl;
    if (normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }

    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `todo-for-ai-mcp/${this.getVersion()}`,
      },
    });

    // Add auth token if provided
    if (config.apiToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiToken}`;
      logger.debug('[API_CLIENT] Authorization header set', {
        tokenPrefix: config.apiToken.substring(0, 8) + '...'
      });
    } else {
      logger.warn('[API_CLIENT] No API token provided - requests may fail');
    }

    // Add detailed request/response interceptors for debugging
    this.client.interceptors.request.use(
      (config) => {
        const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        config.metadata = { requestId, startTime: Date.now() };

        logger.info(`[REQUEST_START] ${requestId} ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
          headers: {
            'Content-Type': config.headers?.['Content-Type'],
            'Authorization': config.headers?.['Authorization'] ? 'Bearer ***' : 'none',
            'User-Agent': config.headers?.['User-Agent']
          },
          hasData: !!config.data,
          dataSize: config.data ? JSON.stringify(config.data).length : 0,
          timeout: config.timeout
        });

        if (config.data) {
          logger.debug(`[REQUEST_DATA] ${requestId}`, config.data);
        }

        return config;
      },
      (error) => {
        logger.error(`[REQUEST_ERROR] Failed to setup request`, error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        const startTime = response.config.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        logger.info(`[RESPONSE_SUCCESS] ${requestId} ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          hasData: !!response.data,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
          contentType: response.headers?.['content-type']
        });

        if (response.data) {
          logger.debug(`[RESPONSE_DATA] ${requestId}`, response.data);
        }

        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const startTime = error.config?.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        if (error.response) {
          logger.error(`[RESPONSE_ERROR] ${requestId} ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response.status,
            statusText: error.response.statusText,
            duration: `${duration}ms`,
            data: error.response.data,
            headers: error.response.headers,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method
            }
          });
        } else if (error.request) {
          logger.error(`[NETWORK_ERROR] ${requestId} No response received`, {
            duration: `${duration}ms`,
            code: error.code,
            message: error.message,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method,
              timeout: error.config?.timeout
            }
          });
        } else {
          logger.error(`[REQUEST_SETUP_ERROR] ${requestId}`, {
            message: error.message,
            code: error.code
          });
        }
        return Promise.reject(error);
      }
    );

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`, {
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      const apiError = error.response.data as ApiError;
      if (apiError && apiError.error) {
        return new Error(`API Error: ${apiError.error.message}`);
      }
      return new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      return new Error(`Network Error: Unable to connect to ${this.config.apiBaseUrl}`);
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    // Also retry on 502 Bad Gateway (common in concurrent scenarios)
    return (status >= 500 && status < 600) || status === 502;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.message.includes('AxiosError')) {
          const axiosError = error as AxiosError;

          logger.error(`${operationName} AxiosError details:`, {
            message: axiosError.message,
            code: axiosError.code,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            url: axiosError.config?.url,
            baseURL: axiosError.config?.baseURL,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
            responseData: axiosError.response?.data,
            responseHeaders: axiosError.response?.headers
          });

          if (this.shouldRetry(axiosError, attempt)) {
            const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryDelayMultiplier, attempt);
            logger.warn(`${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${delay}ms...`, error.message);
            await this.sleep(delay);
            continue;
          }
        } else {
          const err = error as Error;
          logger.error(`${operationName} non-Axios error:`, {
            message: err.message,
            stack: err.stack,
            name: err.name
          });
        }

        // Don't retry for non-retryable errors
        throw error;
      }
    }

    throw lastError!;
  }

  private unwrapApiData<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private compactParams(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
  }

  /**
   * Get all pending tasks for a project by project name
   */

  /** Get the shared method context for domain method modules. */
  private get _helpers(): MethodHelpers {
    return {
      client: this.client,
      executeWithRetry: this.executeWithRetry.bind(this),
      compactParams: this.compactParams.bind(this),
      unwrapApiData: this.unwrapApiData.bind(this),
      config: this.config,
    };
  }
  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    return taskMethods.getProjectTasksByName(this._helpers, args);
  }

  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    return taskMethods.getTaskById(this._helpers, args);
  }

  async submitTaskFeedback(args: SubmitTaskFeedbackArgs): Promise<any> {
    return taskMethods.submitTaskFeedback(this._helpers, args);
  }

  async createTask(args: CreateTaskArgs): Promise<Task> {
    return taskMethods.createTask(this._helpers, args);
  }

  async getProjectInfo(args: GetProjectInfoArgs): Promise<Project> {
    return taskMethods.getProjectInfo(this._helpers, args);
  }

  async listAgents(args: ListAgentsArgs): Promise<ListResult<Agent>> {
    return agentMethods.listAgents(this._helpers, args);
  }

  async createAgent(args: CreateAgentArgs): Promise<Agent> {
    return agentMethods.createAgent(this._helpers, args);
  }

  async selfRegisterAgent(args: { name: string; description?: string; kind?: string; provider?: string; model?: string; capabilities?: string[]; config?: Record<string, unknown>; collaboration_role?: string }): Promise<Agent> {
    return agentMethods.selfRegisterAgent(this._helpers, args);
  }

  async discoverAgents(args?: { capability?: string[]; collaboration_role?: string; kind?: string; status?: string }): Promise<Agent[]> {
    return agentMethods.discoverAgents(this._helpers, args);
  }

  async updateAgent(args: UpdateAgentArgs): Promise<Agent> {
    return agentMethods.updateAgent(this._helpers, args);
  }

  async listReviewQueue(args: ListReviewQueueArgs): Promise<ListResult<ReviewQueueItem>> {
    return taskMethods.listReviewQueue(this._helpers, args);
  }

  async heartbeatAgent(args: HeartbeatAgentArgs): Promise<Agent> {
    return agentMethods.heartbeatAgent(this._helpers, args);
  }

  async listRecommendedTasks(args: { agent_id: number; limit?: number; project_id?: number }): Promise<any[]> {
    return agentMethods.listRecommendedTasks(this._helpers, args);
  }

  async listAgentAssignments(args: ListAgentAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
    return agentMethods.listAgentAssignments(this._helpers, args);
  }

  async listTaskAssignments(args: ListTaskAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
    return taskMethods.listTaskAssignments(this._helpers, args);
  }

  async listTaskEvents(args: ListTaskEventsArgs): Promise<ListResult<TaskEvent>> {
    return taskMethods.listTaskEvents(this._helpers, args);
  }

  async postTaskEvent(args: PostTaskEventArgs): Promise<TaskEvent> {
    return taskMethods.postTaskEvent(this._helpers, args);
  }

  async getAgentInbox(args: GetAgentInboxArgs): Promise<AgentInboxResult> {
    return agentMethods.getAgentInbox(this._helpers, args);
  }

  async handoffTask(args: HandoffTaskArgs): Promise<HandoffTaskResult> {
    return taskMethods.handoffTask(this._helpers, args);
  }

  async dispatchTasks(args: DispatchTasksArgs): Promise<DispatchTasksResult> {
    return taskMethods.dispatchTasks(this._helpers, args);
  }

  async createSubtask(args: CreateSubtaskArgs): Promise<any> {
    return taskMethods.createSubtask(this._helpers, args);
  }

  async claimAgentTask(args: ClaimAgentTaskArgs): Promise<ClaimAgentTaskResult | null> {
    return agentMethods.claimAgentTask(this._helpers, args);
  }

  async updateAgentAssignment(args: UpdateAgentAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
    return agentMethods.updateAgentAssignment(this._helpers, args);
  }

  async updateTaskAssignment(args: UpdateTaskAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
    return taskMethods.updateTaskAssignment(this._helpers, args);
  }

  async listNotifications(args: ListNotificationsArgs): Promise<ListNotificationsResult> {
    return messagingMethods.listNotifications(this._helpers, args);
  }

  async markNotificationsRead(args: MarkNotificationsReadArgs): Promise<{ marked_count: number }> {
    return messagingMethods.markNotificationsRead(this._helpers, args);
  }

  async getSharedContext(args: GetSharedContextArgs): Promise<SharedContextEntry[]> {
    return taskMethods.getSharedContext(this._helpers, args);
  }

  async setSharedContext(args: SetSharedContextArgs): Promise<SharedContextEntry> {
    return taskMethods.setSharedContext(this._helpers, args);
  }

  async deleteSharedContext(args: DeleteSharedContextArgs): Promise<void> {
    return taskMethods.deleteSharedContext(this._helpers, args);
  }

  async getRunLogs(args: GetRunLogsArgs): Promise<GetRunLogsResult> {
    return taskMethods.getRunLogs(this._helpers, args);
  }

  async appendRunLogs(args: AppendRunLogsArgs): Promise<RunLogEntry[]> {
    return taskMethods.appendRunLogs(this._helpers, args);
  }

  async listTaskTemplates(): Promise<TaskTemplate[]> {
    return taskMethods.listTaskTemplates(this._helpers);
  }

  async createTaskTemplate(args: CreateTaskTemplateArgs): Promise<TaskTemplate> {
    return taskMethods.createTaskTemplate(this._helpers, args);
  }

  async instantiateTaskTemplate(args: InstantiateTaskTemplateArgs): Promise<any> {
    return taskMethods.instantiateTaskTemplate(this._helpers, args);
  }

  async listWorkflows(args?: { is_active?: boolean; page?: number; per_page?: number }): Promise<ListResult<import('./types.js').WorkflowItem>> {
    return workflowMethods.listWorkflows(this._helpers, args);
  }

  async createWorkflow(args: import('./types.js').CreateWorkflowArgs): Promise<import('./types.js').WorkflowItem> {
    return workflowMethods.createWorkflow(this._helpers, args);
  }

  async getWorkflow(args: { workflow_id: number }): Promise<import('./types.js').WorkflowItem> {
    return workflowMethods.getWorkflow(this._helpers, args);
  }

  async updateWorkflow(args: import('./types.js').UpdateWorkflowArgs): Promise<import('./types.js').WorkflowItem> {
    return workflowMethods.updateWorkflow(this._helpers, args);
  }

  async deleteWorkflow(args: { workflow_id: number }): Promise<void> {
    return workflowMethods.deleteWorkflow(this._helpers, args);
  }

  async launchWorkflow(args: import('./types.js').LaunchWorkflowArgs): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.launchWorkflow(this._helpers, args);
  }

  async listWorkflowRuns(args?: { workflow_id?: number; status?: string; page?: number; per_page?: number }): Promise<ListResult<import('./types.js').WorkflowRunItem>> {
    return workflowMethods.listWorkflowRuns(this._helpers, args);
  }

  async getWorkflowStepStats(args?: { limit?: number }): Promise<any> {
    return workflowMethods.getWorkflowStepStats(this._helpers, args);
  }

  async getWorkflowRunDurationPercentiles(days = 30): Promise<any> {
    return workflowMethods.getWorkflowRunDurationPercentiles(this._helpers, days = 30);
  }

  async getWorkflowStepFailureRate(days = 30, limit = 15): Promise<any> {
    return workflowMethods.getWorkflowStepFailureRate(this._helpers, days = 30, limit = 15);
  }

  async getWorkflowStepCofailureMatrix(days = 30, limit = 8): Promise<any> {
    return workflowMethods.getWorkflowStepCofailureMatrix(this._helpers, days = 30, limit = 8);
  }

  async getWorkflowStepRetryTopology(days = 30, limit = 15): Promise<any> {
    return workflowMethods.getWorkflowStepRetryTopology(this._helpers, days = 30, limit = 15);
  }

  async getWorkflowStepHourlyDistribution(days = 30, limit = 10): Promise<any> {
    return workflowMethods.getWorkflowStepHourlyDistribution(this._helpers, days = 30, limit = 10);
  }

  async getWorkflowStepDependencyBottleneck(days = 30, limit = 10): Promise<any> {
    return workflowMethods.getWorkflowStepDependencyBottleneck(this._helpers, days = 30, limit = 10);
  }

  async getAgentCapabilityGapAnalysis(limit = 10, minConfidence = 0.5): Promise<any> {
    return agentMethods.getAgentCapabilityGapAnalysis(this._helpers, limit = 10, minConfidence = 0.5);
  }

  async getCollaborationGraphTimeline(days = 14, bucket = 'day', limit = 50): Promise<any> {
    return messagingMethods.getCollaborationGraphTimeline(this._helpers, days = 14, bucket = 'day', limit = 50);
  }

  async getTaskAllocationFairness(days = 30): Promise<any> {
    return taskMethods.getTaskAllocationFairness(this._helpers, days = 30);
  }

  async getWorkflowSimilarityMatrix(days = 30, limit = 5, maxRuns = 20): Promise<any> {
    return workflowMethods.getWorkflowSimilarityMatrix(this._helpers, days = 30, limit = 5, maxRuns = 20);
  }

  async getAgentRunResourceTrend(days = 14, limit = 10): Promise<any> {
    return agentMethods.getAgentRunResourceTrend(this._helpers, days = 14, limit = 10);
  }

  async getWorkflowFailedStepsByDuration(args?: { days?: number; limit?: number }): Promise<any> {
    return workflowMethods.getWorkflowFailedStepsByDuration(this._helpers, args);
  }

  async getWorkflowRunTrend(args?: { days?: number }): Promise<any> {
    return workflowMethods.getWorkflowRunTrend(this._helpers, args);
  }

  async getWorkflowSuccessRateByWorkflow(args?: { days?: number; limit?: number }): Promise<any> {
    return workflowMethods.getWorkflowSuccessRateByWorkflow(this._helpers, args);
  }

  async getWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.getWorkflowRun(this._helpers, args);
  }

  async getWorkflowRunConsole(args: { run_id: number; log_limit?: number }): Promise<any> {
    return workflowMethods.getWorkflowRunConsole(this._helpers, args);
  }

  async cancelWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.cancelWorkflowRun(this._helpers, args);
  }

  async pauseWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.pauseWorkflowRun(this._helpers, args);
  }

  async resumeWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.resumeWorkflowRun(this._helpers, args);
  }

  async retryWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.retryWorkflowRun(this._helpers, args);
  }

  async completeWorkflowStep(args: import('./types.js').CompleteWorkflowStepArgs): Promise<import('./types.js').WorkflowRunItem> {
    return workflowMethods.completeWorkflowStep(this._helpers, args);
  }

  async registerCapabilities(args: import('./types.js').RegisterCapabilitiesArgs): Promise<import('./types.js').Agent> {
    return taskMethods.registerCapabilities(this._helpers, args);
  }

  async escalateOverdueTasks(args?: { overdue_after_days?: number }): Promise<{ escalated_count: number; task_ids: number[] }> {
    return taskMethods.escalateOverdueTasks(this._helpers, args);
  }

  async listAuditLogs(args?: { action?: string; resource_type?: string; resource_id?: number; actor_type?: string; actor_agent_id?: number; project_id?: number; page?: number; per_page?: number }): Promise<any> {
    return agentMethods.listAuditLogs(this._helpers, args);
  }

  async listSecurityEvents(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; page?: number; per_page?: number }): Promise<any> {
    return agentMethods.listSecurityEvents(this._helpers, args);
  }

  async exportSecurityEvents(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; format?: string }): Promise<string> {
    return agentMethods.exportSecurityEvents(this._helpers, args);
  }

  async securityEventsDailyTrend(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
    return agentMethods.securityEventsDailyTrend(this._helpers, args);
  }

  async securityEventsByAgent(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
    return agentMethods.securityEventsByAgent(this._helpers, args);
  }

  async healthCheck(): Promise<{ stale_agents: number; stale_agent_ids: number[]; expired_leases: number; escalated_tasks: number; escalated_task_ids: number[] }> {
    return agentMethods.healthCheck(this._helpers);
  }

  async broadcastMessage(args: { agent_id: number; content: string; task_id?: number; event_type?: string; payload?: Record<string, unknown> }): Promise<{ recipient_count: number; recipient_agent_ids: number[] }> {
    return messagingMethods.broadcastMessage(this._helpers, args);
  }

  async collaborationMetrics(args?: { project_id?: number; days?: number }): Promise<any> {
    return messagingMethods.collaborationMetrics(this._helpers, args);
  }

  async listWorkflowTriggers(args?: { workflow_id?: number; is_active?: boolean; page?: number; per_page?: number }): Promise<any> {
    return workflowMethods.listWorkflowTriggers(this._helpers, args);
  }

  async createWorkflowTrigger(args: { workflow_id: number; name: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
    return workflowMethods.createWorkflowTrigger(this._helpers, args);
  }

  async updateWorkflowTrigger(args: { trigger_id: number; name?: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
    return workflowMethods.updateWorkflowTrigger(this._helpers, args);
  }

  async deleteWorkflowTrigger(triggerId: number): Promise<any> {
    return workflowMethods.deleteWorkflowTrigger(this._helpers, triggerId);
  }

  async fireDueTriggers(): Promise<any> {
    return taskMethods.fireDueTriggers(this._helpers);
  }

  async markOfflineAgents(): Promise<{ marked_offline: number; agent_ids: number[] }> {
    return agentMethods.markOfflineAgents(this._helpers);
  }

  async timeoutWorkflowSteps(): Promise<{ timed_out: number; steps: Array<{ step_key: string; run_id: number; elapsed_seconds: number; timeout_seconds: number }> }> {
    return workflowMethods.timeoutWorkflowSteps(this._helpers);
  }

  async sendAgentMessage(args: { from_agent_id: number; to_agent_id: number; content: string; task_id?: number; message_type?: string; metadata?: Record<string, unknown> }): Promise<any> {
    return agentMethods.sendAgentMessage(this._helpers, args);
  }

  async getAgentMessages(args: { agent_id: number; page?: number; per_page?: number }): Promise<any> {
    return agentMethods.getAgentMessages(this._helpers, args);
  }

  async getAgentCollaborators(args: { agent_id: number; limit?: number }): Promise<any> {
    return agentMethods.getAgentCollaborators(this._helpers, args);
  }

  async collaborationGraph(args?: { limit?: number }): Promise<any> {
    return messagingMethods.collaborationGraph(this._helpers, args);
  }

  async listChannels(args?: { project_id?: number; task_id?: number }): Promise<any[]> {
    return messagingMethods.listChannels(this._helpers, args);
  }

  async createChannel(args: { name: string; description?: string; project_id?: number; task_id?: number; agent_ids?: number[] }): Promise<any> {
    return messagingMethods.createChannel(this._helpers, args);
  }

  async sendChannelMessage(args: { channel_id: number; agent_id?: number; content: string; message_type?: string }): Promise<any> {
    return messagingMethods.sendChannelMessage(this._helpers, args);
  }

  async listChannelMessages(args: { channel_id: number; page?: number; per_page?: number }): Promise<any[]> {
    return messagingMethods.listChannelMessages(this._helpers, args);
  }

  async listWorkflowTemplates(args?: { category?: string }): Promise<any> {
    return workflowMethods.listWorkflowTemplates(this._helpers, args);
  }

  async getWorkflowTemplate(templateKey: string): Promise<any> {
    return workflowMethods.getWorkflowTemplate(this._helpers, templateKey);
  }

  async instantiateWorkflowTemplate(args: { template_key: string; name?: string; project_id?: number; root_task_id?: number }): Promise<any> {
    return workflowMethods.instantiateWorkflowTemplate(this._helpers, args);
  }

  async listCollaborationTemplates(params?: Record<string, string>): Promise<any> {
    return messagingMethods.listCollaborationTemplates(this._helpers, params);
  }

  async createCollaborationTemplate(args: { name: string; agent_specs: any[]; description?: string; category?: string; workflow_id?: number }): Promise<any> {
    return messagingMethods.createCollaborationTemplate(this._helpers, args);
  }

  async deleteCollaborationTemplate(templateId: number): Promise<any> {
    return messagingMethods.deleteCollaborationTemplate(this._helpers, templateId);
  }

  async instantiateCollaborationTemplate(args: { template_key: string; project_id?: number }): Promise<any> {
    return messagingMethods.instantiateCollaborationTemplate(this._helpers, args);
  }

  async listKnowledgeEntries(args: { agent_id: number; domain?: string; entry_type?: string; tag?: string; search?: string; include_content?: boolean }): Promise<any> {
    return knowledgeMethods.listKnowledgeEntries(this._helpers, args);
  }

  async createKnowledgeEntry(args: { agent_id: number; title: string; content: string; domain?: string; tags?: string[]; entry_type?: string; source_task_id?: number; confidence?: number; shared_with_project?: boolean; project_id?: number }): Promise<any> {
    return knowledgeMethods.createKnowledgeEntry(this._helpers, args);
  }

  async getKnowledgeEntry(args: { agent_id: number; entry_id: number }): Promise<any> {
    return knowledgeMethods.getKnowledgeEntry(this._helpers, args);
  }

  async updateKnowledgeEntry(args: { agent_id: number; entry_id: number; title?: string; content?: string; domain?: string; tags?: string[]; confidence?: number; is_valid?: boolean; shared_with_project?: boolean }): Promise<any> {
    return knowledgeMethods.updateKnowledgeEntry(this._helpers, args);
  }

  async deleteKnowledgeEntry(args: { agent_id: number; entry_id: number }): Promise<any> {
    return knowledgeMethods.deleteKnowledgeEntry(this._helpers, args);
  }

  async searchKnowledge(args: { agent_id: number; q?: string; domain?: string; tags?: string; entry_type?: string; limit?: number }): Promise<any> {
    return knowledgeMethods.searchKnowledge(this._helpers, args);
  }

  async listSharedKnowledge(args?: { domain?: string; entry_type?: string; search?: string }): Promise<any> {
    return knowledgeMethods.listSharedKnowledge(this._helpers, args);
  }

  async autoExtractKnowledge(args: { agent_id: number; limit?: number }): Promise<any> {
    return knowledgeMethods.autoExtractKnowledge(this._helpers, args);
  }

  async listWorkflowVersions(args: { workflow_id: number }): Promise<any> {
    return workflowMethods.listWorkflowVersions(this._helpers, args);
  }

  async getWorkflowVersion(args: { workflow_id: number; version_number: number }): Promise<any> {
    return workflowMethods.getWorkflowVersion(this._helpers, args);
  }

  async rollbackWorkflow(args: { workflow_id: number; version: number }): Promise<any> {
    return workflowMethods.rollbackWorkflow(this._helpers, args);
  }

  async diffWorkflowVersions(args: { workflow_id: number; v1: number; v2: number }): Promise<any> {
    return workflowMethods.diffWorkflowVersions(this._helpers, args);
  }

  async listProtocols(args?: { project_id?: number; status?: string; protocol_type?: string; initiator_agent_id?: number }): Promise<any> {
    return protocolMethods.listProtocols(this._helpers, args);
  }

  async createProtocol(args: { protocol_type: string; title: string; initiator_agent_id: number; description?: string; channel_id?: number; project_id?: number; task_id?: number; config?: Record<string, unknown>; deadline?: string }): Promise<any> {
    return protocolMethods.createProtocol(this._helpers, args);
  }

  async getProtocol(args: { protocol_id: number }): Promise<any> {
    return protocolMethods.getProtocol(this._helpers, args);
  }

  async respondToProtocol(args: { protocol_id: number; agent_id: number; message_type: string; content?: string; payload?: Record<string, unknown> }): Promise<any> {
    return protocolMethods.respondToProtocol(this._helpers, args);
  }

  async resolveProtocol(args: { protocol_id: number; resolution: string; result?: Record<string, unknown> }): Promise<any> {
    return protocolMethods.resolveProtocol(this._helpers, args);
  }

  async getAgentReputation(args: { agent_id: number }): Promise<any> {
    return agentMethods.getAgentReputation(this._helpers, args);
  }

  async listReputations(): Promise<any> {
    return agentMethods.listReputations(this._helpers);
  }

  async recalculateReputation(args: { agent_id: number }): Promise<any> {
    return agentMethods.recalculateReputation(this._helpers, args);
  }

  async getAgentReputationHistory(args: { agent_id: number; limit?: number; since?: string; until?: string }): Promise<any> {
    return agentMethods.getAgentReputationHistory(this._helpers, args);
  }

  async listAgentExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    return agentMethods.listAgentExperiences(this._helpers, agentId, params);
  }

  async createAgentExperience(agentId: number, data: Record<string, any>): Promise<any> {
    return agentMethods.createAgentExperience(this._helpers, agentId, data);
  }

  async getAgentExperience(agentId: number, experienceId: number): Promise<any> {
    return agentMethods.getAgentExperience(this._helpers, agentId, experienceId);
  }

  async updateAgentExperience(agentId: number, experienceId: number, data: Record<string, any>): Promise<any> {
    return agentMethods.updateAgentExperience(this._helpers, agentId, experienceId, data);
  }

  async deleteAgentExperience(agentId: number, experienceId: number): Promise<any> {
    return agentMethods.deleteAgentExperience(this._helpers, agentId, experienceId);
  }

  async recommendExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    return agentMethods.recommendExperiences(this._helpers, agentId, params);
  }

  async getExperiencesStats(): Promise<any> {
    return agentMethods.getExperiencesStats(this._helpers);
  }

  async getTaskStats(): Promise<any> {
    return taskMethods.getTaskStats(this._helpers);
  }

  async getTaskOverdueTrend(days = 30): Promise<any> {
    return taskMethods.getTaskOverdueTrend(this._helpers, days = 30);
  }

  async getTaskOverdueByAssignee(limit = 10): Promise<any> {
    return taskMethods.getTaskOverdueByAssignee(this._helpers, limit = 10);
  }

  async getTaskOverdueClustering(limit = 15): Promise<any> {
    return taskMethods.getTaskOverdueClustering(this._helpers, limit = 15);
  }

  async getTaskCompletionByPriority(days = 30): Promise<any> {
    return taskMethods.getTaskCompletionByPriority(this._helpers, days = 30);
  }

  async getTaskCompletionRateByProject(days = 30, limit = 10): Promise<any> {
    return taskMethods.getTaskCompletionRateByProject(this._helpers, days = 30, limit = 10);
  }

  async getTaskPriorityTrend(days = 30): Promise<any> {
    return taskMethods.getTaskPriorityTrend(this._helpers, days = 30);
  }

  async getTaskCompletionForecast(days = 30): Promise<any> {
    return taskMethods.getTaskCompletionForecast(this._helpers, days = 30);
  }

  async getTaskCompletionByProject(days = 30, limit = 8): Promise<any> {
    return taskMethods.getTaskCompletionByProject(this._helpers, days = 30, limit = 8);
  }

  async getTaskCompletionByAssignee(days = 30, limit = 8): Promise<any> {
    return taskMethods.getTaskCompletionByAssignee(this._helpers, days = 30, limit = 8);
  }

  async getWorkflowFailureCorrelation(days = 30, windowHours = 2): Promise<any> {
    return workflowMethods.getWorkflowFailureCorrelation(this._helpers, days = 30, windowHours = 2);
  }

  async getWorkflowFailureCorrelationByStep(days = 30, windowHours = 2): Promise<any> {
    return workflowMethods.getWorkflowFailureCorrelationByStep(this._helpers, days = 30, windowHours = 2);
  }

  async getAgentProductivity(days = 30, limit = 20): Promise<any> {
    return agentMethods.getAgentProductivity(this._helpers, days = 30, limit = 20);
  }

  async getAgentRunResourceUsage(days = 30, limit = 10): Promise<any> {
    return agentMethods.getAgentRunResourceUsage(this._helpers, days = 30, limit = 10);
  }

  async getAgentProductivityTrend(days = 30): Promise<any> {
    return agentMethods.getAgentProductivityTrend(this._helpers, days = 30);
  }

  async getAgentProductivityAlerts(params: { days?: number; min_completion_rate?: number; max_failure_rate?: number; min_assignments?: number } = {}): Promise<any> {
    return agentMethods.getAgentProductivityAlerts(this._helpers, params);
  }

  async getAgentProductivityByKind(days = 30): Promise<any> {
    return agentMethods.getAgentProductivityByKind(this._helpers, days = 30);
  }

  async getAgentProductivityHourlyHeatmap(days = 30, limit = 15): Promise<any> {
    return agentMethods.getAgentProductivityHourlyHeatmap(this._helpers, days = 30, limit = 15);
  }

  async getAgentProductivityCalendarHeatmap(days = 90, limit = 10): Promise<any> {
    return agentMethods.getAgentProductivityCalendarHeatmap(this._helpers, days = 90, limit = 10);
  }

  async getAgentProductivityWeeklyComparison(limit = 10): Promise<any> {
    return agentMethods.getAgentProductivityWeeklyComparison(this._helpers, limit = 10);
  }

  async getAgentFailureReasons(days = 30, limit = 15): Promise<any> {
    return agentMethods.getAgentFailureReasons(this._helpers, days = 30, limit = 15);
  }

  async getAgentFailureErrorPatterns(days = 30, limit = 10, prefixLen = 40): Promise<any> {
    return agentMethods.getAgentFailureErrorPatterns(this._helpers, days = 30, limit = 10, prefixLen = 40);
  }

  async getConflictsSandboxCorrelation(days = 30, windowHours = 2): Promise<any> {
    return sandboxMethods.getConflictsSandboxCorrelation(this._helpers, days = 30, windowHours = 2);
  }

  async getAgentHealth(days = 30): Promise<any> {
    return agentMethods.getAgentHealth(this._helpers, days = 30);
  }

  async getAgentHealthTrend(days = 30, agentId?: number): Promise<any> {
    return agentMethods.getAgentHealthTrend(this._helpers, days = 30, agentId);
  }

  async getAgentHealthStateTransitions(days = 30): Promise<any> {
    return agentMethods.getAgentHealthStateTransitions(this._helpers, days = 30);
  }

  async getAgentHealthAlerts(params: { days?: number; min_health_score?: number; w_reputation?: number; w_completion?: number; w_conflict?: number; w_violation?: number } = {}): Promise<any> {
    return agentMethods.getAgentHealthAlerts(this._helpers, params);
  }

  async getExperiencesLowConfidence(maxConfidence = 0.5, limit = 20): Promise<any> {
    return agentMethods.getExperiencesLowConfidence(this._helpers, maxConfidence = 0.5, limit = 20);
  }

  async getExperiencesScatter(limit = 200): Promise<any> {
    return agentMethods.getExperiencesScatter(this._helpers, limit = 200);
  }

  async getExperiencesReuseTrend(days = 30): Promise<any> {
    return agentMethods.getExperiencesReuseTrend(this._helpers, days = 30);
  }

  async getExperiencesConfidenceDecayForecast(days = 30): Promise<any> {
    return agentMethods.getExperiencesConfidenceDecayForecast(this._helpers, days = 30);
  }

  async getExperiencesDecayByDomain(limit = 15): Promise<any> {
    return agentMethods.getExperiencesDecayByDomain(this._helpers, limit = 15);
  }

  async getExperiencesDecayByTaskType(limit = 15): Promise<any> {
    return agentMethods.getExperiencesDecayByTaskType(this._helpers, limit = 15);
  }

  async getExperiencesConfidenceDistribution(): Promise<any> {
    return agentMethods.getExperiencesConfidenceDistribution(this._helpers);
  }

  async getExperiencesSourceDistribution(): Promise<any> {
    return agentMethods.getExperiencesSourceDistribution(this._helpers);
  }

  async getExperiencesPropagationChain(limit = 10): Promise<any> {
    return agentMethods.getExperiencesPropagationChain(this._helpers, limit = 10);
  }

  async getExperiencesSkillCoverageRadar(limit = 6, domains = 8): Promise<any> {
    return agentMethods.getExperiencesSkillCoverageRadar(this._helpers, limit = 6, domains = 8);
  }

  async shareAgentExperience(agentId: number, experienceId: number): Promise<any> {
    return agentMethods.shareAgentExperience(this._helpers, agentId, experienceId);
  }

  async learnFromExperience(agentId: number, experienceId: number): Promise<any> {
    return agentMethods.learnFromExperience(this._helpers, agentId, experienceId);
  }

  async listSharedExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    return agentMethods.listSharedExperiences(this._helpers, agentId, params);
  }

  async autoExtractExperiences(agentId: number): Promise<any> {
    return agentMethods.autoExtractExperiences(this._helpers, agentId);
  }

  async authorizeCrossProjectAgent(args: { agent_id: number; project_id: number; role_in_project?: string; capabilities_override?: string[]; max_concurrent_tasks?: number }): Promise<any> {
    return agentMethods.authorizeCrossProjectAgent(this._helpers, args);
  }

  async revokeCrossProjectAgent(agentId: number, projectId: number): Promise<any> {
    return agentMethods.revokeCrossProjectAgent(this._helpers, agentId, projectId);
  }

  async listAgentCrossProjects(agentId: number): Promise<any> {
    return agentMethods.listAgentCrossProjects(this._helpers, agentId);
  }

  async listProjectExternalAgents(projectId: number): Promise<any> {
    return agentMethods.listProjectExternalAgents(this._helpers, projectId);
  }

  async discoverCrossProjectAgents(params?: Record<string, string>): Promise<any> {
    return agentMethods.discoverCrossProjectAgents(this._helpers, params);
  }

  async findCapableAgentsCrossProject(params: Record<string, string>): Promise<any> {
    return agentMethods.findCapableAgentsCrossProject(this._helpers, params);
  }

  async applyExperienceDecay(agentId: number, params?: Record<string, any>): Promise<any> {
    return agentMethods.applyExperienceDecay(this._helpers, agentId, params);
  }

  async validateExperience(agentId: number, experienceId: number, data: { is_accurate: boolean }): Promise<any> {
    return agentMethods.validateExperience(this._helpers, agentId, experienceId, data);
  }

  async getExperienceValidationStats(agentId: number): Promise<any> {
    return agentMethods.getExperienceValidationStats(this._helpers, agentId);
  }

  async decayAllExperiences(params?: Record<string, any>): Promise<any> {
    return agentMethods.decayAllExperiences(this._helpers, params);
  }

  async suggestCapabilityAdaptation(agentId: number): Promise<any> {
    return agentMethods.suggestCapabilityAdaptation(this._helpers, agentId);
  }

  async applyCapabilityAdaptation(agentId: number, data: Record<string, any>): Promise<any> {
    return agentMethods.applyCapabilityAdaptation(this._helpers, agentId, data);
  }

  async findCrossProjectTasks(agentId: number, params?: Record<string, string>): Promise<any> {
    return taskMethods.findCrossProjectTasks(this._helpers, agentId, params);
  }

  async claimCrossProjectTask(agentId: number, taskId: number, data?: Record<string, any>): Promise<any> {
    return taskMethods.claimCrossProjectTask(this._helpers, agentId, taskId, data);
  }

  async getProtocolAnalytics(params?: Record<string, string>): Promise<any> {
    return protocolMethods.getProtocolAnalytics(this._helpers, params);
  }

  async addDeliberationMessage(protocolId: number, data: Record<string, any>): Promise<any> {
    return messagingMethods.addDeliberationMessage(this._helpers, protocolId, data);
  }

  async listSandboxes(params?: Record<string, string>): Promise<any> {
    return sandboxMethods.listSandboxes(this._helpers, params);
  }

  async createSandbox(data: Record<string, any>): Promise<any> {
    return sandboxMethods.createSandbox(this._helpers, data);
  }

  async getSandbox(sandboxId: number): Promise<any> {
    return sandboxMethods.getSandbox(this._helpers, sandboxId);
  }

  async updateSandbox(sandboxId: number, data: Record<string, any>): Promise<any> {
    return sandboxMethods.updateSandbox(this._helpers, sandboxId, data);
  }

  async deleteSandbox(sandboxId: number): Promise<any> {
    return sandboxMethods.deleteSandbox(this._helpers, sandboxId);
  }

  async bindAgentSandbox(agentId: number, data: { sandbox_id: number }): Promise<any> {
    return agentMethods.bindAgentSandbox(this._helpers, agentId, data);
  }

  async getAgentSandbox(agentId: number): Promise<any> {
    return agentMethods.getAgentSandbox(this._helpers, agentId);
  }

  async checkSandboxAction(sandboxId: number, data: Record<string, any>): Promise<any> {
    return sandboxMethods.checkSandboxAction(this._helpers, sandboxId, data);
  }

  async startSandboxExecution(sandboxId: number, data: Record<string, any>): Promise<any> {
    return sandboxMethods.startSandboxExecution(this._helpers, sandboxId, data);
  }

  async completeSandboxExecution(executionId: number, data: Record<string, any>): Promise<any> {
    return sandboxMethods.completeSandboxExecution(this._helpers, executionId, data);
  }

  async revokeSandboxExecution(executionId: number): Promise<any> {
    return sandboxMethods.revokeSandboxExecution(this._helpers, executionId);
  }

  async reportSandboxViolation(executionId: number, data: Record<string, any>): Promise<any> {
    return sandboxMethods.reportSandboxViolation(this._helpers, executionId, data);
  }

  async getSandboxExecution(executionId: number): Promise<any> {
    return sandboxMethods.getSandboxExecution(this._helpers, executionId);
  }

  async listSandboxExecutions(sandboxId: number, params?: Record<string, string>): Promise<any> {
    return sandboxMethods.listSandboxExecutions(this._helpers, sandboxId, params);
  }

  async getSandboxDashboard(): Promise<any> {
    return sandboxMethods.getSandboxDashboard(this._helpers);
  }

  async getSandboxViolationTrend(args: { days?: number }): Promise<any> {
    return sandboxMethods.getSandboxViolationTrend(this._helpers, args);
  }

  async getSandboxViolationsByAgent(args: { days?: number; limit?: number }): Promise<any> {
    return agentMethods.getSandboxViolationsByAgent(this._helpers, args);
  }

  async getSandboxTemplateUsage(): Promise<any> {
    return sandboxMethods.getSandboxTemplateUsage(this._helpers);
  }

  async getStepSandboxExecution(runId: number, stepKey: string): Promise<any> {
    return sandboxMethods.getStepSandboxExecution(this._helpers, runId, stepKey);
  }

  async reportStepSandboxViolation(runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
    return sandboxMethods.reportStepSandboxViolation(this._helpers, runId, stepKey, data);
  }

  async setStepRuntimeOverride(runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
    return taskMethods.setStepRuntimeOverride(this._helpers, runId, stepKey, data);
  }

  async clearStepRuntimeOverride(runId: number, stepKey: string): Promise<any> {
    return taskMethods.clearStepRuntimeOverride(this._helpers, runId, stepKey);
  }

  async getStepEffectiveParams(runId: number, stepKey: string): Promise<any> {
    return taskMethods.getStepEffectiveParams(this._helpers, runId, stepKey);
  }

  async scanConflicts(): Promise<any> {
    return conflictMethods.scanConflicts(this._helpers);
  }

  async listConflicts(params?: Record<string, string>): Promise<any> {
    return conflictMethods.listConflicts(this._helpers, params);
  }

  async getConflict(conflictId: number): Promise<any> {
    return conflictMethods.getConflict(this._helpers, conflictId);
  }

  async resolveConflict(conflictId: number, data: Record<string, any>): Promise<any> {
    return conflictMethods.resolveConflict(this._helpers, conflictId, data);
  }

  async acknowledgeConflict(conflictId: number): Promise<any> {
    return knowledgeMethods.acknowledgeConflict(this._helpers, conflictId);
  }

  async ignoreConflict(conflictId: number): Promise<any> {
    return conflictMethods.ignoreConflict(this._helpers, conflictId);
  }

  async getConflictsDashboard(): Promise<any> {
    return conflictMethods.getConflictsDashboard(this._helpers);
  }

  async getConflictsTrend(args: { days?: number }): Promise<any> {
    return conflictMethods.getConflictsTrend(this._helpers, args);
  }

  async getConflictsByAgent(args: { limit?: number }): Promise<any> {
    return agentMethods.getConflictsByAgent(this._helpers, args);
  }

  async getConflictsStrategyStats(): Promise<any> {
    return conflictMethods.getConflictsStrategyStats(this._helpers);
  }

  async listSandboxTemplates(): Promise<any> {
    return sandboxMethods.listSandboxTemplates(this._helpers);
  }

  async instantiateSandboxTemplate(templateKey: string, data: Record<string, any>): Promise<any> {
    return sandboxMethods.instantiateSandboxTemplate(this._helpers, templateKey, data);
  }

  async autoResolveConflicts(): Promise<any> {
    return conflictMethods.autoResolveConflicts(this._helpers);
  }

  async orchestrate(): Promise<any> {
    return orchestratorMethods.orchestrate(this._helpers);
  }

  async getOrchestratorStatus(): Promise<any> {
    return orchestratorMethods.getOrchestratorStatus(this._helpers);
  }

  async listOrchestratorHistory(args?: { limit?: number; triggered_by?: string }): Promise<any> {
    return orchestratorMethods.listOrchestratorHistory(this._helpers, args);
  }

  async orchestratorDailyTrend(args?: { triggered_by?: string; since?: string; until?: string }): Promise<any> {
    return orchestratorMethods.orchestratorDailyTrend(this._helpers, args);
  }

  async getTaskDependencyChain(limit = 10, projectId?: number): Promise<any> {
    return taskMethods.getTaskDependencyChain(this._helpers, limit = 10, projectId);
  }

  async getAgentSkillMatching(limit = 10): Promise<any> {
    return agentMethods.getAgentSkillMatching(this._helpers, limit = 10);
  }

  async getWorkflowStepDurationHistogram(days = 30, limit = 10): Promise<any> {
    return workflowMethods.getWorkflowStepDurationHistogram(this._helpers, days = 30, limit = 10);
  }

  async getTaskCommentSentimentTrend(days = 30): Promise<any> {
    return taskMethods.getTaskCommentSentimentTrend(this._helpers, days = 30);
  }

  async getAgentTaskHandoffStats(days = 30, limit = 10): Promise<any> {
    return agentMethods.getAgentTaskHandoffStats(this._helpers, days = 30, limit = 10);
  }

  async getChannelActivityTrend(days = 14, limit = 10): Promise<any> {
    return messagingMethods.getChannelActivityTrend(this._helpers, days = 14, limit = 10);
  }

  async getAgentWorkloadForecast(days = 30, horizon = 3, limit = 10): Promise<any> {
    return agentMethods.getAgentWorkloadForecast(this._helpers, days = 30, horizon = 3, limit = 10);
  }

  async getKnowledgePropagationNetwork(days = 90, limit = 20): Promise<any> {
    return knowledgeMethods.getKnowledgePropagationNetwork(this._helpers, days = 90, limit = 20);
  }

  async getWorkflowStepBottleneckTimeline(days = 30, limit = 8): Promise<any> {
    return workflowMethods.getWorkflowStepBottleneckTimeline(this._helpers, days = 30, limit = 8);
  }

  async getProtocolDecisionLatency(days = 30): Promise<any> {
    return protocolMethods.getProtocolDecisionLatency(this._helpers, days = 30);
  }

  async getTaskReworkAnalysis(days = 30, limit = 15): Promise<any> {
    return taskMethods.getTaskReworkAnalysis(this._helpers, days = 30, limit = 15);
  }

  async getAgentSpecializationEvolution(weeks = 12, limit = 8): Promise<any> {
    return agentMethods.getAgentSpecializationEvolution(this._helpers, weeks = 12, limit = 8);
  }

  async getAgentExperiencesDecayAlerts(days = 30, minDrop = 0.1, limit = 10): Promise<any> {
    return agentMethods.getAgentExperiencesDecayAlerts(this._helpers, days = 30, minDrop = 0.1, limit = 10);
  }

  async getAgentCrossProjectEfficiency(days = 30, limit = 20): Promise<any> {
    return agentMethods.getAgentCrossProjectEfficiency(this._helpers, days = 30, limit = 20);
  }

  async getAgentCapabilitySupplyDemand(limit = 20): Promise<any> {
    return agentMethods.getAgentCapabilitySupplyDemand(this._helpers, limit = 20);
  }

  async getWorkflowStructuralComplexity(limit = 20): Promise<any> {
    return workflowMethods.getWorkflowStructuralComplexity(this._helpers, limit = 20);
  }

  async getAgentIdleRanking(limit = 20): Promise<any> {
    return agentMethods.getAgentIdleRanking(this._helpers, limit = 20);
  }

  async testConnection(): Promise<boolean> {
    return taskMethods.testConnection(this._helpers);
  }

  private getVersion(): string {
    try {
      // Get current directory for ES modules
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // Try multiple possible paths for package.json
      const possiblePaths = [
        join(__dirname, '../package.json'),
        join(__dirname, '../../package.json'),
        join(__dirname, '../../../package.json'),
        join(process.cwd(), 'package.json')
      ];

      for (const path of possiblePaths) {
        try {
          const packageJson = JSON.parse(readFileSync(path, 'utf-8'));
          if (packageJson.version) {
            return packageJson.version;
          }
        } catch (e) {
          // Continue to next path
        }
      }

      logger.warn('Could not read package version from any path');
      return '1.0.8'; // Use current version as fallback
    } catch (error) {
      logger.warn('Could not read package version:', error);
      return '1.0.8'; // Use current version as fallback
    }
  }
}