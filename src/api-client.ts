import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import https from 'https';
import {
  TodoConfig,
  ApiResponse,
  ApiError,
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  CreateTaskArgs,
  GetProjectInfoArgs,
  Task,
  Project,
} from './types.js';
import { logger } from './logger.js';
import { VERSION, PACKAGE_NAME } from './version.js';
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
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 最小请求间隔500ms

  constructor(config: TodoConfig) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 5,
      retryDelay: 2000, // 增加基础延迟到2秒
      retryDelayMultiplier: 2,
    };

    logger.info('[API_CLIENT] Initializing TodoApiClient', {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      hasToken: !!config.apiToken,
      tokenPrefix: config.apiToken ? config.apiToken.substring(0, 8) + '...' : 'none'
    });

    // Normalize baseURL - ensure it ends with exactly one slash for proper URL joining
    let normalizedBaseUrl = config.apiBaseUrl;
    // Remove trailing slash if present
    if (normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }
    // Add exactly one trailing slash
    normalizedBaseUrl = normalizedBaseUrl + '/';

    // Get version safely
    const version = this.getVersion();
    const userAgent = `todo-for-ai-mcp/${version}`;

    logger.debug('[API_CLIENT] Creating axios instance', {
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      userAgent,
      version
    });

    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      // Force HTTPS protocol and disable proxy
      httpsAgent: normalizedBaseUrl.startsWith('https://') ? new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true
      }) : undefined,
      proxy: false, // Disable proxy to avoid HTTP/HTTPS conflicts
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept 4xx as valid responses to handle properly
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
            requestHeaders: error.config?.headers,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method,
              timeout: error.config?.timeout
            },
            requestData: error.config?.data,
            userAgent: error.config?.headers?.['User-Agent'],
            authorization: error.config?.headers?.['Authorization'] ? 'Bearer ***' : 'none'
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
            },
            requestHeaders: error.config?.headers,
            userAgent: error.config?.headers?.['User-Agent'],
            authorization: error.config?.headers?.['Authorization'] ? 'Bearer ***' : 'none'
          });
        } else {
          logger.error(`[REQUEST_SETUP_ERROR] ${requestId}`, {
            message: error.message,
            code: error.code,
            stack: error.stack
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

    // Retry on 5xx server errors
    if (status >= 500 && status < 600) {
      return true;
    }

    // Retry on 429 (Too Many Requests)
    if (status === 429) {
      return true;
    }

    // Retry on 400 errors that might be Cloudflare security responses
    if (status === 400) {
      const errorMessage = error.message || '';
      const responseData = typeof error.response.data === 'string' ? error.response.data : '';

      // Check for Cloudflare security/rate limiting errors
      if (errorMessage.includes('HTTPS port') ||
          errorMessage.includes('rate limit') ||
          responseData.includes('cloudflare') ||
          responseData.includes('security')) {
        return true;
      }
    }

    return false;
  }

  private async enforceRequestInterval(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.debug(`[API_CLIENT] Enforcing request interval, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // 在每次操作前强制执行请求间隔
    await this.enforceRequestInterval();

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

  /**
   * Get all pending tasks for a project by project name
   */
  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    logger.info(`Getting tasks for project: ${args.project_name}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<any>(this.normalizePath('mcp/call'), {
        name: 'get_project_tasks_by_name',
        arguments: {
          project_name: args.project_name,
          status_filter: args.status_filter || ['todo', 'in_progress', 'review'],
        },
      });

      const apiResponse = response.data;

      // Handle wrapped API response format
      if (apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.info(`Found ${result.total_tasks || 0} tasks for project: ${args.project_name}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      logger.info(`Found ${apiResponse.total_tasks || 0} tasks for project: ${args.project_name}`);
      return apiResponse;
    }, `getProjectTasksByName(${args.project_name})`);
  }

  /**
   * Get detailed task information by task ID
   */
  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    logger.info(`Getting task details for ID: ${args.task_id}`);
    
    try {
      const response = await this.client.post<Task>(this.normalizePath('mcp/call'), {
        name: 'get_task_by_id',
        arguments: {
          task_id: args.task_id,
        },
      });

      const apiResponse = response.data as ApiResponse<Task> | Task;

      // Handle wrapped API response format
      if ('code' in apiResponse && apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.info(`Retrieved task: ${result.title}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if ('error' in apiResponse) {
        throw new Error((apiResponse as any).error);
      }

      logger.info(`Retrieved task: ${(apiResponse as Task).title}`);
      return apiResponse as Task;
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
      const response = await this.client.post<any>(this.normalizePath('mcp/call'), {
        name: 'submit_task_feedback',
        arguments: {
          task_id: args.task_id,
          project_name: args.project_name,
          feedback_content: args.feedback_content,
          status: args.status,
          ai_identifier: args.ai_identifier || 'MCP Client',
        },
      });

      const apiResponse = response.data;

      // Handle wrapped API response format
      if (apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.info(`Successfully submitted feedback for task ${args.task_id}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      logger.info(`Successfully submitted feedback for task ${args.task_id}`);
      return apiResponse;
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
      const response = await this.client.post<Task>(this.normalizePath('mcp/call'), {
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

      const apiResponse = response.data as ApiResponse<Task> | Task;

      // Handle wrapped API response format
      if ('code' in apiResponse && apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.info(`Successfully created task: ${result.title}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if ('error' in apiResponse) {
        throw new Error((apiResponse as any).error);
      }

      logger.info(`Successfully created task: ${(apiResponse as Task).title}`);
      return apiResponse as Task;
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

      const response = await this.client.post<Project>(this.normalizePath('mcp/call'), requestPayload);
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

      const apiResponse = response.data as ApiResponse<Project> | Project;

      // Handle wrapped API response format
      if ('code' in apiResponse && apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.debug('[API_CLIENT] Using wrapped response data', {
          apiCallId,
          code: apiResponse.code,
          resultType: typeof result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
        });
        return result;
      }

      // Handle direct response format (backward compatibility)
      logger.debug('[API_CLIENT] Checking for error in direct response', {
        apiCallId,
        hasError: 'error' in apiResponse,
        resultType: typeof apiResponse,
        resultKeys: apiResponse && typeof apiResponse === 'object' ? Object.keys(apiResponse) : []
      });

      if ('error' in apiResponse) {
        const errorMsg = (apiResponse as any).error;
        logger.error('[API_CLIENT] MCP call returned error', {
          apiCallId,
          error: errorMsg,
          identifier,
          fullResponse: apiResponse
        });
        throw new Error(errorMsg);
      }

      const project = apiResponse as Project;
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
   * List all projects that the current user has access to
   */
  async listUserProjects(args: any): Promise<any> {
    logger.info(`Listing user projects with filters: ${JSON.stringify(args)}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<any>(this.normalizePath('mcp/call'), {
        name: 'list_user_projects',
        arguments: {
          status_filter: args.status_filter || 'active',
          include_stats: args.include_stats || false,
        },
      });

      const apiResponse = response.data;

      // Handle wrapped API response format
      if (apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        logger.info(`Found ${result.pagination?.total || result.total || 0} projects for user`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      logger.info(`Found ${apiResponse.total || 0} projects for user`);
      return apiResponse;
    }, `listUserProjects(${JSON.stringify(args)})`);
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
    // 优先使用编译时嵌入的版本信息
    logger.debug('[API_CLIENT] Using embedded version information', {
      version: VERSION,
      packageName: PACKAGE_NAME
    });

    return VERSION;
  }

  /**
   * Normalize URL path to ensure proper joining with baseURL
   * Removes leading slash to avoid double slashes when joining with baseURL that ends with /
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }
}
