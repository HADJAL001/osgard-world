# OSGARD Premium Decision Engine

Date: 15 October 2026

## What changed

The Premium Command Dashboard now derives a deterministic action plan from its existing server aggregate report. It adds no API call, does not store the admin token, does not read customer/order lists in the decision engine, and does not call an AI provider.

## Output contract

The report includes `decisionPlan` with schema `osgard.commerce-decision-plan.v1`:
- Stable action IDs linked to the source alert ID.
- Severity ordered as critical, warning, informational.
- An explicit owner area, qualitative effort estimate, rationale and ordered manual check steps.
- `automated: false`, `status: investigate` and `automationEnabled: false`.
- Small-sample warnings for promotional CTRs; the dashboard never automatically picks a winner.
- An interpretation boundary: the plan is an operations checklist, not audited financial reporting or financial advice.

Rules have specific playbooks for refund/paid-event inconsistencies, malformed data, incomplete game attribution, event delivery, missing orders, premium checkouts and experiment exposures. Unknown alert types receive a generic source-check playbook rather than an invented diagnosis.

## User experience

The dashboard displays up to twelve highest-priority actions and gives a Markdown export for the full plan. JSON and CSV exports include the same decision layer; CSV fields remain quoted and formula-neutralized. All untrusted text is rendered with `textContent`, not HTML.

When a refresh starts, prior aggregate results and exports are cleared. If calculation fails, the dashboard clears partial output and disables exports rather than leaving a half-rendered plan that could be mistaken for a current report.

## Data and safety boundaries

- The engine is pure local JavaScript and has no `fetch`, cookie or browser-storage calls.
- It uses only already-returned aggregate fields; currencies and commerce/service ledgers remain separate.
- It does not infer conversion from unrelated aggregate windows, create a mixed-currency revenue total, or estimate ROI.
- Recommended steps are for a human to investigate. The engine never refunds, changes product flags, picks an experiment winner, or edits payment settings.
- No OpenAI request is made for this report. Financial aggregate diagnostics stay in the current authenticated first-party admin flow. A future LLM review should require explicit opt-in, redaction and a separate data-processing boundary.

## Tests

Run:

    npm run qa:commerce-intelligence

The suite covers severity ordering, source-linked actions, read-only contract, small-sample guardrails, Markdown line endings, CSV formula injection, currency separation, malformed data and the absence of network/storage access.
