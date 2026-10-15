# OSGARD Premium Decision Continuity and Trend Intelligence

Date: 15 October 2026

## Executive summary

This upgrade adds two offline capabilities to the existing Premium Command Dashboard:

1. **Decision Ops carry-forward** — the operator can export a review register as JSON and later import it against a newly loaded report. Only status/note/timestamp values whose stable action IDs still exist in the current plan are carried forward. Old actions are ignored, duplicate IDs and malformed entries are rejected, notes that resemble secrets are rejected, and a prior-snapshot warning is shown.
2. **Trend Intelligence** — a deterministic analysis layer on top of the existing 2–10 snapshot Trend Lab. It surfaces threshold-bound reasons to investigate source-quality regressions, increases in critical/warning alerts, a material reduction in the recorded paid-order share, and decreases in the cumulative paid-order count.

No new API endpoint, database, browser storage, AI provider, or background service is introduced.

## Decision Ops continuity

### Operator workflow

1. Load the current aggregate report.
2. Update statuses and notes in Decision Ops.
3. Export the review register JSON.
4. After a later refresh, import that JSON in the Decision Ops panel.
5. The importer matches by exact action ID only. Matching statuses are restored; IDs no longer present are counted as ignored. A zero-match import is rejected without mutating current state.
6. If the imported register is from an older snapshot, the UI explicitly warns that the statuses require re-checking.

This is still user-controlled, tab-memory-only state. The dashboard does not persist review notes in localStorage/sessionStorage or send them to the API. JSON is an operator-managed file and should be stored with appropriate access controls.

### Import controls

- Maximum file size: 1 MiB.
- Maximum review rows: 500.
- Exact schema match: `osgard.commerce-review-register.v1`.
- Duplicate and invalid action IDs are rejected.
- Notes use the existing 240-character, secret-like-content and timestamp validation rules.
- Unknown/obsolete action IDs are never attached to a different action by title or fuzzy matching.

A status of “Проверка выполнена” remains a record of a manual check, not proof that the underlying signal has been resolved.

## Trend Intelligence rules

Trend Intelligence requires at least three normalized snapshots, then compares the last two snapshots while retaining the full history as context. It reports the observed values, fixed threshold, rationale, and manual verification steps.

| Rule | Trigger | Meaning |
|---|---|---|
| Source quality regression | A reported source moves to a less available state such as measured → partial/unavailable/blocked | Check the source contract and last successful update; the engine does not diagnose the cause |
| Critical-alert increase | At least one additional critical alert; an increase of two or more receives critical priority | Review the new alert set and whether source definitions changed |
| Warning growth | At least three additional warnings | Compare alerts and source/schema warnings |
| Paid-order share drop | Decrease of at least 15 percentage points | This is the share of recorded order rows in status paid, not payment-success probability or a cohort conversion rate |
| Cumulative paid-order count decrease | Any decrease between snapshots | Reconcile source filters, corrections, deletions and API definitions |

Missing data is a gap, not zero. If a source or denominator is absent, the engine skips the comparison and reports the skipped count. It does not compute a blended currency total, estimate revenue impact, infer causality, or label a snapshot with an artificial confidence percentage. “No threshold rule triggered” is not a claim that the business is healthy.

### Exports

Trend signals can be exported separately as JSON or formula-safe CSV. The report includes a schema version, the snapshot count, thresholds, severities, signal source IDs, observed values, caveats and manual steps. CSV is UTF-8 with BOM and CRLF rows; formula-leading text is neutralized.

## Privacy and security

- No requests are made when importing prior review JSON or calculating trend signals.
- Neither feature reads or stores cookies, localStorage or sessionStorage.
- The imported review file is bounded, normalized against current action IDs, and does not carry unrelated report/customer/order fields into the current register.
- Trend inputs are normalized using the existing aggregate-report schema; imported labels are rendered with DOM text nodes, not as HTML.
- The rules are deterministic and human-in-the-loop; they do not refund orders, change settings, pick experiment winners or trigger deployments.

## Validation

Run:

    npm run qa:commerce-intelligence

Coverage includes trend threshold triggers, minimum history, gaps in quality metadata, formula-safe CSV output, export contract markers, review-register carry-forward, stale snapshot warnings, duplicate IDs, secret-like notes, zero-match rejection and assertions that import/export remains local-only.
