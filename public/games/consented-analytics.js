(() => {
  'use strict';

  // Consent-gated, bounded delivery queue for non-personal game/catalog events.
  // No event is queued or sent unless the player explicitly opted in.
  const QUEUE_KEY = 'osgard.games.analytics-pending.v1';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const MAX_PENDING = 100;
  const BATCH_SIZE = 20;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const ALLOWED_EVENTS = new Set([
    'premium_page_view', 'catalog_viewed', 'partners_page_viewed', 'ecosystem_directory_viewed',
    'expedition_route_created', 'expedition_link_opened', 'expedition_share_intent', 'expedition_stage_completed',
    'share_created', 'referral_link_opened', 'game_session_started',
    'checkout_started', 'checkout_paid', 'cross_promo_clicked',
    'owned_promo_impression', 'owned_promo_intermission_skipped',
    'owned_promo_preferences_saved', 'owned_promo_snoozed', 'owned_promo_snooze_cleared', 'social_share_intent', 'social_reward_claimed', 'referral_reward_claimed', 'invite_link_prepared',
    'game_launched', 'game_session_completed', 'lead_submitted', 'partner_inquiry',
    'relay_seen', 'relay_opt_in', 'relay_game_1_started', 'relay_milestone_reached', 'relay_game_2_selected', 'relay_game_2_started', 'relay_completed', 'relay_invite_link_prepared', 'relay_invite_opened', 'relay_invite_accepted', 'relay_abandoned',
    'sponsored_campaign_impression', 'sponsored_campaign_clicked',
    'pwa_install_prompt_shown', 'pwa_install_accepted', 'pwa_install_dismissed', 'pwa_standalone_opened', 'product_experiment_exposed', 'product_experiment_converted',
    'catalog_search_used', 'catalog_filter_changed', 'game_favorite_toggled',
    'game_player_fullscreen_opened', 'game_player_retry_requested', 'game_player_error_shown',
    'accessibility_preferences_changed'
  ]);
  const GAME_IDS = new Set([
    'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
    'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid', 'heist-echo', 'unknown'
  ]);
  let flushPromise = null;
  let activeController = null;

  const consentGranted = () => {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
    catch { return false; }
  };
  const clean = (value, max) => String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);

  function normalizeEvent(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const eventId = clean(raw.eventId, 96);
    const sessionId = clean(raw.sessionId, 96);
    const name = clean(raw.name, 60);
    const gameId = clean(raw.gameId, 40) || 'unknown';
    const source = clean(raw.source, 80) || 'direct';
    const rawPath = clean(raw.path, 160).split('?')[0];
    const durationSeconds = Number(raw.durationSeconds ?? 0);
    if (!/^[a-zA-Z0-9_-]{12,96}$/.test(eventId)) return null;
    if (!/^[a-zA-Z0-9_-]{12,96}$/.test(sessionId)) return null;
    if (!ALLOWED_EVENTS.has(name) || !GAME_IDS.has(gameId)) return null;
    if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) return null;
    return {
      eventId,
      name,
      sessionId,
      gameId,
      source,
      path: rawPath.startsWith('/') ? rawPath.slice(0, 120) : '/',
      durationSeconds
    };
  }

  function readQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      const byId = new Map();
      for (const item of parsed) {
        const event = normalizeEvent(item);
        const queuedAt = Number(item?.queuedAt);
        if (!event || !Number.isFinite(queuedAt) || queuedAt > now + 60_000 || now - queuedAt > MAX_AGE_MS) continue;
        if (!byId.has(event.eventId)) byId.set(event.eventId, { ...event, queuedAt });
      }
      return [...byId.values()].slice(-MAX_PENDING);
    } catch {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      const bounded = queue.slice(-MAX_PENDING);
      if (bounded.length === 0) {
        localStorage.removeItem(QUEUE_KEY);
        return true;
      }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(bounded));
      return true;
    } catch {
      return false;
    }
  }

  function clearQueue() {
    if (activeController) { try { activeController.abort(); } catch { /* best-effort cancellation */ } }
    try { localStorage.removeItem(QUEUE_KEY); } catch { /* storage is optional */ }
  }

  async function resolveApiBase(signal) {
    try {
      const response = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin', signal });
      const config = response.ok ? await response.json() : {};
      const raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
      if (!raw) {
        // Empty config never means “assume an API exists”: probe only the documented
        // same-origin route, with no cookies, and require explicit database readiness.
        const healthResponse = await fetch('/commerce-api/healthz', {
          cache: 'no-store', credentials: 'omit', signal,
        });
        const health = healthResponse.ok ? await healthResponse.json().catch(() => ({})) : {};
        return healthResponse.ok && health.service === 'osgard-commerce-api' && health.databaseReady === true
          ? location.origin + '/commerce-api'
          : '';
      }
      try {
        const parsed = new URL(raw, location.origin);
        const localApi = ['localhost', '127.0.0.1'].includes(parsed.hostname);
        const allowedPath = parsed.pathname === '/' || (parsed.pathname === '/commerce-api' && (parsed.origin === location.origin || parsed.origin === 'https://osgard.world'));
        if ((parsed.protocol !== 'https:' && !(localApi && parsed.protocol === 'http:')) || parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) return '';
        return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
      } catch {
        return '';
      }
    } catch {
      return '';
    }
  }

  async function postBatch(events) {
    if (!consentGranted()) return false;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    activeController = controller;
    try {
      const base = await resolveApiBase(controller?.signal);
      if (!base || !consentGranted() || controller?.signal.aborted) return false;
      const response = await fetch(base + '/v1/events', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        signal: controller?.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events })
      });
      if (!consentGranted() || controller?.signal.aborted || !response.ok) return false;
      const result = await response.json().catch(() => null);
      return consentGranted() && Number(result?.accepted) === events.length;
    } finally {
      if (activeController === controller) activeController = null;
    }
  }

  function flush() {
    if (!consentGranted()) {
      clearQueue();
      return Promise.resolve(false);
    }
    if (flushPromise) return flushPromise;
    // Do not claim the queue while it is empty. In particular, a synchronous
    // first enqueue must not attach itself to an already-resolved empty flush.
    const initialQueue = readQueue();
    if (initialQueue.length === 0) {
      writeQueue(initialQueue);
      return Promise.resolve(true);
    }
    flushPromise = (async () => {
      let queue = readQueue();
      if (!writeQueue(queue)) return false;
      while (queue.length && consentGranted()) {
        const batch = queue.slice(0, BATCH_SIZE);
        const ids = new Set(batch.map(event => event.eventId));
        let accepted = false;
        try { accepted = await postBatch(batch); } catch { accepted = false; }
        // Leave the batch in local storage unless the server acknowledges it.
        if (!accepted) break;
        queue = readQueue().filter(event => !ids.has(event.eventId));
        if (!writeQueue(queue)) break;
      }
      return queue.length === 0;
    })().catch(() => false).finally(() => { flushPromise = null; });
    return flushPromise;
  }

  function enqueue(raw) {
    if (!consentGranted()) {
      clearQueue();
      return Promise.resolve(false);
    }
    const event = normalizeEvent(raw);
    if (!event) return Promise.resolve(false);
    const queue = readQueue();
    if (queue.some(item => item.eventId === event.eventId)) {
      void flush();
      return Promise.resolve(true);
    }
    queue.push({ ...event, queuedAt: Date.now() });
    const bounded = queue.slice(-MAX_PENDING);
    if (!writeQueue(bounded)) {
      // If storage is blocked, preserve the normal online path without retrying or
      // retaining events outside this page session.
      return postBatch([event]).catch(() => false);
    }
    void flush();
    // `true` means safely queued, not yet guaranteed delivered. This prevents
    // callers from generating a second event ID when the network is offline.
    return Promise.resolve(true);
  }

  function syncConsent() {
    if (consentGranted()) void flush();
    else clearQueue();
  }

  window.OSGARD_CONSENTED_ANALYTICS = Object.freeze({ enqueue, flush, clear: clearQueue });
  window.addEventListener('online', () => { void flush(); });
  window.addEventListener('pageshow', () => { void flush(); });
  window.addEventListener('focus', () => { void flush(); });
  window.addEventListener('storage', event => {
    if (event.key === CONSENT_KEY) syncConsent();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
  document.querySelector('#analytics-toggle')?.addEventListener('click', () => {
    queueMicrotask(syncConsent);
  });
  syncConsent();
})();
