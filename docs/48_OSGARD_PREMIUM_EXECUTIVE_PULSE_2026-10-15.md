# OSGARD Premium Executive Pulse

Date: 15 October 2026

## Purpose

Executive Pulse is the first-screen decision layer in the Premium Command Dashboard. It compresses the existing aggregate Commerce Intelligence report into a readable state, a short evidence trail and up to three next actions. It does not create new metrics from customer data and does not execute recommendations.

## State precedence

The state is deterministic and derived only from the current report:

1. **blocked** — the report schema is invalid, or one or more sources are explicitly blocked. Do not interpret the headline values as a complete picture.
2. **critical** — one or more critical alerts exist. This remains visible even if other source quality metadata is missing.
3. **attention** — at least one warning needs investigation.
4. **limited** — quality metadata is unknown/incomplete, or one or more sources are partial/unavailable, with no higher-priority alert state.
5. **monitoring** — no critical/warning alerts, quality is complete, but informational signals remain.
6. **clear** — no critical/warning/informational alerts under the current rules and all declared source inputs are structurally complete.

“Clear” is deliberately not “healthy” and does not guarantee the absence of a business problem. The dashboard never produces an unexplained numeric health/confidence score.

## Headline evidence

- Critical alerts and warnings from the deterministic alert rules.
- Measured sources out of declared source count. This is source-coverage, not a statistical confidence percentage.
- Paid-order records from the Commerce API; the dashboard labels these as records, not unique customers.
- Up to three actions sorted by severity; each has owner, effort, a first step and a reference back to the full alert/action plan.

The action list is capped at five items in the report object and three in the visible summary. Full reports and the existing Decision Ops register remain available for deeper review.

## Safety and privacy

- Data is sourced from the existing aggregate-only report. No new API endpoint or analytics collection is introduced.
- API-derived strings are rendered through DOM text nodes and textContent, not HTML interpolation.
- No customer, email, payment-intent or authorization data is read by this layer.
- Currency totals remain separated. No multi-currency arithmetic or invented zeros for unknown inputs.
- Recommendations are explicitly read-only; payments, prices, refunds, promotion settings and experiments are never modified.
- CSV/Markdown exports include the same summary and reasons, with the existing spreadsheet-formula escaping preserved.

## Validation

Run:

    npm run qa:commerce-intelligence

The tests cover clear/critical/attention/limited/blocked states, unknown quality, precedence of critical alerts over missing quality metadata, bounded/sanitized action data, CSV/Markdown export, accessible UI wiring and text-only rendering.

## Extension rule

Any future status change must include a state-table test for: invalid schema, critical signals, warnings, partial/unavailable quality, informational-only signals and fully complete/no-alert reports. Do not add weights, percentages or a machine-learning risk score unless the underlying evidence, calibration and limitations are explicitly defined.
