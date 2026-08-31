import {
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  CreateTaskArgs,
  GetProjectInfoArgs,
  Task,
  Project,
  ApiResponse,
} from '../types.js';
import { AxiosInstance } from 'axios';

/**
 * API method implementations for TodoApiClient
 */
export class ApiMethods {
  constructor(
    private client: AxiosInstance,
    private executeWithRetry: <T>(operation: () => Promise<T>, operationName: string) => Promise<T>,
    private normalizePath: (path: string) => string,
    private logger: any
  ) {}

  /**
   * Get all pending tasks for a project by project name
   */
  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    this.logger.info(`Getting tasks for project: ${args.project_name}`);

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
        this.logger.info(`Found ${result.total_tasks || 0} tasks for project: ${args.project_name}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      this.logger.info(`Found ${apiResponse.total_tasks || 0} tasks for project: ${args.project_name}`);
      return apiResponse;
    }, `getProjectTasksByName(${args.project_name})`);
  }

  /**
   * Get detailed task information by task ID
   */
  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    this.logger.info(`Getting task details for ID: ${args.task_id}`);

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
        this.logger.info(`Retrieved task: ${result.title}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if ('error' in apiResponse) {
        throw new Error((apiResponse as any).error);
      }

      this.logger.info(`Retrieved task: ${(apiResponse as Task).title}`);
      return apiResponse as Task;
    } catch (error) {
      this.logger.error(`Failed to get task ${args.task_id}:`, error);
      throw error;
    }
  }

  /**
   * Submit feedback for a completed or in-progress task
   */
  async submitTaskFeedback(args: SubmitTaskFeedbackArgs): Promise<any> {
    this.logger.info(`Submitting feedback for task ${args.task_id} in project ${args.project_name}`);

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
        this.logger.info(`Successfully submitted feedback for task ${args.task_id}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      this.logger.info(`Successfully submitted feedback for task ${args.task_id}`);
      return apiResponse;
    } catch (error) {
      this.logger.error(`Failed to submit feedback for task ${args.task_id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new task in the specified project
   */
  async createTask(args: CreateTaskArgs): Promise<Task> {
    this.logger.info(`Creating task "${args.title}" in project ${args.project_id}`);

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
        this.logger.info(`Successfully created task: ${result.title}`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if ('error' in apiResponse) {
        throw new Error((apiResponse as any).error);
      }

      this.logger.info(`Successfully created task: ${(apiResponse as Task).title}`);
      return apiResponse as Task;
    } catch (error) {
      this.logger.error(`Failed to create task "${args.title}":`, error);
      throw error;
    }
  }

  /**
   * Get detailed project information
   */
  async getProjectInfo(args: GetProjectInfoArgs): Promise<Project> {
    const apiCallStartTime = Date.now();
    const apiCallId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    this.logger.info('[API_CLIENT] ========== API CALL START: getProjectInfo ==========', {
      apiCallId,
      timestamp: new Date().toISOString(),
      args
    });

    // Validate that at least one identifier is provided
    if (!args.project_id && !args.project_name) {
      const error = new Error('Either project_id or project_name must be provided');
      this.logger.error('[API_CLIENT] getProjectInfo validation failed', {
        apiCallId,
        args,
        error: error.message,
        validationRule: 'project_id OR project_name required'
      });
      throw error;
    }

    const identifier = args.project_id ? `ID ${args.project_id}` : `name "${args.project_name}"`;

    try {
      const requestPayload = {
        name: 'get_project_info',
        arguments: {
          project_id: args.project_id,
          project_name: args.project_name,
        },
      };

      const httpCallStartTime = Date.now();
      this.logger.info('[API_CLIENT] Making HTTP request...', {
        apiCallId,
        url: '/mcp/call',
        method: 'POST',
        timestamp: new Date().toISOString()
      });

      const response = await this.client.post<Project>(this.normalizePath('mcp/call'), requestPayload);
      const httpCallDuration = Date.now() - httpCallStartTime;

      this.logger.info('[API_CLIENT] HTTP response received', {
        apiCallId,
        httpCallDuration: `${httpCallDuration}ms`,
        status: response.status,
        hasData: !!response.data,
      });

      const apiResponse = response.data as ApiResponse<Project> | Project;

      // Handle wrapped API response format
      if ('code' in apiResponse && apiResponse.code && apiResponse.data) {
        const result = apiResponse.data;
        const totalDuration = Date.now() - apiCallStartTime;

        this.logger.info(`[API_CLIENT] getProjectInfo successful for ${identifier}`, {
          apiCallId,
          totalDuration: `${totalDuration}ms`,
          projectName: result.name,
          projectId: result.id,
        });

        return result;
      }

      // Handle direct response format (backward compatibility)
      if ('error' in apiResponse) {
        const errorMsg = (apiResponse as any).error;
        throw new Error(errorMsg);
      }

      return apiResponse as Project;
    } catch (error) {
      const totalDuration = Date.now() - apiCallStartTime;

      this.logger.error(`[API_CLIENT] getProjectInfo failed for ${identifier}`, {
        apiCallId,
        totalDuration: `${totalDuration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * List all projects that the current user has access to
   */
  async listUserProjects(args: any): Promise<any> {
    this.logger.info(`Listing user projects with filters: ${JSON.stringify(args)}`);

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
        this.logger.info(`Found ${result.pagination?.total || result.total || 0} projects for user`);
        return result;
      }

      // Handle direct response format (backward compatibility)
      if (apiResponse.error) {
        throw new Error(apiResponse.error);
      }

      this.logger.info(`Found ${apiResponse.total || 0} projects for user`);
      return apiResponse;
    }, `listUserProjects(${JSON.stringify(args)})`);
  }

  /**
   * Test connection to the Todo API
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing connection to Todo API...');
      const response = await this.client.get('/health');
      this.logger.info('Connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }
}
