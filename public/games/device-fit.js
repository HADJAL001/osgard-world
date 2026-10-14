(() => {
  'use strict';

  const PROFILES = Object.freeze({
    'null-shift': Object.freeze({ level: 'heavy', webgl2: true, label: 'Godot · 3D', note: 'Тяжёлый 3D/WebGL-профиль' }),
    remix: Object.freeze({ level: 'heavy', webgl2: true, label: 'Unity WebGL', note: 'WebGL-плеер с повышенной графической нагрузкой' }),
  });
  const FALLBACK_ORDER = Object.freeze(['aether-grid', 'signal-run', 'afterimage-run', 'civic-cascade']);
  const CARD_BATCH_LIMIT = 3;
  const $ = (selector, root = document) => root.querySelector(selector);

  // Keep catalogue setup responsive on lower-end phones. requestIdleCallback is
  // bounded by a timeout; older browsers fall back to one small task per turn.
  // This changes scheduling only: all cards are still evaluated, in their original order.
  function scheduleIdle(callback) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(callback, { timeout: 250 });
      return;
    }
    window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 0);
  }

  // Do not create and destroy real GPU contexts while rendering the catalog.
  // Some mobile drivers block the main thread for hundreds of milliseconds on the
  // first context request. This is an API-availability hint, not a launch guarantee.
  function hasContextApi(kind) {
    if (kind === 'webgl2') return typeof window.WebGL2RenderingContext === 'function';
    if (kind === 'webgl') return typeof window.WebGLRenderingContext === 'function';
    return false;
  }

  function readCapabilities() {
    let connection = null;
    try { connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null; } catch {}
    let memoryGb = null;
    try {
      const value = Number(navigator.deviceMemory);
      if (Number.isFinite(value) && value > 0) memoryGb = value;
    } catch {}
    let saveData = false;
    let effectiveType = '';
    try {
      saveData = connection?.saveData === true;
      effectiveType = String(connection?.effectiveType || '');
    } catch {}
    const webgl2 = hasContextApi('webgl2');
    const webgl1 = hasContextApi('webgl');
    const offline = navigator.onLine === false;
    const slowNetwork = ['slow-2g', '2g'].includes(effectiveType);
    const constrained = !webgl2 || saveData || slowNetwork || (memoryGb !== null && memoryGb <= 4);
    const touch = Number(navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
    const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    return { webgl2, webgl1, offline, slowNetwork, saveData, memoryGb, constrained, touch, reducedMotion };
  }

  function init() {
    const grid = $('#games-grid');
    if (!grid || $('#osgard-device-fit')) return;
    const cards = Array.from(grid.querySelectorAll('[data-game]'));
    if (!cards.length) return;
    const capabilities = readCapabilities();

    const panel = document.createElement('section');
    panel.id = 'osgard-device-fit';
    panel.className = 'osgard-fit';
    panel.setAttribute('aria-labelledby', 'osgard-fit-title');
    panel.innerHTML = [
      '<div class="osgard-fit__copy">',
      ' <p class="osgard-fit__eyebrow">OSGARD PLAY / SMART LAUNCH</p>',
      ' <h2 id="osgard-fit-title">Начни с игры, подходящей твоему устройству</h2>',
      ' <p class="osgard-fit__text">Проверяем только возможности текущего браузера. Это предварительная оценка, а не тест производительности и не гарантия запуска.</p>',
      ' <div class="osgard-fit__actions">',
      '  <a id="osgard-fit-launch" class="osgard-fit__primary" href="/games/aether-grid/">Предложить игру ↗</a>',
      '  <button id="osgard-fit-filter" class="osgard-fit__secondary" type="button" aria-pressed="false" aria-controls="games-grid">Показать подходящие</button>',
      ' </div>',
      ' <p class="osgard-fit__privacy">Локальная проверка · характеристики устройства не отправляются на сервер</p>',
      '</div>',
      '<div class="osgard-fit__signals" aria-label="Возможности браузера">',
      ' <div class="osgard-fit__signal" id="osgard-fit-webgl"><span>WebGL 2</span><strong>Проверяем…</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-input"><span>Ввод</span><strong>Проверяем…</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-network"><span>Сеть</span><strong>Проверяем…</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-motion"><span>Анимация</span><strong>Проверяем…</strong></div>',
      '</div>',
      '<p id="osgard-fit-status" class="osgard-fit__status" role="status" aria-live="polite"></p>',
    ].join('');

    grid.parentNode.insertBefore(panel, grid);
    const setSignal = (id, value, state = 'neutral') => {
      const node = $('#' + id, panel);
      if (!node) return;
      const strong = $('strong', node);
      if (strong) strong.textContent = value;
      node.dataset.state = state;
    };

    setSignal('osgard-fit-webgl', capabilities.webgl2 ? 'API найден' : (capabilities.webgl1 ? 'Есть WebGL 1 API' : 'API не обнаружен'), capabilities.webgl2 ? 'good' : 'warn');
    setSignal('osgard-fit-input', capabilities.touch ? 'Есть сенсорный ввод' : 'Клавиатура / указатель', 'neutral');
    setSignal('osgard-fit-network', capabilities.offline ? 'Браузер offline' : (capabilities.saveData ? 'Экономия данных' : (capabilities.slowNetwork ? 'Медленная сеть' : 'Ограничений не найдено')), capabilities.offline ? 'warn' : 'neutral');
    setSignal('osgard-fit-motion', capabilities.reducedMotion ? 'Меньше движения' : 'Обычный режим', 'neutral');

    const profileById = new Map();
    let cardIndex = 0;
    let filtering = false;
    const filterButton = $('#osgard-fit-filter', panel);
    const status = $('#osgard-fit-status', panel);

    function applyFilter() {
      for (const card of cards) {
        const id = String(card.dataset.game || '');
        const profile = profileById.get(id);
        const unsuitableHeavy = profile?.level === 'heavy' && (capabilities.constrained || !capabilities.webgl2);
        card.toggleAttribute('data-osgard-fit-hidden', filtering && unsuitableHeavy);
      }
      if (filterButton) {
        filterButton.setAttribute('aria-pressed', filtering ? 'true' : 'false');
        filterButton.textContent = filtering ? 'Показать все игры' : 'Показать подходящие';
      }
      if (status) {
        status.textContent = filtering
          ? 'Скрыты только тяжёлые WebGL-игры, если браузер не подтвердил WebGL 2 или найден режим экономии ресурсов. Их всё равно можно открыть, отключив фильтр.'
          : 'Игры не блокируются автоматически. Для игр без известного профиля совместимость проверяется внутри самой игры.';
      }
    }

    filterButton?.addEventListener('click', () => {
      filtering = !filtering;
      applyFilter();
    });
    applyFilter();

    function annotateCard(card) {
      const id = String(card.dataset.game || '');
      const profile = PROFILES[id] || { level: 'unmeasured', webgl2: false, label: 'Браузерная игра', note: 'Совместимость дополнительно проверяется при запуске' };
      let fit = 'unmeasured';
      let label = 'Проверяется при запуске';
      if (profile.webgl2) {
        fit = capabilities.webgl2 && !capabilities.constrained ? 'good' : 'caution';
        label = capabilities.webgl2 ? (capabilities.constrained ? 'Запуск возможен · осторожно' : 'WebGL 2 найден') : 'Проверь WebGL перед запуском';
      }
      if (profile.level === 'unmeasured' && capabilities.offline) {
        fit = 'caution';
        label = 'Браузер сообщает offline';
      }
      profileById.set(id, { ...profile, fit, label });
      card.dataset.osgardFit = fit;
      const kicker = $('.kicker', card) || $('.copy', card);
      if (kicker && !$('.osgard-fit-chip', kicker)) {
        const chip = document.createElement('span');
        chip.className = 'osgard-fit-chip';
        chip.dataset.state = fit;
        chip.textContent = label;
        chip.title = profile.note;
        kicker.appendChild(chip);
      }
    }

    function finishSetup() {
      const recommendedId = capabilities.webgl2 && !capabilities.constrained
        ? 'null-shift'
        : FALLBACK_ORDER.find(id => cards.some(card => card.dataset.game === id)) || cards[0]?.dataset.game;
      const recommendedCard = cards.find(card => card.dataset.game === recommendedId);
      const recommendedLink = $('a[data-play]', recommendedCard) || $('a[href]', recommendedCard);
      const launch = $('#osgard-fit-launch', panel);
      if (launch && recommendedLink) {
        launch.href = recommendedLink.getAttribute('href') || '/games/';
        const title = $('h3', recommendedCard)?.textContent?.trim() || recommendedId;
        launch.textContent = 'Начать с ' + title + ' ↗';
        launch.setAttribute('aria-label', 'Открыть рекомендованную игру: ' + title);
      }
      // Apply once more after all profiles have been registered so a fast tap on
      // the filter button during the idle pass still takes effect deterministically.
      applyFilter();
    }

    function processCardBatch() {
      const end = Math.min(cardIndex + CARD_BATCH_LIMIT, cards.length);
      while (cardIndex < end) annotateCard(cards[cardIndex++]);
      if (cardIndex < cards.length) scheduleIdle(processCardBatch);
      else finishSetup();
    }

    // The panel and capability signals appear immediately. Card decoration is
    // split into small idle tasks so one large DOM traversal cannot monopolize
    // a mobile main-thread task; all cards still receive their original labels.
    scheduleIdle(processCardBatch);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();