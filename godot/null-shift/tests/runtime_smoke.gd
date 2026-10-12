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
	if not _expect(is_instance_valid(game.briefing_panel), "first-run briefing panel must instantiate"):
		return
	game._show_briefing()
	if not _expect(game.briefing_visible and game.paused_game and game.briefing_panel.visible, "opening the briefing must pause the combat simulation"):
		return
	game._dismiss_briefing()
	if not _expect(not game.briefing_visible and not game.paused_game and bool(game.career.get_value("settings", "briefing_seen", false)), "dismissing briefing must resume gameplay and persist completion"):
		return
	game.sound_enabled = false

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
	game.player.global_position = lane_saved_position
	game.player_health = lane_saved_health
	game.phase_clock = 0.0

	print("RUNTIME_STAGE: adaptive graphics quality")
	game.cinematic_quality = true
	game.adaptive_quality_degraded = false
	game.adaptive_slow_windows = 0
	game.adaptive_fast_windows = 0
	game._apply_quality_mode()
	game._evaluate_adaptive_quality(25.0, 34.0)
	if not _expect(not game.adaptive_quality_degraded, "adaptive quality must require sustained slow windows"):
		return
	game._evaluate_adaptive_quality(25.0, 34.0)
	if not _expect(game.adaptive_quality_degraded, "sustained frame-time pressure must enable the optimized profile"):
		return
	if not _expect(not game.world_environment.environment.glow_enabled and not game.key_light.shadow_enabled and not game.fill_light.visible, "optimized profile must lower expensive cinematic effects"):
		return
	for _window in range(4):
		game._evaluate_adaptive_quality(15.5, 19.5)
	if not _expect(not game.adaptive_quality_degraded and game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled and game.fill_light.visible, "stable frame pacing must restore cinematic effects"):
		return

	print("RUNTIME_STAGE: three graphics presets and touch utility buttons")
	if not _expect(is_instance_valid(game.mobile_quality_button) and is_instance_valid(game.mobile_diagnostics_button), "touch devices must expose dedicated graphics and diagnostics controls"):
		return
	game.cinematic_quality = true
	game.performance_quality = false
	game.adaptive_quality_degraded = false
	game._apply_quality_mode()
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(not game.cinematic_quality and not game.performance_quality and not game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled and game.fill_light.visible, "first quality tap must select balanced mode and retain useful lighting/shadows"):
		return
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(not game.cinematic_quality and game.performance_quality and not game.key_light.shadow_enabled and not game.fill_light.visible, "second quality tap must select performance mode and disable expensive dynamic lighting"):
		return
	if not _expect(bool(game.career.get_value("settings", "performance_quality", false)), "performance mode must persist across sessions"):
		return
	game.mobile_quality_button.emit_signal("pressed")
	if not _expect(game.cinematic_quality and not game.performance_quality and game.world_environment.environment.glow_enabled and game.key_light.shadow_enabled, "third quality tap must return to cinematic mode"):
		return
	game.mobile_diagnostics_button.emit_signal("pressed")
	if not _expect(game.diagnostics_enabled and game.diagnostics_label.visible and game.mobile_diagnostics_button.text == "FPS+", "touch diagnostics button must reveal live FPS/telemetry"):
		return
	game.mobile_diagnostics_button.emit_signal("pressed")
	if not _expect(not game.diagnostics_enabled and not game.diagnostics_label.visible, "touch diagnostics button must hide telemetry when toggled off"):
		return
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

	print("RUNTIME_STAGE: bounded transient beam/ring pools")
	game._spawn_beam(Vector3(-1.0, 1.0, 0.0), Vector3(1.0, 1.0, 0.0), game.materials["cyan"], 0.10)
	if not _expect(game.beam_pool.size() == 1 and game.beam_effects.size() == 1 and game.beam_pool[0].visible, "beam firing must activate one pooled mesh"):
		return
	var pooled_beam: MeshInstance3D = game.beam_pool[0]
	game._update_effect_expiry(0.11)
	if not _expect(game.beam_effects.is_empty() and not pooled_beam.visible, "expired beam must return hidden to the pool"):
		return
	game._spawn_beam(Vector3(-2.0, 1.0, 0.0), Vector3(2.0, 1.0, 0.0), game.materials["amber"], 0.10)
	if not _expect(game.beam_pool.size() == 1 and game.beam_pool[0] == pooled_beam, "successive beams must reuse the same mesh node"):
		return
	game._update_effect_expiry(0.11)
	game._spawn_ring_burst(Vector3.ZERO, game.materials["amber"])
	if not _expect(game.ring_pool.size() == 1 and game.ring_effects.size() == 1 and game.ring_pool[0].visible, "ring burst must activate a reusable pool entry"):
		return
	var pooled_ring: MeshInstance3D = game.ring_pool[0]
	game._update_effect_expiry(0.23)
	if not _expect(pooled_ring.scale.x > 1.0 and pooled_ring.transparency > 0.0, "ring burst must expand and fade from measured frame delta"):
		return
	game._update_effect_expiry(0.24)
	if not _expect(game.ring_effects.is_empty() and not pooled_ring.visible, "expired ring must return hidden to the pool"):
		return
	game._spawn_ring_burst(Vector3.ONE, game.materials["cyan"])
	if not _expect(game.ring_pool.size() == 1 and game.ring_pool[0] == pooled_ring, "successive rings must reuse the same mesh node"):
		return
	game._update_effect_expiry(0.5)
	if not _expect(game.guards[0].get("role", "") == "STALKER" and game.guards[1].get("role", "") == "HEAVY" and game.guards[2].get("role", "") == "RANGER", "enemy archetypes must be distinct"):
		return

	# Exercise the Stalker's full telegraph -> dash-start -> movement transition.
	var stalker_state: Dictionary = game.guards[0]
	var stalker_body: CharacterBody3D = stalker_state["node"]
	var stalker_origin: Vector3 = stalker_body.global_position
	stalker_body.global_position = game.player.global_position + Vector3(0.0, 0.0, -8.0)
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
	stalker_body.global_position = stalker_origin
	stalker_state = game.guards[0]
	stalker_state["dash_timer"] = 0.0
	stalker_state["dash_windup"] = 0.0
	stalker_state["dash_cooldown"] = 12.0
	game.guards[0] = stalker_state

	# Heavy's three attack lanes should be readable and genuinely dodgeable.
	var heavy_state: Dictionary = game.guards[1]
	var heavy_body: CharacterBody3D = heavy_state["node"]
	var heavy_origin: Vector3 = heavy_body.global_position
	heavy_body.global_position = game.player.global_position + Vector3(0.0, 0.0, -8.0)
	heavy_state["stun"] = 0.0
	heavy_state["windup"] = 0.0
	heavy_state["cooldown"] = 0.016
	heavy_state["attack_lanes"] = []
	game.guards[1] = heavy_state
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
	heavy_body.global_position = heavy_origin
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

	print("RUNTIME_STAGE: guard/device combat")
	var guard_node: Node3D = game.guards[0]["node"]
	var guard_hp := int(game.guards[0]["hp"])
	game._damage_target(guard_node)
	var hit_feedback := guard_node.get_node_or_null("HitFeedback") as Label3D
	if not _expect(is_instance_valid(hit_feedback) and hit_feedback.visible and hit_feedback.text.contains("1"), "confirmed hits must show a floating damage number"):
		return
	if not _expect(float(game.guards[0].get("hit_flash_timer", 0.0)) > 0.0 and float(game.guards[0].get("hit_label_timer", 0.0)) > 0.0, "hit feedback timers must be live and measurable"):
		return
	game._animate_world(0.016)
	var armor_flash := guard_node.get_node_or_null("Armor") as MeshInstance3D
	if not _expect(is_instance_valid(armor_flash) and armor_flash.material_override == game.materials["white"] and armor_flash.scale.x > 1.0, "a confirmed hit must flash and briefly scale the target armor"):
		return
	var health_readout := guard_node.get_node_or_null("HealthReadout") as Label3D
	if not _expect(is_instance_valid(health_readout) and health_readout.visible and health_readout.text.contains(str(guard_hp - 1)), "damage must expose the correct floating enemy health readout"):
		return
	for _hit in range(guard_hp - 1):
		game._damage_target(guard_node)
	if not _expect(game.guards.size() == 2, "weapon damage must eliminate a guard"):
		return
	if not _expect(game.eliminations == 1, "elimination telemetry must update"):
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

	print("RUNTIME_STAGE: live diagnostics")
	game._toggle_diagnostics()
	game._update_hud()
	if not _expect(game.diagnostics_label.visible, "diagnostics panel must open"):
		return
	if not _expect(game.frame_samples.size() > 0 and game.current_frame_ms >= 0.0, "frame times must be measured live"):
		return
	if not _expect(game.diagnostics_label.text.contains("DRAW CALLS"), "diagnostics must expose renderer counters"):
		return
	if not _expect(game.diagnostics_label.text.contains("FX ACTIVE") and game.diagnostics_label.text.contains("FX DROPPED"), "diagnostics must report active effects and pool overflow"):
		return

	print("RUNTIME_STAGE: cipher hack")
	game.player.global_position = game.terminal.global_position + Vector3(0.0, 0.0, 1.0)
	game._interact()
	if not _expect(game.terminal_active and game.keypad_panel.visible, "terminal interaction must open the cipher"):
		return
	for key in [KEY_UP, KEY_LEFT, KEY_DOWN, KEY_RIGHT]:
		game._submit_cipher_key(key)
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
	game._interact()
	if not _expect(game.core_secured, "operator must collect the core after hacking"):
		return
	game.player.global_position = game.extraction.global_position + Vector3(1.0, 0.0, 0.0)
	game._interact()
	if not _expect(game.mission_finished and game.career_credits >= 750, "successful extraction must bank mission credits"):
		return

	print("RUNTIME_STAGE: persistence and upgrades")
	game._buy_upgrade("weapon")
	if not _expect(game.weapon_level == 1, "career credits must purchase a weapon upgrade"):
		return
	if not _expect(game.career.get_value("upgrades", "weapon", 0) == 1, "upgrade must persist in the career save"):
		return

	print("PASS NULL//SHIFT runtime: aim-facing operator, gait, muzzle recoil, pooled beam/ring effects, combat damage, dodgeable phase lanes, enemy roles, eliminations, destructible devices, pulse, animated core, camera response, live telemetry, cipher hack, extraction, credits and persistent upgrades")
	quit(0)
