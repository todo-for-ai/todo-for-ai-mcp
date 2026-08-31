/**
 * HTTP transport implementation using Streamable HTTP
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { BaseTransport } from './base.js';
import { HttpSessionManager } from '../session/manager.js';
import { HttpTransportConfig } from '../types.js';
import { logger } from '../logger.js';

export class HttpTransport extends BaseTransport {
  private app?: express.Application;
  private httpServer?: any;
  private sessionManager?: HttpSessionManager;
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private config: HttpTransportConfig;

  constructor(config: HttpTransportConfig) {
    super();
    this.config = config;
  }

  getType(): 'http' {
    return 'http';
  }

  async start(server: Server): Promise<void> {
    if (this.running) {
      throw new Error('HTTP transport is already running');
    }

    logger.info('[HTTP_TRANSPORT] Starting HTTP transport...', {
      port: this.config.port,
      host: this.config.host,
      sessionTimeout: this.config.sessionTimeout,
      enableDnsRebindingProtection: this.config.enableDnsRebindingProtection,
      allowedOrigins: this.config.allowedOrigins,
      maxConnections: this.config.maxConnections
    });

    try {
      this.setServer(server);
      this.sessionManager = new HttpSessionManager(this.config.sessionTimeout);
      this.app = express();

      this.setupMiddleware();
      this.setupRoutes();

      await this.startServer();

      this.setRunning(true);
      logger.info('[HTTP_TRANSPORT] HTTP transport started successfully', {
        port: this.config.port,
        host: this.config.host,
        url: `http://${this.config.host}:${this.config.port}`
      });
    } catch (error) {
      logger.error('[HTTP_TRANSPORT] Failed to start HTTP transport', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: this.config
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('[HTTP_TRANSPORT] Stopping HTTP transport...');

    try {
      // Close all active transports
      for (const [sessionId, transport] of this.transports.entries()) {
        try {
          // StreamableHTTPServerTransport doesn't have explicit close method
          // but we can clean up our references
          this.transports.delete(sessionId);
        } catch (error) {
          logger.warn('[HTTP_TRANSPORT] Error closing transport', {
            sessionId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Stop HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        this.httpServer = undefined;
      }

      // Cleanup session manager
      if (this.sessionManager) {
        this.sessionManager.destroy();
        this.sessionManager = undefined as any;
      }

      this.app = undefined as any;
      this.setRunning(false);
      this.setServer(undefined as any);
      
      logger.info('[HTTP_TRANSPORT] HTTP transport stopped successfully');
    } catch (error) {
      logger.error('[HTTP_TRANSPORT] Error stopping HTTP transport', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private setupMiddleware(): void {
    if (!this.app) return;

    logger.debug('[HTTP_TRANSPORT] Setting up middleware...');

    // JSON parsing with increased limit and better error handling
    this.app.use(express.json({
      limit: '10mb',
      strict: false,
      type: ['application/json', 'text/plain']
    }));

    // Handle JSON parsing errors
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (error instanceof SyntaxError && 'body' in error) {
        logger.warn('[HTTP_TRANSPORT] JSON parsing error', {
          error: error.message,
          url: req.url,
          method: req.method,
          contentType: req.headers['content-type']
        });
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON'
          },
          id: null
        });
        return;
      }
      next(error);
    });

    // CORS configuration
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check against allowed origins
        const isAllowed = this.config.allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            // Handle wildcard patterns like "http://localhost:*"
            const pattern = allowedOrigin.replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(origin);
          }
          return allowedOrigin === origin;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          logger.warn('[HTTP_TRANSPORT] CORS: Origin not allowed', {
            origin,
            allowedOrigins: this.config.allowedOrigins
          });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'Last-Event-ID']
    };

    this.app.use(cors(corsOptions));

    // Fix Accept header for MCP compatibility
    this.app.use((req, res, next) => {
      // For MCP requests, ensure proper Accept header
      if (req.url === '/mcp' && req.method === 'POST') {
        const accept = req.headers.accept || '';
        const hasJson = accept.includes('application/json');
        const hasEventStream = accept.includes('text/event-stream');

        if (!hasJson || !hasEventStream) {
          // Fix the Accept header to include both required types
          const acceptParts = [];
          if (!hasJson) acceptParts.push('application/json');
          if (!hasEventStream) acceptParts.push('text/event-stream');

          // Merge with existing accept header
          const newAccept = accept ? `${accept}, ${acceptParts.join(', ')}` : acceptParts.join(', ');
          req.headers.accept = newAccept;

          logger.debug('[HTTP_TRANSPORT] Fixed Accept header for MCP compatibility', {
            originalAccept: accept || 'undefined',
            newAccept: newAccept,
            url: req.url,
            method: req.method
          });
        }
      }
      next();
    });

    // Request logging with body inspection
    this.app.use((req, res, next) => {
      const logData: any = {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'mcp-session-id': req.headers['mcp-session-id'],
          'last-event-id': req.headers['last-event-id'],
          'origin': req.headers.origin,
          'user-agent': req.headers['user-agent'],
          'content-length': req.headers['content-length']
        },
        ip: req.ip,
        hasBody: !!req.body,
        bodyType: typeof req.body
      };

      // Add body details for debugging (but don't log sensitive data)
      if (req.body && typeof req.body === 'object') {
        logData.bodyKeys = Object.keys(req.body);
        if (req.body.method) {
          logData.mcpMethod = req.body.method;
        }
        if (req.body.jsonrpc) {
          logData.jsonrpcVersion = req.body.jsonrpc;
        }
      }

      logger.debug('[HTTP_TRANSPORT] Request received', logData);
      next();
    });

    logger.debug('[HTTP_TRANSPORT] Middleware setup complete');
  }

  private setupRoutes(): void {
    if (!this.app || !this.server) return;

    logger.debug('[HTTP_TRANSPORT] Setting up routes...');

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'http',
        activeSessions: this.sessionManager?.getActiveSessions().length || 0,
        timestamp: new Date().toISOString()
      });
    });

    // Main MCP endpoint for POST requests (client-to-server communication)
    this.app.post('/mcp', async (req, res) => {
      await this.handleMcpRequest(req, res);
    });

    // Main MCP endpoint for GET requests (server-to-client notifications via SSE)
    this.app.get('/mcp', async (req, res) => {
      await this.handleMcpRequest(req, res);
    });

    // Session termination endpoint
    this.app.delete('/mcp', async (req, res) => {
      await this.handleMcpRequest(req, res);
    });

    logger.debug('[HTTP_TRANSPORT] Routes setup complete');
  }

  private async startServer(): Promise<void> {
    if (!this.app) {
      throw new Error('Express app not initialized');
    }

    return new Promise((resolve, reject) => {
      this.httpServer = this.app!.listen(this.config.port, this.config.host, () => {
        resolve();
      });

      this.httpServer.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  private async handleMcpRequest(req: express.Request, res: express.Response): Promise<void> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    logger.debug('[HTTP_TRANSPORT] Handling MCP request', {
      requestId,
      method: req.method,
      url: req.url,
      sessionId: req.headers['mcp-session-id'],
      hasBody: !!req.body,
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    });

    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.transports.has(sessionId)) {
        // Reuse existing transport
        transport = this.transports.get(sessionId)!;
        this.sessionManager?.updateActivity(sessionId);
        
        logger.debug('[HTTP_TRANSPORT] Reusing existing transport', {
          requestId,
          sessionId,
          method: req.method
        });
      } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        // New initialization request
        logger.info('[HTTP_TRANSPORT] Creating new session for initialize request', {
          requestId
        });

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => this.sessionManager!.createSession(),
          onsessioninitialized: (newSessionId) => {
            this.transports.set(newSessionId, transport);
            logger.info('[HTTP_TRANSPORT] Session initialized', {
              requestId,
              sessionId: newSessionId,
              totalSessions: this.transports.size
            });
          },
          enableDnsRebindingProtection: this.config.enableDnsRebindingProtection,
          ...(this.config.enableDnsRebindingProtection ? { allowedHosts: [this.config.host] } : {}),
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            this.transports.delete(transport.sessionId);
            this.sessionManager?.removeSession(transport.sessionId);
            logger.info('[HTTP_TRANSPORT] Transport closed and cleaned up', {
              sessionId: transport.sessionId,
              remainingTransports: this.transports.size
            });
          }
        };

        // Connect to the MCP server
        await this.server!.connect(transport);
      } else {
        // Invalid request
        logger.warn('[HTTP_TRANSPORT] Invalid request', {
          requestId,
          method: req.method,
          hasSessionId: !!sessionId,
          isInitializeRequest: req.method === 'POST' && isInitializeRequest(req.body),
          bodyType: typeof req.body
        });

        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or invalid initialize request',
          },
          id: null,
        });
        return;
      }

      // Handle the request through the transport
      await transport.handleRequest(req, res, req.body);

      const duration = Date.now() - startTime;
      logger.debug('[HTTP_TRANSPORT] MCP request handled successfully', {
        requestId,
        method: req.method,
        sessionId: transport.sessionId,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('[HTTP_TRANSPORT] Error handling MCP request', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
          },
          id: null,
        });
      }
    }
  }
}
