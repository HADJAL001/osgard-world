import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  home: readFileSync('src/App.tsx', 'utf8'),
  development: readFileSync('src/Development.tsx', 'utf8'),
  sections: readFileSync('src/Sections.tsx', 'utf8'),
}
const unsupported = [
  '99.9%',
  '7 min',
  '7 мин',
  '360°',
  '360пїЅ',
  '+2 h',
  '+2 часа в день',
  'Меньше хаоса на 40%',
  '40% less chaos',
  '2 min',
  '2 мин',
  '0.0%',
  'Экономия 50 000 ₽',
  'Экономия до 30% vs фрилансеры',
  'Доход от 30 000 ₽/мес',
]
for (const [name, source] of Object.entries(files)) {
  for (const claim of unsupported) assert.ok(!source.includes(claim), 'Unsupported promotional claim "' + claim + '" remains in ' + name)
}
assert.ok(files.home.includes('Сервис VPN под вашим контролем.'))
assert.ok(files.home.includes('Учёт кассы и операций обменного пункта.'))
assert.ok(files.development.includes('Премиальное такси'))
assert.ok(files.development.includes('Создание видео'))
assert.ok(files.sections.includes('A smart map and planner for the day.'))
console.log(JSON.stringify({ status: 'PASS', check: 'unverified quantitative marketing claims removed from ecosystem card copy', files: Object.keys(files), prohibitedClaimsChecked: unsupported.length }, null, 2))
