# CIVIC CASCADE 2.1 — Crisis Director

Release marker: `2.1.0-crisis-director`.

This release preserves the 2.0.0 Web Audio ambience/risk cues, local checkpoint system, tactical canvas, export profiles and host lifecycle integration. It adds a new tactical decision layer after successful actions 2, 4 and 6.

1. **Hospital backup power** — choose between stronger grid/medical access with a crew cost, a medical corridor, or postponing the response.
2. **Bridge under critical load** — reduce flood pressure, open a detour while accepting a water increase, or restrict traffic and preserve supplies.
3. **Command communications failure** — deploy an emergency relay, switch to field coordination, or accept reduced service levels temporarily.

The simulation pauses at an incident until the player chooses. Each incident has two resource-trade-off responses and a no-cost fallback, preventing a hard lock at zero supplies. The mission cannot end successfully while a decision is pending.

The action count is stored in schema-version-1 local checkpoints. Previous checkpoints without this field migrate to zero and retain their existing scenario and progress.

## QA
- `npm run qa:civic-cascade` evaluates every one of the nine incident choices and checks the bounded state values.
- `npm run qa:games-portal` runs the full portal regression suite plus the dedicated Crisis Director checks.
- Production deployment is not considered complete until the deployment workflow and public production-route checks pass for release 2.1.0.
