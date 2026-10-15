# OSGARD Premium Decision Ops · session review register

Date: 15 October 2026

## What it adds

The Premium Command Dashboard now includes a human-operated review queue next to the deterministic decision plan. Each action can be marked:

- Open
- Investigating
- Blocked
- Checked (the manual check was completed; this is not a claim that the underlying issue is resolved)

The register keeps the stable action ID, source alert ID, severity, source label, owner, effort, rationale, check steps, review status, short operator note, review timestamp, and the timestamp of the source report.

## Operator workflow

1. Refresh the authenticated aggregate overview.
2. Use the Decision Ops filter/search to focus on a status, source, owner, or action.
3. Set the review status, add a note of up to 240 characters, and press “Save review”.
4. Export the complete register as JSON, CSV, or Markdown.

The filters change only the view. Exports include the complete register for the current report, not just the filtered cards. The review is reset when a new report starts loading and when the page exits; it exists only in JavaScript memory in the current tab.

## Privacy and safety

- There is no API call, browser-storage write, cookie access, or OpenAI request for the review workflow.
- Notes that resemble bearer tokens, common Stripe secrets, private-key headers, or key/value secrets are rejected.
- Rendering uses DOM nodes and textContent. CSV values are quoted and formula-prefixed content is neutralized.
- The register is not a financial ledger, not an audited record, and does not change orders, payments, launch flags, or experiment configuration.
- Do not put customer personal data or secrets into review notes. Exported files can contain operator notes and must be stored according to the team's access rules.

## Validation

Run:

    npm run qa:commerce-intelligence

Tests cover accepted/rejected statuses, timestamp validation, length limits, secret-like notes, source linkage, ignoring actions absent from the current report, count summaries, CSV formula injection, Markdown format, and absence of network/storage calls in the browser handler.
