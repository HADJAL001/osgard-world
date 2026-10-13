# OSGARD PLAY — growth, virality and monetization plan

**Status:** operating plan, not a forecast  
**Date:** 13 October 2026  
**Owner:** OSGARD WORLD  
**Canonical product:** https://osgard.world/games/  
**Financial target:** $1,000,000 annual gross revenue as a stretch scenario; never represent this as current revenue or a guaranteed result.

## 1. What is live versus what is planned

The public catalogue has nine game entries, search, genre filtering, favorites/recent-play storage, an embedded player where supported, post-session recommendations, the consent control, a scenario-based economy calculator at `/games/monetization/`, and an inquiry-only sponsor inventory. A referral share link and referral landing banner are being added to the catalogue.

The referral link is a random code like `OSG-1A2B3C4D`; it contains no name or contact data. The code is stored in the sharing browser so the link can be reused. Opening a referral URL does not by itself create a server event. Referral-link and landing events are attempted only when the user has explicitly enabled optional analytics; their actual acceptance and aggregation must be confirmed against the deployed Commerce API before reporting referral conversion or a viral coefficient.

**Not live/confirmed:** an ad network, sponsor inventory served from a server CMS, paid membership checkout, in-game purchase entitlement, payment webhooks, an active pricing page, a guaranteed referral reward, and verified revenue reporting. The visible sponsor cards are an inquiry funnel, not active ads. Founding Pass is interest research only; it does not take payment.

## 2. Product positioning and monetization principles

1. **The free game must remain worth playing.** Avoid pay-to-win advantages, energy walls, fake scarcity, manipulative timers, dark patterns, and ads covering controls.
2. **Sell first to businesses; prove consumer demand in parallel.** A custom mini-game or sponsored challenge can be sold through a direct brief before a large consumer audience exists. Keep sponsorship clearly labelled and outside critical gameplay.
3. **Do not build a payment UI before building entitlements.** A payment must create a server-verified entitlement, support webhooks and reconciliation, and have cancellation/refund rules. A client-side “paid” flag is not a purchase.
4. **Measure with consent and server truth.** Never infer revenue from a click, impression, form draft, or calculator number. Track accepted leads separately from qualified leads, signed contracts, cash received, refunds, platform fees, and net revenue.
5. **Reward real sharing, not fake activity.** No fake live-player numbers, generated ratings, referral self-dealing, paid-to-post spam, or rewards for repeated events from the same user/device.

## 3. Viral loop to measure

### Current user flow

`Game / catalogue → Share invitation → Friend opens /games/?ref=OSG-… → Friend launches a game → Friend can share their own invitation`

The catalogue also supports post-session recommendations that keep players inside OSGARD. The invite flow should use the existing browser share sheet, with a copy-link fallback. The referral banner offers a direct route to the game library. Optional event delivery is consent-gated; if consent is off or the API is unavailable, sharing and playing must still work.

### Events to verify in staging

- `referral_link_created`: the share sheet or clipboard successfully receives the generated link. Do not count a cancelled share.
- `referral_landing_opened`: a valid `ref` code opens the catalogue.
- `game_opened`: the recipient opens a game using the established launch event.
- `game_session_completed`: the game actually reports completion through the validated lifecycle channel, not simply because an iframe closed.

Before publishing referral KPIs, verify in the deployed Commerce API that it accepts the two new referral event names, deduplicates sessions correctly, and makes the events available in a protected aggregate. Until then, the share affordance is live UX, but end-to-end referral attribution is **unverified**.

### Viral metrics

- **Invite share rate** = unique consenting users who create at least one invite / unique active users.
- **Invite open rate** = valid referred landing sessions / invite links successfully shared.
- **Invite activation** = referred visitors who launch a game / referred landing sessions.
- **K-factor** = invites per active user × invite-open rate × invite-activation rate.
- **D1 / D7 / D30 retention** = players returning on days 1 / 7 / 30 divided by the eligible cohort.
- Track organic, referral, partner, and paid acquisition separately; do not treat a UTM click as an activated player.

A viral coefficient over 1 is a diagnostic target, not a promise. Do not offer money or in-game rewards for invites until abuse resistance and a real entitlement ledger exist.

## 4. Revenue lanes and validation gates

### A. Direct B2B revenue — first priority

- Sponsor placement in the catalogue, explicitly marked and capped.
- Branded challenge, level, or event; sponsor is disclosed in the event and result screen.
- Custom mini-game / web game / product prototype with a signed brief, statement of work, acceptance test, and maintenance terms.

For the next four weeks: prepare three examples, make a qualified brand list, contact 10–15 relevant prospects per week, and record each stage in a lightweight CRM: contacted → meeting → brief → proposal → signed → delivered → invoice paid. Start with a manually sold service instead of pretending self-serve ad sales already work.

### B. Player premium — validate before charging

Possible later benefits: cosmetics, optional modes, creator tools, convenience that does not confer competitive advantage, and early access to experiments. Keep baseline play free. Test willingness to pay with an interest form or transparent prototype first. Do not take card details or call this a subscription until checkout, entitlement checks, renewals, tax handling, cancellation, refunds, and customer support are implemented.

### C. Advertising — last, and optional

Only connect a reputable network after obtaining enough returning traffic to justify the user-experience cost. Use clear labelling, age and consent controls as applicable, frequency caps, brand-safety review, and no ads during active play. Start with an opt-in reward format only after server-side proof of completion and fraud handling. There is currently no confirmed ad-network revenue.

### D. Studio leads — existing conversion path

The games catalogue can introduce OSGARD's development services. A submitted brief is not revenue: qualify scope and budget, sign a contract, deliver accepted work, then record money received separately.

## 5. The $1M annual gross arithmetic (stretch scenario only)

This is a mix of hypothetical units that add to $1,000,000. It is **not a prediction, budget, valuation, or statement of current performance**.

| Revenue lane | Hypothetical units | Gross annual arithmetic |
|---|---:|---:|
| Custom branded games | 14 projects × $25,000 | $350,000 |
| Sponsorship campaigns | 16 campaigns × $12,500 | $200,000 |
| Premium membership | 7,500 average paying members × $3/month × 12 months | $270,000 |
| Optional season/cosmetic purchases | 30,000 transactions × $6 | $180,000 |
| **Total gross revenue** |  | **$1,000,000** |

The first two lines require 30 B2B wins per year and sufficient design/development capacity. The premium line requires an average of 7,500 active paying members for a full year, not 7,500 free sign-ups. At an illustrative 2% payer conversion, that would require roughly 375,000 monthly active players before considering churn. The transaction line requires a separate, honest product people choose to buy.

This model excludes taxes, refunds, payment and platform fees, revenue shares, production costs, customer acquisition, chargebacks, infrastructure, salaries, and churn. Net profit would be lower. Replace every illustrative input with cohort data before making financial decisions.

## 6. First 90 days

### Days 1–14 — instrumentation and conversion hygiene
- Run the frontend and portal smoke checks; verify referral links survive direct navigation and share cancellation is not counted.
- Confirm the Commerce API's allowed event names, consent enforcement, deduplication, protected aggregates, and data-retention policy.
- Baseline game launch, session completion, errors, repeat visits, and referral steps from valid/consented events only.
- Verify every outbound game link and submission form; keep fallbacks when APIs are unavailable.

**Gate:** do not spend on paid user acquisition until first-party gameplay events and referral attribution are reliable.

### Days 15–30 — sponsor sales
- Publish a one-page B2B offer with deliverables, production timeline, rights, support, and clear acceptance criteria.
- Start 10–15 qualified outreach conversations per week; sell a small paid pilot before a large custom project.
- Set price only after estimating creative, engineering, hosting, legal, and support costs.
- Do not activate the sponsor inventory editor's draft placements directly; require a reviewed deployment and signed order.

**Gate:** one paid pilot or several qualified proposals before allocating build capacity to commercial tooling.

### Days 31–60 — improve retention and sharing
- Interview players who finish a session and those who leave.
- Test one recommendation order and one invite CTA at a time; compare cohorts, not raw page views.
- Review referral landing → game launch, D1/D7 retention, crash/load failure, and share cancellation.
- Avoid invite rewards until self-invites, bot traffic, and repeat redemptions can be prevented.

**Gate:** referral visitors must activate and retain at a viable rate, not simply open the URL.

### Days 61–90 — price-test without risky checkout
- Test a clearly labelled Founding Pass interest form, with no charge and no claim that access is already for sale.
- Interview respondents about concrete, optional benefits and acceptable pricing.
- Only then scope checkout, verified entitlements, subscription lifecycle, refunds, and accounting.
- Consider paid acquisition only after organic retention and a contribution-margin model are known.

**Gate:** price, legal review, support ownership, and server-side fulfilment must be defined before real payments.

## 7. Weekly operating dashboard

Review once per week: unique consenting active users; sessions started/completed; first-game activation; D1/D7/D30 retention; invite-created/opened/activated counts; game error rate; qualified B2B leads; proposals; signed deals; delivery margin; invoices paid; refunds/fees; premium interest-to-paid conversion (only after checkout is live); and cash runway.

Each metric needs an owner, source endpoint, time window, definition, and known limitations. When a measurement is not available, label it **not measured** rather than substituting an estimate.

## 8. Safety and integrity guardrails

- No live player counter or rating without verified source data.
- No charge, subscription, or reward presented as active until the production flow is end-to-end verified.
- Clearly label sponsored placement; avoid ads inside moments requiring fast gameplay input.
- Collect only what each explicit purpose needs; analytics remains opt-in, and referral IDs contain no personal details.
- Verify local laws, privacy terms, age rules, taxes, consumer cancellation rights, and payment-provider conditions before release.
