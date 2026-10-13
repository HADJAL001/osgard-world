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
  "share_created",
  "referral_link_opened",
  "game_session_started",
  "checkout_started",
  "checkout_paid",
  "cross_promo_clicked",
  "owned_promo_impression",
  "owned_promo_intermission_skipped",
  "owned_promo_preferences_saved",
  "social_share_intent",
  "social_reward_claimed",
  "daily_play_reward_claimed",
  "referral_welcome_reward_claimed",
  "game_launched",
  "game_session_completed",
  "lead_submitted",
  "partner_inquiry",
]);

const GAME_IDS = new Set([
  "null-shift", "time", "swarm", "inherit", "remix",
  "civic-cascade", "patina", "signal-run", "unknown",
]);
GAME_IDS.add("cascade-lab");

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

export function validateCheckoutPayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const productKey = cleanText(input.productKey, 80);
  const email = cleanText(input.email, 254).toLowerCase();
  const product = PRODUCT_DEFS.find((item) => item.key === productKey);
  if (!product) return { ok: false, status: 400, code: "PRODUCT_NOT_ALLOWED" };
  if (!isSafeEmail(email)) return { ok: false, status: 400, code: "VALID_EMAIL_REQUIRED" };
  if (input.termsAccepted !== true) return { ok: false, status: 400, code: "TERMS_ACCEPTANCE_REQUIRED" };
  return { ok: true, product, productKey, email };
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
  return { ok: true, bot: false, projectType, budget, contact, description };
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
