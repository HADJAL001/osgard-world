/**
 * Local performance telemetry and repeatable simulation benchmark.
 * No metrics are sent over the network; the caller may export them locally.
 */
import { SCENARIOS, SIMULATION_SPEED, makeInitialState, startMission, tick, previewIntervention } from './simulation.js';

export function percentile(values, quantile = 0.95) {
  const clean = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const q = Math.max(0, Math.min(1, Number.isFinite(quantile) ? quantile : 0.95));
  return clean[Math.max(0, Math.min(clean.length - 1, Math.ceil(q * clean.length) - 1))];
}

export function summarizeFrameSamples(samples, frameBudgetMs = 16.7) {
  const clean = samples
    .map((sample) => typeof sample === 'number' ? sample : sample?.ms)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!clean.length) {
    return { sampleCount: 0, fps: 0, meanMs: 0, medianMs: 0, p95Ms: 0, maxMs: 0, longFrames: 0, overBudgetPct: 0, health: 'no-data' };
  }
  const meanMs = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const p95Ms = percentile(clean, 0.95);
  const maxMs = Math.max(...clean);
  const safeBudget = Number.isFinite(frameBudgetMs) && frameBudgetMs > 0 ? frameBudgetMs : 16.7;
  const overBudget = clean.filter((value) => value > safeBudget).length;
  const longFrames = clean.filter((value) => value > 33.3).length;
  const overBudgetPct = overBudget / clean.length * 100;
  const health = p95Ms <= safeBudget * 1.15 && 1000 / meanMs >= 50
    ? 'stable'
    : p95Ms <= safeBudget * 1.75 ? 'strained' : 'degraded';
  return {
    sampleCount: clean.length,
    fps: 1000 / meanMs,
    meanMs,
    medianMs: percentile(clean, 0.5),
    p95Ms,
    maxMs,
    longFrames,
    overBudgetPct,
    health,
  };
}

function pickMetrics(state) {
  return {
    phase: state.phase,
    elapsed: Number(state.elapsed.toFixed(3)),
    water: Number(state.water.toFixed(3)),
    grid: Number(state.grid.toFixed(3)),
    access: Number(state.access.toFixed(3)),
    congestion: Number(state.congestion.toFixed(3)),
    integrity: Number(state.integrity.toFixed(3)),
    rescued: Number(state.rescued.toFixed(3)),
    budget: state.repairCharges,
    events: state.events.length,
    interventions: state.interventions.length,
  };
}

function metricsAreBounded(state) {
  return ['water', 'grid', 'access', 'congestion', 'integrity'].every((key) => Number.isFinite(state[key]) && state[key] >= 0 && state[key] <= 100)
    && Number.isFinite(state.rescued) && state.rescued >= 0 && state.rescued <= state.population
    && Number.isFinite(state.elapsed) && state.elapsed >= 0;
}

/**
 * Runs isolated test missions. It never accepts or mutates the active live state.
 * Throughput is simulation ticks per wall-clock second, not rendering FPS.
 */
export function runSimulationBenchmark({ stepsPerScenario = 450, stepSeconds = 0.12 } = {}) {
  const rawSteps = Number(stepsPerScenario);
  const steps = Math.max(1, Math.min(20000, Math.trunc(Number.isFinite(rawSteps) ? rawSteps : 450)));
  const dt = Math.max(0.01, Math.min(0.25, Number.isFinite(stepSeconds) ? stepSeconds : 0.12));
  const suiteStarted = performance.now();
  const scenarios = Object.keys(SCENARIOS);
  const results = [];
  let checksPassed = 0;
  let checksTotal = 0;

  for (const scenarioId of scenarios) {
    const state = makeInitialState(scenarioId);
    startMission(state);
    const beforeForecast = pickMetrics(state);
    const forecast = previewIntervention(state, 'power', { type: 'hospital', id: 'H-01' }, 6);
    const afterForecast = pickMetrics(state);
    const forecastReadOnly = JSON.stringify(beforeForecast) === JSON.stringify(afterForecast);
    let bounded = metricsAreBounded(state);
    let completedTicks = 0;
    const started = performance.now();
    for (let index = 0; index < steps && state.phase === 'running'; index += 1) {
      tick(state, dt);
      completedTicks += 1;
      if (!metricsAreBounded(state)) bounded = false;
    }
    const elapsedMs = Math.max(0.001, performance.now() - started);
    const finalMetrics = pickMetrics(state);
    const checks = [forecastReadOnly, bounded && Number.isFinite(finalMetrics.elapsed)];
    checksTotal += checks.length;
    checksPassed += checks.filter(Boolean).length;
    results.push({
      scenario: scenarioId,
      requestedSteps: steps,
      completedTicks,
      stepSeconds: dt,
      simulatedSeconds: Number((completedTicks * dt * SIMULATION_SPEED).toFixed(2)),
      wallTimeMs: Number(elapsedMs.toFixed(3)),
      ticksPerSecond: Number((completedTicks / (elapsedMs / 1000)).toFixed(1)),
      forecastAvailable: Boolean(forecast.ok),
      forecastReadOnly,
      metricsBounded: bounded,
      checksPassed: checks.filter(Boolean).length,
      checksTotal: checks.length,
      final: finalMetrics,
    });
  }

  return {
    suite: 'CIVIC CASCADE / ISOLATED SIMULATION BENCHMARK',
    version: '1.6.0',
    scenarios: results,
    checksPassed,
    checksTotal,
    passed: checksPassed === checksTotal,
    totalWallTimeMs: Number((performance.now() - suiteStarted).toFixed(3)),
    note: 'Ticks per second measure simulation throughput on this browser/device; they are not rendering FPS.',
  };
}

export function createRuntimeReport({ frameSamples = [], state = null, visualSettings = {}, mapCamera = null, benchmark = null, now = new Date() } = {}) {
  const summary = summarizeFrameSamples(frameSamples);
  const memory = performance.memory && Number.isFinite(performance.memory.usedJSHeapSize)
    ? { supported: true, usedBytes: performance.memory.usedJSHeapSize, limitBytes: performance.memory.jsHeapSizeLimit }
    : { supported: false };
  return {
    reportType: 'civic-cascade-browser-runtime-diagnostics',
    appVersion: '1.6.0',
    exportedAt: now.toISOString(),
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown',
      coarsePointer: typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)').matches : false,
      visibility: typeof document !== 'undefined' && document.hidden ? 'background' : 'visible',
      viewport: { width: typeof window !== 'undefined' ? window.innerWidth : 0, height: typeof window !== 'undefined' ? window.innerHeight : 0, dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1 },
      canvas: { width: typeof document !== 'undefined' ? document.querySelector('#cityCanvas')?.width ?? 0 : 0, height: typeof document !== 'undefined' ? document.querySelector('#cityCanvas')?.height ?? 0 : 0 },
      memory,
    },
    rendering: summary,
    visualSettings: { ...visualSettings },
    mapCamera: mapCamera ? { zoom: Number(mapCamera.zoom) || 1, x: Number(mapCamera.x) || 0, y: Number(mapCamera.y) || 0, panMode: Boolean(mapCamera.panMode) } : null,
    simulation: state ? pickMetrics(state) : null,
    benchmark: benchmark ? structuredClone(benchmark) : null,
    privacy: 'This report is generated locally and is not uploaded by the game.',
  };
}