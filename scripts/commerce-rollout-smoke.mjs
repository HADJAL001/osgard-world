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
const admin = readFileSync(resolve("public/games/admin/index.html"), "utf8");
const config = JSON.parse(readFileSync(resolve("public/games/commerce-config.json"), "utf8"));

for (const value of [
  "stripe.checkout.sessions.create", "stripe.webhooks.constructEvent",
  "express.raw", "commerce_stripe_events", "ON CONFLICT DO NOTHING",
  "ENABLE_LIVE_PAYMENTS", "ADMIN_API_TOKEN", "/v1/admin/overview",
  "/v1/checkout/status", "validateEventBatch", "validateLeadPayload",
]) assert.ok(server.includes(value), "Commerce API missing required feature: " + value);
for (const value of ["PRODUCT_DEFS", "termsAccepted", "verifyStripeSignature", "paymentsModeAllowed"]) {
  assert.ok(core.includes(value), "Core validation missing: " + value);
}
for (const value of ["id=\"products\"", "id=\"buyer-email\"", "id=\"terms-accepted\"", "no-store", "Не списаны"]) {
  assert.ok(store.includes(value), "Storefront missing: " + value);
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

const html = readFileSync(resolve("public/games/index.html"), "utf8");
assert.ok(html.includes("id=\"project-form\""), "Existing project form must remain in the games hub.");
assert.ok(existsSync(resolve("public/games/commerce-client.js")), "Existing contact forms need a shared API/fallback client.");
console.log("Commerce rollout smoke: all static integration checks passed.");
