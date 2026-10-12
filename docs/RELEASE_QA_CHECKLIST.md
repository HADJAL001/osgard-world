# OSGARD release QA checklist

This checklist operationalizes brief sections 133-164 and is required for every release candidate.

## Functional

## Games hub

- `/games` loads the public catalogue and the five records map to tracked game entry points.
- Search, genre filter, featured filter, favorites and recent-game continuation work with empty and unavailable local storage.
- Opening a game exposes visible loading state, a separate-tab fallback and a fullscreen control; page load is not treated as proof of game-session completion.
- Legacy `/entertainment` redirects to `/games` and does not leave NULL//SHIFT pointed at the absent Godot export.
- Local analytics requires explicit consent; without authentication it remains on-device. No ad impressions/clicks or purchase events are fabricated.
- Project brief form explicitly opens a prefilled email; it does not claim a server-side submission.
- Mobile 320/375 px, keyboard focus, reduced-motion, dialog focus/close, long titles and failed catalogue fetch are tested.

- Portal navigation and language switch.
- All seven world routes and five game routes.
- Game state transitions, guarded failures, save/replay serialization.
- Result share route and CORE event inspector.

## UX and accessibility

- Keyboard focus is visible.
- 320px mobile layout has no horizontal overflow.
- Reduced-motion mode disables non-essential animation.
- Controls have labels and non-color feedback.

## Network and save

- Offline shell remains readable.
- Slow network does not duplicate actions.
- Disconnect/reconnect preserves session identity.
- Save migration rejects invalid schema versions.

## Performance and compatibility

- Check low/mid/high mobile profiles and desktop.
- Monitor JS chunk size, memory, GPU, battery, and crash-free sessions.
- Verify current Chrome, Edge, Safari, Firefox, iOS Safari, Android Chrome.

## Security and moderation

- Server validates score, currency, inventory, ownership, permissions, and replay hash.
- REMIX content passes automated check before publish.
- Reports enter review queue; client never bypasses moderation.

## Release pipeline

`DEVELOPER BUILD -> INTERNAL -> QA -> STAGING -> CLOSED BETA -> OPEN BETA -> RELEASE`

