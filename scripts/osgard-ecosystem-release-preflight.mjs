#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = async (root, file) => {
  try { return await fs.readFile(path.join(root, file), "utf8"); }
  catch { return null; }
};
const exists = async (root, file) => {
  try { await fs.access(path.join(root, file)); return true; }
  catch { return false; }
};
const check = (checks, id, area, ok, detail, source, statusOnFailure = "BLOCK") => {
  checks.push({
    id,
    area,
    status: ok ? "PASS" : statusOnFailure,
    detail,
    source
  });
};
const matchCount = (text, regex) => [...String(text || "").matchAll(regex)].length;

export function inspectPublicCommerceConfig(raw) {
  let config;
  try { config = JSON.parse(raw); } catch { return { valid: false, safe: false, reason: "invalid_json" }; }
  const apiBaseUrl = typeof config.apiBaseUrl === "string" ? config.apiBaseUrl.trim() : "";
  const urlSafe = apiBaseUrl === "" || /^https:\/\//i.test(apiBaseUrl);
  const secretLike = /sk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|(?:secret|private)[_-]?(?:key|token)\s*[:=]\s*["'][^"']{8,}/i.test(raw);
  return {
    valid: Boolean(config && typeof config === "object" && !Array.isArray(config)),
    safe: urlSafe && !secretLike,
    apiBaseUrlConfigured: Boolean(apiBaseUrl),
    reason: !urlSafe ? "api_base_must_be_https" : secretLike ? "secret_like_value_in_public_config" : "ok"
  };
}

export function inspectSponsorInventory(raw) {
  let inventory;
  try { inventory = JSON.parse(raw); } catch { return { valid: false, inactive: false, labeled: false, activeCount: -1 }; }
  const placements = Array.isArray(inventory.placements) ? inventory.placements : [];
  return {
    valid: inventory.schemaVersion === 1 && placements.length > 0,
    inactive: placements.every((p) => p.active === false),
    labeled: placements.every((p) => p.sponsorLabelRequired === true),
    activeCount: placements.filter((p) => p.active === true).length,
    placementCount: placements.length,
    status: inventory.commercialStatus
  };
}

export function summarizeChecks(checks) {
  return checks.reduce((summary, item) => {
    if (item.status === "PASS") summary.pass += 1;
    else if (item.status === "REVIEW") summary.review += 1;
    else summary.block += 1;
    return summary;
  }, { pass: 0, review: 0, block: 0 });
}

export async function auditRepository(root = ROOT) {
  const checks = [];
  const packageText = await read(root, "package.json");
  const pkg = packageText ? JSON.parse(packageText) : null;
  check(checks, "stack", "architecture", Boolean(pkg && pkg.dependencies?.react && pkg.devDependencies?.vite && pkg.devDependencies?.typescript), "React/Vite/TypeScript stack and package manifest are present.", "package.json");
  check(checks, "build-script", "architecture", Boolean(pkg?.scripts?.build && pkg?.scripts?.check), "Production build and TypeScript check scripts are defined.", "package.json");

  const catalog = await read(root, "src/EntertainmentCatalog.tsx");
  const gamesHub = await read(root, "public/games/index.html");
  const routeManifest = await read(root, "src/core/manifest.ts");
  const catalogEntryCount = matchCount(catalog, /\[\s*['"]\d{2}['"]\s*,\s*['"][^'"]+['"]\s*,/g);
  check(checks, "catalog-entrypoints", "games", catalogEntryCount >= 10 && Boolean(gamesHub) && Boolean(routeManifest), "Found " + catalogEntryCount + " catalogue entries plus the static Games hub and typed game manifest.", "src/EntertainmentCatalog.tsx; public/games/index.html; src/core/manifest.ts");
  check(checks, "catalog-discovery", "games", Boolean(gamesHub && /type=["']search["']|role=["']search["']|id=["'][^"']*search/i.test(gamesHub) && /favorite|favourite|избранн/i.test(gamesHub) && /history|истори/i.test(gamesHub)), "Search, favorites and recent-play/history affordances are present in the catalogue source.", "public/games/index.html", "REVIEW");
  check(checks, "game-detail-and-runtime-tests", "games", Boolean(pkg?.scripts?.["qa:games-detail"] && await exists(root, "scripts/games-detail-smoke.mjs") && await exists(root, "scripts/game-detail-runtime-smoke.mjs")), "Game-detail and runtime lifecycle smoke tests are available.", "package.json; scripts/games-detail-smoke.mjs; scripts/game-detail-runtime-smoke.mjs");

  const ecosystem = await read(root, "public/games/ecosystem/index.html");
  const ecosystemJs = await read(root, "public/games/ecosystem/directory.js");
  const itemListCount = matchCount(ecosystem, /"@type":"ListItem"/g);
  const trackedLinkCount = matchCount(ecosystem, /utm_campaign=ecosystem_directory/g);
  check(checks, "first-party-directory", "cross-promotion", itemListCount === 10 && Boolean(ecosystemJs), "Machine-readable directory has " + itemListCount + " owner-listed projects.", "public/games/ecosystem/index.html");
  check(checks, "attributed-project-links", "cross-promotion", trackedLinkCount === 10 && /noopener noreferrer/.test(ecosystem || ""), "All ten directory destinations carry the directory attribution campaign; external links use a safe new-tab relationship.", "public/games/ecosystem/index.html");
  const allContactSources = [
    await read(root, "src/ProjectIntake.tsx"),
    await read(root, "src/Development.tsx"),
    ecosystem
  ].filter(Boolean).join("\n");
  check(checks, "contact-and-intake", "lead-generation", /osman\.osmanov0099@gmail\.com/.test(allContactSources) && /wa\.me\/79640027222/.test(allContactSources) && Boolean(pkg?.scripts?.["qa:project-intake"]), "Email, WhatsApp handoff and a dedicated project-intake test are present.", "src/ProjectIntake.tsx; src/Development.tsx; public/games/ecosystem/index.html");

  const privacyPage = await exists(root, "public/privacy/index.html");
  const termsPage = await exists(root, "public/terms/index.html");
  const consentRuntime = await exists(root, "public/privacy/consent-center.js") && await exists(root, "public/games/consented-analytics.js");
  check(checks, "legal-pages", "privacy-and-terms", privacyPage && termsPage, "Privacy and terms pages are present.", "public/privacy/index.html; public/terms/index.html");
  check(checks, "consent-controls", "privacy-and-terms", consentRuntime && Boolean(pkg?.scripts?.["qa:privacy-consent"]), "Consent centre and consent-aware analytics runtime plus regression test are present.", "public/privacy/consent-center.js; public/games/consented-analytics.js");

  const commerceRaw = await read(root, "public/games/commerce-config.json");
  const commerceState = inspectPublicCommerceConfig(commerceRaw || "");
  check(checks, "public-config-secret-hygiene", "commerce-security", commerceState.valid && commerceState.safe, "Public commerce config parses and contains no secret-like values; explicit API URL is HTTPS-only.", "public/games/commerce-config.json");
  const envExample = await read(root, "services/osgard-commerce-api/.env.example");
  const paymentsOff = /(?:^|\n)ENABLE_LIVE_PAYMENTS=false(?:\r?\n|$)/.test(envExample || "");
  const premiumOff = /(?:^|\n)ENABLE_OSGARD_PREMIUM_SALES=false(?:\r?\n|$)/.test(envExample || "");
  check(checks, "live-payment-safe-default", "commerce-security", paymentsOff, "Live payments remain disabled in the example service configuration unless explicitly enabled by an operator.", "services/osgard-commerce-api/.env.example");
  check(checks, "premium-sales-safe-default", "commerce-security", premiumOff, "Premium sales remain disabled until account entitlement, cancellation and refund flows are complete.", "services/osgard-commerce-api/.env.example");
  const apiServer = await read(root, "services/osgard-commerce-api/src/server.mjs");
  const apiTests = await exists(root, "services/osgard-commerce-api/test/core.test.mjs") && await exists(root, "scripts/commerce-rollout-smoke.mjs");
  check(checks, "signed-payment-webhooks", "commerce-security", /constructEvent/.test(apiServer || "") && /STRIPE_WEBHOOK_SECRET/.test(envExample || "") && apiTests, "The service has a Stripe signature-validation contract and automated commerce tests.", "services/osgard-commerce-api/src/server.mjs; services/osgard-commerce-api/test/core.test.mjs");

  const inventoryRaw = await read(root, "public/games/partners/inventory.json");
  const inventory = inspectSponsorInventory(inventoryRaw || "");
  check(checks, "sponsor-inventory-safe-state", "advertising", inventory.valid && inventory.inactive && inventory.labeled && inventory.activeCount === 0, "Sponsor placements are explicitly labeled and inactive by default (" + inventory.placementCount + " placements).", "public/games/partners/inventory.json");
  check(checks, "partner-enquiry-and-campaign-tests", "advertising", Boolean(pkg?.scripts?.["qa:partners-page"] && pkg?.scripts?.["qa:campaign-manager"]), "Partner inquiry and campaign-manager regression checks are available.", "package.json");

  const monetizationDoc = await read(root, "docs/GAMES_MONETIZATION_MODEL.md");
  const monetizationPage = await exists(root, "public/games/monetization/index.html");
  check(checks, "scenario-financial-model", "financial-model", Boolean(monetizationDoc && monetizationPage && pkg?.scripts?.["qa:games-model"]), "The local three-scenario financial model, formulas, caveats and JSON export surface are present.", "docs/GAMES_MONETIZATION_MODEL.md; public/games/monetization/index.html");
  check(checks, "external-project-preflight", "cross-promotion", await exists(root, "scripts/external-project-healthcheck.mjs") && await exists(root, ".github/workflows/external-project-health.yml") && Boolean(pkg?.scripts?.["qa:external-project-healthcheck"]), "Scheduled HTTPS homepage checks and network-free safety-contract tests are available; they do not prove a destination's full function.", "scripts/external-project-healthcheck.mjs; .github/workflows/external-project-health.yml");

  const commandDeck = await read(root, "public/games/command-center/index.html");
  const operations = await read(root, "public/games/operations/index.html");
  check(checks, "operations-command-deck", "operations", Boolean(commandDeck && /noindex,nofollow,noarchive/.test(commandDeck) && operations && /command-center/.test(operations) && await exists(root, "scripts/games-launch-console-smoke.mjs")), "Read-only command deck is noindex and linked from operations; its safety contract is tested.", "public/games/command-center/index.html; public/games/operations/index.html");
  check(checks, "documentation-and-deployment", "deployment", await exists(root, "DEPLOYMENT.md") && await exists(root, "COMMERCE-ROLL_OUT_2026-10-13.md") && await exists(root, ".github/workflows/deploy-frontend.yml"), "Deployment runbook, commerce activation notes and frontend deploy workflow are present.", "DEPLOYMENT.md; COMMERCE-ROLL_OUT_2026-10-13.md; .github/workflows/deploy-frontend.yml");

  const manualGates = [
    {
      id: "live-payments",
      status: paymentsOff ? "REVIEW" : "BLOCK",
      message: paymentsOff ? "OFF by default. Operator must provide database/Stripe secrets, test all lifecycle cases, and intentionally enable live payments." : "The sample config does not keep live payments disabled."
    },
    {
      id: "premium-entitlements",
      status: premiumOff ? "REVIEW" : "BLOCK",
      message: premiumOff ? "OFF by default. Account-bound entitlement grant/revoke and cancellation/refund handling must be completed before sales." : "Premium sales are not guarded off in the sample config."
    },
    {
      id: "ad-network",
      status: inventory.activeCount === 0 ? "REVIEW" : "REVIEW",
      message: "No ad network is certified as connected by source. Provider approval, consent review, placement review and a real test report require operator credentials."
    },
    {
      id: "external-project-review",
      status: "REVIEW",
      message: "A 2xx homepage check is not a security/product audit. Confirm domain control, page purpose, terms, privacy and primary flow before paid promotion."
    },
    {
      id: "production-smoke",
      status: "REVIEW",
      message: "Source QA cannot replace a fresh production route matrix, browser journey tests and post-deploy verification."
    }
  ];

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: "HADJAL001/osgard-world",
    scope: "source-local; does not contact production domains or payment/ad providers",
    checks,
    summary: summarizeChecks(checks),
    manualGates
  };
}

function printReport(report) {
  console.log("\nOSGARD WORLD — ONE-PASS ECOSYSTEM PREFLIGHT");
  console.log("Scope: " + report.scope);
  for (const item of report.checks) {
    const mark = item.status === "PASS" ? "✓" : item.status === "REVIEW" ? "!" : "×";
    console.log(mark + " [" + item.status + "] " + item.id + " — " + item.detail);
  }
  console.log("\nSource checks: " + report.summary.pass + " pass / " + report.summary.review + " review / " + report.summary.block + " block.");
  console.log("Manual launch gates:");
  for (const item of report.manualGates) console.log("! [" + item.status + "] " + item.id + " — " + item.message);
  console.log("\nOverall: " + (report.summary.block === 0 ? "SOURCE READY FOR REVIEW; COMMERCIAL ACTIVATION STILL REQUIRES EXTERNAL GATES." : "BLOCKED: resolve source-level checks before release."));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditRepository();
  printReport(report);
  const jsonArg = process.argv.find((arg) => arg.startsWith("--json="));
  if (jsonArg) {
    const outputPath = path.resolve(ROOT, jsonArg.slice("--json=".length));
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log("JSON report written to " + path.relative(ROOT, outputPath));
  }
  if (report.summary.block > 0) process.exitCode = 1;
}
