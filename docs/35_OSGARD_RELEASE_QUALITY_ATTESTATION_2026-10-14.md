# OSGARD release quality attestation

Date: 14 October 2026

## Purpose

OSGARD now has three linked release checks:

1. The Contract Integrity Engine checks whether the product registry is consistent across the catalogue, JSON-LD, launchers, diagnostics, referrals, recommendation graphs, production route matrix, generated share cards, and sitemap.
2. The app-shell performance gate measures raw/gzip/Brotli sizes, enforces JS/CSS/HTML transfer budgets and produces a report with a content-based asset inventory hash.\n3. The release attestation inventories the exact production build, hashes every file, rejects secrets/symlinks/special entries, and detects additions, omissions or modifications.

The release attestation binds both passing reports to the built artifact. Its qualityGate and performanceGate objects record stable fingerprints, SHA-256 of each exact JSON report, check counts, pass/warning totals, and critical gzip transfer size. Verification requires both reports to remain byte-for-byte identical and ready.

## Recommended release sequence

Run from the repository root:

    npm ci
    npm run build
    npm run qa:contracts
    npm run preflight:frontend
    npm run release:attest
    npm run release:verify

release:attest requires osgard-contract-audit.json and osgard-performance-budget.json, and refuses to create a release attestation from a blocked, malformed, or missing report. release:verify compares the attested build file inventory and both exact reports. If either report changes after attestation, verification fails even if the static build files are unchanged.

The release-readiness GitHub Actions workflow runs the contract audit before building, then creates and verifies the attestation and uploads the release evidence artifacts.

## What this protects against

- Post-build additions, removals and changes inside the artifact directory.
- Secret-like files or symlinks included in the frontend artifact.
- A release being paired later with a different contract-audit report.\n- Replacing or mutating the measured performance budget after the artifact was attested.
- Missing or blocked product-contract checks in the release attestation path.
- Accidental drift across independently maintained game catalogue and routing surfaces.

## Security boundary

The attestation and report use SHA-256 for integrity. They are NOT a digital signature and do not prove the identity of the person or runner that produced them on their own. Preserve the report and attestation as CI artifacts associated with the immutable commit SHA; use GitHub's trusted workflow record, branch protections and release permissions to establish provenance. This system does not deploy to production or replace the post-deployment HTTP route matrix and manual browser/device QA.
