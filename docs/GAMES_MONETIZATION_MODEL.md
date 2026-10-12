# OSGARD WORLD Games — monetization plan and illustrative model
**Status:** planning model only; not actual platform earnings. The repository currently does not implement live ads, paid entitlements, or checkout for this catalogue.

## Recommended rollout
1. Start with playable catalogue, consent-gated first-party events, favourites/recent, cross-promotion and qualified game-development leads.
2. Confirm actual traffic, session length and outbound-conversion baselines before adding ad SDKs.
3. Run one clearly labelled sponsor placement outside game input surfaces. Keep sponsor campaign data separate from organic game content.
4. Consider reward ads only in game designs where the reward is optional, disclosed and confirmed by a trusted ad SDK callback / server-side verification.
5. Introduce paid expansions only after a real payment provider, webhook signature verification, idempotent order handling, refund path and server-side entitlement checks exist.
6. Pilot subscription only after multiple games produce repeat usage and a cohort has shown willingness to pay. Do not build a subscription backend ahead of demand.

## Illustrative scenarios
All figures below are **hypothetical assumptions**, not estimates derived from analytics. Revenue excludes VAT/tax obligations and costs not explicitly listed. Contribution per won development client is an assumed margin after delivery cost; it is not gross contract value. A real forecast must replace these assumptions with measured data.

### Formulae
- Players starting a game = monthly website visits × start rate.
- Ad impressions = visits × start rate × sessions per starter × ad opportunities per session × fill rate.
- Advertising revenue = impressions ÷ 1,000 × effective CPM.
- Gross digital sales = players starting × buyer conversion × average order value.
- Payment fee = gross digital sales × assumed processor percentage.
- Development contribution = visits × lead rate × close rate × contribution per won client.
- Illustrative operating result = ad revenue + gross digital sales + development contribution − payment fee − assumed fixed monthly cost.

| Input/result | Conservative | Base | Optimistic |
| --- | ---: | ---: | ---: |
| Monthly site visits | 5,000 | 20,000 | 100,000 |
| Game-start rate | 25% | 35% | 45% |
| Players starting | 1,250 | 7,000 | 45,000 |
| Sessions per starter | 3 | 4 | 5 |
| Ad opportunities per session | 2 | 3 | 3 |
| Fill rate | 45% | 65% | 80% |
| Effective CPM | €1.50 | €3.00 | €6.00 |
| Estimated served impressions | 3,375 | 54,600 | 540,000 |
| Estimated ad revenue | €5.06 | €163.80 | €3,240.00 |
| Buyer conversion of game starters | 0.2% | 1.0% | 1.5% |
| Average order value | €4 | €5 | €7 |
| Gross digital sales (not implemented) | €10.00* | €350.00 | €4,725.00 |
| Assumed payment fee | 3% | 3% | 3% |
| Monthly leads (visits × lead rate) | 7.5 | 50 | 350 |
| Lead rate | 0.15% | 0.25% | 0.35% |
| Won-client rate | 10% | 15% | 20% |
| Contribution per won client | €300 | €700 | €1,000 |
| Fixed costs assumed | €50 | €150 | €500 |
| **Illustrative monthly operating result** | **€194.41** | **€5,603.30** | **€77,323.25** |

*Conservative sales are calculated from 1,250 × 0.2% × €4 = €10 (before fees). Expected counts are fractional averages; real orders/clients are discrete and highly variable.

The optimistic case assumes 70 won projects per month (350 leads × 20%). This might exceed one developer's delivery capacity, so capacity, lead qualification, refunds, payment disputes and acquisition cost must be modeled before using this scenario. Do not show these scenarios as observed or guaranteed income.

## Tracking plan
With valid consent where required, log catalogue viewed, search/filter use, game detail opened, launch clicked, launch fallback used, game session completed (only if a trusted completion signal exists), outbound project click, CTA click and lead handoff. Avoid recording free-text briefs, contact details, full URLs containing secrets, or invasive identifiers. Deduplicate event IDs. Keep aggregate metrics, operational logs and payment ledger separate.

## Monetization boundaries
- No fake impressions/clicks; no hidden redirects; no ads over controls; no auto-playing reward ads.
- Reward ad grant must be bound to a provider completion token and idempotency key; never trust an arbitrary browser boolean.
- Purchases/subscriptions require server-side signed webhooks, transaction idempotency, server-issued entitlements, refund handling and support contact.
- Consent must be specific, easy to decline, and changeable. A consent banner by itself does not establish legal compliance.
- Verify ad-network approval and audience/geo rules before shipping any SDK.
