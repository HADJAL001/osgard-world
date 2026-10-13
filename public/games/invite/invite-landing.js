(() => {
  'use strict';
  const game = document.body.dataset.game || '';
  const validGameIds = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']);
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
