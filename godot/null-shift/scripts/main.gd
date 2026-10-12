extends Node3D

const PLAYER_SPEED := 7.4
const CAMERA_BASE_FOV := 49.0
const CIPHER := [KEY_UP, KEY_LEFT, KEY_DOWN, KEY_RIGHT]
const SAVE_PATH := "user://null_shift_career.cfg"
const MAX_BEAM_POOL := 28
const MAX_RING_POOL := 10
const DASH_DURATION := 0.24
const DASH_COOLDOWN := 1.65
const DASH_SPEED_MULTIPLIER := 3.05

var player: CharacterBody3D
var camera: Camera3D
var camera_rig: Node3D
var world_environment: WorldEnvironment
var key_light: DirectionalLight3D
var terminal: Node3D
var quantum_core: Node3D
var extraction: Node3D
var medkit: Node3D
var security_gate: StaticBody3D
var gate_indicator_strip: MeshInstance3D
var gate_status_light: OmniLight3D
var gate_motion_tween: Tween
var gate_open_started := false
var core_ring: MeshInstance3D
var extraction_ring: MeshInstance3D
var terminal_light: OmniLight3D
var core_light: OmniLight3D
var hud_root: Control
var objective_label: Label
var health_label: Label
var credits_label: Label
var threat_label: Label
var telemetry_label: Label
var diagnostics_label: Label
var keypad_panel: PanelContainer
var keypad_progress_label: Label
var loadout_panel: PanelContainer
var pause_panel: PanelContainer
var result_panel: PanelContainer
var mobile_move_panel: PanelContainer
var mobile_action_panel: PanelContainer
var mobile_controls_visible := false
var mobile_actions: Dictionary = {"up": false, "down": false, "left": false, "right": false}
var materials: Dictionary = {}
var guards: Array[Dictionary] = []
var devices: Array[Dictionary] = []
var phase_lanes: Array[Dictionary] = []
var phase_lane_labels: Array[Label] = []
var phase_lane_status_row: HBoxContainer
var phase_clock := 0.0
var hazard_status_label: Label
var health_bar: ProgressBar
var health_bar_fill: StyleBoxFlat
var effects: Array[Node] = []
var beam_pool: Array[MeshInstance3D] = []
var beam_effects: Array[Dictionary] = []
var ring_pool: Array[MeshInstance3D] = []
var ring_effects: Array[Dictionary] = []
var effect_pool_exhaustions := 0
var operator_leg_pivots: Array[Node3D] = []
var muzzle_flash: MeshInstance3D
var muzzle_light: OmniLight3D
var muzzle_flash_timer := 0.0
var weapon_recoil := 0.0
var career := ConfigFile.new()
var career_credits := 0
var run_credits := 0
var current_contract := 0
var weapon_level := 0
var armor_level := 0
var pulse_level := 0
var player_health := 100.0
var player_max_health := 100.0
var dash_timer := 0.0
var dash_cooldown := 0.0
var dash_direction := Vector3.FORWARD
var dash_evasions := 0
var dash_evasion_registered := false
var pulse_cooldown := 0.0
var fire_cooldown := 0.0
var damage_cooldown := 0.0
var damage_flash_timer := 0.0
var null_shift_timer := 0.0
var instability := 0.0
var elapsed := 0.0
var hud_clock := 0.0
var frame_samples: Array[float] = []
var fps_p95_ms := 0.0
var diagnostics_enabled := false
var cinematic_quality := true
var performance_quality := false
var adaptive_quality_degraded := false
var adaptive_quality_clock := 0.0
var adaptive_slow_windows := 0
var adaptive_fast_windows := 0
var terminal_active := false
var terminal_unlocked := false
var terminal_progress := 0
var core_secured := false
var medkit_used := false
var alarm_active := false
var warden_spawned := false
var mission_finished := false
var paused_game := false
var mouse_firing := false
var touch_firing := false
var sound_enabled := true
var player_aim := Vector3.FORWARD
var career_names := ["STANDARD RAID", "BLACKOUT RUN", "IRON VEIL"]
var contract_bonus := [0, 350, 550]
var objective_text := "ВЗЛОМАТЬ ТЕРМИНАЛ → ЗАБРАТЬ ЯДРО → ЭВАКУИРОВАТЬСЯ"
var eliminations := 0
var scene_clock := 0.0
var operator_rig: Node3D
var operator_suit: MeshInstance3D
var camera_follow_position := Vector3.ZERO
var camera_shake_timer := 0.0
var camera_shake_duration := 0.0
var camera_shake_strength := 0.0
var damage_direction_timer := 0.0
var damage_direction_duration := 0.62
var damage_direction_source: Node3D
var damage_direction_fallback := Vector2.UP
var current_frame_ms := 0.0
var impact_flash_timer := 0.0
var phase_flash_timer := 0.0
var crosshair_kick := 0.0
var crosshair_hit_timer := 0.0
var impact_overlay: ColorRect
var cinematic_vignette: ColorRect
var cinematic_vignette_material: ShaderMaterial
var damage_direction_root: Control
var damage_direction_arrow: Label
var crosshair_root: Control
var crosshair_parts: Array[ColorRect] = []
var aim_target_node: Node3D
var target_lock_root: Control
var target_lock_label: Label
var target_lock_health_bar: ProgressBar
var target_lock_health_fill: StyleBoxFlat
var target_lock_brackets: Array[ColorRect] = []
var target_lock_position := Vector2.ZERO
var target_lock_has_position := false
var target_lock_tracked_node: Node3D
var local_lights: Array[OmniLight3D] = []
var fill_light: OmniLight3D
var sound_button: Button
var quality_button: Button
var mobile_quality_button: Button
var mobile_diagnostics_button: Button
var mobile_modules_button: Button
var mobile_dash_button: Button
var dash_status_label: Label
var status_panel: PanelContainer
var objective_panel: PanelContainer
var tactical_radar_panel: PanelContainer
var tactical_radar_map: Control
var mid_panel: PanelContainer
var bottom_hint: Label
var status_title: Label
var status_subtitle: Label
var status_shortcuts: Label
var objective_title: Label
var objective_compass_arrow: Label
var objective_compass_text: Label
var objective_actions: HBoxContainer
var mobile_move_buttons: Array[Button] = []
var mobile_move_spacers: Array[Control] = []
var mobile_action_buttons: Array[Button] = []
var touch_assisted_aim := false
var last_layout_size := Vector2(-1.0, -1.0)
var last_layout_touch := false
var briefing_panel: PanelContainer
var briefing_visible := false
var briefing_scroll: ScrollContainer

func _ready() -> void:
	_reset_runtime_collections()
	_load_career()
	_create_materials()
	_create_lighting()
	_create_arena()
	_create_arena_props()
	_create_interactables()
	_create_player()
	_create_initial_guards()
	_create_ui()
	_apply_quality_mode()
	_update_hud()
	if not bool(career.get_value("settings", "briefing_seen", false)):
		_show_briefing()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	print("NULL//SHIFT Godot prototype ready")

func _reset_runtime_collections() -> void:
	# Array/Dictionary values declared with literals can be shared as script defaults.
	# Duplicate each collection before clearing it so repeated scene instances cannot cross-contaminate.
	materials = materials.duplicate()
	materials.clear()
	guards = guards.duplicate()
	guards.clear()
	devices = devices.duplicate()
	devices.clear()
	phase_lanes = phase_lanes.duplicate()
	phase_lanes.clear()
	phase_lane_labels = phase_lane_labels.duplicate()
	phase_lane_labels.clear()
	effects = effects.duplicate()
	effects.clear()
	beam_pool = beam_pool.duplicate()
	beam_pool.clear()
	beam_effects = beam_effects.duplicate()
	beam_effects.clear()
	ring_pool = ring_pool.duplicate()
	ring_pool.clear()
	ring_effects = ring_effects.duplicate()
	ring_effects.clear()
	operator_leg_pivots = operator_leg_pivots.duplicate()
	operator_leg_pivots.clear()
	frame_samples = frame_samples.duplicate()
	frame_samples.clear()
	local_lights = local_lights.duplicate()
	local_lights.clear()
	mobile_move_buttons = mobile_move_buttons.duplicate()
	mobile_move_buttons.clear()
	mobile_move_spacers = mobile_move_spacers.duplicate()
	mobile_move_spacers.clear()
	mobile_action_buttons = mobile_action_buttons.duplicate()
	mobile_action_buttons.clear()
	crosshair_parts = crosshair_parts.duplicate()
	crosshair_parts.clear()
	target_lock_brackets = target_lock_brackets.duplicate()
	target_lock_brackets.clear()
	mobile_actions = mobile_actions.duplicate()
	mobile_actions.clear()
	mobile_actions["up"] = false
	mobile_actions["down"] = false
	mobile_actions["left"] = false
	mobile_actions["right"] = false

func _process(delta: float) -> void:
	var dt := minf(delta, 0.06)
	current_frame_ms = maxf(0.0, delta * 1000.0)
	elapsed += dt
	scene_clock += dt
	if not paused_game and not mission_finished:
		_update_phase_lanes(dt)
	damage_flash_timer = maxf(0.0, damage_flash_timer - dt)
	camera_shake_timer = maxf(0.0, camera_shake_timer - dt)
	impact_flash_timer = maxf(0.0, impact_flash_timer - dt)
	damage_direction_timer = maxf(0.0, damage_direction_timer - dt)
	phase_flash_timer = maxf(0.0, phase_flash_timer - dt)
	crosshair_kick = move_toward(crosshair_kick, 0.0, dt * 5.6)
	crosshair_hit_timer = maxf(0.0, crosshair_hit_timer - dt)
	if camera_shake_timer <= 0.0:
		camera_shake_strength = 0.0
	frame_samples.append(current_frame_ms)
	if frame_samples.size() > 120:
		frame_samples.pop_front()
	adaptive_quality_clock += maxf(0.0, delta)
	if adaptive_quality_clock >= 1.25:
		adaptive_quality_clock = fmod(adaptive_quality_clock, 1.25)
		_update_adaptive_quality()
	_update_camera(dt)
	_animate_world(dt)
	_update_effect_expiry(dt)
	_update_mobile_layout()
	_update_player_material()
	_update_crosshair()
	_update_target_lock_ui(dt)
	_update_objective_compass(dt)
	_update_screen_overlay()
	_update_cinematic_vignette()
	_update_damage_direction_ui()
	hud_clock += dt
	if hud_clock >= 0.12:
		hud_clock = 0.0
		_update_hud()

func _physics_process(delta: float) -> void:
	if paused_game or mission_finished:
		return
	var dt := minf(delta, 0.05)
	fire_cooldown = maxf(0.0, fire_cooldown - dt)
	dash_cooldown = maxf(0.0, dash_cooldown - dt)
	pulse_cooldown = maxf(0.0, pulse_cooldown - dt)
	damage_cooldown = maxf(0.0, damage_cooldown - dt)
	null_shift_timer = maxf(0.0, null_shift_timer - dt)
	if null_shift_timer == 0.0 and instability > 0.0:
		instability = maxf(0.0, instability - dt * 3.0)
	_move_player(dt)
	_update_guards(dt)
	_check_phase_lane_damage()
	# Keep the evade window open through movement, hostile attacks and lane damage for this physics tick.
	dash_timer = maxf(0.0, dash_timer - dt)
	if touch_firing or mouse_firing:
		_fire_weapon()
	if player_health <= 0.0:
		_finish_mission(false)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		mouse_firing = event.pressed
		return
	if not (event is InputEventKey):
		return
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return
	var key := key_event.keycode
	if briefing_visible:
		if key in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE, KEY_ESCAPE, KEY_H]:
			_dismiss_briefing()
			get_viewport().set_input_as_handled()
		return
	if key == KEY_H:
		_show_briefing()
		get_viewport().set_input_as_handled()
		return
	if terminal_active and key in CIPHER:
		_submit_cipher_key(key)
		get_viewport().set_input_as_handled()
		return
	match key:
		KEY_E:
			_interact()
		KEY_Q:
			_deploy_pulse()
		KEY_SPACE:
			_try_dash()
		KEY_SHIFT:
			_shift_layer()
		KEY_F2:
			_toggle_quality()
		KEY_F3:
			_toggle_diagnostics()
		KEY_ESCAPE:
			_set_pause(not paused_game)
		KEY_C:
			_cycle_contract()
		KEY_U:
			_toggle_loadout()
		KEY_1:
			if loadout_panel.visible:
				_buy_upgrade("armor")
		KEY_2:
			if loadout_panel.visible:
				_buy_upgrade("pulse")
		KEY_3:
			if loadout_panel.visible:
				_buy_upgrade("weapon")
		KEY_M:
			_toggle_sound()

func _create_materials() -> void:
	materials["floor"] = _material(Color(0.035, 0.063, 0.071), Color(0.02, 0.12, 0.12), 0.15, 0.28, 0.82)
	materials["wall"] = _material(Color(0.085, 0.12, 0.135), Color(0.025, 0.16, 0.16), 0.22, 0.72, 0.38)
	materials["wall_trim"] = _material(Color(0.14, 0.23, 0.24), Color(0.12, 0.8, 0.72), 1.05, 0.65, 0.28)
	materials["cyan"] = _material(Color(0.12, 0.95, 0.8), Color(0.08, 1.0, 0.82), 1.8, 0.42, 0.24)
	materials["cyan_dark"] = _material(Color(0.025, 0.31, 0.29), Color(0.02, 0.32, 0.28), 0.7, 0.46, 0.3)
	materials["amber"] = _material(Color(1.0, 0.61, 0.22), Color(1.0, 0.39, 0.08), 2.0, 0.3, 0.23)
	materials["red"] = _material(Color(0.92, 0.15, 0.25), Color(1.0, 0.045, 0.09), 1.55, 0.28, 0.31)
	materials["violet"] = _material(Color(0.63, 0.4, 1.0), Color(0.42, 0.14, 1.0), 1.35, 0.38, 0.32)
	materials["white"] = _material(Color(0.8, 0.94, 0.93), Color(0.13, 0.5, 0.48), 0.38, 0.16, 0.34)
	materials["black"] = _material(Color(0.014, 0.025, 0.031), Color(0.015, 0.055, 0.06), 0.1, 0.12, 0.52)
	materials["gold"] = _material(Color(1.0, 0.77, 0.36), Color(1.0, 0.52, 0.13), 2.1, 0.74, 0.18)
	materials["grid"] = _material(Color(0.09, 0.31, 0.3, 0.4), Color(0.035, 0.25, 0.24), 0.38, 0.0, 1.0)
	materials["telegraph"] = _material(Color(1.0, 0.13, 0.2, 0.8), Color(1.0, 0.035, 0.08), 1.8, 0.0, 1.0)

func _material(albedo: Color, emission: Color, energy: float, metal: float, rough: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = albedo
	mat.metallic = metal
	mat.roughness = rough
	if energy > 0.0:
		mat.emission_enabled = true
		mat.emission = emission
		mat.emission_energy_multiplier = energy
	return mat

func _create_lighting() -> void:
	world_environment = WorldEnvironment.new()
	world_environment.name = "CinematicEnvironment"
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.009, 0.019, 0.026)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.26, 0.43, 0.46)
	environment.ambient_light_energy = 0.52
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.glow_enabled = true
	environment.glow_intensity = 0.72
	environment.glow_bloom = 0.10
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.018, 0.038, 0.045)
	environment.fog_density = 0.0085
	environment.fog_sky_affect = 0.12
	environment.adjustment_enabled = true
	environment.adjustment_brightness = 1.025
	environment.adjustment_contrast = 1.08
	environment.adjustment_saturation = 0.92
	world_environment.environment = environment
	add_child(world_environment)

	key_light = DirectionalLight3D.new()
	key_light.name = "KeyLight"
	key_light.rotation_degrees = Vector3(-48.0, -34.0, 0.0)
	key_light.light_color = Color(0.72, 0.91, 0.91)
	key_light.light_energy = 1.18
	key_light.shadow_enabled = true
	key_light.directional_shadow_max_distance = 48.0
	add_child(key_light)

	fill_light = OmniLight3D.new()
	fill_light.name = "ColdFill"
	fill_light.position = Vector3(-10.0, 8.0, 4.0)
	fill_light.light_color = Color(0.1, 0.64, 0.67)
	fill_light.light_energy = 2.2
	fill_light.omni_range = 19.0
	fill_light.shadow_enabled = false
	add_child(fill_light)

func _create_arena() -> void:
	_make_solid_box("ArenaDeck", Vector3(0.0, -0.3, 0.0), Vector3(48.0, 0.5, 30.0), materials["floor"])
	_make_solid_box("NorthBulkhead", Vector3(0.0, 1.35, -15.2), Vector3(49.0, 2.8, 0.7), materials["wall"])
	_make_solid_box("SouthBulkhead", Vector3(0.0, 1.35, 15.2), Vector3(49.0, 2.8, 0.7), materials["wall"])
	_make_solid_box("WestBulkhead", Vector3(-24.2, 1.35, 0.0), Vector3(0.7, 2.8, 30.0), materials["wall"])
	_make_solid_box("EastBulkhead", Vector3(24.2, 1.35, 0.0), Vector3(0.7, 2.8, 30.0), materials["wall"])
	_make_box_mesh("NorthSignalTrim", Vector3(0.0, 2.78, -14.83), Vector3(48.0, 0.055, 0.08), materials["wall_trim"])
	_make_box_mesh("SouthSignalTrim", Vector3(0.0, 2.78, 14.83), Vector3(48.0, 0.055, 0.08), materials["wall_trim"])
	_make_grid()
	_make_solid_box("CoverWest", Vector3(-11.0, 0.77, 1.0), Vector3(1.15, 1.55, 5.7), materials["wall"])
	_make_solid_box("CoverNorth", Vector3(3.0, 0.8, -10.2), Vector3(7.0, 1.6, 0.9), materials["wall"])
	_make_solid_box("CoverMid", Vector3(5.4, 0.85, -1.1), Vector3(0.8, 1.7, 5.0), materials["wall"])
	_make_solid_box("CoverEast", Vector3(17.3, 0.8, 0.0), Vector3(5.2, 1.6, 0.85), materials["wall"])
	_make_box_mesh("CoverWestTrim", Vector3(-11.0, 1.57, 1.0), Vector3(1.2, 0.06, 5.8), materials["wall_trim"])
	_make_box_mesh("CoverEastTrim", Vector3(17.3, 1.62, 0.0), Vector3(5.25, 0.06, 0.9), materials["wall_trim"])
	security_gate = _make_solid_box("SecurityGate", Vector3(9.2, 1.05, 7.5), Vector3(0.55, 2.1, 5.5), materials["red"])
	_make_box_mesh("GateHeader", Vector3(9.2, 2.24, 7.5), Vector3(0.85, 0.12, 5.8), materials["amber"])
	_make_box_mesh("GateJamb_North", Vector3(9.2, 1.18, 4.62), Vector3(0.82, 2.36, 0.2), materials["wall"])
	_make_box_mesh("GateJamb_South", Vector3(9.2, 1.18, 10.38), Vector3(0.82, 2.36, 0.2), materials["wall"])
	gate_indicator_strip = _make_box_mesh("GateLockIndicator", Vector3(9.2, 1.9, 4.62), Vector3(0.085, 0.52, 0.09), materials["red"])
	_make_box_mesh("GateLockIndicator_South", Vector3(9.2, 1.9, 10.38), Vector3(0.085, 0.52, 0.09), materials["red"])
	gate_status_light = _make_omni_light(self, Vector3(9.2, 2.25, 7.5), Color(1.0, 0.12, 0.2), 0.78, 5.6)

func _create_arena_props() -> void:
	# Procedural landmarks, inlaid energy rails, and gate markers give the arena scale.
	var pylon_positions: Array[Vector3] = [
		Vector3(-20.8, 0.0, -11.7), Vector3(20.8, 0.0, -11.7),
		Vector3(-20.8, 0.0, 11.7), Vector3(20.8, 0.0, 11.7)
	]
	for index in range(pylon_positions.size()):
		var pylon := Node3D.new()
		pylon.name = "SignalPylon_%02d" % (index + 1)
		pylon.position = pylon_positions[index]
		add_child(pylon)
		_add_cube(pylon, Vector3.ZERO, Vector3(0.78, 0.18, 0.78), materials["black"])
		_add_cube(pylon, Vector3(0.0, 0.9, 0.0), Vector3(0.42, 1.72, 0.42), materials["wall"])
		_add_cube(pylon, Vector3(0.0, 1.56, 0.0), Vector3(0.56, 0.12, 0.56), materials["wall_trim"])
		_add_cube(pylon, Vector3(0.0, 1.16, -0.225), Vector3(0.13, 0.52, 0.035), materials["cyan"])
		_add_cube(pylon, Vector3(0.0, 0.54, -0.225), Vector3(0.18, 0.075, 0.04), materials["amber"] if index == 3 else materials["cyan_dark"])
		if index in [0, 3]:
			_make_omni_light(pylon, Vector3(0.0, 1.8, 0.0), Color(0.08, 0.9, 0.78) if index == 0 else Color(1.0, 0.34, 0.12), 0.78, 4.8)
	for rail_x in [-14.0, -4.0, 6.0, 15.0]:
		_make_box_mesh("PowerRail_X_%s" % str(rail_x), Vector3(rail_x, -0.025, -0.4), Vector3(0.045, 0.018, 23.0), materials["cyan_dark"])
	for rail_z in [-7.8, 7.8]:
		_make_box_mesh("PowerRail_Z_%s" % str(rail_z), Vector3(0.0, -0.024, rail_z), Vector3(43.5, 0.018, 0.045), materials["cyan_dark"])
	for bar_z in [5.9, 9.1]:
		_make_box_mesh("GateWarning_%s" % str(bar_z), Vector3(9.2, -0.012, bar_z), Vector3(0.8, 0.02, 0.055), materials["amber"])
	_create_phase_lanes()

func _create_phase_lanes() -> void:
	# Three independent floor conduits cycle through safe, warning and active states.
	# Their staggered timing requires timing and movement, not simply absorbing damage.
	var lane_positions: Array[float] = [-8.2, 0.0, 8.2]
	for index in range(lane_positions.size()):
		var lane_z: float = lane_positions[index]
		var prefix: String = "PhaseConduit_%02d_" % (index + 1)
		_make_box_mesh(prefix + "Base", Vector3(0.0, -0.034, lane_z), Vector3(43.5, 0.024, 0.94), materials["black"])
		for marker_index in range(11):
			var marker_x: float = -20.0 + float(marker_index) * 4.0
			_make_box_mesh(prefix + "Marker_%02d" % marker_index, Vector3(marker_x, -0.017, lane_z), Vector3(0.045, 0.012, 0.68), materials["wall_trim"])
		var warning_material: StandardMaterial3D = _material(Color(1.0, 0.47, 0.1), Color(1.0, 0.22, 0.035), 1.1, 0.18, 0.26)
		var active_material: StandardMaterial3D = _material(Color(1.0, 0.12, 0.2), Color(1.0, 0.025, 0.055), 1.8, 0.12, 0.22)
		var warning_mesh: MeshInstance3D = _make_box_mesh(prefix + "Warning", Vector3(0.0, -0.014, lane_z), Vector3(43.1, 0.018, 0.56), warning_material)
		warning_mesh.visible = false
		var active_mesh: MeshInstance3D = _make_box_mesh(prefix + "Active", Vector3(0.0, -0.003, lane_z), Vector3(42.8, 0.022, 0.34), active_material)
		active_mesh.visible = false
		# Reused 3D surge head, orbit ring and trailing wake; no per-frame allocations.
		var pulse_rig := Node3D.new()
		pulse_rig.name = prefix + "PulseRig"
		pulse_rig.position = Vector3(0.0, 0.0, lane_z)
		pulse_rig.visible = false
		add_child(pulse_rig)
		var pulse_head := MeshInstance3D.new()
		pulse_head.name = prefix + "SurgeHead"
		var pulse_sphere := SphereMesh.new()
		pulse_sphere.radius = 0.15
		pulse_sphere.height = 0.3
		pulse_sphere.radial_segments = 16
		pulse_sphere.rings = 8
		pulse_head.mesh = pulse_sphere
		pulse_head.material_override = warning_material
		pulse_head.position = Vector3(-20.5, 0.11, 0.0)
		pulse_rig.add_child(pulse_head)
		var pulse_ring := MeshInstance3D.new()
		pulse_ring.name = prefix + "SurgeRing"
		var pulse_torus := TorusMesh.new()
		pulse_torus.inner_radius = 0.18
		pulse_torus.outer_radius = 0.23
		pulse_torus.rings = 18
		pulse_torus.ring_segments = 8
		pulse_ring.mesh = pulse_torus
		pulse_ring.material_override = warning_material
		pulse_ring.rotation.x = PI * 0.5
		pulse_ring.position = Vector3(-20.5, 0.075, 0.0)
		pulse_rig.add_child(pulse_ring)
		var pulse_wake := MeshInstance3D.new()
		pulse_wake.name = prefix + "SurgeWake"
		var wake_mesh := BoxMesh.new()
		wake_mesh.size = Vector3(1.2, 0.024, 0.055)
		pulse_wake.mesh = wake_mesh
		pulse_wake.material_override = warning_material
		pulse_wake.position = Vector3(-21.05, 0.038, 0.0)
		pulse_rig.add_child(pulse_wake)
		phase_lanes.append({
			"z": lane_z,
			"offset": float(index) * 2.8,
			"state": "safe",
			"warning_mesh": warning_mesh,
			"active_mesh": active_mesh,
			"warning_material": warning_material,
			"active_material": active_material,
			"pulse_rig": pulse_rig,
			"pulse_head": pulse_head,
			"pulse_ring": pulse_ring,
			"pulse_wake": pulse_wake
		})

func _update_phase_lanes(delta: float) -> void:
	phase_clock += maxf(0.0, delta)
	var active_count: int = 0
	var warning_count: int = 0
	for index in range(phase_lanes.size()):
		var lane: Dictionary = phase_lanes[index]
		var cycle: float = fposmod(phase_clock + float(lane["offset"]), 8.4)
		var next_state: String = "safe"
		if cycle >= 4.95 and cycle < 6.3:
			next_state = "warning"
		elif cycle >= 6.3 and cycle < 7.22:
			next_state = "active"
		var old_state: String = str(lane["state"])
		lane["state"] = next_state
		var warning_mesh: MeshInstance3D = lane["warning_mesh"]
		var active_mesh: MeshInstance3D = lane["active_mesh"]
		warning_mesh.visible = next_state == "warning"
		active_mesh.visible = next_state == "active"
		var pulse_rig: Node3D = lane["pulse_rig"]
		var pulse_head: MeshInstance3D = lane["pulse_head"]
		var pulse_ring: MeshInstance3D = lane["pulse_ring"]
		var pulse_wake: MeshInstance3D = lane["pulse_wake"]
		var warning_material: StandardMaterial3D = lane["warning_material"]
		var active_material: StandardMaterial3D = lane["active_material"]
		pulse_rig.visible = next_state != "safe"
		var travel: float = clampf((cycle - 4.95) / 2.27, 0.0, 1.0)
		var travel_x: float = lerpf(-20.5, 20.5, travel)
		var surge_scale: float = 1.0 + absf(sin(scene_clock * 12.0 + float(index))) * 0.13
		pulse_head.position.x = travel_x
		pulse_head.scale = Vector3.ONE * surge_scale
		pulse_ring.position.x = travel_x
		pulse_ring.scale = Vector3.ONE * (0.92 + surge_scale * 0.13)
		pulse_ring.rotation.y += delta * 4.2
		pulse_wake.position.x = travel_x - 0.58
		pulse_wake.scale.x = 0.78 + absf(sin(scene_clock * 9.0 + float(index))) * 0.24
		var surge_material: Material = active_material if next_state == "active" else warning_material
		pulse_head.material_override = surge_material
		pulse_ring.material_override = surge_material
		pulse_wake.material_override = surge_material
		var pulse: float = 0.65 + absf(sin(scene_clock * 11.5 + float(index))) * 0.95
		warning_material.emission_energy_multiplier = pulse if next_state == "warning" else 0.8
		active_material.emission_energy_multiplier = 2.0 + pulse if next_state == "active" else 1.8
		if next_state == "warning":
			warning_count += 1
		elif next_state == "active":
			active_count += 1
		if phase_lane_labels.size() > index and (next_state != old_state or phase_lane_labels[index].text.is_empty()):
			var lane_label: Label = phase_lane_labels[index]
			match next_state:
				"warning":
					lane_label.text = "К%d · ЗАРЯД" % [index + 1]
					lane_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.34))
				"active":
					lane_label.text = "К%d · ОПАСНО" % [index + 1]
					lane_label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.36))
				_:
					lane_label.text = "К%d · НОРМА" % [index + 1]
					lane_label.add_theme_color_override("font_color", Color(0.38, 0.9, 0.82))
		if next_state != old_state and next_state == "warning":
			_play_sfx(340.0 + float(index) * 45.0, 0.07, 0.045)
		phase_lanes[index] = lane
	if not is_instance_valid(hazard_status_label):
		return
	if active_count > 0:
		hazard_status_label.text = "ОПАСНО · ЭНЕРГОКОНТУР АКТИВЕН"
		hazard_status_label.add_theme_color_override("font_color", Color(1.0, 0.27, 0.34))
	elif warning_count > 0:
		hazard_status_label.text = "ВНИМАНИЕ · КОНТУР ЗАРЯЖАЕТСЯ"
		hazard_status_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.34))
	else:
		hazard_status_label.text = "ЭНЕРГОКОНТУРЫ · СТАБИЛЬНО"
		hazard_status_label.add_theme_color_override("font_color", Color(0.38, 0.9, 0.82))

func _is_player_inside_phase_lane(lane_z: float, half_width: float = 0.72) -> bool:
	if not is_instance_valid(player):
		return false
	return absf(player.global_position.z - lane_z) <= half_width and absf(player.global_position.x) <= 21.7

func _check_phase_lane_damage() -> bool:
	if paused_game or mission_finished or not is_instance_valid(player):
		return false
	for lane in phase_lanes:
		if str(lane["state"]) != "active":
			continue
		if not _is_player_inside_phase_lane(float(lane["z"])):
			continue
		var health_before: float = player_health
		_damage_player(13.0)
		if player_health < health_before:
			objective_text = "ЭНЕРГОКОНТУР · ПОКИНЬ ПОЛОСУ · ЗДОРОВЬЕ %d%%" % int(player_health)
			_update_hud()
			return true
	return false

func _make_grid() -> void:
	var mesh := ImmediateMesh.new()
	mesh.surface_begin(Mesh.PRIMITIVE_LINES, materials["grid"])
	for x in range(-23, 24, 2):
		mesh.surface_add_vertex(Vector3(float(x), -0.043, -14.7))
		mesh.surface_add_vertex(Vector3(float(x), -0.043, 14.7))
	for z in range(-14, 15, 2):
		mesh.surface_add_vertex(Vector3(-23.7, -0.042, float(z)))
		mesh.surface_add_vertex(Vector3(23.7, -0.042, float(z)))
	mesh.surface_end()
	var grid := MeshInstance3D.new()
	grid.name = "InlaidTelemetryGrid"
	grid.mesh = mesh
	grid.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(grid)

func _make_solid_box(box_name: String, at: Vector3, size: Vector3, material: Material) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = box_name
	body.position = at
	body.collision_layer = 1
	body.collision_mask = 1
	var mesh := BoxMesh.new()
	mesh.size = size
	var visual := MeshInstance3D.new()
	visual.name = "Visual"
	visual.mesh = mesh
	visual.material_override = material
	body.add_child(visual)
	var shape := CollisionShape3D.new()
	shape.name = "CollisionShape3D"
	var box_shape := BoxShape3D.new()
	box_shape.size = size
	shape.shape = box_shape
	body.add_child(shape)
	add_child(body)
	return body

func _make_box_mesh(node_name: String, at: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var instance := MeshInstance3D.new()
	instance.name = node_name
	instance.mesh = mesh
	instance.material_override = material
	instance.position = at
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(instance)
	return instance

func _create_interactables() -> void:
	terminal = Node3D.new()
	terminal.name = "CipherTerminal"
	terminal.position = Vector3(-1.0, 0.0, -6.4)
	add_child(terminal)
	_add_cube(terminal, Vector3(0.0, 0.45, 0.0), Vector3(1.5, 0.9, 1.05), materials["wall"])
	_add_cube(terminal, Vector3(0.0, 1.22, -0.13), Vector3(1.2, 0.55, 0.12), materials["cyan_dark"])
	_add_cube(terminal, Vector3(0.0, 1.23, -0.2), Vector3(0.82, 0.035, 0.025), materials["cyan"])
	_add_cube(terminal, Vector3(-0.46, 1.23, -0.2), Vector3(0.035, 0.28, 0.025), materials["amber"])
	terminal_light = _make_omni_light(terminal, Vector3(0.0, 1.3, 0.0), Color(0.1, 1.0, 0.78), 1.6, 6.0)
	_add_world_tag(terminal, "CIPHER NODE", materials["cyan"])

	quantum_core = Node3D.new()
	quantum_core.name = "QuantumCore"
	quantum_core.position = Vector3(13.1, 0.85, 8.4)
	add_child(quantum_core)
	var core_ball := SphereMesh.new()
	core_ball.radius = 0.53
	core_ball.height = 1.06
	var core_visual := MeshInstance3D.new()
	core_visual.name = "CoreHeart"
	core_visual.mesh = core_ball
	core_visual.material_override = materials["gold"]
	quantum_core.add_child(core_visual)
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.67
	ring_mesh.outer_radius = 0.76
	ring_mesh.rings = 42
	ring_mesh.ring_segments = 10
	core_ring = MeshInstance3D.new()
	core_ring.name = "QuantumOrbit"
	core_ring.mesh = ring_mesh
	core_ring.material_override = materials["amber"]
	core_ring.rotation.x = deg_to_rad(62.0)
	quantum_core.add_child(core_ring)
	core_light = _make_omni_light(quantum_core, Vector3.ZERO, Color(1.0, 0.55, 0.13), 2.4, 7.5)
	_add_world_tag(quantum_core, "QUANTUM CORE", materials["amber"])

	extraction = Node3D.new()
	extraction.name = "ExtractionPad"
	extraction.position = Vector3(20.1, 0.0, 11.0)
	add_child(extraction)
	var pad_mesh := CylinderMesh.new()
	pad_mesh.top_radius = 2.5
	pad_mesh.bottom_radius = 2.5
	pad_mesh.height = 0.045
	var pad := MeshInstance3D.new()
	pad.name = "PadSurface"
	pad.mesh = pad_mesh
	pad.material_override = materials["cyan_dark"]
	pad.position.y = 0.035
	extraction.add_child(pad)
	var exit_ring_mesh := TorusMesh.new()
	exit_ring_mesh.inner_radius = 2.35
	exit_ring_mesh.outer_radius = 2.48
	exit_ring_mesh.rings = 56
	exit_ring_mesh.ring_segments = 12
	extraction_ring = MeshInstance3D.new()
	extraction_ring.name = "ExtractionRing"
	extraction_ring.mesh = exit_ring_mesh
	extraction_ring.material_override = materials["cyan"]
	extraction_ring.position.y = 0.12
	extraction.add_child(extraction_ring)
	for pillar_offset in [Vector3(-1.8, 0.55, -1.8), Vector3(1.8, 0.55, -1.8), Vector3(-1.8, 0.55, 1.8), Vector3(1.8, 0.55, 1.8)]:
		_add_cube(extraction, pillar_offset, Vector3(0.16, 1.1, 0.16), materials["cyan"])
	_add_world_tag(extraction, "EXTRACTION / E", materials["cyan"])

	medkit = Node3D.new()
	medkit.name = "FieldMedkit"
	medkit.position = Vector3(-15.3, 0.0, 4.8)
	add_child(medkit)
	_add_cube(medkit, Vector3(0.0, 0.4, 0.0), Vector3(0.8, 0.65, 0.8), materials["white"])
	_add_cube(medkit, Vector3(0.0, 0.75, 0.0), Vector3(0.22, 0.055, 0.22), materials["red"])
	_add_cube(medkit, Vector3(0.0, 0.76, 0.0), Vector3(0.055, 0.06, 0.48), materials["red"])
	_add_world_tag(medkit, "MED / E", materials["white"])

	_create_device(Vector3(-7.0, 0.75, 5.5), "RELAY", "EMP-узел")
	_create_device(Vector3(2.5, 0.75, -12.0), "CELL", "Энергоячейка")
	_create_device(Vector3(17.6, 0.75, -5.3), "ANCHOR", "Якорь фазы")

func _add_world_tag(parent: Node3D, tag_text: String, material: Material) -> void:
	var tag := Label3D.new()
	tag.text = tag_text
	tag.font_size = 28
	tag.pixel_size = 0.012
	tag.outline_size = 8
	tag.outline_modulate = Color(0.006, 0.018, 0.022, 0.95)
	tag.modulate = (material as StandardMaterial3D).albedo_color
	tag.position = Vector3(0.0, 2.25, 0.0)
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.no_depth_test = true
	parent.add_child(tag)

func _add_cube(parent: Node3D, local_position: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = material
	visual.position = local_position
	visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(visual)
	return visual

func _add_sphere_mesh(parent: Node3D, node_name: String, at: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	var visual := MeshInstance3D.new()
	visual.name = node_name
	visual.mesh = mesh
	visual.material_override = material
	visual.position = at
	visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(visual)
	return visual

func _make_omni_light(parent: Node3D, at: Vector3, color: Color, energy: float, radius: float) -> OmniLight3D:
	var light := OmniLight3D.new()
	light.position = at
	light.light_color = color
	light.light_energy = energy
	light.omni_range = radius
	light.shadow_enabled = false
	parent.add_child(light)
	local_lights.append(light)
	return light

func _create_device(at: Vector3, kind: String, label: String) -> void:
	var body := StaticBody3D.new()
	body.name = "FieldDevice_" + kind
	body.position = at
	body.collision_layer = 2
	body.collision_mask = 1
	body.set_meta("device_index", devices.size())
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.58
	capsule.height = 1.5
	shape.shape = capsule
	body.add_child(shape)
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.58
	mesh.height = 1.5
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = materials["violet"] if kind == "ANCHOR" else (materials["amber"] if kind == "CELL" else materials["cyan"])
	body.add_child(visual)
	_add_cube(body, Vector3(0.0, 0.1, -0.54), Vector3(0.28, 0.42, 0.07), materials["white"])
	_add_world_tag(body, label, materials["violet"] if kind == "ANCHOR" else (materials["amber"] if kind == "CELL" else materials["cyan"]))
	add_child(body)
	devices.append({"node": body, "hp": 2, "kind": kind, "destroyed": false})

func _create_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Operator"
	player.position = Vector3(-19.0, 0.82, 10.2)
	player.collision_layer = 1
	player.collision_mask = 3
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.43
	capsule.height = 1.6
	shape.shape = capsule
	player.add_child(shape)
	operator_rig = Node3D.new()
	operator_rig.name = "OperatorRig"
	player.add_child(operator_rig)
	var body_mesh := CapsuleMesh.new()
	body_mesh.radius = 0.43
	body_mesh.height = 1.6
	operator_suit = MeshInstance3D.new()
	operator_suit.name = "OperatorSuit"
	operator_suit.mesh = body_mesh
	operator_suit.material_override = materials["cyan"]
	operator_rig.add_child(operator_suit)
	_add_cube(operator_rig, Vector3(0.0, 0.25, -0.1), Vector3(0.72, 0.3, 0.76), materials["wall"])
	_add_cube(operator_rig, Vector3(0.0, 0.72, -0.08), Vector3(0.48, 0.16, 0.5), materials["white"])
	_add_cube(operator_rig, Vector3(0.0, 0.07, -0.72), Vector3(0.18, 0.18, 0.76), materials["black"])
	_add_cube(operator_rig, Vector3(0.0, 0.1, -1.1), Vector3(0.22, 0.12, 0.32), materials["amber"])
	_add_cube(operator_rig, Vector3(0.0, 0.16, -0.43), Vector3(0.57, 0.42, 0.16), materials["wall_trim"])
	_add_cube(operator_rig, Vector3(0.0, 0.17, -0.525), Vector3(0.23, 0.12, 0.035), materials["cyan"])
	_add_cube(operator_rig, Vector3(-0.38, 0.34, -0.02), Vector3(0.23, 0.25, 0.32), materials["cyan_dark"])
	_add_cube(operator_rig, Vector3(0.38, 0.34, -0.02), Vector3(0.23, 0.25, 0.32), materials["cyan_dark"])
	_add_cube(operator_rig, Vector3(-0.31, 0.08, -0.29), Vector3(0.16, 0.2, 0.26), materials["wall_trim"])
	_add_cube(operator_rig, Vector3(0.31, 0.08, -0.29), Vector3(0.16, 0.2, 0.26), materials["wall_trim"])
	for leg_index in range(2):
		var side: float = -1.0 if leg_index == 0 else 1.0
		var leg_pivot := Node3D.new()
		leg_pivot.name = "OperatorLeg_L" if leg_index == 0 else "OperatorLeg_R"
		leg_pivot.position = Vector3(side * 0.19, -0.32, -0.02)
		operator_rig.add_child(leg_pivot)
		_add_cube(leg_pivot, Vector3(0.0, -0.27, 0.0), Vector3(0.23, 0.2, 0.32), materials["black"])
		_add_cube(leg_pivot, Vector3(0.0, -0.365, -0.075), Vector3(0.25, 0.085, 0.42), materials["wall_trim"])
		operator_leg_pivots.append(leg_pivot)
	_add_cube(operator_rig, Vector3(0.0, 0.12, 0.31), Vector3(0.42, 0.45, 0.2), materials["black"])
	_add_cube(operator_rig, Vector3(-0.15, 0.15, 0.42), Vector3(0.06, 0.31, 0.035), materials["cyan"])
	_add_cube(operator_rig, Vector3(0.15, 0.15, 0.42), Vector3(0.06, 0.31, 0.035), materials["cyan"])
	var helmet := _add_sphere_mesh(operator_rig, "OperatorHelmet", Vector3(0.0, 0.69, -0.02), 0.245, 0.48, materials["black"])
	helmet.scale = Vector3(1.0, 1.0, 0.92)
	_add_cube(operator_rig, Vector3(0.0, 0.72, -0.235), Vector3(0.31, 0.075, 0.04), materials["cyan"])
	_add_cube(operator_rig, Vector3(0.0, 0.56, -0.21), Vector3(0.2, 0.04, 0.035), materials["amber"])
	var flash_mesh := SphereMesh.new()
	flash_mesh.radius = 0.085
	flash_mesh.height = 0.17
	flash_mesh.radial_segments = 12
	flash_mesh.rings = 6
	muzzle_flash = MeshInstance3D.new()
	muzzle_flash.name = "MuzzleFlash"
	muzzle_flash.mesh = flash_mesh
	muzzle_flash.material_override = materials["white"]
	muzzle_flash.position = Vector3(0.0, 0.16, -1.31)
	muzzle_flash.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	muzzle_flash.visible = false
	operator_rig.add_child(muzzle_flash)
	muzzle_light = OmniLight3D.new()
	muzzle_light.name = "MuzzleFlashLight"
	muzzle_light.position = Vector3(0.0, 0.16, -1.31)
	muzzle_light.light_color = Color(0.22, 1.0, 0.84)
	muzzle_light.light_energy = 3.2
	muzzle_light.omni_range = 3.2
	muzzle_light.shadow_enabled = false
	muzzle_light.visible = false
	operator_rig.add_child(muzzle_light)
	add_child(player)

	camera_rig = Node3D.new()
	camera_rig.name = "TacticalCamera"
	add_child(camera_rig)
	camera = Camera3D.new()
	camera.name = "PerspectiveCamera"
	camera.fov = CAMERA_BASE_FOV
	camera.near = 0.08
	camera.far = 130.0
	camera.position = Vector3(0.0, 23.5, 24.5)
	camera_rig.add_child(camera)
	camera_rig.global_position = player.global_position
	camera.global_position = player.global_position + Vector3(0.0, 23.5, 24.5)
	camera_follow_position = camera.global_position
	camera.look_at(player.global_position + Vector3(0.0, 0.6, 0.0), Vector3.UP)

func _create_initial_guards() -> void:
	_spawn_guard(Vector3(0.0, 0.82, -10.0), false)
	_spawn_guard(Vector3(8.2, 0.82, -2.0), false)
	_spawn_guard(Vector3(-7.6, 0.82, 0.5), false)
	if current_contract == 1:
		_spawn_guard(Vector3(17.2, 0.82, 4.3), false)
	elif current_contract == 2:
		for entry in guards:
			entry["hp"] = int(entry["hp"]) + 1
			entry["max_hp"] = int(entry["max_hp"]) + 1
			entry["speed"] = float(entry["speed"]) * 1.12

func _spawn_guard(at: Vector3, is_warden: bool) -> void:
	var role: String = "WARDEN" if is_warden else (["STALKER", "HEAVY", "RANGER"][guards.size() % 3])
	var role_material: Material = materials["red"] if role in ["WARDEN", "RANGER"] else (materials["violet"] if role == "STALKER" else materials["amber"])
	var body := CharacterBody3D.new()
	body.name = "Warden" if is_warden else "Security_" + role
	body.position = at
	body.collision_layer = 2
	body.collision_mask = 1
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.49 if is_warden else (0.36 if role == "STALKER" else (0.46 if role == "HEAVY" else 0.4))
	capsule.height = 1.9 if is_warden else (1.5 if role == "STALKER" else (1.72 if role == "HEAVY" else 1.55))
	shape.shape = capsule
	body.add_child(shape)
	var mesh := CapsuleMesh.new()
	mesh.radius = capsule.radius
	mesh.height = capsule.height
	var visual := MeshInstance3D.new()
	visual.name = "Armor"
	visual.mesh = mesh
	visual.material_override = role_material
	body.add_child(visual)
	_add_cube(body, Vector3(0.0, 0.27, -0.04), Vector3(0.68, 0.3, 0.58), materials["black"])
	_add_cube(body, Vector3(0.0, 0.56, -0.28), Vector3(0.42, 0.12, 0.1), role_material)
	_add_cube(body, Vector3(-0.35, 0.34, -0.02), Vector3(0.2, 0.22, 0.28), role_material)
	_add_cube(body, Vector3(0.35, 0.34, -0.02), Vector3(0.2, 0.22, 0.28), role_material)
	_add_cube(body, Vector3(0.0, 0.16, -0.31), Vector3(0.5, 0.28, 0.075), materials["wall_trim"])
	_add_sphere_mesh(body, "GuardHelmet", Vector3(0.0, 0.67, -0.025), 0.23 if not is_warden else 0.28, 0.44 if not is_warden else 0.52, materials["black"])
	var hit_feedback := Label3D.new()
	hit_feedback.name = "HitFeedback"
	hit_feedback.text = "−1"
	hit_feedback.font_size = 36
	hit_feedback.pixel_size = 0.015
	hit_feedback.outline_size = 9
	hit_feedback.outline_modulate = Color(0.004, 0.012, 0.016, 0.98)
	hit_feedback.modulate = Color(1.0, 0.94, 0.7, 1.0)
	hit_feedback.position = Vector3(0.0, 2.58 if not is_warden else 3.02, 0.0)
	hit_feedback.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	hit_feedback.no_depth_test = true
	hit_feedback.visible = false
	body.add_child(hit_feedback)
	var health_readout := Label3D.new()
	health_readout.name = "HealthReadout"
	health_readout.text = "HP 10 / 10" if is_warden else "HP 3 / 3"
	health_readout.font_size = 22
	health_readout.pixel_size = 0.012
	health_readout.outline_size = 8
	health_readout.outline_modulate = Color(0.004, 0.012, 0.016, 0.98)
	health_readout.modulate = Color(1.0, 0.38, 0.42) if is_warden else Color(0.65, 1.0, 0.93)
	health_readout.position = Vector3(0.0, 2.62 if is_warden else 2.22, 0.0)
	health_readout.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	health_readout.no_depth_test = true
	health_readout.visible = is_warden
	body.add_child(health_readout)
	_add_cube(body, Vector3(0.0, 0.69, -0.24), Vector3(0.29, 0.065, 0.035), role_material)
	_add_cube(body, Vector3(0.0, 0.43, 0.28), Vector3(0.34, 0.38, 0.17), materials["black"])
	_add_cube(body, Vector3(-0.13, 0.43, 0.375), Vector3(0.05, 0.24, 0.025), role_material)
	_add_cube(body, Vector3(0.13, 0.43, 0.375), Vector3(0.05, 0.24, 0.025), role_material)
	var tag := Label3D.new()
	tag.name = "CombatRole"
	tag.text = "WARDEN / ELITE" if is_warden else role
	tag.font_size = 20
	tag.pixel_size = 0.014
	tag.outline_size = 7
	tag.outline_modulate = Color(0.006, 0.018, 0.022, 0.98)
	tag.modulate = (role_material as StandardMaterial3D).albedo_color
	tag.position = Vector3(0.0, 2.25 if is_warden else 1.95, 0.0)
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.no_depth_test = true
	body.add_child(tag)
	add_child(body)
	guards.append({
		"node": body,
		"role": role,
		"hp": 10 if is_warden else (4 if current_contract == 2 else 3),
		"max_hp": 10 if is_warden else (4 if current_contract == 2 else 3),
		"health_timer": 0.0,
		"hit_flash_timer": 0.0,
		"hit_label_timer": 0.0,
		"hit_label": hit_feedback,
		"speed": 3.25 if is_warden else (3.0 if role == "STALKER" else (1.6 if role == "HEAVY" else (2.25 if current_contract == 2 else 1.9))),
		"damage": 18 if is_warden else (16 if role == "HEAVY" else 10),
		"warden": is_warden,
		"stun": 0.0,
		"windup": 0.0,
		"cooldown": randf_range(0.8, 1.8),
		"dash_windup": 0.0,
		"dash_timer": 0.0,
		"dash_cooldown": randf_range(1.4, 2.4),
		"phase": randf_range(0.0, TAU)
	})

func _read_move_input() -> Vector2:
	var move := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	move += Vector2(
		float(mobile_actions.get("right", false)) - float(mobile_actions.get("left", false)),
		float(mobile_actions.get("down", false)) - float(mobile_actions.get("up", false))
	)
	return move.normalized() if move.length() > 1.0 else move

func _move_player(_delta: float) -> void:
	if not is_instance_valid(player):
		return
	if terminal_active:
		player.velocity = Vector3.ZERO
		_update_player_aim()
		return
	if dash_timer > 0.0:
		player.velocity = dash_direction * PLAYER_SPEED * DASH_SPEED_MULTIPLIER
	else:
		var move := _read_move_input()
		player.velocity = Vector3(move.x * PLAYER_SPEED, 0.0, move.y * PLAYER_SPEED)
	player.move_and_slide()
	_update_player_aim()

func _try_dash() -> void:
	if dash_cooldown > 0.0 or paused_game or mission_finished or terminal_active or briefing_visible:
		return
	if is_instance_valid(loadout_panel) and loadout_panel.visible:
		return
	if is_instance_valid(pause_panel) and pause_panel.visible:
		return
	if not is_instance_valid(player):
		return
	var move := _read_move_input()
	if move.length_squared() > 0.001:
		dash_direction = Vector3(move.x, 0.0, move.y).normalized()
	else:
		dash_direction = Vector3(player_aim.x, 0.0, player_aim.z).normalized()
	if dash_direction.length_squared() < 0.001:
		dash_direction = Vector3.FORWARD
	dash_timer = DASH_DURATION
	dash_cooldown = DASH_COOLDOWN
	dash_evasion_registered = false
	var dash_material: Material = materials["violet"] if null_shift_timer > 0.0 else materials["cyan"]
	var feet: Vector3 = player.global_position + Vector3.UP * 0.12
	_spawn_ring_burst(feet, dash_material)
	_spawn_beam(feet + Vector3.UP * 0.34, feet + Vector3.UP * 0.34 - dash_direction * 2.5, dash_material, 0.2)
	_screen_impulse(0.04, 0.12)
	_play_sfx(245.0, 0.12, 0.075)
	if is_instance_valid(dash_status_label):
		dash_status_label.text = "РЫВОК · УКЛОНЕНИЕ АКТИВНО"
		dash_status_label.add_theme_color_override("font_color", Color(0.38, 1.0, 0.86))

func _update_player_aim() -> void:
	if not is_instance_valid(player) or not is_instance_valid(camera):
		aim_target_node = null
		return
	var direction := Vector3.ZERO
	if mobile_controls_visible:
		var selected := _select_aim_target(Vector3.ZERO, true)
		if not selected.is_empty():
			aim_target_node = selected["node"] as Node3D
			direction = aim_target_node.global_position - player.global_position
		else:
			aim_target_node = null
			if not terminal_unlocked:
				direction = terminal.global_position - player.global_position
			elif not core_secured:
				direction = quantum_core.global_position - player.global_position
			else:
				direction = extraction.global_position - player.global_position
	else:
		var mouse := get_viewport().get_mouse_position()
		var ray_origin := camera.project_ray_origin(mouse)
		var ray_direction := camera.project_ray_normal(mouse)
		var plane := Plane(Vector3.UP, player.global_position.y + 0.35)
		var hit_point: Variant = plane.intersects_ray(ray_origin, ray_direction)
		if hit_point is Vector3:
			direction = hit_point - player.global_position
		var aim_direction := direction
		aim_direction.y = 0.0
		if aim_direction.length_squared() > 0.01:
			var selected := _select_aim_target(aim_direction.normalized(), false)
			aim_target_node = selected["node"] as Node3D if not selected.is_empty() else null
		else:
			aim_target_node = null
	if direction.length_squared() < 0.01:
		direction = Vector3.FORWARD
	direction.y = 0.0
	player_aim = direction.normalized()
	player.rotation.y = atan2(-player_aim.x, -player_aim.z)

func _select_aim_target(aim_direction: Vector3, mobile: bool) -> Dictionary:
	if not is_instance_valid(player):
		return {}
	var nearest: Dictionary = {}
	var best_score: float = INF
	var max_distance: float = 30.0 if mobile else 42.0
	var facing := aim_direction
	facing.y = 0.0
	if facing.length_squared() > 0.001:
		facing = facing.normalized()
	for guard in guards:
		var body: CharacterBody3D = guard.get("node") as CharacterBody3D
		if not is_instance_valid(body) or int(guard.get("hp", 0)) <= 0:
			continue
		var offset := body.global_position - player.global_position
		offset.y = 0.0
		var distance: float = offset.length()
		if distance <= 0.1 or distance > max_distance:
			continue
		var alignment: float = 1.0
		if not mobile:
			if facing.length_squared() < 0.001:
				continue
			alignment = facing.dot(offset / distance)
			if alignment < 0.965:
				continue
		if not _has_clear_path_to_aim_target(body):
			continue
		var score: float = distance if mobile else distance * 0.012 + (1.0 - alignment) * 14.0
		if body == aim_target_node:
			score -= 1.35 if mobile else 0.55
		if score < best_score:
			best_score = score
			nearest = guard
	return nearest

func _has_clear_path_to_aim_target(target: Node3D) -> bool:
	if not is_instance_valid(player) or not is_instance_valid(target):
		return false
	var origin: Vector3 = player.global_position + Vector3.UP * 0.68
	var destination: Vector3 = target.global_position + Vector3.UP * 0.52
	var query := PhysicsRayQueryParameters3D.create(origin, destination)
	query.collision_mask = 3
	query.exclude = [player.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	return hit.is_empty() or hit.get("collider") == target

func _update_guards(delta: float) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		var body: CharacterBody3D = guard["node"]
		if not is_instance_valid(body):
			guards.remove_at(index)
			continue
		var health_timer: float = maxf(0.0, float(guard.get("health_timer", 0.0)) - delta)
		guard["health_timer"] = health_timer
		guard["hit_flash_timer"] = maxf(0.0, float(guard.get("hit_flash_timer", 0.0)) - delta)
		guard["hit_label_timer"] = maxf(0.0, float(guard.get("hit_label_timer", 0.0)) - delta)
		var health_readout := body.get_node_or_null("HealthReadout") as Label3D
		if is_instance_valid(health_readout):
			health_readout.visible = bool(guard["warden"]) or health_timer > 0.0
		var stun := maxf(0.0, float(guard["stun"]) - delta)
		guard["stun"] = stun
		if stun > 0.0:
			guard["windup"] = 0.0
			guard["dash_windup"] = 0.0
			guard["attack_lanes"] = []
			body.velocity = Vector3.ZERO
			guards[index] = guard
			continue
		var to_player := player.global_position - body.global_position
		to_player.y = 0.0
		var distance := to_player.length()
		if distance > 0.01:
			body.look_at(Vector3(player.global_position.x, body.global_position.y, player.global_position.z), Vector3.UP)
		var role: String = str(guard.get("role", "RANGER"))
		if role == "STALKER":
			var dash_windup := maxf(0.0, float(guard.get("dash_windup", 0.0)) - delta)
			var dash_timer := maxf(0.0, float(guard.get("dash_timer", 0.0)) - delta)
			var dash_cooldown := maxf(0.0, float(guard.get("dash_cooldown", 1.0)) - delta)
			guard["dash_cooldown"] = dash_cooldown
			if float(guard.get("dash_windup", 0.0)) > 0.0:
				guard["dash_windup"] = dash_windup
				if dash_windup <= 0.0:
					guard["dash_timer"] = 0.34
					_play_sfx(135.0, 0.12, 0.06)
				body.velocity = Vector3.ZERO
				guards[index] = guard
				continue
			if float(guard.get("dash_timer", 0.0)) > 0.0:
				guard["dash_timer"] = dash_timer
				body.velocity = to_player.normalized() * float(guard["speed"]) * 3.4
				body.move_and_slide()
				if body.global_position.distance_to(player.global_position) < 2.15 and damage_cooldown <= 0.0:
					_damage_player(14.0)
				guards[index] = guard
				continue
			if dash_cooldown <= 0.0 and distance > 4.5 and distance < 12.8:
				guard["dash_windup"] = 0.42
				guard["dash_cooldown"] = 3.7
				_spawn_beam(body.global_position + Vector3.UP * 0.9, player.global_position + Vector3.UP * 0.6, materials["violet"], 0.46)
				body.velocity = Vector3.ZERO
				guards[index] = guard
				continue
		var windup := float(guard["windup"])
		if windup > 0.0:
			windup -= delta
			guard["windup"] = windup
			body.velocity = Vector3.ZERO
			if windup <= 0.0:
				var stored_lanes: Array = guard.get("attack_lanes", [])
				if role == "WARDEN":
					_spawn_ring_burst(body.global_position + Vector3.UP * 0.12, materials["red"])
					_screen_impulse(0.13, 0.24)
					if distance < 7.6 and damage_cooldown <= 0.0 and _has_clear_path_to_player(body.global_position + Vector3.UP * 0.8, body):
						_damage_player(float(guard["damage"]) * 1.35, body)
				elif role == "HEAVY":
					_screen_impulse(0.055, 0.12)
					if _player_inside_lanes(stored_lanes, 14.5, 0.88, body) and damage_cooldown <= 0.0:
						_damage_player(float(guard["damage"]) * 1.3, body)
				elif _player_inside_lanes(stored_lanes, 14.5, 0.62, body) and damage_cooldown <= 0.0:
					_damage_player(float(guard["damage"]), body)
				guard["attack_lanes"] = []
				guard["cooldown"] = randf_range(1.45, 2.15) if role == "RANGER" else randf_range(2.0, 3.0)
			guards[index] = guard
			continue
		var cooldown := maxf(0.0, float(guard["cooldown"]) - delta)
		guard["cooldown"] = cooldown
		if distance < 13.5 and cooldown <= 0.0:
			guard["windup"] = 0.92 if role == "WARDEN" else (0.82 if role == "HEAVY" else 0.62)
			var aim_from := body.global_position + Vector3.UP * 1.0
			var aim_to := player.global_position + Vector3.UP * 0.8
			var role_material: StandardMaterial3D = materials["amber"] if role == "HEAVY" else (materials["red"] if role == "WARDEN" else materials["telegraph"])
			var attack_lanes: Array[Dictionary] = []
			if role == "HEAVY":
				var side := Vector3(-to_player.z, 0.0, to_player.x).normalized()
				for lane in [-1.0, 0.0, 1.0]:
					var lane_end: Vector3 = aim_to + side * lane * 1.45
					attack_lanes.append({"from": aim_from, "to": lane_end})
					_spawn_beam(aim_from, lane_end, role_material, 0.82)
			elif role == "WARDEN":
				for ray_index in range(8):
					var ray_angle := TAU * float(ray_index) / 8.0
					var ray_direction := Vector3(cos(ray_angle), 0.0, sin(ray_angle))
					_spawn_beam(aim_from, body.global_position + Vector3.UP * 0.8 + ray_direction * 5.6, role_material, 0.92)
			else:
				attack_lanes.append({"from": aim_from, "to": aim_to})
				_spawn_beam(aim_from, aim_to, role_material, 0.66)
			guard["attack_lanes"] = attack_lanes
			_play_sfx(230.0 if role != "WARDEN" else 115.0, 0.18, 0.08)
			body.velocity = Vector3.ZERO
		elif distance > 2.7 and distance < 22.0:
			body.velocity = to_player.normalized() * float(guard["speed"])
			body.move_and_slide()
		else:
			body.velocity = Vector3.ZERO
		guards[index] = guard

func _player_inside_lanes(lanes: Array, max_distance: float, half_width: float, attacker: PhysicsBody3D = null) -> bool:
	if not is_instance_valid(player):
		return false
	var player_point := Vector2(player.global_position.x, player.global_position.z)
	for lane_variant: Variant in lanes:
		if not lane_variant is Dictionary:
			continue
		var lane: Dictionary = lane_variant
		var from_world: Vector3 = lane.get("from", Vector3.ZERO)
		var to_world: Vector3 = lane.get("to", Vector3.ZERO)
		var origin := Vector2(from_world.x, from_world.z)
		var axis := Vector2(to_world.x - from_world.x, to_world.z - from_world.z)
		var length := minf(max_distance, axis.length())
		if length <= 0.01:
			continue
		axis = axis.normalized()
		var offset := player_point - origin
		var along := offset.dot(axis)
		var across := absf(offset.x * axis.y - offset.y * axis.x)
		if along >= 0.0 and along <= length and across <= half_width:
			if attacker == null or _has_clear_path_to_player(from_world, attacker):
				return true
	return false

func _has_clear_path_to_player(from_world: Vector3, attacker: PhysicsBody3D) -> bool:
	if not is_instance_valid(player):
		return false
	var query := PhysicsRayQueryParameters3D.create(from_world, player.global_position + Vector3.UP * 0.72)
	query.collision_mask = 1
	query.exclude = [attacker.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	return hit.is_empty() or hit.get("collider") == player

func _trigger_muzzle_flash() -> void:
	weapon_recoil = minf(1.0, weapon_recoil + 0.58)
	muzzle_flash_timer = 0.055
	if is_instance_valid(muzzle_flash):
		muzzle_flash.visible = true
	if is_instance_valid(muzzle_light):
		muzzle_light.light_energy = 2.8 + float(weapon_level) * 0.25
		muzzle_light.visible = cinematic_quality and not adaptive_quality_degraded

func _fire_weapon() -> void:
	if fire_cooldown > 0.0 or paused_game or mission_finished or terminal_active:
		return
	fire_cooldown = maxf(0.09, 0.17 - float(weapon_level) * 0.022)
	_trigger_muzzle_flash()
	var from := player.global_position + Vector3.UP * 0.82 + player_aim * 0.8
	var to := from + player_aim * 37.0
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.exclude = [player.get_rid()]
	query.collision_mask = 0xFFFFFFFF
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	var beam_end := to
	if not hit.is_empty():
		beam_end = hit["position"]
		var collider: Object = hit["collider"]
		if collider is Node:
			_damage_target(collider as Node)
	_spawn_beam(from, beam_end, materials["cyan"], 0.09)
	_spawn_hit_sparks(beam_end, materials["cyan"])
	_screen_impulse(0.018, 0.055)
	crosshair_kick = 1.0
	if not hit.is_empty():
		crosshair_hit_timer = 0.12
	_play_sfx(680.0, 0.055, 0.08)

func _damage_target(target: Node) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		if guard["node"] == target:
			guard["hp"] = int(guard["hp"]) - 1
			guard["health_timer"] = 1.8
			guard["hit_flash_timer"] = 0.14
			guard["hit_label_timer"] = 0.52
			var hit_feedback: Label3D = guard.get("hit_label") as Label3D
			if is_instance_valid(hit_feedback):
				hit_feedback.text = "−1"
				hit_feedback.visible = true
				hit_feedback.position.y = 3.02 if bool(guard.get("warden", false)) else 2.58
				hit_feedback.modulate = Color(1.0, 0.94, 0.7, 1.0)
				hit_feedback.scale = Vector3.ONE * 0.86
			var max_hp: int = int(guard.get("max_hp", 3))
			var health_readout := target.get_node_or_null("HealthReadout") as Label3D
			if is_instance_valid(health_readout):
				health_readout.text = "HP %d / %d" % [maxi(0, int(guard["hp"])), max_hp]
				health_readout.visible = true
			_spawn_hit_sparks(target.global_position + Vector3.UP * 0.7, materials["amber"])
			if int(guard["hp"]) <= 0:
				var body: Node3D = guard["node"]
				_spawn_ring_burst(body.global_position + Vector3.UP * 0.14, materials["amber"] if bool(guard["warden"]) else materials["cyan"])
				_spawn_hit_sparks(body.global_position + Vector3.UP * 0.95, materials["white"])
				_screen_impulse(0.045 if not bool(guard["warden"]) else 0.085, 0.085 if not bool(guard["warden"]) else 0.14)
				if aim_target_node == body:
					aim_target_node = null
					target_lock_has_position = false
				body.queue_free()
				guards.remove_at(index)
				eliminations += 1
				run_credits += 100
				objective_text = "ЦЕЛЬ УСТРАНЕНА · +100 КРЕДИТОВ"
				_play_sfx(145.0, 0.22, 0.12)
				_update_hud()
			return
	if target.has_meta("device_index"):
		var device_index := int(target.get_meta("device_index"))
		if device_index >= 0 and device_index < devices.size():
			var device: Dictionary = devices[device_index]
			if not bool(device["destroyed"]):
				device["hp"] = int(device["hp"]) - 1
				_spawn_hit_sparks(target.global_position + Vector3.UP * 0.7, materials["amber"])
				if int(device["hp"]) <= 0:
					_destroy_device(device_index)
				else:
					objective_text = "ПОЛЕВОЕ УСТРОЙСТВО ПОВРЕЖДЕНО · ЕЩЁ 1 ПОПАДАНИЕ"
				_update_hud()

func _destroy_device(index: int) -> void:
	var device: Dictionary = devices[index]
	device["destroyed"] = true
	var body: Node3D = device["node"]
	var kind: String = device["kind"]
	_spawn_ring_burst(body.global_position + Vector3.UP * 0.15, materials["amber"] if kind == "CELL" else (materials["violet"] if kind == "ANCHOR" else materials["cyan"]))
	_spawn_hit_sparks(body.global_position + Vector3.UP * 0.7, materials["amber"])
	_screen_impulse(0.17, 0.28)
	phase_flash_timer = maxf(phase_flash_timer, 0.22)
	body.visible = false
	body.collision_layer = 0
	for child in body.get_children():
		if child is CollisionShape3D:
			(child as CollisionShape3D).disabled = true
	run_credits += 80
	match kind:
		"RELAY":
			for guard in guards:
				guard["stun"] = maxf(float(guard["stun"]), 2.8)
			objective_text = "EMP RELAY РАЗРУШЕН · ОХРАНА ОГЛУШЕНА"
			_play_sfx(170.0, 0.45, 0.16)
		"CELL":
			player_health = minf(player_max_health, player_health + 35.0)
			pulse_cooldown = 0.0
			objective_text = "ЭНЕРГОЯЧЕЙКА ПЕРЕЗАРЯЖЕНА · +80 КРЕДИТОВ"
			_play_sfx(740.0, 0.22, 0.11)
		"ANCHOR":
			instability = minf(100.0, instability + 18.0)
			null_shift_timer = maxf(null_shift_timer, 1.0)
			objective_text = "ЯКОРЬ ФАЗЫ РАЗРУШЕН · НЕСТАБИЛЬНОСТЬ +18%"
	run_credits += 0
	_update_hud()

func _deploy_pulse() -> void:
	if pulse_cooldown > 0.0 or paused_game or mission_finished:
		objective_text = "ИМПУЛЬС ПЕРЕЗАРЯЖАЕТСЯ · %.1f С" % pulse_cooldown
		return
	pulse_cooldown = maxf(2.0, 5.0 - float(pulse_level) * 0.7)
	var count := 0
	for guard in guards:
		var body: Node3D = guard["node"]
		if player.global_position.distance_to(body.global_position) < 12.5:
			guard["stun"] = 2.5
			guard["windup"] = 0.0
			count += 1
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.2, materials["cyan"])
	_screen_impulse(0.095, 0.17)
	phase_flash_timer = maxf(phase_flash_timer, 0.14)
	objective_text = "ИМПУЛЬС: %d ЦЕЛЕЙ НАРУШЕНО · ПЕРЕЗАРЯДКА %.1f С" % [count, pulse_cooldown]
	_play_sfx(95.0, 0.55, 0.16)
	_update_hud()

func _shift_layer() -> void:
	if null_shift_timer > 0.0 or paused_game or mission_finished:
		return
	null_shift_timer = 3.8
	instability = minf(100.0, instability + 24.0)
	phase_flash_timer = maxf(phase_flash_timer, 0.34)
	_screen_impulse(0.105, 0.2)
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.1, materials["violet"])
	_play_sfx(160.0, 0.4, 0.13)
	objective_text = "NULL SHIFT АКТИВЕН · НЕСТАБИЛЬНОСТЬ %d%%" % int(instability)
	if instability >= 70.0 and not warden_spawned:
		warden_spawned = true
		alarm_active = true
		_spawn_guard(Vector3(18.0, 0.82, -9.0), true)
		objective_text = "ОБЪЕКТ WARDEN ОБНАРУЖЕН · ОН ОТСЛЕЖИВАЕТ СДВИГИ"
		_play_sfx(60.0, 0.75, 0.22)
	_update_hud()

func _interact() -> void:
	if paused_game or mission_finished:
		return
	if not medkit_used and _near(player, medkit, 2.7):
		medkit_used = true
		medkit.visible = false
		player_health = minf(player_max_health, player_health + 40.0)
		objective_text = "АПТЕЧКА ИСПОЛЬЗОВАНА · ЗДОРОВЬЕ ВОССТАНОВЛЕНО"
		_play_sfx(560.0, 0.18, 0.1)
	elif not terminal_unlocked and _near(player, terminal, 3.3):
		terminal_active = not terminal_active
		keypad_panel.visible = terminal_active
		objective_text = "ВВЕДИТЕ ШИФР: ↑  ←  ↓  →" if terminal_active else "ТЕРМИНАЛ ОЖИДАЕТ ПОДКЛЮЧЕНИЯ"
		_play_sfx(390.0, 0.12, 0.08)
	elif terminal_unlocked and not core_secured and _near(player, quantum_core, 3.0):
		core_secured = true
		quantum_core.visible = false
		core_ring.visible = false
		core_light.visible = false
		run_credits += 750
		objective_text = "ЯДРО ИЗВЛЕЧЕНО · НАПРАВЛЯЙТЕСЬ К ТОЧКЕ ЭВАКУАЦИИ"
		_play_sfx(880.0, 0.42, 0.13)
	elif core_secured and _near(player, extraction, 3.5):
		_finish_mission(true)
	elif not terminal_unlocked and _near(player, quantum_core, 3.0):
		objective_text = "ЯДРО ЗАБЛОКИРОВАНО · СНАЧАЛА ВЗЛОМАЙТЕ ТЕРМИНАЛ"
	else:
		objective_text = _nearest_prompt()

func _animate_security_gate_open() -> void:
	if not is_instance_valid(security_gate) or gate_open_started:
		return
	gate_open_started = true
	if is_instance_valid(gate_indicator_strip):
		gate_indicator_strip.material_override = materials["cyan"]
	if is_instance_valid(gate_status_light):
		gate_status_light.light_color = Color(0.08, 1.0, 0.74)
		gate_status_light.light_energy = 2.4
	var target_position: Vector3 = security_gate.position + Vector3.UP * 2.65
	gate_motion_tween = create_tween()
	gate_motion_tween.set_parallel(true)
	gate_motion_tween.set_trans(Tween.TRANS_CUBIC)
	gate_motion_tween.set_ease(Tween.EASE_IN_OUT)
	gate_motion_tween.tween_property(security_gate, "position", target_position, 0.78)
	gate_motion_tween.tween_property(security_gate, "scale", Vector3(1.0, 0.42, 1.0), 0.78)
	gate_motion_tween.finished.connect(_finish_security_gate_open)
	_play_sfx(260.0, 0.34, 0.11)

func _finish_security_gate_open() -> void:
	if is_instance_valid(security_gate):
		security_gate.visible = false
	if is_instance_valid(gate_status_light):
		gate_status_light.light_energy = 0.22

func _submit_cipher_key(key: int) -> void:
	if not terminal_active or terminal_unlocked:
		return
	if key != CIPHER[terminal_progress]:
		terminal_progress = 0
		keypad_progress_label.text = "ОШИБКА · ПОСЛЕДОВАТЕЛЬНОСТЬ СБРОШЕНА"
		_play_sfx(180.0, 0.18, 0.12)
		return
	terminal_progress += 1
	keypad_progress_label.text = "КОД %d / 4" % terminal_progress
	_play_sfx(520.0 + terminal_progress * 75.0, 0.09, 0.08)
	if terminal_progress >= CIPHER.size():
		terminal_unlocked = true
		terminal_active = false
		keypad_panel.visible = false
		alarm_active = true
		if is_instance_valid(security_gate):
			security_gate.collision_layer = 0
			security_gate.collision_mask = 0
			for child in security_gate.get_children():
				if child is CollisionShape3D:
					(child as CollisionShape3D).disabled = true
			_animate_security_gate_open()
		_spawn_guard(Vector3(18.0, 0.82, 5.5), false)
		objective_text = "СИСТЕМА ВЗЛОМАНА · ОХРАНА ПЕРЕШЛА В РЕЖИМ ТРЕВОГИ"
		_play_sfx(110.0, 0.7, 0.16)
	_update_hud()

func _nearest_prompt() -> String:
	var options: Array[Dictionary] = []
	if not medkit_used:
		options.append({"node": medkit, "text": "E · ВЗЯТЬ АПТЕЧКУ"})
	if not terminal_unlocked:
		options.append({"node": terminal, "text": "E · ПОДКЛЮЧИТЬ ТЕРМИНАЛ"})
	if terminal_unlocked and not core_secured:
		options.append({"node": quantum_core, "text": "E · ИЗВЛЕЧЬ ЯДРО"})
	if core_secured:
		options.append({"node": extraction, "text": "E · ЭВАКУАЦИЯ"})
	var nearest_text := ""
	var shortest := 100000.0
	for option in options:
		var node: Node3D = option["node"]
		if not is_instance_valid(node) or not node.visible:
			continue
		var distance := player.global_position.distance_to(node.global_position)
		if distance < shortest:
			shortest = distance
			nearest_text = option["text"]
	return nearest_text if shortest < 5.0 else "WASD / СТРЕЛКИ ДВИЖЕНИЕ · ЛКМ ОГОНЬ · Q ИМПУЛЬС · SHIFT СДВИГ"

func _near(first: Node3D, second: Node3D, distance: float) -> bool:
	return is_instance_valid(first) and is_instance_valid(second) and first.global_position.distance_to(second.global_position) < distance

func _damage_player(amount: float, attacker: Node3D = null) -> void:
	if dash_timer > 0.0:
		if not dash_evasion_registered:
			dash_evasion_registered = true
			dash_evasions += 1
			_play_sfx(820.0, 0.065, 0.045)
			if is_instance_valid(dash_status_label):
				dash_status_label.text = "УКЛОНЕНИЕ · АТАКА ПРОПУЩЕНА"
				dash_status_label.add_theme_color_override("font_color", Color(0.58, 1.0, 0.91))
			_update_hud()
		return
	if damage_cooldown > 0.0 or null_shift_timer > 0.0:
		return
	damage_cooldown = 0.5
	damage_flash_timer = 0.2
	impact_flash_timer = maxf(impact_flash_timer, 0.28)
	_screen_impulse(0.24, 0.32)
	player_health = maxf(0.0, player_health - amount)
	if is_instance_valid(attacker):
		_show_damage_direction(attacker)
	_spawn_hit_sparks(player.global_position + Vector3.UP * 0.8, materials["red"])
	_play_sfx(85.0, 0.24, 0.14)
	objective_text = "ПОПАДАНИЕ · ЗДОРОВЬЕ %d%%" % int(player_health)
	_update_hud()

func _finish_mission(success: bool) -> void:
	if mission_finished:
		return
	mission_finished = true
	paused_game = false
	if success:
		var payout := run_credits + int(contract_bonus[current_contract])
		career_credits += payout
		_save_career()
		_set_result_title("ЭВАКУАЦИЯ УСПЕШНА", "РЕЙД ЗАВЕРШЁН · +%d КРЕДИТОВ ЗАНЕСЕНО В КАРЬЕРУ" % payout, Color(0.38, 1.0, 0.85))
		objective_text = "МИССИЯ ВЫПОЛНЕНА · КАРЬЕРНЫЙ БАЛАНС %d" % career_credits
		_play_sfx(920.0, 0.6, 0.13)
	else:
		_set_result_title("ОПЕРАТОР ПОТЕРЯН", "КОНТРАКТ ПРОВАЛЕН · БАЛАНС КАРЬЕРЫ НЕ ИЗМЕНЁН", Color(1.0, 0.25, 0.34))
		objective_text = "ОПЕРАТОР НЕ ВЕРНУЛСЯ · ПЕРЕЗАПУСТИТЕ РЕЙД"
		_play_sfx(70.0, 0.9, 0.18)
	result_panel.visible = true
	_update_hud()

func _set_result_title(title_text: String, body_text: String, tint: Color) -> void:
	for child in result_panel.get_children():
		if child is MarginContainer:
			for inner in child.get_children():
				if inner is VBoxContainer:
					var stack := inner as VBoxContainer
					if stack.get_child_count() >= 2:
						(stack.get_child(0) as Label).text = title_text
						(stack.get_child(0) as Label).add_theme_color_override("font_color", tint)
						(stack.get_child(1) as Label).text = body_text
						return

func _cycle_contract() -> void:
	current_contract = (current_contract + 1) % career_names.size()
	career.set_value("raid", "contract", current_contract)
	_save_career()
	objective_text = "КОНТРАКТ: " + career_names[current_contract] + " · ПЕРЕЗАПУСТИТЕ РЕЙД ДЛЯ ПРИМЕНЕНИЯ"
	_update_hud()

func _toggle_loadout() -> void:
	loadout_panel.visible = not loadout_panel.visible
	if loadout_panel.visible:
		_refresh_loadout()

func _close_loadout() -> void:
	loadout_panel.visible = false

func _close_keypad() -> void:
	terminal_active = false
	keypad_panel.visible = false

func _show_loadout_from_result() -> void:
	result_panel.hide()
	loadout_panel.show()
	_refresh_loadout()

func _buy_upgrade(which: String) -> void:
	var level := 0
	var cost := 0
	match which:
		"armor":
			level = armor_level
			cost = 700 + armor_level * 550
		"pulse":
			level = pulse_level
			cost = 850 + pulse_level * 600
		"weapon":
			level = weapon_level
			cost = 650 + weapon_level * 500
	if level >= 3:
		objective_text = "МОДУЛЬ УЖЕ ДОСТИГ МАКСИМАЛЬНОГО УРОВНЯ"
	elif career_credits < cost:
		objective_text = "НЕДОСТАТОЧНО КАРЬЕРНЫХ КРЕДИТОВ · НУЖНО %d" % cost
	else:
		career_credits -= cost
		match which:
			"armor":
				armor_level += 1
				player_max_health = 100.0 + armor_level * 20.0
				player_health = minf(player_max_health, player_health + 25.0)
			"pulse":
				pulse_level += 1
			"weapon":
				weapon_level += 1
		_save_career()
		objective_text = "МОДУЛЬ УСТАНОВЛЕН · КАРЬЕРНЫЙ БАЛАНС %d" % career_credits
		_play_sfx(760.0, 0.28, 0.1)
	_refresh_loadout()
	_update_hud()

func _toggle_quality() -> void:
	# F2/touch cycles cinematic -> balanced -> performance -> cinematic.
	if cinematic_quality:
		cinematic_quality = false
		performance_quality = false
	elif not performance_quality:
		performance_quality = true
	else:
		cinematic_quality = true
		performance_quality = false
	_apply_quality_mode()
	career.set_value("settings", "cinematic_quality", cinematic_quality)
	career.set_value("settings", "performance_quality", performance_quality)
	_save_career()
	objective_text = "ГРАФИКА: КИНОРЕЖИМ" if cinematic_quality else ("ГРАФИКА: ПРОИЗВОДИТЕЛЬНОСТЬ" if performance_quality else "ГРАФИКА: СБАЛАНСИРОВАННЫЙ РЕЖИМ")
	_update_hud()

func _apply_quality_mode() -> void:
	if not cinematic_quality:
		adaptive_quality_degraded = false
		adaptive_slow_windows = 0
		adaptive_fast_windows = 0
	var cinematic_effects: bool = cinematic_quality and not adaptive_quality_degraded
	var balanced_effects: bool = not performance_quality and not adaptive_quality_degraded
	if is_instance_valid(world_environment) and is_instance_valid(world_environment.environment):
		world_environment.environment.glow_enabled = cinematic_effects
	if is_instance_valid(key_light):
		key_light.shadow_enabled = balanced_effects
	if is_instance_valid(fill_light):
		fill_light.visible = balanced_effects
	for light in local_lights:
		if is_instance_valid(light):
			light.visible = balanced_effects
	var mode_name: String = "CINEMATIC" if cinematic_quality else ("PERFORMANCE" if performance_quality else "BALANCED")
	if is_instance_valid(status_subtitle):
		status_subtitle.text = "PHASE TRANSIT / AUTO-OPTIMIZED" if adaptive_quality_degraded else "PHASE TRANSIT / %s" % mode_name
	if is_instance_valid(quality_button):
		quality_button.text = "QUALITY / %s" % mode_name
	if is_instance_valid(mobile_quality_button):
		mobile_quality_button.tooltip_text = "Текущий режим: %s. Нажмите для переключения." % mode_name
	if is_instance_valid(mobile_diagnostics_button):
		mobile_diagnostics_button.text = "FPS+" if diagnostics_enabled else "FPS"
	if is_instance_valid(sound_button):
		sound_button.text = "ЗВУК / ВКЛ" if sound_enabled else "ЗВУК / ВЫКЛ"


func _update_adaptive_quality() -> void:
	if not cinematic_quality or frame_samples.size() < 45:
		return
	var samples: Array[float] = frame_samples.duplicate()
	var total_ms := 0.0
	for sample in samples:
		total_ms += sample
	var mean_ms := total_ms / float(samples.size())
	samples.sort()
	var p95_index := clampi(int(ceil(float(samples.size() - 1) * 0.95)), 0, samples.size() - 1)
	_evaluate_adaptive_quality(mean_ms, samples[p95_index])

func _evaluate_adaptive_quality(mean_ms: float, p95_ms: float) -> void:
	if not cinematic_quality:
		adaptive_slow_windows = 0
		adaptive_fast_windows = 0
		return
	if mean_ms >= 20.0 or p95_ms >= 28.0:
		adaptive_slow_windows += 1
		adaptive_fast_windows = 0
		if adaptive_slow_windows >= 2 and not adaptive_quality_degraded:
			adaptive_quality_degraded = true
			_apply_quality_mode()
	elif mean_ms <= 16.8 and p95_ms <= 21.0:
		adaptive_fast_windows += 1
		adaptive_slow_windows = 0
		if adaptive_fast_windows >= 4 and adaptive_quality_degraded:
			adaptive_quality_degraded = false
			_apply_quality_mode()
	else:
		adaptive_slow_windows = 0
		adaptive_fast_windows = 0

func _toggle_sound() -> void:
	sound_enabled = not sound_enabled
	career.set_value("settings", "sound_enabled", sound_enabled)
	_save_career()
	if is_instance_valid(sound_button):
		sound_button.text = "ЗВУК / ВКЛ" if sound_enabled else "ЗВУК / ВЫКЛ"
	objective_text = "ЗВУКОВЫЕ ЭФФЕКТЫ ВКЛЮЧЕНЫ" if sound_enabled else "ЗВУКОВЫЕ ЭФФЕКТЫ ОТКЛЮЧЕНЫ"
	if sound_enabled:
		_play_sfx(520.0, 0.08, 0.055)
	_update_hud()

func _toggle_diagnostics() -> void:
	diagnostics_enabled = not diagnostics_enabled
	diagnostics_label.visible = diagnostics_enabled
	if is_instance_valid(mobile_diagnostics_button):
		mobile_diagnostics_button.text = "FPS+" if diagnostics_enabled else "FPS"

func _show_briefing() -> void:
	if not is_instance_valid(briefing_panel) or mission_finished:
		return
	briefing_visible = true
	paused_game = true
	pause_panel.visible = false
	loadout_panel.visible = false
	keypad_panel.visible = false
	terminal_active = false
	briefing_panel.visible = true
	_update_crosshair()

func _dismiss_briefing() -> void:
	if not briefing_visible:
		return
	briefing_visible = false
	paused_game = false
	if is_instance_valid(briefing_panel):
		briefing_panel.visible = false
	career.set_value("settings", "briefing_seen", true)
	_save_career()
	objective_text = "ОПЕРАЦИЯ НАЧАЛАСЬ · ВЗЛОМ → ЯДРО → ЭВАКУАЦИЯ"
	_update_hud()
	_update_crosshair()

func _set_pause(state: bool) -> void:
	if mission_finished or briefing_visible:
		return
	paused_game = state
	pause_panel.visible = state

func _load_career() -> void:
	career.load(SAVE_PATH)
	career_credits = int(career.get_value("career", "credits", 0))
	armor_level = int(career.get_value("upgrades", "armor", 0))
	pulse_level = int(career.get_value("upgrades", "pulse", 0))
	weapon_level = int(career.get_value("upgrades", "weapon", 0))
	current_contract = int(career.get_value("raid", "contract", 0)) % career_names.size()
	player_max_health = 100.0 + armor_level * 20.0
	player_health = player_max_health
	var compact_profile := get_viewport().get_visible_rect().size.x < 920.0 or DisplayServer.is_touchscreen_available()
	cinematic_quality = bool(career.get_value("settings", "cinematic_quality", not compact_profile))
	performance_quality = bool(career.get_value("settings", "performance_quality", false))
	if performance_quality:
		cinematic_quality = false
	sound_enabled = bool(career.get_value("settings", "sound_enabled", true))

func _save_career() -> void:
	career.set_value("career", "credits", career_credits)
	career.set_value("upgrades", "armor", armor_level)
	career.set_value("upgrades", "pulse", pulse_level)
	career.set_value("upgrades", "weapon", weapon_level)
	career.set_value("raid", "contract", current_contract)
	var err := career.save(SAVE_PATH)
	if err != OK:
		push_warning("Could not write local career save: %s" % error_string(err))

func _create_ui() -> void:
	# UI construction can be re-entered by scene reload or test harnesses; don't stack layers.
	if is_instance_valid(hud_root):
		return
	phase_lane_labels.clear()
	mobile_move_buttons.clear()
	mobile_move_spacers.clear()
	mobile_action_buttons.clear()
	crosshair_parts.clear()
	target_lock_brackets.clear()
	var layer := CanvasLayer.new()
	layer.name = "TacticalInterface"
	layer.layer = 8
	layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(layer)
	hud_root = Control.new()
	hud_root.name = "HUD"
	hud_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(hud_root)
	_create_cinematic_vignette()

	status_panel = _make_panel(hud_root, Control.PRESET_TOP_LEFT, Rect2(18.0, 18.0, 316.0, 190.0))
	var status_stack := _panel_stack(status_panel)
	status_title = _label(status_stack, "NULL//SHIFT", 22, Color(0.38, 1.0, 0.86))
	status_subtitle = _label(status_stack, "PHASE TRANSIT  /  TACTICAL RAID", 9, Color(0.49, 0.67, 0.69))
	health_label = _label(status_stack, "ВИТАЛЬНОСТЬ  100 / 100", 13, Color(0.86, 1.0, 0.97))
	health_bar = ProgressBar.new()
	health_bar.name = "HealthBar"
	health_bar.min_value = 0.0
	health_bar.max_value = player_max_health
	health_bar.value = player_health
	health_bar.show_percentage = false
	health_bar.custom_minimum_size = Vector2(272.0, 7.0)
	health_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var health_bar_background := StyleBoxFlat.new()
	health_bar_background.bg_color = Color(0.035, 0.078, 0.086, 0.98)
	health_bar_background.set_corner_radius_all(3)
	health_bar.add_theme_stylebox_override("background", health_bar_background)
	health_bar_fill = StyleBoxFlat.new()
	health_bar_fill.bg_color = Color(0.38, 0.96, 0.76)
	health_bar_fill.set_corner_radius_all(3)
	health_bar.add_theme_stylebox_override("fill", health_bar_fill)
	status_stack.add_child(health_bar)
	credits_label = _label(status_stack, "РЕЙД  000  ·  КАРЬЕРА  000", 12, Color(1.0, 0.77, 0.39))
	threat_label = _label(status_stack, "УГРОЗА: ВЫСОКАЯ", 11, Color(1.0, 0.3, 0.38))
	hazard_status_label = _label(status_stack, "ЭНЕРГОКОНТУРЫ · СТАБИЛЬНО", 9, Color(0.38, 0.9, 0.82))
	dash_status_label = _label(status_stack, "РЫВОК ГОТОВ · SPACE", 9, Color(0.38, 0.9, 0.82))
	phase_lane_status_row = HBoxContainer.new()
	phase_lane_status_row.name = "PhaseLaneStatus"
	phase_lane_status_row.add_theme_constant_override("separation", 4)
	status_stack.add_child(phase_lane_status_row)
	for lane_index in range(3):
		var lane_chip: Label = _label(phase_lane_status_row, "К%d · НОРМА" % [lane_index + 1], 8, Color(0.38, 0.9, 0.82))
		lane_chip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lane_chip.custom_minimum_size = Vector2(82.0, 16.0)
		lane_chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		phase_lane_labels.append(lane_chip)
	status_shortcuts = _label(status_stack, "ПОМОЩЬ / H  ·  FPS / F3  ·  ГРАФИКА / F2", 8, Color(0.48, 0.6, 0.62))

	objective_panel = _make_panel(hud_root, Control.PRESET_TOP_RIGHT, Rect2(-334.0, 18.0, 316.0, 178.0))
	var objective_stack := _panel_stack(objective_panel)
	objective_title = _label(objective_stack, "MISSION CONTROL", 11, Color(1.0, 0.77, 0.39))
	objective_label = _label(objective_stack, objective_text, 12, Color(0.88, 0.96, 0.95))
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(285.0, 64.0)
	telemetry_label = _label(objective_stack, "HOSTILES 03  ·  DEVICES 03  ·  CONTRACT 01", 10, Color(0.48, 0.72, 0.72))
	objective_actions = HBoxContainer.new()
	objective_actions.add_theme_constant_override("separation", 6)
	objective_stack.add_child(objective_actions)
	_add_button(objective_actions, "DIAG / F3", func(): _toggle_diagnostics(), Vector2(88.0, 32.0))
	quality_button = _add_button(objective_actions, "QUALITY / F2", func(): _toggle_quality(), Vector2(115.0, 32.0))
	_add_button(objective_actions, "PAUSE / ESC", func(): _set_pause(not paused_game), Vector2(88.0, 32.0))

	mid_panel = _make_panel(hud_root, Control.PRESET_CENTER_TOP, Rect2(-225.0, 98.0, 450.0, 68.0))
	mid_panel.modulate = Color(1.0, 1.0, 1.0, 0.92)
	var mid_stack := _panel_stack(mid_panel)
	var compass_row := HBoxContainer.new()
	compass_row.name = "ObjectiveCompassRow"
	compass_row.alignment = BoxContainer.ALIGNMENT_CENTER
	compass_row.add_theme_constant_override("separation", 8)
	mid_stack.add_child(compass_row)
	objective_compass_arrow = _label(compass_row, "▲", 17, Color(0.38, 1.0, 0.86))
	objective_compass_arrow.custom_minimum_size = Vector2(28.0, 22.0)
	objective_compass_arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	objective_compass_arrow.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	objective_compass_text = _label(compass_row, "ЦЕЛЬ / ТЕРМИНАЛ · -- М", 10, Color(0.34, 0.86, 0.8))
	objective_compass_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	var subtitle := _label(mid_stack, "ТЕРМИНАЛ → КВАНТОВОЕ ЯДРО → ЭВАКУАЦИЯ", 11, Color(0.91, 0.98, 0.96))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	diagnostics_label = _label(hud_root, "", 11, Color(0.7, 1.0, 0.92))
	diagnostics_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	diagnostics_label.offset_left = 18.0
	diagnostics_label.offset_top = 218.0
	diagnostics_label.offset_right = 335.0
	diagnostics_label.offset_bottom = 410.0
	diagnostics_label.visible = false
	diagnostics_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	bottom_hint = _label(hud_root, "WASD / СТРЕЛКИ · ЛКМ ОГОНЬ · E ДЕЙСТВИЕ · Q ИМПУЛЬС · SHIFT NULL SHIFT", 10, Color(0.54, 0.71, 0.7))
	bottom_hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom_hint.offset_left = 20.0
	bottom_hint.offset_top = -45.0
	bottom_hint.offset_right = -20.0
	bottom_hint.offset_bottom = -15.0
	bottom_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	keypad_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-222.0, -142.0, 444.0, 284.0))
	keypad_panel.visible = false
	var keypad_stack := _panel_stack(keypad_panel)
	_label(keypad_stack, "SECURITY CIPHER / LEVEL 03", 17, Color(0.4, 1.0, 0.85))
	_label(keypad_stack, "Введите последовательность ↑  ←  ↓  →", 12, Color(0.82, 0.92, 0.9))
	keypad_progress_label = _label(keypad_stack, "КОД 0 / 4", 11, Color(1.0, 0.77, 0.39))
	var code_row := HBoxContainer.new()
	code_row.alignment = BoxContainer.ALIGNMENT_CENTER
	code_row.add_theme_constant_override("separation", 10)
	keypad_stack.add_child(code_row)
	_add_button(code_row, "↑", _submit_cipher_key.bind(KEY_UP), Vector2(70.0, 48.0))
	_add_button(code_row, "←", _submit_cipher_key.bind(KEY_LEFT), Vector2(70.0, 48.0))
	_add_button(code_row, "↓", _submit_cipher_key.bind(KEY_DOWN), Vector2(70.0, 48.0))
	_add_button(code_row, "→", _submit_cipher_key.bind(KEY_RIGHT), Vector2(70.0, 48.0))
	_add_button(keypad_stack, "ОТКЛЮЧИТЬСЯ", _close_keypad, Vector2(168.0, 38.0))

	loadout_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-256.0, -186.0, 512.0, 372.0))
	loadout_panel.visible = false
	var loadout_stack := _panel_stack(loadout_panel)
	_label(loadout_stack, "LOADOUT TERMINAL", 20, Color(0.4, 1.0, 0.85))
	_label(loadout_stack, "ПОСТОЯННЫЕ МОДУЛИ · ЛОКАЛЬНОЕ СОХРАНЕНИЕ", 10, Color(0.55, 0.72, 0.72))
	_add_button(loadout_stack, "[1] БРОНЯ · +20 HP", _buy_upgrade.bind("armor"), Vector2(300.0, 42.0))
	_add_button(loadout_stack, "[2] PULSE · БЫСТРЕЕ ПЕРЕЗАРЯДКА", _buy_upgrade.bind("pulse"), Vector2(300.0, 42.0))
	_add_button(loadout_stack, "[3] ARC-9 · СКОРОСТРЕЛЬНОСТЬ", _buy_upgrade.bind("weapon"), Vector2(300.0, 42.0))
	_add_button(loadout_stack, "КОНТРАКТ / C", _cycle_contract, Vector2(200.0, 36.0))
	_add_button(loadout_stack, "ЗАКРЫТЬ / U", _close_loadout, Vector2(160.0, 36.0))

	pause_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-220.0, -138.0, 440.0, 276.0))
	pause_panel.visible = false
	var pause_stack := _panel_stack(pause_panel)
	_label(pause_stack, "RAID SUSPENDED", 22, Color(0.4, 1.0, 0.85))
	_label(pause_stack, "СИГНАЛ ОПЕРАТОРА СОХРАНЁН", 11, Color(0.62, 0.78, 0.76))
	_add_button(pause_stack, "ПРОДОЛЖИТЬ", _resume_game, Vector2(210.0, 44.0))
	_add_button(pause_stack, "ПЕРЕЗАПУСТИТЬ РЕЙД", _restart_game, Vector2(210.0, 44.0))
	_add_button(pause_stack, "ЗАКРЫТЬ МОДУЛИ", _close_loadout, Vector2(210.0, 36.0))

	result_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-272.0, -172.0, 544.0, 344.0))
	result_panel.visible = false
	var result_stack := _panel_stack(result_panel)
	_label(result_stack, "ЭВАКУАЦИЯ УСПЕШНА", 25, Color(0.4, 1.0, 0.85))
	_label(result_stack, "РЕЙД ЗАВЕРШЁН · КАРЬЕРА ОБНОВЛЕНА", 12, Color(0.82, 0.92, 0.9))
	_add_button(result_stack, "НОВЫЙ РЕЙД", _restart_game, Vector2(220.0, 46.0))
	_add_button(result_stack, "МОДУЛИ КАРЬЕРЫ", _show_loadout_from_result, Vector2(220.0, 42.0))

	tactical_radar_panel = _make_panel(hud_root, Control.PRESET_TOP_RIGHT, Rect2(-264.0, 210.0, 246.0, 194.0))
	var radar_stack: VBoxContainer = _panel_stack(tactical_radar_panel)
	_label(radar_stack, "TACTICAL RADAR  /  LIVE", 9, Color(0.38, 1.0, 0.86))
	tactical_radar_map = Control.new()
	tactical_radar_map.name = "TacticalRadarMap"
	tactical_radar_map.custom_minimum_size = Vector2(220.0, 142.0)
	tactical_radar_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tactical_radar_map.set_script(load("res://scripts/tactical_radar.gd"))
	tactical_radar_map.call("configure", self)
	radar_stack.add_child(tactical_radar_map)

	_create_mobile_controls(hud_root)
	impact_overlay = ColorRect.new()
	impact_overlay.name = "CinematicImpactOverlay"
	impact_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	impact_overlay.color = Color(0.9, 0.025, 0.065, 0.0)
	impact_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	impact_overlay.visible = false
	hud_root.add_child(impact_overlay)
	_create_damage_direction_ui()
	_create_crosshair()
	_create_target_lock_ui()
	_create_briefing_panel()

func _create_briefing_panel() -> void:
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	var panel_width: float = minf(620.0, viewport_size.x - 24.0)
	var panel_height: float = minf(466.0, viewport_size.y - 24.0)
	briefing_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-panel_width * 0.5, -panel_height * 0.5, panel_width, panel_height))
	briefing_panel.name = "FirstRunFieldBriefing"
	briefing_panel.z_index = 40
	briefing_panel.visible = false
	briefing_scroll = ScrollContainer.new()
	briefing_scroll.name = "BriefingScroll"
	briefing_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	briefing_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	briefing_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	briefing_panel.add_child(briefing_scroll)
	var stack := VBoxContainer.new()
	stack.name = "BriefingContent"
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", 9)
	briefing_scroll.add_child(stack)

	_label(stack, "OSGARD FIELD INTELLIGENCE  /  001", 9, Color(0.40, 1.0, 0.84))
	_label(stack, "NULL//SHIFT", 29, Color(0.74, 1.0, 0.94))
	var subhead := _label(stack, "ОПЕРАЦИЯ: ВЕРНИ ЯДРО. ВЫБЕРИСЬ ЖИВЫМ.", 13, Color(1.0, 0.75, 0.40))
	subhead.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var intro := _label(stack, "Ты в закрытом комплексе. Охрана реагирует на взлом — сначала изучи путь, затем действуй.", 11, Color(0.76, 0.88, 0.87))
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_add_briefing_step(stack, "01", "ВЗЛОМАТЬ ТЕРМИНАЛ", "Подойди к панели и нажми E. Введи шифр: ↑ ← ↓ →.", Color(0.36, 1.0, 0.83))
	_add_briefing_step(stack, "02", "ЗАБРАТЬ ЯДРО", "Используй укрытия и стреляй по угрозам. Янтарная полоса заряжается перед красной опасной фазой: уходи с линии или активируй NULL Shift. Затем забери золотое ядро.", Color(1.0, 0.74, 0.36))
	_add_briefing_step(stack, "03", "ЭВАКУИРОВАТЬСЯ", "Доберись до бирюзовой площадки и нажми E, чтобы завершить рейд.", Color(0.56, 0.57, 1.0))
	var controls := _label(stack, "КОМПЬЮТЕР   WASD / стрелки · мышь + ЛКМ · Q импульс · SHIFT сдвиг", 10, Color(0.48, 0.74, 0.73))
	controls.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var mobile_note := _label(stack, "ТЕЛЕФОН   Левый блок — движение · правый — огонь и способности", 10, Color(0.48, 0.74, 0.73))
	mobile_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var start_width: float = maxf(220.0, minf(360.0, panel_width - 32.0))
	var start_button := _add_button(stack, "НАЧАТЬ РЕЙД  /  ENTER", _dismiss_briefing, Vector2(start_width, 46.0))
	start_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER

func _add_briefing_step(parent: VBoxContainer, number: String, title_text: String, detail_text: String, accent: Color) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(row)
	var index_label := _label(row, number, 13, accent)
	index_label.custom_minimum_size = Vector2(27.0, 24.0)
	var text_column := VBoxContainer.new()
	text_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_column.add_theme_constant_override("separation", 2)
	row.add_child(text_column)
	_label(text_column, title_text, 11, accent)
	var detail := _label(text_column, detail_text, 10, Color(0.79, 0.89, 0.87))
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL


func _create_cinematic_vignette() -> void:
	cinematic_vignette = ColorRect.new()
	cinematic_vignette.name = "CinematicVignette"
	cinematic_vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cinematic_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cinematic_vignette.color = Color.WHITE
	var shader := Shader.new()
	shader.code = """
shader_type canvas_item;
uniform float vignette_strength : hint_range(0.0, 0.45) = 0.28;
uniform float danger : hint_range(0.0, 1.0) = 0.0;
uniform float phase_shift : hint_range(0.0, 1.0) = 0.0;
void fragment() {
	vec2 centered = (UV - vec2(0.5)) * vec2(1.0, 0.86);
	float distance_from_center = length(centered);
	float edge = smoothstep(0.24, 0.72, distance_from_center);
	float pulse = 0.72 + 0.28 * sin(TIME * 2.4);
	float danger_edge = danger * 0.14 * pulse;
	float alpha = edge * (vignette_strength + danger_edge + phase_shift * 0.055);
	vec3 base = vec3(0.003, 0.009, 0.012);
	vec3 phase_tint = vec3(0.025, 0.004, 0.05);
	vec3 low_health_tint = vec3(0.035, 0.004, 0.009);
	base = mix(base, phase_tint, phase_shift * 0.42);
	base = mix(base, low_health_tint, danger * 0.34);
	COLOR = vec4(base, clamp(alpha, 0.0, 0.44));
}
"""
	cinematic_vignette_material = ShaderMaterial.new()
	cinematic_vignette_material.shader = shader
	cinematic_vignette.material = cinematic_vignette_material
	cinematic_vignette.z_index = -1
	hud_root.add_child(cinematic_vignette)

func _update_cinematic_vignette() -> void:
	if not is_instance_valid(cinematic_vignette_material):
		return
	var health_ratio: float = clampf(player_health / maxf(1.0, player_max_health), 0.0, 1.0)
	var danger: float = clampf((0.78 - health_ratio) / 0.58, 0.0, 1.0)
	var phase_weight: float = 1.0 if null_shift_timer > 0.0 else 0.0
	var base_strength: float = 0.31 if cinematic_quality and not adaptive_quality_degraded else (0.22 if cinematic_quality else 0.14)
	cinematic_vignette_material.set_shader_parameter("vignette_strength", base_strength)
	cinematic_vignette_material.set_shader_parameter("danger", danger)
	cinematic_vignette_material.set_shader_parameter("phase_shift", phase_weight)
	cinematic_vignette.visible = true

func _create_damage_direction_ui() -> void:
	damage_direction_root = Control.new()
	damage_direction_root.name = "DamageDirectionIndicator"
	damage_direction_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	damage_direction_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	damage_direction_root.z_index = 26
	damage_direction_root.visible = false
	hud_root.add_child(damage_direction_root)
	damage_direction_arrow = Label.new()
	damage_direction_arrow.name = "IncomingHitArrow"
	damage_direction_arrow.text = "▲"
	damage_direction_arrow.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	damage_direction_arrow.size = Vector2(44.0, 44.0)
	damage_direction_arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	damage_direction_arrow.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	damage_direction_arrow.add_theme_font_size_override("font_size", 30)
	damage_direction_arrow.add_theme_color_override("font_color", Color(1.0, 0.24, 0.31, 0.0))
	damage_direction_arrow.add_theme_color_override("font_outline_color", Color(0.025, 0.008, 0.012, 0.96))
	damage_direction_arrow.add_theme_constant_override("outline_size", 5)
	damage_direction_arrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	damage_direction_root.add_child(damage_direction_arrow)

func _show_damage_direction(source: Node3D) -> void:
	if not is_instance_valid(source):
		return
	damage_direction_source = source
	damage_direction_timer = damage_direction_duration
	_update_damage_direction_ui()

func _update_damage_direction_ui() -> void:
	if not is_instance_valid(damage_direction_root) or not is_instance_valid(damage_direction_arrow):
		return
	var overlays_blocked := paused_game or mission_finished or briefing_visible or terminal_active
	if damage_direction_timer <= 0.0 or overlays_blocked or not is_instance_valid(player) or not is_instance_valid(camera):
		damage_direction_root.visible = false
		return
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	var center: Vector2 = viewport_size * 0.5
	var direction := damage_direction_fallback
	if is_instance_valid(damage_direction_source):
		var source_anchor: Vector3 = damage_direction_source.global_position + Vector3.UP * 0.82
		var projected: Vector2 = camera.unproject_position(source_anchor) - center
		if camera.is_position_behind(source_anchor):
			projected = -projected
		if projected.length_squared() > 0.001:
			direction = projected.normalized()
	damage_direction_fallback = direction
	var radius: float = minf(viewport_size.x, viewport_size.y) * 0.34
	damage_direction_arrow.position = center + direction * radius - damage_direction_arrow.size * 0.5
	damage_direction_arrow.rotation = direction.angle() + PI * 0.5
	var strength: float = clampf(damage_direction_timer / maxf(0.001, damage_direction_duration), 0.0, 1.0)
	var danger_color := Color(1.0, 0.2, 0.28, 0.96 * strength)
	if player_health / maxf(1.0, player_max_health) > 0.35:
		danger_color = Color(1.0, 0.49, 0.27, 0.93 * strength)
	damage_direction_arrow.add_theme_color_override("font_color", danger_color)
	damage_direction_root.visible = true

func _create_crosshair() -> void:
	crosshair_root = Control.new()
	crosshair_root.name = "TacticalCrosshair"
	crosshair_root.custom_minimum_size = Vector2(28.0, 28.0)
	crosshair_root.size = Vector2(28.0, 28.0)
	crosshair_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crosshair_root.z_index = 24
	hud_root.add_child(crosshair_root)
	for index in range(5):
		var part := ColorRect.new()
		part.mouse_filter = Control.MOUSE_FILTER_IGNORE
		part.color = Color(0.48, 1.0, 0.88, 0.94) if index < 4 else Color(0.94, 1.0, 0.95, 1.0)
		crosshair_root.add_child(part)
		crosshair_parts.append(part)
	_update_crosshair()

func _update_crosshair() -> void:
	if not is_instance_valid(crosshair_root) or crosshair_parts.size() < 5:
		return
	var allowed := not touch_assisted_aim and not paused_game and not terminal_active and not mission_finished and not briefing_visible
	allowed = allowed and not (is_instance_valid(loadout_panel) and loadout_panel.visible)
	allowed = allowed and not (is_instance_valid(keypad_panel) and keypad_panel.visible)
	crosshair_root.visible = allowed
	if not allowed:
		return
	crosshair_root.position = get_viewport().get_mouse_position() - Vector2(14.0, 14.0)
	var spread := 5.0 + crosshair_kick * 7.0
	crosshair_parts[0].position = Vector2(13.0, 13.0 - spread - 5.0)
	crosshair_parts[0].size = Vector2(2.0, 5.0)
	crosshair_parts[1].position = Vector2(13.0, 15.0 + spread)
	crosshair_parts[1].size = Vector2(2.0, 5.0)
	crosshair_parts[2].position = Vector2(13.0 - spread - 5.0, 13.0)
	crosshair_parts[2].size = Vector2(5.0, 2.0)
	crosshair_parts[3].position = Vector2(15.0 + spread, 13.0)
	crosshair_parts[3].size = Vector2(5.0, 2.0)
	crosshair_parts[4].position = Vector2(13.0, 13.0)
	crosshair_parts[4].size = Vector2(2.0, 2.0)
	var reticle_color := Color(1.0, 0.71, 0.29, 1.0) if crosshair_hit_timer > 0.0 else Color(0.48, 1.0, 0.88, 0.94)
	for index in range(4):
		crosshair_parts[index].color = reticle_color

func _create_target_lock_ui() -> void:
	# Keep HUD construction idempotent: repeated layout/setup calls must not stack reticle corners.
	if is_instance_valid(target_lock_root):
		return
	target_lock_brackets.clear()
	target_lock_root = Control.new()
	target_lock_root.name = "TargetLockOverlay"
	target_lock_root.size = Vector2(112.0, 88.0)
	target_lock_root.custom_minimum_size = target_lock_root.size
	target_lock_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	target_lock_root.z_index = 22
	target_lock_root.visible = false
	hud_root.add_child(target_lock_root)

	target_lock_label = Label.new()
	target_lock_label.name = "TargetIdentity"
	target_lock_label.position = Vector2.ZERO
	target_lock_label.size = Vector2(112.0, 15.0)
	target_lock_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	target_lock_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	target_lock_label.add_theme_font_size_override("font_size", 9)
	target_lock_label.add_theme_color_override("font_color", Color(0.61, 1.0, 0.91))
	target_lock_label.add_theme_color_override("font_outline_color", Color(0.006, 0.018, 0.022, 0.98))
	target_lock_label.add_theme_constant_override("outline_size", 3)
	target_lock_root.add_child(target_lock_label)

	var bracket_rects := [
		Rect2(Vector2(26.0, 18.0), Vector2(14.0, 2.0)),
		Rect2(Vector2(26.0, 18.0), Vector2(2.0, 14.0)),
		Rect2(Vector2(72.0, 18.0), Vector2(14.0, 2.0)),
		Rect2(Vector2(84.0, 18.0), Vector2(2.0, 14.0)),
		Rect2(Vector2(26.0, 64.0), Vector2(14.0, 2.0)),
		Rect2(Vector2(26.0, 52.0), Vector2(2.0, 14.0)),
		Rect2(Vector2(72.0, 64.0), Vector2(14.0, 2.0)),
		Rect2(Vector2(84.0, 52.0), Vector2(2.0, 14.0))
	]
	for rect in bracket_rects:
		var corner := ColorRect.new()
		corner.mouse_filter = Control.MOUSE_FILTER_IGNORE
		corner.position = rect.position
		corner.size = rect.size
		corner.color = Color(0.38, 1.0, 0.86, 0.96)
		target_lock_root.add_child(corner)
		target_lock_brackets.append(corner)

	target_lock_health_bar = ProgressBar.new()
	target_lock_health_bar.name = "TargetHealth"
	target_lock_health_bar.position = Vector2(28.0, 79.0)
	target_lock_health_bar.size = Vector2(56.0, 4.0)
	target_lock_health_bar.custom_minimum_size = Vector2(56.0, 4.0)
	target_lock_health_bar.min_value = 0.0
	target_lock_health_bar.max_value = 1.0
	target_lock_health_bar.value = 1.0
	target_lock_health_bar.show_percentage = false
	var health_background := StyleBoxFlat.new()
	health_background.bg_color = Color(0.025, 0.045, 0.052, 0.96)
	health_background.set_corner_radius_all(2)
	target_lock_health_bar.add_theme_stylebox_override("background", health_background)
	target_lock_health_fill = StyleBoxFlat.new()
	target_lock_health_fill.bg_color = Color(0.38, 1.0, 0.86, 1.0)
	target_lock_health_fill.set_corner_radius_all(2)
	target_lock_health_bar.add_theme_stylebox_override("fill", target_lock_health_fill)
	target_lock_root.add_child(target_lock_health_bar)

func _update_target_lock_ui(delta: float) -> void:
	if not is_instance_valid(target_lock_root) or not is_instance_valid(camera):
		return
	var selected: Dictionary = {}
	if is_instance_valid(aim_target_node):
		for guard in guards:
			if guard.get("node") == aim_target_node:
				selected = guard
				break
	if selected.is_empty() or paused_game or terminal_active or mission_finished or briefing_visible:
		target_lock_root.visible = false
		target_lock_has_position = false
		target_lock_tracked_node = null
		return
	var role: String = str(selected.get("role", "RANGER"))
	var target_node: Node3D = aim_target_node
	var target_height: float = 2.9 if bool(selected.get("warden", false)) else 2.25
	var world_anchor: Vector3 = target_node.global_position + Vector3.UP * target_height
	if camera.is_position_behind(world_anchor):
		target_lock_root.visible = false
		target_lock_has_position = false
		return
	var screen_position: Vector2 = camera.unproject_position(world_anchor)
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	if screen_position.x < 58.0 or screen_position.x > viewport_size.x - 58.0 or screen_position.y < 48.0 or screen_position.y > viewport_size.y - 42.0:
		target_lock_root.visible = false
		target_lock_has_position = false
		return
	var desired_position: Vector2 = screen_position - Vector2(56.0, 47.0)
	if not target_lock_has_position or target_lock_tracked_node != target_node:
		target_lock_position = desired_position
		target_lock_has_position = true
		target_lock_tracked_node = target_node
	else:
		var follow: float = 1.0 - exp(-maxf(0.0, delta) * 19.0)
		target_lock_position = target_lock_position.lerp(desired_position, clampf(follow, 0.0, 1.0))
	target_lock_root.position = target_lock_position
	target_lock_root.visible = true

	var health: int = maxi(0, int(selected.get("hp", 0)))
	var max_health: int = maxi(1, int(selected.get("max_hp", 1)))
	target_lock_label.text = "ЦЕЛЬ / %s  ·  %d/%d" % [role, health, max_health]
	target_lock_health_bar.max_value = float(max_health)
	target_lock_health_bar.value = float(health)
	var role_color := Color(1.0, 0.32, 0.4)
	match role:
		"STALKER":
			role_color = Color(0.76, 0.5, 1.0)
		"HEAVY", "WARDEN":
			role_color = Color(1.0, 0.7, 0.32)
		"RANGER":
			role_color = Color(1.0, 0.34, 0.42)
	if health <= maxi(1, int(ceil(float(max_health) * 0.3))):
		role_color = Color(1.0, 0.2, 0.31)
	var pulse: float = 0.86 + 0.14 * (0.5 + 0.5 * sin(scene_clock * 5.2))
	var bracket_color := Color(role_color.r, role_color.g, role_color.b, pulse)
	for corner in target_lock_brackets:
		corner.color = bracket_color
	target_lock_label.add_theme_color_override("font_color", bracket_color)
	target_lock_health_fill.bg_color = role_color

func _update_screen_overlay() -> void:
	if not is_instance_valid(impact_overlay):
		return
	var tint := Color(0.95, 0.025, 0.07, 1.0)
	var alpha := 0.0
	if impact_flash_timer > 0.0:
		alpha = minf(0.22, impact_flash_timer * 0.72)
	elif phase_flash_timer > 0.0:
		tint = Color(0.54, 0.09, 0.76, 1.0)
		alpha = minf(0.09, phase_flash_timer * 0.3)
	impact_overlay.color = Color(tint.r, tint.g, tint.b, alpha)
	impact_overlay.visible = alpha > 0.004

func _screen_impulse(strength: float, duration: float) -> void:
	camera_shake_strength = maxf(camera_shake_strength, strength)
	camera_shake_timer = maxf(camera_shake_timer, duration)
	camera_shake_duration = maxf(camera_shake_duration, duration)

func _make_panel(parent: Control, preset: int, rect: Rect2) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(preset)
	panel.offset_left = rect.position.x
	panel.offset_top = rect.position.y
	panel.offset_right = rect.position.x + rect.size.x
	panel.offset_bottom = rect.position.y + rect.size.y
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.012, 0.035, 0.043, 0.92)
	style.border_color = Color(0.12, 0.46, 0.45, 0.8)
	style.set_border_width_all(1)
	style.set_corner_radius_all(11)
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.34)
	style.shadow_size = 12
	style.shadow_offset = Vector2(0.0, 5.0)
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	style.content_margin_top = 10.0
	style.content_margin_bottom = 10.0
	panel.add_theme_stylebox_override("panel", style)
	parent.add_child(panel)
	return panel

func _panel_stack(panel: PanelContainer) -> VBoxContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 0)
	margin.add_theme_constant_override("margin_right", 0)
	margin.add_theme_constant_override("margin_top", 0)
	margin.add_theme_constant_override("margin_bottom", 0)
	panel.add_child(margin)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 7)
	margin.add_child(stack)
	return stack

func _label(parent: Node, value: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(label)
	return label

func _add_button(parent: Node, value: String, callback: Callable, minimum_size: Vector2) -> Button:
	var button := Button.new()
	button.text = value
	button.custom_minimum_size = minimum_size
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_font_size_override("font_size", 11)
	button.add_theme_color_override("font_color", Color(0.86, 0.98, 0.95))
	button.add_theme_color_override("font_hover_color", Color(0.3, 1.0, 0.84))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.028, 0.085, 0.09, 0.96)
	normal.border_color = Color(0.14, 0.48, 0.46, 0.8)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(0.045, 0.15, 0.15, 1.0)
	hover.border_color = Color(0.28, 0.95, 0.78, 1.0)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.add_theme_stylebox_override("focus", hover)
	button.pressed.connect(callback)
	parent.add_child(button)
	return button

func _create_mobile_controls(parent: Control) -> void:
	mobile_move_panel = _make_panel(parent, Control.PRESET_BOTTOM_LEFT, Rect2(16.0, -218.0, 218.0, 202.0))
	var move_stack := _panel_stack(mobile_move_panel)
	_label(move_stack, "MOVE / ТАКТИЧЕСКИЙ ШАГ", 9, Color(0.38, 0.9, 0.82))
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 4)
	move_stack.add_child(grid)
	var move_keys := ["", "up", "", "left", "", "right", "", "down", ""]
	for action in move_keys:
		if action.is_empty():
			var spacer := Control.new()
			spacer.custom_minimum_size = Vector2(52.0, 38.0)
			grid.add_child(spacer)
			mobile_move_spacers.append(spacer)
		else:
			var arrow := "↑" if action == "up" else ("↓" if action == "down" else ("←" if action == "left" else "→"))
			var button := _add_button(grid, arrow, func(): pass, Vector2(52.0, 38.0))
			button.button_down.connect(_set_mobile_action.bind(action, true))
			button.button_up.connect(_set_mobile_action.bind(action, false))
			mobile_move_buttons.append(button)
	mobile_action_panel = _make_panel(parent, Control.PRESET_BOTTOM_RIGHT, Rect2(-222.0, -286.0, 206.0, 270.0))
	var action_stack := _panel_stack(mobile_action_panel)
	_label(action_stack, "COMBAT / СИСТЕМЫ", 9, Color(0.38, 0.9, 0.82))
	var action_grid := GridContainer.new()
	action_grid.columns = 2
	action_grid.add_theme_constant_override("h_separation", 4)
	action_grid.add_theme_constant_override("v_separation", 4)
	action_stack.add_child(action_grid)
	var combat_actions := [
		{"key": "fire", "label": "ОГОНЬ"},
		{"key": "use", "label": "ДЕЙСТВИЕ"},
		{"key": "pulse", "label": "ИМПУЛЬС"},
		{"key": "shift", "label": "СДВИГ"},
		{"key": "dash", "label": "РЫВОК"}
	]
	for item in combat_actions:
		var action_button := _add_button(action_grid, item["label"], func(): pass, Vector2(84.0, 38.0))
		action_button.button_down.connect(_set_mobile_action.bind(item["key"], true))
		action_button.button_up.connect(_set_mobile_action.bind(item["key"], false))
		mobile_action_buttons.append(action_button)
		if str(item["key"]) == "dash":
			mobile_dash_button = action_button
			mobile_dash_button.add_theme_font_size_override("font_size", 8)
	var utility_row := HBoxContainer.new()
	utility_row.add_theme_constant_override("separation", 4)
	action_stack.add_child(utility_row)
	mobile_quality_button = _add_button(utility_row, "ГРАФИКА", _toggle_quality, Vector2(86.0, 27.0))
	mobile_quality_button.add_theme_font_size_override("font_size", 8)
	mobile_diagnostics_button = _add_button(utility_row, "FPS", _toggle_diagnostics, Vector2(86.0, 27.0))
	mobile_diagnostics_button.add_theme_font_size_override("font_size", 8)
	mobile_modules_button = _add_button(action_stack, "МОДУЛИ", _toggle_loadout, Vector2(176.0, 28.0))
	sound_button = _add_button(action_stack, "ЗВУК / ВКЛ" if sound_enabled else "ЗВУК / ВЫКЛ", _toggle_sound, Vector2(176.0, 27.0))

func _set_mobile_action(action: String, pressed: bool) -> void:
	match action:
		"up", "down", "left", "right":
			mobile_actions[action] = pressed
		"fire":
			touch_firing = pressed
		_:
			if not pressed:
				return
			match action:
				"use":
					_interact()
				"pulse":
					_deploy_pulse()
				"shift":
					_shift_layer()
				"dash":
					_try_dash()

func _update_mobile_layout() -> void:
	# Godot may dispatch a first layout frame before the platform reports a valid viewport.
	# Do not touch controls until the full HUD tree and viewport have been constructed.
	if not is_instance_valid(status_panel) or not is_instance_valid(objective_panel) or not is_instance_valid(mobile_move_panel) or not is_instance_valid(mobile_action_panel):
		return
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	if viewport_size.x <= 1.0 or viewport_size.y <= 1.0:
		return
	var touch_device: bool = DisplayServer.is_touchscreen_available()
	if viewport_size.is_equal_approx(last_layout_size) and last_layout_touch == touch_device:
		return
	last_layout_size = viewport_size
	last_layout_touch = touch_device
	var width: float = viewport_size.x
	var compact: bool = width < 880.0 or touch_device
	mobile_controls_visible = compact
	if is_instance_valid(tactical_radar_panel):
		tactical_radar_panel.visible = not compact
	touch_assisted_aim = touch_device
	if is_instance_valid(briefing_panel):
		var panel_width: float = maxf(280.0, minf(620.0, viewport_size.x - 24.0))
		var panel_height: float = maxf(260.0, minf(466.0, viewport_size.y - 24.0))
		briefing_panel.offset_left = -panel_width * 0.5
		briefing_panel.offset_right = panel_width * 0.5
		briefing_panel.offset_top = -panel_height * 0.5
		briefing_panel.offset_bottom = panel_height * 0.5
	if is_instance_valid(phase_lane_status_row):
		phase_lane_status_row.visible = not compact
	if compact:
		status_panel.offset_left = 10.0
		status_panel.offset_top = 10.0
		status_panel.offset_right = width - 10.0
		status_panel.offset_bottom = 140.0
		status_title.add_theme_font_size_override("font_size", 18)
		status_subtitle.visible = false
		status_shortcuts.visible = false
		health_label.add_theme_font_size_override("font_size", 11)
		credits_label.add_theme_font_size_override("font_size", 10)
		threat_label.add_theme_font_size_override("font_size", 10)
		objective_panel.anchor_left = 0.0
		objective_panel.anchor_right = 1.0
		objective_panel.anchor_top = 0.0
		objective_panel.anchor_bottom = 0.0
		objective_panel.offset_left = 10.0
		objective_panel.offset_right = -10.0
		objective_panel.offset_top = 148.0
		objective_panel.offset_bottom = 218.0
		objective_title.visible = false
		telemetry_label.visible = false
		objective_actions.visible = false
		objective_label.add_theme_font_size_override("font_size", 11)
		objective_label.custom_minimum_size = Vector2(maxf(240.0, width - 52.0), 34.0)
		mid_panel.visible = false
		bottom_hint.visible = false
		_layout_compact_controls(viewport_size)
	else:
		status_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		status_panel.offset_left = 18.0
		status_panel.offset_top = 18.0
		status_panel.offset_right = 334.0
		status_panel.offset_bottom = 224.0
		status_title.add_theme_font_size_override("font_size", 22)
		status_subtitle.visible = true
		status_shortcuts.visible = true
		health_label.add_theme_font_size_override("font_size", 13)
		credits_label.add_theme_font_size_override("font_size", 12)
		threat_label.add_theme_font_size_override("font_size", 11)
		objective_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
		objective_panel.offset_left = -334.0
		objective_panel.offset_top = 18.0
		objective_panel.offset_right = -18.0
		objective_panel.offset_bottom = 196.0
		objective_title.visible = true
		telemetry_label.visible = true
		objective_actions.visible = true
		objective_label.add_theme_font_size_override("font_size", 12)
		objective_label.custom_minimum_size = Vector2(285.0, 64.0)
		mid_panel.visible = true
		bottom_hint.visible = true
		mobile_move_panel.offset_left = 16.0
		mobile_move_panel.offset_right = 234.0
		mobile_move_panel.offset_top = -218.0
		mobile_move_panel.offset_bottom = -16.0
		mobile_action_panel.offset_left = -222.0
		mobile_action_panel.offset_right = -16.0
		mobile_action_panel.offset_top = -218.0
		mobile_action_panel.offset_bottom = -16.0
		for button in mobile_move_buttons:
			button.custom_minimum_size = Vector2(52.0, 38.0)
		for spacer in mobile_move_spacers:
			spacer.custom_minimum_size = Vector2(52.0, 38.0)
		for button in mobile_action_buttons:
			button.custom_minimum_size = Vector2(84.0, 38.0)
		mobile_modules_button.custom_minimum_size = Vector2(176.0, 31.0)
		sound_button.custom_minimum_size = Vector2(176.0, 29.0)
	mobile_move_panel.visible = compact
	mobile_action_panel.visible = compact

func _layout_compact_controls(viewport_size: Vector2) -> void:
	var width: float = viewport_size.x
	var move_width: float = clampf(width * 0.44, 142.0, 218.0)
	var action_width: float = floor(clampf(width * 0.47, 150.0, 206.0))
	mobile_move_panel.offset_left = 8.0
	mobile_move_panel.offset_right = 8.0 + move_width
	mobile_move_panel.offset_top = -178.0
	mobile_move_panel.offset_bottom = -8.0
	mobile_action_panel.offset_left = -8.0 - action_width
	mobile_action_panel.offset_right = -8.0
	mobile_action_panel.offset_top = -286.0
	mobile_action_panel.offset_bottom = -8.0
	var move_size: float = 36.0 if width < 400.0 else (44.0 if width < 520.0 else 52.0)
	var move_button_height: float = 32.0 if width < 400.0 else 36.0
	for button in mobile_move_buttons:
		button.custom_minimum_size = Vector2(move_size, move_button_height)
	for spacer in mobile_move_spacers:
		spacer.custom_minimum_size = Vector2(move_size, move_button_height)
	var action_button_width: float = floor((action_width - 32.0) * 0.5)
	for button in mobile_action_buttons:
		button.custom_minimum_size = Vector2(action_button_width, 34.0)
	var utility_button_width: float = floor((action_width - 28.0) * 0.5)
	mobile_quality_button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	mobile_diagnostics_button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	mobile_modules_button.custom_minimum_size = Vector2(action_width - 24.0, 28.0)
	sound_button.custom_minimum_size = Vector2(action_width - 24.0, 27.0)

func _refresh_loadout() -> void:
	if not is_instance_valid(loadout_panel):
		return
	for child in loadout_panel.get_children():
		if child is MarginContainer:
			for inner in child.get_children():
				if inner is VBoxContainer and inner.get_child_count() >= 2:
					var stack := inner as VBoxContainer
					(stack.get_child(1) as Label).text = "КРЕДИТЫ: %d · БРОНЯ %d/3 · PULSE %d/3 · ARC-9 %d/3" % [career_credits, armor_level, pulse_level, weapon_level]
					return

func _update_objective_compass(delta: float = 0.016) -> void:
	if not is_instance_valid(player) or not is_instance_valid(camera):
		return
	if not is_instance_valid(objective_compass_arrow) or not is_instance_valid(objective_compass_text):
		return
	var destination: Node3D
	var objective_name: String
	var objective_color := Color(0.38, 1.0, 0.86)
	if not terminal_unlocked:
		destination = terminal
		objective_name = "ТЕРМИНАЛ"
	elif not core_secured:
		destination = quantum_core
		objective_name = "КВАНТОВОЕ ЯДРО"
		objective_color = Color(1.0, 0.72, 0.34)
	else:
		destination = extraction
		objective_name = "ЭВАКУАЦИЯ"
		objective_color = Color(0.42, 1.0, 0.78)
	if not is_instance_valid(destination):
		return
	var to_objective: Vector3 = destination.global_position - player.global_position
	to_objective.y = 0.0
	var distance: float = to_objective.length()
	if distance <= 3.2:
		objective_compass_text.text = "%s · НАЖМИ E" % objective_name
	else:
		objective_compass_text.text = "%s · %.1f М" % [objective_name, distance]
	var anchor: Vector3 = destination.global_position + Vector3.UP * 0.55
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	var screen_direction: Vector2 = camera.unproject_position(anchor) - viewport_size * 0.5
	if camera.is_position_behind(anchor):
		screen_direction = -screen_direction
	if screen_direction.length_squared() < 0.001:
		screen_direction = Vector2.UP
	var desired_rotation: float = atan2(screen_direction.y, screen_direction.x) + PI * 0.5
	var follow: float = 1.0 - exp(-maxf(0.0, delta) * 16.0)
	objective_compass_arrow.rotation = lerp_angle(objective_compass_arrow.rotation, desired_rotation, clampf(follow, 0.0, 1.0))
	objective_compass_arrow.add_theme_color_override("font_color", objective_color)
	objective_compass_text.add_theme_color_override("font_color", objective_color)

func _update_hud() -> void:
	if not is_instance_valid(objective_label):
		return
	health_label.text = "ВИТАЛЬНОСТЬ  %d / %d" % [int(ceil(player_health)), int(player_max_health)]
	if is_instance_valid(health_bar):
		health_bar.max_value = maxf(1.0, player_max_health)
		health_bar.value = clampf(player_health, 0.0, player_max_health)
		var health_ratio: float = health_bar.value / health_bar.max_value
		health_bar_fill.bg_color = Color(0.38, 0.96, 0.76) if health_ratio > 0.55 else (Color(1.0, 0.68, 0.25) if health_ratio > 0.25 else Color(1.0, 0.22, 0.31))
	credits_label.text = "РЕЙД  %03d  ·  КАРЬЕРА  %05d" % [run_credits, career_credits]
	threat_label.text = "УГРОЗА: %s" % ("КРИТИЧЕСКАЯ" if alarm_active else ("ВЫСОКАЯ" if not guards.is_empty() else "НИЗКАЯ"))
	threat_label.add_theme_color_override("font_color", Color(1.0, 0.25, 0.34) if alarm_active else Color(0.95, 0.72, 0.39) if not guards.is_empty() else Color(0.35, 1.0, 0.81))
	objective_label.text = objective_text
	if is_instance_valid(dash_status_label):
		if dash_timer > 0.0:
			dash_status_label.text = "РЫВОК АКТИВЕН · %.1f С" % dash_timer
			dash_status_label.add_theme_color_override("font_color", Color(0.38, 1.0, 0.86))
		elif dash_cooldown > 0.02:
			dash_status_label.text = "РЫВОК · ПЕРЕЗАРЯДКА %.1f С" % dash_cooldown
			dash_status_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.34))
		else:
			dash_status_label.text = "РЫВОК ГОТОВ · SPACE"
			dash_status_label.add_theme_color_override("font_color", Color(0.38, 1.0, 0.82))
	if is_instance_valid(mobile_dash_button):
		mobile_dash_button.text = "РЫВОК" if dash_cooldown <= 0.02 else "РЫВОК %.1f" % dash_cooldown
		mobile_dash_button.disabled = dash_cooldown > 0.02 or paused_game or mission_finished or terminal_active or briefing_visible
	telemetry_label.text = "HOSTILES %02d  ·  DEVICES %02d  ·  CONTRACT %02d" % [guards.size(), _living_device_count(), current_contract + 1]
	if diagnostics_enabled:
		var samples := frame_samples.duplicate()
		samples.sort()
		var p95 := 0.0
		if not samples.is_empty():
			p95 = samples[clampi(int(ceil(float(samples.size() - 1) * 0.95)), 0, samples.size() - 1)]
		fps_p95_ms = p95
		var draw_calls := int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
		var profile: String = "PERFORMANCE" if performance_quality else ("BALANCED" if not cinematic_quality else ("AUTO-OPTIMIZED" if adaptive_quality_degraded else "CINEMATIC"))
		diagnostics_label.text = "LIVE DIAGNOSTICS\nFPS        %02d\nFRAME P95  %.1f ms\nFRAME NOW  %.1f ms\nDRAW CALLS %d\nFX ACTIVE  %02d\nFX POOLS   %02d BEAM / %02d RING\nFX DROPPED %d\nGUARDS     %d\nDEVICES    %d\nDASH EVADES %d\nDASH CD    %.1f s\nPROFILE    %s" % [
			Engine.get_frames_per_second(), fps_p95_ms, current_frame_ms, draw_calls,
			effects.size(), beam_pool.size(), ring_pool.size(), effect_pool_exhaustions,
			guards.size(), _living_device_count(), dash_evasions, dash_cooldown, profile
		]

func _living_device_count() -> int:
	var count := 0
	for device in devices:
		if not bool(device["destroyed"]):
			count += 1
	return count

func _update_camera(delta: float) -> void:
	if not is_instance_valid(player) or not is_instance_valid(camera):
		return
	var target := player.global_position + Vector3(0.0, 23.5, 24.5)
	var follow_weight: float = 1.0 - exp(-delta * 4.25)
	camera_follow_position = camera_follow_position.lerp(target, clampf(follow_weight, 0.0, 1.0))
	var shake_fade: float = clampf(camera_shake_timer / maxf(0.001, camera_shake_duration), 0.0, 1.0)
	var shake_amount: float = camera_shake_strength * shake_fade
	var shake := Vector3(
		sin(scene_clock * 53.0) * shake_amount,
		sin(scene_clock * 37.0) * shake_amount * 0.42,
		cos(scene_clock * 43.0) * shake_amount * 0.62
	)
	camera.global_position = camera_follow_position + shake
	var aim_lead := Vector3(player_aim.x, 0.0, player_aim.z).normalized() * 0.7
	camera.look_at(player.global_position + Vector3(0.0, 0.55, 0.0) + aim_lead, Vector3.UP)
	var horizontal_speed := Vector2(player.velocity.x, player.velocity.z).length()
	var movement_fov := clampf(horizontal_speed / PLAYER_SPEED, 0.0, 1.0) * 1.35
	var shift_fov := 3.1 if null_shift_timer > 0.0 else 0.0
	var recoil_fov := clampf(weapon_recoil, 0.0, 1.0) * 0.85
	var target_fov: float = CAMERA_BASE_FOV + movement_fov + shift_fov + recoil_fov
	camera.fov = lerpf(camera.fov, target_fov, 1.0 - exp(-maxf(delta, 0.0) * 4.8))

func _update_player_material() -> void:
	# The suit is a child of the articulated visual rig, not the physics root.
	if not is_instance_valid(operator_suit):
		return
	if damage_flash_timer > 0.0:
		operator_suit.material_override = materials["red"]
	elif null_shift_timer > 0.0:
		operator_suit.material_override = materials["violet"]
	elif dash_timer > 0.0:
		operator_suit.material_override = materials["white"]
	else:
		operator_suit.material_override = materials["cyan"]

func _animate_world(delta: float) -> void:
	if is_instance_valid(operator_rig) and is_instance_valid(player):
		var walking: float = player.velocity.length()
		var walk_weight: float = clampf(walking / PLAYER_SPEED, 0.0, 1.0)
		var bob_speed: float = 10.0 if walking > 0.35 else 1.8
		var bob_amount: float = 0.042 if walking > 0.35 else 0.012
		var smoothing: float = 1.0 - exp(-delta * 14.0)
		operator_rig.position.y = sin(scene_clock * bob_speed) * bob_amount
		if Vector2(player_aim.x, player_aim.z).length_squared() > 0.0001:
			var target_yaw: float = atan2(-player_aim.x, -player_aim.z)
			operator_rig.rotation.y = lerp_angle(operator_rig.rotation.y, target_yaw, smoothing)
		weapon_recoil = move_toward(weapon_recoil, 0.0, delta * 10.5)
		operator_rig.rotation.x = lerpf(operator_rig.rotation.x, -weapon_recoil * 0.035, smoothing)
		var dash_lean: float = -dash_direction.x * 0.12 if dash_timer > 0.0 else 0.0
		var target_lean: float = clampf(-player.velocity.x / PLAYER_SPEED * 0.045 + dash_lean, -0.16, 0.16)
		operator_rig.rotation.z = lerpf(operator_rig.rotation.z, target_lean, smoothing)
		for leg_index in range(operator_leg_pivots.size()):
			var leg: Node3D = operator_leg_pivots[leg_index]
			var phase_offset: float = 0.0 if leg_index == 0 else PI
			var target_swing: float = sin(scene_clock * 10.5 + phase_offset) * 0.46 * walk_weight
			leg.rotation.x = lerpf(leg.rotation.x, target_swing, 1.0 - exp(-delta * 15.0))
	muzzle_flash_timer = maxf(0.0, muzzle_flash_timer - delta)
	if is_instance_valid(muzzle_flash):
		muzzle_flash.visible = muzzle_flash_timer > 0.0
	if is_instance_valid(muzzle_light):
		muzzle_light.visible = muzzle_flash_timer > 0.0 and cinematic_quality and not adaptive_quality_degraded
	if is_instance_valid(core_ring) and quantum_core.visible:
		core_ring.rotate_y(delta * 1.2)
		core_ring.rotate_x(sin(scene_clock * 0.8) * delta * 0.25)
	if is_instance_valid(extraction_ring):
		extraction_ring.rotate_y(-delta * 0.32)
	if is_instance_valid(terminal_light):
		terminal_light.light_energy = 1.45 + sin(scene_clock * 3.0) * 0.25
	if is_instance_valid(core_light) and quantum_core.visible:
		core_light.light_energy = 2.0 + sin(scene_clock * 4.0) * 0.38
	if is_instance_valid(gate_status_light):
		if terminal_unlocked:
			gate_status_light.light_color = Color(0.08, 1.0, 0.74)
			gate_status_light.light_energy = 0.28 + (1.15 if is_instance_valid(security_gate) and security_gate.visible else 0.0) + absf(sin(scene_clock * 5.2)) * 0.12
		else:
			gate_status_light.light_color = Color(1.0, 0.12, 0.2)
			gate_status_light.light_energy = 0.72 + absf(sin(scene_clock * 3.7)) * 0.28
	for guard in guards:
		var body: Node3D = guard["node"]
		if not is_instance_valid(body):
			continue
		var armor := body.get_node_or_null("Armor") as MeshInstance3D
		var hit_timer: float = float(guard.get("hit_flash_timer", 0.0))
		if armor:
			var role: String = str(guard.get("role", "RANGER"))
			var role_material: Material = materials["white"] if hit_timer > 0.0 else (materials["cyan"] if float(guard["stun"]) > 0.0 else (materials["red"] if role in ["WARDEN", "RANGER"] else (materials["violet"] if role == "STALKER" else materials["amber"])))
			armor.material_override = role_material
			var body_speed: float = body.velocity.length()
			armor.position.y = sin(scene_clock * (9.0 if body_speed > 0.2 else 1.6) + float(guard["phase"])) * (0.035 if body_speed > 0.2 else 0.012) + (0.045 if hit_timer > 0.0 else 0.0)
			armor.scale = Vector3.ONE * (1.07 if hit_timer > 0.0 else 1.0)
		var hit_feedback: Label3D = guard.get("hit_label") as Label3D
		if is_instance_valid(hit_feedback):
			var remaining: float = float(guard.get("hit_label_timer", 0.0))
			hit_feedback.visible = remaining > 0.0
			if remaining > 0.0:
				var progress: float = clampf(1.0 - remaining / 0.52, 0.0, 1.0)
				hit_feedback.position.y = (3.02 if bool(guard.get("warden", false)) else 2.58) + progress * 0.62
				hit_feedback.modulate = Color(1.0, 0.94, 0.7, 1.0 - progress)
				hit_feedback.scale = Vector3.ONE * (0.86 + sin(progress * PI) * 0.22)

func _update_effect_expiry(delta: float) -> void:
	var dt: float = maxf(0.0, delta)
	for index in range(beam_effects.size() - 1, -1, -1):
		var state: Dictionary = beam_effects[index]
		var instance: MeshInstance3D = state["node"]
		var remaining: float = maxf(0.0, float(state["remaining"]) - dt)
		if remaining <= 0.0 or not is_instance_valid(instance):
			if is_instance_valid(instance):
				instance.visible = false
			effects.erase(instance)
			beam_effects.remove_at(index)
		else:
			state["remaining"] = remaining
			beam_effects[index] = state
	for index in range(ring_effects.size() - 1, -1, -1):
		var state: Dictionary = ring_effects[index]
		var ring: MeshInstance3D = state["node"]
		var duration: float = maxf(0.001, float(state["duration"]))
		var remaining: float = maxf(0.0, float(state["remaining"]) - dt)
		if remaining <= 0.0 or not is_instance_valid(ring):
			if is_instance_valid(ring):
				ring.visible = false
				ring.scale = Vector3.ONE
				ring.transparency = 0.0
			effects.erase(ring)
			ring_effects.remove_at(index)
		else:
			var progress: float = clampf(1.0 - remaining / duration, 0.0, 1.0)
			var eased: float = 1.0 - pow(1.0 - progress, 2.2)
			ring.scale = Vector3.ONE.lerp(Vector3.ONE * 14.0, eased)
			ring.transparency = clampf(progress * 0.88, 0.0, 0.9)
			state["remaining"] = remaining
			ring_effects[index] = state
	for index in range(effects.size() - 1, -1, -1):
		if not is_instance_valid(effects[index]):
			effects.remove_at(index)
func _spawn_beam(from: Vector3, to: Vector3, material: Material, lifetime: float) -> void:
	var instance: MeshInstance3D
	for pooled: MeshInstance3D in beam_pool:
		if is_instance_valid(pooled) and not pooled.visible:
			instance = pooled
			break
	if not is_instance_valid(instance):
		if beam_pool.size() >= MAX_BEAM_POOL:
			effect_pool_exhaustions += 1
			return
		instance = MeshInstance3D.new()
		instance.name = "TransientBeamPool_%02d" % [beam_pool.size() + 1]
		instance.mesh = ImmediateMesh.new()
		instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		instance.visible = false
		add_child(instance)
		beam_pool.append(instance)
	var line_mesh := instance.mesh as ImmediateMesh
	if not is_instance_valid(line_mesh):
		effect_pool_exhaustions += 1
		return
	line_mesh.clear_surfaces()
	line_mesh.surface_begin(Mesh.PRIMITIVE_LINES, material)
	line_mesh.surface_add_vertex(from)
	line_mesh.surface_add_vertex(to)
	line_mesh.surface_end()
	instance.visible = true
	var duration: float = maxf(0.025, lifetime)
	beam_effects.append({"node": instance, "remaining": duration, "duration": duration})
	effects.append(instance)
func _spawn_ring_burst(at: Vector3, material: Material) -> void:
	var ring: MeshInstance3D
	for pooled: MeshInstance3D in ring_pool:
		if is_instance_valid(pooled) and not pooled.visible:
			ring = pooled
			break
	if not is_instance_valid(ring):
		if ring_pool.size() >= MAX_RING_POOL:
			effect_pool_exhaustions += 1
			return
		ring = MeshInstance3D.new()
		ring.name = "PhaseRingPool_%02d" % [ring_pool.size() + 1]
		var mesh := TorusMesh.new()
		mesh.inner_radius = 0.18
		mesh.outer_radius = 0.24
		mesh.rings = 24
		mesh.ring_segments = 8
		ring.mesh = mesh
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ring.visible = false
		add_child(ring)
		ring_pool.append(ring)
	ring.material_override = material
	ring.position = at
	ring.scale = Vector3.ONE
	ring.transparency = 0.0
	ring.visible = true
	ring_effects.append({"node": ring, "remaining": 0.46, "duration": 0.46})
	effects.append(ring)
func _spawn_hit_sparks(at: Vector3, material: Material) -> void:
	if effects.size() > 36:
		return
	var particles := CPUParticles3D.new()
	particles.name = "ImpactParticles"
	particles.amount = 14
	particles.lifetime = 0.3
	particles.one_shot = true
	particles.explosiveness = 0.95
	particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 0.12
	particles.direction = Vector3.UP
	particles.spread = 180.0
	particles.initial_velocity_min = 1.0
	particles.initial_velocity_max = 4.2
	particles.gravity = Vector3(0.0, -4.0, 0.0)
	particles.scale_amount_min = 0.025
	particles.scale_amount_max = 0.075
	particles.mesh = SphereMesh.new()
	particles.material_override = material
	particles.position = at
	add_child(particles)
	particles.emitting = true
	effects.append(particles)
	get_tree().create_timer(0.65).timeout.connect(func():
		if is_instance_valid(particles):
			particles.queue_free()
	)

func _play_sfx(frequency: float, duration: float, volume: float) -> void:
	if not sound_enabled:
		return
	var rate := 22050
	var sample_count := clampi(int(rate * duration), 64, 18000)
	var pcm := PackedByteArray()
	pcm.resize(sample_count * 2)
	for i in range(sample_count):
		var t := float(i) / float(rate)
		var envelope := exp(-t * (7.5 + frequency * 0.004))
		var phase := TAU * (frequency * t + 22.0 * t * t)
		var sample := sin(phase) * envelope * volume
		var value := clampi(int(sample * 32767.0), -32768, 32767)
		pcm[i * 2] = value & 0xFF
		pcm[i * 2 + 1] = (value >> 8) & 0xFF
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.data = pcm
	var audio_player := AudioStreamPlayer.new()
	audio_player.stream = stream
	audio_player.volume_db = -7.0
	add_child(audio_player)
	audio_player.finished.connect(audio_player.queue_free)
	audio_player.play()

func _draw_beam(from: Vector3, to: Vector3, material: Material, lifetime: float) -> void:
	_spawn_beam(from, to, material, lifetime)

func _resume_game() -> void:
	_set_pause(false)

func _restart_game() -> void:
	get_tree().reload_current_scene()
