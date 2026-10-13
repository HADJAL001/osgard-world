import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("services/osgard-commerce-api");
const requiredFiles = [
  "src/server.mjs", "src/core.mjs", "test/core.test.mjs",
  "package.json", "Dockerfile", "README.md", ".env.example",
];
for (const relative of requiredFiles) assert.ok(existsSync(resolve(root, relative)), "Missing commerce file: " + relative);

const server = readFileSync(resolve(root, "src/server.mjs"), "utf8");
const core = readFileSync(resolve(root, "src/core.mjs"), "utf8");
const store = readFileSync(resolve("public/games/premium/index.html"), "utf8");
const app = readFileSync(resolve("public/games/premium/app.js"), "utf8");
const admin = readFileSync(resolve("public/games/commerce-admin/index.html"), "utf8");
const config = JSON.parse(readFileSync(resolve("public/games/commerce-config.json"), "utf8"));
const nginx = readFileSync(resolve("nginx.conf"), "utf8");
const routeMatrix = readFileSync(resolve("scripts/production-route-matrix.mjs"), "utf8");

for (const value of [
  "stripe.checkout.sessions.create", "stripe.webhooks.constructEvent",
  "express.raw", "commerce_stripe_events", "ON CONFLICT DO NOTHING",
  "ENABLE_LIVE_PAYMENTS", "ADMIN_API_TOKEN", "/v1/admin/overview",
  "/v1/checkout/status", "validateEventBatch", "validateLeadPayload",
  "resolveCheckoutPaymentState", "no-store, private",
]) assert.ok(server.includes(value), "Commerce API missing required feature: " + value);
for (const value of ["PRODUCT_DEFS", "termsAccepted", "verifyStripeSignature", "paymentsModeAllowed"]) {
  assert.ok(core.includes(value), "Core validation missing: " + value);
}
for (const value of ["id=\"products\"", "id=\"buyer-email\"", "id=\"terms-accepted\""]) {
  assert.ok(store.includes(value), "Storefront missing: " + value);
}
for (const value of ["no-store", "Деньги не списаны", "termsAccepted"]) {
  assert.ok(app.includes(value), "Storefront behavior missing: " + value);
}
for (const value of ["/v1/products", "/v1/checkout/session", "https:", "checkout_started"]) {
  assert.ok(app.includes(value), "Storefront code missing: " + value);
}
for (const value of ["type=\"password\"", "ADMIN_API_TOKEN", "/v1/admin/leads", "noindex,nofollow"]) {
  assert.ok(admin.includes(value), "Admin UI missing: " + value);
}
assert.equal(config.apiBaseUrl, "", "No production API hostname should be assumed without deployment confirmation.");
assert.ok(!server.includes("sk_live_abc123"), "No live secret may be committed.");
assert.ok(!admin.includes("Bearer sk_"), "No payment secret may be embedded in admin HTML.");
assert.ok(nginx.includes("location ^~ /commerce-api/"), "Existing Nginx must expose the same-origin commerce API prefix.");
assert.ok(nginx.includes("set $osgard_commerce_api_host osgard-commerce-api;"), "Commerce API must use its private Docker DNS name.");
assert.ok(nginx.includes("proxy_pass http://$osgard_commerce_api_host:8080$uri$is_args$args;"), "Nginx must strip the public prefix and preserve query strings.");
assert.ok(routeMatrix.includes("'/games/commerce-admin/'") && routeMatrix.includes("'/games/premium/'") && routeMatrix.includes("'/games/premium/success/'"), "Production route matrix must verify commerce pages.");
assert.ok(!/(sk_(?:live|test)_|whsec_)[A-Za-z0-9_]+/.test(readFileSync(resolve("public/games/commerce-config.json"), "utf8")), "Public config must never contain Stripe secrets.");
assert.ok(server.includes("commerce_referral_wallets") && server.includes("commerce_referral_invites") && server.includes("commerce_referral_rewards"), "Referral points must use a persistent server ledger");
for (const route of ["/v1/referrals/issue", "/v1/referrals/wallet", "/v1/referrals/disable"]) assert.ok(server.includes(route), "Missing server-side referral route: " + route);
for (const contract of ["validateReferralIssuePayload", "validateReferralWalletPayload", "validateReferralDisablePayload", "resolveReferralCompletion"]) assert.ok(core.includes(contract), "Referral validation/eligibility contract missing: " + contract);
assert.ok(server.includes("event.durationSeconds") && server.includes("INSERT INTO commerce_referral_rewards") && server.includes("referralRewardsAwarded"), "SHARDS must be issued by the server only after qualifying session completion");
assert.ok(server.includes('app.use("/v1/referrals", rateLimit({ windowMs: 60 * 60 * 1000, limit: 80'), "Referral API must be rate-limited");
assert.ok(server.includes('createHash("sha256").update(input.walletToken).digest("hex")'), "Only a one-way wallet token hash should be stored");
assert.ok(server.includes("invite_code TEXT NOT NULL UNIQUE") && server.includes("referred_session_id TEXT NOT NULL UNIQUE") && server.includes("dailyRewards.rows[0]?.count || 0) >= 5"), "Referral ledger must deduplicate invite/session awards and enforce daily caps");
assert.ok(server.includes('DELETE FROM commerce_referral_wallets WHERE wallet_token_hash=$1'), "The user must be able to delete the referral wallet and related reward data");
assert.ok(!readFileSync(resolve("public/games/game-session-recommendations.js"), "utf8").includes("function award(source)"), "Client must not mint local authoritative referral points");

const html = readFileSync(resolve("public/games/index.html"), "utf8");
assert.ok(html.includes("id=\"project-form\""), "Existing project form must remain in the games hub.");
assert.ok(existsSync(resolve("public/games/commerce-client.js")), "Existing contact forms need a shared API/fallback client.");
const sharedClient = readFileSync(resolve("public/games/commerce-client.js"), "utf8");
const playerLifecycle = readFileSync(resolve("public/games/player-lifecycle.js"), "utf8");
const partners = readFileSync(resolve("public/games/partners/index.html"), "utf8");
const privacy = readFileSync(resolve("public/privacy/index.html"), "utf8");
const terms = readFileSync(resolve("public/terms/index.html"), "utf8");
for (const value of ['href="/games/premium/"', 'name="dataConsent"', 'src="/games/commerce-client.js"']) {
  assert.ok(html.includes(value), "Games hub missing commerce integration: " + value);
}
for (const value of ['id="campaign-form"', 'name="consent"', 'src="/games/commerce-client.js"']) {
  assert.ok(partners.includes(value), "Partner page missing lead integration: " + value);
}
assert.ok(sharedClient.includes("/v1/leads") && sharedClient.includes("wa.me/79640027222"), "Lead API and manual fallback must both exist.");
const ecosystemDomains = ["osgardbewworld.com","o2system.art","senjorio.com","superday.run","marcosa.club","myosa.world","gold-glamour.online","gardvpn.is","osgardos.com","osgardvanguard.studio"];
for (const domain of ecosystemDomains) assert.ok(html.includes(domain), "Games hub missing owned ecosystem link: " + domain);
assert.ok(html.includes("utm_source=osgard_games") && html.includes("utm_medium=cross_promo"), "Owned-platform links must include source attribution.");
assert.ok(sharedClient.includes("cross_promo_clicked") && sharedClient.includes("utm_content"), "Cross-promo clicks must be measured with consent and campaign context.");
assert.ok(playerLifecycle.includes("sendCommerceEvent(name,payload)") && playerLifecycle.includes("game_session_completed"), "Consented game session metrics must reach commerce analytics.");
assert.ok(privacy.includes("платёжного провайдера") && privacy.includes("Необязательная аналитика"), "Privacy page missing actual commerce data handling.");
assert.ok(terms.includes("Покупки и платёжный статус") && terms.includes("Подписка OSGARD PREMIUM выключена"), "Terms must document checkout and disabled recurring sales.");
const successPage = readFileSync(resolve("public/games/premium/success/index.html"), "utf8");
assert.ok(successPage.includes("/v1/checkout/status"), "Success page must ask the server for verified payment status.");
assert.ok(successPage.includes("result.paid===true"), "Success page must not trust the redirect alone.");
assert.ok(successPage.includes("result.orderStatus==='refunded'") && successPage.includes("payment_failed"), "Checkout result must clearly distinguish refunds/failures from a pending payment.");
assert.ok(!successPage.includes("Статус: '+String(result.paymentStatus||result.orderStatus"), "Checkout result must not present the original Stripe session status as the current order status.");
assert.ok(successPage.includes("if(accepted.ok){try{sessionStorage.setItem('osgard.purchase.tracked.'+sessionId,'yes');}catch{}}"), "Purchase analytics must only be deduplicated after the server accepts the consented event.");
assert.ok(successPage.includes("let alreadyTracked=false;try{alreadyTracked=sessionStorage.getItem"), "Blocked sessionStorage must not prevent displaying a server-verified payment result.");
assert.ok(successPage.includes("replace(/\\/+$/"), "Checkout status page URL base trimming must be valid.");
for (const value of ["ANALYTICS_RETENTION_DAYS", "purgeExpiredAnalytics", "game_id AS", "analyticsByGame", "analyticsFunnel", "event.eventId || crypto.randomUUID()"]) {
  assert.ok(server.includes(value), "Commerce API analytics hardening missing: " + value);
}
for (const value of ['"EVENT_ID_INVALID"', '"catalog_viewed"', '"partners_page_viewed"']) {
  assert.ok(core.includes(value), "Event validator missing: " + value);
}
for (const value of ["ANALYTICS_SESSION_KEY", "eventId", "catalog_viewed", "partners_page_viewed", "sessionStorage"]) {
  assert.ok(sharedClient.includes(value), "Browser analytics client missing: " + value);
}
assert.ok(playerLifecycle.includes("eventId:'evt_'"), "Player lifecycle should attach an idempotency key to session events.");
for (const value of ['id="analytics-retention"', 'id="game-analytics-table"', "analyticsByGame", "analyticsFunnel"]) {
  assert.ok(admin.includes(value), "Admin analytics dashboard missing: " + value);
}
assert.ok(readFileSync(resolve("public/games/premium/index.html"), "utf8").includes('src="/games/commerce-client.js"'), "Premium page view analytics must use the shared consent gate.");
assert.ok(privacy.includes("ANALYTICS_RETENTION_DAYS") && privacy.includes("90 дней") && privacy.includes("не отправляется автоматически"), "Privacy page must document consented analytics retention and manual WhatsApp fallback.");

console.log("Commerce rollout smoke: all static integration checks passed.");
