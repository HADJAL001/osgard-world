(() => {
  'use strict';

  const PROFILES = Object.freeze({
    'null-shift': Object.freeze({ level: 'heavy', webgl2: true, label: 'Godot · 3D', note: 'Тяжёлый 3D/WebGL-профиль' }),
    remix: Object.freeze({ level: 'heavy', webgl2: true, label: 'Unity WebGL', note: 'WebGL-плеер с повышенной графической нагрузкой' }),
  });
  const FALLBACK_ORDER = Object.freeze(['aether-grid', 'signal-run', 'afterimage-run', 'civic-cascade']);
  const $ = (selector, root = document) => root.querySelector(selector);

  // WebGL context creation can block the main thread on slower phones.
  // Keep initial catalog rendering cheap and only probe when the player asks for compatibility.
  function canCreateContext(kind) {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext(kind, { alpha: false, antialias: false, depth: false, stencil: false });
      if (!context) return false;
      const lose = context.getExtension && context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      canvas.width = 1;
      canvas.height = 1;
      return true;
    } catch {
      return false;
    }
  }

  function probeWebGL() {
    const webgl2 = canCreateContext('webgl2');
    return { webgl2, webgl1: webgl2 ? false : canCreateContext('webgl') };
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
    const offline = navigator.onLine === false;
    const slowNetwork = ['slow-2g', '2g'].includes(effectiveType);
    const constrained = saveData || slowNetwork || (memoryGb !== null && memoryGb <= 4);
    const touch = Number(navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
    const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    return { webgl2: null, webgl1: null, webglChecked: false, offline, slowNetwork, saveData, memoryGb, constrained, touch, reducedMotion };
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
      ' <p class="osgard-fit__text">Проверяем возможности браузера только по твоему запросу. Это предварительная оценка, а не тест производительности и не гарантия запуска.</p>',
      ' <div class="osgard-fit__actions">',
      '  <a id="osgard-fit-launch" class="osgard-fit__primary" href="/games/aether-grid/">Начать с AETHER GRID ↗</a>',
      '  <button id="osgard-fit-filter" class="osgard-fit__secondary" type="button" aria-pressed="false" aria-controls="games-grid">Проверить совместимость</button>',
      ' </div>',
      ' <p class="osgard-fit__privacy">Проверка по нажатию · только в этом браузере · характеристики устройства не отправляются на сервер</p>',
      '</div>',
      '<div class="osgard-fit__signals" aria-label="Возможности браузера">',
      ' <div class="osgard-fit__signal" id="osgard-fit-webgl"><span>WebGL 2</span><strong>Не проверен</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-input"><span>Ввод</span><strong>Проверяем…</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-network"><span>Сеть</span><strong>Проверяем…</strong></div>',
      ' <div class="osgard-fit__signal" id="osgard-fit-motion"><span>Анимация</span><strong>Проверяем…</strong></div>',
      '</div>',
      '<p id="osgard-fit-status" class="osgard-fit__status" role="status" aria-live="polite">WebGL пока не проверялся, чтобы не задерживать загрузку каталога.</p>',
    ].join('');

    grid.parentNode.insertBefore(panel, grid);
    const setSignal = (id, value, state = 'neutral') => {
      const node = $('#' + id, panel);
      if (!node) return;
      const strong = $('strong', node);
      if (strong) strong.textContent = value;
      node.dataset.state = state;
    };
    function refreshSignals() {
      setSignal('osgard-fit-webgl',
        !capabilities.webglChecked ? 'Не проверен' : (capabilities.webgl2 ? 'WebGL 2 доступен' : (capabilities.webgl1 ? 'Есть WebGL 1' : 'Не обнаружен')),
        !capabilities.webglChecked ? 'neutral' : (capabilities.webgl2 ? 'good' : 'warn'));
      setSignal('osgard-fit-input', capabilities.touch ? 'Есть сенсорный ввод' : 'Клавиатура / указатель', 'neutral');
      setSignal('osgard-fit-network', capabilities.offline ? 'Браузер offline' : (capabilities.saveData ? 'Экономия данных' : (capabilities.slowNetwork ? 'Медленная сеть' : 'Ограничений не найдено')), capabilities.offline ? 'warn' : 'neutral');
      setSignal('osgard-fit-motion', capabilities.reducedMotion ? 'Меньше движения' : 'Обычный режим', 'neutral');
    }

    const profileById = new Map();
    function updateProfileUI() {
      for (const card of cards) {
        const id = String(card.dataset.game || '');
        const profile = PROFILES[id] || { level: 'unmeasured', webgl2: false, label: 'Браузерная игра', note: 'Совместимость дополнительно проверяется при запуске' };
        let fit = 'unmeasured';
        let label = 'Проверяется внутри игры';
        if (profile.webgl2) {
          if (!capabilities.webglChecked) {
            fit = 'unmeasured';
            label = 'Проверка доступна по нажатию';
          } else {
            fit = capabilities.webgl2 && !capabilities.constrained ? 'good' : 'caution';
            label = capabilities.webgl2 ? (capabilities.constrained ? 'Запуск возможен · осторожно' : 'WebGL 2 найден') : 'Проверь WebGL перед запуском';
          }
        }
        if (profile.level === 'unmeasured' && capabilities.offline) {
          fit = 'caution';
          label = 'Браузер сообщает offline';
        }
        const current = { ...profile, fit, label };
        profileById.set(id, current);
        card.dataset.osgardFit = fit;
        const kicker = $('.kicker', card) || $('.copy', card);
        if (kicker) {
          let chip = $('.osgard-fit-chip', kicker);
          if (!chip) {
            chip = document.createElement('span');
            chip.className = 'osgard-fit-chip';
            kicker.appendChild(chip);
          }
          chip.dataset.state = fit;
          chip.textContent = label;
          chip.title = profile.note;
        }
      }
    }

    const launch = $('#osgard-fit-launch', panel);
    function updateRecommendation() {
      const recommendedId = capabilities.webglChecked && capabilities.webgl2 && !capabilities.constrained
        ? 'null-shift'
        : FALLBACK_ORDER.find(id => cards.some(card => card.dataset.game === id)) || cards[0]?.dataset.game;
      const recommendedCard = cards.find(card => card.dataset.game === recommendedId);
      const recommendedLink = $('a[data-play]', recommendedCard) || $('a[href]', recommendedCard);
      if (launch && recommendedLink) {
        launch.href = recommendedLink.getAttribute('href') || '/games/';
        const title = $('h3', recommendedCard)?.textContent?.trim() || recommendedId;
        launch.textContent = 'Начать с ' + title + ' ↗';
        launch.setAttribute('aria-label', 'Открыть рекомендованную игру: ' + title);
      }
    }

    let filtering = false;
    let checking = false;
    const filterButton = $('#osgard-fit-filter', panel);
    const status = $('#osgard-fit-status', panel);
    function applyFilter() {
      for (const card of cards) {
        const id = String(card.dataset.game || '');
        const profile = profileById.get(id);
        const unsuitableHeavy = profile?.level === 'heavy' && capabilities.webglChecked && (capabilities.constrained || !capabilities.webgl2);
        card.toggleAttribute('data-osgard-fit-hidden', filtering && unsuitableHeavy);
      }
      if (filterButton) {
        filterButton.setAttribute('aria-pressed', filtering ? 'true' : 'false');
        filterButton.textContent = !capabilities.webglChecked
          ? 'Проверить совместимость'
          : (filtering ? 'Показать все игры' : 'Показать подходящие');
        filterButton.disabled = checking;
      }
      if (status) {
        status.textContent = filtering
          ? 'Скрыты только тяжёлые WebGL-игры, если браузер не подтвердил WebGL 2 или обнаружен режим экономии ресурсов. Их всё равно можно открыть, отключив фильтр.'
          : (!capabilities.webglChecked
              ? 'WebGL пока не проверялся, чтобы не задерживать загрузку каталога.'
              : 'Игры не блокируются автоматически. Для игр без известного профиля совместимость проверяется внутри самой игры.');
      }
    }

    refreshSignals();
    updateProfileUI();
    updateRecommendation();
    applyFilter();

    filterButton?.addEventListener('click', () => {
      if (!capabilities.webglChecked) {
        if (checking) return;
        checking = true;
        filterButton.disabled = true;
        filterButton.textContent = 'Проверяем WebGL…';
        if (status) status.textContent = 'Проверяем поддержку WebGL локально. Игровой каталог остаётся доступным.';
        // Run outside the click handler's immediate event work; still user-initiated.
        window.setTimeout(() => {
          const result = probeWebGL();
          capabilities.webgl2 = result.webgl2;
          capabilities.webgl1 = result.webgl1;
          capabilities.webglChecked = true;
          capabilities.constrained = !result.webgl2 || capabilities.saveData || capabilities.slowNetwork ||
            (capabilities.memoryGb !== null && capabilities.memoryGb <= 4);
          checking = false;
          filtering = false;
          refreshSignals();
          updateProfileUI();
          updateRecommendation();
          applyFilter();
          if (status) status.textContent = capabilities.webgl2
            ? (capabilities.constrained ? 'WebGL 2 найден; также обнаружены признаки ограниченных ресурсов. Запуск остаётся на твоё усмотрение.' : 'WebGL 2 найден. Это не тест скорости; при проблеме с запуском всегда можно выбрать другую игру.')
            : (capabilities.webgl1 ? 'Обнаружен WebGL 1, но WebGL 2 не подтверждён. Можно открыть любую игру вручную.' : 'WebGL не подтвердился. Можно открыть любую игру вручную.');
        }, 0);
        return;
      }
      filtering = !filtering;
      applyFilter();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
