# Games platform — prepublication checklist
Use this as a release gate; repository changes are not the same as production publication.

## Build and routing
- [ ] Pull request CI green: TypeScript, Vite production build, existing game QA, archive preflight and Games smoke test.
- [ ] Confirm production has `/games`, `/game/time`, `/game/swarm`, `/game/null-shift`, `/game/inherit`, `/game/remix`, `/privacy`, and `/terms`.
- [ ] Confirm all five source game assets are included in the archive.
- [ ] Verify full-screen exit, keyboard focus and touch interactions on real phones/tablets.
- [ ] Test missing game assets, offline API, and blocked iframe; standalone fallback must remain visible.
- [ ] Update sitemap lastmod only when deploying and validate canonical/OG images.

## Business / legal
- [ ] A responsible legal operator, address/jurisdiction and privacy contact are supplied.
- [ ] Privacy policy and terms drafts reviewed for every event/API, session, cookie, external provider and third-party game.
- [ ] Record lawful basis/consent behavior by geo and audience; verify age-rating and ad-provider requirements.
- [ ] Audit outbound project URLs and brand ownership manually; remove or hold destinations that cannot be verified.
- [ ] Server-side lead intake, retention/deletion rules, spam protection and notification flow deployed before promising server delivery.
- [ ] Advertising provider account approval and publisher policy review completed before adding SDK.
- [ ] Payment provider, verified webhook, server-owned entitlement, idempotency, refund and support flow tested before taking money.
- [ ] No client secrets, payment credentials or ad-network private keys in bundle.

## Deployment
- [ ] Build and run the repository release gate locally/CI.
- [ ] Use a dedicated least-privilege deployment key and the documented staging publisher.
- [ ] Verify staging byte count/SHA-256 before activation.
- [ ] Run production route matrix and public health check after activation.
- [ ] Preserve last-good frontend and test rollback.
- [ ] Record deploy commit, runtime health and route-matrix result in the execution log.
