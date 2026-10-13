# OSGARD Growth Studio — rollout and experiment contract

Date: 2026-10-13
Branch: feat/osgard-growth-studio-2026-10-13

## Why this change
The Games portal already has a local revenue-scenario calculator, consent-gated event ingestion, a referral ribbon and post-session sharing, plus Partner Studio enquiries. This page fills a different gap: a repeatable, exportable campaign-brief workflow for game referrals and sponsor-pilot planning.

## Included
- Standalone route /games/growth-studio/.
- Invite URL matching the existing catalog route (challenge, ref and UTM fields). Referral tokens are random opaque 12-hex values generated in the browser and contain no contact details.
- Offline-generated 1200×630 PNG share card.
- Local JSON and Markdown campaign-brief export.
- Adjustable scenario model for share actions → invite opens → game starts → completions and active-player K-factor.
- Optional share_created event sent only after the browser confirms successful sharing or copying, and only when the existing consent key is already set to yes. Dismissing the native share sheet sends no event. An event does not prove message delivery or recipient open.
- Partner Studio navigation link, static smoke test and dedicated GitHub Actions check.

## Guardrails
- No ad SDK, fabricated impressions, fake orders or live payment activation.
- No new personal-data collection and no server storage for the local campaign fields.
- All forecast values are editable scenario assumptions, not observed performance or market benchmarks.
- Advertising remains enquiry-only until a real provider/account, review, consent/legal checks, placements and measurement are configured.
- OSGARD PREMIUM sales remain disabled until a reliable server-side entitlement lifecycle exists; a checkout order alone does not unlock games.

## How to use
1. Open /games/growth-studio/.
2. Select a game, define a short hook and goal, then generate a link and card.
3. Share or copy only when ready; export a JSON or Markdown brief to capture settings.
4. Edit model assumptions to plan a cohort experiment. Before spending on acquisition, test with a small group, change one variable at a time, and compare actual consented funnel counts.
5. Use Partner Studio to discuss a sponsorship pilot. An enquiry is not an inventory reservation.

## Validation
Run node scripts/growth-studio-smoke.mjs. The test checks identifiers, URL parameters, consent gating, share-cancel behavior, local exports, responsive layout and JavaScript syntax. It does not prove real browser Share API support, backend event persistence, cross-device QA or production deployment.

## Deployment boundary
Changes are proposed via pull request against master. The main site changes only after review, merge and a successful hosting deployment. Test the preview URL on desktop and mobile before running a paid campaign.
