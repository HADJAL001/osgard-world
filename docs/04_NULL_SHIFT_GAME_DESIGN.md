# 04 / NULL//SHIFT — Cinematic Raid Update / Release 0.2

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


## Release 0.3 — combat readability and destructible field devices

- Three shootable field devices add tactical choices: an EMP relay stuns nearby guards and clears projectiles; a supply cell restores health and resets pulse cooldown; a phase anchor disrupts hostiles but raises instability. Each has health, damage feedback, a distinct silhouette and a scorch mark for the current raid.
- Enemy archetypes are telegraphed: stalkers warn before a fast dash, heavies aim and fire a three-shot volley, and the Warden warns before a radial projectile pulse. Their visual language uses distinct outlines, colors and wind-up indicators.
- Combat feedback includes layered suit detailing, muzzle flash, directional hit sparks, debris fragments, camera impulse and phase-transition bursts. A particle cap bounds effects on slower devices.
- A dedicated tactical telemetry strip reports remaining hostiles, remaining field devices and eliminations from the current raid. Data stays local.
- The existing 16:9 canvas, reduced-motion preference, cinematic/balanced switch, mobile sticks and local diagnostics remain. Automated smoke tests verify source contracts and syntax; they do not replace real-device tests or prove native 8K rendering.


## Release 0.4 — environmental depth and readable timed hazards

- The industrial arena now uses a cached metallic floor layer with tonal panel variation, seam reflections and beveled wall edges. Static geometry is drawn once to an offscreen canvas instead of rebuilding the texture every frame.
- Two electrical floor conduits cycle through stable, charging and active states. Their in-world markings and matching status banner warn the player before discharge. Standing in an active zone drains health, adding timing and positioning to the raid.
- Friendly and hostile projectiles have directional trails; the desktop aiming reticle follows the pointer. Effects remain within the responsive Canvas renderer and respect the reduced-motion preference.
- Automated smoke/build/deploy checks verify that the update is shipped; manual hardware tests are still needed to evaluate frame pacing on specific devices. This is not native 8K rendering.


## Release 0.5 — motion and sound layer

- Added procedural, no-download sound cues for shots, pulse, phase shift, successful/failed terminal input, damage, eliminations, device destruction, and extraction/failure. Audio is created only after user interaction, can be switched off, and the choice is stored locally.
- Added per-actor motion sampling with smoothed velocity and stride phase, articulated boot/armor detailing, phase/ghost afterimages, and animated low-cost power-conduit pulses. The existing 1280 × 720 world coordinate system is retained and the trail list is bounded.
- Render cost measures the final drawing stack; FPS and frame P95 use requestAnimationFrame timestamps. Measurements remain local.
- Desktop gets a sound toggle in the top controls; touch screens get one in the action strip. Balanced graphics mode remains the fallback for lower-power devices.
- Automated checks cover source contracts and syntax; they do not replace real-device testing or certify native 8K rendering.


## Release 0.6 — WebGL 1.0 renderer

- Added a self-hosted GPU renderer in \`public/games/null-shift/engine-3d.js\`. Procedural meshes and a perspective camera render the arena, raised walls, security gate, terminal, recovery kit, quantum core, extraction pad, destructible field devices, layered operator/guard models, projectiles, electrical hazard telegraphs and particle bursts.
- The current combat simulation remains authoritative for collisions, health, contracts, upgrades, local career data and objectives. A small state bridge exposes the active scene locally to the renderer; no gameplay data is sent to a server.
- A separate transparent WebGL canvas renders the scene with perspective projection, directional lighting, specular/rim response, emissive materials, depth testing, translucent effects and GPU-rendered particles. The 2D Canvas is hidden only while WebGL is active; an engine switch and fallback restore it if WebGL is unavailable or the GPU context is lost.
- Mouse aiming now uses a perspective camera ray intersected with the game plane. The WebGL view retains a tactical minimap, projected objective labels, contextual interaction prompts and a pause overlay.
- Smoke tests and production route checks now include the renderer asset and the game/renderer bridge.
- This is procedural WebGL 1.0 3D rendering, not native 8K output. Imported high-resolution art, shadow maps, skeletal animation and a full post-processing bloom pipeline remain future production work.


## Godot 4.7.2 — tactical feel and premium presentation pass

- The official Godot 4.7.2 stable engine and matching single-thread web templates are downloaded by the existing CI workflow; it parses the native project, runs headless gameplay state-transition tests, exports the browser build, validates the generated files and deploys the export to `/games/null-shift-godot/`.
- Added corner signal pylons, inlaid power rails, gate warning bars, distance fog and a filmic color response.
- The operator has a layered procedural rig with torso plate, helmet/visor, shoulders, forearms, boots, power backpack and weapon details. A walk/breath cycle animates the rig without moving the collision capsule.
- Guards now spawn as Stalker, Heavy, Ranger or Warden roles with different material/silhouette cues. Stalker telegraphs a high-speed dash; Heavy telegraphs a three-lane attack; Warden telegraphs a slower radial strike; Ranger keeps the standard shot pattern.
- Added a desktop recoil reticle, collision hit tint, damage/phase overlay, smooth camera follow and short camera impulses for firing, damage, device destruction and special abilities.
- FPS/P95 diagnostics use the actual frame interval before the simulation delta is clamped. Quality and sound preferences persist locally. Compact/touch layouts default to Balanced unless a preference is saved.
- This is an upgraded procedural Godot 3D build, not native 8K/finished AAA artwork. Authored high-resolution models, material maps, skeletal animation and a richer post stack remain separate production work.


## First-run clarity / onboarding pass

- A one-time, pausing field briefing explains the mission sequence and exact inputs before enemies can act. It uses Russian copy, three numbered mission steps, desktop control hints and a separate mobile control hint.
- Enter/Space or the primary action starts the raid; Escape and H dismiss it while open. H reopens the guide on demand, and completion is saved with local settings.
- A scroll container and viewport-aware panel fit narrow screens. The aiming reticle stays hidden while instructions are open.
- The Godot headless smoke test exercises opening the briefing, pausing, dismissing it and persisting completion before testing combat and extraction.


## Combat interaction pass — telegraphs are now playable signals

- Enemy wind-ups snapshot the attack lane rather than applying unconditional proximity damage at the end of the timer. Rangers fire along one narrow line; Heavy guards project three wider amber lanes; players can dodge by leaving those lanes before the strike resolves.
- The Warden's radial attack has a 7.6-unit danger radius matching its ring telegraph instead of the previous oversized proximity range. Wall/obstacle ray checks allow hard cover to interrupt direct attacks.
- A stun clears a pending wind-up and stored lanes, so an EMP relay or pulse reliably interrupts an enemy attack rather than letting it resolve immediately after recovery.
- Godot runtime smoke checks both inside-lane and outside-lane cases. Source smoke checks that lane storage, geometry tests, line-of-sight query and typed PhysicsBody3D access remain present.


## Premium Web launch shell

- The Godot web export now uses `web/boot_shell.html` via `html/custom_html_shell`, rather than the generic engine page. This shell is regenerated on every export from source and is never hand-edited in the compiled output.
- A cinematic mission card explains the actual three-step raid before engine startup; the start button provides a deliberate user gesture and avoids surprise fullscreen or autoplay audio.
- The loading bar is driven by Godot's `Engine.startGame({ onProgress })` callback and becomes indeterminate only when the engine cannot report a total. The shell checks WebGL 2 support before launch, includes a real fullscreen control, respects reduced-motion preference and links to the lighter Canvas edition if the device cannot run the 3D build.
- The shell is fully self-hosted and uses no font, analytics or asset CDN. Export smoke now asserts that the generated `index.html` contains the custom shell marker and engine progress/capability checks.


## Responsive HUD and operator feel — follow-up pass

- Godot HUD panels reflow when the viewport changes. Compact screens receive a full-width status panel and actionable objective strip; desktop-only telemetry chrome is hidden rather than overlapping the arena.
- Movement and combat controls resize to the available width. The 320 px profile uses a 142 px movement panel, a 150 px combat panel and 59 px action targets; desktop dimensions return when the viewport grows.
- Reticle visibility distinguishes touch-assisted aiming from a narrow mouse-driven desktop window.
- Camera follow uses exponential damping and bounded screen impulses. The operator rig has restrained walk/breath movement without moving its physics capsule.
- Runtime smoke asserts the 320 px panel/button dimensions. Static and headless checks guard the responsive layout before Web export.


### Combat readability follow-up

- Floating world-space health readouts display the correct remaining/max HP when an enemy takes damage. Readouts on regular hostiles fade out after 1.8 seconds; the elite Warden keeps its status visible.
- Fixed the suit-material state lookup to target `operator_suit` inside the new `OperatorRig`, so damage and phase-shift colors affect the model that is actually rendered.
- Added runtime smoke assertions for the hit-triggered health readout and the nested suit damage material, extending the test from scene startup to the live visual/game-state connection.


## Release 0.7 — instanced GPU submission and atmospheric lighting

- Added an optional \`ANGLE_instanced_arrays\` WebGL path. Objects are grouped by shared mesh and submitted as instanced draws instead of one draw call per object. The compatible non-instanced renderer remains as a fallback when the extension or required vertex attributes are unavailable.
- Instance attributes carry world position, scale, rotation, albedo/opacity, emissive contribution and material response. The instancing shader performs per-instance transforms and adds specular/rim lighting plus restrained depth fog.
- Live diagnostics now report draw packets, instances, triangles and CPU-side submit time. CPU submission duration is explicitly not described as GPU execution time because a portable GPU timer is unavailable in this WebGL 1.0 path.
- The production smoke test and public-route matrix now require the GPU instancing path to be present in the shipped resource.


## Release 0.8 — adaptive rendering and truthful telemetry

- Fixed the WebGL diagnostics label: the CPU build/submission value now displays the same live timing measurement used for the render-cost cell, instead of a stale, never-updated variable.
- Added a hysteresis-based dynamic render scale. Sustained slow frame intervals lower the internal resolution in controlled 10% steps down to 62%; sustained headroom restores it in gentler 5% steps. The governor keeps existing Cinematic/Balanced limits and never increases scale above the selected device/quality cap.
- The render badge shows the current adaptive scale. The diagnostic note distinguishes CPU scene-build/API-submission time from GPU execution, which is not directly measurable in this portable WebGL 1.0 path; adaptation uses requestAnimationFrame frame pacing rather than claiming a GPU timer.
- The smoke test now guards the adaptive governor and rejects the stale diagnostics variable; the production-route matrix requires the governor and corrected measurement to exist in the published engine asset.
- This improves responsiveness under variable hardware load but does not create native 8K output or replace testing on real phones, tablets and desktop GPUs.

- Follow-up guard: initialized the WebGL statistics ticker and render-cost accumulator in strict-mode scope; smoke and production-route checks now require both declarations so a missing counter cannot silently force the 2D fallback.


## Release 0.9 — grounded characters and soft contact shadows

- Added a feathered procedural shadow mesh with per-vertex opacity and a radial fade. Operators, guards, extraction, terminal, recovery kit, quantum core and active field devices now have contact shadows that visually anchor their silhouettes and props to the arena floor.
- The instanced WebGL path carries vertex alpha as an eighth attribute, allowing the shadow gradient to fade smoothly instead of ending in a hard circular decal. Every other mesh defaults to full vertex alpha; the compatible non-instanced path remains available.
- Smoke and production-route checks require the shadow mesh, vertex-alpha shader path and use of grounded shadows in the published game engine.
- This adds real geometry/shader behavior rather than a static mockup. It is a lightweight contact-shadow solution, not a full shadow-map system or native 8K rendering; device performance still needs observation on physical hardware.


## Godot follow-up — measured adaptive cinematic quality

- The native Godot 4.7 game now evaluates a rolling sample of real frame times every 1.25 seconds while the Cinematic profile is selected. It uses mean frame duration and P95, not invented GPU-time estimates.
- After two consecutive slow windows (mean >= 20 ms or P95 >= 28 ms), the runtime temporarily disables glow, key-light shadows, fill lighting and local accent lights. It restores those effects only after four consecutive stable windows (mean <= 16.8 ms and P95 <= 21 ms), avoiding quality flicker around a threshold.
- The HUD subtitle and live diagnostics report when the runtime is auto-optimizing. The manual Balanced profile remains respected and is not silently overridden.
- Runtime smoke drives synthetic slow and stable timing windows against the actual Godot scene and asserts that effects switch off and restore. These controlled tests verify the adaptation logic; they do not claim a specific FPS on every physical device.


## Godot gameplay pass — timed Phase Conduits

- The Godot 4.7.2 3D arena now has three staggered energy lanes along the floor. Each cycles through safe, amber charging and red active phases; uniquely duplicated emissive materials pulse during warning/active windows.
- The HUD exposes live hazard state: stable, charging or active. The cycle pauses during pause/briefing and resumes with the simulation.
- Active lanes inflict actual 13-point player damage through the game's damage pipeline, camera/screen feedback, sound and HUD updates. Leaving the lane avoids damage, and the existing NULL Shift invulnerability window can safely cross an active lane.
- The first-run briefing teaches how to read and evade the warning. Runtime smoke deterministically exercises warning visibility, active visibility, HUD state, actual damage, dodge avoidance and phase-shift protection. Source QA requires the new gameplay methods and visual objects before Godot export/deploy.


## Godot release 0.4 — Phase Surge and Vitality HUD

- Added one preallocated 3D surge rig per timed conduit (emissive sphere head, rotating torus ring and short energy wake). During the amber warning phase the pulse advances along the floor; when the conduit activates it turns red and continues through the lane. The rigs are reused instead of allocating particle systems every frame.
- Added three compact per-lane HUD chips on desktop that mirror NORMAL / CHARGING / ACTIVE. The row hides in compact/touch layouts to protect the play area; the existing top-line alert remains visible.
- Added a real ProgressBar health readout whose value is bound to runtime player health and whose fill changes between cyan, amber and red thresholds.
- Godot runtime smoke now exercises health values/colours, pulse visibility and travel, wake position, active material transition and the matching HUD state. The project source-contract smoke requires the new nodes and UI.
- This is a procedural Godot Web/3D improvement, not native 8K rendering; real device profiling remains required.


## Godot release 0.4.1 — runtime parse guard

- Fixed the phase-surge update order so lane-specific warning/active materials are read from the lane state before the pulse visuals use them.
- The headless test now checks that the main scene actually attached its GDScript after instantiation, and exits immediately with a clear failure rather than continuing to access missing game properties when a script parse error occurs.


## Godot runtime refinement — Release 0.6

This pass removes recurring allocations from the firefight path: beams and ring bursts now use bounded reusable node/mesh pools with deterministic frame-delta expiry rather than a new scene node and timer for each effect. Operator facing follows aim direction smoothly; leg pivots animate in opposing phases according to movement speed, and firing adds a short emissive muzzle flash plus recoil. Diagnostics expose active effects, pool capacity and dropped cosmetic effects. The pinned Godot 4.7.2 CI/export workflow remains the engine installation and web-export authority; no manual local installation or third-party runtime assets were required.


## Release 0.8 — tactical radar and compact HUD

- Added a GDScript-drawn radar to the Godot port. It maps authoritative arena coordinates to screen space and draws cover, security gate, timed phase conduits, player aim, hostile archetypes, destructible devices, terminal, core, extraction and the healing item.
- Objective markers use real gameplay state and update when the cipher is unlocked and the core secured. The implementation uses procedural control drawing only, without stock art or remote assets, and redraws on a bounded timer.
- The radar is shown on desktop and hidden on compact/touch layouts to preserve movement/action safe zones.
- Static project checks and Godot headless smoke tests cover projected coordinate bounds, clamping, hazard colours and live game-state wiring.


## Release 0.4 — visible aim assist and line-of-sight target lock

- Replaced unconditional nearest-enemy touch aim with range-limited, line-of-sight selection. The desktop path only marks enemies inside a narrow cone aligned with actual mouse aim; touch mode prefers the nearest visible guard while mildly retaining the current target to avoid rapid target flicker.
- Added a native Godot HUD target bracket built from eight vector rectangles, a role-colored health bar and live role/HP readout. Its projected screen position follows the target with exponential smoothing and a restrained pulse. The marker hides if the target is behind the camera, outside usable viewport bounds, destroyed, hidden by a menu or no longer selected.
- The runtime smoke test now moves a guard into a known visible position and checks the bracket, identity, health bar and hide-on-unlock behaviour. Static source checks require the target selection and ray-query path in the packaged Godot project.
- This is an engine-backed gameplay feature, not a mockup or an 8K guarantee. It improves touch targeting and combat readability while keeping the same Godot game and web export.


## Release 1.8 — tactical operator dash

- Added an engine-side dash mapped to Space and a dedicated mobile action button. Direction follows current WASD/arrow/touch movement; with no movement input it follows operator aim.
- The CharacterBody3D keeps its collision-aware \`move_and_slide()\` path but receives a short 3.05× movement burst. A 0.24 s active window grants a single bounded evade against the next damage event; a 1.65 s cooldown prevents repeated evades.
- The dash triggers pooled cyan/violet ring and trail effects, a small camera impulse, a synthesized sound and a temporary suit flash/lean. HUD feedback shows active/recharge/ready state; diagnostics count successful evades and report the cooldown.
- The compact mobile action panel grows to fit its fifth action without reusing movement or aim surface. Headless smoke checks exercise touch triggering, movement direction, real CharacterBody movement, cooldown rejection, one-hit immunity, suit feedback, and diagnostics rows.
- CI remains responsible for official Godot 4.7.2 installation/templates, headless gameplay tests, WebAssembly/PCK export and published Godot route checks.

- Balance guard: the evade window now absorbs only the first incoming damage event for each dash; subsequent damage during the same burst still applies. The headless smoke test asserts this explicitly.


## Release 1.8 — retention + share conversion loop

The Godot build tracks a persistent UTC daily-clear streak, longest streak and last completion date. Daily rewards remain 400 credits, with +100 on the third consecutive clear and +300 on each seventh consecutive clear. Duplicate claims are blocked. A missed UTC date resets the active streak while retaining the record. The loadout shows streak, record and next milestone; the share card communicates the streak and daily challenge code. The feature is soft-currency only and does not create pay-to-win attributes.


## Release 0.10 — engine-native atmospheric depth

- Added a Godot GPUParticles3D suspension-dust field using procedural sphere motes, a four-stop alpha-ramp texture, slow drift and bounded visibility. The effect adds depth in front of the existing fog/lighting without importing textures or making per-frame scene allocations.
- The system is integrated into the real quality governor: Cinematic = 72 motes, Balanced = 32 at reduced speed, Performance = emission disabled. Adaptive degradation suspends particles and stable frame timing restores them.
- Runtime and static release tests verify the emitter, particle material, fade ramp, density choices and automatic/manual quality transitions.
- This is a restrained real-time atmosphere layer, not volumetric cloud simulation or native 8K rendering. Actual frame-time quality still needs device profiling.


## Release 2.1 — reduced-motion accessibility

- Added a persistent Reduced Motion preference, available from F4 on desktop and a dedicated third utility button in the Godot touch HUD. The button shows MOT ON / MOT LOW and describes the setting in its tooltip.
- Reduced mode clears active camera shake when enabled, scales future screen impulses to 12%, reduces their duration to 70%, limits camera FOV breathing to 18%, and holds the health-vignette pulse at a steady level through a shader uniform. Aim, movement, dash windows, weapons, damage and mission state remain unchanged.
- The setting is stored in the existing local career settings. Headless runtime smoke measures the difference in FOV response and camera shake, verifies shader pulse suppression, exercises the touch toggle, and confirms persistence; the static source contract requires the F4 path and all mobile utility sizing declarations.


## Godot visual pass — volumetric combat tracers

- Replaced the single zero-width line in the bounded beam pool with two crossed 3D triangle ribbons and a precise center line. The beam remains readable from elevated or oblique camera angles and is less dependent on driver-specific line rasterization width.
- Ribbon width scales gently with beam length and remains capped. The existing `ImmediateMesh` pool, lifetime handling, materials and gameplay remain intact; shots do not allocate new scene nodes.
- Runtime smoke checks the actual mesh surface count, while the static release contract verifies the triangle-ribbon and core-line primitive declarations. This avoids relying on a surface-inspection method that Godot 4.7 does not expose on ImmediateMesh.
- This is a geometry-level gameplay presentation improvement, not a claim of native 8K output. It runs through the existing Godot 4.7.2 GL Compatibility Web export pipeline.


## Godot release 0.10 — moving hazard illumination

- Each of the three timed phase conduits now owns one `OmniLight3D` parented to its moving surge rig. The light follows the surge head and changes to amber during warning, stronger red while damaging, and restrained cyan while pulse-suppressed.
- The lighting cue is driven by the same hazard state that controls damage and HUD status, keeping visual telegraphing synchronized with the simulation. The light is disabled in the Performance preset and during adaptive quality degradation.
- Runtime smoke validates warning/active/disrupted light colors, energy, spatial tracking, expiry behavior and quality-mode suppression. Static Godot smoke also requires the light-state wiring.
- This adds stateful lighting to the real Godot scene, not just a browser overlay. Frame-rate and shadow behavior still need measurement on physical target devices.


## Release 2.2 — native Godot movement trails

- Added a physics-sampled dash afterimage trail using the existing bounded crossed-ribbon beam pool. Trail colour follows the active NULL SHIFT phase, and emitted trail count is available in live diagnostics. This uses actual player-body positions and does not allocate character clones.
- Applied a progressive transparency fade to pooled beams based on normalized remaining lifetime. Transparency is reset on pool expiry/reuse, so weapon tracers, guard telegraphs and dash afterimages fade instead of abruptly popping out.
- Godot runtime smoke now checks that a real touch/physics dash emits afterimages and that pooled beam opacity advances through a fade, returns to zero, and reuses the same mesh.
- Godot remains the engine-backed 3D branch; GL Compatibility is retained for Web/mobile export. This is not a claim of native 8K output.


## Godot release 0.11 — native gamepad controls

- Added first-class Godot joypad input for connected USB/Bluetooth controllers. Left stick drives the existing CharacterBody3D movement vector; right stick controls aiming, with radial dead-zone remapping and a restrained 14% target-cone assist. Right trigger or RB holds automatic fire.
- Standard button mapping: A interacts, B tactical dash, X pulse, Y phase shift, Start pause/resume, Back opens diagnostics, LB opens loadout. The D-pad enters the same four-step directional cipher as keyboard arrows. Controller hot-plug updates the active device; mouse motion and keyboard input return the game to desktop controls, while touch input keeps priority on compact/touch layouts.
- The live bottom hint updates to describe the current control mode. Existing collision, weapon timing, dash cooldown/evade window, mission progression and local save data remain shared with keyboard/touch controls.
- Headless Godot runtime smoke synthesizes controller events to test analog dead-zone behavior, full stick output, movement-vector integration, pause/resume, and D-pad terminal hacking without requiring a physical controller in CI. The static source contract also requires axis polling, trigger fire, hot-plug handling and adaptive HUD hints.
- The repository CI already installs the official Godot 4.7.2 engine and Web export templates; no separate local installation is needed for reproducible exports.


## Godot release 0.12 — deterministic daily anomaly director

- Every valid daily challenge code now selects two distinct gameplay modifiers using a stable UTF-8 FNV-1a seed and a fixed modifier catalogue. Friends entering the same shared challenge get the same modifier pair; no account, server call, or new dependency is required.
- Six modifiers can rotate into the daily run: faster/more aggressive hunters, extra armour on hostiles, 22% faster live electrical lanes, a disabled medkit, a harsher NULL shift with elevated starting instability, and a jammed tactical radar.
- The modifiers change the simulation itself (guard speed, cooldown/damage/HP, timed lane cycle, supply interaction, phase-instability cost and radar visibility), not just labels or particle effects. The HUD and loadout show the active anomalies before and during the run.
- Expanded the Godot headless runtime smoke to verify that modifier selection is deterministic and distinct, malformed links cannot grant modifiers, and the selected mutators alter the real game state. The deploy pipeline regenerates and publishes the Godot Web export directly on OSgard World.
- This adds repeatable challenge variation without changing the existing challenge URL format, regular contracts, local career economy, or daily reward idempotency.


## Godot release 0.13 — Precision Combat Director / 30 upgrades

This release changes the combat and scoring loop in the Godot 3D runtime (not a mock page). The following 30 upgrades are included:

1. Upper-hit-zone precision detection through the real weapon raycast.
2. Precision hits inflict two damage points; precision + Overdrive can reach three.
3. Distinctive critical-hit readout above the target.
4. Dedicated critical-hit burst, light and ring feedback.
5. A higher-pitch critical-hit audio cue.
6. Timed elimination combo chains.
7. Combo expiry after 4.25 seconds without a takedown.
8. Five deterministic combo multiplier tiers (×1.00 to ×2.00).
9. Combo multipliers affect the earned-credit bounty.
10. Enemy-role bounty differences for Stalker, Ranger and Heavy.
11. A substantial Warden elite bounty.
12. Best-combo tracking in the mission record.
13. Overdrive charge earned through eliminations.
14. Extra charge for a precision finishing hit.
15. Overdrive only activates at full charge.
16. A five-second Overdrive duration with an explicit expiry state.
17. Increased weapon damage while Overdrive is active.
18. Damage mitigation while Overdrive is active.
19. Reduced hostile movement speed during Overdrive.
20. Slower hostile dash, cooldown and attack-telegraph simulation while active.
21. Smooth camera field-of-view boost during Overdrive.
22. Premium purple activation ring and dynamic light pulse.
23. Separate activation, critical-hit, combo and expiry sound cues.
24. Keyboard activation on R.
25. Gamepad activation on right-stick click without stealing the fire trigger.
26. A dedicated mobile/touch Overdrive button.
27. A visible Overdrive charge bar in mission control.
28. A live combo, multiplier and accuracy readout.
29. Shot accuracy and actual damage-taken metrics for each run.
30. S/A/B/C mission grades, score-driven grade bonuses and a fuller results report.

The runtime smoke now checks combo thresholds, critical damage, the charge gate, Overdrive's real enemy-speed effect, timer decay, kill awards, combo breaking, accuracy arithmetic and grade bonuses. The pause screen no longer inflates mission elapsed time. Existing daily challenge IDs, fixed mutators, career upgrades, extraction objective, desktop/touch/gamepad input modes and local-only progression remain compatible.


## Post-release combat calibration — compact hostile hitbox alignment

- Calibrated the weapon ray to the vertical centerline of the actual hostile capsule. Shorter Stalker/Ranger silhouettes can now be hit by the same horizontal ray, instead of relying on the taller Heavy/Warden hitboxes.
- Critical damage now requires the current aimed/locked hostile plus an upper-zone ray intersection; simply damaging an enemy through the helper does not masquerade as a precision shot.
- Added an end-to-end headless test that positions a compact hostile, fires the real weapon ray, and verifies shot count, confirmed hit, two-point precision damage and critical telemetry, then restores the simulation state.


## Release 2.7 — line-of-sight Overdrive chain arcs

- Added a new combat mechanic to the Godot runtime: while the timed Overdrive is active, a confirmed weapon hit can conduct one violet arc to the nearest secondary guard within 7.5 metres.
- The secondary hit uses 55% of regular Overdrive damage, rounded to at least one hit point. The arc respects physics line-of-sight and stops at solid geometry. It reuses the existing bounded beam, particle, ring and impact-light pools; it does not create a new per-hit node pool.
- The chain is deliberately one hop only and never records a second fired shot, so accuracy and shot counts remain true to player input. The diagnostics HUD exposes the total successful arc count.
- Added headless Godot runtime tests for the visible-target arc, reduced secondary damage, accuracy accounting, wall occlusion and inactive-Overdrive case, plus static source-contract guards.


## Godot release 0.13 — squad perception, sound propagation and last-known-position AI

- Replaced omniscient hostile tracking with a real perception loop: a 150° field of view, range-limited detection, and a physics-ray check against solid cover. Attack telegraphs now start only after confirmed visual contact.
- Hostiles remember the player's last seen position, search that location after losing sight, and return to short patrol routes when the trail goes cold. A guard no longer chases the live player coordinate through a wall.
- Gunfire, pulse, phase shift and destroyed devices emit radius-limited noise events. Guards in range investigate the noise source; firing during NULL SHIFT has a smaller sound radius than ordinary gunfire.
- A squad radio alert shares fresh contact positions with nearby hostiles, while individual guards keep separate heard-event cursors so old sounds are not replayed every frame. Overhead role tags and tactical telemetry show CONTACT, INVESTIGATE and SWEEP states.
- Added deterministic smoke coverage for field-of-view geometry, sound radius, noise sequence delivery and the transition from patrol to investigation/contact. Existing roles, precision damage, Overdrive, daily anomalies, gamepad/touch controls, local progression and objective sequence remain in the same game runtime.


## Godot release 0.14 — squad flanking and cover-aware movement

- Engaged hostiles no longer share one identical chase point. Each guard receives a stable golden-angle slot around the player's last visible position, distributing the squad into distinct approach lanes rather than a single line.
- Engagement distance now reflects role identity: STALKER presses at 3.8 m, HEAVY holds 5.4 m, RANGER works at 6.2 m, and WARDEN pressures from 7.0 m. The values describe tactical waypoint radius, not a hard attack-range lock.
- A short physics-ray fan checks the actual solid geometry in front of a moving hostile and selects a clear left/right detour with a small alternating squad bias. The steering function is used by patrol and engaged/investigating movement; it does not teleport actors or bypass collision.
- Guards continue to face a visible player while moving laterally toward a flank position, preserving readable aiming and telegraphs. Waypoints are clamped to the playable deck.
- Extended the Godot headless runtime smoke with deterministic flank geometry, role-specific spacing, deck-edge bounds, a real temporary wall collider and a verified clear detour. Existing visual cone, sound propagation, radio awareness, Overdrive chain arcs, daily anomalies, player input and career saves stay on the same Godot path.


## Godot release 0.14 — Warden: reactive boss phase and precision stagger

- The extraction lockdown Warden is now a true two-phase encounter, not just a high-HP guard. At 50% health, its armour/core/health label visibly transform to Phase II; its movement and damage scale up, the telegraph shortens, and the radial attack expands from eight to twelve firing lanes.
- Precision hits during a live Warden attack telegraph interrupt the attack, clear its firing lanes, and apply a measurable 0.9-second stagger. Ordinary hits still deal damage but do not get this counterplay reward.
- The phase transition is one-shot and driven by actual health state. The HUD surfaces phase-transition and stagger counts; headless Godot tests exercise the real damage path, the exact 50% threshold, live stat changes, 8-to-12 lane progression, visible boss labels and attack cancellation.
- This is integrated into the existing extraction lockdown flow and keyboard, gamepad and touch combat controls; no separate demo scene or mocked encounter was introduced.


## Godot release 0.15 — reactive arena overload network

- Rebuilt the three destructible field devices as distinct, physically local combat decisions rather than three cosmetic reward switches.
- **EMP Relay:** a 13.5 m spatial burst interrupts attack telegraphs, dashes and active hostile attack lanes for 3.2 seconds only for guards inside the effect radius; distant guards are not frozen. Its floor shockwave expands to match the real effect radius.
- **Energy Cell:** an 8.8 m Nova suppresses nearby hostile attacks for 2.15 seconds, cancels their windups, instantly restores the Pulse cooldown and adds 30 points to Overdrive charge. The existing +35 health recovery remains on device destruction; its visual shockwave maps to the Nova radius.
- **Phase Anchor:** rupture adds 18 instability and opens a brief one-second shift window, while the closest physical energy conduit is visibly disabled for 6.5 seconds. The conduit resumes through its normal phase state machine when the disruption expires.
- Impact rings still share the bounded ring pool; each ring can now choose a target expansion scale while older visual effects keep their previous default sizing. Tactical telemetry and F3 diagnostics expose EMP, Nova and lane-collapse counts.
- Expanded headless Godot runtime coverage to check radius boundaries, cancelled enemy telegraphs, resource recovery, nearest-lane suppression and the real 3D state. Regular combat, Warden phase logic, daily mutators, gamepad/touch input, local-only career and reward idempotency remain compatible.


## Godot release 0.16 — Adaptive Counterplay Director

- The runtime learns an explainable tactical signature from three successful player actions: dash, pulse and phase shift. Weights decay over time; a doctrine changes only when one style has enough evidence and a clear share of recent actions. A lock interval prevents rapid switching.
- INTERCEPT: Stalker telegraphs gain extra wind-up and targets are predicted from planar velocity, clamped to the arena; a fast player can still evade the committed intercept.
- SPLIT: engaged enemies use wider, role-coded flank positions. Ranged and heavy units spread outside one normal pulse radius wherever arena geometry permits rather than stacking into one easy stun.
- ECHO TRACK: phase shifts become easier for security to hear, extending the existing acoustic investigation system; it does not reveal the player through walls.
- BALANCED remains the default for weak or mixed evidence. The active doctrine and switch count are visible in the HUD/diagnostics. Signals stay in memory for the run; no remote telemetry, account profiling or external API dependency is added.
- Headless runtime tests cover selection thresholds, all three doctrines, a real widened flank, acoustic radius changes, bounded movement prediction and doctrine transitions.


## Release 2.9 — staged adaptive quality and frame-budget telemetry

- The cinematic governor now has two adaptive stages instead of an all-at-once downgrade. After two sustained slow windows it enters Soft Optimize: particles drop from 72 to 46 and glow intensity is trimmed while shadows, local lighting and PBR detail maps remain active. Another pair of slow windows escalates to Hard Optimize.
- Recovery is progressive: four stable windows move Hard Optimize back to Soft Optimize, and four more restore full Cinematic quality. Manual Cinematic/Balanced/Performance settings stay independent from automatic decisions and remain user-controlled.
- Live diagnostics now expose the share of recent frames exceeding the 16.67 ms/60 FPS budget, engine process time, physics process time, rendered primitives and scene-node count, alongside FPS/P95/draw calls and bounded effect-pool health. CPU counters are not labeled as GPU execution time.
- Headless Godot runtime smoke covers both optimization steps and both recovery steps. The Node source contract requires the Performance monitors and new labels to exist in the engine build.


## Godot release 0.17 — reproducible daily setup and After-Action Black Box

This release adds a 64-event, local-only mission recorder and an exportable after-action report. It does not add a network analytics endpoint or send game telemetry.

The implementation bundles more than 30 concrete engineering refinements:

1. A reusable stable seed resolver validates the daily challenge code before producing a seed.
2. Invalid or malformed challenge codes produce no seed.
3. Valid daily runs apply the seed before the procedural world is built.
4. Standard free runs retain fresh randomized setups.
5. The seed is carried through the report so players can identify the setup they played.
6. The challenge code remains tied to the existing contract-selection rules.
7. The six daily mutators use the same seed resolver as world setup.
8. The event tape has a hard capacity of 64 records.
9. Overflow removes the oldest evidence rather than growing memory without bounds.
10. Event timestamps use the game's elapsed clock, not personal wall-clock data.
11. Timestamp precision is reduced to hundredths of a second.
12. Event names are length-capped.
13. Event detail strings are length-capped.
14. World coordinates are quantized to tenths of a metre.
15. Position data is omitted when an event has no meaningful world location.
16. A raid-start event records standard versus daily play.
17. Cipher completion creates a terminal-unlocked event.
18. Weapon events distinguish hit, miss and critical hit.
19. Eliminations record hostile role and score value.
20. Dashes record tactical-evasion activations.
21. Pulse activations record field-suppression decisions.
22. NULL Shift records phase-transition choices.
23. Accepted player damage records actual mitigated health loss.
24. Device events identify RELAY, CELL or ANCHOR.
25. Securing the core records the transition into extraction pressure.
26. Extraction overload records lockdown and escalation count.
27. Warden Phase II transitions enter the tape.
28. Precision interrupts enter the tape separately from ordinary damage.
29. Successful and failed mission endings are explicitly distinguished.
30. Mission-score math exposes positive components and separate damage/time penalties.
31. The published score remains mathematically identical to the existing scoring function.
32. Negative raw totals clamp to zero.
33. A versioned report schema is included in the exported object.
34. The report contains outcome, challenge code, seed, contract and elapsed time.
35. The report contains combat accuracy, hits, misses, criticals, damage, combo and dash evasions.
36. Device destruction is aggregated by device type.
37. Extraction pressure, reinforcement and overload data are included.
38. Warden phase and precision-stagger metrics are included.
39. The adaptive counterplay doctrine and local action counts are included.
40. Active daily anomalies are preserved in the report.
41. Up to three coaching suggestions are generated from measured run performance.
42. The result screen exposes an explicit JSON-export action.
43. Web export uses a browser-generated Blob download after the player presses the button.
44. Native desktop export copies the same JSON report to the clipboard.
45. The report contains no account identifier, email address or remote telemetry channel.
46. Runtime tests prove seed repeatability, score reconciliation, event-cap enforcement and report integrity.
47. Source smoke checks ensure export code contains no fetch, XMLHttpRequest or sendBeacon upload path.

The WebAssembly build keeps the same Godot GL Compatibility runtime and existing OSgard World route. Exporting the report is a local player action, not an external analytics integration.


## Godot release 0.18 — Thermal Sovereignty / tactical recon

This release contains 30 connected gameplay improvements: ARC-9 shot heat; weapon-upgrade heat scaling; lower Overdrive heat; hard firing lockout at 100%; passive cooling; faster lockout recovery; a separate unlock threshold; V / gamepad D-pad-down emergency vent; minimum vent threshold; independent vent cooldown; safe heat reset; enemy windup interruption; Stalker dash interruption; radial pushback; bounded area damage; pooled visual burst; distinct sound; bounded local black-box events; live heat percentage; danger-stage colours; touch vent control; after-action thermal state; overheat/vent counters; mission coaching; Z / D-pad-up Tactical Scan; finite scan radius/duration/cooldown; real enemy enumeration; through-cover role/HP/distance signatures; temporary reveal of ordinarily hidden field-device labels; and local recon metrics in after-action JSON. No network telemetry or account data is added. Regression tests cover lockout, cooling, vent interrupts, reveals, cooldowns and report integrity.


## Godot release 0.19 — Phase Echo / tactical deception

Phase Echo adds a short-lived emissive hologram to the 3D arena. It is placed ahead of aim or behind current movement, broadcasts a fresh squad-radio contact and acoustic event, and gives regular hostiles a real last-known position to investigate. A guard that still sees the operator continues to prioritise the actual player; the decoy is most useful after breaking line of sight.

The Warden rejects the holographic lure. The ability has a 4.8-second signal window and a 15-second cooldown; only one projection can exist at a time. The local after-action report records deployments and confirmed enemy diversions. The ring animation respects Reduced Motion. Keyboard (T), gamepad (D-pad right) and touch all call the same ability. The effect is local-only and is cleared when the raid ends.

### 30 refinements in this release

1. Added a new tactical choice instead of a cosmetic-only effect.
2. Added a visible 3D emissive operator silhouette.
3. Added an animated ground-plane signal ring.
4. Added a compact scanline for distance recognition.
5. Added a floating decoy label.
6. Added a local light beacon removed with the hologram.
7. Placed projection relative to current movement or aim.
8. Clamped placement to arena bounds.
9. Added a hard active-duration limit.
10. Added a separate cooldown.
11. Prevented duplicate decoys from stacking.
12. Blocked activation during pause, briefing, terminal use and completed runs.
13. Added keyboard activation on T.
14. Added gamepad activation on D-pad right.
15. Added a dedicated touch-screen control.
16. Added live cooldown text to the HUD.
17. Added live remaining-duration text.
18. Added a fresh, serialised squad-radio contact.
19. Added a decoy-specific acoustic event.
20. Made unaware regular guards investigate the decoy's actual world position.
21. Counted confirmed AI diversions.
22. Added a counterplay rule for the Warden.
23. Extended radio audibility when ECHO TRACK doctrine is active.
24. Added fade and light decay as projection expires.
25. Made ring animation respect Reduced Motion.
26. Added bounded event-ledger records for deployment, diversion and expiry.
27. Added deployments and confirmed diversions to after-action JSON.
28. Added coaching when a player never tries the tool.
29. Added runtime assertions for signal, investigation, immunity, cooldown and cleanup.
30. Added source-contract checks so CI fails if the ability disappears.

This is a gameplay milestone, not a claim of native 8K rendering or measured performance on every physical device.
