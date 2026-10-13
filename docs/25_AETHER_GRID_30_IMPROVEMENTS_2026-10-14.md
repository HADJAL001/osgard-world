# AETHER GRID — 30 premium improvements
Date: 2026-10-14
Scope: AETHER GRID, game 11 in OSGARD PLAY.
Version: 1.1.0-game-11-premium-session

This release focuses on session quality and retention without changing the shared daily puzzle generator, making up global rankings, or adding accounts, external trackers, or network dependencies.

## The 30 improvements

1. **Versioned progress snapshots.** An active run is saved with `version: 1`.
2. **Daily-puzzle binding.** The saved snapshot can only restore for its matching UTC challenge day.
3. **Strict restore validation.** Rotation values, move counts, hint counts and elapsed time are type- and range-checked.
4. **Automatic move saving.** Each accepted node rotation is persisted locally.
5. **Hint saving.** The assistance move and its added move penalty are persisted as one undoable action.
6. **Navigation-safe saving.** The page saves on `pagehide`.
7. **One-click recovery.** Returning players resume a valid same-day run instead of silently losing it.
8. **Accurate elapsed time.** Timer updates accumulate active intervals rather than depending on a single wall-clock start.
9. **Visibility pause.** Switching tabs freezes the elapsed timer and emits the existing pause/resume lifecycle messages.
10. **Manual pause.** The player can pause and resume the daily run.
11. **Input lock while paused.** Rotations, hints and history controls cannot mutate a paused or completed board.
12. **Undo.** A player can roll back the last accepted move.
13. **Redo.** A rolled-back move can be replayed.
14. **Bounded history.** Up to 100 move snapshots are retained in memory.
15. **Score-safe history.** Undo/redo restores rotations, move count and hint count, but keeps the real elapsed timer monotonic so history cannot game the daily time record.
16. **Safe reset.** A confirmation warns before abandoning a started attempt.
17. **Reset cleanup.** Confirmed reset clears the daily checkpoint and both history stacks.
18. **Live connection count.** Connected nodes are visible as `n / 25`.
19. **Accessible progress bar.** The live network progress exposes `aria-valuenow`/min/max.
20. **Lifetime completions.** The local panel counts distinct UTC days completed on this browser.
21. **Daily streak.** The streak is calculated from validated, deduplicated UTC dates.
22. **All-time move record.** The best recorded move count appears alongside today's best.
23. **Completion-date deduplication.** Replaying a day does not inflate the number of distinct daily completions.
24. **Personal result badges.** A no-hint route or a run finished within 30 seconds receives a local text badge.
25. **Optional sound.** The player may enable minimal synthesized interface tones; nothing autoplays before interaction.
26. **Persistent sound preference.** The sound toggle is stored locally.
27. **High-contrast mode.** A dedicated contrast mode strengthens the board's wire and UI contrast.
28. **Persistent contrast preference.** High-contrast mode survives refreshes.
29. **Optional haptics.** Supported devices may vibrate on explicit moves and completion; unsupported browsers safely skip it.
30. **Persistent haptics preference.** The vibration preference is stored locally and remains optional.

## Additional polish included in the same release

Keyboard shortcuts support Ctrl/Cmd+Z undo, Ctrl/Cmd+Y redo and Escape to pause; the existing R/H/S shortcuts remain. The result JSON export contains only the game day, moves, elapsed time, hint count and local streak. The export explicitly says the data is browser-local and is not a global leaderboard. Completed runs stop their timer, delete the unfinished checkpoint and send a lifecycle completion event with duration, moves, hints and streak. Controls have accessible labels/states, mobile layouts, visible focus and inherit the page's reduced-motion support.

## Privacy and integrity boundaries

- Progress, preferences and records remain in browser storage. No player account is required.
- The page does not claim a global ranking or verified identity.
- Daily puzzle generation and share-link structure are unchanged.
- SHARDS and monetary rewards are not affected by this patch.
- Browser-local streaks and export data may be lost if site data is cleared.
- Local storage is convenience state, not an anti-cheat authority.

## Verification

The Games detail smoke test checks the controls, versioned checkpoint contract, bounded undo/redo, visibility pause, UTC streaks, optional settings, export semantics, keyboard shortcuts and parses the inline game controller. Production-browser behavior and real-device haptics still require device QA; CI source validation is not a substitute for a physical-device test.
