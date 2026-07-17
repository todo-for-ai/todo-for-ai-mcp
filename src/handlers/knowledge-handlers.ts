import type { HandlerMap } from './types.js';

export const knowledgeHandlers: HandlerMap = {
  'list_knowledge_entries': async (args, ctx) => {
    const result = await ctx.apiClient.listKnowledgeEntries(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((e: any) => `• [${e.entry_type || 'insight'}] ${e.title} (${e.domain || '未分类'}, 置信度: ${e.confidence ?? 1.0})`).join('\n');
    return ctx.toToolResponse(`知识库 (${data?.total || items.length} 条):\n${summary || '暂无知识条目'}`, result);
  },

  'create_knowledge_entry': async (args, ctx) => {
    const result = await ctx.apiClient.createKnowledgeEntry(args);
    return ctx.toToolResponse(`知识条目已创建: ${args?.title}`, result);
  },

  'get_knowledge_entry': async (args, ctx) => {
    const result = await ctx.apiClient.getKnowledgeEntry(args);
    const data = result?.data || result;
    return ctx.toToolResponse(`知识条目: ${data?.title || ''}\n${data?.content || ''}`, result);
  },

  'update_knowledge_entry': async (args, ctx) => {
    const result = await ctx.apiClient.updateKnowledgeEntry(args);
    return ctx.toToolResponse(`知识条目已更新 (ID: ${args?.entry_id})`, result);
  },

  'delete_knowledge_entry': async (args, ctx) => {
    const result = await ctx.apiClient.deleteKnowledgeEntry(args);
    return ctx.toToolResponse(`知识条目已删除 (ID: ${args?.entry_id})`, result);
  },

  'search_knowledge': async (args, ctx) => {
    const result = await ctx.apiClient.searchKnowledge(args);
    const items = Array.isArray(result?.data || result) ? (result?.data || result) : [];
    const summary = items.map((e: any) => `• [${e.confidence ?? 1.0}] ${e.title}: ${(e.content || '').substring(0, 100)}...`).join('\n');
    return ctx.toToolResponse(`搜索结果 (${items.length} 条):\n${summary || '无匹配'}`, result);
  },

  'list_shared_knowledge': async (args, ctx) => {
    const result = await ctx.apiClient.listSharedKnowledge(args);
    const data = result?.data || result;
    const items = data?.items || (Array.isArray(data) ? data : []);
    const summary = items.map((e: any) => `• ${e.title} (${e.domain || '未分类'}, Agent #${e.agent_id})`).join('\n');
    return ctx.toToolResponse(`共享知识 (${data?.total || items.length} 条):\n${summary || '暂无共享知识'}`, result);
  },

  'auto_extract_knowledge': async (args, ctx) => {
    const result = await ctx.apiClient.autoExtractKnowledge(args);
    const data = result?.data || result;
    return ctx.toToolResponse(`自动提取完成: 创建了 ${data?.entries_created || 0} 条知识条目`, result);
  },

  'recommend_experiences': async (args, ctx) => {
    const params: Record<string, string> = {};
    if (args?.domain) params.domain = args.domain;
    if (args?.task_type) params.task_type = args.task_type;
    if (args?.capabilities) params.capabilities = args.capabilities;
    const result = await ctx.apiClient.recommendExperiences(args?.agent_id, params);
    const data = result?.data || result;
    const items = Array.isArray(data) ? data : data?.items || [];
    return ctx.toToolResponse(
      `Agent #${args?.agent_id} 推荐经验: ${items.length} 条\n${items.map((e: any) => `- [${e.experience_type}] ${e.domain || '无域'}: ${e.key_learnings?.substring(0, 80) || ''} (置信度: ${e.confidence})`).join('\n')}`,
      result,
    );
  },

  'get_experiences_stats': async (args, ctx) => {
    const result = await ctx.apiClient.getExperiencesStats();
    const data = result?.data || result || {};
    const total = data.total ?? 0;
    const byDomain = data.by_domain || {};
    const byTaskType = data.by_task_type || {};
    const byType = data.by_experience_type || {};
    const domainEntries = Object.entries(byDomain).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
    const taskEntries = Object.entries(byTaskType).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
    const typeEntries = Object.entries(byType);
    const bucketEntries = Object.entries(data.by_confidence_bucket || {});
    const topReused = data.top_reused || [];
    const matrix = data.by_domain_tasktype || {};
    const matrixSummary = Object.entries(matrix).slice(0, 5).map(([d, tasks]: any) => `${d}:{${Object.entries(tasks).map(([t, c]: any) => `${t}=${c}`).join(',')}}`).join('; ');
    const domainReuseEntries = Object.entries(data.by_domain_reuses || {}).slice(0, 8);
    const taskTypeReuseEntries = Object.entries(data.by_task_type_reuses || {}).slice(0, 8);
    const expTypeReuseEntries = Object.entries(data.by_experience_type_reuses || {}).slice(0, 8);
    return ctx.toToolResponse(
      `经验库统计: 共 ${total} 条有效经验\n` +
        `按经验类型: ${typeEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按域(top8): ${domainEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `按任务类型(top8): ${taskEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `置信度分布: ${bucketEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `共享: ${data.shared ?? 0} 条, 累计复用: ${data.total_reuses ?? 0} 次, 平均置信度: ${data.avg_confidence ?? 0}\n` +
        `复用最多(top5): ${topReused.slice(0, 5).map((e: any) => `#${e.id} ${e.domain}/${e.experience_type}(${e.times_reused}次,置信${e.confidence})`).join('; ') || '无'}\n` +
        `域×任务类型矩阵(top5域): ${matrixSummary || '无'}\n` +
        `域复用排行(top8): ${domainReuseEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `任务类型复用排行(top8): ${taskTypeReuseEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}\n` +
        `经验类型复用排行(top8): ${expTypeReuseEntries.map(([k, v]: any) => `${k}=${v}`).join(', ') || '无'}`,
      result,
    );
  },

  'get_experiences_low_confidence': async (args, ctx) => {
    const maxConfidence = typeof args?.max_confidence === 'number' ? args.max_confidence : 0.5;
    const limit = typeof args?.limit === 'number' ? args.limit : 20;
    const result = await ctx.apiClient.getExperiencesLowConfidence(maxConfidence, limit);
    const data = result?.data || result || {};
    const maxConf = data.max_confidence ?? maxConfidence;
    const items = data.items || [];
    const lines = items.map((e: any, i: number) =>
      `${i + 1}. #${e.id} agent=${e.agent_id} ${e.domain}/${e.task_type}/${e.experience_type} 置信度=${e.confidence} 复用=${e.times_reused}次 ${e.key_learnings ? `摘要:${e.key_learnings}` : '无摘要'}`,
    );
    return ctx.toToolResponse(
      `低置信度经验清单(置信度<${maxConf}): 共 ${items.length} 条\n` +
        (lines.length ? lines.join('\n') : '暂无低置信度经验'),
      result,
    );
  },

  'get_experiences_scatter': async (args, ctx) => {
    const limit = typeof args?.limit === 'number' ? args.limit : 200;
    const result = await ctx.apiClient.getExperiencesScatter(limit);
    const data = result?.data || result || {};
    const points = Array.isArray(data?.points) ? data.points : [];
    const maxReuses = data?.max_reuses ?? 0;
    // 按 times_reused 分桶统计，揭示置信度与复用的关系
    const buckets = { '高复用(≥10)': 0, '中复用(1-9)': 0, '未复用(0)': 0 };
    let highConfReused = 0; // 置信度≥0.7 且复用≥1
    let lowConfReused = 0;  // 置信度<0.5 且复用≥1
    for (const p of points) {
      const tr = p.times_reused || 0;
      if (tr >= 10) buckets['高复用(≥10)'] += 1;
      else if (tr >= 1) buckets['中复用(1-9)'] += 1;
      else buckets['未复用(0)'] += 1;
      if (tr >= 1) {
        if ((p.confidence ?? 0) >= 0.7) highConfReused += 1;
        else if ((p.confidence ?? 0) < 0.5) lowConfReused += 1;
      }
    }
    const top = points.slice(0, 8).map((p: any, i: number) =>
      `${i + 1}. #${p.id} ${p.domain}/${p.experience_type} 置信度=${p.confidence} 复用=${p.times_reused}次`,
    );
    return ctx.toToolResponse(
      `经验置信度×复用散点(共${points.length}点, 最大复用${maxReuses}次):\n` +
      `复用分布: ${Object.entries(buckets).map(([k, v]: any) => `${k}=${v}`).join(', ')}\n` +
      `高置信(≥0.7)且被复用: ${highConfReused} / 低置信(<0.5)且被复用: ${lowConfReused}\n` +
      `复用最多(top8):\n${top.join('\n') || '无'}`,
      result,
    );
  },

  'get_experiences_reuse_trend': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getExperiencesReuseTrend(days);
    const data = result?.data || result || {};
    const trend = Array.isArray(data?.trend) ? data.trend : [];
    const totalReused = data?.total_reused ?? 0;
    const totalReuseCount = data?.total_reuse_count ?? 0;
    const decayedCount = data?.decayed_count ?? 0;
    const totalExp = data?.total_experiences ?? 0;
    const recent = trend.slice(-10);
    const lines = recent.map((b: any) => {
      const dt = b.date || '';
      const r = b.reused ?? 0;
      const rc = b.reuse_count ?? 0;
      const ac = b.avg_confidence ?? 0;
      const dc = b.decayed ?? 0;
      return `  ${dt}: 复用经验=${r} 累计复用次数=${rc} 平均置信度=${ac} 已衰减=${dc}`;
    });
    return ctx.toToolResponse(
      `经验复用+衰减趋势(近${days}天, 共${totalExp}条经验):\n` +
      `被复用经验=${totalReused} 累计复用次数=${totalReuseCount} 已衰减(置信度<0.5)=${decayedCount}\n` +
      `近${recent.length}日明细:\n${lines.join('\n') || '  无'}`,
      result,
    );
  },

  'get_experiences_confidence_decay_forecast': async (args, ctx) => {
    const days = Math.max(7, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await ctx.apiClient.getExperiencesConfidenceDecayForecast(days);
    const data = result?.data || result || {};
    const trend: any[] = data.trend || [];
    const forecast: any[] = data.forecast || [];
    const slope = data.slope ?? 0;
    const rSq = data.r_squared ?? 0;
    const daysToDecay = data.days_to_decay;
    const fLines = forecast.map((f: any) => `  ${f.date}: 预测=${f.predicted_confidence}`);
    const decayMsg = daysToDecay != null ? `约${daysToDecay}天后跌破0.5衰减线` : '暂无衰减风险';
    return ctx.toToolResponse(
      `经验置信度衰减预测(近${days}天, 斜率=${slope}, R²=${rSq}):\n` +
      `历史${trend.length}天 → 预测7天:\n${fLines.join('\n') || '  无预测'}\n` +
      decayMsg,
      result,
    );
  },

  'get_experiences_decay_by_domain': async (args, ctx) => {
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getExperiencesDecayByDomain(limit);
    const data = result?.data || result || {};
    const domains: any[] = data.domains || [];
    const totalActive = data.total_active ?? 0;
    const totalDecayed = data.total_decayed ?? 0;
    const lines = domains.map((d: any) =>
      `- ${d.domain}: 总${d.total} 活跃=${d.active} 衰减=${d.decayed} 平均置信度=${d.avg_confidence} 复用=${d.reuses}`,
    );
    return ctx.toToolResponse(
      `经验按域衰减对比(共${domains.length}域, 活跃=${totalActive} 衰减=${totalDecayed}):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_experiences_decay_by_task_type': async (args, ctx) => {
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 15) || 15));
    const result = await ctx.apiClient.getExperiencesDecayByTaskType(limit);
    const data = result?.data || result || {};
    const taskTypes: any[] = data.task_types || [];
    const totalActive = data.total_active ?? 0;
    const totalDecayed = data.total_decayed ?? 0;
    const lines = taskTypes.map((t: any) =>
      `- ${t.task_type}: 总${t.total} 活跃=${t.active} 衰减=${t.decayed} 平均置信度=${t.avg_confidence} 复用=${t.reuses}`,
    );
    return ctx.toToolResponse(
      `经验按任务类型衰减对比(共${taskTypes.length}类型, 活跃=${totalActive} 衰减=${totalDecayed}):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_experiences_confidence_distribution': async (args, ctx) => {
    const result = await ctx.apiClient.getExperiencesConfidenceDistribution();
    const data = result?.data || result || {};
    const bins: any[] = data.bins || [];
    const total = data.total ?? 0;
    const lines = bins.map((b: any) =>
      `${b.label}: ${b.count}条(${b.percentage}%) 均复用=${b.avg_reuses}`,
    );
    return ctx.toToolResponse(
      `经验置信度分布(共${total}条):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_experiences_source_distribution': async (args, ctx) => {
    const result = await ctx.apiClient.getExperiencesSourceDistribution();
    const data = result?.data || result || {};
    const sources: any[] = data.sources || [];
    const total = data.total ?? 0;
    const lines = sources.map((s: any) =>
      `${s.source}: ${s.count}条(${s.percentage}%) 均置信度=${s.avg_confidence} 均复用=${s.avg_reuses}`,
    );
    return ctx.toToolResponse(
      `经验来源分布(共${total}条):\n${lines.join('\n') || '无数据'}`,
      result,
    );
  },

  'get_experiences_propagation_chain': async (args, ctx) => {
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await ctx.apiClient.getExperiencesPropagationChain(limit);
    const data = result?.data || result || {};
    const chains: any[] = data.chains || [];
    const totalShared = data.total_shared ?? 0;
    const totalPropagated = data.total_propagated ?? 0;
    const lines = chains.map((c: any) => {
      const topDomains = (c.top_domains || []).slice(0, 3).join('/');
      const topExp = (c.top_experiences || []).slice(0, 3)
        .map((e: any) => `${e.domain || '?'}(复用${e.times_reused})`)
        .join(', ');
      return `- ${c.source_agent_name}: 共享${c.shared_count}条 被复用${c.total_reuses}次 [${topDomains}] top: ${topExp}`;
    });
    return ctx.toToolResponse(
      `经验共享传播链(共${totalShared}条共享 ${totalPropagated}次传播):\n${lines.join('\n') || '无共享经验'}`,
      result,
    );
  },

  'get_knowledge_propagation_network': async (args, ctx) => {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 90) || 90));
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await ctx.apiClient.getKnowledgePropagationNetwork(days, limit);
    const data = result?.data || result || {};
    const nodes: any[] = data.nodes || [];
    const lines = nodes.map((n: any) =>
      `- ${n.agent_name}: 分享${n.shared_experiences}条 被复用${n.total_reuses}次 域[${(n.domains || []).join(',')}]`
    );
    return ctx.toToolResponse(
      `知识传播网络(近${data.days ?? days}天, 共${data.total_shared_experiences ?? 0}条分享 累计复用${data.total_reuses ?? 0}):\n${lines.join('\n') || '无传播数据'}`,
      result,
    );
  },
};
