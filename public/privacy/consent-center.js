(() => {
  'use strict';

  // This page only updates the visitor's explicit analytics choice.
  // It deliberately does not load analytics or send any network requests.
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const QUEUE_KEY = 'osgard.games.analytics-pending.v1';
  const state = document.getElementById('consent-state');
  const message = document.getElementById('consent-message');
  const allowButton = document.getElementById('analytics-allow');
  const revokeButton = document.getElementById('analytics-revoke');

  function readConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'yes';
    } catch {
      return false;
    }
  }

  function sync(messageText) {
    const enabled = readConsent();
    if (state) {
      state.dataset.state = enabled ? 'enabled' : 'disabled';
      state.textContent = enabled ? 'Аналитика разрешена' : 'Аналитика выключена';
    }
    if (allowButton) allowButton.disabled = enabled;
    if (revokeButton) revokeButton.disabled = !enabled;
    if (message && messageText) message.textContent = messageText;
  }

  function setConsent(enabled) {
    try {
      localStorage.setItem(CONSENT_KEY, enabled ? 'yes' : 'no');
      if (!enabled) localStorage.removeItem(QUEUE_KEY);
    } catch {
      sync();
      if (state) {
        state.dataset.state = 'error';
        state.textContent = 'Не удалось сохранить выбор';
      }
      if (message) message.textContent = 'Проверьте настройки приватности браузера и попробуйте снова. Аналитика не включается без сохранённого разрешения.';
      return;
    }
    sync(enabled
      ? 'Разрешение сохранено в этом браузере. События могут отправляться только через настроенный OSGARD API и только из соответствующих страниц.'
      : 'Аналитика выключена, ожидающая локальная очередь удалена. События, уже полученные сервером до отзыва, этим действием не удаляются.');
  }

  allowButton?.addEventListener('click', () => setConsent(true));
  revokeButton?.addEventListener('click', () => setConsent(false));
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === QUEUE_KEY || event.key === null) {
      sync('Настройки обновлены. Текущее состояние показано выше.');
    }
  });

  sync();
})();
