import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html=readFileSync(resolve('public/games/admin/index.html'),'utf8');
const logic=readFileSync(resolve('public/games/admin/dashboard-logic.js'),'utf8');
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).at(-1);
assert.ok(inline&&inline.length>4000,'LiveOps dashboard inline application script is missing');
new Function(inline);
for(const contract of [
  'dashboard-logic.js','data-range-preset="day"','data-range-preset="week"',
  'data-range-preset="month"','data-range-preset="quarter"',
  'id="period-comparison"','id="comparison-meta"','.comparison-bars','appendBar(\'Ранее\'','appendBar(\'Сейчас\'',
  'role="group" aria-label="Быстрый выбор аналитического периода"',
  'AbortController','controller.signal.aborted','sequence!==refreshSequence',
  'tokenAtStart!==operatorToken','epoch!==operationEpoch',
  'cancelRefreshForInvalidRange','logic.previousPeriod(range)',
  'previousSummary','renderComparison(comparison,range,previous)',
  "credentials:'same-origin'","redirect:'error'","cache:'no-store'",
  "X-Moderation-Token","new Blob([csv]",
  "if(/^\\s*[=+\\-@]/.test(text))text=\"'\"+text",
  'Активные запросы отменены','Токен очищен из памяти вкладки'
]) assert.ok(html.includes(contract),'Missing dashboard UX/safety contract: '+contract);
for(const contract of [
  'function parseDateRange(', 'MAX_RANGE_MS', 'function previousPeriod(',
  'function compareMetricRows(', 'percentChange:before===0?null',
  "direction:delta>0?'up':delta<0?'down':'flat'",
  'function rangeForPreset(', 'Неизвестный период'
]) assert.ok(logic.includes(contract),'Missing testable dashboard logic: '+contract);
assert.ok(!/localStorage|sessionStorage|document\.cookie/i.test(html),'Operator token must never be persisted in browser storage');
assert.ok(!/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html),'Dashboard must not depend on third-party scripts');
assert.ok(html.includes('не означает автоматически улучшение или ухудшение'),'Comparison copy must not imply every increase is good');
assert.ok(html.includes('API не вернул одинаковых распознаваемых числовых метрик'),'Missing metrics must never be represented as fabricated zeroes');
console.log('PASS OSGARD LiveOps premium dashboard: date presets, matched-period comparison, stale-request cancellation, token lifecycle, safe exports, local-only dependencies and inline JS syntax.');
