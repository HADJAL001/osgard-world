# OSGARD WORLD Games — repository audit
**Review date:** 2026-10-13  
**Scope:** public GitHub repository `HADJAL001/osgard-world`, default branch `master`. The production website could not be inspected directly in the available browser tool; live responses, DNS, server state and deployments are therefore not asserted here.

## Confirmed architecture
- React 19 + TypeScript + Vite 6; `three` is installed for interactive/3D surfaces; `lucide-react` supplies icons.
- `src/main.tsx` is the SPA route switch; Vite history fallback is configured by Nginx `try_files $uri $uri/ /index.html`.
- `src/core/manifest.ts` contains the typed list of game routes/events. `src/core/eventQueue.ts` stores a limited local event queue and attempts sync via the existing player API when an auth token exists.
- Production is containerised (Docker/Compose, Nginx) and the deployment guide explicitly requires safe staging, route checks, TLS and a rollback directory.
- Existing games are not one-engine monoliths. They are different implementations and should remain independently updatable.

## Game-entry inventory from repository
| Game | Entry point used by this branch | Runtime notes |
| --- | --- | --- |
| ИМПЕРИЯ ВРЕМЕНИ | `/games/time` | React/TypeScript route; state, save and game diagnostics live in `src/TimePrototype.tsx`. |
| SWARM | `/games/swarm/index.html` | Standalone browser game; dedicated touch controls are present in markup. Online rooms require the game API. |
| NULL//SHIFT | `/games/null-shift/index.html` | Standalone browser game with `game.js`, a 3D engine module, canvas and mobile controls. |
| INHERIT | `/games/inherit/index.html` | Self-contained HTML game, local save logic, manifest and service worker. |
| REMIX | `/games/remix/index.html` | Standalone web entry; network features depend on the Remix backend/API. |

## Concrete issue found
The original `OSGARD_GAMES` manifest pointed NULL//SHIFT to `/games/null-shift-godot/index.html`, while the checked-in public game is `public/games/null-shift/index.html`. This branch corrects the catalogue manifest to point at the present web build. A legacy page at /games/null-shift-godot/ now forwards to that browser build instead of implying that Godot .wasm/.pck export files are published. A separate export should be linked only when its actual artifacts are present and tested.

## Implemented in this feature branch
- Shared premium Games catalogue at `/games` and details at `/game/:slug`.
- Legacy `/entertainment`, `/entertainment/` and `/entertainment/index.html` converge on `/games`: the SPA handles the alias and exact Nginx locations return a permanent redirect while leaving unrelated nested assets untouched.
- Search by title/genre/mechanic, category/device filters, locally stored favourites and recent game.
- Game details with controls, platform notes, features, launch iframe, full-screen control, standalone fallback and related games.
- Consent-gated optional catalogue events, clear local data behavior, sharing and separate outbound ecosystem project links.
- Development lead form that prepares an email; no fake server-side form submission.
- Draft privacy/terms pages that disclose remaining limitations.
- Brand SVG favicon and sitemap entries for catalogue/detail pages.
- Smoke script for catalogue routing, file existence, consent gating, project links and basic responsive/accessibility requirements.

## Not represented as completed
- No live production deploy was triggered by this branch.
- No ad network, reward video SDK, checkout/payment provider or subscription engine is connected.
- The existing event queue is not a complete anonymous analytics warehouse or admin dashboard.
- The lead form opens a mail draft; server-side lead storage/CRM is not connected.
- Touch-control claims are based on repository markup and game code inspection, not a full device-farm test.
- Domain availability, current site contents, business ownership, brand legality and trustworthiness of external projects still require owner verification. One public reputation page currently raises warnings for some young domains; such third-party scores are not a legal finding and should be manually reviewed before sending paid traffic there.

## Safe next step
Merge only after CI passes. Then use the repository's documented staging publisher with dedicated deployment credentials, verify the route matrix and public container health, and keep the rollback build until smoke tests pass.
