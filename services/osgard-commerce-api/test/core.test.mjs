import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  PRODUCT_DEFS,
  OWNED_PROMO_SERVICE_IDS,
  DEFAULT_OWNED_PROMO_CONFIG,
  validateOwnedPromoConfig,
  catalogConfiguration,
  validateCheckoutPayload,
  validateLeadPayload,
  validateEventBatch,
  validateReferralRegistrationPayload,
  validateReferralClaimPayload,
  validateReferralClaimAckPayload,
  paymentsModeAllowed,
  resolveCheckoutPaymentState,
  verifyStripeSignature,
  safeEqual,
  validateServiceAttributionConversion,
  parseServiceAttributionTokenMap,
  isServiceAttributionTokenValid,
} from "../src/core.mjs";

test("owned-service promotion settings validate the public service allow-list and safe defaults", () => {
  const defaults = validateOwnedPromoConfig({});
  assert.equal(defaults.ok, true);
  assert.equal(defaults.config.enabled, true);
  assert.equal(defaults.config.defaultFrequency, "each");
  assert.deepEqual(defaults.config.enabledServices, [...OWNED_PROMO_SERVICE_IDS]);
  assert.deepEqual(defaults.config.defaultSelectedServices, [...OWNED_PROMO_SERVICE_IDS]);
  assert.equal(defaults.config.spotlightService, "auto");
  assert.equal(defaults.config.showShareRewards, true);
  assert.deepEqual([...DEFAULT_OWNED_PROMO_CONFIG.enabledServices], [...OWNED_PROMO_SERVICE_IDS]);

  const managed = validateOwnedPromoConfig({
    enabled: true,
    defaultFrequency: "every3",
    enabledServices: ["marcosa", "projects", "vanguard"],
    defaultSelectedServices: ["projects", "marcosa"],
    spotlightService: "projects",
    showShareRewards: false,
  });
  assert.equal(managed.ok, true);
  assert.equal(managed.config.defaultFrequency, "every3");
  assert.deepEqual(managed.config.enabledServices, ["marcosa", "projects", "vanguard"]);
  assert.deepEqual(managed.config.defaultSelectedServices, ["projects", "marcosa"]);
  assert.equal(managed.config.spotlightService, "projects");
  assert.equal(managed.config.showShareRewards, false);

  assert.equal(validateOwnedPromoConfig({ defaultFrequency: "hourly" }).code, "OWNED_PROMO_FREQUENCY_INVALID");
  assert.equal(validateOwnedPromoConfig({ enabled: "true" }).code, "OWNED_PROMO_ENABLED_INVALID");
  assert.equal(validateOwnedPromoConfig({ enabledServices: ["https://evil.example"] }).code, "OWNED_PROMO_SERVICE_NOT_ALLOWED");
  assert.equal(validateOwnedPromoConfig({ enabledServices: ["marcosa", "marcosa"] }).code, "OWNED_PROMO_SERVICE_DUPLICATED");
  assert.equal(validateOwnedPromoConfig({ enabledServices: ["projects"], defaultSelectedServices: ["marcosa"] }).code, "OWNED_PROMO_DEFAULT_NOT_ENABLED");
  assert.equal(validateOwnedPromoConfig({ enabledServices: ["projects"], spotlightService: "marcosa" }).code, "OWNED_PROMO_SPOTLIGHT_NOT_ENABLED");
  assert.equal(validateOwnedPromoConfig({ spotlightService: "../unexpected" }).code, "OWNED_PROMO_SPOTLIGHT_INVALID");
  assert.equal(validateOwnedPromoConfig({ showShareRewards: 1 }).code, "OWNED_PROMO_REWARDS_INVALID");
});

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

test("lead attribution is normalized and legacy submissions remain compatible", () => {
  const tracked = validateLeadPayload({
    projectType: "Игра",
    contact: "test@example.com",
    description: "Разработка браузерной стратегии",
    consent: true,
    attribution: { gameId: "AFTERIMAGE-RUN", source: "OSGARD_GAMES", campaign: "PROJECT_INTAKE" },
  });
  assert.equal(tracked.ok, true);
  assert.deepEqual(tracked.attribution, { gameId: "afterimage-run", source: "osgard_games", campaign: "project_intake" });

  const legacy = validateLeadPayload({
    projectType: "Игра", contact: "test@example.com",
    description: "Старая форма без кампаний", consent: true,
  });
  assert.deepEqual(legacy.attribution, { gameId: "unknown", source: "direct", campaign: "" });

  const hostile = validateLeadPayload({
    projectType: "Игра", contact: "test@example.com",
    description: "Некорректные метки не должны попадать в SQL", consent: true,
    attribution: { gameId: "../../bad", source: "https://evil.example/?x=1", campaign: "x".repeat(200) },
  });
  assert.deepEqual(hostile.attribution, { gameId: "unknown", source: "direct", campaign: "" });
});

test("referral registration requires consent, a known game, an invitation code and a random owner token", () => {
  const base = { consent: true, referralCode: "og_0123abcd", gameId: "swarm", ownerToken: "0123456789abcdef0123456789abcdef" };
  assert.equal(validateReferralRegistrationPayload({ ...base, consent: false }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateReferralRegistrationPayload({ ...base, referralCode: "../bad" }).code, "REFERRAL_CODE_INVALID");
  assert.equal(validateReferralRegistrationPayload({ ...base, gameId: "unknown" }).code, "GAME_ID_INVALID");
  assert.equal(validateReferralRegistrationPayload({ ...base, ownerToken: "short" }).code, "REFERRAL_OWNER_TOKEN_INVALID");
  assert.deepEqual(validateReferralRegistrationPayload(base), {
    ok: true, referralCode: "og_0123abcd", gameId: "swarm", ownerToken: "0123456789abcdef0123456789abcdef",
  });
});

test("referral reward claims require explicit consent and a high-entropy owner token", () => {
  const base = { consent: true, ownerToken: "abcdef0123456789abcdef0123456789" };
  assert.equal(validateReferralClaimPayload({ ...base, consent: false }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateReferralClaimPayload({ ...base, ownerToken: "guessable" }).code, "REFERRAL_OWNER_TOKEN_INVALID");
  assert.deepEqual(validateReferralClaimPayload(base), {
    ok: true, ownerToken: "abcdef0123456789abcdef0123456789",
  });
});

test("referral reward acknowledgement validates consent, owner token, codes and batch size", () => {
  const base = { consent: true, ownerToken: "0123456789abcdef0123456789abcdef", referralCodes: ["og_0123abcd", "og_abcd0123"] };
  assert.equal(validateReferralClaimAckPayload({ ...base, consent: false }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateReferralClaimAckPayload({ ...base, ownerToken: "guessable" }).code, "REFERRAL_OWNER_TOKEN_INVALID");
  assert.deepEqual(validateReferralClaimAckPayload(base), {
    ok: true,
    ownerToken: base.ownerToken,
    referralCodes: base.referralCodes,
  });
  assert.equal(validateReferralClaimAckPayload({ ...base, referralCodes: ["../../bad"] }).code, "REFERRAL_CODES_INVALID");
  assert.equal(validateReferralClaimAckPayload({ ...base, referralCodes: [base.referralCodes[0], base.referralCodes[0]] }).code, "REFERRAL_CODES_INVALID");
  assert.equal(validateReferralClaimAckPayload({ ...base, referralCodes: [] }).code, "REFERRAL_CODES_INVALID");
  assert.equal(validateReferralClaimAckPayload({ ...base, referralCodes: Array(11).fill("og_0123abcd") }).code, "REFERRAL_CODES_INVALID");
});

test("analytics is disabled unless consent is explicit and event names are allow-listed", () => {
  const event = { name: "game_session_started", sessionId: "session_123456789", gameId: "signal-run", source: "catalog", path: "/games/", durationSeconds: 0 };
  assert.equal(validateEventBatch({ consent: false, events: [event] }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name: "steal_customer_emails" }] }).ok, false);
  assert.equal(validateEventBatch({ consent: true, events: [event] }).ok, true);
  assert.equal(validateEventBatch({ consent: false, events: [{ ...event, name: "referral_reward_claimed" }] }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name: "referral_reward_claimed", source: "osgard-referral-qualified:1:swarm", eventId: "evt_ref_reward_123456" }] }).ok, true);
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
  ["invite_link_prepared", "game-invite:swarm:og_abcdef12"],
    ["social_reward_claimed", "osgard-social-reward:telegram:swarm"],
  ]) {
    assert.equal(validateEventBatch({ consent: true, events: [{ ...event, name, source, eventId: "evt_social_event_123456" }] }).ok, true,
      name + " should be accepted as a consented event");
    assert.equal(validateEventBatch({ consent: false, events: [{ ...event, name, source }] }).code, "ANALYTICS_CONSENT_REQUIRED",
      name + " must not bypass explicit analytics consent");
  }

  for (const name of [
    "pwa_install_prompt_shown",
    "pwa_install_accepted",
    "pwa_install_dismissed",
    "pwa_standalone_opened",
  ]) {
    const pwaEvent = { ...event, name, eventId: "evt_" + name + "_123456" };
    assert.equal(
      validateEventBatch({ consent: true, events: [pwaEvent] }).ok,
      true,
      name + " should be accepted when consent is explicit",
    );
    assert.equal(
      validateEventBatch({ consent: false, events: [pwaEvent] }).code,
      "ANALYTICS_CONSENT_REQUIRED",
      name + " must not bypass explicit analytics consent",
    );
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

  for (const name of ["expedition_route_created", "expedition_link_opened", "expedition_share_intent", "expedition_stage_completed"]) {
    const accepted = validateEventBatch({ consent: true, events: [{
      name, sessionId: "session_expedition_12345678", gameId: "signal-run",
      source: "expedition:1234abcd:stage-2", path: "/games/", durationSeconds: 0,
      eventId: "evt_expedition_123456",
    }] });
    assert.equal(accepted.ok, true, "Expedition analytics event should be allow-listed: " + name);
  }

  const ecosystem = validateEventBatch({ consent: true, events: [{ ...baseEvent, name: "ecosystem_directory_viewed", path: "/games/ecosystem/", eventId: "evt_ecosystem_1234567" }] });
  assert.equal(ecosystem.ok, true, "The ecosystem directory page view is accepted after consent");
  assert.equal(ecosystem.events[0].path, "/games/ecosystem/");

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

  const promoSnoozed = validateEventBatch({ consent: true, events: [{
    ...baseEvent, name: "owned_promo_snoozed", source: "osgard-select:snooze-24h:12",
    eventId: "evt_snooze_123456789",
  }] });
  assert.equal(promoSnoozed.ok, true, "An opt-in, consented promo-pause event should be accepted");
  assert.equal(promoSnoozed.events[0].source, "osgard-select:snooze-24h:12");

  const promoResumed = validateEventBatch({ consent: true, events: [{
    ...baseEvent, name: "owned_promo_snooze_cleared", source: "osgard-select:snooze-resume:13",
    eventId: "evt_resume_123456789",
  }] });
  assert.equal(promoResumed.ok, true, "An explicit, consented promo-resume event should be accepted");
  assert.equal(promoResumed.events[0].source, "osgard-select:snooze-resume:13");
});

test("product experiment events require consent, an allow-listed experiment, and a matching event phase", () => {
  const base = { sessionId: "session_product_exp_1234", gameId: "unknown", path: "/games/", durationSeconds: 0 };
  const exposure = { ...base, name: "product_experiment_exposed", source: "osgard-experiment:catalog-hero-cta-v1:a:exposed", eventId: "evt_product_exposed_1234" };
  const conversion = { ...base, name: "product_experiment_converted", source: "osgard-experiment:catalog-hero-cta-v1:b:converted", eventId: "evt_product_converted_1234" };
  assert.equal(validateEventBatch({ consent: true, events: [exposure] }).ok, true);
  assert.equal(validateEventBatch({ consent: true, events: [conversion] }).ok, true);
  assert.equal(validateEventBatch({ consent: false, events: [exposure] }).code, "ANALYTICS_CONSENT_REQUIRED");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...exposure, source: "osgard-experiment:invented:a:exposed" }] }).code, "PRODUCT_EXPERIMENT_SOURCE_INVALID");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...exposure, name: "product_experiment_converted" }] }).code, "PRODUCT_EXPERIMENT_EVENT_PHASE_INVALID");
  assert.equal(validateEventBatch({ consent: true, events: [{ ...conversion, source: "osgard-experiment:catalog-hero-cta-v1:c:converted" }] }).code, "PRODUCT_EXPERIMENT_SOURCE_INVALID");
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


test("server-side service conversion bridge validates consent, opaque IDs, allowed events and paid amounts", () => {
  const purchase = {
    consent: true,
    serviceId: "MARCOSA",
    eventId: "stripe_evt_20261014_000001",
    conversionType: "purchase_paid",
    gameId: "signal-run",
    source: "OSGARD_GAMES",
    campaign: "after_game",
    referralCode: "og_a1b2c3d4",
    amountMinor: 2599,
    currency: "sek",
    email: "must-not-be-returned@example.com",
  };
  const result = validateServiceAttributionConversion(purchase);
  assert.equal(result.ok, true);
  assert.deepEqual(result.conversion, {
    serviceId: "marcosa",
    eventId: "stripe_evt_20261014_000001",
    conversionType: "purchase_paid",
    gameId: "signal-run",
    source: "osgard_games",
    campaign: "after_game",
    referralCode: "og_a1b2c3d4",
    amountMinor: 2599,
    currency: "SEK",
  });
  assert.equal("email" in result.conversion, false, "Personal contact data must not be stored in conversion payloads");

  const signup = validateServiceAttributionConversion({
    consent: true, serviceId: "projects", eventId: "signup_evt_20261014_0001",
    conversionType: "account_created", source: "direct",
  });
  assert.equal(signup.ok, true);
  assert.equal(signup.conversion.gameId, "unknown");
  assert.equal(signup.conversion.amountMinor, null);
  assert.equal(signup.conversion.currency, null);

  const refund = validateServiceAttributionConversion({
    consent: true, serviceId: "marcosa", eventId: "stripe_refund_20261014_001",
    conversionType: "purchase_refunded", amountMinor: 2599, currency: "SEK",
  });
  assert.equal(refund.ok, true);
  assert.equal(refund.conversion.conversionType, "purchase_refunded");

  assert.equal(validateServiceAttributionConversion({ ...purchase, consent: false }).code, "ATTRIBUTION_CONSENT_REQUIRED");
  assert.equal(validateServiceAttributionConversion({ ...purchase, serviceId: "../marcosa" }).code, "ATTRIBUTION_SERVICE_ID_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, eventId: "x" }).code, "ATTRIBUTION_EVENT_ID_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, conversionType: "made_up" }).code, "ATTRIBUTION_CONVERSION_TYPE_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, gameId: "not-a-game" }).code, "ATTRIBUTION_GAME_ID_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, amountMinor: -100 }).code, "ATTRIBUTION_AMOUNT_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, currency: "US" }).code, "ATTRIBUTION_CURRENCY_INVALID");
  assert.equal(validateServiceAttributionConversion({ ...purchase, conversionType: "account_created", amountMinor: 100 }).code, "ATTRIBUTION_AMOUNT_NOT_ALLOWED");
  assert.equal(validateServiceAttributionConversion({ ...purchase, referralCode: "../../bad" }).code, "ATTRIBUTION_REFERRAL_CODE_INVALID");
});

test("service conversion API tokens are parsed securely and validated per service", () => {
  const projectsToken = "projects_test_attribution_token_2026_001";
  const marcosaToken = "marcosa_test_attribution_token_2026_001";
  const tokens = parseServiceAttributionTokenMap(JSON.stringify({
    projects: projectsToken,
    marcosa: marcosaToken,
    short: "tiny",
    "../escape": "invalid-service-token-that-is-long-enough-123",
    invalidChars: "not an acceptable token because of spaces",
  }));
  assert.equal(tokens.projects, projectsToken);
  assert.equal(tokens.marcosa, marcosaToken);
  assert.equal(tokens.short, undefined);
  assert.equal(tokens["../escape"], undefined);
  assert.equal(tokens.invalidChars, undefined);
  assert.equal(parseServiceAttributionTokenMap("{").projects, undefined);
  assert.equal(parseServiceAttributionTokenMap(["not", "a", "map"]).length, undefined);
  assert.equal(isServiceAttributionTokenValid("projects", projectsToken, tokens), true);
  assert.equal(isServiceAttributionTokenValid("projects", marcosaToken, tokens), false);
  assert.equal(isServiceAttributionTokenValid("unknown", projectsToken, tokens), false);
  assert.equal(isServiceAttributionTokenValid("projects", "wrong-token", tokens), false);
});
