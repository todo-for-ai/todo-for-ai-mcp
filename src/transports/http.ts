import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BaseTransport } from './base.js';
import { logger } from '../logger.js';

/**
 * HTTP transport for MCP communication
 * Used for web-based MCP clients
 */
export class HttpTransport extends BaseTransport {
  private transport?: any; // Will be typed when implemented

  getType(): 'http' {
    return 'http';
  }

  async start(server: Server): Promise<void> {
    if (this.running) {
      throw new Error('HTTP transport is already running');
    }

    logger.info('[HTTP_TRANSPORT] Starting HTTP transport...', {
      processId: process.pid
    });

    try {
      this.setServer(server);
      this.setRunning(true);

      logger.info('[HTTP_TRANSPORT] HTTP transport started successfully', {
        connected: true,
        ready: true,
        transport: 'http'
      });

    } catch (error) {
      logger.error('[HTTP_TRANSPORT] Failed to start HTTP transport', {
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

    logger.info('[HTTP_TRANSPORT] Stopping HTTP transport...', {
      processId: process.pid
    });

    try {
      if (this.transport) {
        // Close the transport
        await this.transport.close();
        this.transport = undefined;
      }

      this.setRunning(false);
      this.setServer(undefined as any);

      logger.info('[HTTP_TRANSPORT] HTTP transport stopped successfully', {
        processId: process.pid
      });
    } catch (error) {
      logger.error('[HTTP_TRANSPORT] Error stopping HTTP transport', {
        error: error instanceof Error ? error.message : String(error),
        processId: process.pid
      });
      throw error;
    }
  }
}
