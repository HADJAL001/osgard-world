(function (root) {
  'use strict';
  const severity = (state) => state === 'fail' ? 3 : state === 'warn' ? 2 : state === 'pass' ? 1 : 0;
  function median(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a,b)=>a-b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  function percentile(values, ratio) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a,b)=>a-b);
    return sorted[Math.max(0, Math.ceil(ratio * sorted.length) - 1)];
  }
  function summarize(results) {
    const counts = { pass:0, warn:0, fail:0, cancelled:0 };
    const samples = [];
    for (const result of results || []) {
      if (Object.prototype.hasOwnProperty.call(counts, result.state)) counts[result.state] += 1;
      if (result.state !== 'cancelled' && Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0) samples.push(result.elapsedMs);
    }
    return {
      sampleCount:samples.length,
      counts:{ passed:counts.pass, warnings:counts.warn, failed:counts.fail, cancelled:counts.cancelled },
      medianMs:median(samples),
      p95Ms:percentile(samples,0.95),
      maxMs:samples.length ? Math.max.apply(null,samples) : null,
      averageMs:samples.length ? Math.round(samples.reduce((sum,value)=>sum+value,0)/samples.length) : null,
      slowOver2500Ms:samples.filter((value)=>value>2500).length,
    };
  }
  function compare(previous, currentResults) {
    if (!previous || !Array.isArray(previous.results) || !previous.results.length) return null;
    const oldMap = new Map(previous.results.map((item)=>[item.id,item]));
    const common = (currentResults || []).filter((item)=>oldMap.has(item.id)&&item.state!=='cancelled'&&oldMap.get(item.id).state!=='cancelled');
    if (!common.length) return null;
    let regressions = 0;
    let recoveries = 0;
    let latencyDelta = 0;
    let latencySamples = 0;
    const changes = [];
    for (const item of common) {
      const old = oldMap.get(item.id);
      if (severity(item.state) > severity(old.state)) regressions += 1;
      if (severity(item.state) < severity(old.state)) recoveries += 1;
      const latencyDeltaMs = item.elapsedMs - old.elapsedMs;
      if (Number.isFinite(item.elapsedMs) && Number.isFinite(old.elapsedMs)) {
        latencyDelta += latencyDeltaMs;
        latencySamples += 1;
      }
      if (item.state !== old.state || Math.abs(latencyDeltaMs) >= 500) {
        changes.push({ id:item.id, from:old.state, to:item.state, latencyDeltaMs });
      }
    }
    return {
      baselineFinishedAt:previous.finishedAt || null,
      comparedRoutes:common.length,
      regressions,
      recoveries,
      averageLatencyDeltaMs:latencySamples ? Math.round(latencyDelta/latencySamples) : null,
      changes,
    };
  }
  function normalizeBaseline(report, targets) {
    if (!report || typeof report !== 'object' ||
        ![1, 2].includes(report.schemaVersion) ||
        report.reportType !== 'osgard-games-readonly-route-health' ||
        !Array.isArray(report.results) ||
        report.results.length < 1 ||
        report.results.length > (targets || []).length ||
        typeof report.finishedAt !== 'string' ||
        !Number.isFinite(Date.parse(report.finishedAt))) {
      throw new Error('Файл не является корректным отчётом OSGARD Operations Pulse.');
    }
    const byId = new Map((targets || []).map((target)=>[target.id,target]));
    const seen = new Set();
    const normalized = report.results.map((item) => {
      const target = item && byId.get(item.id);
      if (!target || seen.has(item.id) || item.path !== target.path) {
        throw new Error('Отчёт содержит неизвестный, повторный или несовпадающий маршрут.');
      }
      if (!['pass','warn','fail','cancelled'].includes(item.state) ||
          !Number.isFinite(item.elapsedMs) || item.elapsedMs < 0 || item.elapsedMs > 300000 ||
          !(item.status === null || (Number.isInteger(item.status) && item.status >= 100 && item.status <= 599))) {
        throw new Error('Отчёт содержит некорректное состояние, HTTP-код или задержку.');
      }
      seen.add(item.id);
      return {
        id:target.id,
        label:target.label,
        path:target.path,
        group:target.group,
        state:item.state,
        status:item.status,
        elapsedMs:item.elapsedMs,
        contentType:'',
        detail:'',
        checkedAt:typeof item.checkedAt === 'string' && Number.isFinite(Date.parse(item.checkedAt)) ? new Date(item.checkedAt).toISOString() : '',
      };
    });
    return {
      schemaVersion:report.schemaVersion,
      reportType:'osgard-games-readonly-route-health',
      finishedAt:new Date(report.finishedAt).toISOString(),
      results:normalized,
    };
  }
  root.OSGARDOperationsMetrics = Object.freeze({ severity, median, percentile, summarize, compare, normalizeBaseline });
})(window);
