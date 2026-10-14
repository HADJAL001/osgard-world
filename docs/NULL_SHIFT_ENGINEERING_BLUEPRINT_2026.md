# NULL//SHIFT — Engineering Blueprint 2026

Status: plan and sequence, not a claim that every proposed item is shipped.

## Release thesis

Turn NULL//SHIFT into a measurable, replayable tactical system. Every major change needs a simulation owner, a player-readable signal, a bounded performance cost, a regression test and a production marker. Native Godot remains the gameplay source of truth; the browser compatibility experience is a fallback, not a competing implementation.

## Shipped foundation

The project already contains 3D combat and objectives, role-coded hostiles, squad perception and acoustic propagation, line-of-sight checks, cover-aware detours, flank slots, a reactive Warden, timed phase lanes, destructible devices, extraction pressure, bounded VFX pools, adaptive quality, keyboard/touch/gamepad input, local career progression, shared daily challenges and a real Godot Web export pipeline. Release 0.16 adds the Adaptive Counterplay Director. CI parses the project, runs headless gameplay tests, builds the Web export, deploys it, then checks public routes.

## Thirty-step engineering programme

### A. Gameplay intelligence and fairness
1. Keep the Counterplay Director behind deterministic test fixtures and one doctrine state machine.
2. Add event-level combat evidence: telegraph shown, attack committed, hit, evade, stun, interrupt and elimination.
3. Add a seeded encounter manifest so all participants in a shared challenge face identical placement and timing.
4. Separate AI perception, decision, navigation and attack execution into explicit update phases.
5. Add guard-state invariants: no attack while stunned, no damage without a live wind-up, no stale target after death.
6. Add property tests for arena-bound targets, flank separation and physics-ray masks.
7. Add accessibility options for telegraph contrast, colour-safe role signals and motion reduction.
8. Add non-lethal training scenarios to teach phase lanes, cover and counterplay.
9. Add a threat-budget model that caps simultaneous wind-ups, not just enemy count.
10. Add a replay-verifiable seed and ruleset fingerprint to each finished run.

### B. Reliable performance and rendering
11. Track frame-time percentiles by quality profile without transmitting personal data.
12. Add pool-exhaustion tests for beams, rings, sparks, lights and audio voices.
13. Enforce budgets for active lights, particles, draw calls and shader materials.
14. Add automated viewport checks at 16:9, 16:10, ultrawide, portrait mobile and reduced motion.
15. Make graphics changes fail CI if they regress the low-end performance profile beyond a budget.
16. Cache procedural textures and ensure restarts free all active effects and signals.
17. Validate all Web exports against a clean browser-compatible server configuration.
18. Add deterministic screenshot checkpoints for briefing, combat, extraction, pause and result states.

### C. Player learning and long-term progression
19. Deliver an After-Action Review that turns actual run measurements into two or three actionable observations.
20. Explain score, rank and reward formulas on the result screen and test displayed values against runtime outputs.
21. Add a local-only replay/event ledger with bounded retention and an explicit export control.
22. Add ghost runs against the player's own best split times before introducing networked leaderboards.
23. Version and migrate career saves; test truncated, malformed and old-schema data.
24. Keep upgrades side-grade oriented and prove cosmetics never modify combat stats or rewards.
25. Add reproducible daily contracts whose challenge code binds seed, contract and modifier version.

### D. Tooling, OpenAI-assisted development and release safety
26. Use OpenAI-assisted review to generate adversarial test cases and find contradictory gameplay states; human-reviewed patches remain the merge authority.
27. Add a machine-readable gameplay-system registry for ownership, events, tuning constants and tests.
28. Add architecture fitness checks for scene ownership, shared mutable defaults, unbounded arrays and hidden network calls.
29. Produce a release manifest with source SHA, Godot version, export hashes, route-matrix result and gameplay test counts.
30. Require final public-route verification to prove the exact HEAD SHA is live before declaring a release complete.

## Quality gates for every release

- Static contract: project settings, controls, privacy boundary, UI affordances and version markers.
- Headless simulation: state transitions and boundary conditions; no parse errors or runtime smoke failures.
- Export gate: official Godot engine and web templates, successful JavaScript/WebAssembly/package export.
- Web gate: game entrypoints and assets return HTTP 200 with correct types and no missing files.
- Production gate: published route matrix has zero failures, expected build matches released source, and post-deploy health checks pass.
- Honest release notes: distinguish native render resolution from upscaling; distinguish deterministic game logic from a remote AI service.

## OpenAI integration boundary

OpenAI can assist with code review, explanations, adversarial test generation and engineering planning. A live in-game LLM feature would require an explicit backend, authenticated API credentials, cost controls, data boundaries, moderation and a safe offline fallback. This blueprint does not claim the game calls an OpenAI API or store secrets in the client.
