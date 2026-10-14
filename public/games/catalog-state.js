(() => {
  'use strict';

  const search = document.getElementById('game-search');
  const grid = document.getElementById('games-grid');
  const shareButton = document.getElementById('catalog-share-state');
  const shareStatus = document.getElementById('catalog-share-status');
  const favoriteButton = document.getElementById('favorites-filter');
  const clearButton = document.getElementById('clear-filters');
  window.OSGARDCatalogState = Object.freeze({ normalizedState });

  if (!search || !grid) return;

  const allowedGenres = new Set(['all', 'tactical', 'systems', 'social', 'creative', 'arcade']);
  let restoring = true;
  let replaceTimer = 0;

  function normalizedState(raw) {
    const genre = allowedGenres.has(String(raw?.genre || 'all')) ? String(raw?.genre || 'all') : 'all';
    const query = String(raw?.query || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 100);
    return { query, genre, favorites: Boolean(raw?.favorites) };
  }

  function readStateFromPage() {
    const activeGenre = document.querySelector('[data-filter].active')?.dataset.filter || 'all';
    return normalizedState({
      query: search.value,
      genre: activeGenre,
      favorites: favoriteButton?.getAttribute('aria-pressed') === 'true'
    });
  }

  function stateFromUrl() {
    const params = new URLSearchParams(location.search);
    return normalizedState({
      query: params.get('q') || '',
      genre: params.get('genre') || 'all',
      favorites: params.get('favorites') === '1'
    });
  }

  function applyState(state) {
    if (state.query) {
      search.value = state.query;
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const genreButton = document.querySelector('[data-filter="' + state.genre + '"]');
    if (genreButton && genreButton.dataset.filter !== 'all') genreButton.click();
    if (state.favorites && favoriteButton?.getAttribute('aria-pressed') !== 'true') favoriteButton.click();
  }

  function updateUrl() {
    if (restoring) return;
    const state = readStateFromPage();
    const url = new URL(location.href);
    for (const key of ['q', 'genre', 'favorites']) url.searchParams.delete(key);
    if (state.query) url.searchParams.set('q', state.query);
    if (state.genre !== 'all') url.searchParams.set('genre', state.genre);
    if (state.favorites) url.searchParams.set('favorites', '1');
    const next = url.pathname + (url.searchParams.size ? '?' + url.searchParams.toString() : '') + url.hash;
    const current = location.pathname + location.search + location.hash;
    if (next !== current) history.replaceState(history.state, '', next);
  }

  function scheduleUrlSync() {
    if (restoring) return;
    window.clearTimeout(replaceTimer);
    replaceTimer = window.setTimeout(updateUrl, 100);
  }

  function shareableUrl() {
    const state = readStateFromPage();
    const url = new URL('/games/', location.origin);
    if (state.query) url.searchParams.set('q', state.query);
    if (state.genre !== 'all') url.searchParams.set('genre', state.genre);
    if (state.favorites) url.searchParams.set('favorites', '1');
    return url.href;
  }

  function token(bytes = 12) {
    const data = new Uint8Array(bytes);
    try { crypto.getRandomValues(data); }
    catch { for (let index = 0; index < data.length; index += 1) data[index] = Math.floor(Math.random() * 256); }
    return Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function trackShare() {
    if (localStorageConsent() !== 'yes') return;
    const queue = window.OSGARD_CONSENTED_ANALYTICS;
    if (!queue || typeof queue.enqueue !== 'function') return;
    let sessionId = '';
    try { sessionId = sessionStorage.getItem('osgard.games.share-session.v1') || ''; } catch {}
    if (!/^session_[a-f0-9]{24}$/.test(sessionId)) {
      sessionId = 'session_' + token(12);
      try { sessionStorage.setItem('osgard.games.share-session.v1', sessionId); } catch {}
    }
    void queue.enqueue({
      eventId: 'evt_' + token(12),
      name: 'share_created',
      sessionId,
      gameId: 'unknown',
      source: 'catalog-filter-share',
      path: '/games/',
      durationSeconds: 0
    });
  }

  function localStorageConsent() {
    try { return localStorage.getItem('osgard.games.analytics-consent.v1') || 'no'; }
    catch { return 'no'; }
  }

  async function copyUrl(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Clipboard API unavailable');
  }

  async function shareCatalog() {
    const url = shareableUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'OSGARD PLAY — моя подборка',
          text: 'Подборка игровых миров OSGARD',
          url
        });
      } else {
        await copyUrl(url);
        if (shareStatus) shareStatus.textContent = 'Ссылка на подборку скопирована.';
      }
      trackShare();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (shareStatus) shareStatus.textContent = 'Не удалось поделиться автоматически. Скопируй адрес из строки браузера.';
    }
  }

  search.addEventListener('input', scheduleUrlSync);
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', scheduleUrlSync));
  favoriteButton?.addEventListener('click', scheduleUrlSync);
  clearButton?.addEventListener('click', scheduleUrlSync);
  shareButton?.addEventListener('click', shareCatalog);

  const initialState = stateFromUrl();
  applyState(initialState);
  restoring = false;
  updateUrl();

  // Helpers exposed read-only so the smoke suite can verify deep-link normalization.
  window.OSGARDCatalogState = Object.freeze({ normalizedState, stateFromUrl, shareableUrl });
})();