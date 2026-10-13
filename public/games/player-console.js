(() => {
  'use strict';

  if (window.OSGARDPlayerConsole) return;

  const KEY = Object.freeze({
    stats: 'osgard.games.player-console.v1',
    queue: 'osgard.games.player-console.queue.v1',
    settings: 'osgard.games.player-console.settings.v1',
    favorites: 'osgard.games.favorites.v1',
    recent: 'osgard.games.recent.v1'
  });
  const MAX_QUEUE = 5;
  const MAX_LOG = 1000;
  const MAX_IMPORT_BYTES = 100 * 1024;
  const VALID_SCALE = new Set(['0.9', '1', '1.1', '1.2']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeRead = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  const dateKey = (value = Date.now()) => new Date(value).toISOString().slice(0, 10);
  const escapeId = value => String(value || '').replace(/[^a-z0-9-]/gi, '').slice(0, 48);

  function getGames() {
    return $$('.card[data-game]').map(card => {
      const link = $('a[data-play]', card);
      const id = escapeId(card.dataset.game);
      if (!id || !link) return null;
      let href;
      try {
        const url = new URL(link.getAttribute('href') || link.href, location.origin);
        if (url.origin !== location.origin) return null;
        href = url.pathname + url.search + url.hash;
      } catch { return null; }
      const tags = $$('.tags span', card).map(node => node.textContent.trim()).filter(Boolean);
      const genres = String(card.dataset.genres || '').split(/\s+/).filter(Boolean);
      return { id, title: (card.dataset.title || $('h3', card)?.textContent || id).trim(), href, genres, tags, card };
    }).filter(Boolean);
  }

  const gameMap = () => new Map(getGames().map(game => [game.id, game]));
  const cleanIds = (value, limit = 100) => {
    const valid = gameMap();
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && valid.has(id)))].slice(0, limit) : [];
  };
  function loadStats() {
    const raw = safeRead(KEY.stats, {});
    const valid = gameMap();
    const launches = Array.isArray(raw.launches) ? raw.launches.filter(row =>
      row && typeof row === 'object' && valid.has(row.game) &&
      typeof row.at === 'string' && Number.isFinite(Date.parse(row.at))
    ).slice(-MAX_LOG) : [];
    const secondsByGame = {};
    if (raw.secondsByGame && typeof raw.secondsByGame === 'object' && !Array.isArray(raw.secondsByGame)) {
      for (const [id, value] of Object.entries(raw.secondsByGame)) {
        if (valid.has(id) && Number.isFinite(value) && value >= 0) secondsByGame[id] = Math.min(30 * 86400, value);
      }
    }
    const completions = {};
    if (raw.completions && typeof raw.completions === 'object' && !Array.isArray(raw.completions)) {
      for (const [id, value] of Object.entries(raw.completions)) {
        if (valid.has(id) && Number.isInteger(value) && value >= 0) completions[id] = Math.min(100000, value);
      }
    }
    return { schema: 1, launches, secondsByGame, completions };
  }
  function loadQueue() { return cleanIds(safeRead(KEY.queue, []), MAX_QUEUE); }
  function loadSettings() {
    const raw = safeRead(KEY.settings, {});
    return {
      reduceMotion: typeof raw.reduceMotion === 'boolean' ? raw.reduceMotion : !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      highContrast: raw.highContrast === true,
      scale: VALID_SCALE.has(String(raw.scale)) ? String(raw.scale) : '1'
    };
  }

  let stats = loadStats();
  let queue = loadQueue();
  let settings = loadSettings();
  let activeGame = '';
  let activeAt = 0;
  let lastTick = Date.now();
  let lastStatsSave = 0;
  let currentRouteResults = [];
  let pendingInstallPrompt = null;
  const validGamesAtBoot = new Set(getGames().map(game => game.id));

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'og-pc-launcher';
  trigger.id = 'og-pc-launcher';
  trigger.textContent = 'ПУЛЬТ ИГРОКА ↗';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'og-pc-dialog');

  const dialog = document.createElement('dialog');
  dialog.id = 'og-pc-dialog';
  dialog.className = 'og-pc-dialog';
  dialog.setAttribute('aria-labelledby', 'og-pc-title');
  dialog.innerHTML = [
    '<div class="og-pc-shell">',
    '<header class="og-pc-head"><div><p class="og-pc-eyebrow">OSGARD PLAY / PLAYER LAB</p><h2 id="og-pc-title">Пульт игрока</h2><p class="og-pc-subtitle">Личная полка, диагностика браузера и перенос данных. Всё хранится локально.</p></div>',
    '<button class="og-pc-close" type="button" data-pc-close aria-label="Закрыть пульт игрока" title="Закрыть">×</button></header>',
    '<nav class="og-pc-tabs" role="tablist" aria-label="Разделы пульта игрока">',
    '<button type="button" role="tab" id="og-pc-tab-overview" aria-controls="og-pc-panel-overview" aria-selected="true" data-pc-tab="overview">Обзор</button>',
    '<button type="button" role="tab" id="og-pc-tab-queue" aria-controls="og-pc-panel-queue" aria-selected="false" data-pc-tab="queue" tabindex="-1">Очередь</button>',
    '<button type="button" role="tab" id="og-pc-tab-diagnostics" aria-controls="og-pc-panel-diagnostics" aria-selected="false" data-pc-tab="diagnostics" tabindex="-1">Диагностика</button>',
    '<button type="button" role="tab" id="og-pc-tab-data" aria-controls="og-pc-panel-data" aria-selected="false" data-pc-tab="data" tabindex="-1">Данные и доступность</button>',
    '</nav>',
    '<p class="og-pc-status" role="status" aria-live="polite" data-pc-status>Готово. Статистика видна только в этом браузере.</p>',
    '<section class="og-pc-panel" id="og-pc-panel-overview" role="tabpanel" aria-labelledby="og-pc-tab-overview" data-pc-panel="overview">',
    '<div class="og-pc-metrics"><article><small>ОТКРЫТИЯ ИГР</small><strong data-pc-launch-count>0</strong></article><article><small>РАЗНЫЕ ИГРЫ</small><strong data-pc-unique-count>0</strong></article><article><small>ВРЕМЯ ОКНА ИГРЫ</small><strong data-pc-time>0 мин</strong></article><article><small>ДНЕЙ С АКТИВНОСТЬЮ</small><strong data-pc-days>0</strong></article></div>',
    '<div class="og-pc-block"><div class="og-pc-block-head"><div><h3>Следующий мир</h3><p>Подборка строится по играм, которые ещё не открывались на этом устройстве.</p></div></div><div data-pc-next class="og-pc-next"><span>Открой любую игру, чтобы построить личную подборку.</span></div></div>',
    '<div class="og-pc-block"><div class="og-pc-block-head"><div><h3>Личный маршрут недели</h3><p>Цель — познакомиться с тремя жанрами. Прогресс считается по открытым играм, а не по выдуманным рейтингам.</p></div><b class="og-pc-progress-label" data-pc-challenge-count>0/3</b></div><div class="og-pc-progress"><span data-pc-challenge-fill></span></div><p class="og-pc-muted" data-pc-challenge-copy>Открывай игры разных жанров в течение недели.</p></div>',
    '<div class="og-pc-block"><h3>Локальные достижения</h3><div class="og-pc-badges" data-pc-badges></div></div>',
    '<div class="og-pc-actions"><button type="button" class="og-pc-action og-pc-primary" data-pc-open-next>Открыть следующую игру ↗</button><button type="button" class="og-pc-action" data-pc-tab-open="queue">К игровой очереди</button></div>',
    '</section>',
    '<section class="og-pc-panel" id="og-pc-panel-queue" role="tabpanel" aria-labelledby="og-pc-tab-queue" data-pc-panel="queue" hidden>',
    '<div class="og-pc-block-head"><div><h3>Очередь до пяти игр</h3><p>Собери последовательность и запускай игру за игрой. Порядок хранится локально.</p></div><button type="button" class="og-pc-action" data-pc-clear-queue>Очистить очередь</button></div>',
    '<ol class="og-pc-queue" data-pc-queue></ol><p class="og-pc-empty" data-pc-queue-empty>Очередь пока пуста. Используй кнопку «В очередь» на карточке игры.</p>',
    '<div class="og-pc-actions"><button type="button" class="og-pc-action og-pc-primary" data-pc-play-next>Запустить первую в очереди ↗</button><button type="button" class="og-pc-action" data-pc-tab-open="overview">Вернуться к обзору</button></div>',
    '</section>',
    '<section class="og-pc-panel" id="og-pc-panel-diagnostics" role="tabpanel" aria-labelledby="og-pc-tab-diagnostics" data-pc-panel="diagnostics" hidden>',
    '<div class="og-pc-block-head"><div><h3>Проверка каталога</h3><p>Проверяется HTTP-доступность адреса игры на текущем домене. Это не гарантирует, что игровой движок и все ресурсы загрузятся.</p></div><button type="button" class="og-pc-action og-pc-primary" data-pc-scan>Проверить адреса</button></div>',
    '<p class="og-pc-muted" data-pc-scan-status>Проверка не запускалась.</p><div class="og-pc-route-results" data-pc-route-results></div>',
    '<div class="og-pc-block"><div class="og-pc-block-head"><div><h3>Возможности устройства</h3><p>Только локальная диагностика; данные на сервер не отправляются.</p></div><button type="button" class="og-pc-action" data-pc-refresh-diag>Обновить</button></div><div class="og-pc-diagnostics" data-pc-capabilities></div></div>',
    '<div class="og-pc-actions"><button type="button" class="og-pc-action" data-pc-export-support>Скачать диагностический отчёт JSON</button></div>',
    '</section>',
    '<section class="og-pc-panel" id="og-pc-panel-data" role="tabpanel" aria-labelledby="og-pc-tab-data" data-pc-panel="data" hidden>',
    '<div class="og-pc-block"><h3>Перенос личной полки</h3><p>Экспорт включает только идентификаторы игр, историю и настройки. Он не включает email, телефон, invite-коды, токены входа или серверную аналитику.</p><div class="og-pc-actions"><button type="button" class="og-pc-action og-pc-primary" data-pc-export>Экспортировать мои данные</button><button type="button" class="og-pc-action" data-pc-import>Импортировать JSON</button><input type="file" accept="application/json,.json" data-pc-file hidden></div><p class="og-pc-muted" data-pc-data-status></p></div>',
    '<div class="og-pc-block"><h3>Доступность интерфейса</h3><label class="og-pc-switch"><input type="checkbox" data-pc-motion><span><b>Уменьшить анимацию</b><small>Не меняет механику игр. Учитывается системная настройка при первом запуске.</small></span></label><label class="og-pc-switch"><input type="checkbox" data-pc-contrast><span><b>Повышенный контраст</b><small>Усиливает границы, текст и фокусные состояния.</small></span></label><label class="og-pc-scale">Размер текста пульта<select data-pc-scale><option value="0.9">90%</option><option value="1">100%</option><option value="1.1">110%</option><option value="1.2">120%</option></select></label></div>',
    '<div class="og-pc-block"><h3>Удаление локальной полки</h3><p>Удаляются история, очередь, избранное и профиль этой консоли. Согласие на аналитику и другие настройки сайта не меняются.</p><button type="button" class="og-pc-action og-pc-danger" data-pc-clear-data>Удалить локальные игровые данные</button></div>',
    '<p class="og-pc-legal">Пульт не подключает рекламные сети и не отправляет локальные показатели наружу. Проверки маршрутов обращаются только к адресу OSGARD текущего сайта.</p>',
    '</section>',
    '<footer class="og-pc-foot"><span>PLAYER LAB / LOCAL-FIRST</span><span>?</span><span>OSGARD WORLD GAMING</span></footer>',
    '</div>'
  ].join('');

  function setStatus(message, kind = '') {
    const node = $('[data-pc-status]', dialog);
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }
  function persistStats() {
    stats.launches = stats.launches.slice(-MAX_LOG);
    if (!safeWrite(KEY.stats, stats)) setStatus('Хранилище браузера недоступно: изменения остаются только до закрытия страницы.', 'warning');
  }
  function persistQueue() {
    queue = cleanIds(queue, MAX_QUEUE);
    safeWrite(KEY.queue, queue);
    renderQueue();
  }
  function persistSettings() {
    safeWrite(KEY.settings, settings);
    document.documentElement.classList.toggle('og-pc-reduced-motion', settings.reduceMotion);
    document.documentElement.classList.toggle('og-pc-high-contrast', settings.highContrast);
    dialog.style.setProperty('--og-pc-scale', settings.scale);
    $('[data-pc-motion]', dialog).checked = settings.reduceMotion;
    $('[data-pc-contrast]', dialog).checked = settings.highContrast;
    $('[data-pc-scale]', dialog).value = settings.scale;
  }
  function visibleGenresForLog() {
    const valid = gameMap();
    const daysAgo = Date.now() - 7 * 86400000;
    const ids = new Set(stats.launches.filter(row => Date.parse(row.at) >= daysAgo).map(row => row.game));
    const genres = new Set();
    for (const id of ids) for (const genre of (valid.get(id)?.genres || [])) genres.add(genre);
    return genres;
  }
  function dateStreak() {
    const days = [...new Set(stats.launches.map(row => row.at.slice(0, 10)))].sort().reverse();
    if (!days.length) return 0;
    const today = dateKey();
    const yesterday = dateKey(Date.now() - 86400000);
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 0;
    let expected = days[0] === today ? Date.now() : Date.now() - 86400000;
    for (const day of days) {
      if (day === dateKey(expected)) {
        streak += 1;
        expected -= 86400000;
      } else if (day < dateKey(expected)) break;
    }
    return streak;
  }
  function localBadgeList(uniqueCount, genreCount) {
    const badges = [
      { title: 'Первый запуск', detail: 'Открыта хотя бы одна игра', ok: stats.launches.length >= 1 },
      { title: 'Исследователь', detail: 'Открыты три разные игры', ok: uniqueCount >= 3 },
      { title: 'Разные миры', detail: 'Попробованы три жанра за неделю', ok: genreCount >= 3 },
      { title: 'Постоянство', detail: 'Активность в три разных календарных дня', ok: new Set(stats.launches.map(row => row.at.slice(0, 10))).size >= 3 },
      { title: 'Длинная сессия', detail: '20 минут с открытым игровым окном', ok: Object.values(stats.secondsByGame).reduce((sum, value) => sum + value, 0) >= 1200 }
    ];
    const wrap = $('[data-pc-badges]', dialog);
    wrap.replaceChildren();
    badges.forEach(badge => {
      const item = document.createElement('div');
      item.className = 'og-pc-badge' + (badge.ok ? ' is-earned' : '');
      const mark = document.createElement('span');
      mark.textContent = badge.ok ? '✦' : '◇';
      mark.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      const title = document.createElement('b');
      title.textContent = badge.title;
      const detail = document.createElement('small');
      detail.textContent = badge.detail;
      copy.append(title, detail);
      item.append(mark, copy);
      wrap.append(item);
    });
  }
  function renderNextGame() {
    const games = getGames();
    const played = new Set(stats.launches.map(row => row.game));
    const last = stats.launches[stats.launches.length - 1]?.game;
    const favorites = new Set(cleanIds(safeRead(KEY.favorites, [])));
    const next = games.filter(game => !played.has(game.id)).sort((a, b) => {
      const af = favorites.has(a.id) ? 1 : 0, bf = favorites.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      return a.title.localeCompare(b.title, 'ru');
    })[0] || games.find(game => game.id !== last) || games[0];
    const slot = $('[data-pc-next]', dialog);
    slot.replaceChildren();
    if (!next) {
      const note = document.createElement('span');
      note.textContent = 'В каталоге пока нет доступных игр.';
      slot.append(note);
      return;
    }
    const copy = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = next.title;
    const why = document.createElement('small');
    why.textContent = played.has(next.id) ? 'Предлагаем вернуться к этому миру.' : 'Ещё не открывалась на этом устройстве.';
    copy.append(name, why);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'og-pc-action';
    open.textContent = 'Открыть';
    open.addEventListener('click', () => launchGame(next.id));
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'og-pc-action';
    add.textContent = 'В очередь';
    add.addEventListener('click', () => addToQueue(next.id));
    slot.append(copy, open, add);
  }
  function renderOverview() {
    const unique = new Set(stats.launches.map(row => row.game)).size;
    const seconds = Object.values(stats.secondsByGame).reduce((sum, value) => sum + value, 0);
    const days = new Set(stats.launches.map(row => row.at.slice(0, 10))).size;
    $('[data-pc-launch-count]', dialog).textContent = String(stats.launches.length);
    $('[data-pc-unique-count]', dialog).textContent = String(unique);
    $('[data-pc-time]', dialog).textContent = Math.floor(seconds / 60) + ' мин';
    $('[data-pc-days]', dialog).textContent = String(days);
    const genres = visibleGenresForLog().size;
    $('[data-pc-challenge-count]', dialog).textContent = Math.min(genres, 3) + '/3';
    $('[data-pc-challenge-fill]', dialog).style.width = Math.min(100, genres / 3 * 100) + '%';
    $('[data-pc-challenge-copy]', dialog).textContent = genres >= 3 ? 'Маршрут недели выполнен: три жанра уже открыты.' : 'Осталось попробовать жанров: ' + (3 - genres) + '. Прогресс основан на запусках этой консоли.';
    localBadgeList(unique, genres);
    renderNextGame();
  }
  function renderQueue() {
    const list = $('[data-pc-queue]', dialog);
    const empty = $('[data-pc-queue-empty]', dialog);
    list.replaceChildren();
    queue = cleanIds(queue, MAX_QUEUE);
    const games = gameMap();
    queue.forEach((id, index) => {
      const game = games.get(id);
      if (!game) return;
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'og-pc-queue-name';
      const strong = document.createElement('b');
      strong.textContent = String(index + 1).padStart(2, '0') + ' / ' + game.title;
      const path = document.createElement('small');
      path.textContent = game.genres.join(' · ') || game.tags.slice(0, 2).join(' · ') || 'OSGARD PLAY';
      name.append(strong, path);
      const actions = document.createElement('span');
      actions.className = 'og-pc-queue-controls';
      const up = document.createElement('button');
      up.type = 'button'; up.textContent = '↑'; up.title = 'Выше'; up.setAttribute('aria-label', 'Переместить ' + game.title + ' выше'); up.disabled = index === 0;
      up.addEventListener('click', () => moveQueue(index, -1));
      const down = document.createElement('button');
      down.type = 'button'; down.textContent = '↓'; down.title = 'Ниже'; down.setAttribute('aria-label', 'Переместить ' + game.title + ' ниже'); down.disabled = index === queue.length - 1;
      down.addEventListener('click', () => moveQueue(index, 1));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = '×'; remove.title = 'Убрать из очереди'; remove.setAttribute('aria-label', 'Убрать ' + game.title + ' из очереди');
      remove.addEventListener('click', () => { queue = queue.filter(value => value !== id); persistQueue(); setStatus(game.title + ' удалена из очереди.'); });
      actions.append(up, down, remove);
      item.append(name, actions);
      list.append(item);
    });
    empty.hidden = queue.length > 0;
    $('[data-pc-play-next]', dialog).disabled = queue.length === 0;
    $('[data-pc-clear-queue]', dialog).disabled = queue.length === 0;
  }
  function addToQueue(id) {
    const game = gameMap().get(id);
    if (!game) return;
    if (queue.includes(id)) { setStatus(game.title + ' уже находится в очереди.'); switchTab('queue'); return; }
    if (queue.length >= MAX_QUEUE) { setStatus('Очередь заполнена: максимум пять игр. Удали одну перед добавлением.', 'warning'); switchTab('queue'); return; }
    queue.push(id);
    persistQueue();
    setStatus(game.title + ' добавлена в очередь.');
  }
  function moveQueue(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= queue.length) return;
    const next = [...queue];
    [next[index], next[target]] = [next[target], next[index]];
    queue = next;
    persistQueue();
    const focusButton = $('[data-pc-queue] li:nth-child(' + (target + 1) + ') button');
    focusButton?.focus();
  }
  function launchGame(id) {
    const game = gameMap().get(id);
    if (!game) { setStatus('Игра отсутствует в текущем каталоге.', 'warning'); return; }
    setStatus('Открываем ' + game.title + '…');
    dialog.close();
    if (window.OSGARDGames && typeof window.OSGARDGames.open === 'function') window.OSGARDGames.open(id, game.href);
    else location.href = game.href;
  }
  function playQueueHead() {
    const id = queue[0];
    if (!id) { setStatus('Очередь пуста.'); return; }
    queue = queue.slice(1);
    persistQueue();
    launchGame(id);
  }
  function shareGame(id) {
    const game = gameMap().get(id);
    if (!game) { setStatus('Игра не найдена.'); return; }
    const url = new URL(game.href, location.origin);
    url.searchParams.set('utm_source', 'osgard_play');
    url.searchParams.set('utm_medium', 'player_console');
    url.searchParams.set('utm_campaign', 'game_discovery');
    url.searchParams.set('utm_content', id);
    const shareData = { title: game.title + ' — OSGARD PLAY', text: 'Попробуй ' + game.title + ' в OSGARD PLAY.', url: url.href };
    if (navigator.share) {
      navigator.share(shareData).then(() => setStatus('Ссылка на ' + game.title + ' отправлена через системное меню.'), error => {
        if (error && error.name === 'AbortError') setStatus('Отправка ссылки отменена.');
        else copyUrl(url.href, game.title);
      });
    } else copyUrl(url.href, game.title);
  }
  async function copyUrl(url, title) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus('Ссылка на ' + title + ' скопирована.');
        return;
      }
    } catch {}
    setStatus('Копирование недоступно. Можно открыть игру отдельно или скопировать ссылку из адресной строки.', 'warning');
  }
  async function checkRoute(game) {
    const route = new URL(game.href, location.origin);
    if (route.origin !== location.origin) return { id: game.id, title: game.title, status: 'blocked', detail: 'Внешний адрес не проверяется.' };
    const attempt = async method => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        return await fetch(route.href, { method, cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      } finally { clearTimeout(timer); }
    };
    try {
      let response = await attempt('HEAD');
      if (response.status === 405 || response.status === 501) response = await attempt('GET');
      return { id: game.id, title: game.title, status: response.ok ? 'ok' : 'http-error', detail: 'HTTP ' + response.status + ' · ' + (response.ok ? 'адрес отвечает' : 'проверь маршрут') };
    } catch (error) {
      return { id: game.id, title: game.title, status: 'error', detail: error && error.name === 'AbortError' ? 'Тайм-аут 6 с' : 'Нет ответа от текущего домена' };
    }
  }
  function showRouteResults(results) {
    const container = $('[data-pc-route-results]', dialog);
    container.replaceChildren();
    results.forEach(row => {
      const item = document.createElement('div');
      item.className = 'og-pc-route ' + row.status;
      const name = document.createElement('b'); name.textContent = row.title;
      const detail = document.createElement('small'); detail.textContent = row.detail;
      item.append(name, detail); container.append(item);
    });
  }
  async function scanRoutes() {
    const button = $('[data-pc-scan]', dialog);
    button.disabled = true;
    $('[data-pc-scan-status]', dialog).textContent = 'Проверяем маршруты текущего сайта…';
    setStatus('Проверка адресов каталога запущена.');
    try {
      const games = getGames();
      const results = await Promise.all(games.map(checkRoute));
      currentRouteResults = results;
      showRouteResults(results);
      const ok = results.filter(row => row.status === 'ok').length;
      $('[data-pc-scan-status]', dialog).textContent = ok + '/' + results.length + ' адресов ответили HTTP успешно. Состояние движка этим не проверяется.';
      setStatus('Проверка маршрутов завершена: ' + ok + ' из ' + results.length + ' ответили успешно.', ok === results.length ? 'success' : 'warning');
    } finally { button.disabled = false; }
  }
  function getCapabilities() {
    let webgl2 = false;
    try { webgl2 = !!document.createElement('canvas').getContext('webgl2'); } catch {}
    const resources = performance.getEntriesByType ? performance.getEntriesByType('resource').filter(entry => {
      try { return new URL(entry.name).origin === location.origin; } catch { return false; }
    }) : [];
    const slow = resources.filter(entry => entry.duration > 1500).length;
    let memory = 'недоступно в этом браузере';
    const perfMemory = performance.memory;
    if (perfMemory && Number.isFinite(perfMemory.usedJSHeapSize)) memory = Math.round(perfMemory.usedJSHeapSize / 1048576) + ' МБ JS heap (приближённо)';
    const rows = [
      ['Соединение', navigator.onLine ? 'Онлайн' : 'Офлайн'],
      ['WebGL 2', webgl2 ? 'Поддерживается' : 'Не подтверждён'],
      ['Полный экран', document.fullscreenEnabled ? 'Доступен' : 'Недоступен или ограничен'],
      ['Системный шаринг', navigator.share ? 'Доступен' : 'Нет API'],
      ['Буфер обмена', navigator.clipboard?.writeText ? 'Доступен при разрешённом контексте' : 'Нет API'],
      ['Service Worker API', 'serviceWorker' in navigator ? 'Поддерживается' : 'Нет API'],
      ['Файловое хранилище', 'storage' in navigator && navigator.storage?.estimate ? 'Оценка доступна' : 'Оценка недоступна'],
      ['Ресурсы текущего сайта', resources.length + ' · медленных (>1,5 с): ' + slow],
      ['Память JavaScript', memory]
    ];
    return { rows, resourceCount: resources.length, slowResourceCount: slow, memory };
  }
  async function refreshDiagnostics() {
    const host = $('[data-pc-capabilities]', dialog);
    host.replaceChildren();
    const data = getCapabilities();
    if ('storage' in navigator && navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = Number.isFinite(estimate.usage) ? (estimate.usage / 1048576).toFixed(1) + ' МБ занято' : 'занято: н/д';
        const quota = Number.isFinite(estimate.quota) ? (estimate.quota / 1048576).toFixed(0) + ' МБ доступно по оценке' : 'лимит: н/д';
        data.rows.push(['Локальное хранилище', used + ' · ' + quota]);
      } catch { data.rows.push(['Локальное хранилище', 'Не удалось получить оценку']); }
    }
    data.rows.forEach(([label, value]) => {
      const row = document.createElement('div'); row.className = 'og-pc-diagnostic-row';
      const key = document.createElement('span'); key.textContent = label;
      const val = document.createElement('b'); val.textContent = value;
      row.append(key, val); host.append(row);
    });
  }
  function downloadJson(fileName, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportData() {
    const payload = {
      format: 'osgard-player-console', schema: 1, exportedAt: new Date().toISOString(),
      favorites: cleanIds(safeRead(KEY.favorites, [])),
      recent: cleanIds(safeRead(KEY.recent, []), 5), queue: [...queue],
      stats, settings
    };
    downloadJson('osgard-player-data-' + dateKey() + '.json', payload);
    $('[data-pc-data-status]', dialog).textContent = 'Экспорт подготовлен на этом устройстве. Проверь файл перед передачей: он содержит личную историю игр.';
  }
  function validateImportedStats(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.launches) || raw.launches.length > MAX_LOG) throw new Error('Некорректная история запусков.');
    const games = gameMap();
    const launches = raw.launches.filter(row => row && games.has(row.game) && typeof row.at === 'string' && Number.isFinite(Date.parse(row.at))).map(row => ({ game: row.game, at: new Date(row.at).toISOString() }));
    const secondsByGame = {};
    if (raw.secondsByGame && typeof raw.secondsByGame === 'object' && !Array.isArray(raw.secondsByGame)) {
      for (const [id, value] of Object.entries(raw.secondsByGame)) if (games.has(id) && Number.isFinite(value) && value >= 0 && value <= 30 * 86400) secondsByGame[id] = value;
    }
    const completions = {};
    if (raw.completions && typeof raw.completions === 'object' && !Array.isArray(raw.completions)) {
      for (const [id, value] of Object.entries(raw.completions)) if (games.has(id) && Number.isInteger(value) && value >= 0 && value <= 100000) completions[id] = value;
    }
    return { schema: 1, launches, secondsByGame, completions };
  }
  async function importData(file) {
    const output = $('[data-pc-data-status]', dialog);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { output.textContent = 'Файл слишком большой. Максимальный размер — 100 КБ.'; return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.format !== 'osgard-player-console' || parsed.schema !== 1) throw new Error('Формат файла или версия не поддерживаются.');
      const importedStats = validateImportedStats(parsed.stats);
      const importedQueue = cleanIds(parsed.queue, MAX_QUEUE);
      const importedFavorites = cleanIds(parsed.favorites);
      const importedRecent = cleanIds(parsed.recent, 5);
      const importedSettingsRaw = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
      const importedSettings = {
        reduceMotion: importedSettingsRaw.reduceMotion === true,
        highContrast: importedSettingsRaw.highContrast === true,
        scale: VALID_SCALE.has(String(importedSettingsRaw.scale)) ? String(importedSettingsRaw.scale) : '1'
      };
      stats = importedStats; queue = importedQueue; settings = importedSettings;
      safeWrite(KEY.favorites, importedFavorites);
      safeWrite(KEY.recent, importedRecent);
      persistStats(); persistQueue(); persistSettings();
      renderOverview();
      output.textContent = 'Импорт завершён. Приняты только известные идентификаторы игр и проверенные числовые поля.';
      setStatus('Локальные игровые данные восстановлены.');
    } catch (error) {
      output.textContent = (error instanceof Error ? error.message : 'Ошибка импорта') + ' Данные не загружены.';
    }
  }
  function clearLocalData() {
    if (!window.confirm('Удалить локальные избранное, историю, очередь и статистику пульта? Согласие на аналитику останется без изменений.')) return;
    for (const key of [KEY.stats, KEY.queue, KEY.favorites, KEY.recent]) {
      try { localStorage.removeItem(key); } catch {}
    }
    stats = { schema: 1, launches: [], secondsByGame: {}, completions: {} };
    queue = [];
    persistSettings();
    renderOverview();
    renderQueue();
    $('[data-pc-data-status]', dialog).textContent = 'Локальные игровые данные удалены. Согласие на аналитику не менялось.';
    setStatus('Локальная полка очищена.');
  }
  async function exportSupportReport() {
    const capabilities = getCapabilities();
    const report = {
      format: 'osgard-player-diagnostics', schema: 1, createdAt: new Date().toISOString(),
      currentPath: location.pathname, online: navigator.onLine,
      currentGame: escapeId($('#player-dialog')?.dataset.game || ''),
      gameCount: getGames().length, consoleStats: {
        launchCount: stats.launches.length,
        uniqueGames: new Set(stats.launches.map(row => row.game)).size,
        localQueueCount: queue.length
      },
      capabilities, routeChecks: currentRouteResults
    };
    downloadJson('osgard-player-diagnostics-' + dateKey() + '.json', report);
    setStatus('Локальный диагностический отчёт сохранён. Контакты, токены и параметры URL не включены.');
  }

  function switchTab(name) {
    const tabs = $$('[data-pc-tab]', dialog);
    tabs.forEach(tab => {
      const selected = tab.dataset.pcTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    $$('[data-pc-panel]', dialog).forEach(panel => { panel.hidden = panel.dataset.pcPanel !== name; });
    const focusTab = tabs.find(tab => tab.dataset.pcTab === name);
    focusTab?.focus();
  }
  function openConsole() {
    renderOverview(); renderQueue(); persistSettings(); void refreshDiagnostics();
    if (dialog.open) return;
    dialog.showModal();
    $('[data-pc-close]', dialog).focus();
  }
  function bindEvents() {
    trigger.addEventListener('click', openConsole);
    $('[data-pc-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $$('[data-pc-tab]', dialog).forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.pcTab)));
    $$('[data-pc-tab-open]', dialog).forEach(button => button.addEventListener('click', () => switchTab(button.dataset.pcTabOpen)));
    dialog.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !event.target.matches('[role="tab"]')) return;
      event.preventDefault();
      const tabs = $$('[role="tab"]', dialog);
      const index = tabs.indexOf(event.target);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      switchTab(next.dataset.pcTab);
    });
    $('[data-pc-open-next]', dialog).addEventListener('click', () => {
      const next = $('[data-pc-next] button');
      if (next) next.click(); else setStatus('Нет доступных игровых маршрутов.');
    });
    $('[data-pc-play-next]', dialog).addEventListener('click', playQueueHead);
    $('[data-pc-clear-queue]', dialog).addEventListener('click', () => { queue = []; persistQueue(); setStatus('Очередь очищена.'); });
    $('[data-pc-scan]', dialog).addEventListener('click', () => { void scanRoutes().catch(() => setStatus('Не удалось завершить проверку маршрутов.', 'warning')); });
    $('[data-pc-refresh-diag]', dialog).addEventListener('click', () => { void refreshDiagnostics(); });
    $('[data-pc-export-support]', dialog).addEventListener('click', () => void exportSupportReport());
    $('[data-pc-export]', dialog).addEventListener('click', exportData);
    $('[data-pc-import]', dialog).addEventListener('click', () => $('[data-pc-file]', dialog).click());
    $('[data-pc-file]', dialog).addEventListener('change', event => {
      void importData(event.target.files?.[0]);
      event.target.value = '';
    });
    $('[data-pc-clear-data]', dialog).addEventListener('click', clearLocalData);
    $('[data-pc-motion]', dialog).addEventListener('change', event => { settings.reduceMotion = event.target.checked; persistSettings(); setStatus('Настройка анимации сохранена локально.'); });
    $('[data-pc-contrast]', dialog).addEventListener('change', event => { settings.highContrast = event.target.checked; persistSettings(); });
    $('[data-pc-scale]', dialog).addEventListener('change', event => {
      const value = String(event.target.value);
      settings.scale = VALID_SCALE.has(value) ? value : '1';
      persistSettings();
    });
    $$('a[data-play]', document).forEach(link => {
      const card = link.closest('.card');
      if (!card || $('[data-pc-queue-add]', card)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'og-pc-queue-add';
      button.dataset.pcQueueAdd = link.dataset.play;
      button.textContent = 'В очередь +';
      button.setAttribute('aria-label', 'Добавить ' + (card.dataset.title || link.dataset.play) + ' в очередь');
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); addToQueue(link.dataset.play); });
      const actions = $('.game-actions', card);
      if (actions) actions.append(button);
    });
    document.addEventListener('osgard:game-completed', event => {
      const id = escapeId(event.detail?.game);
      if (!gameMap().has(id)) return;
      stats.completions[id] = Math.min(100000, (stats.completions[id] || 0) + 1);
      persistStats();
      renderOverview();
    });
    window.addEventListener('online', updateConnectionState);
    window.addEventListener('offline', updateConnectionState);
    document.addEventListener('visibilitychange', () => { lastTick = Date.now(); });
    const player = $('#player-dialog');
    if (player) {
      const observer = new MutationObserver(() => {
        const id = escapeId(player.dataset.game);
        if (!player.open || !id || !gameMap().has(id)) return;
        if (id === activeGame) return;
        if (activeGame) flushActiveGame();
        activeGame = id; activeAt = Date.now(); lastTick = activeAt;
        stats.launches.push({ game: id, at: new Date(activeAt).toISOString() });
        stats.launches = stats.launches.slice(-MAX_LOG);
        persistStats(); renderOverview(); updateConnectionState();
      });
      observer.observe(player, { attributes: true, attributeFilter: ['open', 'data-game'] });
      player.addEventListener('close', flushActiveGame);
    }
    window.addEventListener('beforeinstallprompt', event => { pendingInstallPrompt = event; });
    updateConnectionState();
    persistSettings();
  }
  function flushActiveGame() {
    if (activeGame) {
      if (activeAt && !document.hidden) {
        const delta = Math.max(0, Math.min(3600, (Date.now() - lastTick) / 1000));
        stats.secondsByGame[activeGame] = (stats.secondsByGame[activeGame] || 0) + delta;
      }
      persistStats();
    }
    activeGame = ''; activeAt = 0; lastTick = Date.now();
    renderOverview();
  }
  function updateConnectionState() {
    const online = navigator.onLine;
    trigger.classList.toggle('is-offline', !online);
    trigger.textContent = online ? 'ПУЛЬТ ИГРОКА ↗' : 'ПУЛЬТ ИГРОКА · ОФЛАЙН';
    trigger.setAttribute('aria-label', online ? 'Открыть пульт игрока' : 'Открыть пульт игрока, сейчас нет сети');
  }
  function addConsoleLauncher() {
    const host = $('.luxury-tools') || $('.filters');
    if (!host || $('#og-pc-launcher')) return;
    host.prepend(trigger);
  }

  function downloadBootstrapCss() {
    if ($('link[data-og-pc-style]')) return;
    const build = $('meta[name="osgard-build"]')?.content || 'local';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/games/player-console.css?v=' + encodeURIComponent(build);
    link.dataset.ogPcStyle = '1';
    document.head.append(link);
  }

  function tick() {
    const now = Date.now();
    if (activeGame && $('#player-dialog')?.open && !document.hidden) {
      const delta = Math.max(0, Math.min(10, (now - lastTick) / 1000));
      if (delta > 0) {
        stats.secondsByGame[activeGame] = (stats.secondsByGame[activeGame] || 0) + delta;
        if (now - lastStatsSave > 10000) { lastStatsSave = now; persistStats(); }
      }
    }
    lastTick = now;
  }

  addConsoleLauncher();
  downloadBootstrapCss();
  bindEvents();
  window.setInterval(tick, 5000);
  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (typing || event.metaKey || event.ctrlKey || event.altKey || event.key !== '?' || dialog.open) return;
    event.preventDefault();
    openConsole();
  });
  window.OSGARDPlayerConsole = Object.freeze({
    open: openConsole,
    version: '1.0.0',
    getLocalSnapshot: () => ({ launches: stats.launches.length, uniqueGames: new Set(stats.launches.map(row => row.game)).size, queuedGames: queue.length }),
    scanRoutes,
    exportData
  });
})();