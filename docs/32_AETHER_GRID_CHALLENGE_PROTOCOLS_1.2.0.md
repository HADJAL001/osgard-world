# AETHER GRID 1.2.0 — Challenge Protocol Forge

## What changed

AETHER GRID keeps its shared UTC daily puzzle but now lets a player choose one of four rule sets:

- **STANDARD** — hints, undo and redo are available.
- **NO HINTS** — the hint action is disabled.
- **NO UNDO** — undo/redo are disabled and do not accumulate history.
- **IRON CIRCUIT** — both hints and undo/redo are disabled.

The protocol selector is available above the puzzle board. Applying a new protocol navigates to the same UTC puzzle with the selected `protocol` URL parameter. The daily seed is independent of protocol, so friends face the same starting board while the rules change.

## Persistence and sharing

- Existing STANDARD run, best-score and personal-stat keys are preserved.
- Non-standard runs use a protocol-suffixed local progress key.
- Best scores use a protocol-suffixed key, preventing a relaxed run from replacing an Iron Circuit record.
- Shared invite URLs include `og_day` and, for non-standard modes, `og_protocol`.
- The invitation landing forwards only allow-listed protocol IDs and a validated calendar date to the standalone AETHER GRID route.
- Cancelling the native share sheet is not counted as a completed share by the existing game logic.

## Trust boundaries

Progress, scores and protocol state remain in the current browser. The challenge URL is editable and is not a signed result or proof of fair play. There is no global leaderboard, server-verified score, monetary prize or claim that social networks confirm a post. The four modes improve repeat play and friend-to-friend comparison, but do not by themselves establish viral growth or revenue.

## Verification

`npm run qa:games-detail` checks:

- protocol selector, labels and lifecycle integration;
- hint and history restrictions per protocol;
- separate best/progress keys and preservation of the legacy STANDARD keys;
- protocol-specific invite generation and forwarding;
- the single inline game controller parses successfully;
- the production route matrix uses whitespace/quote-tolerant semantic checks for the CASCADE LAB 0.26.0 service worker rather than relying on one exact minified string.

The release still requires the complete GitHub Actions deployment and post-deploy production-route matrix to pass.
