# CIVIC CASCADE 2.0 — Crisis Director

Release marker: `2.0.0-crisis-director`

CIVIC CASCADE now adds a tactical incident layer to the existing city-infrastructure crisis simulation. After the second, fourth and sixth successful tactical actions, the simulation pauses and presents an incident card.

## Incident sequence

1. **Hospital backup power** — spend reserves and a crew to strengthen the grid, open a medical corridor, or defer the fix and accept lower access.
2. **Bridge under critical load** — drain the water pressure, reroute traffic while accepting higher water load, or restrict traffic and save supplies.
3. **Command communications failure** — deploy an emergency relay, switch to field coordination, or use manual control and accept lower grid/access.

Each card includes two resource-trade-off responses plus one no-supply fallback, so a depleted reserve cannot permanently lock the operation. The game checks victory only after a pending decision is resolved.

The new tactical action counter is persisted in local checkpoints. Existing schema-version-1 checkpoints that do not have this field migrate to zero without deleting the saved scenario.

## Quality checks

`npm run qa:civic-cascade` evaluates all nine incident effects for bounded infrastructure values, valid crew/resource values and finite scores. `npm run qa:games-portal` runs the existing eleven-game portal smoke tests and the new crisis-decision regression suite.
