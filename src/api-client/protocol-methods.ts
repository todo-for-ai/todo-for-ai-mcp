import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function listProtocols(helpers: MethodHelpers, args?: { project_id?: number; status?: string; protocol_type?: string; initiator_agent_id?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Listing collaboration protocols`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams(args || {});
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await helpers.client.get(`agents/protocols${qs}`);
    return helpers.unwrapApiData<any>(response.data);
  }, 'listProtocols');
}

export async function createProtocol(helpers: MethodHelpers, args: { protocol_type: string; title: string; initiator_agent_id: number; description?: string; channel_id?: number; project_id?: number; task_id?: number; config?: Record<string, unknown>; deadline?: string }): Promise<any> {
  logger.info(`[API_CLIENT] Creating protocol: ${args.title}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/protocols', args);
    return helpers.unwrapApiData<any>(response.data);
  }, `createProtocol(${args.title})`);
}

export async function getProtocol(helpers: MethodHelpers, args: { protocol_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting protocol ${args.protocol_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/protocols/${args.protocol_id}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getProtocol(${args.protocol_id})`);
}

export async function respondToProtocol(helpers: MethodHelpers, args: { protocol_id: number; agent_id: number; message_type: string; content?: string; payload?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Responding to protocol ${args.protocol_id}: ${args.message_type}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/protocols/${args.protocol_id}/respond`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `respondToProtocol(${args.protocol_id})`);
}

export async function resolveProtocol(helpers: MethodHelpers, args: { protocol_id: number; resolution: string; result?: Record<string, unknown> }): Promise<any> {
  logger.info(`[API_CLIENT] Resolving protocol ${args.protocol_id}: ${args.resolution}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/protocols/${args.protocol_id}/resolve`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `resolveProtocol(${args.protocol_id})`);
}

export async function getProtocolAnalytics(helpers: MethodHelpers, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Getting protocol analytics`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/protocols/analytics', {
      params: helpers.compactParams(params || {}),
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getProtocolAnalytics');
}

export async function getProtocolDecisionLatency(helpers: MethodHelpers, days = 30): Promise<any> {
  logger.info('[API_CLIENT] Getting protocol decision latency', { days });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/protocol-decision-latency', {
      params: { days },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getProtocolDecisionLatency');
}
