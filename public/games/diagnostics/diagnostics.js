(() => {
  'use strict';

  const root = document.getElementById('diagnostics-app') || document.querySelector('[data-og-diagnostics]');
  if (!root) return;

  const $ = (selector) => document.querySelector(selector);
  const now = () => new Date().toISOString();
  const capabilityChecks = [
    { id: 'javascript-runtime', title: 'JavaScript runtime', description: 'Базовый JavaScript, необходимый для работы интерактивной витрины.', run: async () => ({ status: 'pass', detail: 'Сценарий диагностики запущен и выполняется.' }) },
    { id: 'secure-context', title: 'Защищённый контекст', description: 'Нужен для некоторых браузерных API. HTTPS обычно включает больше возможностей.', run: async () => ({ status: window.isSecureContext ? 'pass' : 'warn', detail: window.isSecureContext ? 'Браузер сообщает о защищённом контексте.' : 'Контекст не считается защищённым; часть API может быть недоступна.' }) },
    { id: 'webassembly', title: 'WebAssembly', description: 'Технология, которую используют некоторые тяжёлые игры и клиенты движков.', run: async () => ({ status: typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function' ? 'pass' : 'fail', detail: typeof WebAssembly === 'object' ? 'WebAssembly API обнаружен.' : 'WebAssembly API не обнаружен.' }) },
    { id: 'webgl2', title: 'Графика WebGL 2', description: 'Проверяет создание контекста. Не измеряет производительность видеокарты.', run: async () => { const ok = testWebGL('webgl2'); return { status: ok ? 'pass' : 'warn', detail: ok ? 'Контекст WebGL 2 создаётся.' : 'WebGL 2 недоступен или заблокирован настройками браузера.' }; } },
    { id: 'webgl1', title: 'Графика WebGL 1', description: 'Запасная возможность для старых или ограниченных графических сред.', run: async () => { const ok = testWebGL('webgl'); return { status: ok ? 'pass' : 'warn', detail: ok ? 'Контекст WebGL доступен.' : 'WebGL недоступен; 3D-игры могут не запускаться.' }; } },
    { id: 'local-storage', title: 'Локальное хранилище', description: 'Временная проверка чтения и записи локального состояния в этой вкладке.', run: async () => storageRoundTrip('localStorage', 'osgard.diagnostics.local.v1') },
    { id: 'session-storage', title: 'Хранилище вкладки', description: 'Проверяет чтение и запись данных только для текущего сеанса браузера.', run: async () => storageRoundTrip('sessionStorage', 'osgard.diagnostics.session.v1') },
    { id: 'indexed-db', title: 'IndexedDB', description: 'Проверяет, может ли браузер открыть и удалить тестовую локальную базу.', run: async () => indexedDbCheck() },
    { id: 'fullscreen-api', title: 'Полноэкранный режим', description: 'Проверяет наличие API. Войти в полный экран можно только после действия пользователя.', run: async () => ({ status: document.documentElement.requestFullscreen ? 'pass' : 'info', detail: document.documentElement.requestFullscreen ? 'Fullscreen API присутствует; браузер может требовать нажатия пользователя.' : 'Fullscreen API отсутствует в этой среде.' }) },
    { id: 'share-or-clipboard', title: 'Поделиться / копирование', description: 'Проверяет наличие системного меню обмена или API буфера обмена.', run: async () => { const share = typeof navigator.share === 'function'; const clipboard = Boolean(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'); return { status: share || clipboard ? 'pass' : 'info', detail: 'Web Share: ' + (share ? 'доступен' : 'нет') + '; Clipboard API: ' + (clipboard ? 'доступен' : 'нет') + '. Разрешение проверяется только при явном действии.' }; } },
    { id: 'pointer-events', title: 'Указатель и ввод', description: 'Проверяет современные события мыши, пера и других указателей.', run: async () => ({ status: 'PointerEvent' in window ? 'pass' : 'warn', detail: 'Pointer Events ' + ('PointerEvent' in window ? 'поддерживаются.' : 'не поддерживаются.') }) },
    { id: 'touch-capability', title: 'Сенсорный ввод', description: 'Информационная проверка; отсутствие сенсорного экрана на компьютере не является ошибкой.', run: async () => { const touch = Number(navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window); return { status: 'info', detail: touch ? 'Обнаружен сенсорный ввод.' : 'Сенсорный ввод не обнаружен; для компьютера это нормально.' }; } },
    { id: 'resize-observer', title: 'Адаптация размеров', description: 'ResizeObserver помогает интерфейсу реагировать на изменение размеров контейнеров.', run: async () => ({ status: 'ResizeObserver' in window ? 'pass' : 'warn', detail: 'ResizeObserver ' + ('ResizeObserver' in window ? 'доступен.' : 'недоступен; некоторые адаптивные компоненты могут ограничиваться.') }) },
    { id: 'intersection-observer', title: 'Отложенная загрузка', description: 'IntersectionObserver используется для ленивой загрузки элементов при прокрутке.', run: async () => ({ status: 'IntersectionObserver' in window ? 'pass' : 'warn', detail: 'IntersectionObserver ' + ('IntersectionObserver' in window ? 'доступен.' : 'недоступен; отдельные эффекты и загрузка могут работать иначе.') }) },
    { id: 'animation-frame', title: 'Плавная отрисовка', description: 'Проверяет наличие requestAnimationFrame, но не замеряет FPS.', run: async () => ({ status: typeof requestAnimationFrame === 'function' ? 'pass' : 'fail', detail: typeof requestAnimationFrame === 'function' ? 'requestAnimationFrame доступен.' : 'requestAnimationFrame отсутствует.' }) },
    { id: 'page-visibility', title: 'Состояние вкладки', description: 'Игра может ставить симуляцию на паузу при скрытии вкладки.', run: async () => ({ status: 'visibilityState' in document ? 'pass' : 'info', detail: 'Visibility API ' + ('visibilityState' in document ? 'доступен; сейчас: ' + document.visibilityState + '.' : 'недоступен.') }) },
    { id: 'web-audio', title: 'Звуковой API', description: 'Проверяет возможность создавать звук. Автоматически аудио не воспроизводится.', run: async () => { const ok = typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function'; return { status: ok ? 'pass' : 'info', detail: ok ? 'Web Audio API доступен; для воспроизведения браузер может ждать действие пользователя.' : 'Web Audio API отсутствует или отключён.' }; } },
    { id: 'service-worker', title: 'Оффлайн-основа', description: 'Проверяет API Service Worker; это не подтверждает, что конкретная игра уже закеширована.', run: async () => { const ok = 'serviceWorker' in navigator && window.isSecureContext; return { status: ok ? 'pass' : 'info', detail: ok ? 'Service Worker API доступен в защищённом контексте.' : 'Service Worker может быть недоступен в текущем контексте.' }; } },
    { id: 'reduced-motion', title: 'Настройки движения', description: 'Уважение системной настройки уменьшения анимации — информационная проверка.', run: async () => { const reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); return { status: 'info', detail: reduced ? 'Включено уменьшение анимации; интерфейс должен уважать настройку.' : 'Уменьшение анимации не запрошено системой.' }; } }
  ];

  const gameRoutes = [
    { id: 'game-null-shift', gameId: 'null-shift', title: 'NULL//SHIFT', route: '/games/null-shift-godot/', description: 'Тактический рейд и 3D-экшен.' },
    { id: 'game-time', gameId: 'time', title: 'Империя времени', route: '/games/time', description: 'Стратегия живого города.' },
    { id: 'game-swarm', gameId: 'swarm', title: 'SWARM', route: '/games/swarm/index.html', description: 'Кооперативная игра.' },
    { id: 'game-inherit', gameId: 'inherit', title: 'INHERIT', route: '/games/inherit/index.html', description: 'Исследование и наследие мира.' },
    { id: 'game-remix', gameId: 'remix', title: 'REMIX', route: '/games/remix/index.html', description: 'Создание и remix игровых сцен.' },
    { id: 'game-civic-cascade', gameId: 'civic-cascade', title: 'CIVIC CASCADE', route: '/games/civic-cascade/', description: 'Стратегия и управление кризисом.' },
    { id: 'game-patina', gameId: 'patina', title: 'PATINA Atelier', route: '/games/patina/', description: 'Ателье восстановления и исследования.' },
    { id: 'game-signal-run', gameId: 'signal-run', title: 'SIGNAL RUN', route: '/games/signal-run/', description: 'Аркадное испытание на реакцию.' },
    { id: 'game-cascade-lab', gameId: 'cascade-lab', title: 'CASCADE LAB', route: '/games/cascade-lab/', description: 'Физическая головоломка и эксперименты.' },
    { id: 'game-afterimage-run', gameId: 'afterimage-run', title: 'AFTERIMAGE//RUN', route: '/games/afterimage-run/', description: 'Забеги и сравнение времени.' },
    { id: 'game-aether-grid', gameId: 'aether-grid', title: 'AETHER GRID', route: '/games/aether-grid/', description: 'Ежедневная логическая головоломка.' },
    { id: 'game-heist-echo', gameId: 'heist-echo', title: 'HEIST//ECHO', route: '/games/heist-echo/', description: 'Тактическая симуляция, проверка маршрутов и разбор операции.' }
  ];

  const checks = capabilityChecks.map((item) => ({ ...item, group: 'device', category: 'device' }))
    .concat(gameRoutes.map((item) => ({
      ...item,
      group: 'game',
      category: 'game',
      run: async () => {
        const response = await fetch(item.route, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          headers: { Accept: 'text/html' },
          signal: AbortSignal.timeout(8000)
        });
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok) return { status: 'fail', detail: 'HTTP ' + response.status + ' при запросе ' + item.route + '.' };
        if (!contentType.toLowerCase().includes('text/html')) return { status: 'warn', detail: 'Маршрут ответил HTTP ' + response.status + ', но content-type не похож на HTML: ' + contentType.slice(0, 80) + '.' };
        return { status: 'pass', detail: 'Страница отвечает HTTP ' + response.status + ' и возвращает HTML. Это не проверка запуска игрового движка.' };
      }
    })));

  const statusNames = { pass: 'Работает', warn: 'Ограничено', fail: 'Проблема', info: 'Информация', running: 'Проверка…', pending: 'Ожидает' };
  const results = new Map();
  const startedAt = new Map();
  let activeFilter = 'all';
  let filterQuery = '';
  let busy = false;
  const grid = $('#check-grid');
  const runAllButton = $('#run-all');
  const rerunButton = $('#rerun-problems');
  const exportJsonButton = $('#export-json');
  const exportCsvButton = $('#export-csv');
  const copyButton = $('#copy-summary');
  const clearButton = $('#clear-results');
  const liveStatus = $('#live-status');

  function testWebGL(kind) {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext(kind, { failIfMajorPerformanceCaveat: false, powerPreference: 'low-power' });
      if (!context) return false;
      const extension = context.getExtension('WEBGL_lose_context');
      if (extension) extension.loseContext();
      return true;
    } catch { return false; }
  }

  function storageRoundTrip(name, key) {
    try {
      const storage = window[name];
      if (!storage) return { status: 'warn', detail: 'Хранилище недоступно.' };
      const value = 'test-' + Math.random().toString(36).slice(2, 10);
      storage.setItem(key, value);
      const actual = storage.getItem(key);
      storage.removeItem(key);
      return actual === value
        ? { status: 'pass', detail: 'Запись, чтение и удаление тестового ключа прошли успешно; исходные пользовательские данные не тронуты.' }
        : { status: 'warn', detail: 'Хранилище ответило, но контрольное значение не совпало.' };
    } catch (error) {
      return { status: 'warn', detail: 'Хранилище ограничено: ' + safeError(error) };
    }
  }

  function indexedDbCheck() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window) || !window.indexedDB) {
        resolve({ status: 'warn', detail: 'IndexedDB недоступна.' });
        return;
      }
      const name = 'osgard-diagnostics-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      let settled = false;
      const finish = (result) => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
      const timer = setTimeout(() => finish({ status: 'warn', detail: 'Проверка IndexedDB превысила лимит времени.' }), 3000);
      let request;
      try { request = indexedDB.open(name, 1); }
      catch (error) { finish({ status: 'warn', detail: 'IndexedDB: ' + safeError(error) }); return; }
      request.onupgradeneeded = () => { try { request.result.createObjectStore('probe'); } catch {} };
      request.onerror = () => finish({ status: 'warn', detail: 'Не удалось открыть тестовую IndexedDB: ' + safeError(request.error) });
      request.onblocked = () => finish({ status: 'warn', detail: 'Удаление тестовой базы было заблокировано браузером.' });
      request.onsuccess = () => {
        try { request.result.close(); } catch {}
        const deletion = indexedDB.deleteDatabase(name);
        deletion.onsuccess = () => finish({ status: 'pass', detail: 'Тестовая база успешно открыта, закрыта и удалена.' });
        deletion.onerror = () => finish({ status: 'warn', detail: 'Базу удалось открыть, но удалить тестовую базу не удалось.' });
      };
    });
  }

  function safeError(error) {
    const name = error && typeof error.name === 'string' ? error.name : 'Error';
    const message = error && typeof error.message === 'string' ? error.message : '';
    return (name + (message ? ': ' + message : '')).slice(0, 180);
  }

  function safeText(value) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 180);
  }

  function visibleChecks() {
    const q = filterQuery.toLocaleLowerCase('ru').trim();
    return checks.filter((item) => {
      const result = results.get(item.id);
      if (activeFilter === 'games' && item.group !== 'game') return false;
      if (activeFilter === 'problems' && !(result && ['fail', 'warn'].includes(result.status))) return false;
      if (!q) return true;
      return (item.title + ' ' + item.description + ' ' + (item.route || '')).toLocaleLowerCase('ru').includes(q);
    });
  }

  function resultFor(item) {
    return results.get(item.id) || { status: 'pending', detail: 'Эта проверка ещё не запускалась.', durationMs: null };
  }

  function render() {
    if (!grid) return;
    const visible = visibleChecks();
    grid.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = activeFilter === 'problems' ? 'Проблем не найдено среди завершённых проверок.' : 'По вашему запросу ничего не найдено.';
      grid.append(empty);
    }
    visible.forEach((item) => {
      const result = resultFor(item);
      const article = document.createElement('article');
      article.className = 'check-card';
      article.dataset.checkId = item.id;
      article.dataset.status = result.status;
      const top = document.createElement('div'); top.className = 'card-top';
      const no = document.createElement('span'); no.className = 'check-no'; no.textContent = String(checks.indexOf(item) + 1).padStart(2, '0') + ' / 30';
      const badge = document.createElement('span'); badge.className = 'badge ' + result.status; badge.textContent = statusNames[result.status] || result.status;
      top.append(no, badge);
      const title = document.createElement('h3'); title.textContent = item.title;
      const description = document.createElement('p'); description.textContent = item.description;
      const detail = document.createElement('p'); detail.className = 'check-detail'; detail.textContent = result.detail;
      const footer = document.createElement('div'); footer.className = 'card-footer';
      const duration = document.createElement('span'); duration.className = 'duration'; duration.textContent = Number.isFinite(result.durationMs) ? result.durationMs + ' мс' : (item.group === 'game' ? item.route : item.category === 'device' ? 'ВОЗМОЖНОСТЬ БРАУЗЕРА' : '');
      const action = document.createElement('button'); action.type = 'button'; action.className = 'mini-btn'; action.textContent = result.status === 'running' ? 'Проверяем…' : 'Проверить';
      action.disabled = busy || result.status === 'running';
      action.addEventListener('click', () => runOne(item.id));
      footer.append(duration, action);
      article.append(top, title, description, detail, footer);
      grid.append(article);
    });
    const completed = Array.from(results.values()).filter((result) => result.status !== 'running').length;
    const pass = Array.from(results.values()).filter((result) => result.status === 'pass').length;
    const warn = Array.from(results.values()).filter((result) => result.status === 'warn').length;
    const fail = Array.from(results.values()).filter((result) => result.status === 'fail').length;
    const pending = checks.length - completed;
    $('#count-pass').textContent = String(pass);
    $('#count-warn').textContent = String(warn);
    $('#count-fail').textContent = String(fail);
    $('#count-pending').textContent = String(pending);
    $('#progress-count').textContent = completed + ' / ' + checks.length;
    $('#progress-label').textContent = busy ? 'Проверки выполняются' : (completed === 0 ? 'Ожидание запуска' : completed === checks.length ? 'Проверка завершена' : 'Частичный отчёт');
    $('#progress-fill').style.width = (completed / checks.length * 100) + '%';
    $('#progress').setAttribute('aria-valuenow', String(completed));
    $('#visible-count').textContent = visible.length + (visible.length === 1 ? ' проверка' : ' проверок');
    runAllButton.disabled = busy;
    rerunButton.disabled = busy || !Array.from(results.values()).some((result) => ['fail', 'warn'].includes(result.status));
    exportJsonButton.disabled = completed === 0 || busy;
    exportCsvButton.disabled = completed === 0 || busy;
    copyButton.disabled = completed === 0 || busy;
    clearButton.disabled = completed === 0 || busy;
    $('#run-metadata').textContent = completed === 0 ? 'Ожидает запуска · результаты ещё не собраны' : 'Последний запуск: ' + new Date().toLocaleTimeString();
  }

  async function runOne(id) {
    const item = checks.find((check) => check.id === id);
    if (!item || busy) return;
    busy = true;
    const started = performance.now();
    results.set(id, { status: 'running', detail: 'Выполняем проверку…', durationMs: null });
    render();
    try {
      const output = await item.run();
      results.set(id, { ...output, id: item.id, title: item.title, group: item.group, route: item.route || null, durationMs: Math.max(0, Math.round(performance.now() - started)), checkedAt: now() });
    } catch (error) {
      results.set(id, { status: 'fail', detail: safeError(error), id: item.id, title: item.title, group: item.group, route: item.route || null, durationMs: Math.max(0, Math.round(performance.now() - started)), checkedAt: now() });
    }
    busy = false;
    render();
    liveStatus.textContent = item.title + ': ' + (statusNames[resultFor(item).status] || resultFor(item).status) + '.';
  }

  async function runMany(list) {
    if (busy || !list.length) return;
    if (list.length === checks.length) results.clear();
    busy = true;
    liveStatus.textContent = 'Выполняется ' + list.length + ' проверок. Результаты остаются локально.';
    render();
    let cursor = 0;
    const workers = Array.from({ length: Math.min(4, list.length) }, async () => {
      while (cursor < list.length) {
        const item = list[cursor++];
        const started = performance.now();
        results.set(item.id, { status: 'running', detail: 'Выполняем проверку…', durationMs: null });
        render();
        try {
          const output = await item.run();
          results.set(item.id, { ...output, id: item.id, title: item.title, group: item.group, route: item.route || null, durationMs: Math.max(0, Math.round(performance.now() - started)), checkedAt: now() });
        } catch (error) {
          results.set(item.id, { status: 'fail', detail: safeError(error), id: item.id, title: item.title, group: item.group, route: item.route || null, durationMs: Math.max(0, Math.round(performance.now() - started)), checkedAt: now() });
        }
        render();
      }
    });
    await Promise.all(workers);
    busy = false;
    const pass = Array.from(results.values()).filter((result) => result.status === 'pass').length;
    const warn = Array.from(results.values()).filter((result) => result.status === 'warn').length;
    const fail = Array.from(results.values()).filter((result) => result.status === 'fail').length;
    liveStatus.textContent = 'Завершено: ' + pass + ' работает, ' + warn + ' с ограничениями, ' + fail + ' проблем. Информационные подсказки не считаются ошибками.';
    $('#export-status').textContent = 'Отчёт хранится только в памяти этой страницы до закрытия или очистки.';
    render();
  }

  function buildReport() {
    const records = checks.filter((item) => results.has(item.id)).map((item) => ({ ...itemMeta(item), ...results.get(item.id) }));
    return {
      schema: 'osgard.play.diagnostics.v1',
      checkedAt: now(),
      page: '/games/diagnostics/',
      privacy: { automaticTransmission: false, analytics: false, cookiesCreatedByDiagnostics: false },
      environment: { secureContext: Boolean(window.isSecureContext), viewport: { width: window.innerWidth, height: window.innerHeight }, language: safeText(navigator.language || 'unknown'), devicePixelRatio: Number(window.devicePixelRatio || 1) },
      summary: {
        totalChecks: checks.length,
        completed: records.length,
        pass: records.filter((item) => item.status === 'pass').length,
        warn: records.filter((item) => item.status === 'warn').length,
        fail: records.filter((item) => item.status === 'fail').length,
        info: records.filter((item) => item.status === 'info').length,
        pending: checks.length - records.length
      },
      checks: records
    };
  }

  function itemMeta(item) { return { id: item.id, title: item.title, group: item.group, route: item.route || null, description: item.description }; }
  function formatSummary() {
    const report = buildReport();
    return [
      'OSGARD PLAY — отчёт о проверке совместимости',
      'Дата: ' + report.checkedAt,
      'Выполнено: ' + report.summary.completed + ' / ' + report.summary.totalChecks,
      'Работает: ' + report.summary.pass + '; ограничено: ' + report.summary.warn + '; проблемы: ' + report.summary.fail + '; информация: ' + report.summary.info + '; ожидание: ' + report.summary.pending,
      '',
      ...report.checks.map((item) => String(item.status).toUpperCase() + ' — ' + item.title + ': ' + safeText(item.detail))
    ].join('\n');
  }

  function download(name, mime, text) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.style.display = 'none';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function csvCell(value) {
    const string = value == null ? '' : String(value);
    return '"' + string.replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
  }

  async function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(text); return true; } catch {}
    }
    const field = document.createElement('textarea');
    field.value = text; field.readOnly = true;
    field.style.position = 'fixed'; field.style.opacity = '0'; field.style.left = '-9999px';
    document.body.append(field); field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    field.remove();
    return copied;
  }

  runAllButton.addEventListener('click', () => runMany(checks));
  rerunButton.addEventListener('click', () => runMany(checks.filter((item) => { const result = results.get(item.id); return result && ['fail', 'warn'].includes(result.status); })));
  $('#print-report').addEventListener('click', () => window.print());
  $('#check-search').addEventListener('input', (event) => { filterQuery = safeText(event.target.value); render(); });
  document.querySelectorAll('[data-check-filter]').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.checkFilter;
    document.querySelectorAll('[data-check-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  exportJsonButton.addEventListener('click', () => {
    const report = buildReport();
    if (!report.summary.completed) return;
    download('osgard-play-diagnostics.json', 'application/json;charset=utf-8', JSON.stringify(report, null, 2));
    $('#export-status').textContent = 'JSON-отчёт скачан на устройство.';
  });
  exportCsvButton.addEventListener('click', () => {
    const records = buildReport().checks;
    if (!records.length) return;
    const rows = [['id','title','group','status','durationMs','route','detail'], ...records.map((item) => [item.id,item.title,item.group,item.status,item.durationMs,item.route,item.detail])];
    download('osgard-play-diagnostics.csv', 'text/csv;charset=utf-8', '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'));
    $('#export-status').textContent = 'CSV-отчёт скачан на устройство.';
  });
  copyButton.addEventListener('click', async () => {
    const ok = await copyText(formatSummary());
    $('#export-status').textContent = ok ? 'Сводка скопирована. Отправьте её в поддержку только если хотите.' : 'Копирование заблокировано браузером; воспользуйтесь JSON или CSV.';
  });
  clearButton.addEventListener('click', () => {
    results.clear();
    liveStatus.textContent = 'Результаты очищены из памяти этой страницы.';
    $('#export-status').textContent = 'Отчёт очищен. Никакое сетевое событие не отправлялось.';
    render();
  });

  window.OSGARDDiagnostics = Object.freeze({
    version: '1.0.0',
    totalChecks: checks.length,
    checkIds: Object.freeze(checks.map((item) => item.id)),
    runAll: () => runMany(checks),
    getReport: buildReport
  });
  render();
})();