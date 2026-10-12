import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const project = resolve(root, 'godot/null-shift');
const outputDir = resolve(root, process.env.OSGARD_GODOT_OUTPUT_DIR || 'dist/games/null-shift-godot');
const outputHtml = resolve(outputDir, 'index.html');
const fallbackHtml = resolve(root, 'public/games/null-shift-godot/index.html');
const requireExport = process.env.OSGARD_REQUIRE_GODOT_EXPORT === '1';

function probe(executable, args, timeout = 12000) {
  const result = spawnSync(executable, args, { encoding: 'utf8', timeout, windowsHide: true });
  if (result.error || result.status !== 0) return null;
  return { stdout: result.stdout || '', stderr: result.stderr || '', status: result.status };
}
function fail(message, details = '') {
  console.error('[godot-web-export] ERROR: ' + message);
  if (details) console.error(details);
  process.exit(1);
}

if (!existsSync(project) || !existsSync(resolve(project, 'project.godot')) || !existsSync(resolve(project, 'export_presets.cfg'))) {
  fail('The tracked Godot project or Web export preset is missing.');
}

const candidates = [...new Set([process.env.GODOT_BIN, 'godot', 'godot4', 'godot.exe'].filter(Boolean))];
let engine = null;
let version = '';
for (const candidate of candidates) {
  const result = probe(candidate, ['--version']);
  if (result) {
    engine = candidate;
    version = (result.stdout || result.stderr).trim();
    break;
  }
}

if (!engine) {
  if (requireExport) fail('Godot executable not found. Install Godot 4.7+ or set GODOT_BIN to its executable path.');
  if (!existsSync(fallbackHtml)) fail('Godot is not installed and the tracked fallback route is missing: ' + fallbackHtml);
  const fallback = readFileSync(fallbackHtml, 'utf8');
  if (!fallback.includes('data-godot-fallback="webgl"') || !fallback.includes('href="/games/null-shift/"')) {
    fail('Godot is not installed and the tracked route does not contain the honest WebGL fallback.');
  }
  console.warn('[godot-web-export] Godot executable not found; keeping the tracked WebGL fallback. This is not a Godot export. Set GODOT_BIN or OSGARD_REQUIRE_GODOT_EXPORT=1 for a strict native release.');
  process.exit(0);
}

if (!/^4\./.test(version)) fail('Expected Godot 4.x, received: ' + (version || 'unknown version'));
console.log('[godot-web-export] Using ' + engine + ' (' + version + ')');
mkdirSync(outputDir, { recursive: true });

const importResult = spawnSync(engine, ['--headless', '--editor', '--path', project, '--quit'], {
  cwd: root, stdio: 'inherit', timeout: 240000, windowsHide: true,
});
if (importResult.error || importResult.status !== 0) {
  fail('Godot asset import failed. Check the engine version and project import logs.', String(importResult.error || importResult.status));
}

const exportResult = spawnSync(engine, ['--headless', '--path', project, '--export-release', 'Web', outputHtml], {
  cwd: root, stdio: 'inherit', timeout: 600000, windowsHide: true,
});
if (exportResult.error || exportResult.status !== 0) {
  fail('Godot Web export failed. Make sure the Web export templates for this exact Godot version are installed.', String(exportResult.error || exportResult.status));
}

const expected = [
  ['index.html', 1000],
  ['index.js', 100000],
  ['index.wasm', 100000],
  ['index.pck', 10000],
];
for (const [name, minimum] of expected) {
  const path = resolve(outputDir, name);
  if (!existsSync(path) || statSync(path).size <= minimum) fail('Godot export asset missing or too small: ' + name);
}
const html = readFileSync(outputHtml, 'utf8');
if (!html.includes('data-nullshift-shell="premium-v1"') || !html.includes('Engine.isWebGLAvailable(2)') || !html.includes('onProgress:')) {
  fail('Export output did not include the premium custom HTML shell.');
}
const smoke = spawnSync(process.execPath, ['scripts/null-shift-godot-smoke.mjs', '--export-check', outputDir], {
  cwd: root, stdio: 'inherit', timeout: 120000, windowsHide: true,
});
if (smoke.error || smoke.status !== 0) fail('Exported Godot build did not pass the export smoke test.', String(smoke.error || smoke.status));
console.log('[godot-web-export] PASS — real Web export generated and validated in ' + outputDir);
