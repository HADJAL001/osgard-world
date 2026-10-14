(() => {
  'use strict';
  const game = document.body.dataset.game || '';
  const validGameIds = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid','heist-echo']);
  const params = new URLSearchParams(location.search);
  const code = params.get('og_ref') || '';
  const requestedGame = params.get('og_game') || '';
  const source = params.get('utm_source') || '';
  const medium = params.get('utm_medium') || '';
  const campaign = params.get('utm_campaign') || '';
  const content = params.get('utm_content') || '';
  const sameGame = game ? requestedGame === game : requestedGame === '';
  const valid = /^og_[a-f0-9]{8}$/.test(code) &&
    sameGame &&
    (!requestedGame || validGameIds.has(requestedGame)) &&
    source === 'osgard_play' &&
    medium === 'referral' &&
    campaign === 'play_with_friends' &&
    content === (requestedGame || 'catalog');
  // Contract links carry only a bounded task definition, never personal history or XP.
  // Mission Director performs the full validation again after the game starts.
  const rawAdaptiveContract = params.get('clmd') || '';
  let adaptiveContract = '';
  if (game === 'cascade-lab' && rawAdaptiveContract.length > 0 && rawAdaptiveContract.length <= 7000) {
    try {
      const candidate = JSON.parse(rawAdaptiveContract);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) &&
          candidate.schema === 'osgard.cascade-lab.mission-invite.v1' && candidate.version === '0.24.0') {
        adaptiveContract = rawAdaptiveContract;
      }
    } catch { /* Invalid contract links remain ordinary game invitations. */ }
  }
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
    if (game && validGameIds.has(game)) target.searchParams.set('play', game);
    const aetherDay = params.get('og_day') || '';
    const validAetherDay = /^\d{4}-\d{2}-\d{2}$/.test(aetherDay) && (() => {
      const date = new Date(aetherDay + 'T00:00:00.000Z');
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === aetherDay;
    })();
    if (['aether-grid','signal-run','null-shift'].includes(game) && validAetherDay) target.searchParams.set('day', aetherDay);
    // AETHER GRID protocol links open the actual standalone puzzle with validated rules,
    // rather than dropping the selected rule set on the general games catalogue.
    const requestedAetherProtocol = params.get('og_protocol') || '';
    const validAetherProtocol = new Set(['no-hints','no-undo','iron-circuit']).has(requestedAetherProtocol);
    if (game === 'aether-grid' && validAetherDay && validAetherProtocol) {
      target.pathname = '/games/aether-grid/';
      target.searchParams.delete('play');
      target.searchParams.set('day', aetherDay);
      target.searchParams.set('protocol', requestedAetherProtocol);
    }
    if (game === 'signal-run' && validAetherDay && params.get('og_daily_mode') === 'daily') target.searchParams.set('mode', 'daily');
    if (game === 'null-shift' && validAetherDay) {
      const month = Number(aetherDay.slice(5,7)), date = Number(aetherDay.slice(8,10));
      const expectedChallenge = 'NS-' + aetherDay.replace(/-/g,'') + '-C' + (((month + date) % 3) + 1);
      if (params.get('og_challenge') === expectedChallenge) target.searchParams.set('challenge', expectedChallenge);
    }
    if (game && validGameIds.has(game)) target.searchParams.set('og_game', game);
    if (adaptiveContract) target.searchParams.set('clmd', adaptiveContract);
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
  try { consent = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
  if (!consent) return;
  const attributionKey = 'osgard.games.referral-attribution.v1';
  const marker = 'osgard.games.referral-opened.' + code;
  function randomHex(bytes = 12) {
    const data = new Uint8Array(bytes);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(data);
    else for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256);
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  }
  let state = '';
  try {
    sessionStorage.setItem(attributionKey, JSON.stringify({ code, game: requestedGame, at: Date.now() }));
    state = sessionStorage.getItem(marker) || '';
    if (state === 'yes' || state === 'pending') return;
    sessionStorage.setItem(marker, 'pending');
  } catch { return; }
  const event = {
    eventId: 'evt_' + randomHex(),
    name: 'referral_link_opened',
    sessionId: 'session_' + randomHex(),
    gameId: validGameIds.has(requestedGame) ? requestedGame : 'unknown',
    source: 'referral-link:' + code,
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
