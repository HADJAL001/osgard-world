# OSGARD LiveOps premium analytics dashboard

Date: 15 October 2026

## Overview

The private LiveOps dashboard at `/games/admin/` now supports comparative KPIs and more resilient refresh behavior while remaining read-only. It uses the existing protected same-origin API endpoints; it does not invent metrics or call a third-party analytics service.

## Operator workflow

1. Enter the server-issued `MODERATION_ADMIN_TOKEN`. The token remains only in the current tab's JavaScript memory and is cleared on disconnect.
2. Choose a quick period (24 hours, 7, 30 or 90 days) or enter a custom start/end. Custom ranges must have start before end, end no more than five minutes in the future, and duration at most 366 days.
3. Leave comparison enabled to fetch a prior interval with the same duration. KPI tiles show absolute differences and percentage change where the baseline is non-zero. A zero baseline is labelled explicitly rather than emitting misleading infinity/100% values.
4. Optionally enable a 60-second refresh. It runs only while the tab is visible, is off by default, and stops on disconnect.
5. Export either the protected event stream (JSONL) or a filtered aggregate report (CSV). CSV output uses formula-injection protection and excludes paths with common personal/secret field names.

## Reliability and data boundaries

- Concurrent refreshes cancel the prior request; stale responses cannot overwrite a newer date range.
- Requests have a 15-second timeout.
- A failed refresh preserves the last successful snapshot on screen and marks it stale; it does not replace real values with zeros.
- Cohorts and snapshots can fail independently while the current summary still renders, with a degraded status message.
- The KPI helper is a dependency-free first-party script with a testable contract for labels, comparison math, period presets and range validation.
- All requests are same-origin, credentials are not persisted by this page, redirects are rejected, and there is no automatic analytics event submission.
- The dashboard shows only fields exposed by the protected API. A higher event count is not automatically treated as business success; direction indicators describe arithmetic movement, not causal impact.
- The existing notice remains authoritative: this page cannot report visits, ad revenue, payment conversion or premium entitlements unless those data are genuinely integrated into backend endpoints.

## Verification

Run:

    npm run qa:liveops-dashboard

This command validates both the static dashboard security/UI contract and the analytics-core math. The same check runs in frontend CI and release-readiness CI.
