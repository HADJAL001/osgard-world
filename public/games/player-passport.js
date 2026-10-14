import {
  PASSPORT_GAME_TITLES,
  derivePassport,
  emptyPassport,
  normalizeFavorites,
  normalizePassport,
  recordInvite,
  recordSession
} from './player-passport-core.js?v=__OSGARD_BUILD_VERSION__';

(() => {
  'use strict';
  const root = document.querySelector('#osgard-player-passport');
  if (!root) return;

  const KEY = 'osgard.games.player-passport.v1';
  const PENDING_KEY = 'osgard.games.player-passport.pending.v1';
  const FAVORITES_KEY = 'osgard.games.favorites.v1';
  const RECENT_KEY = 'osgard.games.recent.v1';
  const WALLET_KEY = 'osgard.games.shards-wallet.v1';
  const GAME_URLS = Object.freeze({
    'null-shift': '/games/null-shift-godot/',
    time: '/games/time',
    swarm: '/games/swarm/',
    inherit: '/games/inherit/',
    remix: '/games/remix/',
    'civic-cascade': '/games/civic-cascade/',
    patina: '/games/patina/',
    'signal-run': '/games/signal-run/',
    'cascade-lab': '/games/cascade-lab/',
    'afterimage-run': '/games/afterimage-run/',
    'aether-grid': '/games/aether-grid/'
  });
  const BADGE_MARKS = Object.freeze({
    'first-session': 'Ⅰ',
    'world-explorer': '◈',
    curator: '✧',
    connector: '↗',
    'streak-three': '⌁'
  });
  const $ = (selector, parent = root) => parent.querySelector(selector);
  const content = $('[data-passport-content]');
  const loadButton = $('[data-passport-load]');
  const status = $('#passport-status');
  let storageAvailable = true;
  let passport = readPassport();

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      storageAvailable = false;
      return fallback;
    }
  }

  function readPassport() {
    return normalizePassport(readJson(KEY, emptyPassport()));
  }

  function readFavorites() {
    return normalizeFavorites(readJson(FAVORITES_KEY, []));
  }

  function readWallet() {
    const raw = readJson(WALLET_KEY, null);
    const balance = raw && typeof raw === 'object' && Number.isSafeInteger(raw.balance) && raw.balance >= 0
      ? Math.min(raw.balance, 1000000000)
      : 0;
    return { balance };
  }

  function savePassport() {
    passport.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(passport));
      storageAvailable = true;
      return true;
    } catch {
      storageAvailable = false;
      return false;
    }
  }

  function processPendingSessions() {
    const pending = readJson(PENDING_KEY, []);
    if (!Array.isArray(pending) || pending.length === 0) return 0;
    let next = passport;
    let added = 0;
    for (const event of pending) {
      if (!event || typeof event !== 'object' || event.sessionStarted !== true) continue;
      const queuedAt = Number.isFinite(event.queuedAt) ? event.queuedAt : Date.now();
      const result = recordSession(next, event, Date.now());
      next = result.progress;
      if (result.added) added += 1;
    }
    const previous = passport;
    passport = next;
    if (!savePassport()) {
      passport = previous;
      return 0;
    }
    try {
      localStorage.setItem(PENDING_KEY, '[]');
    } catch {
      storageAvailable = false;
    }
    return added;
  }

  function announce(message) {
    if (status) status.textContent = message;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = String(value);
  }

  function renderStats(snapshot) {
    setText('#passport-sessions', snapshot.totalSessions.toLocaleString('ru-RU'));
    setText('#passport-worlds', snapshot.uniqueGames.toLocaleString('ru-RU') + ' / 11');
    setText('#passport-favorites', snapshot.favoritesCount.toLocaleString('ru-RU'));
    setText('#passport-streak', snapshot.streakDays.toLocaleString('ru-RU') + (snapshot.streakDays === 1 ? ' день' : ' дн.'));
    setText('#passport-xp', snapshot.xp.toLocaleString('ru-RU') + ' XP');
    setText('#passport-level', String(snapshot.level).padStart(2, '0'));
    setText('#passport-level-progress', snapshot.levelProgressPct + ' / 100 XP до следующего уровня');
    const progress = $('#passport-xp-progress');
    if (progress) {
      progress.value = snapshot.levelProgressPct;
      progress.setAttribute('aria-valuetext', snapshot.levelProgressPct + ' из 100 XP');
    }
    setText('#passport-shards', snapshot.shardBalance.toLocaleString('ru-RU'));
  }

  function renderMissions(snapshot) {
    const list = $('#passport-missions');
    if (!list) return;
    list.replaceChildren();
    for (const mission of snapshot.missions) {
      const item = make('article', 'og-passport-mission' + (mission.complete ? ' is-complete' : ''));
      const top = make('div', 'og-passport-mission-top');
      const copy = make('div', 'og-passport-mission-copy');
      copy.append(make('strong', '', mission.title), make('p', '', mission.detail));
      top.append(copy, make('span', 'og-passport-mission-count', mission.progress + ' / ' + mission.goal));
      const progress = make('progress', 'og-passport-progress');
      progress.max = mission.goal;
      progress.value = mission.progress;
      progress.setAttribute('aria-label', mission.title + ': ' + mission.progress + ' из ' + mission.goal);
      item.append(top, progress, make('small', 'og-passport-mission-state', mission.complete ? 'ВЫПОЛНЕНО' : 'В ПРОЦЕССЕ'));
      list.append(item);
    }
  }

  function renderBadges(snapshot) {
    const list = $('#passport-badges');
    if (!list) return;
    list.replaceChildren();
    for (const badge of snapshot.badges) {
      const item = make('article', 'og-passport-badge' + (badge.unlocked ? ' is-unlocked' : ' is-locked'));
      item.append(
        make('span', 'og-passport-badge-mark', BADGE_MARKS[badge.id] || '◇'),
        make('strong', '', badge.title),
        make('small', '', badge.description),
        make('em', '', badge.unlocked ? 'ОТКРЫТО' : 'ЕЩЁ ВПЕРЕДИ')
      );
      item.setAttribute('aria-label', badge.title + '. ' + badge.description + '. ' + (badge.unlocked ? 'Открыто' : 'Пока закрыто'));
      list.append(item);
    }
  }

  function renderResume(snapshot) {
    const link = $('#passport-resume');
    if (!link) return;
    const last = snapshot.progress.sessions[snapshot.progress.sessions.length - 1];
    const savedRecent = readJson(RECENT_KEY, []);
    const recentId = Array.isArray(savedRecent)
      ? savedRecent.map(item => typeof item === 'string' ? item : item && item.gameId).find(id => typeof id === 'string' && GAME_URLS[id])
      : '';
    const gameId = last && GAME_URLS[last.gameId] ? last.gameId : recentId || '';
    link.hidden = !gameId;
    if (gameId) {
      link.href = GAME_URLS[gameId];
      link.textContent = 'Вернуться в ' + PASSPORT_GAME_TITLES[gameId] + ' ↗';
    } else {
      link.removeAttribute('href');
      link.textContent = 'Сначала выбери игру';
    }
  }

  function render() {
    passport = normalizePassport(passport);
    const snapshot = derivePassport(passport, readFavorites(), readWallet());
    renderStats(snapshot);
    renderMissions(snapshot);
    renderBadges(snapshot);
    renderResume(snapshot);
    if (content) content.hidden = false;
    if (loadButton) loadButton.hidden = true;
    const loading = $('#passport-loading');
    if (loading) loading.hidden = true;
    root.dataset.ready = 'true';
    root.setAttribute('aria-busy', 'false');
    const privacyNote = $('#passport-storage-note');
    if (privacyNote) {
      privacyNote.textContent = storageAvailable
        ? 'Паспорт хранится только в этом браузере. XP и знаки отличия — локальный прогресс, не деньги и не серверные достижения.'
        : 'Хранилище браузера недоступно: текущая сессия отображается временно, но прогресс может не сохраниться после закрытия страницы.';
    }
  }

  function persistAndRender(message) {
    savePassport();
    render();
    if (message) announce(message);
  }

  async function shareInvite() {
    const latest = passport.sessions[passport.sessions.length - 1];
    const gameId = latest && GAME_URLS[latest.gameId] ? latest.gameId : 'aether-grid';
    let url = new URL('/games/', location.origin);
    try {
      const invite = window.OSGARDInvite;
      if (invite && typeof invite.createLink === 'function') {
        const candidate = new URL(invite.createLink(gameId), location.origin);
        if (candidate.origin === location.origin && candidate.pathname.startsWith('/games/invite/')) url = candidate;
      }
    } catch {
      // Keep the safe same-origin catalogue fallback.
    }
    if (url.pathname === '/games/') {
      url.searchParams.set('utm_source', 'osgard_play');
      url.searchParams.set('utm_medium', 'referral');
      url.searchParams.set('utm_campaign', 'player_passport');
      url.searchParams.set('utm_content', gameId);
    }
    const inviteText = 'Попробуй ' + PASSPORT_GAME_TITLES[gameId] + ' в OSGARD PLAY: ' + url.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'OSGARD PLAY · приглашение',
          text: 'Давай попробуем один игровой мир и сравним впечатления.',
          url: url.href
        });
        const result = recordInvite(passport, 'web-share');
        passport = result.progress;
        persistAndRender(result.added
          ? 'Системное меню приняло приглашение. Это не подтверждение публичной публикации.'
          : 'Приглашение уже подготовлено сегодня. Публичная публикация не проверяется.');
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url.href);
        const result = recordInvite(passport, 'clipboard');
        passport = result.progress;
        persistAndRender(result.added
          ? 'Ссылка скопирована. Паспорт отметил подготовку приглашения, но не засчитывает публичный репост.'
          : 'Ссылка скопирована; сегодняшняя цель приглашения уже выполнена.');
        return;
      }
      const result = window.prompt('Скопируй ссылку-приглашение вручную:', inviteText);
      if (result !== null) {
        announce('Ссылка показана для ручного копирования. Подготовка приглашения не засчитывается автоматически.');
      }
    } catch (error) {
      if (error && error.name === 'AbortError') {
        announce('Отправка приглашения отменена. Прогресс не изменён.');
      } else {
        announce('Не удалось открыть меню отправки. Попробуй скопировать адрес из строки браузера.');
      }
    }
  }

  function exportPassport() {
    const snapshot = derivePassport(passport, readFavorites(), readWallet());
    const payload = {
      type: 'osgard-player-passport',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      note: 'Локальный прогресс устройства. Не является серверной статистикой или подтверждённым платёжным балансом.',
      summary: {
        sessions: snapshot.totalSessions,
        uniqueGames: snapshot.uniqueGames,
        favorites: snapshot.favoritesCount,
        streakDays: snapshot.streakDays,
        xp: snapshot.xp,
        level: snapshot.level,
        localShardsBalance: snapshot.shardBalance
      },
      progress: passport
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = make('a');
    link.href = objectUrl;
    link.download = 'osgard-player-passport-' + new Date().toISOString().slice(0, 10) + '.json';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    announce('Экспортировано. В файл включены только локальный паспорт и его сводка.');
  }

  function resetPassport() {
    const confirmed = window.confirm('Сбросить локальный паспорт, XP, серию и миссии? Избранное, история каталога и SHARDS не будут изменены.');
    if (!confirmed) return;
    passport = emptyPassport();
    persistAndRender('Локальный паспорт сброшен. Избранное, история и SHARDS сохранены отдельно.');
  }

  document.addEventListener('osgard:game-session-ended', event => {
    const detail = event && event.detail;
    if (!detail || detail.sessionStarted !== true) return;
    const previousCount = passport.sessions.length;
    processPendingSessions();
    const sessionId = typeof detail.sessionId === 'string' ? detail.sessionId : '';
    const alreadyRecorded = sessionId && passport.sessions.some(item => item.sessionId === sessionId);
    if (!alreadyRecorded && passport.sessions.length === previousCount) {
      const result = recordSession(passport, detail);
      if (result.added) {
        passport = result.progress;
        savePassport();
      }
    }
    render();
    announce('Игровая сессия учтена в локальном паспорте.');
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    if (target.closest('[data-favorite]')) window.setTimeout(render, 0);
    if (target.closest('[data-passport-share]')) void shareInvite();
    if (target.closest('[data-passport-export]')) exportPassport();
    if (target.closest('[data-passport-reset]')) resetPassport();
    if (target.closest('[data-passport-load]')) render();
  });

  window.addEventListener('storage', event => {
    if (!event || [KEY, FAVORITES_KEY, RECENT_KEY, WALLET_KEY].includes(event.key)) {
      passport = readPassport();
      render();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      passport = readPassport();
      render();
    }
  });

  passport = readPassport();
  processPendingSessions();
  render();
})();
