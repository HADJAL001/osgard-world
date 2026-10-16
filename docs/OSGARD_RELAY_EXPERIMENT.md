# OSGARD Relay — experiment v1

## Hypothesis
An optional two-game chain can increase the share of players who complete a second OSGARD title compared with a single-game end screen. The first measurement should focus on actual second-session starts and completed routes, not clicks alone.

## Player flow
1. On the Games catalogue, a player voluntarily selects one of five supported games and starts a Relay in the current tab.
2. The player lifecycle shell reports a session start only after its existing iframe origin/source/game checks confirm a real start. A valid game-completed message must come from the active same-origin iframe.
3. Only a completed first title opens a curated second-title choice. A random other title, a launch error, a close or a reload cannot complete the chain. Players can also explicitly cancel a pending route; cancellation records an abandoned event (when consent is granted) and never grants the cosmetic.
4. After a completed second title, the client awards a cosmetic “Relay Trail” mark in localStorage. The copy explicitly says it is local to this browser; it is not an account inventory, money or transferable currency.
5. The player may prepare a short invitation link. It contains a random eight-hex route code and the two game IDs, not the inviter's name. Browser share success is not treated as proof of delivery.

## Compatible pairs
- NULL//SHIFT → SWARM or Империя времени
- Империя времени → INHERIT or NULL//SHIFT
- SWARM → NULL//SHIFT or REMIX
- INHERIT → Империя времени or SWARM
- REMIX → SWARM or NULL//SHIFT

## Measurement and privacy
The client has no direct fetch/sendBeacon path. Funnel events are offered only through the existing consent-gated analytics queue and are also validated against a server-side event allow-list. If consent is absent or withdrawn, no new events are enqueued. Do not use these events to infer identity. Invite delivery is not confirmed automatically.

Events: `relay_seen`, `relay_opt_in`, `relay_game_1_started`, `relay_milestone_reached`, `relay_game_2_selected`, `relay_game_2_started`, `relay_completed`, `relay_invite_link_prepared`, `relay_invite_opened`, `relay_invite_accepted`, `relay_abandoned`.

Primary funnel: `relay_seen → relay_opt_in → relay_game_1_started → relay_milestone_reached → relay_game_2_started → relay_completed`. Evaluate invite link preparation and accepted invite separately. Do not claim D7 retention until a consented cross-session aggregation report has been implemented and reviewed.

## Rollout guardrails
- Start as an opt-in experiment; do not block regular game launches.
- No ads, checkout or pay-to-win are part of the experiment.
- Reward is local-only, cosmetic and disclosed as such.
- Measure completed second sessions; do not optimize for clicks alone.
- Feature remains in a PR until type-check, smoke tests, production build and route-matrix checks pass. Production is not considered changed until the master deploy workflow succeeds.
