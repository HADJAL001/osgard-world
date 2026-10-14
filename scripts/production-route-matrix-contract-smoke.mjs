import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const matrix = readFileSync(resolve("scripts/production-route-matrix.mjs"), "utf8");
const commandDeck = readFileSync(resolve("public/games/command-center/index.html"), "utf8");
const html = readFileSync(resolve("public/games/swarm/index.html"), "utf8");
const css = readFileSync(resolve("public/games/swarm/styles.css"), "utf8");
const game = readFileSync(resolve("public/games/swarm/game.js"), "utf8");

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
console.log("PASS SWARM route contract: game-specific asset checks, self-hosted fonts and reduced motion.");
