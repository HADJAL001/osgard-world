(() => {
  'use strict';
  if (window.OSGARDGamesFunnel) return;
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const SESSION_KEY = 'osgard.games.funnel-session.v1';
  const GAME_IDS = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid','unknown']);
  const ALLOWED = new Set(['catalog_search_used','catalog_filter_changed','game_favorite_toggled','game_player_fullscreen_opened','game_player_retry_requested','game_player_error_shown','accessibility_preferences_changed']);
  let lastGameId = 'unknown', searchTimer = 0, lastSearchBucket = '', lastErrorKey = '';
  function consentGranted() { try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; } }
  function token(prefix) {
    let value = '';
    try { value = crypto.randomUUID().replace(/-/g, ''); }
    catch { value = Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
    return prefix + value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  }
  function getSessionId() {
    if (!consentGranted()) return '';
    try {
      let value = sessionStorage.getItem(SESSION_KEY) || '';
      if (!/^[a-zA-Z0-9_-]{12,96}$/.test(value)) { value = token('sess_'); sessionStorage.setItem(SESSION_KEY, value); }
      return value;
    } catch { return token('sess_'); }
  }
  function track(name, gameId = 'unknown', source = 'games-hub') {
    if (!ALLOWED.has(name) || !consentGranted()) return false;
    const analytics = window.OSGARD_CONSENTED_ANALYTICS;
    if (!analytics || typeof analytics.enqueue !== 'function') return false;
    const sessionId = getSessionId();
    if (!sessionId) return false;
    const event = {
      eventId: token('evt_'), name, sessionId,
      gameId: GAME_IDS.has(gameId) ? gameId : 'unknown',
      source: String(source).replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 80) || 'games-hub',
      path: location.pathname.slice(0, 120) || '/games/', durationSeconds: 0
    };
    // Never send typed search text, complete URLs, form values or personal identifiers.
    // Analytics is optional: a queue/API failure must never break catalogue interactions.
    try {
      const queued = analytics.enqueue(event);
      if (queued && typeof queued.then === 'function') void Promise.resolve(queued).catch(() => {});
      return queued !== false;
    } catch {
      return false;
    }
  }
  const search = document.getElementById('game-search');
  search?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      const value = String(search.value || '').trim();
      if (value.length < 2) { lastSearchBucket = ''; return; }
      const bucket = value.length <= 3 ? '2-3' : value.length <= 7 ? '4-7' : '8-plus';
      if (bucket === lastSearchBucket) return;
      lastSearchBucket = bucket;
      track('catalog_search_used', 'unknown', 'games-hub-search:' + bucket);
    }, 700);
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const favorite = target.closest('button[data-favorite]');
    if (favorite) {
      const id = String(favorite.getAttribute('data-favorite') || 'unknown');
      track('game_favorite_toggled', GAME_IDS.has(id) ? id : 'unknown', 'games-hub-favorite');
      return;
    }
    const filter = target.closest('button[data-filter]');
    if (filter) {
      const genre = String(filter.getAttribute('data-filter') || 'all').toLowerCase();
      if (/^(all|tactical|systems|social|creative|arcade)$/.test(genre)) track('catalog_filter_changed', 'unknown', 'games-hub-filter:' + genre);
    }
    const playLink = target.closest('a[data-play]');
    if (playLink) {
      const id = String(playLink.getAttribute('data-play') || 'unknown');
      if (GAME_IDS.has(id)) lastGameId = id;
    }
  });
  document.getElementById('player-fullscreen')?.addEventListener('click', () => track('game_player_fullscreen_opened', lastGameId, 'player-fullscreen-button'));
  window.addEventListener('osgard:accessibility-preferences-updated', () => track('accessibility_preferences_changed', lastGameId, 'accessibility-panel'));
  const dialog = document.getElementById('player-dialog'), status = document.getElementById('player-status'), frame = document.getElementById('player-frame');
  const tools = dialog?.querySelector('.player-tools');
  if (tools && frame && !document.getElementById('player-retry')) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.id = 'player-retry'; retry.textContent = 'Повторить загрузку ↻';
    retry.setAttribute('aria-label', 'Повторить загрузку текущей игры');
    retry.title = 'Перезагрузить игровое окно, если оно зависло';
    const before = document.getElementById('player-share');
    tools.insertBefore(retry, before || tools.firstChild);
    retry.addEventListener('click', () => {
      const src = frame.getAttribute('src') || frame.src;
      if (!src || src === 'about:blank') { if (status) status.textContent = 'Сначала выбери игру в каталоге.'; return; }
      track('game_player_retry_requested', lastGameId, 'player-retry-button');
      if (status) status.textContent = 'Повторно загружаем игровой клиент…';
      frame.src = new URL(src, location.href).href;
    });
  }
  if (status && typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      const text = String(status.textContent || '').toLowerCase();
      if (!/(не удалось|ошибк|недоступ|не загруз|timeout|failed|unavailable)/i.test(text)) { lastErrorKey = ''; return; }
      const bucket = text.includes('timeout') ? 'timeout' : text.includes('unavailable') || text.includes('недоступ') ? 'unavailable' : text.includes('не загруз') ? 'load' : 'error';
      if (bucket === lastErrorKey) return;
      lastErrorKey = bucket;
      track('game_player_error_shown', lastGameId, 'player-error:' + bucket);
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }
  window.OSGARDGamesFunnel = Object.freeze({ version: '1.0.0', track, allowedEvents: [...ALLOWED], consented: consentGranted });
})();