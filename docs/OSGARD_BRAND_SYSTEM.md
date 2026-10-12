# OSGARD WORLD Games — compact brand system
## Direction
**Obsidian systems / quiet signal / precise play.** The Games catalogue reuses the portal's restrained editorial tone while giving game discovery a distinct cyan-mint signal over graphite and antique gold. Avoid copied publisher marks, generic game storefront patterns, flashing elements and misleading "live" counters.

## Core palette
The shipped static Games portal currently uses the following actual tokens. Do not copy the older mint/gold concept values into the live CSS without a deliberate design review.

- Obsidian background: `#080A0B`
- Main panel: `#101315`
- Signal lime: `#D3FF69`
- Metal/neutral accent: `#D2C9B4`
- Main text: `#F2F0E8`
- Secondary text: `#A0A49B`
- Border: `#FFFFFF20`

The separate reusable favicon mark at `/osgard-mark.svg` adds restrained antique gold and teal; `/games/favicon.svg` remains the Games portal's specific favicon. Treat this as a mark variation, not permission to introduce a third competing palette.

## Typography
The existing portal imports Cormorant Garamond, Jost, Inter, Playfair Display and JetBrains Mono in different surfaces. Games uses Inter for operational labels and Playfair/Cormorant-style serif headlines, with JetBrains Mono for indices and telemetry. Before global typography refactoring, consolidate font loading to avoid duplicate Google Fonts requests and define fallbacks.

## Logo directions considered
1. **North star / orbit (selected):** a geometric signal/star held by two precise rings. It reads at favicon size and connects the game's systems/network motif with the wider ecosystem.
2. **OS monogram in a metal frame:** compact and corporate, but too close to a generic SaaS mark and less distinctive across game covers.
3. **Split axis / two-world glyph:** good for the reality-switching game, but too tied to NULL//SHIFT to represent the whole portfolio.

The selected north-star/orbit direction is implemented in `public/osgard-mark.svg` for the main portal. `public/games/favicon.svg` is a separate existing OSGARD PLAY catalogue icon; the other two concepts are documented directions, not shipped logo files.

## Mark and use
`public/osgard-mark.svg` introduces an original star/orbit mark sized for favicon use: dark rounded field, fine gold circle, subtle mint ring, geometric star and mint core. Existing `OsgardLogo` remains the main wordmark. Use the SVG mark for compact contexts, not as a substitute for the full wordmark.

## Card system
Each game gets a consistent title/genre/control/detail structure and its own restrained colour signature: time/bronze, SWARM/indigo, NULL//SHIFT/blue, INHERIT/green, REMIX/plum. Geometric abstract art is an interface motif, not a claim of photorealistic game cover assets.

## Motion/accessibility
Use short lift/border feedback for cards, no forced motion in essential information, visible keyboard focus, and `prefers-reduced-motion` support. Preserve game-level control over performance and avoid adding animation loops to host-page interactions.

## Ad/sponsor slots
Keep sponsor/special placement outside the iframe/game input region, add a visible “Реклама” / “Спонсорский материал” label, and never imitate normal game controls with an advert. Do not use a sponsor slot as an ad impression until an actual approved provider reports it.
