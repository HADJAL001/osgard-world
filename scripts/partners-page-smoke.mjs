import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve('public/games/partners')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const js = readFileSync(resolve(root, 'partners.js'), 'utf8')
const inventory = JSON.parse(readFileSync(resolve(root, 'inventory.json'), 'utf8'))
for (const value of ['OSGARD PLAY <span>/</span> PARTNER STUDIO','id="inventory-grid"','id="campaign-form"','id="send-link"','https://wa.me/79640027222','id="principles"','id="formats"','prefers-reduced-motion:reduce','/privacy/','/terms/']) assert.ok(html.includes(value), 'Partner page missing: ' + value)
assert.equal(inventory.schemaVersion, 1)
assert.equal(inventory.commercialStatus, 'inquiry_only')
assert.ok(inventory.placements.length >= 3)
assert.equal(new Set(inventory.placements.map((item) => item.id)).size, inventory.placements.length)
for (const item of inventory.placements) {
  assert.equal(item.active, false, 'Proposal must not be represented as a live ad placement: ' + item.id)
  assert.equal(item.sponsorLabelRequired, true, 'Sponsor disclosure is required: ' + item.id)
  assert.ok(['planned', 'inquiry'].includes(item.status), 'Unexpected placement status: ' + item.id)
  assert.ok(item.title && item.description && item.measurement)
}
assert.ok(js.includes("fetch('./inventory.json'"), 'Inventory is not data-driven')
assert.ok(js.includes('item.active === false') && js.includes('item.sponsorLabelRequired === true'), 'Inventory safety contract missing')
assert.ok(js.includes('encodeURIComponent(fields.join'), 'Brief must be URL encoded')
assert.ok(js.includes('sendLink.hidden = false') && js.includes('отправьте его вручную'), 'Manual user confirmation missing')
assert.ok(!/googletagmanager|google-analytics|doubleclick|adsbygoogle|clarity\.ms/i.test(html + js), 'Unapproved analytics or ad network must not be injected')
assert.ok(!/innerHTML\s*=/.test(js), 'Remote/config values must not be inserted as HTML')
new Function(js)
console.log('OSGARD_PARTNER_PAGE_SMOKE_OK')

