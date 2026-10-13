# OSGARD PLAY — Daily Circuit: discovery, sharing and sponsor funnel

**Date:** 13 October 2026  
**Status:** implementation in the game-growth branch; no production deployment implied.

## Shipped in this change

The Games hub gains two daily routes using existing gameplay mechanics:

- **SIGNAL RUN:** a UTC-date seed produces the same daily obstacle sequence for players opening the same date. Best score and streak remain local; no global leaderboard is claimed.
- **NULL//SHIFT:** the route uses the game's date-derived contract code `NS-YYYYMMDD-C1..C3`. The code formula is mirrored from the Godot contract selector and checked by the catalogue smoke suite.

The circuit is generated from UTC date, not the visitor's local timezone. Share URLs preserve the date/contract and use the referral parameters expected by each game's current invitation path. Invite codes are opaque and contain no account or contact identity.

## Growth loop

1. Visitor sees two exact daily routes in the hub.
2. Play opens the existing embedded player.
3. Web Share or clipboard copies a direct daily route.
4. A recipient opens the same daily variant and plays.
5. Only a successfully resolved share promise or clipboard copy can emit `share_created`; canceling the native share sheet and manual prompt fallback are not counted as successful shares.
6. Route starts use the existing consent-gated, authenticated `game_opened` event. Session starts/completions remain owned by each game.

Analytics is optional. Guests can play and share without authentication; server events are sent through the existing bridge only with consent and an OSGARD token. Share events do not prove message delivery, recipient identity or a viral coefficient.

## Commercial path

The circuit includes a clearly labelled **sponsor inquiry** to the existing Partner Studio form with UTM parameters. It is not an ad impression, active advertiser or paid placement. It offers a concrete format to discuss: a branded daily route, sponsor frame on a result card, or a one-off challenge series. Sponsored content must be labelled in-game and on result/share artifacts.

No ad network or payment flow is enabled. NULL//SHIFT's earned-credit cosmetics remain separate from real-money purchases. Paid packs, ads and subscriptions require server-side entitlements, refunds, provider approval, consent and legal readiness first.

## Measurement and rollout gates

Use current consented, authenticated event types: `game_opened` with source `daily_circuit`, `share_created` with that source, the game's own session start/completion events, and partner-page/qualified inquiry events when the API supports them. Treat visitors without consent/authentication as unobserved, not zero.

Run a 30–50 person playtest. Compare normal catalogue discovery with the Daily Circuit. Validate that people understand the UTC reset, share the same date/code and can open the same route on a second device. Stop or revise if local saves, server results or reset timing are misunderstood.

## The $1 million target is scenario arithmetic, not a promise

At **$5 net contribution per unique payer**, $1,000,000 requires **200,000 unique payers** before fixed team costs; at **$10**, it requires **100,000**. A viral loop changes acquisition math only if measured invitation-to-completion and retention data support it. Sponsor deals, ad fill, payer conversion, taxes, fees, refunds and team/server expenses must be measured separately.
