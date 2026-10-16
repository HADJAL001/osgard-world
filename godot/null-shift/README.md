# NULL//SHIFT — Godot port

This is the engine-backed 3D branch of NULL//SHIFT. The production game remains available at /games/null-shift/ while this branch is built and tested; the Godot build is published separately at /games/null-shift-godot/.

## Engine and rendering

- Godot 4.7.2 stable, GDScript, Compatibility renderer. The browser build is the preferred 3D entry; the earlier Canvas version remains available as fallback.
- Browser export uses the single-threaded Web template to avoid SharedArrayBuffer and cross-origin-isolation requirements.
- Procedural 3D arena with corner signal pylons, inlaid energy rails and three timed phase conduits. Amber warning bands charge before the red active phase. A preallocated 3D surge head, orbit ring and trailing wake visibly travel down the warning lane and continue through discharge; three HUD chips mirror each conduit’s state. The operator takes real damage while standing in an active lane and can dodge or use NULL Shift to avoid it. A live health bar changes from cyan to amber to red as vitality drops. Distinct Stalker/Heavy/Ranger/Warden behavior has dodgeable telegraphed attacks and line-of-sight checks, layered operator armor and guard helmets, physics collisions, terminal, quantum core, extraction pad, metallic/emissive materials, fog, dynamic lighting, shadows, configurable glow, reticle, camera impact response, particles, and synthesized sound.
- No third-party runtime assets, remote fonts or external image dependencies.

## First-run briefing

The first launch opens a pausing Russian-language field briefing with the three mission steps and separate desktop/touch controls. Enter, Space, Escape or the primary button dismisses it. Completion is saved locally; H reopens the briefing later. A scroll container adapts it to narrow screens.

## Raid loop

1. Reach the terminal and interact with E or the mobile action button.
2. Enter the directional cipher: up, left, down, right.
3. Fight or evade guards and destroy the EMP relay, energy cell, or phase anchor for different tactical effects. A pulse (Q) also suppresses a nearby charging/active phase conduit for 1.85 seconds, creating a short safe window at the cost of its cooldown.
4. Secure the quantum core and reach extraction. This starts a 30-second Extraction Pressure window: two interceptors enter the exit lane, and the three phase conduits accelerate by 18%. The live HUD shows a color-changing countdown and progress bar.
5. If the window expires, the network escalates into Lockdown Breach and dispatches a Warden (or a capped backup guard if the Warden is already active). Extraction remains possible; the phase conduits keep a smaller 12% speed increase so the missed window creates pressure rather than an arbitrary game-over.
6. Bank career credits, install persistent local upgrades, and replay one of three contracts.

## Controls

- WASD or arrow keys: move.
- Mouse: aim; hold left mouse button: fire.
- Gamepad: left stick moves, right stick aims with restrained target assist, RT/RB fires, A interacts, B dashes, X emits the pulse, Y activates phase shift, Start pauses, Back toggles diagnostics, LB opens loadout. The D-pad enters the terminal cipher; controller hot-plug is detected automatically.
- E: interact; Q: pulse; Space: tactical dash (short burst with one-hit evade window and 1.65 s cooldown); Shift: phase shift.
- F2 cycles three persisted graphics profiles: Cinematic (glow + shadows), Balanced (shadows + practical fill lights), and Performance (reduced dynamic lighting). Cinematic mode uses a two-stage adaptive governor: Soft Optimize first reduces particles while preserving glow/shadows, and Hard Optimize only activates after further sustained pressure. Recovery restores one tier at a time.
- F3 toggles live diagnostics; F4 toggles and persists Reduced Motion (less camera shake, field-of-view breathing and vignette pulsing); M toggles and persists sound; Esc pauses; C rotates contracts; U opens loadout; 1/2/3 buy upgrades.
- Touch controls include a dedicated MOT button for Reduced Motion with a live ON/LOW state and tooltip; the setting persists locally and never changes combat timing, damage or collision behavior.
- Touch screens include dedicated graphics-profile and FPS/diagnostics buttons alongside movement, fire, action, pulse, phase-shift and dash controls; the dash button shows cooldown and aiming is assisted.

## Live diagnostics

The game reads FPS, rolling frame-time P95, current frame interval, percentage of recent frames exceeding the 16.67 ms / 60 FPS budget, engine process and physics-process time, draw calls, rendered primitives, scene-node count, effect-pool usage, hostiles and remaining devices. The reticle follows desktop aim and hides during touch-assisted aiming; damage and phase changes trigger brief camera and screen feedback. Values are calculated in the running game, not demonstration placeholders. Career and upgrades are saved locally by the engine.

## Browser launch shell

The exported page uses a first-party responsive boot screen with a real byte-progress callback from Godot, explicit WebGL 2 capability detection, a fullscreen control, reduced-motion support, and a fallback link to the lightweight Canvas edition. No remote fonts, image CDN, analytics or external script are used. The progress bar is tied to the export loader; it does not simulate percentage progress.

## Browser export

The deployment workflow downloads official Godot 4.7.2 and matching web templates, parses the project, runs a headless state-transition test for combat, hacking, extraction, telemetry and upgrades, exports the Web build, checks the HTML/JavaScript/WebAssembly/PCK files, then includes them in the normal deployment archive. The compiled output is generated by CI and is not committed to source control.


## Release 0.6 — animated operator and bounded effect pools

- The operator rig smoothly turns toward the aim direction, uses opposing procedural leg swings driven by movement speed, and adds small lean and recoil. Each actual weapon shot triggers a short emissive muzzle flash and a local light pulse.
- Tracer/attack beams and pulse rings use bounded reusable MeshInstance3D pools. Beam surfaces are refreshed on an existing ImmediateMesh; rings animate scale and transparency from frame delta, then return hidden to the pool instead of being freed/re-created. The limits are 28 beams and 10 ring bursts; overflow is counted and only a cosmetic effect is dropped.
- The live diagnostics panel reports active effects, beam/ring pool capacities and dropped cosmetic effects alongside FPS, frame p95 and draw-call counters.
- The Godot headless runtime smoke test exercises aim-facing/gait/recoil, beam reuse, ring expansion/fade, object reuse and the new diagnostics fields.


## Release 0.7 — hit-confirmation and elimination feedback

- Confirmed hits now flash the primary armor shell white for 140 ms, pop it slightly in scale, and show a compact floating −1 label which eases upward and fades over 520 ms. The readout is created once per guard and reused on subsequent hits instead of spawning a new UI node per shot.
- Eliminations now trigger a pooled ring burst, a brief white impact particle burst and a restrained camera impulse; elite Warden kills use a stronger amber response. Existing bounded ring and particle budgets still cap cosmetic allocations.
- Godot runtime smoke now checks the actual hit label, live feedback timers, armor flash/scale, and pooled elimination effect in the combat loop.


## Release 0.8 — tactical radar HUD

- Added a GDScript-drawn live minimap to the Godot HUD on desktop. It projects the real 3D arena coordinates into a compact tactical map, including cover, security gate, three phase conduits and their live safe/warning/active states.
- The radar reads live player, guard archetype, destructible-device, terminal, quantum-core, extraction and medkit state. Objective markers update as the mission progresses, with distinct colours for Warden, Heavy, Stalker and Ranger contacts.
- The radar hides automatically for compact/touch layouts so it cannot compete with movement/action pads or the objective strip. It uses local data and redraws at a bounded 8.3 Hz.
- The headless runtime smoke validates world-to-map boundaries, coordinate clamping, hazard colours and wiring to live combat data.


## Release 0.9 — objective compass and Godot-first launch

- The OSGARD portal and both entertainment catalogues now launch the Godot 4.7.2 build by default. The previous lightweight browser build remains available as a compatibility fallback from the Godot launch shell.
- Added a live objective compass to the Godot HUD. It projects the active mission node through the current camera, smoothly rotates the arrow, shows measured in-game distance, and switches from terminal to quantum core to extraction as objectives are completed.
- When the operator reaches an objective, the compass changes to a direct interaction prompt. The same responsive HUD supports desktop and compact/touch layouts.
- Runtime smoke tests exercise all mission stages and guard the compass direction against invalid values. CI installs the official Godot 4.7.2 engine and matching single-threaded web export templates, runs headless gameplay tests, exports the WebAssembly/PCK build and verifies published routes.


## Release 1.0 — cinematic camera and directional damage readability

- Godot remains the primary NULL SHIFT runtime. The repository CI installs Godot 4.7.2 and web export templates, runs headless gameplay smoke, exports the browser build and checks the released routes; no local installation is required just to publish changes.
- Added smooth camera FOV breathing: movement adds a restrained 1.35° response, firing recoil adds up to 0.85°, and NULL SHIFT temporarily adds 3.1°. Exponential easing avoids abrupt zoom cuts.
- Guard-originated hits show a directional damage arrow on the HUD edge. The direction is projected from the actual attacking 3D node through the camera, fades over 0.62 seconds, reflects remaining health and hides while blocking menus/pause cover play. Environmental phase-lane damage remains distinct because it has no attacker direction.
- Headless runtime smoke checks exercise the FOV widen/return and verify that a real damaging hit creates and expires the directional marker.
- This is engine-native gameplay/UI work, not native 8K output. The Web build remains constrained by browser/GPU support and uses the Compatibility renderer for broad reach.


## Release 1.1 — animated security gate

- The security gate now has procedural jambs, red/cyan lock indicators and a local status light that pulses red while locked and transitions to cyan after a successful cipher.
- A correct code disables collision immediately, then animates the gate upward with a cubic-eased Tween over 780 ms before hiding it. That gives a clear physical response while preventing the operator from getting trapped during the animation.
- Headless Godot runtime smoke covers the visible opening state, immediate collision deactivation, upward movement, final hidden state and lock-indicator colour change. The mechanism uses engine-created geometry and no downloaded runtime assets.


## Release 1.2 — responsive cinematic vignette

- Added a first-party CanvasItem shader layer under the HUD. A soft, restrained vignette anchors the screen edges without obscuring objective text, mobile controls or the reticle.
- The vignette reads live health and NULL SHIFT phase state. Low vitality increases the edge contrast and shifts it toward a subdued danger tint; activating the phase shift blends in a restrained violet edge treatment. Cinematic, auto-optimized and balanced profiles set different baseline strengths.
- The feature is generated by GDScript and a small shader string. It uses no textures, downloaded art, remote scripts or extra assets. Its runtime smoke test confirms the real shader layer exists, does not capture input, and reacts to critical health/phase activation.
- This is an in-engine post-process-like screen treatment for the Compatibility renderer, not a substitute for shadow maps, imported art or native 8K output.


## Release 1.3 — startup-layout and deterministic target-lock verification

- Hardened responsive layout against the early startup frame where a headless/browser viewport or HUD element may not yet be valid. The layout controller now waits until the HUD hierarchy exists and the viewport has a usable size before changing panel anchors.
- Stabilized the headless target-lock test by pointing the test camera at the test hostile before projecting the eight-corner marker, then restoring the camera transform. This prevents the assertion from depending on incidental camera smoothing or test viewport geometry.
- These guards improve startup robustness and make the runtime test exercise the actual lock UI rather than an uncontrolled camera pose.


## Release 1.4 — idempotent target-lock HUD

- Made target-lock construction idempotent. If the UI setup routine runs again, it no longer appends another copy of the eight corner pieces or creates a second marker tree; the tracked array is reset before first construction.
- The headless runtime test retains the deterministic camera pose and asserts one visible target lock made of exactly eight corners, with live identity and health.

- Follow-up hardening: made the whole HUD builder idempotent, preventing duplicated CanvasLayers or accumulators if setup is re-entered. Collection arrays are reset only when a fresh HUD is constructed.


## Release 1.5 — per-instance mutable state isolation

- Each Godot game instance now allocates fresh runtime arrays and dictionaries in `_ready()`. This avoids accumulated references across repeated scene instances, test harnesses or scene reloads, including guard/device lists, effect pools, phase HUD chips, operator pivots, mobile controls and target-lock corners.
- The runtime smoke checks still require exactly three phase-lane indicators and exactly eight target-lock corners; the source-contract test now guards the per-instance collection reset explicitly.


## Release 1.6 — isolate reference-backed runtime state

- Fixed the root cause of duplicated phase HUD-chip references: GDScript Arrays and Dictionaries are reference-backed, and assigning empty literal defaults did not reliably isolate multiple scene instances in the headless runtime harness. Every transient array/dictionary is now duplicated before being cleared and reused by a fresh game instance.
- Removed temporary phase-HUD debug printing. The runtime smoke retains the strict requirement of exactly three live phase-lane labels and exactly eight target-lock corner pieces.


## Release 1.7 — fix HUD lifecycle placement

- Moved the complete HUD construction body back into `_create_ui()`. The vignette shader's frame update now only updates shader parameters; it no longer constructs the status panel, phase chips, utility controls or objective HUD every frame.
- This fixes the root cause of phase labels accumulating across frames and prevents repeated allocation of interactive UI controls. Static smoke checks function boundaries and fails if HUD creation is accidentally nested in a per-frame shader update.

- Follow-up integrity fix: HUD construction no longer clears the operator's pre-built leg-pivot list. Those pivots are created in the gameplay rig before the HUD is built, and clearing them in UI setup silently disabled the procedural walking gait.


## Daily challenge, sharing and cosmetic vault

- Every UTC date selects one deterministic contract code in the form NS-YYYYMMDD-Cn. The code is validated against the date-derived contract before it can select a mission. A shared link opens the same daily contract in the Godot Web export.
- Completing the current day's challenge awards +400 career credits once per UTC date in the local save. A consecutive-day streak is persisted: the third consecutive clear grants +100 extra credits and each seventh consecutive clear grants +300 extra credits; missing a UTC day resets the active streak but preserves the record. Older challenge codes remain playable but cannot claim today's reward.
- The result card exposes the native share sheet where supported, with clipboard/prompt fallback. The shared text includes the challenge link; the share button itself does not award currency.
- Style Vault sells Amber (450 credits) and Violet (750 credits) suit looks. Ownership and selected style persist locally. The looks do not change combat statistics.
- Real-money checkout, server-side purchase verification, cross-device ownership, referral attribution and global leaderboards are not connected in this prototype. Do not present a paid supporter pack as purchasable until server-side payment/entitlement checks and refund handling are implemented.


## Release 1.8 — daily streak retention and share cards

- Added a persistent UTC daily streak, longest-streak record and last-completed date to the local career save.
- A successful daily contract pays 400 credits. Day 3 adds 100 credits and every seventh consecutive day adds 300. Same-day duplicates are blocked; missing a UTC date resets the active streak while retaining the record.
- The Style Vault shows current streak, longest record and the next milestone. Mission results and 1200×630 share cards show streak alongside the daily challenge code while keeping career credits visible.
- Invite URLs and the existing consent-gated attribution pipeline continue to measure referral opens, game starts and completions. Streaks and credits remain local; they are not presented as verified cross-device progression.


## Release 1.9 — procedural guard gait and readable recovery pickups

- Security units now use small procedural limb rigs: two articulated leg pivots and two arm pivots with role-specific boot and armor accents. Frame-delta smoothing drives opposing leg swings from actual CharacterBody3D velocity and counter-swings the arms, so patrol/approach movement no longer relies only on capsule/armor bobbing.
- The field medkit has a restrained world-space hover and yaw drift while it remains available. It reuses the existing pickup node and scene clock, without runtime allocations or extra light sources.
- Headless Godot runtime smoke checks verify both limb rigs exist, legs move in opposing phases, arms counter-swing, and the medkit changes its world-space height over time. The static release contract requires the new animation code.
- The change enhances engine-native presentation without changing the combat capsule, target selection, damage rules or mission progression. It is procedural geometry, not imported motion-capture animation or native 8K art.


## Release 1.9 — suspended signal dust / atmosphere

- Added a bounded, engine-native GPUParticles3D field with tiny emissive motes drifting through the arena. A four-point alpha ramp fades each mote in/out smoothly; the field uses no external textures or runtime file dependencies and is placed inside an explicit visibility AABB.
- Particle density follows the existing graphics selector: Cinematic uses 72 particles, Balanced uses 32 slower particles, and Performance suspends emission with an 8-particle budget ready for a mode switch. The adaptive cinematic governor turns the field off under sustained frame-time pressure and restores full density after stable pacing.
- Headless smoke now asserts emitter instantiation, cinematic density, automatic degradation/recovery and all three manual quality modes. This is subtle environmental depth, not volumetric ray-marched fog or a native 8K claim.


## Release 2.0 — reusable impact-spark pool

- Confirmed weapon hits and incoming damage now reuse a bounded pool of up to 8 `CPUParticles3D` emitters. The game no longer allocates a new particle node and a scene timer for every hit; effects return to the pool through the frame-delta lifetime manager.
- Spark density follows the active quality state: 14 particles in Cinematic, 9 in Balanced, and 5 in Performance/auto-degraded mode. Pool overflow is explicitly counted as a dropped cosmetic effect and never blocks damage, collisions or mission state.
- Live diagnostics now list the beam, ring and spark pool sizes. Headless Godot runtime smoke tests cover emitter activation, timed expiry, node identity reuse, the hard pool limit and per-profile particle budgets.
- This is a real allocation/performance improvement in the Godot runtime. It does not claim native 8K output; the export remains constrained by browser and device GPU capabilities.


## Premium procedural armour pass (Godot 4.7)

The native Godot scene now builds a more readable combat silhouette using named chest shells/insets, shoulder plates, role-coloured signal bars, rear energy cells/backpacks, utility belts and knee plates for both the operator and security units. Major silhouette pieces cast real scene shadows under the existing quality profiles; collision capsules, movement, targeting, health and damage logic remain unchanged. Runtime smoke tests verify that the named meshes exist in the instantiated scene and that the major pieces are configured to cast shadows.

This is procedural real-time 3D geometry for the current GL Compatibility/Web export, not a claim of native 8K assets.


## Release 2.1 — pulse-disruptible phase conduits

- The tactical pulse now has a second, deliberate use: when the operator is standing beside a charging or active conduit, Q suppresses that lane for 1.85 seconds. It does not permanently skip the hazard cycle; the timed lane returns to its scheduled state after the suppression expires.
- The moving 3D surge switches to cyan during suppression, the individual lane chip reads `ПОДАВЛЕН`, and the shared hazard status reports the suppressed conduit. The pulse remains useful against nearby guards at the same time, so players must choose when to spend its cooldown.
- Added a runtime smoke sequence that activates a lane, triggers Q beside it, verifies the visual/HUD/telemetry response, proves no damage is dealt during the suppression window, and confirms that the lane becomes dangerous again when the timer expires.
- This is engine-native, playable GDScript behavior; it does not depend on external services, assets or network calls.


### Visual upgrade: volumetric tracers

Weapon fire and other transient beams use two crossed triangle ribbons plus a crisp center line. This avoids relying on 1-pixel line rasterization on different desktop/mobile GPUs. The effect reuses the existing bounded mesh pool; headless runtime smoke verifies that the actual mesh contains both surfaces; the static source contract verifies the triangle-ribbon and line primitive declarations.


## Release 2.2 — phase-dash afterimages and tracer fade

- The dash now leaves short volumetric afterimage ribbons sampled from real `CharacterBody3D` positions during physics ticks. Their cyan/violet colour follows the current phase state, uses the existing bounded beam pool, and is counted in diagnostics; the effect does not clone character rigs or allocate an unbounded stream of nodes.
- All pooled tracer beams now fade with their remaining lifetime and reset their transparency before reuse. The same fade applies to weapon tracers, enemy telegraphs and dash trails, reducing harsh cut-offs and improving depth/readability.
- Runtime smoke verifies dash movement causes actual trail emission, beam opacity changes over time, expired tracers reset, and pooled meshes are reused without growing the pool.
- This is a native Godot scene/gameplay change tested by the official Godot 4.7.2 headless runtime/export pipeline; the browser Canvas/WebGL prototype remains untouched.


## Release 2.3 — live 3D objective beacon

- Added a persistent procedural world-space objective beacon that follows the live mission stage: cyan at the cipher terminal, amber at the quantum core, and green at extraction.
- The marker combines a tapered emissive beam, a floor ring, an upper orbit ring, a signal core and a local accent light. The beam/orbit disappear when the operator is close to the target, while the ground ring remains as an interaction anchor.
- The pulse and ring motion respect Reduced Motion; the extra light is disabled by the Performance profile or adaptive degradation. The beacon is built once and reuses the same nodes every frame.
- The headless Godot runtime smoke now tests target-stage changes, per-stage materials, frame-driven pulse, close-range beam suppression, and stable node count.


## Release 2.4 — pooled spatial impact lighting

- Added four preallocated, shadowless \`OmniLight3D\` nodes dedicated to combat flashes. Guard hits/eliminations, device destruction and incoming damage now light nearby 3D surfaces in cyan, amber/violet or red, in addition to particles and screen feedback.
- Each flash fades its energy smoothly and contracts its radius. A round-robin pool has a hard capacity of four and reuses the same nodes, so repeated fire cannot create an unbounded stream of lights.
- Cinematic and Balanced profiles allow these flashes; Performance and automatic degradation hide them. They never cast shadows because short-lived point-light shadows cost too much for this compatibility-rendered browser/mobile build.
- Headless runtime smoke verifies real light position/energy/range, smooth decay, clean expiry, telemetry, the four-light limit, and Performance-profile gating.
- This is native Godot lighting behavior, not a baked image or native 8K claim; real-device performance must still be measured.


## Release 2.5 — procedural PBR surface detail

- Godot generates a compact, periodic 128×128 albedo, tangent-space normal and roughness texture set at startup using in-memory Images and GDScript. No downloads, imported binary art, or external assets are required.
- The shared floor, bulkhead and metal-trim materials use the generated detail at different UV scales. The periodic source functions reduce visible borders as textures tile; the normal map is derived from wrapped neighbouring height samples.
- Cinematic and Balanced profiles use normal/roughness detail maps. Performance and adaptive-degraded profiles keep subtle albedo variation while disabling normal/roughness maps to reduce shader work.
- Headless runtime smoke checks texture presence, dimensions, spatial variation and Performance/Cinematic map policy. The browser export continues through the existing Godot 4.7.2 CI workflow.
- This is procedural PBR material detail, not scanned photogrammetry, physically simulated reflections, a new shadow-map system or native 8K rendering; target-device GPU testing remains necessary.


## Release note — reactive operator rim lighting

The Godot scene uses one shadowless OmniLight3D accent parented to the animated operator rig. The cyan rim improves suit separation against the dark arena; it shifts toward amber/red near a charging/active conduit or at low health. NULL SHIFT pushes the light toward violet, and dash briefly lifts it toward a cool white highlight. The light shares the existing local-light budget and is disabled in Performance and adaptive-degraded profiles. The headless runtime smoke checks rig attachment, state-driven energy/colour changes and quality gating. This is live scene lighting, not a baked screenshot or a claim of native 8K rendering.


## Release 2.7 — Overdrive chain arcs

While Overdrive is active, a weapon hit on a guard can conduct a single violet arc to the nearest other hostile within 7.5 metres. The secondary hit deals 55% of the normal Overdrive damage (rounded to a minimum of one point), uses the existing beam/spark/light pools, and requires an unobstructed physics ray to the second guard. One shot never fans out recursively, the arc cannot hit the primary target again, and secondary damage does not increment fired-shot/weapon-accuracy counters. The live diagnostics panel tracks successful arcs.


## Release 2.8 — Extraction Pressure and Lockdown Breach

- Securing the quantum core now transitions the raid into a distinct 30-second extraction phase. Two real Godot guards spawn on the extraction approach, the exit ring changes to amber and pulses (respects Reduced Motion), and a live countdown/progress bar appears in the mission-control HUD.
- Phase conduits accelerate by 18% while the extraction window is active. If it expires, the game transitions once into Lockdown Breach, warns the player in red, and spawns a Warden intercept unless an elite is already active; a capped backup guard is used in that case. The extraction is still reachable, but conduit cycles retain a measured 12% speed increase, so expiry escalates difficulty instead of silently failing the mission.
- The event director freezes while the raid is paused, is reset on a fresh instance, clears after a successful/failed mission, and reports reinforcements and breaches in both the live HUD telemetry and diagnostics.
- Godot headless smoke tests now exercise the actual core interaction, two physical reinforcements, countdown delta, accelerated hazard multiplier, timeout, Warden spawn, warning display and clean HUD teardown after successful extraction.
- Godot remains the primary engine project and CI installs the pinned Godot 4.7.2 stable engine/template. This is a gameplay/UX milestone, not a claim of native 8K rendering; device-specific frame performance still needs physical-device testing.


## Release 2.9 — cinematic impact wave

- Gameplay impact impulses now trigger a screen-space energy ring in the existing vignette shader. The ring expands from the centre, fades on a live timer, and shifts toward violet during NULL SHIFT or red at critical health. It never pauses, delays, or changes combat simulation.
- The effect reuses one fullscreen ColorRect/ShaderMaterial; no per-impact nodes, textures, or allocations are created. Intensity and duration are reduced when Reduced Motion is enabled.
- Headless Godot runtime smoke validates initial shader strength, half-life radius, fade progression, and Reduced Motion attenuation. This is a lightweight procedural post effect, not a full post-processing stack or a claim of native 8K rendering.


## Release 3.0 — seven-step premium usability and rendering upgrade

1. **Real graphics requests:** Cinematic requests 4× MSAA and 48 m directional shadows; Balanced requests 2× and 34 m; Performance disables MSAA and dynamic shadows. A driver or renderer may cap the request.
2. **Colour-safe hazard palette:** F5 makes warnings high-luminance blue and active hazards orange. The radar shares the same palette and uses a dotted pattern for active lanes; state labels remain explicit.
3. **Persistent HUD scale:** F6 cycles 92%, 100% and 108%, with centre-based scaling and full-screen overlay compensation. The setting is saved locally.
4. **Optional controller haptics:** F7 and touch UI toggle vibration for dash, critical hit, damage and mission result. It only emits through a connected compatible gamepad and safely no-ops without one.
5. **Mobile accessibility:** touchscreen players can change hazard colours, HUD size and haptics without a keyboard.
6. **Honest live telemetry:** FPS/frame time/CPU/render counters now sit alongside the requested MSAA level, HUD scale, colour palette and rumble status.
7. **Regression checks:** headless smoke checks palette separation, HUD bounds, missing-controller fallback, touch controls and all three quality profiles.

Controls: **F2** graphics, **F3** diagnostics, **F4** reduced motion, **F5** colour-safe hazards, **F6** HUD scale, **F7** controller haptics. This is a native Godot rendering/accessibility upgrade, not native 8K output; verify frame pacing on physical target devices.


## Release 0.24 — Tactical Replay

After each completed extraction or failed raid, open **TACTICAL REPLAY / L** from the result screen to inspect a top-down route, scrub a 0.25-second sample tape, and step between recorded events. The versioned JSON after-action report also contains a normalized tactical route. The capture stores at most 360 samples, rejects invalid coordinates/timestamps, and remains on-device; it is not a frame-perfect 3D video.
