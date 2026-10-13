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
  const sameGame = game ? requestedGame === game : requestedGame === '';
  const valid = /^og_(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(code) &&
    sameGame &&
    (!requestedGame || validGameIds.has(requestedGame)) &&
    source === 'osgard_play' &&
    medium === 'referral' &&
    campaign === 'play_with_friends' &&
    content === (requestedGame || 'catalog');
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
      if (requestedGame) target.searchParams.set('og_game', requestedGame);
      target.searchParams.set('utm_source', source);
      target.searchParams.set('utm_medium', medium);
      target.searchParams.set('utm_campaign', campaign);
      target.searchParams.set('utm_content', content);
    }
    else if (legacySignalRun) {
      // Keep only the validated SIGNAL RUN challenge contract when leaving the social preview.
      // This is a legacy score challenge, not a canonical anonymous invite-open event.
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
  let consent = false;
  let rewardConsent = false;
  if (/^og_[a-f0-9]{32}$/.test(code) && play) {
    try {
      consent = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes';
      rewardConsent = localStorage.getItem('osgard.games.referral-reward-consent.v1') === 'yes';
    } catch {}
    const panel = document.createElement('section');
    panel.className = 'osgard-referral-consent';
    panel.setAttribute('aria-labelledby', 'osgard-referral-consent-title');
    const style = document.createElement('style');
    style.textContent = '.osgard-referral-consent{margin:18px 0;padding:15px;border:1px solid #d8c28f55;border-radius:10px;background:linear-gradient(140deg,#d8c28f12,transparent 65%),#101312;color:#f2f0e8;text-align:left}.osgard-referral-consent h2{margin:0 0 7px;font:400 21px/1.15 Georgia,serif}.osgard-referral-consent p{margin:7px 0;color:#adb0a4;font:12px/1.65 system-ui,sans-serif}.osgard-referral-choice{display:flex;gap:10px;align-items:flex-start;margin:12px 0;color:#e8e6dc;font:12px/1.65 system-ui,sans-serif}.osgard-referral-choice input{flex:0 0 auto;width:17px;height:17px;margin:2px 0 0;accent-color:#d8c28f}.osgard-referral-choice input:focus-visible{outline:2px solid #e8d5a1;outline-offset:3px}.osgard-referral-status{min-height:18px;color:#d8c28f!important;font-size:11px!important}.osgard-referral-consent a{color:#e8d5a1;text-underline-offset:3px}@media(prefers-reduced-motion:reduce){.osgard-referral-consent *{animation:none!important;transition:none!important}}';
    document.head.append(style);
    const heading = document.createElement('h2');
    heading.id = 'osgard-referral-consent-title';
    heading.textContent = 'Игра с другом · программа SHARDS';
    const intro = document.createElement('p');
    intro.textContent = 'Играть можно без согласия. Для учёта приглашения включи необязательную аналитику; участие в SHARDS — отдельное добровольное решение.';
    const analyticsLabel = document.createElement('label');
    analyticsLabel.className = 'osgard-referral-choice';
    const analyticsToggle = document.createElement('input');
    analyticsToggle.type = 'checkbox';
    analyticsToggle.checked = consent;
    const analyticsText = document.createElement('span');
    analyticsText.textContent = 'Разрешаю необязательную аналитику OSGARD для записи открытия приглашения и игровых сессий. Это не реклама и не подтверждение репоста.';
    analyticsLabel.append(analyticsToggle, analyticsText);
    const rewardLabel = document.createElement('label');
    rewardLabel.className = 'osgard-referral-choice';
    const rewardToggle = document.createElement('input');
    rewardToggle.type = 'checkbox';
    rewardToggle.checked = rewardConsent && consent;
    rewardToggle.disabled = !consent;
    const rewardText = document.createElement('span');
    rewardText.textContent = 'Отдельно участвую в программе наград: +50 SHARDS за квалифицированную сессию приглашённого игрока в этой игре длительностью не менее 60 секунд. SHARDS не имеют денежной стоимости и не обмениваются на товары.';
    rewardLabel.append(rewardToggle, rewardText);
    const status = document.createElement('p');
    status.className = 'osgard-referral-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = consent && rewardToggle.checked
      ? 'Аналитика и участие в SHARDS включены на этом устройстве.'
      : 'Обе опции выключены по умолчанию.';
    analyticsToggle.addEventListener('change', () => {
      consent = analyticsToggle.checked;
      try {
        if (consent) localStorage.setItem('osgard.games.analytics-consent.v1', 'yes');
        else {
          localStorage.removeItem('osgard.games.analytics-consent.v1');
          localStorage.removeItem('osgard.games.referral-reward-consent.v1');
          sessionStorage.removeItem('osgard.games.referral-attribution.v1');
          sessionStorage.removeItem('osgard.games.referral-opened.' + code);
          rewardConsent = false;
          rewardToggle.checked = false;
        }
      } catch {}
      rewardToggle.disabled = !consent;
      status.textContent = consent
        ? 'Аналитика включена. Отдельно выбери, участвовать ли в программе SHARDS.'
        : 'Аналитика выключена. Приглашение остаётся рабочим, но наградные события не учитываются.';
    });
    rewardToggle.addEventListener('change', () => {
      if (!analyticsToggle.checked) {
        rewardToggle.checked = false;
        status.textContent = 'Сначала нужно отдельно разрешить необязательную аналитику.';
        return;
      }
      rewardConsent = rewardToggle.checked;
      try {
        if (rewardConsent) localStorage.setItem('osgard.games.referral-reward-consent.v1', 'yes');
        else localStorage.removeItem('osgard.games.referral-reward-consent.v1');
      } catch {}
      status.textContent = rewardConsent
        ? 'Участие включено. Сервер начислит SHARDS только после квалифицированной сессии; не за клик по соцсети.'
        : 'Участие выключено. Играть и делиться ссылкой по-прежнему можно.';
    });
    panel.append(heading, intro, analyticsLabel, rewardLabel, status);
    play.insertAdjacentElement('beforebegin', panel);
  }
  try {
    consent = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes';
    rewardConsent = localStorage.getItem('osgard.games.referral-reward-consent.v1') === 'yes';
  } catch {}
  if (!consent || (/^og_[a-f0-9]{32}$/.test(code) && !rewardConsent)) return;
  const attributionKey = 'osgard.games.referral-attribution.v1';
  const marker = 'osgard.games.referral-opened.' + code;
  const visitorTokenKey = 'osgard.games.referral-owner-token.v1';
  function randomHex(bytes = 12) {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') return '';
    try {
      const data = new Uint8Array(bytes);
      globalThis.crypto.getRandomValues(data);
      return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
    } catch { return ''; }
  }
  let state = '';
  let visitorToken = '';
  try {
    visitorToken = localStorage.getItem(visitorTokenKey) || '';
    if (!/^[a-f0-9]{12}$/.test(visitorToken)) {
      visitorToken = randomHex(6);
      if (!/^[a-f0-9]{12}$/.test(visitorToken)) return;
      localStorage.setItem(visitorTokenKey, visitorToken);
    }
    sessionStorage.setItem(attributionKey, JSON.stringify({ code, game: requestedGame, visitorToken, at: Date.now() }));
    state = sessionStorage.getItem(marker) || '';
    if (state === 'yes' || state === 'pending') return;
    sessionStorage.setItem(marker, 'pending');
  } catch { return; }
  const event = {
    eventId: 'evt_' + randomHex(),
    name: 'referral_link_opened',
    sessionId: 'session_' + randomHex(),
    gameId: validGameIds.has(requestedGame) ? requestedGame : 'unknown',
    source: /^og_[a-f0-9]{32}$/.test(code) ? 'referral-link:' + code + ':' + requestedGame + ':' + visitorToken : 'referral-link:' + code,
    path: location.pathname,
    durationSeconds: 0,
  };
  (async () => {
    try {
      const configResponse = await fetch('/games/commerce-config.json', { cache: 'no-store' });
      const config = configResponse.ok ? await configResponse.json().catch(() => ({})) : {};
      const base = String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '');
      const response = await fetch(base + '/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [event] }),
      });
      if (response.ok) sessionStorage.setItem(marker, 'yes');
      else sessionStorage.removeItem(marker);
    } catch {
      try { sessionStorage.removeItem(marker); } catch {}
    }
  })();
})();
