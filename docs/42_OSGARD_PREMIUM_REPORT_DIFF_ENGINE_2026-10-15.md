# OSGARD Premium Report Diff Engine

Date: 15 October 2026

## Purpose

The Premium Command Dashboard can now compare two previously exported aggregate JSON reports. This is a local browser operation and does not require new backend endpoints or a new model/API call.

## Workflow

1. Export the current Premium report as JSON.
2. In a later session, export another report after loading fresh server aggregates.
3. Select the earlier JSON in “Сравнение с прошлым отчётом”.
4. Review count/percentage deltas, per-currency changes, and the alerts/actions that are new, changed, or no longer present.
5. Export the comparison as JSON or formula-safe CSV if an offline record is needed.

The imported file is capped at 2 MiB, parsed and normalized in memory, and removed from in-memory state on page exit. It is not sent to the Commerce API, uploaded to another service, or stored in localStorage/sessionStorage. Only expected aggregate fields are retained; additional JSON fields are ignored.

## Comparison semantics

- Currency ledgers are compared only within the same currency. There is no cross-currency sum.
- A currency present in one report but missing in the other is marked “new” or “not in current”; it is never treated as a zero balance.
- Invalid or absent numeric values stay unavailable and produce no delta.
- Alert and action lists are compared by their stable source IDs. “Not in current” means absent from the newer snapshot, not proven resolved.
- The report shows both snapshot timestamps and warns if the current report is older than the baseline.
- Order records are cumulative while services/analytics may use a 30-day window and lead attribution may use 90 days. Deltas are therefore snapshot comparisons, not synchronized cohorts or causal evidence.

## Security and privacy

The comparator accepts only the supported aggregate-report schema and caps the number of currency, alert and action rows. The browser uses DOM text nodes for display, never injects imported strings as HTML, and exports CSV with formula-injection neutralization. There are no new network calls, cookies, browser-storage writes or OpenAI calls.

## Tests

Run:

    npm run qa:commerce-intelligence

Coverage includes valid and invalid report shapes, per-currency minor-unit arithmetic, missing-currency semantics, alert/action changes, CSV injection and assertions that baseline JSON is not uploaded.
