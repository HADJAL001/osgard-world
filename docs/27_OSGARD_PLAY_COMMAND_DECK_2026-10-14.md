# OSGARD PLAY Command Deck — 14 October 2026

## Audit findings

The public repository HADJAL001/osgard-world uses React 19, TypeScript and Vite. It already has eleven game routes, a Games catalogue, a separate Entertainment catalogue, game detail pages, consent-gated analytics, a financial scenario model, campaign administration, partner inventory, operator route diagnostics, Growth Studio, Commerce API client, privacy and terms pages, plus external-project health checks.

Rebuilding those surfaces independently would duplicate existing work and introduce multiple sources of truth. This change adds an operations layer that links and measures existing systems instead of replacing them.

## What this change adds

- A responsive Command Deck at public/games/command-deck/ with game inventory, on-demand same-origin route checks and an exportable JSON report.
- Checks are bounded to seven seconds each and run with at most four concurrent requests. They send no OSGARD analytics, credentials, identifiers or personal data. Results remain in current-tab memory until the operator requests an export.
- An HTTP response proves route reachability only. It does not prove successful gameplay, mobile compatibility, WebGL performance or completion of the game loop.
- The page imports the existing public/games/monetization/model.js financial model and uses its scenario normalizer, three scenarios and annual-goal reverse calculation. It does not introduce a competing revenue formula.
- Finance results are explicitly labelled modelled assumptions, not observed visitors, confirmed impressions, purchases or live revenue. Traffic sensitivity is displayed at minus 25%, base and plus 25%.
- Cross-promotion links are built from the ten fixed first-party OSGARD destinations. Campaign slug validation blocks arbitrary URL input. Links contain UTM source, medium, campaign, project, and game attribution tags.
- The UI links into existing Operations, monetization, campaign manager, partner inventory, Growth Studio, device diagnostics, Commerce Admin and Development pages.
- The tool does not store admin tokens, approve advertisers, activate paid placements, initialize checkout or enable rewarded ads.

## Monetization / safety boundaries

The existing Commerce API configuration stays authoritative. A blank API URL is treated as a safe fallback, not as a working payment integration. The optional Commerce health check is only marked ready if the server identifies itself as osgard-commerce-api and explicitly reports databaseReady=true.

No third-party ad SDK, payment provider, subscription activation or reward callback was added. Those integrations require approved ad accounts, deployment of the Commerce API/database, verified server-side payment webhooks and legal/product review. Existing admin routes retain their own server-side authorization.

UTM tags alone do not prove conversion. A destination must be instrumented and report the resulting event before OSGARD can attribute a lead or sale.

## Validation

Run these scripts in the repository root after checkout and dependency installation:

- npm run qa:command-deck
- npm run qa:games-model
- npm run qa:production-routes
- npm run check
- npm run build

The new smoke script validates assets, all eleven game IDs, model behavior under bounded values, zero-traffic behavior, scenario consistency, attribution links, responsive/reduced-motion CSS and inclusion in the production route matrix and sitemap.

This pull request must pass the repository CI and production-route gate before release. A manual browser check remains required for desktop and narrow mobile viewports.

## Explicit non-claims

- This change does not deploy or change the production site.
- An HTTP success does not certify all gameplay.
- External project health is not inferred from links; the browser is not used to bypass cross-origin security restrictions.
- No real users, conversions, ad impressions, purchases or income are invented.
- Financial outputs are estimates from declared inputs, not a guarantee of revenue.
