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
  trigger.setAttribute('aria-label', 'Открыть настройки доступности');
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
  let fallbackOpen = false;
  let nativeModalActive = false;
  trigger.setAttribute('aria-expanded', 'false');
  function isDialogOpen() { return dialog.open === true || fallbackOpen; }
  function restoreFocus() {
    trigger.setAttribute('aria-expanded', 'false');
    dialog.removeAttribute('aria-modal');
    if (lastTrigger && typeof lastTrigger.focus === 'function' && lastTrigger.isConnected !== false) lastTrigger.focus();
    lastTrigger = null;
  }
  function openDialog() {
    if (isDialogOpen()) return;
    lastTrigger = document.activeElement || trigger;
    trigger.setAttribute('aria-expanded', 'true');
    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); nativeModalActive = true; }
      catch {
        fallbackOpen = true;
        dialog.setAttribute('open', '');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
      }
    } else {
      fallbackOpen = true;
      dialog.setAttribute('open', '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    }
    $('osgard-a11y-motion')?.focus();
  }
  function closeDialog() {
    if (!isDialogOpen()) return;
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }
    fallbackOpen = false;
    nativeModalActive = false;
    dialog.removeAttribute('open');
    restoreFocus();
  }
  trigger.addEventListener('click', openDialog);
  $('osgard-a11y-close').addEventListener('click', closeDialog);
  $('osgard-a11y-reset').addEventListener('click', () => {
    state = { ...DEFAULTS }; saveAndApply(); announce('Возвращены настройки по умолчанию.');
  });
  $('osgard-a11y-motion').addEventListener('change', (event) => {
    state.motion = validMotion.has(event.target.value) ? event.target.value : 'system'; saveAndApply();
  });
  [['osgard-a11y-contrast', 'contrast'], ['osgard-a11y-large-type', 'largeType'], ['osgard-a11y-large-targets', 'largeTargets']].forEach(([id, key]) => {
    $(id).addEventListener('change', (event) => { state[key] = event.target.checked === true; saveAndApply(); });
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => {
    fallbackOpen = false;
    nativeModalActive = false;
    restoreFocus();
  });
  document.addEventListener('keydown', (event) => {
    if (isDialogOpen() && !nativeModalActive && event.key === 'Escape') {
      event.preventDefault(); closeDialog(); return;
    }
    if (isDialogOpen() && !nativeModalActive && event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        if (typeof dialog.focus === 'function') dialog.focus();
      } else if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
      return;
    }
    const target = event.target;
    const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (typing || event.ctrlKey || event.metaKey || event.shiftKey || !event.key || event.key.toLowerCase() !== 'a' || !event.altKey) return;
    event.preventDefault();
    if (!isDialogOpen()) openDialog(); else closeDialog();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) { state = readState(); applyState(); }
  });
  applyState();
  window.OSGARDAccessibility = Object.freeze({ version: '1.0.0', getPreferences: () => ({ ...state }), open: () => trigger.click(), reset: () => { state = { ...DEFAULTS }; saveAndApply(); } });
})();