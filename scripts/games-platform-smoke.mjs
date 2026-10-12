import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const [manifest, platform, styles, main, app] = await Promise.all([
  read('../src/core/manifest.ts'),
  read('../src/GamesPlatform.tsx'),
  read('../src/games-platform.css'),
  read('../src/main.tsx'),
  read('../src/App.tsx'),
])

const manifestGamesBlock = manifest.match(/export const OSGARD_GAMES:[\s\S]*?\n\]\n/)
assert.ok(manifestGamesBlock, 'OSGARD_GAMES must remain declared in the shared manifest')
const ids = [...manifestGamesBlock[0].matchAll(/\{ id: '([^']+)', title:/g)].map((match) => match[1])
assert.deepEqual(ids, ['time', 'swarm', 'null-shift', 'inherit', 'remix'], 'catalog should preserve the five existing game IDs')
assert.equal(new Set(ids).size, ids.length, 'game IDs must be unique')

const detailsBlock = platform.match(/const DETAILS: Record<OsgardGameId, GameDetails> = \{([\s\S]*?)\n\}\n\nconst CATALOG/)
assert.ok(detailsBlock, 'every catalog game must have a detail record')
const detailIds = [...detailsBlock[1].matchAll(/^\s*(?:'([^']+)'|([a-z][a-z-]*)):\s*\{/gm)]
  .map((match) => match[1] ?? match[2])
assert.deepEqual([...detailIds].sort(), [...ids].sort(), 'metadata must cover exactly the IDs in the main manifest')

const checks = [
  ['catalog route is registered', main.includes("path === '/games'")],
  ['game detail route is registered', main.includes("path.startsWith('/games/info/')")],
  ['embedded play route is registered', main.includes("path.startsWith('/games/play/')")],
  ['new platform component is imported', main.includes("import { GamesPlatform } from './GamesPlatform'")],
  ['the old entertainment route remains available', main.includes("path === '/entertainment'")],
  ['desktop portal links lead to new catalog', app.includes('href="/games"')],
  ['detail links use known catalog IDs', platform.includes("return '/games/info/' + id")],
  ['play links use known catalog IDs', platform.includes("return '/games/play/' + id")],
  ['favorites use a namespaced local key', platform.includes("osgard.games.favorites.v1")],
  ['recent games use a namespaced local key', platform.includes("osgard.games.recent.v1")],
  ['invalid stored IDs are filtered against manifest', platform.includes('VALID_IDS.has(item)')],
  ['query search supports title and description', platform.includes('game.descriptionRu') && platform.includes('game.descriptionEn')],
  ['genre controls announce active state', platform.includes('aria-pressed={genre === item.id}')],
  ['favorite controls announce active state', platform.includes('aria-pressed={favorites.includes(game.id)}')],
  ['keyboard search shortcut focuses a real input', platform.includes("event.key.toLowerCase() === 'k'") && platform.includes('ref={searchRef}')],
  ['share works through native share or clipboard', platform.includes('navigator.share') && platform.includes('navigator.clipboard.writeText')],
  ['share analytics uses an existing core event', platform.includes("recordOsgardEvent('share_created'")],
  ['game launch is measured via existing event queue', platform.includes("recordOsgardEvent('game_opened'")],
  ['entry checks have a timeout', platform.includes('AbortController') && platform.includes('5000')],
  ['UI distinguishes URL checks from runtime proof', platform.includes('not a full game runtime test')],
  ['embedded player provides fullscreen', platform.includes('requestFullscreen()') && platform.includes('allowFullScreen')],
  ['embedded player provides direct launch fallback', platform.includes('Open separately')],
  ['development cross-promotion goes to an existing route', platform.includes('href="/development"')],
  ['contact email is present in footer', platform.includes('mailto:osman.osmanov0099@gmail.com')],
  ['WhatsApp URL is correctly formed', platform.includes('https://wa.me/79640027222')],
  ['responsive layout covers tablet/desktop and phones', styles.includes('@media (max-width: 1080px)') && styles.includes('@media (max-width: 700px)')],
  ['very narrow phones are handled', styles.includes('@media (max-width: 380px)')],
  ['reduced motion preference is respected', styles.includes('prefers-reduced-motion: reduce')],
  ['visible focus states exist', styles.includes(':focus-visible')],
  ['old catalog paths are not removed from manifest', ids.every((id) => manifestGamesBlock[0].includes("id: '" + id + "'"))],
]

for (const [name, passed] of checks) {
  assert.equal(passed, true, 'failed: ' + name)
}

for (const id of ids) {
  assert.ok(platform.includes("'" + id + "': {") || new RegExp("\\n\\s*" + id + ": \\{").test(platform), 'metadata is missing for game "' + id + '"')
}

for (const accent of ['time', 'swarm', 'shift', 'inherit', 'remix']) {
  assert.ok(styles.includes('.osg-game-card--' + accent), 'visual style is missing for "' + accent + '"')
}

console.log(JSON.stringify({
  status: 'passed',
  checks: checks.length + ids.length + 5,
  games: ids,
  features: checks.filter(([, passed]) => passed).map(([name]) => name),
}, null, 2))
