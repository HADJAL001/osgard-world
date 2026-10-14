# OSGARD LIVEOPS — premium dashboard upgrade

Date: 15 October 2026

## What changed

The operator analytics dashboard now compares the selected period with the immediately preceding window of the same duration. It requests the same summary endpoint for both windows, and only compares numeric metrics that the API returned in both responses. Missing fields are not fabricated as zeroes; when the prior value is zero, the UI displays the change in absolute terms and deliberately omits a percentage.

Quick period presets support 24 hours, 7 days, 30 days and 90 days. Custom ranges are validated before requests: start must precede end, the end cannot be in the future (with a small clock-skew allowance), and the selected range is bounded to 366 days.

The current and previous values are shown as premium comparison cards with visual bars and explicit direction labels. The page explains that an increase is not automatically a positive outcome. JSON and CSV exports include both periods and the comparison result; CSV escaping continues to guard spreadsheet formula injection.

## Concurrency and secrets

Every refresh run has a monotonically increasing sequence and an AbortController. A newer range selection aborts the old request; stale responses cannot paint over current results. Invalid ranges cancel any outstanding refresh. Disconnecting aborts refresh, authentication and export requests, increments the request epoch, clears the in-memory token and report, and hides the dashboard. The operator token is not written to localStorage, sessionStorage or cookies.

All API requests remain same-origin, use no-store cache behavior, omit redirects, and send the operator token only in the required request header. No third-party scripts were added.

## Validation

Run:

    npm run qa:liveops-dashboard

This runs unit tests for date range validation, period arithmetic, KPI extraction and comparison behavior, followed by a source/inline-JavaScript smoke test for the dashboard's privacy and concurrency contracts.

The dashboard continues to show only actual server-returned aggregates. This change does not fabricate revenue, ad performance, unique visitors or any metric not returned by the backend.
