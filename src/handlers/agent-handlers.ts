import type { HandlerMap } from './types.js';
import { summarizeListAgents, summarizeAssignments, summarizeClaim, summarizeAssignmentUpdate } from './response.js';

export const agentHandlers: HandlerMap = {
  'list_agents': async (args, ctx) => {
    const result = await ctx.apiClient.listAgents(args || {});

    return ctx.toToolResponse(summarizeListAgents(result), result);
  },

  'create_agent': async (args, ctx) => {
    const result = await ctx.apiClient.createAgent(args);

    return ctx.toToolResponse(`Created Agent #${result.id} ${result.name} with status ${result.status}.`, result);
  },

  'self_register_agent': async (args, ctx) => {
    const result = await ctx.apiClient.selfRegisterAgent(args);
    const isNew = result.created_at === result.updated_at;
    const summary = isNew
      ? `Self-registered new Agent #${result.id} "${result.name}" (${result.kind}).`
      : `Re-registered existing Agent #${result.id} "${result.name}" — updated capabilities/config.`;
    return ctx.toToolResponse(summary, result);
  },

  'discover_agents': async (args, ctx) => {
    const result = await ctx.apiClient.discoverAgents(args);
    const items = Array.isArray(result) ? result : [];
    if (items.length === 0) {
      return ctx.toToolResponse('No matching agents found.', result);
    }
    const lines = items.map((a: any) => {
      const caps = (a.capabilities || []).slice(0, 5).join(', ');
      const role = a.collaboration_role || 'standalone';
      return `- #${a.id} ${a.name} (${a.kind}, ${role})${caps ? ` — caps: ${caps}` : ''}`;
    });
    return ctx.toToolResponse(`Found ${items.length} agent(s):\n${lines.join('\n')}`, result);
  },

  'update_agent': async (args, ctx) => {
    const result = await ctx.apiClient.updateAgent(args);

    return ctx.toToolResponse(`Updated Agent #${result.id} ${result.name}; status: ${result.status}; kind: ${result.kind}.`, result);
  },

  'heartbeat_agent': async (args, ctx) => {
    const result = await ctx.apiClient.heartbeatAgent(args);

    return ctx.toToolResponse(`Heartbeat recorded for Agent #${result.id} ${result.name}; status: ${result.status}; last_seen_at: ${result.last_seen_at || 'not returned'}.`, result);
  },

  'list_recommended_tasks': async (args, ctx) => {
    const result = await ctx.apiClient.listRecommendedTasks(args);
    const items = Array.isArray(result) ? result : [];
    if (items.length === 0) {
      return ctx.toToolResponse(`No recommended tasks found for Agent #${args.agent_id}.`, result);
    }
    const lines = items.map((item: any, i: number) => {
      const t = item.task;
      const matched = [...(item.matched_capabilities || []), ...(item.matched_tags || [])].slice(0, 5).join(', ');
      const missing = (item.missing_required || []).join(', ');
      let line = `${i + 1}. Task #${t.id} "${t.title}" (score: ${item.score})`;
      if (matched) line += ` — matched: ${matched}`;
      if (missing) line += ` — missing: ${missing}`;
      return line;
    });
    return ctx.toToolResponse(`Recommended tasks for Agent #${args.agent_id}:\n${lines.join('\n')}`, result);
  },

  'list_agent_assignments': async (args, ctx) => {
    const result = await ctx.apiClient.listAgentAssignments(args);

    return ctx.toToolResponse(summarizeAssignments(result, `Assignments for Agent #${args?.agent_id}`), result);
  },

  'claim_agent_task': async (args, ctx) => {
    const result = await ctx.apiClient.claimAgentTask(args);

    return ctx.toToolResponse(summarizeClaim(result), result || { message: 'No claimable task found' });
  },

  'update_agent_assignment': async (args, ctx) => {
    const result = await ctx.apiClient.updateAgentAssignment(args);

    return ctx.toToolResponse(summarizeAssignmentUpdate(result), result);
  },

  'get_agent_inbox': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentInbox(args);

    const count = result.items?.length ?? 0;
    const summary = count === 0
      ? `Inbox for Agent #${args.agent_id} is empty.`
      : `Inbox for Agent #${args.agent_id}: ${count} directed message(s).`;

    return ctx.toToolResponse(summary, result);
  },

  'register_capabilities': async (args, ctx) => {
    const result = await ctx.apiClient.registerCapabilities(args);
    const mode = args?.mode || 'merge';
    const capCount = result?.capabilities?.length || 0;
    const summary = `Agent #${args.agent_id} capabilities ${mode === 'replace' ? 'replaced' : 'updated'}: now has ${capCount} capabilities (${(result?.capabilities || []).join(', ')}).`;
    return ctx.toToolResponse(summary, result);
  },

  'get_agent_capability_gap_analysis': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const minConfidence = Math.max(0, Math.min(1, Number(args?.min_confidence ?? 0.5) || 0.5));
    const result = await ctx.apiClient.getAgentCapabilityGapAnalysis(limit, minConfidence);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) => {
      const gaps = (a.gaps || []).map((g: any) => `${g.domain}(${g.success_count}次成功)`);
      const overclaims = (a.overclaims || []).map((o: any) => `${o.capability}(风险${o.risk})`);
      return `- ${a.agent_name}: 覆盖率${a.coverage_score}% 缺口[${gaps.join(', ') || '无'}] 过度声明[${overclaims.join(', ') || '无'}]`;
    });
    return ctx.toToolResponse(
      `Agent能力缺口分析:\n${lines.join('\n') || '无缺口数据'}`,
      result,
    );
  },

  'get_agent_run_resource_trend': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 14) || 14));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentRunResourceTrend(days, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) => {
      const total = a.count_series.reduce((s: number, v: number) => s + v, 0);
      const avgDur = a.duration_series.filter((d: number) => d > 0);
      const meanDur = avgDur.length ? (avgDur.reduce((s: number, v: number) => s + v, 0) / avgDur.length).toFixed(1) : '0';
      return `- ${a.agent_name}: ${total}次运行(日均${(total / days).toFixed(1)}) 均时${meanDur}s`;
    });
    return ctx.toToolResponse(
      `Agent运行资源趋势(近${data.days ?? days}天):\n${lines.join('\n') || '无运行数据'}`,
      result,
    );
  },

  'security_events_by_agent': async (args, ctx) => {
    const result = await ctx.apiClient.securityEventsByAgent(args);
    const d = result?.data || result;
    const agents = d?.agents || [];
    const lines = agents.map((a: any) => {
      const name = a.name || (a.agent_id ? `Agent#${a.agent_id}` : '(无 Agent)');
      return `  • ${name}: 合计 ${a.total} (沙盒违规 ${a.sandbox_violation}/冲突 ${a.conflict}/审计 ${a.audit}, 高危 ${a.CRITICAL}/警告 ${a.WARNING}/普通 ${a.INFO})`;
    });
    const summary = agents.length
      ? `安全事件按 Agent 排行 (前 ${agents.length}):\n${lines.join('\n')}`
      : '无安全事件按 Agent 聚合数据。';
    return ctx.toToolResponse(summary, result);
  },

  'mark_offline_agents': async (args, ctx) => {
    const result = await ctx.apiClient.markOfflineAgents();
    const count = result?.marked_offline ?? 0;
    const summary = count === 0
      ? 'All agents are online. No offline agents detected.'
      : `Marked ${count} agent(s) offline: IDs ${result.agent_ids.join(', ')}`;
    return ctx.toToolResponse(summary, result);
  },

  'send_agent_message': async (args, ctx) => {
    const result = await ctx.apiClient.sendAgentMessage(args);
    const summary = `Message sent from Agent #${args.from_agent_id} to Agent #${args.to_agent_id}.`;
    return ctx.toToolResponse(summary, result);
  },

  'get_agent_messages': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentMessages(args);
    const items = result?.items ?? [];
    const summary = items.length === 0
      ? `No messages for Agent #${args.agent_id}.`
      : `${items.length} message(s) for Agent #${args.agent_id}.`;
    return ctx.toToolResponse(summary, result);
  },

  'get_agent_collaborators': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentCollaborators(args);
    const d = result?.data || result;
    const collaborators = d?.collaborators || [];
    const totalPartners = d?.total_partners ?? 0;
    const lines = collaborators.map((c: any) =>
      `  • ${c.name} (Agent#${c.agent_id}): 发 ${c.sent} / 收 ${c.received} / 合计 ${c.total}`
    );
    const summary = lines.length
      ? `Agent #${args.agent_id} 协作伙伴 (${totalPartners} 个, 展示前 ${collaborators.length}):\n${lines.join('\n')}`
      : `Agent #${args.agent_id} 暂无协作伙伴。`;
    return ctx.toToolResponse(summary, result);
  },

  'get_agent_reputation': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentReputation(args);
    const data = result?.data || result;
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 声誉: ${data?.score?.toFixed(1) || '50.0'} (${data?.completed_tasks || 0} 完成, ${data?.failed_tasks || 0} 失败, 成功率: ${data?.success_rate?.toFixed(1) || '0'}%)`,
      result
    );
  },

  'list_reputations': async (args, ctx) => {
    const result = await ctx.apiClient.listReputations();
    const items = Array.isArray(result?.data || result) ? (result?.data || result) : [];
    const summary = items.map((r: any) => `• Agent #${r.agent_id}: ${r.score?.toFixed(1) || '50.0'} (${r.completed_tasks || 0}/${r.total_tasks || 0} 完成)`).join('\n');
    return ctx.toToolResponse(`声誉排行:\n${summary || '暂无数据'}`, result);
  },

  'recalculate_reputation': async (args, ctx) => {
    const result = await ctx.apiClient.recalculateReputation(args);
    const data = result?.data || result;
    return ctx.toToolResponse(`Agent #${args?.agent_id} 声誉已重新计算: ${data?.score?.toFixed(1) || '50.0'}`, result);
  },

  'get_agent_reputation_history': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentReputationHistory(args);
    const data = result?.data || result;
    const points = Array.isArray(data?.points) ? data.points : [];
    const summary = points.slice(-10).map((p: any) => {
      const delta = typeof p.score_delta === 'number' ? (p.score_delta >= 0 ? `+${p.score_delta}` : `${p.score_delta}`) : '?';
      const when = p.at ? String(p.at).slice(0, 19).replace('T', ' ') : '?';
      const ctx = [
        p.step_key ? `步骤${p.step_key}` : null,
        p.task_id ? `任务#${p.task_id}` : null,
        p.workflow_run_id ? `工作流#${p.workflow_run_id}` : null,
      ].filter(Boolean).join(' ');
      return `• ${when}: ${p.success ? '成功' : '失败'} ${delta} → ${typeof p.new_score === 'number' ? p.new_score.toFixed(1) : '?'}${ctx ? ` (${ctx})` : ''}`;
    }).join('\n');
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 声誉历史 (当前 ${typeof data?.current_score === 'number' ? data.current_score.toFixed(1) : '?'}, 共 ${points.length} 个变化点):\n${summary || '暂无声誉变化记录'}`,
      result
    );
  },

  'list_agent_experiences': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.experience_type) params.experience_type = args.experience_type;
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    if (args?.is_shared) params.is_shared = args.is_shared;
    const result = await ctx.apiClient.listAgentExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = data?.experiences || data?.items || [];
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 经验列表: ${items.length} 条经验\n${items.map((e: any) => `- [${e.experience_type}] ${e.domain || '无域'}: ${e.strategy?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  },

  'create_agent_experience': async (args, ctx) => {
    const result = await ctx.apiClient.createAgentExperience(args?.agent_id, {
      experience_type: args?.experience_type,
      domain: args?.domain,
      task_type: args?.task_type,
      capabilities_used: args?.capabilities_used,
      strategy: args?.strategy,
      outcome_pattern: args?.outcome_pattern,
      key_learnings: args?.key_learnings,
      confidence: args?.confidence,
      is_shared: args?.is_shared,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(`经验已创建: #${data?.id} [${data?.experience_type}] ${data?.domain || ''}`, result);
  },

  'get_agent_experience': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentExperience(args?.agent_id, args?.experience_id);
    const data = result?.data || result;
    return ctx.toToolResponse(
      `经验 #${data?.id}: [${data?.experience_type}] ${data?.domain || '无域'}\n策略: ${data?.strategy}\n结果模式: ${data?.outcome_pattern}\n关键学习: ${data?.key_learnings}\n置信度: ${data?.confidence}`,
      result,
    );
  },

  'update_agent_experience': async (args, ctx) => {
    const updateData: Record<string, any> = {};
    if (args?.strategy !== undefined) updateData.strategy = args.strategy;
    if (args?.outcome_pattern !== undefined) updateData.outcome_pattern = args.outcome_pattern;
    if (args?.key_learnings !== undefined) updateData.key_learnings = args.key_learnings;
    if (args?.confidence !== undefined) updateData.confidence = args.confidence;
    if (args?.is_shared !== undefined) updateData.is_shared = args.is_shared;
    if (args?.is_valid !== undefined) updateData.is_valid = args.is_valid;
    const result = await ctx.apiClient.updateAgentExperience(args?.agent_id, args?.experience_id, updateData);
    const data = result?.data || result;
    return ctx.toToolResponse(`经验 #${args?.experience_id} 已更新`, result);
  },

  'delete_agent_experience': async (args, ctx) => {
    const result = await ctx.apiClient.deleteAgentExperience(args?.agent_id, args?.experience_id);
    return ctx.toToolResponse(`经验 #${args?.experience_id} 已删除`, result);
  },

  'get_experiences_skill_coverage_radar': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 6) || 6));
    const domains = Math.max(3, Math.min(12, Number(args?.domains ?? 8) || 8));
    const result = await ctx.apiClient.getExperiencesSkillCoverageRadar(limit, domains);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const labels: string[] = data.domain_labels || [];
    const lines = agents.map((a: any) => {
      const pairs = labels.map((l: string, i: number) => `${l}=${a.scores?.[i] ?? 0}`);
      return `- ${a.name}: ${pairs.join(' ')} (共${a.total_experiences}条)`;
    });
    return ctx.toToolResponse(
      `Agent 技能覆盖雷达(维度: ${labels.join('/')}):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_productivity': async (args, ctx) => {
    const days = args?.days ?? 30;
    const limit = args?.limit ?? 20;
    const result = await ctx.apiClient.getAgentProductivity(days, limit);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `Agent 产出效率(近${data.days ?? days}天):\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 分配${a.total} 完成${a.done}(率${a.completion_rate}%) 失败${a.failed} 取消${a.cancelled} 过期${a.expired} 进行中${a.in_progress} 平均完成${a.avg_completion_hours ?? '—'}h`).join('\n') || '无分配'}`,
      result,
    );
  },

  'get_agent_run_resource_usage': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentRunResourceUsage(days, limit);
    const data = result?.data || result || {};
    const items: any[] = data.items || [];
    const totalRuns = data.total_runs ?? 0;
    const lines = items.map((it: any) =>
      `- ${it.name}#${it.agent_id}: ${it.total_runs}次 总${it.total_hours}h 均${it.avg_run_minutes}min`
    );
    return ctx.toToolResponse(
      `Agent 运行资源排行(近${days}天, 共${totalRuns}次):\n${lines.join('\n') || '无运行数据'}`,
      result,
    );
  },

  'get_agent_productivity_trend': async (args, ctx) => {
    const days = args?.days ?? 30;
    const result = await ctx.apiClient.getAgentProductivityTrend(days);
    const data = result?.data || result || {};
    const trend = data.trend || [];
    const kindTotals: any = data.by_kind_totals || {};
    const kindEntries = Object.entries(kindTotals) as [string, any][];
    return ctx.toToolResponse(
      `Agent 产出趋势(近${data.days ?? days}天): 累计完成 ${data.total_done ?? 0}, 失败 ${data.total_failed ?? 0}\n` +
      `${kindEntries.length ? `按kind分层(累计): ${kindEntries.map(([k, v]: any) => `${k}=完成${v.done}失败${v.failed}`).join(', ')}\n` : ''}` +
      `${trend.map((b: any) => {
        const kb: any = b.by_kind || {};
        const kbEntries = Object.entries(kb) as [string, any][];
        const kbStr = kbEntries.length ? ` [${kbEntries.map(([k, v]: any) => `${k}=${v.done}`).join(',')}]` : '';
        return `${b.date}: 完成${b.done} 失败${b.failed}${kbStr}`;
      }).join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_productivity_alerts': async (args, ctx) => {
    const params: any = {};
    if (args?.days != null) params.days = args.days;
    if (args?.min_completion_rate != null) params.min_completion_rate = args.min_completion_rate;
    if (args?.max_failure_rate != null) params.max_failure_rate = args.max_failure_rate;
    if (args?.min_assignments != null) params.min_assignments = args.min_assignments;
    const result = await ctx.apiClient.getAgentProductivityAlerts(params);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `低效率 Agent 预警(近${data.days ?? 30}天, 完成率<${data.min_completion_rate ?? 50}% 或 失败率>${data.max_failure_rate ?? 30}%, 最少${data.min_assignments ?? 3}次分配): ${items.length} 个\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 分配${a.total} 完成${a.done}(率${a.completion_rate}%) 失败${a.failed}(率${a.failure_rate}%) 原因[${(a.reasons || []).join('; ')}]`).join('\n') || '无预警'}`,
      result,
    );
  },

  'get_agent_productivity_by_kind': async (args, ctx) => {
    const days = args?.days ?? 30;
    const result = await ctx.apiClient.getAgentProductivityByKind(days);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `按 Agent kind 产出效率对比(近${data.days ?? days}天): ${items.length} 类\n` +
        `${items.map((k: any) => `- ${k.kind}: Agent数${k.agent_count} 分配${k.total} 完成${k.done}(率${k.completion_rate}%) 失败${k.failed}(率${k.failure_rate}%) 平均完成${k.avg_completion_hours ?? 'N/A'}h`).join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_productivity_hourly_heatmap': async (args, ctx) => {
    const days = args?.days ?? 30;
    const limit = args?.limit ?? 15;
    const result = await ctx.apiClient.getAgentProductivityHourlyHeatmap(days, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const matrix: any = data.matrix || {};
    const peakHour = data.peak_hour;
    const lines = agents.map((a: any) => {
      const row = matrix[String(a.agent_id)] || {};
      // 取该 Agent 完成 top3 小时
      const topHours = Object.entries(row).map(([h, c]: any) => [h, c] as [string, number])
        .sort((x, y) => y[1] - x[1]).slice(0, 3)
        .map(([h, c]) => `${h}时=${c}`).join(' ');
      return `- ${a.name}#${a.agent_id} (完成${a.done}): ${topHours || '无'}`;
    });
    return ctx.toToolResponse(
      `Agent 小时维度产出热力(近${data.days ?? days}天, 共${agents.length}个Agent${peakHour != null ? `, 全队峰值${peakHour}时` : ''}):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_productivity_calendar_heatmap': async (args, ctx) => {
    const days = args?.days ?? 90;
    const limit = args?.limit ?? 10;
    const result = await ctx.apiClient.getAgentProductivityCalendarHeatmap(days, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const matrix: any = data.matrix || {};
    const lines = agents.map((a: any) => {
      const row = matrix[String(a.agent_id)] || {};
      const dates = Object.entries(row) as [string, number][];
      const topDates = dates.sort((x, y) => y[1] - x[1]).slice(0, 3)
        .map(([d, c]) => `${d}=${c}`).join(' ');
      return `- ${a.name}#${a.agent_id} (完成${a.done}): ${topDates || '无'}`;
    });
    return ctx.toToolResponse(
      `Agent 日历产出热力(近${data.days ?? days}天, 共${agents.length}个Agent):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_productivity_weekly_comparison': async (args, ctx) => {
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentProductivityWeeklyComparison(limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const totalThis = data.total_this_week ?? 0;
    const totalLast = data.total_last_week ?? 0;
    const lines = agents.map((a: any) => {
      const arrow = a.change_pct > 0 ? '↑' : a.change_pct < 0 ? '↓' : '→';
      return `- ${a.name}: 本周${a.this_week} 上周${a.last_week} ${arrow}${Math.abs(a.change_pct)}%`;
    });
    return ctx.toToolResponse(
      `Agent 产出周间对比(本周共${totalThis} 上周共${totalLast}):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_failure_reasons': async (args, ctx) => {
    const days = args?.days ?? 30;
    const limit = args?.limit ?? 15;
    const result = await ctx.apiClient.getAgentFailureReasons(days, limit);
    const data = result?.data || result || {};
    const items: any[] = data.items || [];
    const lines = items.map((it: any) =>
      `- [${it.count}次] ${it.reason} (涉及: ${(it.affected_agent_names || []).slice(0, 5).join(', ') || '无'})`,
    );
    return ctx.toToolResponse(
      `Agent 失败原因分布(近${data.days ?? days}天, 共${data.total_failed_runs ?? 0}次失败):\n${lines.join('\n') || '无失败记录'}`,
      result,
    );
  },

  'get_agent_failure_error_patterns': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const prefixLen = Math.max(10, Math.min(120, Number(args?.prefix_len ?? 40) || 40));
    const result = await ctx.apiClient.getAgentFailureErrorPatterns(days, limit, prefixLen);
    const data = result?.data || result || {};
    const patterns: any[] = data.patterns || [];
    const totalFailed = data.total_failed ?? 0;
    const lines = patterns.map((p: any) => {
      const agents = (p.affected_agents || []).slice(0, 3).map((a: any) => a.name).join(', ');
      const peak = p.peak_hour != null ? ` 峰值${p.peak_hour}时` : '';
      return `- [${p.count}次] ${p.pattern}${peak} (涉及: ${agents || '无'})`;
    });
    return ctx.toToolResponse(
      `Agent 错误模式聚类(近${data.days ?? days}天, 共${totalFailed}次失败, 前${prefixLen}字符分组):\n${lines.join('\n') || '无失败记录'}`,
      result,
    );
  },

  'get_agent_health': async (args, ctx) => {
    const days = args?.days ?? 30;
    const result = await ctx.apiClient.getAgentHealth(days);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `Agent 综合健康度(近${data.days ?? days}天, 声誉0.4+完成0.3+冲突0.15+违规0.15):\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}[${a.status ?? '?'}]: 健康${a.health_score} (声誉${a.sub_scores.reputation}/完成${a.sub_scores.completion}/冲突${a.sub_scores.conflict}/违规${a.sub_scores.violation}; 完成率${a.completion_rate ?? '—'}% 冲突${a.conflicts} 违规${a.sandbox_violations})`).join('\n') || '无 Agent'}`,
      result,
    );
  },

  'get_agent_health_trend': async (args, ctx) => {
    const days = args?.days ?? 30;
    const agentId = args?.agent_id != null ? Number(args.agent_id) : undefined;
    const result = await ctx.apiClient.getAgentHealthTrend(days, agentId);
    const data = result?.data || result || {};
    const trend = data.trend || [];
    const scope = data.agent_id ? `Agent ${data.agent_name ?? '#' + data.agent_id} ` : '';
    const kindOverall: any = data.by_kind_overall || {};
    const kindEntries = Object.entries(kindOverall) as [string, any][];
    return ctx.toToolResponse(
      `${scope}健康度趋势(近${data.days ?? days}天): 累计正向 ${data.total_positive ?? 0}, 负向 ${data.total_negative ?? 0}, 冲突 ${data.total_conflicts ?? 0}, 违规 ${data.total_violations ?? 0}\n` +
      `${kindEntries.length ? `按kind平均声誉(累计): ${kindEntries.map(([k, v]: any) => `${k}=${v}`).join(', ')}\n` : ''}` +
      `${trend.map((b: any) => {
        const kb: any = b.by_kind_avg || {};
        const kbEntries = Object.entries(kb) as [string, any][];
        const kbStr = kbEntries.length ? ` [${kbEntries.map(([k, v]: any) => `${k}=${v}`).join(',')}]` : '';
        return `${b.date}: 平均声誉${b.avg_reputation ?? '—'} 正向${b.positive} 负向${b.negative} 冲突${b.conflicts ?? 0} 违规${b.sandbox_violations ?? 0}${kbStr}`;
      }).join('\n') || '无数据'}`,
      result,
    );
  },

  'get_agent_health_state_transitions': async (args, ctx) => {
    const days = Math.max(7, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getAgentHealthStateTransitions(days);
    const data = result?.data || result || {};
    const states: any[] = data.states || [];
    const flows: any[] = data.flows || [];
    const totalTrans = data.total_transitions ?? 0;
    const stateStr = states.map((s: any) => `${s.name}=${s.count}`).join(', ');
    const flowStr = flows.map((f: any) => `${f.source}→${f.target}: ${f.value}`).join('\n');
    return ctx.toToolResponse(
      `健康状态流转(近${data.days ?? days}天, 共${totalTrans}次转换): ${stateStr}\n${flowStr || '无转换'}`,
      result,
    );
  },

  'get_agent_health_alerts': async (args, ctx) => {
    const params: any = {};
    if (args?.days != null) params.days = args.days;
    if (args?.min_health_score != null) params.min_health_score = args.min_health_score;
    if (args?.w_reputation != null) params.w_reputation = args.w_reputation;
    if (args?.w_completion != null) params.w_completion = args.w_completion;
    if (args?.w_conflict != null) params.w_conflict = args.w_conflict;
    if (args?.w_violation != null) params.w_violation = args.w_violation;
    const result = await ctx.apiClient.getAgentHealthAlerts(params);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `低健康 Agent 预警(近${data.days ?? 30}天, 健康分<${data.min_health_score ?? 60}): ${items.length} 个\n` +
        `${items.map((a: any) => `- ${a.name}#${a.agent_id}: 健康${a.health_score} (声誉${a.sub_scores.reputation}/完成${a.sub_scores.completion}/冲突${a.sub_scores.conflict}/违规${a.sub_scores.violation}; 原因[${(a.reasons || []).join('; ')}])\n  建议: ${(a.recommendations || []).join(' | ') || '暂无'}`).join('\n') || '无预警'}`,
      result,
    );
  },

  'share_agent_experience': async (args, ctx) => {
    const result = await ctx.apiClient.shareAgentExperience(args?.agent_id, args?.experience_id);
    return ctx.toToolResponse(`经验 #${args?.experience_id} 已分享给同域其他 Agent`, result);
  },

  'learn_from_experience': async (args, ctx) => {
    const result = await ctx.apiClient.learnFromExperience(args?.agent_id, args?.experience_id);
    const data = result?.data || result;
    return ctx.toToolResponse(`Agent #${args?.agent_id} 已学习经验 #${args?.experience_id}，内化为经验 #${data?.id}`, result);
  },

  'list_shared_experiences': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    const result = await ctx.apiClient.listSharedExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = data?.experiences || data?.items || [];
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 可学习的共享经验: ${items.length} 条\n${items.map((e: any) => `- [${e.experience_type}] Agent#${e.agent_id}: ${e.key_learnings?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  },

  'auto_extract_experiences': async (args, ctx) => {
    const result = await ctx.apiClient.autoExtractExperiences(args?.agent_id);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(`Agent #${args?.agent_id} 自动提取了 ${items.length} 条经验`, result);
  },

  'apply_experience_decay': async (args, ctx) => {
    const result = await ctx.apiClient.applyExperienceDecay(args?.agent_id, {
      days_threshold: args?.days_threshold,
      decay_rate: args?.decay_rate,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(`Agent #${args?.agent_id} 经验衰减完成，影响了 ${data?.decayed_count || 0} 条经验`, result);
  },

  'validate_experience': async (args, ctx) => {
    const result = await ctx.apiClient.validateExperience(args?.agent_id, args?.experience_id, {
      is_accurate: args?.is_accurate,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(
      `经验 #${args?.experience_id} 已被 Agent #${args?.agent_id} ${args?.is_accurate ? '验证通过' : '反驳'}，新置信度: ${data?.confidence}`,
      result,
    );
  },

  'get_experience_validation_stats': async (args, ctx) => {
    const result = await ctx.apiClient.getExperienceValidationStats(args?.agent_id);
    const data = result?.data || result;
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 经验统计: 总计 ${data?.total_experiences || 0}, 已共享 ${data?.shared_experiences || 0}, 高置信度 ${data?.high_confidence || 0}, 低置信度 ${data?.low_confidence || 0}, 平均置信度 ${data?.average_confidence || 0}`,
      result,
    );
  },

  'decay_all_experiences': async (args, ctx) => {
    const result = await ctx.apiClient.decayAllExperiences({
      days_threshold: args?.days_threshold,
      decay_rate: args?.decay_rate,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(`全量经验衰减完成，影响了 ${data?.decayed_count || 0} 条经验`, result);
  },

  'authorize_cross_project_agent': async (args, ctx) => {
    const result = await ctx.apiClient.authorizeCrossProjectAgent({
      agent_id: args?.agent_id,
      project_id: args?.project_id,
      role_in_project: args?.role_in_project,
      capabilities_override: args?.capabilities_override,
      max_concurrent_tasks: args?.max_concurrent_tasks,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(`Agent #${args?.agent_id} 已授权访问项目 #${args?.project_id}，角色: ${data?.role_in_project || 'contributor'}`, result);
  },

  'revoke_cross_project_agent': async (args, ctx) => {
    const result = await ctx.apiClient.revokeCrossProjectAgent(args?.agent_id, args?.project_id);
    return ctx.toToolResponse(`Agent #${args?.agent_id} 的项目 #${args?.project_id} 跨项目授权已撤销`, result);
  },

  'list_agent_cross_projects': async (args, ctx) => {
    const result = await ctx.apiClient.listAgentCrossProjects(args?.agent_id);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 已授权访问 ${items.length} 个项目\n${items.map((a: any) => `- 项目 #${a.project_id} (${a.project_name || ''}) 角色: ${a.role_in_project}`).join('\n')}`,
      result,
    );
  },

  'list_project_external_agents': async (args, ctx) => {
    const result = await ctx.apiClient.listProjectExternalAgents(args?.project_id);
    const data = result?.data || result;
    const items = data?.agents || data?.items || (Array.isArray(data) ? data : []);
    return ctx.toToolResponse(
      `项目 #${args?.project_id} 有 ${items.length} 个外部 Agent\n${items.map((a: any) => `- Agent #${a.agent_id} (${a.agent_name || ''}) 角色: ${a.role_in_project}`).join('\n')}`,
      result,
    );
  },

  'discover_cross_project_agents': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.capability) params.capability = args.capability;
    const result = await ctx.apiClient.discoverCrossProjectAgents(params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(
      `发现 ${items.length} 个跨项目 Agent\n${items.map((a: any) => `- Agent #${a.agent_id} (${a.agent_name || ''}) 来源: ${a.source}, 项目: ${a.available_projects?.join(', ')}`).join('\n')}`,
      result,
    );
  },

  'find_capable_agents_cross_project': async (args, ctx) => {
    const params: Record<string, string> = { capabilities: args?.capabilities };
    if (args?.project_id) params.project_id = String(args.project_id);
    const result = await ctx.apiClient.findCapableAgentsCrossProject(params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(
      `找到 ${items.length} 个具备能力的 Agent\n${items.map((a: any) => `- ${a.agent_name} (匹配: ${a.matched_capabilities?.join(', ')}) 来源: ${a.source}, 得分: ${a.match_score}`).join('\n')}`,
      result,
    );
  },

  'suggest_capability_adaptation': async (args, ctx) => {
    const result = await ctx.apiClient.suggestCapabilityAdaptation(args?.agent_id);
    const data = result?.data || result;
    const additions = Object.keys(data?.suggested_additions || {});
    const removals = Object.keys(data?.suggested_removals || {});
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 能力自适应建议:\n建议添加: ${additions.length > 0 ? additions.join(', ') : '无'}\n建议移除: ${removals.length > 0 ? removals.join(', ') : '无'}\n当前能力: ${(data?.current_capabilities || []).join(', ')}`,
      result,
    );
  },

  'apply_capability_adaptation': async (args, ctx) => {
    const result = await ctx.apiClient.applyCapabilityAdaptation(args?.agent_id, {
      additions: args?.additions,
      removals: args?.removals,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 能力已调整: 添加 ${data?.additions_applied?.join(', ') || '无'}, 移除 ${data?.removals_applied?.join(', ') || '无'}\n新能力: ${(data?.new_capabilities || []).join(', ')}`,
      result,
    );
  },

  'bind_agent_sandbox': async (args, ctx) => {
    const result = await ctx.apiClient.bindAgentSandbox(args?.agent_id, { sandbox_id: args?.sandbox_id });
    return ctx.toToolResponse(`已将沙盒 #${args?.sandbox_id} 绑定到 Agent #${args?.agent_id}`, result);
  },

  'get_agent_sandbox': async (args, ctx) => {
    const result = await ctx.apiClient.getAgentSandbox(args?.agent_id);
    const s = result?.data?.sandbox;
    if (!s) return ctx.toToolResponse(`Agent #${args?.agent_id} 未绑定沙盒策略`, result);
    return ctx.toToolResponse(`Agent #${args?.agent_id} 绑定沙盒 #${s.id} "${s.name}" [${s.security_level}]`, result);
  },

  'get_sandbox_violations_by_agent': async (args, ctx) => {
    const result = await ctx.apiClient.getSandboxViolationsByAgent(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.name || 'Agent'} #${it.agent_id} [${it.kind || '?'}]: ${it.total} 次`)
      .join('\n');
    return ctx.toToolResponse(`沙盒违规按 Agent (近 ${d?.days || 30} 天, top ${items.length}):\n${summary || '暂无违规'}`, result);
  },

  'get_conflicts_by_agent': async (args, ctx) => {
    const result = await ctx.apiClient.getConflictsByAgent(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => `• ${it.name || 'Agent'} #${it.agent_id} [${it.kind || '?'}]: 共 ${it.total} (活跃 ${it.active})`)
      .join('\n');
    return ctx.toToolResponse(`冲突按 Agent 分布 (top ${items.length}):\n${summary || '暂无冲突数据'}`, result);
  },

  'get_agent_skill_matching': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentSkillMatching(limit);
    const data = result?.data || result || {};
    const tasks: any[] = data.tasks || [];
    const lines = tasks.map((t: any) => {
      const recs = (t.recommendations || []).map((r: any) => `${r.agent_name}(${r.match_score}%)`).join(', ');
      return `• ${t.task_title}: ${recs || '无匹配Agent'}`;
    });
    return ctx.toToolResponse(
      `Agent技能匹配推荐:\n${lines.join('\n') || '无匹配数据'}`,
      result,
    );
  },

  'get_agent_task_handoff_stats': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentTaskHandoffStats(days, limit);
    const data = result?.data || result || {};
    const handoffs: any[] = data.handoffs || [];
    const lines = handoffs.map((h: any) =>
      `• ${h.from_agent}→${h.to_agent}: ${h.count}次 均${h.avg_duration_seconds ?? 0}s`
    );
    return ctx.toToolResponse(
      `Agent任务交接统计(近${data.days ?? days}天):\n${lines.join('\n') || '无交接数据'}`,
      result,
    );
  },

  'get_agent_workload_forecast': async (args, ctx) => {
    const days = Math.max(7, Math.min(90, Number(args?.days ?? 30) || 30));
    const horizon = Math.max(1, Math.min(14, Number(args?.horizon ?? 3) || 3));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentWorkloadForecast(days, horizon, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) => {
      const arrow = a.trend === 'up' ? '↑' : a.trend === 'down' ? '↓' : '→';
      return `- ${a.agent_name}: 近7日均${a.recent_avg} 预测${a.forecast_total} ${arrow} 趋势${a.slope}`;
    });
    return ctx.toToolResponse(
      `Agent工作负载预测(近${data.days ?? days}天, 预测${data.horizon ?? horizon}天):\n${lines.join('\n') || '无负载数据'}`,
      result,
    );
  },

  'get_agent_specialization_evolution': async (args, ctx) => {
    const weeks = Math.max(2, Math.min(26, Number(args?.weeks ?? 12) || 12));
    const limit = Math.max(1, Math.min(15, Number(args?.limit ?? 8) || 8));
    const result = await ctx.apiClient.getAgentSpecializationEvolution(weeks, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) =>
      `- ${a.agent_name}: 累计${a.total_domains}域 峰值${a.peak_domains}域 [${(a.domains || []).join(',')}]`
    );
    return ctx.toToolResponse(
      `Agent专长演化(近${data.weeks ?? weeks}周):\n${lines.join('\n') || '无经验数据'}`,
      result,
    );
  },

  'get_agent_experiences_decay_alerts': async (args, ctx) => {
    const days = Math.max(7, Math.min(365, Number(args?.days ?? 30) || 30));
    const minDrop = Math.max(0.02, Math.min(0.5, Number(args?.min_drop ?? 0.1) || 0.1));
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getAgentExperiencesDecayAlerts(days, minDrop, limit);
    const data = result?.data || result || {};
    const alerts: any[] = data.alerts || [];
    const lines = alerts.map((a: any) =>
      `- ${a.agent_name}: 置信度 ${a.older_avg_confidence}→${a.newer_avg_confidence} (降${a.drop}, ${a.recommendation === 'review_recent_experiences' ? '建议复核近期经验' : '持续观察'})`
    );
    return ctx.toToolResponse(
      `经验置信度衰减告警(近${data.days ?? days}天, 阈值${data.min_drop ?? minDrop}): ${data.total_alerts ?? alerts.length} 条\n${lines.join('\n') || '无衰减告警'}`,
      result,
    );
  },

  'get_agent_cross_project_efficiency': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await ctx.apiClient.getAgentCrossProjectEfficiency(days, limit);
    const data = result?.data || result || {};
    const auths: any[] = data.authorizations || [];
    const lines = auths.map((a: any) =>
      `- ${a.agent_name} → ${a.host_project_name}: 完成${a.tasks_completed_in_host}任务 ${a.utilized ? '' : '(闲置授权)'}`
    );
    return ctx.toToolResponse(
      `跨项目借调效率(近${data.days ?? days}天): ${data.total_authorizations ?? auths.length}授权 活跃${data.active_count ?? 0} 已利用${data.utilized_count ?? 0} 闲置${data.idle_count ?? 0} 利用率${((data.utilization_rate ?? 0) * 100).toFixed(0)}%\n${lines.join('\n') || '无跨项目授权'}`,
      result,
    );
  },

  'get_agent_capability_supply_demand': async (args, ctx) => {
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await ctx.apiClient.getAgentCapabilitySupplyDemand(limit);
    const data = result?.data || result || {};
    const caps: any[] = data.capabilities || [];
    const statusLabel: Record<string, string> = {
      missing: '缺口(无供给)',
      bottleneck: '瓶颈(供不应求)',
      surplus: '过剩',
      unused_supply: '闲置供给',
      balanced: '平衡',
    };
    const lines = caps.map((c: any) =>
      `- ${c.capability}: 供给${c.supply} 需求${c.demand} [${statusLabel[c.status] || c.status}]`
    );
    return ctx.toToolResponse(
      `能力供需匹配: ${data.total_capabilities ?? caps.length}项 瓶颈/缺口${data.bottleneck_count ?? 0} Agent${data.agent_total ?? 0} 活跃任务${data.active_task_total ?? 0}\n${lines.join('\n') || '无能力数据'}`,
      result,
    );
  },

  'get_agent_idle_ranking': async (args, ctx) => {
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await ctx.apiClient.getAgentIdleRanking(limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const stages = data.stage_counts || {};
    const stageLabel: Record<string, string> = {
      active: '活跃', idle: '空闲', stale: '陈旧', dormant: '休眠', never: '从未',
    };
    const lines = agents.map((a: any) => {
      const hours = a.idle_hours;
      const dur = hours == null ? '从未活动' : hours < 24 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
      return `- ${a.agent_name}: ${dur} [${stageLabel[a.stage] || a.stage}]`;
    });
    const summary = Object.entries(stages).map(([k, v]) => `${stageLabel[k] || k}${v}`).join(' ');
    return ctx.toToolResponse(
      `Agent 闲置排行: ${data.total_agents ?? agents.length}个 ${summary}\n${lines.join('\n') || '无 Agent'}`,
      result,
    );
  },

  'list_audit_logs': async (args, ctx) => {
    const result = await ctx.apiClient.listAuditLogs(args);
    const items = result?.items || [];
    const lines = items.map((log: any) => {
      const actor = log.actor_agent_name || log.actor_user_email || log.actor_type;
      return `  • [${log.created_at}] ${actor} ${log.action} on ${log.resource_type}#${log.resource_id}`;
    });
    const summary = lines.length
      ? `Found ${items.length} audit log entry(ies):\n${lines.join('\n')}`
      : 'No audit log entries found.';
    return ctx.toToolResponse(summary, result);
  },

  'list_security_events': async (args, ctx) => {
    const result = await ctx.apiClient.listSecurityEvents(args);
    const items = result?.items || [];
    const lines = items.map((e: any) => {
      const agent = e.agent_id ? ` Agent#${e.agent_id}` : '';
      const run = e.workflow_run_id ? ` run#${e.workflow_run_id}` : '';
      return `  • [${e.occurred_at}] ${e.severity} ${e.event_type}${agent}${run} — ${e.title}`;
    });
    const summary = lines.length
      ? `Found ${items.length} security event(s) (total=${result?.pagination?.total ?? items.length}):\n${lines.join('\n')}`
      : 'No security events found.';
    return ctx.toToolResponse(summary, result);
  },

  'export_security_events': async (args, ctx) => {
    const csv = await ctx.apiClient.exportSecurityEvents(args);
    const rowCount = csv ? csv.trim().split('\n').length - 1 : 0;
    const summary = rowCount > 0
      ? `Exported ${rowCount} security event(s) as CSV (columns: occurred_at, event_type, severity, agent_id, workflow_run_id, source, source_id, title, detail).`
      : 'No security events matched the filters; CSV header only.';
    return ctx.toToolResponse(summary, { csv, row_count: rowCount });
  },

  'security_events_daily_trend': async (args, ctx) => {
    const result = await ctx.apiClient.securityEventsDailyTrend(args);
    const d = result?.data || result;
    const days = d?.days || [];
    const totals = d?.totals || {};
    const lines = days.map((day: any) =>
      `  • ${day.date}: 沙盒违规 ${day.sandbox_violation} · 冲突 ${day.conflict} · 审计 ${day.audit} · 合计 ${day.total}`
    );
    const summary = days.length
      ? `安全事件按天趋势 (${days.length} 天, 累计 沙盒违规 ${totals.sandbox_violation ?? 0}/冲突 ${totals.conflict ?? 0}/审计 ${totals.audit ?? 0}/合计 ${totals.total ?? 0}):\n${lines.join('\n')}`
      : '无安全事件趋势数据。';
    return ctx.toToolResponse(summary, result);
  },
};
