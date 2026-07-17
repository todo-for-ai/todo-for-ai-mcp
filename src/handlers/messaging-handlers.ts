import type { HandlerMap } from './types.js';

export const messagingHandlers: HandlerMap = {
  'list_notifications': async (args, ctx) => {
    const result = await ctx.apiClient.listNotifications(args || {});
    const lines = [`Notifications (${result.unread_count} unread):`];
    for (const n of result.items) {
      const readMark = n.is_read ? '✓' : '●';
      const agentLabel = n.agent_name ? ` from ${n.agent_name}` : '';
      const taskLabel = n.task_title ? ` on "${n.task_title}"` : (n.task_id ? ` on task #${n.task_id}` : '');
      lines.push(`  ${readMark} #${n.id} [${n.event_type}]${agentLabel}${taskLabel} — ${n.created_at}`);
    }
    return ctx.toToolResponse(lines.join('\n'), result);
  },

  'mark_notifications_read': async (args, ctx) => {
    const result = await ctx.apiClient.markNotificationsRead(args);
    const summary = args.all
      ? `Marked all notifications as read (${result.marked_count} items).`
      : `Marked ${result.marked_count} notification(s) as read.`;
    return ctx.toToolResponse(summary, result);
  },

  'get_collaboration_graph_timeline': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 14) || 14));
    const bucket = args?.bucket === 'week' ? 'week' : 'day';
    const limit = Math.max(1, Math.min(200, Number(args?.limit ?? 50) || 50));
    const result = await ctx.apiClient.getCollaborationGraphTimeline(days, bucket, limit);
    const data = result?.data || result || {};
    const snapshots: any[] = data.snapshots || [];
    const lines = snapshots.map((s: any) => {
      const topEdges = (s.edges || []).slice(0, 5).map((e: any) => `${e.source_name}↔${e.target_name}(${e.count})`);
      return `- ${s.date}: ${s.active_agents}活跃Agent ${s.total_edges}条边 top[${topEdges.join(', ')}]`;
    });
    return ctx.toToolResponse(
      `协作图时段快照(近${data.days ?? days}天, ${bucket}分桶):\n${lines.join('\n') || '无协作数据'}`,
      result,
    );
  },

  'broadcast_message': async (args, ctx) => {
    const result = await ctx.apiClient.broadcastMessage(args);
    const count = result?.recipient_count ?? 0;
    const summary = `Broadcast sent from Agent #${args.agent_id} to ${count} active Agent(s).`;
    return ctx.toToolResponse(summary, result);
  },

  'collaboration_metrics': async (args, ctx) => {
    const result = await ctx.apiClient.collaborationMetrics(args);
    const t = result?.tasks ?? {};
    const a = result?.agents ?? {};
    const w = result?.workflows ?? {};
    const summary = [
      `Collaboration Metrics (last ${result?.window_days ?? 7} days):`,
      `Tasks: ${t.total} total, ${t.done} done (${t.completion_rate}%), ${t.in_progress} in progress, ${t.blocked} blocked`,
      `Agents: ${a.total} total, ${a.active} active, ${a.utilization_pct}% utilization`,
      `Workflows: ${w.total_runs} runs, ${w.success_rate}% success rate, ${w.running} running`,
      `Handoffs: ${result?.handoffs ?? 0}`,
    ].join('\n');
    return ctx.toToolResponse(summary, result);
  },

  'collaboration_graph': async (args, ctx) => {
    const result = await ctx.apiClient.collaborationGraph(args);
    const d = result?.data || result;
    const nodes = d?.nodes || [];
    const edges = d?.edges || [];
    const totalEdges = d?.total_edges ?? 0;
    const lines = edges.map((e: any) => {
      const fwd = e.source_to_target ?? 0;
      const rev = e.target_to_source ?? 0;
      const dir = fwd && rev
        ? `${e.source}→${e.target}:${fwd} ${e.target}→${e.source}:${rev}`
        : `${e.source}↔${e.target}`;
      return `  • ${dir}: 共 ${e.count} 条`;
    });
    const summary = lines.length
      ? `Agent 协作关系图 (${nodes.length} 节点, ${edges.length} 边, 共 ${totalEdges} 条关系):\n${lines.join('\n')}`
      : '暂无协作关系数据。';
    return ctx.toToolResponse(summary, result);
  },

  'list_channels': async (args, ctx) => {
    const result = await ctx.apiClient.listChannels(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'No channels found.'
      : `${items.length} channel(s): ${items.map((c: any) => `"${c.name}" (${(c.members || []).length} members)`).join(', ')}`;
    return ctx.toToolResponse(summary, result);
  },

  'create_channel': async (args, ctx) => {
    const result = await ctx.apiClient.createChannel(args);
    const memberCount = (result?.members || []).length;
    return ctx.toToolResponse(`Channel "${result.name}" created (ID: ${result.id}) with ${memberCount} member(s).`, result);
  },

  'send_channel_message': async (args, ctx) => {
    const result = await ctx.apiClient.sendChannelMessage(args);
    return ctx.toToolResponse(`Message sent to channel #${args.channel_id}.`, result);
  },

  'list_channel_messages': async (args, ctx) => {
    const result = await ctx.apiClient.listChannelMessages(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? `No messages in channel #${args.channel_id}.`
      : `${items.length} message(s) in channel #${args.channel_id}.`;
    return ctx.toToolResponse(summary, result);
  },

  'list_collaboration_templates': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.category) params.category = args.category;
    const result = await ctx.apiClient.listCollaborationTemplates(params);
    const templates = result?.data || result || [];
    const items = Array.isArray(templates) ? templates : [];
    const summary = items.map((t: any) => `• ${t.name} (${t.is_builtin ? '内置' : '自定义'}, ${t.category || '未分类'}): ${t.description || '无描述'}`).join('\n');
    return ctx.toToolResponse(`协作模板列表 (${items.length}):\n${summary || '无模板'}`, result);
  },

  'create_collaboration_template': async (args, ctx) => {
    const result = await ctx.apiClient.createCollaborationTemplate(args);
    return ctx.toToolResponse(`协作模板已创建: ${args?.name}`, result);
  },

  'delete_collaboration_template': async (args, ctx) => {
    const result = await ctx.apiClient.deleteCollaborationTemplate(args?.template_id);
    return ctx.toToolResponse(`协作模板已删除 (ID: ${args?.template_id})`, result);
  },

  'instantiate_collaboration_template': async (args, ctx) => {
    const result = await ctx.apiClient.instantiateCollaborationTemplate(args);
    const data = result?.data || result;
    const agentCount = data?.agents?.length || 0;
    const channelId = data?.channel?.id;
    const wfRunId = data?.workflow_run?.id;
    return ctx.toToolResponse(
      `模板已实例化: ${agentCount} 个 Agent 已创建${channelId ? `, 频道 #${channelId}` : ''}${wfRunId ? `, 工作流运行 #${wfRunId}` : ''}`,
      result
    );
  },

  'add_deliberation_message': async (args, ctx) => {
    const result = await ctx.apiClient.addDeliberationMessage(args?.protocol_id, {
      agent_id: args?.agent_id,
      message_type: args?.message_type,
      content: args?.content,
    });
    return ctx.toToolResponse(
      `已向协议 #${args?.protocol_id} 添加 ${args?.message_type} 消息`,
      result,
    );
  },

  'get_channel_activity_trend': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 14) || 14));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getChannelActivityTrend(days, limit);
    const data = result?.data || result || {};
    const channels: any[] = data.channels || [];
    const lines = channels.map((c: any) => {
      const total = (c.daily_counts || []).reduce((s: number, v: number) => s + v, 0);
      return `• ${c.channel_name}: ${total}条消息 活跃成员${c.active_members ?? 0}`;
    });
    return ctx.toToolResponse(
      `频道活跃度趋势(近${data.days ?? days}天):\n${lines.join('\n') || '无频道数据'}`,
      result,
    );
  },
};
