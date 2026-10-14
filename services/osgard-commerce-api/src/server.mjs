import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import pg from "pg";
import {
  catalogConfiguration, validateCheckoutPayload, validateLeadPayload,
  validateEventBatch, validateReferralRegistrationPayload, validateReferralClaimPayload,
  validateReferralClaimAckPayload, validateServiceAttributionConversion,
  parseServiceAttributionTokenMap, isServiceAttributionTokenValid,
  paymentsModeAllowed, resolveCheckoutPaymentState, safeEqual,
} from "./core.mjs";
import {
  campaignFromRow, normalizeCampaignId, publicCampaignView, validateCampaignPayload,
} from "./campaigns.mjs";
import { buildCommercialReadiness } from "./readiness.mjs";
import { generateGameCoachAdvice, isGameCoachConfigured } from "./game-coach.mjs";

const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT || 8080);
const requestedRetentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS);
const analyticsRetentionDays = Number.isInteger(requestedRetentionDays) && requestedRetentionDays >= 30 && requestedRetentionDays <= 365
  ? requestedRetentionDays
  : 90;
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "https://osgard.world").replace(/\/+$/, "");
const allowedOrigins = new Set(String(process.env.ALLOWED_ORIGINS || "https://osgard.world,https://www.osgard.world,http://localhost:4188,capacitor://localhost").split(",").map((v) => v.trim()).filter(Boolean));
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = /^sk_(test|live)_/.test(stripeSecret) ? new Stripe(stripeSecret) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
}) : null;
let dbReady = false;
let dbErrorAtBoot = false;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Stripe-Signature"],
  maxAge: 600,
}));
app.use("/v1/checkout", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/leads", rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/events", rateLimit({ windowMs: 5 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false }));

app.use("/v1/referrals", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/attribution", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/admin", rateLimit({ windowMs: 5 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/campaigns", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

async function ensureSchema() {
  if (!pool) return false;
  await pool.query("CREATE TABLE IF NOT EXISTS commerce_orders (order_id TEXT PRIMARY KEY, email TEXT NOT NULL, product_key TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('payment','subscription')), status TEXT NOT NULL DEFAULT 'pending', stripe_session_id TEXT UNIQUE, stripe_customer_id TEXT, stripe_payment_intent_id TEXT, stripe_subscription_id TEXT, amount_total BIGINT, currency TEXT, attribution_game_id TEXT NOT NULL DEFAULT 'unknown', attribution_source TEXT NOT NULL DEFAULT 'direct', attribution_campaign TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS attribution_game_id TEXT NOT NULL DEFAULT 'unknown';\n" +
    "ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS attribution_source TEXT NOT NULL DEFAULT 'direct';\n" +
    "ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS attribution_campaign TEXT NOT NULL DEFAULT '';\n" +
    "CREATE INDEX IF NOT EXISTS commerce_orders_status_created_idx ON commerce_orders(status, created_at DESC);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_orders_paid_attribution_idx ON commerce_orders(status, created_at DESC, attribution_game_id, attribution_source);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_orders_email_idx ON commerce_orders(email);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_stripe_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE TABLE IF NOT EXISTS commerce_leads (lead_id TEXT PRIMARY KEY, project_type TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', consent_at TIMESTAMPTZ NOT NULL, attribution_game_id TEXT NOT NULL DEFAULT 'unknown', attribution_source TEXT NOT NULL DEFAULT 'direct', attribution_campaign TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "ALTER TABLE commerce_leads ADD COLUMN IF NOT EXISTS attribution_game_id TEXT NOT NULL DEFAULT 'unknown';\n" +
    "ALTER TABLE commerce_leads ADD COLUMN IF NOT EXISTS attribution_source TEXT NOT NULL DEFAULT 'direct';\n" +
    "ALTER TABLE commerce_leads ADD COLUMN IF NOT EXISTS attribution_campaign TEXT NOT NULL DEFAULT '';\n" +
    "CREATE INDEX IF NOT EXISTS commerce_leads_created_idx ON commerce_leads(created_at DESC);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_events (event_id TEXT PRIMARY KEY, event_name TEXT NOT NULL, session_id TEXT NOT NULL, game_id TEXT NOT NULL, source TEXT NOT NULL, path TEXT NOT NULL, duration_seconds INTEGER NOT NULL DEFAULT 0, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE INDEX IF NOT EXISTS commerce_events_name_received_idx ON commerce_events(event_name, received_at DESC);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_events_game_received_idx ON commerce_events(game_id, received_at DESC);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_referral_invites (referral_code TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, game_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), qualified_session_id TEXT, qualified_at TIMESTAMPTZ, reward_claimed_at TIMESTAMPTZ, reward_amount INTEGER NOT NULL DEFAULT 50 CHECK (reward_amount >= 0));\n" +
    "CREATE INDEX IF NOT EXISTS commerce_referral_owner_claim_idx ON commerce_referral_invites(owner_hash, reward_claimed_at, created_at DESC);\n" +
    "CREATE UNIQUE INDEX IF NOT EXISTS commerce_referral_qualified_session_idx ON commerce_referral_invites(qualified_session_id) WHERE qualified_session_id IS NOT NULL;\n" +
    "CREATE TABLE IF NOT EXISTS commerce_campaigns (campaign_id TEXT PRIMARY KEY, sponsor_name TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, target_url TEXT NOT NULL, placement TEXT NOT NULL CHECK (placement IN ('catalog_feature','after_session','game_event')), sponsor_disclosure TEXT NOT NULL CHECK (sponsor_disclosure IN ('Реклама','Партнёрский материал','Спонсорский материал')), status TEXT NOT NULL CHECK (status IN ('draft','scheduled','active','paused')), starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, frequency_cap SMALLINT NOT NULL DEFAULT 3 CHECK (frequency_cap BETWEEN 1 AND 20), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE INDEX IF NOT EXISTS commerce_campaigns_public_idx ON commerce_campaigns(status, placement, starts_at, ends_at, updated_at DESC);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_attribution_conversions (service_id TEXT NOT NULL, event_id TEXT NOT NULL, conversion_type TEXT NOT NULL CHECK (conversion_type IN ('account_created','lead_qualified','trial_started','booking_confirmed','purchase_paid','purchase_refunded','subscription_started','subscription_renewed','subscription_refunded','subscription_cancelled')), game_id TEXT NOT NULL DEFAULT 'unknown', source TEXT NOT NULL DEFAULT 'direct', campaign TEXT NOT NULL DEFAULT '', referral_code TEXT, currency TEXT, amount_minor BIGINT CHECK (amount_minor IS NULL OR amount_minor > 0), received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (service_id, event_id));\n" +
    "CREATE INDEX IF NOT EXISTS commerce_attribution_received_idx ON commerce_attribution_conversions(received_at DESC, service_id);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_attribution_source_idx ON commerce_attribution_conversions(service_id, source, campaign, received_at DESC)");
  dbReady = true;
  return true;
}

async function purgeExpiredAnalytics() {
  if (!pool || !dbReady) return 0;
  const result = await pool.query(
    "DELETE FROM commerce_events WHERE received_at < NOW() - ($1 * INTERVAL '1 day')",
    [analyticsRetentionDays],
  );
  const referrals = await pool.query(
    "DELETE FROM commerce_referral_invites WHERE created_at < NOW() - ($1 * INTERVAL '1 day')",
    [analyticsRetentionDays],
  );
  const serviceConversions = await pool.query(
    "DELETE FROM commerce_attribution_conversions WHERE received_at < NOW() - INTERVAL '365 days'",
  );
  return Number(result.rowCount || 0) + Number(referrals.rowCount || 0) + Number(serviceConversions.rowCount || 0);
}

function paymentsAllowed() {
  return Boolean(stripe && pool && dbReady && webhookSecret &&
    paymentsModeAllowed(stripeSecret, process.env.ENABLE_LIVE_PAYMENTS === "true"));
}
const PREMIUM_ENTITLEMENTS_IMPLEMENTED = false; // Set true only after account entitlements, cancellation and revocation are implemented and tested.
function premiumSalesAllowed() {
  return process.env.ENABLE_OSGARD_PREMIUM_SALES === "true" && PREMIUM_ENTITLEMENTS_IMPLEMENTED;
}
function requireDatabase(res) {
  if (!pool || !dbReady) {
    res.status(503).json({ error: "DATABASE_NOT_READY", message: "Хранилище заказов временно недоступно." });
    return false;
  }
  return true;
}
function requireAdmin(req, res, next) {
  // Admin data contains order and contact details: never retain it in shared/proxy caches.
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  const configured = process.env.ADMIN_API_TOKEN || "";
  if (configured.length < 32) return res.status(503).json({ error: "ADMIN_NOT_CONFIGURED", message: "Административный доступ не настроен." });
  const header = String(req.get("authorization") || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!safeEqual(token, configured)) return res.status(401).json({ error: "UNAUTHORIZED", message: "Нужен действующий административный токен." });
  return next();
}
function expectedModeMatches(definition, price) {
  return definition.mode === "subscription" ? Boolean(price.recurring) : !price.recurring;
}
async function loadPublicProducts() {
  const result = [];
  for (const definition of catalogConfiguration(process.env)) {
    const item = { key: definition.key, label: definition.label, description: definition.description, mode: definition.mode, enabled: false, reason: "price_not_configured", price: null };
    if (definition.key === "osgard-premium-monthly" && !premiumSalesAllowed()) {
      item.reason = "benefits_not_ready";
      result.push(item);
      continue;
    }
    if (!stripe || !definition.priceId) {
      result.push(item);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(definition.priceId);
      const modeOkay = expectedModeMatches(definition, price);
      const liveOkay = paymentsModeAllowed(stripeSecret, process.env.ENABLE_LIVE_PAYMENTS === "true");
      item.price = { amountMinor: price.unit_amount, currency: price.currency, interval: price.recurring?.interval || null, intervalCount: price.recurring?.interval_count || null };
      item.enabled = Boolean(price.active && modeOkay && liveOkay && dbReady && webhookSecret);
      item.reason = !price.active ? "price_inactive" : !modeOkay ? "price_mode_mismatch" : !liveOkay ? "live_payments_disabled" : !dbReady || !webhookSecret ? "service_not_ready" : "available";
    } catch {
      item.reason = "price_unavailable";
    }
    result.push(item);
  }
  return result;
}
async function getStripePrice(definition) {
  if (!stripe || !definition.priceId) throw new Error("PRICE_NOT_CONFIGURED");
  const price = await stripe.prices.retrieve(definition.priceId);
  if (!price.active || !expectedModeMatches(definition, price)) throw new Error("PRICE_NOT_AVAILABLE");
  return price;
}

async function processStripeEvent(event) {
  if (!pool || !dbReady) throw new Error("DATABASE_NOT_READY");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query("INSERT INTO commerce_stripe_events(event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id", [event.id, event.type]);
    if (inserted.rowCount === 0) {
      await client.query("COMMIT");
      return { duplicate: true };
    }
    const object = event.data?.object || {};
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const orderId = String(object.metadata?.order_id || object.client_reference_id || "");
      const status = object.payment_status === "paid" ? "paid" : "pending";
      if (orderId) await client.query(
        "UPDATE commerce_orders SET status=CASE WHEN status='refunded' THEN status ELSE $2 END, stripe_session_id=COALESCE(stripe_session_id,$3), stripe_customer_id=COALESCE($4,stripe_customer_id), stripe_payment_intent_id=COALESCE($5,stripe_payment_intent_id), stripe_subscription_id=COALESCE($6,stripe_subscription_id), amount_total=COALESCE($7,amount_total), currency=COALESCE($8,currency), updated_at=NOW() WHERE order_id=$1",
        [orderId, status, object.id || null, typeof object.customer === "string" ? object.customer : null, typeof object.payment_intent === "string" ? object.payment_intent : null, typeof object.subscription === "string" ? object.subscription : null, object.amount_total ?? null, object.currency || null],
      );
    } else if (event.type === "checkout.session.async_payment_failed") {
      const orderId = String(object.metadata?.order_id || object.client_reference_id || "");
      if (orderId) await client.query("UPDATE commerce_orders SET status='payment_failed', updated_at=NOW() WHERE order_id=$1 AND status='pending'", [orderId]);
    } else if (event.type === "checkout.session.expired") {
      const orderId = String(object.metadata?.order_id || object.client_reference_id || "");
      if (orderId) await client.query("UPDATE commerce_orders SET status='cancelled', updated_at=NOW() WHERE order_id=$1 AND status='pending'", [orderId]);
    } else if (event.type === "charge.refunded") {
      const paymentIntent = typeof object.payment_intent === "string" ? object.payment_intent : "";
      if (paymentIntent) await client.query("UPDATE commerce_orders SET status='refunded', updated_at=NOW() WHERE stripe_payment_intent_id=$1", [paymentIntent]);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const subscription = typeof object.subscription === "string" ? object.subscription : typeof object.parent?.subscription_details?.subscription === "string" ? object.parent.subscription_details.subscription : "";
      if (subscription) await client.query("UPDATE commerce_orders SET status=$2, updated_at=NOW() WHERE stripe_subscription_id=$1", [subscription, event.type === "invoice.paid" ? "paid" : "payment_failed"]);
    } else if (event.type === "customer.subscription.deleted" && object.id) {
      await client.query("UPDATE commerce_orders SET status='subscription_cancelled', updated_at=NOW() WHERE stripe_subscription_id=$1", [object.id]);
    }
    await client.query("COMMIT");
    return { duplicate: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/healthz", (_req, res) => res.status(200).json({
  ok: true, service: "osgard-commerce-api", databaseConfigured: Boolean(pool),
  databaseReady: dbReady, stripeConfigured: Boolean(stripe), paymentsEnabled: paymentsAllowed(),
  databaseInitFailedAtBoot: dbErrorAtBoot,
}));
app.get("/readyz", (_req, res) => {
  const ready = Boolean(pool && dbReady && stripe && webhookSecret && paymentsModeAllowed(stripeSecret, process.env.ENABLE_LIVE_PAYMENTS === "true"));
  res.status(ready ? 200 : 503).json({ ready });
});
app.get("/v1/admin/readiness", requireAdmin, async (_req, res) => {
  try {
    // The existing catalog loader verifies configured Stripe prices without returning IDs or credentials.
    const products = await loadPublicProducts();
    const attributionTokens = parseServiceAttributionTokenMap(process.env.OSGARD_ATTRIBUTION_TOKENS_JSON || "");
    const stripeMode = stripeSecret.startsWith("sk_test_") ? "test" : stripeSecret.startsWith("sk_live_") ? "live" : "missing";
    return res.json(buildCommercialReadiness({
      databaseConfigured: Boolean(pool),
      databaseReady: dbReady,
      databaseInitFailedAtBoot: dbErrorAtBoot,
      adminTokenConfigured: String(process.env.ADMIN_API_TOKEN || "").length >= 32,
      stripeConfigured: Boolean(stripe),
      stripeMode,
      webhookConfigured: Boolean(webhookSecret),
      livePaymentsOptIn: process.env.ENABLE_LIVE_PAYMENTS === "true",
      paymentsRuntimeReady: paymentsAllowed(),
      premiumEntitlementsImplemented: PREMIUM_ENTITLEMENTS_IMPLEMENTED,
      adNetworkIntegrated: false,
      serviceAttributionServiceCount: Object.keys(attributionTokens).length,
      products,
    }));
  } catch (error) {
    console.error("Commercial readiness report failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "READINESS_REPORT_UNAVAILABLE", message: "Не удалось собрать статус запуска. Повторите попытку позже." });
  }
});
app.get("/v1/products", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ items: await loadPublicProducts(), currencySource: "Stripe Dashboard prices; never accepted from the browser." });
  } catch {
    res.status(503).json({ error: "CATALOG_UNAVAILABLE", message: "Каталог оплаты временно недоступен." });
  }
});

// Keep the raw body intact for Stripe SDK signature verification.
app.post("/v1/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  if (!stripe || !webhookSecret || !pool || !dbReady) return res.status(503).send("webhook_not_ready");
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get("stripe-signature") || "", webhookSecret);
  } catch {
    return res.status(400).send("invalid_signature");
  }
  try {
    await processStripeEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error?.message || "unknown error");
    return res.status(500).send("webhook_processing_failed");
  }
});

app.use(express.json({ limit: "25kb", strict: true }));

app.get("/v1/game-coach/status", (_req, res) => {
  res.set("Cache-Control", "no-store, private");
  return res.json({ enabled: isGameCoachConfigured().enabled });
});

app.post("/v1/game-coach", rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  // Input validation and the one-request consent acknowledgement happen in the
  // game-coach service. The feature has a server-side flag and never accepts
  // free-form user prompts, account data or client-supplied system instructions.
  const result = await generateGameCoachAdvice(req.body);
  if (!result.ok) {
    const message = result.code === "GAME_COACH_CONSENT_REQUIRED"
      ? "Подтверди разовое согласие на отправку краткой сводки сессии для AI-подсказки."
      : result.code === "OPENAI_GAME_COACH_NOT_CONFIGURED"
        ? "AI Coach пока не включён на сервере."
        : result.code === "OPENAI_GAME_COACH_BUSY"
          ? "AI Coach временно перегружен. Попробуй позже."
          : result.status >= 500
            ? "AI Coach временно недоступен. Игровой процесс не затронут."
            : "Проверь параметры запроса.";
    return res.status(result.status).json({ error: result.code, message });
  }
  res.set("Cache-Control", "no-store, private");
  return res.json({ advice: result.advice });
});

function campaignColumns() {
  return "campaign_id, sponsor_name, title, description, target_url, placement, status, starts_at, ends_at, frequency_cap, created_at, updated_at";
}

app.get("/v1/campaigns/active", async (req, res) => {
  const placement = String(req.query.placement || "catalog_feature").trim();
  if (!["catalog_feature", "after_session"].includes(placement)) return res.status(400).json({ error: "CAMPAIGN_PLACEMENT_NOT_INTEGRATED" });
  if (!pool || !dbReady) return res.status(503).json({ error: "CAMPAIGNS_NOT_READY" });
  try {
    const result = await pool.query(
      "SELECT " + campaignColumns().replace("status,", "CASE WHEN status = 'scheduled' AND starts_at <= NOW() AND ends_at > NOW() THEN 'active' ELSE status END AS status,") +
      " FROM commerce_campaigns WHERE placement = $1 AND status IN ('active','scheduled') " +
      "AND starts_at <= NOW() AND ends_at > NOW() AND sponsor_disclosure <> '' " +
      "ORDER BY updated_at DESC, created_at DESC LIMIT $2",
      [placement, placement === "after_session" ? 5 : 3],
    );
    const items = result.rows.map(publicCampaignView).filter(Boolean);
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=30");
    return res.json({ items, limits: { maxActiveCatalogItems: 3, maxActiveAfterSessionItems: 5, frequencyCapScope: "browser-device",
      note: "Каталог допускает до трёх кампаний, экран между сессиями — до пяти предложений на выбор. Частотный лимит действует в доступном локальном хранилище браузера, а не между устройствами." } });
  } catch (error) {
    console.error("Public campaign list failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "CAMPAIGNS_UNAVAILABLE" });
  }
});

app.get("/v1/admin/campaigns", requireAdmin, async (_req, res) => {
  if (!pool || !dbReady) return res.status(503).json({ error: "CAMPAIGNS_NOT_READY" });
  res.set("Cache-Control", "no-store, private");
  try {
    const result = await pool.query(
      "SELECT c.campaign_id, c.sponsor_name, c.title, c.description, c.target_url, " +
      "c.placement, c.sponsor_disclosure, CASE WHEN c.status = 'scheduled' AND c.starts_at <= NOW() AND c.ends_at > NOW() THEN 'active' ELSE c.status END AS status, c.starts_at, c.ends_at, " +
      "c.frequency_cap, c.created_at, c.updated_at, " +
      "COALESCE(stats.impressions_30d, 0)::int AS impressions_30d, COALESCE(stats.clicks_30d, 0)::int AS clicks_30d " +
      "FROM commerce_campaigns c LEFT JOIN (" +
      "SELECT substring(source FROM '^sponsor-campaign:([a-zA-Z0-9_-]{8,64})$') AS campaign_id, " +
      "COUNT(*) FILTER (WHERE event_name = 'sponsored_campaign_impression')::int AS impressions_30d, " +
      "COUNT(*) FILTER (WHERE event_name = 'sponsored_campaign_clicked')::int AS clicks_30d " +
      "FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days' " +
      "AND event_name IN ('sponsored_campaign_impression', 'sponsored_campaign_clicked') " +
      "AND source ~ '^sponsor-campaign:([a-zA-Z0-9_-]{8,64})$' " +
      "GROUP BY substring(source FROM '^sponsor-campaign:([a-zA-Z0-9_-]{8,64})$')" +
      ") stats ON stats.campaign_id = c.campaign_id ORDER BY c.updated_at DESC, c.created_at DESC LIMIT 200",
    );
    return res.json({ items: result.rows.map(campaignFromRow), reportingWindowDays: 30 });
  } catch (error) {
    console.error("Admin campaign list failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "CAMPAIGN_LIST_UNAVAILABLE" });
  }
});

async function saveCampaign(req, res, campaignId = "") {
  const checked = validateCampaignPayload(req.body);
  if (!checked.ok) return res.status(checked.status).json({ error: checked.code });
  if (!pool || !dbReady) return res.status(503).json({ error: "CAMPAIGNS_NOT_READY" });
  const id = campaignId || "cmp_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const data = checked.data;
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(20261014)");
    const slotLimit = data.placement === "catalog_feature" ? 3 : data.placement === "after_session" ? 5 : 0;
    if (["active", "scheduled"].includes(data.status) && slotLimit > 0) {
      const capacity = await client.query(
        "SELECT COUNT(*)::int AS count FROM commerce_campaigns " +
        "WHERE status IN ('active','scheduled') AND placement = $4 " +
        "AND starts_at < $2 AND ends_at > $1 AND campaign_id <> $3",
        [data.startsAt, data.endsAt, id, data.placement],
      );
      if (Number(capacity.rows[0]?.count || 0) >= slotLimit) {
        await client.query("ROLLBACK");
        const slotLabel = data.placement === "after_session" ? "экран между игровыми сессиями" : "слота каталога";
        return res.status(409).json({ error: "CAMPAIGN_SLOT_FULL", message: "В выбранном временном окне уже занято предельное число мест (" + slotLabel + "). Измените расписание или приостановите кампанию." });
      }
    }
    let result;
    if (campaignId) {
      result = await client.query(
        "UPDATE commerce_campaigns SET sponsor_name=$2, title=$3, description=$4, target_url=$5, " +
        "placement=$6, sponsor_disclosure=$7, status=$8, starts_at=$9, ends_at=$10, frequency_cap=$11, updated_at=NOW() " +
        "WHERE campaign_id=$1 RETURNING *",
        [id, data.sponsorName, data.title, data.description, data.targetUrl, data.placement,
          data.sponsorDisclosure, data.status, data.startsAt, data.endsAt, data.frequencyCap],
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "CAMPAIGN_NOT_FOUND" });
      }
    } else {
      result = await client.query(
        "INSERT INTO commerce_campaigns (campaign_id, sponsor_name, title, description, target_url, placement, " +
        "sponsor_disclosure, status, starts_at, ends_at, frequency_cap) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
        [id, data.sponsorName, data.title, data.description, data.targetUrl, data.placement,
          data.sponsorDisclosure, data.status, data.startsAt, data.endsAt, data.frequencyCap],
      );
    }
    await client.query("COMMIT");
    return res.status(campaignId ? 200 : 201).json({
      item: campaignFromRow(result.rows[0]),
      note: "Публичный показ возможен только для активной кампании в интегрированном слоте каталога или после игровой сессии.",
    });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => {});
    console.error("Campaign save failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "CAMPAIGN_SAVE_UNAVAILABLE" });
  } finally {
    client?.release();
  }
}

app.post("/v1/admin/campaigns", requireAdmin, (req, res) => saveCampaign(req, res));
app.post("/v1/admin/campaigns/:id", requireAdmin, (req, res) => {
  const id = normalizeCampaignId(req.params.id);
  if (!id) return res.status(400).json({ error: "CAMPAIGN_ID_INVALID" });
  return saveCampaign(req, res, id);
});

app.post("/v1/checkout/session", async (req, res) => {
  const input = validateCheckoutPayload(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (input.product.key === "osgard-premium-monthly" && !premiumSalesAllowed()) {
    return res.status(409).json({ error: "PREMIUM_NOT_READY", message: "Подписка будет доступна после публикации состава преимуществ и процесса активации." });
  }
  if (!paymentsAllowed()) return res.status(503).json({ error: "PAYMENTS_NOT_READY", message: "Оплата пока не активирована. Проверьте настройки сервера." });
  const configured = catalogConfiguration(process.env).find((item) => item.key === input.productKey);
  if (!configured?.priceId) return res.status(409).json({ error: "PRICE_NOT_CONFIGURED" });

  const orderId = crypto.randomUUID();
  try {
    const price = await getStripePrice(configured);
    await pool.query("INSERT INTO commerce_orders(order_id,email,product_key,mode,status,currency,attribution_game_id,attribution_source,attribution_campaign) VALUES($1,$2,$3,$4,'pending',$5,$6,$7,$8)", [orderId, input.email, input.productKey, input.product.mode, price.currency, input.attribution.gameId, input.attribution.source, input.attribution.campaign]);
    const session = await stripe.checkout.sessions.create({
      mode: input.product.mode,
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: input.email,
      client_reference_id: orderId,
      metadata: { order_id: orderId, product_key: input.productKey, osgard_game_id: input.attribution.gameId, osgard_source: input.attribution.source, osgard_campaign: input.attribution.campaign || "none" },
      ...(input.product.mode === "subscription" ? { subscription_data: { metadata: { order_id: orderId, product_key: input.productKey, osgard_game_id: input.attribution.gameId, osgard_source: input.attribution.source, osgard_campaign: input.attribution.campaign || "none" } } } : {}),
      success_url: PUBLIC_BASE_URL + "/games/premium/success/?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: PUBLIC_BASE_URL + "/games/premium/?checkout=cancelled",
      locale: "auto",
      allow_promotion_codes: false,
    }, { idempotencyKey: "osgard-checkout-" + orderId });
    await pool.query("UPDATE commerce_orders SET stripe_session_id=$2, updated_at=NOW() WHERE order_id=$1", [orderId, session.id]);
    return res.status(201).json({ orderId, url: session.url });
  } catch (error) {
    await pool.query("UPDATE commerce_orders SET status='checkout_error', updated_at=NOW() WHERE order_id=$1", [orderId]).catch(() => {});
    console.error("Checkout creation failed:", error?.message || "unknown error");
    return res.status(502).json({ error: "CHECKOUT_CREATION_FAILED", message: "Не удалось создать платёжную сессию. Деньги не списаны." });
  }
});

app.get("/v1/checkout/status", async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
  if (!stripe) return res.status(503).json({ error: "PAYMENTS_NOT_READY" });
  if (!requireDatabase(res)) return;
  const sessionId = String(req.query.session_id || "");
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: "SESSION_ID_INVALID" });
  try {
    const order = await pool.query("SELECT order_id, product_key, status FROM commerce_orders WHERE stripe_session_id=$1", [sessionId]);
    if (!order.rowCount) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    let storedStatus = order.rows[0].status;
    let state = resolveCheckoutPaymentState(session.payment_status, storedStatus);
    if (state.updateOrderToPaid) {
      // Compare-and-set prevents a concurrent refund/cancellation being overwritten by polling.
      const updated = await pool.query(
        "UPDATE commerce_orders SET status='paid', amount_total=$2, currency=$3, updated_at=NOW() WHERE stripe_session_id=$1 AND status='pending' RETURNING status",
        [sessionId, session.amount_total ?? null, session.currency || null],
      );
      if (updated.rowCount) storedStatus = updated.rows[0].status;
      else {
        const latest = await pool.query("SELECT status FROM commerce_orders WHERE stripe_session_id=$1", [sessionId]);
        storedStatus = latest.rows[0]?.status || storedStatus;
      }
      state = resolveCheckoutPaymentState(session.payment_status, storedStatus);
    }
    return res.json({
      orderId: order.rows[0].order_id,
      productKey: order.rows[0].product_key,
      orderStatus: state.orderStatus,
      paymentStatus: session.payment_status,
      paid: state.paid,
      amountMinor: session.amount_total ?? null,
      currency: session.currency || null,
    });
  } catch {
    return res.status(502).json({ error: "ORDER_STATUS_UNAVAILABLE", message: "Статус оплаты временно не удалось проверить." });
  }
});

app.post("/v1/leads", async (req, res) => {
  const lead = validateLeadPayload(req.body);
  if (!lead.ok) return res.status(lead.status).json({ error: lead.code });
  if (lead.bot) return res.status(202).json({ accepted: true });
  if (!requireDatabase(res)) return;
  const leadId = crypto.randomUUID();
  try {
    await pool.query("INSERT INTO commerce_leads(lead_id,project_type,budget,contact,description,consent_at,attribution_game_id,attribution_source,attribution_campaign) VALUES($1,$2,$3,$4,$5,NOW(),$6,$7,$8)", [leadId, lead.projectType, lead.budget, lead.contact, lead.description, lead.attribution.gameId, lead.attribution.source, lead.attribution.campaign]);
    return res.status(201).json({ accepted: true, leadId, message: "Заявка сохранена." });
  } catch (error) {
    console.error("Lead insert failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "LEAD_STORAGE_UNAVAILABLE", message: "Заявка не сохранена. Используйте контактный канал на сайте." });
  }
});

app.post("/v1/events", async (req, res) => {
  const batch = validateEventBatch(req.body);
  if (!batch.ok) return res.status(batch.status).json({ error: batch.code });
  if (!requireDatabase(res)) return;
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let insertedCount = 0;
      for (const event of batch.events) {
        const inserted = await client.query(
          "INSERT INTO commerce_events(event_id,event_name,session_id,game_id,source,path,duration_seconds) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING event_id",
          [event.eventId || crypto.randomUUID(), event.name, event.sessionId, event.gameId, event.source, event.path, event.durationSeconds],
        );
        insertedCount += Number(inserted.rowCount || 0);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return res.status(202).json({ accepted: batch.events.length, inserted: insertedCount });
  } catch (error) {
    console.error("Analytics insert failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "EVENT_STORAGE_UNAVAILABLE" });
  }
});

app.post("/v1/attribution/conversions", async (req, res) => {
  const checked = validateServiceAttributionConversion(req.body);
  if (!checked.ok) return res.status(checked.status).json({ error: checked.code });

  // Unique per-service tokens are server-only. Never put these tokens in a browser,
  // public website config, UTM URL, or repository. A missing mapping fails closed.
  const tokenMap = parseServiceAttributionTokenMap(process.env.OSGARD_ATTRIBUTION_TOKENS_JSON || "");
  if (!tokenMap[checked.conversion.serviceId]) {
    return res.status(503).json({ error: "ATTRIBUTION_SERVICE_NOT_CONFIGURED" });
  }
  const authorization = String(req.get("authorization") || "");
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!isServiceAttributionTokenValid(checked.conversion.serviceId, suppliedToken, tokenMap)) {
    return res.status(401).json({ error: "ATTRIBUTION_UNAUTHORIZED" });
  }
  if (!requireDatabase(res)) return;

  const event = checked.conversion;
  try {
    const result = await pool.query(
      "INSERT INTO commerce_attribution_conversions(service_id,event_id,conversion_type,game_id,source,campaign,referral_code,currency,amount_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (service_id,event_id) DO NOTHING RETURNING event_id",
      [event.serviceId, event.eventId, event.conversionType, event.gameId, event.source, event.campaign, event.referralCode, event.currency, event.amountMinor],
    );
    const inserted = Number(result.rowCount || 0) === 1;
    return res.status(inserted ? 202 : 200).json({
      accepted: true,
      inserted,
      duplicate: !inserted,
      note: "Conversion is an idempotent server-reported event, not an independent payment verification. Send paid events only after the destination service confirms settlement.",
    });
  } catch (error) {
    console.error("Service attribution insert failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "ATTRIBUTION_STORAGE_UNAVAILABLE" });
  }
});

app.post("/v1/referrals/register", async (req, res) => {
  const input = validateReferralRegistrationPayload(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (!requireDatabase(res)) return;
  const ownerHash = crypto.createHash("sha256").update(input.ownerToken, "utf8").digest("hex");
  try {
    const inserted = await pool.query(
      "INSERT INTO commerce_referral_invites(referral_code,owner_hash,game_id) VALUES($1,$2,$3) ON CONFLICT (referral_code) DO NOTHING RETURNING referral_code",
      [input.referralCode, ownerHash, input.gameId],
    );
    if (Number(inserted.rowCount || 0) > 0) {
      return res.status(201).json({ registered: true, alreadyRegistered: false });
    }
    const existing = await pool.query(
      "SELECT owner_hash, game_id FROM commerce_referral_invites WHERE referral_code=$1",
      [input.referralCode],
    );
    if (existing.rows[0]?.owner_hash === ownerHash && existing.rows[0]?.game_id === input.gameId) {
      return res.status(200).json({ registered: true, alreadyRegistered: true });
    }
    return res.status(409).json({ error: "REFERRAL_CODE_ALREADY_REGISTERED" });
  } catch (error) {
    console.error("Referral registration failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "REFERRAL_REGISTRATION_UNAVAILABLE" });
  }
});

app.post("/v1/referrals/prepare-claim", async (req, res) => {
  const input = validateReferralClaimPayload(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (!requireDatabase(res)) return;
  const ownerHash = crypto.createHash("sha256").update(input.ownerToken, "utf8").digest("hex");
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const eligible = await client.query(
      `WITH session_candidates AS (
        SELECT
          i.referral_code,
          i.game_id,
          e.session_id,
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') AS started_at,
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed') AS completed_at,
          MAX(e.duration_seconds) FILTER (WHERE e.event_name = 'game_session_completed') AS duration_seconds
        FROM commerce_referral_invites i
        JOIN commerce_events e
          ON e.game_id = i.game_id
         AND e.source = 'referral:' || i.referral_code || ':' || i.game_id
         AND e.event_name IN ('game_session_started', 'game_session_completed')
         AND e.received_at >= i.created_at
         AND e.received_at <= i.created_at + INTERVAL '7 days'
        WHERE i.owner_hash = $1
          AND i.reward_claimed_at IS NULL
          AND EXISTS (
            SELECT 1 FROM commerce_events opened
            WHERE opened.event_name = 'referral_link_opened'
              AND opened.source = 'referral-link:' || i.referral_code
              AND opened.received_at >= i.created_at - INTERVAL '5 minutes'
              AND opened.received_at <= i.created_at + INTERVAL '7 days'
          )
        GROUP BY i.referral_code, i.game_id, e.session_id
        HAVING
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') IS NOT NULL
          AND MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed') IS NOT NULL
          AND MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed')
            >= MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') + INTERVAL '30 seconds'
          AND MAX(e.duration_seconds) FILTER (WHERE e.event_name = 'game_session_completed') >= 30
      ),
      one_per_code AS (
        SELECT DISTINCT ON (candidate.referral_code)
          candidate.referral_code, candidate.game_id, candidate.session_id, candidate.completed_at
        FROM session_candidates candidate
        WHERE EXISTS (
          SELECT 1 FROM commerce_events opened
          WHERE opened.event_name = 'referral_link_opened'
            AND opened.source = 'referral-link:' || candidate.referral_code
            AND opened.received_at <= candidate.started_at
            AND opened.received_at >= candidate.started_at - INTERVAL '7 days'
        )
        ORDER BY candidate.referral_code, candidate.completed_at ASC
      )
      SELECT i.referral_code, i.reward_amount, c.session_id, c.completed_at
      FROM one_per_code c
      JOIN commerce_referral_invites i
        ON i.referral_code = c.referral_code
       AND i.owner_hash = $1
      WHERE i.reward_claimed_at IS NULL
      ORDER BY c.completed_at ASC
      LIMIT 10
      FOR UPDATE OF i SKIP LOCKED`,
      [ownerHash],
    );
    const claims = [];
    for (const row of eligible.rows) {
      const prepared = await client.query(
        `UPDATE commerce_referral_invites
         SET qualified_session_id = COALESCE(qualified_session_id, $2),
             qualified_at = COALESCE(qualified_at, $3)
         WHERE referral_code = $1 AND owner_hash = $4 AND reward_claimed_at IS NULL
         RETURNING referral_code, reward_amount`,
        [row.referral_code, row.session_id, row.completed_at, ownerHash],
      );
      const claim = prepared.rows[0];
      if (claim) claims.push({ referralCode: claim.referral_code, amount: Math.max(0, Number(claim.reward_amount || 0)) });
    }
    await client.query("COMMIT");
    return res.json({
      claims,
      rewardPerQualifiedInvite: 50,
      qualification: "A registered invite plus a recorded referral open, game start and completion. Server-received start/completion must be at least 30 seconds apart and the completed session must report at least 30 seconds of play.",
      note: "Claim preparation is retryable. The client persists receipt IDs before acknowledging; SHARDS are cosmetic and have no cash value. Event timing does not prove a unique human."
    });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => {});
    console.error("Referral reward preparation failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "REFERRAL_REWARD_UNAVAILABLE" });
  } finally {
    client?.release();
  }
});

app.post("/v1/referrals/ack", async (req, res) => {
  const input = validateReferralClaimAckPayload(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (!requireDatabase(res)) return;
  const ownerHash = crypto.createHash("sha256").update(input.ownerToken, "utf8").digest("hex");
  try {
    const acknowledged = await pool.query(
      `UPDATE commerce_referral_invites
       SET reward_claimed_at = COALESCE(reward_claimed_at, NOW())
       WHERE owner_hash = $1
         AND referral_code = ANY($2::text[])
         AND qualified_session_id IS NOT NULL
       RETURNING referral_code`,
      [ownerHash, input.referralCodes],
    );
    return res.json({
      acknowledged: Number(acknowledged.rowCount || 0),
      requested: input.referralCodes.length,
      note: "Acknowledgement is idempotent; an already acknowledged referral does not create another reward."
    });
  } catch (error) {
    console.error("Referral reward acknowledgement failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "REFERRAL_REWARD_ACK_UNAVAILABLE" });
  }
});

app.post("/v1/referrals/claim", async (req, res) => {
  const input = validateReferralClaimPayload(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (!requireDatabase(res)) return;
  const ownerHash = crypto.createHash("sha256").update(input.ownerToken, "utf8").digest("hex");
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const eligible = await client.query(
      `WITH session_candidates AS (
        SELECT
          i.referral_code,
          i.game_id,
          e.session_id,
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') AS started_at,
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed') AS completed_at,
          MAX(e.duration_seconds) FILTER (WHERE e.event_name = 'game_session_completed') AS duration_seconds
        FROM commerce_referral_invites i
        JOIN commerce_events e
          ON e.game_id = i.game_id
         AND e.source = 'referral:' || i.referral_code || ':' || i.game_id
         AND e.event_name IN ('game_session_started', 'game_session_completed')
         AND e.received_at >= i.created_at
         AND e.received_at <= i.created_at + INTERVAL '7 days'
        WHERE i.owner_hash = $1
          AND i.reward_claimed_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM commerce_events opened
            WHERE opened.event_name = 'referral_link_opened'
              AND opened.source = 'referral-link:' || i.referral_code
              AND opened.received_at >= i.created_at - INTERVAL '5 minutes'
              AND opened.received_at <= i.created_at + INTERVAL '7 days'
          )
        GROUP BY i.referral_code, i.game_id, e.session_id
        HAVING
          MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') IS NOT NULL
          AND MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed') IS NOT NULL
          AND MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_completed')
            >= MIN(e.received_at) FILTER (WHERE e.event_name = 'game_session_started') + INTERVAL '30 seconds'
          AND MAX(e.duration_seconds) FILTER (WHERE e.event_name = 'game_session_completed') >= 30
      ),
      one_per_code AS (
        SELECT DISTINCT ON (candidate.referral_code)
          candidate.referral_code, candidate.game_id, candidate.session_id, candidate.completed_at
        FROM session_candidates candidate
        WHERE EXISTS (
          SELECT 1
          FROM commerce_events opened
          WHERE opened.event_name = 'referral_link_opened'
            AND opened.source = 'referral-link:' || candidate.referral_code
            AND opened.received_at <= candidate.started_at
            AND opened.received_at >= candidate.started_at - INTERVAL '7 days'
        )
        ORDER BY candidate.referral_code, candidate.completed_at ASC
      )
      SELECT i.referral_code, i.reward_amount, c.session_id, c.completed_at
      FROM one_per_code c
      JOIN commerce_referral_invites i
        ON i.referral_code = c.referral_code
       AND i.owner_hash = $1
      WHERE i.reward_claimed_at IS NULL
      ORDER BY c.completed_at ASC
      LIMIT 10
      FOR UPDATE OF i SKIP LOCKED`,
      [ownerHash],
    );
    let claimedInvites = 0;
    let shardsAwarded = 0;
    for (const row of eligible.rows) {
      const claimed = await client.query(
        `UPDATE commerce_referral_invites
         SET qualified_session_id = $2, qualified_at = $3, reward_claimed_at = NOW()
         WHERE referral_code = $1 AND owner_hash = $4 AND reward_claimed_at IS NULL
         RETURNING reward_amount`,
        [row.referral_code, row.session_id, row.completed_at, ownerHash],
      );
      if (Number(claimed.rowCount || 0) > 0) {
        claimedInvites += 1;
        shardsAwarded += Math.max(0, Number(claimed.rows[0]?.reward_amount || 0));
      }
    }
    await client.query("COMMIT");
    return res.json({
      claimedInvites,
      shardsAwarded,
      rewardPerQualifiedInvite: 50,
      qualification: "A registered invite plus a recorded referral open, game start and completion. Server-received start/completion must be at least 30 seconds apart and the completed session must report at least 30 seconds of play.",
      note: "SHARDS are cosmetic, stored locally and have no cash value. Event timing helps prevent repeated claims but does not prove a unique human or defeat all fabricated client events.",
    });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => {});
    console.error("Referral reward claim failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "REFERRAL_REWARD_UNAVAILABLE" });
  } finally {
    client?.release();
  }
});

app.get("/v1/admin/overview", requireAdmin, async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const [orderStats, currencyStats, leadStats, leadAttributionStats, eventStats, topEvents, analyticsByGame, ownedPromoByService, ownedPromoVariantStats, productExperimentStats, analyticsFunnel, socialShareByNetwork, paidRevenueByAttribution, referralRewardStats, serviceConversionStats] = await Promise.all([
      pool.query("SELECT status, COUNT(*)::int AS count FROM commerce_orders GROUP BY status"),
      pool.query("SELECT currency, SUM(amount_total)::bigint AS total_minor, COUNT(*)::int AS count FROM commerce_orders WHERE status='paid' AND currency IS NOT NULL GROUP BY currency"),
      pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='new')::int AS new FROM commerce_leads"),
      pool.query("SELECT attribution_game_id AS \"gameId\", attribution_source AS source, NULLIF(attribution_campaign, '') AS campaign, COUNT(*)::int AS leads, COUNT(*) FILTER (WHERE status='new')::int AS new FROM commerce_leads WHERE created_at >= NOW() - INTERVAL '90 days' GROUP BY attribution_game_id, attribution_source, attribution_campaign ORDER BY leads DESC, source ASC LIMIT 50"),
      pool.query("SELECT COUNT(*)::int AS total_30d FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days'"),
      pool.query("SELECT event_name, COUNT(*)::int AS count FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days' GROUP BY event_name ORDER BY count DESC LIMIT 12"),
      pool.query("SELECT game_id AS \"gameId\", COUNT(*)::int AS events, COUNT(DISTINCT session_id)::int AS sessions, COUNT(*) FILTER (WHERE event_name IN ('game_session_started','game_launched'))::int AS starts, COUNT(*) FILTER (WHERE event_name='game_session_completed')::int AS completions, COALESCE(ROUND(AVG(duration_seconds) FILTER (WHERE event_name='game_session_completed' AND duration_seconds > 0))::int,0) AS \"avgCompletionSeconds\", COUNT(*) FILTER (WHERE event_name='cross_promo_clicked')::int AS \"crossPromoClicks\" FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days' GROUP BY game_id ORDER BY starts DESC, events DESC LIMIT 20"),
      pool.query(`
        SELECT
          split_part(source, ':', 3) AS "serviceId",
          game_id AS "gameId",
          COUNT(*) FILTER (
            WHERE event_name = 'owned_promo_impression'
              AND (
                source ~ '^osgard-select:spotlight:[a-z0-9-]{1,40}:[abc]$'
                OR source ~ '^osgard-select:impression:[a-z0-9-]{1,40}$'
              )
          )::int AS impressions,
          COUNT(*) FILTER (
            WHERE event_name = 'cross_promo_clicked'
              AND source ~ '^osgard-select:click:[a-z0-9-]{1,40}(:[abc])?$'
          )::int AS clicks
        FROM commerce_events
        WHERE received_at >= NOW() - INTERVAL '30 days'
          AND (
            (event_name = 'owned_promo_impression' AND (
              source ~ '^osgard-select:spotlight:[a-z0-9-]{1,40}:[abc]$'
              OR source ~ '^osgard-select:impression:[a-z0-9-]{1,40}$'
            ))
            OR
            (event_name = 'cross_promo_clicked' AND source ~ '^osgard-select:click:[a-z0-9-]{1,40}(:[abc])?$')
          )
        GROUP BY split_part(source, ':', 3), game_id
        ORDER BY impressions DESC, clicks DESC, "serviceId" ASC
        LIMIT 50
      `),
      pool.query(`
        SELECT
          split_part(source, ':', 4) AS variant,
          COUNT(*) FILTER (WHERE event_name = 'owned_promo_impression')::int AS impressions,
          COUNT(*) FILTER (WHERE event_name = 'cross_promo_clicked')::int AS clicks
        FROM commerce_events
        WHERE received_at >= NOW() - INTERVAL '30 days'
          AND source ~ '^osgard-select:(spotlight|click):[a-z0-9-]{1,40}:[abc]$'
          AND event_name IN ('owned_promo_impression', 'cross_promo_clicked')
        GROUP BY split_part(source, ':', 4)
        ORDER BY variant ASC
      `),
      pool.query(`
        WITH experiment_sessions AS (
          SELECT split_part(source, ':', 2) AS "experimentId",
                 split_part(source, ':', 3) AS variant,
                 session_id,
                 BOOL_OR(event_name = 'product_experiment_exposed') AS exposed,
                 BOOL_OR(event_name = 'product_experiment_converted') AS converted
          FROM commerce_events
          WHERE received_at >= NOW() - INTERVAL '30 days'
            AND source ~ '^osgard-experiment:catalog-hero-cta-v1:[ab]:(exposed|converted)$'
            AND event_name IN ('product_experiment_exposed', 'product_experiment_converted')
          GROUP BY split_part(source, ':', 2), split_part(source, ':', 3), session_id
        )
        SELECT "experimentId", variant,
               COUNT(*) FILTER (WHERE exposed)::int AS exposures,
               COUNT(*) FILTER (WHERE exposed AND converted)::int AS conversions
        FROM experiment_sessions WHERE exposed
        GROUP BY "experimentId", variant ORDER BY "experimentId", variant
      `),
      pool.query(`
        WITH recent_events AS (
          SELECT event_name, source
          FROM commerce_events
          WHERE received_at >= NOW() - INTERVAL '30 days'
        ),
        invite_shares AS (
          SELECT DISTINCT split_part(source, ':', 3) AS invite_code
          FROM recent_events
          WHERE event_name IN ('invite_link_prepared', 'share_created')
            AND source LIKE 'game-invite:%'
            AND split_part(source, ':', 3) ~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'
        ),
        invite_opens AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'referral_link_opened'
            AND source LIKE 'referral-link:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'
        ),
        invite_starts AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'game_session_started'
            AND source LIKE 'referral:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'
        ),
        invite_completions AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'game_session_completed'
            AND source LIKE 'referral:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|[a-f0-9]{12})$'
        )
        SELECT
          COUNT(*) FILTER (WHERE event_name = 'catalog_viewed')::int AS "catalogViews",
          COUNT(*) FILTER (WHERE event_name IN ('game_launched', 'game_session_started'))::int AS "gameStarts",
          COUNT(*) FILTER (WHERE event_name = 'game_session_completed')::int AS "completedSessions",
          COUNT(*) FILTER (WHERE event_name = 'cross_promo_clicked')::int AS "crossPromoClicks",
          COUNT(*) FILTER (WHERE event_name = 'lead_submitted')::int AS "leadSubmittedEvents",
          COUNT(*) FILTER (WHERE event_name = 'premium_page_view')::int AS "premiumPageViews",
          COUNT(*) FILTER (WHERE event_name = 'partners_page_viewed')::int AS "partnersPageViews",
          COUNT(*) FILTER (WHERE event_name = 'social_share_intent')::int AS "socialShareIntents",
          COUNT(*) FILTER (WHERE event_name = 'social_reward_claimed')::int AS "socialRewardClaims",
          COUNT(*) FILTER (WHERE event_name = 'owned_promo_snoozed' AND source ~ '^osgard-select:snooze-24h:[0-9]{1,10}$')::int AS "ownedPromoSnoozes",
          COUNT(*) FILTER (WHERE event_name = 'owned_promo_snooze_cleared' AND source ~ '^osgard-select:snooze-resume:[0-9]{1,10}$')::int AS "ownedPromoSnoozeClears",
          (SELECT COUNT(*) FROM invite_shares)::int AS "inviteShares",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_opens o USING (invite_code))::int AS "referralOpens",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_starts r USING (invite_code))::int AS "referredStarts",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_completions c USING (invite_code))::int AS "referredCompletions",
          COUNT(*) FILTER (WHERE event_name = 'expedition_route_created')::int AS "expeditionRoutesCreated",
          COUNT(*) FILTER (WHERE event_name = 'expedition_link_opened')::int AS "expeditionLinkOpens",
          COUNT(*) FILTER (WHERE event_name = 'expedition_share_intent')::int AS "expeditionShareIntents",
          COUNT(*) FILTER (WHERE event_name = 'expedition_stage_completed')::int AS "expeditionStageCompletions"
        FROM recent_events
      `),
      pool.query(`
        SELECT
          network,
          COUNT(*) FILTER (WHERE event_name = 'social_share_intent')::int AS intents,
          COUNT(*) FILTER (WHERE event_name = 'social_reward_claimed')::int AS reward_claims
        FROM (
          SELECT
            event_name,
            CASE
              WHEN source ~ '^osgard-social-share:(telegram|whatsapp|vk|x|facebook|native-share):[a-z0-9-]{1,40}$'
                THEN split_part(source, ':', 2)
              WHEN source ~ '^osgard-social-reward:(telegram|whatsapp|vk|x|facebook|native-share):[a-z0-9-]{1,40}$'
                THEN split_part(source, ':', 2)
              ELSE NULL
            END AS network
          FROM commerce_events
          WHERE received_at >= NOW() - INTERVAL '30 days'
            AND event_name IN ('social_share_intent', 'social_reward_claimed')
        ) social_events
        WHERE network IS NOT NULL
        GROUP BY network
        ORDER BY intents DESC, network ASC
      `),
      pool.query("SELECT attribution_game_id AS \"gameId\", attribution_source AS source, NULLIF(attribution_campaign, '') AS campaign, mode, currency, COUNT(*)::int AS orders, COALESCE(SUM(amount_total),0)::text AS \"totalMinor\" FROM commerce_orders WHERE status='paid' AND amount_total IS NOT NULL AND currency IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' GROUP BY attribution_game_id, attribution_source, attribution_campaign, mode, currency ORDER BY COUNT(*) DESC, attribution_game_id ASC LIMIT 50"),
      pool.query(`SELECT COUNT(*)::int AS "qualifiedReferrals", COALESCE(SUM(reward_amount),0)::int AS "shardsAwarded" FROM commerce_referral_invites WHERE reward_claimed_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`
        SELECT
          service_id AS "serviceId",
          game_id AS "gameId",
          source,
          NULLIF(campaign, '') AS campaign,
          currency,
          COUNT(*)::int AS conversions,
          COUNT(*) FILTER (WHERE conversion_type IN ('purchase_paid','subscription_started','subscription_renewed'))::int AS "paidEvents",
          COUNT(*) FILTER (WHERE conversion_type IN ('purchase_refunded','subscription_refunded'))::int AS refunds,
          COALESCE(SUM(amount_minor) FILTER (WHERE conversion_type IN ('purchase_paid','subscription_started','subscription_renewed')),0)::text AS "grossPaidMinor",
          COALESCE(SUM(amount_minor) FILTER (WHERE conversion_type IN ('purchase_refunded','subscription_refunded')),0)::text AS "refundMinor",
          COALESCE(SUM(CASE
            WHEN conversion_type IN ('purchase_refunded','subscription_refunded') THEN -amount_minor
            WHEN conversion_type IN ('purchase_paid','subscription_started','subscription_renewed') THEN amount_minor
            ELSE 0
          END),0)::text AS "netPaidMinor"
        FROM commerce_attribution_conversions
        WHERE received_at >= NOW() - INTERVAL '30 days'
        GROUP BY service_id, game_id, source, campaign, currency
        ORDER BY conversions DESC, service_id ASC
        LIMIT 100
      `),
    ]);
    return res.json({
      ordersByStatus: orderStats.rows,
      grossPaidByCurrency: currencyStats.rows,
      leads: leadStats.rows[0] || { total: 0, new: 0 },
      leadsByAttribution: leadAttributionStats.rows,
      analyticsEventsLast30Days: eventStats.rows[0]?.total_30d || 0,
      topEventsLast30Days: topEvents.rows,
      analyticsByGame: analyticsByGame.rows,
      ownedPromoByService: ownedPromoByService.rows,
      ownedPromoVariantStats: ownedPromoVariantStats.rows,
      analyticsFunnel: analyticsFunnel.rows[0] || {},
      socialShareByNetwork: socialShareByNetwork.rows,
      paidRevenueByAttribution: paidRevenueByAttribution.rows,
      verifiedReferralRewards: referralRewardStats.rows[0] || { qualifiedReferrals: 0, shardsAwarded: 0 },
      serviceAttributionConversions: serviceConversionStats.rows,
      serviceAttributionReportingWindowDays: 30,
      serviceAttributionNote: "Конверсии поступают только от настроенных серверов собственных сервисов и дедуплицируются по serviceId + eventId. Суммы — отчёт интегратора, а не независимое подтверждение платёжного провайдера; они разделены по валютам, показаны до комиссий и не являются бухгалтерским отчётом.",
      analyticsRetentionDays,
      note: "Аналитика включает согласованные события, а серверные конверсии — согласованные отчёты целевых сервисов. Это не все посещения сайта и не показы сторонней рекламной сети. Суммы сгруппированы по валютам и не являются бухгалтерским отчётом.",
    });
  } catch (error) {
    console.error("Admin overview failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "ADMIN_OVERVIEW_UNAVAILABLE" });
  }
});
app.get("/v1/admin/leads", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit || "50"), 10) || 50));
  try {
    const result = await pool.query("SELECT lead_id, project_type, budget, contact, description, status, attribution_game_id, attribution_source, attribution_campaign, created_at FROM commerce_leads ORDER BY created_at DESC LIMIT $1", [limit]);
    return res.json({ items: result.rows });
  } catch (error) {
    console.error("Admin leads failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "ADMIN_LEADS_UNAVAILABLE" });
  }
});
app.get("/v1/admin/orders", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit || "50"), 10) || 50));
  try {
    const result = await pool.query("SELECT order_id, email, product_key, mode, status, amount_total, currency, attribution_game_id, attribution_source, attribution_campaign, created_at FROM commerce_orders ORDER BY created_at DESC LIMIT $1", [limit]);
    return res.json({ items: result.rows });
  } catch (error) {
    console.error("Admin orders failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "ADMIN_ORDERS_UNAVAILABLE" });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "REQUEST_TOO_LARGE" });
  console.error("Unhandled API error:", error?.message || "unknown error");
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Внутренняя ошибка. Повторите попытку позже." });
});

const analyticsRetentionTimer = setInterval(() => {
  if (!dbReady) return;
  void purgeExpiredAnalytics().catch((error) => {
    console.error("Analytics retention cleanup failed:", error?.message || "unknown error");
  });
}, 6 * 60 * 60 * 1000);
analyticsRetentionTimer.unref();

const server = app.listen(PORT, "0.0.0.0", async () => {
  try { if (pool) await ensureSchema(); }
  catch (error) {
    dbErrorAtBoot = true;
    dbReady = false;
    console.error("Database initialization failed:", error?.message || "unknown error");
  }
  if (dbReady) {
    void purgeExpiredAnalytics().catch((error) => {
      console.error("Analytics retention cleanup failed:", error?.message || "unknown error");
    });
  }
  console.log("OSGARD Commerce API listening on port " + PORT);
});
async function shutdown(signal) {
  console.log("Shutting down after " + signal);
  server.close(async () => { await pool?.end().catch(() => {}); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
