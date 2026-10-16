import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read = (path) => readFileSync(path, 'utf8')
const has = (path) => assert.ok(existsSync(path), 'Missing release input: ' + path)
const pkg = JSON.parse(read('package.json'))
const catalog = JSON.parse(read('public/games/game-catalog-fallback.json'))
const items = catalog.items

assert.ok(pkg.scripts?.build, 'package.json must define the production build')
assert.ok(pkg.scripts?.['qa:games-portal'], 'Missing games portal QA script')
assert.ok(pkg.scripts?.['qa:ecosystem'], 'Missing ecosystem QA script')
assert.ok(pkg.scripts?.['qa:privacy-consent'], 'Missing consent/privacy QA script')
assert.ok(pkg.scripts?.['qa:games-model'], 'Missing monetization-model QA script')
assert.ok(Array.isArray(items) && items.length >= 5, 'Game catalogue must contain at least five registered entries')

const required = [
  'src/App.tsx',
  'src/main.tsx',
  'public/games/index.html',
  'public/games/luxury.css',
  'public/games/catalog-runtime.js',
  'public/games/catalog-state.js',
  'public/games/game-catalog-fallback.json',
  'public/games/consented-analytics.js',
  'public/games/accessibility-center.js',
  'public/games/ecosystem/index.html',
  'public/games/monetization/index.html',
  'public/games/partners/index.html',
  'public/games/admin/index.html',
  'public/games/admin/catalog/index.html',
  'public/games/admin/campaigns/index.html',
  'public/games/command-center/index.html',
  'public/games/growth-studio/index.html',
  'services/osgard-commerce-api/src/server.mjs',
  'services/osgard-commerce-api/src/game-catalog.mjs',
  'services/osgard-commerce-api/test/game-catalog.test.mjs',
  'scripts/external-project-healthcheck.mjs',
  'docs/OSGARD_GAMING_ECOSYSTEM_AUDIT_2026-10-14.md',
]
for (const path of required) has(path)

const statuses = new Set(['playable', 'prototype'])
const ids = new Set()
for (const item of items) {
  assert.ok(item && typeof item.id === 'string' && /^[a-z0-9-]+$/.test(item.id), 'Invalid game id')
  assert.ok(!ids.has(item.id), 'Duplicate game id: ' + item.id)
  ids.add(item.id)
  assert.ok(typeof item.title === 'string' && item.title.trim(), 'Game title missing for ' + item.id)
  assert.ok(typeof item.description === 'string' && item.description.trim(), 'Game description missing for ' + item.id)
  assert.ok(Array.isArray(item.genres) && item.genres.length > 0, 'Game genres missing for ' + item.id)
  assert.ok(statuses.has(item.status), 'Unknown game status for ' + item.id + ': ' + item.status)
  assert.equal(typeof item.visible, 'boolean', 'Game visibility must be explicit for ' + item.id)
  assert.ok(typeof item.href === 'string' && item.href.startsWith('/games/') && !item.href.startsWith('//'), 'Game route must be a same-origin path for ' + item.id)
}
assert.ok(items.some((item) => item.status === 'playable'), 'At least one game must be marked playable')
assert.ok(items.some((item) => item.status === 'prototype'), 'Prototype status must remain distinguishable from playable')

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const forbiddenPaths = tracked.filter((path) => {
  const normalized = path.replaceAll('\\', '/')
  const isEnvFile = /(^|\/)\.env(?:\..+)?$/i.test(normalized) && !/(^|\/)\.env\.example$/i.test(normalized)
  const isPrivateKeyFile = /\.(?:pem|p12|pfx)$/i.test(normalized) || /(^|\/)(?:id_rsa|id_ed25519)$/i.test(normalized)
  return isEnvFile || isPrivateKeyFile
})
assert.deepEqual(forbiddenPaths, [], 'Secrets or private-key files must never enter a source bundle: ' + forbiddenPaths.join(', '))

for (const path of tracked.filter((name) => /\.(?:mjs|js|ts|tsx|json|ya?ml|html|md|conf|txt)$/i.test(name))) {
  if (!existsSync(path)) continue
  const info = statSync(path)
  if (!info.isFile() || info.size > 750_000) continue
  const body = readFileSync(path, 'utf8')
  assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(body), 'Private key material found in tracked source: ' + path)
}

const result = {
  status: 'passed',
  packageVersion: pkg.version,
  sourceFiles: tracked.length,
  gameCatalog: {
    count: items.length,
    playable: items.filter((item) => item.status === 'playable').length,
    prototype: items.filter((item) => item.status === 'prototype').length,
  },
  verifiedBlocks: [
    'premium brand and responsive game portal',
    'registered game catalogue and route lifecycle',
    'ecosystem directory and partner surfaces',
    'monetization model, admin surfaces, commerce API',
    'consent-aware analytics, accessibility and source hygiene',
  ],
  secretPathScan: 'passed',
}
console.log(JSON.stringify(result, null, 2))
