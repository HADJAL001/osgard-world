# 04 / NULL//SHIFT — Cinematic Raid Update

## Product promise

A tactical top-down extraction raid about breaking into a facility whose security responds to the operator. The player must link the terminal, solve its directional cipher, recover the quantum core, then reach extraction alive.

## Core loop

1. Read the current contract and locate the terminal.
2. Fight or evade guards while preserving health; use the medkit and pulse when needed.
3. Interact with the terminal and enter the directional cipher: up → left → down → right.
4. Survive the alarm and reach the core.
5. Extract to bank credits; use those credits for permanent suit, pulse and weapon upgrades.
6. Replay the standard raid, Blackout Run or Iron Veil contract.

## Controls

### Keyboard and mouse
- WASD / arrow keys — move.
- Mouse — aim; hold the primary mouse button to fire.
- E — interact with a medkit, terminal, core or extraction zone.
- Q — pulse; interrupts nearby guards and clears nearby enemy projectiles.
- Shift — temporarily shift to the NULL layer. Repeated use raises instability.
- N — spend a NULL charge if the operator has one.
- G / X / V / R — Ghost, Spike, Decoy and Recall modules when unlocked.
- C — cycle contract; U — loadout; 1 / 2 / 3 — buy an available upgrade inside the loadout; Esc — pause/resume.
- F2 — switch Cinematic / Balanced rendering; F3 — open live diagnostics.

### Touch screens
- Left virtual stick — movement.
- Right virtual stick — direction and sustained fire.
- Action strip — fire, interact, pulse, layer shift, NULL charge, Ghost, contract and loadout.
- Four direction buttons appear after linking the terminal.
- A lightweight companion controller keeps the second operator following and supporting the player on touch-first devices, so extraction remains possible without a second physical keyboard.

## Visual / interaction update

- Self-hosted CSS and JavaScript; no remote image, font or analytics dependency.
- Deep near-black environment, graphite panels and one cyan signal color, with amber for recoverable objectives and red for threat.
- Procedural radial light around terminal, core, extraction point, player and guards; restrained scan beam, fine dust and vignette add cinematic depth without video or pre-rendered backgrounds.
- Balanced mode removes the more expensive animated atmosphere. The design respects the reduced-motion preference.
- The world canvas keeps a 16:9 coordinate system while scaling to the available screen; this is an adaptive 2D renderer, not a claim of native 8K output.

## Diagnostics and evidence

The in-game panel is based on the live animation loop and updates locally:
- FPS — reciprocal of the mean of the most recent frame intervals.
- Frame P95 — 95th percentile of the same interval sample; high values expose intermittent stutter.
- Render cost — measured wall-clock time around the game's draw call and cinematic post-effects.
- Long tasks — count of browser main-thread tasks over 50 ms, when supported by PerformanceObserver.

These values are measured in the current game session, not synthetic demonstration figures. They are not a substitute for an external browser/device benchmark and are not transmitted.

## Save and economy

The existing localStorage career save, contract rotation, credit rewards, suit/pulse/weapon upgrades, share-score action and result behavior remain in the existing runtime. No API key or new server variable is required for the local raid.

## Quality gate

The command npm run qa:null-shift checks required game assets, script syntax, controls, core interactions, diagnostics, responsive rules and reduced-motion support. The production route matrix also checks the published page, CSS and JS on desktop and mobile agents.
