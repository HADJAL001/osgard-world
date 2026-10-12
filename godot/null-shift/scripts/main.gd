extends Node3D

const PLAYER_SPEED := 7.4
const CIPHER := [KEY_UP, KEY_LEFT, KEY_DOWN, KEY_RIGHT]
const SAVE_PATH := "user://null_shift_career.cfg"

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
var effects: Array[Node] = []
var career := ConfigFile.new()
var career_credits := 0
var run_credits := 0
var current_contract := 0
var weapon_level := 0
var armor_level := 0
var pulse_level := 0
var player_health := 100.0
var player_max_health := 100.0
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

func _ready() -> void:
	_load_career()
	_create_materials()
	_create_lighting()
	_create_arena()
	_create_interactables()
	_create_player()
	_create_initial_guards()
	_create_ui()
	_update_hud()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	print("NULL//SHIFT Godot prototype ready")

func _process(delta: float) -> void:
	var dt := minf(delta, 0.06)
	elapsed += dt
	scene_clock += dt
	damage_flash_timer = maxf(0.0, damage_flash_timer - dt)
	frame_samples.append(dt * 1000.0)
	if frame_samples.size() > 120:
		frame_samples.pop_front()
	_update_camera(dt)
	_animate_world(dt)
	_update_effect_expiry()
	_update_mobile_layout()
	_update_player_material()
	hud_clock += dt
	if hud_clock >= 0.12:
		hud_clock = 0.0
		_update_hud()

func _physics_process(delta: float) -> void:
	if paused_game or mission_finished:
		return
	var dt := minf(delta, 0.05)
	fire_cooldown = maxf(0.0, fire_cooldown - dt)
	pulse_cooldown = maxf(0.0, pulse_cooldown - dt)
	damage_cooldown = maxf(0.0, damage_cooldown - dt)
	null_shift_timer = maxf(0.0, null_shift_timer - dt)
	if null_shift_timer == 0.0 and instability > 0.0:
		instability = maxf(0.0, instability - dt * 3.0)
	_move_player(dt)
	_update_guards(dt)
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
	if terminal_active and key in CIPHER:
		_submit_cipher_key(key)
		get_viewport().set_input_as_handled()
		return
	match key:
		KEY_E:
			_interact()
		KEY_Q:
			_deploy_pulse()
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
	environment.glow_intensity = 0.62
	environment.glow_bloom = 0.08
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

	var fill := OmniLight3D.new()
	fill.name = "ColdFill"
	fill.position = Vector3(-10.0, 8.0, 4.0)
	fill.light_color = Color(0.1, 0.64, 0.67)
	fill.light_energy = 2.2
	fill.omni_range = 19.0
	fill.shadow_enabled = false
	add_child(fill)

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
	var body_mesh := CapsuleMesh.new()
	body_mesh.radius = 0.43
	body_mesh.height = 1.6
	var body_visual := MeshInstance3D.new()
	body_visual.name = "OperatorSuit"
	body_visual.mesh = body_mesh
	body_visual.material_override = materials["cyan"]
	player.add_child(body_visual)
	_add_cube(player, Vector3(0.0, 0.25, -0.1), Vector3(0.72, 0.3, 0.76), materials["wall"])
	_add_cube(player, Vector3(0.0, 0.72, -0.08), Vector3(0.48, 0.16, 0.5), materials["white"])
	_add_cube(player, Vector3(0.0, 0.07, -0.72), Vector3(0.18, 0.18, 0.76), materials["black"])
	_add_cube(player, Vector3(0.0, 0.1, -1.1), Vector3(0.22, 0.12, 0.32), materials["amber"])
	add_child(player)

	camera_rig = Node3D.new()
	camera_rig.name = "TacticalCamera"
	add_child(camera_rig)
	camera = Camera3D.new()
	camera.name = "PerspectiveCamera"
	camera.fov = 49.0
	camera.near = 0.08
	camera.far = 130.0
	camera.position = Vector3(0.0, 23.5, 24.5)
	camera_rig.add_child(camera)
	camera_rig.global_position = player.global_position
	camera.global_position = player.global_position + Vector3(0.0, 23.5, 24.5)
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
	var body := CharacterBody3D.new()
	body.name = "Warden" if is_warden else "SecurityGuard"
	body.position = at
	body.collision_layer = 2
	body.collision_mask = 1
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.49 if is_warden else 0.4
	capsule.height = 1.9 if is_warden else 1.55
	shape.shape = capsule
	body.add_child(shape)
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.49 if is_warden else 0.4
	mesh.height = 1.9 if is_warden else 1.55
	var visual := MeshInstance3D.new()
	visual.name = "Armor"
	visual.mesh = mesh
	visual.material_override = materials["red"] if is_warden else materials["wall"]
	body.add_child(visual)
	_add_cube(body, Vector3(0.0, 0.27, -0.04), Vector3(0.68, 0.3, 0.58), materials["red"] if is_warden else materials["black"])
	_add_cube(body, Vector3(0.0, 0.56, -0.28), Vector3(0.42, 0.12, 0.1), materials["amber"] if is_warden else materials["red"])
	add_child(body)
	guards.append({
		"node": body,
		"hp": 10 if is_warden else (4 if current_contract == 2 else 3),
		"max_hp": 10 if is_warden else (4 if current_contract == 2 else 3),
		"speed": 3.25 if is_warden else (2.25 if current_contract == 2 else 1.9),
		"damage": 18 if is_warden else 10,
		"warden": is_warden,
		"stun": 0.0,
		"windup": 0.0,
		"cooldown": randf_range(0.8, 1.8),
		"phase": randf_range(0.0, TAU)
	})

func _move_player(_delta: float) -> void:
	if not is_instance_valid(player):
		return
	if terminal_active:
		player.velocity = Vector3.ZERO
		_update_player_aim()
		return
	var move := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	move += Vector2(
		float(mobile_actions.get("right", false)) - float(mobile_actions.get("left", false)),
		float(mobile_actions.get("down", false)) - float(mobile_actions.get("up", false))
	)
	if move.length() > 1.0:
		move = move.normalized()
	player.velocity = Vector3(move.x * PLAYER_SPEED, 0.0, move.y * PLAYER_SPEED)
	player.move_and_slide()
	_update_player_aim()

func _update_player_aim() -> void:
	if not is_instance_valid(player) or not is_instance_valid(camera):
		return
	var direction := Vector3.ZERO
	if mobile_controls_visible:
		var nearest_guard: Dictionary = {}
		var nearest := 100000.0
		for guard in guards:
			var body: CharacterBody3D = guard["node"]
			if not is_instance_valid(body):
				continue
			var distance := player.global_position.distance_to(body.global_position)
			if distance < nearest:
				nearest = distance
				nearest_guard = guard
		if not nearest_guard.is_empty():
			direction = (nearest_guard["node"] as Node3D).global_position - player.global_position
		elif not terminal_unlocked:
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
	if direction.length_squared() < 0.01:
		direction = Vector3.FORWARD
	direction.y = 0.0
	player_aim = direction.normalized()
	player.rotation.y = atan2(-player_aim.x, -player_aim.z)

func _update_guards(delta: float) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		var body: CharacterBody3D = guard["node"]
		if not is_instance_valid(body):
			guards.remove_at(index)
			continue
		var stun := maxf(0.0, float(guard["stun"]) - delta)
		guard["stun"] = stun
		if stun > 0.0:
			body.velocity = Vector3.ZERO
			guards[index] = guard
			continue
		var to_player := player.global_position - body.global_position
		to_player.y = 0.0
		var distance := to_player.length()
		if distance > 0.01:
			body.look_at(Vector3(player.global_position.x, body.global_position.y, player.global_position.z), Vector3.UP)
		var windup := float(guard["windup"])
		if windup > 0.0:
			windup -= delta
			guard["windup"] = windup
			body.velocity = Vector3.ZERO
			if windup <= 0.0:
				if distance < 14.5 and damage_cooldown <= 0.0:
					_damage_player(float(guard["damage"]))
				guard["cooldown"] = randf_range(1.45, 2.15)
			guards[index] = guard
			continue
		var cooldown := maxf(0.0, float(guard["cooldown"]) - delta)
		guard["cooldown"] = cooldown
		if distance < 13.5 and cooldown <= 0.0:
			guard["windup"] = 0.62 if not bool(guard["warden"]) else 0.85
			_draw_beam(body.global_position + Vector3.UP * 1.0, player.global_position + Vector3.UP * 0.8, materials["telegraph"], 0.66)
			_play_sfx(230.0 if not bool(guard["warden"]) else 115.0, 0.18, 0.08)
			body.velocity = Vector3.ZERO
		elif distance > 2.7 and distance < 22.0:
			body.velocity = to_player.normalized() * float(guard["speed"])
			body.move_and_slide()
		else:
			body.velocity = Vector3.ZERO
		guards[index] = guard

func _fire_weapon() -> void:
	if fire_cooldown > 0.0 or paused_game or mission_finished or terminal_active:
		return
	fire_cooldown = maxf(0.09, 0.17 - float(weapon_level) * 0.022)
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
	_play_sfx(680.0, 0.055, 0.08)

func _damage_target(target: Node) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		if guard["node"] == target:
			guard["hp"] = int(guard["hp"]) - 1
			_spawn_hit_sparks(target.global_position + Vector3.UP * 0.7, materials["amber"])
			if int(guard["hp"]) <= 0:
				var body: Node3D = guard["node"]
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
		objective_text = "ИМПУЛЬС ПЕРЕЗАРЯЖАЕТСЯ · %.1F С" % pulse_cooldown
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
	objective_text = "ИМПУЛЬС: %d ЦЕЛЕЙ НАРУШЕНО · ПЕРЕЗАРЯДКА %.1F С" % [count, pulse_cooldown]
	_play_sfx(95.0, 0.55, 0.16)
	_update_hud()

func _shift_layer() -> void:
	if null_shift_timer > 0.0 or paused_game or mission_finished:
		return
	null_shift_timer = 3.8
	instability = minf(100.0, instability + 24.0)
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
			security_gate.visible = false
			security_gate.collision_layer = 0
			for child in security_gate.get_children():
				if child is CollisionShape3D:
					(child as CollisionShape3D).disabled = true
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

func _damage_player(amount: float) -> void:
	if damage_cooldown > 0.0 or null_shift_timer > 0.0:
		return
	damage_cooldown = 0.5
	damage_flash_timer = 0.2
	player_health = maxf(0.0, player_health - amount)
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
	cinematic_quality = not cinematic_quality
	world_environment.environment.glow_enabled = cinematic_quality
	key_light.shadow_enabled = cinematic_quality
	objective_text = "ГРАФИКА: КИНОРЕЖИМ" if cinematic_quality else "ГРАФИКА: СБАЛАНСИРОВАННЫЙ РЕЖИМ"
	_update_hud()

func _toggle_diagnostics() -> void:
	diagnostics_enabled = not diagnostics_enabled
	diagnostics_label.visible = diagnostics_enabled

func _set_pause(state: bool) -> void:
	if mission_finished:
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

	var status_panel := _make_panel(hud_root, Control.PRESET_TOP_LEFT, Rect2(18.0, 18.0, 316.0, 190.0))
	var status_stack := _panel_stack(status_panel)
	_label(status_stack, "NULL//SHIFT", 22, Color(0.38, 1.0, 0.86))
	_label(status_stack, "PHASE TRANSIT  /  TACTICAL RAID", 9, Color(0.49, 0.67, 0.69))
	health_label = _label(status_stack, "ВИТАЛЬНОСТЬ  100 / 100", 13, Color(0.86, 1.0, 0.97))
	credits_label = _label(status_stack, "РЕЙД  000  ·  КАРЬЕРА  000", 12, Color(1.0, 0.77, 0.39))
	threat_label = _label(status_stack, "УГРОЗА: ВЫСОКАЯ", 11, Color(1.0, 0.3, 0.38))
	_label(status_stack, "FPS / F3   ·   ГРАФИКА / F2", 9, Color(0.48, 0.6, 0.62))

	var objective_panel := _make_panel(hud_root, Control.PRESET_TOP_RIGHT, Rect2(-334.0, 18.0, 316.0, 178.0))
	var objective_stack := _panel_stack(objective_panel)
	_label(objective_stack, "MISSION CONTROL", 11, Color(1.0, 0.77, 0.39))
	objective_label = _label(objective_stack, objective_text, 12, Color(0.88, 0.96, 0.95))
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(285.0, 64.0)
	telemetry_label = _label(objective_stack, "HOSTILES 03  ·  DEVICES 03  ·  CONTRACT 01", 10, Color(0.48, 0.72, 0.72))
	var button_row := HBoxContainer.new()
	button_row.add_theme_constant_override("separation", 6)
	objective_stack.add_child(button_row)
	_add_button(button_row, "DIAG / F3", func(): _toggle_diagnostics(), Vector2(88.0, 32.0))
	_add_button(button_row, "QUALITY / F2", func(): _toggle_quality(), Vector2(115.0, 32.0))
	_add_button(button_row, "PAUSE / ESC", func(): _set_pause(not paused_game), Vector2(88.0, 32.0))

	var mid_panel := _make_panel(hud_root, Control.PRESET_CENTER_TOP, Rect2(-225.0, 98.0, 450.0, 68.0))
	mid_panel.modulate = Color(1.0, 1.0, 1.0, 0.92)
	var mid_stack := _panel_stack(mid_panel)
	_label(mid_stack, "TACTICAL TELEMETRY  /  LOCAL SESSION", 9, Color(0.34, 0.86, 0.8))
	var subtitle := _label(mid_stack, "ТЕРМИНАЛ → КВАНТОВОЕ ЯДРО → ЭВАКУАЦИЯ", 11, Color(0.91, 0.98, 0.96))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	diagnostics_label = _label(hud_root, "", 11, Color(0.7, 1.0, 0.92))
	diagnostics_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	diagnostics_label.offset_left = 18.0
	diagnostics_label.offset_top = 218.0
	diagnostics_label.offset_right = 335.0
	diagnostics_label.offset_bottom = 360.0
	diagnostics_label.visible = false
	diagnostics_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var bottom_hint := _label(hud_root, "WASD / СТРЕЛКИ · ЛКМ ОГОНЬ · E ДЕЙСТВИЕ · Q ИМПУЛЬС · SHIFT NULL SHIFT", 10, Color(0.54, 0.71, 0.7))
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

	_create_mobile_controls(hud_root)

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
	style.set_corner_radius_all(9)
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
		else:
			var arrow := "↑" if action == "up" else ("↓" if action == "down" else ("←" if action == "left" else "→"))
			var button := _add_button(grid, arrow, func(): pass, Vector2(52.0, 38.0))
			button.button_down.connect(_set_mobile_action.bind(action, true))
			button.button_up.connect(_set_mobile_action.bind(action, false))
	mobile_action_panel = _make_panel(parent, Control.PRESET_BOTTOM_RIGHT, Rect2(-222.0, -218.0, 206.0, 202.0))
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
		{"key": "shift", "label": "СДВИГ"}
	]
	for item in combat_actions:
		var action_button := _add_button(action_grid, item["label"], func(): pass, Vector2(84.0, 38.0))
		action_button.button_down.connect(_set_mobile_action.bind(item["key"], true))
		action_button.button_up.connect(_set_mobile_action.bind(item["key"], false))
	_add_button(action_stack, "МОДУЛИ", _toggle_loadout, Vector2(176.0, 33.0))

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

func _update_mobile_layout() -> void:
	var width := get_viewport().get_visible_rect().size.x
	mobile_controls_visible = width < 880.0 or DisplayServer.is_touchscreen_available()
	if is_instance_valid(mobile_move_panel):
		mobile_move_panel.visible = mobile_controls_visible
	if is_instance_valid(mobile_action_panel):
		mobile_action_panel.visible = mobile_controls_visible

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

func _update_hud() -> void:
	if not is_instance_valid(objective_label):
		return
	health_label.text = "ВИТАЛЬНОСТЬ  %d / %d" % [int(ceil(player_health)), int(player_max_health)]
	credits_label.text = "РЕЙД  %03d  ·  КАРЬЕРА  %05d" % [run_credits, career_credits]
	threat_label.text = "УГРОЗА: %s" % ("КРИТИЧЕСКАЯ" if alarm_active else ("ВЫСОКАЯ" if not guards.is_empty() else "НИЗКАЯ"))
	threat_label.add_theme_color_override("font_color", Color(1.0, 0.25, 0.34) if alarm_active else Color(0.95, 0.72, 0.39) if not guards.is_empty() else Color(0.35, 1.0, 0.81))
	objective_label.text = objective_text
	telemetry_label.text = "HOSTILES %02d  ·  DEVICES %02d  ·  CONTRACT %02d" % [guards.size(), _living_device_count(), current_contract + 1]
	if diagnostics_enabled:
		var samples := frame_samples.duplicate()
		samples.sort()
		var p95 := 0.0
		if not samples.is_empty():
			p95 = samples[clampi(int(floor(float(samples.size() - 1) * 0.95)), 0, samples.size() - 1)]
		fps_p95_ms = p95
		var draw_calls := int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
		diagnostics_label.text = "LIVE DIAGNOSTICS\nFPS        %02d\nFRAME P95  %.1f ms\nFRAME NOW  %.1f ms\nDRAW CALLS %d\nGUARDS     %d\nDEVICES    %d\nPROFILE    %s" % [
			Engine.get_frames_per_second(), fps_p95_ms, get_process_delta_time() * 1000.0, draw_calls, guards.size(), _living_device_count(), "CINEMATIC" if cinematic_quality else "BALANCED"
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
	camera.global_position = camera.global_position.lerp(target, clampf(delta * 3.6, 0.0, 1.0))
	camera.look_at(player.global_position + Vector3(0.0, 0.55, 0.0), Vector3.UP)

func _update_player_material() -> void:
	if not is_instance_valid(player):
		return
	var suit := player.get_node_or_null("OperatorSuit") as MeshInstance3D
	if not suit:
		return
	if damage_flash_timer > 0.0:
		suit.material_override = materials["red"]
	elif null_shift_timer > 0.0:
		suit.material_override = materials["violet"]
	else:
		suit.material_override = materials["cyan"]

func _animate_world(delta: float) -> void:
	if is_instance_valid(core_ring) and quantum_core.visible:
		core_ring.rotate_y(delta * 1.2)
		core_ring.rotate_x(sin(scene_clock * 0.8) * delta * 0.25)
	if is_instance_valid(extraction_ring):
		extraction_ring.rotate_y(-delta * 0.32)
	if is_instance_valid(terminal_light):
		terminal_light.light_energy = 1.45 + sin(scene_clock * 3.0) * 0.25
	if is_instance_valid(core_light) and quantum_core.visible:
		core_light.light_energy = 2.0 + sin(scene_clock * 4.0) * 0.38
	for guard in guards:
		var body: Node3D = guard["node"]
		if not is_instance_valid(body):
			continue
		var armor := body.get_node_or_null("Armor") as MeshInstance3D
		if armor:
			armor.material_override = materials["cyan"] if float(guard["stun"]) > 0.0 else (materials["red"] if bool(guard["warden"]) else materials["wall"])

func _update_effect_expiry() -> void:
	for index in range(effects.size() - 1, -1, -1):
		if not is_instance_valid(effects[index]):
			effects.remove_at(index)

func _spawn_beam(from: Vector3, to: Vector3, material: Material, lifetime: float) -> void:
	var mesh := ImmediateMesh.new()
	mesh.surface_begin(Mesh.PRIMITIVE_LINES, material)
	mesh.surface_add_vertex(from)
	mesh.surface_add_vertex(to)
	mesh.surface_end()
	var instance := MeshInstance3D.new()
	instance.name = "TransientBeam"
	instance.mesh = mesh
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(instance)
	effects.append(instance)
	get_tree().create_timer(lifetime).timeout.connect(func():
		if is_instance_valid(instance):
			instance.queue_free()
	)

func _spawn_ring_burst(at: Vector3, material: Material) -> void:
	var mesh := TorusMesh.new()
	mesh.inner_radius = 0.18
	mesh.outer_radius = 0.24
	mesh.rings = 24
	mesh.ring_segments = 8
	var ring := MeshInstance3D.new()
	ring.name = "PhaseRing"
	ring.mesh = mesh
	ring.material_override = material
	ring.position = at
	add_child(ring)
	effects.append(ring)
	var tween := create_tween()
	tween.tween_property(ring, "scale", Vector3(14.0, 14.0, 14.0), 0.46)
	tween.tween_callback(func():
		if is_instance_valid(ring):
			ring.queue_free()
	)

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
