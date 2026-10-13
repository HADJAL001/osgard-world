import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  PRODUCT_DEFS,
  catalogConfiguration,
  validateCheckoutPayload,
  validateLeadPayload,
  validateEventBatch,
  paymentsModeAllowed,
  verifyStripeSignature,
  safeEqual,
} from "../src/core.mjs";

test("catalog is a fixed server-side allow-list", () => {
  assert.deepEqual(PRODUCT_DEFS.map((item) => item.key), [
    "support-osgard", "osgard-premium-monthly", "development-deposit",
  ]);
  const values = catalogConfiguration({ STRIPE_PRICE_SUPPORT_OSGARD: "price_test_123" });
  assert.equal(values[0].priceId, "price_test_123");
  assert.equal(values[1].priceId, "");
});

test("checkout accepts only known product key, email and accepted terms", () => {
  assert.equal(validateCheckoutPayload({ productKey: "made-up", email: "a@b.com", termsAccepted: true }).ok, false);
  assert.equal(validateCheckoutPayload({ productKey: "support-osgard", email: "not-an-email", termsAccepted: true }).ok, false);
  assert.equal(validateCheckoutPayload({ productKey: "support-osgard", email: "buyer@example.com" }).code, "TERMS_ACCEPTANCE_REQUIRED");
  const result = validateCheckoutPayload({ productKey: "support-osgard", email: "Buyer@example.com", termsAccepted: true });
  assert.equal(result.ok, true);
  assert.equal(result.email, "buyer@example.com");
});

test("lead endpoint requires contact, brief and acknowledgement; honeypot is silently classified", () => {
  assert.equal(validateLeadPayload({ projectType: "Игра", contact: "test@example.com", description: "Достаточно подробное описание", consent: false }).code, "DATA_PROCESSING_ACK_REQUIRED");
  assert.equal(validateLeadPayload({ projectType: "Игра", contact: "x", description: "коротко", consent: true }).ok, false);
  const good = validateLeadPayload({ projectType: "Игра", contact: "test@example.com", description: "Нужно разработать мобильную стратегию", consent: true });
  assert.equal(good.ok, true);
  assert.equal(validateLeadPayload({ website: "spam", consent: true }).bot, true);
});

test("analytics is disabled unless consent is explicit and event names are allow-listed", () => {
  const event = { name: "game_launched", sessionId: "session_123456789", gameId: "null-shift", source: "catalog", path: "/games/", durationSeconds: 0 };
  assert.equal(validateEventBatch({ consent: false, events: [event] }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name: "steal_customer_emails" }] }).ok, false);
  assert.equal(validateEventBatch({ consent: true, events: [event] }).ok, true);
});

test("live Stripe keys stay disabled unless explicitly enabled", () => {
  assert.equal(paymentsModeAllowed("sk_test_example", false), true);
  assert.equal(paymentsModeAllowed("sk_live_example", false), false);
  assert.equal(paymentsModeAllowed("sk_live_example", true), true);
  assert.equal(paymentsModeAllowed("anything", true), false);
});

test("Stripe signatures reject tampering and old timestamps", () => {
  const raw = Buffer.from('{"id":"evt_example","type":"checkout.session.completed"}');
  const secret = "whsec_test_secret";
  const seconds = 1_800_000_000;
  const digest = createHmac("sha256", secret).update(String(seconds) + ".").update(raw).digest("hex");
  const header = "t=" + seconds + ",v1=" + digest;
  assert.equal(verifyStripeSignature(raw, header, secret, seconds * 1000), true);
  assert.equal(verifyStripeSignature(Buffer.from(raw.toString() + "x"), header, secret, seconds * 1000), false);
  assert.equal(verifyStripeSignature(raw, header, secret, (seconds + 600) * 1000), false);
  assert.equal(verifyStripeSignature(raw, header, "wrong", seconds * 1000), false);
});

test("constant-time comparison fails closed for empty or unequal strings", () => {
  assert.equal(safeEqual("token-value", "token-value"), true);
  assert.equal(safeEqual("", ""), false);
  assert.equal(safeEqual("a", "ab"), false);
});
