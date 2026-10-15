# OSGARD Premium Trend Lab

Date: 15 October 2026

## Purpose

The Premium Dashboard now supports a local time-series view across previously exported aggregate reports. It extends the two-report comparison workspace without adding new API calls, backend storage, or AI-provider dependencies.

## Workflow

1. In Premium Intelligence, export a JSON report from each desired time point.
2. Open “Trend Lab · история Premium-отчётов”.
3. Select 2–10 report JSON files. Each file is limited to 2 MiB, with a combined import cap of 10 MiB.
4. Review the time-ordered headline, alert, per-currency, action-availability and source-quality series.
5. Export a normalized JSON or formula-safe CSV if a separate record is needed.

The importer validates and normalizes each file, drops unexpected fields, sorts by generatedAt, and rejects duplicate timestamps. The normalized snapshots and chart data stay in memory only and are cleared on page exit.

## Metrics and gaps

- Headline series include paid-order count, total-order count and paid-record share.
- Each currency remains its own independent series for Commerce gross, service gross/refunds/net, paid orders and paid/refund events.
- A missing currency is a gap (currency-not-reported), not a zero.
- Missing plan engine data is a gap, not a statement that there were zero recommended actions.
- Alert counts by severity, action availability and source-quality states can be compared across snapshots.
- Data Quality Ledger source statuses are shown as a table by report timestamp; older reports without a ledger are marked as missing metadata.
- CSV/JSON exports include state and missing-reason fields, report timestamps, source-window notes and interpretation caveats.

## Interpretation boundaries

A trend across snapshots is not automatically a synchronized cohort or a causal effect. The Commerce order ledger is cumulative while some event reports use 30-day and lead attribution uses 90-day windows. Differences can reflect different windows or data availability rather than business movement. Currencies are never added together and no exchange rate is inferred.

## Privacy and security

- No uploaded file is sent to a server; the import handler has no fetch, XMLHttpRequest, or sendBeacon calls.
- No localStorage/sessionStorage writes and no OpenAI request.
- Rendering uses DOM text nodes and SVG primitives instead of injecting imported strings as HTML.
- CSV output neutralizes leading spreadsheet formula characters.
- Only the normalized allow-listed aggregate fields are retained; arbitrary JSON keys are discarded.

## Tests

Run:

    npm run qa:commerce-intelligence

The suite covers chronological ordering, bounded import count, duplicate-timestamp rejection, per-currency series, gap states, missing actions, quality-status history, CSV formula injection and local-only import behavior.
