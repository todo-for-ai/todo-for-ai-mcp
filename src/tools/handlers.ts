import { logger } from '../logger.js';
import { TodoApiClient } from '../api-client/index.js';

/**
 * MCP Tool Handlers
 *
 * This module contains all tool handler implementations.
 * Each handler processes a specific tool call and returns the result.
 */

export class ToolHandlers {
  constructor(private apiClient: TodoApiClient, private instanceId: string) {}

  /**
   * Handle get_project_tasks_by_name tool
   */
  async handleGetProjectTasksByName(args: any) {
    const result = await this.apiClient.getProjectTasksByName(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_task_by_id tool
   */
  async handleGetTaskById(args: any) {
    const result = await this.apiClient.getTaskById(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle submit_task_feedback tool
   */
  async handleSubmitTaskFeedback(args: any) {
    const result = await this.apiClient.submitTaskFeedback(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle create_task tool
   */
  async handleCreateTask(args: any) {
    const result = await this.apiClient.createTask(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_project_info tool with detailed logging
   */
  async handleGetProjectInfo(args: any) {
    const handlerStartTime = Date.now();
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[MCP_SERVER] ========== HANDLER START: handleGetProjectInfo ==========', {
      handlerId,
      instanceId: this.instanceId,
      args,
      hasProjectId: !!args?.project_id,
      hasProjectName: !!args?.project_name,
      timestamp: new Date().toISOString()
    });

    logger.debug('[MCP_SERVER] handleGetProjectInfo input validation', {
      handlerId,
      projectId: args?.project_id,
      projectName: args?.project_name,
      argsType: typeof args,
      argsKeys: args ? Object.keys(args) : [],
      isValidInput: !!(args?.project_id || args?.project_name)
    });

    try {
      logger.info('[MCP_SERVER] handleGetProjectInfo calling API client...', {
        handlerId,
        instanceId: this.instanceId,
        apiMethod: 'getProjectInfo',
        args
      });

      const apiCallStartTime = Date.now();
      const result = await this.apiClient.getProjectInfo(args);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('[MCP_SERVER] handleGetProjectInfo API call successful', {
        handlerId,
        instanceId: this.instanceId,
        apiCallDuration: `${apiCallDuration}ms`,
        projectId: result.id,
        projectName: result.name,
        projectStatus: result.status,
        hasStats: !!result.statistics,
        hasRecentTasks: !!result.recent_tasks,
        resultSize: JSON.stringify(result).length,
        resultKeys: Object.keys(result)
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo API result details', {
        handlerId,
        result: result,
        statistics: result.statistics,
        recentTasks: result.recent_tasks
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo preparing response...', {
        handlerId,
        responseFormat: 'MCP tool response',
        contentType: 'text',
        willStringify: true
      });

      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      const handlerDuration = Date.now() - handlerStartTime;
      logger.info('[MCP_SERVER] handleGetProjectInfo response prepared', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        responseSize: JSON.stringify(response).length,
        contentType: response.content[0]?.type,
        contentCount: response.content.length,
        textLength: response.content[0]?.text?.length
      });

      logger.info('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: true,
        totalDuration: `${handlerDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      const handlerDuration = Date.now() - handlerStartTime;

      logger.error('[MCP_SERVER] handleGetProjectInfo failed', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        args,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.error('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo (ERROR) ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: false,
        totalDuration: `${handlerDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Handle list_user_projects tool with detailed logging
   */
  async handleListUserProjects(args: any) {
    const handlerStartTime = Date.now();
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[MCP_SERVER] ========== HANDLER START: handleListUserProjects ==========', {
      handlerId,
      instanceId: this.instanceId,
      args,
      hasStatusFilter: !!args?.status_filter,
      hasIncludeStats: !!args?.include_stats,
      timestamp: new Date().toISOString()
    });

    logger.debug('[MCP_SERVER] handleListUserProjects input validation', {
      handlerId,
      statusFilter: args?.status_filter,
      includeStats: args?.include_stats,
      argsType: typeof args,
      argsKeys: args ? Object.keys(args) : []
    });

    try {
      logger.info('[MCP_SERVER] handleListUserProjects calling API client...', {
        handlerId,
        instanceId: this.instanceId,
        apiMethod: 'listUserProjects',
        args
      });

      const apiCallStartTime = Date.now();
      const result = await this.apiClient.listUserProjects(args);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('[MCP_SERVER] handleListUserProjects API call successful', {
        handlerId,
        instanceId: this.instanceId,
        apiCallDuration: `${apiCallDuration}ms`,
        projectsCount: result.total || 0,
        statusFilter: result.status_filter,
        includeStats: result.include_stats,
        resultSize: JSON.stringify(result).length,
        resultKeys: Object.keys(result)
      });

      logger.debug('[MCP_SERVER] handleListUserProjects API result details', {
        handlerId,
        result: result,
        projects: result.projects
      });

      logger.debug('[MCP_SERVER] handleListUserProjects preparing response...', {
        handlerId,
        responseFormat: 'MCP tool response',
        contentType: 'text',
        willStringify: true
      });

      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      const handlerDuration = Date.now() - handlerStartTime;
      logger.info('[MCP_SERVER] handleListUserProjects response prepared', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        responseSize: JSON.stringify(response).length,
        contentType: response.content[0]?.type,
        contentCount: response.content.length,
        textLength: response.content[0]?.text?.length
      });

      logger.info('[MCP_SERVER] ========== HANDLER END: handleListUserProjects ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: true,
        totalDuration: `${handlerDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      const handlerDuration = Date.now() - handlerStartTime;

      logger.error('[MCP_SERVER] handleListUserProjects failed', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        args,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.error('[MCP_SERVER] ========== HANDLER END: handleListUserProjects (ERROR) ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: false,
        totalDuration: `${handlerDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }
}
