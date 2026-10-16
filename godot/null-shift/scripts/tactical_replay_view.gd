extends Control

const WORLD_MIN_X := -22.0
const WORLD_MAX_X := 22.0
const WORLD_MIN_Z := -13.0
const WORLD_MAX_Z := 13.0

var _samples: Array[Dictionary] = []
var _events: Array[Dictionary] = []
var _cursor_index := 0

func configure(sample_data: Array, event_data: Array) -> void:
	_samples.clear()
	_events.clear()
	for raw_sample in sample_data:
		if raw_sample is Dictionary:
			_samples.append((raw_sample as Dictionary).duplicate(true))
	for raw_event in event_data:
		if raw_event is Dictionary:
			_events.append((raw_event as Dictionary).duplicate(true))
	_cursor_index = clampi(_cursor_index, 0, maxi(0, _samples.size() - 1))
	queue_redraw()

func set_cursor_index(index: int) -> void:
	_cursor_index = clampi(index, 0, maxi(0, _samples.size() - 1))
	queue_redraw()

func get_cursor_index() -> int:
	return _cursor_index

func get_sample_count() -> int:
	return _samples.size()

func current_sample() -> Dictionary:
	if _samples.is_empty():
		return {}
	return _samples[_cursor_index].duplicate(true)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.018, 0.035, 0.043, 1.0), true)
	if size.x < 48.0 or size.y < 64.0:
		return
	var map_rect := Rect2(Vector2(12.0, 12.0), Vector2(size.x - 24.0, size.y - 47.0))
	draw_rect(map_rect, Color(0.025, 0.065, 0.071, 1.0), true)
	for index in range(1, 10):
		var x: float = map_rect.position.x + map_rect.size.x * float(index) / 10.0
		draw_line(Vector2(x, map_rect.position.y), Vector2(x, map_rect.end.y), Color(0.2, 0.43, 0.43, 0.20), 1.0)
	for index in range(1, 7):
		var y: float = map_rect.position.y + map_rect.size.y * float(index) / 7.0
		draw_line(Vector2(map_rect.position.x, y), Vector2(map_rect.end.x, y), Color(0.2, 0.43, 0.43, 0.20), 1.0)
	draw_rect(map_rect, Color(0.35, 0.8, 0.72, 0.65), false, 1.5, true)
	var points := PackedVector2Array()
	for sample in _samples:
		points.append(_map_point(sample, map_rect))
	if points.size() >= 2:
		draw_polyline(points, Color(0.28, 0.98, 0.79, 0.88), 2.4, true)
	for event in _events:
		var event_position: Variant = event.get("position", {})
		if not event_position is Dictionary:
			continue
		var world_point: Dictionary = event_position
		if not world_point.has("x") or not world_point.has("z"):
			continue
		var marker_sample := {"x": float(world_point.get("x", 0.0)), "z": float(world_point.get("z", 0.0))}
		var marker := _map_point(marker_sample, map_rect)
		draw_circle(marker, 3.3, _event_color(str(event.get("type", ""))))
	if not _samples.is_empty():
		var current := _map_point(_samples[_cursor_index], map_rect)
		draw_circle(current, 7.0, Color(0.02, 0.08, 0.08, 0.95))
		draw_circle(current, 4.6, Color(1.0, 0.81, 0.41, 1.0))
		draw_line(current + Vector2(-12.0, 0.0), current + Vector2(12.0, 0.0), Color(1.0, 0.81, 0.41, 0.9), 1.2)
		draw_line(current + Vector2(0.0, -12.0), current + Vector2(0.0, 12.0), Color(1.0, 0.81, 0.41, 0.9), 1.2)
	var font: Font = ThemeDB.fallback_font
	var current_t := 0.0
	var first_t := 0.0
	var last_t := 0.0
	if not _samples.is_empty():
		current_t = float(_samples[_cursor_index].get("t", 0.0))
		first_t = float(_samples[0].get("t", 0.0))
		last_t = float(_samples[_samples.size() - 1].get("t", first_t))
	draw_string(font, Vector2(16.0, size.y - 26.0), "OPERATOR TRACE  /  %d SAMPLES  /  T+%05.2f" % [_samples.size(), current_t], HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, Color(0.68, 0.86, 0.81))
	var timeline_y: float = size.y - 11.0
	draw_line(Vector2(12.0, timeline_y), Vector2(size.x - 12.0, timeline_y), Color(0.28, 0.48, 0.47, 0.65), 3.0, true)
	var duration: float = maxf(0.01, last_t - first_t)
	for event in _events:
		var event_time := float(event.get("t", first_t))
		var ratio: float = clampf((event_time - first_t) / duration, 0.0, 1.0)
		var tick_x: float = 12.0 + ratio * (size.x - 24.0)
		draw_line(Vector2(tick_x, timeline_y - 5.0), Vector2(tick_x, timeline_y + 5.0), _event_color(str(event.get("type", ""))), 1.5)
	if not _samples.is_empty():
		var cursor_ratio: float = 0.0 if _samples.size() <= 1 else float(_cursor_index) / float(_samples.size() - 1)
		var cursor_x: float = 12.0 + cursor_ratio * (size.x - 24.0)
		draw_line(Vector2(cursor_x, timeline_y - 7.0), Vector2(cursor_x, timeline_y + 7.0), Color(1.0, 0.86, 0.51, 1.0), 2.0)

func _map_point(sample: Dictionary, rect: Rect2) -> Vector2:
	var x_ratio: float = clampf((float(sample.get("x", 0.0)) - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X), 0.0, 1.0)
	var z_ratio: float = clampf((WORLD_MAX_Z - float(sample.get("z", 0.0))) / (WORLD_MAX_Z - WORLD_MIN_Z), 0.0, 1.0)
	return Vector2(rect.position.x + x_ratio * rect.size.x, rect.position.y + z_ratio * rect.size.y)

func _event_color(event_type: String) -> Color:
	var normalized := event_type.to_lower()
	if normalized.contains("mission") or normalized.contains("extraction"):
		return Color(0.36, 1.0, 0.72, 1.0)
	if normalized.contains("damage") or normalized.contains("death") or normalized.contains("hit"):
		return Color(1.0, 0.35, 0.40, 1.0)
	if normalized.contains("phase") or normalized.contains("echo"):
		return Color(0.68, 0.48, 1.0, 1.0)
	if normalized.contains("stealth") or normalized.contains("body"):
		return Color(0.34, 0.86, 1.0, 1.0)
	return Color(1.0, 0.78, 0.38, 1.0)

func _gui_input(event: InputEvent) -> void:
	if _samples.size() <= 1:
		return
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed and mouse_event.position.y >= size.y - 30.0:
			_scrub_to_x(mouse_event.position.x)
			accept_event()
	elif event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		if touch_event.pressed and touch_event.position.y >= size.y - 30.0:
			_scrub_to_x(touch_event.position.x)
			accept_event()
	elif event is InputEventScreenDrag:
		var drag_event := event as InputEventScreenDrag
		if drag_event.position.y >= size.y - 30.0:
			_scrub_to_x(drag_event.position.x)
			accept_event()

func _scrub_to_x(x_position: float) -> void:
	var ratio: float = clampf((x_position - 12.0) / maxf(1.0, size.x - 24.0), 0.0, 1.0)
	set_cursor_index(roundi(ratio * float(_samples.size() - 1)))
