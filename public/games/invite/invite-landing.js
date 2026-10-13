(() => {
  'use strict';
  const game = document.body.dataset.game || '';
  const validGameIds = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run']);
  const params = new URLSearchParams(location.search);
  const code = params.get('og_ref') || '';
  const requestedGame = params.get('og_game') || '';
  const source = params.get('utm_source') || '';
  const medium = params.get('utm_medium') || '';
  const campaign = params.get('utm_campaign') || '';
  const content = params.get('utm_content') || '';
  const rewardCode = /^og_[a-f0-9]{32}$/.test(code);
  const valid = /^og_(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(code) &&
    requestedGame.length > 0 &&
    requestedGame === game &&
    validGameIds.has(requestedGame) &&
    source === 'osgard_play' &&
    medium === 'referral' &&
    campaign === 'play_with_friends' &&
    content === requestedGame;
  const scoreValue = Number(params.get('challenge') || 0);
  const requestedDay = params.get('day') || '';
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) &&
    (() => { const date = new Date(requestedDay + 'T00:00:00.000Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === requestedDay; })();
  const requestedMode = params.get('mode') || '';
  const validDailyMode = requestedMode === 'daily' && validDay;
  const validOrdinaryMode = requestedMode === '' && requestedDay === '';
  const legacySignalRun = game === 'signal-run' &&
    params.get('play') === 'signal-run' &&
    Number.isSafeInteger(scoreValue) && scoreValue > 0 && scoreValue <= 1000000000 &&
    /^[a-f0-9]{12}$/.test(params.get('ref') || '') &&
    source === 'signal-run' &&
    medium === 'share' &&
    campaign === 'challenge' &&
    (validDailyMode || validOrdinaryMode);
  const play = document.querySelector('#play-link');
  if (play) {
    const target = new URL('/games/', location.origin);
    if (game && validGameIds.has(game)) target.searchParams.set('og_game', game);
    if (valid) {
      target.searchParams.set('og_ref', code);
      target.searchParams.set('og_game', requestedGame);
      target.searchParams.set('utm_source', source);
      target.searchParams.set('utm_medium', medium);
      target.searchParams.set('utm_campaign', campaign);
      target.searchParams.set('utm_content', content);
    } else if (legacySignalRun) {
      for (const key of ['play', 'challenge', 'ref', 'utm_source', 'utm_medium', 'utm_campaign']) {
        const value = params.get(key);
        if (value !== null) target.searchParams.set(key, value);
      }
      if (validDailyMode) {
        target.searchParams.set('mode', 'daily');
        target.searchParams.set('day', requestedDay);
      }
    }
    play.href = target.href;
  }
  if (!valid) return;

  const REWARD_CONSENT_KEY = 'osgard.games.referral-reward-consent.v1';
  const OWNER_TOKEN_KEY = 'osgard.games.referral-owner-token.v1';
  const ATTR_KEY = 'osgard.games.referral-attribution.v1';
  const ANALYTICS_CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const marker = 'osgard.games.referral-opened.' + code;
  const note = document.createElement('p');
  note.className = 'osgard-referral-consent-status';
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');

  function readRewardConsent() {
    try { return localStorage.getItem(REWARD_CONSENT_KEY) === 'yes'; } catch { return false; }
  }
  function secureHex(bytes) {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') return '';
    try {
      const data = new Uint8Array(bytes);
      globalThis.crypto.getRandomValues(data);
      return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
    } catch { return ''; }
  }
  function visitorToken() {
    try {
      let value = localStorage.getItem(OWNER_TOKEN_KEY) || '';
      if (/^[a-f0-9]{12}$/.test(value)) return value;
      value = secureHex(6);
      if (!value) return '';
      localStorage.setItem(OWNER_TOKEN_KEY, value);
      return value;
    } catch { return ''; }
  }
  function addConsentControl() {
    const style = document.createElement('style');
    style.textContent = '.osgard-referral-consent{display:flex;align-items:flex-start;gap:11px;max-width:680px;margin:0 auto 18px;padding:14px 16px;border:1px solid #d3ff6945;background:linear-gradient(110deg,#d3ff6912,transparent 65%),#0c1110;color:#c5d0c5;font:12px/1.65 system-ui,sans-serif;text-align:left}.osgard-referral-consent input{flex:0 0 auto;width:18px;height:18px;margin:2px 0 0;accent-color:#d3ff69}.osgard-referral-consent input:focus-visible{outline:2px solid #d3ff69;outline-offset:3px}.osgard-referral-consent strong{display:block;margin-bottom:4px;color:#d3ff69;font:9px ui-monospace,monospace;letter-spacing:.12em}.osgard-referral-consent-status{max-width:680px;margin:0 auto 14px;color:#aab5a8;font-size:11px;line-height:1.65}.osgard-referral-consent-status:empty{display:none}@media(max-width:600px){.osgard-referral-consent{padding:12px;font-size:11px}}';
    document.head.append(style);
    const label = document.createElement('label');
    label.className = 'osgard-referral-consent';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = readRewardConsent();
    checkbox.setAttribute('aria-label', 'Согласие на учёт реферальной игровой сессии');
    const text = document.createElement('span');
    const heading = document.createElement('strong');
    heading.textContent = 'OSGARD SHARDS / ДОБРОВОЛЬНО';
    const copy = document.createElement('span');
    copy.textContent = 'Разрешаю учесть открытие этого приглашения и игровую сессию для возможной награды пригласившему. Передаются случайный код браузера, игра и время игровых событий; пост в соцсети не отслеживается. SHARDS не имеют денежной стоимости. Можно отказаться и просто играть.';
    text.append(heading, copy);
    label.append(checkbox, text);
    if (play) play.insertAdjacentElement('beforebegin', label);
    if (play) play.insertAdjacentElement('afterend', note);
    checkbox.addEventListener('change', () => {
      try {
        if (checkbox.checked) localStorage.setItem(REWARD_CONSENT_KEY, 'yes');
        else localStorage.removeItem(REWARD_CONSENT_KEY);
      } catch {}
      if (checkbox.checked) {
        void recordInviteOpen();
      } else {
        try {
          const raw = sessionStorage.getItem(ATTR_KEY);
          const value = raw ? JSON.parse(raw) : null;
          if (value && value.code === code) sessionStorage.removeItem(ATTR_KEY);
          if (sessionStorage.getItem(marker) === 'pending') sessionStorage.removeItem(marker);
        } catch {}
        note.textContent = 'Участие выключено. Приглашение и игра по-прежнему доступны; игровые данные не будут отправляться для этой награды.';
      }
    });
    if (checkbox.checked) void recordInviteOpen();
  }
  async function apiBase() {
    const response = await fetch('/games/commerce-config.json', { cache: 'no-store' });
    const config = response.ok ? await response.json().catch(() => ({})) : {};
    const raw = String(config.apiBaseUrl || '/commerce-api').trim();
    let url;
    try { url = new URL(raw, location.origin); } catch { throw new Error('API_CONFIG_INVALID'); }
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    const allowedPath = url.pathname === '/' || (url.origin === location.origin && url.pathname === '/commerce-api');
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password ||
        !allowedPath || url.search || url.hash) throw new Error('API_CONFIG_INVALID');
    return url.origin + (url.pathname === '/' ? '' : url.pathname);
  }
  async function recordInviteOpen() {
    if (!readRewardConsent()) return false;
    const token = visitorToken();
    if (!token) {
      note.textContent = 'Не удалось создать защищённый идентификатор браузера. Можно играть без участия в награде.';
      return false;
    }
    try {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify({ code, game: requestedGame, visitorToken: token, at: Date.now() }));
      const state = sessionStorage.getItem(marker) || '';
      if (state === 'yes' || state === 'pending') {
        note.textContent = 'Участие включено. Если игровой раунд длился не менее 60 секунд, сервер проверит право на награду.';
        return true;
      }
      sessionStorage.setItem(marker, 'pending');
      const eventId = 'evt_' + secureHex(12);
      const event = {
        eventId,
        name: 'referral_link_opened',
        sessionId: 'session_' + secureHex(12),
        gameId: requestedGame,
        source: 'referral-link:' + code + ':' + requestedGame + ':' + token,
        path: location.pathname,
        durationSeconds: 0,
      };
      if (!/^evt_[a-f0-9]{24}$/.test(event.eventId) || !/^session_[a-f0-9]{24}$/.test(event.sessionId)) {
        sessionStorage.removeItem(marker);
        note.textContent = 'В этом браузере недоступна безопасная генерация токена. Участие отключено для этой ссылки.';
        return false;
      }
      const response = await fetch((await apiBase()) + '/v1/events', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [event] }),
      });
      if (!response.ok) throw new Error('REFERRAL_OPEN_UNAVAILABLE');
      sessionStorage.setItem(marker, 'yes');
      note.textContent = 'Согласие сохранено. Открой игру: при сессии не короче 60 секунд сервер проверит приглашение. Если не хочешь участвовать, сними галочку.';
      return true;
    } catch {
      try { sessionStorage.removeItem(marker); } catch {}
      note.textContent = 'Сервер приглашений временно недоступен. Можно играть без участия в награде; попробуй снова позже.';
      return false;
    }
  }

  if (rewardCode) {
    addConsentControl();
  } else {
    let consent = false;
    try { consent = localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'yes'; } catch {}
    if (!consent) return;
    const legacyMarker = 'osgard.games.referral-opened.' + code;
    try {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify({ code, game: requestedGame, at: Date.now() }));
      if (sessionStorage.getItem(legacyMarker) === 'yes' || sessionStorage.getItem(legacyMarker) === 'pending') return;
      sessionStorage.setItem(legacyMarker, 'pending');
    } catch { return; }
    (async () => {
      try {
        const eventId = 'evt_' + secureHex(12);
        const response = await fetch((await apiBase()) + '/v1/events', {
          method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent: true, events: [{
            eventId, name: 'referral_link_opened', sessionId: 'session_' + secureHex(12),
            gameId: requestedGame, source: 'referral-link:' + code,
            path: location.pathname, durationSeconds: 0,
          }] }),
        });
        if (response.ok) sessionStorage.setItem(legacyMarker, 'yes');
        else sessionStorage.removeItem(legacyMarker);
      } catch { try { sessionStorage.removeItem(legacyMarker); } catch {} }
    })();
  }
})();