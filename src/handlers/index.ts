import { taskHandlers } from './task-handlers.js';
import { agentHandlers } from './agent-handlers.js';
import { workflowHandlers } from './workflow-handlers.js';
import { knowledgeHandlers } from './knowledge-handlers.js';
import { messagingHandlers } from './messaging-handlers.js';
import { sandboxHandlers } from './sandbox-handlers.js';
import { conflictHandlers } from './conflict-handlers.js';
import { orchestratorHandlers } from './orchestrator-handlers.js';
import { protocolHandlers } from './protocol-handlers.js';

/**
 * Merged handler map: MCP tool name → handler function.
 * Built by merging all domain-specific handler maps.
 */
export const handlerMap: Record<string, import('./types.js').HandlerFn> = {
  ...taskHandlers,
  ...agentHandlers,
  ...workflowHandlers,
  ...knowledgeHandlers,
  ...messagingHandlers,
  ...sandboxHandlers,
  ...conflictHandlers,
  ...orchestratorHandlers,
  ...protocolHandlers,
};
