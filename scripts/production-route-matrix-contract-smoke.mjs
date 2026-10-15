import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const matrix = readFileSync(resolve("scripts/production-route-matrix.mjs"), "utf8");
const nginx = readFileSync(resolve("nginx.conf"), "utf8");
const commandDeck = readFileSync(resolve("public/games/command-center/index.html"), "utf8");
const html = readFileSync(resolve("public/games/swarm/index.html"), "utf8");
const css = readFileSync(resolve("public/games/swarm/styles.css"), "utf8");
const game = readFileSync(resolve("public/games/swarm/game.js"), "utf8");
const monetization = readFileSync(resolve("public/games/monetization/index.html"), "utf8");
const csvExport = readFileSync(resolve("public/games/monetization/export.mjs"), "utf8");
const englishGames = readFileSync(resolve("public/games/en/index.html"), "utf8");
const russianGames = readFileSync(resolve("public/games/index.html"), "utf8");
const sitemap = readFileSync(resolve("public/sitemap.xml"), "utf8");
const catalogueFallback = JSON.parse(readFileSync(resolve("public/games/game-catalog-fallback.json"), "utf8"));
const assetOptimizer = readFileSync(resolve("scripts/optimize-games-static-assets.mjs"), "utf8");
const deployWorkflow = readFileSync(resolve(".github/workflows/deploy-frontend.yml"), "utf8");


assert.ok(html.includes("<title>SWARM — One Body. Eight Minds.</title>"), "SWARM page title contract is missing.");
assert.ok(html.includes('href="./styles.css"') && html.includes('src="./game.js"'), "SWARM page must load its local CSS and game entry point.");

assert.ok(css.includes("--acid:#d9ff57") && css.includes(".arena") && css.includes(".playtest-feedback"),
  "SWARM stylesheet must contain its own visual and playtest UI markers.");
assert.ok(css.includes("/skillcred/fonts/InterVariable.woff2") && css.includes("/skillcred/fonts/JetBrainsMono-Regular.woff2"),
  "SWARM should use the site's self-hosted font files.");
assert.ok(!css.includes("fonts.googleapis.com"), "SWARM must not reintroduce a third-party font request.");
assert.match(css, /prefers-reduced-motion:\s*reduce/, "SWARM interface must respect reduced-motion preference.");

assert.ok(game.includes("querySelector('#game')") && game.includes("const roles = [") &&
  game.includes("function newGame(") && game.includes("swarm-room-session") &&
  game.includes("restoreRoomSession();") && game.includes("recordInviteOpen"),
  "SWARM game entry must retain its play loop, role system, local session restore and invite attribution.");

const cssBranch = matrix.indexOf("path === '/games/swarm/styles.css'");
const jsBranch = matrix.indexOf("path === '/games/swarm/game.js'");
const genericCssFallback = matrix.indexOf(": path.endsWith('.css')", cssBranch);
assert.ok(cssBranch >= 0 && jsBranch > cssBranch && genericCssFallback > jsBranch,
  "SWARM asset validators must run before generic CSS/JS fallbacks.");
assert.ok(matrix.includes("const compact = normalized.replace(/\\s+/g, '')") &&
  matrix.includes("compact.includes('--acid:#d9ff57')") &&
  matrix.includes("compact.includes('/skillcred/fonts/intervariable.woff2')"),
  "Production route matrix must validate SWARM with SWARM-specific, whitespace-tolerant asset markers.");
assert.ok(matrix.includes("compact.includes('constroles=[')") &&
  matrix.includes("compact.includes('restoreroomsession()')") &&
  matrix.includes("compact.includes('recordinviteopen')"),
  "Production route matrix must validate the SWARM game script instead of the generic site fallback.");

assert.ok(matrix.includes("route === '/games/command-center/'") &&
  matrix.includes("reportType: 'osgard-play-command-deck'") &&
  matrix.includes('id="download-report"') && matrix.includes('databaseReady !== true'),
  "Production route matrix must validate Command Deck's actual HTML and commerce-readiness contract.");
assert.ok(commandDeck.includes('<title>OSGARD PLAY — Command Deck</title>') &&
  commandDeck.includes('id="run-checks"') && commandDeck.includes('id="download-report"') &&
  commandDeck.includes('noindex,nofollow,noarchive'),
  "Command Deck needs stable production test markers and noindex.");
const nginxLines = nginx.split("\n");
const mjsLocation = nginxLines.findIndex(line => line.includes("location") && line.includes("mjs$"));
const genericStaticLocation = nginxLines.findIndex(line => line.includes("location") && line.includes("(?:css|js|png|jpg|jpeg|gif|svg|woff2?)$"));
assert.ok(mjsLocation >= 0 && genericStaticLocation > mjsLocation,
  "Nginx must handle .mjs before the generic static-asset matcher.");
assert.ok(nginxLines.slice(mjsLocation, genericStaticLocation).some(line => line.includes("default_type application/javascript;")) &&
  !nginxLines[genericStaticLocation].includes("mjs"),
  "Nginx must serve .mjs as JavaScript rather than a generic binary or text response.");

assert.ok(matrix.includes("'/games/monetization/export.mjs'") &&
  matrix.includes("route === '/games/monetization/export.mjs'") &&
  matrix.includes("export-csv") &&
  matrix.includes("export function buildFinancialCsv"),
  "Production route matrix must validate the CSV export UI and the served formatter module.");
assert.ok(monetization.includes('id="export-csv"') &&
  csvExport.includes('export function buildFinancialCsv') &&
  csvExport.includes('FINANCIAL_CSV_NOTE') && csvExport.includes("firstMeaningful"),
  "Financial model CSV export must remain available, explicit and spreadsheet-safe.");


const declaredRoutes = matrix.slice(matrix.indexOf('const routes = ['), matrix.indexOf(']' + String.fromCharCode(10) + 'const agents'));
assert.ok(!declaredRoutes.includes("'/games/commerce-admin/intelligence.js'"),
  'A JavaScript module must not be included as a page-level route contract.');
assert.ok(matrix.includes("route === '/games/commerce-admin/' ? ['/games/commerce-admin/intelligence.js']"),
  'Commerce Admin intelligence must be checked through the typed static-asset contract.');


assert.ok(matrix.includes("path === '/games/commerce-admin/intelligence.js'") &&
  matrix.includes("content.includes('window.OSGARDCommerceIntelligence')") &&
  matrix.includes("content.includes('function derive(')"),
  'Commerce Intelligence must have its own non-empty, privacy-safe JavaScript content contract.');


const expectedEnglishGameIds = ['null-shift','empire-of-time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid','heist-echo'];
assert.ok(englishGames.includes('<html lang="en">') && englishGames.includes('<title>OSGARD PLAY — Explore Digital Worlds</title>'), "English Games entry needs a unique English document title and language.");
assert.ok(englishGames.includes('href="https://osgard.world/games/en/"') && englishGames.includes('href="https://osgard.world/games/"') && englishGames.includes('hreflang="x-default"'), "English Games entry needs canonical and reciprocal language metadata.");
assert.ok(englishGames.includes('Language availability:') && englishGames.includes('href="/games/ecosystem/?utm_source=osgard_games&amp;utm_medium=global_catalog'), "English Games entry must disclose incomplete game translation and offer tracked ecosystem discovery.");
assert.ok(expectedEnglishGameIds.every(id => englishGames.includes('id="'+id+'"')), "English Games entry must have all twelve current playable/catalogue routes.");
assert.ok(russianGames.includes('hreflang="en" href="https://osgard.world/games/en/"') && russianGames.includes('class="locale-link" href="/games/en/"'), "Russian catalogue must link to its English alternative from the page navigation.");
assert.ok(sitemap.includes('<loc>https://osgard.world/games/en/</loc>'), "English Games entry must be discoverable in the XML sitemap.");
assert.equal(catalogueFallback.schemaVersion, 1);
assert.equal(catalogueFallback.source, "defaults");
assert.equal(catalogueFallback.items.length, 12, "Static fallback must preserve the canonical twelve-game catalogue.");
assert.deepEqual(catalogueFallback.items.map(item => item.sortOrder), [1,2,3,4,5,6,7,8,9,10,11,12]);
assert.equal(new Set(catalogueFallback.items.map(item => item.id)).size, 12, "Fallback catalogue IDs must be unique.");
assert.ok(matrix.includes('function matchesCanonicalCatalogue(body)') &&
  matrix.includes('canonicalCatalogueItems.length') &&
  !matrix.includes('items.length === 11'),
  "Production route matrix must compare the live API and fallback with the canonical registry rather than a stale fixed game count.");
assert.ok(matrix.includes('31 диагностических проверок') && !matrix.includes('30 диагностических проверок'),
  "Production route matrix must track the current 31-check browser diagnostics contract.");
assert.ok(nginx.includes('location = /games/catalog-runtime.js') && nginx.includes('gzip_static off;') && nginx.includes('no-cache, must-revalidate'), "The small catalogue runtime must bypass stale precompressed sidecars and revalidate.");
assert.ok(nginx.includes('no-store, no-cache, must-revalidate, max-age=0') && nginx.includes('if_modified_since off;'), "The Games catalogue runtime must not reuse a stale empty cached response.");
assert.ok(matrix.includes("expectedBuild.slice(0, 12)") && matrix.includes("cache: 'no-store'"), "Production route checks must probe current-release static assets without reusing cache entries.");
assert.ok(englishGames.includes('favicon.svg?v=__OSGARD_BUILD_VERSION__') && russianGames.includes('favicon.svg?v=__OSGARD_BUILD_VERSION__') && deployWorkflow.includes('osgard-release/html/games/en/index.html'), "Both language catalogues must publish build-versioned favicon URLs.");
assert.ok(nginx.includes('location = /commerce-api/v1/game-catalog') && nginx.includes('error_page 502 503 504 =200 /games/game-catalog-fallback.json;'), "The public read-only catalogue must use a safe static fallback only during API outages.");
assert.ok(nginx.includes('location = /commerce-api/v1/admin/game-catalog') && nginx.includes('error_page 502 504 =503 @osgard_commerce_unavailable;') && nginx.includes('COMMERCE_API_UNAVAILABLE'), "Operator catalogue calls must fail with a clear JSON 503, never fabricated admin success.");
assert.ok(assetOptimizer.includes("'catalog-runtime.js'"), "The catalogue runtime must be non-empty and minified during build.");
assert.ok(deployWorkflow.includes('const compact=source.replace(/' + String.fromCharCode(92) + 's+/g,"")') && deployWorkflow.includes('compact.includes(".textContent=")') && deployWorkflow.includes('compact.includes(".title")') && deployWorkflow.includes('compact.includes(".innerHTML")') && deployWorkflow.includes('!body.equals(inflated)'), "Deployment archive validation must accept minified code while verifying safe rendering and exact gzip bytes.");
assert.ok(matrix.includes("'/games/en/'") && matrix.includes("'/games/game-catalog-fallback.json'") && matrix.includes("compact.includes('.textContent=')"), "The production route matrix must validate the global entry, fallback payload and minified runtime.");

assert.ok(matrix.includes("nonEmpty = path === '/games/favicon.svg'") &&
  matrix.includes("content.includes('<svg')") &&
  matrix.includes('viewBox="0 0 64 64"'),
  "SVG assets must be checked for non-empty markup and viewBox rather than a JavaScript-only fallback.");

console.log("PASS SWARM route contract: game-specific asset checks, self-hosted fonts and reduced motion.");
