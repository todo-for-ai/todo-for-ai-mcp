import type { TodoApiClient } from '../api-client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP tool response shape — re-exported from the SDK for convenience.
 */
export type { CallToolResult as ToolResponse };

/**
 * Context object passed to every handler function, providing access to
 * the shared API client, response formatter, and instance metadata.
 */
export interface HandlerContext {
  apiClient: TodoApiClient;
  instanceId: string;
  toToolResponse: (summary: string, data?: unknown) => CallToolResult;
}

/**
 * A single tool handler: receives the raw `args` from the MCP request
 * and a context object, returns a CallToolResult.
 */
export type HandlerFn = (args: any, ctx: HandlerContext) => Promise<CallToolResult>;

/**
 * Map from MCP tool name to its handler function.
 */
export type HandlerMap = Record<string, HandlerFn>;
