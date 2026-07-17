import type { HandlerMap } from './types.js';

export const orchestratorHandlers: HandlerMap = {
  'orchestrate': async (args, ctx) => {
    const result = await ctx.apiClient.orchestrate();
    const d = result?.data || result;
    const lines = [
      `编排完成 (耗时 ${d?.duration_seconds ?? '?'}s):`,
      `  健康: 离线 Agent ${d?.stale_agents ?? 0}, 过期租约 ${d?.expired_leases ?? 0}, 升级任务 ${d?.escalated_tasks ?? 0}`,
      `  工作流超时: ${d?.timed_out_steps ?? 0} 个步骤`,
      `  触发器: 触发 ${d?.triggers_fired ?? 0} 个 (run IDs: ${(d?.trigger_run_ids || []).join(',') || '无'})`,
      `  冲突: 检测 ${d?.conflicts_detected ?? 0}, 自动解决 ${d?.conflicts_auto_resolved ?? 0}, 跳过 ${d?.conflicts_skipped ?? 0}`,
    ];
    if (d?.errors?.length) {
      lines.push(`  错误 (${d.errors.length}): ${d.errors.join('; ')}`);
    }
    return ctx.toToolResponse(lines.join('\n'), result);
  },

  'get_orchestrator_status': async (args, ctx) => {
    const result = await ctx.apiClient.getOrchestratorStatus();
    const d = result?.data || result;
    const enabled = d?.enabled ? '运行中' : '未运行';
    const last = d?.last_run;
    const lastLine = last
      ? `上次运行: ${last.summary} (耗时 ${last.duration_seconds}s)`
      : '上次运行: 无';
    return ctx.toToolResponse(`编排调度器状态: ${enabled}\n${lastLine}`, result);
  },

  'list_orchestrator_history': async (args, ctx) => {
    const result = await ctx.apiClient.listOrchestratorHistory(args);
    const d = result?.data || result;
    const items = d?.items || [];
    const trend = d?.trend || {};
    const lines = items.map((r: any) => {
      const errs = r.error_count > 0 ? ` ⚠${r.error_count}err` : '';
      return `  • [${r.created_at}] ${r.triggered_by} · ${r.summary}${errs} (${r.duration_seconds}s)`;
    });
    const summary = lines.length
      ? `编排历史 (${items.length} 条, 均耗时 ${trend.avg_duration ?? 0}s, 累计触发 ${trend.total_triggers_fired ?? 0}, 累计解决冲突 ${trend.total_conflicts_resolved ?? 0}, 累计错误 ${trend.total_errors ?? 0}):\n${lines.join('\n')}`
      : '无编排历史记录。';
    return ctx.toToolResponse(summary, result);
  },

  'orchestrator_daily_trend': async (args, ctx) => {
    const result = await ctx.apiClient.orchestratorDailyTrend(args);
    const d = result?.data || result;
    const days = d?.days || [];
    const totals = d?.totals || {};
    const lines = days.map((day: any) => {
      const src = `${day.manual_runs}手/${day.scheduler_runs}调`;
      return `  • ${day.date}: ${day.runs} 次 (${src}) · 触发 ${day.triggers_fired} · 解决冲突 ${day.conflicts_resolved} · 错误 ${day.errors} · 均 ${day.avg_duration}s`;
    });
    const summary = lines.length
      ? `编排按天趋势 (${days.length} 天, 共 ${totals.runs ?? 0} 次, 累计触发 ${totals.triggers_fired ?? 0}, 累计解决冲突 ${totals.conflicts_resolved ?? 0}, 累计错误 ${totals.errors ?? 0}):\n${lines.join('\n')}`
      : '无编排按天趋势数据。';
    return ctx.toToolResponse(summary, result);
  },

  'health_check': async (args, ctx) => {
    const result = await ctx.apiClient.healthCheck();
    const summary = `Health check complete: ${result?.stale_agents ?? 0} stale agent(s), ${result?.expired_leases ?? 0} expired lease(s), ${result?.escalated_tasks ?? 0} escalated task(s).`;
    return ctx.toToolResponse(summary, result);
  },

  'fire_due_triggers': async (args, ctx) => {
    const result = await ctx.apiClient.fireDueTriggers();
    const count = result?.fired_count ?? 0;
    const summary = count === 0
      ? 'No due triggers found.'
      : `Fired ${count} trigger(s): ${result.fired.map((f: any) => `"${f.trigger_name}" → run #${f.workflow_run_id}`).join(', ')}`;
    return ctx.toToolResponse(summary, result);
  },
};
