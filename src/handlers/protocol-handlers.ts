import type { HandlerMap } from './types.js';

export const protocolHandlers: HandlerMap = {
  'list_protocols': async (args, ctx) => {
    const result = await ctx.apiClient.listProtocols(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((p: any) => `• [${p.protocol_type}] ${p.title} (${p.status}, 发起者: Agent #${p.initiator_agent_id})`).join('\n');
    return ctx.toToolResponse(`协作协议 (${data?.total || items.length}):\n${summary || '暂无协议'}`, result);
  },

  'create_protocol': async (args, ctx) => {
    const result = await ctx.apiClient.createProtocol(args);
    return ctx.toToolResponse(`协作协议已创建: ${args?.title} (${args?.protocol_type})`, result);
  },

  'get_protocol': async (args, ctx) => {
    const result = await ctx.apiClient.getProtocol(args);
    const data = result?.data || result;
    const msgs = data?.messages || [];
    const msgSummary = msgs.map((m: any) => `  • Agent #${m.agent_id} [${m.message_type}]: ${(m.content || '').substring(0, 80)}`).join('\n');
    return ctx.toToolResponse(
      `协议: ${data?.title}\n类型: ${data?.protocol_type} | 状态: ${data?.status}\n响应 (${msgs.length}):\n${msgSummary || '  暂无响应'}`,
      result
    );
  },

  'respond_to_protocol': async (args, ctx) => {
    const result = await ctx.apiClient.respondToProtocol(args);
    return ctx.toToolResponse(`已响应协议 #${args?.protocol_id}: ${args?.message_type}`, result);
  },

  'resolve_protocol': async (args, ctx) => {
    const result = await ctx.apiClient.resolveProtocol(args);
    return ctx.toToolResponse(`协议 #${args?.protocol_id} 已${args?.resolution}`, result);
  },

  'get_protocol_analytics': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.days) params.days = String(args.days);
    const result = await ctx.apiClient.getProtocolAnalytics(params);
    const data = result?.data || result;
    const byType = data?.by_type || {};
    const byStatus = data?.by_status || {};
    return ctx.toToolResponse(
      `协议分析 (近 ${data?.window_days || 30} 天):\n` +
      `总协议数: ${data?.total_protocols || 0}, 解决率: ${data?.resolution_rate || 0}%\n` +
      `按类型: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `平均消息数: ${data?.avg_messages_per_protocol || 0}`,
      result,
    );
  },

  'get_protocol_decision_latency': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getProtocolDecisionLatency(days);
    const data = result?.data || result || {};
    const types: any[] = data.types || [];
    const lines = types.map((t: any) => {
      const fmt = (s: number) => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${(s / 60).toFixed(1)}m` : `${s}s`;
      return `• ${t.protocol_type}: ${t.count}次 均${fmt(t.avg_seconds)} 中位${fmt(t.median_seconds)}`;
    });
    return ctx.toToolResponse(
      `协议决策延迟(近${data.days ?? days}天, 共${data.total ?? 0}个已决议):\n${lines.join('\n') || '无决议数据'}`,
      result,
    );
  },
};
