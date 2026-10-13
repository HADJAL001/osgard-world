(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#products');
  const status = $('#store-status');
  const email = $('#buyer-email');
  const terms = $('#terms-accepted');
  const refresh = $('#refresh-products');
  const consentBox = $('#analytics-consent');
  const money = (item) => {
    if (!item?.price || !Number.isFinite(Number(item.price.amountMinor)) || !item.price.currency) return '';
    const currency = String(item.price.currency).toUpperCase();
    const zeroDecimal = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
    const value = Number(item.price.amountMinor) / (zeroDecimal.has(currency) ? 1 : 100);
    try { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value); } catch { return currency + ' ' + String(item.price.amountMinor); }
  };
  const reasonLabel = (reason) => ({
    price_not_configured: 'Цена не заведена в платёжном кабинете',
    benefits_not_ready: 'Подписка закрыта: сначала нужно опубликовать преимущества',
    price_inactive: 'Цена отключена у платёжного провайдера',
    price_mode_mismatch: 'Неверный тип цены в платёжном кабинете',
    live_payments_disabled: 'Работает только тестовый режим',
    service_not_ready: 'Сервер оплаты ещё не готов',
    price_unavailable: 'Не удалось проверить цену',
  }[reason] || 'Платёжный контур не активирован');
  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
  }
  function canStart(item) {
    return item.enabled === true && /^[a-z0-9-]+$/.test(item.key);
  }
  function render(items) {
    grid.replaceChildren();
    for (const item of items) {
      const card = node('article', 'product-card');
      const kicker = node('p', 'product-kicker', item.mode === 'subscription' ? 'RECURRING / ПОДПИСКА' : 'ONE-TIME / ОДИН ПЛАТЁЖ');
      const title = node('h2', '', item.label);
      const description = node('p', 'product-description', item.description);
      const price = node('p', 'product-price', money(item) || (item.mode === 'subscription' ? 'Ежемесячная цена не настроена' : 'Цена не настроена'));
      const reason = node('p', 'product-reason', canStart(item) ? 'Цена подтверждена сервером' : reasonLabel(item.reason));
      const button = node('button', 'buy-button', canStart(item) ? 'Перейти к защищённой оплате ↗' : 'Пока недоступно');
      button.type = 'button';
      button.disabled = !canStart(item);
      button.dataset.available = String(canStart(item));
      button.addEventListener('click', () => void checkout(item));
      card.append(kicker, title, description, price, reason, button);
      grid.append(card);
    }
    if (!items.length) grid.append(node('p', 'load-state', 'Каталог сейчас недоступен. Проверьте подключение сервиса и повторите попытку.'));
  }
  async function readConfig() {
    const response = await fetch('/games/commerce-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('CONFIG_UNAVAILABLE');
    return response.json();
  }
  async function getApiBase() {
    const config = await readConfig();
    return String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '');
  }
  async function sendEvent(name) {
    let consent = false;
    try { consent = consentBox.checked && localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
    if (!consent) return;
    const sessionId = 'session_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 15))).replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      const base = await getApiBase();
      await fetch(base + '/v1/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [{ name, sessionId, gameId: 'unknown', source: 'premium-store', path: location.pathname, durationSeconds: 0 }] }),
      });
    } catch {}
  }
  async function load() {
    grid.replaceChildren(node('p', 'load-state', 'Проверяем подключение платёжного сервиса…'));
    try {
      const base = await getApiBase();
      const response = await fetch(base + '/v1/products', { cache: 'no-store' });
      if (!response.ok) throw new Error('PRODUCTS_HTTP_' + response.status);
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error('PRODUCTS_SCHEMA');
      render(result.items);
      status.textContent = result.items.some(canStart) ? 'Подключение доступно. Оплата выполняется на защищённой странице провайдера.' : 'Список продуктов загружен, но продажи пока не активированы. Суммы и доступность не подменяются демонстрационными значениями.';
      void sendEvent('premium_page_view');
    } catch {
      grid.replaceChildren(node('p', 'load-state', 'Платёжный сервер пока не подключён. Оплата недоступна до настройки API, базы заказов, реальных цен и webhook.'));
      status.textContent = 'Никакие деньги не списаны.';
    }
  }
  async function checkout(item) {
    if (!email.reportValidity() || !terms.checked) {
      if (!terms.checked) terms.focus();
      status.textContent = 'Укажите email и подтвердите условия до перехода к оплате.';
      return;
    }
    const buttons = Array.from(grid.querySelectorAll('button'));
    buttons.forEach((button) => { button.disabled = true; });
    status.textContent = 'Создаём защищённую платёжную сессию…';
    void sendEvent('checkout_started');
    try {
      const base = await getApiBase();
      const response = await fetch(base + '/v1/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: item.key, email: email.value.trim(), termsAccepted: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(result.message || result.error || 'CHECKOUT_UNAVAILABLE');
      }
      const target = new URL(result.url);
      if (target.protocol !== 'https:') throw new Error('UNSAFE_CHECKOUT_URL');
      location.assign(target.href);
    } catch (error) {
      status.textContent = 'Платёж не создан: ' + String(error.message || 'сервис временно недоступен') + '. Деньги не списаны.';
      buttons.forEach((button) => { button.disabled = button.dataset.available !== 'true'; });
    }
  }
  refresh.addEventListener('click', () => void load());
  consentBox.addEventListener('change', () => {
    try {
      if (consentBox.checked) localStorage.setItem('osgard.games.analytics-consent.v1', 'yes');
      else localStorage.setItem('osgard.games.analytics-consent.v1', 'no');
    } catch {}
  });
  try { consentBox.checked = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
  if (new URLSearchParams(location.search).get('checkout') === 'cancelled') {
    status.textContent = 'Вы отменили оплату. Ничего не списано; можно выбрать другой вариант.';
  }
  void load();
})();