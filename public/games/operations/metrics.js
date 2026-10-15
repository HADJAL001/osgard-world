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
  root.OSGARDOperationsMetrics = Object.freeze({ severity, median, percentile, summarize, compare });
})(window);
