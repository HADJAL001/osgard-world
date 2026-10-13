import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const html = read('index.html')
const mark = read('public/osgard-mark.svg')
const wordmark = read('src/OsgardLogo.tsx')
const css = read('src/brand.css')
const brandDoc = read('docs/OSGARD_BRAND_SYSTEM.md')
const templates = [
  ['public/brand/templates/ecosystem-1200x630.svg', '1200', '630', 'OSGARD WORLD'],
  ['public/brand/templates/game-launch-1200x630.svg', '1200', '630', 'OSGARD PLAY'],
  ['public/brand/templates/development-1200x630.svg', '1200', '630', 'OSGARD'],
  ['public/brand/templates/story-1080x1920.svg', '1080', '1920', 'OSGARD WORLD']
].map(([path, width, height, label]) => ({path, width, height, label, svg: read(path)}))

assert.ok(html.includes('<link rel="icon" href="/osgard-mark.svg" type="image/svg+xml"'), 'Root page must use the OSGARD mark favicon')
assert.ok(html.includes('https://osgard.world/osgard-mark.svg'), 'Organization structured data must reference the mark')
assert.ok(html.includes('Игры, цифровые сервисы') && !html.includes('Семь миров') && !html.includes('Семь самостоятельных продуктов'), 'Root metadata must not claim a fixed number of products')
assert.ok(mark.includes('<svg') && mark.includes('viewBox="0 0 64 64"') && mark.includes('#76e6ce') && mark.includes('#d8bd83'), 'Root mark must be a 64x64 champagne/mint emblem')
assert.ok(!/<script\b|\bon[a-z]+\s*=|javascript:|https?:\/\//i.test(mark), 'Favicon must be static and self-contained')
assert.ok(wordmark.includes('aria-label="OSGARD WORLD"') && wordmark.includes('OSGARD') && wordmark.includes('WORLD'), 'Accessible component wordmark is required')
assert.ok(css.includes('.osgard-logo-mark-star{fill:#76e6ce') && css.includes('#d8bd83') && !css.includes('#d8424d') && !css.includes('rgba(216,66,77'), 'Wordmark must use champagne/mint rather than the old red accent')
assert.ok(brandDoc.includes('public/osgard-mark.svg') && brandDoc.includes('src/OsgardLogo.tsx') && brandDoc.includes('OSGARD PLAY lime') && brandDoc.includes('Не публикуй без подтверждения'), 'Brand guide must document asset ownership, sub-brand accent and factuality rules')
for (const item of templates) {
  assert.ok(item.svg.startsWith('<svg') && item.svg.includes(`width="${item.width}" height="${item.height}"`), `Invalid template dimensions: ${item.path}`)
  assert.ok(item.svg.includes('<title') && item.svg.includes('<desc'), `Accessible title/description missing: ${item.path}`)
  assert.ok(item.svg.includes(item.label), `Brand name missing from template: ${item.path}`)
  assert.ok(!/<script\b|javascript:|https?:\/\//i.test(item.svg), `Template contains executable code or external URL: ${item.path}`)
}
assert.ok(brandDoc.includes('ecosystem-1200x630.svg') && brandDoc.includes('game-launch-1200x630.svg') && brandDoc.includes('development-1200x630.svg') && brandDoc.includes('story-1080x1920.svg'), 'Brand guide must list all advertising templates')
console.log('PASS OSGARD BRAND SYSTEM: favicon, SEO metadata, accessible wordmark, champagne/mint palette and four editable SVG advertising templates.')
