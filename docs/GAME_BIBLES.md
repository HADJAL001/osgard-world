# OSGARD PLAY / Game bibles v1

This document operationalizes brief sections 37-132. It is the source of truth for the first vertical-slice implementation of each game.

## Shared gameplay contract

Every system follows `INPUT -> RULE -> STATE -> FEEDBACK -> CONSEQUENCE -> SAVE -> ANALYTICS`.

Every session has a deterministic `sessionId`, `gameId`, `schemaVersion`, seed, start/end timestamps, and a server-validated result. The client never authorizes score, currency, inventory, ownership, permissions, or competitive rank.

## TIME / ИМПЕРИЯ ВРЕМЕНИ

- Reason to exist: управлять.
- Fantasy: build a city whose economy and politics remember every decision.
- Core loop: `observe city -> choose policy -> allocate resources -> respond to faction reaction -> archive consequence`.
- Vertical slice now implemented: four selectable districts, three factions, four building types with three upgrade levels, two main resources (treasury and energy), tax decision, four policy styles, deterministic city incidents and an election/mayoral mandate outcome.
- State: population, treasury, energy, stability, faction approval, district prosperity, building level, tax rate, policy, calendar tick, score and chronicle entries.
- Failure: treasury/energy/stability collapse or all three factions lose legitimacy; success: reach tick 8 with at least two factions at 52+ approval, treasury at 500+, and stability at 35+.
- Save: versioned localStorage checkpoint on every state transition. Server-authoritative city state and conflict resolution remain future work; client-side simulation is not trusted for competitive score or currency.
- Diagnostics: real client FPS from requestAnimationFrame, average frame interval, synchronous simulation duration from performance.now(), and action counter.
- Analytics: current generic OSGARD game/portal events include game ID and action payload; named TIME-specific analytics events still need a schema/API update.

## SWARM

- Reason to exist: координироваться.
- Fantasy: eight players are one organism with different roles and partial information.
- Core loop: `assign role -> read signal -> synchronize action -> extract core -> review replay`.
- Vertical slice: one facility, eight roles, three rooms, one alarm state, one extraction route.
- State: role readiness, facility alarm, objective progress, extraction timer, player connection state.
- Failure: alarm reaches critical state, objective carrier is lost, or extraction timer expires.
- Success: all required players and the core reach extraction.
- Network: authoritative real-time session; reconnect window preserves role and objective state.
- Analytics: `swarm_match_open`, `swarm_ready`, `swarm_signal_sent`, `swarm_extract_started`, `swarm_match_completed`.

## NULL//SHIFT

- Reason to exist: проникать.
- Fantasy: tactical operators shift between realities to infiltrate a facility.
- Core loop: `read contract -> scout facility -> hack node -> shift reality -> recover core -> extract`.
- Vertical slice: one facility, two reality layers, cameras, guards, terminal hack, heat meter.
- State: heat, reality layer, guard alert, node integrity, loot, extraction status.
- Failure: heat reaches maximum or the squad is detained.
- Success: core recovered and at least one operator extracts.
- Security: server validates hack sequence, movement envelope, loot, and extraction result.
- Analytics: `null_contract_open`, `null_hack`, `null_shift`, `null_heat_changed`, `null_extract`.

## INHERIT

- Reason to exist: наследовать.
- Fantasy: a family and an island change across generations, preserving memory and consequence.
- Core loop: `choose family action -> resolve relationship -> develop property -> pass generation -> archive memory`.
- Vertical slice: one island, one family, three characters, two properties, one inheritance decision.
- State: generation, relationships, property state, family resources, memories, world events.
- Failure: family line ends, property is lost, or trust collapses.
- Success: pass a viable archive to the next generation with one preserved legacy object.
- Save: cloud state with conflict resolution using latest valid checkpoint plus event replay.
- Analytics: `inherit_family_created`, `inherit_relationship_changed`, `inherit_generation_advanced`, `inherit_memory_archived`.

## REMIX

- Reason to exist: создавать.
- Fantasy: players create, validate, publish, beat, and remix challenges.
- Core loop: `create -> validate -> publish -> play -> submit record -> remix`.
- Vertical slice: deterministic arena, objects, hazards, goal, seed, replay submission, leaderboard.
- State: draft, validation result, published version, runs, best time, remix parent.
- Security: creator must complete the challenge; server checks integrity, impossible states, and replay consistency.
- Publish flow: `DRAFT -> VALIDATE -> PUBLISH`.
- Analytics: `remix_draft_created`, `remix_validated`, `remix_published`, `remix_completed`, `remix_created`.

## Common progression

Each game owns progression, while `OSGARD LEVEL` awards XP for gameplay, achievements, creation, exploration, and social activity. XP unlocks cosmetics, archive slots, creator tools, and visual customization, never competitive power.

## Shared API boundary

Identity, profile, social, economy, inventory, matchmaking, sessions, replay, analytics, moderation, and notifications are OSGARD CORE services. Game services own only their domain state and emit versioned events.

