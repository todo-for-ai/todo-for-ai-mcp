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
  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    logger.info(`Getting tasks for project: ${args.project_name}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<any>('mcp/call', {
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

  /**
   * Get detailed task information by task ID
   */
  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    logger.info(`Getting task details for ID: ${args.task_id}`);
    
    try {
      const response = await this.client.post<Task>('mcp/call', {
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

  /**
   * Submit feedback for a completed or in-progress task
   */
  async submitTaskFeedback(args: SubmitTaskFeedbackArgs): Promise<any> {
    logger.info(`Submitting feedback for task ${args.task_id} in project ${args.project_name}`);
    
    try {
      const response = await this.client.post<any>('mcp/call', {
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

  /**
   * Create a new task in the specified project
   */
  async createTask(args: CreateTaskArgs): Promise<Task> {
    logger.info(`Creating task "${args.title}" in project ${args.project_id}`);

    try {
      const response = await this.client.post<Task>('mcp/call', {
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

  /**
   * Get detailed project information
   */
  async getProjectInfo(args: GetProjectInfoArgs): Promise<Project> {
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
      hasToken: !!this.config.apiToken,
      tokenPrefix: this.config.apiToken ? this.config.apiToken.substring(0, 8) + '...' : 'none',
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.apiTimeout
    });

    try {
      logger.debug('[API_CLIENT] Preparing MCP call request', {
        apiCallId,
        endpoint: 'mcp/call',
        method: 'POST',
        toolName: 'get_project_info',
        arguments: args,
        fullUrl: `${this.config.apiBaseUrl}/mcp/call`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiToken ? 'Bearer ***' : 'none',
          'User-Agent': this.client.defaults.headers['User-Agent']
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

      const response = await this.client.post<Project>('mcp/call', requestPayload);
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
          baseURL: this.config.apiBaseUrl,
          timeout: this.config.apiTimeout,
          hasToken: !!this.config.apiToken
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

  /**
   * List Agent identities owned by the current API token user.
   */
  async listAgents(args: ListAgentsArgs): Promise<ListResult<Agent>> {
    logger.info('[API_CLIENT] Listing agents', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents', {
        params: this.compactParams({
          status: args.status,
          search: args.search,
          page: args.page,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListResult<Agent>>(response.data);
    }, 'listAgents');
  }

  /**
   * Create an Agent identity for the current API token user.
   */
  async createAgent(args: CreateAgentArgs): Promise<Agent> {
    logger.info('[API_CLIENT] Creating agent', {
      name: args.name,
      kind: args.kind,
      status: args.status,
      capabilityCount: args.capabilities?.length || 0,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents', this.compactParams({
        name: args.name,
        description: args.description,
        kind: args.kind,
        status: args.status,
        provider: args.provider,
        model: args.model,
        capabilities: args.capabilities,
        config: args.config,
      }));

      return this.unwrapApiData<Agent>(response.data);
    }, 'createAgent');
  }

  /**
   * Self-register an Agent (idempotent by name+provider).
   */
  async selfRegisterAgent(args: { name: string; description?: string; kind?: string; provider?: string; model?: string; capabilities?: string[]; config?: Record<string, unknown>; collaboration_role?: string }): Promise<Agent> {
    logger.info(`[API_CLIENT] Self-registering agent "${args.name}"`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/self-register', this.compactParams(args));
      return this.unwrapApiData<Agent>(response.data);
    }, `selfRegisterAgent("${args.name}")`);
  }

  /**
   * Discover available Agents by capability, role, or kind.
   */
  async discoverAgents(args?: { capability?: string[]; collaboration_role?: string; kind?: string; status?: string }): Promise<Agent[]> {
    logger.info(`[API_CLIENT] Discovering agents`);

    return this.executeWithRetry(async () => {
      const params: Record<string, any> = {};
      if (args?.capability) params.capability = args.capability;
      if (args?.collaboration_role) params.collaboration_role = args.collaboration_role;
      if (args?.kind) params.kind = args.kind;
      if (args?.status) params.status = args.status;
      const response = await this.client.get('agents/discover', { params });
      return this.unwrapApiData<Agent[]>(response.data);
    }, 'discoverAgents');
  }

  /**
   * Update an existing Agent identity.
   */
  async updateAgent(args: UpdateAgentArgs): Promise<Agent> {
    logger.info(`[API_CLIENT] Updating agent ${args.agent_id}`, {
      name: args.name,
      kind: args.kind,
      status: args.status,
      capabilityCount: args.capabilities?.length,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/${args.agent_id}`, this.compactParams({
        name: args.name,
        description: args.description,
        kind: args.kind,
        status: args.status,
        provider: args.provider,
        model: args.model,
        capabilities: args.capabilities,
        config: args.config,
      }));

      return this.unwrapApiData<Agent>(response.data);
    }, `updateAgent(${args.agent_id})`);
  }

  /**
   * List Agent assignments that need human attention.
   */
  async listReviewQueue(args: ListReviewQueueArgs): Promise<ListResult<ReviewQueueItem>> {
    logger.info('[API_CLIENT] Listing Agent review queue', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/review-queue', {
        params: this.compactParams({
          action: args.action,
          page: args.page,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListResult<ReviewQueueItem>>(response.data);
    }, 'listReviewQueue');
  }

  /**
   * Record an Agent heartbeat.
   */
  async heartbeatAgent(args: HeartbeatAgentArgs): Promise<Agent> {
    logger.info(`[API_CLIENT] Recording heartbeat for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/heartbeat`, this.compactParams({
        status: args.status,
      }));

      return this.unwrapApiData<Agent>(response.data);
    }, `heartbeatAgent(${args.agent_id})`);
  }

  /**
   * List recommended tasks for an Agent based on capability matching.
   */
  async listRecommendedTasks(args: { agent_id: number; limit?: number; project_id?: number }): Promise<any[]> {
    logger.info(`[API_CLIENT] Listing recommended tasks for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const params: Record<string, any> = {};
      if (args.limit) params.limit = args.limit;
      if (args.project_id) params.project_id = args.project_id;
      const response = await this.client.get(`agents/${args.agent_id}/recommended-tasks`, { params });
      return this.unwrapApiData<any[]>(response.data);
    }, `listRecommendedTasks(${args.agent_id})`);
  }

  /**
   * List task assignments for an Agent.
   */
  async listAgentAssignments(args: ListAgentAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
    logger.info(`[API_CLIENT] Listing assignments for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${args.agent_id}/assignments`, {
        params: this.compactParams({
          state: args.state,
          page: args.page,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListResult<TaskAssignment>>(response.data);
    }, `listAgentAssignments(${args.agent_id})`);
  }

  /**
   * List Agent assignments for a task.
   */
  async listTaskAssignments(args: ListTaskAssignmentsArgs): Promise<ListResult<TaskAssignment>> {
    logger.info(`[API_CLIENT] Listing assignments for task ${args.task_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/tasks/${args.task_id}/assignments`, {
        params: this.compactParams({
          state: args.state,
          page: args.page,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListResult<TaskAssignment>>(response.data);
    }, `listTaskAssignments(${args.task_id})`);
  }

  /**
   * List collaboration events for a task.
   */
  async listTaskEvents(args: ListTaskEventsArgs): Promise<ListResult<TaskEvent>> {
    logger.info(`[API_CLIENT] Listing collaboration events for task ${args.task_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/tasks/${args.task_id}/events`, {
        params: this.compactParams({
          page: args.page,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListResult<TaskEvent>>(response.data);
    }, `listTaskEvents(${args.task_id})`);
  }

  /**
   * Post a collaboration message to a task timeline as a human or an Agent.
   */
  async postTaskEvent(args: PostTaskEventArgs): Promise<TaskEvent> {
    logger.info(`[API_CLIENT] Posting collaboration event for task ${args.task_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/tasks/${args.task_id}/events`, this.compactParams({
        event_type: args.event_type,
        content: args.content,
        agent_id: args.agent_id,
        to_agent_id: args.to_agent_id,
        payload: args.payload,
      }));

      return this.unwrapApiData<TaskEvent>(response.data);
    }, `postTaskEvent(${args.task_id})`);
  }

  /**
   * Retrieve collaboration events directed at a specific Agent (its @mention inbox).
   */
  async getAgentInbox(args: GetAgentInboxArgs): Promise<AgentInboxResult> {
    logger.info(`[API_CLIENT] Fetching inbox for agent ${args.agent_id}`, {
      sinceId: args.since_id,
    });

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        since_id: args.since_id,
        per_page: args.per_page,
        include_self: args.include_self,
      });
      const response = await this.client.get(`agents/${args.agent_id}/inbox`, { params });

      return this.unwrapApiData<AgentInboxResult>(response.data);
    }, `getAgentInbox(${args.agent_id})`);
  }

  /**
   * Hand off a task from its current Agent to another Agent.
   */
  async handoffTask(args: HandoffTaskArgs): Promise<HandoffTaskResult> {
    logger.info(`[API_CLIENT] Handing off task ${args.task_id} to agent ${args.to_agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/tasks/${args.task_id}/handoff`, this.compactParams({
        to_agent_id: args.to_agent_id,
        from_assignment_id: args.from_assignment_id,
        lease_seconds: args.lease_seconds,
        reason: args.reason,
        notes: args.notes,
      }));

      return this.unwrapApiData<HandoffTaskResult>(response.data);
    }, `handoffTask(${args.task_id})`);
  }

  /**
   * Coordinator auto-dispatch: assign claimable tasks to suitable worker Agents.
   */
  async dispatchTasks(args: DispatchTasksArgs): Promise<DispatchTasksResult> {
    logger.info(`[API_CLIENT] Coordinator ${args.agent_id} dispatching tasks`, {
      projectId: args.project_id,
      maxAssignments: args.max_assignments,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/dispatch`, this.compactParams({
        project_id: args.project_id,
        max_assignments: args.max_assignments,
        lease_seconds: args.lease_seconds,
        match_capabilities: args.match_capabilities,
        require_capability_match: args.require_capability_match,
        candidate_agent_ids: args.candidate_agent_ids,
        include_self: args.include_self,
      }));

      return this.unwrapApiData<DispatchTasksResult>(response.data);
    }, `dispatchTasks(${args.agent_id})`);
  }

  /**
   * Create a child task under a parent task (Agent-driven task decomposition).
   */
  async createSubtask(args: CreateSubtaskArgs): Promise<any> {
    logger.info(`[API_CLIENT] Creating subtask under task ${args.task_id}`, {
      title: args.title,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/tasks/${args.task_id}/subtasks`, this.compactParams({
        title: args.title,
        content: args.content,
        priority: args.priority,
        tags: args.tags,
        agent_id: args.agent_id,
      }));

      return this.unwrapApiData(response.data);
    }, `createSubtask(${args.task_id})`);
  }

  /**
   * Claim a specific task or the next claimable task for an Agent.
   */
  async claimAgentTask(args: ClaimAgentTaskArgs): Promise<ClaimAgentTaskResult | null> {
    logger.info(`[API_CLIENT] Claiming task for agent ${args.agent_id}`, {
      taskId: args.task_id,
      projectId: args.project_id,
    });

    return this.executeWithRetry(async () => {
      const runMetadata = {
        ...(args.run_metadata || {}),
        ...(args.dispatch_notes ? { dispatch_notes: args.dispatch_notes } : {}),
      };
      const response = await this.client.post(`agents/${args.agent_id}/claim`, this.compactParams({
        task_id: args.task_id,
        project_id: args.project_id,
        lease_seconds: args.lease_seconds,
        match_capabilities: args.match_capabilities,
        dispatch_source: args.dispatch_source,
        run_metadata: Object.keys(runMetadata).length > 0 ? runMetadata : undefined,
      }));

      return this.unwrapApiData<ClaimAgentTaskResult | null>(response.data);
    }, `claimAgentTask(${args.agent_id})`);
  }

  /**
   * Update an Agent task assignment state or progress.
   */
  async updateAgentAssignment(args: UpdateAgentAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
    logger.info(`[API_CLIENT] Updating assignment ${args.assignment_id} for agent ${args.agent_id}`, {
      state: args.state,
      progressRate: args.progress_rate,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.put(
        `agents/${args.agent_id}/assignments/${args.assignment_id}`,
        this.compactParams({
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

      return this.unwrapApiData<{ assignment: TaskAssignment; run: AgentRun | null }>(response.data);
    }, `updateAgentAssignment(${args.assignment_id})`);
  }

  /**
   * Update a task assignment as the current user or coordinator.
   */
  async updateTaskAssignment(args: UpdateTaskAssignmentArgs): Promise<{ assignment: TaskAssignment; run: AgentRun | null }> {
    logger.info(`[API_CLIENT] Updating assignment ${args.assignment_id} for task ${args.task_id}`, {
      state: args.state,
      progressRate: args.progress_rate,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.put(
        `agents/tasks/${args.task_id}/assignments/${args.assignment_id}`,
        this.compactParams({
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

      return this.unwrapApiData<{ assignment: TaskAssignment; run: AgentRun | null }>(response.data);
    }, `updateTaskAssignment(${args.assignment_id})`);
  }

  /**
   * List notifications for the current user.
   */
  async listNotifications(args: ListNotificationsArgs): Promise<ListNotificationsResult> {
    logger.info('[API_CLIENT] Listing notifications', {
      sinceId: args.since_id,
      unreadOnly: args.unread_only,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/notifications', {
        params: this.compactParams({
          since_id: args.since_id,
          unread_only: args.unread_only,
          per_page: args.per_page,
        }),
      });

      return this.unwrapApiData<ListNotificationsResult>(response.data);
    }, 'listNotifications');
  }

  /**
   * Mark notifications as read.
   */
  async markNotificationsRead(args: MarkNotificationsReadArgs): Promise<{ marked_count: number }> {
    logger.info('[API_CLIENT] Marking notifications as read', {
      ids: args.ids,
      all: args.all,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/notifications/read', this.compactParams({
        ids: args.ids,
        all: args.all,
      }));

      return this.unwrapApiData<{ marked_count: number }>(response.data);
    }, 'markNotificationsRead');
  }

  /**
   * Get shared context entries for a task.
   */
  async getSharedContext(args: GetSharedContextArgs): Promise<SharedContextEntry[]> {
    logger.info(`[API_CLIENT] Getting shared context for task ${args.task_id}`, {
      key: args.key,
    });

    return this.executeWithRetry(async () => {
      const params = this.compactParams({ key: args.key });
      const response = await this.client.get(`agents/tasks/${args.task_id}/shared-context`, { params });

      return this.unwrapApiData<SharedContextEntry[]>(response.data);
    }, `getSharedContext(${args.task_id})`);
  }

  /**
   * Create or update a shared context entry (upsert by task_id + key).
   */
  async setSharedContext(args: SetSharedContextArgs): Promise<SharedContextEntry> {
    logger.info(`[API_CLIENT] Setting shared context for task ${args.task_id}`, {
      key: args.key,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/tasks/${args.task_id}/shared-context`, this.compactParams({
        key: args.key,
        value: args.value,
        agent_id: args.agent_id,
      }));

      return this.unwrapApiData<SharedContextEntry>(response.data);
    }, `setSharedContext(${args.task_id})`);
  }

  /**
   * Delete a shared context entry.
   */
  async deleteSharedContext(args: DeleteSharedContextArgs): Promise<void> {
    logger.info(`[API_CLIENT] Deleting shared context entry ${args.entry_id} for task ${args.task_id}`);

    return this.executeWithRetry(async () => {
      await this.client.delete(`agents/tasks/${args.task_id}/shared-context/${args.entry_id}`);
    }, `deleteSharedContext(${args.entry_id})`);
  }

  /**
   * Get log entries for a specific AgentRun.
   */
  async getRunLogs(args: GetRunLogsArgs): Promise<GetRunLogsResult> {
    logger.info(`[API_CLIENT] Getting run logs for run ${args.run_id}`, {
      sinceId: args.since_id,
      level: args.level,
    });

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        since_id: args.since_id,
        level: args.level,
        per_page: args.per_page,
      });
      const response = await this.client.get(`agents/runs/${args.run_id}/logs`, { params });

      return this.unwrapApiData<GetRunLogsResult>(response.data);
    }, `getRunLogs(${args.run_id})`);
  }

  /**
   * Append log entries to a specific AgentRun.
   */
  async appendRunLogs(args: AppendRunLogsArgs): Promise<RunLogEntry[]> {
    logger.info(`[API_CLIENT] Appending ${args.entries.length} log entries to run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/runs/${args.run_id}/logs`, {
        entries: args.entries,
      });

      return this.unwrapApiData<RunLogEntry[]>(response.data);
    }, `appendRunLogs(${args.run_id})`);
  }

  /**
   * List task templates for the current user.
   */
  async listTaskTemplates(): Promise<TaskTemplate[]> {
    logger.info('[API_CLIENT] Listing task templates');

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/task-templates');
      return this.unwrapApiData<TaskTemplate[]>(response.data);
    }, 'listTaskTemplates');
  }

  /**
   * Create a new task template.
   */
  async createTaskTemplate(args: CreateTaskTemplateArgs): Promise<TaskTemplate> {
    logger.info(`[API_CLIENT] Creating task template "${args.name}"`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/task-templates', this.compactParams({
        name: args.name,
        description: args.description,
        title_template: args.title_template,
        content_template: args.content_template,
        priority: args.priority,
        tags: args.tags,
        is_ai_task: args.is_ai_task,
        capabilities: args.capabilities,
      }));

      return this.unwrapApiData<TaskTemplate>(response.data);
    }, `createTaskTemplate(${args.name})`);
  }

  /**
   * Instantiate a task from a template.
   */
  async instantiateTaskTemplate(args: InstantiateTaskTemplateArgs): Promise<any> {
    logger.info(`[API_CLIENT] Instantiating template ${args.template_id} into project ${args.project_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/task-templates/${args.template_id}/instantiate`, this.compactParams({
        project_id: args.project_id,
        title: args.title,
        content: args.content,
      }));

      return this.unwrapApiData(response.data);
    }, `instantiateTaskTemplate(${args.template_id})`);
  }

  /**
   * List workflow definitions.
   */
  async listWorkflows(args?: { is_active?: boolean; page?: number; per_page?: number }): Promise<ListResult<import('./types.js').WorkflowItem>> {
    logger.info('[API_CLIENT] Listing workflows');

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/workflows', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<ListResult<import('./types.js').WorkflowItem>>(response.data);
    }, 'listWorkflows');
  }

  /**
   * Create a new workflow definition with steps.
   */
  async createWorkflow(args: import('./types.js').CreateWorkflowArgs): Promise<import('./types.js').WorkflowItem> {
    logger.info(`[API_CLIENT] Creating workflow "${args.name}"`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/workflows', this.compactParams({
        name: args.name,
        description: args.description,
        definition: args.definition,
        is_active: args.is_active,
        steps: args.steps,
      }));
      return this.unwrapApiData<import('./types.js').WorkflowItem>(response.data);
    }, `createWorkflow(${args.name})`);
  }

  /**
   * Get a single workflow definition.
   */
  async getWorkflow(args: { workflow_id: number }): Promise<import('./types.js').WorkflowItem> {
    logger.info(`[API_CLIENT] Getting workflow ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflows/${args.workflow_id}`);
      return this.unwrapApiData<import('./types.js').WorkflowItem>(response.data);
    }, `getWorkflow(${args.workflow_id})`);
  }

  /**
   * Update a workflow definition.
   */
  async updateWorkflow(args: import('./types.js').UpdateWorkflowArgs): Promise<import('./types.js').WorkflowItem> {
    logger.info(`[API_CLIENT] Updating workflow ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/workflows/${args.workflow_id}`, this.compactParams({
        name: args.name,
        description: args.description,
        definition: args.definition,
        is_active: args.is_active,
        steps: args.steps,
      }));
      return this.unwrapApiData<import('./types.js').WorkflowItem>(response.data);
    }, `updateWorkflow(${args.workflow_id})`);
  }

  /**
   * Delete a workflow definition.
   */
  async deleteWorkflow(args: { workflow_id: number }): Promise<void> {
    logger.info(`[API_CLIENT] Deleting workflow ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      await this.client.delete(`agents/workflows/${args.workflow_id}`);
    }, `deleteWorkflow(${args.workflow_id})`);
  }

  /**
   * Launch a new run of a workflow.
   */
  async launchWorkflow(args: import('./types.js').LaunchWorkflowArgs): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Launching workflow ${args.workflow_id} in project ${args.project_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflows/${args.workflow_id}/runs`, this.compactParams({
        project_id: args.project_id,
        root_task_id: args.root_task_id,
        context: args.context,
      }));
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `launchWorkflow(${args.workflow_id})`);
  }

  /**
   * List workflow runs.
   */
  async listWorkflowRuns(args?: { workflow_id?: number; status?: string; page?: number; per_page?: number }): Promise<ListResult<import('./types.js').WorkflowRunItem>> {
    logger.info('[API_CLIENT] Listing workflow runs');

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/workflow-runs', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<ListResult<import('./types.js').WorkflowRunItem>>(response.data);
    }, 'listWorkflowRuns');
  }

  /**
   * Get a single workflow run.
   */
  async getWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Getting workflow run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflow-runs/${args.run_id}`);
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `getWorkflowRun(${args.run_id})`);
  }

  /**
   * Step-level real-time console for a workflow run: aggregates step runs with
   * sandbox executions, effective params, recent logs, and conflicts.
   */
  async getWorkflowRunConsole(args: { run_id: number; log_limit?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting workflow run console ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflow-runs/${args.run_id}/console`, {
        params: this.compactParams({
          log_limit: args.log_limit,
        }),
      });
      return this.unwrapApiData<any>(response.data);
    }, `getWorkflowRunConsole(${args.run_id})`);
  }

  /**
   * Cancel a running workflow.
   */
  async cancelWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Cancelling workflow run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-runs/${args.run_id}/cancel`);
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `cancelWorkflowRun(${args.run_id})`);
  }

  /**
   * Pause a running workflow. Running steps continue but no new steps start.
   */
  async pauseWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Pausing workflow run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-runs/${args.run_id}/pause`);
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `pauseWorkflowRun(${args.run_id})`);
  }

  /**
   * Resume a paused workflow. The DAG engine re-evaluates steps.
   */
  async resumeWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Resuming workflow run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-runs/${args.run_id}/resume`);
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `resumeWorkflowRun(${args.run_id})`);
  }

  /**
   * Retry a failed workflow by resetting failed/skipped steps.
   */
  async retryWorkflowRun(args: { run_id: number }): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Retrying workflow run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-runs/${args.run_id}/retry`);
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `retryWorkflowRun(${args.run_id})`);
  }

  /**
   * Mark a workflow step as completed (or failed) and advance the DAG.
   */
  async completeWorkflowStep(args: import('./types.js').CompleteWorkflowStepArgs): Promise<import('./types.js').WorkflowRunItem> {
    logger.info(`[API_CLIENT] Completing workflow step ${args.step_key} in run ${args.run_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(
        `agents/workflow-runs/${args.run_id}/steps/${args.step_key}/complete`,
        this.compactParams({
          success: args.success,
          error: args.error,
        })
      );
      return this.unwrapApiData<import('./types.js').WorkflowRunItem>(response.data);
    }, `completeWorkflowStep(${args.run_id}/${args.step_key})`);
  }

  /**
   * Register capabilities for an Agent at runtime (merge or replace).
   */
  async registerCapabilities(args: import('./types.js').RegisterCapabilitiesArgs): Promise<import('./types.js').Agent> {
    logger.info(`[API_CLIENT] Registering capabilities for agent ${args.agent_id}`, {
      capabilities: args.capabilities,
      mode: args.mode,
    });

    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/${args.agent_id}`, this.compactParams({
        capabilities: args.capabilities,
        _capability_mode: args.mode || 'merge',
      }));
      return this.unwrapApiData<import('./types.js').Agent>(response.data);
    }, `registerCapabilities(${args.agent_id})`);
  }

  /**
   * Trigger priority escalation for overdue tasks.
   */
  async escalateOverdueTasks(args?: { overdue_after_days?: number }): Promise<{ escalated_count: number; task_ids: number[] }> {
    logger.info('[API_CLIENT] Escalating overdue tasks', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/escalate-overdue', this.compactParams(args || {}));
      return this.unwrapApiData<{ escalated_count: number; task_ids: number[] }>(response.data);
    }, 'escalateOverdueTasks');
  }

  /**
   * Query the immutable audit trail.
   */
  async listAuditLogs(args?: { action?: string; resource_type?: string; resource_id?: number; actor_type?: string; actor_agent_id?: number; project_id?: number; page?: number; per_page?: number }): Promise<any> {
    logger.info('[API_CLIENT] Listing audit logs', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/audit-logs', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData(response.data);
    }, 'listAuditLogs');
  }

  /**
   * Unified security event feed: sandbox violations + conflicts + security audit.
   */
  async listSecurityEvents(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; page?: number; per_page?: number }): Promise<any> {
    logger.info('[API_CLIENT] Listing security events', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/security/events', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'listSecurityEvents');
  }

  /**
   * Export the unified security event feed as CSV text (same filters as list).
   */
  async exportSecurityEvents(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; format?: string }): Promise<string> {
    logger.info('[API_CLIENT] Exporting security events', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/security/events/export', {
        params: this.compactParams(args || {}),
        responseType: 'text',
        transformResponse: (data: any) => data,
      });
      // When responseType is text, axios returns the raw string in response.data.
      return typeof response.data === 'string' ? response.data : String(response.data ?? '');
    }, 'exportSecurityEvents');
  }

  /**
   * Daily aggregation of security events for trend visualization (same filters as list).
   */
  async securityEventsDailyTrend(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
    logger.info('[API_CLIENT] Fetching security events daily trend', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/security/events/daily-trend', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'securityEventsDailyTrend');
  }

  /**
   * Per-agent aggregation of security events for ranking (same filters as list).
   */
  async securityEventsByAgent(args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
    logger.info('[API_CLIENT] Fetching security events by agent', args);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/security/events/by-agent', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'securityEventsByAgent');
  }

  /**
   * Run a full platform health check.
   */
  async healthCheck(): Promise<{ stale_agents: number; stale_agent_ids: number[]; expired_leases: number; escalated_tasks: number; escalated_task_ids: number[] }> {
    logger.info('[API_CLIENT] Running health check');

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/health-check');
      return this.unwrapApiData<any>(response.data);
    }, 'healthCheck');
  }

  /**
   * Send a broadcast message from one Agent to all other active Agents.
   */
  async broadcastMessage(args: { agent_id: number; content: string; task_id?: number; event_type?: string; payload?: Record<string, unknown> }): Promise<{ recipient_count: number; recipient_agent_ids: number[] }> {
    logger.info(`[API_CLIENT] Broadcasting message from agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/broadcast`, this.compactParams({
        content: args.content,
        task_id: args.task_id,
        event_type: args.event_type,
        payload: args.payload,
      }));
      return this.unwrapApiData<{ recipient_count: number; recipient_agent_ids: number[] }>(response.data);
    }, `broadcastMessage(${args.agent_id})`);
  }

  async collaborationMetrics(args?: { project_id?: number; days?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Fetching collaboration metrics`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        project_id: args?.project_id,
        days: args?.days,
      });
      const response = await this.client.get('agents/dashboard/metrics', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'collaborationMetrics');
  }

  // Workflow Triggers
  async listWorkflowTriggers(args?: { workflow_id?: number; is_active?: boolean; page?: number; per_page?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Listing workflow triggers`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        workflow_id: args?.workflow_id,
        is_active: args?.is_active,
        page: args?.page,
        per_page: args?.per_page,
      });
      const response = await this.client.get('agents/workflow-triggers', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'listWorkflowTriggers');
  }

  async createWorkflowTrigger(args: { workflow_id: number; name: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
    logger.info(`[API_CLIENT] Creating workflow trigger for workflow ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/workflow-triggers', this.compactParams(args));
      return this.unwrapApiData<any>(response.data);
    }, `createWorkflowTrigger(${args.workflow_id})`);
  }

  async updateWorkflowTrigger(args: { trigger_id: number; name?: string; cron_expr?: string; one_shot_at?: string; is_active?: boolean; project_id?: number; root_task_id?: number; context_override?: Record<string, unknown> }): Promise<any> {
    logger.info(`[API_CLIENT] Updating workflow trigger ${args.trigger_id}`);

    return this.executeWithRetry(async () => {
      const { trigger_id, ...body } = args;
      const response = await this.client.put(`agents/workflow-triggers/${trigger_id}`, this.compactParams(body));
      return this.unwrapApiData<any>(response.data);
    }, `updateWorkflowTrigger(${args.trigger_id})`);
  }

  async deleteWorkflowTrigger(triggerId: number): Promise<any> {
    logger.info(`[API_CLIENT] Deleting workflow trigger ${triggerId}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/workflow-triggers/${triggerId}`);
      return this.unwrapApiData<any>(response.data);
    }, `deleteWorkflowTrigger(${triggerId})`);
  }

  async fireDueTriggers(): Promise<any> {
    logger.info(`[API_CLIENT] Firing due workflow triggers`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/fire-triggers');
      return this.unwrapApiData<any>(response.data);
    }, 'fireDueTriggers');
  }

  /**
   * Scan agents and mark those whose last heartbeat exceeds threshold as OFFLINE.
   */
  async markOfflineAgents(): Promise<{ marked_offline: number; agent_ids: number[] }> {
    logger.info(`[API_CLIENT] Marking offline agents`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/mark-offline-agents');
      return this.unwrapApiData<{ marked_offline: number; agent_ids: number[] }>(response.data);
    }, 'markOfflineAgents');
  }

  /**
   * Scan running workflow steps and mark timed-out ones as FAILED.
   */
  async timeoutWorkflowSteps(): Promise<{ timed_out: number; steps: Array<{ step_key: string; run_id: number; elapsed_seconds: number; timeout_seconds: number }> }> {
    logger.info(`[API_CLIENT] Checking workflow step timeouts`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/timeout-workflow-steps');
      return this.unwrapApiData<any>(response.data);
    }, 'timeoutWorkflowSteps');
  }

  // Agent Direct Messaging
  async sendAgentMessage(args: { from_agent_id: number; to_agent_id: number; content: string; task_id?: number; message_type?: string; metadata?: Record<string, unknown> }): Promise<any> {
    logger.info(`[API_CLIENT] Sending message from agent ${args.from_agent_id} to agent ${args.to_agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.from_agent_id}/message/${args.to_agent_id}`, this.compactParams({
        content: args.content,
        task_id: args.task_id,
        message_type: args.message_type,
        metadata: args.metadata,
      }));
      return this.unwrapApiData<any>(response.data);
    }, `sendAgentMessage(${args.from_agent_id}->${args.to_agent_id})`);
  }

  async getAgentMessages(args: { agent_id: number; page?: number; per_page?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting messages for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        page: args.page,
        per_page: args.per_page,
      });
      const response = await this.client.get(`agents/${args.agent_id}/messages`, { params });
      return this.unwrapApiData<any>(response.data);
    }, `getAgentMessages(${args.agent_id})`);
  }

  async getAgentCollaborators(args: { agent_id: number; limit?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting collaborators for agent ${args.agent_id}`);
    return this.executeWithRetry(async () => {
      const params = this.compactParams({ limit: args.limit });
      const response = await this.client.get(`agents/${args.agent_id}/collaborators`, { params });
      return this.unwrapApiData<any>(response.data);
    }, `getAgentCollaborators(${args.agent_id})`);
  }

  async collaborationGraph(args?: { limit?: number }): Promise<any> {
    logger.info('[API_CLIENT] Fetching collaboration graph');
    return this.executeWithRetry(async () => {
      const params = this.compactParams(args || {});
      const response = await this.client.get('agents/collaboration-graph', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'collaborationGraph');
  }

  // --- Collaboration Channels ---
  async listChannels(args?: { project_id?: number; task_id?: number }): Promise<any[]> {
    logger.info(`[API_CLIENT] Listing collaboration channels`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({ project_id: args?.project_id, task_id: args?.task_id });
      const response = await this.client.get('agents/channels', { params });
      return this.unwrapApiData<any[]>(response.data);
    }, 'listChannels');
  }

  async createChannel(args: { name: string; description?: string; project_id?: number; task_id?: number; agent_ids?: number[] }): Promise<any> {
    logger.info(`[API_CLIENT] Creating channel "${args.name}"`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/channels', this.compactParams(args));
      return this.unwrapApiData<any>(response.data);
    }, `createChannel("${args.name}")`);
  }

  async sendChannelMessage(args: { channel_id: number; agent_id?: number; content: string; message_type?: string }): Promise<any> {
    logger.info(`[API_CLIENT] Sending message to channel #${args.channel_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/channels/${args.channel_id}/messages`, this.compactParams(args));
      return this.unwrapApiData<any>(response.data);
    }, `sendChannelMessage(${args.channel_id})`);
  }

  async listChannelMessages(args: { channel_id: number; page?: number; per_page?: number }): Promise<any[]> {
    logger.info(`[API_CLIENT] Listing messages in channel #${args.channel_id}`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({ page: args.page, per_page: args.per_page });
      const response = await this.client.get(`agents/channels/${args.channel_id}/messages`, { params });
      return this.unwrapApiData<any[]>(response.data);
    }, `listChannelMessages(${args.channel_id})`);
  }

  // Workflow Templates
  async listWorkflowTemplates(args?: { category?: string }): Promise<any> {
    logger.info(`[API_CLIENT] Listing workflow templates`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({ category: args?.category });
      const response = await this.client.get('agents/workflow-templates', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'listWorkflowTemplates');
  }

  async getWorkflowTemplate(templateKey: string): Promise<any> {
    logger.info(`[API_CLIENT] Getting workflow template ${templateKey}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflow-templates/${templateKey}`);
      return this.unwrapApiData<any>(response.data);
    }, `getWorkflowTemplate(${templateKey})`);
  }

  async instantiateWorkflowTemplate(args: { template_key: string; name?: string; project_id?: number; root_task_id?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Instantiating workflow template ${args.template_key}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-templates/${args.template_key}/instantiate`, this.compactParams(args));
      return this.unwrapApiData<any>(response.data);
    }, `instantiateWorkflowTemplate(${args.template_key})`);
  }

  // Collaboration Templates
  async listCollaborationTemplates(params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing collaboration templates`);

    return this.executeWithRetry(async () => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const response = await this.client.get(`agents/collaboration-templates${qs}`);
      return this.unwrapApiData<any>(response.data);
    }, 'listCollaborationTemplates');
  }

  async createCollaborationTemplate(args: { name: string; agent_specs: any[]; description?: string; category?: string; workflow_id?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Creating collaboration template ${args.name}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/collaboration-templates', args);
      return this.unwrapApiData<any>(response.data);
    }, `createCollaborationTemplate(${args.name})`);
  }

  async deleteCollaborationTemplate(templateId: number): Promise<any> {
    logger.info(`[API_CLIENT] Deleting collaboration template ${templateId}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/collaboration-templates/${templateId}`);
      return this.unwrapApiData<any>(response.data);
    }, `deleteCollaborationTemplate(${templateId})`);
  }

  async instantiateCollaborationTemplate(args: { template_key: string; project_id?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Instantiating collaboration template ${args.template_key}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/collaboration-templates/${args.template_key}/instantiate`, args);
      return this.unwrapApiData<any>(response.data);
    }, `instantiateCollaborationTemplate(${args.template_key})`);
  }

  // Knowledge Base
  async listKnowledgeEntries(args: { agent_id: number; domain?: string; entry_type?: string; tag?: string; search?: string; include_content?: boolean }): Promise<any> {
    logger.info(`[API_CLIENT] Listing knowledge entries for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        domain: args.domain,
        entry_type: args.entry_type,
        tag: args.tag,
        search: args.search,
        include_content: args.include_content,
      });
      const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      const response = await this.client.get(`agents/${args.agent_id}/knowledge${qs}`);
      return this.unwrapApiData<any>(response.data);
    }, `listKnowledgeEntries(${args.agent_id})`);
  }

  async createKnowledgeEntry(args: { agent_id: number; title: string; content: string; domain?: string; tags?: string[]; entry_type?: string; source_task_id?: number; confidence?: number; shared_with_project?: boolean; project_id?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Creating knowledge entry for agent ${args.agent_id}: ${args.title}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/knowledge`, args);
      return this.unwrapApiData<any>(response.data);
    }, `createKnowledgeEntry(${args.agent_id})`);
  }

  async getKnowledgeEntry(args: { agent_id: number; entry_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${args.agent_id}/knowledge/${args.entry_id}`);
      return this.unwrapApiData<any>(response.data);
    }, `getKnowledgeEntry(${args.entry_id})`);
  }

  async updateKnowledgeEntry(args: { agent_id: number; entry_id: number; title?: string; content?: string; domain?: string; tags?: string[]; confidence?: number; is_valid?: boolean; shared_with_project?: boolean }): Promise<any> {
    logger.info(`[API_CLIENT] Updating knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/${args.agent_id}/knowledge/${args.entry_id}`, args);
      return this.unwrapApiData<any>(response.data);
    }, `updateKnowledgeEntry(${args.entry_id})`);
  }

  async deleteKnowledgeEntry(args: { agent_id: number; entry_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Deleting knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/${args.agent_id}/knowledge/${args.entry_id}`);
      return this.unwrapApiData<any>(response.data);
    }, `deleteKnowledgeEntry(${args.entry_id})`);
  }

  async searchKnowledge(args: { agent_id: number; q?: string; domain?: string; tags?: string; entry_type?: string; limit?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Searching knowledge for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        q: args.q,
        domain: args.domain,
        tags: args.tags,
        entry_type: args.entry_type,
        limit: args.limit,
      });
      const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      const response = await this.client.get(`agents/${args.agent_id}/knowledge/search${qs}`);
      return this.unwrapApiData<any>(response.data);
    }, `searchKnowledge(${args.agent_id})`);
  }

  async listSharedKnowledge(args?: { domain?: string; entry_type?: string; search?: string }): Promise<any> {
    logger.info(`[API_CLIENT] Listing shared knowledge`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams({
        domain: args?.domain,
        entry_type: args?.entry_type,
        search: args?.search,
      });
      const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      const response = await this.client.get(`agents/knowledge/shared${qs}`);
      return this.unwrapApiData<any>(response.data);
    }, 'listSharedKnowledge');
  }

  async autoExtractKnowledge(args: { agent_id: number; limit?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Auto-extracting knowledge for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/knowledge/auto-extract`, args);
      return this.unwrapApiData<any>(response.data);
    }, `autoExtractKnowledge(${args.agent_id})`);
  }

  // Workflow Version Management
  async listWorkflowVersions(args: { workflow_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Listing workflow versions for ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflows/${args.workflow_id}/versions`);
      return this.unwrapApiData<any>(response.data);
    }, `listWorkflowVersions(${args.workflow_id})`);
  }

  async getWorkflowVersion(args: { workflow_id: number; version_number: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting workflow version ${args.version_number} for ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflows/${args.workflow_id}/versions/${args.version_number}`);
      return this.unwrapApiData<any>(response.data);
    }, `getWorkflowVersion(${args.workflow_id}, v${args.version_number})`);
  }

  async rollbackWorkflow(args: { workflow_id: number; version: number }): Promise<any> {
    logger.info(`[API_CLIENT] Rolling back workflow ${args.workflow_id} to version ${args.version}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflows/${args.workflow_id}/rollback`, args);
      return this.unwrapApiData<any>(response.data);
    }, `rollbackWorkflow(${args.workflow_id}, v${args.version})`);
  }

  async diffWorkflowVersions(args: { workflow_id: number; v1: number; v2: number }): Promise<any> {
    logger.info(`[API_CLIENT] Diffing workflow versions v${args.v1} vs v${args.v2} for ${args.workflow_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflows/${args.workflow_id}/diff/${args.v1}/${args.v2}`);
      return this.unwrapApiData<any>(response.data);
    }, `diffWorkflowVersions(${args.workflow_id})`);
  }

  // Collaboration Protocols
  async listProtocols(args?: { project_id?: number; status?: string; protocol_type?: string; initiator_agent_id?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Listing collaboration protocols`);

    return this.executeWithRetry(async () => {
      const params = this.compactParams(args || {});
      const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      const response = await this.client.get(`agents/protocols${qs}`);
      return this.unwrapApiData<any>(response.data);
    }, 'listProtocols');
  }

  async createProtocol(args: { protocol_type: string; title: string; initiator_agent_id: number; description?: string; channel_id?: number; project_id?: number; task_id?: number; config?: Record<string, unknown>; deadline?: string }): Promise<any> {
    logger.info(`[API_CLIENT] Creating protocol: ${args.title}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/protocols', args);
      return this.unwrapApiData<any>(response.data);
    }, `createProtocol(${args.title})`);
  }

  async getProtocol(args: { protocol_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting protocol ${args.protocol_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/protocols/${args.protocol_id}`);
      return this.unwrapApiData<any>(response.data);
    }, `getProtocol(${args.protocol_id})`);
  }

  async respondToProtocol(args: { protocol_id: number; agent_id: number; message_type: string; content?: string; payload?: Record<string, unknown> }): Promise<any> {
    logger.info(`[API_CLIENT] Responding to protocol ${args.protocol_id}: ${args.message_type}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/protocols/${args.protocol_id}/respond`, args);
      return this.unwrapApiData<any>(response.data);
    }, `respondToProtocol(${args.protocol_id})`);
  }

  async resolveProtocol(args: { protocol_id: number; resolution: string; result?: Record<string, unknown> }): Promise<any> {
    logger.info(`[API_CLIENT] Resolving protocol ${args.protocol_id}: ${args.resolution}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/protocols/${args.protocol_id}/resolve`, args);
      return this.unwrapApiData<any>(response.data);
    }, `resolveProtocol(${args.protocol_id})`);
  }

  // Agent Reputation
  async getAgentReputation(args: { agent_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting reputation for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${args.agent_id}/reputation`);
      return this.unwrapApiData<any>(response.data);
    }, `getAgentReputation(${args.agent_id})`);
  }

  async listReputations(): Promise<any> {
    logger.info(`[API_CLIENT] Listing reputations`);

    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/reputations');
      return this.unwrapApiData<any>(response.data);
    }, 'listReputations');
  }

  async recalculateReputation(args: { agent_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Recalculating reputation for agent ${args.agent_id}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${args.agent_id}/reputation/recalculate`, {});
      return this.unwrapApiData<any>(response.data);
    }, `recalculateReputation(${args.agent_id})`);
  }

  async getAgentReputationHistory(args: { agent_id: number; limit?: number; since?: string; until?: string }): Promise<any> {
    logger.info(`[API_CLIENT] Getting reputation history for agent ${args.agent_id}`);

    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.since) params.since = args.since;
    if (args.until) params.until = args.until;

    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${args.agent_id}/reputation/history`, { params });
      return this.unwrapApiData<any>(response.data);
    }, `getAgentReputationHistory(${args.agent_id})`);
  }

  // ---- Agent Experience (Collective Intelligence) ----

  async listAgentExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing experiences for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/experiences`, {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, `listAgentExperiences(${agentId})`);
  }

  async createAgentExperience(agentId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Creating experience for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences`, data);
      return this.unwrapApiData<any>(response.data);
    }, `createAgentExperience(${agentId})`);
  }

  async getAgentExperience(agentId: number, experienceId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting experience ${experienceId} for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/experiences/${experienceId}`);
      return this.unwrapApiData<any>(response.data);
    }, `getAgentExperience(${agentId}, ${experienceId})`);
  }

  async updateAgentExperience(agentId: number, experienceId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Updating experience ${experienceId} for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/${agentId}/experiences/${experienceId}`, data);
      return this.unwrapApiData<any>(response.data);
    }, `updateAgentExperience(${agentId}, ${experienceId})`);
  }

  async deleteAgentExperience(agentId: number, experienceId: number): Promise<any> {
    logger.info(`[API_CLIENT] Deleting experience ${experienceId} for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/${agentId}/experiences/${experienceId}`);
      return this.unwrapApiData<any>(response.data);
    }, `deleteAgentExperience(${agentId}, ${experienceId})`);
  }

  async recommendExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Recommending experiences for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/experiences/recommend`, {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, `recommendExperiences(${agentId})`);
  }

  async shareAgentExperience(agentId: number, experienceId: number): Promise<any> {
    logger.info(`[API_CLIENT] Sharing experience ${experienceId} for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences/${experienceId}/share`, {});
      return this.unwrapApiData<any>(response.data);
    }, `shareAgentExperience(${agentId}, ${experienceId})`);
  }

  async learnFromExperience(agentId: number, experienceId: number): Promise<any> {
    logger.info(`[API_CLIENT] Agent ${agentId} learning from experience ${experienceId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences/${experienceId}/learn`, {});
      return this.unwrapApiData<any>(response.data);
    }, `learnFromExperience(${agentId}, ${experienceId})`);
  }

  async listSharedExperiences(agentId: number, params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing shared experiences for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/experiences/shared`, {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, `listSharedExperiences(${agentId})`);
  }

  async autoExtractExperiences(agentId: number): Promise<any> {
    logger.info(`[API_CLIENT] Auto-extracting experiences for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences/auto-extract`, {});
      return this.unwrapApiData<any>(response.data);
    }, `autoExtractExperiences(${agentId})`);
  }

  // ---- Cross-Project Agent Collaboration ----

  async authorizeCrossProjectAgent(args: { agent_id: number; project_id: number; role_in_project?: string; capabilities_override?: string[]; max_concurrent_tasks?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Authorizing agent ${args.agent_id} for project ${args.project_id}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/cross-project/authorize', args);
      return this.unwrapApiData<any>(response.data);
    }, `authorizeCrossProjectAgent(${args.agent_id}, ${args.project_id})`);
  }

  async revokeCrossProjectAgent(agentId: number, projectId: number): Promise<any> {
    logger.info(`[API_CLIENT] Revoking agent ${agentId} from project ${projectId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/cross-project/revoke', { agent_id: agentId, project_id: projectId });
      return this.unwrapApiData<any>(response.data);
    }, `revokeCrossProjectAgent(${agentId}, ${projectId})`);
  }

  async listAgentCrossProjects(agentId: number): Promise<any> {
    logger.info(`[API_CLIENT] Listing cross-project access for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/cross-project`);
      return this.unwrapApiData<any>(response.data);
    }, `listAgentCrossProjects(${agentId})`);
  }

  async listProjectExternalAgents(projectId: number): Promise<any> {
    logger.info(`[API_CLIENT] Listing external agents for project ${projectId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/projects/${projectId}/external-agents`);
      return this.unwrapApiData<any>(response.data);
    }, `listProjectExternalAgents(${projectId})`);
  }

  async discoverCrossProjectAgents(params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Discovering cross-project agents`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/cross-project/discover-agents', {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'discoverCrossProjectAgents');
  }

  async findCapableAgentsCrossProject(params: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Finding capable agents cross-project with capabilities: ${params.capabilities}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/cross-project/capable-agents', {
        params: this.compactParams(params),
      });
      return this.unwrapApiData<any>(response.data);
    }, `findCapableAgentsCrossProject(${params.capabilities})`);
  }

  // ---- Experience Decay & Validation ----

  async applyExperienceDecay(agentId: number, params?: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Applying experience decay for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences/decay`, params || {});
      return this.unwrapApiData<any>(response.data);
    }, `applyExperienceDecay(${agentId})`);
  }

  async validateExperience(agentId: number, experienceId: number, data: { is_accurate: boolean }): Promise<any> {
    logger.info(`[API_CLIENT] Validating experience ${experienceId} by agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/experiences/${experienceId}/validate`, data);
      return this.unwrapApiData<any>(response.data);
    }, `validateExperience(${agentId}, ${experienceId})`);
  }

  async getExperienceValidationStats(agentId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting validation stats for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/experiences/validation-stats`);
      return this.unwrapApiData<any>(response.data);
    }, `getExperienceValidationStats(${agentId})`);
  }

  async decayAllExperiences(params?: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Decaying all experiences`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/decay-all-experiences', params || {});
      return this.unwrapApiData<any>(response.data);
    }, 'decayAllExperiences');
  }

  // ---- Adaptive Capabilities ----

  async suggestCapabilityAdaptation(agentId: number): Promise<any> {
    logger.info(`[API_CLIENT] Suggesting capability adaptation for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/adapt-capabilities`);
      return this.unwrapApiData<any>(response.data);
    }, `suggestCapabilityAdaptation(${agentId})`);
  }

  async applyCapabilityAdaptation(agentId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Applying capability adaptation for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/adapt-capabilities`, data);
      return this.unwrapApiData<any>(response.data);
    }, `applyCapabilityAdaptation(${agentId})`);
  }

  // ---- Cross-Project Task Discovery & Assignment ----

  async findCrossProjectTasks(agentId: number, params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Finding cross-project tasks for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/cross-project-tasks`, {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, `findCrossProjectTasks(${agentId})`);
  }

  async claimCrossProjectTask(agentId: number, taskId: number, data?: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Agent ${agentId} claiming cross-project task ${taskId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/claim-cross-project-task/${taskId}`, data || {});
      return this.unwrapApiData<any>(response.data);
    }, `claimCrossProjectTask(${agentId}, ${taskId})`);
  }

  // ---- Protocol Analytics & Deliberation ----

  async getProtocolAnalytics(params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Getting protocol analytics`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/protocols/analytics', {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getProtocolAnalytics');
  }

  async addDeliberationMessage(protocolId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Adding deliberation message to protocol ${protocolId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/protocols/${protocolId}/deliberate`, data);
      return this.unwrapApiData<any>(response.data);
    }, `addDeliberationMessage(${protocolId})`);
  }

  // ---- Increment 85: Agent collaboration sandbox ----

  async listSandboxes(params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing sandboxes`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/sandboxes', {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'listSandboxes');
  }

  async createSandbox(data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Creating sandbox ${data?.name}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/sandboxes', data);
      return this.unwrapApiData<any>(response.data);
    }, 'createSandbox');
  }

  async getSandbox(sandboxId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting sandbox ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/sandboxes/${sandboxId}`);
      return this.unwrapApiData<any>(response.data);
    }, `getSandbox(${sandboxId})`);
  }

  async updateSandbox(sandboxId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Updating sandbox ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/sandboxes/${sandboxId}`, data);
      return this.unwrapApiData<any>(response.data);
    }, `updateSandbox(${sandboxId})`);
  }

  async deleteSandbox(sandboxId: number): Promise<any> {
    logger.info(`[API_CLIENT] Deleting sandbox ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/sandboxes/${sandboxId}`);
      return this.unwrapApiData<any>(response.data);
    }, `deleteSandbox(${sandboxId})`);
  }

  async bindAgentSandbox(agentId: number, data: { sandbox_id: number }): Promise<any> {
    logger.info(`[API_CLIENT] Binding sandbox ${data.sandbox_id} to agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/${agentId}/sandbox/bind`, data);
      return this.unwrapApiData<any>(response.data);
    }, `bindAgentSandbox(${agentId})`);
  }

  async getAgentSandbox(agentId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting sandbox for agent ${agentId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/${agentId}/sandbox`);
      return this.unwrapApiData<any>(response.data);
    }, `getAgentSandbox(${agentId})`);
  }

  async checkSandboxAction(sandboxId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Checking sandbox action ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/sandboxes/${sandboxId}/check`, data);
      return this.unwrapApiData<any>(response.data);
    }, `checkSandboxAction(${sandboxId})`);
  }

  async startSandboxExecution(sandboxId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Starting sandbox execution for sandbox ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/sandboxes/${sandboxId}/executions`, data);
      return this.unwrapApiData<any>(response.data);
    }, `startSandboxExecution(${sandboxId})`);
  }

  async completeSandboxExecution(executionId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Completing sandbox execution ${executionId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/executions/${executionId}/complete`, data);
      return this.unwrapApiData<any>(response.data);
    }, `completeSandboxExecution(${executionId})`);
  }

  async revokeSandboxExecution(executionId: number): Promise<any> {
    logger.info(`[API_CLIENT] Revoking sandbox execution ${executionId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/executions/${executionId}/revoke`, {});
      return this.unwrapApiData<any>(response.data);
    }, `revokeSandboxExecution(${executionId})`);
  }

  async reportSandboxViolation(executionId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Reporting sandbox violation for execution ${executionId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/executions/${executionId}/violation`, data);
      return this.unwrapApiData<any>(response.data);
    }, `reportSandboxViolation(${executionId})`);
  }

  async getSandboxExecution(executionId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting sandbox execution ${executionId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/executions/${executionId}`);
      return this.unwrapApiData<any>(response.data);
    }, `getSandboxExecution(${executionId})`);
  }

  async listSandboxExecutions(sandboxId: number, params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing sandbox executions for sandbox ${sandboxId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/sandboxes/${sandboxId}/executions`, {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, `listSandboxExecutions(${sandboxId})`);
  }

  async getSandboxDashboard(): Promise<any> {
    logger.info(`[API_CLIENT] Getting sandbox dashboard`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/sandboxes/dashboard');
      return this.unwrapApiData<any>(response.data);
    }, 'getSandboxDashboard');
  }

  async getStepSandboxExecution(runId: number, stepKey: string): Promise<any> {
    logger.info(`[API_CLIENT] Getting sandbox execution for step ${stepKey} in run ${runId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/sandbox-execution`);
      return this.unwrapApiData<any>(response.data);
    }, `getStepSandboxExecution(${runId},${stepKey})`);
  }

  async reportStepSandboxViolation(runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Reporting sandbox violation for step ${stepKey} in run ${runId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/sandbox-violation`, data);
      return this.unwrapApiData<any>(response.data);
    }, `reportStepSandboxViolation(${runId},${stepKey})`);
  }

  async setStepRuntimeOverride(runId: number, stepKey: string, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Setting runtime override for step ${stepKey} in run ${runId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.put(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/override`, data);
      return this.unwrapApiData<any>(response.data);
    }, `setStepRuntimeOverride(${runId},${stepKey})`);
  }

  async clearStepRuntimeOverride(runId: number, stepKey: string): Promise<any> {
    logger.info(`[API_CLIENT] Clearing runtime override for step ${stepKey} in run ${runId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.delete(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/override`);
      return this.unwrapApiData<any>(response.data);
    }, `clearStepRuntimeOverride(${runId},${stepKey})`);
  }

  async getStepEffectiveParams(runId: number, stepKey: string): Promise<any> {
    logger.info(`[API_CLIENT] Getting effective params for step ${stepKey} in run ${runId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/workflow-runs/${runId}/steps/${encodeURIComponent(stepKey)}/effective-params`);
      return this.unwrapApiData<any>(response.data);
    }, `getStepEffectiveParams(${runId},${stepKey})`);
  }

  // ---- Increment 89: Conflict detection & resolution ----

  async scanConflicts(): Promise<any> {
    logger.info(`[API_CLIENT] Scanning for conflicts`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/conflicts/scan', {});
      return this.unwrapApiData<any>(response.data);
    }, 'scanConflicts');
  }

  async listConflicts(params?: Record<string, string>): Promise<any> {
    logger.info(`[API_CLIENT] Listing conflicts`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/conflicts', {
        params: this.compactParams(params || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'listConflicts');
  }

  async getConflict(conflictId: number): Promise<any> {
    logger.info(`[API_CLIENT] Getting conflict ${conflictId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`agents/conflicts/${conflictId}`);
      return this.unwrapApiData<any>(response.data);
    }, `getConflict(${conflictId})`);
  }

  async resolveConflict(conflictId: number, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Resolving conflict ${conflictId} with strategy ${data?.strategy}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/conflicts/${conflictId}/resolve`, data);
      return this.unwrapApiData<any>(response.data);
    }, `resolveConflict(${conflictId})`);
  }

  async acknowledgeConflict(conflictId: number): Promise<any> {
    logger.info(`[API_CLIENT] Acknowledging conflict ${conflictId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/conflicts/${conflictId}/acknowledge`, {});
      return this.unwrapApiData<any>(response.data);
    }, `acknowledgeConflict(${conflictId})`);
  }

  async ignoreConflict(conflictId: number): Promise<any> {
    logger.info(`[API_CLIENT] Ignoring conflict ${conflictId}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/conflicts/${conflictId}/ignore`, {});
      return this.unwrapApiData<any>(response.data);
    }, `ignoreConflict(${conflictId})`);
  }

  async getConflictsDashboard(): Promise<any> {
    logger.info(`[API_CLIENT] Getting conflicts dashboard`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/conflicts/dashboard');
      return this.unwrapApiData<any>(response.data);
    }, 'getConflictsDashboard');
  }

  async getConflictsTrend(args: { days?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting conflicts trend`);
    const params: Record<string, string> = {};
    if (args?.days) params.days = String(args.days);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/conflicts/trend', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'getConflictsTrend');
  }

  async getConflictsByAgent(args: { limit?: number }): Promise<any> {
    logger.info(`[API_CLIENT] Getting conflicts by agent`);
    const params: Record<string, string> = {};
    if (args?.limit) params.limit = String(args.limit);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/conflicts/by-agent', { params });
      return this.unwrapApiData<any>(response.data);
    }, 'getConflictsByAgent');
  }

  async listSandboxTemplates(): Promise<any> {
    logger.info(`[API_CLIENT] Listing sandbox templates`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/sandbox-templates');
      return this.unwrapApiData<any>(response.data);
    }, 'listSandboxTemplates');
  }

  async instantiateSandboxTemplate(templateKey: string, data: Record<string, any>): Promise<any> {
    logger.info(`[API_CLIENT] Instantiating sandbox template ${templateKey}`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post(`agents/sandbox-templates/${encodeURIComponent(templateKey)}/instantiate`, data);
      return this.unwrapApiData<any>(response.data);
    }, `instantiateSandboxTemplate(${templateKey})`);
  }

  async autoResolveConflicts(): Promise<any> {
    logger.info(`[API_CLIENT] Auto-resolving conflicts`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/auto-resolve-conflicts', {});
      return this.unwrapApiData<any>(response.data);
    }, 'autoResolveConflicts');
  }

  /**
   * Global collaboration orchestrator: full maintenance cycle in one call.
   */
  async orchestrate(): Promise<any> {
    logger.info(`[API_CLIENT] Running global orchestration`);
    return this.executeWithRetry(async () => {
      const response = await this.client.post('agents/maintenance/orchestrate', {});
      return this.unwrapApiData<any>(response.data);
    }, 'orchestrate');
  }

  /**
   * Built-in orchestrator scheduler state + last run summary.
   */
  async getOrchestratorStatus(): Promise<any> {
    logger.info(`[API_CLIENT] Getting orchestrator status`);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/maintenance/orchestrator/status');
      return this.unwrapApiData<any>(response.data);
    }, 'getOrchestratorStatus');
  }

  /**
   * Recent orchestration run records + trend aggregates.
   */
  async listOrchestratorHistory(args?: { limit?: number; triggered_by?: string }): Promise<any> {
    logger.info('[API_CLIENT] Listing orchestrator history', args);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/maintenance/orchestrator/history', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'listOrchestratorHistory');
  }

  async orchestratorDailyTrend(args?: { triggered_by?: string; since?: string; until?: string }): Promise<any> {
    logger.info('[API_CLIENT] Fetching orchestrator daily trend', args);
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/maintenance/orchestrator/daily-trend', {
        params: this.compactParams(args || {}),
      });
      return this.unwrapApiData<any>(response.data);
    }, 'orchestratorDailyTrend');
  }

  /**
   * Test connection to the Todo API
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing connection to Todo API...');
      const response = await this.client.get('/health');
      logger.info('Connection test successful');
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
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
