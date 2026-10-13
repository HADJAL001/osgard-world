import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const yaml = read('codemagic.yaml')
const capacitor = read('capacitor.config.ts')
const builder = read('scripts/codemagic/build-ios.sh')
const shareBridge = read('scripts/ios/native-share-bridge.ts')
const packageJson = JSON.parse(read('package.json'))
const deployment = read('.github/workflows/deploy-frontend.yml')

const checks = [
  ['two separately named Codemagic release workflows', yaml.includes('osgard-play-ios-testflight:') && yaml.includes('osgard-play-ios-app-store-submit:')],
  ['TestFlight upload is configured', yaml.includes('submit_to_testflight: true')],
  ['App Store Review submission is a separate explicit workflow', yaml.includes('submit_to_app_store: true') && yaml.includes('submit_to_testflight: false')],
  ['workflows use App Store Connect integration', (yaml.match(/app_store_connect: osgard_app_store_connect/g) || []).length === 2],
  ['bundle ID agrees in Capacitor and both signing workflows', (yaml.match(/bundle_identifier: world\.osgard\.play/g) || []).length === 2 && capacitor.includes("appId: 'world.osgard.play'")],
  ['local web bundle is used instead of a remote URL', capacitor.includes("webDir: 'mobile-dist'") && capacitor.includes("appStartPath: 'games/'") && !/server:\s*\{\s*url:/.test(capacitor)],
  ['Codemagic pins Capacitor and share plugin versions', builder.includes('CAPACITOR_VERSION="8.5.3"') && builder.includes('SHARE_VERSION="8.0.3"')],
  ['Godot export is produced before packaging the app', builder.indexOf('--export-release Web') < builder.indexOf('node scripts/prepare-ios-dist.mjs')],
  ['signed iOS build uses the expected workspace and scheme', yaml.includes('XCODE_WORKSPACE: "ios/App/App.xcworkspace"') && yaml.includes('XCODE_SCHEME: "App"') && yaml.includes('xcode-project use-profiles') && yaml.includes('xcode-project build-ipa')],
  ['Apple SDK baseline is checked', builder.includes('XCODE_MAJOR < 26') && builder.includes('iOS 26')],
  ['native share uses the supported Capacitor plugin', shareBridge.includes("from '@capacitor/share'") && shareBridge.includes('Share.share')],
  ['web production deploy remains the existing SSH workflow', deployment.includes('scripts/activate-frontend-remote.sh') && deployment.includes('branches: [master]')],
  ['mobile package smoke command is present', packageJson.scripts['qa:ios-package'] === 'node scripts/ios-package-smoke.mjs'],
  ['no App Store API credentials are committed in YAML', !/APP_STORE_CONNECT_PRIVATE_KEY\s*:/i.test(yaml) && !/BEGIN PRIVATE KEY/.test(yaml)],
]

for (const [name, ok] of checks) {
  assert.ok(ok, name)
  console.log('PASS ' + name)
}
console.log('PASS ' + checks.length + ' Codemagic/iOS configuration checks')
