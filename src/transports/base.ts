import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Base transport interface for MCP communication
 */
export abstract class BaseTransport {
  protected server?: Server;
  protected running = false;

  /**
   * Get the transport type
   */
  abstract getType(): 'stdio' | 'http';

  /**
   * Check if the transport is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Set the MCP server instance
   */
  protected setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Set the running state
   */
  protected setRunning(running: boolean): void {
    this.running = running;
  }

  /**
   * Start the transport with the given server
   */
  abstract start(server: Server): Promise<void>;

  /**
   * Stop the transport
   */
  abstract stop(): Promise<void>;
}
