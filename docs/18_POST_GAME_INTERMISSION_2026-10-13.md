# OSGARD PLAY — between-worlds intermission

**Date:** 13 October 2026  
**Scope:** canonical Entertainment route `/entertainment`, which redirects to `/games/`.

## Interaction
- A formal `osgard:game-completed` event continues to show the existing result/intermission module.
- If a player has started a session and presses the player close/back button or Escape, the first action ends the session and turns the dialog into a Between Worlds chooser. The player can choose one of the selectable OSGARD service cards, share an invite, pick a related game, or close once more to return to the catalogue.
- The iframe is blanked and hidden while the intermission is shown, so no live game keeps running behind the service chooser. Starting another game clears the old intermission.
- A failed launch or a game that never entered a confirmed session does not force the intermission.

## Owned services, referrals, and rewards
The screen reuses ten first-party OSGARD service cards. Active cards open in a new tab with UTM campaign parameters; GARD VPN remains explicitly inactive until availability is confirmed. Cards are selectable and voluntary, not forced redirects or overlays during a live round.

Share controls expose Telegram, WhatsApp, VK, X and Facebook links plus the browser share/clipboard action. A successfully resolved native share or successful clipboard write may earn +50 local SHARDS no more than once a day on the current browser/device. The social-network link path asks the player to self-confirm; the site cannot verify that a post was actually published. SHARDS are local demo points, are not cash, and are not an account-backed or payment entitlement.

Event metrics remain opt-in and should not be interpreted as proof that a social network delivered a message, a unique person opened it, or revenue resulted. The intermission promotes first-party services; it is not a connected third-party ad network, and no fictitious ad impressions are generated.

## Validation and publication
The Games portal smoke suite covers the new close/back and Escape event, the three recommendation modules, rendering the service/reward panel, and dismissing it when the next game launches. CI and the existing deployment workflow remain the release gate; the live website should only be called updated after production route checks pass.
