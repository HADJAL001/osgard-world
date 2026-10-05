import fs from 'node:fs'
const path = 'src/App.tsx'
let source = fs.readFileSync(path, 'utf8')
source = source.replace(/locale === 'ru' \? '[^']*' : 'Seven instruments\. One empire\.'/g, "locale === 'ru' ? 'Семь инструментов. Одна империя.' : 'Seven instruments. One empire.'")
source = source.replace(/locale === 'ru' \? '[^']*' : 'Choose a task\. The scene reveals how each world serves your next step\.'/g, "locale === 'ru' ? 'Выберите задачу. Сцена покажет следующий шаг.' : 'Choose a task. The scene reveals how each world serves your next step.'")
source = source.replace(/locale === 'ru' \? '[^']*' : 'Explore the ecosystem'/g, "locale === 'ru' ? 'Исследовать экосистему' : 'Explore the ecosystem'")
source = source.replaceAll('`r`n', '\n')
fs.writeFileSync(path, source, 'utf8')
