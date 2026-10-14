const PRODUCT_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CURRENCY = /^[A-Z]{3}$/;
const VALID_MODES = new Set(['payment', 'subscription']);
const VALID_INTERVALS = new Set(['day', 'week', 'month', 'year']);
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
const KNOWN_REASONS = new Set([
  'price_not_configured', 'benefits_not_ready', 'price_inactive',
  'price_mode_mismatch', 'live_payments_disabled', 'service_not_ready',
  'price_unavailable', 'available',
]);
const MAX_PRODUCTS = 40;
const MAX_JSON_CHARS = 512_000;

export class StoreClientError extends Error {
  constructor(code, message, details = {}) {
    super(String(message || code).slice(0, 240));
    this.name = 'StoreClientError';
    this.code = String(code || 'STORE_ERROR');
    this.status = Number.isInteger(details.status) ? details.status : null;
  }
}

const safeText = (value, maxLength, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\\u0000-\\u001f\\u007f]/g, ' ').replace(/\\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
};

export function validateApiBase(configuredBase, origin) {
  if (typeof configuredBase !== 'string' || typeof origin !== 'string') {
    throw new StoreClientError('CONFIG_INVALID', 'Настройки платёжного сервиса имеют неверный формат.');
  }
  const raw = configuredBase.trim();
  if (!raw) return '';
  let site;
  let parsed;
  try {
    site = new URL(origin);
    parsed = new URL(raw, site);
  } catch {
    throw new StoreClientError('CONFIG_INVALID', 'Адрес платёжного сервиса некорректен.');
  }
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new StoreClientError('CONFIG_UNSAFE', 'Адрес платёжного сервиса отклонён из соображений безопасности.');
  }
  const path = parsed.pathname.replace(/\\/+$/, '') || '/';
  const sameOrigin = parsed.origin === site.origin;
  if (sameOrigin) {
    if (path !== '/' && path !== '/commerce-api') {
      throw new StoreClientError('CONFIG_UNSAFE', 'Разрешён только корень API или собственный путь /commerce-api.');
    }
  } else if (path !== '/') {
    throw new StoreClientError('CONFIG_UNSAFE', 'Внешний платёжный API должен использовать корневой HTTPS-адрес.');
  }
  return parsed.origin + (path === '/commerce-api' ? path : '');
}

export async function requestJson(fetchImpl, url, options = {}, timeoutMs = 7000) {
  if (typeof fetchImpl !== 'function') throw new StoreClientError('FETCH_UNAVAILABLE', 'Браузер не поддерживает сетевые запросы.');
  const controller = new AbortController();
  const parentSignal = options.signal;
  let timedOut = false;
  let parentAborted = false;
  let timer = null;
  const abortFromParent = () => {
    parentAborted = true;
    controller.abort();
  };
  if (parentSignal) {
    if (parentSignal.aborted) abortFromParent();
    else parentSignal.addEventListener('abort', abortFromParent, { once: true });
  }
  if (timeoutMs > 0) timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const init = { ...options, credentials: 'omit', redirect: 'error', signal: controller.signal };
    const response = await fetchImpl(url, init);
    if (!response || typeof response.ok !== 'boolean') {
      throw new StoreClientError('HTTP_RESPONSE_INVALID', 'Платёжный сервис вернул некорректный ответ.');
    }
    let text = '';
    try { text = await response.text(); }
    catch { throw new StoreClientError('RESPONSE_READ_FAILED', 'Не удалось прочитать ответ платёжного сервиса.'); }
    if (text.length > MAX_JSON_CHARS) throw new StoreClientError('RESPONSE_TOO_LARGE', 'Ответ платёжного сервиса слишком большой.');
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new StoreClientError('RESPONSE_INVALID_JSON', 'Платёжный сервис вернул некорректные данные.'); }
    if (!response.ok) {
      const code = typeof data?.error === 'string' && /^[A-Z0-9_]{1,64}$/.test(data.error) ? data.error : 'HTTP_ERROR';
      const message = safeText(data?.message, 180, 'Запрос отклонён платёжным сервисом.');
      throw new StoreClientError(code, message, { status: response.status });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new StoreClientError('RESPONSE_SCHEMA', 'Структура ответа платёжного сервиса неверна.');
    }
    return data;
  } catch (error) {
    if (error instanceof StoreClientError) throw error;
    if (timedOut) throw new StoreClientError('REQUEST_TIMEOUT', 'Платёжный сервис не ответил вовремя.');
    if (parentAborted || parentSignal?.aborted) throw new StoreClientError('REQUEST_ABORTED', 'Запрос отменён.');
    if (controller.signal.aborted) throw new StoreClientError('REQUEST_ABORTED', 'Запрос отменён.');
    if (error?.name === 'AbortError') throw new StoreClientError('REQUEST_ABORTED', 'Запрос отменён.');
    throw new StoreClientError('NETWORK_UNAVAILABLE', 'Не удалось подключиться к платёжному сервису.');
  } finally {
    if (timer !== null) clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener('abort', abortFromParent);
  }
}

export async function resolveApiBase({ configuredBase = '', origin, fetchImpl = globalThis.fetch, signal, timeoutMs = 2500 } = {}) {
  const configured = validateApiBase(configuredBase, origin);
  if (configured) return configured;
  let health;
  try {
    health = await requestJson(fetchImpl, new URL('/commerce-api/healthz', origin).href, {
      method: 'GET', cache: 'no-store', signal,
    }, timeoutMs);
  } catch (error) {
    if (error?.code === 'REQUEST_ABORTED') throw error;
    const code = error?.code === 'REQUEST_TIMEOUT' ? 'API_TIMEOUT' : 'API_UNAVAILABLE';
    throw new StoreClientError(code, 'Commerce API не отвечает или недоступен через собственный reverse proxy.');
  }
  if (health.service !== 'osgard-commerce-api' || health.databaseReady !== true || health.ok !== true) {
    throw new StoreClientError('API_NOT_READY', 'Commerce API найден, но база данных ещё не готова. Продажи остаются закрыты.');
  }
  return new URL('/commerce-api', origin).origin + '/commerce-api';
}

function normalizePrice(price, mode) {
  if (!price || typeof price !== 'object' || Array.isArray(price)) return null;
  const amountMinor = price.amountMinor;
  const currency = typeof price.currency === 'string' ? price.currency.toUpperCase() : '';
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !CURRENCY.test(currency)) return null;
  const interval = price.interval == null ? null : String(price.interval);
  const intervalCount = price.intervalCount == null ? null : price.intervalCount;
  if (mode === 'subscription') {
    if (!VALID_INTERVALS.has(interval) || !Number.isSafeInteger(intervalCount) || intervalCount < 1 || intervalCount > 365) return null;
  } else if (interval !== null || intervalCount !== null) {
    return null;
  }
  return { amountMinor, currency, interval, intervalCount };
}

export function normalizeProducts(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Array.isArray(payload.items)) {
    throw new StoreClientError('PRODUCTS_SCHEMA', 'Каталог оплаты вернул неверную структуру.');
  }
  if (payload.items.length > MAX_PRODUCTS) throw new StoreClientError('PRODUCTS_LIMIT', 'В каталоге больше предложений, чем разрешает клиент.');
  const keys = new Set();
  const result = [];
  for (const raw of payload.items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const key = typeof raw.key === 'string' ? raw.key : '';
    if (!PRODUCT_KEY.test(key) || keys.has(key) || !VALID_MODES.has(raw.mode)) continue;
    const label = safeText(raw.label, 100, '');
    if (!label) continue;
    const price = normalizePrice(raw.price, raw.mode);
    const requestedEnabled = raw.enabled === true;
    const enabled = requestedEnabled && price !== null;
    let reason = KNOWN_REASONS.has(raw.reason) ? raw.reason : 'service_not_ready';
    if (requestedEnabled && !price) reason = 'price_unavailable';
    result.push({
      key,
      label,
      description: safeText(raw.description, 500, 'Описание предложения пока не опубликовано.'),
      mode: raw.mode,
      enabled,
      reason: enabled ? 'available' : reason,
      price,
    });
    keys.add(key);
  }
  return result;
}

export function canStartCheckout(item) {
  if (!item || item.enabled !== true || !PRODUCT_KEY.test(String(item.key || '')) ||
      !VALID_MODES.has(item.mode) || !item.price) return false;
  if (!Number.isSafeInteger(item.price.amountMinor) || item.price.amountMinor < 0 ||
      !CURRENCY.test(String(item.price.currency || ''))) return false;
  if (item.mode === 'subscription') {
    return VALID_INTERVALS.has(item.price.interval) &&
      Number.isSafeInteger(item.price.intervalCount) &&
      item.price.intervalCount >= 1 && item.price.intervalCount <= 365;
  }
  return item.price.interval == null && item.price.intervalCount == null;
}

export function formatMoney(price, locale = 'ru-RU') {
  if (!price || !Number.isSafeInteger(price.amountMinor) || price.amountMinor < 0) return '';
  const currency = typeof price.currency === 'string' ? price.currency.toUpperCase() : '';
  if (!CURRENCY.test(currency)) return '';
  const value = price.amountMinor / (ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100);
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value); }
  catch { return currency + ' ' + String(price.amountMinor); }
}

export function validateCheckoutUrl(value, allowedHosts = ['checkout.stripe.com']) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  let url;
  try { url = new URL(value); } catch { return ''; }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
      !Array.isArray(allowedHosts) || !allowedHosts.includes(url.hostname.toLowerCase())) return '';
  return url.href;
}

export function userFacingError(error) {
  const messages = {
    CONFIG_INVALID: 'Настройки платёжного сервиса имеют неверный формат.',
    CONFIG_UNSAFE: 'Адрес платёжного сервиса заблокирован проверкой безопасности.',
    API_TIMEOUT: 'Платёжный сервис не ответил вовремя. Попробуйте ещё раз.',
    API_UNAVAILABLE: 'Платёжный сервер недоступен. Проверьте подключение и повторите попытку.',
    API_NOT_READY: 'Сервис найден, но база данных ещё не готова. Продажи остаются закрыты.',
    PRODUCTS_SCHEMA: 'Сервис прислал неизвестный формат каталога. Покупки временно отключены.',
    PRODUCTS_LIMIT: 'Каталог временно превышает допустимый размер.',
    REQUEST_TIMEOUT: 'Запрос занял слишком много времени. Попробуйте ещё раз.',
    NETWORK_UNAVAILABLE: 'Не удалось подключиться к платёжному сервису.',
    REQUEST_ABORTED: 'Запрос отменён.',
    CHECKOUT_URL_BLOCKED: 'Ссылка на платёж не прошла проверку безопасности. Деньги не списаны.',
    CHECKOUT_BUSY: 'Платёжная сессия уже создаётся. Подождите завершения.',
  };
  if (error?.code && messages[error.code]) return messages[error.code];
  const message = safeText(error?.message, 180, '');
  return message || 'Операция не выполнена. Деньги не списаны.';
}
