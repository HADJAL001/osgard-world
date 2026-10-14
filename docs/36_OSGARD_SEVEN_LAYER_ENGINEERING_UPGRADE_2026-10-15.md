# OSGARD seven-layer engineering upgrade

Date: 15 October 2026

This change set improves one release path from source correctness through release evidence. The goal is not a marketing claim about being years ahead; it is to make product drift and release regressions expensive to ship and cheap to detect.

## Seven delivered improvements

1. **Registry contract gate.** A deterministic offline audit cross-checks the core manifest against catalogue cards and JSON-LD, diagnostics, player launchers, post-session recommendations, invite allow-lists, share-card generation, production route probes, sitemap URLs, analytics consent boundaries and current documentation. It emits stable IDs and actionable missing/extra entries in a JSON report.
2. **Catalogue scaling.** Share-state normalization and selected-game favorites no longer use a hard-coded eleven-item ceiling. The allow-list determines the valid set with an independent cap of 100; tests cover 12 valid games plus an adversarial 120-ID input with duplicates and unknown IDs.
3. **SEO and route discoverability.** Missing canonical URLs for TIME, SWARM, NULL//SHIFT and INHERIT are added to the sitemap. The contract gate prevents future manifest routes from silently disappearing from the route matrix or sitemap.
4. **Release-version contract.** CIVIC CASCADE smoke checks read release.json and require the exact HTML release marker, release ID and package version to agree rather than relying on a stale hard-coded version string.
5. **Per-file and aggregate performance budgets.** A standalone gate checks individual JavaScript/CSS/HTML assets, total JavaScript/CSS/HTML, complete distribution size and estimated gzip transfer weight. It produces a machine-readable report and blocks releases that exceed budget.
6. **Adversarial quality tests.** Tests cover oversized assets, missing entry points, symbolic links, deterministic budget fingerprints, tampered contract/performance reports and blocked quality gates.
7. **Proof-carrying release.** The file-by-file build attestation binds the exact passing contract report and performance-budget report by SHA-256. If either report is altered after attestation, verification fails. CI uploads the reports and attestation as release evidence.

## Local command sequence

Run from the repository root:

    npm ci
    npm run qa:contracts
    npm run qa:performance-budget-tests
    npm run qa:release-attestation
    npm run check
    npm run build
    npm run qa:performance-budget
    npm run preflight:frontend
    npm run release:attest
    npm run release:verify

Expected artifacts are osgard-contract-audit.json, osgard-performance-budget.json and release-attestation.json. The reports are build/release evidence, not analytics and do not transmit player data.

## Performance thresholds

- One JavaScript/MJS/CJS file: 640 KiB.
- One CSS file: 384 KiB.
- One HTML file: 400 KiB.
- Aggregate JavaScript: 8 MiB.
- Aggregate CSS: 4 MiB.
- Aggregate HTML: 6 MiB.
- Estimated gzip weight for text assets: 8 MiB.
- Entire published distribution: 45 MiB.

These are regression guards, not targets to grow up to. A team can lower them after measuring the deployed experience. The report includes the fifteen largest files to make regressions actionable.

## What was deliberately not done

No production deployment, data migration, or authenticated API mutation is triggered by this change. Passing source contracts does not prove that every production URL is live, that every device renders identically, or that the service is fast from every geography. Production route checks, browser/device QA and real-user performance measurements remain separate evidence.

The release attestation uses SHA-256 for integrity; it is not a digital signature. Keep the attestation and reports associated with the immutable Git commit and trusted CI workflow record.
