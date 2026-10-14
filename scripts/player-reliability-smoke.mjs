import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/games/player-reliability.js', import.meta.url), 'utf8');
const lifecycle = readFileSync(new URL('../public/games/player-lifecycle.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/games/index.html', import.meta.url), 'utf8');
const sandbox = { window:{}, Set, Object, String, Number, Math, Array, Boolean, Date, JSON };
vm.runInNewContext(source, sandbox);
const api = sandbox.window.OSGARDPlayerReliability;
assert.ok(api, 'safe report builder is exposed for deterministic tests');
const report = api.buildReport({
  gameId:'cascade-lab', launchState:'ready', elapsedMs:1724, lastDocumentLoadMs:916,
  viewportClass:'mobile', browser:{ family:'Chrome', major:145, userAgent:'SHOULD_NOT_BE_INCLUDED' }, online:true,
  capabilities:{ webgl:true, webgl2:true, gamepadApi:false, serviceWorkerAvailable:true, reducedMotion:true },
  observations:Array.from({ length:30 }, (_, index) => ({ elapsedMs:index*1000, state:index%2?'loading':'ready', text:'private text', url:'https://example.com/?token=x' }))
});
assert.equal(report.schema, 'osgard.play-support-report');
assert.equal(report.schemaVersion, 1);
assert.equal(report.gameId, 'cascade-lab');
assert.equal(report.launchState, 'ready');
assert.equal(report.elapsedMs, 1500, 'duration uses 500ms buckets');
assert.equal(report.observations.length, 20, 'observations are capped');
assert.equal(report.observations[0].elapsedMs, 10000, 'only latest twenty observations remain');
assert.ok(!JSON.stringify(report).includes('SHOULD_NOT_BE_INCLUDED'));
assert.ok(!JSON.stringify(report).includes('private text'));
assert.ok(!JSON.stringify(report).includes('https://example.com'));
assert.ok(!('url' in report) && !('referrer' in report) && !('userAgent' in report));
assert.equal(api.buildReport({ gameId:'https://evil.example', launchState:'get-token', elapsedMs:999999 }).gameId, 'unknown');
assert.equal(api.buildReport({ launchState:'get-token' }).launchState, 'unknown');
assert.match(source, /15000/);
assert.match(lifecycle, /35000/);
assert.match(html, /id="player-dialog"/);
assert.match(source, /player-diagnostics-download/);
assert.doesNotMatch(source, /\bfetch\s*\(|sendBeacon\s*\(|XMLHttpRequest/);
assert.match(source, /Blob/);
assert.match(source, /aria-live/);
assert.match(source, /role/);
console.log('PASS player reliability: bounded slow-start hint, allow-listed local report, coarse timings, no automatic transmission.');
