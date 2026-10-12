import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const root = 'public/games/null-shift/'
const pagePath = root + 'index.html'
const cssPath = root + 'styles.css'
const jsPath = root + 'game.js'
const enginePath = root + 'engine-3d.js'
for (const path of [pagePath, cssPath, jsPath, enginePath]) assert.ok(existsSync(path), 'Missing required game file: ' + path)

const html = readFileSync(pagePath, 'utf8')
const css = readFileSync(cssPath, 'utf8')
const js = readFileSync(jsPath, 'utf8')
const engine = readFileSync(enginePath, 'utf8')

assert.match(html, /<html lang="ru">/i, 'Game page must declare Russian language')
assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/, 'Mobile viewport metadata missing')
assert.ok(html.includes('href="./styles.css"'), 'Game CSS must be self-hosted')
assert.ok(html.includes('src="./game.js"'), 'Game JavaScript must be self-hosted')
assert.ok(html.includes('src="./engine-3d.js"'), 'WebGL engine must be self-hosted')
assert.ok(html.includes('id="engine-toggle"') && html.includes('id="touch-engine"'), 'Engine switch must exist on desktop and touch')
assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com|<script[^>]+src=["']https?:/i.test(html), 'External font or script CDN found')
assert.ok(!/url\(["']?https?:/i.test(css), 'External CSS asset found')

const requiredIds = [
  'game','game-frame','move-stick','move-knob','aim-stick','aim-knob',
  'touch-fire','touch-use','touch-pulse','touch-shift','touch-null','touch-ghost',
  'touch-contract','touch-loadout','cipher-pad','diag-panel','diag-fps','diag-p95',
  'diag-render','diag-tasks','diag-toggle','quality-toggle','fullscreen-toggle'
]
for (const id of requiredIds) assert.ok(html.includes('id="' + id + '"'), 'Missing game UI element #' + id)

for (const mechanic of ['function reset(', 'function interact(', 'function hackKey(', 'function shoot(', 'function pulse(', 'function shift(', 'function finish(', 'function update(', 'function draw(']) {
  assert.ok(js.includes(mechanic), 'Core gameplay mechanic missing: ' + mechanic)
}
for (const feature of [
  'premiumAtmosphere','premiumBindStick','PerformanceObserver','premiumFrameSamples',
  'premiumP95','premiumRenderMs','premiumLongTasks','requestAnimationFrame(loop)',
  "localStorage.setItem('null-shift-quality'"
]) assert.ok(js.includes(feature), 'Premium feature missing: ' + feature)

assert.ok(css.includes('.mobile-ui{display:none}'), 'Desktop must not show touch controls by default')
assert.ok(css.includes('@media(max-width:380px)'), 'Narrow 320px layout rules missing')
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'Reduced-motion support missing')
assert.ok(css.includes('.frame:fullscreen'), 'Fullscreen presentation rules missing')
assert.ok(css.includes('.diag-panel'), 'Diagnostics presentation missing')
assert.ok(js.includes('premiumRafSamples') && js.includes('requestAnimationFrame timestamps'), 'Diagnostics must use requestAnimationFrame timestamps')
assert.ok(css.includes('#fullscreen-toggle,#contract-toggle,#loadout-toggle,#sound-toggle{display:none}'), 'Desktop sound toggle should yield to mobile sound control')
assert.ok(html.includes('id="sound-toggle"') && html.includes('id="touch-sound"'), 'Sound control must be reachable on desktop and touch screens')

for (const feature of [
  'premiumCombatAI','premiumProcessDeviceHits','premiumDrawCombat','premiumBurst',
  "kind:'relay'","kind:'cell'","kind:'anchor'","premiumDashWarn","premiumVolleyWindup",
  "premiumBossWindup",'TACTICAL TELEMETRY','enemy-count','device-count','elimination-count'
]) assert.ok((js + html).includes(feature), 'Combat upgrade missing: ' + feature)
assert.ok(html.includes('class="raid-intel"'), 'Tactical telemetry HUD missing')
assert.ok(css.includes('.raid-intel'), 'Tactical telemetry presentation missing')
for (const feature of ['premiumHazardMode','premiumApplyHazards','premiumDrawPolish','premiumDrawArenaFloor','5.4-h.t','premiumFloorCacheReady','floorHazards','hazard-state','hazard-clock']) {
  assert.ok((js + html + css).toLowerCase().includes(feature.toLowerCase()), 'Environment / hazard feature missing: ' + feature)
}
assert.ok(html.includes('id="hazard-state"'), 'Live electrical hazard status missing')
assert.ok(css.includes('.hazard-banner[data-state="warning"]'), 'Warning state styling missing')

assert.ok(!js.includes("if(premiumAimHeld&&S.p)"), 'Manual aim stick must not be overwritten by auto-aim')
for (const feature of ['premiumV05ArmAudio','premiumV05Sound','premiumV05SetSound','premiumV05DrawMotion','premiumV05DrawRails','premiumV05UpdateMotion','AudioContext','premiumV05Trails']) assert.ok(js.includes(feature), 'Release 0.5 feature missing: ' + feature)
assert.ok(js.includes("localStorage.setItem('null-shift-sound'"), 'Sound preference must persist locally')
assert.ok(js.includes('shot:[') && js.includes('shift:[') && js.includes('blast:['), 'Core gameplay sound cues missing')

new Function(js)
new Function(engine)
for (const feature of ["getContext('webgl'",'uMVP','function cube(){','function sphere(','function cylinder(','function ring(','NULL_SHIFT_GET_SCENE_STATE','NULL_SHIFT_SCREEN_TO_WORLD','NULL_SHIFT_TOGGLE_ENGINE','drawParticles','ANGLE_instanced_arrays','renderInstanced','gpuFrameStats.triangles','aInstancePosScale','uFogColor']) assert.ok(engine.includes(feature), 'WebGL engine feature missing: ' + feature)
assert.ok(js.includes('NULL_SHIFT_GET_SCENE_STATE') && js.includes('NULL_SHIFT_SET_RENDER_MODE'), 'Game/WebGL bridge missing')
console.log('PASS NULL//SHIFT: standalone assets, WebGL renderer, core mechanics, touch input, diagnostics, motion preference and JS syntax')
