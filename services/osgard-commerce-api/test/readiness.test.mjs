import test from "node:test";
import assert from "node:assert/strict";
import { buildCommercialReadiness, buildServiceReadiness } from "../src/readiness.mjs";

function readyTestInput(overrides = {}) {
  return {
    databaseConfigured: true,
    databaseReady: true,
    databaseInitFailedAtBoot: false,
    adminTokenConfigured: true,
    stripeConfigured: true,
    stripeMode: "test",
    webhookConfigured: true,
    livePaymentsOptIn: false,
    paymentsRuntimeReady: true,
    premiumEntitlementsImplemented: false,
    adNetworkIntegrated: false,
    products: [
      { key: "support-osgard", label: "Поддержать OSGARD", mode: "payment", enabled: true, reason: "available" },
      { key: "development-deposit", label: "Предоплата разработки", mode: "payment", enabled: true, reason: "available" },
      { key: "osgard-premium-monthly", label: "OSGARD PREMIUM", mode: "subscription", enabled: false, reason: "benefits_not_ready" },
    ],
    ...overrides,
  };
}
const find = (report, id) => report.checks.find((item) => item.id === id);

test("test Stripe setup is reported as test-only, never as live revenue", () => {
  const report = buildCommercialReadiness(readyTestInput());
  assert.equal(report.payments.stripeMode, "test");
  assert.equal(find(report, "one-time-checkout").status, "test_only");
  assert.match(find(report, "one-time-checkout").detail, /не live-выручка/);
  assert.equal(find(report, "premium-entitlements").status, "blocked");
  assert.equal(report.overallStatus, "blocked");
});

test("database, webhook and prices block checkout when unavailable", () => {
  const noDatabase = buildCommercialReadiness(readyTestInput({ databaseReady: false, paymentsRuntimeReady: false }));
  assert.equal(find(noDatabase, "database").status, "blocked");
  assert.equal(find(noDatabase, "lead-intake").status, "blocked");
  assert.equal(find(noDatabase, "consented-analytics").status, "blocked");
  assert.equal(find(noDatabase, "one-time-checkout").status, "blocked");
  const noWebhook = buildCommercialReadiness(readyTestInput({ webhookConfigured: false, paymentsRuntimeReady: false }));
  assert.equal(find(noWebhook, "one-time-checkout").status, "blocked");
  const noPrice = buildCommercialReadiness(readyTestInput({ products: [
    { key: "support-osgard", enabled: true, reason: "available" },
    { key: "development-deposit", enabled: false, reason: "price_not_configured" },
  ] }));
  assert.equal(find(noPrice, "one-time-checkout").status, "blocked");
  assert.equal(find(noPrice, "price-development-deposit").status, "blocked");
});

test("live Stripe mode without explicit opt-in remains blocked", () => {
  const report = buildCommercialReadiness(readyTestInput({ stripeMode: "live", livePaymentsOptIn: false, paymentsRuntimeReady: false }));
  assert.equal(find(report, "one-time-checkout").status, "blocked");
  assert.match(find(report, "one-time-checkout").detail, /выключен/);
});

test("live configuration with explicit opt-in remains marked for operator review", () => {
  const report = buildCommercialReadiness(readyTestInput({ stripeMode: "live", livePaymentsOptIn: true }));
  assert.equal(find(report, "one-time-checkout").status, "armed");
  assert.match(find(report, "one-time-checkout").detail, /ручное подтверждение релиза/);
});

test("missing services are explicit; ad network and Premium remain blocked by default", () => {
  const report = buildCommercialReadiness(readyTestInput({
    databaseConfigured: false, databaseReady: false, adminTokenConfigured: false,
    stripeConfigured: false, stripeMode: "missing", webhookConfigured: false,
    paymentsRuntimeReady: false, products: [],
  }));
  assert.equal(find(report, "database").status, "blocked");
  assert.equal(find(report, "admin-auth").status, "blocked");
  assert.equal(find(report, "ad-network").status, "not_integrated");
  assert.equal(find(report, "premium-entitlements").status, "blocked");
  assert.match(report.summary, /заблокировано/);
});

test("readiness output contains statuses and no credential values", () => {
  const report = buildCommercialReadiness(readyTestInput());
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /sk_test_|sk_live_|whsec_|postgres(ql)?:\/\/|ADMIN_API_TOKEN/);
  assert.equal(report.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(report.generatedAt)));
  assert.ok(report.checks.every((item) => typeof item.id === "string" && typeof item.detail === "string"));
});

test("sponsor inventory is not described as an integrated ad network", () => {
  const report = buildCommercialReadiness(readyTestInput());
  assert.equal(find(report, "sponsor-inventory").status, "review_required");
  assert.equal(find(report, "ad-network").status, "not_integrated");
  assert.match(find(report, "sponsor-inventory").detail, /не означает.*сеть рекламы подключена/);
});


test("server-side attribution readiness shows configuration without exposing tokens", () => {
  const missing = buildCommercialReadiness(readyTestInput({ serviceAttributionServiceCount: 0 }));
  assert.equal(find(missing, "service-attribution").status, "not_integrated");
  assert.match(find(missing, "service-attribution").detail, /OSGARD_ATTRIBUTION_TOKENS_JSON/);
  const configured = buildCommercialReadiness(readyTestInput({ serviceAttributionServiceCount: 2 }));
  assert.equal(find(configured, "service-attribution").status, "ready");
  assert.match(find(configured, "service-attribution").detail, /2 сервиса/);
  const databaseDown = buildCommercialReadiness(readyTestInput({ serviceAttributionServiceCount: 2, databaseReady: false }));
  assert.equal(find(databaseDown, "service-attribution").status, "blocked");
  assert.doesNotMatch(JSON.stringify(configured), /projects_test_attribution_token|marcosa_test_attribution_token/);
});


test("service readiness is independent of Stripe and payment flags", () => {
  const report = buildServiceReadiness({
    databaseConfigured: true,
    databaseReady: true,
    stripeConfigured: false,
    webhookConfigured: false,
    paymentsRuntimeReady: false,
    livePaymentsOptIn: false,
  });

  assert.equal(report.ready, true);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.checks.database, {
    configured: true,
    initialized: true,
    status: "ready",
  });
  assert.doesNotMatch(JSON.stringify(report), /stripe|webhook|secret|token/i);
});

test("service readiness fails closed when database is missing or schema initialization failed", () => {
  const missing = buildServiceReadiness({ databaseConfigured: false, databaseReady: false });
  assert.equal(missing.ready, false);
  assert.equal(missing.status, "not_ready");
  assert.equal(missing.checks.database.status, "blocked");

  const configuredButUnavailable = buildServiceReadiness({
    databaseConfigured: true,
    databaseReady: false,
  });
  assert.equal(configuredButUnavailable.ready, false);
  assert.equal(configuredButUnavailable.checks.database.configured, true);
  assert.equal(configuredButUnavailable.checks.database.initialized, false);
});
