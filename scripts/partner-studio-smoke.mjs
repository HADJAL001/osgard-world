import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { calculateModel, SCENARIO_PRESETS, trackedUrl } from "../public/games/partners/model.js";

const root = resolve("public/games/partners");
for (const path of ["index.html", "styles.css", "app.js", "model.js"]) {
  assert.ok(existsSync(resolve(root, path)), "Missing partner studio file: " + path);
}
const html = readFileSync(resolve(root, "index.html"), "utf8");
const app = readFileSync(resolve(root, "app.js"), "utf8");
const hub = readFileSync(resolve("public/games/index.html"), "utf8");
assert.ok(html.includes("id=\"forecast-form\""), "Interactive forecast form missing");
assert.ok(html.includes("id=\"lead-form\""), "Partner lead form missing");
assert.ok(html.includes("data-preset=\"conservative\"") && html.includes("data-preset=\"base\"") && html.includes("data-preset=\"optimistic\""), "Three editable scenario presets missing");
assert.ok(html.includes("id=\"export-json\"") && html.includes("id=\"export-csv\""), "Forecast export options missing");
assert.ok(html.includes("osgardbewworld.com") && html.includes("o2system.art") && html.includes("senjorio.com") && html.includes("superday.run") && html.includes("marcosa.club") && html.includes("myosa.world") && html.includes("gold-glamour.online") && html.includes("gardvpn.is") && html.includes("osgardos.com") && html.includes("osgardvanguard.studio"), "Owned-project network is incomplete");
assert.ok(html.includes("РЕКЛАМНЫЙ ПРОВАЙДЕР НЕ ПОДКЛЮЧЁН") && html.includes("Не подключено"), "Ad/checkout state must be represented truthfully");
assert.ok(hub.includes('href="/games/partners/"') && hub.includes("Открыть партнёрскую студию"), "Existing Games hub must link to Partner Studio");
assert.ok(app.includes("if (!allowed || !token) return"), "Analytics must require consent and an authenticated session");
assert.ok(app.includes("window.open(\"https://wa.me/79640027222?text=\""), "Lead flow must open WhatsApp for a human-confirmed send");
assert.ok(app.includes("localStorage.setItem(\"osgard.games.partner-model.v1\""), "Local model save must be supported");
const values = { ...SCENARIO_PRESETS.conservative };
const result = calculateModel(values);
assert.equal(result.visits, 1000);
assert.equal(result.starts, 100);
assert.equal(result.sessions, 140);
assert.equal(result.adRequests, 140);
assert.equal(result.paidImpressions, 28);
assert.equal(result.adRevenue, 0.014);
assert.equal(result.sponsorRevenue, 0, "No signed sponsorship must mean zero revenue");
assert.equal(result.gameRevenue, result.adRevenue + result.purchaseRevenue);
assert.equal(result.gameOperatingResult, result.gameRevenue - result.operatingCosts);
assert.equal(result.qualifiedLeads, 1);
assert.equal(result.expectedProjectSales, 0.02);
assert.equal(calculateModel({ visits: -9, startRatePct: 700 }).starts, 0);
assert.equal(calculateModel({ visits: 100, fillRatePct: 1000 }).paidImpressions, calculateModel({ visits: 100, fillRatePct: 100 }).paidImpressions);
assert.equal(Object.keys(SCENARIO_PRESETS).length, 3);
const u = new URL(trackedUrl("https://example.com/landing", "null-shift"));
assert.equal(u.searchParams.get("utm_source"), "osgard_games");
assert.equal(u.searchParams.get("utm_campaign"), "partner_studio");
assert.equal(u.searchParams.get("utm_content"), "null-shift");
assert.equal(u.searchParams.get("osgard_ref"), "games-partners");
assert.ok(!/googleapis\.com|gstatic\.com|jsdelivr\.net|unpkg\.com/i.test(html), "Do not add third-party CDNs");
assert.ok(/prefers-reduced-motion:\s*reduce/i.test(readFileSync(resolve(root, "styles.css"), "utf8")), "Reduced-motion support missing");
new Function(app.replace(/^import[\s\S]*?;\s*/gm, "")); // Syntax smoke; imports are removed only for compilation preflight.
console.log("PASS OSGARD PARTNER STUDIO: scenarios, forecasts, input bounds, project UTM links, consent/auth-gated analytics, WhatsApp lead composition, local-only model save, reduced motion and dependency-free assets.");
