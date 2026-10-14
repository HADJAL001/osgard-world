(() => {
'use strict';
if (typeof window === 'undefined' || typeof document === 'undefined' || window.CASCADELAB018 || !window.CASCADELAB015) return;

const ledger = window.CASCADELAB015;
const STORAGE_KEY = 'osgard.cascade-lab.next-experiment.v1';
const SCHEMA = 'osgard.cascade-lab.next-experiment.v1';
let memoryPlan = null;

const css = [
  '.cl-hypothesis{margin:18px 0 22px;padding:clamp(16px,2.3vw,25px);border:1px solid #8bdcff35;border-radius:18px;background:radial-gradient(ellipse at 90% 0%,#17618223,transparent 46%),linear-gradient(145deg,#0b1a26,#060e17);color:#e8f4fb;box-shadow:0 18px 50px #0002,inset 0 1px #ffffff08}',
  '.cl-hypothesis-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}',
  '.cl-hypothesis-eyebrow{margin:0;color:#72ddff;font:9px ui-monospace,monospace;letter-spacing:.18em}',
  '.cl-hypothesis-badge{display:inline-flex;align-items:center;min-height:24px;padding:4px 8px;border:1px solid #e9ba6a38;border-radius:20px;color:#e9ba6a;font:8px ui-monospace,monospace;letter-spacing:.08em}',
  '.cl-hypothesis h3{margin:0;color:#f0f7fb;font:400 clamp(23px,3.2vw,34px)/1.1 Georgia,serif;letter-spacing:-.025em}',
  '.cl-hypothesis-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
  '.cl-hypothesis-card{min-width:0;padding:13px;border:1px solid #8bb7cb24;border-radius:12px;background:#06121caa}',
  '.cl-hypothesis-card span{display:block;margin-bottom:7px;color:#79a3b7;font:8px ui-monospace,monospace;letter-spacing:.13em}',
  '.cl-hypothesis-card strong{display:block;color:#eaf5fa;font-size:12px;line-height:1.55;font-weight:650;overflow-wrap:anywhere}',
  '.cl-hypothesis-card p{margin:6px 0 0;color:#8faab9;font-size:10px;line-height:1.65}',
  '.cl-hypothesis-metrics{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}',
  '.cl-hypothesis-metric{display:inline-flex;gap:6px;align-items:center;padding:7px 9px;border:1px solid #8bb7cb20;border-radius:9px;background:#050e17;color:#8eabb9;font-size:9px}',
  '.cl-hypothesis-metric b{color:#ecf5f9;font-weight:650}',
  '.cl-hypothesis-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:13px}',
  '.cl-hypothesis-button{min-height:40px;padding:9px 13px;border:1px solid #7ddfff5a;border-radius:10px;background:linear-gradient(120deg,#14384a,#0b1a27);color:#dff7ff;font:750 10px ui-monospace,monospace;letter-spacing:.025em;cursor:pointer}',
  '.cl-hypothesis-button.primary{border-color:#e9ba6a;background:linear-gradient(125deg,#f5d18a,#d89b42);color:#251a08}',
  '.cl-hypothesis-button.quiet{border-color:#8bb7cb24;background:transparent;color:#91a9b6}',
  '.cl-hypothesis-button:hover{filter:brightness(1.12)}.cl-hypothesis-button:focus-visible{outline:2px solid #8ae9ff;outline-offset:3px}',
  '.cl-hypothesis-note{margin:13px 0 0;padding-top:10px;border-top:1px solid #8bb7cb1c;color:#7796a6;font-size:9px;line-height:1.7}',
  '@media(max-width:640px){.cl-hypothesis{padding:15px;border-radius:14px}.cl-hypothesis-grid{grid-template-columns:1fr}.cl-hypothesis-actions{display:grid;grid-template-columns:1fr}.cl-hypothesis-button{width:100%;min-height:44px}}',
  '@media(prefers-reduced-motion:reduce){.cl-hypothesis-button{transition:none!important;animation:none!important}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabHypothesis = '0.18.0';
style.textContent = css;
document.head.append(style);

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const host = make('section', 'cl-hypothesis');
host.setAttribute('aria-labelledby', 'cl-hypothesis-title');
host.setAttribute('aria-live', 'polite');
const anchor = document.querySelector('.bottom-grid');
const footer = document.querySelector('.app-footer') || document.querySelector('footer');
if (anchor && typeof anchor.after === 'function') anchor.after(host);
else if (footer && typeof footer.before === 'function') footer.before(host);
else return;

function token() {
  try {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}
function clone(value) {
  try { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  catch { return null; }
}
function validRecord(record) {
  return !!record &&
    typeof record.id === 'string' &&
    typeof record.level === 'string' && record.level.length > 0 &&
    typeof record.won === 'boolean' &&
    Number.isFinite(Date.parse(record.at));
}
function readRecords() {
  try {
    const rows = ledger.getSnapshot();
    return Array.isArray(rows) ? rows.filter(validRecord).slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  } catch { return []; }
}
function summary(record) {
  const hasSeconds = record.seconds !== null && record.seconds !== '' && Number.isFinite(Number(record.seconds)) && Number(record.seconds) >= 0;
  const hasDevices = record.devices !== null && record.devices !== '' && Number.isInteger(Number(record.devices)) && Number(record.devices) >= 0;
  return {
    id: String(record.id).slice(0, 100),
    at: new Date(Date.parse(record.at)).toISOString(),
    level: String(record.level).slice(0, 100),
    won: record.won === true,
    grade: String(record.grade || '—').slice(0, 3),
    seconds: hasSeconds ? Number(record.seconds) : null,
    devices: hasDevices ? Number(record.devices) : null
  };
}
function latestPair(records = readRecords()) {
  for (const current of records) {
    const previous = records.find(record =>
      record.id !== current.id &&
      record.level === current.level &&
      Date.parse(record.at) <= Date.parse(current.at)
    );
    if (previous) return { previous, current };
  }
  return null;
}
function proposalForPair(pair) {
  if (!pair || !validRecord(pair.previous) || !validRecord(pair.current) ||
      pair.previous.level !== pair.current.level || pair.previous.id === pair.current.id) return null;
  const previous = summary(pair.previous);
  const current = summary(pair.current);
  let title, question, change, observe;
  if (!previous.won && !current.won) {
    title = 'Изолируй один участок';
    question = 'Изменится ли результат, если изменить одну деталь, не трогая остальные?';
    change = 'Оставь остальные устройства и настройки без изменений. Сдвинь одну выбранную деталь на один шаг или немного измени её угол.';
    observe = 'Сравни доставку (успех/неудача), время до исхода и события контактов/срабатываний в инженерном журнале.';
  } else if (!previous.won && current.won) {
    title = 'Проверь воспроизводимость успеха';
    question = 'Повторяется ли успешная доставка при той же конструкции?';
    change = 'Не меняй схему перед следующим запуском. Сначала повтори последнюю успешную конфигурацию без изменений.';
    observe = 'Сравни исход и время. Если успех повторится, только затем попробуй изменить одну деталь.';
  } else if (previous.won && !current.won) {
    title = 'Проверь одну причину регрессии';
    question = 'Вернёт ли один контролируемый откат успешную доставку?';
    change = 'Верни одну деталь к последнему успешному варианту; все остальные положения и настройки оставь как есть.';
    observe = 'Проверь исход и события контактов/срабатываний. Запиши, что изменилось, а не угадывай причину по одному результату.';
  } else if (
    (Number.isFinite(previous.seconds) && Number.isFinite(current.seconds) && current.seconds < previous.seconds) ||
    (Number.isInteger(previous.devices) && Number.isInteger(current.devices) && current.devices < previous.devices)
  ) {
    title = 'Подтверди улучшенную схему';
    question = 'Сохраняется ли выигрыш времени или числа устройств при повторе?';
    change = 'Повтори последнюю успешную конструкцию без изменений. Не оптимизируй её до подтверждения, что результат воспроизводится.';
    observe = 'Сравни доставку, время и число устройств с текущей базой. Один повтор — наблюдение, не доказательство.';
  } else {
    title = 'Найди минимальное безопасное изменение';
    question = 'Можно ли улучшить результат, изменив ровно одну переменную?';
    change = 'Сохрани рабочую конструкцию. Убери одну неключевую деталь или сдвинь её на один шаг — выбери только одно вмешательство.';
    observe = 'Сначала проверь успешную доставку; затем сравни время, число устройств и инженерные события.';
  }
  return {
    schema: SCHEMA,
    schemaVersion: 1,
    level: current.level,
    baselineId: current.id,
    previous,
    baseline: current,
    proposal: { title, question, change, observe },
    limitation: 'Предложение построено по итогам и сводным показателям двух записей. Оно не определяет истинную причину и не проверяет фактическое изменение конструкции.'
  };
}
function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA || raw.schemaVersion !== 1) return null;
  if (!['planned', 'observed'].includes(raw.status) || typeof raw.level !== 'string' ||
      typeof raw.baselineId !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      !raw.proposal || typeof raw.proposal.title !== 'string') return null;
  const p = {
    schema: SCHEMA,
    schemaVersion: 1,
    planId: String(raw.planId || '').slice(0, 100),
    status: raw.status,
    level: raw.level.slice(0, 100),
    baselineId: raw.baselineId.slice(0, 100),
    createdAt: new Date(Date.parse(raw.createdAt)).toISOString(),
    previous: validRecord(raw.previous) ? summary(raw.previous) : null,
    baseline: validRecord(raw.baseline) ? summary(raw.baseline) : null,
    proposal: {
      title: String(raw.proposal.title).slice(0, 120),
      question: String(raw.proposal.question || '').slice(0, 300),
      change: String(raw.proposal.change || '').slice(0, 500),
      observe: String(raw.proposal.observe || '').slice(0, 500)
    },
    limitation: String(raw.limitation || '').slice(0, 500)
  };
  if (raw.observedAt && Number.isFinite(Date.parse(raw.observedAt))) p.observedAt = new Date(Date.parse(raw.observedAt)).toISOString();
  if (validRecord(raw.result)) p.result = summary(raw.result);
  if (raw.observation && typeof raw.observation === 'object') {
    const allowedOutcomes = ['unchanged', 'recovered', 'regressed'];
    p.observation = {
      outcome: allowedOutcomes.includes(raw.observation.outcome) ? raw.observation.outcome : 'unchanged',
      secondsDelta: typeof raw.observation.secondsDelta === 'number' && Number.isFinite(raw.observation.secondsDelta) ? raw.observation.secondsDelta : null,
      devicesDelta: typeof raw.observation.devicesDelta === 'number' && Number.isInteger(raw.observation.devicesDelta) ? raw.observation.devicesDelta : null,
      limitation: 'Игра фиксирует следующую запись после плана, но не проверяет, что менялся только один параметр.'
    };
  }
  return p;
}
function readPlan() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizePlan(JSON.parse(raw));
  } catch { /* fall back to the in-memory copy if storage is blocked */ }
  return clone(memoryPlan);
}
function savePlan(plan) {
  memoryPlan = clone(plan);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch { /* session-local fallback */ }
  return clone(plan);
}
function clearPlan() {
  memoryPlan = null;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional storage */ }
  render();
}
function reconcilePlan(records = readRecords()) {
  const plan = readPlan();
  if (!plan || plan.status !== 'planned') return plan;
  const createdMs = Date.parse(plan.createdAt);
  const candidates = records
    .filter(record => record.level === plan.level && record.id !== plan.baselineId && Date.parse(record.at) >= createdMs)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (!candidates.length) return plan;
  const result = summary(candidates[0]);
  const baseline = plan.baseline || {};
  const secondsDelta = Number.isFinite(baseline.seconds) && Number.isFinite(result.seconds)
    ? Math.round((result.seconds - baseline.seconds) * 100) / 100 : null;
  const devicesDelta = Number.isInteger(baseline.devices) && Number.isInteger(result.devices)
    ? result.devices - baseline.devices : null;
  const outcome = baseline.won === result.won ? 'unchanged' : result.won ? 'recovered' : 'regressed';
  return savePlan({
    ...plan,
    status: 'observed',
    observedAt: result.at,
    result,
    observation: {
      outcome,
      secondsDelta,
      devicesDelta,
      recordedAfterPlan: true,
      limitation: 'Это следующая сохранённая запись того же протокола. Игра не проверяет, что была изменена только предложенная переменная.'
    }
  });
}
function metric(label, value) {
  const node = make('span', 'cl-hypothesis-metric');
  node.append(make('span', '', label), make('b', '', value));
  return node;
}
function actionButton(label, variant, handler) {
  const button = make('button', 'cl-hypothesis-button' + (variant ? ' ' + variant : ''), label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}
function renderHeader(statusText) {
  const header = make('div', 'cl-hypothesis-head');
  header.append(make('p', 'cl-hypothesis-eyebrow', 'CASCADE LAB / HYPOTHESIS LAB'));
  header.append(make('span', 'cl-hypothesis-badge', statusText));
  return header;
}
function heading(text) { const node = make('h3', '', text); node.id = 'cl-hypothesis-title'; return node; }
function renderPlan(plan) {
  host.append(renderHeader(plan.status === 'planned' ? 'ПЛАН ЗАФИКСИРОВАН' : 'НАБЛЮДЕНИЕ ПОЛУЧЕНО'));
  host.append(heading(plan.status === 'planned' ? 'Твой следующий эксперимент.' : 'Сначала наблюдение. Потом вывод.'));
  host.append(make('p', 'cl-hypothesis-lead', plan.proposal.title + ' · ' + plan.proposal.question));
  const grid = make('div', 'cl-hypothesis-grid');
  const step = make('article', 'cl-hypothesis-card');
  step.append(make('span', '', plan.status === 'planned' ? 'ИЗМЕНИ ОДНО' : 'ПЛАНИРОВАННОЕ ВМЕШАТЕЛЬСТВО'));
  step.append(make('strong', '', plan.proposal.change));
  const observe = make('article', 'cl-hypothesis-card');
  observe.append(make('span', '', plan.status === 'planned' ? 'ЧТО ИЗМЕРИТЬ' : 'НА ЧТО СМОТРЕТЬ'));
  observe.append(make('strong', '', plan.proposal.observe));
  grid.append(step, observe);
  host.append(grid);
  if (plan.status === 'observed' && plan.result && plan.observation) {
    const outcomeText = plan.observation.outcome === 'unchanged'
      ? (plan.result.won ? 'Успех повторился' : 'Неудача повторилась')
      : plan.observation.outcome === 'recovered' ? 'Записан успех после плана' : 'Записана неудача после плана';
    const metrics = make('div', 'cl-hypothesis-metrics');
    metrics.append(metric('ИСХОД', outcomeText));
    if (plan.observation.secondsDelta !== null) {
      const d = plan.observation.secondsDelta;
      metrics.append(metric('ИЗМЕНЕНИЕ ВРЕМЕНИ', (d > 0 ? '+' : '') + d.toFixed(2).replace('.', ',') + ' с'));
    }
    if (plan.observation.devicesDelta !== null) {
      const d = plan.observation.devicesDelta;
      metrics.append(metric('ДЕТАЛИ', (d > 0 ? '+' : '') + String(d)));
    }
    host.append(metrics);
    host.append(make('p', 'cl-hypothesis-note', 'Запись после плана: ' + plan.result.level + ' · ' + plan.result.at + '. Это наблюдаемая разница, а не доказательство причины.'));
  } else {
    const baselineText = plan.baseline
      ? 'База: ' + (plan.baseline.won ? 'успех' : 'неудача') + ', время ' + (Number.isFinite(plan.baseline.seconds) ? plan.baseline.seconds.toFixed(2).replace('.', ',') + ' с' : 'нет замера') + ', устройств ' + (Number.isInteger(plan.baseline.devices) ? plan.baseline.devices : 'нет данных') + '.'
      : 'База зафиксирована из последней записи.';
    host.append(make('p', 'cl-hypothesis-note', baselineText + ' После следующей записи этого уровня план отметится как наблюдённый. Приложение не проверяет, что изменён ровно один параметр.'));
  }
  const actions = make('div', 'cl-hypothesis-actions');
  actions.append(actionButton('Экспорт плана JSON ↓', '', () => exportPlan(readPlan())));
  actions.append(actionButton(plan.status === 'planned' ? 'Отменить план' : 'Закрыть наблюдение', 'quiet', clearPlan));
  host.append(actions);
}
function exportPlan(plan) {
  if (!plan) return;
  try {
    const payload = { ...plan, export: { localOnly: true, uploaded: false, schema: SCHEMA }, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = make('a');
    link.href = url; link.download = 'cascade-lab-next-experiment.json'; link.hidden = true;
    host.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  } catch { /* export is optional; gameplay remains available */ }
}
function startPlan(pair = latestPair(readRecords())) {
  const draft = proposalForPair(pair);
  if (!draft) return null;
  const plan = {
    ...draft,
    planId: token(),
    status: 'planned',
    createdAt: new Date().toISOString()
  };
  const saved = savePlan(plan);
  render();
  return saved;
}
function render() {
  const records = readRecords();
  const plan = reconcilePlan(records);
  host.replaceChildren();
  if (plan && ['planned', 'observed'].includes(plan.status)) {
    renderPlan(plan);
    return;
  }
  host.append(renderHeader('ЛОКАЛЬНЫЙ ИНСТРУМЕНТ'));
  host.append(heading('Не угадывай. Проверь гипотезу.'));
  const pair = latestPair(records);
  if (!pair) {
    host.append(make('p', 'cl-hypothesis-lead', 'Сохрани две попытки одного протокола. После этого игра предложит следующий эксперимент на основе сравнения исхода, времени и числа устройств.'));
    host.append(make('p', 'cl-hypothesis-note', 'Рекомендации строятся по локальным результатам, не отправляются на сервер и не определяют истинную причину отказа.'));
    return;
  }
  const draft = proposalForPair(pair);
  host.append(make('p', 'cl-hypothesis-lead', draft.proposal.title + ' · ' + draft.proposal.question));
  const grid = make('div', 'cl-hypothesis-grid');
  const step = make('article', 'cl-hypothesis-card');
  step.append(make('span', '', 'СЛЕДУЮЩЕЕ ВМЕШАТЕЛЬСТВО'), make('strong', '', draft.proposal.change));
  const observe = make('article', 'cl-hypothesis-card');
  observe.append(make('span', '', 'ЧТО СРАВНИТЬ'), make('strong', '', draft.proposal.observe));
  grid.append(step, observe);
  host.append(grid);
  const actions = make('div', 'cl-hypothesis-actions');
  actions.append(actionButton('Зафиксировать план эксперимента ↗', 'primary', () => startPlan(pair)));
  host.append(actions);
  host.append(make('p', 'cl-hypothesis-note', 'План привязывается к последней попытке этого протокола. После следующей записи того же уровня появится наблюдаемое изменение. Одного опыта недостаточно, чтобы доказать причинность.'));
}
const publicApi = Object.freeze({
  version: '0.18.0',
  schema: SCHEMA,
  buildProposal: proposalForPair,
  latestPair: () => clone(latestPair(readRecords())),
  getPlan: () => clone(readPlan()),
  startPlan,
  reconcile: () => clone(reconcilePlan(readRecords())),
  clearPlan,
  render
});
try {
  Object.defineProperty(window, 'CASCADELAB018', { value: publicApi, configurable: false, enumerable: false, writable: false });
} catch { window.CASCADELAB018 = publicApi; }
const rows = document.querySelector('.cl-ledger-records');
if (rows && typeof MutationObserver === 'function') {
  new MutationObserver(() => render()).observe(rows, { childList: true, subtree: true });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
render();
})();