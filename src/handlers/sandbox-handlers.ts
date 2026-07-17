import type { HandlerMap } from './types.js';

export const sandboxHandlers: HandlerMap = {
  'list_sandboxes': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.agent_id) params.agent_id = String(args.agent_id);
    if (args?.active_only) params.active_only = 'true';
    params.include_stats = args?.include_stats === false ? 'false' : 'true';
    const result = await ctx.apiClient.listSandboxes(params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return ctx.toToolResponse(
      `沙盒策略列表 (共 ${total} 个):\n` +
      items.map((s: any) => `• #${s.id} ${s.name} [${s.security_level}] agent=${s.agent_id || '未绑定'} 执行=${s.stats?.total_executions || 0} 违规=${s.stats?.violations || 0} ${s.is_active ? '活跃' : '停用'}`).join('\n'),
      result,
    );
  },

  'create_sandbox': async (args, ctx) => {
    const payload: Record<string, any> = {
      name: args?.name,
      security_level: args?.security_level || 'moderate',
    };
    for (const k of ['description', 'agent_id', 'allowed_tools', 'blocked_tools', 'allowed_network_hosts', 'fs_write_paths', 'fs_read_paths', 'max_memory_mb', 'max_cpu_seconds', 'max_output_tokens', 'timeout_seconds']) {
      if (args?.[k] !== undefined) payload[k] = args[k];
    }
    const result = await ctx.apiClient.createSandbox(payload);
    const s = result?.data?.sandbox || result?.data || result;
    return ctx.toToolResponse(`已创建沙盒策略 #${s?.id} "${s?.name}" [${s?.security_level}]`, result);
  },

  'get_sandbox': async (args, ctx) => {
    const result = await ctx.apiClient.getSandbox(args?.sandbox_id);
    const s = result?.data?.sandbox || result?.data || result;
    return ctx.toToolResponse(
      `沙盒 #${s?.id} "${s?.name}" [${s?.security_level}]\n` +
      `工具允许: ${(s?.allowed_tools || []).join(', ') || '无'}\n` +
      `工具禁止: ${(s?.blocked_tools || []).join(', ') || '无'}\n` +
      `网络允许: ${(s?.allowed_network_hosts || []).join(', ') || '无'}\n` +
      `写入路径: ${(s?.fs_write_paths || []).join(', ') || '无'}\n` +
      `超时: ${s?.timeout_seconds || 0}s, 内存: ${s?.max_memory_mb || 0}MB, CPU: ${s?.max_cpu_seconds || 0}s, 输出Token: ${s?.max_output_tokens || 0}`,
      result,
    );
  },

  'update_sandbox': async (args, ctx) => {
    const { sandbox_id, ...rest } = args || {};
    const result = await ctx.apiClient.updateSandbox(sandbox_id, rest);
    return ctx.toToolResponse(`已更新沙盒策略 #${sandbox_id}`, result);
  },

  'delete_sandbox': async (args, ctx) => {
    const result = await ctx.apiClient.deleteSandbox(args?.sandbox_id);
    return ctx.toToolResponse(`已删除沙盒策略 #${args?.sandbox_id}`, result);
  },

  'check_sandbox_action': async (args, ctx) => {
    const result = await ctx.apiClient.checkSandboxAction(args?.sandbox_id, {
      action: args?.action,
      target: args?.target,
    });
    const d = result?.data || result;
    return ctx.toToolResponse(
      `沙盒 #${args?.sandbox_id} 检查 ${d?.action} "${d?.target}": ${d?.allowed ? '允许' : '拒绝'}${d?.reason ? ' — ' + d.reason : ''}`,
      result,
    );
  },

  'start_sandbox_execution': async (args, ctx) => {
    const payload: Record<string, any> = { agent_id: args?.agent_id };
    if (args?.run_id) payload.run_id = args.run_id;
    if (args?.step_run_id) payload.step_run_id = args.step_run_id;
    const result = await ctx.apiClient.startSandboxExecution(args?.sandbox_id, payload);
    const e = result?.data?.execution || result?.data || result;
    return ctx.toToolResponse(
      `已启动沙盒执行 #${e?.id} (沙盒 #${args?.sandbox_id}, Agent #${args?.agent_id})\n策略快照已冻结，状态: ${e?.status}`,
      result,
    );
  },

  'complete_sandbox_execution': async (args, ctx) => {
    const { execution_id, ...rest } = args || {};
    const result = await ctx.apiClient.completeSandboxExecution(execution_id, rest);
    const e = result?.data?.execution || result?.data || result;
    return ctx.toToolResponse(
      `沙盒执行 #${execution_id} 已完成 (状态: ${e?.status}, 工具调用: ${e?.tool_calls || 0}, 网络调用: ${e?.network_calls || 0})`,
      result,
    );
  },

  'revoke_sandbox_execution': async (args, ctx) => {
    const result = await ctx.apiClient.revokeSandboxExecution(args?.execution_id);
    return ctx.toToolResponse(`已吊销沙盒执行 #${args?.execution_id}`, result);
  },

  'report_sandbox_violation': async (args, ctx) => {
    const payload: Record<string, any> = { violation_type: args?.violation_type };
    if (args?.attempted_action) payload.attempted_action = args.attempted_action;
    if (args?.detail) payload.detail = args.detail;
    if (args?.terminate !== undefined) payload.terminate = args.terminate;
    const result = await ctx.apiClient.reportSandboxViolation(args?.execution_id, payload);
    const v = result?.data?.violation || result?.data || result;
    return ctx.toToolResponse(
      `已记录沙盒违规 (执行 #${args?.execution_id}, 类型: ${v?.violation_type})${args?.terminate ? ' — 执行已终止' : ''}`,
      result,
    );
  },

  'get_sandbox_execution': async (args, ctx) => {
    const result = await ctx.apiClient.getSandboxExecution(args?.execution_id);
    const e = result?.data?.execution || result?.data || result;
    const violations = e?.violations || [];
    return ctx.toToolResponse(
      `沙盒执行 #${e?.id} 状态: ${e?.status}\n` +
      `工具调用: ${e?.tool_calls || 0}, 网络调用: ${e?.network_calls || 0}, 内存峰值: ${e?.peak_memory_mb || 0}MB\n` +
      `违规记录 (${violations.length} 条):\n` +
      (violations.length ? violations.map((v: any) => `  • [${v.violation_type}] ${v.attempted_action || ''} — ${v.detail || ''}`).join('\n') : '  无'),
      result,
    );
  },

  'list_sandbox_executions': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.status) params.status = args.status;
    if (args?.agent_id) params.agent_id = String(args.agent_id);
    const result = await ctx.apiClient.listSandboxExecutions(args?.sandbox_id, params);
    const items = result?.data?.items || result?.items || [];
    const total = result?.data?.total || result?.total || items.length;
    return ctx.toToolResponse(
      `沙盒执行列表 (共 ${total} 条):\n` +
      items.map((e: any) => `• #${e.id} Agent#${e.agent_id} ${e.status} 调用=${e.tool_calls || 0} 起=${e.started_at || ''}${e.ended_at ? ' 止=' + e.ended_at : ''}`).join('\n'),
      result,
    );
  },

  'get_sandbox_dashboard': async (args, ctx) => {
    const result = await ctx.apiClient.getSandboxDashboard();
    const d = result?.data || result;
    const byLevel = d?.by_level || {};
    const byStatus = d?.by_status || {};
    return ctx.toToolResponse(
      `沙盒仪表盘:\n` +
      `沙盒总数: ${d?.total_sandboxes || 0}, 执行总数: ${d?.total_executions || 0}, 运行中: ${d?.running_executions || 0}, 违规总数: ${d?.total_violations || 0}\n` +
      `按级别: ${Object.entries(byLevel).map(([k, v]) => `${k}=${v}`).join(', ')}\n` +
      `按状态: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      result,
    );
  },

  'get_sandbox_violation_trend': async (args, ctx) => {
    const result = await ctx.apiClient.getSandboxViolationTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const total = trend.reduce((s: number, t: any) => s + (t.count || 0), 0);
    const byType = d?.by_type || {};
    const typeLine = Object.entries(byType).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ');
    const recent = trend.slice(-7).map((t: any) => `• ${t.date}: ${t.count}`).join('\n');
    return ctx.toToolResponse(
      `沙盒违规趋势 (近 ${d?.days || 30} 天): 累计 ${total}\n${recent || '暂无数据'}\n按类型: ${typeLine || '无'}`,
      result,
    );
  },

  'get_sandbox_template_usage': async (args, ctx) => {
    const result = await ctx.apiClient.getSandboxTemplateUsage();
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.template_key}: ${it.uses} 次 (绑定 Agent ${it.bound_to_agent})`)
      .join('\n');
    return ctx.toToolResponse(`沙盒模板使用统计:\n${summary || '暂无实例化记录'}`, result);
  },

  'get_step_sandbox_execution': async (args, ctx) => {
    const result = await ctx.apiClient.getStepSandboxExecution(args?.run_id, args?.step_key);
    const e = result?.data?.execution;
    if (!e) return ctx.toToolResponse(`工作流运行 #${args?.run_id} 步骤 "${args?.step_key}" 无沙盒执行`, result);
    const violations = e.violations || [];
    return ctx.toToolResponse(
      `步骤 "${args?.step_key}" 沙盒执行 #${e.id} 状态: ${e.status}\n` +
      `工具调用: ${e.tool_calls || 0}, 网络调用: ${e?.network_calls || 0}\n` +
      `策略级别: ${(result?.data?.policy || {}).security_level || '-'}\n` +
      `违规记录 (${violations.length} 条):\n` +
      (violations.length ? violations.map((v: any) => `  • [${v.violation_type}] ${v.attempted_action || ''}`).join('\n') : '  无'),
      result,
    );
  },

  'report_step_sandbox_violation': async (args, ctx) => {
    const payload: Record<string, any> = { violation_type: args?.violation_type };
    if (args?.attempted_action) payload.attempted_action = args.attempted_action;
    if (args?.detail) payload.detail = args.detail;
    if (args?.terminate_step !== undefined) payload.terminate_step = args.terminate_step;
    const result = await ctx.apiClient.reportStepSandboxViolation(args?.run_id, args?.step_key, payload);
    const d = result?.data || result;
    return ctx.toToolResponse(
      `已记录步骤沙盒违规 (运行 #${args?.run_id}, 步骤 "${args?.step_key}", 类型: ${d?.violation?.violation_type})${d?.step_terminated ? ' — 步骤已终止' : ''}`,
      result,
    );
  },

  'list_sandbox_templates': async (args, ctx) => {
    const result = await ctx.apiClient.listSandboxTemplates();
    const templates = result?.data?.templates || result?.templates || [];
    return ctx.toToolResponse(
      `沙盒策略模板 (共 ${templates.length} 个):\n` +
      templates.map((t: any) => `• ${t.key} — ${t.name} [${t.security_level}]: ${t.description}`).join('\n'),
      result,
    );
  },

  'instantiate_sandbox_template': async (args, ctx) => {
    const payload: Record<string, any> = {};
    if (args?.name) payload.name = args.name;
    if (args?.agent_id) payload.agent_id = args.agent_id;
    if (args?.overrides) payload.overrides = args.overrides;
    const result = await ctx.apiClient.instantiateSandboxTemplate(args?.template_key, payload);
    const s = result?.data?.sandbox || result?.data || result;
    return ctx.toToolResponse(`已从模板 "${args?.template_key}" 创建沙盒策略 #${s?.id} "${s?.name}" [${s?.security_level}]`, result);
  },

  'get_conflicts_sandbox_correlation': async (args, ctx) => {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await ctx.apiClient.getConflictsSandboxCorrelation(days, windowHours);
    const data = result?.data || result || {};
    const total = data.total_conflicts ?? 0;
    const byType = data.by_conflict_type || {};
    const top = data.top_agents || [];
    const typeEntries = Object.entries(byType);
    return ctx.toToolResponse(
      `冲突↔沙盒违规关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h):\n` +
        `冲突总数: ${total}, 伴随沙盒违规: ${data.with_violation ?? 0} (${data.violation_rate ?? 0}%)\n` +
        `按冲突类型: ${typeEntries.map(([k, v]: any) => `${k}=${v.with_violation}/${v.total}(${v.rate}%)`).join(', ') || '无'}\n` +
        `关联最多的 Agent(top8): ${top.map((a: any) => `${a.name}#${a.agent_id}(冲突${a.conflicts}/伴随违规${a.with_violation})`).join(', ') || '无'}`,
      result,
    );
  },
};
