import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import pg from "pg";
import {
  catalogConfiguration, validateCheckoutPayload, validateLeadPayload,
  validateEventBatch, paymentsModeAllowed, resolveCheckoutPaymentState, safeEqual,
  parseReferralRewardEvent, validateReferralRewardStatus, REFERRAL_REWARD_POINTS, REFERRAL_MIN_SESSION_SECONDS,
} from "./core.mjs";

const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT || 8080);
const requestedRetentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS);
const analyticsRetentionDays = Number.isInteger(requestedRetentionDays) && requestedRetentionDays >= 30 && requestedRetentionDays <= 365
  ? requestedRetentionDays
  : 90;
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "https://osgard.world").replace(/\/+$/, "");
const allowedOrigins = new Set(String(process.env.ALLOWED_ORIGINS || "https://osgard.world,https://www.osgard.world,http://localhost:4188").split(",").map((v) => v.trim()).filter(Boolean));
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
app.use("/v1/referrals", rateLimit({ windowMs: 5 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/v1/admin", rateLimit({ windowMs: 5 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

async function ensureSchema() {
  if (!pool) return false;
  await pool.query("CREATE TABLE IF NOT EXISTS commerce_orders (order_id TEXT PRIMARY KEY, email TEXT NOT NULL, product_key TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('payment','subscription')), status TEXT NOT NULL DEFAULT 'pending', stripe_session_id TEXT UNIQUE, stripe_customer_id TEXT, stripe_payment_intent_id TEXT, stripe_subscription_id TEXT, amount_total BIGINT, currency TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE INDEX IF NOT EXISTS commerce_orders_status_created_idx ON commerce_orders(status, created_at DESC);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_orders_email_idx ON commerce_orders(email);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_stripe_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE TABLE IF NOT EXISTS commerce_leads (lead_id TEXT PRIMARY KEY, project_type TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', consent_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE INDEX IF NOT EXISTS commerce_leads_created_idx ON commerce_leads(created_at DESC);\n" +
    "CREATE TABLE IF NOT EXISTS commerce_events (event_id TEXT PRIMARY KEY, event_name TEXT NOT NULL, session_id TEXT NOT NULL, game_id TEXT NOT NULL, source TEXT NOT NULL, path TEXT NOT NULL, duration_seconds INTEGER NOT NULL DEFAULT 0, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW());\n" +
    "CREATE INDEX IF NOT EXISTS commerce_events_name_received_idx ON commerce_events(event_name, received_at DESC);\n" +
    "CREATE INDEX IF NOT EXISTS commerce_events_game_received_idx ON commerce_events(game_id, received_at DESC);");
  await pool.query(
    "CREATE TABLE IF NOT EXISTS game_referral_invites (invite_code TEXT PRIMARY KEY, game_id TEXT NOT NULL, inviter_token TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "CREATE INDEX IF NOT EXISTS game_referral_invites_created_idx ON game_referral_invites(created_at DESC);" +
    "CREATE TABLE IF NOT EXISTS game_referral_visits (invite_code TEXT NOT NULL REFERENCES game_referral_invites(invite_code) ON DELETE CASCADE, visitor_token TEXT NOT NULL, opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(invite_code,visitor_token));" +
    "CREATE TABLE IF NOT EXISTS game_referral_rewards (invite_code TEXT NOT NULL REFERENCES game_referral_invites(invite_code) ON DELETE CASCADE, visitor_token TEXT NOT NULL, game_id TEXT NOT NULL, duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 60), points INTEGER NOT NULL DEFAULT 50 CHECK(points = 50), qualified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(invite_code,visitor_token));" +
    "CREATE INDEX IF NOT EXISTS game_referral_rewards_qualified_idx ON game_referral_rewards(qualified_at DESC);"
  );
  dbReady = true;
  return true;
}

async function purgeExpiredAnalytics() {
  if (!pool || !dbReady) return 0;
  const result = await pool.query(
    "DELETE FROM commerce_events WHERE received_at < NOW() - ($1 * INTERVAL '1 day')",
    [analyticsRetentionDays],
  );
  await pool.query("DELETE FROM game_referral_invites WHERE created_at < NOW() - INTERVAL '365 days'");
  return Number(result.rowCount || 0);
}

async function processReferralRewardEvent(client, event) {
  const parsed = parseReferralRewardEvent(event);
  if (!parsed) return;
  if (parsed.type === "invite_created") {
    await client.query(
      "INSERT INTO game_referral_invites(invite_code,game_id,inviter_token) VALUES($1,$2,$3) ON CONFLICT(invite_code) DO NOTHING",
      [parsed.inviteCode, parsed.gameId, parsed.ownerToken],
    );
    return;
  }
  if (parsed.type === "invite_opened") {
    await client.query(
      "INSERT INTO game_referral_visits(invite_code,visitor_token) SELECT $1,$2 FROM game_referral_invites i WHERE i.invite_code=$1 AND i.game_id=$3 AND i.inviter_token<>$2 ON CONFLICT(invite_code,visitor_token) DO NOTHING",
      [parsed.inviteCode, parsed.visitorToken, parsed.gameId],
    );
    return;
  }
  if (parsed.type === "invite_qualified") {
    const verifiedSession = await client.query(
      "SELECT 1 FROM commerce_events finish JOIN commerce_events start ON start.session_id=finish.session_id AND start.game_id=finish.game_id AND start.source=finish.source WHERE finish.event_id=$1 AND finish.event_name='game_session_completed' AND start.event_name='game_session_started' AND start.received_at <= finish.received_at - ($2 * INTERVAL '1 second') LIMIT 1",
      [event.eventId, REFERRAL_MIN_SESSION_SECONDS],
    );
    if (!verifiedSession.rowCount) return;
    await client.query(
      "INSERT INTO game_referral_rewards(invite_code,visitor_token,game_id,duration_seconds,points) SELECT v.invite_code,v.visitor_token,$3,$4,$5 FROM game_referral_visits v JOIN game_referral_invites i USING(invite_code) WHERE v.invite_code=$1 AND v.visitor_token=$2 AND i.game_id=$3 AND i.inviter_token<>v.visitor_token ON CONFLICT(invite_code,visitor_token) DO NOTHING",
      [parsed.inviteCode, parsed.visitorToken, parsed.gameId, parsed.durationSeconds, parsed.points],
    );
  }
}


function paymentsAllowed() {
  return Boolean(stripe && pool && dbReady && webhookSecret &&
    paymentsModeAllowed(stripeSecret, process.env.ENABLE_LIVE_PAYMENTS === "true"));
}
function premiumSalesAllowed() {
  return process.env.ENABLE_OSGARD_PREMIUM_SALES === "true";
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
    await pool.query("INSERT INTO commerce_orders(order_id,email,product_key,mode,status,currency) VALUES($1,$2,$3,$4,'pending',$5)", [orderId, input.email, input.productKey, input.product.mode, price.currency]);
    const session = await stripe.checkout.sessions.create({
      mode: input.product.mode,
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: input.email,
      client_reference_id: orderId,
      metadata: { order_id: orderId, product_key: input.productKey },
      ...(input.product.mode === "subscription" ? { subscription_data: { metadata: { order_id: orderId, product_key: input.productKey } } } : {}),
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
    await pool.query("INSERT INTO commerce_leads(lead_id,project_type,budget,contact,description,consent_at) VALUES($1,$2,$3,$4,$5,NOW())", [leadId, lead.projectType, lead.budget, lead.contact, lead.description]);
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
        const persistedEvent = { ...event, eventId: event.eventId || crypto.randomUUID() };
        const inserted = await client.query(
          "INSERT INTO commerce_events(event_id,event_name,session_id,game_id,source,path,duration_seconds) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING event_id",
          [persistedEvent.eventId, persistedEvent.name, persistedEvent.sessionId, persistedEvent.gameId, persistedEvent.source, persistedEvent.path, persistedEvent.durationSeconds],
        );
        insertedCount += Number(inserted.rowCount || 0);
        if (inserted.rowCount) await processReferralRewardEvent(client, persistedEvent);
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

app.post("/v1/referrals/reward-status", async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  const input = validateReferralRewardStatus(req.body);
  if (!input.ok) return res.status(input.status).json({ error: input.code });
  if (!requireDatabase(res)) return;
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS qualified_sessions, COALESCE(SUM(points),0)::int AS points_earned FROM game_referral_rewards WHERE invite_code=$1",
      [input.code],
    );
    const row = result.rows[0] || {};
    return res.json({
      qualifiedSessions: Number(row.qualified_sessions || 0),
      pointsEarned: Number(row.points_earned || 0),
      pointsPerQualifiedSession: REFERRAL_REWARD_POINTS,
      qualifyingDurationSeconds: REFERRAL_MIN_SESSION_SECONDS,
      redeemableForCash: false,
      redeemableForPurchases: false,
    });
  } catch (error) {
    console.error("Referral reward status failed:", error?.message || "unknown error");
    return res.status(503).json({ error: "REFERRAL_STATUS_UNAVAILABLE" });
  }
});

app.get("/v1/admin/overview", requireAdmin, async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const [orderStats, currencyStats, leadStats, eventStats, topEvents, analyticsByGame, ownedPromoByService, analyticsFunnel, referralRewardStats] = await Promise.all([
      pool.query("SELECT status, COUNT(*)::int AS count FROM commerce_orders GROUP BY status"),
      pool.query("SELECT currency, SUM(amount_total)::bigint AS total_minor, COUNT(*)::int AS count FROM commerce_orders WHERE status='paid' AND currency IS NOT NULL GROUP BY currency"),
      pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='new')::int AS new FROM commerce_leads"),
      pool.query("SELECT COUNT(*)::int AS total_30d FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days'"),
      pool.query("SELECT event_name, COUNT(*)::int AS count FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days' GROUP BY event_name ORDER BY count DESC LIMIT 12"),
      pool.query("SELECT game_id AS \"gameId\", COUNT(*)::int AS events, COUNT(DISTINCT session_id)::int AS sessions, COUNT(*) FILTER (WHERE event_name IN ('game_session_started','game_launched'))::int AS starts, COUNT(*) FILTER (WHERE event_name='game_session_completed')::int AS completions, COALESCE(ROUND(AVG(duration_seconds) FILTER (WHERE event_name='game_session_completed' AND duration_seconds > 0))::int,0) AS \"avgCompletionSeconds\", COUNT(*) FILTER (WHERE event_name='cross_promo_clicked')::int AS \"crossPromoClicks\" FROM commerce_events WHERE received_at >= NOW() - INTERVAL '30 days' GROUP BY game_id ORDER BY starts DESC, events DESC LIMIT 20"),
      pool.query(`
        SELECT
          split_part(source, ':', 3) AS "serviceId",
          game_id AS "gameId",
          COUNT(*) FILTER (WHERE event_name = 'owned_promo_impression')::int AS impressions,
          COUNT(*) FILTER (WHERE event_name = 'cross_promo_clicked')::int AS clicks
        FROM commerce_events
        WHERE received_at >= NOW() - INTERVAL '30 days'
          AND source LIKE 'osgard-select:%'
          AND split_part(source, ':', 3) ~ '^[a-z0-9-]{1,40}$'
        GROUP BY split_part(source, ':', 3), game_id
        ORDER BY impressions DESC, clicks DESC, "serviceId" ASC
        LIMIT 50
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
          WHERE event_name = 'share_created'
            AND source LIKE 'game-invite:%'
            AND split_part(source, ':', 3) ~ '^(og_[a-f0-9]{8}|og_[a-f0-9]{32}|[a-f0-9]{12})$'
        ),
        invite_opens AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'referral_link_opened'
            AND source LIKE 'referral-link:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|og_[a-f0-9]{32}|[a-f0-9]{12})$'
        ),
        invite_starts AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'game_session_started'
            AND source LIKE 'referral:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|og_[a-f0-9]{32}|[a-f0-9]{12})$'
        ),
        invite_completions AS (
          SELECT DISTINCT split_part(source, ':', 2) AS invite_code
          FROM recent_events
          WHERE event_name = 'game_session_completed'
            AND source LIKE 'referral:%'
            AND split_part(source, ':', 2) ~ '^(og_[a-f0-9]{8}|og_[a-f0-9]{32}|[a-f0-9]{12})$'
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
          (SELECT COUNT(*) FROM invite_shares)::int AS "inviteShares",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_opens o USING (invite_code))::int AS "referralOpens",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_starts r USING (invite_code))::int AS "referredStarts",
          (SELECT COUNT(*) FROM invite_shares s JOIN invite_completions c USING (invite_code))::int AS "referredCompletions"
        FROM recent_events
      `),
      pool.query("SELECT COUNT(*)::int AS \"qualifiedSessions\", COALESCE(SUM(points),0)::int AS \"pointsAwarded\", COUNT(DISTINCT invite_code)::int AS \"inviteCodesWithRewards\" FROM game_referral_rewards WHERE qualified_at >= NOW() - INTERVAL '30 days'"),
    ]);
    return res.json({
      ordersByStatus: orderStats.rows,
      grossPaidByCurrency: currencyStats.rows,
      leads: leadStats.rows[0] || { total: 0, new: 0 },
      analyticsEventsLast30Days: eventStats.rows[0]?.total_30d || 0,
      topEventsLast30Days: topEvents.rows,
      analyticsByGame: analyticsByGame.rows,
      ownedPromoByService: ownedPromoByService.rows,
      referralRewards: referralRewardStats.rows[0] || { qualifiedSessions: 0, pointsAwarded: 0, inviteCodesWithRewards: 0 },
      analyticsFunnel: analyticsFunnel.rows[0] || {},
      analyticsRetentionDays,
      note: "Аналитика включает только согласованные события. Это не все посещения сайта и не рекламные показы. Суммы сгруппированы по валютам и не являются бухгалтерским отчётом.",
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
    const result = await pool.query("SELECT lead_id, project_type, budget, contact, description, status, created_at FROM commerce_leads ORDER BY created_at DESC LIMIT $1", [limit]);
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
    const result = await pool.query("SELECT order_id, email, product_key, mode, status, amount_total, currency, created_at FROM commerce_orders ORDER BY created_at DESC LIMIT $1", [limit]);
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
