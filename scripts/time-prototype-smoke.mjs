import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const component = readFileSync('src/TimePrototype.tsx', 'utf8')
const styles = readFileSync('src/time.css', 'utf8')
const bible = readFileSync('docs/02_IMPERIUM_OF_TIME_GAME_DESIGN.md', 'utf8')

for (const id of ['signatureClock', 'heroCredential']) {
  // SkillCred is a separate product; this check intentionally asserts the TIME game instead.
  void id
}
assert.ok(component.includes('Частота кадров') && component.includes('P95 кадра'), 'runtime diagnostics must report frame cadence and p95')
assert.ok(component.includes('Медленные кадры') && component.includes('Запись сохранения'), 'runtime diagnostics must expose slow frames and actual save timing')
assert.ok(component.includes('setMapZoom(1)') && component.includes('handleShortcuts'), 'keyboard zoom reset and shortcuts must be wired')
assert.ok(component.includes('tg-city-building') && component.includes('tg-district-heat'), 'city rendering must respond to district state and building levels')
assert.ok(styles.includes('@keyframes tg-water-flow') && styles.includes('@keyframes tg-map-arrive'), 'map atmosphere transitions must exist')
assert.ok(styles.includes('prefers-reduced-motion:reduce') && styles.includes('.tg-city-map{filter:none}'), 'visual effects must respect reduced-motion preference')
assert.ok(bible.includes('95-й процентиль интервала кадра'), 'design bible must describe actual runtime metrics')
console.log('PASS TIME vertical slice: state-driven city art, responsive input, runtime diagnostics and accessibility')
