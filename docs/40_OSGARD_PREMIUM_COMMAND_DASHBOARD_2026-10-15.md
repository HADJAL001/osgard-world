# OSGARD Premium Command Dashboard

Date: 15 October 2026

## Delivered block

The closed Commerce Admin page now includes a Premium Command Dashboard that derives a compact decision report from the existing authenticated `/v1/admin/overview` aggregate. It does not add a new network request, persist the operator token, or fetch customer/order lists into the analytical engine.

## Metrics contract

- **Commerce orders ledger:** paid orders and gross paid totals are grouped by currency from `grossPaidByCurrency`.
- **Service attribution ledger:** reported paid events, gross, refunds and net are grouped by currency separately from commerce orders. They are shown side by side and never added into one mixed number.
- **Recorded order state:** the paid-order share is paid order records divided by all returned order records; it is not a payment processor success probability.
- **Event funnel:** catalog-view/start and start/completion ratios use consented event counts from the same 30-day overview. They are not user-level or cohort conversion rates.
- **Attribution coverage:** unassigned game IDs are counted from paid-attribution rows. Source tags are classifications, not proof of causality or unique identity.
- **Owned-promotion performance:** service CTR uses measured visible impressions/clicks and labels samples under 30 impressions as small. No experiment winner is automatically selected.

## Alerts

The signal feed calls out missing registered orders/revenue, missing game attribution, suspicious negative service-reported net, elevated refund-event ratios, missing consented events and premium page views without paid order records. Those are investigation prompts, not automatic actions or proof that a provider/payment path is broken.

## Safe exports

The JSON/CSV buttons export only the derived aggregate report: KPI counts, currency-level totals, event ratios, service-level promo aggregates and fixed diagnostic messages. Customer emails, order IDs, raw event rows, tokens and payment secrets are not fed into or emitted by this engine. CSV fields are quoted and formula-prefixed values are neutralized.

## Tests

Run:

    npm run qa:commerce-intelligence
    npm run qa:games-operations

Tests cover currency separation, exact large integer minor units, zero/three-decimal currencies, missing denominators, negative service net and refunds, attribution gaps, small samples, CSV formula injection, page integration and the no-network/no-storage boundary.

## Interpretation boundary

The dashboard is a management view over the API's existing aggregates, not audited financial reporting. Currency figures are pre-fee and pre-tax. Service conversions are reports from integrated OSGARD services, not independent processor statements. Analytics are consented events and do not mean unique people. No production deployment or payment setting is triggered by this feature.
