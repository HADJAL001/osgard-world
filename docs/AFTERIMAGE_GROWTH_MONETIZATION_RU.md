# AFTERIMAGE//RUN — growth & monetization plan

## Product pitch
A compact sci-fi precision runner in OSGARD PLAY: the same UTC daily seed for everyone, a personal best/ghost, a challenge URL carrying the seed and score, share-result image, and a cosmetic SIGNAL SHARD that can be claimed once per UTC day only after the player completes a share action and then explicitly confirms that they posted the challenge. The game explicitly tells the player that the actual public post is not verified.

## Viral loop to measure
1. A player starts from the OSGARD games catalog or Entertainment.
2. The daily seed and score make a compact challenge ("beat this route / beat this score").
3. Native share or Telegram, VK, X, WhatsApp and copy-link buttons create a route-specific challenge URL.
4. The recipient lands on the same date/seed, plays their run and can share their result.
5. A non-transferable, cosmetic shard provides a small in-game acknowledgement. It does not alter speed, score, or paid rights.

The share incentive intentionally requires a post-action self-confirmation; OSGARD cannot independently verify that the destination social network published the post. This is not fraud-proof. The reward is local, non-transferable cosmetics only; never make it a cash-equivalent or a paid entitlement. Client-only localStorage is easy to reset and is not anti-fraud. Before offering tradable/paid value or a referral payout, implement server-side invite attribution, idempotent referral records, account/abuse controls, and require a qualified referred player's first completed session. The local shard is cosmetic-only.

## Owned-service intermission
Use the existing OSGARD SELECT after a completed embedded game session. It is one optional luxury cross-promotion panel for the ten OSGARD-owned projects, not a second popup. The player chooses a card and explicitly opens that destination, or skips the panel; the user's saved frequency choice must be respected. Each link carries:
- \`utm_source=osgard_games\`
- \`utm_medium=intermission\`
- \`utm_campaign=ecosystem_cross_promo\`
- \`utm_content=<service-id>\`

The panel is not a third-party advertising network, not a paid impression, and must be identified as owned-project cross-promotion. Events are sent only when the platform's existing consent flag is affirmative and a valid authenticated token is present. No personal data is added to UTM parameters.

## Monetization ladder
1. **Now — owned-service referrals and qualified development inquiries.** Track actual outbound clicks, brief form drafts and submitted/qualified leads separately. A click is not revenue; a mail draft is not a submitted lead. Follow attribution in a CRM and measure closed contracts/contribution margin.
2. **After a user cohort is observed — clearly labeled partner placements.** Sell a defined campaign, date window, context, geography, frequency cap and report. Separate advertiser creatives from owned-project cards. Do not log fake impressions/clicks.
3. **After an ad provider approves the property — optional rewarded web ads, only where the provider's web format is supported.** Prompt at a safe break, offer a defined non-cash/non-transferable reward, and keep an equally functional "No thanks" path. Do not gate core gameplay behind an ad. Implement the provider's completion validation and idempotency appropriate to that format; never treat a client-side button click as proof of a completed paid impression.
4. **After repeat-use evidence — premium content/one-time unlocks.** Sell additional tracks, game modes, aesthetics or a supporter pack. Store rights/receipts server-side; don't let a client flag confer paid access.
5. **Only after multiple games and recurring value exist — OSGARD PREMIUM.** Test clear alternatives such as ad-free browser catalogue, premium missions or a cross-game bundle. Prices in test pages are hypotheses, not "market prices". Avoid subscriptions until churn, content cadence, refunds and cancellation are understood.

### Platform constraints
- Cross-promoting the owner's own sites is the current model; it is not counted as revenue until a real conversion is attributed.
- For Google-served rewarded ads, the user must clearly opt in; skipping must not block normal use and the promised non-transferable reward must be delivered. See Google’s rewarded-ad policy: https://support.google.com/admob/answer/7313578. Important: Google Ad Manager's rewarded **web** API documents client-side grant/close events and explicitly says server-side verification is unavailable for web; AdMob SSV is documented for apps. Therefore do not advertise a Google Ad Manager web reward as cryptographically server-verified. Keep any client-trust reward cosmetic/low value, or select a web provider with a suitable server-verification callback before offering a more valuable reward. References: https://support.google.com/admanager/answer/9116812 and https://support.google.com/admob/answer/9603226.
- Do not ship a paid-ad or rewarded-ad business model inside a Steam build. Steam's rules disallow paid advertising in games, including advertising-based access and rewards for ad engagement; cross-promotion is a different supported category. See https://partner.steamgames.com/doc/marketing/advertising

## $1,000,000 arithmetic — not a forecast
No user count, eCPM, store conversion or service-close rate has been proven for this project yet. The following equations explain the scale required; they are not expected results:

- Ads: at an *assumed* net eCPM of $2.50, $1m / $2.50 × 1,000 = 400,000,000 billable impressions before fixed costs, taxes, refunds and overhead.
- Direct product sales: at $10 net contribution per purchase, 100,000 completed purchases yield $1m contribution before fixed costs.
- Development services: at $4,000 contribution margin per closed project, 250 projects yield $1m contribution before general overhead and taxes. Leads needed depend on the observed close rate.
- A mixed model should add only measured net contributions; do not sum page views, outbound clicks and drafted emails as if they were money.

## Measurement plan
Track, respecting existing consent/auth rules:
- catalog visit -> game open -> successful engine handshake -> completed session;
- session duration, crash/load failures and day-1/day-7 return cohorts;
- share intent by method, challenge landing, challenge-start and referred-session completion;
- intermission shown, chosen service, CTA click, destination UTM, qualified lead, closed contract and contribution margin;
- later: ad request/fill/viewable completion, verified rewarded callback, purchases, refunds and entitlements.

Minimum useful release experiment:
- Recruit 20–30 external playtesters, including users who have not watched the developer play.
- Compare the same build with/without the post-run share prompt; evaluate completion, replay and share-initiation rates, not just button clicks.
- Check whether users understand the daily seed and challenge without a verbal explanation.
- Audit whether the intermission is dismissible, one click from choice to destination, mobile-readable and never rendered over a live run.
- Keep the promotion-frequency choice test separate from game-balance testing.

## Release boundaries
The first release uses local personal-best data and a locally stored cosmetic shard. It has no public leaderboard, cross-device save, ad SDK, payment processor or server-backed referral reward. The intermission is owned-service cross-promotion, not third-party ads. Activate server-backed monetization only after accounts, provider approval, consent, required callback/signature validation, deduplication, refunds and entitlement checks exist.

## Release gates and conversion targets (hypotheses, not promises)

Treat the first 100–300 qualified external sessions as usability evidence, not market validation. Before advertising or payment implementation, record a baseline for: catalogue visit → launch click → successful engine handshake → completed run → replay → share intent → invite landing → referred completed run. Split results by direct, social, and campaign UTM; never infer a person from a URL alone.

Suggested first experiment:
- **20–30 new playtesters**: at least half should not have watched the creator play. Verify that players understand the daily seed, controls, the target score, and that personal ghosts are local.
- **Share test**: compare a clear post-run prompt against no prompt. Primary metrics are share intent per completed run and referred-session completion, not raw button clicks.
- **Owned cross-promotion test**: respect OSGARD SELECT's explicit frequency preference and skip. Compare service-choice CTR and qualified lead rate by service and placement, not CTR alone. Use the existing UTM IDs to attribute conversion on the destination site.
- **Monetization gate**: do not sell advertising until you can report actual consenting sessions, viewable ad impressions, fill, and net revenue. Do not count a cross-promotion CTA click or a drafted email as revenue.
- **Premium gate**: show users real offer descriptions and test willingness to pay before implementing checkout; purchases and entitlements must be checked server-side.

A hypothetical $1m target is a long-term arithmetic target, not a plan that the current audience can support yet. The near-term goal is to prove one repeatable loop and one attributable source of contribution margin, then scale only the parts that work.