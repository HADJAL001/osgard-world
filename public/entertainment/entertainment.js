(() => {
  'use strict';

  const FAVORITES_KEY = 'osgard.games.favorites.v1';
  const RECENT_KEY = 'osgard.entertainment.recent.v1';
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
  document.querySelector('#favorites-filter').addEventListener('click', () => { /* delegated toggle above performs render */ });
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
  document.querySelector('#footer-year').textContent = String(new Date().getFullYear());
  renderRecent();
  render();
  track('catalog_viewed', 'unknown', 'entertainment-hub');
})();
