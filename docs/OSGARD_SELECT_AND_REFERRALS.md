# OSGARD SELECT: own-service intermission and referrals

Updated: 2026-10-13.

## Runtime behavior
- The Games hub shows the OSGARD SELECT intermission after every game completion or a launched session returning to the catalog by default.
- The intermission is a clearly labelled house promotion: "РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD". It does not simulate third-party ads or autoplay a service.
- Players can select services, filter by category, choose every game / every third game / off, or skip the current promotion. These preferences are local to their browser.
- The main Entertainment gateway exposes the same preference editor and writes the exact same localStorage contract, so choices carry between `/entertainment` and `/games/` in that browser.
- GARD VPN remains selectable with an explicit availability warning because its live status has not been independently confirmed; do not treat it as a verified operational destination.
- Only services marked available and selected by the player appear as clickable promotion cards. GARD VPN remains out of the live promotional deck pending availability confirmation.
- The highlighted service rotates through selected available services from one distinct game session to the next; other selected services remain available to explore.
- Links use UTM source/medium/campaign/content tags. Clicks and owned-promotion impressions are submitted only when analytics consent is enabled. Preference-save and skip events use the same consent gate.

## Referral reward
- The post-game reward section creates an invite link, opens native sharing/copy, and provides links for Telegram, WhatsApp, VK, X, and Facebook.
- +50 SHARDS is a local, once-per-UTC-day, per-browser reward. It is not money, a purchasable balance, or a server-verified post. A social platform does not provide this site a reliable confirmation that a post was published; manual confirmation is disclosed in the UI.
- The invite/referral events are measurable only when consent is enabled and the configured /commerce-api accepts the event. These metrics do not by themselves prove downstream sales or revenue.

## Monetization status
This is owned-service cross-promotion and lead generation, not a paid third-party ad network. The sponsor inventory remains inquiry-only; external ad SDKs, real paid reward ads, and checkout remain inactive until provider approval, server verification, legal review, and production keys are available.

## Test coverage
scripts/games-portal-smoke.mjs covers the default frequency, all ten selectable service preferences (nine currently promoted), unavailable-service exclusion, rotating spotlight, category filters, skip behavior, and the referral reward disclosure.
