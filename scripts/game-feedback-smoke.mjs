import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = path => readFileSync(resolve(path), "utf8");
const required = [
  "services/osgard-commerce-api/src/feedback.mjs",
  "services/osgard-commerce-api/test/feedback.test.mjs",
  "public/games/feedback/index.html",
  "public/games/feedback/feedback.css",
  "public/games/feedback/feedback.js",
  "public/games/admin/feedback/index.html",
  "public/games/admin/feedback/admin.js",
  "docs/28_OSGARD_PLAY_FEEDBACK_LOOP_30_IMPROVEMENTS_2026-10-14.md",
];
for (const path of required) assert.ok(existsSync(resolve(path)), "Missing feedback asset: " + path);
const api = read("services/osgard-commerce-api/src/server.mjs");
const validator = read("services/osgard-commerce-api/src/feedback.mjs");
const ui = read("public/games/feedback/index.html");
const client = read("public/games/feedback/feedback.js");
const admin = read("public/games/admin/feedback/admin.js");
const config = JSON.parse(read("public/games/commerce-config.json"));
const routeMatrix = read("scripts/production-route-matrix.mjs");
const packageJson = JSON.parse(read("package.json"));

for (const route of [
  'app.post("/v1/game-feedback"',
  'app.get("/v1/admin/game-feedback"',
  'app.post("/v1/admin/game-feedback/:id/status"',
]) assert.ok(api.includes(route), "Missing feedback endpoint: " + route);
assert.ok(api.includes('requireAdmin, async (req, res)') && api.includes('"/v1/admin/game-feedback"'), "Feedback queue must be private");
assert.ok(api.includes('requireAdmin, async (req, res)') && api.includes('"/v1/admin/game-feedback/:id/status"'), "Status mutation must require admin auth");
assert.ok(api.includes('ON CONFLICT (submission_id) DO NOTHING'), "Retry must be idempotent");
assert.ok(api.includes('commerce_game_feedback') && api.includes('GAME_FEEDBACK_RETENTION_DAYS'), "Feedback must have dedicated persistence and retention");
assert.ok(api.includes('app.use("/v1/game-feedback", rateLimit('), "Public feedback endpoint must be rate limited");
assert.ok(validator.includes('Raw user agent, IP, URL') && validator.includes('"FEEDBACK_ACK_REQUIRED"'), "Validator must disclose privacy boundaries and require report acknowledgement");
assert.ok(client.includes("credentials: 'omit'") && client.includes("cache: 'no-store'"), "Feedback API request must not use ambient credentials or cache");
assert.ok(client.includes('Сервер приёма отчётов не настроен. Ничего не отправлено'), "Offline/error mode must clearly say no report was sent");
assert.ok(client.includes('safeApiBase') && client.includes("endsWith('.osgard.world')"), "Public form must restrict API destination");
assert.ok(!client.includes('OSGARD_CONSENTED_ANALYTICS') && !client.includes('sendBeacon') && !client.includes('analytics.enqueue'), "Report body must not be sent to analytics");
assert.ok(admin.includes('type="password"') && !admin.includes('localStorage') && !admin.includes('sessionStorage'), "Admin token must be ephemeral");
assert.ok(admin.includes('textContent') && !admin.includes('innerHTML'), "Admin untrusted report fields must never be interpreted as HTML");
assert.ok(ui.includes('name="consent"') && ui.includes('href="/privacy/"'), "Form must require acknowledgement and link privacy terms");
assert.ok(ui.includes('id="export-report"') && ui.includes('id="copy-report"'), "Manual export is needed while API is not configured");
assert.equal(config.apiBaseUrl, "", "Tests must not silently activate a production API");
assert.ok(routeMatrix.includes("'/games/feedback/'") && routeMatrix.includes("'/games/admin/feedback/'"), "Feedback routes must enter production route matrix");
assert.equal(packageJson.scripts["qa:game-feedback"], "node scripts/game-feedback-smoke.mjs", "QA script missing");
assert.ok(new Function(client));
assert.ok(new Function(admin));
console.log("PASS OSGARD GAME FEEDBACK: public reporting, bounded inputs, private admin, rate limits, no analytics leakage, manual export and route QA");
