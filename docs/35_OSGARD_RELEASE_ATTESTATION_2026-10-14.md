# OSGARD Release Attestation

The release attestation is a machine-readable inventory of the exact static build, not a marketing badge or a cryptographic signature.

## Usage

After building the website:

    npm run build
    npm run release:attest
    npm run release:verify

The create command writes \`release-attestation.json\` outside \`dist/\`. Verify re-hashes every file and fails when the build has a missing, extra, modified, linked, or credential-like file.

## Evidence included

- Repository/ref/commit metadata selected from GitHub Actions environment variables, package version, and Node version.
- SHA-256 and byte size for every file under dist, in stable sorted-path order.
- A root SHA-256 over the canonical path/size/file-digest inventory. The fingerprint excludes timestamps and CI run metadata, so identical bytes produce the same root fingerprint.
- Total and per-kind byte counts, the 12 largest files, warnings for JavaScript chunks larger than 600 KiB, source maps, or total output larger than 100 MiB.
- Hard failure if index.html is absent/empty, any symlink/special file appears, or sensitive filename patterns (for example private-key files and production .env files) are included.

The command has no external dependencies and makes no network requests. The JSON file contains build metadata and public artifact names only; it must not include secrets.

## Integrity boundary

This protects against accidental mutation, incomplete copying, stale artifacts and obvious secret files. SHA-256 metadata is not a digital signature: an attacker who can replace both the build and attestation can recompute both. For stronger provenance, preserve the artifact from a trusted GitHub Actions run and use GitHub's artifact access controls / attestation facilities. This report also does not prove live deployment health; use the production route matrix after deployment.
