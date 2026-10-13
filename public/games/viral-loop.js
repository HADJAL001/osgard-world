(() => {
  'use strict';

  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const ATTRIBUTION_KEY = 'osgard.games.invite-attribution.v1';
  const games = {
    'null-shift': { title: 'NULL//SHIFT', href: '/games/null-shift-godot/' },
    time: { title: 'Империя времени', href: '/games/time' },
    swarm: { title: 'SWARM', href: '/games/swarm/' },
    inherit: { title: 'INHERIT', href: '/games/inherit/' },
    remix: { title: 'REMIX', href: '/games/remix/' },
    'civic-cascade': { title: 'CIVIC CASCADE', href: '/games/civic-cascade/' },
    patina: { title: 'PATINA Atelier', href: '/games/patina/' },
    'signal-run': { title: 'SIGNAL RUN', href: '/games/signal-run/' },
    'cascade-lab': { title: 'CASCADE LAB', href: '/games/cascade-lab/' },
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  let attribution = null;
  let sending = Promise.resolve();
  let shareBusy = false;

  function hasConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
    catch { return false; }
  }

  function randomId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      }
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(12);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {}
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function safeSessionRead() {
    try {
      const value = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || 'null');
      if (!value || typeof value !== 'object') return null;
      if (!games[value.gameId] || !/^[a-zA-Z0-9_-]{8,48}$/.test(value.inviteId || '')) return null;
      if (!/^[a-zA-Z0-9_-]{8,48}$/.test(value.sessionId || '')) return null;
      return value;
    } catch (_) { return null; }
  }

  function clearAttribution() {
    attribution = null;
    try { sessionStorage.removeItem(ATTRIBUTION_KEY); } catch (_) {}
  }

  async function sendEvent(name, gameId, source, explicitSessionId) {
    if (!hasConsent()) return false;
    const allowedNames = new Set([
      'invite_link_created',
      'invite_landing',
      'invite_game_started',
      'invite_game_completed',
    ]);
    if (!allowedNames.has(name)) return false;
    const game = games[gameId];
    if (!game) return false;

    const sessionId = explicitSessionId || (attribution && attribution.sessionId) || ('invite_' + randomId());
    const body = {
      consent: true,
      events: [{
        name,
        sessionId,
        gameId,
        source: String(source || 'player-invite-loop').slice(0, 80),
        path: location.pathname,
        durationSeconds: 0,
      }],
    };

    sending = sending.then(async () => {
      const cfgResponse = await fetch('/games/commerce-config.json', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const config = cfgResponse.ok ? await cfgResponse.json() : {};
      const base = String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '');
      const response = await fetch(base + '/v1/events', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!response.ok) throw new Error('event transport returned ' + response.status);
      return true;
    }).catch(() => false);
    return sending;
  }

  function readIncomingInvite() {
    const params = new URLSearchParams(location.search);
    const gameId = params.get('game') || '';
    const inviteId = params.get('invite') || '';
    const isInvite = params.get('utm_campaign') === 'player_invite_loop'
      && params.get('utm_medium') === 'player_share'
      && Boolean(games[gameId])
      && /^[a-zA-Z0-9_-]{8,48}$/.test(inviteId);

    if (!isInvite) return null;
    return { gameId, inviteId };
  }

  function renderInviteBanner(invite) {
    if (!invite || !games[invite.gameId] || $('#player-invite-banner')) return;
    const game = games[invite.gameId];
    const section = document.createElement('section');
    section.id = 'player-invite-banner';
    section.className = 'player-invite-banner';
    section.setAttribute('aria-labelledby', 'player-invite-banner-title');

    const copy = document.createElement('div');
    copy.className = 'player-invite-copy';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'player-invite-eyebrow';
    eyebrow.textContent = 'OSGARD PLAY / ПРИГЛАШЕНИЕ';
    const heading = document.createElement('h2');
    heading.id = 'player-invite-banner-title';
    heading.textContent = 'Друг зовёт тебя в ' + game.title;
    const text = document.createElement('p');
    text.textContent = 'Открой тот же игровой мир. Никаких покупок или регистрации для самого запуска не требуется, если этого не просит выбранная игра.';
    copy.append(eyebrow, heading, text);

    const actions = document.createElement('div');
    actions.className = 'player-invite-actions';
    const launch = document.createElement('a');
    launch.className = 'btn primary';
    launch.href = game.href;
    launch.dataset.play = invite.gameId;
    launch.textContent = 'Открыть этот мир ↗';
    const browse = document.createElement('a');
    browse.className = 'player-invite-browse';
    browse.href = '/games/';
    browse.textContent = 'Посмотреть все игры';
    actions.append(launch, browse);
    section.append(copy, actions);

    const grid = $('#games-grid');
    if (grid) grid.insertAdjacentElement('beforebegin', section);
    else {
      const main = document.querySelector('main');
      main?.prepend(section);
    }
  }

  function createInviteUrl(gameId) {
    const game = games[gameId];
    if (!game) return null;
    const inviteId = randomId();
    const params = new URLSearchParams({
      game: gameId,
      invite: inviteId,
      utm_source: 'osgard_games',
      utm_medium: 'player_share',
      utm_campaign: 'player_invite_loop',
      utm_content: gameId,
    });
    return { url: location.origin + '/games/?' + params.toString(), inviteId };
  }

  async function invite(gameId, button) {
    if (!games[gameId] || shareBusy) return;
    shareBusy = true;
    if (button) button.disabled = true;
    const invite = createInviteUrl(gameId);
    if (!invite) { shareBusy = false; if (button) button.disabled = false; return; }
    const url = invite.url;
    const inviteSessionId = 'invite_' + invite.inviteId;
    const game = games[gameId];
    let shared = false;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'OSGARD PLAY — ' + game.title,
          text: 'Я играю в ' + game.title + '. Попробуй этот мир и выбери свой маршрут.',
          url,
        });
        shared = true;
        if (hasConsent()) await sendEvent('invite_link_created', gameId, 'player-invite-link:' + invite.inviteId, inviteSessionId);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        shared = true;
        if (hasConsent()) await sendEvent('invite_link_created', gameId, 'player-invite-link:' + invite.inviteId, inviteSessionId);
        setStatus('Ссылка-приглашение скопирована. Отправь её другу.');
      } else {
        window.prompt('Скопируй ссылку и отправь другу:', url);
      }
      if (shared && button) {
        const old = button.textContent;
        button.textContent = 'Приглашение готово ✓';
        window.setTimeout(() => { if (button.isConnected) button.textContent = old; }, 2600);
      }
    } catch (error) {
      if (error && error.name !== 'AbortError') {
        window.prompt('Скопируй ссылку и отправь другу:', url);
      }
    } finally {
      shareBusy = false;
      if (button && button.isConnected) button.disabled = false;
    }
  }

  function setStatus(message) {
    const status = $('#player-status');
    if (status) status.textContent = message;
  }

  function onIncomingInvite() {
    const invite = readIncomingInvite();
    if (!invite) return;
    renderInviteBanner(invite);
    if (!hasConsent()) return;
    if (attribution && attribution.inviteId === invite.inviteId && attribution.gameId === invite.gameId) return;
    attribution = {
      gameId: invite.gameId,
      inviteId: invite.inviteId,
      sessionId: 'invitevisit_' + randomId(),
      createdAt: Date.now(),
      started: false,
      completed: false,
    };
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch (_) {}
    void sendEvent('invite_landing', invite.gameId, 'player-invite:' + invite.inviteId);
  }

  function restoreAttribution() {
    if (!hasConsent()) {
      clearAttribution();
      return;
    }
    attribution = safeSessionRead();
    if (attribution && Date.now() - Number(attribution.createdAt || 0) > 24 * 60 * 60 * 1000) {
      clearAttribution();
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-invite-game]') : null;
    if (!target) return;
    const gameId = target.getAttribute('data-invite-game');
    event.preventDefault();
    void invite(gameId, target);
  }, true);

  document.addEventListener('osgard:game-session-started', event => {
    const detail = event.detail || {};
    if (!hasConsent() || !attribution || detail.game !== attribution.gameId || attribution.started) return;
    attribution.started = true;
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch (_) {}
    void sendEvent('invite_game_started', detail.game, 'player-invite:' + attribution.inviteId);
  });

  document.addEventListener('osgard:game-session-completed', event => {
    const detail = event.detail || {};
    if (!hasConsent() || !attribution || detail.game !== attribution.gameId) return;
    if (detail.endReason === 'game_completed' && !attribution.completed) {
      const inviteId = attribution.inviteId;
      attribution.completed = true;
      try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch (_) {}
      void sendEvent('invite_game_completed', detail.game, 'player-invite:' + inviteId).then(ok => {
        if (!attribution || attribution.inviteId !== inviteId) return;
        if (ok) clearAttribution();
        else {
          attribution.completed = false;
          try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch (_) {}
        }
      });
    }
  });

  document.addEventListener('osgard:analytics-consent-changed', event => {
    if (event.detail && event.detail.consent === true) onIncomingInvite();
    else clearAttribution();
  });

  const inviteButton = $('#player-invite');
  if (inviteButton) {
    inviteButton.addEventListener('click', event => {
      event.preventDefault();
      const gameId = $('#player-dialog')?.dataset.game || '';
      void invite(gameId, inviteButton);
    });
  }

  const recommendations = $('#post-run-recommendations');
  if (recommendations && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      const gameId = $('#player-dialog')?.dataset.game || '';
      if (!recommendations.hidden && gameId && games[gameId] && !recommendations.querySelector('[data-invite-game]')) {
        const inviteCta = document.createElement('button');
        inviteCta.type = 'button';
        inviteCta.className = 'player-invite-postrun';
        inviteCta.setAttribute('data-invite-game', gameId);
        inviteCta.textContent = 'Позвать друга в этот мир ↗';
        recommendations.append(inviteCta);
      }
    });
    observer.observe(recommendations, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  restoreAttribution();
  onIncomingInvite();
})();