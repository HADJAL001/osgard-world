import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/games/admin/index.html', 'utf8');
const core = readFileSync('public/games/admin/analytics-core.js', 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(inline.length, 1, 'LiveOps page should have a single application script');
assert.doesNotThrow(() => new Function(inline[0]), 'dashboard application script must parse');
assert.ok(html.includes('<script src="/games/admin/analytics-core.js?v=20261015-2"></script>'), 'first-party analytics core must load before the dashboard');
for (const id of [
  'operator-token', 'from-date', 'to-date', 'refresh', 'compare-period', 'auto-refresh',
  'data-freshness', 'freshness-label', 'metrics', 'cohorts-data', 'snapshots-data',
  'summary-data', 'decision-brief', 'export', 'export-csv', 'export-brief', 'disconnect',
]) assert.ok(html.includes('id="' + id + '"'), 'Missing dashboard control: ' + id);
for (const period of ['24h', '7d', '30d', '90d']) {
  assert.ok(html.includes('data-period="' + period + '"'), 'Missing analytics period preset: ' + period);
}
assert.ok(html.includes('type="checkbox" checked> Сравнить с таким же предыдущим периодом'), 'Period comparison should be enabled by default');
assert.ok(html.includes('type="checkbox"> Автообновление раз в 60 секунд'), 'Auto-refresh must be opt-in');
for (const contract of [
  "credentials:'same-origin'", "redirect:'error'", "new AbortController()",
  "Promise.allSettled", "15 секунд", "Последний успешный снимок сохранён на экране",
  "document.visibilityState==='visible'", "setInterval", "selectedPreset",
  "X-Moderation-Token",
]) {
  assert.ok(inline[0].includes(contract), 'Missing resilience/privacy contract: ' + contract);
}
assert.ok(!/localStorage|sessionStorage|document\.cookie|sendBeacon\(/i.test(inline[0]), 'Operator token and reports must not be persisted or auto-transmitted');
assert.ok(!/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html), 'No third-party scripts allowed in protected dashboard');
assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'), 'Private operations page must be excluded from indexing');
assert.ok(!/method:\s*['"]POST['"]|method:\s*['"]DELETE['"]/i.test(inline[0]), 'Analytics dashboard must remain read-only');

const sandbox = { console, Intl, Date, Number, Set, Map, Object, Math, TypeError, RangeError };
runInNewContext(core, sandbox, { filename: 'analytics-core.js', timeout: 1000 });
assert.equal(typeof sandbox.OSGARDLiveOpsMetrics?.compareMetrics, 'function');
assert.equal(typeof sandbox.OSGARDLiveOpsMetrics?.buildDecisionBrief, 'function', 'decision brief core must be loaded');
assert.ok(inline[0].includes("$('#export-brief').addEventListener('click'"), 'decision brief export control must be wired');
assert.ok(inline[0].includes("const payload=JSON.stringify(lastDecisionBrief,null,2)+'\\n';"), 'decision brief download must be valid newline-terminated JSON');
assert.equal(sandbox.OSGARDLiveOpsMetrics.validateRange({ from: Date.now() - 1000, to: Date.now() }).ok, true);
console.log('PASS LiveOps dashboard: protected read-only contract, period controls, freshness, timeout/cancellation, opt-in auto-refresh and first-party analytics core.');
