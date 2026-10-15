# OSGARD release-gate semantics

Date: 15 October 2026

## The two environments are not interchangeable

A pull request is a source candidate; it is not the live website. Comparing the candidate's route markers or Vite bundle with the already deployed site will often produce a legitimate difference. That difference must not be presented as a source/build failure.

The one-pass plan therefore has two classes of evidence:

- **Blocking source gates:** typecheck, dependency audit, application tests, catalog and privacy contracts, production build, asset budgets, archive preflight, and release-file integrity.
- **Live deployment evidence:** production route matrix and bundle consistency. During pull-request validation this appears as REVIEW because the revision is not deployed. After a successful deploy (`workflow_run`) or an explicit manual release run, it is blocking.

The release-readiness report uses `review_required` when all blocking checks pass but live verification is deferred. A `blocked` report still exits non-zero.

## Bundle integrity

The live bundle audit compares `https://osgard.world` with `dist/index.html` when a build artifact exists. This is the meaningful post-build/release comparison. Only when no build artifact exists does it fall back to the documented bundle marker, and the report explicitly labels that evidence source. A stale documentation marker must not override a fresh build artifact when they disagree.

## Catalogue and diagnostics contracts

The production route matrix reads the checked-in fallback catalogue as the canonical list of game IDs and launch paths. The public Commerce catalog and static fallback must expose the same unique IDs and canonical hrefs; their expected cardinality is derived from this list rather than a duplicated integer. Diagnostics are checked against their current declared count (31), with the route contract smoke test preventing a stale count from returning.

## Operator interpretation

- `ready`: blocking checks passed and live verification, when required, matched.
- `review_required`: blocking source/build checks passed, but one or more non-blocking or deferred checks need review.
- `blocked`: at least one blocking check failed.

Neither `ready` nor `review_required` is proof of legal approval, payment-provider correctness, real user conversion, physical-device compatibility, or uptime outside the exact routes probed. Production release still requires checking the post-deploy GitHub Actions run and its route evidence.
