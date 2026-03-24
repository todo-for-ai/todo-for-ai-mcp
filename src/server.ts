import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TodoApiClient } from './api-client/index.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';
import { TransportFactory } from './transports/factory.js';
import { BaseTransport } from './transports/base.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TOOL_DEFINITIONS } from './tools/definitions.js';
import { ToolHandlers } from './tools/handlers.js';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

export class TodoMcpServer {
  private server: Server;
  private apiClient: TodoApiClient;
  private transport?: BaseTransport;
  private instanceId: string;
  private toolHandlers: ToolHandlers;

  constructor() {
    // Generate unique instance ID for concurrent support
    this.instanceId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[MCP_SERVER] Starting TodoMcpServer initialization...', {
      instanceId: this.instanceId,
      version: VERSION,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      configLogLevel: CONFIG.logLevel
    });

    logger.debug('[MCP_SERVER] Creating MCP Server instance...', {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      capabilities: ['tools'],
      instanceId: this.instanceId
    });

    this.server = new Server(
      {
        name: 'todo-for-ai-mcp',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    logger.info(`[MCP_SERVER] MCP Server instance created: ${this.instanceId}`, {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      instanceId: this.instanceId
    });

    logger.debug('[MCP_SERVER] Initializing API client...', {
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasToken: !!CONFIG.apiToken,
      timeout: CONFIG.apiTimeout,
      instanceId: this.instanceId
    });

    this.apiClient = new TodoApiClient(CONFIG);
    this.toolHandlers = new ToolHandlers(this.apiClient, this.instanceId);

    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId
    });
    this.setupHandlers();

    logger.info('[MCP_SERVER] TodoMcpServer initialization complete', {
      instanceId: this.instanceId,
      handlersSetup: true,
      apiClientReady: true,
      serverReady: true
    });
  }

  private setupHandlers(): void {
    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId,
      handlersToSetup: ['ListTools', 'CallTool']
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('[MCP_SERVER] ListTools request received', {
        instanceId: this.instanceId,
        timestamp: new Date().toISOString()
      });
      logger.debug('Received list_tools request');

      logger.info(`Returning ${TOOL_DEFINITIONS.length} available tools`);
      return { tools: TOOL_DEFINITIONS };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const callStartTime = Date.now();

      logger.info(`[MCP_SERVER] ========== TOOL CALL START ==========`, {
        requestId,
        toolName: name,
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        callStartTime
      });

      logger.info(`[MCP_SERVER] Tool call received: ${name}`, {
        requestId,
        toolName: name,
        hasArgs: !!args,
        argsCount: args ? Object.keys(args).length : 0,
        argsKeys: args ? Object.keys(args) : [],
        argsSize: args ? JSON.stringify(args).length : 0,
        instanceId: this.instanceId,
        memoryUsage: process.memoryUsage()
      });

      logger.debug(`[MCP_SERVER] Tool call full arguments: ${name}`, {
        requestId,
        args,
        argsStringified: JSON.stringify(args, null, 2)
      });

      try {
        let result;
        const startTime = Date.now();

        switch (name) {
          case 'get_project_tasks_by_name':
            logger.info(`[MCP_SERVER] Executing get_project_tasks_by_name`, {
              requestId,
              instanceId: this.instanceId,
              projectName: args?.project_name,
              hasProjectName: !!args?.project_name
            });
            result = await this.toolHandlers.handleGetProjectTasksByName(args);
            break;

          case 'get_task_by_id':
            logger.info(`[MCP_SERVER] Executing get_task_by_id`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              hasTaskId: !!args?.task_id
            });
            result = await this.toolHandlers.handleGetTaskById(args);
            break;

          case 'submit_task_feedback':
            logger.info(`[MCP_SERVER] Executing submit_task_feedback`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              status: args?.status,
              hasContent: !!args?.feedback_content
            });
            result = await this.toolHandlers.handleSubmitTaskFeedback(args);
            break;

          case 'create_task':
            logger.info(`[MCP_SERVER] Executing create_task`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              title: args?.title,
              priority: args?.priority
            });
            result = await this.toolHandlers.handleCreateTask(args);
            break;

          case 'get_project_info':
            logger.info(`[MCP_SERVER] Executing get_project_info`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              projectName: args?.project_name,
              hasProjectId: !!args?.project_id,
              hasProjectName: !!args?.project_name
            });
            result = await this.toolHandlers.handleGetProjectInfo(args);
            break;

          case 'list_user_projects':
            logger.info(`[MCP_SERVER] Executing list_user_projects`, {
              requestId,
              instanceId: this.instanceId,
              statusFilter: args?.status_filter,
              includeStats: args?.include_stats
            });
            result = await this.toolHandlers.handleListUserProjects(args);
            break;

          default:
            const error = new Error(`Unknown tool: ${name}`);
            logger.error(`[MCP_SERVER] Unknown tool requested`, {
              requestId,
              instanceId: this.instanceId,
              toolName: name,
              error: error.message,
              availableTools: ['get_project_tasks_by_name', 'get_task_by_id', 'submit_task_feedback', 'create_task', 'get_project_info', 'list_user_projects']
            });
            throw error;
        }

        const duration = Date.now() - startTime;
        const totalCallDuration = Date.now() - callStartTime;

        logger.info(`[MCP_SERVER] Tool call completed successfully: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          duration: `${duration}ms`,
          totalCallDuration: `${totalCallDuration}ms`,
          hasResult: !!result,
          resultType: typeof result,
          resultSize: result ? JSON.stringify(result).length : 0,
          memoryUsage: process.memoryUsage()
        });

        logger.debug(`[MCP_SERVER] Tool call result structure: ${name}`, {
          requestId,
          result: result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
        });

        logger.info(`[MCP_SERVER] ========== TOOL CALL END ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: true,
          totalDuration: `${totalCallDuration}ms`,
          timestamp: new Date().toISOString()
        });

        return result;
      } catch (error) {
        const totalCallDuration = Date.now() - callStartTime;

        logger.error(`[MCP_SERVER] Tool call failed: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          toolName: name,
          totalCallDuration: `${totalCallDuration}ms`,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          args,
          memoryUsage: process.memoryUsage()
        });

        logger.error(`[MCP_SERVER] ========== TOOL CALL END (ERROR) ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: false,
          totalDuration: `${totalCallDuration}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    });
  }

  async run(): Promise<void> {
    logger.info('[MCP_SERVER] Starting Todo for AI MCP Server...', {
      instanceId: this.instanceId,
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasApiToken: !!CONFIG.apiToken,
      logLevel: CONFIG.logLevel,
      httpPort: CONFIG.httpPort,
      httpHost: CONFIG.httpHost,
      version: VERSION
    });

    logger.debug('[MCP_SERVER] Creating transport...', {
      instanceId: this.instanceId,
      configuredTransport: CONFIG.transport,
      httpPort: CONFIG.httpPort,
      httpHost: CONFIG.httpHost
    });

    try {
      // Use transport factory to create appropriate transport
      this.transport = TransportFactory.create(CONFIG);

      logger.debug('[MCP_SERVER] Starting transport...', {
        instanceId: this.instanceId,
        transportType: this.transport.getType(),
        httpPort: CONFIG.httpPort,
        httpHost: CONFIG.httpHost,
        timestamp: new Date().toISOString()
      });

      await this.transport.start(this.server);

      const transportType = this.transport.getType();
      const logData: any = {
        instanceId: this.instanceId,
        apiBaseUrl: CONFIG.apiBaseUrl,
        transport: transportType,
        connected: true,
        ready: true,
        timestamp: new Date().toISOString()
      };

      // Add HTTP-specific info if using HTTP transport
      if (transportType === 'http') {
        logData.httpPort = CONFIG.httpPort;
        logData.httpHost = CONFIG.httpHost;
        logData.httpUrl = `http://${CONFIG.httpHost}:${CONFIG.httpPort}`;
      }

      logger.info('[MCP_SERVER] Todo for AI MCP Server is running', logData);
    } catch (error) {
      logger.error('[MCP_SERVER] Failed to start MCP Server', {
        instanceId: this.instanceId,
        httpPort: CONFIG.httpPort,
        httpHost: CONFIG.httpHost,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('[MCP_SERVER] Stopping Todo for AI MCP Server...', {
      instanceId: this.instanceId,
      transport: this.transport?.getType() || 'unknown'
    });

    try {
      if (this.transport) {
        await this.transport.stop();
        this.transport = undefined as any;
      }

      logger.info('[MCP_SERVER] Todo for AI MCP Server stopped successfully', {
        instanceId: this.instanceId
      });
    } catch (error) {
      logger.error('[MCP_SERVER] Error stopping MCP Server', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
