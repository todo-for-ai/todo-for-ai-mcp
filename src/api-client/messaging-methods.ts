import type { ListNotificationsArgs, ListNotificationsResult, MarkNotificationsReadArgs } from '../types.js';
import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function listNotifications(helpers: MethodHelpers, args: ListNotificationsArgs): Promise<ListNotificationsResult> {
  logger.info('[API_CLIENT] Listing notifications', {
    sinceId: args.since_id,
    unreadOnly: args.unread_only,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/notifications', {
      params: helpers.compactParams({
        since_id: args.since_id,
        unread_only: args.unread_only,
        per_page: args.per_page,
      }),
    });

    return helpers.unwrapApiData<ListNotificationsResult>(response.data);
  }, 'listNotifications');
}

export async function markNotificationsRead(helpers: MethodHelpers, args: MarkNotificationsReadArgs): Promise<{ marked_count: number }> {
  logger.info('[API_CLIENT] Marking notifications as read', {
    ids: args.ids,
    all: args.all,
  });

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/notifications/read', helpers.compactParams({
      ids: args.ids,
      all: args.all,
    }));

    return helpers.unwrapApiData<{ marked_count: number }>(response.data);
  }, 'markNotificationsRead');
}

export async function getCollaborationGraphTimeline(helpers: MethodHelpers, days = 14, bucket = 'day', limit = 50): Promise<any> {
  logger.info(`[API_CLIENT] Getting collaboration graph timeline (days=${days}, bucket=${bucket}, limit=${limit})`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/collaboration-graph-timeline', { params: { days, bucket, limit } });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getCollaborationGraphTimeline');
}

export async function broadcastMessage(helpers: MethodHelpers, args: { agent_id: number; content: string; task_id?: number; event_type?: string; payload?: Record<string, unknown> }): Promise<{ recipient_count: number; recipient_agent_ids: number[] }> {
  logger.info(`[API_CLIENT] Broadcasting message from agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/broadcast`, helpers.compactParams({
      content: args.content,
      task_id: args.task_id,
      event_type: args.event_type,
      payload: args.payload,
    }));
    return helpers.unwrapApiData<{ recipient_count: number; recipient_agent_ids: number[] }>(response.data);
  }, `broadcastMessage(${args.agent_id})`);
}

export async function collaborationMetrics(helpers: MethodHelpers, args?: { project_id?: number; days?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Fetching collaboration metrics`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      project_id: args?.project_id,
      days: args?.days,
    });
    const response = await helpers.client.get('agents/dashboard/metrics', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'collaborationMetrics');
}

export async function collaborationGraph(helpers: MethodHelpers, args?: { limit?: number }): Promise<any> {
  logger.info('[API_CLIENT] Fetching collaboration graph');
  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams(args || {});
    const response = await helpers.client.get('agents/collaboration-graph', { params });
    return helpers.unwrapApiData<any>(response.data);
  }, 'collaborationGraph');
}

export async function listChannels(helpers: MethodHelpers, args?: { project_id?: number; task_id?: number }): Promise<any[]> {
  logger.info(`[API_CLIENT] Listing collaboration channels`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ project_id: args?.project_id, task_id: args?.task_id });
    const response = await helpers.client.get('agents/channels', { params });
    return helpers.unwrapApiData<any[]>(response.data);
  }, 'listChannels');
}

export async function createChannel(helpers: MethodHelpers, args: { name: string; description?: string; project_id?: number; task_id?: number; agent_ids?: number[] }): Promise<any> {
  logger.info(`[API_CLIENT] Creating channel "${args.name}"`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/channels', helpers.compactParams(args));
    return helpers.unwrapApiData<any>(response.data);
  }, `createChannel("${args.name}")`);
}

export async function sendChannelMessage(helpers: MethodHelpers, args: { channel_id: number; agent_id?: number; content: string; message_type?: string }): Promise<any> {
  logger.info(`[API_CLIENT] Sending message to channel #${args.channel_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/channels/${args.channel_id}/messages`, helpers.compactParams(args));
    return helpers.unwrapApiData<any>(response.data);
  }, `sendChannelMessage(${args.channel_id})`);
}

export async function listChannelMessages(helpers: MethodHelpers, args: { channel_id: number; page?: number; per_page?: number }): Promise<any[]> {
  logger.info(`[API_CLIENT] Listing messages in channel #${args.channel_id}`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({ page: args.page, per_page: args.per_page });
    const response = await helpers.client.get(`agents/channels/${args.channel_id}/messages`, { params });
    return helpers.unwrapApiData<any[]>(response.data);
  }, `listChannelMessages(${args.channel_id})`);
}

export async function listCollaborationTemplates(helpers: MethodHelpers, params?: Record<string, string>): Promise<any> {
  logger.info(`[API_CLIENT] Listing collaboration templates`);

  return helpers.executeWithRetry(async () => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await helpers.client.get(`agents/collaboration-templates${qs}`);
    return helpers.unwrapApiData<any>(response.data);
  }, 'listCollaborationTemplates');
}

export async function createCollaborationTemplate(helpers: MethodHelpers, args: { name: string; agent_specs: any[]; description?: string; category?: string; workflow_id?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Creating collaboration template ${args.name}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post('agents/collaboration-templates', args);
    return helpers.unwrapApiData<any>(response.data);
  }, `createCollaborationTemplate(${args.name})`);
}

export async function deleteCollaborationTemplate(helpers: MethodHelpers, templateId: number): Promise<any> {
  logger.info(`[API_CLIENT] Deleting collaboration template ${templateId}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/collaboration-templates/${templateId}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `deleteCollaborationTemplate(${templateId})`);
}

export async function instantiateCollaborationTemplate(helpers: MethodHelpers, args: { template_key: string; project_id?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Instantiating collaboration template ${args.template_key}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/collaboration-templates/${args.template_key}/instantiate`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `instantiateCollaborationTemplate(${args.template_key})`);
}

export async function addDeliberationMessage(helpers: MethodHelpers, protocolId: number, data: Record<string, any>): Promise<any> {
  logger.info(`[API_CLIENT] Adding deliberation message to protocol ${protocolId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/protocols/${protocolId}/deliberate`, data);
    return helpers.unwrapApiData<any>(response.data);
  }, `addDeliberationMessage(${protocolId})`);
}

export async function getChannelActivityTrend(helpers: MethodHelpers, days = 14, limit = 10): Promise<any> {
  logger.info('[API_CLIENT] Getting channel activity trend', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/channels/activity-trend', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getChannelActivityTrend');
}
