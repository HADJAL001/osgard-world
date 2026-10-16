(() => {
  'use strict';
  // Avoid a config request for every catalogue visitor. Fetch the public commerce
  // config only when a consented event or project form actually needs the API.
  let configPromise;
  const loadConfig = () => {
    if (!configPromise) {
      configPromise = fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : {})
        .catch(() => ({}));
    }
    return configPromise;
  };
  const clean = (value, max = 1800) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  function readCampaignAttribution() {
    const params = new URLSearchParams(location.search);
    return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].flatMap((key) => {
      const value = clean(params.get(key), 60);
      return /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? [key + '=' + value] : [];
    });
  }
  const ATTRIBUTION_GAME_IDS = new Set(['time','swarm','null-shift','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid','heist-echo']);
  const safeAttributionSlug = (value, fallback) => {
    const candidate = clean(value, 48).toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(candidate) ? candidate : fallback;
  };
  function readLeadAttribution(form) {
    const params = new URLSearchParams(location.search);
    const gameCandidate = clean(params.get('game_id'), 48).toLowerCase();
    return {
      gameId: ATTRIBUTION_GAME_IDS.has(gameCandidate) ? gameCandidate : 'unknown',
      source: safeAttributionSlug(params.get('utm_source'), form.id === 'campaign-form' ? 'partner-form' : 'development-page'),
      campaign: safeAttributionSlug(params.get('utm_campaign'), form.id === 'campaign-form' ? 'partner-inquiry' : 'project-intake'),
    };
  }
  async function discoverSameOriginCommerceApi() {
    let controller = null, timer = 0;
    try {
      controller = typeof AbortController === 'function' ? new AbortController() : null;
      if (controller) timer = setTimeout(() => controller.abort(), 2500);
      const response = await fetch('/commerce-api/healthz', {
        cache: 'no-store', credentials: 'omit', ...(controller ? { signal: controller.signal } : {}),
      });
      const health = response.ok ? await response.json().catch(() => ({})) : {};
      return response.ok && health.service === 'osgard-commerce-api' && health.databaseReady === true
        ? location.origin + '/commerce-api'
        : '';
    } catch { return ''; }
    finally { if (timer) clearTimeout(timer); }
  }
  const apiBase = async () => {
    const config = await loadConfig();
    const raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
    if (!raw) return discoverSameOriginCommerceApi();
    try {
      const parsed = new URL(raw, location.origin);
      const localApi = ['localhost', '127.0.0.1'].includes(parsed.hostname);
      const allowedPath = parsed.pathname === '/' || (parsed.origin === location.origin && parsed.pathname === '/commerce-api');
      if ((parsed.protocol !== 'https:' && !(localApi && parsed.protocol === 'http:')) || parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) return '';
      return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch {
      return '';
    }
  };
  function fallbackLink(form, text) {
    const status = form.querySelector('[role="status"]') || document.getElementById('form-status');
    let link = form.querySelector('#form-fallback-link') || document.getElementById('send-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'form-fallback-link';
      link.className = 'btn primary';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Открыть подготовленное сообщение в WhatsApp ↗';
      const submit = form.querySelector('[type="submit"]');
      submit?.insertAdjacentElement('afterend', link);
    }
    link.href = 'https://wa.me/79640027222?text=' + encodeURIComponent(text);
    link.hidden = false;
    if (status) status.textContent = 'Заявка не отправлена автоматически. Проверьте подготовленное сообщение и отправьте его в WhatsApp вручную.';
    link.focus();
  }
  async function submitLead(form) {
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const projectType = clean(data.get('projectType') || ('Партнёрская интеграция: ' + clean(data.get('format'), 120)), 120);
    const contact = clean(data.get('contact'), 180);
    const budget = clean(data.get('budget'), 80);
    const attribution = readCampaignAttribution();
    const leadAttribution = readLeadAttribution(form);
    const contextParts = [];
    const goal = clean(data.get('goal'), 120);
    const geo = clean(data.get('geo'), 80);
    if (goal) contextParts.push('Цель: ' + goal);
    if (geo) contextParts.push('География: ' + geo);
    if (attribution.length) contextParts.push('Источник кампании (UTM): ' + attribution.join(' · '));
    if (leadAttribution.gameId !== 'unknown') contextParts.push('Игровой источник: ' + leadAttribution.gameId);
    const contextText = contextParts.join('\n');
    const briefLimit = Math.max(0, Math.min(1600, 1800 - contextText.length - (contextText ? 1 : 0)));
    const brief = clean(data.get('brief'), briefLimit);
    const description = clean([brief, contextText].filter(Boolean).join('\n'), 1800);
    const consent = data.get('dataConsent') === 'on' || data.get('consent') === 'on';
    const status = form.querySelector('[role="status"]') || document.getElementById('form-status');
    const fallbackText = [
      'Здравствуйте! Хочу обсудить проект с OSGARD.',
      'Направление: ' + projectType,
      'Бюджет: ' + (budget || 'не указан'),
      'Мой контакт: ' + contact,
      'Описание: ' + description,
      'Источник: ' + location.pathname + (attribution.length ? ' · ' + attribution.join(' · ') : ''),
    ].join('\n');

    if (!consent) {
      if (status) status.textContent = 'Подтвердите обработку данных для ответа на заявку.';
      return;
    }
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Проверяем подключение безопасной формы…';
    try {
      const base = await apiBase();
      if (!base) throw new Error('COMMERCE_API_NOT_CONFIGURED');
      const response = await fetch(base + '/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          budget,
          contact,
          description,
          consent: true,
          website: clean(data.get('website'), 200),
          attribution: leadAttribution,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.accepted !== true) {
        throw new Error(result.message || 'LEAD_NOT_ACCEPTED');
      }
      if (status) status.textContent = 'Заявка сохранена. Номер: ' + clean(result.leadId || 'принято', 80) + '. Для ответа используем указанный контакт.';
      if (form.id === 'campaign-form') {
        const sendLink = document.getElementById('send-link');
        if (sendLink) sendLink.hidden = true;
      } else {
        const fallback = document.getElementById('form-fallback-link');
        if (fallback) fallback.hidden = true;
      }
      form.reset();
      const eventSource = attribution.length ? ('lead-campaign:' + attribution.join('&')).slice(0, 80) : (form.id === 'campaign-form' ? 'partner-form' : 'contact-form');
      sendAnalytics('lead_submitted', 'unknown', eventSource);
    } catch {
      if (status) status.textContent = 'Сервер заявок пока недоступен или не настроен. Ниже можно открыть черновик и отправить его вручную.';
      fallbackLink(form, fallbackText);
    } finally {
      if (button) button.disabled = false;
    }
  }
  const ANALYTICS_SESSION_KEY = 'osgard.games.analytics-session.v1';
  const makeEventId = () => 'evt_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 15))).replace(/[^a-zA-Z0-9_-]/g, '');
  function analyticsSessionId() {
    try {
      let value = sessionStorage.getItem(ANALYTICS_SESSION_KEY) || '';
      if (!/^[a-zA-Z0-9_-]{12,96}$/.test(value)) {
        value = 'session_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 15))).replace(/[^a-zA-Z0-9_-]/g, '');
        sessionStorage.setItem(ANALYTICS_SESSION_KEY, value);
      }
      return value;
    } catch {
      return 'session_' + (Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 15)).replace(/[^a-zA-Z0-9_-]/g, '');
    }
  }
  function analyticsAllowed() {
    try { return localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch { return false; }
  }
  function sendAnalytics(name, gameId, source = 'contact-form') {
    if (!analyticsAllowed()) return;
    const event = {
      eventId: makeEventId(),
      name,
      sessionId: analyticsSessionId(),
      gameId,
      source: clean(source, 80),
      path: location.pathname,
      durationSeconds: 0,
    };
    const queue = window.OSGARD_CONSENTED_ANALYTICS;
    if (queue && typeof queue.enqueue === 'function') {
      void queue.enqueue(event);
      return;
    }
    // Compatibility fallback for pages served without the shared queue asset.
    void apiBase().then((base) => base ? fetch(base + '/v1/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, events: [event] }),
    }) : null).catch(() => {});
  }
  let pageViewTracked = false;
  function trackCurrentPageView() {
    if (pageViewTracked || !analyticsAllowed()) return;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const eventName = path === '/games' ? 'catalog_viewed'
      : path === '/games/premium' ? 'premium_page_view'
      : path === '/games/partners' ? 'partners_page_viewed'
      : path === '/games/ecosystem' ? 'ecosystem_directory_viewed'
      : '';
    if (!eventName) return;
    pageViewTracked = true;
    sendAnalytics(eventName, 'unknown', 'page-view');
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin === location.origin || url.searchParams.get('utm_source') !== 'osgard_games' || url.searchParams.get('utm_medium') !== 'cross_promo') return;
    let gameId = 'unknown';
    const gameCard = anchor.closest('[data-game]');
    if (gameCard) gameId = clean(gameCard.getAttribute('data-game'), 40);
    const destination = clean(url.searchParams.get('utm_content'), 40) || 'project';
    sendAnalytics('cross_promo_clicked', gameId || 'unknown', 'cross-promo:' + destination);
  }, true);
  document.querySelector('#analytics-toggle')?.addEventListener('click', () => queueMicrotask(trackCurrentPageView));
  trackCurrentPageView();
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !['project-form', 'campaign-form'].includes(form.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitLead(form);
  }, true);
})();