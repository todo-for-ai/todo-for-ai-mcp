import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TodoApiClient } from './api-client.js';
import { logger } from './logger.js';
import { tools } from './tools.js';
import { CONFIG } from './config.js';
import { handlerMap } from './handlers/index.js';
import { toToolResponse } from './handlers/response.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

export class TodoMcpServer {
  private server: Server;
  private apiClient: TodoApiClient;
  private instanceId: string;

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

      // Tool definitions imported from tools.ts
      logger.info(`Returning ${tools.length} available tools`);
      return { tools };
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
        const handler = handlerMap[name];
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const ctx = {
          apiClient: this.apiClient,
          instanceId: this.instanceId,
          toToolResponse: (summary: string, data?: unknown) => toToolResponse(summary, data),
        };

        const startTime = Date.now();
        const result = await handler(args, ctx);
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
      version: VERSION
    });

    logger.debug('[MCP_SERVER] Creating transport...', {
      transportType: 'StdioServerTransport',
      instanceId: this.instanceId
    });

    const transport = new StdioServerTransport();

    logger.debug('[MCP_SERVER] Connecting to transport...', {
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });

    try {
      await this.server.connect(transport);

      logger.info('[MCP_SERVER] Todo for AI MCP Server is running', {
        instanceId: this.instanceId,
        apiBaseUrl: CONFIG.apiBaseUrl,
        connected: true,
        ready: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[MCP_SERVER] Failed to start MCP Server', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
