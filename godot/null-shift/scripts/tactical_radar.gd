extends Control

const WORLD_MIN_X := -24.5
const WORLD_MAX_X := 24.5
const WORLD_MIN_Z := -15.5
const WORLD_MAX_Z := 15.5

var game_root: Node
var redraw_clock := 0.0

func configure(root: Node) -> void:
	game_root = root
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()

func _process(delta: float) -> void:
	redraw_clock += maxf(delta, 0.0)
	if redraw_clock >= 0.12:
		redraw_clock = fmod(redraw_clock, 0.12)
		if is_visible_in_tree():
			queue_redraw()

func world_to_radar(world_position: Vector3, area: Rect2) -> Vector2:
	var x_ratio: float = clampf((world_position.x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X), 0.0, 1.0)
	var z_ratio: float = clampf((world_position.z - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z), 0.0, 1.0)
	return area.position + Vector2(x_ratio, z_ratio) * area.size

func state_color(state: String, accessible_mode: bool = false) -> Color:
	if accessible_mode:
		match state:
			"active":
				return Color(1.0, 0.48, 0.08, 0.96)
			"warning":
				return Color(0.16, 0.58, 1.0, 0.96)
			"disrupted":
				return Color(0.88, 0.94, 1.0, 0.9)
			_:
				return Color(0.12, 0.74, 0.66, 0.5)
	match state:
		"active":
			return Color(1.0, 0.16, 0.24, 0.88)
		"warning":
			return Color(1.0, 0.65, 0.24, 0.82)
		"disrupted":
			return Color(0.75, 0.92, 1.0, 0.76)
		_:
			return Color(0.12, 0.84, 0.72, 0.36)

func _draw() -> void:
	if not is_instance_valid(game_root):
		return
	var bounds := Rect2(Vector2.ZERO, size)
	draw_rect(bounds, Color(0.018, 0.035, 0.041, 0.98), true)
	draw_rect(bounds, Color(0.16, 0.45, 0.45, 0.50), false, 1.0, true)
	var plot := Rect2(Vector2(7.0, 5.0), Vector2(maxf(1.0, size.x - 14.0), maxf(1.0, size.y - 10.0)))
	draw_rect(plot, Color(0.022, 0.052, 0.058, 0.98), true)
	for step in range(1, 4):
		var grid_x: float = plot.position.x + plot.size.x * float(step) / 4.0
		var grid_y: float = plot.position.y + plot.size.y * float(step) / 4.0
		draw_line(Vector2(grid_x, plot.position.y), Vector2(grid_x, plot.end.y), Color(0.22, 0.47, 0.46, 0.20), 1.0, true)
		draw_line(Vector2(plot.position.x, grid_y), Vector2(plot.end.x, grid_y), Color(0.22, 0.47, 0.46, 0.20), 1.0, true)

	# Procedural map uses the same world coordinates as the gameplay physics scene.
	_draw_world_box(plot, Vector3(-11.0, 0.0, 1.0), 1.45, 5.9, Color(0.19, 0.31, 0.34, 0.94))
	_draw_world_box(plot, Vector3(3.0, 0.0, -10.2), 7.3, 1.15, Color(0.19, 0.31, 0.34, 0.94))
	_draw_world_box(plot, Vector3(5.4, 0.0, -1.1), 1.1, 5.2, Color(0.19, 0.31, 0.34, 0.94))
	_draw_world_box(plot, Vector3(17.3, 0.0, 0.0), 5.4, 1.15, Color(0.19, 0.31, 0.34, 0.94))

	var lane_values: Variant = game_root.get("phase_lanes")
	if lane_values is Array:
		for lane_variant: Variant in lane_values:
			if not (lane_variant is Dictionary):
				continue
			var lane: Dictionary = lane_variant
			var lane_z: float = float(lane.get("z", 0.0))
			var lane_state: String = str(lane.get("state", "safe"))
			var lane_color: Color = state_color(lane_state, bool(game_root.get("color_safe_mode")))
			var lane_y: float = world_to_radar(Vector3(0.0, 0.0, lane_z), plot).y
			draw_line(Vector2(plot.position.x, lane_y), Vector2(plot.end.x, lane_y), lane_color, 3.0 if lane_state == "active" else 1.7, true)
			if lane_state == "warning":
				for mark in range(16):
					var stripe_x: float = plot.position.x + plot.size.x * float(mark) / 16.0
					draw_line(Vector2(stripe_x, lane_y - 1.5), Vector2(stripe_x + 2.0, lane_y + 1.5), lane_color, 1.0, true)
			elif lane_state == "active" and bool(game_root.get("color_safe_mode")):
				for mark in range(0, 19):
					var dot_x: float = plot.position.x + plot.size.x * float(mark) / 18.0
					draw_circle(Vector2(dot_x, lane_y), 1.8, Color(0.025, 0.035, 0.04, 0.96), true)
					draw_circle(Vector2(dot_x, lane_y), 1.0, lane_color, true)

	var gate: Node3D = game_root.get("security_gate") as Node3D
	if is_instance_valid(gate) and gate.visible:
		_draw_world_box(plot, gate.global_position, 0.85, 5.8, Color(1.0, 0.20, 0.26, 0.94))

	var device_values: Variant = game_root.get("devices")
	if device_values is Array:
		for device_variant: Variant in device_values:
			if not (device_variant is Dictionary):
				continue
			var device: Dictionary = device_variant
			if bool(device.get("destroyed", false)):
				continue
			var device_node: Node3D = device.get("node") as Node3D
			if not is_instance_valid(device_node):
				continue
			var device_color := Color(0.25, 0.96, 0.82)
			match str(device.get("kind", "")):
				"CELL":
					device_color = Color(1.0, 0.72, 0.30)
				"ANCHOR":
					device_color = Color(0.70, 0.49, 1.0)
			var device_point: Vector2 = world_to_radar(device_node.global_position, plot)
			draw_circle(device_point, 3.4, Color(0.015, 0.035, 0.041, 0.95), true)
			draw_circle(device_point, 2.3, device_color, true)

	var guards_value: Variant = game_root.get("guards")
	if guards_value is Array:
		for guard_variant: Variant in guards_value:
			if not (guard_variant is Dictionary):
				continue
			var guard: Dictionary = guard_variant
			var guard_node: Node3D = guard.get("node") as Node3D
			if not is_instance_valid(guard_node):
				continue
			var role: String = str(guard.get("role", "RANGER"))
			var guard_color := Color(1.0, 0.30, 0.37)
			if role == "STALKER":
				guard_color = Color(0.78, 0.43, 1.0)
			elif role == "HEAVY":
				guard_color = Color(1.0, 0.67, 0.31)
			elif role == "WARDEN":
				guard_color = Color(1.0, 0.85, 0.43)
			var guard_point: Vector2 = world_to_radar(guard_node.global_position, plot)
			draw_circle(guard_point, 3.7 if role == "WARDEN" else 2.8, guard_color, true)
			if role == "WARDEN":
				draw_arc(guard_point, 5.3, 0.0, TAU, 24, Color(1.0, 0.84, 0.43, 0.78), 1.0, true)

	var terminal_node: Node3D = game_root.get("terminal") as Node3D
	if is_instance_valid(terminal_node) and not bool(game_root.get("terminal_unlocked")):
		_draw_objective(plot, terminal_node.global_position, Color(1.0, 0.70, 0.30), "T")
	var core_node: Node3D = game_root.get("quantum_core") as Node3D
	if is_instance_valid(core_node) and not bool(game_root.get("core_secured")):
		_draw_objective(plot, core_node.global_position, Color(1.0, 0.78, 0.34), "C")
	var extraction_node: Node3D = game_root.get("extraction") as Node3D
	if is_instance_valid(extraction_node):
		var extraction_color := Color(0.14, 0.96, 0.82) if bool(game_root.get("core_secured")) else Color(0.14, 0.57, 0.56)
		var extraction_point: Vector2 = world_to_radar(extraction_node.global_position, plot)
		draw_arc(extraction_point, 4.2, 0.0, TAU, 24, extraction_color, 1.4, true)
		draw_circle(extraction_point, 1.5, extraction_color, true)
	var medkit_node: Node3D = game_root.get("medkit") as Node3D
	if is_instance_valid(medkit_node) and not bool(game_root.get("medkit_used")):
		var medkit_point: Vector2 = world_to_radar(medkit_node.global_position, plot)
		draw_rect(Rect2(medkit_point - Vector2(2.5, 2.5), Vector2(5.0, 5.0)), Color(0.85, 0.98, 0.93), true)

	var player_node: Node3D = game_root.get("player") as Node3D
	if is_instance_valid(player_node):
		var player_point: Vector2 = world_to_radar(player_node.global_position, plot)
		var scan_angle: float = float(game_root.get("scene_clock")) * 0.55
		draw_line(player_point, player_point + Vector2(cos(scan_angle), sin(scan_angle)) * 11.0, Color(0.22, 0.99, 0.80, 0.45), 1.0, true)
		draw_circle(player_point, 5.0, Color(0.012, 0.035, 0.041, 0.96), true)
		draw_circle(player_point, 3.0, Color(0.31, 1.0, 0.84), true)
		var aim_value: Variant = game_root.get("player_aim")
		if aim_value is Vector3:
			var aim: Vector3 = aim_value
			var aim_flat := Vector2(aim.x, aim.z)
			if aim_flat.length_squared() > 0.01:
				draw_line(player_point, player_point + aim_flat.normalized() * 8.0, Color(0.80, 1.0, 0.94, 0.9), 1.0, true)

	var font: Font = get_theme_default_font()
	if font != null:
		draw_string(font, Vector2(8.0, size.y - 2.0), "N ↑   OPERATOR   /   AMBER: OBJECTIVE   /   RED: HOSTILE", HORIZONTAL_ALIGNMENT_LEFT, size.x - 14.0, 7, Color(0.48, 0.73, 0.72, 0.9))

func _draw_objective(plot: Rect2, world_position: Vector3, tint: Color, glyph: String) -> void:
	var point: Vector2 = world_to_radar(world_position, plot)
	draw_circle(point, 5.0, Color(0.018, 0.035, 0.041, 0.96), true)
	draw_arc(point, 5.8, 0.0, TAU, 24, tint, 1.2, true)
	var font: Font = get_theme_default_font()
	if font != null:
		draw_string(font, point + Vector2(-2.5, 2.5), glyph, HORIZONTAL_ALIGNMENT_LEFT, 7.0, 7, tint)

func _draw_world_box(plot: Rect2, world_center: Vector3, world_width: float, world_depth: float, tint: Color) -> void:
	var north_west: Vector2 = world_to_radar(Vector3(world_center.x - world_width * 0.5, 0.0, world_center.z - world_depth * 0.5), plot)
	var south_east: Vector2 = world_to_radar(Vector3(world_center.x + world_width * 0.5, 0.0, world_center.z + world_depth * 0.5), plot)
	draw_rect(Rect2(north_west, south_east - north_west), tint, true)
