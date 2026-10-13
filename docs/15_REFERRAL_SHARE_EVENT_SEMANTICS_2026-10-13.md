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


## NULL//SHIFT Godot referral cards — 13 October 2026

The Godot result share creates a first-party 1200×630 PNG and a direct same-origin invite URL containing a stable daily challenge code and opaque OSGARD referral code. share_created is emitted only after native-share success or clipboard success. referral_link_opened is emitted only with analytics consent; session-start/completion events preserve the validated referral source. Native share cancellation and manual prompt fallback are not counted as completed shares. These events are funnel stages, not proof of delivery, a referred human identity, revenue or a viral coefficient.


## Commerce funnel source contract — 13 October 2026

For the consented Commerce API aggregate, a share event associated with a generated invitation uses the normalized source format `game-invite:<game-id>:<invite-code>`. The third field must be the validated invitation code from the actual invite URL; a bare source such as `game-invite:<game-id>` is not sufficient to associate the share with the link that was opened later.

The Games catalogue posts this event after a successful native-share or clipboard action. The embedded-game lifecycle does the same when a game reports a completed share action, using the validated code from the game URL, the consented current-tab attribution record, or the catalogue's existing per-browser invite code. Both paths recheck consent before network posting and use the existing allow-listed `share_created` event contract.

The admin funnel de-duplicates by invite code within its reporting window. It therefore reports **distinct tracked invite codes**, not raw shares, recipient people or sales. Invites opened on another device/browser may not carry the session's consented attribution; that limitation should remain visible in reports.
