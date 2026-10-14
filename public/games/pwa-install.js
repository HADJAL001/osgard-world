(() => {
  'use strict';

  const panel = document.getElementById('pwa-install-panel');
  const button = document.getElementById('pwa-install-button');
  const dismissButton = document.getElementById('pwa-install-dismiss');
  const status = document.getElementById('pwa-install-status');
  if (!panel || !button || !status) return;

  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const DISMISSED_KEY = 'osgard.play.install-dismissed.v1';
  const STANDALONE_KEY = 'osgard.play.standalone-event.v1';
  let deferredPrompt = null;
  let acceptedTracked = false;
  let promptShownTracked = false;
  let dismissed = false;
  let panelRevealTimer = 0;
  let serviceWorkerRegistrationStarted = false;

  function storageRead(storageName, key) {
    try {
      const storage = storageName === 'session' ? window.sessionStorage : window.localStorage;
      return storage.getItem(key) || '';
    } catch { return ''; }
  }
  function storageWrite(storageName, key, value) {
    try {
      const storage = storageName === 'session' ? window.sessionStorage : window.localStorage;
      storage.setItem(key, value);
      return true;
    } catch { return false; }
  }
  function token(bytes = 12) {
    const data = new Uint8Array(bytes);
    try { crypto.getRandomValues(data); }
    catch { for (let index = 0; index < data.length; index += 1) data[index] = Math.floor(Math.random() * 256); }
    return Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function consentGranted() {
    return storageRead('local', CONSENT_KEY) === 'yes';
  }
  function track(name) {
    if (!consentGranted()) return false;
    const queue = window.OSGARD_CONSENTED_ANALYTICS;
    if (!queue || typeof queue.enqueue !== 'function') return false;
    let sessionId = storageRead('session', 'osgard.play.analytics-session.v1');
    if (!/^session_[a-f0-9]{24}$/.test(sessionId)) {
      sessionId = 'session_' + token(12);
      storageWrite('session', 'osgard.play.analytics-session.v1', sessionId);
    }
    try {
      void queue.enqueue({
        eventId: 'evt_' + token(12),
        name,
        sessionId,
        gameId: 'unknown',
        source: 'pwa-install',
        path: location.pathname,
        durationSeconds: 0
      });
      return true;
    } catch { return false; }
  }
  function setStatus(message) { status.textContent = message; }
  function isStandalone() {
    return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
  }
  function hidePanel() {
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
  }
  function showPanel() {
    if (!dismissed && !acceptedTracked && !isStandalone()) {
      panel.hidden = false;
      panel.removeAttribute('aria-hidden');
    }
  }

  // The install surface is optional. Wait until the first paint and an idle
  // window before revealing it, avoiding a late layout shift in the first view.
  function scheduleInstallPanelReveal() {
    if (panelRevealTimer) window.clearTimeout(panelRevealTimer);
    const reveal = () => {
      panelRevealTimer = 0;
      if (dismissed || acceptedTracked || isStandalone() || !deferredPrompt) return;
      showPanel();
      if (!panel.hidden && !promptShownTracked) {
        track('pwa_install_prompt_shown');
        promptShownTracked = true;
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => {
        panelRevealTimer = window.setTimeout(reveal, 1800);
      }, { timeout: 3000 });
    } else {
      panelRevealTimer = window.setTimeout(reveal, 2500);
    }
  }
  function instructions() {
    const isAppleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent || '')
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isAppleTouch
      ? 'На iPhone или iPad открой страницу в Safari, нажми «Поделиться» и выбери «На экран “Домой”».'
      : 'Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран». Если пункта нет, этот браузер не поддерживает установку PWA.';
  }
  function alreadyDismissed() { return storageRead('local', DISMISSED_KEY) === 'yes'; }

  if (isStandalone()) {
    hidePanel();
    if (storageRead('session', STANDALONE_KEY) !== 'yes') {
      track('pwa_standalone_opened');
      storageWrite('session', STANDALONE_KEY, 'yes');
    }
  } else if (alreadyDismissed()) {
    dismissed = true;
    hidePanel();
  }

  button.addEventListener('click', async () => {
    if (!deferredPrompt) {
      setStatus(instructions());
      button.setAttribute('aria-expanded', 'true');
      return;
    }
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    button.disabled = true;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        if (!acceptedTracked) track('pwa_install_accepted');
        acceptedTracked = true;
        setStatus('Установка подтверждена браузером. Иконка появится после завершения установки.');
      } else {
        track('pwa_install_dismissed');
        setStatus('Установка отложена. Её можно повторить из меню браузера.');
        button.textContent = 'Попробовать снова ↗';
      }
    } catch {
      setStatus('Браузер не открыл установку. Используй меню браузера и пункт «Установить приложение».');
    } finally {
      button.disabled = false;
    }
  });

  dismissButton?.addEventListener('click', () => {
    dismissed = true;
    storageWrite('local', DISMISSED_KEY, 'yes');
    track('pwa_install_dismissed');
    hidePanel();
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (dismissed || acceptedTracked || isStandalone()) return;
    deferredPrompt = event;
    button.textContent = 'Установить OSGARD PLAY ↗';
    setStatus('Установка доступна в этом браузере. Сохранённый прогресс в играх по-прежнему зависит от каждой игры.');
    scheduleInstallPanelReveal();
  });

  window.addEventListener('appinstalled', () => {
    if (!acceptedTracked) track('pwa_install_accepted');
    acceptedTracked = true;
    dismissed = false;
    hidePanel();
    setStatus('OSGARD PLAY установлен.');
  });

  function registerServiceWorkerWhenIdle() {
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
    const register = () => {
      if (serviceWorkerRegistrationStarted) return;
      serviceWorkerRegistrationStarted = true;
      navigator.serviceWorker.register('/games/osgard-play-sw.js', {
        scope: '/games/',
        updateViaCache: 'none'
      }).then(registration => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: 'OSGARD_PLAY_SKIP_WAITING' });
        }
      }).catch(() => {
        setStatus('Каталог работает в браузере; автономный запуск недоступен в текущем окружении.');
      });
    };
    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(register, { timeout: 2500 });
      } else {
        window.setTimeout(register, 800);
      }
    };
    const afterLoad = () => {
      // Don't compete with the catalog's initial paint and first interaction.
      window.setTimeout(scheduleIdle, 3000);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }

  registerServiceWorkerWhenIdle();
})();