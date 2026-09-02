import { describe, it, expect } from 'vitest';
import { tools } from '../../src/tools.js';
import { handlerMap } from '../../src/handlers/index.js';

/**
 * P1.4 外部 Agent 闭环工具（双层 MCP）：schema 注册 + handler 接线。
 * 后端 /mcp/call 语义由 api-server 测试覆盖，这里验证 npm 侧注册面完整。
 */
const AGENT_LOOP_TOOLS = [
  'list_my_tasks',
  'search_tasks',
  'update_task_status',
  'report_progress',
  'request_approval',
  'get_task_evidence',
  'set_task_dod',
] as const;

describe('agent loop tools registration', () => {
  it('registers every agent-loop tool with a schema and a handler', () => {
    for (const name of AGENT_LOOP_TOOLS) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `tool ${name} should be registered`).toBeDefined();
      expect(tool!.description).toBeTruthy();
      expect(tool!.inputSchema).toMatchObject({ type: 'object' });
      expect(handlerMap[name], `handler for ${name} should be wired`).toBeDefined();
    }
  });

  it('list_my_tasks declares no required arguments', () => {
    const tool = tools.find((t) => t.name === 'list_my_tasks')!;
    expect(tool.inputSchema).toMatchObject({ required: [] });
  });

  it('update_task_status requires task_id and status', () => {
    const tool = tools.find((t) => t.name === 'update_task_status')!;
    expect(tool.inputSchema).toMatchObject({ required: ['task_id', 'status'] });
  });

  it('request_approval requires task_id and question', () => {
    const tool = tools.find((t) => t.name === 'request_approval')!;
    expect(tool.inputSchema).toMatchObject({ required: ['task_id', 'question'] });
  });
});
