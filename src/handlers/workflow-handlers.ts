import type { HandlerMap } from './types.js';

export const workflowHandlers: HandlerMap = {
  'list_workflows': async (args, ctx) => {
    const result = await ctx.apiClient.listWorkflows(args);
    const items = result?.items || [];
    const lines = items.map((w: any) => {
      const stepCount = w.steps?.length || 0;
      const active = w.is_active ? 'active' : 'inactive';
      return `  • #${w.id} "${w.name}" — ${stepCount} step(s), ${active}`;
    });
    const summary = lines.length
      ? `Found ${items.length} workflow(s):\n${lines.join('\n')}`
      : 'No workflows found.';
    return ctx.toToolResponse(summary, result);
  },

  'create_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.createWorkflow(args);
    const stepCount = result?.steps?.length || 0;
    const summary = `Workflow #${result.id} "${result.name}" created with ${stepCount} step(s).`;
    return ctx.toToolResponse(summary, result);
  },

  'get_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflow(args);
    const steps = result?.steps || [];
    const stepLines = steps.map((s: any) => {
      const deps = s.depends_on?.length ? ` (depends: ${s.depends_on.join(', ')})` : ' (entry point)';
      const caps = s.required_capabilities?.length ? ` [${s.required_capabilities.join(', ')}]` : '';
      return `  ${s.order ?? 0}. ${s.step_key}: ${s.name}${caps}${deps}`;
    });
    const summary = `Workflow #${result.id} "${result.name}"\n${stepLines.join('\n')}`;
    return ctx.toToolResponse(summary, result);
  },

  'update_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.updateWorkflow(args);
    const stepCount = result?.steps?.length || 0;
    return ctx.toToolResponse(`Workflow #${result.id} "${result.name}" updated (${stepCount} steps).`, result);
  },

  'delete_workflow': async (args, ctx) => {
    await ctx.apiClient.deleteWorkflow(args);
    return ctx.toToolResponse(`Workflow #${args.workflow_id} deleted.`, { deleted: true });
  },

  'launch_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.launchWorkflow(args);
    const stepRuns = result?.step_runs || [];
    const started = stepRuns.filter((sr: any) => sr.status === 'running').length;
    const pending = stepRuns.filter((sr: any) => sr.status === 'pending').length;
    const summary = `Workflow run #${result.id} launched (status: ${result.status}). ${started} step(s) started, ${pending} pending.`;
    return ctx.toToolResponse(summary, result);
  },

  'list_workflow_runs': async (args, ctx) => {
    const result = await ctx.apiClient.listWorkflowRuns(args);
    const items = result?.items || [];
    const lines = items.map((r: any) => {
      const stepCount = r.step_runs?.length || 0;
      const done = (r.step_runs || []).filter((sr: any) => sr.status === 'succeeded').length;
      return `  • Run #${r.id} — workflow #${r.workflow_id}, status: ${r.status}, steps: ${done}/${stepCount} done`;
    });
    const summary = lines.length
      ? `Found ${items.length} workflow run(s):\n${lines.join('\n')}`
      : 'No workflow runs found.';
    return ctx.toToolResponse(summary, result);
  },

  'get_workflow_run': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowRun(args);
    const stepRuns = result?.step_runs || [];
    const lines = stepRuns.map((sr: any) => {
      const agent = sr.agent_id ? ` (Agent #${sr.agent_id})` : '';
      const task = sr.task_id ? ` → task #${sr.task_id}` : '';
      return `  • ${sr.step_key}: ${sr.status}${agent}${task}`;
    });
    const summary = `Workflow run #${result.id} (status: ${result.status})\n${lines.join('\n')}`;
    return ctx.toToolResponse(summary, result);
  },

  'get_workflow_step_stats': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowStepStats(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const summary = items
      .map((it: any) => {
        const rate = Math.round((it.success_rate || 0) * 100);
        const dur = typeof it.avg_duration_seconds === 'number' ? `${it.avg_duration_seconds}s` : '?';
        const retry = it.retries > 0 ? ` 重试${it.retries}` : '';
        return `• ${it.step_key}: ${it.total}次 成功${rate}% 失败${it.failed} 均${dur}${retry}`;
      })
      .join('\n');
    return ctx.toToolResponse(`工作流步骤统计:\n${summary || '暂无步骤运行数据'}`, result);
  },

  'get_workflow_run_duration_percentiles': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getWorkflowRunDurationPercentiles(days);
    const data = result?.data || result || {};
    const buckets: any[] = data.buckets || [];
    const lines = buckets.map((b: any) =>
      `${b.date}: n=${b.count} P50=${b.p50}s P90=${b.p90}s P95=${b.p95}s 均=${b.avg}s`
    );
    return ctx.toToolResponse(
      `工作流运行时长分位数趋势(近${days}天, 共${data.total_runs ?? 0}次 总均${data.total_avg_duration ?? 0}s):\n${lines.join('\n') || '暂无数据'}`,
      result,
    );
  },

  'get_workflow_step_failure_rate': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getWorkflowStepFailureRate(days, limit);
    const data = result?.data || result || {};
    const items: any[] = data.items || [];
    const totalSteps = data.total_steps ?? 0;
    const totalFailed = data.total_failed ?? 0;
    const lines = items.map((it: any) =>
      `- ${it.step_key}: ${it.failed}/${it.total} 失败率=${it.failure_rate}%`
    );
    return ctx.toToolResponse(
      `工作流步骤失败率排行(近${days}天, 共${totalSteps}步 ${totalFailed}失败):\n${lines.join('\n') || '无失败数据'}`,
      result,
    );
  },

  'get_workflow_step_cofailure_matrix': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(2, Math.min(15, Number(args?.limit ?? 8) || 8));
    const result = await ctx.apiClient.getWorkflowStepCofailureMatrix(days, limit);
    const data = result?.data || result || {};
    const stepKeys: any[] = data.step_keys || [];
    const matrix: any = data.matrix || {};
    const maxCo = data.max_cofailure ?? 0;
    const totalMulti = data.total_runs_with_multi_failure ?? 0;
    const lines: string[] = [];
    for (const sk of stepKeys) {
      const row = matrix[sk.step_key] || {};
      const coEntries = Object.entries(row)
        .filter(([k]: any) => k !== sk.step_key)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3)
        .map(([k, v]: any) => `${k}=${v}`)
        .join(', ');
      lines.push(`- ${sk.step_key} (失败${sk.failures}): ${coEntries || '无共现'}`);
    }
    return ctx.toToolResponse(
      `步骤共失败矩阵(近${days}天, ${totalMulti}次多步失败, 最大共现=${maxCo}):\n${lines.join('\n') || '无共失败数据'}`,
      result,
    );
  },

  'get_workflow_step_retry_topology': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getWorkflowStepRetryTopology(days, limit);
    const data = result?.data || result || {};
    const steps: any[] = data.steps || [];
    const totalRetries = data.total_retries ?? 0;
    const lines = steps.map((s: any) =>
      `- ${s.step_key}: ${s.retries}次重试(率${s.retry_rate}%) 首次成功${s.first_attempt_success_rate}% 重试成功${s.retry_success_rate}%`
    );
    return ctx.toToolResponse(
      `步骤重试拓扑(近${data.days ?? days}天, 共${totalRetries}次重试):\n${lines.join('\n') || '无重试数据'}`,
      result,
    );
  },

  'get_workflow_step_hourly_distribution': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getWorkflowStepHourlyDistribution(days, limit);
    const data = result?.data || result || {};
    const steps: any[] = data.steps || [];
    const lines = steps.map((s: any) => {
      const peak = s.peak_hour != null ? `峰值${s.peak_hour}时` : '';
      return `- ${s.step_key}: ${s.total}次 ${peak} 工时占比${s.business_hours_ratio}%`;
    });
    return ctx.toToolResponse(
      `步骤执行时段分布(近${data.days ?? days}天):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_workflow_step_dependency_bottleneck': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getWorkflowStepDependencyBottleneck(days, limit);
    const data = result?.data || result || {};
    const workflows: any[] = data.workflows || [];
    const lines = workflows.map((wf: any) => {
      const cp = (wf.critical_path || []).map((s: any) =>
        `${s.step_key}(${s.avg_duration}s, 瓶颈${s.bottleneck_score}%)`
      ).join(' → ');
      return `- ${wf.workflow_name}: 关键路径耗时${wf.critical_path_duration}s [${cp}]`;
    });
    return ctx.toToolResponse(
      `工作流步骤依赖瓶颈分析(近${days}天):\n${lines.join('\n') || '无依赖数据'}`,
      result,
    );
  },

  'get_workflow_similarity_matrix': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(10, Number(args?.limit ?? 5) || 5));
    const maxRuns = Math.max(2, Math.min(50, Number(args?.max_runs ?? 20) || 20));
    const result = await ctx.apiClient.getWorkflowSimilarityMatrix(days, limit, maxRuns);
    const data = result?.data || result || {};
    const workflows: any[] = data.workflows || [];
    const lines = workflows.map((wf: any) => {
      const mostSim = (wf.most_similar || []).map((p: any) => `#${p.run_a}↔#${p.run_b}=${p.similarity}`);
      const leastSim = (wf.least_similar || []).map((p: any) => `#${p.run_a}↔#${p.run_b}=${p.similarity}`);
      return `- ${wf.workflow_name}(${wf.run_count}次运行): 最相似[${mostSim.join(', ')}] 最不相似[${leastSim.join(', ')}]`;
    });
    return ctx.toToolResponse(
      `工作流运行相似度矩阵(近${data.days ?? days}天):\n${lines.join('\n') || '无相似度数据'}`,
      result,
    );
  },

  'get_workflow_failed_steps_by_duration': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowFailedStepsByDuration(args);
    const d = result?.data || result;
    const items = Array.isArray(d?.items) ? d.items : [];
    const total = d?.total_failed_steps ?? 0;
    const days = d?.days ?? 30;
    const summary = items
      .map((it: any) => `• ${it.step_key}: 失败${it.failures}次 均${it.avg_duration_seconds}s 中位${it.median_duration_seconds}s 最长${it.max_duration_seconds}s`)
      .join('\n');
    return ctx.toToolResponse(
      `失败步骤耗时排行(近${days}天, 共${total}次失败, 按平均耗时降序):\n${summary || '暂无失败步骤数据'}`,
      result,
    );
  },

  'get_workflow_run_trend': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowRunTrend(args);
    const d = result?.data || result;
    const trend = Array.isArray(d?.trend) ? d.trend : [];
    const recent = trend.slice(-7)
      .map((t: any) => `• ${t.date}: 成功 ${t.succeeded} / 失败 ${t.failed} / 失败步骤 ${t.failed_steps ?? 0}`)
      .join('\n');
    return ctx.toToolResponse(
      `工作流运行趋势 (近 ${d?.days || 30} 天): 累计成功 ${d?.total_succeeded || 0}, 累计失败 ${d?.total_failed || 0}, 累计失败步骤 ${d?.total_failed_steps || 0}\n${recent || '暂无数据'}`,
      result,
    );
  },

  'get_workflow_success_rate_by_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowSuccessRateByWorkflow(args);
    const d = result?.data || result;
    const wfs = Array.isArray(d?.workflows) ? d.workflows : [];
    const lines = wfs.map((w: any) =>
      `• ${w.name}: ${w.succeeded}/${w.total} 成功 (${w.success_rate}%), 平均耗时 ${w.avg_duration}s`
    ).join('\n');
    return ctx.toToolResponse(
      `工作流成功率对比 (近 ${d?.days || 30} 天, Top ${wfs.length}):\n${lines || '暂无数据'}`,
      result,
    );
  },

  'get_workflow_run_console': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowRunConsole(args);
    const wf = result?.workflow_run || {};
    const steps = result?.steps || [];
    const sm = result?.summary || {};
    const conflicts = result?.conflicts || [];
    const stepLines = steps.map((s: any) => {
      const sr = s.step_run || {};
      const eff = s.effective_params || {};
      const overrides = Object.keys(sr.runtime_overrides || {}).length
        ? ` [overrides: ${Object.keys(sr.runtime_overrides).join(',')}]`
        : '';
      const sb = s.sandbox_execution ? ` 🛡️exec#${s.sandbox_execution.id}:${s.sandbox_execution.status}` : '';
      const dur = (s.duration_seconds != null) ? ` ${(s.duration_seconds as number).toFixed(0)}s` : '';
      const logs = (s.recent_logs || []).length
        ? ` logs:${(s.recent_logs as any[]).length}`
        : '';
      const agent = sr.agent_id ? ` (Agent #${sr.agent_id})` : '';
      return `  • ${sr.step_key}: ${sr.status}${agent}${sb}${dur}${overrides}${logs}`;
    });
    const conflictLines = conflicts.length
      ? conflicts.map((c: any) => `    ⚠ ${c.title || c.conflict_type} [${c.status}/${c.severity}]`)
      : ['    (none)'];
    const summary = [
      `Console — Workflow run #${wf.id} (status: ${wf.status})`,
      `Progress: ${sm.progress_percent ?? 0}% | total=${sm.total_steps ?? 0} running=${sm.running_count ?? 0} failed=${sm.failed_count ?? 0} pending=${sm.pending_count ?? 0}`,
      'Steps:',
      ...stepLines,
      'Conflicts:',
      ...conflictLines,
    ].join('\n');
    return ctx.toToolResponse(summary, result);
  },

  'cancel_workflow_run': async (args, ctx) => {
    const result = await ctx.apiClient.cancelWorkflowRun(args);
    return ctx.toToolResponse(`Workflow run #${args.run_id} cancelled.`, result);
  },

  'pause_workflow_run': async (args, ctx) => {
    const result = await ctx.apiClient.pauseWorkflowRun(args);
    return ctx.toToolResponse(`Workflow run #${args.run_id} paused. Running steps continue but no new steps will start.`, result);
  },

  'resume_workflow_run': async (args, ctx) => {
    const result = await ctx.apiClient.resumeWorkflowRun(args);
    return ctx.toToolResponse(`Workflow run #${args.run_id} resumed. DAG engine re-evaluating steps.`, result);
  },

  'retry_workflow_run': async (args, ctx) => {
    const result = await ctx.apiClient.retryWorkflowRun(args);
    const retriedSteps = result?.step_runs?.filter((sr: any) => (sr.attempt || 1) > 1).map((sr: any) => sr.step_key) || [];
    const summary = retriedSteps.length > 0
      ? `Workflow run #${args.run_id} retry started. Retried steps: ${retriedSteps.join(', ')}`
      : `Workflow run #${args.run_id} retry started.`;
    return ctx.toToolResponse(summary, result);
  },

  'complete_workflow_step': async (args, ctx) => {
    const result = await ctx.apiClient.completeWorkflowStep(args);
    const success = args?.success !== false;
    const summary = success
      ? `Step "${args.step_key}" in run #${args.run_id} completed successfully. Workflow status: ${result.status}.`
      : `Step "${args.step_key}" in run #${args.run_id} failed. Workflow status: ${result.status}.`;
    return ctx.toToolResponse(summary, result);
  },

  'list_workflow_triggers': async (args, ctx) => {
    const result = await ctx.apiClient.listWorkflowTriggers(args);
    const items = result?.items ?? [];
    const summary = items.length === 0
      ? 'No workflow triggers found.'
      : `Found ${items.length} trigger(s): ${items.map((t: any) => `"${t.name}" (id=${t.id}, ${t.is_active ? 'active' : 'inactive'}, next: ${t.next_fire_at ?? 'N/A'})`).join('; ')}`;
    return ctx.toToolResponse(summary, result);
  },

  'create_workflow_trigger': async (args, ctx) => {
    const result = await ctx.apiClient.createWorkflowTrigger(args);
    const summary = `Created trigger "${args.name}" (id=${result?.id}) for workflow #${args.workflow_id}. Next fire: ${result?.next_fire_at ?? 'N/A'}.`;
    return ctx.toToolResponse(summary, result);
  },

  'update_workflow_trigger': async (args, ctx) => {
    const result = await ctx.apiClient.updateWorkflowTrigger(args);
    const summary = `Updated trigger #${args.trigger_id}. Active: ${result?.is_active}, Next fire: ${result?.next_fire_at ?? 'N/A'}.`;
    return ctx.toToolResponse(summary, result);
  },

  'delete_workflow_trigger': async (args, ctx) => {
    await ctx.apiClient.deleteWorkflowTrigger(args.trigger_id);
    return ctx.toToolResponse(`Deleted trigger #${args.trigger_id}.`);
  },

  'timeout_workflow_steps': async (args, ctx) => {
    const result = await ctx.apiClient.timeoutWorkflowSteps();
    const count = result?.timed_out ?? 0;
    const summary = count === 0
      ? 'No timed-out workflow steps found.'
      : `Timed out ${count} step(s): ${result.steps.map((s: any) => `run #${s.run_id}/${s.step_key} (${s.elapsed_seconds}s > ${s.timeout_seconds}s)`).join(', ')}`;
    return ctx.toToolResponse(summary, result);
  },

  'list_workflow_templates': async (args, ctx) => {
    const result = await ctx.apiClient.listWorkflowTemplates(args);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'No workflow templates found.'
      : `${items.length} template(s): ${items.map((t: any) => `"${t.name}" (${t.key}, ${t.category}, ${t.step_count} steps)`).join('; ')}`;
    return ctx.toToolResponse(summary, result);
  },

  'get_workflow_template': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowTemplate(args.template_key);
    const summary = `Template "${result.name}" (${result.key}): ${result.step_count} steps — ${result.description}`;
    return ctx.toToolResponse(summary, result);
  },

  'instantiate_workflow_template': async (args, ctx) => {
    const result = await ctx.apiClient.instantiateWorkflowTemplate(args);
    const summary = `Workflow "${result.name}" (id=${result.id}) created from template "${args.template_key}".`;
    return ctx.toToolResponse(summary, result);
  },

  'list_workflow_versions': async (args, ctx) => {
    const result = await ctx.apiClient.listWorkflowVersions(args);
    const data = result?.data || result;
    const current = data?.current_version || '?';
    const versions = data?.versions || [];
    const summary = versions.map((v: any) => `• v${v.version_number}: ${v.change_summary || '无变更说明'} (${v.created_at || ''})`).join('\n');
    return ctx.toToolResponse(`工作流版本历史 (当前: v${current}):\n${summary || '无版本记录'}`, result);
  },

  'get_workflow_version': async (args, ctx) => {
    const result = await ctx.apiClient.getWorkflowVersion(args);
    const data = result?.data || result;
    const steps = data?.steps_snapshot || [];
    return ctx.toToolResponse(`工作流版本 v${args?.version_number}: ${steps.length} 个步骤`, result);
  },

  'rollback_workflow': async (args, ctx) => {
    const result = await ctx.apiClient.rollbackWorkflow(args);
    return ctx.toToolResponse(`工作流已回滚到版本 ${args?.version}`, result);
  },

  'diff_workflow_versions': async (args, ctx) => {
    const result = await ctx.apiClient.diffWorkflowVersions(args);
    const data = result?.data || result;
    const added = (data?.added_steps || []).join(', ') || '无';
    const removed = (data?.removed_steps || []).join(', ') || '无';
    const modified = (data?.modified_steps || []).join(', ') || '无';
    return ctx.toToolResponse(`版本差异 v${args?.v1} → v${args?.v2}:\n新增: ${added}\n删除: ${removed}\n修改: ${modified}`, result);
  },

  'set_step_runtime_override': async (args, ctx) => {
    const payload: Record<string, any> = { overrides: args?.overrides || {} };
    if (args?.merge !== undefined) payload.merge = args.merge;
    const result = await ctx.apiClient.setStepRuntimeOverride(args?.run_id, args?.step_key, payload);
    const d = result?.data || result;
    const eff = d?.effective_params || {};
    return ctx.toToolResponse(
      `已为运行 #${args?.run_id} 步骤 "${args?.step_key}" 应用运行时覆盖\n` +
      `有效参数: agent=${eff.agent_id ?? '-'}, timeout=${eff.timeout_seconds ?? '-'}s, retry=${eff.retry_count ?? '-'}, on_failure=${eff.on_failure ?? '-'}, caps=[${(eff.required_capabilities || []).join(',')}]`,
      result,
    );
  },

  'clear_step_runtime_override': async (args, ctx) => {
    const result = await ctx.apiClient.clearStepRuntimeOverride(args?.run_id, args?.step_key);
    return ctx.toToolResponse(`已清除运行 #${args?.run_id} 步骤 "${args?.step_key}" 的运行时覆盖`, result);
  },

  'get_step_effective_params': async (args, ctx) => {
    const result = await ctx.apiClient.getStepEffectiveParams(args?.run_id, args?.step_key);
    const d = result?.data || result;
    const eff = d?.effective_params || {};
    const overrides = d?.overrides || {};
    return ctx.toToolResponse(
      `步骤 "${args?.step_key}" (运行 #${args?.run_id}) 有效参数:\n` +
      `agent_id=${eff.agent_id ?? '-'}, required_capabilities=[${(eff.required_capabilities || []).join(',')}], timeout=${eff.timeout_seconds ?? '-'}s, retry=${eff.retry_count ?? '-'}, on_failure=${eff.on_failure ?? '-'}\n` +
      `condition=${eff.condition ? JSON.stringify(eff.condition) : '-'}, task_template=${eff.task_template_id ?? '-'}, sub_workflow=${eff.sub_workflow_id ?? '-'}\n` +
      `运行时覆盖: ${Object.keys(overrides).length ? JSON.stringify(overrides) : '无'}`,
      result,
    );
  },

  'get_workflow_failure_correlation': async (args, ctx) => {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await ctx.apiClient.getWorkflowFailureCorrelation(days, windowHours);
    const data = result?.data || result || {};
    const total = data.total_failed_steps ?? 0;
    const top = data.top_agents || [];
    return ctx.toToolResponse(
      `失败步骤跨维度关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h窗口):\n` +
        `失败步骤总数: ${total}\n` +
        `伴随冲突: ${data.with_conflict ?? 0} (${data.conflict_rate ?? 0}%)\n` +
        `伴随沙盒违规: ${data.with_violation ?? 0} (${data.violation_rate ?? 0}%)\n` +
        `同时伴随两者: ${data.with_both ?? 0} (${data.both_rate ?? 0}%)\n` +
        `关联最多的 Agent(top8): ${top.map((a: any) => `${a.name}#${a.agent_id}(失败${a.failed_steps}/冲突${a.with_conflict}/违规${a.with_violation})`).join(', ') || '无'}`,
      result,
    );
  },

  'get_workflow_failure_correlation_by_step': async (args, ctx) => {
    const days = args?.days ?? 30;
    const windowHours = args?.window_hours ?? 2;
    const result = await ctx.apiClient.getWorkflowFailureCorrelationByStep(days, windowHours);
    const data = result?.data || result || {};
    const items = data.items || [];
    return ctx.toToolResponse(
      `按步骤的失败关联(近${data.days ?? days}天, ±${data.window_hours ?? windowHours}h):\n` +
        `${items.map((it: any) => `- ${it.step_key}: 失败${it.failed} 冲突${it.with_conflict}(${it.conflict_rate}%) 违规${it.with_violation}(${it.violation_rate}%)${Object.keys(it.conflict_types || {}).length ? ` 类型[${Object.entries(it.conflict_types).map(([t, c]: any) => `${t}=${c}`).join(', ')}]` : ''}`).join('\n') || '无失败步骤'}`,
      result,
    );
  },

  'get_workflow_step_duration_histogram': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getWorkflowStepDurationHistogram(days, limit);
    const data = result?.data || result || {};
    const steps: any[] = data.steps || [];
    const lines = steps.map((s: any) => {
      const buckets = (s.buckets || []).map((b: any) => `${b.range}:${b.count}`).join(' ');
      return `• ${s.step_key}: ${buckets}`;
    });
    return ctx.toToolResponse(
      `步骤耗时分布直方图(近${data.days ?? days}天):\n${lines.join('\n') || '无耗时数据'}`,
      result,
    );
  },

  'get_workflow_step_bottleneck_timeline': async (args, ctx) => {
    const days = Math.max(7, Math.min(90, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(15, Number(args?.limit ?? 8) || 8));
    const result = await ctx.apiClient.getWorkflowStepBottleneckTimeline(days, limit);
    const data = result?.data || result || {};
    const steps: any[] = data.steps || [];
    const lines = steps.map((s: any) =>
      `• ${s.step_key}: 均${s.avg_duration}s 变化${s.change_pct > 0 ? '+' : ''}${s.change_pct}% (${s.sample_count}次)`
    );
    return ctx.toToolResponse(
      `步骤瓶颈时序(近${data.days ?? days}天):\n${lines.join('\n') || '无时序数据'}`,
      result,
    );
  },

  'get_workflow_structural_complexity': async (args, ctx) => {
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await ctx.apiClient.getWorkflowStructuralComplexity(limit);
    const data = result?.data || result || {};
    const wfs: any[] = data.workflows || [];
    const lines = wfs.map((w: any) =>
      `- ${w.workflow_name} v${w.version}: ${w.step_count}步 深度${w.max_depth} 边${w.total_edges} 根${w.root_count}/叶${w.leaf_count}`
    );
    return ctx.toToolResponse(
      `工作流结构复杂度: ${data.total_workflows ?? wfs.length}个 均步数${data.avg_steps ?? 0} 均深度${data.avg_depth ?? 0}\n${lines.join('\n') || '无活跃工作流'}`,
      result,
    );
  },
};
