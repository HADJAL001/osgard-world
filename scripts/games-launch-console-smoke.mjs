import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync('public/games/command-center/index.html', 'utf8')
const operations = readFileSync('public/games/operations/index.html', 'utf8')
const routeMatrix = readFileSync('scripts/production-route-matrix.mjs', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

assert.ok(html.includes('<meta name="robots" content="noindex,nofollow,noarchive">'), 'Command deck must not be indexed')
assert.ok(html.includes('OSGARD PLAY — Command Deck') && html.toLowerCase().includes('read-only'), 'The command deck must be identified as a read-only tool')
assert.ok(html.includes("credentials: 'omit'") && html.includes("cache: 'no-store'") && html.includes("method: 'GET'"), 'Public checks must use no-credentials, no-cache GET requests')
assert.ok(html.includes('AbortSignal.timeout(6500)'), 'Every route probe must have a bounded timeout')
assert.ok(html.includes("const latestReport = null") || html.includes('let latestReport = null'), 'Report state must stay in memory until explicitly downloaded')
assert.ok(html.includes("new Blob([JSON.stringify(latestReport, null, 2)"), 'JSON report must be generated locally')
assert.ok(!html.includes('sendBeacon(') && !html.includes('localStorage') && !html.includes('sessionStorage'), 'The diagnostic page must not persist or transmit visitor data')
assert.ok(!html.includes('fonts.googleapis.com') && !html.includes('googletagmanager.com') && !html.includes('doubleclick.net'), 'The tool must not silently load third-party analytics or ads')
assert.ok(html.includes('/commerce-api/healthz') && html.includes('databaseReady !== true'), 'API success must not be confused with database readiness')
assert.ok(html.includes('livePayments:') && html.includes('premiumEntitlements:') && html.includes('advertising:'), 'The report must distinguish route checks from live commercial integrations')
assert.ok(html.includes('/games/commerce-admin/') && html.includes('/games/growth-studio/') && html.includes('/games/partners/') && html.includes('/games/ecosystem/'), 'The console must link to existing owner workflows')
assert.ok(html.includes('https://wa.me/79640027222') && html.includes('mailto:osman.osmanov0099@gmail.com'), 'Owner contact routes must remain correct')
assert.ok(operations.includes("path:'/games/command-center/'"), 'Deployment operations must include the command deck route')
assert.ok(operations.includes('href="/games/command-center/"'), 'Operations navigation must expose the command deck shortcut')
assert.ok(routeMatrix.includes("'/games/command-center/'"), 'Production route matrix must exercise the command deck')
assert.ok(routeMatrix.includes("route === '/games/command-center/'") &&
  routeMatrix.includes("reportType: 'osgard-play-command-deck'") &&
  routeMatrix.includes("databaseReady !== true"),
  'Production route matrix must inspect the Command Deck page contract instead of the generic demo fallback')
assert.ok(packageJson.scripts['qa:games-operations']?.includes('games-launch-console-smoke.mjs'), 'The established operations test must run the new command-deck contract')

console.log('PASS OSGARD PLAY command deck: noindex, privacy-safe status checks, readiness boundaries, owner workflow links and deployment route coverage.')
