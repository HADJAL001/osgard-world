(() => {
  'use strict';
  if (window.OSGARDAccessibility) return;
  const KEY = 'osgard.games.accessibility.v1';
  const DEFAULTS = Object.freeze({ motion: 'system', contrast: false, largeType: false, largeTargets: false });
  const $ = (id) => document.getElementById(id);
  const validMotion = new Set(['system', 'reduced', 'full']);
  let state = readState();
  let lastTrigger = null;
  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        motion: validMotion.has(value.motion) ? value.motion : DEFAULTS.motion,
        contrast: value.contrast === true,
        largeType: value.largeType === true,
        largeTargets: value.largeTargets === true,
      };
    } catch { return { ...DEFAULTS }; }
  }
  function writeState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function applyState() {
    const root = document.documentElement;
    root.dataset.osgardMotion = state.motion;
    root.classList.toggle('osgard-a11y-contrast', state.contrast);
    root.classList.toggle('osgard-a11y-large-type', state.largeType);
    root.classList.toggle('osgard-a11y-large-targets', state.largeTargets);
    const motion = $('osgard-a11y-motion'), contrast = $('osgard-a11y-contrast');
    const largeType = $('osgard-a11y-large-type'), largeTargets = $('osgard-a11y-large-targets');
    if (motion) motion.value = state.motion;
    if (contrast) contrast.checked = state.contrast;
    if (largeType) largeType.checked = state.largeType;
    if (largeTargets) largeTargets.checked = state.largeTargets;
  }
  function announce(message) {
    const node = $('osgard-a11y-status');
    if (node) node.textContent = message;
  }
  function saveAndApply() {
    applyState();
    announce(writeState() ? 'Настройки сохранены на этом устройстве.' : 'Настройки применены, но браузер не разрешил сохранить их.');
    window.dispatchEvent(new CustomEvent('osgard:accessibility-preferences-updated'));
  }
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'osgard-accessibility-open';
  trigger.className = 'osgard-a11y-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'osgard-accessibility-dialog');
  // Keep the accessible name equal to the visible label “Доступность”; the A± mark is decorative.
  trigger.innerHTML = '<span class="osgard-a11y-mark" aria-hidden="true">A±</span><span>Доступность</span>';
  const dialog = document.createElement('dialog');
  dialog.id = 'osgard-accessibility-dialog';
  dialog.className = 'osgard-a11y-dialog';
  dialog.setAttribute('aria-labelledby', 'osgard-a11y-heading');
  dialog.innerHTML =
    '<div class="osgard-a11y-shell">' +
    '<p class="osgard-a11y-kicker">OSGARD PLAY / ACCESSIBILITY</p>' +
    '<h2 id="osgard-a11y-heading">Твой комфорт — твои правила.</h2>' +
    '<p class="osgard-a11y-intro">Настройки меняют только отображение каталога на этом устройстве. Они не влияют на физику игр, покупки или сохранения.</p>' +
    '<div class="osgard-a11y-row"><div><label for="osgard-a11y-motion">Движение и анимация</label><small>По системе, уменьшить или оставить анимации.</small></div><select id="osgard-a11y-motion"><option value="system">Как в системе</option><option value="reduced">Уменьшить</option><option value="full">Полные эффекты</option></select></div>' +
    '<div class="osgard-a11y-row"><div><label class="osgard-a11y-label" for="osgard-a11y-contrast">Повышенная контрастность</label><small>Более чёткие границы и текст.</small></div><input class="osgard-a11y-check" id="osgard-a11y-contrast" type="checkbox"></div>' +
    '<div class="osgard-a11y-row"><div><label class="osgard-a11y-label" for="osgard-a11y-large-type">Увеличенный текст</label><small>Дополнительный размер для основного текста.</small></div><input class="osgard-a11y-check" id="osgard-a11y-large-type" type="checkbox"></div>' +
    '<div class="osgard-a11y-row"><div><label class="osgard-a11y-label" for="osgard-a11y-large-targets">Крупные зоны нажатия</label><small>Минимальная высота интерактивных элементов 44 px.</small></div><input class="osgard-a11y-check" id="osgard-a11y-large-targets" type="checkbox"></div>' +
    '<div class="osgard-a11y-actions"><button type="button" id="osgard-a11y-reset">Сбросить</button><button type="button" id="osgard-a11y-close" class="primary">Готово</button></div>' +
    '<p class="osgard-a11y-status" id="osgard-a11y-status" role="status" aria-live="polite"></p></div>';
  document.body.append(trigger, dialog);
  trigger.addEventListener('click', () => {
    lastTrigger = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    $('osgard-a11y-motion')?.focus();
  });
  $('osgard-a11y-close').addEventListener('click', () => dialog.close());
  $('osgard-a11y-reset').addEventListener('click', () => {
    state = { ...DEFAULTS }; saveAndApply(); announce('Возвращены настройки по умолчанию.');
  });
  $('osgard-a11y-motion').addEventListener('change', (event) => {
    state.motion = validMotion.has(event.target.value) ? event.target.value : 'system'; saveAndApply();
  });
  [['osgard-a11y-contrast', 'contrast'], ['osgard-a11y-large-type', 'largeType'], ['osgard-a11y-large-targets', 'largeTargets']].forEach(([id, key]) => {
    $(id).addEventListener('change', (event) => { state[key] = event.target.checked === true; saveAndApply(); });
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus(); });
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (typing || event.ctrlKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== 'a' || !event.altKey) return;
    event.preventDefault(); if (!dialog.open) trigger.click(); else dialog.close();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) { state = readState(); applyState(); }
  });
  applyState();
  window.OSGARDAccessibility = Object.freeze({ version: '1.0.0', getPreferences: () => ({ ...state }), open: () => trigger.click(), reset: () => { state = { ...DEFAULTS }; saveAndApply(); } });
})();