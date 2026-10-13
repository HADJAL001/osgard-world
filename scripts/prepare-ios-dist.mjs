import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const mobileDist = resolve(root, 'mobile-dist')
const builtIndex = join(dist, 'index.html')
const sourceGames = join(dist, 'games')
const mobileGames = join(mobileDist, 'games')

function fail(message) {
  console.error('[ios-package] ' + message)
  process.exit(1)
}

if (!existsSync(builtIndex)) fail('dist/index.html is missing; run npm run build first.')
if (!existsSync(join(sourceGames, 'index.html'))) fail('dist/games/index.html is missing.')
if (!existsSync(join(sourceGames, 'luxury.js')) || !existsSync(join(sourceGames, 'player-lifecycle.js'))) {
  fail('The Games catalogue is missing its launch/lifecycle scripts.')
}
if (!existsSync(join(sourceGames, 'null-shift-godot', 'index.html'))) {
  fail('NULL//SHIFT Godot Web export is missing. Export it before bundling the iOS app.')
}

rmSync(mobileDist, { recursive: true, force: true })
cpSync(dist, mobileDist, { recursive: true })

// Time is a React route on the website. Put a copy of Vite's entry document at a
// concrete local path so it can still render from Capacitor's bundled file server.
const timeDir = join(mobileGames, 'time')
mkdirSync(timeDir, { recursive: true })
cpSync(builtIndex, join(timeDir, 'index.html'))

// Route Time to the concrete bundled document only inside the native package.
const catalogPath = join(mobileGames, 'index.html')
let catalog = readFileSync(catalogPath, 'utf8')
const routeMapEntry = "time:{title:'Империя времени',url:'/games/time'}"
if (!catalog.includes(routeMapEntry)) fail('Could not find Time in the Games launch registry.')
catalog = catalog
  .replace(routeMapEntry, "time:{title:'Империя времени',url:'/games/time/index.html'}")
  .replaceAll('href="/games/time" data-play="time"', 'href="/games/time/index.html" data-play="time"')
writeFileSync(catalogPath, catalog)

const lifecyclePath = join(mobileGames, 'player-lifecycle.js')
if (existsSync(lifecyclePath)) {
  const lifecycle = readFileSync(lifecyclePath, 'utf8')
  writeFileSync(lifecyclePath, lifecycle.replaceAll("url:'/games/time'", "url:'/games/time/index.html'"))
}

// Bundle the official Capacitor Share plugin into one same-origin script. It is
// added to packaged HTML pages only; the public web site remains unchanged.
execFileSync(resolve(root, 'node_modules/.bin/esbuild'), [
  resolve(root, 'scripts/ios/native-share-bridge.ts'),
  '--bundle',
  '--format=iife',
  '--target=es2020',
  '--outfile=' + join(mobileGames, 'native-share-bridge.js'),
], { stdio: 'inherit' })

const bridgeTag = '<script src="/games/native-share-bridge.js"></script>'
let injected = 0
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.html')) continue
    let html = readFileSync(path, 'utf8')
    if (html.includes('native-share-bridge.js')) continue
    const head = html.match(/<head(?:\s[^>]*)?>/i)
    if (!head) continue
    html = html.replace(head[0], head[0] + bridgeTag)
    writeFileSync(path, html)
    injected += 1
  }
}
walk(mobileGames)

// Make all packaged game entry points concrete local files. This catches a newly
// added catalogue card that works on the web server but was not copied for iOS.
const requiredEntries = [
  'null-shift-godot/index.html',
  'time/index.html',
  'swarm/index.html',
  'inherit/index.html',
  'remix/index.html',
  'civic-cascade/index.html',
  'patina/index.html',
  'signal-run/index.html',
  'cascade-lab/index.html',
  'afterimage-run/index.html',
]
for (const entry of requiredEntries) {
  const path = join(mobileGames, entry)
  if (!existsSync(path)) fail('Missing bundled game entry: /games/' + entry)
}

if (!catalog.includes(bridgeTag) && injected === 0) {
  fail('Native share bridge was not injected into any game page.')
}

console.log('[ios-package] Prepared local game portal at ' + relative(root, mobileGames))
console.log('[ios-package] Local game entry points: ' + requiredEntries.length)
console.log('[ios-package] Native share bridge injected into ' + injected + ' HTML page(s)')
