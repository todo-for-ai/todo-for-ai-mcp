/**
 * MCP tool definitions for todo-for-ai.
 *
 * Tool definitions are split across four files for maintainability:
 *   tools-part1.ts - core task & agent tools
 *   tools-part2.ts - workflow, productivity & analytics tools
 *   tools-part3.ts - agent health, experience & collaboration tools
 *   tools-part4.ts - sandbox, conflict & orchestration tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { toolsPart1 } from './tools-part1.js';
import { toolsPart2 } from './tools-part2.js';
import { toolsPart3 } from './tools-part3.js';
import { toolsPart4 } from './tools-part4.js';

export const tools: Tool[] = [
  ...toolsPart1,
  ...toolsPart2,
  ...toolsPart3,
  ...toolsPart4,
];
