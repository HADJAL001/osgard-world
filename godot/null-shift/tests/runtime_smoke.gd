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
	var packed := load("res://scenes/main.tscn") as PackedScene
	if not _expect(packed != null, "main scene must load"):
		return
	var game: Variant = packed.instantiate()
	root.add_child(game)
	await process_frame
	await process_frame
	game.sound_enabled = false

	if not _expect(is_instance_valid(game.player), "operator must instantiate"):
		return
	if not _expect(is_instance_valid(game.operator_rig), "operator rig must instantiate"):
		return
	if not _expect(is_instance_valid(game.operator_suit) and game.operator_rig.get_node_or_null("OperatorHelmet") != null, "operator helmet and armor must instantiate"):
		return
	if not _expect(game.guards[0].get("role", "") == "STALKER" and game.guards[1].get("role", "") == "HEAVY" and game.guards[2].get("role", "") == "RANGER", "enemy archetypes must be distinct"):
		return
	game._screen_impulse(0.2, 0.25)
	if not _expect(game.camera_shake_timer > 0.0 and game.camera_shake_strength >= 0.2, "camera impact response must be measurable"):
		return
	if not _expect(game.guards.size() >= 3, "initial hostiles must spawn"):
		return
	if not _expect(game.devices.size() == 3, "three destructible devices must spawn"):
		return

	var guard_node: Node3D = game.guards[0]["node"]
	var guard_hp := int(game.guards[0]["hp"])
	for _hit in range(guard_hp):
		game._damage_target(guard_node)
	if not _expect(game.guards.size() == 2, "weapon damage must eliminate a guard"):
		return
	if not _expect(game.eliminations == 1, "elimination telemetry must update"):
		return

	var relay: Node3D = game.devices[0]["node"]
	var relay_hp := int(game.devices[0]["hp"])
	for _hit in range(relay_hp):
		game._damage_target(relay)
	if not _expect(bool(game.devices[0]["destroyed"]), "relay must be destructible"):
		return
	if not _expect(game._living_device_count() == 2, "device count must reflect destruction"):
		return

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

	game._toggle_diagnostics()
	game._update_hud()
	if not _expect(game.diagnostics_label.visible, "diagnostics panel must open"):
		return
	if not _expect(game.frame_samples.size() > 0 and game.current_frame_ms >= 0.0, "frame times must be measured live"):
		return
	if not _expect(game.diagnostics_label.text.contains("DRAW CALLS"), "diagnostics must expose renderer counters"):
		return

	game.player.global_position = game.terminal.global_position + Vector3(0.0, 0.0, 1.0)
	game._interact()
	if not _expect(game.terminal_active and game.keypad_panel.visible, "terminal interaction must open the cipher"):
		return
	for key in [KEY_UP, KEY_LEFT, KEY_DOWN, KEY_RIGHT]:
		game._submit_cipher_key(key)
	if not _expect(game.terminal_unlocked, "correct cipher must unlock the gate"):
		return
	if not _expect(not game.security_gate.visible, "successful hack must open the security gate"):
		return

	game.player.global_position = game.quantum_core.global_position + Vector3(1.0, 0.0, 0.0)
	game._interact()
	if not _expect(game.core_secured, "operator must collect the core after hacking"):
		return
	game.player.global_position = game.extraction.global_position + Vector3(1.0, 0.0, 0.0)
	game._interact()
	if not _expect(game.mission_finished and game.career_credits >= 750, "successful extraction must bank mission credits"):
		return

	game._buy_upgrade("weapon")
	if not _expect(game.weapon_level == 1, "career credits must purchase a weapon upgrade"):
		return
	if not _expect(game.career.get_value("upgrades", "weapon", 0) == 1, "upgrade must persist in the career save"):
		return

	print("PASS NULL//SHIFT runtime: combat damage, eliminations, destructible devices, pulse, animated core, live telemetry, cipher hack, extraction, career credits and persistent upgrade")
	quit(0)
