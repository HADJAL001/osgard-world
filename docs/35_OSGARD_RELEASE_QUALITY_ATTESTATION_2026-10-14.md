# OSGARD release manifest bound to product quality

Date: 14 October 2026

## One artifact manifest, one source of release evidence

OSGARD already creates `release-manifest.json` during `npm run preflight:frontend`. The manifest contains immutable source metadata, toolchain versions, a sorted per-file inventory, individual SHA-256 hashes, aggregate size and a deterministic tree digest.

This quality upgrade does not introduce a competing manifest. It extends the existing manifest with a `qualityGate` block containing:
- schema of the Contract Integrity Engine report;
- SHA-256 of the exact `osgard-contract-audit.json` bytes;
- normalized contract fingerprint;
- number of checks, passes and warnings.

The preflight refuses a missing, malformed, blocked or inconsistent contract report. The verifier checks the current report against the manifest and re-hashes the public artifact tree, including detection of additions, removals, changed bytes, symlinks and secret-like files.

## Recommended release sequence

    npm ci
    npm run check
    npm run qa:contracts
    npm run build
    npm run preflight:frontend
    npm run release:verify

The same sequence is enforced in release readiness and frontend CI. Production deployment also runs contract checks before staging an artifact. The AI reviewer can receive `release-readiness.json`, `osgard-contract-audit.json`, `release-manifest.json` and `production-route-matrix.json` after the optional manual approval to call OpenAI.

## OpenAI advisory review

The existing Responses API reviewer sends only bounded, minimized JSON summaries. It uses Structured Outputs, `store:false`, no tools and no source tree or player data. If any input report is blocked, mismatched or contains failed checks, deterministic overrides force `hold` even when the model says ready. Human review is always required.

The manual workflow input is opt-in because the API call can incur charges and requires a configured `OPENAI_API_KEY` secret. CI never triggers a paid API call automatically.

## Security limits

SHA-256 is an integrity mechanism, not a digital signature and not independent proof of who published the artifact. Preserve release evidence with the immutable commit SHA and trusted GitHub Actions run. No production deployment is performed by the test workflow; post-deploy HTTP route checks and rollback controls remain required.
