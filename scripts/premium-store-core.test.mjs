import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  StoreClientError,
  canStartCheckout,
  formatMoney,
  normalizeProducts,
  requestJson,
  resolveApiBase,
  userFacingError,
  validateApiBase,
  validateCheckoutUrl,
} from '../public/games/premium/store-core.mjs';

const ORIGIN = 'https://osgard.world';
const payProduct = (overrides = {}) => ({
  key: 'support-once',
  label: 'Поддержать проект',
  description: 'Разовый платёж',
  mode: 'payment',
  enabled: true,
  reason: 'available',
  price: { amountMinor: 500, currency: 'EUR', interval: null, intervalCount: null },
  ...overrides,
});
const subProduct = (overrides = {}) => ({
  key: 'premium-monthly',
  label: 'Подписка',
  description: 'Ежемесячно',
  mode: 'subscription',
  enabled: true,
  reason: 'available',
  price: { amountMinor: 999, currency: 'EUR', interval: 'month', intervalCount: 1 },
  ...overrides,
});
const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json' },
});

test('API base allows only a configured HTTPS root or the same-origin commerce proxy', () => {
  assert.equal(validateApiBase('', ORIGIN), '');
  assert.equal(validateApiBase('/commerce-api', ORIGIN), ORIGIN + '/commerce-api');
  assert.equal(validateApiBase(ORIGIN + '/commerce-api/', ORIGIN), ORIGIN + '/commerce-api');
  assert.equal(validateApiBase('https://api.example.com', ORIGIN), 'https://api.example.com');
  assert.equal(validateApiBase('http://localhost:8080', ORIGIN), 'http://localhost:8080');
});

test('API base rejects insecure remote hosts, credentials, query/hash and arbitrary paths', () => {
  for (const value of [
    'http://api.example.com',
    'https://user:pass@api.example.com',
    'https://api.example.com/?token=secret',
    'https://api.example.com/#checkout',
    'https://api.example.com/v1',
    '/admin',
    'javascript:alert(1)',
  ]) {
    assert.throws(() => validateApiBase(value, ORIGIN), StoreClientError, value);
  }
});

test('blank API config discovers only a healthy same-origin API and omits credentials', async () => {
  let calledUrl = '';
  let calledInit;
  const base = await resolveApiBase({
    configuredBase: '',
    origin: ORIGIN,
    fetchImpl: async (url, init) => {
      calledUrl = url;
      calledInit = init;
      return jsonResponse({ ok: true, service: 'osgard-commerce-api', databaseReady: true });
    },
  });
  assert.equal(base, ORIGIN + '/commerce-api');
  assert.equal(calledUrl, ORIGIN + '/commerce-api/healthz');
  assert.equal(calledInit.credentials, 'omit');
  assert.equal(calledInit.redirect, 'error');
  assert.equal(calledInit.cache, 'no-store');
});

test('API discovery fails closed when the database is not ready or service identity mismatches', async () => {
  await assert.rejects(
    resolveApiBase({ configuredBase: '', origin: ORIGIN, fetchImpl: async () => jsonResponse({ ok: true, service: 'other', databaseReady: true }) }),
    error => error.code === 'API_NOT_READY',
  );
  await assert.rejects(
    resolveApiBase({ configuredBase: '', origin: ORIGIN, fetchImpl: async () => jsonResponse({ ok: true, service: 'osgard-commerce-api', databaseReady: false }) }),
    error => error.code === 'API_NOT_READY',
  );
});

test('API discovery distinguishes timeout and network failure without unsafe fallback', async () => {
  await assert.rejects(
    resolveApiBase({ configuredBase: '', origin: ORIGIN, timeoutMs: 10, fetchImpl: (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })) }),
    error => error.code === 'API_TIMEOUT',
  );
  await assert.rejects(
    resolveApiBase({ configuredBase: '', origin: ORIGIN, fetchImpl: async () => { throw new Error('offline'); } }),
    error => error.code === 'API_UNAVAILABLE',
  );
});

test('JSON requests have bounded responses and reject malformed/non-object payloads', async () => {
  assert.deepEqual(await requestJson(async () => jsonResponse({ ok: true }), ORIGIN + '/test'), { ok: true });
  await assert.rejects(
    requestJson(async () => new Response('{bad', { status: 200 }), ORIGIN + '/test'),
    error => error.code === 'RESPONSE_INVALID_JSON',
  );
  await assert.rejects(
    requestJson(async () => new Response('[]', { status: 200 }), ORIGIN + '/test'),
    error => error.code === 'RESPONSE_SCHEMA',
  );
  await assert.rejects(
    requestJson(async () => new Response('x'.repeat(512_001), { status: 200 }), ORIGIN + '/test'),
    error => error.code === 'RESPONSE_TOO_LARGE',
  );
});

test('HTTP failures surface a bounded, controlled error code and safe message', async () => {
  await assert.rejects(
    requestJson(async () => jsonResponse({ error: 'CATALOG_UNAVAILABLE', message: 'Каталог временно закрыт' }, 503), ORIGIN + '/test'),
    error => error.code === 'CATALOG_UNAVAILABLE' && error.status === 503 && error.message === 'Каталог временно закрыт',
  );
  await assert.rejects(
    requestJson(async () => jsonResponse({ error: 'inject;anything', message: 'x'.repeat(400) }, 502), ORIGIN + '/test'),
    error => error.code === 'HTTP_ERROR' && error.message.length <= 240,
  );
});

test('request timeout aborts the underlying network request', async () => {
  await assert.rejects(
    requestJson((_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })), ORIGIN + '/slow', {}, 15),
    error => error.code === 'REQUEST_TIMEOUT',
  );
});

test('caller cancellation is distinct from a timeout', async () => {
  const controller = new AbortController();
  const pending = requestJson((_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })), ORIGIN + '/cancel', { signal: controller.signal }, 1000);
  controller.abort();
  await assert.rejects(pending, error => error.code === 'REQUEST_ABORTED');
});

test('product normalization preserves trusted display text but drops malformed and duplicate identities', () => {
  const normalized = normalizeProducts({ items: [
    payProduct({ label: '<img src=x onerror=alert(1)>' }),
    payProduct({ description: 'duplicate key' }),
    subProduct(),
    payProduct({ key: 'bad key' }),
    payProduct({ key: 'unsupported-mode', mode: 'manual' }),
    null,
  ] });
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].label, '<img src=x onerror=alert(1)>');
  assert.equal(normalized[0].key, 'support-once');
  assert.equal(normalized[1].mode, 'subscription');
});

test('invalid price disables checkout even when the backend says enabled', () => {
  const normalized = normalizeProducts({ items: [
    payProduct({ key: 'bad-amount', price: { amountMinor: -1, currency: 'EUR', interval: null, intervalCount: null } }),
    payProduct({ key: 'bad-currency', price: { amountMinor: 100, currency: 'EURO', interval: null, intervalCount: null } }),
    subProduct({ key: 'bad-interval', price: { amountMinor: 999, currency: 'EUR', interval: 'decade', intervalCount: 1 } }),
  ] });
  assert.equal(normalized.length, 3);
  assert.deepEqual(normalized.map(item => item.enabled), [false, false, false]);
  assert.deepEqual(normalized.map(item => item.reason), ['price_unavailable', 'price_unavailable', 'price_unavailable']);
  assert.ok(normalized.every(item => !canStartCheckout(item)));
});

test('unknown/disabled server offers remain closed and never become purchasable due to normalization', () => {
  const normalized = normalizeProducts({ items: [
    payProduct({ enabled: false, reason: 'service_not_ready' }),
    payProduct({ key: 'missing-price', price: null }),
  ] });
  assert.equal(normalized[0].enabled, false);
  assert.equal(normalized[1].enabled, false);
  assert.ok(normalized.every(item => !canStartCheckout(item)));
});

test('catalog rejects schema mismatches, oversized collections and missing item arrays', () => {
  assert.throws(() => normalizeProducts(null), error => error.code === 'PRODUCTS_SCHEMA');
  assert.throws(() => normalizeProducts({ items: {} }), error => error.code === 'PRODUCTS_SCHEMA');
  assert.throws(() => normalizeProducts({ items: Array.from({ length: 41 }, (_, i) => payProduct({ key: 'product-' + i })) }), error => error.code === 'PRODUCTS_LIMIT');
});

test('checkout readiness requires mode, product identity, exact integer amount and a valid currency', () => {
  assert.equal(canStartCheckout(payProduct()), true);
  assert.equal(canStartCheckout(subProduct()), true);
  assert.equal(canStartCheckout(payProduct({ key: '../evil' })), false);
  assert.equal(canStartCheckout(payProduct({ enabled: 1 })), false);
  assert.equal(canStartCheckout(payProduct({ price: { amountMinor: Number.MAX_SAFE_INTEGER + 1, currency: 'EUR', interval: null, intervalCount: null } })), false);
  assert.equal(canStartCheckout(payProduct({ price: { amountMinor: 10, currency: 'EUR', interval: 'month', intervalCount: 1 } })), false);
});

test('currency formatting handles two-decimal and zero-decimal currencies and fails closed on invalid data', () => {
  assert.match(formatMoney({ amountMinor: 1234, currency: 'EUR' }), /12/);
  assert.ok(formatMoney({ amountMinor: 1200, currency: 'JPY' }).length > 0);
  assert.equal(formatMoney({ amountMinor: -1, currency: 'EUR' }), '');
  assert.equal(formatMoney({ amountMinor: 10, currency: 'EURO' }), '');
  assert.equal(formatMoney(null), '');
});

test('checkout redirect only accepts HTTPS Stripe Checkout host', () => {
  assert.match(validateCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123'), /^https:\/\/checkout\.stripe\.com\//);
  for (const value of [
    'http://checkout.stripe.com/c/pay/test',
    'https://checkout.stripe.com.evil.test/c/pay/test',
    'https://evil.example/c/pay/test',
    'https://user:pass@checkout.stripe.com/c/pay/test',
    'javascript:alert(1)',
    '/games/premium/success/',
  ]) assert.equal(validateCheckoutUrl(value), '');
});

test('user-facing error mapper has actionable Russian safe defaults', () => {
  assert.match(userFacingError(new StoreClientError('API_NOT_READY', 'private details')), /база данных ещё не готова/);
  assert.match(userFacingError(new StoreClientError('CHECKOUT_URL_BLOCKED')), /проверку безопасности/);
  assert.ok(userFacingError(new Error(' ')).length > 0);
});

test('premium page includes an accessible operations dashboard and uses module-based client logic', async () => {
  const html = await readFile(new URL('../public/games/premium/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/games/premium/app.js', import.meta.url), 'utf8');
  for (const id of ['store-stat-api', 'store-stat-api-note', 'store-stat-products', 'store-stat-products-note', 'store-stat-updated', 'store-stat-updated-note']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing dashboard metric #' + id);
    assert.ok(app.includes("#" + id), 'Client does not wire dashboard metric #' + id);
  }
  assert.ok(html.includes('aria-label="Операционный статус магазина"'));
  assert.ok(html.includes('type="module" src="/games/premium/app.js"'));
  assert.ok(app.includes('loadSequence') && app.includes('loadController?.abort()'), 'Stale refresh requests must be aborted and sequence-guarded');
  assert.ok(app.includes('checkoutInProgress') && app.includes('Do not retry this POST'), 'Checkout must serialize side-effecting session requests');
  assert.ok(app.includes('validateCheckoutUrl(result.url)'), 'Provider redirects must be allow-listed');
  assert.ok(!app.includes("config.apiBaseUrl || '/commerce-api'") && !app.includes("String(config.apiBaseUrl || '/commerce-api')"), 'Do not blindly fall back to an unverified relative API path');
  assert.ok(!app.includes('.innerHTML'), 'Untrusted product labels must not be rendered as HTML');
  assert.ok(app.includes("setStatus('Вы отменили оплату."), 'Checkout cancellation status must survive successful catalog load');
});

test('premium page and core logic map all API failure classes to a safe failure state', async () => {
  const app = await readFile(new URL('../public/games/premium/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("grid.replaceChildren(node('p', 'load-state'"), 'Failed API must render a visible fallback');
  assert.ok(app.includes("setApiState(error?.code === 'API_NOT_READY' ? 'Не готов' : 'Нет связи'"), 'Failure must update the operational status dashboard');
  assert.ok(app.includes("setStatus(userFacingError(error) + ' Никакие деньги не списаны.'"), 'Failure must never claim a payment succeeded');
  assert.ok(app.includes("void sendEvent('checkout_started')"), 'Checkout analytics trigger must remain consent-gated by sendEvent');
});
