import type { MethodHelpers } from '../context.js';
import { logger } from '../../logger.js';

export async function listAuditLogs(helpers: MethodHelpers, args?: { action?: string; resource_type?: string; resource_id?: number; actor_type?: string; actor_agent_id?: number; project_id?: number; page?: number; per_page?: number }): Promise<any> {
  logger.info('[API_CLIENT] Listing audit logs', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/audit-logs', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData(response.data);
  }, 'listAuditLogs');
}

export async function listSecurityEvents(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; page?: number; per_page?: number }): Promise<any> {
  logger.info('[API_CLIENT] Listing security events', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'listSecurityEvents');
}

export async function exportSecurityEvents(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string; format?: string }): Promise<string> {
  logger.info('[API_CLIENT] Exporting security events', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/export', {
      params: helpers.compactParams(args || {}),
      responseType: 'text',
      transformResponse: (data: any) => data,
    });
    // When responseType is text, axios returns the raw string in response.data.
    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  }, 'exportSecurityEvents');
}

export async function securityEventsDailyTrend(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
  logger.info('[API_CLIENT] Fetching security events daily trend', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/daily-trend', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'securityEventsDailyTrend');
}

export async function securityEventsByAgent(helpers: MethodHelpers, args?: { agent_id?: number; workflow_run_id?: number; event_type?: string; severity?: string; since?: string; until?: string; search?: string }): Promise<any> {
  logger.info('[API_CLIENT] Fetching security events by agent', args);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/security/events/by-agent', {
      params: helpers.compactParams(args || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'securityEventsByAgent');
}

export async function sendAgentMessage(helpers: MethodHelpers, args: { from_agent_id: number; to_agent_id: number; content: string; task_id?: number; message_type?: string; metadata?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Sending message from agent ${args.from_agent_id} to agent ${args.to_agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.from_agent_id}/message/${args.to_agent_id}`, helpers.compactParams({
      content: args.content,
      task_id: args.task_id,
      message_type: args.message_type,
      metadata: args.metadata,
    }));
    return helpers.unwrapApiData<any>(response.data);
  }, `sendAgentMessage(${args.from_agent_id}->${args.to_agent_id})`);
}

export async function getAgentMessages(helpers: MethodHelpers, args: { agent_id: number; page?: number; per_page?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting messages for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      page: args.page,
      per_page: args.per_page,
    });
    const response = await helpers.client.get(`agents/${args.agent_id}/messages`, { params });
    return helpers.unwrapApiData<any>(response.data);
  }, `getAgentMessages(${args.agent_id})`);
}