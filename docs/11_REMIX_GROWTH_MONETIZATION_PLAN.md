# REMIX — growth & monetization upgrade (2026-10-13)

## Why REMIX is the first growth engine

The existing REMIX design centres on create → publish → play → submit record → remix. A social layer belongs inside that loop; forced advertising during play would damage the product promise.

## Implemented

1. **Stable daily seed (UTC).** Newly created challenges use a YYYYMMDD seed and date-specific title through the existing challenge API.
2. **Challenge invitation link.** A share URL carries the opaque challenge ID, seed, short referral token and UTM parameters. On opening the URL, the player is prompted to ask the existing match API to accept the shared challenge. The browser does not invent a score.
3. **Share and clipboard fallback.** Native Web Share is invoked only after an explicit user action; browsers without it fall back to clipboard/prompt.
4. **PNG result card.** After the server reports RESULTS, a branded 1200×630 image contains the challenge ID, seed, result summary and challenge framing. Supported devices can share the image; other browsers download it.
5. **Post-session sponsor inquiry.** A clearly labelled Partner Studio CTA becomes visible only after RESULTS, never over active controls. UTM and the sponsored-event format are passed to the existing inquiry page. No active campaign, ad impression or sponsor deal is fabricated.
6. **Authenticated, consent-gated first-party event logging.** Event uploads use the same-origin `/api/v1/player/events` endpoint only when the player has explicitly opted into analytics and an OSGARD token exists. Guest play is not blocked.
7. **Partner lead attribution.** The Partner Studio form preselects the format and carries allowlisted UTM fields into its user-confirmed WhatsApp draft.
8. **CI gate.** The command qa:remix-growth validates the sharing funnel, daily seed, server-result gating, attribution, analytics access checks, and existing Unity WebGL route before the self-hosted deploy stage.

## Growth metrics

Event funnel:
- challenge_created
- share_link_copied or share_dialog_opened
- challenge_invite_accepted
- game_session_started / game_session_completed
- result_card_exported / result_card_shared
- partner_cta_clicked

Measure share intent rate, challenge acceptance, same-challenge rematches, post-session partner click-through, and qualified sponsor inquiries. UTM identifies source/campaign but does not prove a sale. Current client event upload is authenticated-only; anonymous guest invite attribution requires a privacy-reviewed server endpoint or equivalent server-side capture.

## Hypotheses to validate (not benchmarks)

- At least 15% of test players completing a run try to share a challenge or result card.
- At least 10% of referral visits that reach the match start accept the same challenge.
- Daily seed increases repeat starts on a later UTC day.
- Post-session sponsor CTA produces qualified inquiries without interrupting gameplay.

Run a 30–50 person playtest first. Compare a basic URL share to the PNG-card share. Do not claim real viral coefficient, retention or revenue until events from a real cohort confirm it.

## Monetization stages

**Now:** inquiry-only sponsored challenges, branded levels, sponsored challenge series and custom mini-game development through Partner Studio.

**Later, after traction:** creator templates, branded themes, expanded public challenge collections and creator analytics. These should not increase score power in ranked modes.

**Only after separate billing work:** paid creator packs/subscriptions. Server-side entitlement storage, webhook signature verification, idempotency, refunds and support processes are prerequisites.

**Ad networks:** only after a provider and distribution platform are chosen. Follow platform rules; advertising belongs at natural breaks/results, with rewarded video requiring explicit opt-in. Never place ads over controls or count placeholders as impressions.

## Sources for implementation rules

- MDN Web Share API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API — requires a secure context and user gesture; support differs by browser.
- CrazyGames ad requirements: https://docs.crazygames.com/requirements/ads/ — only permitted SDK-requested ads, no interruptions of active gameplay, user consent for rewarded video.
- CrazyGames monetization guide: https://docs.crazygames.com/resources/ad-monetization-guide/ — natural breaks and pacing.
- Steam Workshop: https://partner.steamgames.com/doc/features/workshop — UGC needs platform integration and moderation design.
- Steam demos: https://partner.steamgames.com/doc/store/application/demos — a polished demo can support purchase evaluation but does not guarantee conversion.

## Privacy and embedded-player safeguards

- Optional REMIX events are sent only if the catalogue's explicit opt-in key `osgard.games.analytics-consent.v1` is `yes` **and** an authenticated OSGARD access token is available. Guests can still play, create challenges, accept invites, share links and download result cards without analytics requests.
- The sponsor enquiry CTA appears only after the match API reports `RESULTS` and opens in a new tab with `noopener noreferrer`, so it cannot replace the game inside its host iframe.
- Consent withdrawal at the catalogue disables future REMIX telemetry; this page does not write a new consent choice on the player's behalf.

