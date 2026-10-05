# 07 / OSGARD GAME BIBLE MATRIX

This matrix makes the brief's art, UX, level, narrative, and tech bible requirements explicit for every game. Shared rules are centralized; game-specific identity prevents five cards from becoming one reskinned product.

| Game | Art | UX / access | Level | Narrative | Tech / telemetry |
|---|---|---|---|---|---|
| TIME | midnight city, champagne policy accents, readable district map | dashboard purpose, policy primary action, keyboard/touch, reduced motion | district objective, faction pressure, collapse failure, replayable policies | senate, factions, timeline, archive canon | deterministic state, versioned save, decision events |
| SWARM | industrial facility, cyan core, alarm VFX | room entry, role/ready primary action, keyboard/gamepad, reconnect state | facility flow, cooperative objective, hazards, extraction success | eight minds, crew trust, facility mysteries | authoritative room/WebSocket, match persistence, network telemetry |
| NULL//SHIFT | black/electric-blue layered reality, shift VFX | hack/shift/extract actions, heat warnings, keyboard/touch, contrast | node puzzle, pursuit, heat failure, replay route | building memory, anomaly canon | deterministic replay envelope, validated result, heat events |
| INHERIT | warm archive, family materials, memory transitions | family entry, generation primary action, pointer/touch, text scaling | generation objective, trust/resource tradeoff, legacy success | family timeline, relationships, future arcs | profile/event ledger, generation analytics, save migration |
| REMIX | modular creator kit, branch/graph language | draft/validate/publish/play states, pointer/touch, keyboard, errors | object graph, validation failure, creator replayability | creator canon, challenge branches, community stories | guarded state machine, replay/result API, creator funnel telemetry |

## Shared UX Bible

Every screen declares purpose, entry, primary action, secondary actions, loading/empty/error/success states, animation, sound feedback, mobile, PC, controller, and accessibility behavior. Interactive states must preserve stable dimensions and respect reduced-motion and safe-area preferences.

## Shared Technical Bible

Input -> rule -> authoritative state -> feedback -> consequence -> save -> analytics. Client intent is never authority for score, currency, inventory, permissions, or multiplayer state. Replay envelopes include seed, ordered inputs, checkpoints, version, and hash. Release gates are documented in `RELEASE_QA_CHECKLIST.md`.

## Evidence

State/runtime references: `src/core/timeState.ts`, `src/core/swarmState.ts`, `src/core/nullState.ts`, `src/core/remixState.ts`, `src/LegacyCreatorPrototypes.tsx`, `src/OnlineGamePrototype.tsx`, `swarm-mvp/network/`, and `docs/ACCESSIBILITY_AUDIO_CONTRACT.md`.
