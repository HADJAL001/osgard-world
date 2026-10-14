# OSGARD PLAY — consent-gated measurement loading

Date: 14 October 2026

## Measured issue before this change

The deployed Games hub failed the existing mobile Lighthouse guardrail:
- Performance: 78/100
- Total Blocking Time: 954 ms
- Largest Contentful Paint: 1.62 s
- Accessibility, Best Practices and SEO: 100/100
- Desktop Performance: 100/100

These are the measured results from the previous deployed build, not a claimed result for the new code. The Lighthouse guardrail remains unchanged: mobile Performance >= 85 and TBT <= 500 ms.

## Change

The /games/ landing view no longer eagerly requests the shared consented analytics queue or the product-experiment registry/runtime.

- Visitors without analytics consent do not download consented-analytics.js, experiment-core.js, or experiment-runtime.js on initial catalog entry.
- If consent was already granted, the same modules are loaded asynchronously and in dependency order: queue -> experiment registry -> experiment runtime.
- If a player grants consent from the Games consent control, the modules load after the stored consent changes; the existing storage event also handles a consent grant from another tab.
- Dynamic requests use the build-stamped versioned('/games/'+path) helper; no third-party SDK or tracking endpoint was added.
- Default CTA text stays the control variant until consent, matching the experiment contract. The server's sample minimum and exposure-visibility requirement are unchanged.
- Commerce/forms, game launching, referral handling, owned-service promotion, and the post-game sharing/reward features remain separate from the experiment loader.

The three modules total about 19.3 KB of repository source before compression. That is not the predicted network saving or a performance score: the actual impact must be measured after deployment on the same Lighthouse configuration.

## Regression tests

- Games portal smoke verifies the modules are not eager script tags, consent changes trigger the loader, and versioned script insertion keeps queue/registry/runtime order.
- Product experiment smoke verifies consent is required and the runtime still keeps its existing allow-listed event contract.
- PWA smoke verifies the experiment assets remain available to the installable shell without requiring eager execution.
- Commerce rollout smoke keeps queue-before-client checks on pages that still load the queue eagerly, while verifying the Games hub's consent-gated alternative.
- Production Lighthouse verifies that the same deployed commit is being measured and continues to enforce mobile/Desktop thresholds.

## Acceptance criteria

A performance improvement is accepted only after a fresh post-deploy Lighthouse report. Do not relax the TBT/performance thresholds to make CI pass. If mobile TBT still exceeds 500 ms, use the uploaded report/trace to select the next largest task and make a measured change rather than deferring arbitrary code or altering analytics semantics.
