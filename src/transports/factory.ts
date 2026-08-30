import { BaseTransport } from './base.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport } from './http.js';
import { TodoConfig, HttpTransportConfig } from '../types.js';
import { logger } from '../logger.js';

/**
 * Factory for creating transport instances based on configuration and environment
 */
export class TransportFactory {
  /**
   * Create a transport instance based on configuration and environment detection
   */
  static create(config: TodoConfig): BaseTransport {
    // Currently always use stdio - HTTP transport code preserved for future use
    logger.info('[TRANSPORT_FACTORY] Creating stdio transport', {
      transport: 'stdio',
      processId: process.pid,
      reason: 'stdio-only mode (HTTP preserved for future)'
    });

    // Always return stdio transport for now
    return new StdioTransport();

    // HTTP transport code preserved for future use:
    // const transportType = TransportFactory.detectTransportType(config);
    // switch (transportType) {
    //   case 'stdio':
    //     return new StdioTransport();
    //   case 'http':
    //     const httpConfig: HttpTransportConfig = {
    //       port: config.httpPort,
    //       host: config.httpHost,
    //       sessionTimeout: config.sessionTimeout,
    //       enableDnsRebindingProtection: config.enableDnsRebindingProtection,
    //       allowedOrigins: config.allowedOrigins,
    //       maxConnections: config.maxConnections
    //     };
    //     return new HttpTransport(httpConfig);
    //   default:
    //     throw new Error(`Unsupported transport type: ${transportType}`);
    // }
  }

  // HTTP transport detection methods (preserved for future use)
  // Currently disabled - only stdio transport is used

  /**
   * Detect the appropriate transport type based on environment and configuration
   * Currently always returns 'stdio' - HTTP detection preserved for future use
   */
  private static detectTransportType(config: TodoConfig): 'stdio' | 'http' {
    // Future: uncomment to enable HTTP transport detection
    // if (config.transport && config.transport !== 'auto') {
    //   return config.transport;
    // }
    // const environment = TransportFactory.analyzeEnvironment();
    // if (environment.hasHttpFlags) {
    //   return 'http';
    // }

    // Always use stdio for now
    return 'stdio';
  }

  /**
   * Analyze the current environment to determine the best transport
   * Preserved for future HTTP transport re-enablement
   */
  private static analyzeEnvironment() {
    const argv = process.argv;
    const env = process.env;

    // Check for HTTP-specific flags
    const httpFlags = [
      '--http-port', '--http-host', '--transport=http',
      '--session-timeout', '--dns-protection', '--allowed-origins', '--max-connections'
    ];
    const hasHttpFlags = httpFlags.some(flag => {
      const flagName = flag.split('=')[0];
      return flagName && argv.some(arg => arg && arg.includes(flagName));
    });

    // Check environment variables for HTTP transport
    const httpEnvVars = [
      'TODO_HTTP_PORT', 'TODO_HTTP_HOST', 'TODO_SESSION_TIMEOUT',
      'TODO_DNS_PROTECTION', 'TODO_ALLOWED_ORIGINS', 'TODO_MAX_CONNECTIONS'
    ];
    const hasHttpEnvVars = httpEnvVars.some(envVar => env[envVar]);

    const isInteractive = Boolean(process.stdin.isTTY);
    const hasStdio = Boolean(process.stdin && process.stdout);
    const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);

    // Check if we're likely being called by an MCP client
    const likelyMcpClient = !isInteractive && hasStdio && !hasHttpFlags && !hasHttpEnvVars;

    return {
      isInteractive,
      hasStdio,
      isTTY,
      hasHttpFlags: hasHttpFlags || hasHttpEnvVars,
      httpFlags: httpFlags.filter(flag => {
        const flagName = flag.split('=')[0];
        return flagName && argv.some(arg => arg && arg.includes(flagName));
      }),
      likelyMcpClient,
      processId: process.pid,
      argv: argv.slice(2), // Remove node and script path
      parentPid: process.ppid
    };
  }
}
