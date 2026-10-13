import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = process.cwd()
const source = resolve(root, 'public/games/favicon.svg')
const iconDir = resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
if (!existsSync(source)) throw new Error('OSGARD source SVG icon is missing.')
if (!existsSync(resolve(root, 'ios/App/App.xcodeproj'))) {
  throw new Error('Generated iOS Xcode project is missing. Run npx cap add ios first.')
}

const svg = readFileSync(source, 'utf8')
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: '#080a0b',
}).render().asPng()

if (png.readUInt32BE(16) !== 1024 || png.readUInt32BE(20) !== 1024) {
  throw new Error('Rendered App Store icon must be exactly 1024 × 1024 px.')
}
if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
  throw new Error('Rendered app icon is not a valid PNG.')
}

rmSync(iconDir, { recursive: true, force: true })
mkdirSync(iconDir, { recursive: true })
writeFileSync(resolve(iconDir, 'AppIcon.png'), png)
writeFileSync(resolve(iconDir, 'Contents.json'), JSON.stringify({
  images: [{
    filename: 'AppIcon.png',
    idiom: 'universal',
    platform: 'ios',
    size: '1024x1024',
  }],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n')

console.log('[ios-icon] Installed original OSGARD PLAY icon: 1024 × 1024 PNG')
