import { createHmac, timingSafeEqual } from "node:crypto";

export const PRODUCT_DEFS = Object.freeze([
  {
    key: "support-osgard",
    label: "Поддержать OSGARD",
    description: "Разовый вклад в развитие собственных игр и платформ. Не открывает платные игровые преимущества.",
    mode: "payment",
    priceEnv: "STRIPE_PRICE_SUPPORT_OSGARD",
  },
  {
    key: "osgard-premium-monthly",
    label: "OSGARD PREMIUM",
    description: "Ежемесячная подписка. Активируйте её только после публикации точного списка преимуществ и условий отмены.",
    mode: "subscription",
    priceEnv: "STRIPE_PRICE_OSGARD_PREMIUM_MONTHLY",
  },
  {
    key: "development-deposit",
    label: "Предоплата разработки",
    description: "Предоплата за согласованный объём работ. Используйте только после отдельного письменного согласования условий.",
    mode: "payment",
    priceEnv: "STRIPE_PRICE_DEVELOPMENT_DEPOSIT",
  },
]);

export const ALLOWED_EVENTS = new Set([
  "premium_page_view",
  "catalog_viewed",
  "partners_page_viewed",
  "ecosystem_directory_viewed",
  "expedition_route_created",
  "expedition_link_opened",
  "expedition_share_intent",
  "expedition_stage_completed",
  "share_created",
  "invite_link_prepared",
  "referral_link_opened",
  "game_session_started",
  "checkout_started",
  "checkout_paid",
  "cross_promo_clicked",
  "owned_promo_impression",
  "owned_promo_intermission_skipped",
  "owned_promo_preferences_saved",
  "owned_promo_snoozed",
  "owned_promo_snooze_cleared",
  "social_share_intent",
  "social_reward_claimed",
  "referral_reward_claimed",
  "game_launched",
  "game_session_completed",
  "lead_submitted",
  "partner_inquiry",
  "sponsored_campaign_impression",
  "sponsored_campaign_clicked",
  "pwa_install_prompt_shown",
  "pwa_install_accepted",
  "pwa_install_dismissed",
  "pwa_standalone_opened",
  "product_experiment_exposed",
  "product_experiment_converted",
]);

const GAME_IDS = new Set([
  "null-shift", "time", "swarm", "inherit", "remix",
  "civic-cascade", "patina", "signal-run", "cascade-lab",
  "afterimage-run", "aether-grid", "unknown",
]);

// Public IDs only. GARD VPN is deliberately absent until its core service is verified.
export const OWNED_PROMO_SERVICE_IDS = Object.freeze([
  "marcosa", "projects", "o2-system", "senjorio", "superday",
  "myosa", "gold-glamour", "gardvpn", "osgard-business", "vanguard", "partner-studio",
]);
const OWNED_PROMO_SERVICE_ID_SET = new Set(OWNED_PROMO_SERVICE_IDS);
const OWNED_PROMO_FREQUENCIES = new Set(["each", "every3", "off"]);

export const DEFAULT_OWNED_PROMO_CONFIG = Object.freeze({
  enabled: true,
  defaultFrequency: "each",
  enabledServices: OWNED_PROMO_SERVICE_IDS,
  defaultSelectedServices: OWNED_PROMO_SERVICE_IDS,
  spotlightService: "auto",
  showShareRewards: true,
});

export function validateOwnedPromoConfig(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const enabled = input.enabled === undefined ? DEFAULT_OWNED_PROMO_CONFIG.enabled : input.enabled;
  const showShareRewards = input.showShareRewards === undefined
    ? DEFAULT_OWNED_PROMO_CONFIG.showShareRewards : input.showShareRewards;
  if (typeof enabled !== "boolean") return { ok: false, status: 400, code: "OWNED_PROMO_ENABLED_INVALID" };
  if (typeof showShareRewards !== "boolean") return { ok: false, status: 400, code: "OWNED_PROMO_REWARDS_INVALID" };

  const defaultFrequency = input.defaultFrequency === undefined
    ? DEFAULT_OWNED_PROMO_CONFIG.defaultFrequency : input.defaultFrequency;
  if (!OWNED_PROMO_FREQUENCIES.has(defaultFrequency)) {
    return { ok: false, status: 400, code: "OWNED_PROMO_FREQUENCY_INVALID" };
  }

  const readIds = (key, fallback) => {
    const value = input[key] === undefined ? fallback : input[key];
    if (!Array.isArray(value) || value.length > OWNED_PROMO_SERVICE_IDS.length) {
      return { ok: false, status: 400, code: "OWNED_PROMO_SERVICE_LIST_INVALID" };
    }
    const seen = new Set();
    for (const raw of value) {
      if (typeof raw !== "string" || !OWNED_PROMO_SERVICE_ID_SET.has(raw)) {
        return { ok: false, status: 400, code: "OWNED_PROMO_SERVICE_NOT_ALLOWED" };
      }
      if (seen.has(raw)) return { ok: false, status: 400, code: "OWNED_PROMO_SERVICE_DUPLICATED" };
      seen.add(raw);
    }
    return { ok: true, ids: [...seen] };
  };
  const enabledServices = readIds("enabledServices", DEFAULT_OWNED_PROMO_CONFIG.enabledServices);
  if (!enabledServices.ok) return enabledServices;
  const defaultSelectedServices = readIds("defaultSelectedServices", DEFAULT_OWNED_PROMO_CONFIG.defaultSelectedServices);
  if (!defaultSelectedServices.ok) return defaultSelectedServices;
  const enabledSet = new Set(enabledServices.ids);
  if (defaultSelectedServices.ids.some((id) => !enabledSet.has(id))) {
    return { ok: false, status: 400, code: "OWNED_PROMO_DEFAULT_NOT_ENABLED" };
  }

  const spotlightService = input.spotlightService === undefined
    ? DEFAULT_OWNED_PROMO_CONFIG.spotlightService : input.spotlightService;
  if (typeof spotlightService !== "string" ||
      (spotlightService !== "auto" && !OWNED_PROMO_SERVICE_ID_SET.has(spotlightService))) {
    return { ok: false, status: 400, code: "OWNED_PROMO_SPOTLIGHT_INVALID" };
  }
  if (spotlightService !== "auto" && !enabledSet.has(spotlightService)) {
    return { ok: false, status: 400, code: "OWNED_PROMO_SPOTLIGHT_NOT_ENABLED" };
  }

  return {
    ok: true,
    config: {
      enabled,
      defaultFrequency,
      enabledServices: enabledServices.ids,
      defaultSelectedServices: defaultSelectedServices.ids,
      spotlightService,
      showShareRewards,
    },
  };
}

export function cleanText(value, max = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function catalogConfiguration(env = process.env) {
  return PRODUCT_DEFS.map((item) => ({
    ...item,
    priceId: cleanText(env[item.priceEnv], 100),
  }));
}

export function isSafeEmail(value) {
  const email = cleanText(value, 254);
  return email.length >= 6 &&
    email.length <= 254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

const CHECKOUT_ATTRIBUTION_SLUG = /^[a-z0-9][a-z0-9_-]{0,47}$/;

export function normalizeCheckoutAttribution(raw) {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const gameCandidate = cleanText(input.gameId, 48).toLowerCase();
  // Do not truncate: overlong slugs must fail validation instead of becoming valid prefixes.
  const sourceCandidate = cleanText(input.source, 128).toLowerCase();
  const campaignCandidate = cleanText(input.campaign, 128).toLowerCase();
  return {
    gameId: GAME_IDS.has(gameCandidate) ? gameCandidate : "unknown",
    source: CHECKOUT_ATTRIBUTION_SLUG.test(sourceCandidate) ? sourceCandidate : "direct",
    campaign: CHECKOUT_ATTRIBUTION_SLUG.test(campaignCandidate) ? campaignCandidate : "",
  };
}

export function validateCheckoutPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const productKey = cleanText(input.productKey, 80);
  const email = cleanText(input.email, 254).toLowerCase();
  const product = PRODUCT_DEFS.find((item) => item.key === productKey);
  if (!product) return { ok: false, status: 400, code: "PRODUCT_NOT_ALLOWED" };
  if (!isSafeEmail(email)) return { ok: false, status: 400, code: "VALID_EMAIL_REQUIRED" };
  if (input.termsAccepted !== true) return { ok: false, status: 400, code: "TERMS_ACCEPTANCE_REQUIRED" };
  return { ok: true, product, productKey, email, attribution: normalizeCheckoutAttribution(input.attribution) };
}

export function validateLeadPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (cleanText(input.website, 200)) return { ok: true, bot: true };
  const projectType = cleanText(input.projectType, 120);
  const budget = cleanText(input.budget, 80);
  const contact = cleanText(input.contact, 180);
  const description = cleanText(input.description ?? input.brief, 1800);
  if (input.consent !== true) return { ok: false, status: 400, code: "DATA_PROCESSING_ACK_REQUIRED" };
  if (projectType.length < 2) return { ok: false, status: 400, code: "PROJECT_TYPE_REQUIRED" };
  if (contact.length < 3) return { ok: false, status: 400, code: "CONTACT_REQUIRED" };
  if (description.length < 10) return { ok: false, status: 400, code: "DESCRIPTION_TOO_SHORT" };
  return { ok: true, bot: false, projectType, budget, contact, description, attribution: normalizeCheckoutAttribution(input.attribution) };
}

const REFERRAL_CODE_PATTERN = /^og_[a-f0-9]{8}$/;
const REFERRAL_OWNER_TOKEN_PATTERN = /^[a-f0-9]{32}$/;

export function validateReferralRegistrationPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (input.consent !== true) return { ok: false, status: 400, code: "ANALYTICS_CONSENT_REQUIRED" };
  const referralCode = cleanText(input.referralCode, 32);
  const gameId = cleanText(input.gameId, 40);
  const ownerToken = cleanText(input.ownerToken, 64);
  if (!REFERRAL_CODE_PATTERN.test(referralCode)) return { ok: false, status: 400, code: "REFERRAL_CODE_INVALID" };
  if (!GAME_IDS.has(gameId) || gameId === "unknown") return { ok: false, status: 400, code: "GAME_ID_INVALID" };
  if (!REFERRAL_OWNER_TOKEN_PATTERN.test(ownerToken)) return { ok: false, status: 400, code: "REFERRAL_OWNER_TOKEN_INVALID" };
  return { ok: true, referralCode, gameId, ownerToken };
}

export function validateReferralClaimPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (input.consent !== true) return { ok: false, status: 400, code: "ANALYTICS_CONSENT_REQUIRED" };
  const ownerToken = cleanText(input.ownerToken, 64);
  if (!REFERRAL_OWNER_TOKEN_PATTERN.test(ownerToken)) return { ok: false, status: 400, code: "REFERRAL_OWNER_TOKEN_INVALID" };
  return { ok: true, ownerToken };
}

export function validateReferralClaimAckPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (input.consent !== true) return { ok: false, status: 400, code: "ANALYTICS_CONSENT_REQUIRED" };
  const ownerToken = cleanText(input.ownerToken, 64);
  if (!REFERRAL_OWNER_TOKEN_PATTERN.test(ownerToken)) return { ok: false, status: 400, code: "REFERRAL_OWNER_TOKEN_INVALID" };
  if (!Array.isArray(input.referralCodes) || input.referralCodes.length < 1 || input.referralCodes.length > 10) {
    return { ok: false, status: 400, code: "REFERRAL_CODES_INVALID" };
  }
  const referralCodes = [...new Set(input.referralCodes.map((value) => cleanText(value, 32)))];
  if (referralCodes.length !== input.referralCodes.length || referralCodes.some((code) => !REFERRAL_CODE_PATTERN.test(code))) {
    return { ok: false, status: 400, code: "REFERRAL_CODES_INVALID" };
  }
  return { ok: true, ownerToken, referralCodes };
}

export function validateEventBatch(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (input.consent !== true) return { ok: false, status: 400, code: "ANALYTICS_CONSENT_REQUIRED" };
  if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > 20) {
    return { ok: false, status: 400, code: "EVENT_BATCH_INVALID" };
  }
  const events = [];
  for (const value of input.events) {
    const event = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const name = cleanText(event.name, 60);
    const sessionId = cleanText(event.sessionId, 96);
    const rawEventId = event.eventId;
    const eventId = typeof rawEventId === "string" ? cleanText(rawEventId, 96) : "";
    if (rawEventId !== undefined && (!eventId || !/^[a-zA-Z0-9_-]{12,96}$/.test(eventId))) {
      return { ok: false, status: 400, code: "EVENT_ID_INVALID" };
    }
    const gameId = cleanText(event.gameId, 40) || "unknown";
    const source = cleanText(event.source, 80);
    const path = cleanText(event.path, 160);
    const durationSeconds = Number(event.durationSeconds || 0);
    if (!ALLOWED_EVENTS.has(name)) return { ok: false, status: 400, code: "EVENT_NAME_NOT_ALLOWED" };
    if (!/^[a-zA-Z0-9_-]{12,96}$/.test(sessionId)) return { ok: false, status: 400, code: "SESSION_ID_INVALID" };
    if (!GAME_IDS.has(gameId)) return { ok: false, status: 400, code: "GAME_ID_INVALID" };
    if ((name === "sponsored_campaign_impression" || name === "sponsored_campaign_clicked") && !/^sponsor-campaign:[a-zA-Z0-9_-]{8,64}$/.test(source)) {
      return { ok: false, status: 400, code: "CAMPAIGN_EVENT_SOURCE_INVALID" };
    }
    if (name === "product_experiment_exposed" || name === "product_experiment_converted") {
      const match = source.match(/^osgard-experiment:(catalog-hero-cta-v1):([ab]):(exposed|converted)$/);
      if (!match) return { ok: false, status: 400, code: "PRODUCT_EXPERIMENT_SOURCE_INVALID" };
      const expectedName = match[3] === "exposed" ? "product_experiment_exposed" : "product_experiment_converted";
      if (name !== expectedName) return { ok: false, status: 400, code: "PRODUCT_EXPERIMENT_EVENT_PHASE_INVALID" };
    }
    if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) {
      return { ok: false, status: 400, code: "DURATION_INVALID" };
    }
    events.push({
      eventId,
      name,
      sessionId,
      gameId,
      source: source || "direct",
      path: path.startsWith("/") ? path.split("?")[0].slice(0, 120) : "/",
      durationSeconds,
    });
  }
  return { ok: true, events };
}

export function paymentsModeAllowed(secretKey, enableLive = false) {
  if (typeof secretKey !== "string") return false;
  if (secretKey.startsWith("sk_test_")) return true;
  if (secretKey.startsWith("sk_live_")) return enableLive === true;
  return false;
}

export function resolveCheckoutPaymentState(paymentStatus, storedOrderStatus) {
  const status = cleanText(storedOrderStatus, 40) || "pending";
  if (status === "refunded") return { paid: false, orderStatus: "refunded", updateOrderToPaid: false };
  if (paymentStatus !== "paid") return { paid: false, orderStatus: status, updateOrderToPaid: false };
  if (status === "pending") return { paid: true, orderStatus: "paid", updateOrderToPaid: true };
  if (status === "paid") return { paid: true, orderStatus: "paid", updateOrderToPaid: false };
  // A stale Checkout success URL must not revive expired, failed or cancelled orders.
  return { paid: false, orderStatus: status, updateOrderToPaid: false };
}

export function verifyStripeSignature(rawBody, header, secret, nowMs = Date.now(), toleranceSeconds = 300) {
  if (!Buffer.isBuffer(rawBody) || typeof header !== "string" || !secret) return false;
  const pieces = header.split(",").map((part) => part.trim());
  const timestamp = pieces.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = pieces.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(Math.floor(nowMs / 1000) - ts) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(String(ts) + ".").update(rawBody).digest();
  return signatures.some((hex) => {
    if (!/^[a-f0-9]{64}$/i.test(hex)) return false;
    const actual = Buffer.from(hex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ""), "utf8");
  const b = Buffer.from(String(right ?? ""), "utf8");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}


const SERVICE_ATTRIBUTION_CONVERSION_TYPES = new Set([
  "account_created",
  "lead_qualified",
  "trial_started",
  "booking_confirmed",
  "purchase_paid",
  "purchase_refunded",
  "subscription_started",
  "subscription_renewed",
  "subscription_refunded",
  "subscription_cancelled",
]);
const SERVICE_ATTRIBUTION_MONEY_TYPES = new Set([
  "purchase_paid",
  "purchase_refunded",
  "subscription_started",
  "subscription_renewed",
  "subscription_refunded",
]);
const SERVICE_ATTRIBUTION_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const SERVICE_ATTRIBUTION_EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,120}$/;
const SERVICE_ATTRIBUTION_REFERRAL_PATTERN = /^(?:og_[a-f0-9]{8}|[a-f0-9]{12})$/;

/**
 * Validates a server-to-server conversion signal from an OSGARD ecosystem service.
 * Payloads deliberately exclude names, email addresses, phone numbers and free text.
 * Amounts are integer minor currency units and only accepted for monetary event types.
 */
export function validateServiceAttributionConversion(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (input.consent !== true) {
    return { ok: false, status: 400, code: "ATTRIBUTION_CONSENT_REQUIRED" };
  }

  const serviceId = cleanText(input.serviceId, 40).toLowerCase();
  const eventId = cleanText(input.eventId, 120);
  const conversionType = cleanText(input.conversionType, 40).toLowerCase();
  const gameId = cleanText(input.gameId, 40).toLowerCase() || "unknown";
  const source = cleanText(input.source, 60).toLowerCase() || "direct";
  const campaign = cleanText(input.campaign, 80).toLowerCase();
  const rawReferralCode = cleanText(input.referralCode, 32);
  const referralCode = rawReferralCode || null;

  if (!SERVICE_ATTRIBUTION_ID_PATTERN.test(serviceId)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_SERVICE_ID_INVALID" };
  }
  if (!SERVICE_ATTRIBUTION_EVENT_ID_PATTERN.test(eventId)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_EVENT_ID_INVALID" };
  }
  if (!SERVICE_ATTRIBUTION_CONVERSION_TYPES.has(conversionType)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_CONVERSION_TYPE_INVALID" };
  }
  if (!GAME_IDS.has(gameId)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_GAME_ID_INVALID" };
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(source)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_SOURCE_INVALID" };
  }
  if (campaign && !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(campaign)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_CAMPAIGN_INVALID" };
  }
  if (referralCode && !SERVICE_ATTRIBUTION_REFERRAL_PATTERN.test(referralCode)) {
    return { ok: false, status: 400, code: "ATTRIBUTION_REFERRAL_CODE_INVALID" };
  }

  const hasAmount = input.amountMinor !== undefined && input.amountMinor !== null;
  const rawAmount = hasAmount ? Number(input.amountMinor) : null;
  const currency = cleanText(input.currency, 3).toUpperCase();
  if (SERVICE_ATTRIBUTION_MONEY_TYPES.has(conversionType)) {
    if (!Number.isSafeInteger(rawAmount) || rawAmount < 1 || rawAmount > 1000000000000) {
      return { ok: false, status: 400, code: "ATTRIBUTION_AMOUNT_INVALID" };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { ok: false, status: 400, code: "ATTRIBUTION_CURRENCY_INVALID" };
    }
  } else if (hasAmount || currency) {
    return { ok: false, status: 400, code: "ATTRIBUTION_AMOUNT_NOT_ALLOWED" };
  }

  return {
    ok: true,
    conversion: {
      serviceId,
      eventId,
      conversionType,
      gameId,
      source,
      campaign,
      referralCode,
      amountMinor: hasAmount ? rawAmount : null,
      currency: hasAmount ? currency : null,
    },
  };
}

/** Parse the server-only JSON token map; invalid entries fail closed. */
export function parseServiceAttributionTokenMap(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return Object.create(null); }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Object.create(null);

  const tokens = Object.create(null);
  for (const [serviceId, value] of Object.entries(parsed)) {
    if (!SERVICE_ATTRIBUTION_ID_PATTERN.test(serviceId) ||
        typeof value !== "string" ||
        value.length < 32 ||
        value.length > 512 ||
        !/^[A-Za-z0-9._~+/-]+$/.test(value)) continue;
    tokens[serviceId] = value;
  }
  return tokens;
}

export function isServiceAttributionTokenValid(serviceId, suppliedToken, tokenMap) {
  const expected = tokenMap && typeof tokenMap === "object" ? tokenMap[serviceId] : "";
  return typeof expected === "string" && expected.length >= 32 && safeEqual(suppliedToken, expected);
}
