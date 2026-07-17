import type { MethodHelpers } from './context.js';
import { logger } from '../logger.js';

export async function listKnowledgeEntries(helpers: MethodHelpers, args: { agent_id: number; domain?: string; entry_type?: string; tag?: string; search?: string; include_content?: boolean }): Promise<any> {
  logger.info(`[API_CLIENT] Listing knowledge entries for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      domain: args.domain,
      entry_type: args.entry_type,
      tag: args.tag,
      search: args.search,
      include_content: args.include_content,
    });
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await helpers.client.get(`agents/${args.agent_id}/knowledge${qs}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `listKnowledgeEntries(${args.agent_id})`);
}

export async function createKnowledgeEntry(helpers: MethodHelpers, args: { agent_id: number; title: string; content: string; domain?: string; tags?: string[]; entry_type?: string; source_task_id?: number; confidence?: number; shared_with_project?: boolean; project_id?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Creating knowledge entry for agent ${args.agent_id}: ${args.title}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/knowledge`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `createKnowledgeEntry(${args.agent_id})`);
}

export async function getKnowledgeEntry(helpers: MethodHelpers, args: { agent_id: number; entry_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Getting knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get(`agents/${args.agent_id}/knowledge/${args.entry_id}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `getKnowledgeEntry(${args.entry_id})`);
}

export async function updateKnowledgeEntry(helpers: MethodHelpers, args: { agent_id: number; entry_id: number; title?: string; content?: string; domain?: string; tags?: string[]; confidence?: number; is_valid?: boolean; shared_with_project?: boolean }): Promise<any> {
  logger.info(`[API_CLIENT] Updating knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.put(`agents/${args.agent_id}/knowledge/${args.entry_id}`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `updateKnowledgeEntry(${args.entry_id})`);
}

export async function deleteKnowledgeEntry(helpers: MethodHelpers, args: { agent_id: number; entry_id: number }): Promise<any> {
  logger.info(`[API_CLIENT] Deleting knowledge entry ${args.entry_id} for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.delete(`agents/${args.agent_id}/knowledge/${args.entry_id}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `deleteKnowledgeEntry(${args.entry_id})`);
}

export async function searchKnowledge(helpers: MethodHelpers, args: { agent_id: number; q?: string; domain?: string; tags?: string; entry_type?: string; limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Searching knowledge for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      q: args.q,
      domain: args.domain,
      tags: args.tags,
      entry_type: args.entry_type,
      limit: args.limit,
    });
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await helpers.client.get(`agents/${args.agent_id}/knowledge/search${qs}`);
    return helpers.unwrapApiData<any>(response.data);
  }, `searchKnowledge(${args.agent_id})`);
}

export async function listSharedKnowledge(helpers: MethodHelpers, args?: { domain?: string; entry_type?: string; search?: string }): Promise<any> {
  logger.info(`[API_CLIENT] Listing shared knowledge`);

  return helpers.executeWithRetry(async () => {
    const params = helpers.compactParams({
      domain: args?.domain,
      entry_type: args?.entry_type,
      search: args?.search,
    });
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await helpers.client.get(`agents/knowledge/shared${qs}`);
    return helpers.unwrapApiData<any>(response.data);
  }, 'listSharedKnowledge');
}

export async function autoExtractKnowledge(helpers: MethodHelpers, args: { agent_id: number; limit?: number }): Promise<any> {
  logger.info(`[API_CLIENT] Auto-extracting knowledge for agent ${args.agent_id}`);

  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/${args.agent_id}/knowledge/auto-extract`, args);
    return helpers.unwrapApiData<any>(response.data);
  }, `autoExtractKnowledge(${args.agent_id})`);
}

export async function acknowledgeConflict(helpers: MethodHelpers, conflictId: number): Promise<any> {
  logger.info(`[API_CLIENT] Acknowledging conflict ${conflictId}`);
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.post(`agents/conflicts/${conflictId}/acknowledge`, {});
    return helpers.unwrapApiData<any>(response.data);
  }, `acknowledgeConflict(${conflictId})`);
}

export async function getKnowledgePropagationNetwork(helpers: MethodHelpers, days = 90, limit = 20): Promise<any> {
  logger.info('[API_CLIENT] Getting knowledge propagation network', { days, limit });
  return helpers.executeWithRetry(async () => {
    const response = await helpers.client.get('agents/knowledge-propagation-network', {
      params: { days, limit },
    });
    return helpers.unwrapApiData<any>(response.data);
  }, 'getKnowledgePropagationNetwork');
}
