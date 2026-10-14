(() => {
  'use strict';
  const cards = Array.from(document.querySelectorAll('[data-game]'));
  const search = document.getElementById('game-search');
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const status = document.getElementById('catalog-status');
  const count = document.getElementById('visible-count');
  const favoriteCount = document.getElementById('favorite-count');
  const favoritesOnly = document.getElementById('favorites-filter');
  const emptyState = document.getElementById('empty-state');
  const recentGrid = document.getElementById('recent-grid');
  const shareButton = document.getElementById('share-catalog');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const analyticsButton = document.getElementById('analytics-toggle');
  const analyticsState = document.getElementById('analytics-state');
  const FAVOURITES_KEY = 'osgard.games.favorites.v1';
  const RECENT_KEY = 'osgard.games.recent.v1';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const ANALYTICS = window.OSGARD_CONSENTED_ANALYTICS;
  const analyticsSessionId = 'session_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)));
  let searchEventRecorded = false;

  function analyticsEnabled() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
  }
  function recordEvent(name, source, gameId = 'unknown') {
    if (!analyticsEnabled() || typeof ANALYTICS?.enqueue !== 'function') return false;
    const eventId = 'event_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)));
    void ANALYTICS.enqueue({
      eventId, sessionId: analyticsSessionId, name, gameId, source,
      path: location.pathname, durationSeconds: 0
    });
    return true;
  }
  function syncAnalyticsPreference() {
    const enabled = analyticsEnabled();
    if (analyticsButton) {
      analyticsButton.setAttribute('aria-pressed', String(enabled));
      analyticsButton.textContent = enabled ? 'Disable optional analytics' : 'Enable optional analytics';
    }
    if (analyticsState) analyticsState.textContent = enabled
      ? 'Optional analytics are on. You can turn them off here.'
      : 'Optional analytics are off.';
    return enabled;
  }
  const allowed = new Set(cards.map(card => card.dataset.game));
  let activeFilter = 'all';
  let favourites = readIds(FAVOURITES_KEY);
  let recent = readRecent();

  function readIds(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? Array.from(new Set(parsed.filter(id => typeof id === 'string' && allowed.has(id)))).slice(0, 11) : [];
    } catch { return []; }
  }
  function readRecent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(entry => entry && typeof entry.id === 'string' && allowed.has(entry.id) && Number.isFinite(entry.at)).sort((a,b) => b.at-a.at).slice(0,11);
    } catch { return []; }
  }
  function persist(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  function updateFavorites() {
    for (const card of cards) {
      const id = card.dataset.game;
      const button = card.querySelector('[data-favorite]');
      const isSaved = favourites.includes(id);
      if (button) {
        button.setAttribute('aria-pressed', String(isSaved));
        button.textContent = isSaved ? '★' : '☆';
        button.setAttribute('aria-label', (isSaved ? 'Remove ' : 'Add ') + card.querySelector('h3').textContent + ' ' + (isSaved ? 'from' : 'to') + ' favourites');
      }
    }
    if (favoriteCount) favoriteCount.textContent = String(favourites.length);
  }
  function updateCatalog() {
    const query = String(search?.value || '').trim().toLocaleLowerCase('en');
    let shown = 0;
    for (const card of cards) {
      const genreMatch = activeFilter === 'all' || (activeFilter === 'favorites' ? favourites.includes(card.dataset.game) : card.dataset.category === activeFilter);
      const text = [card.dataset.search || '', card.textContent || ''].join(' ').toLocaleLowerCase('en');
      const queryMatch = !query || text.includes(query);
      const visible = genreMatch && queryMatch;
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    if (count) count.textContent = String(shown).padStart(2, '0');
    if (status) status.textContent = 'Showing ' + shown + ' of ' + cards.length + ' games';
    if (emptyState) emptyState.hidden = shown > 0;
    for (const button of filters) {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }
  function campaignHref(href, id) {
    const url = new URL(href, location.origin);
    if (url.origin !== location.origin) return href;
    url.searchParams.set('utm_source', 'osgard_games');
    url.searchParams.set('utm_medium', 'global_catalog');
    url.searchParams.set('utm_campaign', 'global_launch');
    url.searchParams.set('utm_content', id);
    return url.pathname + url.search + url.hash;
  }
  function renderRecent() {
    if (!recentGrid) return;
    recentGrid.replaceChildren();
    if (!recent.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'recent-empty';
      placeholder.textContent = 'Your recently opened games will appear here on this device.';
      recentGrid.append(placeholder);
      return;
    }
    for (const entry of recent.slice(0, 4)) {
      const card = cards.find(item => item.dataset.game === entry.id);
      if (!card) continue;
      const source = card.querySelector('[data-launch-game]');
      if (!source) continue;
      const anchor = document.createElement('a');
      anchor.className = 'recent-card';
      anchor.href = campaignHref(source.getAttribute('href'), entry.id);
      const label = document.createElement('span');
      label.textContent = new Date(entry.at).toLocaleDateString('en', { year:'numeric', month:'short', day:'numeric' });
      const title = document.createElement('strong');
      title.textContent = card.querySelector('h3').textContent;
      const hint = document.createElement('small');
      hint.textContent = 'Open this world again ↗';
      anchor.append(label, title, hint);
      anchor.addEventListener('click', () => recordRecent(entry.id));
      recentGrid.append(anchor);
    }
  }
  function recordRecent(id) {
    recent = [{ id, at: Date.now() }, ...recent.filter(entry => entry.id !== id)].slice(0,11);
    persist(RECENT_KEY, recent);
    renderRecent();
  }
  for (const button of filters) {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      recordEvent('catalog_filter_changed', 'games_en_filter_' + activeFilter);
      updateCatalog();
    });
  }
  search?.addEventListener('input', () => {
    updateCatalog();
    if (!searchEventRecorded && String(search.value || '').trim()) {
      searchEventRecorded = recordEvent('catalog_search_used', 'games_en_search');
    }
  });
  for (const button of document.querySelectorAll('[data-favorite]')) {
    button.addEventListener('click', () => {
      const id = button.dataset.favorite;
      if (!id || !allowed.has(id)) return;
      favourites = favourites.includes(id) ? favourites.filter(value => value !== id) : [...favourites, id].slice(-11);
      persist(FAVOURITES_KEY, favourites);
      recordEvent('game_favorite_toggled', 'games_en_favourite_' + id, id);
      updateFavorites();
      updateCatalog();
    });
  }
  for (const anchor of document.querySelectorAll('[data-launch-game]')) {
    anchor.addEventListener('click', () => {
      const gameId = anchor.dataset.launchGame;
      recordRecent(gameId);
      recordEvent('game_launched', 'games_en_launch', gameId);
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    search?.focus();
  });
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    if (search) search.value = '';
    activeFilter = 'all';
    updateCatalog();
    search?.focus();
  });
  for (const link of document.querySelectorAll('.project-link')) {
    link.addEventListener('click', () => {
      let slug = 'project';
      try { slug = new URL(link.href).hostname.replace(/^www\\./, '').replace(/[^a-z0-9.-]/g, '').slice(0, 55); } catch { /* keep generic label */ }
      recordEvent('cross_promo_clicked', 'games_en_project_' + slug);
    });
  }
  analyticsButton?.addEventListener('click', () => {
    const enabled = analyticsEnabled();
    try { localStorage.setItem(CONSENT_KEY, enabled ? 'no' : 'yes'); } catch { /* analytics remains disabled when storage is unavailable */ }
    const nowEnabled = syncAnalyticsPreference();
    if (nowEnabled) recordEvent('catalog_viewed', 'games_en_opt_in');
  });
  shareButton?.addEventListener('click', () => recordEvent('share_created', 'games_en_share'));
  menuButton?.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
    if (mobileNav) mobileNav.hidden = expanded;
  });
  mobileNav?.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !event.target.closest('a')) return;
    if (menuButton) { menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','Open menu'); }
    if (mobileNav) mobileNav.hidden = true;
  });
  shareButton?.addEventListener('click', async () => {
    const message = 'OSGARD PLAY — eleven original game worlds';
    try {
      if (navigator.share) await navigator.share({ title: document.title, text: message, url: location.href });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); shareButton.textContent = '✓'; shareButton.setAttribute('aria-label','Catalog link copied'); }
      else { const fallback = document.createElement('textarea'); fallback.value = location.href; fallback.readOnly = true; fallback.className='sr'; document.body.append(fallback); fallback.select(); document.execCommand('copy'); fallback.remove(); shareButton.textContent='✓'; }
    } catch (error) { if (error?.name !== 'AbortError') shareButton.setAttribute('aria-label','Unable to share automatically; copy the page URL from the address bar'); }
  });
  updateFavorites();
  updateCatalog();
  renderRecent();
  const consentOnEntry = syncAnalyticsPreference();
  if (consentOnEntry) recordEvent('catalog_viewed', 'games_en_view');
})();