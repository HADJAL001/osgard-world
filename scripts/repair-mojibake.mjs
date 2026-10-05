import fs from 'node:fs'
import iconv from 'iconv-lite'

for (const path of ['src/App.tsx', 'src/main.tsx']) {
  let source = fs.readFileSync(path, 'utf8')
  source = source.replace(/(['"])(.*?)\1/g, (full, quote, value) => {
    if (!/[РСВ][А-Яа-яЃѓ]/.test(value)) return full
    const repaired = iconv.decode(iconv.encode(value, 'win1251'), 'utf8')
    return `${quote}${repaired.replaceAll(quote, `\\${quote}`)}${quote}`
  })
  fs.writeFileSync(path, source, 'utf8')
}

const appPath = 'src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')
const replacements = new Map([
  ['���������� �������, ������������, �������� � ��������� ��������� �� ����� �����. ���� ���������� �������. ���� ����� ������.', 'Управляйте защитой, мобильностью, временем и созданием продуктов из одной точки. Семь работающих модулей. Один ясный контур.'],
  ['������ ������ � ����������� ������� � ����� Telegram.', 'Ранний доступ и подключение модулей — через Telegram.'],
  ['���� ������������. ���� �������.', 'Семь инструментов. Одна империя.'],
  ['�������� ������. ����� ������� ��������� ���.', 'Выберите задачу. Сцена покажет следующий шаг.'],
  ['��������� �������� � ������ �������.', 'Связывает продукты в единую картину.'],
  ['�������� ������ � �������� ���������� �������.', 'Работает только в границах выбранного доступа.'],
  ['������ ��� ������ ���� ������. �� ���������� ����� �� ��������.', 'Каждый мир решает свою задачу. Вы сохраняете фокус на решениях.'],
  ['��� ������ ������� ������� ����� �������.', 'Все важные решения требуют ясной картины.'],
  ['Р’Р°Р¶РЅРѕРµ РґРѕ РІС…РѕРґР°.', 'Важное перед входом.'],
  ['Р§С‚Рѕ С‚Р°РєРѕРµ TimeCoin?', 'Что такое TimeCoin?'],
  ['РЎ С‡РµРіРѕ РЅР°С‡Р°С‚СЊ?', 'С чего начать?'],
])
for (const [from, to] of replacements) app = app.replaceAll(from, to)
app = app.replace(/locale === 'ru' \? '[^']*' : 'Direct protection, mobility, time and product creation from one place\. Seven working modules\. One clear operating system\.'/g, "locale === 'ru' ? 'Управляйте защитой, мобильностью, временем и созданием продуктов из одной точки. Семь работающих модулей. Один ясный контур.' : 'Direct protection, mobility, time and product creation from one place. Seven working modules. One clear operating system.'")
app = app.replace(/locale === 'ru' \? '[^']*' : 'Each world serves its own purpose\. You keep your attention on decisions\.'/g, "locale === 'ru' ? 'Каждый мир решает свою задачу. Вы сохраняете фокус на решениях.' : 'Each world serves its own purpose. You keep your attention on decisions.'")
app = app.replace(/locale === 'ru' \? '[^']*' : 'Important before entry\.'/g, "locale === 'ru' ? 'Важное перед входом.' : 'Important before entry.'")
app = app.replace(/locale === 'ru' \? '[^']*' : 'Where should I begin\?'/g, "locale === 'ru' ? 'С чего начать?' : 'Where should I begin?'")
fs.writeFileSync(appPath, app, 'utf8')
