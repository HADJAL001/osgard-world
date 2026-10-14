(() => {
  'use strict';

  const FAVORITES_KEY = 'osgard.games.favorites.v1';
  const RECENT_KEY = 'osgard.games.recent.v1';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const cards = Array.from(document.querySelectorAll('.world-card[data-game]'));
  const grid = document.querySelector('#world-grid');
  const search = document.querySelector('#game-search');
  const sort = document.querySelector('#sort-mode');
  const results = document.querySelector('#results-label');
  const emptyState = document.querySelector('#empty-state');
  const clearFilters = document.querySelector('#clear-filters');
  const favoriteFilter = document.querySelector('#favorites-filter');
  const favoriteCount = document.querySelector('#favorites-count');
  const dialog = document.querySelector('#share-dialog');
  const shareTitle = document.querySelector('#share-title');
  const shareCopy = document.querySelector('#share-copy');
  const shareStatus = document.querySelector('#share-status');
  const shareNative = document.querySelector('#share-native');
  const shareCopyLink = document.querySelector('#share-copy-link');
  const continueSection = document.querySelector('#continue-section');
  const continueTitle = document.querySelector('#continue-title');
  const continueCopy = document.querySelector('#continue-copy');
  const continueLink = document.querySelector('#continue-link');
  const menuToggle = document.querySelector('#menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const allowedGames = new Map(cards.map(card => [card.dataset.game, {
    title: card.dataset.title, href: card.querySelector('[data-launch]')?.getAttribute('href') || '/games/'
  }]));
  let activeGenre = 'all';
  let favoritesOnly = false;
  let activeShare = null;

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function writeArray(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  function readFavorites() {
    return new Set(readArray(FAVORITES_KEY).filter(id => allowedGames.has(id)));
  }
  let favorites = readFavorites();
  let recent = readArray(RECENT_KEY).filter(id => allowedGames.has(id));

  function token(bytes = 12) {
    const data = new Uint8Array(bytes);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(data);
    else for (let i = 0; i < data.length; i += 1) data[i] = Math.floor(Math.random() * 256);
    return Array.from(data, n => n.toString(16).padStart(2, '0')).join('');
  }
  function analyticsConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
  }
  function track(name, gameId = 'unknown', source = 'entertainment-hub') {
    if (!analyticsConsent()) return false;
    const queue = window.OSGARD_CONSENTED_ANALYTICS;
    if (!queue || typeof queue.enqueue !== 'function') return false;
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem('osgard.entertainment.session.v1') || '';
      if (!/^session_[a-f0-9]{24}$/.test(sessionId)) {
        sessionId = 'session_' + token(12);
        sessionStorage.setItem('osgard.entertainment.session.v1', sessionId);
      }
    } catch { sessionId = 'session_' + token(12); }
    return queue.enqueue({
      eventId: 'evt_' + token(12),
      name,
      sessionId,
      gameId: allowedGames.has(gameId) ? gameId : 'unknown',
      source: String(source).slice(0, 80),
      path: '/entertainment/',
      durationSeconds: 0
    });
  }

  function updateFavoriteButtons() {
    cards.forEach(card => {
      const id = card.dataset.game;
      const button = card.querySelector('[data-favorite]');
      const active = favorites.has(id);
      if (!button) return;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '★' : '☆';
      button.setAttribute('aria-label', active ? 'Убрать ' + allowedGames.get(id).title + ' из избранного' : 'Добавить ' + allowedGames.get(id).title + ' в избранное');
    });
    favoriteCount.textContent = String(favorites.size);
    favoriteFilter.classList.toggle('is-active', favoritesOnly);
    favoriteFilter.setAttribute('aria-pressed', String(favoritesOnly));
  }

  function currentVisibleCards() {
    const q = search.value.trim().toLocaleLowerCase('ru-RU');
    return cards.filter(card => {
      const matchesGenre = activeGenre === 'all' || card.dataset.genre === activeGenre;
      const haystack = [card.dataset.title, card.dataset.tags, card.textContent].join(' ').toLocaleLowerCase('ru-RU');
      const matchesQuery = !q || haystack.includes(q);
      const matchesFavorite = !favoritesOnly || favorites.has(card.dataset.game);
      return matchesGenre && matchesQuery && matchesFavorite;
    });
  }

  function sortCards(visible) {
    const mode = sort.value;
    if (mode === 'az') return [...visible].sort((a, b) => a.dataset.title.localeCompare(b.dataset.title, 'ru'));
    if (mode === 'recent') {
      return [...visible].sort((a, b) => {
        const ai = recent.indexOf(a.dataset.game), bi = recent.indexOf(b.dataset.game);
        if (ai < 0 && bi < 0) return Number(a.dataset.order) - Number(b.dataset.order);
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
      });
    }
    return [...visible].sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
  }

  function render() {
    const visible = sortCards(currentVisibleCards());
    const ids = new Set(visible.map(card => card.dataset.game));
    cards.forEach(card => {
      const present = ids.has(card.dataset.game);
      card.hidden = !present;
      if (present) grid.append(card);
    });
    const hasFilters = Boolean(search.value.trim()) || activeGenre !== 'all' || favoritesOnly || sort.value !== 'curated';
    results.textContent = 'Показано ' + visible.length + ' из ' + cards.length + ' игровых миров';
    emptyState.hidden = visible.length > 0;
    clearFilters.hidden = !hasFilters;
    updateFavoriteButtons();
  }

  function resetFilters() {
    search.value = '';
    sort.value = 'curated';
    activeGenre = 'all';
    favoritesOnly = false;
    document.querySelectorAll('[data-genre]').forEach(button => {
      const active = button.dataset.genre === 'all';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
  }

  function recordRecent(id) {
    if (!allowedGames.has(id)) return;
    recent = [id, ...recent.filter(item => item !== id)].slice(0, 11);
    writeArray(RECENT_KEY, recent);
    const game = allowedGames.get(id);
    continueSection.hidden = false;
    continueTitle.textContent = 'Продолжить: ' + game.title;
    continueCopy.textContent = 'Последний выбранный мир сохранён только на этом устройстве. Никакие личные данные для этого не нужны.';
    continueLink.href = game.href;
    continueLink.textContent = 'Вернуться в мир ↗';
  }

  function renderRecent() {
    const id = recent.find(gameId => allowedGames.has(gameId));
    if (!id) return;
    const game = allowedGames.get(id);
    continueSection.hidden = false;
    continueTitle.textContent = 'Продолжить: ' + game.title;
    continueCopy.textContent = 'Последний выбранный мир сохранён только на этом устройстве.';
    continueLink.href = game.href;
    continueLink.textContent = 'Вернуться в мир ↗';
  }

  function makeInviteLink(id) {
    if (!allowedGames.has(id)) return new URL('/games/', location.origin).href;
    const code = 'og_' + token(4);
    const url = new URL('/games/invite/' + encodeURIComponent(id) + '/', location.origin);
    url.searchParams.set('og_ref', code);
    url.searchParams.set('og_game', id);
    url.searchParams.set('utm_source', 'osgard_entertainment');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'play_with_friends');
    url.searchParams.set('utm_content', id);
    return { href: url.href, code };
  }

  function openShareDialog(id) {
    const game = allowedGames.get(id);
    if (!game) return;
    activeShare = { id, ...makeInviteLink(id) };
    shareTitle.textContent = 'Вызов: ' + game.title;
    shareCopy.textContent = 'Отправь другу персональную ссылку. Она откроет именно этот игровой мир.';
    shareStatus.textContent = '';
    const message = 'Попробуй ' + game.title + ' в OSGARD PLAY: ' + activeShare.href;
    const encodedUrl = encodeURIComponent(activeShare.href);
    const encodedMessage = encodeURIComponent(message);
    document.querySelector('#share-whatsapp').href = 'https://wa.me/?text=' + encodedMessage;
    document.querySelector('#share-telegram').href = 'https://t.me/share/url?url=' + encodedUrl + '&text=' + encodeURIComponent('Пойдём сыграем в ' + game.title);
    document.querySelector('#share-x').href = 'https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodeURIComponent('OSGARD PLAY · ' + game.title);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { shareStatus.textContent = 'Выбери сеть или скопируй ссылку ниже.'; dialog.setAttribute('open', ''); }
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
    } catch {}
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch { return false; }
  }

  document.querySelectorAll('[data-genre]').forEach(button => {
    button.addEventListener('click', () => {
      activeGenre = button.dataset.genre;
      document.querySelectorAll('[data-genre]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });
  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  favoriteFilter.addEventListener('click', () => { favoritesOnly = !favoritesOnly; render(); });
  document.querySelector('#clear-filters').addEventListener('click', resetFilters);
  document.querySelector('#empty-reset').addEventListener('click', resetFilters);
  document.querySelectorAll('[data-favorite]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.favorite;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      writeArray(FAVORITES_KEY, [...favorites]);
      updateFavoriteButtons();
      render();
    });
  });
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', () => openShareDialog(button.dataset.share)));
  document.querySelectorAll('[data-launch]').forEach(link => link.addEventListener('click', () => recordRecent(link.dataset.launch)));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    const service = link.dataset.service;
    track('cross_promo_clicked', 'unknown', 'entertainment-cross-promo:' + service);
  }));

  document.querySelector('#surprise-button').addEventListener('click', () => {
    const visible = currentVisibleCards();
    if (!visible.length) { resetFilters(); return; }
    const pick = visible[Math.floor(Math.random() * visible.length)];
    pick.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    pick.classList.add('is-surprise');
    setTimeout(() => pick.classList.remove('is-surprise'), 1400);
    const link = pick.querySelector('[data-launch]');
    if (link) link.focus({ preventScroll: true });
  });

  document.querySelector('#share-native').addEventListener('click', async () => {
    if (!activeShare) return;
    const game = allowedGames.get(activeShare.id);
    try {
      if (typeof navigator.share !== 'function') {
        const copied = await copyText(activeShare.href);
        shareStatus.textContent = copied ? 'Ссылка скопирована. Публикация не подтверждена.' : 'Не удалось скопировать ссылку; используй одну из соцсетей.';
        return;
      }
      await navigator.share({ title: 'OSGARD PLAY · ' + game.title, text: 'Пойдём сыграем вместе.', url: activeShare.href });
      track('invite_link_prepared', activeShare.id, 'entertainment-share-intent:' + activeShare.id + ':native');
      shareStatus.textContent = 'Ссылка передана в меню отправки. Социальная сеть не присылает нам доказательство публикации.';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') shareStatus.textContent = 'Отправка отменена.';
      else shareStatus.textContent = 'Не удалось открыть системное меню. Попробуй выбрать сеть ниже.';
    }
  });
  document.querySelectorAll('.share-options a').forEach(link => link.addEventListener('click', () => {
    if (activeShare) track('invite_link_prepared', activeShare.id, 'entertainment-share-intent:' + activeShare.id + ':' + link.id.replace('share-', ''));
  }));
  shareCopyLink.addEventListener('click', async () => {
    if (!activeShare) return;
    const copied = await copyText(activeShare.href);
    shareStatus.textContent = copied ? 'Ссылка скопирована. Само копирование не считается репостом.' : 'Копирование заблокировано браузером. Используй кнопку выбранной соцсети.';
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileNav.hidden = !open;
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== search && !dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      event.preventDefault(); search.focus();
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === FAVORITES_KEY) { favorites = readFavorites(); render(); }
  });
  window.addEventListener('pageshow', () => { favorites = readFavorites(); render(); });
  window.addEventListener('pagehide', () => { if (dialog.open) dialog.close(); });

  /* OSGARD PLAY PASS 1.0 — device-local retention profile. Launch clicks are not completion proof. */
  const PLAY_PASS_KEY = 'osgard.entertainment.play-pass.v1';
  const PASS_SCHEMA = 1;
  const PASS_MAX_DAYS = 366;
  let passMemoryFallback = null;
  const knownGameIds = new Set(allowedGames.keys());

  function utcDateKey(date = new Date()) { return date.toISOString().slice(0, 10); }
  function dayOrdinal(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
    const n = Date.parse(key + 'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === key ? Math.floor(n / 86400000) : NaN;
  }
  function makeDefaultPass() {
    return { schemaVersion: PASS_SCHEMA, alias: 'P-' + token(3).slice(0, 6).toUpperCase(), createdAt: new Date().toISOString(), launchCounts: {}, activeDays: [], lastGame: '', lastLaunchAt: '', dailyRouteOpened: {} };
  }
  function sanitizePass(value) {
    const pass = makeDefaultPass();
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== PASS_SCHEMA) return pass;
    if (typeof value.alias === 'string' && /^P-[A-F0-9]{6}$/.test(value.alias)) pass.alias = value.alias;
    if (typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))) pass.createdAt = value.createdAt;
    if (value.launchCounts && typeof value.launchCounts === 'object' && !Array.isArray(value.launchCounts)) {
      for (const [id, count] of Object.entries(value.launchCounts)) {
        if (knownGameIds.has(id) && Number.isSafeInteger(count) && count >= 0 && count <= 100000) pass.launchCounts[id] = count;
      }
    }
    if (Array.isArray(value.activeDays)) {
      pass.activeDays = [...new Set(value.activeDays.filter(day => typeof day === 'string' && Number.isFinite(dayOrdinal(day))))].sort().slice(-PASS_MAX_DAYS);
    }
    if (knownGameIds.has(value.lastGame)) pass.lastGame = value.lastGame;
    if (typeof value.lastLaunchAt === 'string' && Number.isFinite(Date.parse(value.lastLaunchAt))) pass.lastLaunchAt = value.lastLaunchAt;
    if (value.dailyRouteOpened && typeof value.dailyRouteOpened === 'object' && !Array.isArray(value.dailyRouteOpened)) {
      for (const [date, id] of Object.entries(value.dailyRouteOpened)) {
        if (Number.isFinite(dayOrdinal(date)) && knownGameIds.has(id)) pass.dailyRouteOpened[date] = id;
      }
      pass.dailyRouteOpened = Object.fromEntries(Object.entries(pass.dailyRouteOpened).sort(([a], [b]) => a.localeCompare(b)).slice(-PASS_MAX_DAYS));
    }
    return pass;
  }
  function readPass() {
    try {
      const raw = localStorage.getItem(PLAY_PASS_KEY);
      if (raw) {
        const parsed = sanitizePass(JSON.parse(raw));
        passMemoryFallback = parsed;
        return parsed;
      }
    } catch { /* local storage may be blocked; in-memory progress still works for this visit */ }
    if (!passMemoryFallback) passMemoryFallback = makeDefaultPass();
    return passMemoryFallback;
  }
  let playPass = readPass();
  function savePass() {
    playPass = sanitizePass(playPass);
    passMemoryFallback = playPass;
    try { localStorage.setItem(PLAY_PASS_KEY, JSON.stringify(playPass)); return true; }
    catch { return false; }
  }
  function currentStreak(days) {
    const set = new Set(days.map(dayOrdinal).filter(Number.isFinite));
    const today = dayOrdinal(utcDateKey());
    const start = set.has(today) ? today : today - 1;
    if (!set.has(start)) return 0;
    let streak = 0;
    for (let n = start; set.has(n); n -= 1) streak += 1;
    return streak;
  }
  function gameForUtcDay(dateKey = utcDateKey()) {
    const list = [...allowedGames.keys()];
    if (!list.length) return '';
    const day = dayOrdinal(dateKey);
    const stable = Number.isFinite(day) ? Math.abs(day) : 0;
    return list[stable % list.length];
  }
  function passLaunchCount() { return Object.values(playPass.launchCounts).reduce((sum, count) => sum + count, 0); }
  function passUniqueCount() { return Object.values(playPass.launchCounts).filter(count => count > 0).length; }
  function passBadgeList() {
    const unique = passUniqueCount(), total = passLaunchCount(), streak = currentStreak(playPass.activeDays);
    const favoriteCount = favorites.size;
    return [
      { id: 'first', title: 'Первый маршрут', desc: 'Сделана первая попытка запуска', earned: total >= 1 },
      { id: 'explorer-3', title: 'Исследователь', desc: 'Открыто 3 разных игровых мира', earned: unique >= 3 },
      { id: 'explorer-6', title: 'Путешественник', desc: 'Открыто 6 разных игровых миров', earned: unique >= 6 },
      { id: 'all-worlds', title: 'Картограф', desc: 'Попытка запуска во всех доступных мирах', earned: unique >= allowedGames.size },
      { id: 'curator', title: 'Куратор', desc: 'Сохранены 3 игры в избранное', earned: favoriteCount >= 3 },
      { id: 'streak-3', title: 'Возвращение', desc: 'Серия попыток запуска в 3 дня подряд', earned: streak >= 3 },
    ];
  }
  function addPassStyles() {
    if (document.querySelector('#osgard-play-pass-style')) return;
    const style = document.createElement('style');
    style.id = 'osgard-play-pass-style';
    style.textContent = '.play-pass{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(290px,.95fr);gap:24px;margin:12px 0 34px;padding:clamp(18px,3vw,32px);border:1px solid #d7bd8342;background:radial-gradient(ellipse at 0 0,#d3ff690b,transparent 48%),linear-gradient(140deg,#151715,#0d1010);color:#f2f0e8}.play-pass[hidden]{display:none}.pass-kicker{margin:0 0 10px;color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.16em}.pass-title{margin:0;font:400 clamp(28px,4vw,43px)/1.05 Georgia,serif;letter-spacing:-.04em}.pass-title em{color:#d7bd83;font-weight:400}.pass-description{max-width:620px;color:#a8afa5;font-size:12px;line-height:1.8}.pass-id{display:inline-flex;align-items:center;gap:9px;margin-top:8px;padding:8px 10px;border:1px solid #d7bd8352;color:#d7bd83;font:10px ui-monospace,monospace;letter-spacing:.09em}.pass-id:before{content:\"\";width:7px;height:7px;border-radius:50%;background:#d3ff69;box-shadow:0 0 12px #d3ff6980}.pass-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:22px}.pass-stat{min-width:0;padding:13px;border:1px solid #ffffff19;background:#ffffff04}.pass-stat strong{display:block;color:#f2f0e8;font:400 27px/1 Georgia,serif;font-variant-numeric:tabular-nums}.pass-stat span{display:block;margin-top:7px;color:#939b92;font:8px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.pass-progress-label{display:flex;justify-content:space-between;gap:10px;margin-top:16px;color:#a0a89c;font-size:10px}.pass-progress{height:4px;margin-top:7px;background:#ffffff18;overflow:hidden}.pass-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#d3ff69,#d7bd83);transition:width .25s ease}.pass-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.pass-actions button,.pass-actions a{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:39px;padding:9px 12px;border:1px solid #ffffff30;background:#0d1010;color:#e9e8df;font-size:10px;text-decoration:none;cursor:pointer}.pass-actions .pass-primary{border-color:#d3ff69;background:#d3ff69;color:#11140d;font-weight:750}.pass-actions button:hover,.pass-actions a:hover{border-color:#d3ff69}.pass-actions button:focus-visible,.pass-actions a:focus-visible{outline:2px solid #f2f0e8;outline-offset:3px}.pass-daily{display:flex;flex-direction:column;justify-content:center;min-height:100%;padding:clamp(17px,2.5vw,26px);border:1px solid #d7bd8345;background:linear-gradient(140deg,#d7bd8310,transparent 62%),#0d1010}.pass-daily .pass-kicker{color:#d7bd83}.pass-daily h3{margin:0;color:#f2f0e8;font:400 clamp(25px,3vw,34px)/1.12 Georgia,serif}.pass-daily p{color:#9da69a;font-size:11px;line-height:1.75}.pass-daily-game{margin-top:13px;color:#d3ff69;font:11px ui-monospace,monospace;letter-spacing:.09em}.pass-daily .pass-actions{margin-top:15px}.pass-badges{grid-column:1/-1;padding-top:18px;border-top:1px solid #ffffff1b}.pass-badges-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.pass-badges-head h3{margin:0;font:400 24px Georgia,serif}.pass-badges-head span{color:#8f988c;font:8px ui-monospace,monospace;letter-spacing:.12em}.pass-badge-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:13px}.pass-badge{min-width:0;padding:12px;border:1px solid #ffffff18;background:#ffffff03;opacity:.62}.pass-badge.is-earned{opacity:1;border-color:#d7bd8368;background:#d7bd830a}.pass-badge b{display:block;color:#d7bd83;font:19px Georgia,serif}.pass-badge strong{display:block;margin-top:8px;color:#e7e5db;font-size:10px}.pass-badge p{margin:6px 0 0;color:#91998e;font-size:9px;line-height:1.6}.pass-status{min-height:1.5em;margin:12px 0 0;color:#d3ff69;font-size:10px;line-height:1.6}.pass-privacy{grid-column:1/-1;margin:0;color:#737e72;font-size:9px;line-height:1.7}.pass-hidden-input{display:none!important}@media(max-width:900px){.play-pass{grid-template-columns:1fr}.pass-badge-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:500px){.play-pass{padding:15px;gap:16px}.pass-stats{gap:5px}.pass-stat{padding:10px}.pass-stat strong{font-size:23px}.pass-stat span{font-size:7px}.pass-badge-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pass-badges-head{align-items:flex-start;flex-direction:column}.pass-actions>*{flex:1 1 calc(50% - 8px)}.pass-daily{min-height:auto}}@media(prefers-reduced-motion:reduce){.pass-progress span{transition:none}}';
    document.head.append(style);
  }
  function buildPlayPass() {
    const catalog = document.querySelector('#world-catalog');
    if (!catalog || document.querySelector('#osgard-play-pass')) return;
    addPassStyles();
    const section = document.createElement('section');
    section.id = 'osgard-play-pass';
    section.className = 'play-pass';
    section.setAttribute('aria-labelledby', 'play-pass-title');
    section.innerHTML = '<div class="pass-main"><p class="pass-kicker">OSGARD PLAY / LOCAL PROFILE</p><h2 class="pass-title" id="play-pass-title">Твой игровой <em>паспорт.</em></h2><p class="pass-description">Собственная история игровых запусков на этом устройстве. Имя, email и аккаунт не требуются.</p><div class="pass-id" id="pass-alias">P-LOCAL</div><div class="pass-stats"><div class="pass-stat"><strong id="pass-total">0</strong><span>Попыток запуска</span></div><div class="pass-stat"><strong id="pass-unique">0 / 11</strong><span>Разных миров</span></div><div class="pass-stat"><strong id="pass-streak">0</strong><span>Дней подряд</span></div></div><div class="pass-progress-label"><span>Исследование каталога</span><span id="pass-progress-text">0%</span></div><div class="pass-progress" role="progressbar" aria-label="Прогресс исследования игр" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="pass-progress"><span id="pass-progress-bar"></span></div><div class="pass-actions"><button type="button" id="pass-share">Поделиться паспортом ↗</button><button type="button" id="pass-export">Экспорт истории ↓</button><button type="button" id="pass-import">Импорт истории ↑</button><button type="button" id="pass-reset">Сбросить паспорт</button><input class="pass-hidden-input" id="pass-file" type="file" accept="application/json,.json" aria-label="Выбрать JSON-файл истории"></div><p class="pass-status" id="pass-status" role="status" aria-live="polite"></p></div><div class="pass-daily"><p class="pass-kicker">ROUTE OF THE DAY / UTC</p><h3>Один новый мир.<br>Твой следующий маршрут.</h3><p>Маршрут выбирается детерминированно по календарной дате UTC, одинаково для текущего порядка каталога. Запуск не равен прохождению уровня.</p><div class="pass-daily-game" id="pass-daily-game">ROUTE / PENDING</div><div class="pass-actions"><button type="button" class="pass-primary" id="pass-play-daily">Открыть маршрут дня ↗</button></div><p class="pass-status" id="pass-daily-status" role="status" aria-live="polite"></p></div><div class="pass-badges"><div class="pass-badges-head"><h3>Медали исследователя</h3><span id="pass-badge-count">0 / 6 ДОСТИЖЕНИЙ</span></div><div class="pass-badge-grid" id="pass-badge-grid"></div></div><p class="pass-privacy">PRIVACY BY DESIGN · Паспорт хранится в localStorage этого браузера. Он не синхронизируется между устройствами и не является публичным рейтингом. Экспорт и сброс доступны тебе.</p></section>';
    catalog.insertAdjacentElement('beforebegin', section);
  }
  function renderPlayPass() {
    buildPlayPass();
    const root = document.querySelector('#osgard-play-pass');
    if (!root) return;
    const total = passLaunchCount(), unique = passUniqueCount(), max = allowedGames.size;
    const streak = currentStreak(playPass.activeDays), day = utcDateKey(), daily = gameForUtcDay(day);
    const game = allowedGames.get(daily);
    const earned = passBadgeList().filter(badge => badge.earned);
    root.querySelector('#pass-alias').textContent = playPass.alias;
    root.querySelector('#pass-total').textContent = String(total);
    root.querySelector('#pass-unique').textContent = unique + ' / ' + max;
    root.querySelector('#pass-streak').textContent = String(streak);
    const pct = max ? Math.round(unique / max * 100) : 0;
    root.querySelector('#pass-progress-text').textContent = pct + '%';
    root.querySelector('#pass-progress').setAttribute('aria-valuenow', String(pct));
    root.querySelector('#pass-progress-bar').style.width = pct + '%';
    root.querySelector('#pass-daily-game').textContent = daily ? 'ROUTE / ' + game.title.toUpperCase() : 'ROUTE / UNAVAILABLE';
    root.querySelector('#pass-daily-status').textContent = playPass.dailyRouteOpened[day] === daily ? 'Маршрут дня уже открывали сегодня. Можно запустить его снова; завершение уровня здесь не подтверждается.' : 'Доступен один выбор на сегодня. Никакой награды за простой переход нет.';
    root.querySelector('#pass-badge-count').textContent = earned.length + ' / ' + passBadgeList().length + ' ДОСТИЖЕНИЙ';
    const grid = root.querySelector('#pass-badge-grid');
    grid.replaceChildren();
    for (const badge of passBadgeList()) {
      const item = document.createElement('article');
      item.className = 'pass-badge' + (badge.earned ? ' is-earned' : '');
      const glyph = document.createElement('b'); glyph.textContent = badge.earned ? '✦' : '◇';
      const title = document.createElement('strong'); title.textContent = badge.title;
      const desc = document.createElement('p'); desc.textContent = badge.desc;
      item.append(glyph, title, desc); grid.append(item);
    }
  }
  function recordPassLaunch(id) {
    if (!knownGameIds.has(id)) return;
    playPass.launchCounts[id] = Math.min(100000, (playPass.launchCounts[id] || 0) + 1);
    playPass.activeDays = [...new Set([...playPass.activeDays, utcDateKey()])].sort().slice(-PASS_MAX_DAYS);
    playPass.lastGame = id;
    playPass.lastLaunchAt = new Date().toISOString();
    const today = utcDateKey();
    if (id === gameForUtcDay(today)) playPass.dailyRouteOpened[today] = id;
    const saved = savePass();
    renderPlayPass();
    const status = document.querySelector('#pass-status');
    if (status) status.textContent = saved ? 'Попытка запуска учтена в локальном паспорте.' : 'Хранилище недоступно: результат сохранён только в памяти этой вкладки.';
  }
  async function sharePlayPass() {
    const data = { schemaVersion: PASS_SCHEMA, alias: playPass.alias, attempts: passLaunchCount(), uniqueGames: passUniqueCount(), favorites: favorites.size, activeDays: playPass.activeDays.length, currentStreak: currentStreak(playPass.activeDays) };
    const message = 'OSGARD PLAY PASS ' + data.alias + ' · ' + data.uniqueGames + '/' + allowedGames.size + ' игровых миров исследовано · ' + data.attempts + ' попыток запуска. Это локальная статистика, не публичный рейтинг.';
    const status = document.querySelector('#pass-status');
    try {
      if (navigator.share) { await navigator.share({ title: 'OSGARD PLAY PASS', text: message, url: location.origin + '/entertainment/' }); if (status) status.textContent = 'Паспорт передан в системное меню. Факт публикации не проверяется.'; }
      else { const copied = await copyText(message + ' ' + location.origin + '/entertainment/'); if (status) status.textContent = copied ? 'Карточка паспорта скопирована. Публикация не подтверждена.' : 'Скопируй адрес страницы вручную.'; }
    } catch (error) { if (status) status.textContent = error instanceof Error && error.name === 'AbortError' ? 'Отправка отменена.' : 'Не удалось открыть системное меню публикации.'; }
  }
  function exportPlayPass() {
    const payload = { product: 'OSGARD PLAY PASS', schemaVersion: PASS_SCHEMA, exportedAt: new Date().toISOString(), pass: playPass };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'osgard-play-pass.json'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      document.querySelector('#pass-status').textContent = 'Экспорт готов. Файл содержит локальную историю без имени или email.';
    } catch { document.querySelector('#pass-status').textContent = 'Не удалось сформировать файл в этом браузере.'; }
  }
  function importPlayPassFile(file) {
    const status = document.querySelector('#pass-status');
    if (!file) return;
    if (file.size > 250000) { status.textContent = 'Файл слишком большой. Максимум — 250 КБ.'; return; }
    file.text().then(text => {
      let parsed;
      try { parsed = JSON.parse(text); } catch { status.textContent = 'Файл не является корректным JSON.'; return; }
      if (!parsed || parsed.product !== 'OSGARD PLAY PASS' || parsed.schemaVersion !== PASS_SCHEMA || !parsed.pass || parsed.pass.schemaVersion !== PASS_SCHEMA) {
        status.textContent = 'Версия или формат паспорта не поддерживается.'; return;
      }
      playPass = sanitizePass(parsed.pass);
      const saved = savePass();
      renderPlayPass();
      status.textContent = saved ? 'История импортирована после проверки полей. Существующий локальный паспорт заменён.' : 'Паспорт импортирован в память вкладки; постоянное хранилище недоступно.';
    }).catch(() => { status.textContent = 'Не удалось прочитать выбранный файл.'; });
  }
  buildPlayPass();
  renderPlayPass();
  document.querySelectorAll('[data-launch]').forEach(link => link.addEventListener('click', () => recordPassLaunch(link.dataset.launch)));
  document.querySelector('#pass-play-daily').addEventListener('click', () => {
    const today = utcDateKey(), id = gameForUtcDay(today), link = document.querySelector('[data-launch="' + id + '"]');
    if (!link) { document.querySelector('#pass-daily-status').textContent = 'Сегодняшний маршрут временно недоступен.'; return; }
    playPass.dailyRouteOpened[today] = id; savePass(); renderPlayPass();
    link.click();
  });
  document.querySelector('#pass-share').addEventListener('click', () => { void sharePlayPass(); });
  document.querySelector('#pass-export').addEventListener('click', exportPlayPass);
  document.querySelector('#pass-import').addEventListener('click', () => document.querySelector('#pass-file').click());
  document.querySelector('#pass-file').addEventListener('change', event => {
    importPlayPassFile(event.target.files?.[0]);
    event.target.value = '';
  });
  document.querySelector('#pass-reset').addEventListener('click', () => {
    if (!window.confirm('Сбросить только локальный OSGARD PLAY PASS? Избранное, каталог и игровые сохранения останутся нетронутыми.')) return;
    playPass = makeDefaultPass(); savePass(); renderPlayPass();
    document.querySelector('#pass-status').textContent = 'Паспорт сброшен. Избранное и сохранения игр не изменены.';
  });
  window.addEventListener('storage', event => {
    if (event.key === PLAY_PASS_KEY) { playPass = readPass(); renderPlayPass(); }
    if (event.key === FAVORITES_KEY) renderPlayPass();
  });

  document.querySelector('#footer-year').textContent = String(new Date().getFullYear());
  renderRecent();
  render();
  track('catalog_viewed', 'unknown', 'entertainment-hub');
})();
