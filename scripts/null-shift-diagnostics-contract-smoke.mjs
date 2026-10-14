import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile('godot/null-shift/scripts/main.gd', 'utf8');
const runtime = await readFile('godot/null-shift/tests/runtime_smoke.gd', 'utf8');
const start = main.indexOf('func _update_hud() -> void:');
const end = main.indexOf('\nfunc ', start + 1);
assert.notEqual(start, -1, '_update_hud must exist');
assert.notEqual(end, -1, 'HUD function must have an end boundary');
const hud = main.slice(start, end);
const telemetry = hud.indexOf('_update_live_diagnostics()');
const primaryGuard = hud.indexOf('if not is_instance_valid(objective_label):');
assert.notEqual(telemetry, -1, 'HUD must update diagnostics through the independent telemetry function');
assert.notEqual(primaryGuard, -1, 'HUD must retain the primary objective label validity guard');
assert.ok(telemetry < primaryGuard, 'Diagnostics must update before the primary HUD early return');

const diagnosticFunctionStart = main.indexOf('func _update_live_diagnostics() -> void:');
const diagnosticFunctionEnd = main.indexOf('\nfunc ', diagnosticFunctionStart + 1);
assert.notEqual(diagnosticFunctionStart, -1, 'Independent diagnostics updater must exist');
assert.notEqual(diagnosticFunctionEnd, -1, 'Independent diagnostics updater must have an end boundary');
const diagnosticFunction = main.slice(diagnosticFunctionStart, diagnosticFunctionEnd);
for (const marker of ['DRAW / TRI / NODES', 'FX ACTIVE', 'FX DROPPED']) {
  assert.ok(diagnosticFunction.includes(marker), 'Independent telemetry must expose ' + marker);
}

const regressionStart = runtime.indexOf('RUNTIME_STAGE: live diagnostics');
const regressionEnd = runtime.indexOf('RUNTIME_STAGE: cipher hack', regressionStart);
assert.notEqual(regressionStart, -1, 'Runtime smoke must contain the live diagnostics stage');
assert.notEqual(regressionEnd, -1, 'Diagnostics stage must end before the next gameplay stage');
const regression = runtime.slice(regressionStart, regressionEnd);
assert.ok(regression.includes('game.objective_label = null'), 'Regression must remove primary objective HUD reference');
assert.ok(regression.includes('game._update_hud()'), 'Regression must exercise the real HUD update path');
assert.ok(regression.includes('game.objective_label = objective_label_before_diagnostics'), 'Regression must restore the reference after exercising the fault');
assert.ok(regression.includes('DRAW / TRI / NODES'), 'Regression must assert renderer telemetry remains visible');

console.log('PASS Godot telemetry contract: updater precedes primary-HUD guard, renderer counters remain in the independent updater, and runtime regression exercises HUD teardown.');
