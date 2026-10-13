# OSGARD PLAY — semantics of referral-share events

Date: 13 October 2026

## Change

The post-game invitation handler now emits `share_created` only after one of the following browser-confirmed actions succeeds:

- the native `navigator.share()` promise resolves;
- the invite text is copied using the Clipboard API.

The event is no longer emitted before opening the system share sheet. If the user dismisses the native share sheet (`AbortError`) or both sharing paths fail, no `share_created` event is sent. The WhatsApp fallback link remains available, but rendering that link does not count as a completed share.

## What the event means

`share_created` means that the player completed an in-browser share/copy action. It does **not** prove that a messaging platform delivered the invitation or that the recipient opened it.

The existing invite flow separates the next stages:

1. `share_created` — confirmed browser share/copy action;
2. `referral_link_opened` — invite route opened, only when analytics consent is enabled;
3. `game_session_started` with a `referral:` source — referred game session actually started;
4. `game_session_completed` with a `referral:` source — referred session completed.

The funnel is consented analytics, not complete traffic measurement. It must not be used to infer delivery receipts, verified unique people, a K-factor or revenue without separate evidence. Repeated users, browsers, devices and copied links can affect counts; no PII is encoded in the referral code.

## Quality gate

`scripts/games-portal-smoke.mjs` asserts that the referral event is emitted only after a successful share/copy operation, that cancellation returns before the event, and that at most one `share_created` call exists in the handler. The existing CI job executes this smoke suite.

## Monetization relevance

A lower but more truthful share count is preferable to artificially inflated conversion metrics. Sponsorship and revenue forecasts must use confirmed provider/order data and clearly disclosed assumptions; referral events alone never justify claiming a dollar value or “viral coefficient.”
