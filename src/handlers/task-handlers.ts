import type { HandlerMap } from './types.js';
import { logger } from '../logger.js';
import { summarizeReviewQueue, summarizeAssignments, summarizeTaskEvents, summarizeAssignmentUpdate } from './response.js';

export const taskHandlers: HandlerMap = {
  'get_project_tasks_by_name': async (args, ctx) => {
    const result = await ctx.apiClient.getProjectTasksByName(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'get_task_by_id': async (args, ctx) => {
    const result = await ctx.apiClient.getTaskById(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'get_task_evidence': async (args, ctx) => {
    const result = await ctx.apiClient.getTaskEvidence(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'set_task_dod': async (args, ctx) => {
    const result = await ctx.apiClient.setTaskDod(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'submit_task_feedback': async (args, ctx) => {
    const result = await ctx.apiClient.submitTaskFeedback(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'create_task': async (args, ctx) => {
    const result = await ctx.apiClient.createTask(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  'get_project_info': async (args, ctx) => {
    const handlerStartTime = Date.now();
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[MCP_SERVER] ========== HANDLER START: handleGetProjectInfo ==========', {
      handlerId,
      instanceId: ctx.instanceId,
      args,
      hasProjectId: !!args?.project_id,
      hasProjectName: !!args?.project_name,
      timestamp: new Date().toISOString()
    });

    logger.debug('[MCP_SERVER] handleGetProjectInfo input validation', {
      handlerId,
      projectId: args?.project_id,
      projectName: args?.project_name,
      argsType: typeof args,
      argsKeys: args ? Object.keys(args) : [],
      isValidInput: !!(args?.project_id || args?.project_name)
    });

    try {
      logger.info('[MCP_SERVER] handleGetProjectInfo calling API client...', {
        handlerId,
        instanceId: ctx.instanceId,
        apiMethod: 'getProjectInfo',
        args
      });

      const apiCallStartTime = Date.now();
      const result = await ctx.apiClient.getProjectInfo(args);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('[MCP_SERVER] handleGetProjectInfo API call successful', {
        handlerId,
        instanceId: ctx.instanceId,
        apiCallDuration: `${apiCallDuration}ms`,
        projectId: result.id,
        projectName: result.name,
        projectStatus: result.status,
        hasStats: !!result.statistics,
        hasRecentTasks: !!result.recent_tasks,
        resultSize: JSON.stringify(result).length,
        resultKeys: Object.keys(result)
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo API result details', {
        handlerId,
        result: result,
        statistics: result.statistics,
        recentTasks: result.recent_tasks
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo preparing response...', {
        handlerId,
        responseFormat: 'MCP tool response',
        contentType: 'text',
        willStringify: true
      });

      const response = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      const handlerDuration = Date.now() - handlerStartTime;
      logger.info('[MCP_SERVER] handleGetProjectInfo response prepared', {
        handlerId,
        instanceId: ctx.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        responseSize: JSON.stringify(response).length,
        contentType: response.content[0]?.type,
        contentCount: response.content.length,
        textLength: response.content[0]?.text?.length
      });

      logger.info('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo ==========', {
        handlerId,
        instanceId: ctx.instanceId,
        success: true,
        totalDuration: `${handlerDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      const handlerDuration = Date.now() - handlerStartTime;

      logger.error('[MCP_SERVER] handleGetProjectInfo failed', {
        handlerId,
        instanceId: ctx.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        args,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.error('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo (ERROR) ==========', {
        handlerId,
        instanceId: ctx.instanceId,
        success: false,
        totalDuration: `${handlerDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  },

  'list_review_queue': async (args, ctx) => {
    const result = await ctx.apiClient.listReviewQueue(args || {});

    return ctx.toToolResponse(summarizeReviewQueue(result), result);
  },

  'list_task_events': async (args, ctx) => {
    const result = await ctx.apiClient.listTaskEvents(args);

    return ctx.toToolResponse(summarizeTaskEvents(result), result);
  },

  'post_task_event': async (args, ctx) => {
    const event = await ctx.apiClient.postTaskEvent(args);

    const actor = event.actor_agent?.name || event.actor_user?.email || event.actor_type;
    const summary = `Posted ${event.event_type} to task #${event.task_id} as ${actor} (event #${event.id}).`;

    return ctx.toToolResponse(summary, event);
  },

  'create_subtask': async (args, ctx) => {
    const result = await ctx.apiClient.createSubtask(args);
    const summary = `Created subtask #${result.id} "${result.title}" under task #${args.task_id}.`;
    return ctx.toToolResponse(summary, result);
  },

  'get_shared_context': async (args, ctx) => {
    const entries = await ctx.apiClient.getSharedContext(args);
    if (!entries || entries.length === 0) {
      return ctx.toToolResponse(`No shared context found for task #${args.task_id}.`, []);
    }
    const lines = [`Shared context for task #${args.task_id}:`];
    for (const e of entries) {
      const author = e.author_agent_name || e.author_user_name || 'unknown';
      lines.push(`  [${e.key}] (by ${author}, updated ${e.updated_at}):`);
      lines.push(`    ${e.value.length > 200 ? e.value.substring(0, 200) + '...' : e.value}`);
    }
    return ctx.toToolResponse(lines.join('\n'), entries);
  },

  'set_shared_context': async (args, ctx) => {
    const result = await ctx.apiClient.setSharedContext(args);
    const summary = `Shared context "${args.key}" saved for task #${args.task_id}.`;
    return ctx.toToolResponse(summary, result);
  },

  'delete_shared_context': async (args, ctx) => {
    await ctx.apiClient.deleteSharedContext(args);
    return ctx.toToolResponse(`Shared context entry #${args.entry_id} deleted from task #${args.task_id}.`, { deleted: true });
  },

  'get_run_logs': async (args, ctx) => {
    const result = await ctx.apiClient.getRunLogs(args);
    if (!result.items || result.items.length === 0) {
      return ctx.toToolResponse(`No log entries found for run #${args.run_id}.`, result);
    }
    const lines = [`Run #${args.run_id} logs (${result.items.length} entries, latest_id=${result.latest_id}):`];
    for (const log of result.items) {
      const levelTag = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : log.level === 'debug' ? '🔍' : 'ℹ️';
      lines.push(`  ${levelTag} [${log.level}] #${log.id}: ${log.message}`);
      if (log.meta && Object.keys(log.meta).length > 0) {
        lines.push(`    meta: ${JSON.stringify(log.meta)}`);
      }
    }
    return ctx.toToolResponse(lines.join('\n'), result);
  },

  'append_run_logs': async (args, ctx) => {
    const result = await ctx.apiClient.appendRunLogs(args);
    return ctx.toToolResponse(`Appended ${result.length} log entries to run #${args.run_id}.`, result);
  },

  'list_task_templates': async (args, ctx) => {
    const templates = await ctx.apiClient.listTaskTemplates();
    if (!templates || templates.length === 0) {
      return ctx.toToolResponse('No task templates found.', []);
    }
    const lines = ['Task templates:'];
    for (const t of templates) {
      const capStr = t.capabilities?.length ? ` [${t.capabilities.join(', ')}]` : '';
      lines.push(`  #${t.id} "${t.name}" — priority: ${t.priority}, is_ai_task: ${t.is_ai_task}${capStr}`);
    }
    return ctx.toToolResponse(lines.join('\n'), templates);
  },

  'create_task_template': async (args, ctx) => {
    const result = await ctx.apiClient.createTaskTemplate(args);
    return ctx.toToolResponse(`Task template "${result.name}" created (ID #${result.id}).`, result);
  },

  'instantiate_task_template': async (args, ctx) => {
    const result = await ctx.apiClient.instantiateTaskTemplate(args);
    const taskTitle = result?.title || 'Untitled';
    const taskId = result?.id || '?';
    return ctx.toToolResponse(`Task #${taskId} "${taskTitle}" created from template #${args.template_id}.`, result);
  },

  'list_task_assignments': async (args, ctx) => {
    const result = await ctx.apiClient.listTaskAssignments(args);

    return ctx.toToolResponse(summarizeAssignments(result, `Assignments for task #${args?.task_id}`), result);
  },

  'handoff_task': async (args, ctx) => {
    const result = await ctx.apiClient.handoffTask(args);

    const from = result.from_assignment?.agent?.name
      || (result.from_assignment ? `Agent #${result.from_assignment.agent_id}` : 'unassigned');
    const to = result.assignment.agent?.name || `Agent #${result.assignment.agent_id}`;
    const summary = `Handed off task #${result.assignment.task_id} from ${from} to ${to} (assignment #${result.assignment.id}, run #${result.run.id}).`;

    return ctx.toToolResponse(summary, result);
  },

  'dispatch_tasks': async (args, ctx) => {
    const result = await ctx.apiClient.dispatchTasks(args);

    const coordinator = result.coordinator?.name || `Agent #${args.agent_id}`;
    const lines = result.assignments.map((item) => {
      const to = item.agent?.name || `Agent #${item.assignment.agent_id}`;
      const matchNote = item.score > 0
        ? `score ${item.score} [${item.matched_capabilities.join(', ')}]`
        : item.strategy;
      return `  • task #${item.assignment.task_id} → ${to} (${matchNote}, assignment #${item.assignment.id})`;
    });
    const header = `Coordinator ${coordinator} dispatched ${result.summary.dispatched}/${result.summary.claimable_tasks} claimable task(s) across ${result.summary.available_agents} available Agent(s).`;
    const summary = lines.length ? `${header}\n${lines.join('\n')}` : header;

    return ctx.toToolResponse(summary, result);
  },

  'update_task_assignment': async (args, ctx) => {
    const result = await ctx.apiClient.updateTaskAssignment(args);

    return ctx.toToolResponse(summarizeAssignmentUpdate(result), result);
  },

  'claim_cross_project_task': async (args, ctx) => {
    const result = await ctx.apiClient.claimCrossProjectTask(args?.agent_id, args?.task_id, {
      lease_seconds: args?.lease_seconds,
    });
    const data = result?.data || result;
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 已领取跨项目任务 #${args?.task_id} (任务: ${data?.task?.title || ''})`,
      result,
    );
  },

  'get_task_allocation_fairness': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getTaskAllocationFairness(days);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const gini = data.gini ?? 0;
    const level = data.fairness_level ?? 'unknown';
    const lines = agents.map((a: any) => `- ${a.name}: ${a.total}任务(完成${a.completed} 进行中${a.in_progress})`);
    return ctx.toToolResponse(
      `任务分配公平性(近${data.days ?? days}天): Gini=${gini} (${level})\n${lines.join('\n') || '无分配数据'}`,
      result,
    );
  },

  'get_task_stats': async (args, ctx) => {
    const result = await ctx.apiClient.getTaskStats();
    const data = result?.data || result || {};
    const total = data.total ?? 0;
    const byStatus = data.by_status || {};
    const byPriority = data.by_priority || {};
    const buckets = data.lifecycle_buckets || {};
    const statusEntries = Object.entries(byStatus);
    const priorityEntries = Object.entries(byPriority);
    const bucketEntries = Object.entries(buckets);
    return ctx.toToolResponse(
      `任务生命周期统计: 共 ${total} 个任务\n` +
        `完成率: ${data.completion_rate ?? 0}%, 取消率: ${data.cancellation_rate ?? 0}% (完成 ${data.done_count ?? 0}, 取消 ${data.cancelled_count ?? 0})\n` +
        `按状态: ${statusEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按优先级: ${priorityEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `平均完成率: ${data.avg_completion_rate ?? 0}%, 已完成任务平均生命周期: ${data.avg_lifecycle_hours ?? '—'} 小时\n` +
        `生命周期分布(已完成): ${bucketEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `逾期: ${data.overdue_count ?? 0} 个 (有截止日 ${data.with_due_date ?? 0} 个, 逾期率 ${data.overdue_rate ?? 0}%)\n` +
        `按项目(top10): ${(data.by_project || []).map((p: any) => `${p.name}=${p.count}`).join(', ') || '无'}\n` +
        `优先级×状态矩阵: ${Object.entries(data.by_priority_status || {}).map(([p, sts]: any) => `${p}:{${Object.entries(sts).map(([s, c]: any) => `${s}=${c}`).join(',')}}`).join('; ') || '无'}`,
      result,
    );
  },

  'get_task_overdue_trend': async (args, ctx) => {
    const days = args?.days ?? 30;
    const result = await ctx.apiClient.getTaskOverdueTrend(days);
    const data = result?.data || result || {};
    const trend = data.trend || [];
    const priorityTotals: any = data.by_priority_totals || {};
    const priorityEntries = Object.entries(priorityTotals) as [string, any][];
    return ctx.toToolResponse(
      `任务逾期趋势(近${data.days ?? days}天, 按due_date分日, 共${data.total_overdue ?? 0}个逾期):\n` +
      `${priorityEntries.length ? `按优先级累计: ${priorityEntries.map(([k, v]: any) => `${k}=${v}`).join(', ')}\n` : ''}` +
      `${trend.map((b: any) => `${b.date}: 逾期${b.overdue}${Object.keys(b.by_priority || {}).length ? ` [${Object.entries(b.by_priority).map(([k, v]: any) => `${k}=${v}`).join(',')}]` : ''}`).join('\n') || '无逾期数据'}`,
      result,
    );
  },

  'get_task_overdue_by_assignee': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getTaskOverdueByAssignee(limit);
    const data = result?.data || result || {};
    const items: any[] = data.items || [];
    const totalOverdue = data.total_overdue ?? 0;
    const lines = items.map((it: any) => {
      const priorities = Object.entries(it.by_priority || {}).map(([k, v]: any) => `${k}=${v}`).join(', ');
      return `- ${it.name}#${it.agent_id}: 逾期${it.overdue} [${priorities}] 最早到期=${it.earliest_due || '?'}`;
    });
    return ctx.toToolResponse(
      `任务逾期按负责人(共${totalOverdue}个逾期, top${items.length}):\n${lines.join('\n') || '无逾期分配'}`,
      result,
    );
  },

  'get_task_overdue_clustering': async (args, ctx) => {
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getTaskOverdueClustering(limit);
    const data = result?.data || result || {};
    const clusters: any[] = data.clusters || [];
    const totalOverdue = data.total_overdue ?? 0;
    const lines = clusters.map((c: any) =>
      `- ${c.project_name}/${c.priority}: ${c.count}个逾期 均${c.avg_days_overdue}天超期 ${c.titles?.join('; ') || ''}`
    );
    return ctx.toToolResponse(
      `任务逾期聚类分析(共${totalOverdue}个逾期, top${clusters.length}簇):\n${lines.join('\n') || '无逾期'}`,
      result,
    );
  },

  'get_task_completion_by_priority': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getTaskCompletionByPriority(days);
    const data = result?.data || result || {};
    const priorities: any[] = data.priorities || [];
    const total = data.total ?? 0;
    const lines = priorities.map((p: any) =>
      `- ${p.priority}: 总${p.total} 完成=${p.done} 取消=${p.cancelled} 完成率=${p.completion_rate}%`
    );
    return ctx.toToolResponse(
      `任务完成率按优先级(近${days}天, 共${total}任务):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_task_completion_rate_by_project': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getTaskCompletionRateByProject(days, limit);
    const data = result?.data || result || {};
    const projects: any[] = data.projects || [];
    const totalTasks = data.total_tasks ?? 0;
    const totalDone = data.total_done ?? 0;
    const lines = projects.map((p: any) =>
      `- ${p.name}: 总${p.total} 完成=${p.done} 进行=${p.in_progress} 取消=${p.cancelled} 完成率=${p.completion_rate}%`
    );
    return ctx.toToolResponse(
      `任务完成率按项目(近${days}天, 共${totalTasks}任务 ${totalDone}完成):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_task_priority_trend': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getTaskPriorityTrend(days);
    const data = result?.data || result || {};
    const trend: any[] = data.trend || [];
    const totals = data.totals || {};
    const recent = trend.slice(-7).map((t: any) =>
      `• ${t.date}: 紧急${t.critical} 高${t.high} 中${t.medium} 低${t.low}`
    ).join('\n');
    return ctx.toToolResponse(
      `任务优先级分布趋势(近${data.days ?? days}天): 累计 紧急${totals.critical ?? 0} 高${totals.high ?? 0} 中${totals.medium ?? 0} 低${totals.low ?? 0}\n${recent || '暂无数据'}`,
      result,
    );
  },

  'get_task_completion_forecast': async (args, ctx) => {
    const days = Math.max(7, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getTaskCompletionForecast(days);
    const data = result?.data || result || {};
    const velocity = data.velocity ?? 0;
    const totalDone = data.total_done_in_window ?? 0;
    const totalRemaining = data.total_remaining ?? 0;
    const daysToComplete = data.days_to_complete;
    const estDate = data.estimated_completion_date;
    const priForecast: any[] = data.priority_forecast || [];
    const priLines = priForecast.map((p: any) =>
      `- ${p.priority}: 剩余${p.remaining} 预计${p.estimated_days}天(${p.estimated_date || '—'})`
    ).join('\n');
    return ctx.toToolResponse(
      `任务完成预测(近${data.days ?? days}天速度${velocity}任务/天, 已完成${totalDone}): 剩余${totalRemaining} 预计${daysToComplete ?? '—'}天(${estDate || '—'})\n${priLines || '无剩余任务'}`,
      result,
    );
  },

  'get_task_completion_by_project': async (args, ctx) => {
    const days = args?.days ?? 30;
    const limit = args?.limit ?? 8;
    const result = await ctx.apiClient.getTaskCompletionByProject(days, limit);
    const data = result?.data || result || {};
    const series: any[] = data.series || [];
    const lines = series.map((s: any) =>
      `- ${s.name}#${s.project_id} (完成${s.total}): ${s.daily.map((d: any) => `${d.date}=${d.done}`).slice(-7).join(', ')}`,
    );
    return ctx.toToolResponse(
      `任务按项目完成趋势(近${data.days ?? days}天, 共${data.total_done ?? 0}个完成, top${series.length}项目, 显示近7天):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_task_completion_by_assignee': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 8) || 8));
    const result = await ctx.apiClient.getTaskCompletionByAssignee(days, limit);
    const data = result?.data || result || {};
    const series: any[] = data.series || [];
    const lines = series.map((s: any) =>
      `- ${s.name}#${s.agent_id} (完成${s.total}): ${s.daily.map((d: any) => `${d.date}=${d.done}`).slice(-7).join(', ')}`,
    );
    return ctx.toToolResponse(
      `任务按负责人完成趋势(近${data.days ?? days}天, 共${data.total_done ?? 0}个完成, top${series.length}Agent, 显示近7天):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'find_cross_project_tasks': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.limit) params.limit = String(args.limit);
    const result = await ctx.apiClient.findCrossProjectTasks(args?.agent_id, params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 跨项目可领取任务: ${items.length} 个\n${items.map((t: any) => `- [${t.match?.score || 0}分] ${t.task?.title} (项目: ${t.project?.name}, 角色: ${t.role_in_project})`).join('\n')}`,
      result,
    );
  },

  'get_task_dependency_chain': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const projectId = args?.project_id ? Number(args.project_id) : undefined;
    const result = await ctx.apiClient.getTaskDependencyChain(limit, projectId);
    const data = result?.data || result || {};
    const chains: any[] = data.chains || [];
    const lines = chains.map((c: any) =>
      `• ${c.root_title}: 深度${c.depth} 共${c.total_tasks}任务 完成${c.completed} 进行中${c.in_progress} 进度${c.progress_pct}%`
    );
    return ctx.toToolResponse(
      `任务依赖链分析:\n${lines.join('\n') || '无依赖链数据'}`,
      result,
    );
  },

  'get_task_comment_sentiment_trend': async (args, ctx) => {
    const days = Math.max(1, Math.min(90, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getTaskCommentSentimentTrend(days);
    const data = result?.data || result || {};
    const trend: any[] = data.trend || [];
    const lines = trend.map((d: any) =>
      `• ${d.date}: 积极${d.positive} 消极${d.negative} 中性${d.neutral}`
    );
    return ctx.toToolResponse(
      `评论情感趋势(近${data.days ?? days}天):\n${lines.join('\n') || '无评论数据'}`,
      result,
    );
  },

  'get_task_rework_analysis': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getTaskReworkAnalysis(days, limit);
    const data = result?.data || result || {};
    const tasks: any[] = data.tasks || [];
    const lines = tasks.map((t: any) => `• ${t.title}: 返工${t.rework_count}次 (${t.project_name})`);
    const projLines = (data.by_project || []).map((p: any) => `${p.project_name}=${p.rework_count}`).join(' ');
    return ctx.toToolResponse(
      `任务返工分析(近${data.days ?? days}天, ${data.total_reworked ?? 0}个任务 ${data.total_rework_events ?? 0}次返工):\n${lines.join('\n') || '无返工'}\n按项目: ${projLines || '无'}`,
      result,
    );
  },

  'escalate_overdue_tasks': async (args, ctx) => {
    const result = await ctx.apiClient.escalateOverdueTasks(args);
    const count = result?.escalated_count ?? 0;
    const summary = count > 0
      ? `Escalated ${count} overdue task(s). Task IDs: ${(result?.task_ids || []).join(', ')}`
      : 'No overdue tasks found to escalate.';
    return ctx.toToolResponse(summary, result);
  },
};
