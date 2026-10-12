# OSGARD PLAY — illustrative commercial model

**All figures below are planning assumptions, not measured OSGARD audience, quoted advertising rates, or guaranteed revenue.** The site currently has no live ad network and no checkout. Actual ad/purchase/subscription revenue from the new Games hub is therefore zero until those integrations and traffic exist.

## Calculation model

- Starts = monthly visits × start rate.
- Sessions = starts × sessions per starter.
- Filled ad impressions = sessions × ad requests per session × fill rate.
- Ad revenue = filled impressions ÷ 1,000 × assumed net eCPM.
- One-time purchases = visits × conversion × assumed average purchase value.
- Subscription revenue = visits × assumed subscriber conversion × assumed monthly price.
- Qualified project leads = visits × lead conversion. Expected projects = leads × close rate.
- Project revenue = expected projects × assumed average project contract. Delivery cost is modelled as 65% of project revenue, leaving a 35% contribution before platform overhead.
- Estimated operating result = ad revenue + purchases + subscription + project contribution − monthly operating overhead.

Purchase/subscription assumptions are hypothetical and disabled in the current product. Expected fractional transactions describe a long-run mathematical average, not literal partial purchases.

## Three monthly scenarios (USD)

| Input / result | Conservative | Base | Optimistic |
|---|---:|---:|---:|
| Visits | 5,000 | 25,000 | 100,000 |
| Game-start rate | 20% | 28% | 35% |
| Starters | 1,000 | 7,000 | 35,000 |
| Sessions per starter | 1.5 | 2.1 | 2.5 |
| Sessions | 1,500 | 14,700 | 87,500 |
| Ad requests per session | 2 | 2 | 3 |
| Ad requests | 3,000 | 29,400 | 262,500 |
| Assumed fill rate | 50% | 65% | 80% |
| Filled ad impressions | 1,500 | 19,110 | 210,000 |
| Assumed net eCPM | $0.80 | $1.50 | $3.00 |
| **Hypothetical ad revenue** | **$1.20** | **$28.67** | **$630.00** |
| One-time purchase conversion | 0.05% | 0.15% | 0.35% |
| Assumed one-time purchase value | $4 | $5 | $7 |
| **Hypothetical one-time purchase revenue** | **$10.00** | **$187.50** | **$2,450.00** |
| Subscriber conversion | 0.02% | 0.05% | 0.15% |
| Assumed monthly subscription price | $3.99 | $4.99 | $6.99 |
| **Hypothetical subscription revenue** | **$3.99** | **$62.38** | **$1,048.50** |
| Lead conversion | 0.10% | 0.25% | 0.40% |
| Qualified leads (expected) | 5 | 62.5 | 400 |
| Lead-to-project close rate | 2% | 4% | 5% |
| Expected projects | 0.1 | 2.5 | 20 |
| Assumed average contract value | $1,000 | $1,500 | $2,500 |
| Project revenue | $100 | $3,750 | $50,000 |
| Assumed delivery cost (65%) | −$65 | −$2,437.50 | −$32,500 |
| Project contribution | $35 | $1,312.50 | $17,500 |
| Assumed monthly overhead | −$250 | −$1,000 | −$5,000 |
| **Illustrative operating result** | **−$199.81** | **$591.04** | **$16,628.50** |

No row is a statement of current traffic, rate cards, bookings, sales, signed projects or profit. The optimistic case is especially sensitive to a high lead conversion and closed projects; it must not be mistaken for a likely outcome.

## Sensitivity

- Advertising scales linearly with traffic, start rate, sessions per starter, ad slots, fill and net eCPM. Example: at the base session assumptions, halving filled impressions or eCPM halves the already-small modeled ad result.
- Every 0.1 percentage-point change in project-lead conversion at 25,000 visits adds/removes 25 leads before close-rate assumptions. At a 4% close rate, $1,500 contract and 65% delivery costs, this equals $525 expected project contribution per month.
- Subscription conversion should be validated using a non-binding pricing / wait-list test before real checkout is built. Do not market a price point as market-validated based on this table.
- Purchase economics must deduct payment fees, VAT/sales taxes, refunds, disputes, support, platform fees and ongoing game/content maintenance.
- Operating expenses should include hosting/CDN, server games, security, support, legal/accounting, creative production, payment/ad management and customer acquisition. The placeholder overheads here do not claim to cover the full operating business.

## Recommended measurement sequence

1. Establish consented, privacy-reviewed analytics and verify event delivery and deduplication.
2. Run several weeks of real traffic data before estimating sessions per starter, cohort retention and device compatibility.
3. Validate development leads first; track submitted and qualified leads separately and manually reconcile closed contracts.
4. Only after approval from an ad provider, measure served impressions, viewability, fill, net RPM/eCPM, invalid traffic and player experience.
5. Introduce payments only after server-side webhook verification, entitlements, cancellation, refund and fraud handling tests pass.
