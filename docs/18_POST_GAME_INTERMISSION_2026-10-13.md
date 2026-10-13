# OSGARD PLAY — Between Worlds intermission

**Date:** 13 October 2026  
**Canonical route:** `/entertainment` redirects to `/games/`.

## Player flow

- A confirmed completion retains the existing results and next-game suggestions.
- When a confirmed game session is closed or the player presses Escape, the game iframe is stopped and the Between Worlds chooser opens inside the player.
- The chooser reuses OSGARD SELECT, game recommendations and social-share/reward controls. Launching another game clears it.
- A never-started or failed client does not force a post-session chooser.
- The existing outside-player fallback only appears for a confirmed session that is closed by the browser/dialog.

## OSGARD SELECT and SHARDS

The service shelf provides voluntary, UTM-tagged links to owner-listed OSGARD projects. It is labelled as OSGARD self-promotion rather than an external advertising network. GARD VPN remains unavailable in promotional choices until availability is confirmed. Player settings allow choosing individual services and setting the frequency to every completed round, every three rounds, or off; preferences are local to that browser.

Players may share through Telegram, WhatsApp, VK, X, Facebook, the browser Share API or clipboard. The prototype can award **+50 local SHARDS once per UTC day per browser/device** after a confirmed native-share action, successful copy, or player self-confirmation after opening a social composer. The site cannot reliably verify publication on an external social network. SHARDS are local demo points, are not cash, are not account-backed, and do not unlock a paid entitlement.

## Consent-aware promotion analytics

An owned-service exposure is recorded only when an active clickable card is at least 50% visible for one second, and only while analytics consent is on. Clicks and exposures carry both the originating game and service identifier. The protected Commerce dashboard reports exposures, clicks and CTR per service/game for the last 30 days.

These are browser-observed visibility opportunities, not unique people, third-party paid-ad impressions, conversions, or revenue. Link clicks and share actions do not prove delivery, a unique new player, completed referrals, or sustained viral growth.

## Revenue boundaries

- The service shelf is first-party cross-promotion, not a live third-party ad network or paid sponsor campaign.
- Live checkout remains gated until the Commerce API, database, provider secrets/webhook, refund handling and account entitlements are configured and tested.
- Revenue/cohort planners are scenario tools until they use verified orders and observed retention cohorts. A $1M target is an objective, not a guaranteed outcome.

## Validation

The `qa:games-portal` suite covers the return flow, recommendations, service shelf, share reward disclosure and analytics contract. Production release remains gated by frontend validation, Commerce checks, release readiness, and the deployment route matrix.
