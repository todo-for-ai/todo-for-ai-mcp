import type { HandlerMap } from './types.js';

export const conflictHandlers: HandlerMap = {
  'scan_conflicts': async (args, ctx) => {
    const result = await ctx.apiClient.scanConflicts();
    const d = result?.data || result;
    const conflicts = d?.conflicts || [];
    return ctx.toToolResponse(
      `冲突扫描完成: 检测到 ${d?.detected || 0} 个新冲突\n` +
      conflicts.map((c: any) => `• #${c.id} [${c.conflict_type}/${c.severity}] ${c.title}`).join('\n'),
      result,
    );
  },

  'list_conflicts': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.status) params.status = args.status;
    if (args?.type) params.type = args.type;
    if (args?.active_only !== undefined) params.active_only = String(args.active_only);
    const result = await ctx.apiClient.listConflicts(params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return ctx.toToolResponse(
      `冲突列表 (共 ${total} 个):\n` +
      items.map((c: any) => `• #${c.id} [${c.conflict_type}/${c.status}/${c.severity}] ${c.title}`).join('\n'),
      result,
    );
  },

  'get_conflict': async (args, ctx) => {
    const result = await ctx.apiClient.getConflict(args?.conflict_id);
    const c = result?.data?.conflict || result?.data || result;
    return ctx.toToolResponse(
      `冲突 #${c?.id} [${c?.conflict_type}/${c?.status}]\n` +
      `标题: ${c?.title}\n描述: ${c?.description || '-'}\n` +
      `涉及 Agent: ${(c?.agent_ids || []).join(', ') || '-'}\n` +
      `建议策略: ${c?.suggested_strategy || '-'}\n` +
      `证据: ${c?.evidence ? JSON.stringify(c.evidence) : '-'}`,
      result,
    );
  },

  'resolve_conflict': async (args, ctx) => {
    const payload: Record<string, any> = { strategy: args?.strategy };
    if (args?.description) payload.description = args.description;
    const result = await ctx.apiClient.resolveConflict(args?.conflict_id, payload);
    const d = result?.data || result;
    const actions = d?.actions || [];
    return ctx.toToolResponse(
      `冲突 #${args?.conflict_id} 已解决 (策略: ${args?.strategy})${actions.length ? '\n执行动作:\n' + actions.map((a: string) => `  • ${a}`).join('\n') : ''}`,
      result,
    );
  },

  'acknowledge_conflict': async (args, ctx) => {
    const result = await ctx.apiClient.acknowledgeConflict(args?.conflict_id);
    return ctx.toToolResponse(`冲突 #${args?.conflict_id} 已确认`, result);
  },

  'ignore_conflict': async (args, ctx) => {
    const result = await ctx.apiClient.ignoreConflict(args?.conflict_id);
    return ctx.toToolResponse(`冲突 #${args?.conflict_id} 已忽略`, result);
  },

  'get_conflicts_dashboard': async (args, ctx) => {
    const result = await ctx.apiClient.getConflictsDashboard();
    const d = result?.data || result;
    const byType = d?.by_type || {};
    const byStatus = d?.by_status || {};
    const bySev = d?.by_severity || {};
    const lat = d?.resolution_latency || {};
    const fmtDur = (s: any) => {
      if (typeof s !== 'number') return '?';
      if (s < 60) return `${s.toFixed(0)}s`;
      if (s < 3600) return `${(s / 60).toFixed(1)}m`;
      if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
      return `${(s / 86400).toFixed(1)}d`;
    };
    const latLine = lat?.count ? `解决耗时: 均${fmtDur(lat.avg_seconds)} 中位${fmtDur(lat.median_seconds)} 最长${fmtDur(lat.max_seconds)} (${lat.count}个)` : '解决耗时: 暂无';
    return ctx.toToolResponse(
      `冲突仪表盘:\n` +
      `总数: ${d?.total || 0}, 活跃: ${d?.active || 0}\n` +
      `${latLine}\n` +
      `按类型: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按严重度: ${Object.entries(bySev).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      result,
    );
  },

  'get_conflicts_trend': async (args, ctx) => {
    const result = await ctx.apiClient.getConflictsTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const totalDetected = trend.reduce((s: number, t: any) => s + (t.detected || 0), 0);
    const totalResolved = trend.reduce((s: number, t: any) => s + (t.resolved || 0), 0);
    const recent = trend.slice(-10)
      .map((t: any) => `• ${t.date}: 检测 ${t.detected || 0} / 解决 ${t.resolved || 0}`)
      .join('\n');
    return ctx.toToolResponse(
      `冲突趋势 (近 ${d?.days || 30} 天): 累计检测 ${totalDetected}, 累计解决 ${totalResolved}\n${recent || '暂无数据'}`,
      result,
    );
  },

  'get_conflicts_strategy_stats': async (args, ctx) => {
    const result = await ctx.apiClient.getConflictsStrategyStats();
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.strategy}: 用 ${it.uses} 次, 复发 ${it.recurrences} (${(it.recurrence_rate * 100).toFixed(0)}%)`)
      .join('\n');
    return ctx.toToolResponse(`冲突解决策略效果:\n${summary || '暂无已解决冲突'}`, result);
  },

  'auto_resolve_conflicts': async (args, ctx) => {
    const result = await ctx.apiClient.autoResolveConflicts();
    const d = result?.data || result;
    const resolved = d?.auto_resolved || 0;
    const skipped = d?.skipped || 0;
    return ctx.toToolResponse(
      `冲突自动解决完成: 检测到 ${d?.detected || 0} 个新冲突, 自动解决 ${resolved} 个, 跳过 ${skipped} 个`,
      result,
    );
  },
};
