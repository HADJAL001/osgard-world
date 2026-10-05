# OSGARD CORE contract

This is the first implementation contract for brief sections 1-6, 32-36, and 109-120.

## Event envelope

Every product action is represented by an `OsgardEvent`:

- `id`: unique event id generated at the edge;
- `name`: one of the versioned event names in `src/core/manifest.ts`;
- `userId`: optional until authentication is implemented;
- `world` / `game`: the owning surface;
- `payload`: product-specific data, never trusted for score, currency, or ownership;
- `occurredAt`: ISO-8601 UTC timestamp;
- `schemaVersion`: currently `1`.

The client may emit intent events. Server-side services must validate scores, inventory, permissions, and competitive results before persistence.

## World registry

The registry is the single source of truth for the seven OSGARD worlds. The game registry is the single source of truth for the five game routes and each game's reason to exist:

`TIME -> управлять`, `SWARM -> координироваться`, `NULL//SHIFT -> проникать`, `INHERIT -> наследовать`, `REMIX -> создавать`.

## Integration rule

New products and games must add a manifest entry and event names before adding UI. This prevents the portal, analytics, recommendations, and profile surfaces from drifting apart.

