# NULL//SHIFT — Master Engineering Plan

**Purpose:** make Godot the primary runtime for a visually distinctive, testable 3D extraction game; preserve the existing browser build as a fallback until the engine export is validated on real devices.

## Non-negotiable architecture

1. **One gameplay source of truth.** `godot/null-shift/` owns physics, AI, combat, objective state, input, local saves and rendering. The older Canvas/WebGL version stays as a compatibility/demo path; features are not duplicated across both runtimes by default.
2. **Generated exports only.** Godot 4.7.2 stable and the matching single-threaded Web templates are pinned in CI. HTML, JavaScript, WASM and PCK are generated together, validated as one build artifact, then deployed atomically. Never hand-edit the generated export.
3. **Three separate forms of proof.** A headless runtime test proves gameplay transitions; artifact checks prove the exported payload is complete; production route checks prove the assets actually being served return successfully. Source checks are useful but are not runtime proof.
4. **Measured quality, not fake 8K claims.** Use frame-pacing, CPU/physics timings, draw calls, primitives, node count and effect-pool telemetry. CPU metrics must not be called GPU time. Test 3840×2160 and 7680×4320 capture targets separately on capable desktop hardware; browser scaling alone is not evidence of native 8K rendering.
5. **Bounded runtime costs.** Reuse light/beam/ring/spark pools; avoid per-shot node creation; protect pause/resume and scene reload; keep Reduced Motion and touch controls available in every graphics profile.

## Runtime layers

- **Presentation:** procedural arena, layered character silhouettes, PBR albedo/normal/roughness maps, filmic environment, glow, fog, objective beacon, tactical radar, reticle, damage direction and responsive HUD.
- **Simulation:** CharacterBody3D movement/collision, visibility and cover checks, squad flanking, device interactions, timed phase lanes, one-hit dash evade, cipher terminal, Warden boss phases, Overdrive chain, extraction timer and Lockdown Breach.
- **Input/platform:** keyboard/mouse, native gamepad with deadzones and hot-plug, and touch movement/action controls. Every mission action must have a controller/touch equivalent where feasible.
- **Settings/state:** local career/upgrade saves, independent manual graphics profiles, adaptive quality with hysteresis, sound setting and Reduced Motion.
- **Diagnostics:** rolling frame P95, current frame interval, recent frames missing the 16.67 ms/60 FPS budget, process/physics time, draw calls, rendered primitives, node count and VFX pool exhaustion.
- **Delivery:** source checks → Godot import/parse → headless state-transition smoke → Web export → payload check → archive preflight → atomic deploy → mobile/desktop production-route matrix.

## Delivery stages and release gates

### A. Stability and game-state integrity
- Test fresh launch, pause/resume, mission completion/failure, scene re-instantiation, save round-trip and low-health recovery.
- Test objective edges: locked terminal, correct/incorrect cipher, device interactions, core pickup, extraction before/after timer expiry, Warden already active, and result screen restart.
- Keep score, shots fired, confirmed hits and secondary-effect kills semantically separate.

### B. Visual quality and readability
- Hold one art direction: obsidian/graphite architecture, cyan signals, amber objective/elite telegraphs, restrained red danger, and violet only for phase/Overdrive.
- Keep silhouettes and combat telegraphs readable at 320 px width; critical information must not rely on colour alone.
- Improve original operator/guard/Warden models, material IDs/UVs, decals and LODs before increasing mesh density. Add dynamic shadow-map cost only after frame baselines exist.
- Use deterministic camera/scene states for before/after screenshots so art changes are compared honestly.

### C. Frame pacing and adaptive profiles
- Treat 16.67 ms as the 60 FPS pacing budget and 33.33 ms as the 30 FPS fallback budget.
- Degrade only after sustained slow windows; recover more slowly and one tier at a time to avoid oscillation.
- Soft optimization trims particle density and glow while preserving primary shadows and PBR maps. Hard optimization may suspend high-cost lights/maps/particles. Manual profile settings are never overwritten by the automatic governor.
- Record hardware, screen size, quality mode and the 95th percentile when evaluating real mobile and desktop builds.

### D. Cinematic materials/effects
- Build original high/mid/low detail models and trim/decals; use LODs and mipmaps intentionally.
- Evaluate contact shading, shadow maps, material response, fog, glow and tone mapping under fixed camera scenarios.
- Keep all transient effects pooled. Dropping a cosmetic effect is acceptable; dropping gameplay feedback/state is not.
- Measure browser and desktop builds separately because renderer backend, texture limits, memory and post-processing differ by platform.

### E. Product polish and accessibility
- Maintain first-run briefing, clear objective compass, interaction prompts, pause, diagnostics, gamepad prompts and mobile controls.
- Reduced Motion must reduce camera shake/FOV breathing and vignette pulsing without changing damage, timers or collision windows.
- Keep touch targets, status contrast and HUD panel bounds usable on narrow screens and landscape phones.

### F. Release evidence
- Each release records commit SHA, Godot/template version, headless result, export file sizes/hashes, route matrix, and screenshots/frame-time reports where physical hardware is available.
- Keep the lightweight browser path live until the Godot export passes functional, visual, accessibility and device performance gates.
- Keep rollback possible by redeploying the previous known-good commit/artifact.

## Immediate implementation in this release

The adaptive controller now uses **Cinematic → Soft Optimize → Hard Optimize** and recovers one tier at a time. A first performance dip reduces particles from 72 to 46 and gently lowers glow while keeping shadows, local lights and PBR detail maps. Continued pressure activates the aggressive fallback. Live diagnostics add 60 FPS budget misses, process/physics time, primitives and scene-node count; headless tests exercise every quality transition.

## Explicit non-goals

- No claim that a browser export is a native 8K AAA product.
- No external runtime CDN, remote font or analytics dependency is required for the scene to work.
- No treating source regex checks as a substitute for engine runtime tests or production HTTP checks.
- No wholesale duplication of features in the legacy WebGL path while Godot remains the primary gameplay engine.
