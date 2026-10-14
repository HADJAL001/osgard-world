# OSGARD PLAY — Smart Launch and Release Gate
Date: 14 October 2026
Repository: `HADJAL001/osgard-world`
Branch: `feat/osgard-play-smart-launch-release-gate-20261014`

## Why this pass exists

The portal already has a premium game catalogue, 11 game routes, local favorites/history, Player Lab, contextual recommendations, consent-gated analytics, game diagnostics, a PWA shell, a partner directory, Growth Studio and Commerce API scaffolding. The improvement therefore does not replace the catalog or add another account system. It helps players choose a safer first launch on their current device and increases the coverage of the release gate.

## Player-facing change

The new Smart Launch panel:
- Checks whether this browser can create WebGL 2/WebGL 1 contexts.
- Notes whether a touch-capable input is present, whether the browser reports offline, whether a data-saver/slow-network signal is available, and whether reduced motion is preferred.
- Uses a declared heavy-WebGL profile only for NULL//SHIFT and REMIX; it does not infer that every other game is compatible.
- Recommends a first game using the capability signals and lets the player reversibly hide only the heavy WebGL profiles when the runtime signals look constrained.
- Never blocks a game launch and keeps an explicit override.
- Adds small status chips beside catalog cards and a keyboard-operable, mobile-responsive panel.
- Honors `prefers-reduced-motion`.
- Runs locally in the page. It has no network calls, analytics events, cookies, or local/session storage. Capabilities are not sent to OSGARD.

The widget's values are compatibility hints, not a performance benchmark, proof of touch support inside each game, or a guarantee that the next game will start. Browser WebGL APIs and network hints can be missing or intentionally restricted.

## Release engineering change

The release readiness runner now runs the new Smart Launch contract test and additional existing release checks covering mobile PWA, Player Lab, campaign controls, recommendations, operations diagnostics, analytics consent and queue behavior, privacy controls, asset checks, ecosystem integrity and the Cascade Lab experiment dossier.

The runner reports per-check durations and a compact summary alongside the existing per-check output. Existing critical failures still block the report; the new checks do not activate payment, sponsor or analytics services.

## Safety / commercial boundaries

- No ad network was activated.
- Stripe live payments and OSGARD PREMIUM remain governed by existing server-side feature flags and secrets.
- The Smart Launch profile is not transmitted or retained.
- No user count, ranking, revenue or engagement figure is synthesized.
- Third-party project descriptions and connectivity still require a separate timestamped healthcheck; a browser launch hint is not a claim that an external service is online.

## Validation

Run:

```sh
npm run qa:device-fit
npm run check
npm run build
npm run qa:release
```

The Smart Launch smoke test is deterministic and does not request external services. Full browser/device QA and production route verification are still required before the feature should be described as proven on all phones or GPU configurations.
