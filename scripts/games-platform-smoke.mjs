import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const failures = []
const checks = []
const check = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition), detail })
  if (!condition) failures.push({ name, detail })
}
const read = async (file) => readFile(path.join(root, file), 'utf8')
let catalog
try {
  catalog = JSON.parse(await read('public/games/catalog.json'))
  check('catalog JSON parses', true)
} catch (error) {
  check('catalog JSON parses', false, String(error))
}
if (catalog) {
  check('schema version is supported', catalog.schemaVersion === 1)
  check('catalog contains five game records', Array.isArray(catalog.games) && catalog.games.length === 5)
  const ids = new Set()
  for (const game of catalog.games || []) {
    check(`unique ID: ${game.id}`, !ids.has(game.id))
    ids.add(game.id)
    check(`${game.id}: required fields`, ['title','summary','genre','launchUrl','controls','buildType','availability'].every((key) => typeof game[key] === 'string' && game[key].trim()))
    check(`${game.id}: same-origin launch route`, game.launchUrl.startsWith('/') && !game.launchUrl.startsWith('//') && !/^[a-z]+:/i.test(game.launchUrl))
    const sourcePath = game.launchUrl === '/games/time'
      ? 'src/main.tsx'
      : `public${game.launchUrl}`
    check(`${game.id}: tracked entry point`, existsSync(path.join(root, sourcePath)), sourcePath)
    check(`${game.id}: no unsupported popularity fields`, !('players' in game) && !('rating' in game) && !('reviewCount' in game))
  }
  check('cross-promo list has ten projects', Array.isArray(catalog.ecosystem) && catalog.ecosystem.length === 10)
  for (const project of catalog.ecosystem || []) {
    check(`${project.id}: external URL is HTTPS`, project.url.startsWith('https://'))
  }
}
const html = await read('public/games/index.html')
const hubJs = await read('public/games/hub.js')
const hubCss = await read('public/games/hub.css')
const oldHub = await read('public/entertainment/index.html')
const sitemap = await read('public/sitemap.xml')
const privacy = await read('public/games/privacy.html')
check('game hub shell has expected app mount', html.includes('id="osgard-games-app"'))
check('game hub uses external local assets', html.includes('/games/catalog.json') && html.includes('/games/hub.css') && html.includes('/games/hub.js'))
check('search and genre filters exist', html.includes('id="game-search"') && html.includes('id="genre-filter"'))
check('favorites and recents use local storage', hubJs.includes('osgard.games.favorites.v1') && hubJs.includes('osgard.games.recent.v1'))
check('analytics is opt-in and local-first', hubJs.includes('osgard.games.analytics-consent.v1') && hubJs.includes('osgard.games.analytics.v1') && hubJs.includes('osgard.games.pending.v1') && hubJs.includes('localStorage'))
check('server analytics uses only shared OSGARD event names', hubJs.includes('const serverEventNames = ["portal_opened", "game_opened", "game_session_started", "game_session_completed", "score_submitted", "share_created"]') && hubJs.includes('serverEventNames.includes(name)'))
check('analytics sync requires consent and an authenticated same-origin API', hubJs.includes('if (!hasConsent()) return;') && hubJs.includes('osgard.auth.accessToken') && hubJs.includes('fetch("/api/v1/player/events"') && hubJs.includes('credentials: "same-origin"'))
check('hub data and analytics use no third-party fetch endpoints', hubJs.includes('fetch("/games/catalog.json"') && !hubJs.includes('fetch("https://') && !hubJs.includes("fetch('https://")
check('detail and embedded player exist', html.includes('id="game-dialog"') && html.includes('id="game-frame"') && hubJs.includes('requestFullscreen'))
check('failure state is visible', html.includes('Каталог не загрузился.') && hubJs.includes('catalog-error') && hubJs.includes('launcher-error'))
check('share fallback exists', hubJs.includes('navigator.share') && hubJs.includes('navigator.clipboard'))
check('reduced-motion handling exists', hubCss.includes('prefers-reduced-motion'))
check('ecosystem CTA included', html.includes('Своя игра, сайт или приложение?') && html.includes('href="/development"'))
check('contact routes included', html.includes('osman.osmanov0099@gmail.com') && html.includes('wa.me/79640027222'))
check('privacy and terms page is linked and present', html.includes('href="/games/privacy.html"') && privacy.includes('id="privacy"') && privacy.includes('id="terms"'))
check('sponsor CTA is transparent and not a fake ad', html.includes('Платные рекламные показы и спонсоры сейчас не активированы.') && html.includes('subject=OSGARD%20Games%20Sponsorship'))
check('catalog does not fabricate ratings or counts', !/playerCount|reviewCount|rating\\s*:/.test(JSON.stringify(catalog)))
check('legacy entertainment route points to new hub', oldHub.includes('http-equiv="refresh"') && oldHub.includes('url=/games'))
check('SEO sitemap lists new games hub', sitemap.includes('https://osgard.world/games'))
const manifest = await read('src/core/manifest.ts')
check('React manifest no longer points NULL//SHIFT at missing Godot export', manifest.includes("href: '/games/null-shift/index.html'") && !manifest.includes("href: '/games/null-shift-godot/index.html'"))
const routes = await read('scripts/production-route-matrix.mjs')
check('production route matrix covers Games hub', routes.includes("'/games'") && routes.includes("route === '/games'"))
const rootIndex = await read('index.html')
check('favicon points at original OSGARD mark', rootIndex.includes('href="/osgard-mark.svg"'))
const failed = failures.length > 0
console.log(JSON.stringify({ status: failed ? 'failed' : 'passed', checks: checks.length, passed: checks.filter(x => x.ok).length, failures }, null, 2))
if (failed) process.exitCode = 1
