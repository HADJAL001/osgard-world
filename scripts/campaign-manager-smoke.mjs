import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const required = [
  "services/osgard-commerce-api/src/campaigns.mjs",
  "src/GameIntermissionSponsor.tsx",
  "src/game-intermission-sponsor.css",
  "scripts/game-intermission-sponsor-smoke.mjs",
  "services/osgard-commerce-api/test/campaigns.test.mjs",
  "public/games/admin/campaigns/index.html",
  "public/games/admin/campaigns/admin.css",
  "public/games/admin/campaigns/admin.js",
  "public/games/sponsored-campaigns.css",
  "public/games/sponsored-campaigns.js",
  "docs/26_OSGARD_CAMPAIGN_MANAGER_30_IMPROVEMENTS_2026-10-14.md",
];
for (const path of required) assert.ok(existsSync(resolve(path)), "Missing campaign manager asset: " + path);

const server = read("services/osgard-commerce-api/src/server.mjs");
const core = read("services/osgard-commerce-api/src/core.mjs");
const validator = read("services/osgard-commerce-api/src/campaigns.mjs");
const publicPage = read("public/games/index.html");
const publicScript = read("public/games/sponsored-campaigns.js");
const publicCss = read("public/games/sponsored-campaigns.css");
const intermission = read("src/GameIntermissionSponsor.tsx");
const intermissionCss = read("src/game-intermission-sponsor.css");
const gameDetail = read("src/GameDetailPage.tsx");
const adminPage = read("public/games/admin/campaigns/index.html");
const adminScript = read("public/games/admin/campaigns/admin.js");
const adminCss = read("public/games/admin/campaigns/admin.css");
const analytics = read("public/games/consented-analytics.js");
const privacy = read("public/privacy/index.html");
const config = JSON.parse(read("public/games/commerce-config.json"));
const routes = read("scripts/production-route-matrix.mjs");

for (const route of [
  'app.get("/v1/campaigns/active"',
  'app.get("/v1/admin/campaigns"',
  'app.post("/v1/admin/campaigns"',
  'app.post("/v1/admin/campaigns/:id"',
]) assert.ok(server.includes(route), "Missing Campaign API route: " + route);
assert.equal(server.split('app.get("/v1/campaigns/active"').length - 1, 1);
assert.equal(server.split('app.get("/v1/admin/campaigns"').length - 1, 1);
assert.ok(server.includes("requireAdmin, async (_req, res)") && server.includes('"/v1/admin/campaigns"'), "Admin list must use the existing auth middleware");
assert.ok(server.includes("pg_advisory_xact_lock(20261014)"), "Parallel publish operations must be serialized");
assert.ok(server.includes("LIMIT $2") && server.includes('placement === "after_session" ? 5 : 3') && server.includes("maxActiveAfterSessionItems: 5") && server.includes("CAMPAIGN_SLOT_FULL"), "Catalog (3) and selectable after-session (5) inventories must be bounded");
assert.ok(validator.includes("[\"catalog_feature\", \"after_session\"]") && intermission.includes("placement=after_session") && gameDetail.includes("<GameIntermissionSponsor gameId={game.id} locale={locale} />"), "After-session placement must be validated, fetched and rendered only on game details");
assert.ok(server.includes("CASE WHEN status = 'scheduled' AND starts_at <= NOW() AND ends_at > NOW() THEN 'active'"), "Scheduled campaigns must become public when their approved time window starts.");
assert.ok(server.includes("starts_at < $2 AND ends_at > $1") && server.includes("status IN ('active','scheduled')"), "Active and scheduled slot limits must count overlapping time windows.");
assert.ok(server.includes("CREATE TABLE IF NOT EXISTS commerce_campaigns") && server.includes("commerce_campaigns_public_idx"), "Campaign schema/index is missing");
assert.ok(server.includes('app.use("/v1/campaigns", rateLimit('), "Public campaign endpoint must be rate limited");
assert.ok(server.includes('res.set("Cache-Control", "no-store, private")'), "Admin result must not be cached");

for (const text of [
  "CAMPAIGN_URL_MUST_BE_SAFE_HTTPS", "CAMPAIGN_DISCLOSURE_REQUIRED",
  "CAMPAIGN_ACTIVE_WINDOW_MUST_INCLUDE_NOW", "CAMPAIGN_PLACEMENT_NOT_INTEGRATED",
  "CAMPAIGN_FREQUENCY_CAP_INVALID",
]) assert.ok(validator.includes(text), "Campaign validator must reject invalid input: " + text);
assert.ok(validator.includes("url.protocol !== \"https:\"") && validator.includes("url.username") && validator.includes("url.password"));
assert.ok(core.includes('"sponsored_campaign_impression"') && core.includes('"sponsored_campaign_clicked"'));
assert.ok(core.includes("CAMPAIGN_EVENT_SOURCE_INVALID"), "Metrics need campaign ID source allow-list");
assert.ok(analytics.includes("'sponsored_campaign_impression'") && analytics.includes("'sponsored_campaign_clicked'"));
assert.ok(analytics.includes("if (!consentGranted())"), "Shared analytics must keep its consent gate");

for (const marker of [
  'id="osgard-live-sponsored"', '/games/sponsored-campaigns.js?v=__OSGARD_BUILD_VERSION__',
  '/games/sponsored-campaigns.css?v=__OSGARD_BUILD_VERSION__',
]) assert.ok(publicPage.includes(marker), "Games hub missing sponsored campaign integration: " + marker);
assert.ok(publicPage.includes('id="catalog"'), "Existing playable catalog must remain");
assert.ok(publicScript.includes("osgard.games.sponsor-exposures.v1"));
assert.ok(publicScript.includes("if (consentGranted() && !storageForConsent()) return"), "When consent is enabled, hide sponsor cards if persistent frequency capping cannot be honoured");
assert.ok(publicScript.includes("if ('IntersectionObserver' in window) {") && publicScript.includes("rootMargin: '400px 0px'"), "Lazy loading must start before any storage check, including when consent is declined.");
assert.ok(!publicScript.includes("() => sessionStorage"), "24-hour frequency caps must not silently degrade to per-tab session storage.");
assert.ok(publicScript.includes("if (!consentGranted()) return true; // Ads may display, but no persistent cap/metrics are stored."), "Declined analytics consent must not create persistent local tracking.");
assert.ok(publicScript.includes("entry.intersectionRatio < 0.5") && publicScript.includes("}, 1000)"), "Impressions must require real visible time");
assert.ok(publicScript.includes("window.OSGARD_CONSENTED_ANALYTICS") && publicScript.includes("sponsored_campaign_clicked"));
assert.ok(publicScript.includes("credentials: 'omit'") && publicScript.includes("root.hidden = true"), "Public loader must not send cookies and must fail closed");
assert.ok(publicScript.includes("card.textContent") || publicScript.includes("textContent ="), "Untrusted campaign copy must use textContent, not HTML injection");
assert.ok(publicCss.includes("prefers-reduced-motion:reduce") && publicCss.includes("@media(max-width:540px)"));
assert.ok(adminPage.includes('name="robots" content="noindex,nofollow,noarchive"') && adminPage.includes('id="campaign-form"'));
assert.ok(adminPage.includes("Максимум 3 активных карточки"));
assert.ok(adminPage.includes("Между игровыми сессиями · подключено") && adminPage.includes("экрана между игровыми сессиями"), "Campaign editor must describe the new intermission slot accurately");
assert.ok(intermission.includes("if (!hasConsent()) return") && intermission.includes("IntersectionObserver") && intermission.includes("}, 1000)"), "Intermission metrics require consent and a visible card for one second");
assert.ok(intermissionCss.includes("@media(max-width:620px)") && intermissionCss.includes("prefers-reduced-motion:reduce"), "Intermission card must support phones and reduced motion");
assert.ok(adminCss.includes("@media(max-width:760px)") && adminCss.includes("focus-visible"));
assert.ok(adminScript.includes("Authorization: 'Bearer '") && adminScript.includes("credentials: 'omit'"));
assert.ok(adminScript.includes("parsed.origin === location.origin") && adminScript.includes("parsed.pathname === '/commerce-api'") && adminScript.includes("Never send it to an arbitrary"), "Privileged admin token must be restricted to the same-origin API or local development endpoint.");
assert.ok(!adminScript.includes("localStorage.setItem(") && !adminScript.includes("sessionStorage.setItem("), "Admin token must not be persisted client-side");
assert.ok(adminScript.includes("/v1/admin/campaigns") && adminScript.includes("status: 'paused'"));
assert.ok(privacy.includes("osgard.games.sponsor-exposures.v1") && privacy.includes("только после явного согласия"));
assert.equal(config.apiBaseUrl, "", "No unconfirmed production API URL must be assumed");
assert.ok(routes.includes("'/games/admin/campaigns/'") && routes.includes("'/games/sponsored-campaigns.js'"));
assert.ok(!/(sk_(?:live|test)_|whsec_)[A-Za-z0-9_]+/.test(server + publicScript + adminScript), "No payment secret may be included");

new Function(publicScript);
new Function(adminScript);
new Function(analytics);
console.log("Campaign manager smoke: all privacy, API, routing and frontend contracts passed.");
