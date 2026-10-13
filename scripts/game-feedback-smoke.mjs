import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = path => readFileSync(resolve(path), "utf8");
const pagePath = "public/games/feedback/index.html";
assert.ok(existsSync(resolve(pagePath)), "The standalone player feedback page must exist.");
const page = read(pagePath);
const hub = read("public/games/index.html");
const privacy = read("public/privacy/index.html");
const core = read("services/osgard-commerce-api/src/core.mjs");
const api = read("services/osgard-commerce-api/src/server.mjs");
const tests = read("services/osgard-commerce-api/test/core.test.mjs");
const admin = read("public/games/commerce-admin/index.html");
const commerceSmoke = read("scripts/commerce-rollout-smoke.mjs");

for (const marker of [
  'id="feedback-form"', 'name="gameId"', 'name="rating"', 'name="wouldPlayAgain"',
  'name="category"', 'name="message"', 'name="consent"', 'name="website"',
  'id="feedback-status"', 'id="feedback-fallback"', 'id="mail-draft"',
  'href="/privacy/"', 'href="/games/"', 'prefers-reduced-motion:reduce',
]) assert.ok(page.includes(marker), "Feedback page missing: " + marker);
assert.ok(!/<input[^>]+type=["']email/i.test(page), "The anonymous feedback form must not request an email.");
assert.ok(!/<input[^>]+name=["'](?:phone|telephone|fullName|userId|accountId)["']/i.test(page), "The anonymous feedback form must not request contact/account identifiers.");
assert.ok(page.includes("API_NOT_CONFIGURED") && page.includes("nothing was sent") === false,
  "The fallback must expose the configured-API boundary in Russian, not pretend to send a review.");
assert.ok(page.includes("result.stored !== true"), "The frontend must not tell a user a honeypot/non-stored payload was persisted.");
assert.ok(page.includes("fetch(base + '/v1/feedback'") && page.includes("cache: 'no-store'"),
  "Feedback may be sent only to the explicit server API and must bypass caches.");
assert.ok(!/(googletagmanager|doubleclick\.net|facebook\.net\/.*pixel)/i.test(page),
  "The feedback page must not add third-party analytics/ad trackers.");
assert.ok(hub.includes('href="/games/feedback/">Оценить игру</a>'), "The game hub needs a path to feedback.");
assert.ok(privacy.includes("8. Игровая обратная связь") && privacy.includes("GAME_FEEDBACK_RETENTION_DAYS"),
  "The privacy notice must explain the feedback flow and retention.");

for (const marker of [
  "validateGameFeedbackPayload", "FEEDBACK_CONSENT_REQUIRED", "FEEDBACK_RATING_INVALID",
  "FEEDBACK_CATEGORY_INVALID", "FEEDBACK_MESSAGE_TOO_LONG", "FEEDBACK_RETURN_INTENT_INVALID",
]) assert.ok(core.includes(marker), "Feedback validator missing: " + marker);
for (const marker of [
  'app.post("/v1/feedback"', 'app.get("/v1/admin/feedback"',
  'app.use("/v1/feedback"', "commerce_game_feedback", "purgeExpiredGameFeedback",
  "GAME_FEEDBACK_RETENTION_DAYS", "stored: false", "stored: true",
]) assert.ok(api.includes(marker), "Feedback API contract missing: " + marker);
assert.ok(tests.includes('test("game feedback requires consent') && tests.includes("validateGameFeedbackPayload"),
  "API unit tests must cover invalid and valid feedback submissions.");
for (const marker of ["id=\"feedback-total\"", "id=\"feedback-last30\"", "id=\"feedback-average\"", "id=\"game-feedback\"", "/v1/admin/feedback?limit=30"]) {
  assert.ok(admin.includes(marker), "Protected admin feedback view missing: " + marker);
}
assert.ok(commerceSmoke.includes("validateGameFeedbackPayload") && commerceSmoke.includes("/v1/feedback") && commerceSmoke.includes("/v1/admin/feedback"),
  "The commerce rollout smoke must cover the new feedback API.");

console.log("PASS game feedback: anonymous form contract, consent boundary, bounded server validation, rate limit, retention, protected admin and honest offline fallback.");
