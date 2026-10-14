(() => {
  'use strict';
  const root = document.getElementById('osgard-live-sponsored');
  if (!root) return;
  const STORAGE_KEY = 'osgard.games.sponsor-exposures.v1';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const DISCLOSURES = new Set(['Реклама', 'Партнёрский материал', 'Спонсорский материал']);
  const SESSION_ID = 'sess_' + randomId();
  const impressionsSent = new Set();
  let observer = null;
  let storage = null;
  let storageChecked = false;

  function randomId() {
    try { if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, ''); }
    catch { /* fallback below */ }
    return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  function availableStorage() {
    for (const candidate of [() => localStorage, () => sessionStorage]) {
      try {
        const target = candidate();
        const testKey = STORAGE_KEY + '.test';
        target.setItem(testKey, '1');
        target.removeItem(testKey);
        return target;
      } catch { /* try the next browser storage surface */ }
    }
    return null;
  }
  function storageForConsent() {
    if (!consentGranted()) return null;
    if (!storageChecked) {
      storage = availableStorage();
      storageChecked = true;
    }
    return storage;
  }
  function safeText(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = String(value ?? '');
    return node;
  }
  function safeTarget(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password || url.search || url.hash) return null;
      url.searchParams.set('utm_source', 'osgard_world');
      url.searchParams.set('utm_medium', 'sponsored');
      return url;
    } catch { return null; }
  }
  function readExposureMap() {
    const targetStorage = storageForConsent();
    if (!targetStorage) return consentGranted() ? null : {};
    try {
      const raw = JSON.parse(targetStorage.getItem(STORAGE_KEY) || '{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const now = Date.now();
      const result = {};
      for (const [id, values] of Object.entries(raw).slice(0, 100)) {
        if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id) || !Array.isArray(values)) continue;
        const dates = values.filter(value => Number.isFinite(value) && value <= now && now - value < MAX_AGE).slice(-20);
        if (dates.length) result[id] = dates;
      }
      return result;
    } catch { return {}; }
  }
  function recordExposure(id, cap) {
    const map = readExposureMap();
    if (!map) return false;
    const current = map[id] || [];
    const valid = current.filter(value => Date.now() - value < MAX_AGE);
    if (valid.length >= cap) return false;
    valid.push(Date.now());
    map[id] = valid.slice(-20);
    const targetStorage = storageForConsent();
    if (!consentGranted()) return true; // No persistent exposure tracking without opt-in.
    if (!targetStorage) return false;
    try { targetStorage.setItem(STORAGE_KEY, JSON.stringify(map)); return true; }
    catch { return false; }
  }
  function canShow(id, cap) {
    if (!consentGranted()) return true; // Ads may display, but no persistent cap/metrics are stored.
    const map = readExposureMap();
    if (!map) return false;
    return (map[id] || []).filter(value => Date.now() - value < MAX_AGE).length < cap;
  }
  function recordEvent(name, id) {
    // The shared analytics bridge independently enforces opt-in and validates schema.
    const analytics = window.OSGARD_CONSENTED_ANALYTICS;
    if (!analytics || typeof analytics.enqueue !== 'function') return;
    let consent = false;
    try { consent = localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { consent = false; }
    if (!consent) return;
    analytics.enqueue({
      eventId: 'evt_' + randomId(),
      name,
      sessionId: SESSION_ID,
      gameId: 'unknown',
      source: 'sponsor-campaign:' + id,
      path: '/games/',
      durationSeconds: 0,
    });
  }
  function isActuallyVisible(card) {
    if (!card.isConnected || document.hidden) return false;
    const rect = card.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return width * height >= rect.width * rect.height * 0.5;
  }
  function registerVisible(card, item) {
    if (impressionsSent.has(item.id)) return;
    if (!recordExposure(item.id, item.frequencyCap)) {
      card.remove();
      if (root.querySelectorAll('.og-live-sponsored__card').length === 0) root.hidden = true;
      return;
    }
    impressionsSent.add(item.id);
    recordEvent('sponsored_campaign_impression', item.id);
  }
  function render(items) {
    const safeItems = items.filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (!/^[a-zA-Z0-9_-]{8,64}$/.test(String(item.id || ''))) return false;
      if (!DISCLOSURES.has(item.sponsorDisclosure)) return false;
      if (typeof item.sponsorName !== 'string' || item.sponsorName.length < 2 || item.sponsorName.length > 100) return false;
      if (typeof item.title !== 'string' || item.title.length < 3 || item.title.length > 100) return false;
      if (typeof item.description !== 'string' || item.description.length < 10 || item.description.length > 500) return false;
      const target = safeTarget(item.targetUrl);
      if (!target || item.placement !== 'catalog_feature' || !Number.isInteger(item.frequencyCap) || item.frequencyCap < 1 || item.frequencyCap > 20) return false;
      return canShow(item.id, item.frequencyCap);
    }).slice(0, 3);
    if (!safeItems.length) return;

    const label = safeText('p', 'og-live-sponsored__label', 'Партнёрские предложения · рекламный материал');
    const grid = document.createElement('div'); grid.className = 'og-live-sponsored__grid';
    for (const item of safeItems) {
      const target = safeTarget(item.targetUrl);
      if (!target) continue;
      target.searchParams.set('utm_campaign', item.id);
      const card = document.createElement('a');
      card.className = 'og-live-sponsored__card';
      card.dataset.campaignId = item.id;
      card.__campaign = item;
      card.href = target.href;
      card.target = '_blank';
      card.rel = 'sponsored noopener noreferrer';
      card.setAttribute('aria-label', item.sponsorDisclosure + ': ' + item.title + '. Откроется в новой вкладке.');
      const disclosure = safeText('span', 'disclosure', item.sponsorDisclosure);
      const sponsor = safeText('span', 'sponsor', item.sponsorName);
      const title = safeText('strong', '', item.title);
      const description = safeText('span', 'description', item.description);
      const cta = document.createElement('span'); cta.className = 'cta';
      cta.append(safeText('span', '', 'Изучить предложение'), safeText('span', '', '↗'));
      card.append(disclosure, sponsor, title, description, cta);
      card.addEventListener('click', () => recordEvent('sponsored_campaign_clicked', item.id));
      grid.append(card);
      if (observer) observer.observe(card);
    }
    if (!grid.childElementCount) return;
    root.replaceChildren(label, grid, safeText('p', 'og-live-sponsored__note', 'Спонсорский блок отделён от игрового управления. Показ ограничивается настройкой на этом устройстве; межустройственный лимит не гарантируется.'));
    root.hidden = false;
  }
  async function apiBase() {
    const response = await fetch('/games/commerce-config.json', {
      cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return '';
    const config = await response.json().catch(() => ({}));
    const raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
    if (!raw) return '';
    try {
      const parsed = new URL(raw, location.origin);
      const localApi = ['localhost', '127.0.0.1'].includes(parsed.hostname);
      const allowedPath = parsed.pathname === '/' || (parsed.pathname === '/commerce-api' && parsed.origin === location.origin);
      if ((parsed.protocol !== 'https:' && !(localApi && parsed.protocol === 'http:')) ||
          parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) return '';
      return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch { return ''; }
  }
  async function init() {
    // Without visibility measurement impressions cannot be defined. If consent is
    // present, persistent frequency capping must also be available; without consent,
    // cards may display but neither storage nor analytics is used.
    if (!('IntersectionObserver' in window)) return;
    if (consentGranted() && !storageForConsent()) return;
    try {
      const base = await apiBase();
      if (!base) return; // API is unconfigured in the release baseline; keep the slot hidden.
      const response = await fetch(base + '/v1/campaigns/active?placement=catalog_feature', {
        cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.items)) return;
      // Cards are only rendered by a configured API; each is clearly labelled and UTM-tagged.
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
            const card = entry.target;
            const item = card.__campaign;
            if (!item || card.dataset.impressionPending === 'true' || impressionsSent.has(item.id)) continue;
            card.dataset.impressionPending = 'true';
            window.setTimeout(() => {
              card.dataset.impressionPending = 'false';
              if (!card.isConnected) return;
              if (isActuallyVisible(card)) {
                observer.unobserve(card);
                registerVisible(card, item);
              }
            }, 1000);
          }
        }, { threshold: [0.5] });
      }
      render(data.items);
    } catch {
      root.hidden = true;
    }
  }
  // Defer even the API request until the catalog slot is close to the viewport.
  if (storage && 'IntersectionObserver' in window) {
    const catalogTrigger = document.getElementById('catalog') || root;
    const lazyObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      lazyObserver.disconnect();
      void init();
    }, { rootMargin: '400px 0px', threshold: 0 });
    lazyObserver.observe(catalogTrigger);
  }
})();
