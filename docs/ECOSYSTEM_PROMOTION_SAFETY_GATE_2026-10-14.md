# OSGARD ecosystem paid-promotion preflight gate

**Date:** 14 October 2026
**Scope:** Automated homepage transport/redirect preflight for the ten owner-listed project domains.
**Status:** Implemented in scripts/external-project-healthcheck.mjs, covered by deterministic smoke tests and the scheduled GitHub Actions report.

## Why

The existing check could record that a domain responded and whether it redirected, but a successful response could be misread as an approval to buy traffic. Reachability, destination integrity, product trust and permission to promote are different questions.

## Rules

- Only an HTTPS final URL is accepted for preflight.
- The final host must match the owner-listed hostname. A plain www. alias is the only automatic hostname normalization.
- HTTP status failures, absent responses, invalid URLs, HTTPS downgrades and unexpected final hosts are marked blocked_*.
- A same-host HTTPS response is only manual_review_required, never approved.
- paidPromotionEligibleCount is always zero in this automated audit. Manual review must happen before a paid campaign is enabled.
- The existing organic ecosystem directory and its owner-provided links are unchanged.
- No ad network is connected by this change, and no running campaign is automatically changed.

## Report semantics

Each result now includes:

- promotionGate: the machine-readable gate status.
- promotionReason: a human-readable explanation.
- destinationHostMatches: whether the final hostname matches the expected host after www. alias normalization.

The schema-v2 report includes promotionGateCounts, paidPromotionBlockedCount, paidPromotionReviewCount, and paidPromotionEligibleCount. The GitHub Actions step summary displays the gate status beside the HTTP result and final hostname.

## Validation

Run:

```sh
node scripts/external-project-healthcheck-smoke.mjs
npm run qa:external-project-healthcheck
```

The deterministic contract covers: same-host HTTPS requiring manual review, www alias, unexpected cross-host redirect, HTTP status failure, HTTPS downgrade, network errors, timeout, retry behavior, and aggregate counts. The scheduled workflow subsequently checks live URLs; those responses may vary by region and do not certify product security or legal compliance.

## Operator runbook before paid promotion

1. Review a recent report artifact and re-run from an independent network if a destination has a transient error.
2. Confirm registrar/DNS control and the final URL / redirect chain.
3. Check the visible business identity, contact details, terms, privacy notice, browser warnings, and primary call to action.
4. Test the intended customer flow without submitting real payment or personal data unless an approved test environment is available.
5. Record the human approval and review date in the campaign/provider workflow before launching ads.
6. Repeat the check before a later paid campaign because external sites can change independently.

The preflight report is not a malware scanner, penetration test, ad-network approval, business verification, legal review, or guarantee of service uptime.
