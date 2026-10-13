import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const check = (condition, message) => assert.ok(condition, message)

const config = read('capacitor.config.ts')
const sourceRoute = read('src/main.tsx')
const html = read('mobile-dist/games/index.html')
const shareBridge = read('mobile-dist/games/native-share-bridge.js')
const required = [
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

check(config.includes("appId: 'world.osgard.play'"), 'Bundle ID must match the Codemagic signing profile.')
check(config.includes("appName: 'OSGARD PLAY'"), 'Capacitor display name is missing.')
check(config.includes("webDir: 'mobile-dist'"), 'Capacitor must package locally bundled web assets.')
check(config.includes("appStartPath: 'games/'"), 'The native app must start at the Games catalogue.')
check(!config.includes('server: { url:'), 'The app must not be a remote-only WebView.')
check(sourceRoute.includes("path === '/games/time/index.html'"), 'Bundled Time route alias is missing.')
check(html.includes('href="/games/time/index.html" data-play="time"'), 'The Time card must resolve to the bundled local route.')
check(html.includes("time:{title:'Империя времени',url:'/games/time/index.html'}"), 'The embedded Time launch registry must target the bundled route.')
check(html.includes('/games/native-share-bridge.js'), 'The catalogue does not load the native sharing bridge.')
check(shareBridge.includes('https://osgard.world'), 'Native share URLs must resolve to a public OSGARD link.')
check(shareBridge.includes('Share.share'), 'Native sharing must use the iOS share sheet plugin.')
check(!shareBridge.includes('reward') && !shareBridge.includes('game_session_completed'), 'Opening the share sheet must never imply a verified reward or completed game.')
for (const entry of required) {
  check(existsSync(resolve(root, 'mobile-dist/games', entry)), 'Missing local game entry: /games/' + entry)
}
check(existsSync(resolve(root, 'mobile-dist/privacy/index.html')), 'Privacy page must be included in the native bundle.')
check(existsSync(resolve(root, 'ios/App/App.xcodeproj/project.pbxproj')), 'Capacitor iOS Xcode project was not generated.')
check(existsSync(resolve(root, 'ios/App/App.xcworkspace')), 'CocoaPods workspace was not generated.')

const iconDir = resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
const iconPath = resolve(iconDir, 'AppIcon.png')
const iconContents = JSON.parse(readFileSync(resolve(iconDir, 'Contents.json'), 'utf8'))
const icon = readFileSync(iconPath)
check(icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'App Store icon must be a valid PNG.')
check(icon.readUInt32BE(16) === 1024 && icon.readUInt32BE(20) === 1024, 'App Store icon must be 1024 × 1024.')
check(iconContents.images.some((image) => image.filename === 'AppIcon.png' && image.size === '1024x1024'), 'Xcode AppIcon asset manifest is invalid.')

console.log('PASS iOS package: local game routes, native sharing, privacy page, bundle ID and App Store icon')
