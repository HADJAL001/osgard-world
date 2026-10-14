#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditRepository, inspectPublicCommerceConfig, inspectSponsorInventory, summarizeChecks } from "./osgard-ecosystem-release-preflight.mjs";

const safeConfig = inspectPublicCommerceConfig(JSON.stringify({ apiBaseUrl: "", notes: "public config only" }));
assert.equal(safeConfig.valid, true, "empty same-origin config is valid");
assert.equal(safeConfig.safe, true, "safe fallback config is permitted");
assert.equal(inspectPublicCommerceConfig(JSON.stringify({ apiBaseUrl: "http://remote.invalid" })).safe, false, "remote API must use HTTPS");
assert.equal(inspectPublicCommerceConfig(JSON.stringify({ apiBaseUrl: "", debug: "sk_live_123456" })).safe, false, "secret-like values must not enter public config");

const safeInventory = inspectSponsorInventory(JSON.stringify({
  schemaVersion: 1,
  commercialStatus: "inquiry_only",
  placements: [{ id: "slot", active: false, sponsorLabelRequired: true }]
}));
assert.equal(safeInventory.valid, true);
assert.equal(safeInventory.inactive, true);
assert.equal(safeInventory.labeled, true);
const unsafeInventory = inspectSponsorInventory(JSON.stringify({
  schemaVersion: 1,
  placements: [{ id: "slot", active: true, sponsorLabelRequired: false }]
}));
assert.equal(unsafeInventory.inactive, false, "active inventory must not be treated as pre-approved");
assert.equal(unsafeInventory.labeled, false, "sponsor disclosure is mandatory");

assert.deepEqual(summarizeChecks([{status:"PASS"},{status:"REVIEW"},{status:"BLOCK"}]), { pass: 1, review: 1, block: 1 });

const report = await auditRepository();
assert.ok(report.checks.length >= 14, "release preflight should cover the main subsystems");
assert.equal(report.summary.block, 0, "current repository source should satisfy hard gates");
assert.ok(report.manualGates.some((gate) => gate.id === "live-payments" && gate.status === "REVIEW"), "payments must stay off until operator activation");
assert.ok(report.manualGates.some((gate) => gate.id === "ad-network"), "ad activation must remain an explicit manual gate");
assert.ok(report.manualGates.some((gate) => gate.id === "external-project-review"), "external project links require manual review");

console.log("OSGARD ecosystem release-preflight smoke: PASS (" + report.summary.pass + " source checks; " + report.summary.review + " review signals; " + report.summary.block + " blockers)");
