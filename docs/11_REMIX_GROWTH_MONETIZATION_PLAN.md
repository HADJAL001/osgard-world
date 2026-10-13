# REMIX — growth & monetization upgrade (2026-10-13)

## Why REMIX is the first growth engine

The existing REMIX design already centres on **create → publish → play → submit record → remix**. A social layer is native to that loop; forcing ads into the active game would damage the product promise.

## Implemented in this branch

1. **Same daily seed (UTC).** New challenges created through the existing server endpoint use a stable YYYYMMDD seed and a dated title. All players use the same seed on that UTC date. The challenge ID and seed are both placed in a share URL.
2. **Invite a friend into the same challenge.** Links include the opaque challenge ID, seed, a short per-session referral token, and UTM campaign parameters. On open, the page asks the match API to accept the shared challenge. The result only appears after the server reports the RESULTS phase; this client never fabricates a score.
3. **One-click share + clipboard fallback.** On HTTPS, the native Web Share API can open the device's share sheet after an explicit click. Browsers without it can copy the invite URL. See MDN's security/compatibility notes below.
4. **Shareable result card.** After a server result, the game can draw a custom 1200×630 PNG card with the challenge ID, seed, result summary and invitation. If file sharing is supported, the native share sheet receives the image; otherwise the user downloads the PNG and can share it manually.
5. **Post-session sponsor lead, not a fake ad.** A visibly marked Partner Studio link becomes available only after the server result arrives. It never overlays active controls. It links to the existing partner brief with UTM tags and a preselected “sponsored event/level” format.
6. **First-party events for signed-in users only.** The page sends growth events through the existing /api/v1/player/events same-origin endpoint only when an OSGARD access token exists. Guests still play/share without signing in. The partner brief carries the campaign attribution into the WhatsApp draft. A share-sheet opening is measured as intent, not proof that the recipient received the link.

## Funnel and metrics

Event sequence:
- challenge_created: daily challenge created by the service.
- share_link_copied or share_dialog_opened: explicit share action.
- challenge_invite_accepted: the server accepted the invited challenge and created a match.
- game_session_started / game_session_completed: server match lifecycle.
- result_card_exported / result_card_shared: result card export/share intent.
- partner_cta_clicked: post-session partner CTA click.

Track the funnel by day and campaign:
- **Share intent rate** = unique share/copy actors ÷ completed sessions.
- **Invite acceptance rate** = accepted challenge sessions with a referral code ÷ share-linked invite visits that reach challenge start. This second denominator needs server-side landing/acceptance capture; until then it remains incomplete.
- **Loop rate** = sessions started through a challenge link ÷ sessions that generated shareable links.
- **Sponsor lead rate** = partner-brief drafts carrying the Remix campaign ÷ partner CTA clicks. This is a draft funnel, not proof that a WhatsApp message was sent or a deal closed.
- **D1/D7 retention**: measure only after session events and authenticated identity are available; do not infer it from local canvas activity.

The signed-in event path is already documented in the Player Data API, but it doesn't yet provide a public, anonymous challenge-conversion endpoint. As a result, guest shares can be generated, while full cohort analytics and anonymous invite attribution remain an infrastructure follow-up. Never show fabricated DAU, conversion, revenue, or “viral coefficient”.

## Monetization: in the right order

### Now — partner studio leads

Sell by inquiry: sponsored challenge series, a branded challenge/level, placement in the catalogue, or custom mini-game development. The live game only displays an explicitly marked partner-inquiry CTA after results. The CTA is not an ad campaign, no ad impression is counted, and no placement is shown as sold. UTM is copied into the manually confirmed WhatsApp brief.

### After product-market evidence — creator packages

Potential paid value: extra creator templates, branded level themes, richer public challenge collections, replay export/creator analytics, and seasonal challenge slots. Cosmetic/editorial value only; no paid gameplay advantage in score-ranked challenges. Keep purchases disabled until a backend entitlement store, payment webhook signature validation, refund policy, and idempotent order handling exist.

### Later — sponsors or ad networks

A sponsored event is easier to sell than an unqualified display banner because the buyer receives a named challenge and a defined result funnel. Require campaign terms, moderation approval, frequency cap, disclosure, and test evidence before activating the placement.

If the game is distributed through CrazyGames, its documentation says only SDK-requested ads are allowed and ads must not interrupt gameplay; rewarded video requires explicit user consent. Use a midgame ad only at a natural result/intermission, never while controls are active. Do not add an ad SDK before the host platform and submission rules are selected.

For a later Steam build, consider a high-quality demo, wishlists and creator events. Steam's official docs support demos, wishlists and user-generated content, but none guarantees sales or visibility.

## Hypothesis test

These are proposed experiment thresholds, not industry benchmarks:
- At least 15% of tested players who complete a run attempt to copy/share a challenge or result card.
- At least 10% of share-link visits start the same challenge after the server accepts it.
- The daily seed should generate repeat starts on a different UTC day; verify with session events, not creator intuition.
- The post-session sponsor CTA should never appear before a confirmed result; the monetization experiment starts with qualified sponsor inquiries, not ad impressions.

Run the test with 30–50 players first, then a larger cohort if the instrumentation is trustworthy. Compare the new share-card flow against a plain URL share. Stop or redesign if users share but friends cannot start the same server challenge, or if the invite rate does not create actual new starts.

## External documentation

- MDN Web Share API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API — secure context, user-initiated calls and target/browser support differ.
- CrazyGames ad requirements: https://docs.crazygames.com/requirements/ads/ — ad SDK rules and non-interruption requirements.
- CrazyGames monetization guide: https://docs.crazygames.com/resources/ad-monetization-guide/ — natural breaks and pacing.
- Steam Workshop: https://partner.steamgames.com/doc/features/workshop — community-generated content requires integration and moderation choices.
- Steam Demos: https://partner.steamgames.com/doc/store/application/demos — a polished demo can support the purchase decision.
