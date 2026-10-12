# OSGARD WORLD Games — compact brand system
## Direction
**Obsidian systems / quiet signal / precise play.** The Games catalogue reuses the portal's restrained editorial tone while giving game discovery a distinct cyan-mint signal over graphite and antique gold. Avoid copied publisher marks, generic game storefront patterns, flashing elements and misleading "live" counters.

## Core palette
- Obsidian background: `#070B0E`
- Deep panel: `#0C1316`
- Antique gold: `#D8BD83`
- Signal mint: `#76E6CE`
- Body text: `#EEF0EE`
- Secondary text: `#A2AAA9`
- Hairline borders: `rgba(184,202,198,0.15)`

## Typography
The existing portal imports Cormorant Garamond, Jost, Inter, Playfair Display and JetBrains Mono in different surfaces. Games uses Inter for operational labels and Playfair/Cormorant-style serif headlines, with JetBrains Mono for indices and telemetry. Before global typography refactoring, consolidate font loading to avoid duplicate Google Fonts requests and define fallbacks.

## Mark and use
`public/osgard-mark.svg` introduces an original star/orbit mark sized for favicon use: dark rounded field, fine gold circle, subtle mint ring, geometric star and mint core. Existing `OsgardLogo` remains the main wordmark. Use the SVG mark for compact contexts, not as a substitute for the full wordmark.

## Card system
Each game gets a consistent title/genre/control/detail structure and its own restrained colour signature: time/bronze, SWARM/indigo, NULL//SHIFT/blue, INHERIT/green, REMIX/plum. Geometric abstract art is an interface motif, not a claim of photorealistic game cover assets.

## Motion/accessibility
Use short lift/border feedback for cards, no forced motion in essential information, visible keyboard focus, and `prefers-reduced-motion` support. Preserve game-level control over performance and avoid adding animation loops to host-page interactions.

## Ad/sponsor slots
Keep sponsor/special placement outside the iframe/game input region, add a visible “Реклама” / “Спонсорский материал” label, and never imitate normal game controls with an advert. Do not use a sponsor slot as an ad impression until an actual approved provider reports it.
