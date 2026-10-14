import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [server, admin, workflow, apiPackage] = await Promise.all([
  readFile(new URL("../services/osgard-commerce-api/src/server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../public/games/commerce-admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../services/osgard-commerce-api/src/lead-workflow.mjs", import.meta.url), "utf8"),
  readFile(new URL("../services/osgard-commerce-api/package.json", import.meta.url), "utf8"),
]);

assert.match(server, /app\.patch\("\/v1\/admin\/leads\/:id",\s*requireAdmin/);
assert.match(server, /app\.get\("\/v1\/admin\/leads\/:id\/activities",\s*requireAdmin/);
assert.match(server, /commerce_lead_activities/);
assert.match(server, /next_action_at/);
assert.match(server, /methods:\s*\["GET",\s*"POST",\s*"PATCH",\s*"OPTIONS"\]/);
assert.match(admin, /lead-status-select/);
assert.match(admin, /lead-follow-up/);
assert.match(admin, /lead-internal-note/);
assert.match(admin, /\/v1\/admin\/leads\/.*\/activities/);
assert.match(workflow, /LEAD_STATUS_TRANSITION_INVALID/);
assert.match(workflow, /MAX_FOLLOW_UP_AHEAD_MS/);
assert.match(apiPackage, /"test":\s*"node --test"/);

console.log("OSGARD lead workflow smoke: PASS (protected API, workflow audit, follow-up, notes, UI)");
