import axios, { AxiosInstance } from 'axios';
import https from 'https';
import {
  TodoConfig,
  Task,
  Project,
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  CreateTaskArgs,
  GetProjectInfoArgs,
} from '../types.js';
import { logger } from '../logger.js';
import { VERSION, PACKAGE_NAME } from '../version.js';
import { RetryManager, DEFAULT_RETRY_CONFIG } from './retry.js';
import { InterceptorManager } from './interceptors.js';
import { ApiMethods } from './methods.js';

/**
 * Todo API Client
 *
 * Provides methods to interact with the Todo API including:
 * - Authentication with bearer tokens
 * - Automatic retries with exponential backoff
 * - Request/response logging
 * - Rate limiting protection
 */
export class TodoApiClient {
  private client: AxiosInstance;
  private config: TodoConfig;
  private retryManager: RetryManager;
  private apiMethods: ApiMethods;
  private minRequestInterval: number = 500; // 最小请求间隔500ms

  constructor(config: TodoConfig) {
    this.config = config;
    this.retryManager = new RetryManager(DEFAULT_RETRY_CONFIG);

    logger.info('[API_CLIENT] Initializing TodoApiClient', {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      hasToken: !!config.apiToken,
      tokenPrefix: config.apiToken ? config.apiToken.substring(0, 8) + '...' : 'none'
    });

    // Normalize baseURL - ensure it ends with exactly one slash for proper URL joining
    let normalizedBaseUrl = config.apiBaseUrl;
    if (normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }
    normalizedBaseUrl = normalizedBaseUrl + '/';

    const userAgent = `todo-for-ai-mcp/${VERSION}`;

    logger.debug('[API_CLIENT] Creating axios instance', {
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      userAgent,
      version: VERSION
    });

    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
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

    // Setup interceptors
    const interceptorManager = new InterceptorManager(this.client, logger);
    interceptorManager.setupInterceptors();

    // Initialize API methods
    this.apiMethods = new ApiMethods(
      this.client,
      this.executeWithRetry.bind(this),
      this.normalizePath.bind(this),
      logger
    );
  }

  /**
   * Execute an operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    await this.retryManager.enforceRequestInterval(this.minRequestInterval);
    return this.retryManager.executeWithRetry(operation, operationName, logger);
  }

  /**
   * Normalize URL path to ensure proper joining with baseURL
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  // API Methods - Delegated to ApiMethods class

  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    return this.apiMethods.getProjectTasksByName(args);
  }

  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    return this.apiMethods.getTaskById(args);
  }

  async submitTaskFeedback(args: SubmitTaskFeedbackArgs): Promise<any> {
    return this.apiMethods.submitTaskFeedback(args);
  }

  async createTask(args: CreateTaskArgs): Promise<Task> {
    return this.apiMethods.createTask(args);
  }

  async getProjectInfo(args: GetProjectInfoArgs): Promise<Project> {
    return this.apiMethods.getProjectInfo(args);
  }

  async listUserProjects(args: { status_filter?: string; include_stats?: boolean }): Promise<any> {
    return this.apiMethods.listUserProjects(args);
  }

  async testConnection(): Promise<boolean> {
    return this.apiMethods.testConnection();
  }
}
