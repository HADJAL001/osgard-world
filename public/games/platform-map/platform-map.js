(() => {
  'use strict';

  const REGISTRY_URL = '/games/game-registry.v1.json';
  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $('#game-grid');
  const search = $('#game-search');
  const runtimeFilter = $('#runtime-filter');
  const networkFilter = $('#network-filter');
  const saveFilter = $('#save-filter');
  const resultsStatus = $('#results-status');
  const resultCount = $('#result-count');
  const emptyState = $('#empty-state');
  const registryVersion = $('#registry-version');
  const registryDate = $('#registry-date');
  const shareStatus = $('#share-status');
  let games = [];

  const colors = {
    'null-shift': '#83ddd0', time: '#e2c789', swarm: '#d3ff69', inherit: '#9bcaab',
    remix: '#a5a0ff', 'civic-cascade': '#ffad85', patina: '#86c8bd',
    'signal-run': '#d3ff69', 'cascade-lab': '#83ddd0', 'afterimage-run': '#c1b8ff',
    'aether-grid': '#e2c789'
  };
  const glyphs = {
    'null-shift': 'N', time: 'T', swarm: 'S', inherit: 'I', remix: 'R',
    'civic-cascade': 'C', patina: 'P', 'signal-run': 'S', 'cascade-lab': 'C',
    'afterimage-run': 'A', 'aether-grid': 'A'
  };
  const runtimeLabel = game => ({
    'godot-web': 'GODOT / WEB', 'unity-webgl': 'UNITY / WEBGL',
    'browser-prototype': 'BROWSER / PROTOTYPE', 'browser-js': 'HTML / JS',
    'browser-simulation': 'BROWSER / SIMULATION', 'browser-lab': 'BROWSER / LAB',
    'browser-canvas': 'CANVAS / JS', 'browser-physics': 'BROWSER / PHYSICS',
    'browser-puzzle': 'BROWSER / PUZZLE'
  }[game.runtimeFamily] || game.runtimeLabel || 'BROWSER');
  const networkLabel = game => ({
    local: 'Локальная сессия',
    'api-for-online': 'Сетевой режим зависит от API',
    'not-verified': 'Сетевая совместимость не подтверждена',
    'mode-dependent': 'Зависит от игрового режима'
  }[game.network] || 'Не указано');
  const saveLabel = game => ({
    'device-local': 'Сохранение на этом устройстве',
    'mode-dependent': 'Зависит от режима / сервера',
    'not-documented': 'Схема сохранения не подтверждена'
  }[game.progressScope] || 'Не указано');
  const deviceLabel = game => game.recommendedDevice === 'desktop-first' ? 'ПРЕДПОЧТИТЕЛЕН ПК' : 'БРАУЗЕРНЫЙ ЗАПУСК';
  const normalized = value => String(value ?? '').toLocaleLowerCase('ru').trim();

  function safeRoute(value) {
    if (typeof value !== 'string' || !value.startsWith('/games/')) return '';
    if (value.includes('..') || value.includes('?') || value.includes('#') || value.startsWith('//')) return '';
    return value;
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function appendStatusRow(list, title, value) {
    const item = node('li');
    item.append(node('b', '', title), node('span', '', value));
    list.append(item);
  }
  function createEventId() {
    try { return crypto.randomUUID().replace(/-/g, ''); }
    catch { return 'evt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 19); }
  }
  const sessionId = createEventId();
  function track(name, gameId = 'unknown') {
    try {
      window.OSGARD_CONSENTED_ANALYTICS?.enqueue({
        eventId: createEventId(),
        sessionId,
        name,
        gameId,
        source: 'platform-map',
        path: '/games/platform-map/',
        durationSeconds: 0
      });
    } catch { /* Analytics must never block a game launch or sharing. */ }
  }

  function cardFor(game, index) {
    const article = node('article', 'game-card');
    article.style.setProperty('--game-glow', colors[game.id] || '#d3ff69');
    article.dataset.game = game.id;
    article.dataset.runtime = game.runtimeFamily;
    article.dataset.network = game.network;
    article.dataset.save = game.progressScope;
    article.dataset.search = normalized([
      game.id, game.title, game.genre, game.description, game.runtimeLabel,
      game.networkLabel, game.progressLabel, game.controlNote
    ].join(' '));

    const top = node('div', 'card-top');
    top.append(node('span', 'index-tag', String(index + 1).padStart(2, '0') + ' / 11'));
    top.append(node('span', 'runtime-tag', runtimeLabel(game)));
    const art = node('div', 'card-art');
    art.setAttribute('aria-hidden', 'true');
    const glyph = node('span', 'game-glyph');
    glyph.append(node('span', '', glyphs[game.id] || 'O'));
    art.append(glyph);

    const copy = node('div', 'card-copy');
    copy.append(node('h3', '', game.title));
    const genres = node('div', 'genre-line');
    genres.append(node('span', '', game.genre));
    genres.append(node('span', '', game.webgl === 'required' ? 'WEBGL REQUIRED' : 'NO WEBGL REQUIRED'));
    copy.append(genres, node('p', '', game.description));

    const status = node('ul', 'status-list');
    appendStatusRow(status, 'СЕТЬ', networkLabel(game));
    appendStatusRow(status, 'СОХРАНЕНИЕ', saveLabel(game));
    appendStatusRow(status, 'УСТРОЙСТВО', deviceLabel(game));
    copy.append(status);
    const caution = node('p', 'touch-warning', game.controlNote || 'Проверь управление на своём устройстве.');
    copy.append(caution);

    const foot = node('div', 'card-foot');
    foot.append(node('small', '', game.touchValidation === 'not-device-verified' ? 'TOUCH / NOT DEVICE-VERIFIED' : 'INPUT / SOURCE-REVIEWED'));
    const route = safeRoute(game.route);
    if (route) {
      const link = node('a', 'launch-link', 'Открыть игру ↗');
      link.href = route;
      link.addEventListener('click', () => track('game_launched', game.id));
      foot.append(link);
    } else {
      foot.append(node('span', 'launch-link', 'Маршрут требует проверки'));
    }
    const fallbackRoute = safeRoute(game.fallbackRoute);
    if (fallbackRoute) {
      const fallbackLink = node('a', 'fallback-link', 'Веб-резерв ↗');
      fallbackLink.href = fallbackRoute;
      fallbackLink.setAttribute('aria-label', 'Открыть альтернативную браузерную версию ' + game.title);
      fallbackLink.addEventListener('click', () => track('game_launched', game.id));
      foot.append(fallbackLink);
    }
    article.append(top, art, copy, foot);
    return article;
  }

  function filteredGames() {
    const q = normalized(search.value);
    const runtime = runtimeFilter.value;
    const network = networkFilter.value;
    const save = saveFilter.value;
    return games.filter(game => {
      const haystack = normalized([
        game.id, game.title, game.genre, game.description, game.runtimeLabel,
        game.networkLabel, game.progressLabel, game.controlNote
      ].join(' '));
      const runtimeOk = runtime === 'all'
        || (runtime === 'browser' && (game.runtimeFamily.startsWith('browser') || game.runtimeFamily === 'react-spa'))
        || (runtime === 'godot-web' && game.runtimeFamily === 'godot-web')
        || (runtime === 'unity-webgl' && game.runtimeFamily === 'unity-webgl');
      return (!q || haystack.includes(q))
        && runtimeOk
        && (network === 'all' || game.network === network)
        && (save === 'all' || game.progressScope === save);
    });
  }

  function render() {
    const matched = filteredGames();
    const fragment = document.createDocumentFragment();
    matched.forEach(game => fragment.append(cardFor(game, games.indexOf(game))));
    grid.replaceChildren(fragment);
    grid.hidden = matched.length === 0;
    emptyState.hidden = matched.length !== 0;
    resultCount.textContent = String(matched.length).padStart(2, '0') + ' / ' + String(games.length).padStart(2, '0');
    resultsStatus.textContent = matched.length === 0
      ? 'По выбранным условиям ничего не найдено.'
      : 'Показано ' + matched.length + ' из ' + games.length + ' игровых миров.';
  }

  function reset() {
    search.value = '';
    runtimeFilter.value = 'all';
    networkFilter.value = 'all';
    saveFilter.value = 'all';
    render();
    search.focus();
  }

  async function start() {
    try {
      const response = await fetch(REGISTRY_URL, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
        redirect: 'error'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const registry = await response.json();
      if (registry?.schemaVersion !== 1 || !Array.isArray(registry.games) || registry.games.length !== 11) {
        throw new Error('Версия или состав реестра не совпадает с контрактом.');
      }
      const ids = new Set();
      games = registry.games.filter(game => {
        if (!game || typeof game.id !== 'string' || ids.has(game.id)) return false;
        if (!safeRoute(game.route) || typeof game.title !== 'string' || typeof game.runtimeFamily !== 'string') return false;
        ids.add(game.id);
        return true;
      });
      if (games.length !== 11) throw new Error('Часть записей не прошла проверку маршрута или идентификатора.');
      registryVersion.textContent = registry.registryVersion || 'V1';
      registryDate.textContent = 'Проверено по исходникам: ' + String(registry.lastReviewed || 'не указано');
      grid.setAttribute('aria-busy', 'false');
      render();
      track('catalog_viewed');
    } catch (error) {
      grid.hidden = true;
      grid.setAttribute('aria-busy', 'false');
      emptyState.hidden = false;
      emptyState.querySelector('b').textContent = 'Реестр недоступен';
      emptyState.querySelector('p').textContent = 'Не удалось безопасно загрузить реестр возможностей. Каталог игр по-прежнему доступен.';
      emptyState.querySelector('button').textContent = 'Вернуться в каталог';
      emptyState.querySelector('button').addEventListener('click', () => { window.location.href = '/games/'; }, { once: true });
      resultsStatus.textContent = 'Загрузка карты завершилась ошибкой. ' + String(error?.message || 'Неизвестная ошибка');
      resultCount.textContent = '—';
    }
  }

  [search, runtimeFilter, networkFilter, saveFilter].forEach(control => {
    control.addEventListener(control === search ? 'input' : 'change', render);
  });
  $('#reset-filters').addEventListener('click', reset);
  $('#empty-reset').addEventListener('click', () => {
    if (games.length) reset();
    else window.location.href = '/games/';
  });
  $('#share-map').addEventListener('click', async () => {
    const url = new URL('/games/platform-map/', window.location.origin);
    url.searchParams.set('utm_source', 'osgard_play');
    url.searchParams.set('utm_medium', 'share');
    url.searchParams.set('utm_campaign', 'signal_atlas_2026');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD PLAY — Signal Atlas', text: 'Карта игровых миров OSGARD: технологии, запуск и совместимость.', url: url.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.href);
        shareStatus.textContent = 'Ссылка скопирована.';
      } else {
        shareStatus.textContent = url.href;
      }
      track('social_share_intent');
    } catch (error) {
      if (error?.name !== 'AbortError') shareStatus.textContent = 'Не удалось открыть системное меню. Ссылка: ' + url.href;
    }
  });
  void start();
})();
