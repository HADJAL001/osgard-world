(() => {
  'use strict';

  const KEY = 'osgard.games.referral-code.v1';
  const GAME_TITLES = {
    'null-shift': 'NULL//SHIFT',
    time: 'Империя времени',
    swarm: 'SWARM',
    inherit: 'INHERIT',
    remix: 'REMIX',
    'civic-cascade': 'CIVIC CASCADE',
    patina: 'PATINA Atelier',
    'signal-run': 'SIGNAL RUN',
    'cascade-lab': 'CASCADE LAB',
  };
  const clean = (value, max = 64) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, max);
  const validGame = (id) => Object.prototype.hasOwnProperty.call(GAME_TITLES, id);

  function randomCode() {
    const bytes = new Uint8Array(6);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return 'r' + Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function getReferralCode() {
    try {
      const existing = localStorage.getItem(KEY) || '';
      if (/^r[a-f0-9]{12}$/.test(existing)) return existing;
      const next = randomCode();
      localStorage.setItem(KEY, next);
      return next;
    } catch {
      return randomCode();
    }
  }

  function buildInviteUrl(gameId, placement = 'player-toolbar') {
    if (!validGame(gameId)) return null;
    const url = new URL('/games/', location.origin);
    url.searchParams.set('play', gameId);
    url.searchParams.set('ref', getReferralCode());
    url.searchParams.set('utm_source', 'osgard_games');
    url.searchParams.set('utm_medium', 'friend_invite');
    url.searchParams.set('utm_campaign', 'player_invite');
    url.searchParams.set('utm_content', gameId);
    url.searchParams.set('utm_term', clean(placement, 40) || 'player-toolbar');
    return url.href;
  }

  function readAttribution() {
    const params = new URLSearchParams(location.search);
    const referralCode = params.get('ref') || '';
    const invite = /^r[a-f0-9]{12}$/.test(referralCode)
      && params.get('utm_source') === 'osgard_games'
      && params.get('utm_medium') === 'friend_invite'
      && params.get('utm_campaign') === 'player_invite'
      && validGame(params.get('utm_content') || '')
      && params.get('play') === params.get('utm_content');
    if (!invite) return null;
    return {
      referralCode,
      utmSource: 'osgard_games',
      utmMedium: 'friend_invite',
      utmCampaign: 'player_invite',
      utmContent: params.get('utm_content'),
      utmTerm: clean(params.get('utm_term'), 40),
    };
  }

  function announce(detail) {
    window.dispatchEvent(new CustomEvent('osgard:invite-created', { detail }));
  }

  async function share(gameId, placement = 'player-toolbar') {
    if (!validGame(gameId)) return { status: 'invalid-game' };
    const url = buildInviteUrl(gameId, placement);
    const referralCode = new URL(url).searchParams.get('ref');
    const title = GAME_TITLES[gameId] + ' — OSGARD PLAY';
    const text = 'Приглашаю тебя сыграть в ' + GAME_TITLES[gameId] + ' в OSGARD PLAY. Ссылка сразу откроет игру.';

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        const result = { status: 'shared', method: 'web-share', url, referralCode, gameId, placement: clean(placement, 40) };
        announce({ gameId, placement: result.placement, method: result.method, referralCode });
        return result;
      } catch (error) {
        if (error?.name === 'AbortError') return { status: 'cancelled', url, referralCode, gameId };
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        const result = { status: 'copied', method: 'clipboard', url, referralCode, gameId, placement: clean(placement, 40) };
        announce({ gameId, placement: result.placement, method: result.method, referralCode });
        return result;
      } catch {
        // Clipboard permission can be denied; return the URL for a visible manual fallback.
      }
    }
    return { status: 'manual', url, referralCode, gameId, placement: clean(placement, 40) };
  }

  window.OSGARDReferral = Object.freeze({ buildInviteUrl, readAttribution, share, gameTitles: Object.freeze({ ...GAME_TITLES }) });

  // Shared links may open the selected game directly. The lifecycle controller below
  // performs the launch only for a known game ID and never accepts an arbitrary URL.
})();