import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import process from 'node:process'

const run = promisify(execFile)
const checks = []
async function check(name, command, args, shell = process.platform === 'win32') {
  try { const result = await run(command, args, { cwd: process.cwd(), shell, maxBuffer: 2 * 1024 * 1024 }); checks.push({ name, status: 'passed', output: result.stdout.slice(-1000) }) }
  catch (error) { checks.push({ name, status: 'failed', output: String(error.stdout || error.stderr || error).slice(-1000) }) }
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
await check('typecheck', npm, ['run', 'check'])
await check('core-state-smoke', npm, ['run', 'qa:core'])
await check('event-queue-smoke', npm, ['run', 'qa:queue'])
await check('api-smoke', npm, ['run', 'qa:api'])
await check('production-build', npm, ['run', 'build'])
await check('frontend-archive-preflight', npm, ['run', 'preflight:frontend'])
await check('production-route-matrix', npm, ['run', 'qa:production-routes'])
const briefPath = process.env.OSGARD_BRIEF_PATH || 'A:\\HADJAL\\Рабочий стол\\игры ОСГАРД.txt'
if (existsSync(briefPath)) await check('brief-source-audit', process.execPath, ['scripts/brief-coverage-audit.mjs', briefPath], false)
else checks.push({ name: 'brief-source-audit', status: 'skipped', output: `Source not present at ${briefPath}; repository-only CI continues without external brief file.` })
const report = { checkedAt: new Date().toISOString(), status: checks.every(item => item.status === 'passed' || item.status === 'skipped') ? 'ready' : 'blocked', checks }
await writeFile(process.env.OSGARD_RELEASE_REPORT || 'release-readiness.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (report.status !== 'ready') process.exitCode = 1
