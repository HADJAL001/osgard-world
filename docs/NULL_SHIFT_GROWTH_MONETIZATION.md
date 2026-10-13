# NULL//SHIFT — monetization and viral-growth plan

**Stage:** validation plan, not a forecast or a live payment offer. The game currently has earned credits, persistent upgrades, and cosmetic-only Amber/Violet styles. Real-money checkout is not connected. The browser build must not show a purchase as available until a server can verify payment and entitlement.

## Product loop

1. **Play:** a short extraction raid with clear objectives, readable telegraphs and a visible result.
2. **Return:** UTC daily contracts and a persistent streak create a replay reason. Day 3 adds 100 credits; each seventh consecutive clear adds 300. Missing a date resets the active streak, not the record. No loss of owned items.
3. **Share:** the after-action card communicates eliminations, daily streak and a deterministic challenge code. The referral URL adds the OSGARD referral ID and UTM context. A friend can launch the same dated contract.
4. **Measure invitations honestly:** track invite link opened → first raid started → mission completed through the existing first-party, consent-gated event pipeline. Do not pay referral rewards simply because a client says a friend was invited; verify conversion server-side.
5. **Monetize cosmetics:** suit variations, weapon finishes, extraction effects, victory poses and profile banners. Keep combat power earnable. Do not sell paid damage/health advantages, extra revives or randomized paid loot boxes.

## Pricing hypotheses to validate (not currently purchasable)

- **Free base game:** all combat contracts and progression remain playable without payment.
- **Cosmetic packs:** test price points of $3.99, $6.99 and $9.99 with clear contents and screenshots.
- **Supporter edition:** test $12.99–$19.99 only when there is enough unique cosmetic content to justify the price. Start as a one-time purchase, not a disguised subscription.
- **Season cosmetics:** only once a reliable content cadence exists; publish earnable rewards, end date and ownership terms before sale.

These are test prices, not proven willingness-to-pay. First run consented store-page or landing-page experiments before implementing checkout.

## What a $1M target would require

A million dollars is a target, not a guaranteed result. At $9.99 gross per order, about 100,101 orders are required for $1M gross before taxes, refunds, processing and platform fees. At $19.99, about 50,026 orders are required. Actual proceeds are lower. That requires repeatable acquisition, strong retained cohorts, a valued cosmetic catalog and sufficient eligible audience; it is not achieved by adding a price button alone.

## Proposed validation gates (internal hypotheses, not market benchmarks)

- **Activation:** target ≥70% of launches begin the first raid; ≥50% reach the terminal interaction.
- **Finishability:** target ≥35% of first sessions reach the mission result before scaling acquisition.
- **Retention:** measure D1, D7 and D30 by source/device. Do not scale paid acquisition until D7 retention is repeatable.
- **Virality:** K = invitations per active player × invite-click-to-first-raid conversion. K ≥0.3 is a useful early signal; K ≥1 is the much harder self-sustaining threshold. Count actual new players, not button taps.
- **Monetization:** measure cosmetic-purchase conversion, payer conversion, ARPPU, repeat purchases and refund rate separately from earned-currency spend.

## Safety and technical gates

- Analytics are consent-gated; the game remains playable if analytics are declined or unavailable.
- Local save values cannot be trusted for paid entitlements, anti-cheat or cross-device progression.
- Before real-money sales: build an authoritative entitlement service, verify provider webhooks, make delivery idempotent, implement restore purchase, refunds/chargebacks, regional tax/compliance and support. Never ship payment secrets in the client.
- Before referral rewards: use server-side deduplication, self-referral prevention, fraud/rate-limit controls and a clear privacy notice.
- Do not claim $1M revenue, native 8K, global verified leaderboards or a live real-money store without evidence.
