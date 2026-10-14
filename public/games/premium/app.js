import {
  canStartCheckout,
  formatMoney,
  normalizeProducts,
  requestJson,
  resolveApiBase,
  userFacingError,
  validateCheckoutUrl,
  StoreClientError,
} from './store-core.mjs';

(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#products');
  const status = $('#store-status');
  const email = $('#buyer-email');
  const terms = $('#terms-accepted');
  const refresh = $('#refresh-products');
  const consentBox = $('#analytics-consent');
  const apiStat = $('#store-stat-api');
  const apiNote = $('#store-stat-api-note');
  const productStat = $('#store-stat-products');
  const productNote = $('#store-stat-products-note');
  const updatedStat = $('#store-stat-updated');
  const updatedNote = $('#store-stat-updated-note');
  const checkoutCancelled = new URLSearchParams(location.search).get('checkout') === 'cancelled';
  let apiBaseCache = '';
  let loadSequence = 0;
  let loadController = null;
  let checkoutInProgress = false;
  let redirectingToProvider = false;

  const reasonLabel = (reason) => ({
    price_not_configured: 'Цена не заведена в платёжном кабинете',
    benefits_not_ready: 'Подписка закрыта: сначала нужно опубликовать преимущества',
    price_inactive: 'Цена отключена у платёжного провайдера',
    price_mode_mismatch: 'Неверный тип цены в платёжном кабинете',
    live_payments_disabled: 'Работает только тестовый режим',
    service_not_ready: 'Сервер оплаты ещё не готов',
    price_unavailable: 'Не удалось безопасно проверить цену',
  }[reason] || 'Платёжный контур не активирован');

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
  }

  function setStatus(message, state = 'info') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function setApiState(label, note, state = 'info') {
    apiStat.textContent = label;
    apiNote.textContent = note;
    apiStat.dataset.state = state;
  }

  function updateOverview(items = [], checkedAt = null) {
    const available = items.filter(canStartCheckout).length;
    productStat.textContent = items.length ? available + ' / ' + items.length : '—';
    productStat.dataset.state = available ? 'success' : 'warning';
    productNote.textContent = items.length
      ? (available ? 'Подтверждённые сервером предложения' : 'Все предложения закрыты до готовности продаж')
      : 'Каталог ещё не загружен';
    if (checkedAt) {
      updatedStat.textContent = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(checkedAt);
      updatedNote.textContent = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(checkedAt);
    } else {
      updatedStat.textContent = '—';
      updatedNote.textContent = 'Последняя успешная проверка';
    }
  }

  async function readConfig(signal) {
    try {
      return await requestJson(fetch, '/games/commerce-config.json', {
        method: 'GET', cache: 'no-store', signal,
      }, 3000);
    } catch (error) {
      if (error?.code === 'REQUEST_ABORTED') throw error;
      // A missing public config may still be recoverable through a verified,
      // same-origin health probe. We never fall back to /commerce-api blindly.
      return { apiBaseUrl: '' };
    }
  }

  async function getApiBase(signal) {
    if (apiBaseCache) return apiBaseCache;
    const config = await readConfig(signal);
    if (typeof config.apiBaseUrl !== 'string') {
      throw new StoreClientError('CONFIG_INVALID', 'Настройки платёжного сервиса имеют неверный формат.');
    }
    const resolved = await resolveApiBase({
      configuredBase: config.apiBaseUrl,
      origin: location.origin,
      fetchImpl: fetch,
      signal,
      timeoutMs: 2500,
    });
    apiBaseCache = resolved;
    return resolved;
  }

  const attributionGameIds = new Set([
    'null-shift', 'time', 'swarm', 'inherit', 'remix', 'aether-grid',
    'civic-cascade', 'patina', 'signal-run', 'cascade-lab', 'afterimage-run',
  ]);
  const safeSlug = value => {
    const candidate = String(value || '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(candidate) ? candidate : '';
  };
  function checkoutAttribution() {
    const query = new URLSearchParams(location.search);
    const gameCandidate = [query.get('game'), query.get('game_id'), query.get('utm_content')]
      .map(safeSlug).find(value => value && attributionGameIds.has(value)) || 'unknown';
    return {
      gameId: gameCandidate,
      source: safeSlug(query.get('utm_source') || query.get('source')) || 'direct',
      campaign: safeSlug(query.get('utm_campaign')) || '',
    };
  }

  async function sendEvent(name) {
    let consent = false;
    try { consent = consentBox.checked && localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
    if (!consent) return;
    const sessionId = 'session_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 15))).replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      const base = await getApiBase();
      await requestJson(fetch, base + '/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [{
          name, sessionId, gameId: checkoutAttribution().gameId,
          source: 'premium-store', path: location.pathname, durationSeconds: 0,
        }] }),
      }, 3000);
    } catch {}
  }

  function render(items) {
    grid.replaceChildren();
    for (const item of items) {
      const available = canStartCheckout(item);
      const card = node('article', 'product-card');
      card.dataset.productKey = item.key;
      const kicker = node('p', 'product-kicker', item.mode === 'subscription' ? 'RECURRING / ПОДПИСКА' : 'ONE-TIME / ОДИН ПЛАТЁЖ');
      const title = node('h2', '', item.label);
      const description = node('p', 'product-description', item.description);
      const price = node('p', 'product-price', formatMoney(item.price) || (item.mode === 'subscription' ? 'Ежемесячная цена не настроена' : 'Цена не настроена'));
      const reason = node('p', 'product-reason', available ? 'Цена подтверждена сервером' : reasonLabel(item.reason));
      const button = node('button', 'buy-button', available ? 'Перейти к защищённой оплате ↗' : 'Пока недоступно');
      button.type = 'button';
      button.disabled = !available;
      button.dataset.available = String(available);
      button.setAttribute('aria-label', available ? 'Купить: ' + item.label : 'Недоступно: ' + item.label);
      button.addEventListener('click', () => void checkout(item));
      card.append(kicker, title, description, price, reason, button);
      grid.append(card);
    }
    if (!items.length) {
      grid.append(node('p', 'load-state', 'Каталог не содержит доступных предложений. Продажи остаются закрыты до подтверждения серверных данных.'));
    }
    grid.setAttribute('aria-busy', 'false');
  }

  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new StoreClientError('REQUEST_ABORTED', 'Запрос отменён.'));
      const timer = setTimeout(done, ms);
      function done() {
        if (signal) signal.removeEventListener('abort', abort);
        resolve();
      }
      function abort() {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        reject(new StoreClientError('REQUEST_ABORTED', 'Запрос отменён.'));
      }
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async function fetchProducts(base, signal) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestJson(fetch, base + '/v1/products', {
          method: 'GET', cache: 'no-store', signal,
        }, 6500);
      } catch (error) {
        lastError = error;
        const retryable = ['NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT', 'HTTP_ERROR', 'CATALOG_UNAVAILABLE'].includes(error?.code);
        if (attempt !== 0 || !retryable || signal?.aborted) throw error;
        if (error?.status && error.status < 500 && error.status !== 429) throw error;
        await delay(250, signal);
      }
    }
    throw lastError || new StoreClientError('API_UNAVAILABLE', 'Каталог оплаты недоступен.');
  }

  async function load() {
    const sequence = ++loadSequence;
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    grid.replaceChildren(node('p', 'load-state', 'Проверяем подключение и серверные цены…'));
    grid.setAttribute('aria-busy', 'true');
    refresh.disabled = true;
    refresh.textContent = 'Проверяем…';
    setApiState('Проверка', 'Проверяем конфигурацию и готовность базы данных', 'info');
    setStatus('Проверяем доступность платёжного сервиса…', 'info');

    try {
      const base = await getApiBase(controller.signal);
      const payload = await fetchProducts(base, controller.signal);
      const items = normalizeProducts(payload);
      if (sequence !== loadSequence) return;
      render(items);
      const now = new Date();
      updateOverview(items, now);
      setApiState('API готов', 'Ответ и каталог получены без сохранения платёжных секретов', 'success');
      const available = items.filter(canStartCheckout).length;
      if (checkoutCancelled) {
        setStatus('Вы отменили оплату. Ничего не списано; можно проверить предложения или выбрать другой вариант.', 'warning');
      } else if (available > 0) {
        setStatus('Доступно предложений: ' + available + '. Перед переходом цена и тип покупки уже проверены сервером.', 'success');
      } else {
        setStatus('Каталог получен, но продажи закрыты: сервер не подтвердил цены и готовность платёжного контура.', 'warning');
      }
      void sendEvent('premium_page_view');
    } catch (error) {
      if (sequence !== loadSequence || error?.code === 'REQUEST_ABORTED') return;
      apiBaseCache = '';
      grid.replaceChildren(node('p', 'load-state', 'Платёжный сервис пока не готов. Покупки отключены; попробуйте обновить статус.'));
      grid.setAttribute('aria-busy', 'false');
      updateOverview([], null);
      setApiState(error?.code === 'API_NOT_READY' ? 'Не готов' : 'Нет связи', userFacingError(error), 'error');
      setStatus(userFacingError(error) + ' Никакие деньги не списаны.', 'error');
    } finally {
      if (sequence === loadSequence) {
        refresh.disabled = false;
        refresh.textContent = 'Обновить доступность';
      }
    }
  }

  async function checkout(item) {
    if (checkoutInProgress) {
      setStatus(userFacingError(new StoreClientError('CHECKOUT_BUSY')), 'warning');
      return;
    }
    if (!canStartCheckout(item)) {
      setStatus('Покупка недоступна: серверная цена или готовность платежей не подтверждена.', 'warning');
      return;
    }
    if (!email.reportValidity() || !terms.checked) {
      if (!terms.checked) terms.focus();
      setStatus('Укажите корректный email и подтвердите условия до перехода к оплате.', 'warning');
      return;
    }

    checkoutInProgress = true;
    redirectingToProvider = false;
    const buttons = Array.from(grid.querySelectorAll('button'));
    buttons.forEach(button => { button.disabled = true; });
    grid.setAttribute('aria-busy', 'true');
    setStatus('Создаём одну защищённую платёжную сессию. Не закрывайте окно…', 'info');
    void sendEvent('checkout_started');
    try {
      const base = await getApiBase();
      // Do not retry this POST: creating payment sessions is a side effect.
      const result = await requestJson(fetch, base + '/v1/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productKey: item.key,
          email: email.value.trim(),
          termsAccepted: true,
          attribution: checkoutAttribution(),
        }),
      }, 12000);
      const checkoutUrl = validateCheckoutUrl(result.url);
      if (!checkoutUrl) throw new StoreClientError('CHECKOUT_URL_BLOCKED', 'Полученная ссылка должна вести на разрешённую защищённую страницу Stripe.');
      redirectingToProvider = true;
      setStatus('Платёжная сессия создана. Открываем защищённую страницу провайдера…', 'success');
      location.assign(checkoutUrl);
    } catch (error) {
      setStatus(userFacingError(error) + ' Деньги не списаны.', 'error');
    } finally {
      if (!redirectingToProvider) {
        checkoutInProgress = false;
        grid.setAttribute('aria-busy', 'false');
        buttons.forEach(button => { button.disabled = button.dataset.available !== 'true'; });
      }
    }
  }

  refresh.addEventListener('click', () => { void load(); });
  consentBox.addEventListener('change', () => {
    try {
      if (consentBox.checked) localStorage.setItem('osgard.games.analytics-consent.v1', 'yes');
      else localStorage.setItem('osgard.games.analytics-consent.v1', 'no');
    } catch {}
  });
  try { consentBox.checked = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
  void load();
})();
