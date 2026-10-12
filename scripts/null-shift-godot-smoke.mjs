import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = 'godot/null-shift'
const required = ['project.godot','export_presets.cfg','scenes/main.tscn','scripts/main.gd','tests/runtime_smoke.gd','README.md','web/boot_shell.html']
for (const path of required) assert.ok(existsSync(join(root, path)), 'Missing Godot project file: ' + path)
const project = readFileSync(join(root, 'project.godot'), 'utf8')
const preset = readFileSync(join(root, 'export_presets.cfg'), 'utf8')
const scene = readFileSync(join(root, 'scenes/main.tscn'), 'utf8')
const shell = readFileSync(join(root, 'web/boot_shell.html'), 'utf8')
const game = readFileSync(join(root, 'scripts/main.gd'), 'utf8')
const oldPage = readFileSync('public/games/null-shift/index.html', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
assert.match(project, /config\/name="NULL SHIFT"/, 'Safe Godot export project name missing')
assert.match(project, /config\/features=PackedStringArray\("4\.7", "GL Compatibility"\)/, 'Godot 4.7 compatibility renderer target missing')
assert.match(project, /renderer\/rendering_method="gl_compatibility"/, 'Web-compatible renderer missing')
assert.match(preset, /name="Web"/, 'Web export preset missing')
assert.match(preset, /platform="Web"/, 'Web export target missing')
assert.match(preset, /variant\/thread_support=false/, 'Single-thread web export must remain enabled for ordinary hosting')
assert.match(preset, /html\/custom_html_shell="res:\/\/web\/boot_shell\.html"/, 'Custom premium loading shell must be exported')
for (const feature of ['data-nullshift-shell="premium-v1"', '$GODOT_URL', '$GODOT_CONFIG', 'Engine.isWebGLAvailable(2)', 'onProgress:', 'НАЧАТЬ ОПЕРАЦИЮ', 'requestFullscreen()', 'else if (canvas.requestFullscreen)', '../null-shift/']) assert.ok(shell.includes(feature), 'Missing premium Godot loading-shell feature: ' + feature)
assert.ok(!/https?:\/\//i.test(shell), 'Premium Godot shell must not load remote assets')
assert.match(scene, /type="Node3D"/, '3D root scene missing')
assert.equal(packageJson.scripts['qa:null-shift-godot'], 'node scripts/null-shift-godot-smoke.mjs', 'Godot smoke command not registered')
assert.ok(oldPage.includes('id="godot-preview"') && oldPage.includes('../null-shift-godot/'), 'Legacy game must link to the isolated Godot beta route')
for (const feature of [
  '_create_arena(', '_create_arena_props(', '_create_player(', '_create_initial_guards(', '_fire_weapon(',
  '_submit_cipher_key(', '_destroy_device(', '_deploy_pulse(', '_shift_layer(',
  '_finish_mission(', '_create_mobile_controls(', '_update_hud(', '_create_crosshair(', '_update_crosshair(', '_create_briefing_panel(', '_add_briefing_step(', '_dismiss_briefing(', '_show_briefing(', '_screen_impulse(', '_add_sphere_mesh(',
  'Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME', 'AudioStreamWAV.new()',
  'CPUParticles3D.new()', 'TorusMesh.new()', 'glow_enabled', 'shadow_enabled',
  'user://null_shift_career.cfg', 'KEY_F2', 'KEY_F3', 'dash_windup', 'dash_timer', 'HEAVY', 'STALKER', '_player_inside_lanes(', '_has_clear_path_to_player(', 'attacker: PhysicsBody3D', 'for lane_variant: Variant in lanes', 'attack_lanes', 'camera_shake_timer', 'fog_enabled', 'current_frame_ms', 'briefing_seen', 'ПОМОЩЬ / H'
]) assert.ok(game.includes(feature), 'Missing Godot gameplay/diagnostic feature: ' + feature)
assert.ok(game.length > 25000, 'Godot gameplay source unexpectedly small')
assert.ok(game.includes('get_viewport().get_visible_rect().size.x') && !game.includes('get_viewport_rect()'), 'Godot Node3D responsive profile must use the active viewport API')
assert.ok(game.includes('var role: String = str(guard.get("role", "RANGER"))') && game.includes('var body_speed: float = body.velocity.length()'), 'Godot dictionaries must not rely on ambiguous inferred local types')
assert.ok(!game.includes('var role := str(guard.get("role", "RANGER"))'), 'Every role read from an untyped dictionary must have an explicit String type')
assert.ok(!game.includes('var role :='), 'All Godot role local variables must declare an explicit type')
assert.ok(game.includes('func _layout_compact_controls(viewport_size: Vector2)') && game.includes('var action_button_width: float = floor((action_width - 32.0) * 0.5)'), 'Godot mobile HUD targets must adapt to compact viewports')
assert.ok(game.includes('var action_width: float = floor(clampf(width * 0.47, 150.0, 206.0))'), 'Godot mobile action panel widths must resolve to integer layout pixels')
assert.ok(game.includes('mobile_modules_button.custom_minimum_size = Vector2(action_width - 24.0, 28.0)') && game.includes('sound_button.custom_minimum_size = Vector2(action_width - 24.0, 28.0)'), 'All mobile action utilities must fit their container')
assert.ok(game.includes('camera_follow_position = camera_follow_position.lerp') && game.includes('operator_rig.position.y = sin(scene_clock'), 'Godot camera smoothing and operator animation must exist')
assert.ok(!game.includes('%.1F'), 'Godot float formatting tokens must use supported lowercase specifiers')
assert.ok(!/https?:\/\/(?:fonts\.googleapis|cdn\.jsdelivr|unpkg\.com)/i.test(game), 'Unexpected external runtime dependency in game source')
console.log('PASS NULL//SHIFT Godot source contract: project, renderer, gameplay systems, touch controls, saves and real diagnostics')
if (process.argv[2] === '--export-check') {
  const dir = resolve(process.argv[3] || 'public/games/null-shift-godot')
  for (const name of ['index.html','index.js','index.wasm','index.pck']) {
    const path = join(dir, name)
    assert.ok(existsSync(path), 'Missing exported Godot web file: ' + name)
    const min = name.endsWith('.wasm') ? 100000 : name.endsWith('.pck') ? 10000 : name.endsWith('.js') ? 100000 : 1000
    assert.ok(statSync(path).size > min, 'Exported Godot file is unexpectedly small: ' + name)
  }
  const exportedHtml = readFileSync(join(dir, 'index.html'), 'utf8')
  assert.ok(/canvas/i.test(exportedHtml), 'Exported HTML canvas was not found')
  assert.ok(exportedHtml.includes('data-nullshift-shell="premium-v1"') && exportedHtml.includes('Engine.isWebGLAvailable(2)') && exportedHtml.includes('onProgress:'), 'Premium loading shell was not applied to the actual Web export')
  assert.ok(/index\.wasm/i.test(exportedHtml) && /index\.pck/i.test(exportedHtml), 'Exported HTML does not refer to matching engine assets')
  console.log('PASS NULL//SHIFT Godot export files: HTML, JS, WebAssembly and PCK payload are present')
}
