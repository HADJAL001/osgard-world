(() => {
  'use strict';
  const core = window.OSGARDRelayCore;
  const grid = document.querySelector('#games-grid');
  const host = document.querySelector('#post-run-recommendations');
  const player = document.querySelector('#player-dialog');
  if (!core || !grid || !player || document.querySelector('#osgard-relay-entry')) return;

  const STATE_KEY = 'osgard.games.relay.state.v1';
  const COSMETIC_KEY = 'osgard.games.relay.cosmetics.v1';
  const SEEN_KEY = 'osgard.games.relay.seen.v1';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const games = {
    'null-shift': { title: 'NULL//SHIFT', subtitle: 'Тактический рейд', href: '/games/null-shift-godot/' },
    time: { title: 'Империя времени', subtitle: 'Стратегия и управление городом', href: '/games/time' },
    swarm: { title: 'SWARM', subtitle: 'Командная симуляция', href: '/games/swarm/' },
    inherit: { title: 'INHERIT', subtitle: 'Мир, который продолжают поколения', href: '/games/inherit/' },
    remix: { title: 'REMIX', subtitle: 'Арена испытаний', href: '/games/remix/' }
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const consented = () => {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
  };
  function randomHex(bytes = 4) {
    const data = new Uint8Array(bytes);
    try { crypto.getRandomValues(data); }
    catch { for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256); }
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  }
  function getState() {
    try { return core.normalizeState(JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null')); }
    catch { return null; }
  }
  function setState(state) {
    const checked = core.normalizeState(state);
    try {
      if (checked) sessionStorage.setItem(STATE_KEY, JSON.stringify(checked));
      else sessionStorage.removeItem(STATE_KEY);
    } catch {}
    renderEntry();
    return checked;
  }
  function getCosmetic() {
    try {
      const value = JSON.parse(localStorage.getItem(COSMETIC_KEY) || 'null');
      return value && value.schemaVersion === 1 && value.relayTrail === true ? value : null;
    } catch { return null; }
  }
  function awardCosmetic(state) {
    const record = { schemaVersion: 1, relayTrail: true, earnedAt: state.completedAt || Date.now(), firstGame: state.firstGame, secondGame: state.secondGame };
    try { localStorage.setItem(COSMETIC_KEY, JSON.stringify(record)); } catch {}
    return record;
  }
  function getTelemetrySessionId() {
    try {
      const key = 'osgard.games.relay.telemetry-session.v1';
      let value = sessionStorage.getItem(key) || '';
      if (!/^session_[a-f0-9]{24}$/.test(value)) {
        value = 'session_' + randomHex(12) + randomHex(12);
        sessionStorage.setItem(key, value);
      }
      return value;
    } catch { return 'session_' + randomHex(12) + randomHex(12); }
  }
  async function track(name, gameId, source) {
    if (!consented()) return false;
    let queue = window.OSGARD_CONSENTED_ANALYTICS;
    if ((!queue || typeof queue.enqueue !== 'function') && window.OSGARDGamesLazy && typeof window.OSGARDGamesLazy.loadConsentFeatures === 'function') {
      try { await window.OSGARDGamesLazy.loadConsentFeatures(); } catch {}
      queue = window.OSGARD_CONSENTED_ANALYTICS;
    }
    if (!consented() || !queue || typeof queue.enqueue !== 'function') return false;
    const event = {
      eventId: 'evt_' + randomHex(12) + randomHex(12),
      name,
      sessionId: getTelemetrySessionId(),
      gameId: core.isGame(gameId) ? gameId : 'unknown',
      source: String(source || 'osgard-relay').slice(0, 80),
      path: (location.pathname || '/games/').split('?')[0].slice(0, 120),
      durationSeconds: 0
    };
    try { await queue.enqueue(event); return true; } catch { return false; }
  }
  function applyTransition(event) {
    const current = getState();
    const result = core.transition(current, event);
    if (!result.changed || !result.state) return result;
    const nextState = result.state;
    const persisted = nextState.phase === 'abandoned' ? null : nextState;
    setState(persisted);
    for (const name of result.events) {
      const game = name === 'relay_game_2_started' || name === 'relay_game_2_selected' ? nextState.secondGame : nextState.firstGame;
      void track(name, game, 'osgard-relay:' + name.replace(/_/g, '-'));
    }
    if (result.rewardUnlocked) awardCosmetic(nextState);
    return result;
  }
  function launchGame(id) {
    if (!core.isGame(id)) return false;
    const link = document.querySelector('a[data-play="' + id + '"]');
    if (!link || !link.isConnected) {
      setMessage(entryStatus, 'Не удалось найти запуск игры. Открой её из каталога и повтори маршрут.');
      return false;
    }
    setMessage(entryStatus, 'Открываем ' + games[id].title + '…');
    link.click();
    return true;
  }
  function setMessage(node, value) {
    if (node) node.textContent = value;
  }
  function cancelRelay() {
    const current = getState();
    if (!current) return false;
    const result = applyTransition({ type: 'cancel', game: current.phase === 'await_second_start' ? current.secondGame : current.firstGame, at: Date.now() });
    if (!result.changed) return false;
    const panel = $('#og-relay-panel', host || document);
    if (panel) panel.remove();
    setMessage(entryStatus, 'Маршрут отменён. Любую игру можно запускать отдельно.');
    return true;
  }
  function appendCancelButton(target) {
    const cancel = make('button', 'og-relay-cancel', 'Отменить маршрут');
    cancel.type = 'button';
    cancel.addEventListener('click', cancelRelay);
    target.append(cancel);
    return cancel;
  }
  function createChoices(target, state, mode) {
    const choices = core.choices(state);
    if (!choices.length) return;
    const group = make('div', 'og-relay-choices');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Выбери вторую игру Relay');
    for (const id of choices) {
      const item = make('button', 'og-relay-choice');
      item.type = 'button';
      const copy = make('span', 'og-relay-choice-copy');
      copy.append(make('strong', '', games[id].title), make('small', '', games[id].subtitle));
      item.append(copy, make('span', 'og-relay-choice-action', 'Продолжить ↗'));
      item.addEventListener('click', () => {
        const result = applyTransition({ type: 'second_selected', game: id, at: Date.now() });
        if (!result.changed) return;
        void track('relay_opt_in', result.state.firstGame, 'osgard-relay:continue-route');
        renderPostgame(result.state);
        launchGame(id);
      });
      target.append(item);
    }
  }
  let entry, entryStatus;
  let inviteAccepted = false;
  function buildEntry() {
    entry = make('section', 'og-relay-entry');
    entry.id = 'osgard-relay-entry';
    entry.setAttribute('aria-label', 'OSGARD Relay — двухигровой маршрут');
    grid.parentNode.insertBefore(entry, grid);
  }
  function parseInvite() {
    let params;
    try { params = new URLSearchParams(location.search); } catch { return null; }
    const invite = core.validateInvite({
      code: params.get('relay_invite'),
      firstGame: params.get('relay_first'),
      secondGame: params.get('relay_second')
    });
    if (!invite || params.get('utm_source') !== 'osgard_play' || params.get('utm_medium') !== 'referral' || params.get('utm_campaign') !== 'osgard_relay') return null;
    return invite;
  }
  const incomingInvite = parseInvite();
  function renderInviteCard(invite, target) {
    target.replaceChildren();
    target.append(
      make('p', 'og-relay-eyebrow', 'OSGARD RELAY / INVITATION'),
      make('h3', 'og-relay-title', 'Тебя пригласили в двухигровой маршрут'),
      make('p', 'og-relay-copy', games[invite.firstGame].title + ' → ' + games[invite.secondGame].title + '. Сначала заверши первую игру, затем продолжи во второй.'),
      make('p', 'og-relay-copy', 'Код маршрута не раскрывает личность отправителя. Доставка ссылки автоматически не подтверждается.')
    );
    entryStatus = make('p', 'og-relay-status');
    entryStatus.setAttribute('role', 'status');
    entryStatus.setAttribute('aria-live', 'polite');
    const join = make('button', 'og-relay-start', 'Принять маршрут ↗');
    join.type = 'button';
    join.addEventListener('click', () => beginFromInvite(invite));
    target.append(join, entryStatus);
  }
  function renderEntry() {
    if (!entry) return;
    const invite = parseInvite();
    const state = getState();
    if (invite) { renderInviteCard(invite, entry); return; }
    entry.replaceChildren();
    entry.append(make('p', 'og-relay-eyebrow', 'OSGARD PLAY / TWO-GAME EXPERIMENT'),
      make('h3', 'og-relay-title', 'Два мира. Один маршрут.'),
      make('p', 'og-relay-copy', 'Пройди реальный финал первой игры, затем открой второй мир. За обе завершённые игры откроется небольшой локальный знак — без оплаты, рекламы и преимущества в игре.'));
    entryStatus = make('p', 'og-relay-status');
    entryStatus.setAttribute('role', 'status');
    entryStatus.setAttribute('aria-live', 'polite');
    if (state && state.phase === 'await_second') {
      entry.append(make('p', 'og-relay-progress', 'Первый финал подтверждён: ' + games[state.firstGame].title + '. Выбери вторую игру.'));
      createChoices(entry, state, 'catalog');
      appendCancelButton(entry);
      entry.append(entryStatus);
      return;
    }
    if (state && state.phase === 'completed') {
      entry.append(make('p', 'og-relay-progress', 'Маршрут завершён: ' + games[state.firstGame].title + ' → ' + games[state.secondGame].title + '. Знак Relay Trail доступен локально на этом устройстве.'));
      const share = make('button', 'og-relay-share', 'Пригласить друга ↗');
      share.type = 'button';
      share.addEventListener('click', () => void shareInvite(state, entryStatus));
      entry.append(share, entryStatus);
      return;
    }
    if (state && state.phase === 'await_first_start') {
      entry.append(make('p', 'og-relay-progress', 'Маршрут сохранён в этой вкладке. Первая игра: ' + games[state.firstGame].title + '.'));
      const resume = make('button', 'og-relay-start', 'Запустить первую игру ↗');
      resume.type = 'button';
      resume.addEventListener('click', () => launchGame(state.firstGame));
      entry.append(resume);
      appendCancelButton(entry);
      entry.append(entryStatus);
      return;
    }
    if (state && state.phase === 'await_second_start') {
      entry.append(make('p', 'og-relay-progress', 'Вторая игра выбрана: ' + games[state.secondGame].title + '. Можно продолжить маршрут.'));
      const resumeSecond = make('button', 'og-relay-start', 'Продолжить во второй игре ↗');
      resumeSecond.type = 'button';
      resumeSecond.addEventListener('click', () => launchGame(state.secondGame));
      entry.append(resumeSecond);
      appendCancelButton(entry);
      entry.append(entryStatus);
      return;
    }
    if (state && ['first_started','second_started'].includes(state.phase)) {
      const copy = state.phase === 'first_started' ? 'Первая игра активна. Заверши её внутри клиента, чтобы открыть следующий этап.' :
        'Вторая игра активна. Заверши её внутри клиента, чтобы получить локальный знак.';
      entry.append(make('p', 'og-relay-progress', copy), entryStatus);
      return;
    }
    const controls = make('div', 'og-relay-entry-controls');
    const label = make('label', 'og-relay-select-label', 'Начать маршрут с');
    const select = make('select', 'og-relay-first-game');
    select.id = 'og-relay-first-game';
    select.setAttribute('aria-label', 'Первая игра для OSGARD Relay');
    const placeholder = make('option', '', 'Выбери игру');
    placeholder.value = ''; placeholder.disabled = true; placeholder.selected = true;
    select.append(placeholder);
    for (const id of core.GAME_IDS) { const option = make('option', '', games[id].title); option.value = id; select.append(option); }
    label.append(select);
    const start = make('button', 'og-relay-start', 'Начать Relay ↗');
    start.type = 'button';
    start.addEventListener('click', () => {
      if (!core.isGame(select.value)) { setMessage(entryStatus, 'Выбери одну из пяти игр, чтобы начать маршрут.'); return; }
      const nextState = core.createState({ id: randomHex(4), firstGame: select.value, at: Date.now() });
      if (!nextState) return;
      setState(nextState);
      void track('relay_opt_in', nextState.firstGame, 'osgard-relay:catalog-opt-in');
      launchGame(nextState.firstGame);
    });
    controls.append(label, start);
    entry.append(controls, entryStatus);
  }
  async function shareInvite(state, status) {
    const inviteCode = randomHex(4);
    const url = new URL('/games/', location.origin);
    url.searchParams.set('relay_invite', inviteCode);
    url.searchParams.set('relay_first', state.firstGame);
    url.searchParams.set('relay_second', state.secondGame);
    url.searchParams.set('utm_source', 'osgard_play');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'osgard_relay');
    const inviteUrl = url.href;
    void track('relay_invite_link_prepared', state.secondGame, 'osgard-relay:invite-link');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD Relay', text: 'Два игровых мира, один маршрут. Пройди его со мной в OSGARD PLAY.', url: inviteUrl });
        setMessage(status, 'Панель отправки закрыта. Факт доставки ссылки не подтверждается автоматически.');
        return;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') { setMessage(status, 'Отправка отменена. Ссылка не считается доставленной.'); return; }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage(status, 'Ссылка скопирована. Доставка и открытие приглашения отслеживаются только при согласии на аналитику.');
    } catch {
      const field = make('textarea', 'og-relay-invite-url', inviteUrl);
      field.readOnly = true;
      field.setAttribute('aria-label', 'Ссылка-приглашение OSGARD Relay');
      status.replaceChildren(make('span', '', 'Скопируй ссылку вручную; OSGARD не видит факт отправки.'), field);
      field.focus(); field.select();
    }
  }
  function showPostgame(state) {
    if (!host || !state) return;
    const previous = $('#og-relay-panel', host);
    if (previous) previous.remove();
    const panel = make('section', 'og-relay-postgame');
    panel.id = 'og-relay-panel';
    panel.setAttribute('aria-labelledby', 'og-relay-postgame-title');
    panel.append(make('p', 'og-relay-eyebrow', 'OSGARD RELAY / ROUTE CONTROL'));
    if (state.phase === 'await_second') {
      panel.append(make('h3', 'og-relay-title', 'Первый этап завершён. Продолжим?'),
        make('p', 'og-relay-copy', 'Завершение первой игры подтверждено игровым клиентом. Выбери второй мир, чтобы закрыть маршрут.'));
      createChoices(panel, state, 'postgame');
      appendCancelButton(panel);
    } else if (state.phase === 'completed') {
      panel.append(make('h3', 'og-relay-title', 'Relay завершён'),
        make('p', 'og-relay-copy', 'Открыт локальный знак Relay Trail. Это косметическая отметка в текущем браузере, а не серверный предмет или переносимый баланс.'));
      const share = make('button', 'og-relay-share', 'Пригласить друга ↗');
      share.type = 'button';
      const status = make('p', 'og-relay-status');
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      share.addEventListener('click', () => void shareInvite(state, status));
      panel.append(share, status);
    } else return;
    host.hidden = false;
    host.append(panel);
    player.classList.add('has-recommendations');
  }
  function beginFromInvite(invite) {
    if (!invite) return;
    inviteAccepted = true;
    try {
      const url = new URL(location.href);
      for (const key of ['relay_invite','relay_first','relay_second']) url.searchParams.delete(key);
      if (url.searchParams.get('utm_campaign') === 'osgard_relay') {
        url.searchParams.delete('utm_source');
        url.searchParams.delete('utm_medium');
        url.searchParams.delete('utm_campaign');
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
    const state = core.createState({ id: randomHex(4), firstGame: invite.firstGame, preferredSecondGame: invite.secondGame, invitedByCode: invite.code, at: Date.now() });
    if (!state) return;
    setState(state);
    void track('relay_invite_accepted', invite.firstGame, 'osgard-relay:invite-accept');
    void track('relay_opt_in', invite.firstGame, 'osgard-relay:invite-opt-in');
    launchGame(invite.firstGame);
  }

  const stateAtLoad = getState();
  if (stateAtLoad && ['first_started','second_started'].includes(stateAtLoad.phase)) {
    const activeGame = stateAtLoad.phase === 'first_started' ? stateAtLoad.firstGame : stateAtLoad.secondGame;
    const abandoned = core.transition(stateAtLoad, { type: 'session_ended', game: activeGame, reason: 'page_reloaded', at: Date.now() });
    if (abandoned.changed) {
      setState(null);
      void track('relay_abandoned', activeGame, 'osgard-relay:page-reloaded');
    }
  }
  buildEntry();
  renderEntry();
  const inviteAtLoad = parseInvite();
  let entryVisible = false, seenTracked = false;
  function maybeTrackSeen() {
    if (!entryVisible || seenTracked || inviteAccepted || !consented()) return;
    seenTracked = true;
    void track(inviteAtLoad ? 'relay_invite_opened' : 'relay_seen', inviteAtLoad ? inviteAtLoad.firstGame : 'unknown',
      inviteAtLoad ? 'osgard-relay:invite-visible' : 'osgard-relay:entry-visible');
  }
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(entries => {
      for (const item of entries) if (item.target === entry) entryVisible = item.isIntersecting && item.intersectionRatio >= 0.5;
      maybeTrackSeen();
    }, { threshold: [0, 0.5, 1] });
    observer.observe(entry);
  }
  document.addEventListener('change', event => {
    if (event.target && event.target.id === 'analytics-toggle') setTimeout(maybeTrackSeen, 0);
  });

  document.addEventListener('osgard:game-session-started', event => {
    const data = event.detail || {};
    const current = getState();
    if (!current || !data.game) return;
    const result = applyTransition({ type: 'session_started', game: data.game, at: Number(data.startedAt) || Date.now() });
    if (result.changed && result.state && result.state.phase !== 'abandoned') setMessage(entryStatus, 'Реальный старт подтверждён. Заверши этап внутри игры.');
  });
  document.addEventListener('osgard:game-completed', event => {
    const data = event.detail || {};
    const result = applyTransition({ type: 'game_completed', game: data.game, at: Date.now() });
    if (!result.changed) return;
    const state = result.state;
    renderEntry();
    setTimeout(() => showPostgame(state), 0);
  });
  document.addEventListener('osgard:game-session-ended', event => {
    const data = event.detail || {};
    const current = getState();
    if (!current || !data.game) return;
    const result = applyTransition({ type: 'session_ended', game: data.game, reason: data.reason });
    if (!result.changed) return;
    const panel = $('#og-relay-panel', host || document);
    if (panel) panel.remove();
    renderEntry();
  });
  document.addEventListener('osgard:game-launching', () => {
    const panel = $('#og-relay-panel', host || document);
    if (panel) panel.remove();
  });
  window.OSGARDRelay = Object.freeze({ version: core.version, start: launchGame, readState: getState, inviteUrl: shareInvite });
})();