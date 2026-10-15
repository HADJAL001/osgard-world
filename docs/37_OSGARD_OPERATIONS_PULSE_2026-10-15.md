# OSGARD Operations Pulse

Date: 15 October 2026

Operations Pulse turns the read-only Games route checker into a small on-demand quality dashboard. It uses only same-origin GET probes with `credentials: omit`, bounded concurrency, per-route timeouts, and no browser storage. It sends no analytics events and does not perform writes.

## Operator workflow

1. Open `/games/operations/`. The page runs a first pass automatically.
2. Use search, group, and sort controls to focus on an application area or slow route.
3. Review route status, HTTP code, expected content type/marker, latency, and the explanation.
4. Use **Repeat problems** to recheck routes currently marked warning or failure without rerunning the full matrix.
5. Use **Stop** to cancel an active run. Not-yet-started routes are marked cancelled, not passed.
6. Export or copy the JSON report for issue triage. To compare across reloads, import a previously exported baseline JSON; it is read and normalized entirely in the current tab. Use Clear baseline to return to the latest completed full run.

## Performance metrics

- **Median** — middle latency among completed route probes.
- **P95** — nearest-rank 95th percentile of completed probe latency.
- **Slow routes** — probes taking more than 2500 ms.
- **Run comparison** — compares status and latency against the latest completed full run, not a narrower retry run. Status regressions and recoveries are counted separately; latency changes of at least 500 ms are included in detail.

Cancelled probes are excluded from latency percentiles. Metrics describe the observed browser-to-origin HTTP route checks for the current run, not gameplay frame rate, API transaction latency outside the tested routes, user experience percentiles, or a long-term SLO.

## Privacy and limitations

- Every target is a relative same-origin path; the client rejects a changed origin before fetch.
- Probes use GET, `cache: no-store`, `credentials: omit`, and an 8-second per-route timeout.
- No cookies are read or sent intentionally, no browser storage is accessed, and no analytics/event API is called.
- JSON reports can contain route paths, HTTP statuses, response content types, diagnostic messages, timestamps and timing metrics. Review before sharing outside the team.
- Results and the latest full-run baseline remain in tab memory only; reload clears them. Export JSON if retention is required. Imported baseline reports are capped at 2 MiB and validated against current route IDs, paths, state values and timing bounds before use. User-provided labels/details are never rendered from the baseline.
- HTTP availability and a page marker do not prove a playable session, payment completion, authorization for a valid user, production revenue or device compatibility. Use the existing API, runtime, production route and device tests for those claims.
