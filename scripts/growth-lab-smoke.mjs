import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const path = resolve('public/games/growth-lab/index.html')
assert.ok(existsSync(path), 'Growth Lab page must exist')
const html = readFileSync(path, 'utf8')
for (const token of [
  'Сценарная модель дохода', 'data-preset="conservative"', 'data-preset="base"',
  'data-preset="optimistic"', 'id="visits"', 'id="launchRate"', 'id="fillRate"',
  'id="ecpm"', 'id="subscriptionRate"', 'id="purchaseRate"', 'id="leadRate"',
  'id="projectMargin"', 'id="operatingCosts"', 'id="netOut"', 'id="exportCsv"',
  'id="copySummary"', 'osgard-growth-scenario.csv', 'не фактическая выручка',
  'не чистая прибыль', 'не отправляются', 'prefers-reduced-motion:reduce',
  'max-width:360px', 'osman.osmanov0099@gmail.com', 'https://wa.me/79640027222',
  '/games/', 'robots" content="noindex,follow"'
]) assert.ok(html.includes(token), 'Growth Lab contract missing: ' + token)

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
assert.equal(scripts.length, 1, 'Expected one self-contained application script')
new Function(scripts[0])
assert.ok(scripts[0].includes('impressions/1000*x.ecpm'), 'Ad revenue formula missing')
assert.ok(scripts[0].includes('x.visits*x.subscriptionRate/100*x.subscriptionPrice'), 'Subscription formula missing')
assert.ok(scripts[0].includes('x.visits*x.purchaseRate/100*x.averageOrder'), 'Purchase formula missing')
assert.ok(scripts[0].includes('leads*x.closeRate/100'), 'Project closing formula missing')
assert.ok(scripts[0].includes('gross-x.operatingCosts'), 'Operating result formula missing')
assert.ok(!/\bfetch\s*\(|sendBeacon|XMLHttpRequest/i.test(html), 'No network tracking calls may exist')
assert.ok(!/<script[^>]+src=/i.test(html), 'No remote or external scripts may be loaded')
assert.ok(html.includes('navigator.clipboard') && html.includes('new Blob'), 'Local export/share utilities missing')
assert.ok(html.includes('URL.createObjectURL'), 'CSV export must be generated in-browser')
console.log('PASS OSGARD GROWTH LAB: self-contained model, three assumption presets, auditable formulas, local CSV/copy, no external analytics or network calls, privacy notice, mobile layout and reduced-motion support.')
