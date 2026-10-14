# OSGARD WORLD — 30 consent, privacy and reliability improvements
Date: 2026-10-14
Repository: `HADJAL001/osgard-world`
Branch: `feat/platform-analytics-consent-30-20261014-rebased`

## Scope

The existing platform already has an opt-in analytics queue in the static Games experience. This release closes a gap in the React portal's shared event queue and puts the same choice directly into the root portal. It does not enable ads, Stripe live checkout, Premium entitlements or any new external tracker.

## The 30 implemented safeguards and UX improvements

1. One shared consent key is used by the portal and Games hub: `osgard.games.analytics-consent.v1`.
2. Missing consent defaults to off.
3. Only the literal stored value `yes` permits analytics.
4. Storage read exceptions fail closed.
5. Root portal events are still usable as ephemeral return values without being persisted.
6. New events are not written to the local analytics history before opt-in.
7. New events are not written to the pending delivery queue before opt-in.
8. The flush routine refuses to run without consent.
9. Existing bearer-authentication requirements remain unchanged.
10. The player API client independently checks consent before a request.
11. Consent is checked again immediately before the event POST.
12. A queue batch checks consent before each event.
13. A queue batch checks consent after each awaited request.
14. A revoke during an in-flight request stops subsequent events from being sent.
15. Revocation writes `no` before trying to clean local records.
16. Revocation removes the portal event history key.
17. Revocation removes the portal pending-event queue.
18. Revocation removes the shared Games analytics retry queue.
19. Granting consent clears any prior analytics records before saving `yes`.
20. Pre-consent events cannot be replayed after later opt-in through these queues.
21. Favorites are not deleted by consent changes.
22. Recent-game history is not deleted by consent changes.
23. Game progress is not deleted by consent changes.
24. Event history and retry queues retain the existing 50-record bound.
25. The single-flight flush guard remains in place.
26. Pending events are re-read after network work so newly queued events are not silently lost.
27. Cross-tab consent withdrawal triggers local analytics cleanup.
28. Returning to a visible tab retries only when consent remains enabled.
29. The new root-portal control displays explicit RU/EN status with `aria-pressed` and a live status region.
30. The control includes a privacy-policy route, keyboard-operable native button, mobile layout and reduced-motion support; a CI smoke check protects the contract.

## Validation

Run:

```sh
npm ci
npm run qa:core-analytics-consent
npm run check
npm run build
```

The consent smoke test is network-free and uses a test storage adapter. The repository's frontend validation workflow runs it on pull requests. This source change is not itself a production deployment. The code will be published only after the rebased change passes CI, merges to master and the production deploy workflow passes. External analytics availability, legal compliance, and production user behavior still require separate verification.

## Commercial activation limits

- The code continues to require explicit consent and authenticated access for the root player-event endpoint.
- No ad network, rewarded video, live payment processing or paid subscription was activated.
- Revocation cannot retract data already transmitted before the browser receives the revoke action; the UI states the scope of local cleanup.
