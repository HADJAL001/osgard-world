(() => {
  'use strict';
  const cards = Array.from(document.querySelectorAll('[data-project]'));
  const search = document.getElementById('project-search');
  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  const count = document.getElementById('project-count');
  const empty = document.getElementById('empty-state');
  const consentButton = document.getElementById('analytics-toggle');
  const consentState = document.getElementById('consent-state');
  const deliveryState = document.getElementById('analytics-delivery-state');
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const PENDING_KEY = 'osgard.games.analytics-pending.v1';
  const SESSION_KEY = 'osgard.games.ecosystem-session.v1';
  const ALLOWED_PROJECTS = new Set([
    'osgardbewworld', 'o2system', 'senjorio', 'superday', 'marcosa',
    'myosa', 'gold-glamour', 'gardvpn', 'osgardos', 'osgardvanguard',
  ]);
  let activeFilter = 'all';
  let activeSessionId = '';

  function currentConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
    catch { return false; }
  }
  function makeEventId() {
    try {
      const value = crypto.randomUUID();
      if (/^[a-zA-Z0-9_-]{12,96}$/.test(value)) return value;
    } catch { /* use a per-page fallback when Web Crypto is unavailable */ }
    return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 18);
  }
  function getSessionId() {
    if (activeSessionId) return activeSessionId;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (typeof saved === 'string' && /^[a-zA-Z0-9_-]{12,96}$/.test(saved)) {
        activeSessionId = saved;
        return saved;
      }
    } catch { /* session storage is optional */ }
    activeSessionId = makeEventId();
    try { sessionStorage.setItem(SESSION_KEY, activeSessionId); } catch { /* keep this page's session in memory */ }
    return activeSessionId;
  }
  function syncConsent() {
    const enabled = currentConsent();
    if (consentButton) {
      consentButton.setAttribute('aria-pressed', String(enabled));
      const label = consentButton.querySelector('b');
      if (label) label.textContent = enabled ? 'Выключить' : 'Разрешить';
    }
    if (consentState) consentState.textContent = enabled ? 'Аналитика разрешена' : 'Аналитика выключена';
  }
  async function updateDeliveryReadiness() {
    if (!deliveryState) return;
    try {
      const response = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('CONFIG_UNAVAILABLE');
      const config = await response.json();
      const raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
      if (!raw) {
        deliveryState.textContent = 'Сервер аналитики не подключён: переходы не попадут в серверную статистику, пока API не настроен.';
        return;
      }
      let parsed;
      try { parsed = new URL(raw, location.origin); }
      catch { parsed = null; }
      const localApi = parsed && ['localhost', '127.0.0.1'].includes(parsed.hostname);
      const allowedPath = parsed && (parsed.pathname === '/' ||
        (parsed.pathname === '/commerce-api' && (parsed.origin === location.origin || parsed.origin === 'https://osgard.world')));
      if (!parsed || (parsed.protocol !== 'https:' && !(localApi && parsed.protocol === 'http:')) ||
          parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) {
        deliveryState.textContent = 'Адрес аналитического API не прошёл проверку. Доставка событий не подтверждена.';
        return;
      }
      deliveryState.textContent = 'Адрес API настроен. Доставка подтверждается только ответом сервера и требует согласия пользователя.';
    } catch {
      deliveryState.textContent = 'Не удалось проверить настройки доставки. Серверную аналитику считайте неподтверждённой.';
    }
  }

  function recordProjectClick(event) {
    if (!currentConsent()) return;
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') return;
    const link = target.closest('a.project-link');
    if (!link || typeof link.closest !== 'function') return;
    const card = link.closest('[data-project]');
    const projectId = String(card?.dataset?.project || '').trim();
    if (!ALLOWED_PROJECTS.has(projectId)) return;
    const analytics = window.OSGARD_CONSENTED_ANALYTICS;
    if (!analytics || typeof analytics.enqueue !== 'function') return;
    const payload = {
      eventId: makeEventId(),
      name: 'cross_promo_clicked',
      sessionId: getSessionId(),
      gameId: 'unknown',
      source: 'ecosystem-' + projectId,
      path: String(location.pathname || '/').split('?')[0],
      durationSeconds: 0,
    };
    try { void Promise.resolve(analytics.enqueue(payload)).catch(() => {}); }
    catch { /* analytics must never block navigation to an owned project */ }
  }

  function updateResults() {
    const query = String(search?.value || '').trim().toLocaleLowerCase('ru');
    let visible = 0;
    for (const card of cards) {
      const categoryMatches = activeFilter === 'all' || card.dataset.category === activeFilter;
      const haystack = [
        card.dataset.search || '',
        card.dataset.project || '',
        card.textContent || '',
      ].join(' ').toLocaleLowerCase('ru');
      const searchMatches = !query || haystack.includes(query);
      const show = categoryMatches && searchMatches;
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (count) count.textContent = 'Показано ' + visible + ' из ' + cards.length + ' проектов';
    if (empty) empty.hidden = visible > 0;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.filter === activeFilter));
  }
  search?.addEventListener('input', updateResults);
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const next = chip.dataset.filter || 'all';
      if (next === activeFilter) return;
      activeFilter = next;
      updateResults();
    });
  }
  document.addEventListener('click', recordProjectClick);
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    search?.focus();
  });
  consentButton?.addEventListener('click', () => {
    const next = !currentConsent();
    try {
      localStorage.setItem(CONSENT_KEY, next ? 'yes' : 'no');
      if (!next) localStorage.removeItem(PENDING_KEY);
    } catch {
      if (consentState) consentState.textContent = 'Настройку не удалось сохранить в этом браузере';
      syncConsent();
      return;
    }
    syncConsent();
    if (consentState) consentState.textContent = next
      ? 'Аналитика разрешена. Новые допустимые события могут записываться.'
      : 'Аналитика выключена. Ожидающие события удалены.';
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) syncConsent();
  });
  updateResults();
  syncConsent();
  void updateDeliveryReadiness();
})();
