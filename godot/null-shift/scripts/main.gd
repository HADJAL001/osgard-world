extends Node3D

const PLAYER_SPEED := 7.4
const CAMERA_BASE_FOV := 49.0
const CIPHER := [KEY_UP, KEY_LEFT, KEY_DOWN, KEY_RIGHT]
const SAVE_PATH := "user://null_shift_career.cfg"
const MAX_BEAM_POOL := 28
const MAX_RING_POOL := 10
const MAX_SPARK_POOL := 8
const MAX_IMPACT_LIGHT_POOL := 4
const DASH_DURATION := 0.24
const DASH_COOLDOWN := 1.65
const DASH_SPEED_MULTIPLIER := 3.05
const DASH_TRAIL_INTERVAL := 0.042
const DASH_TRAIL_LIFETIME := 0.18
const PULSE_LANE_DISRUPTION_SECONDS := 1.85
const PULSE_LANE_DISRUPTION_RANGE := 1.75
const COMBAT_COMBO_WINDOW := 4.25
const OVERDRIVE_MAX_CHARGE := 100.0
const OVERDRIVE_DURATION := 5.0
const GUARD_SIGHT_RADIUS := 20.5
const GUARD_SIGHT_FOV_DEGREES := 150.0
const PHANTOM_MOVE_SPEED_MULTIPLIER := 0.62
const PHANTOM_SIGHT_RADIUS := 12.5
const PHANTOM_SIGHT_FOV_DEGREES := 105.0
const PHANTOM_FOOTSTEP_INTERVAL := 0.46
const PHANTOM_FOOTSTEP_RADIUS := 2.7
const STANDARD_FOOTSTEP_RADIUS := 8.6
const PHANTOM_TAKEDOWN_RANGE := 1.72
const PHANTOM_BODY_DISCOVERY_RANGE := 4.8
const PHANTOM_BODY_LIFETIME_SECONDS := 10.0
const PHANTOM_TAKEDOWN_BASE_BONUS := 125
const GUARD_SEARCH_SECONDS := 4.6
const GUARD_INVESTIGATION_SECONDS := 4.2
const GUARD_FLANK_GOLDEN_ANGLE := 2.399963229728653
const GUARD_NAVIGATION_RAY := 1.55
const OVERDRIVE_ARC_RADIUS := 7.5
const OVERDRIVE_ARC_DAMAGE_SCALE := 0.55
const EXTRACTION_WINDOW_SECONDS := 30.0
const EXTRACTION_PRESSURE_RATE := 1.18
const EXTRACTION_OVERTIME_RATE := 1.12
const DEVICE_EMP_RADIUS := 13.5
const DEVICE_EMP_STUN_SECONDS := 3.2
const DEVICE_CELL_RADIUS := 8.8
const DEVICE_CELL_STUN_SECONDS := 2.15
const DEVICE_CELL_OVERDRIVE_GAIN := 30.0
const DEVICE_LANE_COLLAPSE_SECONDS := 6.5
const DEVICE_LANE_MAX_Z_DISTANCE := 5.4
const WEAPON_HEAT_LIMIT := 100.0
const WEAPON_HEAT_PER_SHOT := 10.5
const WEAPON_HEAT_COOLING_RATE := 18.0
const WEAPON_OVERHEAT_COOLING_RATE := 34.0
const WEAPON_OVERHEAT_RELEASE_HEAT := 34.0
const WEAPON_VENT_MIN_HEAT := 35.0
const WEAPON_VENT_COOLDOWN_SECONDS := 5.5
const WEAPON_VENT_RESET_HEAT := 18.0
const WEAPON_VENT_RADIUS := 6.8
const WEAPON_VENT_STAGGER_SECONDS := 0.85
const TACTICAL_SCAN_RADIUS := 23.0
const TACTICAL_SCAN_DURATION := 5.2
const TACTICAL_SCAN_COOLDOWN := 10.0
const PHASE_ECHO_DURATION := 4.8
const PHASE_ECHO_COOLDOWN := 15.0
const PHASE_ECHO_SIGNAL_RADIUS := 36.0
const PHASE_ECHO_TRACKED_SIGNAL_RADIUS := 48.0
# KINETIC PRESSURE / 0.20 — fire matters before it becomes lethal.
const GUARD_SUPPRESSION_THRESHOLD := 54.0
const GUARD_SUPPRESSION_DECAY := 18.0
const GUARD_SUPPRESSION_LOCKOUT := 1.35
const GUARD_SUPPRESSION_STUN := 0.72
const GUARD_SUPPRESSION_SPEED_FLOOR := 0.76
const COUNTER_WINDOW_SECONDS := 2.4
const COUNTERSHOT_DAMAGE_MULTIPLIER := 1.30
const WEAKPOINT_EXPOSURE_SECONDS := 2.5
const MAX_SALVAGE_DROPS := 8
const SALVAGE_LIFETIME_SECONDS := 12.0
const SALVAGE_COLLECT_RADIUS := 1.55
const DAILY_TACTICAL_BONUS_CREDITS := 250
const OPERATOR_CHRONICLE_SCHEMA := "osgard.nullshift.operator-chronicle/v1"
const MAX_OPERATOR_CHRONICLE_RECORDS := 24
const MAX_OPERATOR_CHRONICLE_ACHIEVEMENTS := 16

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
var combat_status_label: Label
var thermal_status_label: Label
var thermal_bar: ProgressBar
var thermal_bar_fill: StyleBoxFlat
var overdrive_bar: ProgressBar
var mobile_scan_button: Button
var mobile_vent_button: Button
var mobile_echo_button: Button
var mobile_stealth_button: Button
var mobile_overdrive_button: Button
var phase_echo_status_label: Label
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
var surface_albedo_texture: Texture2D
var surface_normal_texture: Texture2D
var surface_roughness_texture: Texture2D
var surface_texture_size := 128
var guards: Array[Dictionary] = []
var downed_bodies: Array[Dictionary] = []
var devices: Array[Dictionary] = []
var phase_lanes: Array[Dictionary] = []
var phase_lane_labels: Array[Label] = []
var phase_lane_status_row: HBoxContainer
var phase_clock := 0.0
var phase_lane_disruptions := 0
var device_emp_overloads := 0
var device_cell_novas := 0
var device_lane_collapses := 0
var device_hostiles_suppressed := 0
var hazard_status_label: Label
var health_bar: ProgressBar
var health_bar_fill: StyleBoxFlat
var effects: Array[Node] = []
var spark_pool: Array[CPUParticles3D] = []
var spark_effects: Array[Dictionary] = []
var impact_light_pool: Array[OmniLight3D] = []
var impact_light_effects: Array[Dictionary] = []
var impact_light_cursor := 0
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
var counter_window_remaining := 0.0
var counter_windows_earned := 0
var countershot_hits := 0
var weakpoint_exposures := 0
var weakpoint_hits := 0
var salvage_drops: Array[Dictionary] = []
var salvage_pickups_spawned := 0
var salvage_pickups_collected := 0
var salvage_pickups_expired := 0
var salvage_pickups_evicted := 0
var combo_mastery_awards := 0
var dash_trail_clock := 0.0
var dash_trail_last_position := Vector3.ZERO
var dash_trails_emitted := 0
var pulse_cooldown := 0.0
var fire_cooldown := 0.0
var damage_cooldown := 0.0
var damage_flash_timer := 0.0
var null_shift_timer := 0.0
var instability := 0.0
var elapsed := 0.0
var hud_clock := 0.0
var frame_samples: Array[float] = []
var frame_budget_misses: Array[float] = []
var fps_p95_ms := 0.0
var diagnostics_enabled := false
var cinematic_quality := true
var performance_quality := false
var adaptive_quality_level := 0 # 0=Cinematic, 1=soft optimization, 2=hard optimization
var adaptive_quality_degraded: bool = false:
	set(value):
		adaptive_quality_degraded = value
		if value:
			adaptive_quality_level = 2
		elif adaptive_quality_level >= 2:
			adaptive_quality_level = 0
var adaptive_quality_clock := 0.0
var adaptive_slow_windows := 0
var adaptive_fast_windows := 0
var terminal_active := false
var terminal_unlocked := false
var terminal_progress := 0
var core_secured := false
var extraction_pressure_active := false
var extraction_window_remaining := 0.0
var extraction_overload_triggered := false
var extraction_reinforcements_spawned := 0
var extraction_overload_count := 0
var extraction_event_label: Label
var extraction_event_bar: ProgressBar
var extraction_event_fill: StyleBoxFlat
var medkit_used := false
var alarm_active := false
var warden_spawned := false
var combat_noise_position := Vector3.ZERO
var combat_noise_radius := 0.0
var combat_noise_timer := 0.0
var combat_noise_serial := 0
var combat_noise_source := ""
var squad_alert_position := Vector3.ZERO
var squad_alert_timer := 0.0
var squad_alert_serial := 0
var squad_alert_source := ""
var mission_finished := false
var paused_game := false
var mouse_firing := false
var touch_firing := false
var gamepad_device_id := -1
var gamepad_mode_active := false
var gamepad_move := Vector2.ZERO
var gamepad_aim := Vector2.ZERO
var gamepad_fire_held := false
const GAMEPAD_MOVE_DEADZONE := 0.20
const GAMEPAD_AIM_DEADZONE := 0.24
var sound_enabled := true
var reduced_motion := false
var color_safe_mode := false
var haptics_enabled := true
var hud_scale_step := 1
var player_aim := Vector3.FORWARD
var career_names := ["STANDARD RAID", "BLACKOUT RUN", "IRON VEIL"]
var contract_bonus := [0, 350, 550]
var objective_text := "ВЗЛОМАТЬ ТЕРМИНАЛ → ЗАБРАТЬ ЯДРО → ЭВАКУИРОВАТЬСЯ"
var eliminations := 0
var critical_hits := 0
var suppression_hits := 0
var suppression_breaks := 0
var suppression_attack_interrupts := 0
var suppression_total_pressure := 0.0
var shots_fired := 0
var shots_hit := 0
var damage_taken_total := 0.0
var combat_combo := 0
var combat_combo_timer := 0.0
var combat_combo_best := 0
var combo_breaks := 0
var overdrive_charge := 0.0
var overdrive_timer := 0.0
var overdrive_activations := 0
var overdrive_arc_chains := 0
var weapon_heat := 0.0
var weapon_overheated := false
var weapon_overheat_events := 0
var weapon_vent_cooldown := 0.0
var weapon_vent_uses := 0
var weapon_vent_hits := 0
var scan_cooldown := 0.0
var scan_active_timer := 0.0
var scan_activations := 0
var scan_hostiles_revealed_total := 0
var scan_devices_revealed_total := 0
var phase_echo_node: Node3D
var phase_echo_hologram: MeshInstance3D
var phase_echo_ring: MeshInstance3D
var phase_echo_light: OmniLight3D
var phase_echo_remaining := 0.0
var phase_echo_cooldown := 0.0
var phase_echo_activations := 0
var phase_echo_lures := 0
var warden_phase_transitions := 0
var warden_staggers := 0
var mission_accuracy := 100.0
var mission_score := 0
var combat_score_total := 0
var mission_grade := "C"
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
var impact_wave_timer := 0.0
var impact_wave_duration := 0.34
var impact_wave_strength := 0.0
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
var operator_rim_light: OmniLight3D
var atmosphere_particles: GPUParticles3D
var sound_button: Button
var quality_button: Button
var mobile_quality_button: Button
var mobile_diagnostics_button: Button
var mobile_motion_button: Button
var mobile_palette_button: Button
var mobile_hud_scale_button: Button
var mobile_haptics_button: Button
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
var objective_beacon: Node3D
var objective_beacon_beam: MeshInstance3D
var objective_beacon_ring: MeshInstance3D
var objective_beacon_top_ring: MeshInstance3D
var objective_beacon_core: MeshInstance3D
var objective_beacon_light: OmniLight3D
var objective_beacon_target: Node3D
var objective_beacon_stage := ""
var objective_beacon_phase := 0.0
var objective_beacon_beam_materials: Dictionary = {}
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
var operator_style := "cyan"
var owns_amber_style := false
var owns_violet_style := false
var daily_challenge_active := false
var daily_challenge_code := ""
var daily_claimed_date := ""
var daily_tactical_claimed_date := ""
var daily_streak := 0
var daily_longest_streak := 0
var daily_last_completed_date := ""
var last_daily_streak_bonus := 0
var daily_streak_label: Label
var result_reward_label: Label
var result_intel_label: Label
var result_share_label: Label
var chronicle_panel: PanelContainer
var chronicle_scroll: ScrollContainer
var chronicle_summary_label: Label
var chronicle_awards_label: Label
var chronicle_history_label: Label
var chronicle_previous_paused := false
var chronicle_return_to_result := false
var chronicle_return_to_loadout := false
const MAX_RAID_EVENT_COUNT := 64
const AFTER_ACTION_REPORT_SCHEMA := "osgard.nullshift.after-action/v1"
var raid_event_ledger: Array[Dictionary] = []
var daily_run_seed := 0
var mission_success := false
var amber_style_button: Button
var violet_style_button: Button
var daily_challenge_button: Button
# DAILY ANOMALY DIRECTOR / 0.12: shared challenge codes resolve to the same two modifiers.
# PHANTOM PROTOCOL / 0.23 — local-only stealth state.
var stealth_mode_active := false
var stealth_footstep_clock := 0.0
var stealth_stance_seconds := 0.0
var stealth_quiet_steps := 0
var stealth_detections := 0
var stealth_takedowns := 0
var stealth_chain := 0
var stealth_chain_best := 0
var stealth_body_discoveries := 0
var stealth_bonus_credits := 0
var daily_mutators: Array[Dictionary] = []
var daily_mutator_ids: Array[String] = []
var daily_phase_rate := 1.0
var daily_shift_instability_bonus := 0.0
var daily_radar_jammed := false
var daily_supply_blackout := false
# COUNTERPLAY DIRECTOR / 0.16: local-only, decaying behavioural signals; no telemetry upload.
const TACTICAL_DOCTRINE_REFRESH_SECONDS := 1.0
const TACTICAL_DOCTRINE_LOCK_SECONDS := 5.5
var tactical_action_counts: Dictionary = {"dash": 0.0, "pulse": 0.0, "phase": 0.0}
var tactical_doctrine_clock := 0.0
var tactical_doctrine_lock_timer := 0.0
var adaptive_doctrine := "BALANCED"
var tactical_doctrine_changes := 0

func _ready() -> void:
	_reset_runtime_collections()
	if not Input.joy_connection_changed.is_connected(_on_joy_connection_changed):
		Input.joy_connection_changed.connect(_on_joy_connection_changed)
	var connected_gamepads: Array = Input.get_connected_joypads()
	if not connected_gamepads.is_empty():
		gamepad_device_id = int(connected_gamepads[0])
	_load_career()
	_resolve_shared_challenge()
	if daily_challenge_active:
		daily_run_seed = _daily_seed_for_code(daily_challenge_code)
		if daily_run_seed > 0:
			seed(daily_run_seed)
		else:
			daily_challenge_active = false
			daily_challenge_code = ""
			daily_run_seed = 0
			randomize()
	else:
		daily_run_seed = 0
		randomize()
	_create_materials()
	_create_procedural_surface_textures()
	_create_lighting()
	_create_impact_light_pool()
	_create_arena()
	_create_arena_props()
	_create_interactables()
	_create_objective_beacon()
	_create_player()
	_create_initial_guards()
	_create_ui()
	_configure_daily_mutators()
	_record_raid_event("raid_started", "DAILY" if daily_challenge_active else "STANDARD", float(daily_run_seed))
	_refresh_loadout()
	_apply_quality_mode()
	_apply_hazard_palette()
	_update_phase_lanes(0.0)
	_apply_hud_scale()
	_update_accessibility_buttons()
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
	raid_event_ledger = raid_event_ledger.duplicate(true)
	raid_event_ledger.clear()
	downed_bodies = downed_bodies.duplicate()
	for old_evidence in downed_bodies:
		var old_evidence_node := old_evidence.get("node") as Node3D
		if is_instance_valid(old_evidence_node):
			old_evidence_node.queue_free()
	downed_bodies.clear()
	stealth_mode_active = false
	stealth_footstep_clock = 0.0
	stealth_stance_seconds = 0.0
	stealth_quiet_steps = 0
	stealth_detections = 0
	stealth_takedowns = 0
	stealth_chain = 0
	stealth_chain_best = 0
	stealth_body_discoveries = 0
	stealth_bonus_credits = 0
	daily_run_seed = 0
	counter_window_remaining = 0.0
	counter_windows_earned = 0
	countershot_hits = 0
	weakpoint_exposures = 0
	weakpoint_hits = 0
	salvage_drops = salvage_drops.duplicate()
	for old_drop in salvage_drops:
		var old_node := old_drop.get("node") as Node3D
		if is_instance_valid(old_node):
			old_node.queue_free()
	salvage_drops.clear()
	salvage_pickups_spawned = 0
	salvage_pickups_collected = 0
	salvage_pickups_expired = 0
	salvage_pickups_evicted = 0
	combo_mastery_awards = 0
	mission_success = false
	mission_finished = false
	elapsed = 0.0
	daily_mutators = daily_mutators.duplicate()
	daily_mutators.clear()
	daily_mutator_ids = daily_mutator_ids.duplicate()
	daily_mutator_ids.clear()
	daily_phase_rate = 1.0
	daily_shift_instability_bonus = 0.0
	daily_radar_jammed = false
	daily_supply_blackout = false
	tactical_action_counts = tactical_action_counts.duplicate()
	tactical_action_counts.clear()
	tactical_action_counts["dash"] = 0.0
	tactical_action_counts["pulse"] = 0.0
	tactical_action_counts["phase"] = 0.0
	tactical_doctrine_clock = 0.0
	tactical_doctrine_lock_timer = 0.0
	adaptive_doctrine = "BALANCED"
	tactical_doctrine_changes = 0
	combat_noise_position = Vector3.ZERO
	combat_noise_radius = 0.0
	combat_noise_timer = 0.0
	combat_noise_serial = 0
	combat_noise_source = ""
	squad_alert_position = Vector3.ZERO
	squad_alert_timer = 0.0
	squad_alert_serial = 0
	squad_alert_source = ""
	critical_hits = 0
	suppression_hits = 0
	suppression_breaks = 0
	suppression_attack_interrupts = 0
	suppression_total_pressure = 0.0
	shots_fired = 0
	shots_hit = 0
	damage_taken_total = 0.0
	combat_combo = 0
	combat_combo_timer = 0.0
	combat_combo_best = 0
	combo_breaks = 0
	overdrive_charge = 0.0
	overdrive_timer = 0.0
	overdrive_activations = 0
	overdrive_arc_chains = 0
	weapon_heat = 0.0
	weapon_overheated = false
	weapon_overheat_events = 0
	weapon_vent_cooldown = 0.0
	weapon_vent_uses = 0
	weapon_vent_hits = 0
	scan_cooldown = 0.0
	scan_active_timer = 0.0
	scan_activations = 0
	scan_hostiles_revealed_total = 0
	scan_devices_revealed_total = 0
	if is_instance_valid(phase_echo_node):
		phase_echo_node.queue_free()
	phase_echo_node = null
	phase_echo_hologram = null
	phase_echo_ring = null
	phase_echo_light = null
	phase_echo_remaining = 0.0
	phase_echo_cooldown = 0.0
	phase_echo_activations = 0
	phase_echo_lures = 0
	warden_phase_transitions = 0
	warden_staggers = 0
	mission_accuracy = 100.0
	mission_score = 0
	combat_score_total = 0
	mission_grade = "C"
	impact_wave_timer = 0.0
	impact_wave_duration = 0.34
	impact_wave_strength = 0.0
	objective_beacon_beam_materials = objective_beacon_beam_materials.duplicate()
	objective_beacon_beam_materials.clear()
	objective_beacon_target = null
	objective_beacon_stage = ""
	objective_beacon_phase = 0.0
	guards = guards.duplicate()
	guards.clear()
	devices = devices.duplicate()
	devices.clear()
	phase_lanes = phase_lanes.duplicate()
	phase_lanes.clear()
	phase_lane_disruptions = 0
	device_emp_overloads = 0
	device_cell_novas = 0
	device_lane_collapses = 0
	device_hostiles_suppressed = 0
	extraction_pressure_active = false
	extraction_window_remaining = 0.0
	extraction_overload_triggered = false
	extraction_reinforcements_spawned = 0
	extraction_overload_count = 0
	dash_trail_clock = 0.0
	dash_trail_last_position = Vector3.ZERO
	dash_trails_emitted = 0
	phase_lane_labels = phase_lane_labels.duplicate()
	phase_lane_labels.clear()
	effects = effects.duplicate()
	effects.clear()
	spark_pool = spark_pool.duplicate()
	spark_pool.clear()
	spark_effects = spark_effects.duplicate()
	spark_effects.clear()
	impact_light_pool = impact_light_pool.duplicate()
	impact_light_pool.clear()
	impact_light_effects = impact_light_effects.duplicate()
	impact_light_effects.clear()
	impact_light_cursor = 0
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
	frame_budget_misses = frame_budget_misses.duplicate()
	frame_budget_misses.clear()
	adaptive_quality_level = 0
	adaptive_quality_degraded = false
	adaptive_slow_windows = 0
	adaptive_fast_windows = 0
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
	if not paused_game and not mission_finished and not briefing_visible:
		elapsed += dt
		_update_combat_director(dt)
		_update_extraction_director(dt)
		_update_phase_lanes(dt)
		_update_phase_echo(dt)
		_update_salvage_drops(dt)
		_update_downed_bodies(dt)
		if stealth_mode_active:
			stealth_stance_seconds += dt
	scene_clock += dt
	damage_flash_timer = maxf(0.0, damage_flash_timer - dt)
	camera_shake_timer = maxf(0.0, camera_shake_timer - dt)
	impact_flash_timer = maxf(0.0, impact_flash_timer - dt)
	impact_wave_timer = maxf(0.0, impact_wave_timer - dt)
	if impact_wave_timer <= 0.0:
		impact_wave_strength = 0.0
	damage_direction_timer = maxf(0.0, damage_direction_timer - dt)
	phase_flash_timer = maxf(0.0, phase_flash_timer - dt)
	crosshair_kick = move_toward(crosshair_kick, 0.0, dt * 5.6)
	crosshair_hit_timer = maxf(0.0, crosshair_hit_timer - dt)
	if camera_shake_timer <= 0.0:
		camera_shake_strength = 0.0
	frame_samples.append(current_frame_ms)
	frame_budget_misses.append(1.0 if current_frame_ms > (1000.0 / 60.0) else 0.0)
	if frame_samples.size() > 120:
		frame_samples.pop_front()
	if frame_budget_misses.size() > 120:
		frame_budget_misses.pop_front()
	adaptive_quality_clock += maxf(0.0, delta)
	if adaptive_quality_clock >= 1.25:
		adaptive_quality_clock = fmod(adaptive_quality_clock, 1.25)
		_update_adaptive_quality()
	_update_camera(dt)
	_animate_world(dt)
	_update_operator_lighting(dt)
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
	_poll_gamepad_state()
	var dt := minf(delta, 0.05)
	fire_cooldown = maxf(0.0, fire_cooldown - dt)
	dash_cooldown = maxf(0.0, dash_cooldown - dt)
	pulse_cooldown = maxf(0.0, pulse_cooldown - dt)
	damage_cooldown = maxf(0.0, damage_cooldown - dt)
	counter_window_remaining = maxf(0.0, counter_window_remaining - dt)
	_update_weapon_systems(dt)
	combat_noise_timer = maxf(0.0, combat_noise_timer - dt)
	squad_alert_timer = maxf(0.0, squad_alert_timer - dt)
	null_shift_timer = maxf(0.0, null_shift_timer - dt)
	if null_shift_timer == 0.0 and instability > 0.0:
		instability = maxf(0.0, instability - dt * 3.0)
	_move_player(dt)
	_update_footstep_signature(dt)
	_update_dash_trail(dt)
	_update_guards(dt)
	_check_phase_lane_damage()
	# Keep the evade window open through movement, hostile attacks and lane damage for this physics tick.
	dash_timer = maxf(0.0, dash_timer - dt)
	if touch_firing or mouse_firing or gamepad_fire_held:
		_fire_weapon()
	if player_health <= 0.0:
		_finish_mission(false)

func _unhandled_input(event: InputEvent) -> void:
	if is_instance_valid(chronicle_panel) and chronicle_panel.visible:
		if event is InputEventKey:
			var chronicle_key := event as InputEventKey
			if chronicle_key.pressed and not chronicle_key.echo:
				if chronicle_key.keycode == KEY_ESCAPE:
					_close_operator_chronicle()
				elif chronicle_key.keycode == KEY_J:
					_export_operator_chronicle()
				get_viewport().set_input_as_handled()
		return
	if event is InputEventMouseMotion:
		_set_gamepad_mode(false)
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_gamepad_mode(false)
		mouse_firing = event.pressed
		return
	if event is InputEventJoypadMotion:
		var axis_event := event as InputEventJoypadMotion
		if absf(axis_event.axis_value) >= GAMEPAD_MOVE_DEADZONE:
			gamepad_device_id = axis_event.device
			_set_gamepad_mode(true)
		return
	if event is InputEventJoypadButton:
		_handle_gamepad_button(event as InputEventJoypadButton)
		return
	if not (event is InputEventKey):
		return
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return
	_set_gamepad_mode(false)
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
		KEY_R:
			_activate_overdrive()
		KEY_V:
			_activate_weapon_vent()
		KEY_Z:
			_activate_tactical_scan()
		KEY_T:
			_deploy_phase_echo()
		KEY_SPACE:
			_try_dash()
		KEY_SHIFT:
			_shift_layer()
		KEY_F2:
			_toggle_quality()
		KEY_F3:
			_toggle_diagnostics()
		KEY_F4:
			_toggle_reduced_motion()
		KEY_F5:
			_toggle_color_safe_mode()
		KEY_F6:
			_cycle_hud_scale()
		KEY_F7:
			_toggle_haptics()
		KEY_ESCAPE:
			_set_pause(not paused_game)
		KEY_B:
			_toggle_stealth_mode()
		KEY_C:
			_cycle_contract()
		KEY_J:
			_show_operator_chronicle()
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

func _on_joy_connection_changed(device: int, connected: bool) -> void:
	if connected:
		gamepad_device_id = device
		return
	if gamepad_device_id != device:
		return
	var connected_gamepads: Array = Input.get_connected_joypads()
	gamepad_device_id = int(connected_gamepads[0]) if not connected_gamepads.is_empty() else -1
	gamepad_move = Vector2.ZERO
	gamepad_aim = Vector2.ZERO
	gamepad_fire_held = false
	if gamepad_device_id < 0:
		_set_gamepad_mode(false)

func _set_gamepad_mode(enabled: bool) -> void:
	if gamepad_mode_active == enabled:
		return
	gamepad_mode_active = enabled
	_update_input_hint()

func _haptic_output_available() -> bool:
	return haptics_enabled and gamepad_device_id >= 0 and Input.get_connected_joypads().has(gamepad_device_id)

func _pulse_gamepad(weak_magnitude: float, strong_magnitude: float, duration: float) -> bool:
	if not _haptic_output_available():
		return false
	Input.start_joy_vibration(gamepad_device_id, clampf(weak_magnitude, 0.0, 1.0), clampf(strong_magnitude, 0.0, 1.0), clampf(duration, 0.0, 0.32))
	return true

func _toggle_haptics() -> void:
	haptics_enabled = not haptics_enabled
	career.set_value("settings", "haptics_enabled", haptics_enabled)
	_save_career()
	_update_accessibility_buttons()
	objective_text = "ТАКТИЛЬНЫЙ ОТКЛИК ВКЛЮЧЁН" if haptics_enabled else "ТАКТИЛЬНЫЙ ОТКЛИК ОТКЛЮЧЁН"
	if not haptics_enabled and gamepad_device_id >= 0 and Input.get_connected_joypads().has(gamepad_device_id):
		Input.stop_joy_vibration(gamepad_device_id)
	_update_hud()

func _apply_gamepad_deadzone(value: Vector2, deadzone: float = GAMEPAD_MOVE_DEADZONE) -> Vector2:
	var magnitude: float = minf(value.length(), 1.0)
	if magnitude <= deadzone:
		return Vector2.ZERO
	var remapped: float = clampf((magnitude - deadzone) / maxf(0.001, 1.0 - deadzone), 0.0, 1.0)
	return value.normalized() * remapped

func _poll_gamepad_state() -> void:
	var connected_gamepads: Array = Input.get_connected_joypads()
	if not connected_gamepads.has(gamepad_device_id):
		if connected_gamepads.is_empty():
			gamepad_device_id = -1
			gamepad_move = Vector2.ZERO
			gamepad_aim = Vector2.ZERO
			gamepad_fire_held = false
			if gamepad_mode_active:
				_set_gamepad_mode(false)
			return
		gamepad_device_id = int(connected_gamepads[0])
		gamepad_move = Vector2.ZERO
		gamepad_aim = Vector2.ZERO
		gamepad_fire_held = false
		return
	var raw_move := Vector2(
		Input.get_joy_axis(gamepad_device_id, JOY_AXIS_LEFT_X),
		Input.get_joy_axis(gamepad_device_id, JOY_AXIS_LEFT_Y)
	)
	var raw_aim := Vector2(
		Input.get_joy_axis(gamepad_device_id, JOY_AXIS_RIGHT_X),
		Input.get_joy_axis(gamepad_device_id, JOY_AXIS_RIGHT_Y)
	)
	gamepad_move = _apply_gamepad_deadzone(raw_move, GAMEPAD_MOVE_DEADZONE)
	gamepad_aim = _apply_gamepad_deadzone(raw_aim, GAMEPAD_AIM_DEADZONE)
	var right_trigger: float = Input.get_joy_axis(gamepad_device_id, JOY_AXIS_TRIGGER_RIGHT)
	gamepad_fire_held = Input.is_joy_button_pressed(gamepad_device_id, JOY_BUTTON_RIGHT_SHOULDER) or right_trigger > 0.35
	if gamepad_move.length_squared() > 0.003 or gamepad_aim.length_squared() > 0.003 or gamepad_fire_held:
		_set_gamepad_mode(true)

func _handle_gamepad_button(event: InputEventJoypadButton) -> void:
	if event.pressed:
		gamepad_device_id = event.device
		_set_gamepad_mode(true)
	if not event.pressed:
		return
	var button: int = event.button_index
	if briefing_visible:
		if button in [JOY_BUTTON_A, JOY_BUTTON_START]:
			_dismiss_briefing()
			get_viewport().set_input_as_handled()
		return
	if terminal_active:
		var cipher_key: int = -1
		match button:
			JOY_BUTTON_DPAD_UP:
				cipher_key = KEY_UP
			JOY_BUTTON_DPAD_LEFT:
				cipher_key = KEY_LEFT
			JOY_BUTTON_DPAD_DOWN:
				cipher_key = KEY_DOWN
			JOY_BUTTON_DPAD_RIGHT:
				cipher_key = KEY_RIGHT
		if cipher_key >= 0:
			_submit_cipher_key(cipher_key)
			get_viewport().set_input_as_handled()
			return
		if button != JOY_BUTTON_A and button != JOY_BUTTON_START and button != JOY_BUTTON_BACK and button != JOY_BUTTON_LEFT_SHOULDER:
			return
	match button:
		JOY_BUTTON_A:
			_interact()
		JOY_BUTTON_B:
			_try_dash()
		JOY_BUTTON_X:
			_deploy_pulse()
		JOY_BUTTON_Y:
			_shift_layer()
		JOY_BUTTON_START:
			_set_pause(not paused_game)
		JOY_BUTTON_BACK:
			_toggle_diagnostics()
		JOY_BUTTON_RIGHT_STICK:
			_activate_overdrive()
		JOY_BUTTON_LEFT_STICK:
			_toggle_stealth_mode()
		JOY_BUTTON_DPAD_UP:
			_activate_tactical_scan()
		JOY_BUTTON_DPAD_RIGHT:
			_deploy_phase_echo()
		JOY_BUTTON_DPAD_DOWN:
			_activate_weapon_vent()
		JOY_BUTTON_LEFT_SHOULDER:
			_toggle_loadout()
		# RB/RT fires while held; polling keeps the trigger responsive with no key-repeat.
	get_viewport().set_input_as_handled()

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
	materials["objective_exit"] = _material(Color(0.42, 1.0, 0.78), Color(0.16, 1.0, 0.62), 1.55, 0.28, 0.22)
	materials["grid"] = _material(Color(0.09, 0.31, 0.3, 0.4), Color(0.035, 0.25, 0.24), 0.38, 0.0, 1.0)
	materials["telegraph"] = _material(Color(1.0, 0.13, 0.2, 0.8), Color(1.0, 0.035, 0.08), 1.8, 0.0, 1.0)

func _create_procedural_surface_textures() -> void:
	# Generate one seamless surface set in memory: no downloads, binary art assets, or per-frame allocations.
	var size: int = surface_texture_size
	var height_image := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var albedo_image := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var roughness_image := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var heights := PackedFloat32Array()
	heights.resize(size * size)
	for y in range(size):
		var v: float = float(y) / float(size)
		for x in range(size):
			var u: float = float(x) / float(size)
			# Integer-frequency waves are periodic at both borders to avoid obvious seams when tiled.
			var warp: float = sin(TAU * 3.0 * u + sin(TAU * 2.0 * v) * 0.12)
			var brushed: float = sin(TAU * (23.0 * v + warp * 0.018))
			var fine_grain: float = sin(TAU * (17.0 * u + 29.0 * v)) * 0.55 + sin(TAU * (41.0 * u - 13.0 * v)) * 0.22
			var index: int = y * size + x
			var height_value: float = clampf(0.5 + brushed * 0.075 + fine_grain * 0.018, 0.0, 1.0)
			heights[index] = height_value
			var albedo_value: float = clampf(0.91 + brushed * 0.035 + fine_grain * 0.018, 0.80, 0.99)
			var rough_value: float = clampf(0.72 + absf(brushed) * 0.15 + absf(fine_grain) * 0.06, 0.50, 0.96)
			albedo_image.set_pixel(x, y, Color(albedo_value, albedo_value, albedo_value, 1.0))
			roughness_image.set_pixel(x, y, Color(rough_value, rough_value, rough_value, 1.0))
	for y in range(size):
		var up_y: int = posmod(y - 1, size)
		var down_y: int = posmod(y + 1, size)
		for x in range(size):
			var left_x: int = posmod(x - 1, size)
			var right_x: int = posmod(x + 1, size)
			var left_h: float = heights[y * size + left_x]
			var right_h: float = heights[y * size + right_x]
			var up_h: float = heights[up_y * size + x]
			var down_h: float = heights[down_y * size + x]
			var tangent_normal := Vector3((left_h - right_h) * 5.8, (up_h - down_h) * 5.8, 1.0).normalized()
			height_image.set_pixel(
				x,
				y,
				Color(tangent_normal.x * 0.5 + 0.5, tangent_normal.y * 0.5 + 0.5, tangent_normal.z * 0.5 + 0.5, 1.0)
			)
	surface_albedo_texture = ImageTexture.create_from_image(albedo_image)
	surface_normal_texture = ImageTexture.create_from_image(height_image)
	surface_roughness_texture = ImageTexture.create_from_image(roughness_image)
	_apply_procedural_surface_materials()

func _apply_procedural_surface_materials() -> void:
	# Reuse one compact texture set across materials; change tiling and normal strength by surface.
	var surface_settings: Array[Dictionary] = [
		{"name": "floor", "uv": Vector3(10.0, 10.0, 1.0), "normal": 0.22},
		{"name": "wall", "uv": Vector3(4.0, 4.0, 1.0), "normal": 0.16},
		{"name": "wall_trim", "uv": Vector3(2.5, 2.5, 1.0), "normal": 0.10}
	]
	for setting in surface_settings:
		var surface_material: StandardMaterial3D = materials.get(str(setting["name"])) as StandardMaterial3D
		if not is_instance_valid(surface_material):
			continue
		surface_material.albedo_texture = surface_albedo_texture
		surface_material.uv1_scale = setting["uv"]
		surface_material.normal_texture = surface_normal_texture
		surface_material.normal_scale = float(setting["normal"])
		surface_material.normal_enabled = true
		surface_material.roughness_texture = surface_roughness_texture


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

func _create_impact_light_pool() -> void:
	# Four reusable, shadowless lights make impacts illuminate nearby 3D geometry.
	impact_light_pool = impact_light_pool.duplicate()
	impact_light_pool.clear()
	impact_light_effects = impact_light_effects.duplicate()
	impact_light_effects.clear()
	impact_light_cursor = 0
	for index in range(MAX_IMPACT_LIGHT_POOL):
		var flash := OmniLight3D.new()
		flash.name = "CombatImpactLight_%02d" % [index + 1]
		flash.light_color = Color(0.12, 1.0, 0.82)
		flash.light_energy = 0.0
		flash.omni_range = 3.5
		flash.shadow_enabled = false
		flash.visible = false
		add_child(flash)
		impact_light_pool.append(flash)
		impact_light_effects.append({"node": flash, "remaining": 0.0, "duration": 0.14, "energy": 0.0, "range": 3.5})


func _impact_lighting_enabled() -> bool:
	return not performance_quality and not adaptive_quality_degraded


func _spawn_impact_light(at: Vector3, tint: Color, energy: float, radius: float, lifetime: float) -> void:
	if impact_light_pool.is_empty() or not _impact_lighting_enabled():
		return
	var pool_index: int = impact_light_cursor % impact_light_pool.size()
	impact_light_cursor = (pool_index + 1) % impact_light_pool.size()
	var flash: OmniLight3D = impact_light_pool[pool_index]
	if not is_instance_valid(flash):
		return
	var duration: float = maxf(0.04, lifetime)
	var flash_energy: float = maxf(0.0, energy)
	var flash_range: float = maxf(0.5, radius)
	flash.global_position = at
	flash.light_color = tint
	flash.light_energy = flash_energy
	flash.omni_range = flash_range
	flash.visible = true
	impact_light_effects[pool_index] = {"node": flash, "remaining": duration, "duration": duration, "energy": flash_energy, "range": flash_range}
	if not effects.has(flash):
		effects.append(flash)


func _active_impact_light_count() -> int:
	var count := 0
	for state in impact_light_effects:
		if float(state.get("remaining", 0.0)) > 0.0:
			count += 1
	return count


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
	_create_atmosphere_particles()

func _create_atmosphere_particles() -> void:
	# Fine drifting motes give the arena depth without external textures or per-frame allocations.
	atmosphere_particles = GPUParticles3D.new()
	atmosphere_particles.name = "SuspendedSignalDust"
	atmosphere_particles.amount = 72
	atmosphere_particles.lifetime = 7.4
	atmosphere_particles.explosiveness = 0.0
	atmosphere_particles.randomness = 1.0
	atmosphere_particles.fixed_fps = 30
	atmosphere_particles.interpolate = true
	atmosphere_particles.local_coords = true
	atmosphere_particles.visibility_aabb = AABB(Vector3(-25.0, -1.0, -17.0), Vector3(50.0, 10.0, 34.0))
	atmosphere_particles.position = Vector3(0.0, 1.8, 0.0)
	var process_material := ParticleProcessMaterial.new()
	process_material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	process_material.emission_box_extents = Vector3(22.0, 3.2, 13.5)
	process_material.direction = Vector3(0.12, 0.03, -0.08)
	process_material.spread = 32.0
	process_material.initial_velocity_min = 0.025
	process_material.initial_velocity_max = 0.11
	process_material.gravity = Vector3.ZERO
	process_material.scale_min = 0.45
	process_material.scale_max = 1.15
	process_material.color = Color(0.5, 0.94, 0.88, 0.34)
	var fade := Gradient.new()
	fade.set_color(0, Color(0.34, 0.88, 0.82, 0.0))
	fade.add_point(0.14, Color(0.42, 0.96, 0.88, 0.25))
	fade.add_point(0.82, Color(0.3, 0.75, 0.74, 0.16))
	fade.set_color(fade.get_point_count() - 1, Color(0.3, 0.75, 0.74, 0.0))
	var fade_texture := GradientTexture1D.new()
	fade_texture.gradient = fade
	process_material.color_ramp = fade_texture
	atmosphere_particles.process_material = process_material
	var mote_mesh := SphereMesh.new()
	mote_mesh.radius = 0.025
	mote_mesh.height = 0.05
	mote_mesh.radial_segments = 6
	mote_mesh.rings = 3
	var mote_material := StandardMaterial3D.new()
	mote_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mote_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mote_material.albedo_color = Color(0.45, 0.92, 0.85, 0.42)
	mote_material.emission_enabled = true
	mote_material.emission = Color(0.035, 0.24, 0.21)
	mote_material.emission_energy_multiplier = 0.22
	mote_mesh.material = mote_material
	atmosphere_particles.draw_pass_1 = mote_mesh
	atmosphere_particles.emitting = false
	atmosphere_particles.visible = false
	add_child(atmosphere_particles)

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
		# A real local light travels with the surge and communicates its hazard state spatially.
		var pulse_light := _make_omni_light(pulse_rig, Vector3(-20.5, 0.34, 0.0), Color(1.0, 0.58, 0.2), 0.95, 3.7)
		phase_lanes.append({
			"z": lane_z,
			"offset": float(index) * 2.8,
			"state": "safe",
			"disruption_remaining": 0.0,
			"warning_mesh": warning_mesh,
			"active_mesh": active_mesh,
			"warning_material": warning_material,
			"active_material": active_material,
			"pulse_rig": pulse_rig,
			"pulse_head": pulse_head,
			"pulse_ring": pulse_ring,
			"pulse_wake": pulse_wake,
			"pulse_light": pulse_light
		})

func _extraction_hazard_rate() -> float:
	if extraction_pressure_active:
		return EXTRACTION_PRESSURE_RATE
	if extraction_overload_triggered:
		return EXTRACTION_OVERTIME_RATE
	return 1.0

func _update_extraction_director(delta: float) -> void:
	if not extraction_pressure_active or mission_finished:
		return
	extraction_window_remaining = maxf(0.0, extraction_window_remaining - maxf(0.0, delta))
	if extraction_window_remaining > 0.0:
		return
	extraction_pressure_active = false
	extraction_overload_triggered = true
	extraction_overload_count += 1
	_record_raid_event("extraction_overload", "Lockdown breach", float(extraction_overload_count), extraction.global_position)
	alarm_active = true
	objective_text = "ОКНО ЭВАКУАЦИИ ЗАКРЫТО · СЕТЬ ПЕРЕХВАТА ВЫЗВАЛА ЭЛИТУ"
	if not warden_spawned:
		warden_spawned = true
		_spawn_guard(extraction.global_position + Vector3(-4.0, 0.82, -4.0), true)
		extraction_reinforcements_spawned += 1
	elif guards.size() < 8:
		_spawn_guard(extraction.global_position + Vector3(3.2, 0.82, -4.5), false)
		extraction_reinforcements_spawned += 1
	_spawn_ring_burst(extraction.global_position + Vector3.UP * 0.12, materials["red"])
	_spawn_impact_light(extraction.global_position + Vector3.UP * 0.6, Color(1.0, 0.12, 0.24), 3.8, 7.0, 0.34)
	_screen_impulse(0.24, 0.34)
	_play_sfx(74.0, 0.72, 0.17)
	if is_instance_valid(extraction_event_label):
		extraction_event_label.visible = true
	if is_instance_valid(extraction_event_bar):
		extraction_event_bar.visible = true
	_refresh_extraction_event_layout()
	_update_hud()

func _update_phase_lanes(delta: float) -> void:
	phase_clock += maxf(0.0, delta)
	var active_count: int = 0
	var warning_count: int = 0
	var disrupted_count: int = 0
	for index in range(phase_lanes.size()):
		var lane: Dictionary = phase_lanes[index]
		var cycle: float = fposmod(phase_clock * daily_phase_rate * _extraction_hazard_rate() + float(lane["offset"]), 8.4)
		var next_state: String = "safe"
		if cycle >= 4.95 and cycle < 6.3:
			next_state = "warning"
		elif cycle >= 6.3 and cycle < 7.22:
			next_state = "active"
		var disruption_remaining: float = maxf(0.0, float(lane.get("disruption_remaining", 0.0)) - maxf(delta, 0.0))
		lane["disruption_remaining"] = disruption_remaining
		if disruption_remaining > 0.0:
			next_state = "disrupted"
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
		var pulse: float = 0.65 + absf(sin(scene_clock * 11.5 + float(index))) * 0.95
		var pulse_light: OmniLight3D = lane["pulse_light"]
		pulse_light.position.x = travel_x
		pulse_light.visible = next_state != "safe" and not performance_quality and not adaptive_quality_degraded
		match next_state:
			"warning":
				pulse_light.light_color = _hazard_color("warning")
				pulse_light.light_energy = 0.82 + pulse * 0.34
			"active":
				pulse_light.light_color = _hazard_color("active")
				pulse_light.light_energy = 1.35 + pulse * 0.5
			"disrupted":
				pulse_light.light_color = _hazard_color("disrupted")
				pulse_light.light_energy = 0.48 + pulse * 0.18
			_:
				pulse_light.light_energy = 0.0
		var surge_material: Material = materials["cyan"] if next_state == "disrupted" else (active_material if next_state == "active" else warning_material)
		pulse_head.material_override = surge_material
		pulse_ring.material_override = surge_material
		pulse_wake.material_override = surge_material
		warning_material.emission_energy_multiplier = pulse if next_state == "warning" else 0.8
		active_material.emission_energy_multiplier = 2.0 + pulse if next_state == "active" else 1.8
		if next_state == "warning":
			warning_count += 1
		elif next_state == "active":
			active_count += 1
		elif next_state == "disrupted":
			disrupted_count += 1
		if phase_lane_labels.size() > index and (next_state != old_state or phase_lane_labels[index].text.is_empty()):
			var lane_label: Label = phase_lane_labels[index]
			match next_state:
				"warning":
					lane_label.text = "К%d · ЗАРЯД" % [index + 1]
					lane_label.add_theme_color_override("font_color", _hazard_color("warning"))
				"active":
					lane_label.text = "К%d · ОПАСНО" % [index + 1]
					lane_label.add_theme_color_override("font_color", _hazard_color("active"))
				"disrupted":
					lane_label.text = "К%d · ПОДАВЛЕН" % [index + 1]
					lane_label.add_theme_color_override("font_color", _hazard_color("disrupted"))
				_:
					lane_label.text = "К%d · НОРМА" % [index + 1]
					lane_label.add_theme_color_override("font_color", _hazard_color("safe"))
		if next_state != old_state and next_state == "warning":
			_play_sfx(340.0 + float(index) * 45.0, 0.07, 0.045)
		phase_lanes[index] = lane
	if not is_instance_valid(hazard_status_label):
		return
	if active_count > 0:
		hazard_status_label.text = "ОПАСНО · ЭНЕРГОКОНТУР АКТИВЕН"
		hazard_status_label.add_theme_color_override("font_color", _hazard_color("active"))
	elif warning_count > 0:
		hazard_status_label.text = "ВНИМАНИЕ · КОНТУР ЗАРЯЖАЕТСЯ"
		hazard_status_label.add_theme_color_override("font_color", _hazard_color("warning"))
	elif disrupted_count > 0:
		hazard_status_label.text = "ИМПУЛЬС · КОНТУР ПОДАВЛЕН"
		hazard_status_label.add_theme_color_override("font_color", _hazard_color("disrupted"))
	else:
		hazard_status_label.text = "ЭНЕРГОКОНТУРЫ · СТАБИЛЬНО"
		hazard_status_label.add_theme_color_override("font_color", _hazard_color("safe"))

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

func _create_objective_beacon() -> void:
	# One reusable world-space waypoint follows the live mission stage.
	# All geometry is generated by Godot, so the web export needs no external art.
	objective_beacon = Node3D.new()
	objective_beacon.name = "ObjectiveBeacon"
	add_child(objective_beacon)

	var beam_mesh := CylinderMesh.new()
	beam_mesh.top_radius = 0.025
	beam_mesh.bottom_radius = 0.16
	beam_mesh.height = 4.25
	beam_mesh.radial_segments = 12
	objective_beacon_beam = MeshInstance3D.new()
	objective_beacon_beam.name = "ObjectiveBeam"
	objective_beacon_beam.mesh = beam_mesh
	objective_beacon_beam.position = Vector3(0.0, 2.12, 0.0)
	objective_beacon_beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	objective_beacon.add_child(objective_beacon_beam)

	objective_beacon_ring = MeshInstance3D.new()
	objective_beacon_ring.name = "ObjectiveFloorRing"
	var floor_ring_mesh := TorusMesh.new()
	floor_ring_mesh.inner_radius = 0.52
	floor_ring_mesh.outer_radius = 0.64
	floor_ring_mesh.rings = 32
	floor_ring_mesh.ring_segments = 8
	objective_beacon_ring.mesh = floor_ring_mesh
	objective_beacon_ring.position.y = 0.05
	objective_beacon_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	objective_beacon.add_child(objective_beacon_ring)

	objective_beacon_top_ring = MeshInstance3D.new()
	objective_beacon_top_ring.name = "ObjectiveOrbit"
	var orbit_mesh := TorusMesh.new()
	orbit_mesh.inner_radius = 0.18
	orbit_mesh.outer_radius = 0.23
	orbit_mesh.rings = 24
	orbit_mesh.ring_segments = 8
	objective_beacon_top_ring.mesh = orbit_mesh
	objective_beacon_top_ring.position.y = 2.82
	objective_beacon_top_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	objective_beacon.add_child(objective_beacon_top_ring)

	objective_beacon_core = MeshInstance3D.new()
	objective_beacon_core.name = "ObjectiveSignal"
	var signal_mesh := SphereMesh.new()
	signal_mesh.radius = 0.12
	signal_mesh.height = 0.24
	signal_mesh.radial_segments = 12
	signal_mesh.rings = 6
	objective_beacon_core.mesh = signal_mesh
	objective_beacon_core.position.y = 3.15
	objective_beacon_core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	objective_beacon.add_child(objective_beacon_core)

	objective_beacon_beam_materials["terminal"] = _make_objective_beam_material(Color(0.10, 1.0, 0.79))
	objective_beacon_beam_materials["core"] = _make_objective_beam_material(Color(1.0, 0.61, 0.22))
	objective_beacon_beam_materials["extraction"] = _make_objective_beam_material(Color(0.42, 1.0, 0.70))
	objective_beacon_light = _make_omni_light(objective_beacon, Vector3(0.0, 1.3, 0.0), Color(0.10, 1.0, 0.79), 0.9, 4.4)
	objective_beacon.visible = true
	_update_objective_beacon(0.0)


func _make_objective_beam_material(tint: Color) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(tint.r, tint.g, tint.b, 0.15)
	mat.emission_enabled = true
	mat.emission = tint
	mat.emission_energy_multiplier = 1.15
	return mat


func _update_objective_beacon(delta: float) -> void:
	if not is_instance_valid(objective_beacon):
		return
	if mission_finished:
		objective_beacon.visible = false
		return

	var destination: Node3D
	var next_stage: String
	var ring_material: Material
	var signal_material: Material
	var tint: Color
	if not terminal_unlocked:
		destination = terminal
		next_stage = "terminal"
		ring_material = materials["cyan"]
		signal_material = materials["cyan"]
		tint = Color(0.10, 1.0, 0.79)
	elif not core_secured:
		destination = quantum_core
		next_stage = "core"
		ring_material = materials["gold"]
		signal_material = materials["gold"]
		tint = Color(1.0, 0.61, 0.22)
	else:
		destination = extraction
		next_stage = "extraction"
		ring_material = materials["objective_exit"]
		signal_material = materials["objective_exit"]
		tint = Color(0.42, 1.0, 0.70)

	if not is_instance_valid(destination):
		objective_beacon.visible = false
		return
	objective_beacon.visible = true
	objective_beacon_target = destination
	objective_beacon.global_position = Vector3(destination.global_position.x, 0.015, destination.global_position.z)

	if objective_beacon_stage != next_stage:
		objective_beacon_stage = next_stage
		objective_beacon_ring.material_override = ring_material
		objective_beacon_top_ring.material_override = ring_material
		objective_beacon_core.material_override = signal_material
		objective_beacon_beam.material_override = objective_beacon_beam_materials[next_stage]
		objective_beacon_light.light_color = tint

	var distance_xz: float = Vector2(player.global_position.x - destination.global_position.x, player.global_position.z - destination.global_position.z).length() if is_instance_valid(player) else 999.0
	var far_enough: bool = distance_xz > 4.2
	objective_beacon_beam.visible = far_enough
	objective_beacon_top_ring.visible = far_enough
	objective_beacon_core.visible = far_enough
	objective_beacon_light.visible = far_enough and not performance_quality and not adaptive_quality_degraded

	if not reduced_motion and not paused_game:
		objective_beacon_phase = fposmod(objective_beacon_phase + maxf(delta, 0.0), TAU)
	var pulse: float = 0.5 if reduced_motion else (0.5 + 0.5 * sin(objective_beacon_phase * 2.4))
	objective_beacon_ring.scale = Vector3(1.0 + pulse * 0.18, 1.0, 1.0 + pulse * 0.18)
	objective_beacon_core.scale = Vector3.ONE * (0.92 + pulse * 0.16)
	if not reduced_motion and not paused_game:
		objective_beacon_ring.rotate_y(maxf(delta, 0.0) * 0.48)
		objective_beacon_top_ring.rotate_y(-maxf(delta, 0.0) * 1.15)
	if objective_beacon_light.visible:
		objective_beacon_light.light_energy = 0.55 + pulse * 0.55


func _add_world_tag(parent: Node3D, tag_text: String, material: Material) -> Label3D:
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
	return tag

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

func _add_detail_cube(parent: Node3D, node_name: String, local_position: Vector3, size: Vector3, material: Material, casts_shadow: bool = false) -> MeshInstance3D:
	var visual: MeshInstance3D = _add_cube(parent, local_position, size, material)
	visual.name = node_name
	if casts_shadow:
		visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return visual

func _add_sphere_mesh(parent: Node3D, node_name: String, at: Vector3, radius: float, height: float, material: Material, casts_shadow: bool = false) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = height
	var visual := MeshInstance3D.new()
	visual.name = node_name
	visual.mesh = mesh
	visual.material_override = material
	visual.position = at
	visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if casts_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
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
	var device_tag: Label3D = _add_world_tag(body, label, materials["violet"] if kind == "ANCHOR" else (materials["amber"] if kind == "CELL" else materials["cyan"]))
	device_tag.visible = false
	add_child(body)
	devices.append({"node": body, "hp": 2, "kind": kind, "destroyed": false, "tag": device_tag, "scan_timer": 0.0})

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
	# Layered exosuit plates: visual-only geometry leaves collision and combat unchanged.
	_add_detail_cube(operator_rig, "OperatorChestShell", Vector3(0.0, 0.285, -0.535), Vector3(0.43, 0.19, 0.045), materials["wall_trim"], true)
	_add_detail_cube(operator_rig, "OperatorChestInset", Vector3(0.0, 0.29, -0.563), Vector3(0.245, 0.105, 0.016), materials["cyan_dark"])
	_add_detail_cube(operator_rig, "OperatorChestGlyph", Vector3(0.0, 0.29, -0.574), Vector3(0.035, 0.066, 0.009), materials["white"])
	_add_detail_cube(operator_rig, "OperatorChestWing_L", Vector3(-0.247, 0.29, -0.51), Vector3(0.065, 0.15, 0.035), materials["black"])
	_add_detail_cube(operator_rig, "OperatorChestWing_R", Vector3(0.247, 0.29, -0.51), Vector3(0.065, 0.15, 0.035), materials["black"])
	var operator_shoulder_left: MeshInstance3D = _add_sphere_mesh(operator_rig, "OperatorShoulder_L", Vector3(-0.38, 0.37, -0.035), 0.19, 0.29, materials["wall_trim"], true)
	operator_shoulder_left.scale = Vector3(1.12, 0.7, 1.0)
	var operator_shoulder_right: MeshInstance3D = _add_sphere_mesh(operator_rig, "OperatorShoulder_R", Vector3(0.38, 0.37, -0.035), 0.19, 0.29, materials["wall_trim"], true)
	operator_shoulder_right.scale = Vector3(1.12, 0.7, 1.0)
	_add_detail_cube(operator_rig, "OperatorShoulderSignal_L", Vector3(-0.395, 0.405, -0.16), Vector3(0.12, 0.035, 0.07), materials["cyan"])
	_add_detail_cube(operator_rig, "OperatorShoulderSignal_R", Vector3(0.395, 0.405, -0.16), Vector3(0.12, 0.035, 0.07), materials["amber"])
	_add_detail_cube(operator_rig, "OperatorBackpackShell", Vector3(0.0, 0.29, 0.405), Vector3(0.42, 0.42, 0.16), materials["black"], true)
	_add_detail_cube(operator_rig, "OperatorBackCell_L", Vector3(-0.135, 0.31, 0.5), Vector3(0.075, 0.28, 0.035), materials["cyan"])
	_add_detail_cube(operator_rig, "OperatorBackCell_R", Vector3(0.135, 0.31, 0.5), Vector3(0.075, 0.28, 0.035), materials["cyan"])
	_add_detail_cube(operator_rig, "OperatorBackSpine", Vector3(0.0, 0.29, 0.493), Vector3(0.045, 0.31, 0.02), materials["wall_trim"])
	for leg_index in range(2):
		var side: float = -1.0 if leg_index == 0 else 1.0
		var leg_pivot := Node3D.new()
		leg_pivot.name = "OperatorLeg_L" if leg_index == 0 else "OperatorLeg_R"
		leg_pivot.position = Vector3(side * 0.19, -0.32, -0.02)
		operator_rig.add_child(leg_pivot)
		_add_cube(leg_pivot, Vector3(0.0, -0.27, 0.0), Vector3(0.23, 0.2, 0.32), materials["black"])
		_add_cube(leg_pivot, Vector3(0.0, -0.365, -0.075), Vector3(0.25, 0.085, 0.42), materials["wall_trim"])
		_add_detail_cube(leg_pivot, "OperatorKneePlate_L" if leg_index == 0 else "OperatorKneePlate_R", Vector3(0.0, -0.12, -0.15), Vector3(0.19, 0.13, 0.055), materials["cyan_dark"])
		_add_detail_cube(leg_pivot, "OperatorKneeSignal_L" if leg_index == 0 else "OperatorKneeSignal_R", Vector3(0.0, -0.12, -0.181), Vector3(0.09, 0.025, 0.012), materials["amber"] if leg_index == 1 else materials["cyan"])
		operator_leg_pivots.append(leg_pivot)
	_add_cube(operator_rig, Vector3(0.0, 0.12, 0.31), Vector3(0.42, 0.45, 0.2), materials["black"])
	_add_cube(operator_rig, Vector3(-0.15, 0.15, 0.42), Vector3(0.06, 0.31, 0.035), materials["cyan"])
	_add_cube(operator_rig, Vector3(0.15, 0.15, 0.42), Vector3(0.06, 0.31, 0.035), materials["cyan"])
	var helmet := _add_sphere_mesh(operator_rig, "OperatorHelmet", Vector3(0.0, 0.69, -0.02), 0.245, 0.48, materials["black"])
	helmet.scale = Vector3(1.0, 1.0, 0.92)
	_add_cube(operator_rig, Vector3(0.0, 0.72, -0.235), Vector3(0.31, 0.075, 0.04), materials["cyan"])
	_add_cube(operator_rig, Vector3(0.0, 0.56, -0.21), Vector3(0.2, 0.04, 0.035), materials["amber"])
	# One shadowless practical light gives the layered exosuit a reactive cinematic rim.
	# It shares the existing local-light budget and is disabled by Performance mode.
	operator_rim_light = _make_omni_light(operator_rig, Vector3(-0.78, 0.92, -0.48), Color(0.10, 0.94, 0.79), 0.66, 4.6)
	operator_rim_light.name = "OperatorCinematicRimLight"
	operator_rim_light.light_specular = 0.34
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
	# Role-coded plates make enemies readable at combat distance.
	var guard_accent: Material = materials["gold"] if is_warden else (materials["cyan"] if role == "RANGER" else (materials["violet"] if role == "STALKER" else materials["amber"]))
	var guard_plate_scale: float = 1.18 if is_warden or role == "HEAVY" else 1.0
	_add_detail_cube(body, "GuardChestShell", Vector3(0.0, 0.285, -0.365), Vector3(0.37, 0.19, 0.04), materials["wall"], true)
	_add_detail_cube(body, "GuardChestCore", Vector3(0.0, 0.29, -0.389), Vector3(0.19, 0.075, 0.014), guard_accent)
	_add_detail_cube(body, "GuardChestVent_L", Vector3(-0.12, 0.29, -0.39), Vector3(0.025, 0.07, 0.012), materials["black"])
	_add_detail_cube(body, "GuardChestVent_R", Vector3(0.12, 0.29, -0.39), Vector3(0.025, 0.07, 0.012), materials["black"])
	var guard_shoulder_left: MeshInstance3D = _add_sphere_mesh(body, "GuardShoulder_L", Vector3(-0.38, 0.37, -0.035), 0.19 * guard_plate_scale, 0.29 * guard_plate_scale, materials["wall_trim"], true)
	guard_shoulder_left.scale = Vector3(1.12, 0.7, 1.0)
	var guard_shoulder_right: MeshInstance3D = _add_sphere_mesh(body, "GuardShoulder_R", Vector3(0.38, 0.37, -0.035), 0.19 * guard_plate_scale, 0.29 * guard_plate_scale, materials["wall_trim"], true)
	guard_shoulder_right.scale = Vector3(1.12, 0.7, 1.0)
	_add_detail_cube(body, "GuardShoulderSignal_L", Vector3(-0.395, 0.405, -0.16), Vector3(0.12, 0.035, 0.07), guard_accent)
	_add_detail_cube(body, "GuardShoulderSignal_R", Vector3(0.395, 0.405, -0.16), Vector3(0.12, 0.035, 0.07), materials["wall_trim"] if is_warden else guard_accent)
	_add_detail_cube(body, "GuardBackpackShell", Vector3(0.0, 0.31, 0.405), Vector3(0.4 * guard_plate_scale, 0.39 * guard_plate_scale, 0.16), materials["black"], true)
	_add_detail_cube(body, "GuardBackCell_L", Vector3(-0.13, 0.32, 0.5), Vector3(0.075, 0.26, 0.035), guard_accent)
	_add_detail_cube(body, "GuardBackCell_R", Vector3(0.13, 0.32, 0.5), Vector3(0.075, 0.26, 0.035), guard_accent)
	_add_detail_cube(body, "GuardBackSpine", Vector3(0.0, 0.31, 0.493), Vector3(0.045, 0.29, 0.02), materials["wall_trim"])
	_add_detail_cube(body, "GuardUtilityBelt", Vector3(0.0, 0.065, -0.19), Vector3(0.5, 0.095, 0.11), materials["black"])
	_add_detail_cube(body, "GuardUtilityPouch_L", Vector3(-0.17, 0.055, -0.255), Vector3(0.09, 0.105, 0.055), guard_accent)
	_add_detail_cube(body, "GuardUtilityPouch_R", Vector3(0.17, 0.055, -0.255), Vector3(0.09, 0.105, 0.055), guard_accent)
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
	var leg_pivots: Array[Node3D] = []
	for leg_index in range(2):
		var side: float = -1.0 if leg_index == 0 else 1.0
		var leg_pivot := Node3D.new()
		leg_pivot.name = "GuardLeg_L" if leg_index == 0 else "GuardLeg_R"
		leg_pivot.position = Vector3(side * (0.2 if is_warden or role == "HEAVY" else 0.17), -0.34, 0.0)
		body.add_child(leg_pivot)
		_add_cube(leg_pivot, Vector3(0.0, -0.17, 0.025), Vector3(0.19, 0.38, 0.23), materials["black"])
		_add_cube(leg_pivot, Vector3(0.0, -0.345, -0.075), Vector3(0.23, 0.10, 0.38), materials["wall_trim"] if role != "STALKER" else materials["violet"])
		_add_cube(leg_pivot, Vector3(0.0, -0.075, -0.105), Vector3(0.205, 0.09, 0.035), role_material)
		_add_detail_cube(leg_pivot, "GuardKneePlate_L" if leg_index == 0 else "GuardKneePlate_R", Vector3(0.0, -0.12, -0.14), Vector3(0.18, 0.13, 0.055), materials["wall_trim"])
		_add_detail_cube(leg_pivot, "GuardKneeSignal_L" if leg_index == 0 else "GuardKneeSignal_R", Vector3(0.0, -0.12, -0.171), Vector3(0.09, 0.025, 0.012), guard_accent)
		leg_pivots.append(leg_pivot)
	var arm_pivots: Array[Node3D] = []
	for arm_index in range(2):
		var side: float = -1.0 if arm_index == 0 else 1.0
		var arm_pivot := Node3D.new()
		arm_pivot.name = "GuardArm_L" if arm_index == 0 else "GuardArm_R"
		arm_pivot.position = Vector3(side * (0.37 if not is_warden else 0.43), 0.31, -0.035)
		body.add_child(arm_pivot)
		_add_cube(arm_pivot, Vector3(0.0, -0.15, -0.035), Vector3(0.19, 0.38, 0.22), materials["black"])
		_add_cube(arm_pivot, Vector3(0.0, -0.255, -0.105), Vector3(0.17, 0.19, 0.19), role_material)
		_add_cube(arm_pivot, Vector3(0.0, -0.07, -0.15), Vector3(0.2, 0.09, 0.055), materials["wall_trim"])
		arm_pivots.append(arm_pivot)
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
	var awareness_readout := Label3D.new()
	awareness_readout.name = "AwarenessReadout"
	awareness_readout.text = "SIGNATURE · 00%"
	awareness_readout.font_size = 17
	awareness_readout.pixel_size = 0.012
	awareness_readout.outline_size = 8
	awareness_readout.outline_modulate = Color(0.003, 0.018, 0.024, 0.98)
	awareness_readout.modulate = Color(0.36, 0.95, 1.0, 1.0)
	awareness_readout.position = Vector3(0.0, 3.1 if is_warden else 2.82, 0.0)
	awareness_readout.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	awareness_readout.no_depth_test = true
	awareness_readout.visible = false
	body.add_child(awareness_readout)
	var scan_readout := Label3D.new()
	scan_readout.name = "ScanReadout"
	scan_readout.text = "SCAN / %s" % role
	scan_readout.font_size = 19
	scan_readout.pixel_size = 0.013
	scan_readout.outline_size = 8
	scan_readout.outline_modulate = Color(0.003, 0.018, 0.024, 0.98)
	scan_readout.modulate = Color(0.35, 1.0, 0.96, 1.0)
	scan_readout.position = Vector3(0.0, 2.88 if is_warden else 2.55, 0.0)
	scan_readout.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	scan_readout.no_depth_test = true
	scan_readout.visible = false
	body.add_child(scan_readout)
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
		"leg_pivots": leg_pivots,
		"arm_pivots": arm_pivots,
		"speed": 3.25 if is_warden else (3.0 if role == "STALKER" else (1.6 if role == "HEAVY" else (2.25 if current_contract == 2 else 1.9))),
		"damage": 18 if is_warden else (16 if role == "HEAVY" else 10),
		"warden": is_warden,
		"boss_phase": 1 if is_warden else 0,
		"stun": 0.0,
		"suppression": 0.0,
		"suppression_timer": 0.0,
		"suppression_lockout": 0.0,
		"windup": 0.0,
		"cooldown": randf_range(0.8, 1.8),
		"dash_windup": 0.0,
		"dash_timer": 0.0,
		"dash_cooldown": randf_range(1.4, 2.4),
		"weakpoint_exposed_timer": 0.0,
		"phase": randf_range(0.0, TAU),
		"patrol_origin": at,
		"tactical_slot": guards.size(),
		"tactical_angle": fposmod(float(guards.size()) * GUARD_FLANK_GOLDEN_ANGLE, TAU),
		"navigation_bias": 1 if guards.size() % 2 == 0 else -1,
		"last_known_position": at,
		"ai_state": "PATROL",
		"search_timer": 0.0,
		"heard_noise_serial": combat_noise_serial,
		"heard_squad_serial": squad_alert_serial,
		"role_tag": tag,
		"scan_readout": scan_readout,
		"scan_reveal_timer": 0.0,
		"awareness_readout": awareness_readout,
		"awareness": 0.0,
		"perceived_player": false,
		"displayed_ai_state": "PATROL"
	})
	_apply_daily_mutators_to_guard(guards.size() - 1)

func _read_move_input() -> Vector2:
	var move := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	move += Vector2(
		float(mobile_actions.get("right", false)) - float(mobile_actions.get("left", false)),
		float(mobile_actions.get("down", false)) - float(mobile_actions.get("up", false))
	)
	if gamepad_mode_active:
		move += gamepad_move
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
		var move_speed: float = PLAYER_SPEED * (PHANTOM_MOVE_SPEED_MULTIPLIER if stealth_mode_active else 1.0)
		player.velocity = Vector3(move.x * move_speed, 0.0, move.y * move_speed)
	player.move_and_slide()
	_update_player_aim()

func _toggle_stealth_mode() -> void:
	if paused_game or mission_finished or briefing_visible or terminal_active or not is_instance_valid(player):
		return
	stealth_mode_active = not stealth_mode_active
	stealth_footstep_clock = 0.0
	if not stealth_mode_active:
		stealth_chain = 0
	objective_text = "PHANTOM PROTOCOL · ТИХИЙ ШАГ / ОБХОД / УСТРАНЕНИЕ СО СПИНЫ" if stealth_mode_active else "PHANTOM PROTOCOL ОТКЛЮЧЁН · ВЕРНУЛСЯ ОБЫЧНЫЙ ШУМ ШАГОВ"
	_record_raid_event("stealth_mode", "PHANTOM ON" if stealth_mode_active else "PHANTOM OFF", 1.0 if stealth_mode_active else 0.0, player.global_position)
	_play_sfx(330.0 if stealth_mode_active else 230.0, 0.09, 0.045)
	_update_input_hint()
	_update_hud()

func _can_stealth_takedown(guard: Dictionary, operator_position: Vector3, stealth_enabled: bool) -> bool:
	if not stealth_enabled or bool(guard.get("warden", false)):
		return false
	if str(guard.get("ai_state", "PATROL")) not in ["PATROL", "SEARCHING"]:
		return false
	if float(guard.get("awareness", 0.0)) >= 0.72 or int(guard.get("hp", 0)) <= 0:
		return false
	var body := guard.get("node") as CharacterBody3D
	if not is_instance_valid(body):
		return false
	var toward_operator := operator_position - body.global_position
	toward_operator.y = 0.0
	var distance: float = toward_operator.length()
	if distance < 0.05 or distance > PHANTOM_TAKEDOWN_RANGE:
		return false
	var guard_forward := -body.global_transform.basis.z
	guard_forward.y = 0.0
	guard_forward = guard_forward.normalized()
	return guard_forward.dot(toward_operator.normalized()) < -0.25

func _try_stealth_takedown() -> bool:
	if not stealth_mode_active or paused_game or mission_finished or briefing_visible or terminal_active or not is_instance_valid(player):
		return false
	var nearest_index := -1
	var nearest_distance := PHANTOM_TAKEDOWN_RANGE
	for index in range(guards.size()):
		var candidate: Dictionary = guards[index]
		if not _can_stealth_takedown(candidate, player.global_position, true):
			continue
		var candidate_body := candidate.get("node") as Node3D
		if not is_instance_valid(candidate_body):
			continue
		var distance: float = player.global_position.distance_to(candidate_body.global_position)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_index = index
	if nearest_index < 0:
		return false
	var guard: Dictionary = guards[nearest_index]
	var body := guard.get("node") as CharacterBody3D
	if not is_instance_valid(body):
		return false
	var role: String = str(guard.get("role", "RANGER"))
	body.velocity = Vector3.ZERO
	body.collision_layer = 0
	body.collision_mask = 0
	var collision_shape := body.get_node_or_null("CollisionShape3D") as CollisionShape3D
	if is_instance_valid(collision_shape):
		collision_shape.disabled = true
	var old_position := body.global_position
	body.global_position = Vector3(old_position.x, 0.32, old_position.z)
	body.rotation = Vector3(PI * 0.5, body.rotation.y, body.rotation.z)
	for readout_name in ["HealthReadout", "HitFeedback", "ScanReadout", "AwarenessReadout"]:
		var readout := body.get_node_or_null(readout_name) as Label3D
		if is_instance_valid(readout):
			readout.visible = false
	var role_tag := body.get_node_or_null("CombatRole") as Label3D
	if is_instance_valid(role_tag):
		role_tag.text = "DOWNED · EVIDENCE"
		role_tag.modulate = Color(0.36, 0.95, 1.0, 1.0)
	stealth_takedowns += 1
	stealth_chain += 1
	stealth_chain_best = maxi(stealth_chain_best, stealth_chain)
	downed_bodies.append({"node": body, "remaining": PHANTOM_BODY_LIFETIME_SECONDS, "discovered": false, "role": role})
	if aim_target_node == body:
		aim_target_node = null
		target_lock_has_position = false
	guards.remove_at(nearest_index)
	_register_hostile_elimination(guard, body, false)
	var bonus: int = _stealth_reward_for_chain(stealth_chain)
	run_credits += bonus
	stealth_bonus_credits += bonus
	_record_raid_event("stealth_takedown", role + " / PHANTOM CHAIN " + str(stealth_chain), float(bonus), body.global_position)
	_spawn_ring_burst(body.global_position + Vector3.UP * 0.08, materials["cyan"])
	objective_text = "ТИХОЕ УСТРАНЕНИЕ · +%d CR · GHOST CHAIN ×%d" % [bonus, stealth_chain]
	_play_sfx(235.0 + float(mini(stealth_chain, 6)) * 28.0, 0.12, 0.055)
	_update_hud()
	return true

func _stealth_reward_for_chain(chain_count: int) -> int:
	return PHANTOM_TAKEDOWN_BASE_BONUS + mini(100, maxi(0, chain_count - 1) * 25)

func _guard_can_discover_downed_body(guard_body: CharacterBody3D, downed_body: Node3D) -> bool:
	if not is_instance_valid(guard_body) or not is_instance_valid(downed_body):
		return false
	if guard_body.global_position.distance_to(downed_body.global_position) > PHANTOM_BODY_DISCOVERY_RANGE:
		return false
	var eye_position := guard_body.global_position + Vector3.UP * 0.86
	var sight_target := Vector3(downed_body.global_position.x, eye_position.y, downed_body.global_position.z)
	if not _is_within_vision_cone(eye_position, -guard_body.global_transform.basis.z, sight_target, PHANTOM_BODY_DISCOVERY_RANGE, 122.0):
		return false
	var ray_target := downed_body.global_position + Vector3.UP * 0.2
	var query := PhysicsRayQueryParameters3D.create(eye_position, ray_target)
	query.collision_mask = 1
	query.exclude = [guard_body.get_rid()]
	return get_world_3d().direct_space_state.intersect_ray(query).is_empty()

func _update_downed_bodies(delta: float) -> void:
	for body_index in range(downed_bodies.size() - 1, -1, -1):
		var evidence: Dictionary = downed_bodies[body_index]
		var downed_body := evidence.get("node") as Node3D
		if not is_instance_valid(downed_body):
			downed_bodies.remove_at(body_index)
			continue
		var remaining: float = maxf(0.0, float(evidence.get("remaining", 0.0)) - maxf(0.0, delta))
		if not bool(evidence.get("discovered", false)):
			var discovered := false
			for live_guard in guards:
				if str(live_guard.get("ai_state", "PATROL")) == "ENGAGED":
					continue
				var live_body := live_guard.get("node") as CharacterBody3D
				if _guard_can_discover_downed_body(live_body, downed_body):
					discovered = true
					break
			if discovered:
				evidence["discovered"] = true
				remaining = 5.0
				stealth_body_discoveries += 1
				stealth_chain = 0
				alarm_active = true
				_broadcast_squad_contact(downed_body.global_position, "body-found", true)
				_record_raid_event("body_discovered", "Patrol found a downed hostile", 1.0, downed_body.global_position)
				objective_text = "PHANTOM COMPROMISED · ОБНАРУЖЕНО ТЕЛО · ОТРЯД ПОДНЯТ ПО ТРЕВОГЕ"
				var body_tag := downed_body.get_node_or_null("CombatRole") as Label3D
				if is_instance_valid(body_tag):
					body_tag.text = "BODY FOUND · ALARM"
					body_tag.modulate = Color(1.0, 0.34, 0.31, 1.0)
				_update_hud()
		evidence["remaining"] = remaining
		if remaining <= 0.0:
			downed_body.queue_free()
			downed_bodies.remove_at(body_index)
		else:
			downed_bodies[body_index] = evidence

func _update_footstep_signature(delta: float) -> void:
	if not is_instance_valid(player) or terminal_active or dash_timer > 0.0:
		stealth_footstep_clock = 0.0
		return
	var planar_speed := Vector2(player.velocity.x, player.velocity.z).length()
	if planar_speed < 0.45:
		stealth_footstep_clock = 0.0
		return
	stealth_footstep_clock += maxf(0.0, delta)
	if stealth_footstep_clock < PHANTOM_FOOTSTEP_INTERVAL:
		return
	stealth_footstep_clock = 0.0
	var quiet_step := stealth_mode_active
	_emit_combat_noise(player.global_position, _footstep_noise_radius(quiet_step), "stealth-footstep" if quiet_step else "footstep")
	if quiet_step:
		stealth_quiet_steps += 1

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
	_pulse_gamepad(0.12, 0.44, 0.075)
	_record_tactical_action("dash")
	_record_raid_event("dash", "Tactical evade", 1.0, player.global_position)
	dash_cooldown = DASH_COOLDOWN
	dash_trail_clock = 0.0
	dash_trail_last_position = player.global_position
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

func _update_dash_trail(delta: float) -> void:
	# Sample the real CharacterBody3D path in physics time and reuse the bounded ribbon pool.
	if not is_instance_valid(player):
		return
	if dash_timer <= 0.0:
		dash_trail_clock = 0.0
		dash_trail_last_position = player.global_position
		return
	dash_trail_clock += maxf(0.0, delta)
	if dash_trail_clock < DASH_TRAIL_INTERVAL:
		return
	dash_trail_clock = fmod(dash_trail_clock, DASH_TRAIL_INTERVAL)
	var current_position: Vector3 = player.global_position
	var previous_position: Vector3 = dash_trail_last_position
	dash_trail_last_position = current_position
	if previous_position.distance_to(current_position) < 0.06:
		return
	var offset := Vector3.UP * 0.42
	var trail_material: Material = materials["violet"] if null_shift_timer > 0.0 else materials["cyan"]
	var active_beams_before: int = beam_effects.size()
	_spawn_beam(previous_position + offset, current_position + offset, trail_material, DASH_TRAIL_LIFETIME)
	if beam_effects.size() > active_beams_before:
		dash_trails_emitted += 1

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
	elif gamepad_mode_active:
		if gamepad_aim.length_squared() > 0.003:
			var stick_direction := Vector3(gamepad_aim.x, 0.0, gamepad_aim.y).normalized()
			direction = stick_direction
			var selected := _select_aim_target(stick_direction, false)
			aim_target_node = selected["node"] as Node3D if not selected.is_empty() else null
			if is_instance_valid(aim_target_node):
				var target_direction: Vector3 = aim_target_node.global_position - player.global_position
				target_direction.y = 0.0
				if target_direction.length_squared() > 0.01:
					var alignment: float = stick_direction.dot(target_direction.normalized())
					if alignment > 0.88:
						var assist_weight: float = clampf((alignment - 0.88) / 0.12, 0.0, 1.0) * 0.14
						direction = stick_direction.slerp(target_direction.normalized(), assist_weight)
		else:
			aim_target_node = null
			direction = Vector3(player_aim.x, 0.0, player_aim.z)
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
			var minimum_alignment: float = 0.88 if gamepad_mode_active else 0.965
			if alignment < minimum_alignment:
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


func _is_within_vision_cone(observer_position: Vector3, facing_direction: Vector3, target_position: Vector3, max_distance: float, fov_degrees: float) -> bool:
	var offset := target_position - observer_position
	offset.y = 0.0
	var facing := facing_direction
	facing.y = 0.0
	var distance := offset.length()
	if distance <= 0.001 or distance > maxf(0.0, max_distance) or facing.length_squared() <= 0.001:
		return false
	var half_fov := deg_to_rad(clampf(fov_degrees, 0.0, 360.0) * 0.5)
	return facing.normalized().dot(offset.normalized()) >= cos(half_fov)

func _noise_is_audible(listener_position: Vector3, source_position: Vector3, radius: float) -> bool:
	return listener_position.distance_to(source_position) <= maxf(0.0, radius)

func _emit_combat_noise(origin: Vector3, radius: float, source_kind: String) -> void:
	combat_noise_position = origin
	combat_noise_radius = maxf(0.0, radius)
	combat_noise_timer = maxf(combat_noise_timer, 0.92)
	combat_noise_serial += 1
	combat_noise_source = source_kind
	if radius >= 7.0 and source_kind not in ["footstep", "stealth-footstep", "silent-takedown"]:
		stealth_chain = 0

func _broadcast_squad_contact(at: Vector3, source_kind: String = "visual-contact", force_refresh: bool = false) -> void:
	# One radio update per genuinely new contact. Echo decoys deliberately force a fresh signal serial.
	if force_refresh or squad_alert_timer <= 0.0 or squad_alert_position.distance_to(at) >= 4.0 or squad_alert_source != source_kind:
		squad_alert_position = at
		squad_alert_source = source_kind
		squad_alert_serial += 1
	squad_alert_timer = maxf(squad_alert_timer, 6.0)

func _squad_alert_audible_radius() -> float:
	if squad_alert_source == "phase-echo":
		return PHASE_ECHO_TRACKED_SIGNAL_RADIUS if adaptive_doctrine == "ECHO_TRACK" else PHASE_ECHO_SIGNAL_RADIUS
	return 34.0

func _guard_sight_radius(phantom_enabled: bool) -> float:
	return PHANTOM_SIGHT_RADIUS if phantom_enabled else GUARD_SIGHT_RADIUS

func _guard_sight_fov(phantom_enabled: bool) -> float:
	return PHANTOM_SIGHT_FOV_DEGREES if phantom_enabled else GUARD_SIGHT_FOV_DEGREES

func _footstep_noise_radius(phantom_enabled: bool) -> float:
	return PHANTOM_FOOTSTEP_RADIUS if phantom_enabled else STANDARD_FOOTSTEP_RADIUS

func _stealth_awareness_after_step(awareness: float, distance_to_player: float, delta: float) -> float:
	var proximity: float = 1.0 - clampf(maxf(0.0, distance_to_player) / PHANTOM_SIGHT_RADIUS, 0.0, 1.0)
	var detection_rate: float = 0.34 + proximity * 1.16
	return clampf(maxf(0.0, awareness) + maxf(0.0, delta) * detection_rate, 0.0, 1.0)

func _guard_can_see_player(body: CharacterBody3D) -> bool:
	if not is_instance_valid(player) or not is_instance_valid(body):
		return false
	var eye_position := body.global_position + Vector3.UP * 0.86
	var player_position := player.global_position + Vector3.UP * (0.36 if stealth_mode_active else 0.68)
	var facing_direction := -body.global_transform.basis.z
	if not _is_within_vision_cone(eye_position, facing_direction, player_position, _guard_sight_radius(stealth_mode_active), _guard_sight_fov(stealth_mode_active)):
		return false
	return _has_clear_path_to_player(eye_position, body)

func _update_guard_perception(guard: Dictionary, body: CharacterBody3D, sees_player: bool, delta: float) -> Dictionary:
	var state := str(guard.get("ai_state", "PATROL"))
	var last_known: Vector3 = guard.get("last_known_position", body.global_position)
	var search_timer := maxf(0.0, float(guard.get("search_timer", 0.0)) - delta)
	var awareness: float = clampf(float(guard.get("awareness", 0.0)), 0.0, 1.0)
	if stealth_mode_active and not bool(guard.get("warden", false)):
		if sees_player:
			awareness = _stealth_awareness_after_step(awareness, body.global_position.distance_to(player.global_position), delta)
		else:
			awareness = maxf(0.0, awareness - maxf(0.0, delta) * 1.15)
		sees_player = sees_player and awareness >= 1.0
	elif sees_player:
		awareness = 1.0
	else:
		awareness = maxf(0.0, awareness - maxf(0.0, delta) * 0.85)
	guard["awareness"] = awareness
	guard["perceived_player"] = sees_player

	if sees_player:
		if state != "ENGAGED":
			if stealth_mode_active:
				stealth_detections += 1
				stealth_chain = 0
			_broadcast_squad_contact(player.global_position)
		state = "ENGAGED"
		last_known = player.global_position
		search_timer = GUARD_SEARCH_SECONDS
		guard["heard_noise_serial"] = combat_noise_serial
		guard["heard_squad_serial"] = squad_alert_serial
	elif squad_alert_timer > 0.0 and int(guard.get("heard_squad_serial", 0)) != squad_alert_serial and _noise_is_audible(body.global_position, squad_alert_position, _squad_alert_audible_radius()):
		guard["heard_squad_serial"] = squad_alert_serial
		# Warden's elite tracking core rejects holographic decoys. Regular hostiles investigate.
		if squad_alert_source != "phase-echo" or not bool(guard.get("warden", false)):
			state = "INVESTIGATE"
			last_known = squad_alert_position
			search_timer = maxf(search_timer, GUARD_INVESTIGATION_SECONDS)
			if squad_alert_source == "phase-echo":
				phase_echo_lures = mini(9999, phase_echo_lures + 1)
				_record_raid_event("phase_echo_lure", str(guard.get("role", "HOSTILE")) + " diverted to decoy", 1.0, body.global_position)
	elif combat_noise_timer > 0.0 and int(guard.get("heard_noise_serial", 0)) != combat_noise_serial and _noise_is_audible(body.global_position, combat_noise_position, combat_noise_radius):
		state = "INVESTIGATE"
		last_known = combat_noise_position
		search_timer = maxf(search_timer, GUARD_INVESTIGATION_SECONDS)
		guard["heard_noise_serial"] = combat_noise_serial
	elif state == "ENGAGED":
		if search_timer <= 0.0:
			state = "INVESTIGATE"
			search_timer = GUARD_INVESTIGATION_SECONDS
	elif state == "INVESTIGATE":
		if body.global_position.distance_to(last_known) <= 1.75:
			state = "SEARCHING"
			search_timer = 2.25
		elif search_timer <= 0.0:
			state = "PATROL"
	elif state == "SEARCHING":
		if search_timer <= 0.0:
			state = "PATROL"
	else:
		state = "PATROL"

	guard["ai_state"] = state
	guard["last_known_position"] = last_known
	guard["search_timer"] = search_timer
	var awareness_readout := guard.get("awareness_readout") as Label3D
	if is_instance_valid(awareness_readout):
		awareness_readout.visible = stealth_mode_active and awareness > 0.015 and state != "ENGAGED"
		if awareness_readout.visible:
			awareness_readout.text = "SIGNATURE · %02d%%" % int(roundf(awareness * 100.0))
			awareness_readout.modulate = Color(1.0, 0.34, 0.31) if awareness >= 0.72 else (Color(1.0, 0.72, 0.34) if awareness >= 0.42 else Color(0.36, 0.95, 1.0))
	var role_tag := guard.get("role_tag") as Label3D
	if is_instance_valid(role_tag) and str(guard.get("displayed_ai_state", "")) != state:
		var role_name := str(guard.get("role", "RANGER"))
		match state:
			"ENGAGED":
				role_tag.text = role_name + " · CONTACT"
				role_tag.modulate = Color(1.0, 0.36, 0.35)
			"INVESTIGATE":
				role_tag.text = role_name + " · INVESTIGATE"
				role_tag.modulate = Color(1.0, 0.75, 0.39)
			"SEARCHING":
				role_tag.text = role_name + " · SWEEP"
				role_tag.modulate = Color(0.75, 0.66, 1.0)
			_:
				role_tag.text = role_name
				role_tag.modulate = Color(1.0, 0.30, 0.35) if role_name in ["WARDEN", "RANGER"] else (Color(0.72, 0.46, 1.0) if role_name == "STALKER" else Color(1.0, 0.68, 0.3))
		guard["displayed_ai_state"] = state
	return guard

func _guard_flank_target(guard: Dictionary, target_position: Vector3) -> Vector3:
	var role: String = str(guard.get("role", "RANGER"))
	var radius := 6.2
	match role:
		"STALKER":
			radius = 3.8
		"HEAVY":
			radius = 5.4
		"WARDEN":
			radius = 7.0
	if adaptive_doctrine == "SPLIT":
		match role:
			"STALKER":
				radius = 10.4
			"HEAVY":
				radius = 12.8
			"WARDEN":
				radius = 14.4
			_:
				radius = 13.4
	var angle := float(guard.get("tactical_angle", float(guard.get("tactical_slot", 0)) * GUARD_FLANK_GOLDEN_ANGLE))
	var target := target_position + Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)
	target.x = clampf(target.x, -21.0, 21.0)
	target.z = clampf(target.z, -12.0, 12.0)
	target.y = target_position.y
	return target

func _guard_direction_is_blocked(body: CharacterBody3D, direction: Vector3, distance: float = GUARD_NAVIGATION_RAY) -> bool:
	if not is_instance_valid(body) or direction.length_squared() < 0.001:
		return true
	var origin := body.global_position + Vector3.UP * 0.58
	var endpoint := origin + direction.normalized() * maxf(0.1, distance)
	var query := PhysicsRayQueryParameters3D.create(origin, endpoint)
	query.collision_mask = 1
	query.exclude = [body.get_rid()]
	return not get_world_3d().direct_space_state.intersect_ray(query).is_empty()

func _guard_navigation_direction(body: CharacterBody3D, target_position: Vector3, guard: Dictionary) -> Vector3:
	var desired := target_position - body.global_position
	desired.y = 0.0
	if desired.length_squared() < 0.02:
		return Vector3.ZERO
	desired = desired.normalized()
	if not _guard_direction_is_blocked(body, desired):
		return desired
	var side_axis := Vector3(-desired.z, 0.0, desired.x).normalized()
	var bias := 1.0 if int(guard.get("navigation_bias", 1)) >= 0 else -1.0
	var candidates: Array[Vector3] = [
		desired.rotated(Vector3.UP, 0.72), desired.rotated(Vector3.UP, -0.72),
		desired.rotated(Vector3.UP, 1.18), desired.rotated(Vector3.UP, -1.18),
		desired.rotated(Vector3.UP, 1.62), desired.rotated(Vector3.UP, -1.62),
		desired.rotated(Vector3.UP, 2.18), desired.rotated(Vector3.UP, -2.18)
	]
	var best_direction := Vector3.ZERO
	var best_score := -INF
	for candidate in candidates:
		if _guard_direction_is_blocked(body, candidate):
			continue
		var score := candidate.dot(desired) + candidate.dot(side_axis) * bias * 0.085
		if score > best_score:
			best_score = score
			best_direction = candidate
	return best_direction

func _guard_ai_target(guard: Dictionary, body: CharacterBody3D) -> Vector3:
	var state := str(guard.get("ai_state", "PATROL"))
	if state == "ENGAGED":
		var last_known: Vector3 = guard.get("last_known_position", body.global_position)
		return _guard_flank_target(guard, last_known)
	if state == "INVESTIGATE":
		var last_known: Vector3 = guard.get("last_known_position", body.global_position)
		return last_known
	if state == "SEARCHING":
		return body.global_position
	var patrol_origin: Vector3 = guard.get("patrol_origin", body.global_position)
	var patrol_phase := scene_clock * 0.42 + float(guard.get("phase", 0.0))
	return patrol_origin + Vector3(cos(patrol_phase) * 1.8, 0.0, sin(patrol_phase) * 1.25)

func _warden_radial_ray_count(boss_phase: int) -> int:
	return 12 if boss_phase >= 2 else 8

func _update_guards(delta: float) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		var body: CharacterBody3D = guard["node"]
		if not is_instance_valid(body):
			guards.remove_at(index)
			continue
		var health_timer: float = maxf(0.0, float(guard.get("health_timer", 0.0)) - delta)
		guard["health_timer"] = health_timer
		var weakpoint_before: float = float(guard.get("weakpoint_exposed_timer", 0.0))
		guard["weakpoint_exposed_timer"] = maxf(0.0, weakpoint_before - delta)
		if weakpoint_before > 0.0 and float(guard["weakpoint_exposed_timer"]) <= 0.0:
			_set_guard_weakpoint_visual(body, guard, false)
		guard["suppression"] = maxf(0.0, float(guard.get("suppression", 0.0)) - GUARD_SUPPRESSION_DECAY * delta)
		guard["suppression_timer"] = maxf(0.0, float(guard.get("suppression_timer", 0.0)) - delta)
		guard["suppression_lockout"] = maxf(0.0, float(guard.get("suppression_lockout", 0.0)) - delta)
		guard["hit_flash_timer"] = maxf(0.0, float(guard.get("hit_flash_timer", 0.0)) - delta)
		guard["hit_label_timer"] = maxf(0.0, float(guard.get("hit_label_timer", 0.0)) - delta)
		var health_readout := body.get_node_or_null("HealthReadout") as Label3D
		if is_instance_valid(health_readout):
			var suppression_value: float = float(guard.get("suppression", 0.0))
			var phase_marker: String = " · PII" if bool(guard.get("warden", false)) and int(guard.get("boss_phase", 1)) >= 2 else ""
			var weakpoint_marker: String = " · CORE OPEN" if float(guard.get("weakpoint_exposed_timer", 0.0)) > 0.0 else ""
			health_readout.visible = bool(guard["warden"]) or health_timer > 0.0 or suppression_value > 6.0 or not weakpoint_marker.is_empty()
			if suppression_value > 6.0:
				health_readout.text = "HP %d/%d · PRESSURE %d%%%s" % [maxi(0, int(guard["hp"])), int(guard.get("max_hp", 1)), int(roundf(suppression_value)), weakpoint_marker]
			else:
				health_readout.text = "HP %d/%d%s%s" % [maxi(0, int(guard["hp"])), int(guard.get("max_hp", 1)), phase_marker, weakpoint_marker]
		var ai_delta: float = delta * (0.64 if overdrive_timer > 0.0 else 1.0)
		var stun := maxf(0.0, float(guard["stun"]) - ai_delta)
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
		var sees_player := _guard_can_see_player(body)
		guard = _update_guard_perception(guard, body, sees_player, ai_delta)
		sees_player = bool(guard.get("perceived_player", sees_player))
		var ai_state := str(guard.get("ai_state", "PATROL"))
		var ai_target_position := _guard_ai_target(guard, body)
		var to_ai_target := ai_target_position - body.global_position
		to_ai_target.y = 0.0
		var ai_target_distance := to_ai_target.length()
		if ai_state == "SEARCHING":
			body.rotation.y += ai_delta * 1.45
		elif sees_player:
			body.look_at(Vector3(player.global_position.x, body.global_position.y, player.global_position.z), Vector3.UP)
		elif ai_target_distance > 0.01:
			body.look_at(Vector3(ai_target_position.x, body.global_position.y, ai_target_position.z), Vector3.UP)
		var role: String = str(guard.get("role", "RANGER"))
		if role == "STALKER":
			var dash_windup := maxf(0.0, float(guard.get("dash_windup", 0.0)) - ai_delta)
			var dash_timer := maxf(0.0, float(guard.get("dash_timer", 0.0)) - ai_delta)
			var dash_cooldown := maxf(0.0, float(guard.get("dash_cooldown", 1.0)) - ai_delta)
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
				if adaptive_doctrine == "INTERCEPT":
					var intercept_target: Vector3 = guard.get("dash_target_position", player.global_position)
					var intercept_direction := intercept_target - body.global_position
					intercept_direction.y = 0.0
					body.velocity = intercept_direction.normalized() * _effective_guard_speed(guard) * 3.4 if intercept_direction.length() > 0.9 else Vector3.ZERO
				else:
					body.velocity = to_player.normalized() * _effective_guard_speed(guard) * 3.4
				body.move_and_slide()
				if body.global_position.distance_to(player.global_position) < 2.15 and damage_cooldown <= 0.0 and _has_clear_path_to_player(body.global_position + Vector3.UP * 0.8, body):
					_damage_player(14.0)
				guards[index] = guard
				continue
			if sees_player and dash_cooldown <= 0.0 and distance > 4.5 and distance < 12.8:
				guard["dash_windup"] = 0.50 if adaptive_doctrine == "INTERCEPT" else 0.42
				guard["dash_target_position"] = _predict_intercept_position(player.global_position, player.velocity, dash_timer) if adaptive_doctrine == "INTERCEPT" else player.global_position
				var stalker_telegraph_target: Vector3 = guard["dash_target_position"]
				guard["dash_cooldown"] = 3.7
				_spawn_beam(body.global_position + Vector3.UP * 0.9, stalker_telegraph_target + Vector3.UP * 0.6, materials["violet"], 0.46)
				body.velocity = Vector3.ZERO
				guards[index] = guard
				continue
		var windup := float(guard["windup"])
		if windup > 0.0:
			windup -= ai_delta
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
				if role == "WARDEN" and int(guard.get("boss_phase", 1)) >= 2:
					guard["cooldown"] = randf_range(1.2, 1.75)
				else:
					guard["cooldown"] = randf_range(1.45, 2.15) if role == "RANGER" else randf_range(2.0, 3.0)
			guards[index] = guard
			continue
		var cooldown := maxf(0.0, float(guard["cooldown"]) - ai_delta)
		guard["cooldown"] = cooldown
		if sees_player and distance < 13.5 and cooldown <= 0.0:
			guard["windup"] = (0.92 if int(guard.get("boss_phase", 1)) < 2 else 0.72) if role == "WARDEN" else (0.82 if role == "HEAVY" else 0.62)
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
				var radial_rays: int = _warden_radial_ray_count(int(guard.get("boss_phase", 1)))
				for ray_index in range(radial_rays):
					var ray_angle := TAU * float(ray_index) / float(radial_rays)
					var ray_direction := Vector3(cos(ray_angle), 0.0, sin(ray_angle))
					_spawn_beam(aim_from, body.global_position + Vector3.UP * 0.8 + ray_direction * 5.6, role_material, 0.92)
			else:
				attack_lanes.append({"from": aim_from, "to": aim_to})
				_spawn_beam(aim_from, aim_to, role_material, 0.66)
			guard["attack_lanes"] = attack_lanes
			_play_sfx(230.0 if role != "WARDEN" else 115.0, 0.18, 0.08)
			body.velocity = Vector3.ZERO
		elif ai_state in ["ENGAGED", "INVESTIGATE"] and ai_target_distance > 0.85 and ai_target_distance < 22.0:
			var navigation_direction := _guard_navigation_direction(body, ai_target_position, guard)
			body.velocity = navigation_direction * _effective_guard_speed(guard)
			body.move_and_slide()
		elif ai_state == "PATROL" and ai_target_distance > 0.75:
			var patrol_direction := _guard_navigation_direction(body, ai_target_position, guard)
			body.velocity = patrol_direction * _effective_guard_speed(guard) * 0.48
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


func _weapon_heat_per_shot() -> float:
	var mastery_cooling: float = 1.0 - float(_weapon_mastery_rank()) * 0.035
	return maxf(5.5, (WEAPON_HEAT_PER_SHOT - float(weapon_level) * 0.9) * mastery_cooling)

func _apply_weapon_heat(amount: float) -> void:
	if weapon_overheated:
		return
	weapon_heat = clampf(weapon_heat + maxf(0.0, amount), 0.0, WEAPON_HEAT_LIMIT)
	if weapon_heat < WEAPON_HEAT_LIMIT:
		return
	weapon_heat = WEAPON_HEAT_LIMIT
	weapon_overheated = true
	weapon_overheat_events += 1
	_record_raid_event("weapon_overheat", "ARC-9 thermal lockout", weapon_heat, player.global_position if is_instance_valid(player) else Vector3.ZERO)
	_spawn_impact_light(player.global_position + Vector3.UP * 0.7, Color(1.0, 0.22, 0.28), 2.6, 4.6, 0.24)
	_play_sfx(118.0, 0.36, 0.12)
	objective_text = "ARC-9 OVERHEAT · ОТПУСТИ ОГОНЬ ИЛИ НАЖМИ V ДЛЯ СБРОСА"
	_update_hud()

func _update_weapon_systems(delta: float) -> void:
	var dt: float = maxf(0.0, delta)
	weapon_vent_cooldown = maxf(0.0, weapon_vent_cooldown - dt)
	scan_cooldown = maxf(0.0, scan_cooldown - dt)
	scan_active_timer = maxf(0.0, scan_active_timer - dt)
	var firing := mouse_firing or touch_firing or gamepad_fire_held
	if weapon_overheated or not firing:
		var cooling_rate: float = WEAPON_OVERHEAT_COOLING_RATE if weapon_overheated else WEAPON_HEAT_COOLING_RATE
		weapon_heat = maxf(0.0, weapon_heat - cooling_rate * dt)
		if weapon_overheated and weapon_heat <= WEAPON_OVERHEAT_RELEASE_HEAT:
			weapon_overheated = false
			_record_raid_event("weapon_recovered", "ARC-9 thermal lockout cleared", weapon_heat, player.global_position if is_instance_valid(player) else Vector3.ZERO)
			objective_text = "ARC-9 ГОТОВ · ТЕПЛОВОЙ КОНТУР В НОРМЕ"
			_play_sfx(470.0, 0.12, 0.045)
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		guard["scan_reveal_timer"] = maxf(0.0, float(guard.get("scan_reveal_timer", 0.0)) - dt)
		var reveal_remaining: float = float(guard.get("scan_reveal_timer", 0.0))
		var scan_readout := guard.get("scan_readout") as Label3D
		if is_instance_valid(scan_readout):
			scan_readout.visible = reveal_remaining > 0.0
			if reveal_remaining > 0.0:
				var guard_body := guard.get("node") as Node3D
				var distance_to_operator: float = guard_body.global_position.distance_to(player.global_position) if is_instance_valid(guard_body) and is_instance_valid(player) else 0.0
				scan_readout.text = "%s · HP %d/%d · %.0f M" % [str(guard.get("role", "HOSTILE")), maxi(0, int(guard.get("hp", 0))), int(guard.get("max_hp", 1)), distance_to_operator]
		guards[index] = guard
	for index in range(devices.size()):
		var device: Dictionary = devices[index]
		device["scan_timer"] = maxf(0.0, float(device.get("scan_timer", 0.0)) - dt)
		var device_tag := device.get("tag") as Label3D
		if is_instance_valid(device_tag):
			device_tag.visible = float(device.get("scan_timer", 0.0)) > 0.0 and not bool(device.get("destroyed", false))
		devices[index] = device

func _activate_tactical_scan() -> void:
	if paused_game or mission_finished or briefing_visible or terminal_active or not is_instance_valid(player):
		return
	if scan_cooldown > 0.0:
		objective_text = "TACTICAL SCAN RECHARGING · %.1f S" % scan_cooldown
		_update_hud()
		return
	scan_cooldown = TACTICAL_SCAN_COOLDOWN
	scan_active_timer = TACTICAL_SCAN_DURATION
	scan_activations += 1
	var hostiles_found := 0
	var devices_found := 0
	for index in range(guards.size()):
		var guard: Dictionary = guards[index]
		var guard_body := guard.get("node") as Node3D
		if not is_instance_valid(guard_body) or int(guard.get("hp", 0)) <= 0:
			continue
		var distance_to_operator: float = guard_body.global_position.distance_to(player.global_position)
		if distance_to_operator > TACTICAL_SCAN_RADIUS:
			continue
		guard["scan_reveal_timer"] = TACTICAL_SCAN_DURATION
		var scan_readout := guard.get("scan_readout") as Label3D
		if is_instance_valid(scan_readout):
			scan_readout.visible = true
			scan_readout.text = "%s · HP %d/%d · %.0f M" % [str(guard.get("role", "HOSTILE")), int(guard.get("hp", 0)), int(guard.get("max_hp", 1)), distance_to_operator]
		guards[index] = guard
		hostiles_found += 1
		_spawn_impact_light(guard_body.global_position + Vector3.UP * 0.9, Color(0.28, 0.96, 1.0), 1.2, 2.8, 0.16)
	for index in range(devices.size()):
		var device: Dictionary = devices[index]
		var device_body := device.get("node") as Node3D
		if bool(device.get("destroyed", false)) or not is_instance_valid(device_body):
			continue
		if device_body.global_position.distance_to(player.global_position) > TACTICAL_SCAN_RADIUS:
			continue
		device["scan_timer"] = TACTICAL_SCAN_DURATION
		var device_tag := device.get("tag") as Label3D
		if is_instance_valid(device_tag):
			device_tag.visible = true
		devices[index] = device
		devices_found += 1
	scan_hostiles_revealed_total += hostiles_found
	scan_devices_revealed_total += devices_found
	_emit_combat_noise(player.global_position, 7.5, "scan")
	_record_raid_event("tactical_scan", "%02d hostiles / %02d devices" % [hostiles_found, devices_found], float(hostiles_found + devices_found), player.global_position)
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.12, materials["cyan"], 16.0)
	_spawn_impact_light(player.global_position + Vector3.UP * 0.7, Color(0.24, 0.95, 1.0), 2.0, TACTICAL_SCAN_RADIUS * 0.35, 0.24)
	_play_sfx(520.0, 0.28, 0.07)
	objective_text = "TACTICAL SCAN · %02d HOSTILES / %02d DEVICES · REVEAL %.1f S" % [hostiles_found, devices_found, TACTICAL_SCAN_DURATION]
	_update_hud()

func _activate_weapon_vent() -> void:
	if paused_game or mission_finished or briefing_visible or terminal_active or not is_instance_valid(player):
		return
	if weapon_vent_cooldown > 0.0:
		objective_text = "THERMAL VENT RECHARGING · %.1f S" % weapon_vent_cooldown
		_update_hud()
		return
	if weapon_heat < WEAPON_VENT_MIN_HEAT and not weapon_overheated:
		objective_text = "THERMAL VENT NEEDS %.0f%% HEAT · NOW %.0f%%" % [WEAPON_VENT_MIN_HEAT, weapon_heat]
		_update_hud()
		return
	weapon_vent_cooldown = WEAPON_VENT_COOLDOWN_SECONDS
	weapon_vent_uses += 1
	weapon_heat = WEAPON_VENT_RESET_HEAT
	weapon_overheated = false
	mouse_firing = false
	touch_firing = false
	gamepad_fire_held = false
	var vent_hits := 0
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		var guard_body := guard.get("node") as CharacterBody3D
		if not is_instance_valid(guard_body) or guard_body.global_position.distance_to(player.global_position) > WEAPON_VENT_RADIUS:
			continue
		guard["stun"] = maxf(float(guard.get("stun", 0.0)), WEAPON_VENT_STAGGER_SECONDS)
		guard["windup"] = 0.0
		guard["dash_windup"] = 0.0
		guard["attack_lanes"] = []
		var retreat := guard_body.global_position - player.global_position
		retreat.y = 0.0
		if retreat.length_squared() > 0.01:
			guard_body.velocity = retreat.normalized() * 4.2
		guards[index] = guard
		vent_hits += 1
		weapon_vent_hits += 1
		_damage_target(guard_body, false, 0.55)
	_emit_combat_noise(player.global_position, 15.0, "vent")
	_record_raid_event("thermal_vent", "%02d hostiles interrupted" % vent_hits, float(vent_hits), player.global_position)
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.12, materials["amber"], 10.5)
	_spawn_impact_light(player.global_position + Vector3.UP * 0.7, Color(1.0, 0.53, 0.16), 3.2, WEAPON_VENT_RADIUS * 0.9, 0.22)
	_play_sfx(128.0, 0.4, 0.13)
	objective_text = "THERMAL VENT · HEAT RESET TO %d%% · %02d HOSTILES INTERRUPTED" % [int(WEAPON_VENT_RESET_HEAT), vent_hits]
	_update_hud()

func _fire_weapon() -> void:
	if weapon_overheated:
		return
	if fire_cooldown > 0.0 or paused_game or mission_finished or terminal_active:
		return
	fire_cooldown = maxf(0.09, 0.17 - float(weapon_level) * 0.022)
	_apply_weapon_heat(_weapon_heat_per_shot() * (0.68 if overdrive_timer > 0.0 else 1.0))
	_trigger_muzzle_flash()
	_emit_combat_noise(player.global_position, 24.0 if null_shift_timer <= 0.0 else 15.0, "weapon")
	var from := player.global_position + Vector3.UP * 0.48 + player_aim * 0.8
	var to := from + player_aim * 37.0
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.exclude = [player.get_rid()]
	query.collision_mask = 0xFFFFFFFF
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	var beam_end := to
	var critical_hit := false
	var is_combat_hit := false
	var countershot_used := false
	var shot_damage_scale := 1.0
	if not hit.is_empty():
		beam_end = hit["position"]
		var collider: Object = hit["collider"]
		if collider is Node:
			is_combat_hit = _is_combat_target(collider as Node)
			if is_combat_hit and _is_hostile_target(collider as Node) and collider is Node3D:
				var hit_position: Vector3 = hit["position"]
				critical_hit = aim_target_node == (collider as Node3D) and hit_position.y >= (collider as Node3D).global_position.y + 0.42
				if counter_window_remaining > 0.0:
					shot_damage_scale = _countershot_damage_scale(1.0, counter_window_remaining)
					countershot_used = true
				if overdrive_timer > 0.0:
					_try_overdrive_chain(collider as Node, beam_end)
			_damage_target(collider as Node, critical_hit, shot_damage_scale)
	if countershot_used:
		counter_window_remaining = 0.0
		countershot_hits += 1
		overdrive_charge = minf(OVERDRIVE_MAX_CHARGE, overdrive_charge + 7.0)
		_record_raid_event("countershot", "Perfect evade follow-up", 7.0, beam_end)
		_spawn_ring_burst(beam_end + Vector3.UP * 0.08, materials["violet"])
		_play_sfx(610.0, 0.09, 0.08)
		objective_text = "COUNTERSHOT · +7 OVERDRIVE · УСПЕШНЫЙ ОТВЕТ"
	_record_weapon_shot(is_combat_hit)
	_record_raid_event("weapon_shot", "CRITICAL" if critical_hit else ("HIT" if is_combat_hit else "MISS"), 1.0 if critical_hit or is_combat_hit else 0.0, beam_end)
	_spawn_beam(from, beam_end, materials["cyan"], 0.09)
	_spawn_hit_sparks(beam_end, materials["cyan"])
	_screen_impulse(0.018, 0.055)
	crosshair_kick = 1.0
	if not hit.is_empty():
		crosshair_hit_timer = 0.12
	_play_sfx(680.0, 0.055, 0.08)

func _try_overdrive_chain(primary_target: Node, hit_position: Vector3) -> bool:
	if overdrive_timer <= 0.0 or paused_game or mission_finished or not is_instance_valid(primary_target):
		return false
	if not (primary_target is CollisionObject3D):
		return false
	var source_is_hostile := false
	for guard in guards:
		if guard.get("node") == primary_target:
			source_is_hostile = true
			break
	if not source_is_hostile:
		return false
	var primary_body := primary_target as CollisionObject3D
	var best_body: Node3D
	var best_distance := OVERDRIVE_ARC_RADIUS
	for guard in guards:
		var candidate := guard.get("node") as Node3D
		if not is_instance_valid(candidate) or candidate == primary_target or int(guard.get("hp", 0)) <= 0:
			continue
		var target_point: Vector3 = candidate.global_position + Vector3.UP * 0.55
		var distance_to_candidate: float = hit_position.distance_to(target_point)
		if distance_to_candidate >= best_distance:
			continue
		var ray := PhysicsRayQueryParameters3D.create(hit_position, target_point)
		var excluded: Array[RID] = [player.get_rid(), primary_body.get_rid()]
		ray.exclude = excluded
		ray.collision_mask = 3
		var obstruction: Dictionary = get_world_3d().direct_space_state.intersect_ray(ray)
		if obstruction.is_empty() or obstruction.get("collider") != candidate:
			continue
		best_body = candidate
		best_distance = distance_to_candidate
	if not is_instance_valid(best_body):
		return false
	var arc_end: Vector3 = best_body.global_position + Vector3.UP * 0.62
	_spawn_beam(hit_position, arc_end, materials["violet"], 0.16)
	_spawn_hit_sparks(arc_end, materials["violet"])
	_spawn_impact_light(arc_end, Color(0.68, 0.34, 1.0), 1.65, 3.6, 0.16)
	_spawn_ring_burst(best_body.global_position + Vector3.UP * 0.12, materials["violet"])
	overdrive_arc_chains += 1
	objective_text = "OVERDRIVE ARC · ЦЕПНАЯ ДУГА ПОРАЗИЛА ВТОРУЮ ЦЕЛЬ"
	_screen_impulse(0.025, 0.055)
	_play_sfx(345.0, 0.11, 0.08)
	_damage_target(best_body, false, OVERDRIVE_ARC_DAMAGE_SCALE)
	_update_hud()
	return true


func _transition_warden_phase(index: int) -> bool:
	if index < 0 or index >= guards.size():
		return false
	var guard: Dictionary = guards[index]
	if not bool(guard.get("warden", false)) or int(guard.get("boss_phase", 1)) >= 2:
		return false
	var maximum_hp: int = int(guard.get("max_hp", 10))
	if int(guard.get("hp", maximum_hp)) > int(ceil(float(maximum_hp) * 0.5)):
		return false
	var body := guard.get("node") as Node3D
	if not is_instance_valid(body):
		return false
	guard["boss_phase"] = 2
	guard["speed"] = float(guard.get("speed", 3.25)) * 1.22
	guard["damage"] = float(guard.get("damage", 18.0)) * 1.18
	guard["cooldown"] = minf(float(guard.get("cooldown", 1.0)), 0.78)
	guard["stun"] = maxf(float(guard.get("stun", 0.0)), 0.45)
	guard["attack_lanes"] = []
	guards[index] = guard
	var armor := body.get_node_or_null("Armor") as MeshInstance3D
	if is_instance_valid(armor):
		armor.material_override = materials["gold"]
	var chest_core := body.get_node_or_null("GuardChestCore") as MeshInstance3D
	if is_instance_valid(chest_core):
		chest_core.material_override = materials["white"]
	var role_tag := body.get_node_or_null("CombatRole") as Label3D
	if is_instance_valid(role_tag):
		role_tag.text = "WARDEN / PHASE II"
		role_tag.modulate = Color(1.0, 0.72, 0.32)
	var health_readout := body.get_node_or_null("HealthReadout") as Label3D
	if is_instance_valid(health_readout):
		health_readout.text = "HP %d / %d · PII" % [int(guard["hp"]), maximum_hp]
		health_readout.modulate = Color(1.0, 0.72, 0.32)
	warden_phase_transitions += 1
	_record_raid_event("warden_phase", "Phase II", 2.0, body.global_position)
	_emit_combat_noise(body.global_position, 42.0, "warden-phase")
	_spawn_ring_burst(body.global_position + Vector3.UP * 0.18, materials["gold"])
	_spawn_impact_light(body.global_position + Vector3.UP * 0.85, Color(1.0, 0.54, 0.16), 3.8, 6.2, 0.38)
	_screen_impulse(0.16, 0.31)
	_play_sfx(82.0, 0.72, 0.18)
	objective_text = "WARDEN PHASE II · БРОНЯ ПЕРЕГРУЖЕНА · 12 ЛИНИЙ ОГНЯ"
	_update_hud()
	return true

func _try_stagger_warden(index: int, precision_hit: bool) -> bool:
	if not precision_hit or index < 0 or index >= guards.size():
		return false
	var guard: Dictionary = guards[index]
	if not bool(guard.get("warden", false)) or float(guard.get("windup", 0.0)) <= 0.0:
		return false
	var body := guard.get("node") as Node3D
	if not is_instance_valid(body):
		return false
	guard["windup"] = 0.0
	guard["dash_windup"] = 0.0
	guard["attack_lanes"] = []
	guard["stun"] = maxf(float(guard.get("stun", 0.0)), 0.9)
	guards[index] = guard
	warden_staggers += 1
	_record_raid_event("warden_stagger", "Precision interrupt", 0.9, body.global_position)
	_spawn_ring_burst(body.global_position + Vector3.UP * 0.2, materials["white"])
	_spawn_impact_light(body.global_position + Vector3.UP * 0.85, Color(0.55, 0.94, 1.0), 2.8, 4.7, 0.24)
	_play_sfx(520.0, 0.19, 0.12)
	objective_text = "WARDEN STAGGER · ТОЧНЫЙ ВЫСТРЕЛ СОРВАЛ АТАКУ"
	_update_hud()
	return true

func _damage_target(target: Node, critical_hit: bool = false, damage_scale: float = 1.0) -> void:
	for index in range(guards.size() - 1, -1, -1):
		var guard: Dictionary = guards[index]
		if guard["node"] == target:
			var base_damage_points: int = _combat_damage_per_hit(critical_hit, overdrive_timer > 0.0)
			var exposed_precision_hit: bool = critical_hit and float(guard.get("weakpoint_exposed_timer", 0.0)) > 0.0
			var effective_damage_scale: float = clampf(damage_scale, 0.0, 1.8)
			if exposed_precision_hit:
				effective_damage_scale = clampf(effective_damage_scale * _weakpoint_damage_multiplier(guard, true), 0.0, 2.0)
				weakpoint_hits += 1
				guard["weakpoint_exposed_timer"] = 0.0
				_set_guard_weakpoint_visual(target as Node3D, guard, false)
				_record_raid_event("weakpoint_hit", str(guard.get("role", "HOSTILE")), effective_damage_scale, target.global_position)
			var damage_points: int = maxi(1, roundi(float(base_damage_points) * effective_damage_scale))
			guard["hp"] = int(guard["hp"]) - damage_points
			if bool(guard.get("warden", false)):
				_try_stagger_warden(index, critical_hit)
				_transition_warden_phase(index)
			guard = guards[index]
			var pressure_amount: float = 18.0 + float(damage_points) * 12.0 + (10.0 if critical_hit else 0.0) + (10.0 if overdrive_timer > 0.0 else 0.0)
			guard = _apply_guard_suppression(guard, pressure_amount, critical_hit)
			guards[index] = guard
			if critical_hit:
				critical_hits += 1
				_pulse_gamepad(0.16, 0.44, 0.06)
			guard["health_timer"] = 1.8
			guard["hit_flash_timer"] = 0.14
			guard["hit_label_timer"] = 0.52
			_spawn_impact_light(target.global_position + Vector3.UP * 0.72, Color(1.0, 0.58, 0.22), 2.1, 3.9, 0.13)
			var hit_feedback: Label3D = guard.get("hit_label") as Label3D
			if is_instance_valid(hit_feedback):
				hit_feedback.text = ("CRIT " if critical_hit else "") + "−%d" % damage_points
				hit_feedback.visible = true
				hit_feedback.position.y = 3.02 if bool(guard.get("warden", false)) else 2.58
				hit_feedback.modulate = Color(1.0, 0.94, 0.7, 1.0)
				hit_feedback.scale = Vector3.ONE * 0.86
			var max_hp: int = int(guard.get("max_hp", 3))
			var health_readout := target.get_node_or_null("HealthReadout") as Label3D
			if is_instance_valid(health_readout):
				var phase_marker: String = " · PII" if bool(guard.get("warden", false)) and int(guard.get("boss_phase", 1)) >= 2 else ""
				var weakpoint_marker: String = " · CORE OPEN" if float(guard.get("weakpoint_exposed_timer", 0.0)) > 0.0 else ""
				health_readout.text = "HP %d / %d%s%s" % [maxi(0, int(guard["hp"])), max_hp, phase_marker, weakpoint_marker]
				health_readout.visible = true
			_spawn_hit_sparks(target.global_position + Vector3.UP * 0.7, materials["white"] if critical_hit else materials["amber"])
			if critical_hit:
				_spawn_impact_light(target.global_position + Vector3.UP * 1.0, Color(1.0, 0.92, 0.58), 2.8, 4.8, 0.16)
				_spawn_ring_burst(target.global_position + Vector3.UP * 0.12, materials["white"])
				_play_sfx(920.0, 0.075, 0.07)
			if int(guard["hp"]) <= 0:
				var body: Node3D = guard["node"]
				_spawn_ring_burst(body.global_position + Vector3.UP * 0.14, materials["amber"] if bool(guard["warden"]) else materials["cyan"])
				_spawn_impact_light(body.global_position + Vector3.UP * 0.7, Color(1.0, 0.62, 0.27) if bool(guard["warden"]) else Color(0.10, 1.0, 0.78), 3.0 if bool(guard["warden"]) else 2.35, 5.0 if bool(guard["warden"]) else 4.2, 0.22)
				_spawn_hit_sparks(body.global_position + Vector3.UP * 0.95, materials["white"])
				_screen_impulse(0.045 if not bool(guard["warden"]) else 0.085, 0.085 if not bool(guard["warden"]) else 0.14)
				if aim_target_node == body:
					aim_target_node = null
					target_lock_has_position = false
				body.queue_free()
				guards.remove_at(index)
				_register_hostile_elimination(guard, body, critical_hit)
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
	if index < 0 or index >= devices.size():
		return
	var device: Dictionary = devices[index]
	if bool(device.get("destroyed", false)):
		return
	device["destroyed"] = true
	devices[index] = device
	var body: Node3D = device["node"]
	var kind: String = str(device["kind"])
	_emit_combat_noise(body.global_position, 30.0, "device")
	_record_raid_event("device_destroyed", kind, 80.0, body.global_position)
	var flash_tint: Color = Color(1.0, 0.62, 0.23) if kind == "CELL" else (Color(0.65, 0.36, 1.0) if kind == "ANCHOR" else Color(0.12, 0.95, 0.82))
	_spawn_impact_light(body.global_position + Vector3.UP * 0.7, flash_tint, 2.8, 5.2, 0.2)
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
			var relay_suppressed: int = _device_emp_burst(body.global_position)
			objective_text = "EMP OVERLOAD · %d ЦЕЛЕЙ ПОДАВЛЕНО · RADIUS %.1f M" % [relay_suppressed, DEVICE_EMP_RADIUS]
			_play_sfx(118.0, 0.52, 0.17)
		"CELL":
			var cell_suppressed: int = _device_cell_nova(body.global_position)
			player_health = minf(player_max_health, player_health + 35.0)
			objective_text = "ENERGY NOVA · +35 HP · OVERDRIVE +30 · ЦЕЛЕЙ %d" % cell_suppressed
			_play_sfx(740.0, 0.32, 0.13)
		"ANCHOR":
			var collapsed_lane: int = _phase_anchor_rupture(body.global_position)
			if collapsed_lane >= 0:
				objective_text = "PHASE RUPTURE · КОНТУР %d ОТКЛЮЧЁН НА %.1f С · НЕСТАБИЛЬНОСТЬ +18%%" % [collapsed_lane + 1, DEVICE_LANE_COLLAPSE_SECONDS]
			else:
				objective_text = "PHASE RUPTURE · НЕСТАБИЛЬНОСТЬ +18%%"
			_play_sfx(92.0, 0.54, 0.15)
	_update_hud()

func _interrupt_guard_for_device(guard_index: int, duration: float) -> bool:
	if guard_index < 0 or guard_index >= guards.size():
		return false
	var guard: Dictionary = guards[guard_index]
	var body := guard.get("node") as CharacterBody3D
	if not is_instance_valid(body):
		return false
	guard["stun"] = maxf(float(guard.get("stun", 0.0)), maxf(0.0, duration))
	guard["windup"] = 0.0
	guard["dash_windup"] = 0.0
	guard["dash_timer"] = 0.0
	guard["attack_lanes"] = []
	guard["health_timer"] = maxf(float(guard.get("health_timer", 0.0)), 0.32)
	guard["hit_flash_timer"] = maxf(float(guard.get("hit_flash_timer", 0.0)), 0.12)
	body.velocity = Vector3.ZERO
	guards[guard_index] = guard
	return true

func _device_emp_burst(at: Vector3, radius: float = DEVICE_EMP_RADIUS) -> int:
	var affected := 0
	for index in range(guards.size()):
		var body := guards[index].get("node") as Node3D
		if not is_instance_valid(body) or body.global_position.distance_to(at) > radius:
			continue
		if _interrupt_guard_for_device(index, DEVICE_EMP_STUN_SECONDS):
			affected += 1
	device_emp_overloads += 1
	device_hostiles_suppressed += affected
	_spawn_ring_burst(at + Vector3.UP * 0.12, materials["cyan"], DEVICE_EMP_RADIUS / 0.24)
	_spawn_impact_light(at + Vector3.UP * 0.55, Color(0.12, 1.0, 0.86), 3.6, 7.5, 0.32)
	_spawn_hit_sparks(at + Vector3.UP * 0.72, materials["white"])
	return affected

func _device_cell_nova(at: Vector3, radius: float = DEVICE_CELL_RADIUS) -> int:
	var affected := 0
	for index in range(guards.size()):
		var body := guards[index].get("node") as Node3D
		if not is_instance_valid(body) or body.global_position.distance_to(at) > radius:
			continue
		if _interrupt_guard_for_device(index, DEVICE_CELL_STUN_SECONDS):
			affected += 1
	pulse_cooldown = 0.0
	overdrive_charge = minf(OVERDRIVE_MAX_CHARGE, overdrive_charge + DEVICE_CELL_OVERDRIVE_GAIN)
	device_cell_novas += 1
	device_hostiles_suppressed += affected
	_spawn_ring_burst(at + Vector3.UP * 0.12, materials["amber"], DEVICE_CELL_RADIUS / 0.24)
	_spawn_impact_light(at + Vector3.UP * 0.48, Color(1.0, 0.66, 0.24), 3.2, 6.8, 0.28)
	_spawn_hit_sparks(at + Vector3.UP * 0.7, materials["amber"])
	return affected

func _collapse_nearest_phase_lane(at: Vector3, duration: float = DEVICE_LANE_COLLAPSE_SECONDS) -> int:
	var nearest_index := -1
	var nearest_distance := DEVICE_LANE_MAX_Z_DISTANCE
	for index in range(phase_lanes.size()):
		var lane: Dictionary = phase_lanes[index]
		var distance := absf(at.z - float(lane["z"]))
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_index = index
	if nearest_index < 0:
		return -1
	var lane: Dictionary = phase_lanes[nearest_index]
	lane["disruption_remaining"] = maxf(float(lane.get("disruption_remaining", 0.0)), maxf(0.0, duration))
	phase_lanes[nearest_index] = lane
	phase_lane_disruptions += 1
	device_lane_collapses += 1
	_update_phase_lanes(0.0)
	var surge_position := Vector3(at.x, 0.1, float(lane["z"]))
	_spawn_ring_burst(surge_position, materials["violet"], DEVICE_LANE_MAX_Z_DISTANCE / 0.24)
	_spawn_impact_light(surge_position + Vector3.UP * 0.34, Color(0.62, 0.30, 1.0), 3.1, 6.2, 0.26)
	return nearest_index

func _phase_anchor_rupture(at: Vector3) -> int:
	instability = minf(100.0, instability + 18.0)
	null_shift_timer = maxf(null_shift_timer, 1.0)
	return _collapse_nearest_phase_lane(at, DEVICE_LANE_COLLAPSE_SECONDS)

func _deploy_pulse() -> void:
	if pulse_cooldown > 0.0 or paused_game or mission_finished:
		objective_text = "ИМПУЛЬС ПЕРЕЗАРЯЖАЕТСЯ · %.1f С" % pulse_cooldown
		return
	pulse_cooldown = maxf(2.0, 5.0 - float(pulse_level) * 0.7)
	_record_tactical_action("pulse")
	_record_raid_event("pulse", "Field suppression", 0.0, player.global_position)
	_emit_combat_noise(player.global_position, 26.0, "pulse")
	var count := 0
	var suppressed_count := 0
	for lane_index in range(phase_lanes.size()):
		var lane: Dictionary = phase_lanes[lane_index]
		var lane_state: String = str(lane["state"])
		var lane_distance: float = absf(player.global_position.z - float(lane["z"]))
		if lane_state in ["warning", "active"] and lane_distance <= PULSE_LANE_DISRUPTION_RANGE:
			lane["disruption_remaining"] = maxf(float(lane.get("disruption_remaining", 0.0)), PULSE_LANE_DISRUPTION_SECONDS)
			phase_lanes[lane_index] = lane
			suppressed_count += 1
			phase_lane_disruptions += 1
	for guard in guards:
		var body: Node3D = guard["node"]
		if player.global_position.distance_to(body.global_position) < 12.5:
			guard["stun"] = 2.5
			guard["windup"] = 0.0
			count += 1
	_update_phase_lanes(0.0)
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.2, materials["cyan"])
	_screen_impulse(0.095, 0.17)
	phase_flash_timer = maxf(phase_flash_timer, 0.14)
	objective_text = "ИМПУЛЬС: %d ЦЕЛЕЙ · КОНТУРЫ ПОДАВЛЕНЫ %d · %.1f С" % [count, suppressed_count, pulse_cooldown] if suppressed_count > 0 else "ИМПУЛЬС: %d ЦЕЛЕЙ НАРУШЕНО · ПЕРЕЗАРЯДКА %.1f С" % [count, pulse_cooldown]
	_play_sfx(95.0, 0.55, 0.16)
	_update_hud()


func _deploy_phase_echo() -> void:
	if paused_game or mission_finished or briefing_visible or terminal_active or not is_instance_valid(player):
		return
	if phase_echo_cooldown > 0.02:
		objective_text = "PHASE ECHO RECHARGING · %.1f S" % phase_echo_cooldown
		_update_hud()
		return
	if is_instance_valid(phase_echo_node):
		objective_text = "PHASE ECHO ALREADY ACTIVE · BREAK LINE OF SIGHT"
		_update_hud()
		return
	var move_input := _read_move_input()
	var direction := Vector3(-move_input.x, 0.0, -move_input.y) if move_input.length() > 0.1 else Vector3(player_aim.x, 0.0, player_aim.z)
	if direction.length_squared() < 0.001:
		direction = Vector3.FORWARD
	var echo_position := player.global_position + direction.normalized() * 4.6
	echo_position.x = clampf(echo_position.x, -20.5, 20.5)
	echo_position.z = clampf(echo_position.z, -11.4, 11.4)
	echo_position.y = player.global_position.y
	var hologram_material := StandardMaterial3D.new()
	hologram_material.albedo_color = Color(0.31, 0.72, 1.0, 0.32)
	hologram_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	hologram_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	hologram_material.emission_enabled = true
	hologram_material.emission = Color(0.18, 0.55, 1.0)
	hologram_material.emission_energy_multiplier = 1.65
	phase_echo_node = Node3D.new()
	phase_echo_node.name = "PhaseEchoDecoy"
	add_child(phase_echo_node)
	phase_echo_node.global_position = echo_position
	var shell_mesh := CapsuleMesh.new()
	shell_mesh.radius = 0.34
	shell_mesh.height = 1.52
	phase_echo_hologram = MeshInstance3D.new()
	phase_echo_hologram.name = "EchoOperatorShell"
	phase_echo_hologram.mesh = shell_mesh
	phase_echo_hologram.material_override = hologram_material
	phase_echo_hologram.position = Vector3(0.0, 0.78, 0.0)
	phase_echo_hologram.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	phase_echo_node.add_child(phase_echo_hologram)
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.88
	ring_mesh.outer_radius = 1.03
	ring_mesh.rings = 28
	ring_mesh.ring_segments = 8
	phase_echo_ring = MeshInstance3D.new()
	phase_echo_ring.name = "EchoSignalRing"
	phase_echo_ring.mesh = ring_mesh
	phase_echo_ring.material_override = hologram_material
	phase_echo_ring.rotation.x = deg_to_rad(90.0)
	phase_echo_ring.position = Vector3(0.0, -0.70, 0.0)
	phase_echo_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	phase_echo_node.add_child(phase_echo_ring)
	var label := Label3D.new()
	label.name = "EchoSignalLabel"
	label.text = "PHASE ECHO  //  DECOY"
	label.font_size = 20
	label.pixel_size = 0.014
	label.outline_size = 7
	label.outline_modulate = Color(0.004, 0.012, 0.018, 0.96)
	label.modulate = Color(0.52, 0.85, 1.0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = Vector3(0.0, 2.0, 0.0)
	phase_echo_node.add_child(label)
	var scanline_mesh := BoxMesh.new()
	scanline_mesh.size = Vector3(0.48, 0.025, 0.025)
	var scanline := MeshInstance3D.new()
	scanline.name = "EchoScanline"
	scanline.mesh = scanline_mesh
	scanline.material_override = hologram_material
	scanline.position = Vector3(0.0, 0.88, -0.34)
	scanline.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	phase_echo_node.add_child(scanline)
	phase_echo_light = OmniLight3D.new()
	phase_echo_light.name = "EchoSignalLight"
	phase_echo_light.light_color = Color(0.2, 0.62, 1.0)
	phase_echo_light.light_energy = 0.72
	phase_echo_light.omni_range = 4.0
	phase_echo_light.shadow_enabled = false
	phase_echo_light.position = Vector3(0.0, 1.0, 0.0)
	phase_echo_node.add_child(phase_echo_light)
	phase_echo_remaining = PHASE_ECHO_DURATION
	phase_echo_cooldown = PHASE_ECHO_COOLDOWN
	phase_echo_activations = mini(9999, phase_echo_activations + 1)
	var radius := _phase_echo_signal_radius()
	_emit_combat_noise(echo_position, radius, "phase-echo")
	_broadcast_squad_contact(echo_position, "phase-echo", true)
	_record_raid_event("phase_echo", "Hologram deployed · signal redirected", radius, echo_position)
	_spawn_ring_burst(echo_position + Vector3.UP * 0.04, materials["violet"], 7.5)
	_spawn_impact_light(echo_position + Vector3.UP * 0.8, Color(0.22, 0.62, 1.0), 1.05, 3.7, 0.20)
	_play_sfx(245.0, 0.24, 0.085)
	objective_text = "PHASE ECHO DEPLOYED · BREAK VISUAL CONTACT TO DIVERT THE SQUAD"
	_update_hud()

func _phase_echo_signal_radius() -> float:
	return PHASE_ECHO_TRACKED_SIGNAL_RADIUS if adaptive_doctrine == "ECHO_TRACK" else PHASE_ECHO_SIGNAL_RADIUS

func _update_phase_echo(delta: float) -> void:
	var dt := maxf(0.0, delta)
	phase_echo_cooldown = maxf(0.0, phase_echo_cooldown - dt)
	if not is_instance_valid(phase_echo_node):
		phase_echo_node = null
		phase_echo_hologram = null
		phase_echo_ring = null
		phase_echo_light = null
		phase_echo_remaining = 0.0
		return
	phase_echo_remaining = maxf(0.0, phase_echo_remaining - dt)
	if phase_echo_remaining <= 0.0:
		_record_raid_event("phase_echo_expired", "Hologram signal collapsed", phase_echo_lures, phase_echo_node.global_position)
		_clear_phase_echo()
		return
	var progress: float = clampf(1.0 - phase_echo_remaining / PHASE_ECHO_DURATION, 0.0, 1.0)
	if is_instance_valid(phase_echo_ring):
		if not reduced_motion:
			phase_echo_ring.rotation.y += dt * 1.1
			var pulse := 0.94 + sin(scene_clock * 4.4) * 0.075
			phase_echo_ring.scale = Vector3.ONE * pulse
		else:
			phase_echo_ring.scale = Vector3.ONE * 0.92
		phase_echo_ring.transparency = clampf(progress * 0.68, 0.0, 0.72)
	if is_instance_valid(phase_echo_hologram):
		phase_echo_hologram.transparency = clampf(0.08 + progress * 0.55, 0.0, 0.72)
	if is_instance_valid(phase_echo_light):
		phase_echo_light.light_energy = 0.72 * (1.0 - progress) + 0.08

func _clear_phase_echo() -> void:
	if is_instance_valid(phase_echo_node):
		phase_echo_node.queue_free()
	phase_echo_node = null
	phase_echo_hologram = null
	phase_echo_ring = null
	phase_echo_light = null
	phase_echo_remaining = 0.0

func _shift_layer() -> void:
	if null_shift_timer > 0.0 or paused_game or mission_finished:
		return
	null_shift_timer = 3.8
	_record_tactical_action("phase")
	_emit_combat_noise(player.global_position, _phase_noise_radius(), "phase")
	_record_raid_event("phase_shift", "NULL SHIFT", instability, player.global_position)
	instability = minf(100.0, instability + 24.0 + daily_shift_instability_bonus)
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
	if _try_stealth_takedown():
		return
	if not daily_supply_blackout and not medkit_used and _near(player, medkit, 2.7):
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
		_record_raid_event("core_secured", "Extraction pressure started", 750.0, quantum_core.global_position)
		quantum_core.visible = false
		core_ring.visible = false
		core_light.visible = false
		run_credits += 750
		extraction_pressure_active = true
		extraction_window_remaining = EXTRACTION_WINDOW_SECONDS
		extraction_overload_triggered = false
		alarm_active = true
		_spawn_guard(Vector3(16.2, 0.82, 14.0), false)
		_spawn_guard(Vector3(23.0, 0.82, 7.0), false)
		extraction_reinforcements_spawned += 2
		objective_text = "ЯДРО ИЗВЛЕЧЕНО · ОКНО ЭВАКУАЦИИ 30 С · ПЕРЕХВАТ НАЧАТ"
		if is_instance_valid(extraction_event_label):
			extraction_event_label.visible = true
		if is_instance_valid(extraction_event_bar):
			extraction_event_bar.visible = true
		_refresh_extraction_event_layout()
		_spawn_ring_burst(quantum_core.global_position + Vector3.UP * 0.1, materials["amber"])
		_spawn_impact_light(quantum_core.global_position + Vector3.UP * 0.6, Color(1.0, 0.58, 0.15), 3.2, 6.0, 0.3)
		_play_sfx(880.0, 0.42, 0.13)
		_update_hud()
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
		_record_raid_event("terminal_unlocked", "Cipher solved", float(CIPHER.size()), terminal.global_position)
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
	if stealth_mode_active and is_instance_valid(player):
		for candidate in guards:
			var candidate_body := candidate.get("node") as Node3D
			if is_instance_valid(candidate_body) and _can_stealth_takedown(candidate, player.global_position, true):
				options.append({"node": candidate_body, "text": "E · ТИХОЕ УСТРАНЕНИЕ"})
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
	# A dash evades exactly one damage event. Further hits during the movement burst still hurt.
	if dash_timer > 0.0 and not dash_evasion_registered:
		dash_evasion_registered = true
		dash_evasions += 1
		counter_window_remaining = COUNTER_WINDOW_SECONDS
		counter_windows_earned += 1
		_record_raid_event("counter_window", "Perfect dash evade", COUNTER_WINDOW_SECONDS, player.global_position)
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
	_break_combat_combo()
	var mitigated_amount: float = amount * (0.72 if overdrive_timer > 0.0 else 1.0)
	var old_health: float = player_health
	player_health = maxf(0.0, player_health - mitigated_amount)
	damage_taken_total += old_health - player_health
	_pulse_gamepad(0.35, 0.8, 0.16)
	_record_raid_event("damage_taken", "Operator hit", old_health - player_health, player.global_position)
	_spawn_impact_light(player.global_position + Vector3.UP * 0.82, Color(1.0, 0.12, 0.22), 2.5, 4.7, 0.19)
	if is_instance_valid(attacker):
		_show_damage_direction(attacker)
	_spawn_hit_sparks(player.global_position + Vector3.UP * 0.8, materials["red"])
	_play_sfx(85.0, 0.24, 0.14)
	objective_text = "ПОПАДАНИЕ · ЗДОРОВЬЕ %d%%" % int(player_health)
	_update_hud()

func _finish_mission(success: bool) -> void:
	if mission_finished:
		return
	mission_accuracy = _combat_accuracy_percentage()
	mission_score = _calculate_mission_score(eliminations, critical_hits, combat_combo_best, mission_accuracy, damage_taken_total, elapsed)
	mission_grade = _mission_grade_for_score(mission_score)
	mission_finished = true
	mission_success = success
	_pulse_gamepad(0.28, 0.78 if success else 0.42, 0.22 if success else 0.13)
	_clear_phase_echo()
	_record_raid_event("mission_finished", "SUCCESS" if success else "FAILED", float(mission_score), player.global_position if is_instance_valid(player) else Vector3.ZERO)
	paused_game = false
	extraction_pressure_active = false
	extraction_window_remaining = 0.0
	extraction_overload_triggered = false
	_refresh_extraction_event_layout()
	if success:
		var daily_bonus := _claim_daily_challenge_reward()
		var daily_tactical_bonus: int = _claim_daily_side_objective_reward_for_date(_today_date_code()) if daily_challenge_active else 0
		var grade_bonus := _mission_grade_bonus(mission_grade)
		var payout := run_credits + int(contract_bonus[current_contract]) + daily_bonus + daily_tactical_bonus + grade_bonus
		career_credits += payout
		career.set_value("career", "completed_runs", int(career.get_value("career", "completed_runs", 0)) + 1)
		career.set_value("career", "best_eliminations", maxi(eliminations, int(career.get_value("career", "best_eliminations", 0))))
		career.set_value("career", "total_eliminations", int(career.get_value("career", "total_eliminations", 0)) + eliminations)
		career.set_value("career", "total_critical_hits", int(career.get_value("career", "total_critical_hits", 0)) + critical_hits)
		career.set_value("career", "best_combo", maxi(combat_combo_best, int(career.get_value("career", "best_combo", 0))))
		career.set_value("career", "best_mission_score", maxi(mission_score, int(career.get_value("career", "best_mission_score", 0))))
		career.set_value("career", "total_combat_score", int(career.get_value("career", "total_combat_score", 0)) + mission_score)
		_save_career()
		_set_result_title("ЭВАКУАЦИЯ УСПЕШНА", "РЕЙД ЗАВЕРШЁН · +%d КРЕДИТОВ ЗАНЕСЕНО В КАРЬЕРУ" % payout, Color(0.38, 1.0, 0.85))
		if is_instance_valid(result_reward_label):
			var daily_suffix := " · DAILY +%d" % daily_bonus if daily_bonus > 0 else ""
			var streak_suffix := " · СЕРИЯ %d ДН." % daily_streak if daily_bonus > 0 else ""
			var tactical_suffix := " · BONUS OP +%d" % daily_tactical_bonus if daily_tactical_bonus > 0 else ""
			result_reward_label.text = "РАНГ %s · SCORE %d · ACC %.0f%% · КРИТЫ %d · COMBO %d · НАГРАДА %d%s%s%s · ПОБЕД %d" % [mission_grade, mission_score, mission_accuracy, critical_hits, combat_combo_best, payout, daily_suffix, streak_suffix, tactical_suffix, int(career.get_value("career", "completed_runs", 0))]
		if is_instance_valid(result_share_label):
			result_share_label.text = "КОД ВЫЗОВА: %s · ПОДЕЛИСЬ И ПРИГЛАСИ ДРУГА" % _today_challenge_code()
		objective_text = "МИССИЯ ВЫПОЛНЕНА · КАРЬЕРНЫЙ БАЛАНС %d" % career_credits
		_play_sfx(920.0, 0.6, 0.13)
	else:
		_set_result_title("ОПЕРАТОР ПОТЕРЯН", "КОНТРАКТ ПРОВАЛЕН · БАЛАНС КАРЬЕРЫ НЕ ИЗМЕНЁН", Color(1.0, 0.25, 0.34))
		if is_instance_valid(result_reward_label):
			result_reward_label.text = "РЕЙД ПРОВАЛЕН · РАНГ %s · SCORE %d · ACC %.0f%% · КРИТЫ %d · COMBO %d" % [mission_grade, mission_score, mission_accuracy, critical_hits, combat_combo_best]
		if is_instance_valid(result_share_label):
			result_share_label.text = "ВЫЗОВ ДРУГУ: %s" % _today_challenge_code()
		objective_text = "ОПЕРАТОР НЕ ВЕРНУЛСЯ · ПЕРЕЗАПУСТИТЕ РЕЙД"
		_play_sfx(70.0, 0.9, 0.18)
	if is_instance_valid(result_intel_label):
		result_intel_label.text = "MISSION INTEL · " + _after_action_insights_text()
	var new_chronicle_awards := _record_operator_chronicle(_build_after_action_report())
	if not new_chronicle_awards.is_empty() and is_instance_valid(result_intel_label):
		result_intel_label.text += " · AWARDS: " + " / ".join(new_chronicle_awards)
	result_panel.visible = true
	if OS.has_feature("web"):
		JavaScriptBridge.eval("if(window.OSGARDGameLifecycle){window.OSGARDGameLifecycle({type:'osgard:game-lifecycle',game:'null-shift',state:'completed',at:Date.now()});}else if(window.parent!==window){window.parent.postMessage({type:'osgard:game-lifecycle',game:'null-shift',state:'completed',at:Date.now()},window.location.origin);}")
	_update_hud()



func _combat_combo_multiplier(chain_count: int) -> float:
	if chain_count >= 9:
		return 2.0
	if chain_count >= 6:
		return 1.75
	if chain_count >= 4:
		return 1.5
	if chain_count >= 2:
		return 1.25
	return 1.0

func _combat_damage_per_hit(critical_hit: bool, overdrive_active: bool) -> int:
	return 1 + int(critical_hit) + int(overdrive_active)

func _record_weapon_shot(confirmed_combat_hit: bool) -> void:
	shots_fired += 1
	if confirmed_combat_hit:
		shots_hit += 1

func _is_hostile_target(target: Node) -> bool:
	for guard in guards:
		if guard.get("node") == target:
			return true
	return false

func _is_combat_target(target: Node) -> bool:
	if not is_instance_valid(target):
		return false
	if target.has_meta("device_index"):
		return true
	return _is_hostile_target(target)

func _combat_accuracy_percentage() -> float:
	if shots_fired <= 0:
		return 100.0
	return clampf(float(shots_hit) / float(shots_fired) * 100.0, 0.0, 100.0)

func _break_combat_combo() -> void:
	if combat_combo > 0:
		combo_breaks += 1
	combat_combo = 0
	combat_combo_timer = 0.0


func _weakpoint_damage_multiplier(guard: Dictionary, precision_hit: bool) -> float:
	if not precision_hit or float(guard.get("weakpoint_exposed_timer", 0.0)) <= 0.0:
		return 1.0
	return 1.24 if bool(guard.get("warden", false)) else 1.42

func _set_guard_weakpoint_visual(body: Node3D, guard: Dictionary, exposed: bool) -> void:
	if not is_instance_valid(body):
		return
	var core := body.get_node_or_null("GuardChestCore") as MeshInstance3D
	if not is_instance_valid(core):
		return
	if exposed:
		core.material_override = materials.get("white", materials.get("cyan"))
		return
	var accent: Material = materials.get("cyan")
	if bool(guard.get("warden", false)):
		accent = materials.get("gold", materials.get("amber"))
	else:
		match str(guard.get("role", "RANGER")):
			"STALKER":
				accent = materials.get("violet", materials.get("cyan"))
			"HEAVY":
				accent = materials.get("amber", materials.get("cyan"))
	core.material_override = accent

func _countershot_damage_scale(base_scale: float, window_remaining: float) -> float:
	if window_remaining <= 0.0:
		return base_scale
	return maxf(0.0, base_scale) * COUNTERSHOT_DAMAGE_MULTIPLIER

func _select_earliest_telegraph(telegraphs: Array[Dictionary]) -> Dictionary:
	var selected: Dictionary = {}
	for telegraph in telegraphs:
		var eta: float = maxf(0.0, float(telegraph.get("eta", 999.0)))
		if selected.is_empty() or eta < float(selected.get("eta", 999.0)):
			selected = telegraph.duplicate(true)
	return selected

func _nearest_incoming_threat() -> Dictionary:
	var telegraphs: Array[Dictionary] = []
	for guard in guards:
		var body := guard.get("node") as Node3D
		if not is_instance_valid(body):
			continue
		var fire_eta: float = maxf(0.0, float(guard.get("windup", 0.0)))
		var dash_eta: float = maxf(0.0, float(guard.get("dash_windup", 0.0)))
		if fire_eta <= 0.0 and dash_eta <= 0.0:
			continue
		var is_dash: bool = dash_eta > 0.0 and (fire_eta <= 0.0 or dash_eta <= fire_eta)
		telegraphs.append({
			"eta": dash_eta if is_dash else fire_eta,
			"kind": "DASH" if is_dash else "FIRE",
			"role": str(guard.get("role", "HOSTILE")),
			"distance": body.global_position.distance_to(player.global_position)
		})
	return _select_earliest_telegraph(telegraphs)

func _threat_forecast_text() -> String:
	var prefix := "COUNTER %.1fS · " % counter_window_remaining if counter_window_remaining > 0.0 else ""
	var threat := _nearest_incoming_threat()
	if threat.is_empty():
		return prefix + "THREAT CLEAR"
	return prefix + "%s %s IN %.1fS" % [str(threat.get("role", "HOSTILE")), str(threat.get("kind", "FIRE")), float(threat.get("eta", 0.0))]

func _combo_mastery_tier(chain_count: int) -> int:
	if chain_count >= 15:
		return 4
	if chain_count >= 10:
		return 3
	if chain_count >= 6:
		return 2
	if chain_count >= 3:
		return 1
	return 0

func _combo_mastery_label(tier: int) -> String:
	match tier:
		4:
			return "MYTHIC"
		3:
			return "APEX"
		2:
			return "CASCADE"
		1:
			return "SURGE"
		_:
			return "BUILD"

func _combo_mastery_charge_bonus(tier: int) -> float:
	match tier:
		1:
			return 8.0
		2:
			return 12.0
		3:
			return 18.0
		4:
			return 24.0
		_:
			return 0.0

func _weapon_mastery_rank_for_critical_hits(total_critical_hits: int) -> int:
	var total: int = maxi(0, total_critical_hits)
	if total >= 100:
		return 4
	if total >= 60:
		return 3
	if total >= 30:
		return 2
	if total >= 12:
		return 1
	return 0

func _weapon_mastery_rank() -> int:
	return _weapon_mastery_rank_for_critical_hits(int(career.get_value("career", "total_critical_hits", 0)))

func _daily_side_objective_definition(code: String) -> Dictionary:
	var seed_value: int = _daily_seed_for_code(code)
	if seed_value <= 0:
		return {}
	var options: Array[Dictionary] = [
		{"id": "precision", "title": "PRECISION LINE", "instruction": "LAND 3 PRECISION HITS", "goal": 3},
		{"id": "evasion", "title": "CLEAN EVASION", "instruction": "EVADE 2 ATTACKS", "goal": 2},
		{"id": "pressure", "title": "BREAK THE LINE", "instruction": "INTERRUPT 2 ATTACKS", "goal": 2},
		{"id": "echo", "title": "GHOST PROTOCOL", "instruction": "LURE 1 HOSTILE WITH ECHO", "goal": 1}
	]
	return options[seed_value % options.size()].duplicate(true)

func _daily_side_objective_state(code: String = "") -> Dictionary:
	var objective_code: String = daily_challenge_code if code.is_empty() else code
	var definition := _daily_side_objective_definition(objective_code)
	if definition.is_empty():
		return {}
	var progress := 0
	match str(definition["id"]):
		"precision":
			progress = critical_hits
		"evasion":
			progress = dash_evasions
		"pressure":
			progress = suppression_attack_interrupts
		"echo":
			progress = phase_echo_lures
	var goal: int = int(definition["goal"])
	return {
		"id": str(definition["id"]),
		"title": str(definition["title"]),
		"instruction": str(definition["instruction"]),
		"progress": maxi(0, progress),
		"goal": goal,
		"completed": progress >= goal,
		"reward": DAILY_TACTICAL_BONUS_CREDITS
	}

func _spawn_salvage_drop(at: Vector3, precision_finisher: bool, elite: bool = false) -> void:
	while salvage_drops.size() >= MAX_SALVAGE_DROPS:
		var oldest: Dictionary = salvage_drops.pop_front()
		var oldest_node := oldest.get("node") as Node3D
		if is_instance_valid(oldest_node):
			oldest_node.queue_free()
		salvage_pickups_evicted += 1
	var pickup := Node3D.new()
	pickup.name = "SalvageShard"
	pickup.position = Vector3(clampf(at.x, -21.5, 21.5), 0.86, clampf(at.z, -12.4, 12.4))
	var crystal := MeshInstance3D.new()
	crystal.name = "ShardCore"
	var crystal_mesh := BoxMesh.new()
	crystal_mesh.size = Vector3(0.18, 0.34, 0.18)
	crystal.mesh = crystal_mesh
	crystal.rotation_degrees = Vector3(0.0, 45.0, 45.0)
	crystal.material_override = materials["gold"] if elite else materials["cyan"]
	pickup.add_child(crystal)
	var glint := MeshInstance3D.new()
	glint.name = "ShardGlint"
	var glint_mesh := BoxMesh.new()
	glint_mesh.size = Vector3(0.07, 0.2, 0.07)
	glint.mesh = glint_mesh
	glint.rotation_degrees = Vector3(0.0, -45.0, -45.0)
	glint.material_override = materials["white"]
	pickup.add_child(glint)
	add_child(pickup)
	salvage_drops.append({
		"node": pickup,
		"base_y": pickup.position.y,
		"life": SALVAGE_LIFETIME_SECONDS,
		"phase": randf_range(0.0, TAU),
		"credits": 40 if elite else (30 if precision_finisher else 20),
		"charge": 24.0 if precision_finisher or elite else 16.0,
		"cooling": 14.0 if precision_finisher or elite else 8.0
	})
	salvage_pickups_spawned += 1
	_record_raid_event("salvage_drop", "ELITE" if elite else ("PRECISION" if precision_finisher else "STANDARD"), 1.0, at)

func _update_salvage_drops(delta: float) -> void:
	if paused_game or mission_finished or briefing_visible or not is_instance_valid(player):
		return
	for index in range(salvage_drops.size() - 1, -1, -1):
		var drop: Dictionary = salvage_drops[index]
		var pickup := drop.get("node") as Node3D
		if not is_instance_valid(pickup):
			salvage_drops.remove_at(index)
			continue
		drop["life"] = maxf(0.0, float(drop.get("life", 0.0)) - delta)
		if float(drop["life"]) <= 0.0:
			pickup.queue_free()
			salvage_drops.remove_at(index)
			salvage_pickups_expired += 1
			_record_raid_event("salvage_expired", "SHARD LOST", 0.0, pickup.global_position)
			continue
		drop["phase"] = float(drop.get("phase", 0.0)) + delta
		pickup.rotation.y += delta * 1.7
		pickup.position.y = float(drop.get("base_y", 0.86)) + 0.12 * sin(float(drop["phase"]) * 2.1)
		if pickup.global_position.distance_to(player.global_position) <= SALVAGE_COLLECT_RADIUS:
			var credits: int = int(drop.get("credits", 20))
			var charge: float = float(drop.get("charge", 16.0))
			var cooling: float = float(drop.get("cooling", 8.0))
			run_credits += credits
			overdrive_charge = minf(OVERDRIVE_MAX_CHARGE, overdrive_charge + charge)
			weapon_heat = maxf(0.0, weapon_heat - cooling)
			salvage_pickups_collected += 1
			objective_text = "SALVAGE RECOVERED · +%d CR · +%.0f OVERDRIVE · −%.0f HEAT" % [credits, charge, cooling]
			_record_raid_event("salvage_pickup", "RECOVERED", float(credits), pickup.global_position)
			pickup.queue_free()
			salvage_drops.remove_at(index)
			_play_sfx(740.0, 0.13, 0.075)
			_update_hud()
			continue
		salvage_drops[index] = drop

func _register_hostile_elimination(guard: Dictionary, body: Node3D, precision_finisher: bool) -> void:
	var previous_tier: int = _combo_mastery_tier(combat_combo)
	eliminations += 1
	combat_combo += 1
	combat_combo_timer = COMBAT_COMBO_WINDOW
	combat_combo_best = maxi(combat_combo_best, combat_combo)
	var role: String = str(guard.get("role", "RANGER"))
	var role_bounty := 0
	match role:
		"STALKER":
			role_bounty = 20
		"HEAVY":
			role_bounty = 45
		"RANGER":
			role_bounty = 15
		"WARDEN":
			role_bounty = 250
	var multiplier := _combat_combo_multiplier(combat_combo)
	var credits := roundi(float(100 + role_bounty) * multiplier)
	var points := roundi(float(120 + role_bounty) * multiplier)
	run_credits += credits
	combat_score_total += points
	var charge_gain := 28.0 + (10.0 if precision_finisher else 0.0) + (15.0 if bool(guard.get("warden", false)) else 0.0)
	overdrive_charge = minf(OVERDRIVE_MAX_CHARGE, overdrive_charge + charge_gain)
	_spawn_salvage_drop(body.global_position, precision_finisher, bool(guard.get("warden", false)))
	var mastery_tier: int = _combo_mastery_tier(combat_combo)
	if mastery_tier > previous_tier and mastery_tier > 0:
		var mastery_charge: float = _combo_mastery_charge_bonus(mastery_tier)
		var mastery_credits: int = mastery_tier * 15
		overdrive_charge = minf(OVERDRIVE_MAX_CHARGE, overdrive_charge + mastery_charge)
		run_credits += mastery_credits
		combo_mastery_awards += 1
		_record_raid_event("combo_mastery", _combo_mastery_label(mastery_tier), mastery_charge, body.global_position)
		_spawn_ring_burst(body.global_position + Vector3.UP * 0.18, materials["violet"])
		_play_sfx(420.0 + float(mastery_tier) * 90.0, 0.13, 0.1)
	_record_raid_event("elimination", role + (" / PRECISION" if precision_finisher else ""), float(points), body.global_position)
	objective_text = "ЛИКВИДАЦИЯ · +%d CR · %s %d · ×%.2f" % [credits, _combo_mastery_label(mastery_tier), combat_combo, multiplier]
	_play_sfx(170.0 + minf(520.0, float(combat_combo) * 42.0), 0.2, 0.12)
	if overdrive_charge >= OVERDRIVE_MAX_CHARGE and overdrive_timer <= 0.0:
		objective_text += " · OVERDRIVE READY"
	_update_hud()

func _update_combat_director(delta: float) -> void:
	_update_tactical_doctrine(delta)
	if combat_combo_timer > 0.0:
		combat_combo_timer = maxf(0.0, combat_combo_timer - delta)
		if combat_combo_timer <= 0.0 and combat_combo > 0:
			combat_combo = 0
			_update_hud()
	if overdrive_timer > 0.0:
		overdrive_timer = maxf(0.0, overdrive_timer - delta)
		if overdrive_timer <= 0.0:
			_play_sfx(240.0, 0.26, 0.08)
			objective_text = "OVERDRIVE ЗАВЕРШЁН · КОНТУР ОХЛАЖДАЕТСЯ"
			_update_hud()

func _activate_overdrive() -> void:
	if paused_game or mission_finished or briefing_visible or terminal_active:
		return
	if overdrive_timer > 0.0:
		objective_text = "OVERDRIVE АКТИВЕН · %.1f С" % overdrive_timer
		_update_hud()
		return
	if overdrive_charge < OVERDRIVE_MAX_CHARGE:
		objective_text = "OVERDRIVE НЕ ЗАРЯЖЕН · НУЖНО 100%% · СЕЙЧАС %d%%" % int(roundf(overdrive_charge))
		_update_hud()
		return
	overdrive_charge = 0.0
	overdrive_timer = OVERDRIVE_DURATION
	overdrive_activations += 1
	phase_flash_timer = maxf(phase_flash_timer, 0.28)
	_screen_impulse(0.12, 0.22)
	_spawn_ring_burst(player.global_position + Vector3.UP * 0.2, materials["violet"])
	_spawn_impact_light(player.global_position + Vector3.UP * 0.8, Color(0.7, 0.36, 1.0), 3.8, 6.4, 0.28)
	_play_sfx(480.0, 0.48, 0.16)
	objective_text = "OVERDRIVE АКТИВЕН · 5 СЕКУНД · УСИЛЕННЫЙ УРОН / ЗАЩИТА"
	_update_hud()

func _effective_guard_speed(guard: Dictionary) -> float:
	var pressure: float = clampf(float(guard.get("suppression", 0.0)) / 100.0, 0.0, 1.0)
	var resistance: float = 0.48 if bool(guard.get("warden", false)) else 1.0
	var pressure_factor: float = lerpf(1.0, GUARD_SUPPRESSION_SPEED_FLOOR, pressure * resistance)
	return float(guard.get("speed", 1.0)) * pressure_factor * (0.66 if overdrive_timer > 0.0 else 1.0)

func _apply_guard_suppression(guard: Dictionary, amount: float, critical_hit: bool = false) -> Dictionary:
	var is_warden: bool = bool(guard.get("warden", false))
	var pressure_gain: float = maxf(0.0, amount) * (1.45 if critical_hit else 1.0) * (0.55 if is_warden else 1.0)
	var pressure: float = clampf(float(guard.get("suppression", 0.0)) + pressure_gain, 0.0, 100.0)
	guard["suppression"] = pressure
	guard["suppression_timer"] = 2.1
	suppression_hits += 1
	suppression_total_pressure += pressure_gain
	var trigger_threshold: float = GUARD_SUPPRESSION_THRESHOLD * (1.0 if not is_warden else 1.4)
	if pressure >= trigger_threshold and float(guard.get("suppression_lockout", 0.0)) <= 0.0:
		var was_telegraphing: bool = float(guard.get("windup", 0.0)) > 0.0 or float(guard.get("dash_windup", 0.0)) > 0.0
		var body: Node3D = guard.get("node") as Node3D
		var stun_duration: float = GUARD_SUPPRESSION_STUN * (0.48 if is_warden else 1.0)
		guard["stun"] = maxf(float(guard.get("stun", 0.0)), stun_duration)
		guard["windup"] = 0.0
		guard["dash_windup"] = 0.0
		guard["attack_lanes"] = []
		guard["suppression"] = 26.0 if not is_warden else 40.0
		guard["suppression_lockout"] = GUARD_SUPPRESSION_LOCKOUT * (1.7 if is_warden else 1.0)
		suppression_breaks += 1
		var weakpoint_was_open: bool = float(guard.get("weakpoint_exposed_timer", 0.0)) > 0.0
		guard["weakpoint_exposed_timer"] = maxf(float(guard.get("weakpoint_exposed_timer", 0.0)), WEAKPOINT_EXPOSURE_SECONDS)
		if not weakpoint_was_open:
			weakpoint_exposures += 1
			_set_guard_weakpoint_visual(body, guard, true)
			if is_instance_valid(body):
				_record_raid_event("weakpoint_exposed", str(guard.get("role", "HOSTILE")), WEAKPOINT_EXPOSURE_SECONDS, body.global_position)
		if was_telegraphing:
			suppression_attack_interrupts += 1
		if is_instance_valid(body):
			var tint: Color = Color(1.0, 0.48, 0.24) if is_warden else Color(0.25, 0.92, 1.0)
			_spawn_impact_light(body.global_position + Vector3.UP * 0.82, tint, 1.9, 3.4, 0.16)
			_spawn_ring_burst(body.global_position + Vector3.UP * 0.12, materials["cyan"] if not is_warden else materials["amber"])
			_record_raid_event("suppression_break", str(guard.get("role", "HOSTILE")), 1.0 if was_telegraphing else 0.0, body.global_position)
		_play_sfx(310.0 if not is_warden else 190.0, 0.14, 0.085)
	return guard

func _record_raid_event(event_type: String, detail: String, value: float = 0.0, at: Vector3 = Vector3.ZERO) -> void:
	# Fixed-capacity local black box; no account data, network calls or full replay payloads.
	while raid_event_ledger.size() >= MAX_RAID_EVENT_COUNT:
		raid_event_ledger.pop_front()
	var event: Dictionary = {
		"t": snappedf(maxf(0.0, elapsed), 0.01),
		"type": event_type.substr(0, 32),
		"detail": detail.substr(0, 120),
		"value": snappedf(value, 0.01)
	}
	if at != Vector3.ZERO:
		event["position"] = {
			"x": snappedf(at.x, 0.1),
			"y": snappedf(at.y, 0.1),
			"z": snappedf(at.z, 0.1)
		}
	raid_event_ledger.append(event)

func _mission_score_breakdown(kills: int, precision: int, best_chain: int, accuracy: float, taken_damage: float, duration: float) -> Dictionary:
	var elimination_points: int = maxi(0, kills) * 120
	var precision_points: int = maxi(0, precision) * 35
	var combo_points: int = maxi(0, best_chain) * 18
	var accuracy_points: int = roundi(clampf(accuracy, 0.0, 100.0) * 2.0)
	var damage_penalty: int = roundi(maxf(0.0, taken_damage) * 2.5)
	var time_penalty: int = roundi(maxf(0.0, duration) * 0.5)
	var raw_total: int = elimination_points + precision_points + combo_points + accuracy_points - damage_penalty - time_penalty
	return {
		"elimination_points": elimination_points,
		"precision_points": precision_points,
		"combo_points": combo_points,
		"accuracy_points": accuracy_points,
		"damage_penalty": damage_penalty,
		"time_penalty": time_penalty,
		"raw_total": raw_total,
		"total": maxi(0, raw_total)
	}

func _calculate_mission_score(kills: int, precision: int, best_chain: int, accuracy: float, taken_damage: float, duration: float) -> int:
	return int(_mission_score_breakdown(kills, precision, best_chain, accuracy, taken_damage, duration)["total"])

func _mission_grade_for_score(score: int) -> String:
	if score >= 900:
		return "S"
	if score >= 680:
		return "A"
	if score >= 440:
		return "B"
	return "C"

func _mission_grade_bonus(grade: String) -> int:
	match grade:
		"S":
			return 700
		"A":
			return 500
		"B":
			return 300
		_:
			return 150

func _after_action_insights() -> Array[String]:
	var insights: Array[String] = []
	if mission_accuracy < 55.0:
		insights.append("ТОЧНОСТЬ: сокращай дистанцию и дожидайся захвата цели")
	if insights.size() < 3 and stealth_mode_active and stealth_takedowns == 0:
		insights.append("PHANTOM: B включает тихий шаг; подойди со спины и нажми E")
	if insights.size() < 3 and stealth_body_discoveries > 0:
		insights.append("СКРЫТНОСТЬ: патруль нашёл тело; меняй маршрут после устранения")
	if insights.size() < 3 and damage_taken_total >= 35.0:
		insights.append("ЗАЩИТА: чаще используй укрытия, импульс и фазовый сдвиг")
	if insights.size() < 3 and combat_combo_best < 3:
		insights.append("КОМБО: связывай устранения в одну серию")
	if insights.size() < 3 and warden_spawned and warden_staggers == 0:
		insights.append("WARDEN: точный выстрел во время телеграфа срывает атаку")
	if insights.size() < 3 and extraction_overload_count > 0:
		insights.append("ЭВАКУАЦИЯ: после ядра есть 30 секунд до блокировки")
	if insights.size() < 3 and weapon_overheat_events >= 2:
		insights.append("ТЕПЛОВОЙ КОНТУР: отпускай огонь для охлаждения или сбрасывай тепло через V")
	if insights.size() < 3 and scan_activations == 0 and not guards.is_empty():
		insights.append("РАЗВЕДКА: Z выявляет роли, здоровье противников и устройства сквозь укрытия")
	if insights.size() < 3 and phase_echo_activations == 0 and not guards.is_empty():
		insights.append("ОТВЛЕЧЕНИЕ: T создаёт ложную цель для отряда; используй её после разрыва видимости")
	if insights.size() < 3 and eliminations > 0 and suppression_attack_interrupts == 0:
		insights.append("KINETIC PRESSURE: повторные попадания накапливают давление; точные попадания быстрее срывают атаки")
	if insights.size() < 3 and device_emp_overloads + device_cell_novas + device_lane_collapses == 0:
		insights.append("АРЕНА: уничтожай полевые устройства — это меняет ход боя")
	if insights.is_empty():
		insights.append("ХОРОШИЙ БАЛАНС: повтори контракт и попробуй улучшить SCORE")
	return insights

func _after_action_insights_text() -> String:
	var output := ""
	for part in _after_action_insights():
		if not output.is_empty():
			output += "\n"
		output += "· " + part
	return output

func _build_after_action_report() -> Dictionary:
	var device_summary: Dictionary = {"destroyed": 0, "RELAY": 0, "CELL": 0, "ANCHOR": 0}
	for device in devices:
		if not bool(device.get("destroyed", false)):
			continue
		device_summary["destroyed"] = int(device_summary["destroyed"]) + 1
		var kind := str(device.get("kind", "UNKNOWN"))
		if device_summary.has(kind):
			device_summary[kind] = int(device_summary[kind]) + 1
	var outcome := "IN_PROGRESS"
	if mission_finished:
		outcome = "SUCCESS" if mission_success else "FAILED"
	var score_data := _mission_score_breakdown(eliminations, critical_hits, combat_combo_best, mission_accuracy, damage_taken_total, elapsed)
	return {
		"schema": AFTER_ACTION_REPORT_SCHEMA,
		"game": "NULL//SHIFT",
		"gameVersion": "0.23.0-phantom-protocol",
		"outcome": outcome,
		"challengeCode": daily_challenge_code if daily_challenge_active else "",
		"runSeed": daily_run_seed,
		"contract": {"index": current_contract + 1, "name": str(career_names[current_contract])},
		"elapsedSeconds": snappedf(maxf(0.0, elapsed), 0.01),
		"score": int(score_data["total"]),
		"grade": mission_grade,
		"scoreBreakdown": score_data,
		"suppression": {
			"pressureHits": suppression_hits,
			"pressureBreaks": suppression_breaks,
			"attackInterrupts": suppression_attack_interrupts,
			"pressureApplied": snappedf(suppression_total_pressure, 0.1)
		},
		"combat": {
			"eliminations": eliminations,
			"criticalHits": critical_hits,
			"shotsFired": shots_fired,
			"shotsHit": shots_hit,
			"accuracyPercent": snappedf(mission_accuracy, 0.1),
			"damageTaken": snappedf(damage_taken_total, 0.1),
			"bestCombo": combat_combo_best,
			"comboBreaks": combo_breaks,
			"dashEvasions": dash_evasions,
			"overdriveActivations": overdrive_activations,
			"overdriveArcs": overdrive_arc_chains
		},
		"thermal": {
			"heatPercentAtExport": snappedf(weapon_heat, 0.1),
			"overheated": weapon_overheated,
			"overheatEvents": weapon_overheat_events,
			"ventUses": weapon_vent_uses,
			"ventHostilesInterrupted": weapon_vent_hits
		},
		"recon": {
			"scanActivations": scan_activations,
			"hostilesRevealed": scan_hostiles_revealed_total,
			"devicesRevealed": scan_devices_revealed_total
		},
		"phaseEcho": {
			"deployments": phase_echo_activations,
			"confirmedLures": phase_echo_lures,
			"activeAtExport": is_instance_valid(phase_echo_node) and phase_echo_remaining > 0.0
		},
		"devices": device_summary,
		"extraction": {
			"pressureStarted": extraction_reinforcements_spawned > 0,
			"reinforcementsSpawned": extraction_reinforcements_spawned,
			"overloadCount": extraction_overload_count,
			"pressureActiveAtExport": extraction_pressure_active
		},
		"warden": {
			"spawned": warden_spawned,
			"phaseTransitions": warden_phase_transitions,
			"precisionStaggers": warden_staggers
		},
		"counterplay": {
			"doctrine": adaptive_doctrine,
			"doctrineChanges": tactical_doctrine_changes,
			"actions": tactical_action_counts.duplicate(true)
		},
		"stealth": {
			"stanceSeconds": snappedf(stealth_stance_seconds, 0.1),
			"quietFootsteps": stealth_quiet_steps,
			"silentTakedowns": stealth_takedowns,
			"bestTakedownChain": stealth_chain_best,
			"bodiesDiscovered": stealth_body_discoveries,
			"visualDetections": stealth_detections,
			"bonusCredits": stealth_bonus_credits,
			"modeActiveAtExport": stealth_mode_active
		},
		"mastery": {
			"arc9Rank": _weapon_mastery_rank(),
			"lifetimeCriticalHits": int(career.get_value("career", "total_critical_hits", 0))
		},
		"weakpoints": {
			"exposures": weakpoint_exposures,
			"precisionHits": weakpoint_hits
		},
		"countershot": {
			"windowsEarned": counter_windows_earned,
			"confirmedHits": countershot_hits
		},
		"salvage": {
			"spawned": salvage_pickups_spawned,
			"collected": salvage_pickups_collected,
			"expired": salvage_pickups_expired,
			"evictedAtCapacity": salvage_pickups_evicted
		},
		"comboMastery": {
			"awards": combo_mastery_awards,
			"bestTier": _combo_mastery_label(_combo_mastery_tier(combat_combo_best))
		},
		"dailyObjective": _daily_side_objective_state() if daily_challenge_active else {},
		"anomalies": daily_mutator_ids.duplicate(),
		"insights": _after_action_insights(),
		"events": raid_event_ledger.duplicate(true)
	}

func _export_after_action_report() -> void:
	if not mission_finished:
		objective_text = "ОТЧЁТ ПОЯВИТСЯ ПОСЛЕ ЗАВЕРШЕНИЯ РЕЙДА"
		_update_hud()
		return
	var report_text := JSON.stringify(_build_after_action_report(), "\t")
	if OS.has_feature("web"):
		# User-initiated Blob download; the report is not transmitted to any service.
		var encoded_report := JSON.stringify(report_text)
		var script := "(function(){const d=" + encoded_report + ";const b=new Blob([d],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='null-shift-after-action-'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);})();"
		JavaScriptBridge.eval(script)
		if is_instance_valid(result_intel_label):
			result_intel_label.text = "ОТЧЁТ JSON СКАЧАН ЛОКАЛЬНО · ДАННЫЕ НЕ ОТПРАВЛЯЛИСЬ"
	else:
		DisplayServer.clipboard_set(report_text)
		if is_instance_valid(result_intel_label):
			result_intel_label.text = "ОТЧЁТ JSON СКОПИРОВАН В БУФЕР · ЛОКАЛЬНЫЙ ЭКСПОРТ"
	_update_hud()


func _create_operator_chronicle_panel() -> void:
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	var panel_width: float = maxf(288.0, minf(760.0, viewport_size.x - 24.0))
	var panel_height: float = maxf(280.0, minf(610.0, viewport_size.y - 24.0))
	chronicle_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-panel_width * 0.5, -panel_height * 0.5, panel_width, panel_height))
	chronicle_panel.name = "OperatorChronicle"
	chronicle_panel.z_index = 90
	chronicle_panel.visible = false
	var stack := _panel_stack(chronicle_panel)
	_label(stack, "OSGARD FIELD INTELLIGENCE / CAREER RECORD", 9, Color(0.38, 1.0, 0.86))
	_label(stack, "OPERATOR CHRONICLE", 24, Color(0.91, 0.98, 0.96))
	chronicle_summary_label = _label(stack, "РЕЙДЫ 0 · ПОБЕДЫ 0 · ЛУЧШИЙ СЧЁТ 0", 11, Color(1.0, 0.77, 0.39))
	chronicle_summary_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	chronicle_awards_label = _label(stack, "ACHIEVEMENTS · ЕЩЁ НЕ ОТКРЫТЫ", 10, Color(0.38, 1.0, 0.86))
	chronicle_awards_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	chronicle_scroll = ScrollContainer.new()
	chronicle_scroll.name = "ChronicleHistoryScroll"
	chronicle_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	chronicle_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chronicle_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	chronicle_scroll.custom_minimum_size = Vector2(panel_width - 52.0, maxf(90.0, panel_height - 230.0))
	stack.add_child(chronicle_scroll)
	chronicle_history_label = _label(chronicle_scroll, "ПОКА НЕТ ЗАВЕРШЁННЫХ РЕЙДОВ", 10, Color(0.76, 0.89, 0.86))
	chronicle_history_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	chronicle_history_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var action_row := HBoxContainer.new()
	action_row.alignment = BoxContainer.ALIGNMENT_CENTER
	action_row.add_theme_constant_override("separation", 8)
	stack.add_child(action_row)
	_add_button(action_row, "ЭКСПОРТ АРХИВА JSON", _export_operator_chronicle, Vector2(maxf(112.0, (panel_width - 64.0) * 0.58), 36.0))
	_add_button(action_row, "ЗАКРЫТЬ / ESC", _close_operator_chronicle, Vector2(maxf(100.0, (panel_width - 64.0) * 0.38), 36.0))
	_refresh_operator_chronicle_layout(viewport_size)

func _refresh_operator_chronicle_layout(viewport_size: Vector2) -> void:
	if not is_instance_valid(chronicle_panel):
		return
	var panel_width: float = maxf(288.0, minf(760.0, viewport_size.x - 24.0))
	var panel_height: float = maxf(280.0, minf(610.0, viewport_size.y - 24.0))
	chronicle_panel.offset_left = -panel_width * 0.5
	chronicle_panel.offset_right = panel_width * 0.5
	chronicle_panel.offset_top = -panel_height * 0.5
	chronicle_panel.offset_bottom = panel_height * 0.5
	if is_instance_valid(chronicle_scroll):
		chronicle_scroll.custom_minimum_size = Vector2(panel_width - 52.0, maxf(70.0, panel_height - 230.0))

func _show_operator_chronicle() -> void:
	if not is_instance_valid(chronicle_panel):
		return
	chronicle_return_to_result = is_instance_valid(result_panel) and result_panel.visible
	chronicle_return_to_loadout = is_instance_valid(loadout_panel) and loadout_panel.visible and not chronicle_return_to_result
	chronicle_previous_paused = paused_game
	if is_instance_valid(result_panel):
		result_panel.visible = false
	if is_instance_valid(loadout_panel):
		loadout_panel.visible = false
	if is_instance_valid(pause_panel):
		pause_panel.visible = false
	paused_game = true
	_update_operator_chronicle_panel()
	chronicle_panel.visible = true

func _close_operator_chronicle() -> void:
	if is_instance_valid(chronicle_panel):
		chronicle_panel.visible = false
	paused_game = chronicle_previous_paused
	if chronicle_return_to_result and is_instance_valid(result_panel) and mission_finished:
		result_panel.visible = true
	elif chronicle_return_to_loadout and is_instance_valid(loadout_panel):
		loadout_panel.visible = true
	chronicle_return_to_result = false
	chronicle_return_to_loadout = false
	_update_hud()

func _update_operator_chronicle_panel() -> void:
	if not is_instance_valid(chronicle_summary_label):
		return
	var history := _operator_chronicle_history()
	var total_runs: int = maxi(0, int(career.get_value("chronicle", "total_runs", 0)))
	var wins: int = maxi(0, int(career.get_value("chronicle", "total_successes", 0)))
	var losses: int = maxi(0, int(career.get_value("chronicle", "total_failures", 0)))
	var win_rate: float = 0.0 if total_runs == 0 else float(wins) * 100.0 / float(total_runs)
	chronicle_summary_label.text = "ALL-TIME %d РЕЙДОВ · ПОБЕДЫ %d · ПРОВАЛЫ %d · WIN RATE %.0f%%\nЛУЧШИЙ SCORE %d · ACC PB %.1f%% · БЕЗУЩЕРБНЫЕ ЭВАКУАЦИИ %d · В АРХИВЕ %d/%d" % [
		total_runs, wins, losses, win_rate,
		int(career.get_value("chronicle", "best_score", 0)),
		float(career.get_value("chronicle", "best_accuracy", 0.0)),
		int(career.get_value("chronicle", "clean_extractions", 0)),
		history.size(), MAX_OPERATOR_CHRONICLE_RECORDS
	]
	var known_achievements := _operator_chronicle_achievement_catalog()
	var unlocked := _operator_chronicle_unlocked_achievements()
	var award_titles: Array[String] = []
	for award in known_achievements:
		if unlocked.has(str(award["id"])):
			award_titles.append(str(award["title"]))
	var award_text := "ДОСТИЖЕНИЯ %d/%d" % [award_titles.size(), known_achievements.size()]
	if award_titles.is_empty():
		award_text += " · ПРОХОДИ РЕЙДЫ, ЧТОБЫ ОТКРЫВАТЬ МЕДАЛИ"
	else:
		award_text += " · " + " / ".join(award_titles)
	chronicle_awards_label.text = award_text
	if history.is_empty():
		chronicle_history_label.text = "ПОКА НЕТ ЗАПИСЕЙ · ЗАВЕРШИ РЕЙД, ЧТОБЫ СОХРАНИТЬ ЕГО ЗДЕСЬ"
		return
	var history_text := ""
	for index in range(history.size() - 1, -1, -1):
		var record: Dictionary = history[index]
		var elapsed_seconds := maxi(0, int(roundf(float(record.get("elapsedSeconds", 0.0)))))
		var clock_text := "%02d:%02d" % [int(elapsed_seconds / 60), elapsed_seconds % 60]
		var outcome_text := "EXTRACTED" if str(record.get("outcome", "")) == "SUCCESS" else "FAILED"
		var anomalies: Array = record.get("anomalies", [])
		var anomalies_text := " + ".join(anomalies) if not anomalies.is_empty() else "STANDARD"
		history_text += "%s  %s  ·  %05d  ·  GRADE %s  ·  C%d  ·  %s  ·  ACC %.0f%%\n    %s  ·  KILLS %d  ·  CRITS %d  ·  DAMAGE %.0f  ·  %s\n\n" % [
			str(record.get("recordId", "")), outcome_text, int(record.get("score", 0)), str(record.get("grade", "C")),
			int(record.get("contractIndex", 1)), clock_text, float(record.get("accuracyPercent", 0.0)),
			str(record.get("recordedAtUtc", "")), int(record.get("eliminations", 0)),
			int(record.get("criticalHits", 0)), float(record.get("damageTaken", 0.0)), anomalies_text
		]
	chronicle_history_label.text = history_text


func _normalize_operator_chronicle_record(value: Variant) -> Dictionary:
	if not value is Dictionary:
		return {}
	var source: Dictionary = value
	var outcome := str(source.get("outcome", ""))
	var record_id := str(source.get("recordId", ""))
	if outcome not in ["SUCCESS", "FAILED"] or record_id.is_empty():
		return {}
	var allowed_anomalies := ["hunter", "armor", "grid", "supply", "fracture", "radar"]
	var anomalies_value: Variant = source.get("anomalies", [])
	var safe_anomalies: Array[String] = []
	if anomalies_value is Array:
		for anomaly in anomalies_value:
			var anomaly_id := str(anomaly)
			if allowed_anomalies.has(anomaly_id) and not safe_anomalies.has(anomaly_id) and safe_anomalies.size() < 2:
				safe_anomalies.append(anomaly_id)
	var grade := str(source.get("grade", "C"))
	if grade not in ["S", "A", "B", "C", "D", "F"]:
		grade = "C"
	var recorded_at := str(source.get("recordedAtUtc", "")).substr(0, 40)
	if recorded_at.is_empty():
		recorded_at = Time.get_datetime_string_from_system(true)
	return {
		"recordId": record_id.substr(0, 32),
		"recordedAtUtc": recorded_at,
		"outcome": outcome,
		"contractIndex": clampi(int(source.get("contractIndex", 1)), 1, 3),
		"contractName": str(source.get("contractName", "UNKNOWN")).substr(0, 40),
		"challengeCode": str(source.get("challengeCode", "")).substr(0, 48),
		"runSeed": clampi(int(source.get("runSeed", 0)), 0, 2147483647),
		"score": clampi(int(source.get("score", 0)), 0, 999999999),
		"grade": grade,
		"elapsedSeconds": clampf(float(source.get("elapsedSeconds", 0.0)), 0.0, 86400.0),
		"eliminations": clampi(int(source.get("eliminations", 0)), 0, 10000),
		"criticalHits": clampi(int(source.get("criticalHits", 0)), 0, 10000),
		"accuracyPercent": clampf(float(source.get("accuracyPercent", 0.0)), 0.0, 100.0),
		"damageTaken": clampf(float(source.get("damageTaken", 0.0)), 0.0, 1000000.0),
		"bestCombo": clampi(int(source.get("bestCombo", 0)), 0, 10000),
		"shotsFired": clampi(int(source.get("shotsFired", 0)), 0, 100000),
		"devicesDestroyed": clampi(int(source.get("devicesDestroyed", 0)), 0, 1000),
		"pressureBreaks": clampi(int(source.get("pressureBreaks", 0)), 0, 10000),
		"phaseEchoLures": clampi(int(source.get("phaseEchoLures", 0)), 0, 10000),
		"wardenStaggers": clampi(int(source.get("wardenStaggers", 0)), 0, 1000),
		"dailyObjectiveCompleted": bool(source.get("dailyObjectiveCompleted", false)),
		"anomalies": safe_anomalies
	}

func _operator_chronicle_record_from_report(report: Dictionary, record_number: int, recorded_at: String) -> Dictionary:
	var combat: Dictionary = report.get("combat", {})
	var contract: Dictionary = report.get("contract", {})
	var devices_summary: Dictionary = report.get("devices", {})
	var suppression: Dictionary = report.get("suppression", {})
	var phase_echo: Dictionary = report.get("phaseEcho", {})
	var warden: Dictionary = report.get("warden", {})
	var daily_objective: Dictionary = report.get("dailyObjective", {})
	var record := {
		"recordId": "NS-R%06d" % maxi(1, record_number),
		"recordedAtUtc": recorded_at,
		"outcome": str(report.get("outcome", "")),
		"contractIndex": int(contract.get("index", 1)),
		"contractName": str(contract.get("name", "UNKNOWN")),
		"challengeCode": str(report.get("challengeCode", "")),
		"runSeed": int(report.get("runSeed", 0)),
		"score": int(report.get("score", 0)),
		"grade": str(report.get("grade", "C")),
		"elapsedSeconds": float(report.get("elapsedSeconds", 0.0)),
		"eliminations": int(combat.get("eliminations", 0)),
		"criticalHits": int(combat.get("criticalHits", 0)),
		"accuracyPercent": float(combat.get("accuracyPercent", 0.0)),
		"damageTaken": float(combat.get("damageTaken", 0.0)),
		"bestCombo": int(combat.get("bestCombo", 0)),
		"shotsFired": int(combat.get("shotsFired", 0)),
		"devicesDestroyed": int(devices_summary.get("destroyed", 0)),
		"pressureBreaks": int(suppression.get("pressureBreaks", 0)),
		"phaseEchoLures": int(phase_echo.get("confirmedLures", 0)),
		"wardenStaggers": int(warden.get("precisionStaggers", 0)),
		"dailyObjectiveCompleted": bool(daily_objective.get("completed", false)),
		"anomalies": report.get("anomalies", [])
	}
	return _normalize_operator_chronicle_record(record)

func _operator_chronicle_append(history: Array, new_record: Dictionary) -> Array[Dictionary]:
	var safe_history: Array[Dictionary] = []
	var normalized_new := _normalize_operator_chronicle_record(new_record)
	if normalized_new.is_empty():
		return safe_history
	var duplicate_found := false
	for value in history:
		var normalized := _normalize_operator_chronicle_record(value)
		if normalized.is_empty():
			continue
		if str(normalized.get("recordId", "")) == str(normalized_new.get("recordId", "")):
			duplicate_found = true
		safe_history.append(normalized)
	if not duplicate_found:
		safe_history.append(normalized_new)
	while safe_history.size() > MAX_OPERATOR_CHRONICLE_RECORDS:
		safe_history.pop_front()
	return safe_history

func _operator_chronicle_summary(history: Array) -> Dictionary:
	var runs := 0
	var wins := 0
	var losses := 0
	var best_score := 0
	var total_score := 0
	var best_accuracy := 0.0
	var total_eliminations := 0
	var clean_extractions := 0
	for value in history:
		var record := _normalize_operator_chronicle_record(value)
		if record.is_empty():
			continue
		runs += 1
		if str(record["outcome"]) == "SUCCESS":
			wins += 1
			if float(record["damageTaken"]) <= 0.0:
				clean_extractions += 1
		else:
			losses += 1
		var score: int = int(record["score"])
		total_score += score
		best_score = maxi(best_score, score)
		best_accuracy = maxf(best_accuracy, float(record["accuracyPercent"]))
		total_eliminations += int(record["eliminations"])
	return {
		"runs": runs,
		"wins": wins,
		"losses": losses,
		"winRatePercent": 0.0 if runs == 0 else snappedf(float(wins) * 100.0 / float(runs), 0.1),
		"averageScore": 0 if runs == 0 else int(roundf(float(total_score) / float(runs))),
		"bestScore": best_score,
		"bestAccuracyPercent": snappedf(best_accuracy, 0.1),
		"cleanExtractions": clean_extractions,
		"totalEliminations": total_eliminations
	}

func _operator_chronicle_achievement_catalog() -> Array[Dictionary]:
	return [
		{"id": "first-extraction", "title": "FIRST EXTRACTION", "detail": "Вернись живым хотя бы один раз"},
		{"id": "ghost-extraction", "title": "GHOST", "detail": "Заверши рейд без полученного урона"},
		{"id": "phantom-operator", "title": "PHANTOM OPERATOR", "detail": "Заверши успешный рейд минимум с тремя тихими устранениями"},
		{"id": "sharpshooter", "title": "SHARPSHOOTER", "detail": "Победа с точностью не ниже 90% и минимум 8 выстрелами"},
		{"id": "apex-combo", "title": "APEX", "detail": "Собери серию из 10 устранений"},
		{"id": "warden-breaker", "title": "WARDEN BREAKER", "detail": "Оглуши Warden точным попаданием"},
		{"id": "echo-architect", "title": "ECHO ARCHITECT", "detail": "Отвлеки охрану фазовым эхом"},
		{"id": "system-saboteur", "title": "SYSTEM SABOTEUR", "detail": "Уничтожь интерактивное устройство"},
		{"id": "pressure-master", "title": "PRESSURE MASTER", "detail": "Прерви три атаки подавлением"},
		{"id": "salvage-reclaimer", "title": "SALVAGE RECLAIMER", "detail": "Подними полевой ресурс"},
		{"id": "anomaly-survivor", "title": "ANOMALY SURVIVOR", "detail": "Победи в рейде с двумя аномалиями"},
		{"id": "overdrive-conductor", "title": "OVERDRIVE CONDUCTOR", "detail": "Создай минимум две дуговые цепи"},
		{"id": "perfect-operator", "title": "PERFECT OPERATOR", "detail": "Безупречная эвакуация с точностью от 95%"}
	]

func _operator_chronicle_unlocks_for_report(report: Dictionary, previous_successes: int = 0) -> Array[String]:
	var unlocked: Array[String] = []
	var outcome := str(report.get("outcome", ""))
	var combat: Dictionary = report.get("combat", {})
	var devices_summary: Dictionary = report.get("devices", {})
	var suppression: Dictionary = report.get("suppression", {})
	var phase_echo: Dictionary = report.get("phaseEcho", {})
	var warden: Dictionary = report.get("warden", {})
	var salvage: Dictionary = report.get("salvage", {})
	var anomalies_value: Variant = report.get("anomalies", [])
	var anomaly_count: int = anomalies_value.size() if anomalies_value is Array else 0
	var accuracy: float = float(combat.get("accuracyPercent", 0.0))
	var damage_taken: float = float(combat.get("damageTaken", 0.0))
	var shots_fired: int = int(combat.get("shotsFired", 0))
	var best_combo: int = int(combat.get("bestCombo", 0))
	var overdrive_arcs: int = int(combat.get("overdriveArcs", 0))
	var stealth: Dictionary = report.get("stealth", {})
	if outcome == "SUCCESS" and int(stealth.get("silentTakedowns", 0)) >= 3:
		unlocked.append("phantom-operator")
	if outcome == "SUCCESS" and previous_successes == 0:
		unlocked.append("first-extraction")
	if outcome == "SUCCESS" and damage_taken <= 0.0:
		unlocked.append("ghost-extraction")
	if outcome == "SUCCESS" and accuracy >= 90.0 and shots_fired >= 8:
		unlocked.append("sharpshooter")
	if best_combo >= 10:
		unlocked.append("apex-combo")
	if int(warden.get("precisionStaggers", 0)) > 0:
		unlocked.append("warden-breaker")
	if int(phase_echo.get("confirmedLures", 0)) > 0:
		unlocked.append("echo-architect")
	if int(devices_summary.get("destroyed", 0)) > 0:
		unlocked.append("system-saboteur")
	if int(suppression.get("pressureBreaks", 0)) >= 3:
		unlocked.append("pressure-master")
	if int(salvage.get("collected", 0)) > 0:
		unlocked.append("salvage-reclaimer")
	if outcome == "SUCCESS" and anomaly_count >= 2:
		unlocked.append("anomaly-survivor")
	if overdrive_arcs >= 2:
		unlocked.append("overdrive-conductor")
	if outcome == "SUCCESS" and damage_taken <= 0.0 and accuracy >= 95.0:
		unlocked.append("perfect-operator")
	return unlocked

func _operator_chronicle_history() -> Array[Dictionary]:
	var raw_history: Variant = career.get_value("chronicle", "history", [])
	var history: Array[Dictionary] = []
	if raw_history is Array:
		for item in raw_history:
			var normalized := _normalize_operator_chronicle_record(item)
			if not normalized.is_empty():
				history.append(normalized)
	while history.size() > MAX_OPERATOR_CHRONICLE_RECORDS:
		history.pop_front()
	return history

func _operator_chronicle_unlocked_achievements() -> Array[String]:
	var raw_unlocked: Variant = career.get_value("chronicle", "achievements", [])
	var allowed_ids: Array[String] = []
	for achievement in _operator_chronicle_achievement_catalog():
		allowed_ids.append(str(achievement["id"]))
	var unlocked: Array[String] = []
	if raw_unlocked is Array:
		for item in raw_unlocked:
			var achievement_id := str(item)
			if allowed_ids.has(achievement_id) and not unlocked.has(achievement_id) and unlocked.size() < MAX_OPERATOR_CHRONICLE_ACHIEVEMENTS:
				unlocked.append(achievement_id)
	return unlocked

func _record_operator_chronicle(report: Dictionary) -> Array[String]:
	var total_before: int = maxi(0, int(career.get_value("chronicle", "total_runs", 0)))
	var successes_before: int = maxi(0, int(career.get_value("chronicle", "total_successes", 0)))
	var record := _operator_chronicle_record_from_report(report, total_before + 1, Time.get_datetime_string_from_system(true))
	if record.is_empty():
		return []
	var history := _operator_chronicle_append(_operator_chronicle_history(), record)
	career.set_value("chronicle", "history", history)
	career.set_value("chronicle", "total_runs", total_before + 1)
	if str(record["outcome"]) == "SUCCESS":
		career.set_value("chronicle", "total_successes", successes_before + 1)
	else:
		career.set_value("chronicle", "total_failures", maxi(0, int(career.get_value("chronicle", "total_failures", 0))) + 1)
	career.set_value("chronicle", "best_score", maxi(int(career.get_value("chronicle", "best_score", 0)), int(record["score"])))
	career.set_value("chronicle", "best_accuracy", maxf(float(career.get_value("chronicle", "best_accuracy", 0.0)), float(record["accuracyPercent"])))
	if str(record["outcome"]) == "SUCCESS" and float(record["damageTaken"]) <= 0.0:
		career.set_value("chronicle", "clean_extractions", maxi(0, int(career.get_value("chronicle", "clean_extractions", 0))) + 1)
	var unlocked := _operator_chronicle_unlocked_achievements()
	var new_awards: Array[String] = []
	for achievement_id in _operator_chronicle_unlocks_for_report(report, successes_before):
		if not unlocked.has(achievement_id) and unlocked.size() < MAX_OPERATOR_CHRONICLE_ACHIEVEMENTS:
			unlocked.append(achievement_id)
			new_awards.append(achievement_id)
	career.set_value("chronicle", "achievements", unlocked)
	_save_career()
	return new_awards

func _build_operator_chronicle_export() -> Dictionary:
	var history := _operator_chronicle_history()
	var summary := _operator_chronicle_summary(history)
	summary["lifetimeRuns"] = maxi(0, int(career.get_value("chronicle", "total_runs", 0)))
	summary["lifetimeWins"] = maxi(0, int(career.get_value("chronicle", "total_successes", 0)))
	summary["lifetimeLosses"] = maxi(0, int(career.get_value("chronicle", "total_failures", 0)))
	summary["lifetimeBestScore"] = maxi(0, int(career.get_value("chronicle", "best_score", 0)))
	return {
		"schema": OPERATOR_CHRONICLE_SCHEMA,
		"game": "NULL//SHIFT",
		"gameVersion": "0.23.0-phantom-protocol",
		"generatedAtUtc": Time.get_datetime_string_from_system(true),
		"localOnly": true,
		"networkUpload": false,
		"summary": summary,
		"history": history.duplicate(true),
		"achievements": _operator_chronicle_unlocked_achievements()
	}

func _export_operator_chronicle() -> void:
	var archive_text := JSON.stringify(_build_operator_chronicle_export(), "\t")
	if OS.has_feature("web"):
		var encoded_archive := JSON.stringify(archive_text)
		var script := "(function(){const d=" + encoded_archive + ";const b=new Blob([d],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='null-shift-operator-chronicle-'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);})();"
		JavaScriptBridge.eval(script)
		if is_instance_valid(chronicle_summary_label):
			chronicle_summary_label.text += "\nАРХИВ JSON СКАЧАН ЛОКАЛЬНО · ДАННЫЕ НЕ ОТПРАВЛЯЮТСЯ"
	else:
		DisplayServer.clipboard_set(archive_text)
		if is_instance_valid(chronicle_summary_label):
			chronicle_summary_label.text += "\nАРХИВ JSON СКОПИРОВАН В БУФЕР"
	_update_hud()

func _daily_mutator_catalog() -> Array[Dictionary]:
	return [
		{"id": "hunter", "name": "HUNTER PROTOCOL", "short": "HUNTER", "detail": "ОХОТА · СТРАЖА ДВИЖЕТСЯ НА 18% БЫСТРЕЕ"},
		{"id": "armor", "name": "ARMORED HOSTILES", "short": "ARMORED", "detail": "БРОНЯ · КАЖДЫЙ ПРОТИВНИК ПОЛУЧАЕТ +1 HP"},
		{"id": "grid", "name": "GRID OVERDRIVE", "short": "GRID +22%", "detail": "ЭНЕРГОСЕТЬ · КОНТУРЫ ЦИКЛИРУЮТ НА 22% БЫСТРЕЕ"},
		{"id": "supply", "name": "SUPPLY BLACKOUT", "short": "NO MEDKIT", "detail": "БЛЭКАУТ · АПТЕЧКА ОТКЛЮЧЕНА НА ВЕСЬ РЕЙД"},
		{"id": "fracture", "name": "PHASE FRACTURE", "short": "FRACTURE", "detail": "РАЗЛОМ · СТАРТУЙ С 18% НЕСТАБИЛЬНОСТИ; SHIFT ЖЁСТЧЕ"},
		{"id": "radar", "name": "RADAR GHOST", "short": "RADAR OFF", "detail": "ПОМЕХИ · ТАКТИЧЕСКИЙ РАДАР ЗАГЛУШЁН"}
	]

func _daily_seed_for_code(code: String) -> int:
	if _contract_index_from_challenge_code(code) < 0:
		return 0
	# Stable 31-bit FNV-style seed: same challenge URL gets the same procedural setup.
	# This synchronizes starting procedural choices without claiming deterministic physics.
	var seed_value: int = 2166136261
	for byte_value in code.to_utf8_buffer():
		seed_value = int((seed_value ^ int(byte_value)) * 16777619) & 0x7fffffff
	return maxi(seed_value, 1)

func _daily_mutator_ids_for_code(code: String) -> Array[String]:
	var ids: Array[String] = []
	var stable_seed := _daily_seed_for_code(code)
	if stable_seed <= 0:
		return ids
	var rng := RandomNumberGenerator.new()
	rng.seed = stable_seed
	var pool: Array[Dictionary] = []
	for mutator in _daily_mutator_catalog():
		pool.append(mutator.duplicate(true))
	while ids.size() < 2 and not pool.is_empty():
		var selected: Dictionary = pool.pop_at(rng.randi_range(0, pool.size() - 1))
		ids.append(str(selected["id"]))
	return ids

func _daily_mutators_hud_text() -> String:
	var names: Array[String] = []
	for mutator in daily_mutators:
		names.append(str(mutator["short"]))
	var result := ""
	for item in names:
		if not result.is_empty():
			result += " / "
		result += item
	return result

func _daily_mutators_detail_text() -> String:
	var details: Array[String] = []
	for mutator in daily_mutators:
		details.append(str(mutator["detail"]))
	var result := ""
	for detail in details:
		if not result.is_empty():
			result += " · "
		result += detail
	return result

func _configure_daily_mutators() -> void:
	daily_mutators.clear()
	daily_mutator_ids.clear()
	daily_phase_rate = 1.0
	daily_shift_instability_bonus = 0.0
	daily_radar_jammed = false
	daily_supply_blackout = false
	if not daily_challenge_active:
		return
	daily_mutator_ids = _daily_mutator_ids_for_code(daily_challenge_code)
	if daily_mutator_ids.is_empty():
		return
	for mutator in _daily_mutator_catalog():
		var mutator_id := str(mutator["id"])
		if not daily_mutator_ids.has(mutator_id):
			continue
		daily_mutators.append(mutator)
		match mutator_id:
			"grid":
				daily_phase_rate = 1.22
			"supply":
				daily_supply_blackout = true
				medkit_used = true
				if is_instance_valid(medkit):
					medkit.visible = false
			"fracture":
				daily_shift_instability_bonus = 8.0
				instability = maxf(instability, 18.0)
			"radar":
				daily_radar_jammed = true
				if is_instance_valid(tactical_radar_panel):
					tactical_radar_panel.visible = false
	for index in range(guards.size()):
		_apply_daily_mutators_to_guard(index)
	objective_text = "DAILY OP · %s · ANOMALIES %s" % [daily_challenge_code, _daily_mutators_hud_text()]

func _apply_daily_mutators_to_guard(index: int) -> void:
	if daily_mutator_ids.is_empty() or index < 0 or index >= guards.size():
		return
	var guard: Dictionary = guards[index]
	if bool(guard.get("daily_mutators_applied", false)):
		return
	if daily_mutator_ids.has("hunter"):
		guard["speed"] = float(guard["speed"]) * 1.18
		guard["cooldown"] = float(guard["cooldown"]) * 0.86
		guard["damage"] = float(guard["damage"]) * 1.06
	if daily_mutator_ids.has("armor"):
		guard["hp"] = int(guard["hp"]) + 1
		guard["max_hp"] = int(guard["max_hp"]) + 1
		var body := guard.get("node") as CharacterBody3D
		if is_instance_valid(body):
			var health_readout := body.get_node_or_null("HealthReadout") as Label3D
			if is_instance_valid(health_readout):
				health_readout.text = "HP %d / %d" % [int(guard["hp"]), int(guard["max_hp"])]
	guard["daily_mutators_applied"] = true
	guards[index] = guard


func _record_tactical_action(action: String) -> void:
	if not tactical_action_counts.has(action):
		return
	tactical_action_counts[action] = minf(24.0, float(tactical_action_counts.get(action, 0.0)) + 1.0)

func _select_tactical_doctrine(counts: Dictionary) -> String:
	var actions := ["dash", "pulse", "phase"]
	var total := 0.0
	var best_action := ""
	var best_value := -1.0
	for action in actions:
		var value := maxf(0.0, float(counts.get(action, 0.0)))
		total += value
		if value > best_value:
			best_value = value
			best_action = action
	if total < 2.5 or best_value / maxf(total, 0.001) < 0.48:
		return "BALANCED"
	match best_action:
		"dash":
			return "INTERCEPT"
		"pulse":
			return "SPLIT"
		"phase":
			return "ECHO_TRACK"
	return "BALANCED"

func _update_tactical_doctrine(delta: float) -> void:
	var dt := maxf(0.0, delta)
	tactical_doctrine_lock_timer = maxf(0.0, tactical_doctrine_lock_timer - dt)
	tactical_doctrine_clock -= dt
	for action in ["dash", "pulse", "phase"]:
		var decayed := float(tactical_action_counts.get(action, 0.0)) * pow(0.91, dt)
		tactical_action_counts[action] = 0.0 if decayed < 0.025 else decayed
	if tactical_doctrine_clock > 0.0:
		return
	tactical_doctrine_clock = TACTICAL_DOCTRINE_REFRESH_SECONDS
	if tactical_doctrine_lock_timer > 0.0:
		return
	var next_doctrine := _select_tactical_doctrine(tactical_action_counts)
	if next_doctrine == adaptive_doctrine:
		return
	adaptive_doctrine = next_doctrine
	tactical_doctrine_changes += 1
	tactical_doctrine_lock_timer = TACTICAL_DOCTRINE_LOCK_SECONDS
	match adaptive_doctrine:
		"INTERCEPT":
			objective_text = "AI COUNTERPLAY · INTERCEPT · СТРАЖ ПРЕДСКАЗЫВАЕТ РЫВОК"
		"SPLIT":
			objective_text = "AI COUNTERPLAY · SPLIT · ОХРАНА РАСПРЕДЕЛЯЕТСЯ ПО АРЕНЕ"
		"ECHO_TRACK":
			objective_text = "AI COUNTERPLAY · ECHO TRACK · СЛЕД СДВИГА СЛЫШЕН ДАЛЬШЕ"
		_:
			objective_text = "AI COUNTERPLAY · BALANCED · БАЗОВАЯ ТАКТИКА"
	_update_hud()

func _predict_intercept_position(position: Vector3, velocity: Vector3, dash_remaining: float) -> Vector3:
	var planar_velocity := Vector3(velocity.x, 0.0, velocity.z)
	var lead_seconds := clampf(planar_velocity.length() * 0.025, 0.0, 0.22)
	if dash_remaining > 0.0:
		lead_seconds = minf(maxf(0.0, dash_remaining), 0.24)
	var predicted := position + planar_velocity * lead_seconds
	predicted.x = clampf(predicted.x, -21.0, 21.0)
	predicted.z = clampf(predicted.z, -12.0, 12.0)
	predicted.y = position.y
	return predicted

func _phase_noise_radius() -> float:
	return 26.0 if adaptive_doctrine == "ECHO_TRACK" else 18.0

func _today_date_code() -> String:
	return Time.get_date_string_from_system(true).replace("-", "")

func _contract_index_for_date(date_code: String) -> int:
	if date_code.length() != 8:
		return 0
	var month := int(date_code.substr(4, 2))
	var day := int(date_code.substr(6, 2))
	return (month + day) % career_names.size()

func _today_challenge_code() -> String:
	return _challenge_code_for_date(_today_date_code())

func _challenge_code_for_date(date_code: String) -> String:
	return "NS-%s-C%d" % [date_code, _contract_index_for_date(date_code) + 1]

func _previous_date_code(date_code: String) -> String:
	if date_code.length() != 8 or not date_code.is_valid_int():
		return ""
	var date_parts := {
		"year": int(date_code.substr(0, 4)),
		"month": int(date_code.substr(4, 2)),
		"day": int(date_code.substr(6, 2)),
		"hour": 12,
		"minute": 0,
		"second": 0
	}
	if int(date_parts["month"]) < 1 or int(date_parts["month"]) > 12 or int(date_parts["day"]) < 1 or int(date_parts["day"]) > 31:
		return ""
	var timestamp := Time.get_unix_time_from_datetime_dict(date_parts)
	var canonical := Time.get_datetime_dict_from_unix_time(timestamp)
	if int(canonical["year"]) != int(date_parts["year"]) or int(canonical["month"]) != int(date_parts["month"]) or int(canonical["day"]) != int(date_parts["day"]):
		return ""
	var previous := Time.get_datetime_dict_from_unix_time(timestamp - 86400)
	return "%04d%02d%02d" % [int(previous["year"]), int(previous["month"]), int(previous["day"])]

func _contract_index_from_challenge_code(code: String) -> int:
	var pattern := RegEx.new()
	if pattern.compile("^NS-([0-9]{8})-C([1-3])$") != OK:
		return -1
	var matched := pattern.search(code)
	if matched == null:
		return -1
	var date_code := matched.get_string(1)
	var contract_index := int(matched.get_string(2)) - 1
	if contract_index != _contract_index_for_date(date_code):
		return -1
	return contract_index

func _resolve_shared_challenge() -> void:
	if not OS.has_feature("web"):
		return
	var shared_code := str(JavaScriptBridge.eval("new URLSearchParams(window.location.search).get('challenge') || ''"))
	var challenge_contract := _contract_index_from_challenge_code(shared_code)
	if challenge_contract < 0:
		return
	daily_challenge_active = true
	daily_challenge_code = shared_code
	current_contract = challenge_contract
	_save_career()

func _start_daily_challenge() -> void:
	daily_challenge_code = _today_challenge_code()
	daily_challenge_active = true
	current_contract = _contract_index_from_challenge_code(daily_challenge_code)
	_save_career()
	objective_text = "DAILY OP · КОНТРАКТ %02d · ПОВТОРИ ЕГО С ДРУЗЬЯМИ" % (current_contract + 1)
	_play_sfx(610.0, 0.18, 0.08)
	_restart_game()

func _claim_daily_challenge_reward() -> int:
	return _claim_daily_challenge_reward_for_date(_today_date_code())

func _claim_daily_side_objective_reward_for_date(date_code: String) -> int:
	if not daily_challenge_active or daily_challenge_code != _challenge_code_for_date(date_code):
		return 0
	if daily_tactical_claimed_date == date_code:
		return 0
	var objective := _daily_side_objective_state()
	if objective.is_empty() or not bool(objective.get("completed", false)):
		return 0
	daily_tactical_claimed_date = date_code
	career.set_value("daily", "tactical_claimed_date", daily_tactical_claimed_date)
	_record_raid_event("daily_side_objective", str(objective.get("title", "COMPLETE")), float(DAILY_TACTICAL_BONUS_CREDITS), player.global_position if is_instance_valid(player) else Vector3.ZERO)
	_save_career()
	return DAILY_TACTICAL_BONUS_CREDITS

func _claim_daily_challenge_reward_for_date(date_code: String) -> int:
	if not daily_challenge_active or daily_challenge_code != _challenge_code_for_date(date_code):
		return 0
	if daily_claimed_date == date_code or daily_last_completed_date == date_code:
		return 0
	var previous_date := _previous_date_code(date_code)
	if not previous_date.is_empty() and daily_last_completed_date == previous_date:
		daily_streak += 1
	else:
		daily_streak = 1
	daily_longest_streak = maxi(daily_longest_streak, daily_streak)
	daily_last_completed_date = date_code
	daily_claimed_date = date_code
	var reward := 400
	last_daily_streak_bonus = 0
	if daily_streak == 3:
		last_daily_streak_bonus = 100
	elif daily_streak % 7 == 0:
		last_daily_streak_bonus = 300
	reward += last_daily_streak_bonus
	_save_career()
	_refresh_loadout()
	return reward

func _share_run() -> void:
	var code := _today_challenge_code()
	var result_text := "эвакуировался" if mission_finished and core_secured else "проверил свои силы"
	var payload := {
		"challengeCode": code,
		"contract": career_names[current_contract],
		"result": "ЭВАКУАЦИЯ УСПЕШНА" if mission_finished and core_secured else ("ОПЕРАТОР ПОТЕРЯН" if mission_finished else "РЕЙД В ПРОЦЕССЕ"),
		"eliminations": eliminations,
		"credits": career_credits,
		"dailyStreak": daily_streak,
		"streakBonus": last_daily_streak_bonus if daily_challenge_active and daily_claimed_date == _today_date_code() else 0,
		"succeeded": mission_finished and core_secured
	}
	var note := "NULL//SHIFT · Я %s в %s. Устранений: %d. Серия ежедневных рейдов: %d дней. Повтори контракт %s." % [result_text, career_names[current_contract], eliminations, daily_streak, code]
	if is_instance_valid(result_share_label):
		result_share_label.text = "КАРТОЧКА РЕЗУЛЬТАТА · " + code
	if OS.has_feature("web"):
		var js := "if(window.OSGARDGameShare && typeof window.OSGARDGameShare.share === 'function'){window.OSGARDGameShare.share(" + JSON.stringify(payload) + ");}else{window.prompt('Скопируй ссылку на ежедневный контракт:',window.location.href);}"
		JavaScriptBridge.eval(js)
	else:
		var link := "https://osgard.world/games/null-shift-godot/?challenge=" + code
		DisplayServer.clipboard_set(note + "\n" + link)
		if is_instance_valid(result_share_label):
			result_share_label.text = "ОТЧЁТ И ССЫЛКА СКОПИРОВАНЫ · " + code

func _buy_cosmetic(style: String) -> void:
	if style not in ["amber", "violet"]:
		return
	var owned := owns_amber_style if style == "amber" else owns_violet_style
	if not owned:
		var cost := 450 if style == "amber" else 750
		if career_credits < cost:
			objective_text = "НЕДОСТАТОЧНО КРЕДИТОВ · НУЖНО %d" % cost
			_update_hud()
			return
		career_credits -= cost
		if style == "amber":
			owns_amber_style = true
		else:
			owns_violet_style = true
	operator_style = style
	_update_player_material()
	_save_career()
	objective_text = "КОСМЕТИКА ЭКИПИРОВАНА · БОЕВЫЕ ХАРАКТЕРИСТИКИ НЕ МЕНЯЮТСЯ"
	_play_sfx(760.0, 0.2, 0.08)
	_refresh_loadout()
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
	daily_challenge_active = false
	daily_challenge_code = ""
	career.set_value("daily", "active", false)
	career.set_value("daily", "code", "")
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
		adaptive_quality_level = 0
		adaptive_quality_degraded = false
		adaptive_slow_windows = 0
		adaptive_fast_windows = 0
	_apply_surface_detail_quality()
	var cinematic_effects: bool = cinematic_quality and adaptive_quality_level < 2
	var balanced_effects: bool = not performance_quality and adaptive_quality_level < 2
	# Actual viewport MSAA request; platform drivers may cap the available level.
	get_viewport().msaa_3d = Viewport.MSAA_4X if cinematic_effects and adaptive_quality_level == 0 else (Viewport.MSAA_2X if balanced_effects else Viewport.MSAA_DISABLED)
	if is_instance_valid(world_environment) and is_instance_valid(world_environment.environment):
		world_environment.environment.glow_enabled = cinematic_effects
		world_environment.environment.glow_intensity = 0.48 if cinematic_quality and adaptive_quality_level == 1 else 0.72
	if is_instance_valid(key_light):
		key_light.shadow_enabled = balanced_effects
		key_light.directional_shadow_max_distance = 48.0 if cinematic_effects and adaptive_quality_level == 0 else (34.0 if balanced_effects else 18.0)
	if is_instance_valid(fill_light):
		fill_light.visible = balanced_effects
	for light in local_lights:
		if is_instance_valid(light):
			light.visible = balanced_effects
	for impact_state in impact_light_effects:
		var impact_light: OmniLight3D = impact_state.get("node") as OmniLight3D
		if is_instance_valid(impact_light):
			impact_light.visible = float(impact_state.get("remaining", 0.0)) > 0.0 and balanced_effects
	if is_instance_valid(atmosphere_particles):
		atmosphere_particles.amount = 72 if cinematic_effects and adaptive_quality_level == 0 else (46 if cinematic_effects and adaptive_quality_level == 1 else (32 if balanced_effects else 8))
		atmosphere_particles.speed_scale = 1.0 if cinematic_effects and adaptive_quality_level == 0 else (0.82 if cinematic_effects and adaptive_quality_level == 1 else 0.72)
		atmosphere_particles.emitting = not performance_quality and adaptive_quality_level < 2
		atmosphere_particles.visible = atmosphere_particles.emitting
	var mode_name: String = "CINEMATIC" if cinematic_quality else ("PERFORMANCE" if performance_quality else "BALANCED")
	var adaptive_mode_name: String = "AUTO-OPTIMIZED II" if adaptive_quality_level >= 2 else ("AUTO-OPTIMIZED I" if adaptive_quality_level == 1 else mode_name)
	if is_instance_valid(status_subtitle):
		status_subtitle.text = "PHASE TRANSIT / %s" % adaptive_mode_name
	if is_instance_valid(quality_button):
		quality_button.text = "QUALITY / %s" % mode_name
	if is_instance_valid(mobile_quality_button):
		mobile_quality_button.tooltip_text = "Текущий режим: %s. Нажмите для переключения." % mode_name
	if is_instance_valid(mobile_diagnostics_button):
		mobile_diagnostics_button.text = "FPS+" if diagnostics_enabled else "FPS"
	_update_reduced_motion_ui()
	if is_instance_valid(sound_button):
		sound_button.text = "ЗВУК / ВКЛ" if sound_enabled else "ЗВУК / ВЫКЛ"


func _apply_surface_detail_quality() -> void:
	# Albedo remains on in all profiles; normal and roughness maps scale with the GPU budget.
	var use_detail_maps: bool = not performance_quality and adaptive_quality_level < 2
	for material_name in ["floor", "wall", "wall_trim"]:
		var surface_material: StandardMaterial3D = materials.get(material_name) as StandardMaterial3D
		if not is_instance_valid(surface_material):
			continue
		surface_material.normal_enabled = use_detail_maps
		surface_material.normal_texture = surface_normal_texture if use_detail_maps else null
		surface_material.roughness_texture = surface_roughness_texture if use_detail_maps else null


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
		if adaptive_slow_windows >= 2 and adaptive_quality_level < 2:
			adaptive_quality_level += 1
			adaptive_quality_degraded = adaptive_quality_level >= 2
			adaptive_slow_windows = 0
			_apply_quality_mode()
	elif mean_ms <= 16.8 and p95_ms <= 21.0:
		adaptive_fast_windows += 1
		adaptive_slow_windows = 0
		if adaptive_fast_windows >= 4 and adaptive_quality_level > 0:
			adaptive_quality_level -= 1
			adaptive_quality_degraded = adaptive_quality_level >= 2
			adaptive_fast_windows = 0
			_apply_quality_mode()
	else:
		adaptive_slow_windows = 0
		adaptive_fast_windows = 0

func _update_reduced_motion_ui() -> void:
	if not is_instance_valid(mobile_motion_button):
		return
	mobile_motion_button.text = "MOT LOW" if reduced_motion else "MOT ON"
	mobile_motion_button.tooltip_text = "Сниженное движение ВКЛ: мягкая камера и спокойные экранные эффекты." if reduced_motion else "Сниженное движение ВЫКЛ: полная кинематографическая камера и пульсация."

func _hazard_color(state: String) -> Color:
	if color_safe_mode:
		match state:
			"warning":
				return Color(0.16, 0.58, 1.0, 1.0)
			"active":
				return Color(1.0, 0.48, 0.08, 1.0)
			"disrupted":
				return Color(0.88, 0.94, 1.0, 1.0)
			_:
				return Color(0.12, 0.74, 0.66, 1.0)
	match state:
		"warning":
			return Color(1.0, 0.58, 0.2, 1.0)
		"active":
			return Color(1.0, 0.12, 0.19, 1.0)
		"disrupted":
			return Color(0.16, 1.0, 0.78, 1.0)
		_:
			return Color(0.12, 0.84, 0.72, 1.0)

func _apply_hazard_palette() -> void:
	for lane_variant: Variant in phase_lanes:
		if not (lane_variant is Dictionary):
			continue
		var lane: Dictionary = lane_variant
		for state in ["warning", "active"]:
			var material: StandardMaterial3D = lane.get(str(state) + "_material") as StandardMaterial3D
			if not is_instance_valid(material):
				continue
			var tint: Color = _hazard_color(str(state))
			material.albedo_color = tint
			material.emission = tint
			material.emission_enabled = true
		if lane.has("pulse_light"):
			var pulse_light: OmniLight3D = lane["pulse_light"] as OmniLight3D
			if is_instance_valid(pulse_light):
				pulse_light.light_color = _hazard_color(str(lane.get("state", "safe")))
	if is_instance_valid(hazard_status_label):
		hazard_status_label.add_theme_color_override("font_color", _hazard_color("safe"))
	if is_instance_valid(tactical_radar_map):
		tactical_radar_map.queue_redraw()

func _toggle_color_safe_mode() -> void:
	color_safe_mode = not color_safe_mode
	career.set_value("settings", "color_safe_mode", color_safe_mode)
	_save_career()
	_apply_hazard_palette()
	_update_phase_lanes(0.0)
	_update_accessibility_buttons()
	objective_text = "ЦВЕТОВАЯ СХЕМА: %s" % ("COLOR SAFE" if color_safe_mode else "STANDARD")
	_update_hud()

func _hud_scale_value() -> float:
	var scales: Array[float] = [0.92, 1.0, 1.08]
	return scales[clampi(hud_scale_step, 0, 2)]

func _apply_hud_scale() -> void:
	if not is_instance_valid(hud_root):
		return
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	hud_root.pivot_offset = viewport_size * 0.5
	hud_root.scale = Vector2.ONE * _hud_scale_value()
	# Full-screen shaders stay full-screen even when the HUD is scaled.
	for overlay in [cinematic_vignette, impact_overlay]:
		if is_instance_valid(overlay):
			overlay.pivot_offset = viewport_size * 0.5
			overlay.scale = Vector2.ONE / _hud_scale_value()

func _cycle_hud_scale() -> void:
	hud_scale_step = (hud_scale_step + 1) % 3
	career.set_value("settings", "hud_scale_step", hud_scale_step)
	_save_career()
	_apply_hud_scale()
	_update_accessibility_buttons()
	objective_text = "РАЗМЕР HUD: %d%%" % int(round(_hud_scale_value() * 100.0))
	_update_hud()

func _update_accessibility_buttons() -> void:
	if is_instance_valid(mobile_palette_button):
		mobile_palette_button.text = "CLR SAFE" if color_safe_mode else "CLR STD"
		mobile_palette_button.tooltip_text = "F5: цветобезопасные сигналы — синий для предупреждения, оранжевый для опасности."
	if is_instance_valid(mobile_hud_scale_button):
		mobile_hud_scale_button.text = "HUD %d%%" % int(round(_hud_scale_value() * 100.0))
		mobile_hud_scale_button.tooltip_text = "F6: изменить размер интерфейса."
	if is_instance_valid(mobile_haptics_button):
		mobile_haptics_button.text = "RUM ON" if haptics_enabled else "RUM OFF"
		mobile_haptics_button.tooltip_text = "F7: тактильная отдача совместимого геймпада."
	if is_instance_valid(status_shortcuts):
		status_shortcuts.text = "ПОМОЩЬ / H · FPS / F3 · ГРАФИКА / F2 · ДВИЖ. / F4 · ЦВЕТ / F5 · HUD / F6 · ВИБРО / F7"

func _toggle_reduced_motion() -> void:
	reduced_motion = not reduced_motion
	if reduced_motion:
		camera_shake_strength = 0.0
		camera_shake_timer = 0.0
		camera_shake_duration = 0.0
		weapon_recoil = 0.0
		if is_instance_valid(camera):
			camera.fov = CAMERA_BASE_FOV
	career.set_value("settings", "reduced_motion", reduced_motion)
	_save_career()
	_update_reduced_motion_ui()
	_update_cinematic_vignette()
	_update_hud()

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
	reduced_motion = bool(career.get_value("settings", "reduced_motion", false))
	color_safe_mode = bool(career.get_value("settings", "color_safe_mode", false))
	haptics_enabled = bool(career.get_value("settings", "haptics_enabled", true))
	hud_scale_step = clampi(int(career.get_value("settings", "hud_scale_step", 1)), 0, 2)
	operator_style = str(career.get_value("cosmetics", "operator_style", "cyan"))
	if operator_style not in ["cyan", "amber", "violet"]:
		operator_style = "cyan"
	owns_amber_style = bool(career.get_value("cosmetics", "owns_amber", false))
	owns_violet_style = bool(career.get_value("cosmetics", "owns_violet", false))
	daily_challenge_active = bool(career.get_value("daily", "active", false))
	daily_challenge_code = str(career.get_value("daily", "code", ""))
	daily_claimed_date = str(career.get_value("daily", "claimed_date", ""))
	daily_tactical_claimed_date = str(career.get_value("daily", "tactical_claimed_date", ""))
	daily_streak = maxi(0, int(career.get_value("daily", "streak", 0)))
	daily_longest_streak = maxi(daily_streak, int(career.get_value("daily", "longest_streak", 0)))
	daily_last_completed_date = str(career.get_value("daily", "last_completed_date", ""))
	last_daily_streak_bonus = maxi(0, int(career.get_value("daily", "last_streak_bonus", 0)))

func _save_career() -> void:
	career.set_value("career", "credits", career_credits)
	career.set_value("upgrades", "armor", armor_level)
	career.set_value("upgrades", "pulse", pulse_level)
	career.set_value("upgrades", "weapon", weapon_level)
	career.set_value("raid", "contract", current_contract)
	career.set_value("settings", "reduced_motion", reduced_motion)
	career.set_value("settings", "color_safe_mode", color_safe_mode)
	career.set_value("settings", "haptics_enabled", haptics_enabled)
	career.set_value("settings", "hud_scale_step", hud_scale_step)
	career.set_value("cosmetics", "operator_style", operator_style)
	career.set_value("cosmetics", "owns_amber", owns_amber_style)
	career.set_value("cosmetics", "owns_violet", owns_violet_style)
	career.set_value("daily", "active", daily_challenge_active)
	career.set_value("daily", "code", daily_challenge_code)
	career.set_value("daily", "claimed_date", daily_claimed_date)
	career.set_value("daily", "tactical_claimed_date", daily_tactical_claimed_date)
	career.set_value("daily", "streak", daily_streak)
	career.set_value("daily", "longest_streak", daily_longest_streak)
	career.set_value("daily", "last_completed_date", daily_last_completed_date)
	career.set_value("daily", "last_streak_bonus", last_daily_streak_bonus)
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
	phase_echo_status_label = _label(status_stack, "PHASE ECHO READY · T", 9, Color(0.38, 0.82, 1.0))
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
	status_shortcuts = _label(status_stack, "ПОМОЩЬ / H · FPS / F3 · ГРАФИКА / F2 · ДВИЖ. / F4 · ЦВЕТ / F5 · HUD / F6 · ВИБРО / F7", 8, Color(0.48, 0.6, 0.62))

	objective_panel = _make_panel(hud_root, Control.PRESET_TOP_RIGHT, Rect2(-334.0, 18.0, 316.0, 178.0))
	var objective_stack := _panel_stack(objective_panel)
	objective_title = _label(objective_stack, "MISSION CONTROL", 11, Color(1.0, 0.77, 0.39))
	objective_label = _label(objective_stack, objective_text, 12, Color(0.88, 0.96, 0.95))
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(285.0, 64.0)
	extraction_event_label = _label(objective_stack, "EXTRACTION WINDOW · 30.0 S", 9, Color(1.0, 0.72, 0.34))
	extraction_event_label.visible = false
	extraction_event_bar = ProgressBar.new()
	extraction_event_bar.name = "ExtractionPressure"
	extraction_event_bar.min_value = 0.0
	extraction_event_bar.max_value = EXTRACTION_WINDOW_SECONDS
	extraction_event_bar.value = EXTRACTION_WINDOW_SECONDS
	extraction_event_bar.show_percentage = false
	extraction_event_bar.custom_minimum_size = Vector2(278.0, 5.0)
	extraction_event_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	extraction_event_bar.visible = false
	var extraction_bar_background := StyleBoxFlat.new()
	extraction_bar_background.bg_color = Color(0.035, 0.078, 0.086, 0.98)
	extraction_bar_background.set_corner_radius_all(3)
	extraction_event_bar.add_theme_stylebox_override("background", extraction_bar_background)
	extraction_event_fill = StyleBoxFlat.new()
	extraction_event_fill.bg_color = Color(1.0, 0.62, 0.25)
	extraction_event_fill.set_corner_radius_all(3)
	extraction_event_bar.add_theme_stylebox_override("fill", extraction_event_fill)
	objective_stack.add_child(extraction_event_bar)
	telemetry_label = _label(objective_stack, "HOSTILES 03  ·  DEVICES 03  ·  CONTRACT 01", 10, Color(0.48, 0.72, 0.72))
	combat_status_label = _label(objective_stack, "COMBO 00 · MULT ×1.00 · ACC 100%", 9, Color(0.38, 1.0, 0.86))
	overdrive_bar = ProgressBar.new()
	overdrive_bar.name = "OverdriveCharge"
	overdrive_bar.min_value = 0.0
	overdrive_bar.max_value = OVERDRIVE_MAX_CHARGE
	overdrive_bar.value = 0.0
	overdrive_bar.show_percentage = false
	overdrive_bar.custom_minimum_size = Vector2(278.0, 5.0)
	overdrive_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var overdrive_bar_background := StyleBoxFlat.new()
	overdrive_bar_background.bg_color = Color(0.035, 0.078, 0.086, 0.98)
	overdrive_bar_background.set_corner_radius_all(3)
	overdrive_bar.add_theme_stylebox_override("background", overdrive_bar_background)
	var overdrive_bar_fill := StyleBoxFlat.new()
	overdrive_bar_fill.bg_color = Color(0.65, 0.38, 1.0)
	overdrive_bar_fill.set_corner_radius_all(3)
	overdrive_bar.add_theme_stylebox_override("fill", overdrive_bar_fill)
	objective_stack.add_child(overdrive_bar)
	thermal_status_label = _label(objective_stack, "WEAPON THERMAL · 00% · V VENT / Z SCAN", 8, Color(0.38, 1.0, 0.86))
	thermal_bar = ProgressBar.new()
	thermal_bar.name = "WeaponThermal"
	thermal_bar.min_value = 0.0
	thermal_bar.max_value = WEAPON_HEAT_LIMIT
	thermal_bar.value = 0.0
	thermal_bar.show_percentage = false
	thermal_bar.custom_minimum_size = Vector2(278.0, 5.0)
	thermal_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	thermal_bar.tooltip_text = "ARC-9 thermal load. Release fire to cool; press V / D-pad down to vent."
	var thermal_bar_background := StyleBoxFlat.new()
	thermal_bar_background.bg_color = Color(0.035, 0.078, 0.086, 0.98)
	thermal_bar_background.set_corner_radius_all(3)
	thermal_bar.add_theme_stylebox_override("background", thermal_bar_background)
	thermal_bar_fill = StyleBoxFlat.new()
	thermal_bar_fill.bg_color = Color(0.38, 0.96, 0.76)
	thermal_bar_fill.set_corner_radius_all(3)
	thermal_bar.add_theme_stylebox_override("fill", thermal_bar_fill)
	objective_stack.add_child(thermal_bar)
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
	diagnostics_label.offset_bottom = 510.0
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

	var loadout_viewport := get_viewport().get_visible_rect().size
	var loadout_width: float = minf(512.0, maxf(288.0, loadout_viewport.x - 24.0))
	var loadout_height: float = minf(490.0, maxf(420.0, loadout_viewport.y - 24.0))
	var loadout_button_width: float = minf(300.0, loadout_width - 48.0)
	loadout_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-loadout_width * 0.5, -loadout_height * 0.5, loadout_width, loadout_height))
	loadout_panel.visible = false
	var loadout_stack := _panel_stack(loadout_panel)
	_label(loadout_stack, "LOADOUT / STYLE VAULT", 20, Color(0.4, 1.0, 0.85))
	_label(loadout_stack, "МОДУЛИ И КОСМЕТИКА · ЛОКАЛЬНОЕ СОХРАНЕНИЕ", 10, Color(0.55, 0.72, 0.72))
	_add_button(loadout_stack, "[1] БРОНЯ · +20 HP", _buy_upgrade.bind("armor"), Vector2(loadout_button_width, 38.0))
	_add_button(loadout_stack, "[2] PULSE · БЫСТРЕЕ ПЕРЕЗАРЯДКА", _buy_upgrade.bind("pulse"), Vector2(loadout_button_width, 38.0))
	_add_button(loadout_stack, "[3] ARC-9 · СКОРОСТРЕЛЬНОСТЬ", _buy_upgrade.bind("weapon"), Vector2(loadout_button_width, 38.0))
	_label(loadout_stack, "STYLE VAULT · ТОЛЬКО ВНЕШНИЙ ВИД", 10, Color(1.0, 0.77, 0.39))
	var style_row := HBoxContainer.new()
	style_row.add_theme_constant_override("separation", 6)
	loadout_stack.add_child(style_row)
	var style_button_width: float = maxf(108.0, (loadout_button_width - 6.0) * 0.5)
	amber_style_button = _add_button(style_row, "AMBER · 450 CR", _buy_cosmetic.bind("amber"), Vector2(style_button_width, 36.0))
	violet_style_button = _add_button(style_row, "VIOLET · 750 CR", _buy_cosmetic.bind("violet"), Vector2(style_button_width, 36.0))
	daily_streak_label = _label(loadout_stack, "СЕРИЯ 0 ДНЕЙ · БОНУСЫ ЗА 3 И 7 ДНЕЙ", 9, Color(0.38, 1.0, 0.86))
	daily_streak_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	daily_challenge_button = _add_button(loadout_stack, "DAILY OP / СЕГОДНЯ · +400 CR", _start_daily_challenge, Vector2(loadout_button_width, 38.0))
	_add_button(loadout_stack, "CAREER CHRONICLE / J", _show_operator_chronicle, Vector2(loadout_button_width, 34.0))
	_add_button(loadout_stack, "КОНТРАКТ / C", _cycle_contract, Vector2(loadout_button_width, 34.0))
	_add_button(loadout_stack, "ЗАКРЫТЬ / U", _close_loadout, Vector2(loadout_button_width, 34.0))

	pause_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-220.0, -138.0, 440.0, 276.0))
	pause_panel.visible = false
	var pause_stack := _panel_stack(pause_panel)
	_label(pause_stack, "RAID SUSPENDED", 22, Color(0.4, 1.0, 0.85))
	_label(pause_stack, "СИГНАЛ ОПЕРАТОРА СОХРАНЁН", 11, Color(0.62, 0.78, 0.76))
	_add_button(pause_stack, "ПРОДОЛЖИТЬ", _resume_game, Vector2(210.0, 44.0))
	_add_button(pause_stack, "ПЕРЕЗАПУСТИТЬ РЕЙД", _restart_game, Vector2(210.0, 44.0))
	_add_button(pause_stack, "ЗАКРЫТЬ МОДУЛИ", _close_loadout, Vector2(210.0, 36.0))

	var result_viewport := get_viewport().get_visible_rect().size
	var result_width: float = minf(600.0, maxf(288.0, result_viewport.x - 24.0))
	var result_height: float = minf(470.0, maxf(390.0, result_viewport.y - 24.0))
	var result_button_width: float = minf(300.0, result_width - 48.0)
	result_panel = _make_panel(hud_root, Control.PRESET_CENTER, Rect2(-result_width * 0.5, -result_height * 0.5, result_width, result_height))
	result_panel.visible = false
	var result_stack := _panel_stack(result_panel)
	_label(result_stack, "ЭВАКУАЦИЯ УСПЕШНА", 25, Color(0.4, 1.0, 0.85))
	_label(result_stack, "РЕЙД ЗАВЕРШЁН · КАРЬЕРА ОБНОВЛЕНА", 12, Color(0.82, 0.92, 0.9))
	result_reward_label = _label(result_stack, "УСТРАНЕНИЙ 0 · DAILY OPS · КАРЬЕРА", 10, Color(1.0, 0.77, 0.39))
	result_reward_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	result_intel_label = _label(result_stack, "MISSION INTEL · ЛОКАЛЬНЫЙ АНАЛИЗ РЕЙДА", 9, Color(0.61, 0.86, 0.82))
	result_intel_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	result_share_label = _label(result_stack, "ЕЖЕДНЕВНЫЙ КОД ВЫЗОВА ГОТОВ", 10, Color(0.38, 1.0, 0.86))
	result_share_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_add_button(result_stack, "ЭКСПОРТ AFTER-ACTION JSON", _export_after_action_report, Vector2(result_button_width, 34.0))
	_add_button(result_stack, "ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ / ВЫЗВАТЬ ДРУГА", _share_run, Vector2(result_button_width, 38.0))
	_add_button(result_stack, "НОВЫЙ РЕЙД", _restart_game, Vector2(result_button_width, 42.0))
	_add_button(result_stack, "МОДУЛИ И КОСМЕТИКА", _show_loadout_from_result, Vector2(result_button_width, 38.0))
	_add_button(result_stack, "OPERATOR CHRONICLE / J", _show_operator_chronicle, Vector2(result_button_width, 34.0))
	_create_operator_chronicle_panel()

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
uniform float motion_reduction : hint_range(0.0, 1.0) = 0.0;
uniform float impact_wave_progress : hint_range(0.0, 1.0) = 0.0;
uniform float impact_wave_strength : hint_range(0.0, 1.0) = 0.0;
void fragment() {
	vec2 centered = (UV - vec2(0.5)) * vec2(1.0, 0.86);
	float distance_from_center = length(centered);
	float edge = smoothstep(0.24, 0.72, distance_from_center);
	float pulse_wave = 0.72 + 0.28 * sin(TIME * 2.4);
	float pulse = mix(pulse_wave, 1.0, motion_reduction);
	float danger_edge = danger * 0.14 * pulse;
	float alpha = edge * (vignette_strength + danger_edge + phase_shift * 0.055);
	float wave_radius = impact_wave_progress * 0.76;
	float wave_width = 0.009 + impact_wave_progress * 0.012;
	float wave_ring = (1.0 - smoothstep(0.0, wave_width, abs(distance_from_center - wave_radius))) * impact_wave_strength;
	vec3 base = vec3(0.003, 0.009, 0.012);
	vec3 phase_tint = vec3(0.025, 0.004, 0.05);
	vec3 low_health_tint = vec3(0.035, 0.004, 0.009);
	vec3 wave_tint = vec3(0.24, 0.98, 0.82);
	base = mix(base, phase_tint, phase_shift * 0.42);
	base = mix(base, low_health_tint, danger * 0.34);
	wave_tint = mix(wave_tint, vec3(0.46, 0.12, 0.92), phase_shift * 0.76);
	wave_tint = mix(wave_tint, vec3(1.0, 0.12, 0.20), danger * 0.78);
	base = mix(base, wave_tint, wave_ring * 0.92);
	COLOR = vec4(base, clamp(alpha + wave_ring * 0.24, 0.0, 0.58));
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
	cinematic_vignette_material.set_shader_parameter("motion_reduction", 1.0 if reduced_motion else 0.0)
	var wave_progress: float = 0.0
	var wave_envelope: float = 0.0
	if impact_wave_timer > 0.0 and impact_wave_duration > 0.0:
		var wave_life: float = clampf(impact_wave_timer / impact_wave_duration, 0.0, 1.0)
		wave_progress = 1.0 - wave_life
		wave_envelope = impact_wave_strength * wave_life * (0.1 if reduced_motion else 1.0)
	cinematic_vignette_material.set_shader_parameter("impact_wave_progress", wave_progress)
	cinematic_vignette_material.set_shader_parameter("impact_wave_strength", wave_envelope)
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
	var motion_scale: float = 0.12 if reduced_motion else 1.0
	var duration_scale: float = 0.7 if reduced_motion else 1.0
	camera_shake_strength = maxf(camera_shake_strength, strength * motion_scale)
	camera_shake_timer = maxf(camera_shake_timer, duration * duration_scale)
	camera_shake_duration = maxf(camera_shake_duration, duration * duration_scale)
	# A shader-driven energy ring adds an impact cue without changing combat timing.
	# The visual is attenuated by Reduced Motion and reuses the existing HUD layer.
	impact_wave_duration = clampf(duration * (0.62 if reduced_motion else 1.0), 0.12, 0.48)
	impact_wave_timer = impact_wave_duration
	impact_wave_strength = clampf(strength * 2.4, 0.0, 0.92) * motion_scale

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
	mobile_action_panel = _make_panel(parent, Control.PRESET_BOTTOM_RIGHT, Rect2(-222.0, -366.0, 206.0, 350.0))
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
		{"key": "dash", "label": "РЫВОК"},
		{"key": "overdrive", "label": "OVERDRIVE"},
		{"key": "scan", "label": "СКАН"},
		{"key": "vent", "label": "VENT"},
		{"key": "echo", "label": "ЭХО"},
		{"key": "stealth", "label": "GHOST"}
	]
	for item in combat_actions:
		var action_button := _add_button(action_grid, item["label"], func(): pass, Vector2(84.0, 38.0))
		if str(item["key"]) == "stealth":
			mobile_stealth_button = action_button
			action_button.pressed.connect(_toggle_stealth_mode)
		else:
			action_button.button_down.connect(_set_mobile_action.bind(item["key"], true))
			action_button.button_up.connect(_set_mobile_action.bind(item["key"], false))
		if str(item["key"]) != "scan" and str(item["key"]) != "vent" and str(item["key"]) != "echo":
			mobile_action_buttons.append(action_button)
		if str(item["key"]) == "dash":
			mobile_dash_button = action_button
			mobile_dash_button.add_theme_font_size_override("font_size", 8)
		if str(item["key"]) == "overdrive":
			mobile_overdrive_button = action_button
			mobile_overdrive_button.add_theme_font_size_override("font_size", 7)
		if str(item["key"]) == "scan":
			mobile_scan_button = action_button
			mobile_scan_button.add_theme_font_size_override("font_size", 8)
		if str(item["key"]) == "vent":
			mobile_vent_button = action_button
			mobile_vent_button.add_theme_font_size_override("font_size", 8)
		if str(item["key"]) == "echo":
			mobile_echo_button = action_button
			mobile_echo_button.add_theme_font_size_override("font_size", 8)
		if str(item["key"]) == "stealth":
			mobile_stealth_button = action_button
			mobile_stealth_button.add_theme_font_size_override("font_size", 8)
	var utility_row := HBoxContainer.new()
	utility_row.add_theme_constant_override("separation", 4)
	action_stack.add_child(utility_row)
	mobile_quality_button = _add_button(utility_row, "GFX", _toggle_quality, Vector2(54.0, 27.0))
	mobile_quality_button.add_theme_font_size_override("font_size", 7)
	mobile_diagnostics_button = _add_button(utility_row, "FPS", _toggle_diagnostics, Vector2(54.0, 27.0))
	mobile_diagnostics_button.add_theme_font_size_override("font_size", 7)
	mobile_motion_button = _add_button(utility_row, "MOT LOW" if reduced_motion else "MOT ON", _toggle_reduced_motion, Vector2(54.0, 27.0))
	mobile_motion_button.add_theme_font_size_override("font_size", 7)
	mobile_motion_button.tooltip_text = "Сниженное движение уменьшает тряску камеры, изменение поля зрения и пульсацию эффектов."
	_update_reduced_motion_ui()
	var accessibility_row := HBoxContainer.new()
	accessibility_row.add_theme_constant_override("separation", 4)
	action_stack.add_child(accessibility_row)
	mobile_palette_button = _add_button(accessibility_row, "CLR STD", _toggle_color_safe_mode, Vector2(54.0, 27.0))
	mobile_palette_button.add_theme_font_size_override("font_size", 7)
	mobile_hud_scale_button = _add_button(accessibility_row, "HUD 100%", _cycle_hud_scale, Vector2(54.0, 27.0))
	mobile_hud_scale_button.add_theme_font_size_override("font_size", 7)
	mobile_haptics_button = _add_button(accessibility_row, "RUM ON", _toggle_haptics, Vector2(54.0, 27.0))
	mobile_haptics_button.add_theme_font_size_override("font_size", 7)
	_update_accessibility_buttons()
	mobile_modules_button = _add_button(action_stack, "МОДУЛИ", _toggle_loadout, Vector2(176.0, 28.0))
	sound_button = _add_button(action_stack, "ЗВУК / ВКЛ" if sound_enabled else "ЗВУК / ВЫКЛ", _toggle_sound, Vector2(176.0, 27.0))

func _set_mobile_action(action: String, pressed: bool) -> void:
	if pressed:
		_set_gamepad_mode(false)
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
				"overdrive":
					_activate_overdrive()
				"scan":
					_activate_tactical_scan()
				"vent":
					_activate_weapon_vent()
				"echo":
					_deploy_phase_echo()

func _refresh_extraction_event_layout() -> void:
	if not is_instance_valid(objective_panel):
		return
	var event_extra: float = 26.0 if extraction_pressure_active or extraction_overload_triggered else 0.0
	var daily_extra: float = 26.0 if daily_challenge_active and not daily_mutators.is_empty() else 0.0
	if mobile_controls_visible:
		objective_panel.offset_bottom = 266.0 + daily_extra + event_extra
	else:
		objective_panel.offset_bottom = 274.0 + daily_extra + event_extra
		if is_instance_valid(tactical_radar_panel):
			tactical_radar_panel.offset_top = 288.0 + daily_extra + event_extra
			tactical_radar_panel.offset_bottom = 482.0 + daily_extra + event_extra

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
	_apply_hud_scale()
	var width: float = viewport_size.x
	_refresh_operator_chronicle_layout(viewport_size)
	var compact: bool = width < 880.0 or touch_device
	mobile_controls_visible = compact
	if is_instance_valid(tactical_radar_panel):
		tactical_radar_panel.visible = not compact and not daily_radar_jammed
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
		phase_echo_status_label.visible = false
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
		objective_panel.offset_bottom = 266.0 + (26.0 if daily_challenge_active and not daily_mutators.is_empty() else 0.0) + (22.0 if daily_challenge_active else 0.0) + (26.0 if extraction_pressure_active or extraction_overload_triggered else 0.0)
		objective_title.visible = false
		telemetry_label.visible = false
		objective_actions.visible = false
		if is_instance_valid(thermal_status_label):
			thermal_status_label.visible = false
		if is_instance_valid(thermal_bar):
			thermal_bar.visible = false
		objective_label.add_theme_font_size_override("font_size", 11)
		objective_label.custom_minimum_size = Vector2(maxf(240.0, width - 52.0), 70.0 if daily_challenge_active else (50.0 if daily_challenge_active and not daily_mutators.is_empty() else 34.0))
		mid_panel.visible = false
		bottom_hint.visible = false
		_layout_compact_controls(viewport_size)
	else:
		status_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		status_panel.offset_left = 18.0
		status_panel.offset_top = 18.0
		status_panel.offset_right = 334.0
		status_panel.offset_bottom = 242.0
		status_title.add_theme_font_size_override("font_size", 22)
		phase_echo_status_label.visible = true
		status_subtitle.visible = true
		status_shortcuts.visible = true
		health_label.add_theme_font_size_override("font_size", 13)
		credits_label.add_theme_font_size_override("font_size", 12)
		threat_label.add_theme_font_size_override("font_size", 11)
		objective_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
		objective_panel.offset_left = -334.0
		objective_panel.offset_top = 18.0
		objective_panel.offset_right = -18.0
		objective_panel.offset_bottom = 274.0 + (26.0 if daily_challenge_active and not daily_mutators.is_empty() else 0.0) + (22.0 if daily_challenge_active else 0.0) + (26.0 if extraction_pressure_active or extraction_overload_triggered else 0.0)
		if is_instance_valid(tactical_radar_panel):
			var panel_extra: float = (26.0 if daily_challenge_active and not daily_mutators.is_empty() else 0.0) + (22.0 if daily_challenge_active else 0.0) + (26.0 if extraction_pressure_active or extraction_overload_triggered else 0.0)
			tactical_radar_panel.offset_top = 288.0 + panel_extra
			tactical_radar_panel.offset_bottom = 482.0 + panel_extra
		if is_instance_valid(thermal_status_label):
			thermal_status_label.visible = true
		if is_instance_valid(thermal_bar):
			thermal_bar.visible = true
		objective_title.visible = true
		telemetry_label.visible = true
		objective_actions.visible = true
		objective_label.add_theme_font_size_override("font_size", 12)
		objective_label.custom_minimum_size = Vector2(285.0, 110.0 if daily_challenge_active else (88.0 if daily_challenge_active and not daily_mutators.is_empty() else 64.0))
		mid_panel.visible = true
		bottom_hint.visible = true
		mobile_move_panel.offset_left = 16.0
		mobile_move_panel.offset_right = 234.0
		mobile_move_panel.offset_top = -218.0
		mobile_move_panel.offset_bottom = -16.0
		mobile_action_panel.offset_left = -222.0
		mobile_action_panel.offset_right = -16.0
		mobile_action_panel.offset_top = -366.0
		mobile_action_panel.offset_bottom = -16.0
		for button in mobile_move_buttons:
			button.custom_minimum_size = Vector2(52.0, 38.0)
		for spacer in mobile_move_spacers:
			spacer.custom_minimum_size = Vector2(52.0, 38.0)
		for button in mobile_action_buttons:
			button.custom_minimum_size = Vector2(84.0, 38.0)
		if is_instance_valid(mobile_scan_button):
			mobile_scan_button.custom_minimum_size = Vector2(84.0, 38.0)
		if is_instance_valid(mobile_vent_button):
			mobile_vent_button.custom_minimum_size = Vector2(84.0, 38.0)
		if is_instance_valid(mobile_echo_button):
			mobile_echo_button.custom_minimum_size = Vector2(84.0, 38.0)
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
	mobile_action_panel.offset_top = -324.0
	mobile_action_panel.offset_bottom = -8.0
	var move_size: float = 36.0 if width < 400.0 else (44.0 if width < 520.0 else 52.0)
	var move_button_height: float = 32.0 if width < 400.0 else 36.0
	for button in mobile_move_buttons:
		button.custom_minimum_size = Vector2(move_size, move_button_height)
	for spacer in mobile_move_spacers:
		spacer.custom_minimum_size = Vector2(move_size, move_button_height)
	var action_button_width: float = floor((action_width - 32.0) * 0.5)
	var action_button_height: float = 29.0 if width < 400.0 else 31.0
	var utility_button_width: float = floor((action_width - 32.0) / 3.0)
	for button in mobile_action_buttons:
		button.custom_minimum_size = Vector2(action_button_width, action_button_height)
	for button in [mobile_palette_button, mobile_hud_scale_button, mobile_haptics_button]:
		if is_instance_valid(button):
			button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	if is_instance_valid(mobile_scan_button):
		mobile_scan_button.custom_minimum_size = Vector2(action_button_width, action_button_height)
	if is_instance_valid(mobile_vent_button):
		mobile_vent_button.custom_minimum_size = Vector2(action_button_width, action_button_height)
	if is_instance_valid(mobile_echo_button):
		mobile_echo_button.custom_minimum_size = Vector2(action_button_width, action_button_height)
	if is_instance_valid(mobile_stealth_button):
		mobile_stealth_button.custom_minimum_size = Vector2(action_button_width, action_button_height)
	mobile_quality_button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	mobile_diagnostics_button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	mobile_motion_button.custom_minimum_size = Vector2(utility_button_width, 27.0)
	mobile_modules_button.custom_minimum_size = Vector2(action_width - 24.0, 28.0)
	sound_button.custom_minimum_size = Vector2(action_width - 24.0, 27.0)

func _refresh_loadout() -> void:
	if not is_instance_valid(loadout_panel):
		return
	if is_instance_valid(amber_style_button):
		if operator_style == "amber":
			amber_style_button.text = "AMBER · НАДЕТО"
		elif owns_amber_style:
			amber_style_button.text = "ЭКИПИРОВАТЬ AMBER"
		else:
			amber_style_button.text = "AMBER · 450 CR"
	if is_instance_valid(violet_style_button):
		if operator_style == "violet":
			violet_style_button.text = "VIOLET · НАДЕТО"
		elif owns_violet_style:
			violet_style_button.text = "ЭКИПИРОВАТЬ VIOLET"
		else:
			violet_style_button.text = "VIOLET · 750 CR"
	if is_instance_valid(daily_challenge_button):
		var next_day := (daily_streak % 7) + 1
		daily_challenge_button.text = "DAILY OP · ДЕНЬ %d/7 · +400 CR" % next_day
	if is_instance_valid(daily_streak_label):
		var next_bonus := ""
		if daily_streak < 2:
			next_bonus = "ЕЩЁ %d DAILY OPS ДО +100 CR" % (3 - daily_streak)
		elif daily_streak == 2:
			next_bonus = "СЛЕДУЮЩИЙ РЕЙД: +100 CR"
		else:
			var until_weekly := 7 - (daily_streak % 7)
			next_bonus = "БОНУС 7 ДНЕЙ +300 CR ЧЕРЕЗ %d" % until_weekly
		daily_streak_label.text = "СЕРИЯ %d · РЕКОРД %d · %s" % [daily_streak, daily_longest_streak, next_bonus]
		if daily_challenge_active and not daily_mutators.is_empty():
			daily_streak_label.text += "\nTODAY'S ANOMALIES · " + _daily_mutators_detail_text()
	for child in loadout_panel.get_children():
		if child is MarginContainer:
			for inner in child.get_children():
				if inner is VBoxContainer and inner.get_child_count() >= 2:
					var stack := inner as VBoxContainer
					(stack.get_child(1) as Label).text = "КРЕДИТЫ %d · БРОНЯ %d/3 · PULSE %d/3 · ARC-9 %d/3 · STYLE %s" % [career_credits, armor_level, pulse_level, weapon_level, operator_style.to_upper()]
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

func _update_live_diagnostics() -> void:
	if not diagnostics_enabled or not is_instance_valid(diagnostics_label):
		return
	var samples := frame_samples.duplicate()
	samples.sort()
	var p95 := 0.0
	if not samples.is_empty():
		p95 = samples[clampi(int(ceil(float(samples.size() - 1) * 0.95)), 0, samples.size() - 1)]
	fps_p95_ms = p95
	var draw_calls := int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
	var primitives := int(Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME))
	var scene_nodes := int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT))
	var process_cpu_ms: float = float(Performance.get_monitor(Performance.TIME_PROCESS)) * 1000.0
	var physics_cpu_ms: float = float(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS)) * 1000.0
	var budget_misses := 0.0
	for miss in frame_budget_misses:
		budget_misses += miss
	var budget_miss_percent: float = budget_misses / maxf(1.0, float(frame_budget_misses.size())) * 100.0
	var active_impact_lights: int = _active_impact_light_count()
	var operator_rim_active: int = int(is_instance_valid(operator_rim_light) and operator_rim_light.visible)
	var profile: String = "PERFORMANCE" if performance_quality else ("BALANCED" if not cinematic_quality else ("AUTO-OPTIMIZED II" if adaptive_quality_level >= 2 else ("AUTO-OPTIMIZED I" if adaptive_quality_level == 1 else "CINEMATIC")))
	var msaa_label: String = "4X" if get_viewport().msaa_3d == Viewport.MSAA_4X else ("2X" if get_viewport().msaa_3d == Viewport.MSAA_2X else "OFF")
	diagnostics_label.text = "LIVE DIAGNOSTICS\nFPS        %02d\nFRAME P95  %.1f ms\nFRAME NOW  %.1f ms\n60 FPS MISSES %.0f%%\nPROCESS CPU %.2f ms\nPHYSICS CPU %.2f ms\nDRAW / TRI / NODES %d / %d / %d\nFX ACTIVE  %02d\nFX POOLS   %02d BEAM / %02d RING / %02d SPARK\nFX DROPPED %d\nDASH TRAILS %04d\nGUARDS     %d\nDEVICES    %d\nLANE SUPPRESS %03d\nDASH EVADES %d\nDASH CD    %.1f s\nHIT LIGHTS %d / %d POOL\nOPERATOR RIM %d / 1\nOVERDRIVE ARCS %d\nDEVICE FX  EMP %02d / NOVA %02d / LANE %02d\nEXFIL REINF %02d / BREACH %02d\nCOUNTERPLAY %s / SWITCHES %02d\nMSAA %s · HUD %.0f%% · PALETTE %s · RUMBLE %s\nPROFILE    %s" % [
		Engine.get_frames_per_second(), fps_p95_ms, current_frame_ms, budget_miss_percent, process_cpu_ms, physics_cpu_ms, draw_calls, primitives, scene_nodes,
		effects.size(), beam_pool.size(), ring_pool.size(), spark_pool.size(), effect_pool_exhaustions,
		dash_trails_emitted, guards.size(), _living_device_count(), phase_lane_disruptions, dash_evasions, dash_cooldown, active_impact_lights, impact_light_pool.size(), operator_rim_active, overdrive_arc_chains, device_emp_overloads, device_cell_novas, device_lane_collapses, extraction_reinforcements_spawned, extraction_overload_count, adaptive_doctrine, tactical_doctrine_changes, msaa_label, _hud_scale_value() * 100.0, "COLOR SAFE" if color_safe_mode else "STANDARD", "ON" if haptics_enabled else "OFF", profile
	]


func _update_hud() -> void:
	if diagnostics_enabled:
		_update_live_diagnostics()
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
	if daily_challenge_active and not daily_mutators.is_empty():
		objective_label.text += "\nDAILY ANOMALIES · " + _daily_mutators_hud_text()
	if daily_challenge_active:
		var side_objective := _daily_side_objective_state()
		if not side_objective.is_empty():
			objective_label.text += "\nBONUS OP · %s · %d/%d" % [str(side_objective["instruction"]), int(side_objective["progress"]), int(side_objective["goal"])]
	var extraction_event_visible: bool = not mission_finished and (extraction_pressure_active or extraction_overload_triggered)
	if is_instance_valid(extraction_event_label):
		extraction_event_label.visible = extraction_event_visible
		if extraction_pressure_active:
			extraction_event_label.text = "EXTRACTION WINDOW · %.1f S" % extraction_window_remaining
			extraction_event_label.add_theme_color_override("font_color", Color(0.38, 1.0, 0.86) if extraction_window_remaining > 12.0 else (Color(1.0, 0.72, 0.34) if extraction_window_remaining > 6.0 else Color(1.0, 0.25, 0.34)))
		elif extraction_overload_triggered:
			extraction_event_label.text = "LOCKDOWN BREACH · WARDEN TRACKING"
			extraction_event_label.add_theme_color_override("font_color", Color(1.0, 0.25, 0.34))
	if is_instance_valid(extraction_event_bar):
		extraction_event_bar.visible = extraction_event_visible
		extraction_event_bar.value = clampf(extraction_window_remaining, 0.0, EXTRACTION_WINDOW_SECONDS)
		if is_instance_valid(extraction_event_fill):
			extraction_event_fill.bg_color = Color(0.38, 0.96, 0.76) if extraction_window_remaining > 12.0 else (Color(1.0, 0.62, 0.25) if extraction_window_remaining > 6.0 else Color(1.0, 0.22, 0.31))
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
	if is_instance_valid(phase_echo_status_label):
		if is_instance_valid(phase_echo_node):
			phase_echo_status_label.text = "ECHO SIGNAL · %.1f S" % phase_echo_remaining
			phase_echo_status_label.add_theme_color_override("font_color", Color(0.42, 0.82, 1.0))
		elif phase_echo_cooldown > 0.02:
			phase_echo_status_label.text = "ECHO RECOVERY · %.1f S" % phase_echo_cooldown
			phase_echo_status_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.34))
		else:
			phase_echo_status_label.text = "PHASE ECHO READY · T"
			phase_echo_status_label.add_theme_color_override("font_color", Color(0.38, 0.82, 1.0))
	if is_instance_valid(mobile_echo_button):
		mobile_echo_button.text = "ЭХО %.1f" % phase_echo_cooldown if phase_echo_cooldown > 0.02 else "ЭХО"
		mobile_echo_button.disabled = phase_echo_cooldown > 0.02 or is_instance_valid(phase_echo_node) or paused_game or mission_finished or terminal_active or briefing_visible
	if is_instance_valid(mobile_stealth_button):
		mobile_stealth_button.text = "GHOST ON" if stealth_mode_active else "GHOST"
		mobile_stealth_button.disabled = paused_game or mission_finished or terminal_active or briefing_visible
		mobile_stealth_button.add_theme_color_override("font_color", Color(0.36, 0.95, 1.0) if stealth_mode_active else Color(0.84, 0.9, 0.9))
	var engaged_guards := 0
	var investigating_guards := 0
	for guard in guards:
		match str(guard.get("ai_state", "PATROL")):
			"ENGAGED":
				engaged_guards += 1
			"INVESTIGATE", "SEARCHING":
				investigating_guards += 1
	telemetry_label.text = "HOSTILES %02d  ·  DEVICES %02d  ·  CONTRACT %02d · AI C%02d I%02d" % [guards.size(), _living_device_count(), current_contract + 1, engaged_guards, investigating_guards]
	if suppression_breaks > 0:
		telemetry_label.text += "  ·  PRESSURE CUTS %02d" % suppression_breaks
	if warden_phase_transitions > 0 or warden_staggers > 0:
		telemetry_label.text += "  ·  WARDEN PII %02d / STAGGER %02d" % [warden_phase_transitions, warden_staggers]
	if daily_challenge_active and not daily_mutators.is_empty():
		telemetry_label.text += "  ·  DAILY / 2 MODS"
	if extraction_reinforcements_spawned > 0:
		telemetry_label.text += "  ·  EXFIL +%02d / BREACH %02d" % [extraction_reinforcements_spawned, extraction_overload_count]
	if device_emp_overloads > 0 or device_cell_novas > 0 or device_lane_collapses > 0:
		telemetry_label.text += "  ·  REACT EMP %02d / NOVA %02d / LANE %02d" % [device_emp_overloads, device_cell_novas, device_lane_collapses]
	if is_instance_valid(combat_status_label):
		var overdrive_readout := "LIVE %.1f S" % overdrive_timer if overdrive_timer > 0.0 else "CHARGE %03d%%" % int(roundf(overdrive_charge))
		combat_status_label.text = "COMBO %02d · %s · ×%.2f · ACC %.0f%% · %s · %s" % [combat_combo, _combo_mastery_label(_combo_mastery_tier(combat_combo)), _combat_combo_multiplier(combat_combo), _combat_accuracy_percentage(), overdrive_readout, _threat_forecast_text()]
		if stealth_mode_active:
			combat_status_label.text += " · PHANTOM / CHAIN %d" % stealth_chain
		elif stealth_takedowns > 0:
			combat_status_label.text += " · SILENT %d" % stealth_takedowns
		var combat_status_color := Color(0.38, 1.0, 0.86)
		if combat_combo >= 4:
			combat_status_color = Color(1.0, 0.77, 0.39)
		if overdrive_timer > 0.0:
			combat_status_color = Color(0.92, 0.72, 1.0)
		if stealth_mode_active:
			combat_status_color = Color(0.36, 0.95, 1.0)
		combat_status_label.add_theme_color_override("font_color", combat_status_color)
	if is_instance_valid(thermal_status_label):
		if weapon_overheated:
			thermal_status_label.text = "THERMAL LOCKOUT · %.0f%% · V VENT · ARC MK-%d" % [weapon_heat, _weapon_mastery_rank()]
			thermal_status_label.add_theme_color_override("font_color", Color(1.0, 0.28, 0.3))
		elif weapon_heat >= 75.0:
			thermal_status_label.text = "THERMAL HIGH · %.0f%% · V VENT · ARC MK-%d" % [weapon_heat, _weapon_mastery_rank()]
			thermal_status_label.add_theme_color_override("font_color", Color(1.0, 0.62, 0.26))
		else:
			thermal_status_label.text = "WEAPON THERMAL · %.0f%% · SCAN %s · ARC MK-%d" % [weapon_heat, "READY" if scan_cooldown <= 0.0 else "%.1fS" % scan_cooldown, _weapon_mastery_rank()]
			thermal_status_label.add_theme_color_override("font_color", Color(0.38, 1.0, 0.86))
	if is_instance_valid(thermal_bar):
		thermal_bar.value = clampf(weapon_heat, 0.0, WEAPON_HEAT_LIMIT)
		thermal_bar.visible = not mobile_controls_visible
		thermal_bar.tooltip_text = "THERMAL %.0f%% · cooling %.0f/s · VENT cooldown %.1fs" % [weapon_heat, WEAPON_OVERHEAT_COOLING_RATE if weapon_overheated else WEAPON_HEAT_COOLING_RATE, weapon_vent_cooldown]
		if is_instance_valid(thermal_bar_fill):
			thermal_bar_fill.bg_color = Color(1.0, 0.22, 0.3) if weapon_overheated or weapon_heat >= 90.0 else (Color(1.0, 0.62, 0.26) if weapon_heat >= 65.0 else Color(0.38, 0.96, 0.76))
	if is_instance_valid(thermal_status_label):
		thermal_status_label.visible = not mobile_controls_visible
	if is_instance_valid(mobile_scan_button):
		mobile_scan_button.text = "СКАН" if scan_cooldown <= 0.0 else "СКАН %.0f" % scan_cooldown
		mobile_scan_button.disabled = scan_cooldown > 0.0 or paused_game or mission_finished or terminal_active or briefing_visible
	if is_instance_valid(mobile_vent_button):
		if weapon_vent_cooldown > 0.0:
			mobile_vent_button.text = "VENT %.0f" % weapon_vent_cooldown
		elif weapon_overheated:
			mobile_vent_button.text = "VENT / HOT"
		else:
			mobile_vent_button.text = "VENT %02.0f%%" % weapon_heat
		mobile_vent_button.disabled = weapon_vent_cooldown > 0.0 or (weapon_heat < WEAPON_VENT_MIN_HEAT and not weapon_overheated) or paused_game or mission_finished or terminal_active or briefing_visible
	if is_instance_valid(overdrive_bar):
		overdrive_bar.value = clampf(overdrive_charge, 0.0, OVERDRIVE_MAX_CHARGE)
		overdrive_bar.tooltip_text = "OVERDRIVE · R / CLICK RIGHT STICK / TOUCH · 5 СЕКУНД"
	if is_instance_valid(mobile_overdrive_button):
		mobile_overdrive_button.text = "OVR LIVE" if overdrive_timer > 0.0 else ("OVR %d%%" % int(roundf(overdrive_charge)))
		mobile_overdrive_button.disabled = overdrive_charge < OVERDRIVE_MAX_CHARGE or overdrive_timer > 0.0 or paused_game or mission_finished or briefing_visible
	_update_input_hint()

func _update_input_hint() -> void:
	if not is_instance_valid(bottom_hint):
		return
	var hint: String
	if mobile_controls_visible:
		hint = "TOUCH · GHOST · MOVE / FIRE / ACTION · SCAN · VENT · ECHO · DASH · PULSE · PHASE"
	elif gamepad_mode_active:
		hint = "GAMEPAD · LS MOVE / CLICK GHOST · RS AIM · RT/RB FIRE · R-STICK OVERDRIVE · DPAD ECHO / SCAN / VENT"
	else:
		hint = "WASD / ARROWS MOVE · B GHOST · E ACTION / REAR TAKEDOWN · MOUSE FIRE · Q PULSE · T ECHO · Z SCAN · V VENT · R OVERDRIVE · SPACE DASH · SHIFT PHASE"
	if bottom_hint.text != hint:
		bottom_hint.text = hint

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
	var motion_scale: float = 0.18 if reduced_motion else 1.0
	var shake_amount: float = camera_shake_strength * shake_fade * motion_scale
	var shake := Vector3(
		sin(scene_clock * 53.0) * shake_amount,
		sin(scene_clock * 37.0) * shake_amount * 0.42,
		cos(scene_clock * 43.0) * shake_amount * 0.62
	)
	camera.global_position = camera_follow_position + shake
	var aim_lead := Vector3(player_aim.x, 0.0, player_aim.z).normalized() * 0.7
	camera.look_at(player.global_position + Vector3(0.0, 0.55, 0.0) + aim_lead, Vector3.UP)
	var horizontal_speed := Vector2(player.velocity.x, player.velocity.z).length()
	var movement_fov := clampf(horizontal_speed / PLAYER_SPEED, 0.0, 1.0) * 1.35 * motion_scale
	var shift_fov := (3.1 if null_shift_timer > 0.0 else 0.0) * motion_scale
	var recoil_fov := clampf(weapon_recoil, 0.0, 1.0) * 0.85 * motion_scale
	var overdrive_fov: float = (3.6 if overdrive_timer > 0.0 else 0.0) * motion_scale
	var target_fov: float = CAMERA_BASE_FOV + movement_fov + shift_fov + recoil_fov + overdrive_fov
	camera.fov = lerpf(camera.fov, target_fov, 1.0 - exp(-maxf(delta, 0.0) * 4.8))


func _update_operator_lighting(delta: float) -> void:
	# A single shadowless practical is cheap enough for mobile and follows the animated suit rig.
	if not is_instance_valid(player) or not is_instance_valid(operator_rim_light):
		return
	if performance_quality or adaptive_quality_degraded:
		return

	var motion_pulse: float = 0.5 if reduced_motion else (0.5 + 0.5 * sin(scene_clock * 1.45))
	var health_ratio: float = clampf(player_health / maxf(1.0, player_max_health), 0.0, 1.0)
	var health_danger: float = clampf((0.68 - health_ratio) / 0.52, 0.0, 1.0)
	var conduit_danger: float = 0.0
	for lane in phase_lanes:
		var lane_state: String = str(lane.get("state", "safe"))
		if lane_state != "warning" and lane_state != "active":
			continue
		if absf(player.global_position.z - float(lane.get("z", 999.0))) > 3.2 or absf(player.global_position.x) > 21.7:
			continue
		conduit_danger = maxf(conduit_danger, 0.38 if lane_state == "warning" else 0.82)

	var danger_weight: float = maxf(health_danger, conduit_danger)
	var shift_weight: float = clampf(null_shift_timer / 0.9, 0.0, 1.0)
	var dash_weight: float = clampf(dash_timer / maxf(DASH_DURATION, 0.001), 0.0, 1.0)
	var rim_target_energy: float = 0.58 + motion_pulse * 0.15 + danger_weight * 0.20 + shift_weight * 0.35 + dash_weight * 0.18
	var rim_color: Color = Color(0.10, 0.94, 0.79).lerp(Color(1.0, 0.46, 0.18), danger_weight)
	rim_color = rim_color.lerp(Color(0.55, 0.18, 1.0), shift_weight)
	rim_color = rim_color.lerp(Color(0.86, 1.0, 0.96), dash_weight * 0.68)
	var response: float = clampf(maxf(delta, 0.0) * 5.5, 0.0, 1.0)
	operator_rim_light.light_color = operator_rim_light.light_color.lerp(rim_color, response)
	operator_rim_light.light_energy = move_toward(operator_rim_light.light_energy, rim_target_energy, maxf(delta, 0.0) * 3.8)


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
		operator_suit.material_override = materials.get(operator_style, materials["cyan"])

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
	if is_instance_valid(medkit) and medkit.visible and not medkit_used:
		# Hover and yaw drift make the existing pickup readable without runtime allocations.
		medkit.position.y = 0.08 + sin(scene_clock * 2.15) * 0.065
		medkit.rotation.y = sin(scene_clock * 0.72) * 0.13
	if is_instance_valid(core_ring) and quantum_core.visible:
		core_ring.rotate_y(delta * 1.2)
		core_ring.rotate_x(sin(scene_clock * 0.8) * delta * 0.25)
	if is_instance_valid(extraction_ring):
		extraction_ring.rotate_y(-delta * 0.32)
		var extraction_pulse: float = 1.0 + (0.045 * absf(sin(scene_clock * 5.0)) if not reduced_motion else 0.0) if extraction_pressure_active else 1.0
		extraction_ring.scale = Vector3.ONE * extraction_pulse
		extraction_ring.material_override = materials["amber"] if extraction_pressure_active else (materials["red"] if extraction_overload_triggered else materials["cyan"])
	_update_objective_beacon(delta)
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
		var locomotion_speed: float = body.velocity.length()
		if armor:
			var role: String = str(guard.get("role", "RANGER"))
			var role_material: Material = materials["white"] if hit_timer > 0.0 else (materials["cyan"] if float(guard["stun"]) > 0.0 else (materials["red"] if role in ["WARDEN", "RANGER"] else (materials["violet"] if role == "STALKER" else materials["amber"])))
			armor.material_override = role_material
			armor.position.y = sin(scene_clock * (9.0 if locomotion_speed > 0.2 else 1.6) + float(guard["phase"])) * (0.035 if locomotion_speed > 0.2 else 0.012) + (0.045 if hit_timer > 0.0 else 0.0)
			armor.scale = Vector3.ONE * (1.07 if hit_timer > 0.0 else 1.0)
		var gait_weight: float = clampf(locomotion_speed / maxf(0.1, float(guard.get("speed", 2.0))), 0.0, 1.0)
		var gait_clock: float = scene_clock * (9.2 if locomotion_speed > 0.2 else 1.6) + float(guard.get("phase", 0.0))
		var guard_legs: Array = guard.get("leg_pivots", [])
		for leg_index in range(guard_legs.size()):
			var leg_pivot: Node3D = guard_legs[leg_index] as Node3D
			if is_instance_valid(leg_pivot):
				var leg_phase: float = 0.0 if leg_index == 0 else PI
				var leg_target: float = sin(gait_clock + leg_phase) * 0.38 * gait_weight
				leg_pivot.rotation.x = lerpf(leg_pivot.rotation.x, leg_target, 1.0 - exp(-delta * 13.0))
		var guard_arms: Array = guard.get("arm_pivots", [])
		for arm_index in range(guard_arms.size()):
			var arm_pivot: Node3D = guard_arms[arm_index] as Node3D
			if is_instance_valid(arm_pivot):
				var arm_phase: float = PI if arm_index == 0 else 0.0
				var arm_target: float = sin(gait_clock + arm_phase) * 0.22 * gait_weight
				arm_pivot.rotation.x = lerpf(arm_pivot.rotation.x, arm_target, 1.0 - exp(-delta * 11.0))
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
		var duration: float = maxf(0.001, float(state.get("duration", 0.18)))
		var remaining: float = maxf(0.0, float(state["remaining"]) - dt)
		if remaining <= 0.0 or not is_instance_valid(instance):
			if is_instance_valid(instance):
				instance.visible = false
				instance.transparency = 0.0
			effects.erase(instance)
			beam_effects.remove_at(index)
		else:
			var progress: float = clampf(1.0 - remaining / duration, 0.0, 1.0)
			instance.transparency = clampf(progress * 0.9, 0.0, 0.9)
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
			var max_scale: float = maxf(1.0, float(state.get("max_scale", 14.0)))
			ring.scale = Vector3.ONE.lerp(Vector3.ONE * max_scale, eased)
			ring.transparency = clampf(progress * 0.88, 0.0, 0.9)
			state["remaining"] = remaining
			ring_effects[index] = state
	for index in range(spark_effects.size() - 1, -1, -1):
		var spark_state: Dictionary = spark_effects[index]
		var particles: CPUParticles3D = spark_state["node"]
		var remaining: float = maxf(0.0, float(spark_state["remaining"]) - dt)
		if remaining <= 0.0 or not is_instance_valid(particles):
			if is_instance_valid(particles):
				particles.emitting = false
				particles.visible = false
			effects.erase(particles)
			spark_effects.remove_at(index)
		else:
			spark_state["remaining"] = remaining
			spark_effects[index] = spark_state
	for index in range(impact_light_effects.size()):
		var impact_state: Dictionary = impact_light_effects[index]
		var impact_light: OmniLight3D = impact_state.get("node") as OmniLight3D
		var remaining: float = maxf(0.0, float(impact_state.get("remaining", 0.0)) - dt)
		if remaining <= 0.0 or not is_instance_valid(impact_light):
			if is_instance_valid(impact_light):
				impact_light.visible = false
				impact_light.light_energy = 0.0
				impact_light.omni_range = maxf(0.5, float(impact_state.get("range", 3.5)))
				effects.erase(impact_light)
			impact_state["remaining"] = 0.0
		else:
			var duration: float = maxf(0.001, float(impact_state.get("duration", 0.14)))
			var strength: float = clampf(remaining / duration, 0.0, 1.0)
			impact_light.light_energy = float(impact_state.get("energy", 0.0)) * pow(strength, 1.65)
			impact_light.omni_range = maxf(0.5, float(impact_state.get("range", 3.5)) * (0.38 + 0.62 * strength))
			impact_light.visible = _impact_lighting_enabled()
			impact_state["remaining"] = remaining
		impact_light_effects[index] = impact_state
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
	# Two crossed triangle ribbons give the tracer a readable 3D body from elevated
	# and lateral cameras; the fine center line preserves exact aim readability.
	# Everything is rebuilt inside the existing bounded pool, with no per-shot node allocation.
	var beam_axis: Vector3 = to - from
	if beam_axis.length_squared() < 0.000001:
		beam_axis = Vector3.FORWARD * 0.001
	var beam_direction: Vector3 = beam_axis.normalized()
	var beam_side: Vector3 = beam_direction.cross(Vector3.UP)
	if beam_side.length_squared() < 0.001:
		beam_side = beam_direction.cross(Vector3.RIGHT)
	beam_side = beam_side.normalized()
	var beam_vertical: Vector3 = beam_direction.cross(beam_side).normalized()
	var width_factor: float = clampf(sqrt(beam_axis.length()) * 0.72, 0.72, 1.4)
	var side_extent: Vector3 = beam_side * 0.042 * width_factor
	var vertical_extent: Vector3 = beam_vertical * 0.032 * width_factor
	line_mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLES, material)
	# Horizontal ribbon.
	line_mesh.surface_add_vertex(from - side_extent)
	line_mesh.surface_add_vertex(from + side_extent)
	line_mesh.surface_add_vertex(to + side_extent)
	line_mesh.surface_add_vertex(from - side_extent)
	line_mesh.surface_add_vertex(to + side_extent)
	line_mesh.surface_add_vertex(to - side_extent)
	# Perpendicular ribbon stays visible when viewed edge-on to the first.
	line_mesh.surface_add_vertex(from - vertical_extent)
	line_mesh.surface_add_vertex(from + vertical_extent)
	line_mesh.surface_add_vertex(to + vertical_extent)
	line_mesh.surface_add_vertex(from - vertical_extent)
	line_mesh.surface_add_vertex(to + vertical_extent)
	line_mesh.surface_add_vertex(to - vertical_extent)
	line_mesh.surface_end()
	line_mesh.surface_begin(Mesh.PRIMITIVE_LINES, material)
	line_mesh.surface_add_vertex(from)
	line_mesh.surface_add_vertex(to)
	line_mesh.surface_end()
	instance.transparency = 0.0
	instance.visible = true
	var duration: float = maxf(0.025, lifetime)
	beam_effects.append({"node": instance, "remaining": duration, "duration": duration})
	effects.append(instance)
func _spawn_ring_burst(at: Vector3, material: Material, max_scale: float = 14.0) -> void:
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
	ring_effects.append({"node": ring, "remaining": 0.46, "duration": 0.46, "max_scale": maxf(1.0, max_scale)})
	effects.append(ring)
func _spawn_hit_sparks(at: Vector3, material: Material) -> void:
	# Reuse a bounded one-shot emitter instead of allocating a node and timer for every hit.
	if effects.size() >= 36:
		effect_pool_exhaustions += 1
		return
	var particles: CPUParticles3D
	for pooled: CPUParticles3D in spark_pool:
		if is_instance_valid(pooled) and not pooled.visible:
			particles = pooled
			break
	if not is_instance_valid(particles):
		if spark_pool.size() >= MAX_SPARK_POOL:
			effect_pool_exhaustions += 1
			return
		particles = CPUParticles3D.new()
		particles.name = "ImpactSparkPool_%02d" % [spark_pool.size() + 1]
		particles.amount = 14
		particles.lifetime = 0.28
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
		particles.emitting = false
		particles.visible = false
		add_child(particles)
		spark_pool.append(particles)
	particles.amount = 14 if cinematic_quality and not adaptive_quality_degraded else (9 if not performance_quality else 5)
	particles.material_override = material
	particles.position = at
	particles.visible = true
	particles.emitting = false
	particles.restart()
	particles.emitting = true
	spark_effects.append({"node": particles, "remaining": 0.34})
	effects.append(particles)

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
