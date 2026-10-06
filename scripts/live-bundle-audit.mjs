import { readFile } from 'node:fs/promises'

const base = (process.env.OSGARD_BASE_URL || 'https://osgard.world').replace(/\/$/, '')
const auditPath = process.env.OSGARD_BRIEF_AUDIT || 'docs/BRIEF_COVERAGE_AUDIT.md'
const html = await (await fetch(`${base}/?bundle-audit=${Date.now()}`, { signal: AbortSignal.timeout(8000) })).text()
const live = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
const audit = await readFile(auditPath, 'utf8')
const documented = audit.match(/live frontend bundle is `([^`]+)`/)?.[1]
if (!live) throw new Error('production HTML does not expose an index bundle')
if (!documented) throw new Error('brief audit has no live bundle marker')
const report = { base, liveBundle: live, documentedBundle: documented, status: live === documented ? 'ready' : 'mismatch' }
console.log(JSON.stringify(report))
if (report.status !== 'ready') process.exitCode = 1
