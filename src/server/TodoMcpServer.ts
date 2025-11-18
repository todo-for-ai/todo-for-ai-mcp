import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { TodoConfig } from '../types.js';
import { TaskCreateHandler } from './handlers/task/taskCreateHandler.js';
import { TaskUpdateHandler } from './handlers/task/taskUpdateHandler.js';
import { ProjectGetHandler } from './handlers/project/projectGetHandler.js';

/**
 * Todo MCP Server
 * Main server class for handling MCP requests
 */
export class TodoMcpServer {
  private server?: Server;
  private taskCreateHandler: TaskCreateHandler;
  private taskUpdateHandler: TaskUpdateHandler;
  private projectGetHandler: ProjectGetHandler;

  constructor() {
    this.taskCreateHandler = new TaskCreateHandler();
    this.taskUpdateHandler = new TaskUpdateHandler();
    this.projectGetHandler = new ProjectGetHandler();
  }

  async start(): Promise<void> {
    // TODO: Implement server start logic
    console.log('Todo MCP Server started');
  }

  async stop(): Promise<void> {
    // TODO: Implement server stop logic
    console.log('Todo MCP Server stopped');
  }
}
