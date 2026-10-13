# OSGARD PLAY — Between Worlds intermission

**Date:** 13 October 2026  
**Canonical route:** `/entertainment` redirects to `/games/`.

## Player flow

- A confirmed game completion keeps its existing result and next-game recommendations.
- When a player closes or presses Escape during an active session, OSGARD PLAY stops the iframe and opens the Between Worlds chooser before leaving the player.
- The chooser presents optional OSGARD service cards, game recommendations and sharing controls. Starting another game removes the previous chooser.
- A failed launch or a client that never starts a confirmed session does not force the intermission.

## OSGARD SELECT and SHARDS

The service shelf promotes ten owner-listed OSGARD projects with UTM-tagged links. The cards are voluntary and open in a new tab. The shelf is explicitly disclosed as OSGARD self-promotion; it is not a connected third-party ad network or an external paid ad impression. GARD VPN stays non-clickable until availability is verified.

Players may share an invite through Telegram, WhatsApp, VK, X, Facebook, the browser Share API or clipboard. The prototype can award **+50 local SHARDS once per UTC day per browser/device** after a confirmed native-share handoff, successful copy, or the player's own confirmation after using a social composer. The website cannot reliably verify an actual publication on those social networks. SHARDS are non-monetary local demo points, not cash, account-backed credits, or a purchase entitlement.

## Revenue and measurement boundaries

- The promotion shelf is a first-party cross-promotion format, not a reported paid ad campaign.
- Analytics remains opt-in; link creation and referral opens do not prove message delivery, a unique new player, a completed session or revenue.
- Revenue dashboards are scenario tools until fed with verified orders and observed retention cohorts.
- Real checkout stays disabled until the Commerce API origin, database, Stripe test products/secrets/webhook and refund/entitlement handling have been configured and tested.
- Do not enable third-party ads or claim sponsor revenue without a provider/account or signed commercial placement.

## Validation

The `qa:games-portal` suite checks the active-session close/Escape path, the service/reward chooser, game recommendations, and dismissal on the next launch. The guarded production deployment and route matrix remain release gates.
