(() => {
  'use strict';
  const GAME_IDS = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid']);
  const STATES = new Set(['idle','loading','slow','document_loaded','ready','error','closed','unknown']);
  const CAPABILITY_KEYS = ['webgl','webgl2','gamepadApi','serviceWorkerAvailable','reducedMotion'];

  function cleanGameId(value) { return typeof value === 'string' && GAME_IDS.has(value) ? value : 'unknown'; }
  function cleanState(value) { return STATES.has(value) ? value : 'unknown'; }
  function coarseMs(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(120000, Math.round(n / 500) * 500);
  }
  function cleanObservation(item) {
    return { elapsedMs: coarseMs(item && item.elapsedMs), state: cleanState(item && item.state) };
  }
  function cleanBrowser(value) {
    const family = ['Chrome','Edge','Firefox','Safari','Other'].includes(value && value.family) ? value.family : 'Other';
    const rawMajor = Number(value && value.major);
    const major = Number.isInteger(rawMajor) && rawMajor >= 1 && rawMajor <= 999 ? rawMajor : null;
    return { family, major };
  }
  function buildReport(input = {}) {
    const capabilities = {};
    for (const key of CAPABILITY_KEYS) capabilities[key] = Boolean(input.capabilities && input.capabilities[key]);
    const observations = Array.isArray(input.observations) ? input.observations.slice(-20).map(cleanObservation) : [];
    const viewportClass = ['mobile','tablet','desktop','unknown'].includes(input.viewportClass) ? input.viewportClass : 'unknown';
    return {
      schema: 'osgard.play-support-report',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      surface: 'osgard-play-player',
      gameId: cleanGameId(input.gameId),
      launchState: cleanState(input.launchState),
      elapsedMs: coarseMs(input.elapsedMs),
      lastDocumentLoadMs: input.lastDocumentLoadMs == null ? null : coarseMs(input.lastDocumentLoadMs),
      viewportClass,
      browser: cleanBrowser(input.browser),
      online: Boolean(input.online),
      capabilities,
      observations
    };
  }

  if (typeof window !== 'undefined') window.OSGARDPlayerReliability = Object.freeze({ buildReport, cleanGameId, cleanState });
  if (typeof document === 'undefined') return;

  const dialog = document.getElementById('player-dialog');
  const frame = document.getElementById('player-frame');
  const status = document.getElementById('player-status');
  if (!dialog || !frame || !status) return;

  const hint = document.createElement('p');
  hint.id = 'player-reliability-hint';
  hint.className = 'player-reliability-hint';
  hint.hidden = true;
  hint.setAttribute('role', 'status');
  hint.setAttribute('aria-live', 'polite');
  status.insertAdjacentElement('afterend', hint);

  const tools = dialog.querySelector('.player-tools');
  let diagnosticsButton = null;
  if (tools) {
    diagnosticsButton = document.createElement('button');
    diagnosticsButton.type = 'button';
    diagnosticsButton.id = 'player-diagnostics-download';
    diagnosticsButton.className = 'player-reliability-action';
    diagnosticsButton.textContent = 'Скачать диагностику';
    diagnosticsButton.setAttribute('aria-label', 'Скачать локальный отчёт диагностики запуска игры');
    diagnosticsButton.title = 'Создать JSON-отчёт на этом устройстве; данные автоматически не отправляются';
    tools.insertBefore(diagnosticsButton, document.getElementById('player-close') || null);
  }

  let active = { gameId:'unknown', state:'idle', startedAt:0, lastDocumentLoadMs:null, sequence:0, observations:[], timer:0 };
  const now = () => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  function pushObservation(state) {
    active.observations.push({ elapsedMs:active.startedAt ? coarseMs(now() - active.startedAt) : 0, state:cleanState(state) });
    active.observations = active.observations.slice(-20);
  }
  function clearSlowTimer() { if (active.timer) clearTimeout(active.timer); active.timer = 0; }
  function showHint(message) { hint.textContent = message; hint.hidden = !message; }
  function transition(state) {
    const next = cleanState(state);
    if (next === active.state) return;
    active.state = next;
    pushObservation(next);
    if (next === 'ready' || next === 'error' || next === 'closed') {
      clearSlowTimer();
      if (next === 'ready') showHint('');
      if (next === 'error') showHint('Не удалось подтвердить готовность игры. Скачай диагностику и попробуй открыть игру отдельно.');
    }
  }
  function begin(gameId) {
    const id = cleanGameId(gameId);
    if (id === 'unknown') return;
    if (active.gameId === id && ['loading','slow','document_loaded'].includes(active.state)) return;
    clearSlowTimer();
    active = { gameId:id, state:'loading', startedAt:now(), lastDocumentLoadMs:null, sequence:active.sequence + 1, observations:[], timer:0 };
    pushObservation('loading');
    showHint('');
    const sequence = active.sequence;
    active.timer = setTimeout(() => {
      if (active.sequence !== sequence || !dialog.open || active.state === 'ready' || active.state === 'error') return;
      transition('slow');
      showHint('Запуск длится дольше обычного. Подожди ещё немного, затем попробуй повторить запуск или открыть игру отдельно.');
    }, 15000);
  }
  function observeStatus() {
    const state = String(status.dataset.state || '').toLowerCase();
    if (state === 'ready') { transition('ready'); return; }
    if (state === 'error') { transition('error'); return; }
    if (/не удалось|ошибк|timeout|failed|unavailable|не загруз/i.test(String(status.textContent || ''))) { transition('error'); return; }
    if ((state === 'loading' || state === 'starting') && active.gameId !== 'unknown') transition('loading');
  }
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a[data-play]') : null;
    if (target) begin(target.getAttribute('data-play'));
  }, true);
  frame.addEventListener('load', () => {
    if (!dialog.open || active.gameId === 'unknown') return;
    active.lastDocumentLoadMs = coarseMs(now() - active.startedAt);
    if (active.state !== 'ready' && active.state !== 'error') transition('document_loaded');
  });
  dialog.addEventListener('close', () => { clearSlowTimer(); transition('closed'); showHint(''); });
  if (typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      const dialogGame = cleanGameId(dialog.dataset.game);
      if (dialog.open && dialogGame !== 'unknown') {
        if (active.gameId !== dialogGame || active.state === 'idle' || active.state === 'closed') begin(dialogGame);
      } else if (!dialog.open && active.state !== 'idle' && active.state !== 'closed') {
        clearSlowTimer(); transition('closed'); showHint('');
      }
    }).observe(dialog, { attributes:true, attributeFilter:['open','data-game'] });
    new MutationObserver(observeStatus).observe(status, { attributes:true, attributeFilter:['data-state'], childList:true, characterData:true, subtree:true });
  }
  function detectBrowser() {
    const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
    let match = ua.match(/Edg\/(\d+)/); if (match) return { family:'Edge', major:Number(match[1]) };
    match = ua.match(/Firefox\/(\d+)/); if (match) return { family:'Firefox', major:Number(match[1]) };
    match = ua.match(/Chrome\/(\d+)/); if (match) return { family:'Chrome', major:Number(match[1]) };
    match = ua.match(/Version\/(\d+).+Safari/); if (match) return { family:'Safari', major:Number(match[1]) };
    return { family:'Other', major:null };
  }
  function detectCapabilities() {
    const result = { webgl:false, webgl2:false, gamepadApi:false, serviceWorkerAvailable:false, reducedMotion:false };
    try { const canvas = document.createElement('canvas'); result.webgl2 = Boolean(canvas.getContext('webgl2')); result.webgl = result.webgl2 || Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl')); } catch {}
    try { result.gamepadApi = typeof navigator.getGamepads === 'function'; } catch {}
    try { result.serviceWorkerAvailable = Boolean(navigator.serviceWorker); } catch {}
    try { result.reducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch {}
    return result;
  }
  function viewportClass() {
    const width = Number(window.innerWidth || 0);
    if (width > 0 && width <= 600) return 'mobile';
    if (width > 600 && width <= 1024) return 'tablet';
    return width > 1024 ? 'desktop' : 'unknown';
  }
  function reportInput() {
    return {
      gameId:active.gameId, launchState:active.state,
      elapsedMs:active.startedAt ? now() - active.startedAt : 0,
      lastDocumentLoadMs:active.lastDocumentLoadMs, viewportClass:viewportClass(),
      browser:detectBrowser(), online:typeof navigator !== 'undefined' ? navigator.onLine !== false : false,
      capabilities:detectCapabilities(), observations:active.observations
    };
  }
  function downloadReport() {
    if (typeof Blob === 'undefined' || !window.URL || typeof window.URL.createObjectURL !== 'function') {
      showHint('Этот браузер не поддерживает локальный экспорт диагностики.'); return false;
    }
    const report = window.OSGARDPlayerReliability.buildReport(reportInput());
    const url = window.URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type:'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'osgard-play-diagnostics-' + report.gameId + '.json'; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  }
  if (diagnosticsButton) diagnosticsButton.addEventListener('click', () => {
    if (downloadReport()) showHint('Диагностический отчёт сохранён на устройстве. Проверь его перед отправкой в поддержку: автоматической передачи нет.');
  });
  window.OSGARDPlayerReliabilityRuntime = Object.freeze({
    getState:() => ({ gameId:cleanGameId(active.gameId), launchState:cleanState(active.state), elapsedMs:active.startedAt ? coarseMs(now() - active.startedAt) : 0, observations:active.observations.map(item => ({ ...item })) }),
    downloadReport
  });
})();