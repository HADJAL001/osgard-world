# NULL//SHIFT — growth, virality and monetization

## Product principle

First make a raid satisfying, the result understandable, and the next visit worth it. Monetization should never sell combat power or interrupt the core mission. The first implementation is in Godot: one deterministic daily challenge, one daily completion reward, a shareable challenge link and an earned-credit cosmetic vault.

## Growth loop

1. Mission: terminal → quantum core → extraction. The result card records eliminations, payout and career progress.
2. Return: the UTC date selects one of the three contracts with a deterministic code of the form NS-YYYYMMDD-Cn.
3. Invite: share the result; a friend opens the same contract. No currency is granted just for clicking Share.
4. Progress: successful raids earn credits; credits can buy combat upgrades or visual-only suit cosmetics.
5. Collection: the Style Vault offers Amber for 450 and Violet for 750 earned credits, with no gameplay-stat effects.

## Monetization phases

### Implemented
- Earned soft currency from missions.
- Two persistent cosmetic styles purchased with earned credits.
- A 400-credit successful daily challenge reward, once per UTC day.
- A result card with a challenge share link.

### Proposed — do not show as purchasable until payments exist
- Cosmetic Supporter Pack: test a €3.99–€5.99 one-time price, with three suits, a result-frame and a visual dash trail.
- A free Season Zero progression track, then a cosmetic-only paid branch only if retention and willingness-to-pay are demonstrated.
- Verified invitation rewards for both players only after the referred player completes a server-verified first mission.
- No loot boxes, pay-to-win stats, energy gates, or payment-to-continue mechanics.

Before real-money sales: integrate checkout, verify webhook signatures, persist entitlements server-side, handle refunds/chargebacks, implement anti-abuse controls and publish accurate terms. Browser/client state cannot be trusted as proof of purchase.

## Metrics and experiments

| Metric | What it tests |
|---|---|
| Game start / first mission completion | Launch friction and tutorial clarity |
| D1 / D7 retention | Whether the daily loop earns repeat visits |
| Daily challenge start → completion | Whether the challenge is fair and readable |
| Share sheet → link open → friend's first completion | Actual invite conversion, not vanity shares |
| Cosmetic shop view → purchase | Willingness to pay without combat advantage |
| Payer conversion, refunds, net revenue per active player | Sustainable commercial value |
| FPS / frame p95 / load errors by device | Whether growth introduces performance regressions |

## What one million dollars would require

First define whether the goal is gross revenue or net contribution and over what period. Illustrative arithmetic, not a forecast: at $5 net contribution per unique payer, 200,000 unique paying users are needed for $1 million; at $10, 100,000 are needed. These counts exclude fixed team costs and depend on reach, retention, conversion, fees, taxes, refunds and acquisition cost. Until real audience and payment data exist, a reliable revenue forecast is not possible.

## Current limitations

Daily challenges, credits, cosmetic ownership and the daily claim date currently live in local Godot career storage. A knowledgeable user can edit local saves. This is appropriate for prototype validation, but it is not secure remote reward accounting and must not be used for cash-value entitlements. Global rankings, referral verification, payments and cross-device ownership need an authoritative backend.
