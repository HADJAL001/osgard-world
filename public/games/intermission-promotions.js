(() => {
  'use strict';

  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const SELECTED_KEY = 'osgard.games.preferred-project.v1';
  const GAMES = {
    'null-shift': 'NULL//SHIFT',
    time: 'Империя времени',
    swarm: 'SWARM',
    inherit: 'INHERIT',
    remix: 'REMIX',
    'civic-cascade': 'CIVIC CASCADE',
    patina: 'PATINA Atelier',
    'signal-run': 'SIGNAL RUN',
    'cascade-lab': 'CASCADE LAB'
  };
  const OFFERS = [
    { id: 'create', mark: 'BW', name: 'OSGARD BEW WORLD', description: 'Создание проектов и приложений', domain: 'osgardbewworld.com', url: 'https://osgardbewworld.com/' },
    { id: 'o2', mark: 'O2', name: 'O2 SYSTEM', description: 'Учёт кассы обменников', domain: 'o2system.art', url: 'https://o2system.art/' },
    { id: 'taxi', mark: 'SJ', name: 'SENJORIO', description: 'Премиальное такси', domain: 'senjorio.com', url: 'https://senjorio.com/' },
    { id: 'superday', mark: 'SD', name: 'SUPERDAY', description: 'Умная карта и планировщик дня', domain: 'superday.run', url: 'https://superday.run/' },
    { id: 'marcosa', mark: 'MC', name: 'MARCOSA', description: 'Социальная сеть нового поколения', domain: 'marcosa.club', url: 'https://marcosa.club/' },
    { id: 'myosa', mark: 'MY', name: 'MYOSA', description: 'Платформа искусственного интеллекта', domain: 'myosa.world', url: 'https://myosa.world/' },
    { id: 'gold', mark: 'GG', name: 'GOLD GLAMOUR', description: 'Премиальные услуги с золотом и выездным обслуживанием', domain: 'gold-glamour.online', url: 'https://gold-glamour.online/' },
    { id: 'vpn', mark: 'GV', name: 'GARD VPN', description: 'VPN-сервис', domain: 'gardvpn.is', url: 'https://gardvpn.is/' },
    { id: 'business', mark: 'OS', name: 'OSGARD OS', description: 'Инструменты развития бизнеса', domain: 'osgardos.com', url: 'https://osgardos.com/' },
    { id: 'studio', mark: 'VS', name: 'OSGARD VANGUARD', description: 'Создание видео', domain: 'osgardvanguard.studio', url: 'https://osgardvanguard.studio/' }
  ];
  const CURATED = {
    'null-shift': 'myosa', time: 'superday', swarm: 'marcosa', inherit: 'marcosa',
    remix: 'studio', 'civic-cascade': 'business', patina: 'gold',
    'signal-run': 'taxi', 'cascade-lab': 'create'
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  let dialog = null;
  let offerGrid = null;
  let selectedPanel = null;
  let statusNode = null;
  let skipButton = null;
  let selectedOfferId = null;
  let activeGameId = null;
  let openCounter = 0;

  function readSelected() {
    try { return localStorage.getItem(SELECTED_KEY) || ''; } catch { return ''; }
  }
  function consented() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
  }
  function token() {
    const bytes = new Uint8Array(12);
    try { crypto.getRandomValues(bytes); }
    catch { for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256); }
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }
  function trackedUrl(offer, gameId) {
    const url = new URL(offer.url);
    url.searchParams.set('utm_source', 'osgard_play');
    url.searchParams.set('utm_medium', 'intermission');
    url.searchParams.set('utm_campaign', 'between_games');
    url.searchParams.set('utm_content', (GAMES[gameId] ? gameId : 'games') + '-' + offer.id);
    return url.href;
  }
  async function sendClickEvent(gameId, offerId) {
    if (!consented()) return false;
    const event = {
      eventId: 'evt_' + token(),
      name: 'cross_promo_clicked',
      sessionId: 'intermission_' + token(),
      gameId: Object.prototype.hasOwnProperty.call(GAMES, gameId) ? gameId : 'unknown',
      source: 'between-games:' + String(offerId).slice(0, 32),
      path: location.pathname,
      durationSeconds: 0
    };
    try {
      const configResponse = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' });
      const config = configResponse.ok ? await configResponse.json().catch(() => ({})) : {};
      if (!consented()) return false;
      const base = String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '');
      const response = await fetch(base + '/v1/events', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [event] })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  function buildDialog() {
    if (dialog) return;
    dialog = make('dialog', 'og-intermission');
    dialog.setAttribute('aria-labelledby', 'og-promo-title');
    dialog.setAttribute('aria-describedby', 'og-promo-intro');
    const shell = make('div', 'og-promo-shell');
    const header = make('header', 'og-promo-header');
    const intro = make('div');
    intro.append(make('p', 'og-promo-eyebrow', 'OSGARD PLAY / BETWEEN WORLDS'));
    const heading = make('h2');
    heading.id = 'og-promo-title';
    heading.append(document.createTextNode('Выбери, что '));
    heading.append(make('em', '', 'открыть дальше.'));
    intro.append(heading);
    const lead = make('p', 'og-promo-intro', 'Между игровыми сессиями можно заглянуть в другие проекты экосистемы. Выбери любой — или просто вернись к играм.');
    lead.id = 'og-promo-intro';
    intro.append(lead);
    const close = make('button', 'og-promo-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть предложение');
    close.addEventListener('click', closeDialog);
    header.append(intro, close);

    const layout = make('div', 'og-promo-layout');
    const list = make('section', 'og-promo-list');
    list.setAttribute('aria-label', 'Выбор проекта OSGARD');
    const listHeading = make('div', 'og-promo-list-heading');
    listHeading.append(make('span', '', 'ВЫБЕРИ ПРОЕКТ'), make('span', '', '10 / OSGARD ECOSYSTEM'));
    offerGrid = make('div', 'og-promo-grid');
    OFFERS.forEach((offer, index) => {
      const button = make('button', 'og-promo-offer');
      button.type = 'button';
      button.dataset.offerId = offer.id;
      button.setAttribute('aria-pressed', 'false');
      const monogram = make('span', 'og-promo-monogram', offer.mark);
      monogram.setAttribute('aria-hidden', 'true');
      const copy = make('span', 'og-promo-card-copy');
      copy.append(make('strong', '', offer.name), make('small', '', offer.description));
      button.append(monogram, copy);
      button.addEventListener('click', () => selectOffer(offer.id, true));
      offerGrid.append(button);
    });
    list.append(listHeading, offerGrid);
    selectedPanel = make('aside', 'og-promo-selected');
    selectedPanel.setAttribute('aria-live', 'polite');
    layout.append(list, selectedPanel);

    statusNode = make('p', 'og-promo-status');
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    const footer = make('footer', 'og-promo-footer');
    const disclosure = make('p', 'og-promo-disclosure');
    disclosure.append(document.createTextNode('ПРОЕКТЫ ЭКОСИСТЕМЫ OSGARD · '));
    disclosure.append(make('strong', '', 'это собственные направления OSGARD, а не сторонняя реклама.'));
    disclosure.append(document.createTextNode(' Ссылки откроются в новой вкладке. Переход необязателен.'));
    skipButton = make('button', 'og-promo-skip', 'Продолжить игры ↗');
    skipButton.type = 'button';
    skipButton.addEventListener('click', closeDialog);
    footer.append(disclosure, skipButton);
    shell.append(header, layout, statusNode, footer);
    dialog.append(shell);
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('og-intermission-open');
      const focusTarget = $('#catalog .title h2') || $('#catalog') || $('.hero');
      focusTarget?.setAttribute('tabindex', '-1');
      focusTarget?.focus({ preventScroll: true });
    });
    document.body.append(dialog);
  }
  function selectOffer(offerId, remember) {
    const offer = OFFERS.find(item => item.id === offerId) || OFFERS[0];
    selectedOfferId = offer.id;
    if (remember) {
      try { localStorage.setItem(SELECTED_KEY, offer.id); } catch {}
    }
    offerGrid.querySelectorAll('[data-offer-id]').forEach(button => {
      const isSelected = button.dataset.offerId === selectedOfferId;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    selectedPanel.replaceChildren();
    selectedPanel.append(
      make('span', 'og-promo-selected-eyebrow', 'ВЫБРАННЫЙ ПРОЕКТ / ' + offer.id.toUpperCase()),
      make('span', 'og-promo-selected-monogram', offer.mark),
      make('h3', '', offer.name),
      make('p', '', offer.description),
      make('span', 'og-promo-domain', offer.domain)
    );
    const href = make('a', 'og-promo-open', 'Открыть официальный сайт ↗');
    href.href = trackedUrl(offer, activeGameId);
    href.target = '_blank';
    href.rel = 'noopener noreferrer';
    href.dataset.projectId = offer.id;
    href.addEventListener('click', () => { void sendClickEvent(activeGameId, offer.id); });
    selectedPanel.append(href);
    statusNode.textContent = 'Выбрано: ' + offer.name + '. Можно открыть проект или вернуться к играм.';
  }
  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
  }
  function show(detail) {
    const gameId = detail && detail.game;
    if (!Object.prototype.hasOwnProperty.call(GAMES, gameId) || !detail.sessionStarted) return;
    buildDialog();
    activeGameId = gameId;
    selectedOfferId = CURATED[gameId] || readSelected() || 'create';
    if (readSelected() && OFFERS.some(offer => offer.id === readSelected())) selectedOfferId = readSelected();
    selectOffer(selectedOfferId, false);
    statusNode.textContent = 'Завершена сессия: ' + GAMES[gameId] + '. Выбери один из десяти проектов — либо пропусти.';
    document.body.classList.add('og-intermission-open');
    openCounter += 1;
    if (!dialog.open) dialog.showModal();
    dialog.dataset.sessionSequence = String(openCounter);
    const closeButton = $('.og-promo-close', dialog);
    closeButton?.focus({ preventScroll: true });
  }
  document.addEventListener('osgard:game-player-closed', event => {
    show(event.detail || {});
  });
  window.OSGARDIntermission = Object.freeze({
    show,
    offers: OFFERS.map(({ id, name, domain }) => Object.freeze({ id, name, domain }))
  });
})();