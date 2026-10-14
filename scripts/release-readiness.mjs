import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import process from 'node:process'

const run = promisify(execFile)
const checks = []
async function check(name, command, args, shell = process.platform === 'win32') {
  const started = process.hrtime.bigint()
  try {
    const result = await run(command, args, {
      cwd: process.cwd(), shell, maxBuffer: 2 * 1024 * 1024, timeout: 180_000
    })
    checks.push({
      name, status: 'passed',
      durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      output: String(result.stdout || '').slice(-1000)
    })
  } catch (error) {
    checks.push({
      name, status: 'failed',
      durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      output: String(error.stdout || error.stderr || error).slice(-1000)
    })
  }
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
await check('typecheck', npm, ['run', 'check'])
await check('games-portal-smoke', npm, ['run', 'qa:games-portal'])
await check('games-diagnostics-smoke', npm, ['run', 'qa:games-diagnostics'])
await check('device-fit-smoke', npm, ['run', 'qa:device-fit'])
await check('osgard-select-growth-smoke', npm, ['run', 'qa:osgard-select'])
await check('null-shift-godot-smoke', npm, ['run', 'qa:null-shift-godot'])
await check('games-detail-smoke', npm, ['run', 'qa:games-detail'])
await check('game-detail-runtime-smoke', npm, ['run', 'qa:game-detail-runtime'])
await check('games-economics-model', npm, ['run', 'qa:games-model'])
await check('partner-page-smoke', npm, ['run', 'qa:partners-page'])
await check('ecosystem-directory-smoke', npm, ['run', 'qa:ecosystem-directory'])
await check('game-operations-smoke', npm, ['run', 'qa:games-operations'])
await check('campaign-manager-smoke', npm, ['run', 'qa:campaign-manager'])
await check('game-recommendations-smoke', npm, ['run', 'qa:game-recommendations'])
await check('player-console-smoke', npm, ['run', 'qa:player-console'])
await check('pwa-smoke', npm, ['run', 'qa:pwa'])
await check('privacy-consent-smoke', npm, ['run', 'qa:privacy-consent'])
await check('core-analytics-consent-smoke', npm, ['run', 'qa:core-analytics-consent'])
await check('consented-analytics-queue-smoke', npm, ['run', 'qa:consented-analytics-queue'])
await check('ecosystem-integrity-smoke', npm, ['run', 'qa:ecosystem'])
await check('remix-growth-smoke', npm, ['run', 'qa:remix-growth'])
await check('games-static-assets-smoke', npm, ['run', 'qa:games-assets'])
await check('cascade-lab-experiment-dossier-smoke', npm, ['run', 'qa:cascade-lab-dossier'])
await check('dependency-audit', npm, ['audit', '--audit-level=high'])
await check('core-state-smoke', npm, ['run', 'qa:core'])
await check('event-queue-smoke', npm, ['run', 'qa:queue'])
await check('api-smoke', npm, ['run', 'qa:api'])
await check('production-api-probe', npm, ['run', 'qa:production-api'])
await check('production-api-probe-smoke', npm, ['run', 'qa:production-api-smoke'])
await check('production-build', npm, ['run', 'build'])
await check('frontend-archive-preflight', npm, ['run', 'preflight:frontend'])
await check('production-route-matrix', npm, ['run', 'qa:production-routes'])
await check('live-bundle-audit', npm, ['run', 'qa:live-bundle'])
const briefPath = process.env.OSGARD_BRIEF_PATH || 'A:\\HADJAL\\Рабочий стол\\игры ОСГАРД.txt'
if (existsSync(briefPath)) await check('brief-source-audit', process.execPath, ['scripts/brief-coverage-audit.mjs', briefPath], false)
else checks.push({ name: 'brief-source-audit', status: 'skipped', durationMs: 0, output: `Source not present at ${briefPath}; repository-only CI continues without external brief file.` })
const passed = checks.filter(item => item.status === 'passed').length
const failed = checks.filter(item => item.status === 'failed').length
const skipped = checks.filter(item => item.status === 'skipped').length
const report = {
  schemaVersion: 2,
  checkedAt: new Date().toISOString(),
  status: failed === 0 ? 'ready' : 'blocked',
  summary: { total: checks.length, passed, failed, skipped, durationMs: Math.round(checks.reduce((sum, item) => sum + (item.durationMs || 0), 0)) },
  checks
}
await writeFile(process.env.OSGARD_RELEASE_REPORT || 'release-readiness.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (report.status !== 'ready') process.exitCode = 1
