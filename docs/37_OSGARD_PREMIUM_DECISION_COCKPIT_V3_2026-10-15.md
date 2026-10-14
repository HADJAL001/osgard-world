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
