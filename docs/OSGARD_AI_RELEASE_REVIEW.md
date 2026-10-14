# OSGARD AI Release Review

The AI release review is an optional engineering aid. It never replaces deterministic CI and never deploys production.

## Local offline preview

After a release-readiness report exists, run:

    node scripts/osgard-ai-release-review.mjs --report release-readiness.json

This writes osgard-ai-release-review.json with an input digest and evidence summary. No network request is made. You can run the unit tests without a key:

    npm run qa:ai-release-review

## Explicit OpenAI review

Set OPENAI_API_KEY in your local process environment and, if necessary, OPENAI_MODEL to a model available in your OpenAI API project. Then explicitly opt in:

    node scripts/osgard-ai-release-review.mjs --report release-readiness.json --send-to-openai

The default model is gpt-6-sol; availability and pricing can differ by API project and can change, so override OPENAI_MODEL when required. API calls may incur charges.

The manual workflow is in GitHub Actions under “OSGARD AI release review (manual, opt-in)”. Its boolean input defaults to false. When explicitly enabled, it regenerates the cross-surface contract audit, builds and verifies the exact artifact attestation, and sends only three minimized reports—release readiness, contract integrity, and artifact attestation—to the model. If preparation fails, the affected report is marked blocked and deterministic overrides force the recommendation to hold. The workflow uses only the Actions secret OPENAI_API_KEY; do not place a key in source code, the frontend, workflow YAML, or the report.

## Data boundary

The reviewer reads only allow-listed JSON reports in the repository root. It projects them to a bounded summary:
- check IDs, titles and statuses;
- small aggregate counts;
- failed route paths without hostnames or response bodies;
- file counts, byte totals and artifact hashes.

It does not send source files, command output, credentials, player records, raw API responses or entire route matrices. The API request sets store=false and defines no tools. Structured output is validated before it is written. Report text is treated as untrusted evidence, not instructions.

The report is written atomically with restrictive permissions where supported. Its output is evidence of an advisory model review, not a signature or proof that a release is safe.

## Deterministic override and approval

If any supplied report is blocked or has failed checks, the final recommendation is forced to hold regardless of the model response. Human review remains required for every result. A model cannot green-light a failed build, update code, approve a pull request or deploy production.

## OpenAI API references

- Responses API: https://platform.openai.com/docs/api-reference/responses
- Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Models: https://platform.openai.com/docs/models
- Pricing: https://platform.openai.com/pricing
