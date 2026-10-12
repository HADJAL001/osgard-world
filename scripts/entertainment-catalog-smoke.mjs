import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const component = readFileSync('src/EntertainmentCatalog.tsx', 'utf8')
const styles = readFileSync('src/entertainment.css', 'utf8')
const router = readFileSync('src/main.tsx', 'utf8')

for (const id of ['time', 'swarm', 'null-shift', 'inherit', 'remix']) {
  assert.ok(component.includes("id: '" + id + "'"), 'Entertainment catalogue is missing game ' + id)
}
for (const feature of [
  'FAVORITES_KEY',
  'RECENT_KEY',
  'localStorage.setItem',
  'useMemo',
  'launchRandom',
  'navigator.share',
  'navigator.clipboard',
  "event.key === '/'",
  'aria-pressed={favoritesOnly}',
  'aria-live="polite"',
  'prefers-reduced-motion',
  'entertainment_catalog',
]) {
  assert.ok(component.includes(feature) || styles.includes(feature), 'Entertainment feature missing: ' + feature)
}
for (const route of [
  '/games/time',
  '/games/swarm/index.html',
  '/games/null-shift-godot/index.html',
  '/games/inherit/index.html',
  '/games/remix/index.html',
]) {
  assert.ok(component.includes(route), 'Entertainment link is missing route ' + route)
}
for (const cssRule of [
  '.ent-game-grid',
  '.ent-game-card.is-featured',
  '@media(max-width:760px)',
  '@media(max-width:390px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible',
  '.ent-empty-state',
]) {
  assert.ok(styles.includes(cssRule), 'Premium entertainment styles missing: ' + cssRule)
}
assert.ok(router.includes("path === '/entertainment' ? <EntertainmentCatalog"), 'The premium catalogue is not wired to /entertainment')
assert.ok(component.includes('aria-pressed={isFavorite}'), 'Favorite buttons need an accessible pressed state')
assert.ok(component.includes('aria-label={labels.language}'), 'Language toggle needs an accessible label')
assert.ok(component.includes('mailto:osman.osmanov0099@gmail.com?subject=OSGARD%20Entertainment'), 'Game submission contact is missing')
assert.ok(!component.includes('playerCount') && !component.includes('rating:'), 'Do not fabricate live-player counts or ratings')

console.log(JSON.stringify({
  status: 'PASS',
  games: 5,
  features: ['search', 'genre filters', 'sorting', 'local favorites', 'local recents', 'continue last selection', 'random pick', 'share', 'keyboard shortcut', 'responsive layout', 'reduced motion', 'bilingual UI'],
}, null, 2))
