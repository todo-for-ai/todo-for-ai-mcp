import { BaseTransport } from './base.js';
import { StdioTransport } from './stdio.js';
import { TodoConfig } from '../types.js';
import { logger } from '../logger.js';

/**
 * Factory for creating transport instances based on configuration and environment
 *
 * stdio-only mode: HTTP transport (src/transports/http.ts) is preserved
 * for future re-enablement but never instantiated today.
 */
export class TransportFactory {
  /**
   * Create a transport instance based on configuration and environment detection
   */
  static create(config: TodoConfig): BaseTransport {
    logger.info('[TRANSPORT_FACTORY] Creating stdio transport', {
      transport: 'stdio',
      processId: process.pid,
      reason: 'stdio-only mode (HTTP preserved for future)',
    });

    // Always return stdio transport for now
    return new StdioTransport();
  }
}
