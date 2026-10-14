import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const release = JSON.parse(readFileSync(resolve(root, "public/games/civic-cascade/release.json"), "utf8"));
const matrix = readFileSync(resolve(root, "scripts/production-route-matrix.mjs"), "utf8");

assert.equal(release.gameId, "civic-cascade");
assert.equal(release.version, "3.4.0");
assert.equal(release.buildContract?.decisionDossier?.modelVersion, release.version,
  "Decision dossier model version must track the published CIVIC CASCADE release");
assert.equal(release.buildContract?.decisionDossier?.hashScope,
  "canonical recursively key-sorted JSON payload without exportMetadata",
  "The release must describe the canonical hash scope actually used by the verifier");
assert.ok(matrix.includes("release.version === '" + release.version + "'"),
  "The production route matrix must validate the current release version");
assert.ok(matrix.includes("release.buildContract?.decisionDossier?.modelVersion === '" + release.buildContract.decisionDossier.modelVersion + "'"),
  "The production route matrix must validate the current decision-dossier model version");
assert.ok(matrix.includes("release.buildContract?.decisionDossier?.hashScope === '" + release.buildContract.decisionDossier.hashScope + "'"),
  "The production route matrix must validate the current canonical hash scope");
assert.ok(!matrix.includes("canonical JSON payload before export metadata"),
  "A stale, incompatible hash-scope requirement must not block a valid release");
assert.ok(!matrix.includes("decisionDossier?.modelVersion === '3.2.0'"),
  "The route matrix must not keep a stale decision-dossier model version");
assert.ok(release.buildContract?.decisionDossier?.verifierEnabled === true &&
  release.buildContract?.dossierVerification?.neverExecutesImportedOrders === true &&
  release.buildContract?.dossierVerification?.networkRequests === false,
  "The release must preserve the read-only, local-only dossier verifier contract");

assert.equal(release.buildContract?.aiStrategyAdvisor?.enabled, true)
assert.equal(release.buildContract?.aiStrategyAdvisor?.modelVersion, release.version)
assert.equal(release.buildContract?.aiStrategyAdvisor?.explicitPerRequestConsent, true)
assert.equal(release.buildContract?.aiStrategyAdvisor?.disabledUnlessServerFlagAndKeyPresent, true)
assert.equal(release.buildContract?.aiStrategyAdvisor?.apiKeyClientSide, false)
assert.equal(release.buildContract?.aiStrategyAdvisor?.canExecuteOrders, false)
assert.ok(["cc-ai-advisor","cc-ai-advisor-consent","cc-ai-advisor-run","cc-ai-advisor-status","cc-ai-advisor-result"].every(marker => release.buildContract.readinessMarkers.includes(marker)))
assert.ok(matrix.includes("aiStrategyAdvisor?.enabled"), "The production route matrix must validate the optional AI Advisor contract.")

console.log("PASS CIVIC CASCADE release contract: release v" + release.version +
  ", canonical dossier hash scope, read-only verifier and production matrix consistency.");
