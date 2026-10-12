import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const requiredFiles = [
  'src/GamesPlatform.tsx',
  'src/GameDetailPage.tsx',
  'src/games-platform.css',
  'src/LegalPages.tsx',
  'src/legal.css',
  'src/OsgardLogo.tsx',
  'src/core/manifest.ts',
  'src/core/eventQueue.ts',
  'public/osgard-mark.svg',
  'public/entertainment/index.html',
  'index.html',
  'nginx.conf'
]
for (const path of requiredFiles) assert.ok(existsSync(path), 'Missing OSGARD PLAY file: ' + path)

const platform = read('src/GamesPlatform.tsx')
const css = read('src/games-platform.css')
const legal = read('src/LegalPages.tsx')
const detail = read('src/GameDetailPage.tsx')
const main = read('src/main.tsx')
const manifest = read('src/core/manifest.ts')
const events = read('src/core/eventQueue.ts')
const staticCatalog = read('public/entertainment/index.html')
const html = read('index.html')
const nginx = read('nginx.conf')
const packageJson = JSON.parse(read('package.json'))
const workflow = read('.github/workflows/frontend-check.yml')

for (const id of ['time', 'swarm', 'null-shift', 'inherit', 'remix']) {
  assert.ok(manifest.includes("'" + id + "'"), 'Existing game is missing from manifest: ' + id)
  assert.ok(platform.includes("game.id === '" + id + "'") || platform.includes(id), 'Game metadata is missing: ' + id)
}
for (const feature of [
  "path === '/games'", "path.startsWith('/games/info/')", "path === '/privacy'", "path === '/terms'",
  "GamesPlatform", "GameDetailPage", "LegalPage kind=\"privacy\"", "LegalPage kind=\"terms\""
]) assert.ok(main.includes(feature), 'Missing page route: ' + feature)

for (const feature of [
  'function readFavorites()', 'function readHistory()', 'localStorage.setItem(FAVORITES_KEY',
  "'/games/info/' + game.id",
  'localStorage.setItem(HISTORY_KEY', "value === 'analytics'", 'setAnalyticsConsent',
  'navigator.share', 'navigator.clipboard', "utm_source", "utm_medium", "utm_campaign", "utm_content",
  "url: 'https://osgardbewworld.com'"', "url: 'https://o2system.art'", "url: 'https://senjorio.com'",
  "url: 'https://superday.run'", "url: 'https://marcosa.club'", "url: 'https://myosa.world'", "url: 'https://gold-glamour.online'",
  "url: 'https://gardvpn.is'", "url: 'https://osgardos.com'", "url: 'https://osgardvanguard.studio'",
  'mailto:osman.osmanov0099@gmail.com', 'https://wa.me/79640027222',
  'Подготовить заявку', 'почтовый клиент с подготовленной заявкой', 'Партнёрская сеть пока не подключена',
  'Необязательные продуктовые события выключены'
]) assert.ok(platform.includes(feature), 'Missing game-hub/commercial feature: ' + feature)

assert.ok(platform.includes("useState<AnalyticsConsent>(readConsent)"), 'Analytics choice must default from storage helper')
assert.ok(platform.includes("if (consent !== 'analytics') return"), 'Optional game hub events must be gated by consent')
assert.ok(events.includes('function recordOsgardEvent'), 'Existing first-party event queue should be reused')
assert.ok(platform.includes('function readHistory()') && platform.includes('Number.isFinite(entry.at)'), 'History storage must be sanitized')
assert.ok(platform.includes('OSGARD_GAMES.map((game, index)'), 'The actual manifest should be the game catalogue source')
assert.ok(!/5-star|five stars|\\b[0-9,.]+\\s*(?:million|тыс\\.? игроков|игроков онлайн)/i.test(platform), 'Avoid fabricated ratings or player counts')
assert.ok(platform.includes('Локально') || platform.includes('локально'), 'Explain local-only player preferences')
assert.ok(detail.includes('GAME_DETAILS[gameEntry.id]') && detail.includes('Игра запускается по настроенному веб-маршруту'), 'Dedicated game profile must use manifest metadata and clarify launch routing')
assert.ok(legal.includes('Проектная редакция') && legal.includes('проверить его с юристом'), 'Legal text must be described as a draft')
assert.ok(legal.includes('не подключены рекламная сеть, платёжная форма или подписка'), 'Do not imply live ads or payments')

for (const token of [
  'owg-page', 'prefers-reduced-motion', ':focus-visible', '@media (max-width: 600px)',
  'owg-consent', 'owg-favorite', 'owg-game-grid', 'owg-lead-form'
]) assert.ok(css.includes(token), 'Responsive/accessibility styling missing: ' + token)
assert.ok(html.includes('href="/osgard-mark.svg"') && existsSync('public/osgard-mark.svg'), 'Original SVG brand mark must be wired as favicon')
assert.ok(staticCatalog.includes('href="/games"'), 'Existing archive must link to the new game hub')
assert.ok(nginx.includes('location = /games {') && nginx.includes('location = /games/ {'), 'Nginx must route the SPA hub despite static /games directory')
assert.equal(packageJson.scripts['qa:games'], 'node scripts/games-platform-smoke.mjs', 'Game hub smoke test command is not registered')
assert.ok(workflow.includes('npm run qa:games'), 'Game hub test is not part of frontend CI')

console.log('PASS OSGARD PLAY: 5 existing games, hub/routes, privacy/terms drafts, consent-gated events, safe history, UTM cross-promo, project contacts, responsive/accessibility tokens and static archive link')
