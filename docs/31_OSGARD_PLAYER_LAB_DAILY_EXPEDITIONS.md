# OSGARD Player Lab 1.1 — Daily Expeditions

## Product outcome

The Games catalogue now has a fourth layer in its Player Console: daily missions. The missions run on the user's device and encourage trying multiple game worlds, finishing a real game round, and planning a queue. They do not require an account.

## Thirty improvements in this batch

1. Add a dedicated **Экспедиции** tab to Player Lab.
2. Keep the existing overview, queue, diagnostics and data tabs intact.
3. Show a daily UTC cycle label.
4. Add a mission to open a game.
5. Add a mission to explore two different game IDs.
6. Add a mission that depends on a real game-completed event.
7. Add a mission to build a queue of three games.
8. Compute mission progress from the existing local history and queue.
9. Render accessible progress bars with min, max and current values.
10. Show a separate local XP total.
11. Show the local activity streak.
12. Give each mission its own completion state.
13. Make claim buttons disabled until their objective is met.
14. Disable already-claimed rewards for that UTC date.
15. Store reward claims by mission ID and UTC date.
16. Cap the claim-history array at 4,000 entries.
17. Cap local XP at a safe integer limit of 10,000,000.
18. Validate imported mission IDs against the allow-list.
19. Validate UTC date keys as real calendar dates.
20. Normalize claim timestamps to ISO dates.
21. Remove duplicate claims for the same mission and day.
22. Keep old Player Lab backups valid when the mission section is missing.
23. Include mission XP and claims in the existing JSON export.
24. Restore validated mission state from a valid backup.
25. Add a dated, bounded completion log to local stats.
26. Keep only the newest 1,000 completion records.
27. Use that completion log to calculate the daily completion objective.
28. Refresh mission progress after game completion.
29. Refresh mission progress after queue updates and when the console reopens.
30. Disclose that XP is local-only, unsynchronized and has no monetary value.

## Data and safety boundaries

Mission state uses `localStorage` under `osgard.games.player-console.missions.v1`. Completed-round events are recorded in the existing Player Lab local history. The feature does not add a third-party analytics SDK, remote profile, cash payout or paid power-up. User-edited local storage can be manipulated, so local XP is a cosmetic engagement counter rather than a verified reward.

The UTC date determines the mission reset. Progress and XP remain on this browser unless the player exports and imports their own JSON file. Import checks the supported format, size cap, known game IDs, mission IDs, date values, numeric bounds and timestamp formats.

## Quality gates

- `npm run qa:games-portal`
- `npm run qa:games-detail`
- Player Console contract tests in `scripts/player-console-smoke.mjs`
- Production route matrix checks the published JS and CSS bundle content
- Deployment route verification remains the final proof that the live assets were published

No revenue, external sharing verification or global leaderboard is claimed by this release.
