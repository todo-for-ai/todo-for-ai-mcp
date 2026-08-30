import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BaseTransport } from './base.js';
import { logger } from '../logger.js';

/**
 * Stdio transport for MCP communication
 * Used when the server is launched by Claude Desktop or other MCP clients
 */
export class StdioTransport extends BaseTransport {
  private transport?: StdioServerTransport;

  getType(): 'stdio' {
    return 'stdio';
  }

  async start(server: Server): Promise<void> {
    if (this.running) {
      throw new Error('Stdio transport is already running');
    }

    logger.info('[STDIO_TRANSPORT] Starting Stdio transport...', {
      processId: process.pid,
      hasStdin: !!process.stdin,
      hasStdout: !!process.stdout,
      isTTY: process.stdin.isTTY
    });

    try {
      this.setServer(server);
      
      // Create stdio transport
      this.transport = new StdioServerTransport();
      
      logger.debug('[STDIO_TRANSPORT] Connecting server to stdio transport...', {
        transportType: 'stdio'
      });

      // Connect the server to the transport
      await server.connect(this.transport);
      
      this.setRunning(true);
      
      logger.info('[STDIO_TRANSPORT] Stdio transport started successfully', {
        connected: true,
        ready: true,
        transport: 'stdio'
      });

      // Log that we're ready for MCP communication
      logger.debug('[STDIO_TRANSPORT] Ready for MCP communication via stdin/stdout', {
        processId: process.pid,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[STDIO_TRANSPORT] Failed to start Stdio transport', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('[STDIO_TRANSPORT] Stopping Stdio transport...', {
      processId: process.pid
    });

    try {
      if (this.transport) {
        // Close the transport
        await this.transport.close();
        this.transport = undefined as any;
      }

      this.setRunning(false);
      this.setServer(undefined as any);

      logger.info('[STDIO_TRANSPORT] Stdio transport stopped successfully', {
        processId: process.pid
      });
    } catch (error) {
      logger.error('[STDIO_TRANSPORT] Error stopping Stdio transport', {
        error: error instanceof Error ? error.message : String(error),
        processId: process.pid
      });
      throw error;
    }
  }
}
