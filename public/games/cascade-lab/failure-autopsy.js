(() => {
'use strict';

const VERSION = '0.19.0';
const TOOL_NAMES = Object.freeze({
  spring: 'Пружина', fan: 'Вентилятор', belt: 'Конвейер',
  magnet: 'Магнит', switch: 'Контакт', bumper: 'Отбойник'
});
const ACTUATORS = new Set(Object.keys(TOOL_NAMES));
const text = (value, limit = 180) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const closeTo = (value, min, max) => Number.isFinite(value) && (value < min || value > max);

function diagnoseRun(snapshot = {}) {
  const s = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const t = s.telemetry && typeof s.telemetry === 'object' ? s.telemetry : {};
  const events = (Array.isArray(t.events) ? t.events : []).filter(e => e && typeof e === 'object').slice(-16);
  const devices = (Array.isArray(s.devices) ? s.devices : []).filter(d => d && ACTUATORS.has(d.type));
  const checkpoints = Array.isArray(s.checkpoints) ? s.checkpoints.filter(c => c && typeof c === 'object') : [];
  const reached = new Set(Array.isArray(s.checkpointsReached) ? s.checkpointsReached.map(String) : []);
  const missingCheckpoint = checkpoints.find(c => !reached.has(String(c.id)));
  const reason = text(s.reason, 220);
  const reasonLower = reason.toLocaleLowerCase('ru');
  const eventTypes = events.map(e => text(e.type, 48));
  const lastEvent = [...events].reverse().find(e => text(e.label || e.type, 180));
  const lastActuatorEvent = [...events].reverse().find(e => ACTUATORS.has(e.type));
  const lastActuator = lastActuatorEvent ? TOOL_NAMES[lastActuatorEvent.type] : null;
  const deviceTypesUsed = new Set(eventTypes.filter(type => ACTUATORS.has(type)));
  const unusedDevice = [...devices].reverse().find(d => !deviceTypesUsed.has(d.type));
  const time = number(s.timeSeconds);
  const x = number(s.position?.x), y = number(s.position?.y);
  const vx = number(s.velocity?.x), vy = number(s.velocity?.y);
  const impact = number(t.lastImpactSpeed);
  const deviceCount = number(s.deviceCount) ?? devices.length;
  const par = number(s.par);
  const parTime = number(s.parTime);
  const isWin = s.status === 'won';
  let title, evidence = [], hypothesis, nextTest, kind;

  if (isWin) {
    kind = 'success';
    if (Number.isFinite(par) && deviceCount > par) {
      title = 'Доставка есть — проверь минимальную сборку';
      evidence.push('Доставка подтверждена; установлено ' + deviceCount + ' деталей при ориентире ' + par + '.');
      if (unusedDevice) {
        nextTest = 'Убери только одну деталь «' + TOOL_NAMES[unusedDevice.type] + '», которая не появлялась в событиях активации, и запусти тот же протокол снова.';
        hypothesis = 'Возможно, эта деталь не нужна для данной траектории. Это проверка, а не установленный факт.';
      } else {
        nextTest = 'Повтори запуск без изменений как контроль, затем убери только одну деталь и сравни исход, время и число активированных устройств.';
        hypothesis = 'Часть конструкции может быть избыточной; журнал не доказывает, какая именно деталь лишняя.';
      }
    } else if (Number.isFinite(time) && Number.isFinite(parTime) && time > parTime) {
      title = 'Успех — ищем более точную траекторию';
      evidence.push('Груз достиг цели за ' + time.toFixed(2) + ' с; ориентир протокола — ' + parTime.toFixed(2) + ' с.');
      nextTest = 'Поверни только одно направляющее устройство' + (lastActuator ? ' («' + lastActuator + '»)' : '') + ' на один шаг (45°), затем сравни время и исход.';
      hypothesis = 'Один угол может сократить путь или убрать лишнее движение. Знак эффекта заранее неизвестен.';
    } else {
      title = 'Успешный запуск — закрепи контрольный результат';
      evidence.push('Симуляция подтвердила доставку. Успех не требует перестройки ради самой перестройки.');
      nextTest = 'Запусти ту же конструкцию ещё раз без изменений. Сравни время и класс: так проверяется воспроизводимость результата.';
      hypothesis = 'Повторяемость покажет, является ли полученный результат устойчивой отправной точкой для дальнейшей оптимизации.';
    }
    if (Number.isFinite(time)) evidence.push('Время: ' + time.toFixed(2) + ' с; активаций устройств: ' + (number(t.activations) ?? 'нет данных') + '.');
  } else if (Boolean(s.fragile) && (eventTypes.includes('damage') || reasonLower.includes('хрупкий') || reasonLower.includes('жёсткое приземление'))) {
    kind = 'impact';
    title = 'Удар оказался слишком жёстким';
    evidence.push('Физический движок зарегистрировал повреждение хрупкого груза после приземления.');
    evidence.push(Number.isFinite(impact) ? 'Скорость последнего зарегистрированного удара: ' + Math.round(impact) + ' px/s; порог повреждения в этом протоколе — свыше 560 px/s.' : 'В журнале есть событие повреждения, но точное значение удара недоступно.');
    hypothesis = 'Импульс на участке перед приземлением мог оказаться чрезмерным. По одному запуску нельзя доказать, какое устройство стало причиной.';
    nextTest = 'Измени только угол последнего активированного устройства' + (lastActuator ? ' («' + lastActuator + '»)' : '') + ' на один шаг (45°). Оставь расположение остальных деталей прежним и сравни скорость удара.';
  } else if ((reasonLower.includes('маршрут не завершён') || eventTypes.includes('goal-missed')) && missingCheckpoint) {
    kind = 'checkpoint';
    title = 'Контрольная точка осталась позади';
    evidence.push('Не отмечено прохождение обязательной точки «' + text(missingCheckpoint.label, 100) + '».');
    evidence.push('Положение груза в конце запуска: ' + (Number.isFinite(x) ? Math.round(x) : '—') + ', ' + (Number.isFinite(y) ? Math.round(y) : '—') + ' px.');
    hypothesis = 'Груз мог прийти к финишу, не пересекая центр сканера. Игра подтверждает пропуск точки, но не доказывает конкретную ошибку устройства.';
    nextTest = 'Измени только угол последнего активированного устройства' + (lastActuator ? ' («' + lastActuator + '»)' : '') + ' на один шаг (45°), чтобы проверить проход через «' + text(missingCheckpoint.label, 100) + '». Другие настройки не меняй.';
  } else if (Number(s.gateCount) > 0 && !s.gateOpen && devices.some(d => d.type === 'switch')) {
    kind = 'gate';
    title = 'Контакт не открыл шлюз';
    evidence.push('К моменту завершения попытки шлюз оставался закрыт; в конструкции установлен контактный переключатель.');
    if (s.switchZone && Number.isFinite(number(s.switchZone.x)) && Number.isFinite(number(s.switchZone.y))) {
      evidence.push('Зона контакта протокола находится около ' + Math.round(s.switchZone.x) + ', ' + Math.round(s.switchZone.y) + ' px.');
    }
    hypothesis = 'Груз мог не приблизиться к переключателю на необходимое расстояние до ворот. Это вероятная проверка, не доказанная причина.';
    nextTest = 'Перемести только «Контакт» примерно на 12 px ближе к фактической траектории груза перед воротами. Не меняй другие детали и повтори запуск.';
  } else if (eventTypes.includes('fall') || reasonLower.includes('покинул трассу') || closeTo(x, 0, 1000) || closeTo(y, 0, 560)) {
    kind = 'fall';
    title = 'Груз вышел за пределы трассы';
    evidence.push('Последнее зарегистрированное положение: x=' + (Number.isFinite(x) ? Math.round(x) : '—') + ' px, y=' + (Number.isFinite(y) ? Math.round(y) : '—') + ' px.');
    if (Number.isFinite(vx) && Number.isFinite(vy)) evidence.push('Вектор скорости в момент завершения: Vx ' + Math.round(vx) + ' · Vy ' + Math.round(vy) + ' px/s.');
    if (Number(s.gateCount) > 0 && !s.gateOpen) evidence.push('Шлюз к концу запуска также оставался закрыт.');
    hypothesis = lastActuator ? 'В журнале последним активировалось устройство «' + lastActuator + '». Его вклад стоит проверить первым, но последовательность событий не доказывает причинность.' : 'Журнал не содержит явного активированного устройства перед сходом с трассы; сначала просмотри повтор запуска.';
    nextTest = 'Открой повтор и найди последний контакт перед сходом. Поверни только одно направляющее устройство' + (lastActuator ? ' («' + lastActuator + '»)' : '') + ' на один шаг (45°); остальные детали оставь без изменений.';
  } else if (eventTypes.includes('timeout') || reasonLower.includes('время симуляции истекло') || (Number.isFinite(time) && time >= 28)) {
    kind = 'timeout';
    title = 'Траектория не завершилась за лимит времени';
    evidence.push('Симуляция длилась ' + (Number.isFinite(time) ? time.toFixed(2) + ' с' : 'неизвестное время') + '; лимит протокола — 28 с.');
    if (Number.isFinite(x) && Number.isFinite(y)) evidence.push('Последнее положение груза: ' + Math.round(x) + ', ' + Math.round(y) + ' px.');
    hypothesis = 'Конструкция могла застрять или не передать груз на следующий участок. Снимок событий показывает итог, но не устанавливает точную причину.';
    nextTest = 'Измени только положение одного устройства, которое должно передать груз дальше' + (lastActuator ? ' (начни с «' + lastActuator + '»)' : '') + ': сдвинь его на 12 px вдоль ожидаемого направления движения. Остальное оставь неизменным.';
  } else {
    kind = 'review';
    title = 'Недостаточно сигнала для точного диагноза';
    evidence.push(reason || 'В журнале не найден специфический сигнал отказа.');
    if (lastEvent) evidence.push('Последнее событие: ' + text(lastEvent.label || lastEvent.type, 120) + '.');
    hypothesis = 'Автоматический разбор не должен угадывать причину без достаточных данных.';
    nextTest = 'Просмотри повтор и найди последний контакт груза с механизмом. Затем измени только одно устройство на один шаг, сохранив остальные параметры.';
  }

  if (reason && !evidence.some(item => item.includes(reason))) evidence.unshift('Сообщение движка: ' + reason);
  const recentEvents = events.slice(-4).map(event => ({
    label: text(event.label || event.type || 'Событие', 100),
    type: text(event.type || 'event', 32),
    time: number(event.t)
  }));
  return Object.freeze({
    version: VERSION, status: isWin ? 'won' : 'lost', kind, title,
    evidence: Object.freeze(evidence.slice(0, 3)), hypothesis, nextTest,
    recentEvents: Object.freeze(recentEvents),
    disclaimer: 'Наблюдаемая последовательность событий не доказывает причинность. Меняй одну переменную за раз.',
    exportText: [
      'CASCADE LAB / FAILURE AUTOPSY ' + VERSION,
      (isWin ? 'РЕЗУЛЬТАТ' : 'РАЗБОР ОТКАЗА') + ': ' + title,
      'Протокол: ' + text(s.levelTitle, 100) + ' (#' + (number(s.levelId) ?? '—') + ')',
      'Наблюдения: ' + evidence.join(' '),
      'Гипотеза: ' + hypothesis,
      'Следующий тест: ' + nextTest,
      'Оговорка: Наблюдаемая последовательность событий не доказывает причинность.'
    ].join('\n')
  });
}

if (typeof window === 'undefined' || !window.document) {
  globalThis.__CASCADELAB019_TEST__ = Object.freeze({ diagnoseRun });
  return;
}

const css = [
  '.cl-autopsy{width:min(680px,100%);margin:0 auto 10px;text-align:left;border:1px solid #7fc9e63b;border-radius:11px;background:linear-gradient(140deg,#0b1e2bf0,#07121bf5);box-shadow:0 12px 32px #0004,inset 0 1px #ffffff09;overflow:hidden}',
  '.cl-autopsy-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 11px;border-bottom:1px solid #8dc8e21c;color:#6bdcff;font:8px ui-monospace,monospace;letter-spacing:.14em}',
  '.cl-autopsy-state{padding:3px 6px;border:1px solid #84bdd12b;border-radius:4px;color:#91d8ec;font-size:7px;letter-spacing:.06em}',
  '.cl-autopsy-state.is-fail{border-color:#ff9b8b51;color:#ffb6a5}.cl-autopsy summary{display:block;padding:9px 11px;cursor:pointer;list-style:none}.cl-autopsy summary::-webkit-details-marker{display:none}',
  '.cl-autopsy-summary-title{display:flex;justify-content:space-between;align-items:start;gap:10px;color:#eaf5fa;font:650 12px/1.35 system-ui,sans-serif}.cl-autopsy-chevron{color:#88b4c6;font:12px ui-monospace,monospace;transition:transform .15s}.cl-autopsy details[open] .cl-autopsy-chevron{transform:rotate(90deg)}',
  '.cl-autopsy-summary-test{display:block;max-width:100%;margin-top:4px;color:#a2bdca;font:9px/1.45 system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.cl-autopsy-body{max-height:220px;overflow:auto;padding:0 11px 10px;scrollbar-color:#385b6d #08141f}.cl-autopsy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
  '.cl-autopsy-card{min-width:0;padding:8px;border:1px solid #8db7cb21;border-radius:7px;background:#06111b}.cl-autopsy-card small,.cl-autopsy-test-label{display:block;color:#6e9aad;font:7px ui-monospace,monospace;letter-spacing:.1em}.cl-autopsy-card p{margin:5px 0 0!important;color:#b1c8d4!important;font:9px/1.5 system-ui,sans-serif!important;text-align:left!important}',
  '.cl-autopsy-test{margin-top:7px;padding:8px 9px;border-left:2px solid #e9ba6a;border-radius:0 6px 6px 0;background:#e9ba6a0b;color:#dfebf1;font:9px/1.55 system-ui,sans-serif}.cl-autopsy-test p{margin:4px 0 0!important;color:#e2edf2!important;font-size:10px!important}',
  '.cl-autopsy-events{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.cl-autopsy-event{padding:4px 6px;border:1px solid #80bbd123;border-radius:4px;color:#829eac;font:7px/1.3 ui-monospace,monospace}',
  '.cl-autopsy-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:7px;color:#617f8e;font:7px/1.4 ui-monospace,monospace}.cl-autopsy-copy{min-height:27px;padding:0 8px;border:1px solid #7cc9e638;border-radius:6px;background:#0b2635;color:#a7e8ff;font:8px system-ui,sans-serif}.cl-autopsy-copy:hover{border-color:#e9ba6a;color:#ffe1a0}.cl-autopsy-copy-status{flex:1;min-width:100px}',
  '@media(max-width:650px){.canvas-overlay:has(.cl-autopsy details[open]){overflow-y:auto;justify-content:flex-start;padding:10px}.canvas-overlay:has(.cl-autopsy details[open]) .result-kicker{margin-top:5px}.cl-autopsy{margin-bottom:8px}.cl-autopsy summary{padding:8px}.cl-autopsy-summary-title{font-size:10px}.cl-autopsy-summary-test{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.cl-autopsy-body{max-height:115px;padding:0 8px 8px}.cl-autopsy-grid{grid-template-columns:1fr}.cl-autopsy-card{padding:7px}.cl-autopsy-card p,.cl-autopsy-test p{font-size:9px!important}.cl-autopsy-events{display:none}.cl-autopsy-foot{margin-top:6px}.cl-autopsy-copy{min-height:25px}}',
  '@media(prefers-reduced-motion:reduce){.cl-autopsy-chevron{transition:none}}'
].join('');
const style = document.createElement('style');
style.dataset.cascadeLabAutopsyStyles = VERSION;
style.textContent = css;
document.head.append(style);

const make = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const overlay = document.getElementById('resultOverlay');
const actions = overlay?.querySelector('.result-actions');
if (!overlay || !actions) return;
const panel = make('section', 'cl-autopsy');
panel.setAttribute('aria-label', 'Инженерный разбор последнего запуска');
const head = make('header', 'cl-autopsy-head');
head.append(make('span', '', 'CASCADE LAB / FAILURE AUTOPSY'));
const state = make('span', 'cl-autopsy-state', 'ЛОКАЛЬНЫЙ РАЗБОР');
head.append(state);
const details = make('details', 'cl-autopsy-details');
const summary = make('summary');
const summaryTitle = make('span', 'cl-autopsy-summary-title');
const summaryText = make('strong', '', 'Ожидание результата симуляции');
const chevron = make('span', 'cl-autopsy-chevron', '›');
summaryTitle.append(summaryText, chevron);
const summaryTest = make('span', 'cl-autopsy-summary-test', 'После запуска здесь появятся доказательства и следующий тест.');
summary.append(summaryTitle, summaryTest);
const body = make('div', 'cl-autopsy-body');
const grid = make('div', 'cl-autopsy-grid');
const evidenceCard = make('article', 'cl-autopsy-card');
evidenceCard.append(make('small', '', 'ЧТО НАБЛЮДАЛ ДВИЖОК'));
const evidenceText = make('p', '');
evidenceCard.append(evidenceText);
const hypothesisCard = make('article', 'cl-autopsy-card');
hypothesisCard.append(make('small', '', 'ГИПОТЕЗА · НЕ ФАКТ'));
const hypothesisText = make('p', '');
hypothesisCard.append(hypothesisText);
grid.append(evidenceCard, hypothesisCard);
const testBlock = make('div', 'cl-autopsy-test');
testBlock.append(make('span', 'cl-autopsy-test-label', 'ОДИН СЛЕДУЮЩИЙ ТЕСТ'));
const testText = make('p', '');
testBlock.append(testText);
const eventList = make('div', 'cl-autopsy-events');
const foot = make('footer', 'cl-autopsy-foot');
const footNote = make('span', 'cl-autopsy-copy-status', 'Данные анализируются только в этом браузере.');
const copyButton = make('button', 'cl-autopsy-copy', 'Скопировать план');
copyButton.type = 'button';
foot.append(footNote, copyButton);
body.append(grid, testBlock, eventList, foot);
details.append(summary, body);
panel.append(head, details);
actions.before(panel);
let latestReport = null;

function renderRun(snapshot) {
  latestReport = diagnoseRun(snapshot);
  const failed = latestReport.status !== 'won';
  state.textContent = failed ? 'ЗАПУСК НЕ УДАЛСЯ' : 'ДОСТАВКА ПОДТВЕРЖДЕНА';
  state.classList.toggle('is-fail', failed);
  summaryText.textContent = latestReport.title;
  summaryTest.textContent = 'Следующий тест: ' + latestReport.nextTest;
  evidenceText.textContent = latestReport.evidence.join(' ');
  hypothesisText.textContent = latestReport.hypothesis;
  testText.textContent = latestReport.nextTest;
  eventList.replaceChildren();
  if (latestReport.recentEvents.length) {
    for (const event of latestReport.recentEvents) {
      const label = event.label + (Number.isFinite(event.time) ? ' · ' + event.time.toFixed(2) + ' с' : '');
      eventList.append(make('span', 'cl-autopsy-event', label));
    }
  } else {
    eventList.append(make('span', 'cl-autopsy-event', 'Нет дополнительных событий'));
  }
  details.open = failed && window.matchMedia('(min-width: 651px)').matches;
  footNote.textContent = latestReport.disclaimer;
}
copyButton.addEventListener('click', async () => {
  if (!latestReport) return;
  try {
    await navigator.clipboard.writeText(latestReport.exportText);
    footNote.textContent = 'План скопирован. Данные не отправлялись.';
  } catch {
    try {
      const blob = new Blob([latestReport.exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = make('a');
      anchor.href = url;
      anchor.download = 'cascade-lab-next-test.txt';
      anchor.hidden = true;
      panel.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      footNote.textContent = 'План сохранён в TXT. Данные не отправлялись.';
    } catch {
      footNote.textContent = 'Не удалось скопировать; прочитай план выше.';
    }
  }
});
window.addEventListener('cascade-lab:run-finished', event => renderRun(event.detail || {}));
Object.defineProperty(window, 'CASCADELAB019', {
  value: Object.freeze({ version: VERSION, diagnoseRun, getLatestReport: () => latestReport }),
  configurable: false, enumerable: false, writable: false
});
})();