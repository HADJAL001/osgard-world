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
  resolveCheckoutPaymentState,
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

test("checkout attribution accepts safe source context and normalizes unknown or hostile values", () => {
  const tracked = validateCheckoutPayload({
    productKey: "support-osgard",
    email: "buyer@example.com",
    termsAccepted: true,
    attribution: { gameId: "AFTERIMAGE-RUN", source: "OSGARD_GAMES", campaign: "play_with_friends" },
  });
  assert.equal(tracked.ok, true);
  assert.deepEqual(tracked.attribution, {
    gameId: "afterimage-run",
    source: "osgard_games",
    campaign: "play_with_friends",
  });
  const legacy = validateCheckoutPayload({
    productKey: "support-osgard", email: "buyer@example.com", termsAccepted: true,
  });
  assert.deepEqual(legacy.attribution, { gameId: "unknown", source: "direct", campaign: "" });
  const hostile = validateCheckoutPayload({
    productKey: "support-osgard",
    email: "buyer@example.com",
    termsAccepted: true,
    attribution: { gameId: "unknown<script>", source: "https://example.test/path", campaign: "x".repeat(500) },
  });
  assert.deepEqual(hostile.attribution, { gameId: "unknown", source: "direct", campaign: "" });
});

test("lead endpoint requires contact, brief and acknowledgement; honeypot is silently classified", () => {
  assert.equal(validateLeadPayload({ projectType: "Игра", contact: "test@example.com", description: "Достаточно подробное описание", consent: false }).code, "DATA_PROCESSING_ACK_REQUIRED");
  assert.equal(validateLeadPayload({ projectType: "Игра", contact: "x", description: "коротко", consent: true }).ok, false);
  const good = validateLeadPayload({ projectType: "Игра", contact: "test@example.com", description: "Нужно разработать мобильную стратегию", consent: true });
  assert.equal(good.ok, true);
  assert.equal(validateLeadPayload({ website: "spam", consent: true }).bot, true);
});

test("analytics is disabled unless consent is explicit and event names are allow-listed", () => {
  const event = { name: "game_session_started", sessionId: "session_123456789", gameId: "signal-run", source: "catalog", path: "/games/", durationSeconds: 0 };
  assert.equal(validateEventBatch({ consent: false, events: [event] }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name: "steal_customer_emails" }] }).ok, false);
  assert.equal(validateEventBatch({ consent: true, events: [event] }).ok, true);
  assert.equal(validateEventBatch({ consent: true, events: [{ ...event, gameId: "cascade-lab" }] }).ok, true);
  assert.equal(
    validateEventBatch({ consent: true, events: [{ ...event, gameId: "afterimage-run", name: "social_share_intent", source: "osgard-select:share:telegram", eventId: "evt_afterimage_share_123" }] }).ok,
    true,
    "AFTERIMAGE//RUN social-growth events must be accepted by the commerce analytics allow-list",
  );
  assert.equal(
    validateEventBatch({ consent: true, events: [{ ...event, name: "owned_promo_impression", source: "osgard-select:impression:marcosa", eventId: "evt_promo_impression_123" }] }).ok,
    true,
    "A genuinely visible, consented OSGARD SELECT card can be measured",
  );
  assert.equal(
    validateEventBatch({ consent: false, events: [{ ...event, name: "owned_promo_impression", eventId: "evt_promo_impression_124" }] }).code,
    "ANALYTICS_CONSENT_REQUIRED",
  );
  for (const [name, source] of [
    ["owned_promo_intermission_skipped", "osgard-select:skip:12"],
    ["owned_promo_preferences_saved", "osgard-select:preferences:each:7"],
    ["social_share_intent", "osgard-social-share:telegram:swarm"],
    ["social_reward_claimed", "osgard-social-reward:telegram:swarm"],
    ["daily_play_reward_claimed", "osgard-daily-play:signal-run"],
    ["referral_welcome_reward_claimed", "osgard-referral-welcome:og_12ab34cd"],
    ["shards_cosmetic_unlocked", "cosmetic-unlock:northstar:100"],
  ]) {
    assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name, source, eventId: "evt_social_event_123456" }] }).ok, true,
      name + " should be accepted as a consented event");
    assert.equal(validateEventBatch({ consent: false, events: [{ ...event, name, source }] }).code, "ANALYTICS_CONSENT_REQUIRED",
      name + " must not bypass explicit analytics consent");
  }
});

test("consented analytics accept stable event IDs and new page-view events, while rejecting malformed IDs", () => {
  const baseEvent = { name: "catalog_viewed", sessionId: "session_123456789", gameId: "unknown", source: "page-view", path: "/games/?campaign=private", durationSeconds: 0 };
  const first = validateEventBatch({ consent: true, events: [{ ...baseEvent, eventId: "evt_session_123456789" }] });
  assert.equal(first.ok, true);
  assert.equal(first.events[0].eventId, "evt_session_123456789");
  assert.equal(first.events[0].path, "/games/");
  const malformed = validateEventBatch({ consent: true, events: [{ ...baseEvent, eventId: "bad" }] });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, "EVENT_ID_INVALID");
  const legacy = validateEventBatch({ consent: true, events: [{ ...baseEvent, name: "partners_page_viewed" }] });
  assert.equal(legacy.ok, true, "Older clients without eventId stay backward-compatible");
  assert.equal(legacy.events[0].eventId, "");

  const inviteShared = validateEventBatch({ consent: true, events: [{
    ...baseEvent, name: "share_created", source: "game-invite:swarm:abcdef012345",
    eventId: "evt_invite_123456789",
  }] });
  assert.equal(inviteShared.ok, true, "Game invitation creation should be accepted");
  assert.equal(inviteShared.events[0].eventId, "evt_invite_123456789");

  const inviteOpened = validateEventBatch({ consent: true, events: [{
    ...baseEvent, name: "referral_link_opened", source: "referral-link:abcdef012345",
    eventId: "evt_open_123456789",
  }] });
  assert.equal(inviteOpened.ok, true, "Incoming invitation visits should be accepted");
  assert.equal(inviteOpened.events[0].name, "referral_link_opened");
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


test("checkout status cannot resurrect a refunded, expired, or cancelled order", () => {
  assert.deepEqual(resolveCheckoutPaymentState("paid", "pending"), {
    paid: true, orderStatus: "paid", updateOrderToPaid: true,
  });
  assert.deepEqual(resolveCheckoutPaymentState("paid", "paid"), {
    paid: true, orderStatus: "paid", updateOrderToPaid: false,
  });
  assert.deepEqual(resolveCheckoutPaymentState("paid", "refunded"), {
    paid: false, orderStatus: "refunded", updateOrderToPaid: false,
  });
  assert.deepEqual(resolveCheckoutPaymentState("paid", "cancelled"), {
    paid: false, orderStatus: "cancelled", updateOrderToPaid: false,
  });
  assert.deepEqual(resolveCheckoutPaymentState("unpaid", "pending"), {
    paid: false, orderStatus: "pending", updateOrderToPaid: false,
  });
});
