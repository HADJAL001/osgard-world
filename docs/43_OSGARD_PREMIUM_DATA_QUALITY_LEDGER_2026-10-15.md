# OSGARD Premium Data Quality Ledger

Date: 15 October 2026

## Why it exists

The Premium Command Dashboard uses several aggregate sources with different retention windows. A visually tidy dashboard can accidentally imply that all displayed numbers describe the same cohort or that a missing field means zero. The Data Quality Ledger makes source availability and comparison limits visible at report level.

## Source ledger

The report adds `dataQuality` using schema `osgard.commerce-data-quality.v1`. It lists seven sources:

- Commerce order ledger (cumulative available order records).
- Service integration reporting (30 days).
- Consented analytics events and funnel (30 days).
- Paid game attribution (30 days).
- Lead attribution (90 days).
- OSGARD SELECT impressions/clicks (30 days).
- Product experiment aggregate (source API window; confirm exposure definition).

Each source is labelled measured, partial, unavailable, or blocked based on field presence, basic schema validity and source-specific warnings. This is **not** a statistical confidence score and not an independent audit.

## Interpretation controls

The ledger explicitly states:
- Currencies remain separate and no exchange rate is silently applied.
- Cumulative orders cannot be compared as if they were a 30-day event cohort.
- Lead attribution's 90-day window is not synchronized to the 30-day sources.
- Missing fields remain unknown; they are not replaced with zero.
- Analytics events are consented events, not unique people.
- Aggregate counts do not prove causality or audited revenue.

## Dashboard and exports

The responsive “Качество и сопоставимость данных” panel shows each source's state, time window, fields, row counts, source warnings and interpretation note. JSON includes the ledger; CSV exports source status/window and caveats; Markdown action-plan export includes the same report-level limitations.

The panel is intentionally deterministic and uses no model or additional API request. It renders strings using text nodes, does not read customer records, and does not store the admin token.

## Test

Run:

    npm run qa:commerce-intelligence

The suite covers measured/partial/unavailable/blocked states, malformed source fields versus valid zero records, missing-window caveats, absence of a fabricated confidence percentage, and the dashboard rendering/export contracts.
