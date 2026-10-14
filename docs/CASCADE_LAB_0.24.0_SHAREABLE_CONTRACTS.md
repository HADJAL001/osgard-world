# CASCADE LAB 0.24.0 — Shareable Adaptive Contracts

## Product change

Adaptive Mission Director contracts can now travel as a direct link to the exact protocol and the intended objective. A recipient can accept the contract without signing in and starts their own local progress record.

## Link contract

- Query key: `clmd` on `/games/cascade-lab/`.
- Schema: `osgard.cascade-lab.mission-invite.v1`.
- Version: `0.24.0`.
- Lifetime: 30 days from issue time.
- Maximum link length: 7,000 characters.
- Allowed contract kinds: `first-clear`, `recovery`, `leaner`, `faster`, `consistency`.
- Protocol ID must be one of the five supported campaign protocols.
- Goal, instruction, reason, baseline, date, and ID fields are bounded and validated before use.
- The accepted contract begins with an empty attempt list and `xpAwarded=false`.

## Privacy and trust boundaries

The URL contains only the contract definition, its baseline metrics, and expiry. It does not include the source player's full attempt ledger, Research XP, account identity, private notes, analytics identifiers, or experiment archive. The feature uses no server endpoint and does not upload the link.

The link is not a signature and must not be treated as proof of an author's identity, verified completion, repost, or fair ranked result. A user can edit client-side query parameters. Progress and +100 Research XP are local-only; there is no shared leaderboard or monetary prize. If trusted competition is added later, move challenge issuance and score verification to a server before issuing prizes.

## UX

- The sender can copy a canonical challenge link or open social-network share-intent links for Telegram, WhatsApp, VK, X, and LinkedIn.
- The recipient sees the contract title, goal, protocol, and expiry before accepting.
- An active local contract cannot be overwritten by an invitation. The player must finish or explicitly close it first.
- Accepting creates a new local contract and navigates to the matching protocol. It does not import the sender's results.
- Invalid, unsupported, expired, too-long, or malformed invitations are rejected with a readable message.

## Verification

Run `npm run qa:cascade-lab-mission-director`, `npm run qa:games-detail`, `npm run qa:games-portal`, `npm run check`, and `npm run qa:production-routes`.

Coverage includes valid invite round-trip, fixed protocol/goal retention, empty receiver history, malformed JSON, unknown kinds, expiry, excessive length, duplicate-result protection, same-origin route identity, and local-only/network-free module checks.

## Release status

This change is proposed in the `feat/cascade-lab-shareable-contracts-2026-10-14` branch. It is not a claim of production deployment until the pull-request checks, deploy workflow, and production route verification pass.