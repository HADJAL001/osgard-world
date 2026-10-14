# OSGARD Premium Decision Cockpit v3

Date: 15 October 2026

## Delivered

1. Added bounded break-even search using the selected scenario's modeled net operating result.
2. Added an explicit 12-month traffic ramp with monthly detail and cumulative revenue/net values.
3. Added monthly subscriber cohorts with retention for the projection (instead of reusing first-year average subscription revenue as if it were an identical live month).
4. Added one-at-a-time sensitivity rankings for ten drivers, sorted by modeled impact.
5. Added a separate 12-month CSV export for spreadsheet review.
6. Added a browser-local scenario library with named save/load/delete and an eight-snapshot cap.
7. Added a bounded input for monthly traffic growth and bumped model export version to 7.

## Safety and truthfulness

- All new calculations run in the browser from explicitly editable assumptions.
- Saved scenario names are rendered as text, never HTML; storage stores only bounded numeric inputs and timestamps.
- Snapshot storage is local to the browser profile, not account synchronization or server storage.
- No new API call, analytics event, checkout activation or actual revenue integration is created by this feature.
- The screen labels results as a scenario model, not measured KPIs, accounting numbers, or a promise.

## Tests

The existing scripts/games-monetization-smoke.mjs now checks break-even minimality, infeasible break-even, projection horizon and reconciliations, subscriber churn extremes, sensitivity ordering, UI wiring, local snapshots and the projection CSV. The existing npm run qa:games-model pipeline remains the canonical entry point and also runs financial CSV checks.


## Premium Risk & Stress Lab (model export v8)

The cockpit now includes an on-demand local stress simulation for the Conservative, Base, and Optimistic scenarios.

- 100–5,000 iterations; configurable independent assumption shocks from ±0% to ±50%.
- Deterministic xorshift seed for reproducible runs and easy comparison of the same assumptions.
- Year gross and net result P10/P50/P90; share of simulated paths that are non-negative; share reaching the entered annual gross target.
- Average outcome among the worst 10% of sampled annual net results and month-12 lead backlog/capacity indicators.
- A 16-bin distribution view, complete per-draw CSV export, and inclusion of a summary distribution in the local JSON model export.
- Results are invalidated when any business assumption changes. Changing scenario, uncertainty or iteration controls disables export until the run is repeated.

### Interpretation boundary

This is a stress distribution, not a calibrated probability forecast. Selected drivers receive independent uniform shocks around current user-entered assumptions. Their correlations, seasonality, taxes, CAC, provider limitations and real acquisition data are not inferred. A 70% target-hit share means 70% of these generated variations reach the goal; it does not mean a 70% real-world chance of success. No values are uploaded, and the feature makes no API calls.

### Validation added

The premium dashboard smoke tests check fixed-seed reproducibility, alternate seeds, zero-shock reconciliation to the 12-month projection, ordered quantiles, target-share bounds, the histogram sample count, a non-zero seed fallback, iteration/uncertainty caps, and all three selectable business scenarios.
