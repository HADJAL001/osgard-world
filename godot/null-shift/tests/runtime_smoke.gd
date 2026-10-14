extends SceneTree

func _initialize() -> void:
	call_deferred("_run_smoke")

func _expect(condition: bool, description: String) -> bool:
	if not condition:
		push_error("RUNTIME_SMOKE_FAILURE: " + description)
		quit(1)
		return false
	return true

func _run_smoke() -> void:
	print("RUNTIME_STAGE: load main scene")
	var packed := load("res://scenes/main.tscn") as PackedScene
	if not _expect(packed != null, "main scene must load"):
		return
	print("RUNTIME_STAGE: instantiate scene")
	var game: Variant = packed.instantiate()
	root.add_child(game)
	await process_frame
	await process_frame
	print("RUNTIME_STAGE: scene ready")
	if not _expect(game.get_script() != null, "main scene script must load without GDScript parse errors"):
		return

	print("RUNTIME_STAGE: premium accessibility and rendering controls")
	var saved_palette: bool = game.color_safe_mode
	var saved_haptics: bool = game.haptics_enabled
	var saved_hud_scale: int = game.hud_scale_step
	game.color_safe_mode = false
	var standard_active: Color = game._hazard_color("active")
	game.color_safe_mode = true
	var accessible_warning: Color = game._hazard_color("warning")
	var accessible_active: Color = game._hazard_color("active")
	if not _expect(standard_active.r > standard_active.g and accessible_warning.b > accessible_warning.r and accessible_active.r > accessible_active.g and accessible_active.r > accessible_active.b, "colour-safe mode must use distinct blue warning and orange active hazard colours"):
		return
	if not _expect(game._hud_scale_value() > 0.9 and game._hud_scale_value() < 1.1, "HUD scale must stay inside the three safe values"):
		return
	game.haptics_enabled = false
	game.gamepad_device_id = -1
	if not _expect(not game._haptic_output_available() and not game._pulse_gamepad(0.3, 0.7, 0.1), "haptics must safely no-op when disabled or no controller is connected"):
		return
	game.color_safe_mode = saved_palette
	game.haptics_enabled = saved_haptics
	game.hud_scale_step = saved_hud_scale
	game._apply_hazard_palette()
	game._update_phase_lanes(0.0)
	game._apply_hud_scale()
	game._update_accessibility_buttons()

	print("RUNTIME_STAGE: adaptive counterplay doctrine")
	if not _expect(game._select_tactical_doctrine({"dash": 6.0, "pulse": 1.0, "phase": 1.0}) == "INTERCEPT", "dash-heavy behaviour must select the telegraphed INTERCEPT doctrine"):
		return
	if not _expect(game._select_tactical_doctrine({"dash": 1.0, "pulse": 6.0, "phase": 1.0}) == "SPLIT", "pulse-heavy behaviour must select the formation-splitting doctrine"):
		return
	if not _expect(game._select_tactical_doctrine({"dash": 1.0, "pulse": 1.0, "phase": 6.0}) == "ECHO_TRACK", "phase-heavy behaviour must select the acoustic ECHO TRACK doctrine"):
		return
	if not _expect(game._select_tactical_doctrine({"dash": 1.0, "pulse": 1.0, "phase": 1.0}) == "BALANCED" and game._select_tactical_doctrine({}) == "BALANCED", "weak or evenly mixed evidence must keep the default doctrine"):
		return
	var learned_ranger: Vector3 = game._guard_flank_target({"role": "RANGER", "tactical_angle": 0.0}, Vector3(0.0, 0.82, 0.0))
	game.adaptive_doctrine = "SPLIT"
	var split_ranger: Vector3 = game._guard_flank_target({"role": "RANGER", "tactical_angle": 0.0}, Vector3(0.0, 0.82, 0.0))
	if not _expect(learned_ranger.distance_to(Vector3(0.0, 0.82, 0.0)) < 7.0 and split_ranger.distance_to(Vector3(0.0, 0.82, 0.0)) > 12.5, "SPLIT must reposition the ranger outside one pulse's normal suppression radius"):
		return
	game.adaptive_doctrine = "BALANCED"
	if not _expect(is_equal_approx(game._phase_noise_radius(), 18.0), "default phase shift must preserve its standard audible radius"):
		return
	game.adaptive_doctrine = "ECHO_TRACK"
	if not _expect(is_equal_approx(game._phase_noise_radius(), 26.0), "ECHO TRACK must increase the actual phase-shift audible radius"):
		return
	game.adaptive_doctrine = "BALANCED"
	var predicted_walk: Vector3 = game._predict_intercept_position(Vector3(0.0, 0.82, 0.0), Vector3(7.0, 0.0, 0.0), 0.0)
	if not _expect(predicted_walk.x > 0.0 and predicted_walk.x < 2.0 and is_equal_approx(predicted_walk.y, 0.82), "interceptor must lead planar movement with bounded, deterministic prediction"):
		return
	var predicted_edge: Vector3 = game._predict_intercept_position(Vector3(20.8, 0.82, 11.8), Vector3(20.0, 0.0, 20.0), 0.24)
	if not _expect(predicted_edge.x <= 21.0 and predicted_edge.z <= 12.0 and is_equal_approx(predicted_edge.y, 0.82), "intercept prediction must remain inside arena bounds and preserve ground height"):
		return
	var old_tactic_counts: Dictionary = game.tactical_action_counts.duplicate(true)
	var old_doctrine: String = game.adaptive_doctrine
	var old_doctrine_clock: float = game.tactical_doctrine_clock
	var old_doctrine_lock: float = game.tactical_doctrine_lock_timer
	var old_doctrine_changes: int = game.tactical_doctrine_changes
	game.tactical_action_counts = {"dash": 6.0, "pulse": 1.0, "phase": 1.0}
	game.adaptive_doctrine = "BALANCED"
	game.tactical_doctrine_clock = 0.0
	game.tactical_doctrine_lock_timer = 0.0
	game.tactical_doctrine_changes = 0
	game._update_tactical_doctrine(0.016)
	if not _expect(game.adaptive_doctrine == "INTERCEPT" and game.tactical_doctrine_changes == 1, "director must apply an evidence-backed doctrine and count the transition"):
		return
	game.tactical_action_counts = old_tactic_counts
	game.adaptive_doctrine = old_doctrine
	game.tactical_doctrine_clock = old_doctrine_clock
	game.tactical_doctrine_lock_timer = old_doctrine_lock
	game.tactical_doctrine_changes = old_doctrine_changes
	print("RUNTIME_STAGE: tactical perception, squad radio and acoustic events")
	print("RUNTIME_STAGE: flank director and cover-aware navigation")
	var flank_origin := Vector3(0.0, 0.82, 0.0)
	var ranger_slot_a: Dictionary = {"role": "RANGER", "tactical_slot": 0, "tactical_angle": 0.0}
	var ranger_slot_b: Dictionary = {"role": "RANGER", "tactical_slot": 1, "tactical_angle": PI * 0.5}
	var ranger_target_a: Vector3 = game._guard_flank_target(ranger_slot_a, flank_origin)
	var ranger_target_b: Vector3 = game._guard_flank_target(ranger_slot_b, flank_origin)
	if not _expect(is_equal_approx(ranger_target_a.distance_to(flank_origin), 6.2) and ranger_target_a.is_equal_approx(game._guard_flank_target(ranger_slot_a, flank_origin)), "Ranger flank waypoint must be stable and keep its 6.2 metre tactical radius"):
		return
	if not _expect(ranger_target_a.distance_to(ranger_target_b) > 8.0, "distinct flank slots must distribute a squad around different attack vectors"):
		return
	if not _expect(is_equal_approx(game._guard_flank_target({"role": "STALKER", "tactical_angle": 0.0}, flank_origin).distance_to(flank_origin), 3.8) and is_equal_approx(game._guard_flank_target({"role": "HEAVY", "tactical_angle": 0.0}, flank_origin).distance_to(flank_origin), 5.4) and is_equal_approx(game._guard_flank_target({"role": "WARDEN", "tactical_angle": 0.0}, flank_origin).distance_to(flank_origin), 7.0), "Stalker, Heavy and Warden must hold distinct role-specific engagement distances"):
		return
	var edge_flank: Vector3 = game._guard_flank_target(ranger_slot_a, Vector3(20.5, 0.82, 11.6))
	if not _expect(edge_flank.x <= 21.0 and edge_flank.x >= -21.0 and edge_flank.z <= 12.0 and edge_flank.z >= -12.0, "flank waypoints must remain within the playable deck boundary"):
		return
	var navigation_probe := CharacterBody3D.new()
	navigation_probe.name = "TacticalNavigationProbe"
	navigation_probe.position = Vector3(-17.0, 0.82, 0.0)
	navigation_probe.collision_layer = 2
	navigation_probe.collision_mask = 1
	var navigation_shape := CollisionShape3D.new()
	var navigation_capsule := CapsuleShape3D.new()
	navigation_capsule.radius = 0.32
	navigation_capsule.height = 1.5
	navigation_shape.shape = navigation_capsule
	navigation_probe.add_child(navigation_shape)
	game.add_child(navigation_probe)
	var navigation_wall := StaticBody3D.new()
	navigation_wall.name = "TacticalNavigationOccluder"
	navigation_wall.position = Vector3(-17.0, 0.8, -1.55)
	navigation_wall.collision_layer = 1
	navigation_wall.collision_mask = 0
	var navigation_wall_shape := CollisionShape3D.new()
	var navigation_box := BoxShape3D.new()
	navigation_box.size = Vector3(2.0, 1.8, 0.32)
	navigation_wall_shape.shape = navigation_box
	navigation_wall.add_child(navigation_wall_shape)
	game.add_child(navigation_wall)
	await physics_frame
	await physics_frame
	if not _expect(game._guard_direction_is_blocked(navigation_probe, Vector3.FORWARD, 1.8), "cover ray must detect a real solid obstruction directly ahead"):
		return
	var detour: Vector3 = game._guard_navigation_direction(navigation_probe, Vector3(-17.0, 0.82, -8.0), {"navigation_bias": 1})
	if not _expect(not detour.is_zero_approx() and detour.dot(Vector3.FORWARD) > 0.25 and not game._guard_direction_is_blocked(navigation_probe, detour, 1.5), "blocked movement must produce a clear, forward-progressing detour around solid cover"):
		return
	navigation_probe.queue_free()
	navigation_wall.queue_free()
	await process_frame

	if not _expect(game._is_within_vision_cone(Vector3.ZERO, Vector3.FORWARD, Vector3(0.0, 0.0, -8.0), 20.0, 150.0), "vision cone must detect a target in the forward arc"):
		return
	if not _expect(not game._is_within_vision_cone(Vector3.ZERO, Vector3.FORWARD, Vector3(12.0, 0.0, 0.0), 20.0, 120.0), "vision cone must reject a target outside the configured field of view"):
		return
	if not _expect(not game._is_within_vision_cone(Vector3.ZERO, Vector3.FORWARD, Vector3(0.0, 0.0, -24.0), 20.0, 150.0), "vision cone must reject targets beyond sight range"):
		return
	if not _expect(game._noise_is_audible(Vector3(0.0, 0.0, 15.0), Vector3.ZERO, 16.0) and not game._noise_is_audible(Vector3(0.0, 0.0, 20.0), Vector3.ZERO, 16.0), "sound radius must include near listeners and exclude listeners outside its range"):
		return
	var saved_noise_position: Vector3 = game.combat_noise_position
	var saved_noise_radius: float = game.combat_noise_radius
	var saved_noise_timer: float = game.combat_noise_timer
	var saved_noise_serial: int = game.combat_noise_serial
	var saved_noise_source: String = game.combat_noise_source
	var saved_squad_position: Vector3 = game.squad_alert_position
	var saved_squad_timer: float = game.squad_alert_timer
	var saved_squad_serial: int = game.squad_alert_serial
	var saved_squad_source: String = game.squad_alert_source
	var saved_echo_cooldown: float = game.phase_echo_cooldown
	var saved_echo_activations: int = game.phase_echo_activations
	var saved_echo_lures: int = game.phase_echo_lures
	var saved_player_position_for_echo: Vector3 = game.player.global_position
	var saved_player_aim_for_echo: Vector3 = game.player_aim
	var sense_guard: Dictionary = {"role": "RANGER", "ai_state": "PATROL", "last_known_position": Vector3.ZERO, "search_timer": 0.0, "heard_noise_serial": game.combat_noise_serial, "heard_squad_serial": game.squad_alert_serial, "displayed_ai_state": "PATROL", "warden": false}
	var sense_body: CharacterBody3D = game.guards[0]["node"] as CharacterBody3D
	game._emit_combat_noise(sense_body.global_position + Vector3(1.0, 0.0, 1.0), 18.0, "runtime-test")
	sense_guard = game._update_guard_perception(sense_guard, sense_body, false, 0.016)
	if not _expect(str(sense_guard["ai_state"]) == "INVESTIGATE" and sense_guard["last_known_position"].distance_to(game.combat_noise_position) < 0.01, "new audible event must put an unaware guard into investigation at the noise source"):
		return
	sense_guard = game._update_guard_perception(sense_guard, sense_body, true, 0.016)
	if not _expect(str(sense_guard["ai_state"]) == "ENGAGED" and sense_guard["last_known_position"].distance_to(game.player.global_position) < 0.01 and sense_guard["search_timer"] > 0.0, "visual contact must acquire the player and start a bounded search-memory timer"):
		return
	if not _expect(game.squad_alert_serial > saved_squad_serial and game.squad_alert_position.distance_to(game.player.global_position) < 0.01, "new visual contact must publish a squad-level radio position"):
		return
	game.combat_noise_position = saved_noise_position
	game.combat_noise_radius = saved_noise_radius
	game.combat_noise_timer = saved_noise_timer
	game.combat_noise_serial = saved_noise_serial
	game.combat_noise_source = saved_noise_source
	game.squad_alert_position = saved_squad_position
	game.squad_alert_timer = saved_squad_timer
	game.squad_alert_serial = saved_squad_serial
	game.squad_alert_source = saved_squad_source
	print("RUNTIME_STAGE: Phase Echo decoy, squad diversion and elite resistance")
	var saved_echo_mission_finished: bool = game.mission_finished
	var saved_echo_paused: bool = game.paused_game
	var saved_echo_briefing: bool = game.briefing_visible
	var saved_echo_terminal: bool = game.terminal_active
	game.mission_finished = false
	game.paused_game = false
	game.briefing_visible = false
	game.terminal_active = false
	game.player.global_position = Vector3(0.0, 0.82, 0.0)
	game.player_aim = Vector3.FORWARD
	game.phase_echo_cooldown = 0.0
	game.phase_echo_activations = 0
	game.phase_echo_lures = 0
	game._deploy_phase_echo()
	if not _expect(is_instance_valid(game.phase_echo_node) and is_instance_valid(game.phase_echo_hologram) and is_instance_valid(game.phase_echo_ring), "Phase Echo must spawn a real emissive hologram and signal ring in the 3D scene"):
		return
	var decoy_position: Vector3 = game.phase_echo_node.global_position
	if not _expect(game.phase_echo_remaining == game.PHASE_ECHO_DURATION and game.phase_echo_cooldown == game.PHASE_ECHO_COOLDOWN and game.phase_echo_activations == 1, "Phase Echo must start its bounded active duration, cooldown and activation telemetry"):
		return
	if not _expect(game.squad_alert_source == "phase-echo" and game.combat_noise_source == "phase-echo" and game.squad_alert_serial > saved_squad_serial, "decoy deployment must broadcast a fresh squad radio contact and acoustic source"):
		return
	var decoy_guard: Dictionary = {"role": "RANGER", "warden": false, "ai_state": "PATROL", "last_known_position": Vector3.ZERO, "search_timer": 0.0, "heard_noise_serial": game.combat_noise_serial, "heard_squad_serial": game.squad_alert_serial - 1, "displayed_ai_state": "PATROL"}
	decoy_guard = game._update_guard_perception(decoy_guard, sense_body, false, 0.016)
	if not _expect(str(decoy_guard["ai_state"]) == "INVESTIGATE" and decoy_guard["last_known_position"].distance_to(decoy_position) < 0.01 and game.phase_echo_lures == 1, "unaware non-elite guard must investigate the hologram coordinates and count a confirmed diversion"):
		return
	var elite_guard: Dictionary = {"role": "WARDEN", "warden": true, "ai_state": "PATROL", "last_known_position": Vector3.ZERO, "search_timer": 0.0, "heard_noise_serial": game.combat_noise_serial, "heard_squad_serial": game.squad_alert_serial - 1, "displayed_ai_state": "PATROL"}
	elite_guard = game._update_guard_perception(elite_guard, sense_body, false, 0.016)
	if not _expect(str(elite_guard["ai_state"]) == "PATROL" and int(elite_guard["heard_squad_serial"]) == game.squad_alert_serial, "Warden must register but reject the decoy rather than abandon elite tracking"):
		return
	game._deploy_phase_echo()
	if not _expect(game.phase_echo_activations == 1 and game.phase_echo_cooldown > 0.0, "Echo cooldown must reject rapid redeployment and prevent stacking decoy actors"):
		return
	game._update_phase_echo(game.PHASE_ECHO_DURATION + 0.05)
	if not _expect(not is_instance_valid(game.phase_echo_node) and game.phase_echo_remaining <= 0.0 and game.phase_echo_cooldown > 0.0, "the hologram must clean itself up after the signal window while cooldown remains"):
		return
	game._deploy_phase_echo()
	if not _expect(game.phase_echo_activations == 1, "cooldown must still block Echo redeployment after the hologram fades"):
		return
	game.player.global_position = saved_player_position_for_echo
	game.player_aim = saved_player_aim_for_echo
	game.phase_echo_cooldown = saved_echo_cooldown
	game.phase_echo_activations = saved_echo_activations
	game.phase_echo_lures = saved_echo_lures
	game.mission_finished = saved_echo_mission_finished
	game.paused_game = saved_echo_paused
	game.briefing_visible = saved_echo_briefing
	game.terminal_active = saved_echo_terminal
	game.combat_noise_position = saved_noise_position
	game.combat_noise_radius = saved_noise_radius
	game.combat_noise_timer = saved_noise_timer
	game.combat_noise_serial = saved_noise_serial
	game.combat_noise_source = saved_noise_source
	game.squad_alert_position = saved_squad_position
	game.squad_alert_timer = saved_squad_timer
	game.squad_alert_serial = saved_squad_serial
	game.squad_alert_source = saved_squad_source
	print("RUNTIME_STAGE: generated PBR surface texture set")
	var floor_surface: StandardMaterial3D = game.materials.get("floor") as StandardMaterial3D
	var wall_surface: StandardMaterial3D = game.materials.get("wall") as StandardMaterial3D
	var trim_surface: StandardMaterial3D = game.materials.get("wall_trim") as StandardMaterial3D
	if not _expect(is_instance_valid(floor_surface) and is_instance_valid(wall_surface) and is_instance_valid(trim_surface), "floor, bulkhead and metal trim must keep their shared surface materials"):
		return
	if not _expect(is_instance_valid(floor_surface.albedo_texture) and is_instance_valid(floor_surface.normal_texture) and is_instance_valid(floor_surface.roughness_texture), "floor must use generated albedo, normal and roughness textures"):
		return
	if not _expect(floor_surface.albedo_texture.get_width() == 128 and floor_surface.normal_texture.get_height() == 128 and floor_surface.roughness_texture.get_width() == 128, "generated PBR maps must be compact 128px textures"):
		return
	var albedo_image: Image = floor_surface.albedo_texture.get_image()
	var roughness_image: Image = floor_surface.roughness_texture.get_image()
	if not _expect(albedo_image.get_pixel(0, 0).r != albedo_image.get_pixel(32, 47).r and roughness_image.get_pixel(4, 11).r != roughness_image.get_pixel(96, 83).r, "procedural albedo and roughness maps must contain actual spatial variation"):
		return
	var saved_performance_quality: bool = game.performance_quality
	var saved_degraded_quality: bool = game.adaptive_quality_degraded
	game.performance_quality = true
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	if not _expect(not floor_surface.normal_enabled and floor_surface.normal_texture == null and floor_surface.roughness_texture == null, "Performance profile must disable expensive surface maps"):
		return
	game.performance_quality = saved_performance_quality
	game.adaptive_quality_degraded = saved_degraded_quality
	game._apply_quality_mode()
	if not _expect(floor_surface.normal_enabled == (not game.performance_quality and not game.adaptive_quality_degraded), "restoring graphics profile must restore its surface-map policy"):
		return
	print("RUNTIME_STAGE: premium layered operator and guard armour")
	var operator_chest: MeshInstance3D = game.operator_rig.find_child("OperatorChestShell", true, false) as MeshInstance3D
	var operator_shoulder: MeshInstance3D = game.operator_rig.find_child("OperatorShoulder_L", true, false) as MeshInstance3D
	var operator_back_cell: MeshInstance3D = game.operator_rig.find_child("OperatorBackCell_L", true, false) as MeshInstance3D
	if not _expect(is_instance_valid(operator_chest) and is_instance_valid(operator_shoulder) and is_instance_valid(operator_back_cell), "operator must have layered chest, shoulder and backpack energy-cell meshes"):
		return
	if not _expect(operator_chest.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON and operator_shoulder.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON, "hero armour silhouette must cast real scene shadows"):
		return
	var armour_guard: CharacterBody3D = game.guards[0]["node"] as CharacterBody3D
	var guard_chest: MeshInstance3D = armour_guard.find_child("GuardChestShell", true, false) as MeshInstance3D
	var guard_shoulder: MeshInstance3D = armour_guard.find_child("GuardShoulder_L", true, false) as MeshInstance3D
	var guard_pack: MeshInstance3D = armour_guard.find_child("GuardBackpackShell", true, false) as MeshInstance3D
	var guard_knee: MeshInstance3D = armour_guard.find_child("GuardKneePlate_L", true, false) as MeshInstance3D
	if not _expect(is_instance_valid(guard_chest) and is_instance_valid(guard_shoulder) and is_instance_valid(guard_pack) and is_instance_valid(guard_knee), "every guard must expose named chest, shoulder, backpack and knee armour detail"):
		return
	if not _expect(guard_chest.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON and guard_shoulder.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON and guard_pack.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_ON, "guard armour panels must cast real scene shadows"):
		return
	if not _expect(is_instance_valid(game.briefing_panel), "first-run briefing panel must instantiate"):
		return
	game._show_briefing()
	if not _expect(game.briefing_visible and game.paused_game and game.briefing_panel.visible, "opening the briefing must pause the combat simulation"):
		return
	game._dismiss_briefing()
	if not _expect(not game.briefing_visible and not game.paused_game and bool(game.career.get_value("settings", "briefing_seen", false)), "dismissing briefing must resume gameplay and persist completion"):
		return

	print("RUNTIME_STAGE: native gamepad inputs, analog deadzone and aim assist")
	if not _expect(game._apply_gamepad_deadzone(Vector2(0.06, 0.04)).is_zero_approx(), "gamepad deadzone must filter stick drift below 0.20"):
		return
	if not _expect(game._apply_gamepad_deadzone(Vector2.RIGHT).is_equal_approx(Vector2.RIGHT), "full gamepad stick deflection must preserve full speed"):
		return
	game.gamepad_device_id = 0
	game.gamepad_mode_active = true
	game.gamepad_move = Vector2(0.84, 0.0)
	if not _expect(game._read_move_input().x > 0.80, "left gamepad stick must drive the real movement input vector"):
		return
	game.gamepad_move = Vector2.ZERO
	var gamepad_start := InputEventJoypadButton.new()
	gamepad_start.device = 0
	gamepad_start.button_index = JOY_BUTTON_START
	gamepad_start.pressed = true
	game._unhandled_input(gamepad_start)
	if not _expect(game.paused_game and game.gamepad_mode_active, "gamepad Start must pause the real game and switch the input hint"):
		return
	game._unhandled_input(gamepad_start)
	if not _expect(not game.paused_game, "gamepad Start must resume a paused raid"):
		return
	game.gamepad_device_id = -1
	game.gamepad_mode_active = false
	game.gamepad_move = Vector2.ZERO
	game.gamepad_aim = Vector2.ZERO
	game.gamepad_fire_held = false
	game._update_input_hint()
	game.sound_enabled = false

	print("RUNTIME_STAGE: reactive operator rim lighting")
	if not _expect(is_instance_valid(game.operator_rim_light), "operator must create one live cinematic rim light"):
		return
	if not _expect(game.operator_rim_light.get_parent() == game.operator_rig and game.local_lights.has(game.operator_rim_light) and not game.operator_rim_light.shadow_enabled, "operator rim light must follow the animated suit and use the shared shadowless light budget"):
		return
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	if not _expect(game.operator_rim_light.visible, "cinematic profile must enable the operator rim light"):
		return
	var saved_rim_energy: float = game.operator_rim_light.light_energy
	var saved_rim_color: Color = game.operator_rim_light.light_color
	var saved_lighting_health: float = game.player_health
	var saved_lighting_shift: float = game.null_shift_timer
	var saved_lighting_dash: float = game.dash_timer
	var saved_lighting_position: Vector3 = game.player.global_position
	var saved_lane_states: Array[String] = []
	for lane in game.phase_lanes:
		saved_lane_states.append(str(lane.get("state", "safe")))
		lane["state"] = "safe"
	# Lane 0 is positioned at z = -8.2; place the operator inside its actual influence.
	game.player.global_position = Vector3(-19.0, 0.82, -8.2)
	game.player_health = game.player_max_health
	game.null_shift_timer = 0.0
	game.dash_timer = 0.0
	game._update_operator_lighting(1.0)
	var calm_rim_energy: float = game.operator_rim_light.light_energy
	var warning_lane: Dictionary = game.phase_lanes[0]
	warning_lane["state"] = "warning"
	game.phase_lanes[0] = warning_lane
	game._update_operator_lighting(1.0)
	var operator_warning_color: Color = game.operator_rim_light.light_color
	if not _expect(game.operator_rim_light.light_energy > calm_rim_energy and (operator_warning_color.r > 0.35 or operator_warning_color.g > 0.7), "nearby charging conduit must warm and brighten the operator rim"):
		return
	var active_lane: Dictionary = game.phase_lanes[0]
	active_lane["state"] = "active"
	game.phase_lanes[0] = active_lane
	game._update_operator_lighting(1.0)
	if not _expect(game.operator_rim_light.light_energy > calm_rim_energy and game.operator_rim_light.light_color.r > game.operator_rim_light.light_color.g, "active conduit must produce a stronger red danger rim"):
		return
	game.phase_lanes[0]["state"] = "safe"
	game.null_shift_timer = 0.9
	game._update_operator_lighting(1.0)
	if not _expect(game.operator_rim_light.light_energy > calm_rim_energy and game.operator_rim_light.light_color.b > game.operator_rim_light.light_color.r, "NULL SHIFT must intensify and recolour the operator rim violet"):
		return
	game.null_shift_timer = 0.0
	game.dash_timer = game.DASH_DURATION
	game._update_operator_lighting(1.0)
	if not _expect(game.operator_rim_light.light_color.g > 0.9 and game.operator_rim_light.light_color.b > 0.9, "dash must briefly lift the rim toward a cool white highlight"):
		return
	game.performance_quality = true
	game._apply_quality_mode()
	if not _expect(not game.operator_rim_light.visible, "performance profile must turn off the operator rim light"):
		return
	game.performance_quality = false
	game.adaptive_quality_degraded = true
	game._apply_quality_mode()
	if not _expect(not game.operator_rim_light.visible, "adaptive degraded profile must turn off the operator rim light"):
		return
	game.adaptive_quality_degraded = false
	game.cinematic_quality = true
	game._apply_quality_mode()
	game.player.global_position = saved_lighting_position
	game.player_health = saved_lighting_health
	game.null_shift_timer = saved_lighting_shift
	game.dash_timer = saved_lighting_dash
	for lane_index in range(game.phase_lanes.size()):
		var lane_restore: Dictionary = game.phase_lanes[lane_index]
		lane_restore["state"] = saved_lane_states[lane_index]
		game.phase_lanes[lane_index] = lane_restore
	game.operator_rim_light.light_energy = saved_rim_energy
	game.operator_rim_light.light_color = saved_rim_color
	game._update_operator_lighting(0.016)

	print("RUNTIME_STAGE: live 3D objective beacon route guidance")
	if not _expect(is_instance_valid(game.objective_beacon) and is_instance_valid(game.objective_beacon_beam) and is_instance_valid(game.objective_beacon_ring) and is_instance_valid(game.objective_beacon_top_ring) and is_instance_valid(game.objective_beacon_core) and is_instance_valid(game.objective_beacon_light), "procedural objective beacon must create its beam, two rings, signal core and light"):
		return
	var beacon_saved_terminal: bool = game.terminal_unlocked
	var beacon_saved_core: bool = game.core_secured
	var beacon_saved_player_position: Vector3 = game.player.global_position
	var beacon_saved_motion: bool = game.reduced_motion
	game.reduced_motion = false
	game.terminal_unlocked = false
	game.core_secured = false
	game.player.global_position = Vector3(-19.0, 0.82, 10.2)
	game._update_objective_beacon(0.10)
	if not _expect(game.objective_beacon_stage == "terminal" and game.objective_beacon_target == game.terminal, "first objective beacon stage must point at the security terminal"):
		return
	if not _expect(game.objective_beacon_ring.material_override == game.materials["cyan"] and game.objective_beacon_beam.visible, "terminal beacon must use cyan and show its vertical beam at a distance"):
		return
	var beacon_child_count: int = game.objective_beacon.get_child_count()
	var pulse_scale_before: Vector3 = game.objective_beacon_ring.scale
	game._update_objective_beacon(0.42)
	if not _expect(not game.objective_beacon_ring.scale.is_equal_approx(pulse_scale_before), "objective floor ring must pulse with a real frame-time update"):
		return
	game.player.global_position = game.terminal.global_position + Vector3(0.0, 0.82, 2.0)
	game._update_objective_beacon(0.016)
	if not _expect(not game.objective_beacon_beam.visible and game.objective_beacon_ring.visible, "vertical beacon beam must clear away at close range while retaining the interaction ring"):
		return
	game.player.global_position = beacon_saved_player_position
	game.terminal_unlocked = true
	game._update_objective_beacon(0.016)
	if not _expect(game.objective_beacon_stage == "core" and game.objective_beacon_target == game.quantum_core and game.objective_beacon_ring.material_override == game.materials["gold"], "successful hack must retarget and recolour the beacon for the quantum core"):
		return
	game.core_secured = true
	game._update_objective_beacon(0.016)
	if not _expect(game.objective_beacon_stage == "extraction" and game.objective_beacon_target == game.extraction and game.objective_beacon_ring.material_override == game.materials["objective_exit"], "securing the core must retarget the beacon to extraction with its green stage colour"):
		return
	game._update_objective_beacon(0.016)
	if not _expect(game.objective_beacon.get_child_count() == beacon_child_count, "live beacon updates must reuse one fixed set of meshes without creating runtime nodes"):
		return
	game.terminal_unlocked = beacon_saved_terminal
	game.core_secured = beacon_saved_core
	game.reduced_motion = beacon_saved_motion
	game.player.global_position = beacon_saved_player_position
	game._update_objective_beacon(0.016)

	print("RUNTIME_STAGE: live objective compass and mission progression")
	if not _expect(is_instance_valid(game.objective_compass_arrow) and is_instance_valid(game.objective_compass_text), "objective compass arrow and label must instantiate"):
		return
	var compass_saved_terminal: bool = game.terminal_unlocked
	var compass_saved_core: bool = game.core_secured
	game.terminal_unlocked = false
	game.core_secured = false
	game._update_objective_compass(0.016)
	if not _expect(game.objective_compass_text.text.contains("ТЕРМИНАЛ"), "first compass stage must point to the security terminal"):
		return
	game.terminal_unlocked = true
	game._update_objective_compass(0.016)
	if not _expect(game.objective_compass_text.text.contains("КВАНТОВОЕ ЯДРО"), "successful hack must change the compass to the quantum core"):
		return
	game.core_secured = true
	game._update_objective_compass(0.016)
	if not _expect(game.objective_compass_text.text.contains("ЭВАКУАЦИЯ") and absf(game.objective_compass_arrow.rotation) < 10.0, "secured core must point toward extraction with a finite, animated direction"):
		return
	game.terminal_unlocked = compass_saved_terminal
	game.core_secured = compass_saved_core

	print("RUNTIME_STAGE: cinematic vignette response")
	if not _expect(is_instance_valid(game.cinematic_vignette) and is_instance_valid(game.cinematic_vignette_material), "cinematic vignette must be a real screen-space shader layer"):
		return
	if not _expect(game.cinematic_vignette.mouse_filter == Control.MOUSE_FILTER_IGNORE and game.cinematic_vignette.visible, "vignette must not intercept input and must remain enabled"):
		return
	var vignette_saved_health: float = game.player_health
	var vignette_saved_shift: float = game.null_shift_timer
	game.player_health = 20.0
	game.null_shift_timer = 0.0
	game._update_cinematic_vignette()
	if not _expect(float(game.cinematic_vignette_material.get_shader_parameter("danger")) > 0.5, "critical health must intensify the screen-space danger vignette"):
		return
	game.player_health = vignette_saved_health
	game.null_shift_timer = 1.0
	game._update_cinematic_vignette()
	if not _expect(is_equal_approx(float(game.cinematic_vignette_material.get_shader_parameter("phase_shift")), 1.0), "NULL SHIFT phase must tint the vignette with the phase colour"):
		return
	game.null_shift_timer = vignette_saved_shift
	game._update_cinematic_vignette()

	print("RUNTIME_STAGE: cinematic screen-space impact wave")
	var saved_wave_timer: float = game.impact_wave_timer
	var saved_wave_duration: float = game.impact_wave_duration
	var saved_wave_strength: float = game.impact_wave_strength
	var saved_wave_motion: bool = game.reduced_motion
	game.reduced_motion = false
	game.impact_wave_timer = 0.0
	game.impact_wave_strength = 0.0
	game._screen_impulse(0.24, 0.30)
	game._update_cinematic_vignette()
	var wave_initial_strength: float = float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_strength"))
	if not _expect(wave_initial_strength > 0.3 and is_equal_approx(float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_progress")), 0.0), "screen-space impact wave must start from the centre with a real nonzero shader strength"):
		return
	game.impact_wave_timer = game.impact_wave_duration * 0.5
	game._update_cinematic_vignette()
	if not _expect(absf(float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_progress")) - 0.5) < 0.01 and float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_strength")) < wave_initial_strength, "impact wave must expand and fade according to its live timer"):
		return
	var full_motion_wave: float = float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_strength"))
	game.reduced_motion = true
	game._update_cinematic_vignette()
	if not _expect(float(game.cinematic_vignette_material.get_shader_parameter("impact_wave_strength")) < full_motion_wave * 0.11, "Reduced Motion must attenuate the cinematic wave without changing combat timing"):
		return
	game.reduced_motion = saved_wave_motion
	game.impact_wave_timer = saved_wave_timer
	game.impact_wave_duration = saved_wave_duration
	game.impact_wave_strength = saved_wave_strength
	game._update_cinematic_vignette()

	print("RUNTIME_STAGE: cinematic camera response and incoming-damage direction")
	if not _expect(is_instance_valid(game.damage_direction_root) and is_instance_valid(game.damage_direction_arrow), "directional damage indicator must instantiate as a native HUD control"):
		return
	var saved_fov: float = game.camera.fov
	var saved_shift_timer: float = game.null_shift_timer
	var saved_recoil: float = game.weapon_recoil
	var saved_velocity: Vector3 = game.player.velocity
	game.null_shift_timer = 1.0
	game.weapon_recoil = 0.0
	game.player.velocity = Vector3.ZERO
	game._update_camera(0.12)
	if not _expect(game.camera.fov > saved_fov, "NULL SHIFT must smoothly widen the cinematic camera FOV"):
		return
	game.null_shift_timer = 0.0
	for _settle in range(12):
		game._update_camera(0.12)
	if not _expect(absf(game.camera.fov - 49.0) < 0.25, "camera FOV must smoothly return to baseline after the shift"):
		return
	game.null_shift_timer = saved_shift_timer
	game.weapon_recoil = saved_recoil
	game.player.velocity = saved_velocity
	var direction_guard: Node3D = game.guards[0]["node"]
	var saved_guard_position: Vector3 = direction_guard.global_position
	var saved_health_direction: float = game.player_health
	var saved_damage_cooldown: float = game.damage_cooldown
	game.damage_cooldown = 0.0
	game.null_shift_timer = 0.0
	direction_guard.global_position = game.player.global_position + Vector3(0.0, 0.0, -4.0)
	game._damage_player(5.0, direction_guard)
	game._update_damage_direction_ui()
	if not _expect(game.damage_direction_timer > 0.0 and game.damage_direction_root.visible, "incoming hostile damage must show a fading direction marker"):
		return
	if not _expect(game.damage_direction_arrow.position.distance_to(game.get_viewport().get_visible_rect().size * 0.5) > 50.0, "damage arrow must anchor to the viewport edge, not the screen centre"):
		return
	game.damage_direction_timer = 0.0
	game._update_damage_direction_ui()
	if not _expect(not game.damage_direction_root.visible, "damage direction marker must hide when its timer expires"):
		return
	game.player_health = saved_health_direction
	game.damage_cooldown = saved_damage_cooldown
	game.damage_direction_source = null
	direction_guard.global_position = saved_guard_position
	game._update_hud()

	print("RUNTIME_STAGE: assisted targeting and projected lock reticle")
	if not _expect(is_instance_valid(game.target_lock_root) and is_instance_valid(game.target_lock_health_bar), "target lock reticle and live target health bar must instantiate"):
		return
	var lock_guard: Node3D = game.guards[0]["node"]
	var lock_saved_position: Vector3 = lock_guard.global_position
	var lock_saved_camera_transform: Transform3D = game.camera.global_transform
	lock_guard.global_position = game.player.global_position + Vector3(0.0, 0.0, -4.0)
	await process_frame
	# Aim the camera directly at the seeded test target so headless window size and camera easing
	# cannot clip the projected lock marker against the viewport edge.
	game.camera.global_position = lock_guard.global_position + Vector3(0.0, 8.0, 12.0)
	game.camera.look_at(lock_guard.global_position + Vector3.UP * 2.25, Vector3.UP)
	game.camera.force_update_transform()
	var lock_anchor: Vector3 = lock_guard.global_position + Vector3.UP * 2.25
	game.aim_target_node = lock_guard
	game._update_target_lock_ui(0.016)
	if not _expect(game.target_lock_root.visible and game.target_lock_brackets.size() == 8, "visible hostile must produce a smoothed eight-corner screen-space target marker"):
		return
	if not _expect(game.target_lock_label.text.contains(str(game.guards[0]["role"])) and is_equal_approx(game.target_lock_health_bar.value, float(game.guards[0]["hp"])), "target identity and health must reflect the live hostile state"):
		return
	game.aim_target_node = null
	game._update_target_lock_ui(0.016)
	if not _expect(not game.target_lock_root.visible, "target marker must disappear when there is no selected hostile"):
		return
	game.camera.global_transform = lock_saved_camera_transform
	lock_guard.global_position = lock_saved_position

	print("RUNTIME_STAGE: tactical radar mapping and live entity feed")
	if not _expect(is_instance_valid(game.tactical_radar_panel) and is_instance_valid(game.tactical_radar_map), "tactical radar panel and drawing canvas must instantiate"):
		return
	var radar_map: Control = game.tactical_radar_map
	if not _expect(radar_map.get_script() != null and radar_map.get_script().resource_path.ends_with("tactical_radar.gd"), "radar must use engine-backed GDScript"):
		return
	var radar_area := Rect2(Vector2(8.0, 6.0), Vector2(200.0, 100.0))
	var radar_nw: Vector2 = radar_map.call("world_to_radar", Vector3(-24.5, 0.0, -15.5), radar_area)
	var radar_se: Vector2 = radar_map.call("world_to_radar", Vector3(24.5, 0.0, 15.5), radar_area)
	if not _expect(radar_nw.is_equal_approx(radar_area.position) and radar_se.is_equal_approx(radar_area.position + radar_area.size), "radar projection must map arena bounds to exact display bounds"):
		return
	var radar_clamped: Vector2 = radar_map.call("world_to_radar", Vector3(900.0, 0.0, -900.0), radar_area)
	if not _expect(radar_clamped.x <= radar_area.end.x and radar_clamped.y >= radar_area.position.y, "radar markers must stay within the map rectangle"):
		return
	var active_color: Color = radar_map.call("state_color", "active")
	var warning_color: Color = radar_map.call("state_color", "warning")
	if not _expect(active_color.r > active_color.g and warning_color.r > warning_color.g, "radar hazard states must use critical/warning colors"):
		return
	if not _expect(game.devices.size() == 3 and game.guards.size() >= 3, "radar must receive live combatants and destructible devices"):
		return
	radar_map.queue_redraw()

	print("RUNTIME_STAGE: phase-conduit warning, hazard and dodge")
	if not _expect(game.phase_lanes.size() == 3 and is_instance_valid(game.hazard_status_label), "three timed energy lanes and a HUD status label must instantiate"):
		return
	if not _expect(game.phase_lane_labels.size() == 3 and is_instance_valid(game.phase_lane_status_row), "three per-lane HUD indicators must instantiate"):
		return
	if not _expect(is_instance_valid(game.health_bar) and is_instance_valid(game.health_bar_fill), "premium health bar and its stateful fill material must instantiate"):
		return
	var hud_saved_health: float = game.player_health
	var hud_saved_max_health: float = game.player_max_health
	game.player_max_health = 100.0
	game.player_health = 70.0
	game._update_hud()
	if not _expect(is_equal_approx(game.health_bar.value, 70.0) and game.health_bar_fill.bg_color.g > 0.8, "health UI must show a live numeric value and healthy-state colour"):
		return
	game.player_health = 20.0
	game._update_hud()
	if not _expect(is_equal_approx(game.health_bar.value, 20.0) and game.health_bar_fill.bg_color.g < 0.3, "low health must update the live bar and switch to critical red"):
		return
	game.player_health = hud_saved_health
	game.player_max_health = hud_saved_max_health
	game._update_hud()
	var lane_saved_position: Vector3 = game.player.global_position
	var lane_saved_health: float = game.player_health
	game.phase_clock = 5.8
	game._update_phase_lanes(0.0)
	var first_lane: Dictionary = game.phase_lanes[0]
	if not _expect(first_lane["state"] == "warning" and first_lane["warning_mesh"].visible and not first_lane["active_mesh"].visible, "energy lane must visibly warn before activating"):
		return
	if not _expect(is_instance_valid(first_lane["pulse_head"]) and is_instance_valid(first_lane["pulse_ring"]) and is_instance_valid(first_lane["pulse_wake"]) and first_lane["pulse_rig"].visible, "warning phase must show the moving 3D surge head, ring and wake"):
		return
	var lane_light: OmniLight3D = first_lane["pulse_light"] as OmniLight3D
	if not _expect(is_instance_valid(lane_light) and lane_light.visible and lane_light.light_color.g > lane_light.light_color.b and lane_light.light_energy > 0.8, "charging energy conduit must cast a moving amber warning light"):
		return
	var pulse_start_x: float = first_lane["pulse_head"].position.x
	game.phase_clock = 5.95
	game._update_phase_lanes(0.0)
	first_lane = game.phase_lanes[0]
	if not _expect(float(first_lane["pulse_head"].position.x) > pulse_start_x and first_lane["pulse_wake"].position.x < first_lane["pulse_head"].position.x, "energy surge must travel down the conduit with a trailing wake"):
		return
	if not _expect(game.phase_lane_labels[0].text.contains("ЗАРЯД"), "lane HUD chip must reflect the charging state"):
		return
	if not _expect(game.hazard_status_label.text.contains("ЗАРЯЖАЕТСЯ"), "HUD must report an approaching energy discharge"):
		return
	game.phase_clock = 6.6
	game._update_phase_lanes(0.0)
	first_lane = game.phase_lanes[0]
	if not _expect(first_lane["state"] == "active" and first_lane["active_mesh"].visible and not first_lane["warning_mesh"].visible, "warning lane must transition into the damaging phase"):
		return
	if not _expect(first_lane["pulse_rig"].visible and first_lane["pulse_head"].material_override == first_lane["active_material"] and game.phase_lane_labels[0].text.contains("ОПАСНО"), "active phase must recolour the moving surge and the per-lane HUD warning"):
		return
	lane_light = first_lane["pulse_light"] as OmniLight3D
	if not _expect(lane_light.visible and lane_light.light_color.r > lane_light.light_color.g and lane_light.light_energy > 1.35 and is_equal_approx(lane_light.position.x, first_lane["pulse_head"].position.x), "active surge must move a stronger red point light with its 3D head"):
		return
	game.player.global_position = Vector3(0.0, 0.82, float(first_lane["z"]))
	game.damage_cooldown = 0.0
	game.null_shift_timer = 0.0
	if not _expect(game._check_phase_lane_damage() and game.player_health < lane_saved_health, "standing in an active lane must inflict real player damage"):
		return
	var injured_health: float = game.player_health
	game.damage_cooldown = 0.0
	game.player.global_position.z = float(first_lane["z"]) + 3.0
	if not _expect(not game._check_phase_lane_damage() and is_equal_approx(game.player_health, injured_health), "leaving the active lane must avoid further damage"):
		return
	game.damage_cooldown = 0.0
	game.player.global_position.z = float(first_lane["z"])
	game.null_shift_timer = 1.0
	if not _expect(not game._check_phase_lane_damage() and is_equal_approx(game.player_health, injured_health), "NULL shift must protect the operator from the energy lane"):
		return
	game.null_shift_timer = 0.0
	game.damage_cooldown = 0.0
	print("RUNTIME_STAGE: pulse suppression of live energy conduit")
	game.player.global_position = Vector3(0.0, 0.82, float(first_lane["z"]))
	game.phase_clock = 6.6
	game.pulse_cooldown = 0.0
	game._update_phase_lanes(0.0)
	first_lane = game.phase_lanes[0]
	var disruptions_before: int = game.phase_lane_disruptions
	game._deploy_pulse()
	if not _expect(not game.ring_effects.is_empty(), "pulse suppression feedback must use the reusable ring-effect pool"):
		return
	var pulse_effect_ring: MeshInstance3D = game.ring_effects[game.ring_effects.size() - 1]["node"]
	game._update_phase_lanes(0.0)
	first_lane = game.phase_lanes[0]
	if not _expect(first_lane["state"] == "disrupted" and not first_lane["active_mesh"].visible and first_lane["pulse_head"].material_override == game.materials["cyan"], "tactical pulse must suppress a nearby active conduit and recolour its 3D surge cyan"):
		return
	lane_light = first_lane["pulse_light"] as OmniLight3D
	if not _expect(lane_light.visible and lane_light.light_color.g > lane_light.light_color.r and lane_light.light_energy < 0.9, "pulse suppression must switch the local conduit light to a restrained cyan response"):
		return
	if not _expect(game.phase_lane_disruptions == disruptions_before + 1 and game.phase_lane_labels[0].text.contains("ПОДАВЛЕН") and game.hazard_status_label.text.contains("КОНТУР ПОДАВЛЕН"), "lane suppression must update lifetime telemetry and both HUD state indicators"):
		return
	var health_during_suppression: float = game.player_health
	game.damage_cooldown = 0.0
	if not _expect(not game._check_phase_lane_damage() and is_equal_approx(game.player_health, health_during_suppression), "a suppressed conduit must stop dealing damage during the disruption window"):
		return
	first_lane["disruption_remaining"] = 0.01
	game.phase_lanes[0] = first_lane
	game._update_phase_lanes(0.02)
	first_lane = game.phase_lanes[0]
	if not _expect(first_lane["state"] == "active" and first_lane["active_mesh"].visible, "the conduit must resume its timed hazard after the pulse disruption expires"):
		return
	if not _expect((first_lane["pulse_light"] as OmniLight3D).light_color.r > (first_lane["pulse_light"] as OmniLight3D).light_color.g, "expired disruption must restore the red active-light state"):
		return
	for ring_index in range(game.ring_effects.size() - 1, -1, -1):
		var ring_state: Dictionary = game.ring_effects[ring_index]
		if ring_state["node"] == pulse_effect_ring:
			ring_state["remaining"] = 0.0
			game.ring_effects[ring_index] = ring_state
	game._update_effect_expiry(0.0)
	game.phase_lane_disruptions = disruptions_before
	for lane_index in range(game.phase_lanes.size()):
		var reset_lane: Dictionary = game.phase_lanes[lane_index]
		reset_lane["disruption_remaining"] = 0.0
		game.phase_lanes[lane_index] = reset_lane
	game.pulse_cooldown = 0.0
	game.damage_cooldown = 0.0
	game.player.global_position = lane_saved_position
	game.player_health = lane_saved_health
	game.phase_clock = 0.0
	game._update_phase_lanes(0.0)

	print("RUNTIME_STAGE: live frame-budget diagnostics")
	var saved_diagnostics_enabled: bool = game.diagnostics_enabled
	var saved_frame_samples: Array[float] = game.frame_samples.duplicate()
	var saved_budget_samples: Array[float] = game.frame_budget_misses.duplicate()
	game.diagnostics_enabled = true
	game.frame_samples.clear()
	game.frame_samples.append(10.0)
	game.frame_samples.append(17.0)
	game.frame_samples.append(29.0)
	game.frame_budget_misses.clear()
	game.frame_budget_misses.append(0.0)
	game.frame_budget_misses.append(1.0)
	game.frame_budget_misses.append(1.0)
	game._update_hud()
	if not _expect(game.diagnostics_label.text.contains("60 FPS MISSES") and game.diagnostics_label.text.contains("PROCESS CPU") and game.diagnostics_label.text.contains("PHYSICS CPU") and game.diagnostics_label.text.contains("DRAW / TRI / NODES"), "live diagnostics must expose frame-budget misses, process/physics timing, draw calls, primitives and scene nodes"):
		return
	game.diagnostics_enabled = saved_diagnostics_enabled
	game.frame_samples = saved_frame_samples
	game.frame_budget_misses = saved_budget_samples
	game._update_hud()

	print("RUNTIME_STAGE: adaptive graphics quality")
	game.cinematic_quality = true
	game.adaptive_quality_level = 0
	game.adaptive_quality_degraded = false
	game.adaptive_slow_windows = 0
	game.adaptive_fast_windows = 0
	game._apply_quality_mode()
	if not _expect(is_instance_valid(game.atmosphere_particles) and game.atmosphere_particles.emitting and game.atmosphere_particles.amount == 72, "cinematic profile must enable the high-quality suspended dust field"):
		return
	game._evaluate_adaptive_quality(25.0, 34.0)
	if not _expect(not game.adaptive_quality_degraded and game.adaptive_quality_level == 0, "adaptive quality must require sustained slow windows"):
		return
	game._evaluate_adaptive_quality(25.0, 34.0)
	if not _expect(not game.adaptive_quality_degraded and game.adaptive_quality_level == 1 and game.atmosphere_particles.amount == 46 and game.atmosphere_particles.emitting and game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled, "first optimization tier must reduce particle density while preserving the cinematic lights and glow"):
		return
	game._evaluate_adaptive_quality(25.0, 34.0)
	game._evaluate_adaptive_quality(25.0, 34.0)
	if not _expect(game.adaptive_quality_degraded and game.adaptive_quality_level == 2, "continued pressure must escalate to the hard optimization tier only after another sustained window"):
		return
	if not _expect(not game.world_environment.environment.glow_enabled and not game.key_light.shadow_enabled and not game.fill_light.visible and not game.atmosphere_particles.emitting and not game.atmosphere_particles.visible, "hard optimized profile must lower expensive cinematic effects and suspend atmospheric particles"):
		return
	for _window in range(4):
		game._evaluate_adaptive_quality(15.5, 19.5)
	if not _expect(not game.adaptive_quality_degraded and game.adaptive_quality_level == 1 and game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled and game.fill_light.visible and game.atmosphere_particles.emitting and game.atmosphere_particles.amount == 46, "first recovery tier must restore cinematic lights while retaining a reduced particle density"):
		return
	for _window in range(4):
		game._evaluate_adaptive_quality(15.5, 19.5)
	if not _expect(not game.adaptive_quality_degraded and game.adaptive_quality_level == 0 and game.atmosphere_particles.amount == 72, "continued stable frame pacing must fully restore cinematic atmosphere density"):
		return
	game.performance_quality = true
	game._apply_quality_mode()
	for lane in game.phase_lanes:
		if not _expect(not (lane["pulse_light"] as OmniLight3D).visible, "performance graphics preset must turn off travelling conduit lights"):
			return
	game.performance_quality = false
	game.cinematic_quality = true
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	game.phase_clock = 0.0
	game._update_phase_lanes(0.0)

	print("RUNTIME_STAGE: three graphics presets and touch utility buttons")
	if not _expect(is_instance_valid(game.mobile_quality_button) and is_instance_valid(game.mobile_diagnostics_button) and is_instance_valid(game.mobile_palette_button) and is_instance_valid(game.mobile_hud_scale_button) and is_instance_valid(game.mobile_haptics_button), "touch HUD must expose graphics, diagnostics and accessibility controls"):
		return
	var saved_msaa: int = game.get_viewport().msaa_3d
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_level = 0
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	if not _expect(game.get_viewport().msaa_3d == Viewport.MSAA_4X and game.key_light.directional_shadow_max_distance == 48.0, "Cinematic preset must request 4x MSAA and full shadows"):
		return
	game.cinematic_quality = false
	game.performance_quality = false
	game._apply_quality_mode()
	if not _expect(game.get_viewport().msaa_3d == Viewport.MSAA_2X and game.key_light.directional_shadow_max_distance == 34.0, "Balanced preset must request 2x MSAA and shorter shadows"):
		return
	game.performance_quality = true
	game._apply_quality_mode()
	if not _expect(game.get_viewport().msaa_3d == Viewport.MSAA_DISABLED and not game.key_light.shadow_enabled, "Performance preset must disable MSAA and dynamic shadows"):
		return
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_level = 0
	game.adaptive_quality_degraded = false
	game.get_viewport().msaa_3d = saved_msaa
	game._apply_quality_mode()
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(not game.cinematic_quality and not game.performance_quality and not game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled and game.fill_light.visible and game.atmosphere_particles.emitting and game.atmosphere_particles.amount == 32, "first quality tap must select balanced mode and retain useful lighting/shadows with a lighter atmosphere"):
		return
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(not game.cinematic_quality and game.performance_quality and not game.key_light.shadow_enabled and not game.fill_light.visible and not game.atmosphere_particles.emitting and game.atmosphere_particles.amount == 8, "second quality tap must select performance mode and disable expensive dynamic lighting and atmosphere"):
		return
	if not _expect(bool(game.career.get_value("settings", "performance_quality", false)), "performance mode must persist across sessions"):
		return
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(game.cinematic_quality and not game.performance_quality and game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled and game.atmosphere_particles.emitting and game.atmosphere_particles.amount == 72, "third quality tap must return to cinematic lighting and full atmosphere density"):
		return
	game.mobile_diagnostics_button.emit_signal("pressed")
	if not _expect(game.diagnostics_enabled and game.diagnostics_label.visible and game.mobile_diagnostics_button.text == "FPS+", "touch diagnostics button must reveal live FPS/telemetry"):
		return
	game.mobile_diagnostics_button.emit_signal("pressed")
	if not _expect(not game.diagnostics_enabled and not game.diagnostics_label.visible, "touch diagnostics button must hide telemetry when toggled off"):
		return

	print("RUNTIME_STAGE: reduced-motion accessibility setting")
	if not _expect(is_instance_valid(game.mobile_motion_button), "touch HUD must expose a reduced-motion control"):
		return
	var saved_reduced_motion: bool = game.reduced_motion
	var saved_motion_velocity: Vector3 = game.player.velocity
	var saved_motion_aim: Vector3 = game.player_aim
	var saved_motion_fov: float = game.camera.fov
	var saved_null_shift_timer: float = game.null_shift_timer
	var saved_camera_shake_strength: float = game.camera_shake_strength
	var saved_camera_shake_timer: float = game.camera_shake_timer
	var saved_camera_shake_duration: float = game.camera_shake_duration
	var saved_motion_recoil: float = game.weapon_recoil
	game.reduced_motion = false
	game.player.velocity = Vector3(7.4, 0.0, 0.0)
	game.player_aim = Vector3.FORWARD
	game.null_shift_timer = 0.0
	game.weapon_recoil = 0.0
	game.camera.fov = game.CAMERA_BASE_FOV
	game._update_camera(1.0)
	var full_motion_fov_change: float = absf(game.camera.fov - game.CAMERA_BASE_FOV)
	game.camera_shake_strength = 0.0
	game.camera_shake_timer = 0.0
	game.camera_shake_duration = 0.0
	game._screen_impulse(1.0, 0.5)
	var full_motion_shake: float = game.camera_shake_strength
	game._toggle_reduced_motion()
	if not _expect(game.reduced_motion and game.mobile_motion_button.text == "MOT LOW", "motion toggle must enter the low-motion state and update its label"):
		return
	if not _expect(bool(game.career.get_value("settings", "reduced_motion", false)), "reduced-motion preference must persist to the career settings"):
		return
	if not _expect(is_equal_approx(game.camera_shake_strength, 0.0) and is_equal_approx(game.camera_shake_timer, 0.0), "enabling reduced motion must immediately clear any active camera shake"):
		return
	game._screen_impulse(1.0, 0.5)
	var reduced_motion_shake: float = game.camera_shake_strength
	if not _expect(reduced_motion_shake < full_motion_shake * 0.15, "reduced motion must cut camera shake to a subtle fraction"):
		return
	game.camera.fov = game.CAMERA_BASE_FOV
	game._update_camera(1.0)
	var reduced_motion_fov_change: float = absf(game.camera.fov - game.CAMERA_BASE_FOV)
	if not _expect(full_motion_fov_change > 1.0 and reduced_motion_fov_change < full_motion_fov_change * 0.25, "reduced motion must suppress cinematic field-of-view breathing"):
		return
	if not _expect(is_equal_approx(float(game.cinematic_vignette_material.get_shader_parameter("motion_reduction")), 1.0), "vignette shader must stop its periodic pulse in reduced-motion mode"):
		return
	game.mobile_motion_button.emit_signal("pressed")
	if not _expect(not game.reduced_motion and game.mobile_motion_button.text == "MOT ON" and is_equal_approx(float(game.cinematic_vignette_material.get_shader_parameter("motion_reduction")), 0.0), "touch control must restore full visual motion and shader pulse"):
		return
	game.reduced_motion = saved_reduced_motion
	game.career.set_value("settings", "reduced_motion", saved_reduced_motion)
	game._save_career()
	game._update_reduced_motion_ui()
	game._update_cinematic_vignette()
	game.player.velocity = saved_motion_velocity
	game.player_aim = saved_motion_aim
	game.null_shift_timer = saved_null_shift_timer
	game.camera.fov = saved_motion_fov
	game.camera_shake_strength = saved_camera_shake_strength
	game.camera_shake_timer = saved_camera_shake_timer
	game.camera_shake_duration = saved_camera_shake_duration
	game.weapon_recoil = saved_motion_recoil
	game.performance_quality = false
	game.cinematic_quality = true
	game._apply_quality_mode()

	if not _expect(is_instance_valid(game.player), "operator must instantiate"):
		return
	if not _expect(is_instance_valid(game.operator_rig), "operator rig must instantiate"):
		return
	if not _expect(is_instance_valid(game.operator_suit) and game.operator_rig.get_node_or_null("OperatorHelmet") != null, "operator helmet and armor must instantiate"):
		return
	if not _expect(game.operator_leg_pivots.size() == 2, "operator must have two animated leg pivots"):
		return
	if not _expect(is_instance_valid(game.muzzle_flash) and is_instance_valid(game.muzzle_light) and not game.muzzle_flash.visible, "weapon muzzle flash and light must exist in the idle state"):
		return
	game.player.velocity = Vector3(3.0, 0.0, 0.0)
	game.player_aim = Vector3.RIGHT
	game._trigger_muzzle_flash()
	game._animate_world(0.016)
	if not _expect(game.muzzle_flash.visible and game.muzzle_flash_timer > 0.0 and game.weapon_recoil > 0.0, "weapon fire feedback must trigger a live muzzle flash and recoil"):
		return
	if not _expect(absf(game.operator_rig.rotation.y) > 0.01, "operator rig must smoothly rotate toward the aim direction"):
		return
	if not _expect(absf(game.operator_leg_pivots[0].rotation.x - game.operator_leg_pivots[1].rotation.x) > 0.01, "operator legs must animate in opposing gait phases"):
		return
	game.player.velocity = Vector3.ZERO
	game.player_aim = Vector3.FORWARD

	print("RUNTIME_STAGE: tactical operator dash, visual response and timed evade")
	if not _expect(is_instance_valid(game.mobile_dash_button) and game.mobile_action_buttons.size() == 6 and game.mobile_action_buttons[4] == game.mobile_dash_button and is_instance_valid(game.mobile_overdrive_button) and game.mobile_action_buttons[5] == game.mobile_overdrive_button, "mobile HUD must keep dash as action five and expose Overdrive as action six"):
		return
	var dash_saved_position: Vector3 = game.player.global_position
	var dash_saved_velocity: Vector3 = game.player.velocity
	var dash_saved_aim: Vector3 = game.player_aim
	var dash_saved_health: float = game.player_health
	var dash_saved_damage_cooldown: float = game.damage_cooldown
	var dash_saved_phase_timer: float = game.null_shift_timer
	var dash_saved_damage_flash: float = game.damage_flash_timer
	game.player.global_position = Vector3(-3.0, 0.82, 0.0)
	game.player.velocity = Vector3.ZERO
	game.player_aim = Vector3.RIGHT
	game.mobile_actions["up"] = false
	game.mobile_actions["down"] = false
	game.mobile_actions["left"] = false
	game.mobile_actions["right"] = false
	game.dash_timer = 0.0
	game.dash_cooldown = 0.0
	game.damage_flash_timer = 0.0
	# Let the physics server observe the teleported body before measuring motion.
	await physics_frame
	await physics_frame
	game.mobile_actions["right"] = true
	var evades_before: int = game.dash_evasions
	var dash_trails_before: int = game.dash_trails_emitted
	game._set_mobile_action("dash", true)
	if not _expect(game.dash_timer >= game.DASH_DURATION - 0.001 and game.dash_cooldown >= game.DASH_COOLDOWN - 0.001 and game.dash_direction.is_equal_approx(Vector3.RIGHT), "touch dash must start in the held movement direction and start its cooldown"):
		return
	var dash_cooldown_before: float = game.dash_cooldown
	game._try_dash()
	if not _expect(is_equal_approx(game.dash_cooldown, dash_cooldown_before), "dash cooldown must prevent a second dash exploit"):
		return
	var dash_move_origin: Vector3 = game.player.global_position
	# Exercise the real CharacterBody3D from the active physics loop, not a direct method call.
	await physics_frame
	await physics_frame
	await physics_frame
	if not _expect(game.player.global_position.x > dash_move_origin.x + 0.12, "dash must move the real CharacterBody3D during physics updates"):
		return
	if not _expect(game.dash_trails_emitted > dash_trails_before and not game.beam_effects.is_empty(), "live dash physics must emit pooled 3D afterimage ribbons behind the operator"):
		return
	game.damage_cooldown = 0.0
	game.null_shift_timer = 0.0
	game._damage_player(10.0)
	if not _expect(is_equal_approx(game.player_health, dash_saved_health) and game.dash_evasions == evades_before + 1, "dash must grant a measurable one-hit evade without subtracting health"):
		return
	game._damage_player(10.0)
	if not _expect(game.dash_evasions == evades_before + 1 and is_equal_approx(game.player_health, dash_saved_health - 10.0), "a second hit during one dash must damage the operator without adding a second evade"):
		return
	game.damage_flash_timer = 0.0
	game._update_player_material()
	if not _expect(game.operator_suit.material_override == game.materials["white"], "dash must create a visible suit flash during its active window"):
		return
	game.dash_timer = 0.0
	game.dash_cooldown = 0.0
	game.dash_evasion_registered = false
	game.mobile_actions["right"] = false
	game.player.global_position = dash_saved_position
	game.player.velocity = dash_saved_velocity
	game.player_aim = dash_saved_aim
	game.player_health = dash_saved_health
	game.damage_cooldown = dash_saved_damage_cooldown
	game.null_shift_timer = dash_saved_phase_timer
	game.damage_flash_timer = dash_saved_damage_flash
	game._update_hud()
	game._update_effect_expiry(1.0)

	print("RUNTIME_STAGE: bounded transient beam/ring pools and smooth tracer fade")
	game._update_effect_expiry(1.0)
	var beam_pool_count_before: int = game.beam_pool.size()
	game._spawn_beam(Vector3(-1.0, 1.0, 0.0), Vector3(1.0, 1.0, 0.0), game.materials["cyan"], 0.10)
	if not _expect(game.beam_pool.size() == max(1, beam_pool_count_before) and game.beam_effects.size() == 1 and (game.beam_effects[0]["node"] as MeshInstance3D).visible, "beam firing must activate an existing or newly pooled mesh without unbounded growth"):
		return
	var pooled_beam: MeshInstance3D = game.beam_effects[0]["node"] as MeshInstance3D
	var pooled_beam_mesh: ImmediateMesh = pooled_beam.mesh as ImmediateMesh
	if not _expect(is_instance_valid(pooled_beam_mesh) and pooled_beam_mesh.get_surface_count() == 2, "pooled beam must contain a crossed triangle-ribbon shell and a crisp center line"):
		return
	game._update_effect_expiry(0.05)
	if not _expect(pooled_beam.visible and pooled_beam.transparency > 0.35 and pooled_beam.transparency < 0.65, "beam opacity must fade progressively with remaining lifetime"):
		return
	game._update_effect_expiry(0.06)
	if not _expect(game.beam_effects.is_empty() and not pooled_beam.visible and is_zero_approx(pooled_beam.transparency), "expired beam must return hidden and reset transparency in the pool"):
		return
	game._spawn_beam(Vector3(-2.0, 1.0, 0.0), Vector3(2.0, 1.0, 0.0), game.materials["amber"], 0.10)
	if not _expect(game.beam_pool.size() == max(1, beam_pool_count_before) and game.beam_effects.size() == 1 and game.beam_effects[0]["node"] == pooled_beam, "successive beams must reuse the same mesh node without growing the pool"):
		return
	game._update_effect_expiry(0.11)
	var ring_pool_count_before: int = game.ring_pool.size()
	game._spawn_ring_burst(Vector3.ZERO, game.materials["amber"])
	# Earlier mechanic checks may already have populated several reusable ring nodes.
	# After the expiry flush above, a new burst must reuse the first hidden entry if one exists.
	var expected_ring_pool_count: int = max(1, ring_pool_count_before)
	if not _expect(game.ring_pool.size() == expected_ring_pool_count and game.ring_effects.size() == 1 and game.ring_pool[0].visible, "ring burst must activate a reusable pool entry without allocating unnecessarily"):
		return
	var pooled_ring: MeshInstance3D = game.ring_pool[0]
	game._update_effect_expiry(0.23)
	if not _expect(pooled_ring.scale.x > 1.0 and pooled_ring.transparency > 0.0, "ring burst must expand and fade from measured frame delta"):
		return
	game._update_effect_expiry(0.24)
	if not _expect(game.ring_effects.is_empty() and not pooled_ring.visible, "expired ring must return hidden to the pool"):
		return
	game._spawn_ring_burst(Vector3.ONE, game.materials["cyan"])
	if not _expect(game.ring_pool.size() == expected_ring_pool_count and game.ring_pool[0] == pooled_ring, "successive rings must reuse the same mesh node without growing the pool"):
		return
	game._update_effect_expiry(0.5)
	print("RUNTIME_STAGE: pooled spatial impact lighting")
	game._update_effect_expiry(1.0)
	var saved_light_cinematic: bool = game.cinematic_quality
	var saved_light_performance: bool = game.performance_quality
	var saved_light_degraded: bool = game.adaptive_quality_degraded
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	if not _expect(game.impact_light_pool.size() == 4 and game.impact_light_effects.size() == 4, "impact lights must be allocated once in a fixed four-node pool"):
		return
	for pooled_light: OmniLight3D in game.impact_light_pool:
		if not _expect(not pooled_light.visible and not pooled_light.shadow_enabled, "idle impact lights must be hidden and must never cast shadows"):
			return
	var light_cursor_before: int = game.impact_light_cursor
	game._spawn_impact_light(Vector3(1.0, 0.8, 2.0), Color(1.0, 0.55, 0.18), 2.4, 4.8, 0.16)
	var pooled_impact_light: OmniLight3D = game.impact_light_pool[light_cursor_before % game.impact_light_pool.size()]
	if not _expect(pooled_impact_light.visible and is_equal_approx(pooled_impact_light.light_energy, 2.4) and is_equal_approx(pooled_impact_light.omni_range, 4.8), "impact must illuminate the hit location with the requested real 3D light"):
		return
	if not _expect(game._active_impact_light_count() == 1 and game.effects.has(pooled_impact_light), "active impact lighting must be counted in live effect telemetry"):
		return
	game._update_effect_expiry(0.04)
	if not _expect(pooled_impact_light.visible and pooled_impact_light.light_energy < 2.4 and pooled_impact_light.light_energy > 0.0, "impact light energy must decay smoothly before expiry"):
		return
	game._update_effect_expiry(0.20)
	if not _expect(not pooled_impact_light.visible and is_zero_approx(pooled_impact_light.light_energy) and not game.effects.has(pooled_impact_light), "expired impact light must hide, reset energy and return to the reusable pool"):
		return
	var stable_impact_light_count: int = game.impact_light_pool.size()
	for flash_index in range(9):
		game._spawn_impact_light(Vector3(float(flash_index), 0.8, 0.0), Color(0.1, 0.95, 0.8), 1.8, 3.5, 0.12)
	if not _expect(game.impact_light_pool.size() == stable_impact_light_count and stable_impact_light_count == 4 and game._active_impact_light_count() == 4, "repeated impacts must reuse the fixed pool instead of allocating unbounded light nodes"):
		return
	game.performance_quality = true
	game._apply_quality_mode()
	for pooled_light: OmniLight3D in game.impact_light_pool:
		if not _expect(not pooled_light.visible, "performance profile must hide all dynamic impact lighting"):
			return
	game._update_effect_expiry(1.0)
	game.cinematic_quality = saved_light_cinematic
	game.performance_quality = saved_light_performance
	game.adaptive_quality_degraded = saved_light_degraded
	game._apply_quality_mode()
	if not _expect(game._active_impact_light_count() == 0, "impact light telemetry must return to zero after all flashes expire"):
		return

	print("RUNTIME_STAGE: bounded impact spark pool and quality density")
	game._update_effect_expiry(1.0)
	var saved_spark_cinematic: bool = game.cinematic_quality
	var saved_spark_performance: bool = game.performance_quality
	var saved_spark_degraded: bool = game.adaptive_quality_degraded
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_degraded = false
	game._spawn_hit_sparks(Vector3(0.0, 1.0, 0.0), game.materials["cyan"])
	if not _expect(game.spark_pool.size() <= 8 and game.spark_effects.size() == 1, "impact sparks must use a bounded reusable pool"):
		return
	var pooled_spark: CPUParticles3D = game.spark_effects[0]["node"]
	var spark_pool_size: int = game.spark_pool.size()
	if not _expect(pooled_spark.visible and pooled_spark.emitting and pooled_spark.amount == 14, "cinematic impacts must show the full 14-particle spark burst"):
		return
	game._update_effect_expiry(0.35)
	if not _expect(game.spark_effects.is_empty() and not pooled_spark.visible and not pooled_spark.emitting and not game.effects.has(pooled_spark), "finished impact sparks must return hidden to the pool without freeing the node"):
		return
	game._spawn_hit_sparks(Vector3(1.0, 1.0, 0.0), game.materials["amber"])
	if not _expect(game.spark_pool.size() == spark_pool_size and game.spark_effects.size() == 1 and game.spark_effects[0]["node"] == pooled_spark, "successive impact sparks must reuse the same CPUParticles3D node"):
		return
	game._update_effect_expiry(0.35)
	game.cinematic_quality = false
	game.performance_quality = false
	game._spawn_hit_sparks(Vector3.ZERO, game.materials["cyan"])
	if not _expect(pooled_spark.amount == 9, "balanced mode must reduce impact particle density to 9"):
		return
	game._update_effect_expiry(0.35)
	game.performance_quality = true
	game._spawn_hit_sparks(Vector3.ZERO, game.materials["amber"])
	if not _expect(pooled_spark.amount == 5, "performance mode must reduce impact particle density to 5"):
		return
	game._update_effect_expiry(0.35)
	game.cinematic_quality = saved_spark_cinematic
	game.performance_quality = saved_spark_performance
	game.adaptive_quality_degraded = saved_spark_degraded
	game._apply_quality_mode()
	if not _expect(game.guards[0].get("role", "") == "STALKER" and game.guards[1].get("role", "") == "HEAVY" and game.guards[2].get("role", "") == "RANGER", "enemy archetypes must be distinct"):
		return

	# Exercise the Stalker's full telegraph -> dash-start -> movement transition.
	# New perception AI only telegraphs after an actual forward-cone/LOS contact.
	var stalker_saved_player_position: Vector3 = game.player.global_position
	var stalker_saved_squad_position: Vector3 = game.squad_alert_position
	var stalker_saved_squad_timer: float = game.squad_alert_timer
	var stalker_saved_squad_serial: int = game.squad_alert_serial
	var stalker_saved_states: Array[Dictionary] = []
	var stalker_saved_positions: Array[Vector3] = []
	var stalker_saved_rotations: Array[Vector3] = []
	var stalker_saved_tags: Array[Dictionary] = []
	for guard_entry in game.guards:
		stalker_saved_states.append((guard_entry as Dictionary).duplicate(true))
		var saved_body: CharacterBody3D = guard_entry["node"] as CharacterBody3D
		stalker_saved_positions.append(saved_body.global_position)
		stalker_saved_rotations.append(saved_body.global_rotation)
		var saved_tag: Label3D = guard_entry.get("role_tag") as Label3D
		stalker_saved_tags.append({"text": saved_tag.text, "modulate": saved_tag.modulate} if is_instance_valid(saved_tag) else {})
	game.player.global_position = Vector3(-2.0, 0.82, 6.0)
	var stalker_state: Dictionary = game.guards[0]
	var stalker_body: CharacterBody3D = stalker_state["node"]
	var stalker_origin: Vector3 = stalker_body.global_position
	stalker_body.global_position = game.player.global_position + Vector3(0.0, 0.0, -8.0)
	stalker_body.look_at(game.player.global_position, Vector3.UP)
	await physics_frame
	stalker_state["stun"] = 0.0
	stalker_state["windup"] = 0.0
	stalker_state["dash_windup"] = 0.0
	stalker_state["dash_timer"] = 0.0
	stalker_state["dash_cooldown"] = 0.01
	game.guards[0] = stalker_state
	game.guards[1]["cooldown"] = 12.0
	game.guards[2]["cooldown"] = 12.0
	game._update_guards(0.016)
	stalker_state = game.guards[0]
	if not _expect(float(stalker_state["dash_windup"]) > 0.0, "Stalker must telegraph before its dash"):
		return
	stalker_state["dash_windup"] = 0.01
	game.guards[0] = stalker_state
	var stalker_dash_origin: Vector3 = stalker_body.global_position
	game._update_guards(0.02)
	stalker_state = game.guards[0]
	if not _expect(float(stalker_state["dash_timer"]) > 0.0, "Stalker telegraph must transition into a dash"):
		return
	game._update_guards(0.04)
	if not _expect(stalker_body.global_position.distance_to(stalker_dash_origin) > 0.01, "Stalker dash must move the 3D body"):
		return
	game.player.global_position = stalker_saved_player_position
	for restore_index in range(stalker_saved_states.size()):
		var restore_state: Dictionary = stalker_saved_states[restore_index]
		var restore_body: CharacterBody3D = restore_state["node"] as CharacterBody3D
		restore_body.global_position = stalker_saved_positions[restore_index]
		restore_body.global_rotation = stalker_saved_rotations[restore_index]
		restore_body.velocity = Vector3.ZERO
		var restore_tag: Label3D = restore_state.get("role_tag") as Label3D
		if is_instance_valid(restore_tag) and not stalker_saved_tags[restore_index].is_empty():
			restore_tag.text = str(stalker_saved_tags[restore_index]["text"])
			restore_tag.modulate = stalker_saved_tags[restore_index]["modulate"]
		game.guards[restore_index] = restore_state
	game.squad_alert_position = stalker_saved_squad_position
	game.squad_alert_timer = stalker_saved_squad_timer
	game.squad_alert_serial = stalker_saved_squad_serial
	stalker_state = game.guards[0]
	stalker_state["dash_timer"] = 0.0
	stalker_state["dash_windup"] = 0.0
	stalker_state["dash_cooldown"] = 12.0
	game.guards[0] = stalker_state

	# Heavy's three attack lanes should be readable and genuinely dodgeable.
	var heavy_state: Dictionary = game.guards[1]
	var heavy_body: CharacterBody3D = heavy_state["node"]
	var heavy_origin: Vector3 = heavy_body.global_position
	var heavy_origin_rotation: Vector3 = heavy_body.global_rotation
	var heavy_saved_overdrive_timer: float = game.overdrive_timer
	heavy_body.global_position = game.player.global_position + Vector3(0.0, 0.0, -8.0)
	heavy_body.look_at(Vector3(game.player.global_position.x, heavy_body.global_position.y, game.player.global_position.z), Vector3.UP)
	game.overdrive_timer = 0.0
	heavy_state["stun"] = 0.0
	heavy_state["windup"] = 0.0
	# Let Godot synchronize the moved CharacterBody3D with the physics server
	# before perception casts its real line-of-sight ray. Keep the attack on
	# cooldown for this synchronization frame so the game loop cannot consume it.
	heavy_state["cooldown"] = 12.0
	heavy_state["attack_lanes"] = []
	game.guards[1] = heavy_state
	await physics_frame
	heavy_state = game.guards[1]
	heavy_state["stun"] = 0.0
	heavy_state["windup"] = 0.0
	heavy_state["cooldown"] = 0.0
	heavy_state["attack_lanes"] = []
	game.guards[1] = heavy_state
	if not _expect(game._guard_can_see_player(heavy_body), "Heavy smoke setup must have a clear forward-cone line of sight before testing its telegraph"):
		return
	game._update_guards(0.016)
	heavy_state = game.guards[1]
	var heavy_lanes: Array = heavy_state.get("attack_lanes", [])
	if not _expect(heavy_lanes.size() == 3, "Heavy must telegraph three distinct attack lanes"):
		return
	if not _expect(game._player_inside_lanes(heavy_lanes, 14.5, 0.88, heavy_body), "Heavy centre lane must hit a stationary player"):
		return
	var heavy_test_position: Vector3 = game.player.global_position
	game.player.global_position += Vector3(4.0, 0.0, 0.0)
	if not _expect(not game._player_inside_lanes(heavy_lanes, 14.5, 0.88, heavy_body), "Heavy's telegraphed lane must be dodgeable with lateral movement"):
		return
	game.player.global_position = heavy_test_position
	game.overdrive_timer = heavy_saved_overdrive_timer
	heavy_body.global_position = heavy_origin
	heavy_body.global_rotation = heavy_origin_rotation
	heavy_state = game.guards[1]
	heavy_state["cooldown"] = 12.0
	heavy_state["windup"] = 0.0
	heavy_state["attack_lanes"] = []
	game.guards[1] = heavy_state
	game._screen_impulse(0.2, 0.25)
	if not _expect(game.camera_shake_timer > 0.0 and game.camera_shake_strength >= 0.2, "camera impact response must be measurable"):
		return
	game.damage_flash_timer = 0.1
	game._update_player_material()
	if not _expect(game.operator_suit.material_override == game.materials["red"], "operator damage shader state must target the nested visual rig"):
		return
	game.damage_flash_timer = 0.0
	game._update_player_material()
	game._layout_compact_controls(Vector2(320.0, 640.0))
	if not _expect(is_equal_approx(game.mobile_move_panel.offset_right - game.mobile_move_panel.offset_left, 142.0), "320px layout must constrain the movement panel"):
		return
	if not _expect(is_equal_approx(game.mobile_action_panel.offset_right - game.mobile_action_panel.offset_left, 150.0) and is_equal_approx(game.mobile_action_buttons[0].custom_minimum_size.x, 59.0), "320px layout must size combat buttons to the viewport"):
		return
	if not _expect(game.mobile_modules_button.custom_minimum_size.x <= 126.0 and game.sound_button.custom_minimum_size.x <= 126.0, "320px utility buttons must not overflow the action panel"):
		return
	var saved_position: Vector3 = game.player.global_position
	game.player.global_position = Vector3(0.0, 0.82, 0.0)
	var clear_lane: Array = [{"from": Vector3(0.0, 1.0, -10.0), "to": Vector3(0.0, 1.0, 0.0)}]
	if not _expect(game._player_inside_lanes(clear_lane, 14.5, 0.7), "player inside a telegraphed lane must be detected"):
		return
	game.player.global_position = Vector3(2.0, 0.82, -4.0)
	if not _expect(not game._player_inside_lanes(clear_lane, 14.5, 0.7), "player must be able to dodge outside the telegraphed lane"):
		return
	game.player.global_position = saved_position
	if not _expect(game.guards.size() >= 3, "initial hostiles must spawn"):
		return
	if not _expect(game.devices.size() == 3, "three destructible devices must spawn"):
		return

	print("RUNTIME_STAGE: actual weapon raycast against compact hostile capsule")
	var fire_saved_position: Vector3 = game.player.global_position
	var fire_saved_aim: Vector3 = game.player_aim
	var fire_saved_target: Node3D = game.aim_target_node
	var fire_saved_cooldown: float = game.fire_cooldown
	var fire_saved_shots: int = game.shots_fired
	var fire_saved_hits: int = game.shots_hit
	var fire_saved_critical_hits: int = game.critical_hits
	var fire_saved_mouse: bool = game.mouse_firing
	var fire_saved_touch: bool = game.touch_firing
	var fire_saved_gamepad: bool = game.gamepad_fire_held
	var fire_saved_paused: bool = game.paused_game
	var fire_saved_mission_finished: bool = game.mission_finished
	var fire_saved_terminal: bool = game.terminal_active
	# Disable any held input before waiting for a physics tick; otherwise the fixture itself can fire.
	game.mouse_firing = false
	game.touch_firing = false
	game.gamepad_fire_held = false
	game.paused_game = false
	game.mission_finished = false
	game.terminal_active = false
	var moved_guard_positions: Array[Vector3] = []
	for index in range(game.guards.size()):
		var existing_body: CharacterBody3D = game.guards[index]["node"] as CharacterBody3D
		moved_guard_positions.append(existing_body.global_position)
		existing_body.global_position = Vector3(18.0 + float(index) * 1.5, 0.82, 15.0)
	await physics_frame
	# Use a deterministic open corridor in the arena centre, away from cover and the gate.
	game.player.global_position = Vector3(0.0, 0.82, 10.2)
	game.player.velocity = Vector3.ZERO
	game.dash_timer = 0.0
	game.gamepad_move = Vector2.ZERO
	game.gamepad_aim = Vector2.ZERO
	game.player_aim = Vector3.FORWARD
	game.aim_target_node = null
	var fire_test_position: Vector3 = game.player.global_position
	var ray_guard_position: Vector3 = fire_test_position + Vector3(0.0, 0.0, -5.0)
	game._spawn_guard(ray_guard_position, false)
	var ray_guard_index: int = game.guards.size() - 1
	var ray_guard: CharacterBody3D = game.guards[ray_guard_index]["node"] as CharacterBody3D
	var ray_guard_hp: int = int(game.guards[ray_guard_index]["hp"])
	game.guards[ray_guard_index]["stun"] = 5.0
	game.guards[ray_guard_index]["cooldown"] = 12.0
	game.aim_target_node = ray_guard
	game.fire_cooldown = 0.0
	await physics_frame
	await physics_frame
	# Re-anchor both bodies after a physics sync; a running AI frame must not move the fixture target.
	game.player.global_position = Vector3(0.0, 0.82, 10.2)
	game.player.velocity = Vector3.ZERO
	ray_guard.global_position = game.player.global_position + Vector3(0.0, 0.0, -5.0)
	ray_guard.velocity = Vector3.ZERO
	await physics_frame
	# The live mouse/aim updater may run during a physics wait; pin the test ray only now.
	game.player_aim = Vector3.FORWARD
	game.aim_target_node = ray_guard
	var ray_from: Vector3 = game.player.global_position + Vector3.UP * 0.48 + game.player_aim * 0.8
	var ray_to: Vector3 = ray_from + game.player_aim * 37.0
	var probe := PhysicsRayQueryParameters3D.create(ray_from, ray_to)
	probe.exclude = [game.player.get_rid()]
	probe.collision_mask = 0xFFFFFFFF
	var probe_hit: Dictionary = game.get_world_3d().direct_space_state.intersect_ray(probe)
	var probe_collider: Object = probe_hit.get("collider") as Object if not probe_hit.is_empty() else null
	var probe_name: String = str(probe_collider.name) if probe_collider is Node else "<no hit>"
	if not _expect(not probe_hit.is_empty() and probe_hit.get("collider") == ray_guard, "deterministic weapon-ray fixture must hit its compact hostile capsule; actual collider=" + probe_name):
		return
	game._fire_weapon()
	if not _expect(game.shots_fired == fire_saved_shots + 1 and game.shots_hit == fire_saved_hits + 1, "weapon ray must connect with a compact hostile capsule at its body height"):
		return
	if not _expect(int(game.guards[ray_guard_index]["hp"]) == ray_guard_hp - 2 and game.critical_hits == fire_saved_critical_hits + 1, "an accurately locked upper-zone ray hit must register two damage and one critical event"):
		return
	ray_guard.queue_free()
	game.guards.remove_at(ray_guard_index)
	for index in range(game.guards.size()):
		var existing_body: CharacterBody3D = game.guards[index]["node"] as CharacterBody3D
		existing_body.global_position = moved_guard_positions[index]
	game.player.global_position = fire_saved_position
	game.player_aim = fire_saved_aim
	game.aim_target_node = fire_saved_target
	game.fire_cooldown = fire_saved_cooldown
	game.shots_fired = fire_saved_shots
	game.shots_hit = fire_saved_hits
	game.critical_hits = fire_saved_critical_hits
	game.mouse_firing = fire_saved_mouse
	game.touch_firing = fire_saved_touch
	game.gamepad_fire_held = fire_saved_gamepad
	game.paused_game = fire_saved_paused
	game.mission_finished = fire_saved_mission_finished
	game.terminal_active = fire_saved_terminal
	await physics_frame

	print("RUNTIME_STAGE: combat director math, grade and overdrive")
	if not _expect(is_equal_approx(game._combat_combo_multiplier(0), 1.0) and is_equal_approx(game._combat_combo_multiplier(2), 1.25) and is_equal_approx(game._combat_combo_multiplier(4), 1.5) and is_equal_approx(game._combat_combo_multiplier(6), 1.75) and is_equal_approx(game._combat_combo_multiplier(9), 2.0), "combo thresholds must award five deterministic payout tiers"):
		return
	if not _expect(game._combat_damage_per_hit(false, false) == 1 and game._combat_damage_per_hit(true, false) == 2 and game._combat_damage_per_hit(false, true) == 2 and game._combat_damage_per_hit(true, true) == 3, "precision and Overdrive damage must stack to three hit points without bypassing the normal weapon pipeline"):
		return
	if not _expect(game._mission_grade_for_score(920) == "S" and game._mission_grade_for_score(700) == "A" and game._mission_grade_for_score(450) == "B" and game._mission_grade_for_score(200) == "C", "mission rank thresholds must be stable S/A/B/C tiers"):
		return
	if not _expect(game._mission_grade_bonus("S") == 700 and game._mission_grade_bonus("A") == 500 and game._mission_grade_bonus("B") == 300 and game._mission_grade_bonus("C") == 150, "grade rewards must match the released reward table"):
		return
	if not _expect(game._calculate_mission_score(5, 3, 6, 90.0, 10.0, 120.0) > game._calculate_mission_score(5, 0, 0, 60.0, 30.0, 180.0), "precision, chained kills, accuracy and clean execution must improve the mission score"):
		return
	game._record_weapon_shot(false)
	game._record_weapon_shot(true)
	if not _expect(game.shots_fired == 2 and game.shots_hit == 1 and is_equal_approx(game._combat_accuracy_percentage(), 50.0), "accuracy must be measured from actual fired and confirmed target-hit events"):
		return
	var saved_overdrive_charge: float = game.overdrive_charge
	var saved_overdrive_timer: float = game.overdrive_timer
	game.overdrive_charge = 99.0
	game.overdrive_timer = 0.0
	var activations_before: int = game.overdrive_activations
	game._activate_overdrive()
	if not _expect(game.overdrive_activations == activations_before and is_zero_approx(game.overdrive_timer), "Overdrive must reject activation before full charge"):
		return
	game.overdrive_charge = 100.0
	game._activate_overdrive()
	if not _expect(game.overdrive_activations == activations_before + 1 and is_equal_approx(game.overdrive_timer, game.OVERDRIVE_DURATION) and is_zero_approx(game.overdrive_charge), "full charge must trigger a timed real Overdrive and consume the meter"):
		return
	if not _expect(game._effective_guard_speed(game.guards[0]) < float(game.guards[0]["speed"]), "active Overdrive must slow enemy movement in the live guard simulation"):
		return

	print("RUNTIME_STAGE: Overdrive chain arc and line of sight")
	var chain_primary: CharacterBody3D = game.guards[0]["node"] as CharacterBody3D
	var chain_secondary: CharacterBody3D = game.guards[1]["node"] as CharacterBody3D
	var primary_saved_position: Vector3 = chain_primary.global_position
	var secondary_saved_position: Vector3 = chain_secondary.global_position
	var primary_saved_stun: float = float(game.guards[0].get("stun", 0.0))
	var secondary_saved_stun: float = float(game.guards[1].get("stun", 0.0))
	var secondary_saved_hp: int = int(game.guards[1]["hp"])
	var secondary_saved_max_hp: int = int(game.guards[1].get("max_hp", secondary_saved_hp))
	chain_primary.global_position = game.player.global_position + Vector3(4.0, 0.0, 0.0)
	chain_secondary.global_position = game.player.global_position + Vector3(6.0, 0.0, 0.0)
	game.guards[0]["stun"] = 30.0
	game.guards[1]["stun"] = 30.0
	game.guards[1]["hp"] = 5
	game.guards[1]["max_hp"] = 5
	game.overdrive_timer = game.OVERDRIVE_DURATION
	await physics_frame
	var arcs_before: int = game.overdrive_arc_chains
	var shots_before_arc: int = game.shots_fired
	var hits_before_arc: int = game.shots_hit
	var primary_hit_position: Vector3 = chain_primary.global_position + Vector3.UP * 0.55
	var arc_connected: bool = game._try_overdrive_chain(chain_primary, primary_hit_position)
	var expected_arc_damage: int = maxi(1, roundi(float(game._combat_damage_per_hit(false, true)) * game.OVERDRIVE_ARC_DAMAGE_SCALE))
	if not _expect(arc_connected and game.overdrive_arc_chains == arcs_before + 1 and int(game.guards[1]["hp"]) == 5 - expected_arc_damage, "active Overdrive must chain one reduced-damage arc to the nearest visible secondary hostile"):
		return
	if not _expect(game.shots_fired == shots_before_arc and game.shots_hit == hits_before_arc, "secondary arc damage must not fabricate extra fired shots or inflate weapon accuracy"):
		return
	var saved_diagnostics: bool = game.diagnostics_enabled
	game.diagnostics_enabled = true
	game._update_hud()
	if not _expect(game.diagnostics_label.text.contains("OVERDRIVE ARCS %d" % (arcs_before + 1)), "live diagnostics must report successful Overdrive arcs"):
		return
	game.diagnostics_enabled = saved_diagnostics
	var blocker := StaticBody3D.new()
	blocker.name = "OverdriveArcOccluderSmoke"
	blocker.collision_layer = 1
	blocker.collision_mask = 0
	var blocker_shape := CollisionShape3D.new()
	var blocker_box := BoxShape3D.new()
	blocker_box.size = Vector3(0.8, 2.2, 1.0)
	blocker_shape.shape = blocker_box
	blocker.add_child(blocker_shape)
	game.add_child(blocker)
	blocker.global_position = (chain_primary.global_position + chain_secondary.global_position) * 0.5 + Vector3.UP * 0.45
	game.guards[1]["hp"] = 5
	await physics_frame
	var blocked_arc: bool = game._try_overdrive_chain(chain_primary, primary_hit_position)
	if not _expect(not blocked_arc and game.overdrive_arc_chains == arcs_before + 1 and int(game.guards[1]["hp"]) == 5, "opaque arena geometry must block the Overdrive arc"):
		return
	blocker.queue_free()
	await physics_frame
	game.overdrive_timer = 0.0
	var inactive_arc: bool = game._try_overdrive_chain(chain_primary, primary_hit_position)
	if not _expect(not inactive_arc and game.overdrive_arc_chains == arcs_before + 1, "Overdrive chain must remain inactive when its timed state is off"):
		return
	game.overdrive_timer = game.OVERDRIVE_DURATION
	chain_primary.global_position = primary_saved_position
	chain_secondary.global_position = secondary_saved_position
	game.guards[0]["stun"] = primary_saved_stun
	game.guards[1]["stun"] = secondary_saved_stun
	game.guards[1]["hp"] = secondary_saved_hp
	game.guards[1]["max_hp"] = secondary_saved_max_hp
	game._update_hud()
	game._update_combat_director(2.0)
	if not _expect(game.overdrive_timer < game.OVERDRIVE_DURATION and game.overdrive_timer > 0.0, "Overdrive duration must tick down on unpaused simulation time"):
		return
	game.overdrive_charge = saved_overdrive_charge
	game.overdrive_timer = saved_overdrive_timer
	game.shots_fired = 0
	game.shots_hit = 0
	game.combat_combo = 0
	game.combat_combo_best = 0
	game.combo_breaks = 0

	print("RUNTIME_STAGE: precision combat and combo payouts")
	var guard_node: Node3D = game.guards[0]["node"]
	var guard_hp := int(game.guards[0]["hp"])
	var critical_count_before: int = game.critical_hits
	game._damage_target(guard_node, true)
	var hit_feedback := guard_node.get_node_or_null("HitFeedback") as Label3D
	if not _expect(is_instance_valid(hit_feedback) and hit_feedback.visible and hit_feedback.text.contains("CRIT") and hit_feedback.text.contains("2"), "upper-zone precision hits must show the CRIT label and doubled hit value"):
		return
	if not _expect(float(game.guards[0].get("hit_flash_timer", 0.0)) > 0.0 and float(game.guards[0].get("hit_label_timer", 0.0)) > 0.0, "hit feedback timers must be live and measurable"):
		return
	game._animate_world(0.016)
	var armor_flash := guard_node.get_node_or_null("Armor") as MeshInstance3D
	if not _expect(is_instance_valid(armor_flash) and armor_flash.material_override == game.materials["white"] and armor_flash.scale.x > 1.0, "a confirmed hit must flash and briefly scale the target armor"):
		return
	var health_readout := guard_node.get_node_or_null("HealthReadout") as Label3D
	if not _expect(is_instance_valid(health_readout) and health_readout.visible and health_readout.text.contains(str(guard_hp - 2)), "a precision hit must subtract two HP and update the floating enemy health readout"):
		return
	if not _expect(game.critical_hits == critical_count_before + 1 and int(game.guards[0]["hp"]) == guard_hp - 2, "precision-hit telemetry and actual hostile HP must both update"):
		return
	for _hit in range(guard_hp - 2):
		game._damage_target(guard_node)
	if not _expect(game.guards.size() == 2, "weapon damage must eliminate a guard"):
		return
	if not _expect(game.eliminations == 1, "elimination telemetry must update"):
		return
	if not _expect(game.combat_combo == 1 and game.combat_combo_best == 1 and game.combat_combo_timer > 0.0, "a confirmed elimination must begin a timed combo chain"):
		return
	if not _expect(game.run_credits >= 100 and game.combat_score_total > 0 and game.overdrive_charge > 0.0, "kill bounty, combat score and Overdrive charge must be awarded in one shared elimination path"):
		return
	game.combat_combo = 4
	game.combat_combo_timer = 1.0
	game._break_combat_combo()
	if not _expect(game.combat_combo == 0 and is_zero_approx(game.combat_combo_timer) and game.combo_breaks == 1, "active combo breaker must reset the streak and record a break"):
		return
	if not _expect(game.ring_pool.size() > 0 and game.ring_effects.size() > 0, "eliminating a guard must trigger the pooled cinematic impact ring"):
		return

	var relay: Node3D = game.devices[0]["node"]
	var relay_hp := int(game.devices[0]["hp"])
	for _hit in range(relay_hp):
		game._damage_target(relay)
	if not _expect(bool(game.devices[0]["destroyed"]), "relay must be destructible"):
		return
	if not _expect(game._living_device_count() == 2, "device count must reflect destruction"):
		return

	print("RUNTIME_STAGE: reactive arena device overloads")
	var overload_relay: Node3D = game.devices[0]["node"]
	var overload_cell: Node3D = game.devices[1]["node"]
	var overload_anchor: Node3D = game.devices[2]["node"]
	var saved_guards_for_overload: Array[Dictionary] = game.guards
	game.guards = game.guards.duplicate()
	game.guards.clear()
	game._spawn_guard(overload_relay.global_position + Vector3(1.0, 0.07, 0.0), false)
	var overload_near_index: int = game.guards.size() - 1
	game._spawn_guard(overload_relay.global_position + Vector3(18.0, 0.07, 0.0), false)
	var overload_far_index: int = game.guards.size() - 1
	var overload_near: CharacterBody3D = game.guards[overload_near_index]["node"] as CharacterBody3D
	var overload_far: CharacterBody3D = game.guards[overload_far_index]["node"] as CharacterBody3D
	var overload_emp_counter: int = game.device_emp_overloads
	var overload_suppressed_counter: int = game.device_hostiles_suppressed
	if not _expect(game._device_emp_burst(overload_relay.global_position) == 1, "relay EMP must suppress only the guard inside its physical radius"):
		return
	if not _expect(float(game.guards[overload_near_index]["stun"]) >= game.DEVICE_EMP_STUN_SECONDS and is_zero_approx(float(game.guards[overload_far_index]["stun"])), "relay EMP must interrupt the nearby hostile while preserving a distant hostile"):
		return
	if not _expect(game.device_emp_overloads == overload_emp_counter + 1 and game.device_hostiles_suppressed == overload_suppressed_counter + 1, "relay EMP must update deterministic overload and suppression telemetry"):
		return
	overload_near.global_position = overload_cell.global_position + Vector3(1.0, 0.07, 0.0)
	overload_far.global_position = overload_cell.global_position + Vector3(14.0, 0.07, 0.0)
	game.guards[overload_near_index]["stun"] = 0.0
	game.guards[overload_far_index]["stun"] = 0.0
	game.guards[overload_near_index]["windup"] = 0.72
	game.guards[overload_near_index]["dash_windup"] = 0.28
	var saved_pulse_cooldown_device: float = game.pulse_cooldown
	var saved_overdrive_charge_device: float = game.overdrive_charge
	game.pulse_cooldown = 4.0
	game.overdrive_charge = 10.0
	var overload_nova_counter: int = game.device_cell_novas
	var nova_suppressed: int = game._device_cell_nova(overload_cell.global_position)
	if not _expect(nova_suppressed == 1 and float(game.guards[overload_near_index]["stun"]) >= game.DEVICE_CELL_STUN_SECONDS and is_zero_approx(float(game.guards[overload_far_index]["stun"])), "cell Nova must be an actual radius-limited attack interrupt, not a global stun"):
		return
	if not _expect(game.pulse_cooldown == 0.0 and is_equal_approx(game.overdrive_charge, 40.0), "cell Nova must reset pulse cooldown and restore 30 points of Overdrive charge"):
		return
	if not _expect(is_zero_approx(float(game.guards[overload_near_index]["windup"])) and is_zero_approx(float(game.guards[overload_near_index]["dash_windup"])), "device reaction must cancel hostile telegraph and lunge windup immediately"):
		return
	if not _expect(game.device_cell_novas == overload_nova_counter + 1, "cell Nova activation must be visible in lifetime telemetry"):
		return
	var saved_phase_clock_device: float = game.phase_clock
	var saved_phase_disruptions_device: int = game.phase_lane_disruptions
	var saved_lane_remaining_device: float = float(game.phase_lanes[0]["disruption_remaining"])
	var saved_device_lane_collapses: int = game.device_lane_collapses
	var saved_instability_device: float = game.instability
	var saved_null_shift_device: float = game.null_shift_timer
	game.phase_clock = 6.6
	game.instability = 0.0
	game.null_shift_timer = 0.0
	game._update_phase_lanes(0.0)
	var anchor_lane_index: int = game._phase_anchor_rupture(overload_anchor.global_position)
	if not _expect(anchor_lane_index == 0 and float(game.phase_lanes[anchor_lane_index]["disruption_remaining"]) >= game.DEVICE_LANE_COLLAPSE_SECONDS, "phase anchor rupture must collapse the physically nearest energy lane for 6.5 seconds"):
		return
	if not _expect(str(game.phase_lanes[anchor_lane_index]["state"]) == "disrupted" and not bool(game.phase_lanes[anchor_lane_index]["active_mesh"].visible), "anchor collapse must suppress the real lethal lane mesh and state"):
		return
	if not _expect(is_equal_approx(game.instability, 18.0) and is_equal_approx(game.null_shift_timer, 1.0) and game.device_lane_collapses > 0, "anchor rupture must expose its instability cost, brief phase window and collapse telemetry"):
		return
	game.phase_lanes[0]["disruption_remaining"] = saved_lane_remaining_device
	game.phase_lane_disruptions = saved_phase_disruptions_device
	game.device_lane_collapses = saved_device_lane_collapses
	game.phase_clock = saved_phase_clock_device
	game.instability = saved_instability_device
	game.null_shift_timer = saved_null_shift_device
	game._update_phase_lanes(0.0)
	overload_near.queue_free()
	overload_far.queue_free()
	game.guards = saved_guards_for_overload
	game.device_emp_overloads = overload_emp_counter
	game.device_cell_novas = overload_nova_counter
	game.device_hostiles_suppressed = overload_suppressed_counter
	game.pulse_cooldown = saved_pulse_cooldown_device
	game.overdrive_charge = saved_overdrive_charge_device

	print("RUNTIME_STAGE: pulse and animation")
	var close_guard: Node3D = game.guards[0]["node"]
	close_guard.global_position = game.player.global_position + Vector3(0.0, 0.0, -4.0)
	game._deploy_pulse()
	if not _expect(float(game.guards[0]["stun"]) > 0.0, "pulse must stun a nearby hostile"):
		return

	var before_rotation: float = float(game.core_ring.rotation.y)
	await process_frame
	await process_frame
	if not _expect(absf(game.core_ring.rotation.y - before_rotation) > 0.0001, "core orbit must animate"):
		return

	print("RUNTIME_STAGE: enemy gait and floating recovery pickup")
	var gait_guard: Dictionary = game.guards[0]
	var gait_body: CharacterBody3D = gait_guard["node"] as CharacterBody3D
	var gait_legs: Array = gait_guard.get("leg_pivots", [])
	var gait_arms: Array = gait_guard.get("arm_pivots", [])
	if not _expect(gait_legs.size() == 2 and gait_arms.size() == 2, "every guard must have two procedural leg and arm pivots"):
		return
	gait_guard["phase"] = 0.73
	gait_body.velocity = Vector3(2.4, 0.0, 0.0)
	game.scene_clock = 0.41
	game._animate_world(0.16)
	if not _expect(absf((gait_legs[0] as Node3D).rotation.x - (gait_legs[1] as Node3D).rotation.x) > 0.15, "moving guards must animate their legs in opposing gait phases"):
		return
	if not _expect(absf((gait_arms[0] as Node3D).rotation.x - (gait_arms[1] as Node3D).rotation.x) > 0.08, "guard arms must counter-swing for a more grounded movement silhouette"):
		return
	gait_body.velocity = Vector3.ZERO
	var medkit_y_before: float = game.medkit.position.y
	game.scene_clock = 0.8
	game._animate_world(0.016)
	if not _expect(absf(game.medkit.position.y - medkit_y_before) > 0.01, "available recovery pickup must smoothly bob in world space"):
		return

	print("RUNTIME_STAGE: live diagnostics")
	game._toggle_diagnostics()
	var objective_label_before_diagnostics: Label = game.objective_label
	# Live diagnostics must remain available during a scene transition where the primary
	# objective HUD is already gone; instrumentation cannot depend on optional presentation UI.
	game.objective_label = null
	game._update_hud()
	game.objective_label = objective_label_before_diagnostics
	if not _expect(game.diagnostics_label.visible, "diagnostics panel must open"):
		return
	if not _expect(game.frame_samples.size() > 0 and game.current_frame_ms >= 0.0, "frame times must be measured live"):
		return
	if not _expect(game.diagnostics_label.text.contains("DRAW / TRI / NODES"), "diagnostics must expose renderer counters even without the objective HUD"):
		return
	if not _expect(game.diagnostics_label.text.contains("FX ACTIVE") and game.diagnostics_label.text.contains("FX DROPPED"), "diagnostics must report active effects and pool overflow"):
		return
	if not _expect(game.diagnostics_label.text.contains("DASH EVADES") and game.diagnostics_label.text.contains("DASH CD"), "diagnostics must expose successful dash evades and cooldown timing"):
		return


	var saved_objective_label_for_diagnostics: Label = game.objective_label
	game.objective_label = null
	game._update_hud()
	game.objective_label = saved_objective_label_for_diagnostics
	if not _expect(game.diagnostics_label.text.contains("DRAW / TRI / NODES"), "diagnostics must refresh when objective HUD is unavailable"):
		return
	game._update_hud()

	print("RUNTIME_STAGE: cipher hack")
	game.player.global_position = game.terminal.global_position + Vector3(0.0, 0.0, 1.0)
	game._interact()
	if not _expect(game.terminal_active and game.keypad_panel.visible, "terminal interaction must open the cipher"):
		return
	for button_index in [JOY_BUTTON_DPAD_UP, JOY_BUTTON_DPAD_LEFT, JOY_BUTTON_DPAD_DOWN, JOY_BUTTON_DPAD_RIGHT]:
		var dpad_press := InputEventJoypadButton.new()
		dpad_press.device = 0
		dpad_press.button_index = button_index
		dpad_press.pressed = true
		game._unhandled_input(dpad_press)
	if not _expect(game.terminal_unlocked, "correct cipher must unlock the gate"):
		return
	if not _expect(game.security_gate.visible and game.gate_motion_tween != null and game.gate_motion_tween.is_running(), "successful hack must trigger a visible gate-opening animation"):
		return
	if not _expect(game.security_gate.collision_layer == 0 and game.security_gate.collision_mask == 0, "gate collision must disable immediately so the operator cannot get trapped"):
		return
	var gate_start_y: float = game.security_gate.position.y
	game.paused_game = true
	await create_timer(0.9).timeout
	if not _expect(not game.security_gate.visible and game.security_gate.position.y > gate_start_y + 2.0, "security gate must slide upward and hide only after the animation finishes"):
		return
	game.paused_game = false
	if not _expect(game.gate_indicator_strip.material_override == game.materials["cyan"], "unlocked gate lock indicator must switch from red to cyan"):
		return

	print("RUNTIME_STAGE: core and extraction")
	game.player.global_position = game.quantum_core.global_position + Vector3(1.0, 0.0, 0.0)
	var guards_before_extraction: int = game.guards.size()
	game._interact()
	if not _expect(game.core_secured, "operator must collect the core after hacking"):
		return
	if not _expect(game.extraction_pressure_active and is_equal_approx(game.extraction_window_remaining, game.EXTRACTION_WINDOW_SECONDS), "securing the quantum core must start a real 30-second extraction pressure phase"):
		return
	if not _expect(game.guards.size() == guards_before_extraction + 2 and game.extraction_reinforcements_spawned == 2, "core breach must physically spawn two extraction-lane reinforcements"):
		return
	if not _expect(is_instance_valid(game.extraction_event_label) and game.extraction_event_label.visible and game.extraction_event_label.text.contains("EXTRACTION WINDOW") and game.extraction_event_bar.visible and game.extraction_event_bar.value == game.EXTRACTION_WINDOW_SECONDS, "extraction phase must show a live labelled countdown and progress bar"):
		return
	if not _expect(game._extraction_hazard_rate() > 1.0, "phase conduits must accelerate during extraction pressure"):
		return
	var previous_extraction_timer: float = game.extraction_window_remaining
	game._update_extraction_director(5.0)
	if not _expect(is_equal_approx(game.extraction_window_remaining, previous_extraction_timer - 5.0), "extraction timer must advance using the real simulation delta"):
		return
	var saved_warden_spawned: bool = game.warden_spawned
	game.warden_spawned = false
	game.extraction_window_remaining = 0.1
	game._update_extraction_director(0.2)
	if not _expect(not game.extraction_pressure_active and game.extraction_overload_triggered and game.extraction_overload_count == 1, "missing the extraction window must transition once into lockdown breach"):
		return
	if not _expect(game._extraction_hazard_rate() > 1.0 and game.extraction_event_label.visible and game.extraction_event_label.text.contains("LOCKDOWN BREACH"), "lockdown breach must keep hazards accelerated and show the elite-intercept warning"):
		return
	if not _expect(game.warden_spawned and game.guards.back()["warden"], "missed extraction window must spawn a real Warden intercept"):
		return
	var siege_warden: Node3D = game.guards.back()["node"] as Node3D
	var siege_warden_index: int = game.guards.size() - 1
	var warden_state: Dictionary = game.guards[siege_warden_index]
	warden_state["hp"] = 6
	warden_state["max_hp"] = 10
	warden_state["windup"] = 0.8
	warden_state["attack_lanes"] = [{"from": Vector3.ZERO, "to": Vector3.FORWARD}]
	game.guards[siege_warden_index] = warden_state
	var original_warden_speed: float = float(game.guards[siege_warden_index]["speed"])
	var original_warden_damage: float = float(game.guards[siege_warden_index]["damage"])
	var phase_count_before: int = game.warden_phase_transitions
	var stagger_count_before: int = game.warden_staggers
	game._damage_target(siege_warden, true)
	var phase_two_state: Dictionary = game.guards[siege_warden_index]
	var remaining_warden_lanes: Array = phase_two_state.get("attack_lanes", [])
	if not _expect(int(phase_two_state["hp"]) == 4 and int(phase_two_state["boss_phase"]) == 2, "Warden must transition at 50% HP after actual precision damage"):
		return
	if not _expect(float(phase_two_state["speed"]) > original_warden_speed and float(phase_two_state["damage"]) > original_warden_damage and game._warden_radial_ray_count(2) == 12 and game._warden_radial_ray_count(1) == 8, "Warden phase II must upgrade live speed, damage and the radial attack from 8 to 12 lanes"):
		return
	if not _expect(game.warden_phase_transitions == phase_count_before + 1 and game.warden_staggers == stagger_count_before + 1 and float(phase_two_state["stun"]) >= 0.9 and is_zero_approx(float(phase_two_state["windup"])) and remaining_warden_lanes.is_empty(), "precision hit during the tell must trigger the phase transition and cancel the live Warden attack"):
		return
	if not _expect((siege_warden.get_node("CombatRole") as Label3D).text.contains("PHASE II") and (siege_warden.get_node("HealthReadout") as Label3D).text.contains("PII"), "Warden phase transition must update the real world-space boss and health labels"):
		return
	game.guards.pop_back()
	siege_warden.queue_free()
	game.warden_phase_transitions = phase_count_before
	game.warden_staggers = stagger_count_before
	game.warden_spawned = saved_warden_spawned
	game.extraction_overload_triggered = false
	game.extraction_window_remaining = 0.0
	game.extraction_pressure_active = false
	game.extraction_reinforcements_spawned = 0
	game._refresh_extraction_event_layout()
	game._update_hud()
	game.player.global_position = game.extraction.global_position + Vector3(1.0, 0.0, 0.0)
	game._interact()
	if not _expect(game.mission_finished and game.career_credits >= 750, "successful extraction must bank mission credits"):
		return
	if not _expect(not game.extraction_pressure_active and not game.extraction_event_label.visible and not game.extraction_event_bar.visible, "successful extraction must close the pressure event and clear its HUD layer"):
		return

	print("RUNTIME_STAGE: persistence and upgrades")
	game._buy_upgrade("weapon")
	if not _expect(game.weapon_level == 1, "career credits must purchase a weapon upgrade"):
		return
	if not _expect(game.career.get_value("upgrades", "weapon", 0) == 1, "upgrade must persist in the career save"):
		return

	print("RUNTIME_STAGE: daily challenge and cosmetic vault")
	var saved_credits: int = game.career_credits
	var saved_style: String = game.operator_style
	var saved_owns_amber: bool = game.owns_amber_style
	var saved_owns_violet: bool = game.owns_violet_style
	var saved_daily_active: bool = game.daily_challenge_active
	var saved_daily_code: String = game.daily_challenge_code
	var saved_daily_claim: String = game.daily_claimed_date
	var saved_daily_tactical_claim: String = game.daily_tactical_claimed_date
	var saved_daily_streak: int = game.daily_streak
	var saved_daily_longest: int = game.daily_longest_streak
	var saved_daily_last_date: String = game.daily_last_completed_date
	var saved_streak_bonus: int = game.last_daily_streak_bonus
	game.career_credits = 5000
	game.operator_style = "cyan"
	game.owns_amber_style = false
	game.owns_violet_style = false
	game.damage_flash_timer = 0.0
	game.null_shift_timer = 0.0
	game.dash_timer = 0.0
	game._buy_cosmetic("amber")
	if not _expect(game.operator_style == "amber" and game.owns_amber_style and game.operator_suit.material_override == game.materials["amber"], "earned-credit cosmetic purchase must unlock and apply the amber suit style"):
		return
	game._buy_cosmetic("violet")
	if not _expect(game.operator_style == "violet" and game.owns_violet_style and game.operator_suit.material_override == game.materials["violet"], "second cosmetic purchase must persist and apply violet without changing combat levels"):
		return
	if not _expect(game.career_credits == 3800, "cosmetic vault must charge the stated 450 + 750 soft-currency prices"):
		return
	# Fixed dates make UTC rollover and streak tests deterministic in CI.
	var daily_code: String = game._today_challenge_code()
	if not _expect(game._contract_index_from_challenge_code(daily_code) in [0, 1, 2], "daily challenge code must resolve to one of the three fixed contracts"):
		return
	if not _expect(game._contract_index_from_challenge_code("not-a-challenge") == -1, "malformed share codes must not select a contract"):
		return
	if not _expect(game._previous_date_code("20240301") == "20240229" and game._previous_date_code("20260301") == "20260228", "streak date math must handle leap day and month rollover"):
		return
	game.daily_challenge_active = false
	game.daily_mutators.clear()
	game.daily_mutator_ids.clear()
	game.daily_phase_rate = 1.0
	game.daily_shift_instability_bonus = 0.0
	game.daily_radar_jammed = false
	game.daily_supply_blackout = false
	game._spawn_guard(Vector3(20.0, 0.82, 17.0), false)
	var anomaly_guard_index: int = game.guards.size() - 1
	var deterministic_code: String = game._challenge_code_for_date("20261014")
	var daily_mutators_first: Array[String] = game._daily_mutator_ids_for_code(deterministic_code)
	var daily_mutators_repeat: Array[String] = game._daily_mutator_ids_for_code(deterministic_code)
	if not _expect(daily_mutators_first.size() == 2 and daily_mutators_first == daily_mutators_repeat and daily_mutators_first[0] != daily_mutators_first[1], "daily mutators must be deterministic, distinct and identical for every player sharing the challenge code"):
		return
	if not _expect(game._daily_mutator_ids_for_code("not-a-challenge").is_empty(), "invalid challenge links must not grant daily mutators"):
		return
	var baseline_guard_speed: float = float(game.guards[anomaly_guard_index]["speed"])
	var baseline_guard_hp: int = int(game.guards[anomaly_guard_index]["max_hp"])
	game.daily_challenge_active = true
	game.daily_challenge_code = deterministic_code
	game._configure_daily_mutators()
	if not _expect(game.daily_mutators.size() == 2 and game.daily_mutator_ids == daily_mutators_first, "daily anomaly director must install exactly the shared two-mutator loadout"):
		return
	if not _expect(is_equal_approx(game.daily_phase_rate, 1.22) == daily_mutators_first.has("grid"), "GRID OVERDRIVE must alter the real timed hazard simulation"):
		return
	if not _expect(game.daily_supply_blackout == daily_mutators_first.has("supply") and game.daily_radar_jammed == daily_mutators_first.has("radar"), "SUPPLY BLACKOUT and RADAR GHOST must toggle their actual mission systems"):
		return
	if not _expect((float(game.guards[anomaly_guard_index]["speed"]) > baseline_guard_speed) == daily_mutators_first.has("hunter"), "HUNTER PROTOCOL must change live guard movement and attack cadence"):
		return
	if not _expect((int(game.guards[anomaly_guard_index]["max_hp"]) == baseline_guard_hp + 1) == daily_mutators_first.has("armor"), "ARMORED HOSTILES must alter real guard health and health readouts"):
		return
	if not _expect((game.daily_shift_instability_bonus == 8.0) == daily_mutators_first.has("fracture"), "PHASE FRACTURE must change the cost of every later phase shift"):
		return
	game.daily_challenge_active = true
	game.daily_streak = 0
	game.daily_longest_streak = 0
	game.daily_last_completed_date = ""
	game.daily_claimed_date = ""
	var day_one := "20261010"
	game.daily_challenge_code = game._challenge_code_for_date(day_one)
	var day_one_reward: int = game._claim_daily_challenge_reward_for_date(day_one)
	if not _expect(day_one_reward == 400 and game.daily_streak == 1, "first daily clear must grant 400 credits and start a one-day streak"):
		return
	if not _expect(game._claim_daily_challenge_reward_for_date(day_one) == 0, "same-day daily reward must not be claimable twice"):
		return
	var day_two := "20261011"
	game.daily_challenge_code = game._challenge_code_for_date(day_two)
	var day_two_reward: int = game._claim_daily_challenge_reward_for_date(day_two)
	if not _expect(day_two_reward == 400 and game.daily_streak == 2, "consecutive daily clear must advance the active streak"):
		return
	var day_three := "20261012"
	game.daily_challenge_code = game._challenge_code_for_date(day_three)
	var day_three_reward: int = game._claim_daily_challenge_reward_for_date(day_three)
	if not _expect(day_three_reward == 500 and game.daily_streak == 3 and game.last_daily_streak_bonus == 100, "third daily clear must grant the 100-credit milestone"):
		return
	game.daily_streak = 6
	game.daily_last_completed_date = "20261019"
	game.daily_claimed_date = "20261019"
	game.daily_challenge_code = game._challenge_code_for_date("20261020")
	var day_seven_reward: int = game._claim_daily_challenge_reward_for_date("20261020")
	if not _expect(day_seven_reward == 700 and game.daily_streak == 7 and game.daily_longest_streak == 7, "seventh daily clear must grant the 300-credit weekly milestone"):
		return
	game.daily_challenge_code = game._challenge_code_for_date("20261022")
	var after_gap_reward: int = game._claim_daily_challenge_reward_for_date("20261022")
	if not _expect(after_gap_reward == 400 and game.daily_streak == 1 and game.daily_longest_streak == 7, "missing a UTC day must reset the active streak but preserve the record"):
		return

	print("RUNTIME_STAGE: reproducible daily setup and after-action black box")
	var original_ledger: Array[Dictionary] = game.raid_event_ledger.duplicate(true)
	var original_seed: int = game.daily_run_seed
	var original_mission_finished: bool = game.mission_finished
	var original_mission_success: bool = game.mission_success
	var original_mission_score: int = game.mission_score
	var original_mission_grade: String = game.mission_grade
	var original_mission_accuracy: float = game.mission_accuracy
	var original_elapsed: float = game.elapsed
	var original_daily_mutator_ids: Array[String] = game.daily_mutator_ids.duplicate()
	var valid_daily_code: String = game._challenge_code_for_date("20261014")
	var seed_a: int = game._daily_seed_for_code(valid_daily_code)
	var seed_b: int = game._daily_seed_for_code(valid_daily_code)
	if not _expect(seed_a > 0 and seed_a == seed_b and game._daily_seed_for_code("not-a-challenge") == 0, "shared daily code must resolve to one stable positive seed and invalid codes must resolve to zero"):
		return
	seed(seed_a)
	var deterministic_roll_a: int = randi()
	seed(seed_b)
	var deterministic_roll_b: int = randi()
	if not _expect(deterministic_roll_a == deterministic_roll_b, "the stable daily seed must reproduce the same initial procedural RNG stream"):
		return

	var score_parts: Dictionary = game._mission_score_breakdown(5, 3, 6, 90.0, 10.0, 120.0)
	var score_from_parts: int = int(score_parts["elimination_points"]) + int(score_parts["precision_points"]) + int(score_parts["combo_points"]) + int(score_parts["accuracy_points"]) - int(score_parts["damage_penalty"]) - int(score_parts["time_penalty"])
	if not _expect(int(score_parts["total"]) == score_from_parts and int(score_parts["total"]) == game._calculate_mission_score(5, 3, 6, 90.0, 10.0, 120.0), "auditable score components must sum to exactly the established mission score"):
		return
	if not _expect(int(game._mission_score_breakdown(0, 0, 0, 0.0, 10000.0, 10000.0)["total"]) == 0, "score breakdown must clamp extreme penalties to a non-negative total"):
		return

	game.raid_event_ledger.clear()
	for event_index in range(game.MAX_RAID_EVENT_COUNT + 19):
		game.elapsed = float(event_index) * 0.25
		game._record_raid_event("test_event", "bounded sample %d" % event_index, float(event_index), Vector3(float(event_index), 0.82, -float(event_index)))
	if not _expect(game.raid_event_ledger.size() == game.MAX_RAID_EVENT_COUNT, "raid black box must stay within its fixed 64-event memory limit"):
		return
	if not _expect(str(game.raid_event_ledger[0]["detail"]) == "bounded sample 19" and str(game.raid_event_ledger[-1]["detail"]) == "bounded sample 82", "event overflow must evict oldest records and preserve the newest evidence"):
		return
	if not _expect(float(game.raid_event_ledger[0]["t"]) <= float(game.raid_event_ledger[-1]["t"]) and game.raid_event_ledger[-1].has("position"), "black-box records must retain ordered elapsed time and quantized world positions"):
		return
	game.daily_challenge_active = true
	game.daily_challenge_code = valid_daily_code
	game.daily_run_seed = seed_a
	game.daily_mutator_ids = daily_mutators_first.duplicate()
	game.mission_finished = true
	game.mission_success = true
	game.mission_accuracy = game._combat_accuracy_percentage()
	game.mission_score = game._calculate_mission_score(game.eliminations, game.critical_hits, game.combat_combo_best, game.mission_accuracy, game.damage_taken_total, game.elapsed)
	game.mission_grade = game._mission_grade_for_score(game.mission_score)
	var after_action: Dictionary = game._build_after_action_report()
	if not _expect(str(after_action.get("schema", "")) == "osgard.nullshift.after-action/v1" and str(after_action.get("outcome", "")) == "SUCCESS", "after-action report must be versioned and distinguish a successful extraction from a failed raid"):
		return
	if not _expect(int(after_action.get("runSeed", 0)) == seed_a and str(after_action.get("challengeCode", "")) == valid_daily_code and after_action.get("anomalies", []).size() == daily_mutators_first.size(), "after-action report must include the matching challenge code, run seed and active anomaly pair"):
		return
	if not _expect(int(after_action.get("scoreBreakdown", {}).get("total", -1)) == int(after_action.get("score", -2)) and after_action.get("combat", {}).has("shotsFired") and after_action.get("devices", {}).has("RELAY") and after_action.get("warden", {}).has("precisionStaggers"), "after-action report must reconcile score with combat, device and boss telemetry"):
		return
	if not _expect(after_action.get("events", []).size() == game.MAX_RAID_EVENT_COUNT and after_action.get("insights", []).size() > 0, "after-action report must include the bounded event tape and actionable, locally computed coaching"):
		return

	print("RUNTIME_STAGE: thermal sovereignty and tactical recon")
	var previous_mission_finished: bool = game.mission_finished
	var previous_paused: bool = game.paused_game
	var previous_briefing: bool = game.briefing_visible
	var previous_terminal: bool = game.terminal_active
	var previous_player_position: Vector3 = game.player.global_position
	game.mission_finished = false
	game.paused_game = false
	game.briefing_visible = false
	game.terminal_active = false
	game.player.global_position = Vector3(0.0, 0.82, 0.0)
	game.weapon_heat = 0.0
	game.weapon_overheated = false
	game.weapon_overheat_events = 0
	game.weapon_vent_cooldown = 0.0
	game.weapon_vent_uses = 0
	game.weapon_vent_hits = 0
	game.scan_cooldown = 0.0
	game.scan_active_timer = 0.0
	game.scan_activations = 0
	game.scan_hostiles_revealed_total = 0
	game.scan_devices_revealed_total = 0
	game._spawn_guard(Vector3(2.0, 0.82, 0.0), false)
	var scanned_guard_index: int = game.guards.size() - 1
	var scanned_guard: Dictionary = game.guards[scanned_guard_index]
	scanned_guard["hp"] = 5
	scanned_guard["max_hp"] = 5
	scanned_guard["scan_reveal_timer"] = 0.0
	game.guards[scanned_guard_index] = scanned_guard
	var scan_readout: Label3D = scanned_guard["scan_readout"]
	game._create_device(Vector3(3.0, 0.82, 0.0), "CELL", "SCAN TEST CELL")
	var scanned_device_index: int = game.devices.size() - 1
	var scanned_device: Dictionary = game.devices[scanned_device_index]
	var scanned_device_tag: Label3D = scanned_device["tag"]
	if not _expect(not scan_readout.visible and not scanned_device_tag.visible, "enemy scan signatures and device labels must be hidden before the tactical reveal"):
		return
	game._apply_weapon_heat(game.WEAPON_HEAT_LIMIT)
	if not _expect(game.weapon_overheated and is_equal_approx(game.weapon_heat, 100.0) and game.weapon_overheat_events == 1, "thermal lockout must trigger at 100 percent"):
		return
	game._update_weapon_systems(1.0)
	if not _expect(game.weapon_overheated and game.weapon_heat < 100.0, "overheated weapon must cool at the faster lockout rate"):
		return
	game._update_weapon_systems(1.1)
	if not _expect(not game.weapon_overheated and game.weapon_heat <= game.WEAPON_OVERHEAT_RELEASE_HEAT, "thermal lockout must clear only after cooling below the release threshold"):
		return
	game.weapon_heat = 82.0
	game._activate_weapon_vent()
	var vented_guard: Dictionary = game.guards[scanned_guard_index]
	if not _expect(not game.weapon_overheated and game.weapon_vent_uses == 1 and is_equal_approx(game.weapon_heat, game.WEAPON_VENT_RESET_HEAT), "manual vent must reset heat and clear a thermal lockout"):
		return
	if not _expect(int(vented_guard.get("hp", 0)) < 5 and float(vented_guard.get("stun", 0.0)) >= game.WEAPON_VENT_STAGGER_SECONDS, "manual vent must damage and interrupt nearby hostiles"):
		return
	if not _expect(game.weapon_vent_cooldown > 0.0 and game.weapon_vent_hits >= 1, "thermal vent must track a real cooldown and confirmed hostile interrupts"):
		return
	game.scan_cooldown = 0.0
	game._activate_tactical_scan()
	var revealed_guard: Dictionary = game.guards[scanned_guard_index]
	var revealed_device: Dictionary = game.devices[scanned_device_index]
	if not _expect(game.scan_activations == 1 and float(revealed_guard.get("scan_reveal_timer", 0.0)) > 0.0 and scan_readout.visible, "tactical scan must reveal enemy signatures and nearby device labels"):
		return
	if not _expect(float(revealed_device.get("scan_timer", 0.0)) > 0.0 and scanned_device_tag.visible and game.scan_hostiles_revealed_total >= 1 and game.scan_devices_revealed_total >= 1, "tactical scan must reveal nearby devices and count real recon results"):
		return
	var scans_before_cooldown: int = game.scan_activations
	game._activate_tactical_scan()
	if not _expect(game.scan_activations == scans_before_cooldown and game.scan_cooldown > 0.0, "tactical scan cooldown must prevent immediate repeat activation"):
		return
	print("RUNTIME_STAGE: kinetic pressure / suppression director")
	var normal_pressure_state: Dictionary = {"role": "RANGER", "warden": false, "suppression": 0.0, "suppression_timer": 0.0, "suppression_lockout": 0.0, "stun": 0.0, "windup": 0.58, "dash_windup": 0.0, "attack_lanes": [{"from": Vector3.ZERO, "to": Vector3.ONE}], "speed": 2.0}
	var suppression_before: int = game.suppression_breaks
	var interrupts_before: int = game.suppression_attack_interrupts
	var pressure_state: Dictionary = game._apply_guard_suppression(normal_pressure_state, game.GUARD_SUPPRESSION_THRESHOLD, false)
	if not _expect(float(pressure_state["stun"]) >= game.GUARD_SUPPRESSION_STUN and float(pressure_state["windup"]) == 0.0 and pressure_state["attack_lanes"].is_empty(), "sustained kinetic pressure must interrupt a live attack telegraph and cancel its stored attack lanes"):
		return
	if not _expect(game.suppression_breaks == suppression_before + 1 and game.suppression_attack_interrupts == interrupts_before + 1 and float(pressure_state["suppression_lockout"]) > 0.0, "pressure breaks must be counted and protected by a deterministic anti-chain lockout"):
		return
	var calm_speed: float = game._effective_guard_speed({"speed": 2.0, "suppression": 0.0, "warden": false})
	var pressured_speed: float = game._effective_guard_speed({"speed": 2.0, "suppression": 90.0, "warden": false})
	var warden_speed: float = game._effective_guard_speed({"speed": 2.0, "suppression": 90.0, "warden": true})
	if not _expect(pressured_speed < calm_speed and warden_speed > pressured_speed, "suppression must slow ordinary hostile movement while the Warden keeps meaningful resistance"):
		return
	var critical_pressure_state: Dictionary = {"role": "RANGER", "warden": false, "suppression": 0.0, "suppression_timer": 0.0, "suppression_lockout": 0.0, "stun": 0.0, "windup": 0.0, "dash_windup": 0.0, "attack_lanes": []}
	var pressure_total_before: float = game.suppression_total_pressure
	game._apply_guard_suppression(critical_pressure_state, 30.0, false)
	var normal_gain: float = float(critical_pressure_state["suppression"])
	critical_pressure_state["suppression"] = 0.0
	critical_pressure_state["suppression_lockout"] = 0.0
	game._apply_guard_suppression(critical_pressure_state, 30.0, true)
	if not _expect(float(critical_pressure_state["suppression"]) > normal_gain and game.suppression_total_pressure > pressure_total_before, "precision hits must build substantially more pressure than an ordinary hit"):
		return
	var warden_pressure_state: Dictionary = {"role": "WARDEN", "warden": true, "suppression": 0.0, "suppression_lockout": 0.0, "suppression_timer": 0.0, "stun": 0.0, "windup": 0.5, "dash_windup": 0.0, "attack_lanes": []}
	var boss_pressure_result: Dictionary = game._apply_guard_suppression(warden_pressure_state, game.GUARD_SUPPRESSION_THRESHOLD, false)
	if not _expect(float(boss_pressure_result.get("stun", 0.0)) < game.GUARD_SUPPRESSION_STUN, "Warden must resist suppression stuns instead of behaving like a regular guard"):
		return

	print("RUNTIME_STAGE: tactical mastery / seven refinements")
	if not _expect(float(pressure_state.get("weakpoint_exposed_timer", 0.0)) > 0.0, "pressure break must expose a weakpoint for a finite precision follow-up window"):
		return
	if not _expect(game._weakpoint_damage_multiplier({"warden": false, "weakpoint_exposed_timer": 2.0}, true) > 1.0 and is_equal_approx(game._weakpoint_damage_multiplier({"warden": false, "weakpoint_exposed_timer": 0.0}, true), 1.0), "weakpoint multiplier must require an exposed core"):
		return
	if not _expect(is_equal_approx(game._countershot_damage_scale(1.0, 2.4), game.COUNTERSHOT_DAMAGE_MULTIPLIER) and is_equal_approx(game._countershot_damage_scale(1.0, 0.0), 1.0), "countershot multiplier must require an active perfect-evade window"):
		return
	var threat_pick: Dictionary = game._select_earliest_telegraph([{"eta": 1.6, "role": "HEAVY"}, {"eta": 0.42, "role": "STALKER"}, {"eta": 0.9, "role": "RANGER"}])
	if not _expect(str(threat_pick.get("role", "")) == "STALKER" and is_equal_approx(float(threat_pick.get("eta", 0.0)), 0.42), "threat forecast must select the earliest live telegraph"):
		return
	if not _expect(game._combo_mastery_tier(2) == 0 and game._combo_mastery_tier(3) == 1 and game._combo_mastery_tier(6) == 2 and game._combo_mastery_tier(10) == 3 and game._combo_mastery_tier(15) == 4, "combo mastery tiers must have deterministic thresholds"):
		return
	if not _expect(game._combo_mastery_charge_bonus(1) == 8.0 and game._combo_mastery_charge_bonus(4) == 24.0 and game._combo_mastery_charge_bonus(99) == 0.0, "combo mastery awards must remain bounded"):
		return
	if not _expect(game._weapon_mastery_rank_for_critical_hits(0) == 0 and game._weapon_mastery_rank_for_critical_hits(12) == 1 and game._weapon_mastery_rank_for_critical_hits(30) == 2 and game._weapon_mastery_rank_for_critical_hits(60) == 3 and game._weapon_mastery_rank_for_critical_hits(100) == 4, "ARC-9 mastery ranks must use stable career thresholds"):
		return
	var original_lifetime_crits: int = int(game.career.get_value("career", "total_critical_hits", 0))
	game.career.set_value("career", "total_critical_hits", 0)
	var novice_heat: float = game._weapon_heat_per_shot()
	game.career.set_value("career", "total_critical_hits", 100)
	var veteran_heat: float = game._weapon_heat_per_shot()
	game.career.set_value("career", "total_critical_hits", original_lifetime_crits)
	if not _expect(veteran_heat < novice_heat, "ARC-9 mastery must improve the real thermal budget"):
		return
	var saved_side_claim: String = game.daily_tactical_claimed_date
	var saved_side_daily_active: bool = game.daily_challenge_active
	var saved_side_code: String = game.daily_challenge_code
	var saved_crit: int = game.critical_hits
	var saved_evades: int = game.dash_evasions
	var saved_interruptions: int = game.suppression_attack_interrupts
	var saved_lures: int = game.phase_echo_lures
	var side_date := "20261014"
	game.daily_challenge_active = true
	game.daily_challenge_code = game._challenge_code_for_date(side_date)
	game.daily_tactical_claimed_date = ""
	var side_goal: Dictionary = game._daily_side_objective_state()
	if not _expect(not side_goal.is_empty() and int(side_goal.get("goal", 0)) > 0, "shared daily code must choose a deterministic bonus objective"):
		return
	match str(side_goal.get("id", "")):
		"precision":
			game.critical_hits = int(side_goal["goal"])
		"evasion":
			game.dash_evasions = int(side_goal["goal"])
		"pressure":
			game.suppression_attack_interrupts = int(side_goal["goal"])
		"echo":
			game.phase_echo_lures = int(side_goal["goal"])
	if not _expect(bool(game._daily_side_objective_state().get("completed", false)), "daily bonus progress must use the selected real gameplay counter"):
		return
	if not _expect(game._claim_daily_side_objective_reward_for_date(side_date) == game.DAILY_TACTICAL_BONUS_CREDITS and game._claim_daily_side_objective_reward_for_date(side_date) == 0, "daily tactical bonus must be claimed once per date"):
		return
	game.daily_tactical_claimed_date = saved_side_claim
	game.career.set_value("daily", "tactical_claimed_date", saved_side_claim)
	game.daily_challenge_active = saved_side_daily_active
	game.daily_challenge_code = saved_side_code
	game.critical_hits = saved_crit
	game.dash_evasions = saved_evades
	game.suppression_attack_interrupts = saved_interruptions
	game.phase_echo_lures = saved_lures
	var old_salvage_spawned: int = game.salvage_pickups_spawned
	var old_salvage_collected: int = game.salvage_pickups_collected
	var old_run_credits: int = game.run_credits
	var old_overdrive_charge: float = game.overdrive_charge
	var old_weapon_heat: float = game.weapon_heat
	var old_counter_window: float = game.counter_window_remaining
	var old_counter_earned: int = game.counter_windows_earned
	var old_counter_hits: int = game.countershot_hits
	game.mission_finished = false
	game.paused_game = false
	game.briefing_visible = false
	game._spawn_salvage_drop(game.player.global_position, true, false)
	game._update_salvage_drops(0.016)
	if not _expect(game.salvage_pickups_spawned == old_salvage_spawned + 1 and game.salvage_pickups_collected == old_salvage_collected + 1 and game.run_credits > old_run_credits and game.weapon_heat <= old_weapon_heat, "salvage shard must be collected once and restore credits plus weapon cooling"):
		return
	game.dash_timer = 0.2
	game.dash_evasion_registered = false
	game.counter_window_remaining = 0.0
	game._damage_player(10.0)
	if not _expect(game.counter_windows_earned == old_counter_earned + 1 and game.counter_window_remaining > 0.0, "a verified dash evade must arm a live counter window"):
		return
	game.dash_timer = 0.0
	game.dash_evasion_registered = false
	game.run_credits = old_run_credits
	game.overdrive_charge = old_overdrive_charge
	game.weapon_heat = old_weapon_heat
	game.salvage_pickups_spawned = old_salvage_spawned
	game.salvage_pickups_collected = old_salvage_collected
	game.counter_window_remaining = old_counter_window
	game.counter_windows_earned = old_counter_earned
	game.countershot_hits = old_counter_hits
	var new_report: Dictionary = game._build_after_action_report()
	if not _expect(str(new_report.get("gameVersion", "")) == "0.21.0-tactical-mastery" and new_report.get("suppression", {}).has("pressureHits") and new_report.get("suppression", {}).has("attackInterrupts"), "after-action export must include versioned kinetic-pressure metrics"):
		return
	if not _expect(new_report.get("thermal", {}).has("overheatEvents") and new_report.get("thermal", {}).has("ventHostilesInterrupted"), "after-action export must include versioned thermal metrics"):
		return
	if not _expect(new_report.get("recon", {}).has("scanActivations") and new_report.get("recon", {}).has("devicesRevealed"), "after-action export must include local tactical scan metrics"):
		return
	if not _expect(new_report.get("weakpoints", {}).has("exposures") and new_report.get("countershot", {}).has("confirmedHits"), "after-action report must include weakpoint and countershot metrics"):
		return
	if not _expect(new_report.get("salvage", {}).has("collected") and new_report.get("comboMastery", {}).has("bestTier") and new_report.get("mastery", {}).has("arc9Rank"), "after-action report must include salvage, combo tier and persistent mastery metrics"):
		return
	if not _expect(new_report.get("dailyObjective", {}).has("goal"), "daily report must export the measurable tactical bonus objective"):
		return
	if not _expect(str(new_report.get("gameVersion", "")) == "0.21.0-tactical-mastery" and new_report.get("phaseEcho", {}).get("deployments", -1) >= 0 and new_report.get("phaseEcho", {}).has("confirmedLures"), "after-action report must expose versioned Echo use and confirmed AI diversion counts"):
		return
	game.player.global_position = previous_player_position
	game.mission_finished = previous_mission_finished
	game.paused_game = previous_paused
	game.briefing_visible = previous_briefing
	game.terminal_active = previous_terminal

	game.career_credits = saved_credits
	game.operator_style = saved_style
	game.owns_amber_style = saved_owns_amber
	game.owns_violet_style = saved_owns_violet
	game.daily_challenge_active = saved_daily_active
	game.daily_challenge_code = saved_daily_code
	game.daily_claimed_date = saved_daily_claim
	game.daily_tactical_claimed_date = saved_daily_tactical_claim
	game.career.set_value("daily", "tactical_claimed_date", saved_daily_tactical_claim)
	game.daily_streak = saved_daily_streak
	game.daily_longest_streak = saved_daily_longest
	game.daily_last_completed_date = saved_daily_last_date
	game.last_daily_streak_bonus = saved_streak_bonus
	game.raid_event_ledger = original_ledger.duplicate(true)
	game.daily_run_seed = original_seed
	game.daily_mutator_ids = original_daily_mutator_ids.duplicate()
	game.mission_finished = original_mission_finished
	game.mission_success = original_mission_success
	game.mission_score = original_mission_score
	game.mission_grade = original_mission_grade
	game.mission_accuracy = original_mission_accuracy
	game.elapsed = original_elapsed
	game._save_career()
	game._update_player_material()
	game._refresh_loadout()

	print("PASS NULL//SHIFT runtime: combat, extraction, persistent upgrades, daily streak ladder, UTC rollover, challenge-link validation and earned-credit cosmetics")
	quit(0)
