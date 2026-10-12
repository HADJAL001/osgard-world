# OSGARD WORLD — brand system for Games
Version 1.0 · 13 October 2026

## Chosen direction: Obsidian Sigil

The initial Games hub uses a compact original OSGARD mark: a gold directional star/sigil held by orbital curves, with a small teal energy core on an obsidian field. The emblem is drawn as SVG and inline vector markup, so it remains sharp at favicon size and scales without a raster dependency. This is a first web identity pass, not a commissioned final brand package.

## Three directions considered

1. **Obsidian Sigil — selected for current Games hub.** Gold star geometry + orbit lines + cool teal core. Best for small sizes, game launchers and dark backgrounds; recognizable without a full wordmark.
2. **Portal Ring.** A pair of intersecting orbital rings around a negative-space O. Strong for large hero panels and motion graphics, but less distinctive at favicon sizes.
3. **Monogram Forge.** An angular O/W monogram with metal cut-outs. Better for enterprise/SaaS subbrands, but less obviously connected to the “worlds/portals” Games experience.

The portal-ring geometry is used as supporting hero decoration; the Obsidian Sigil is the consistent icon. Do not use three marks interchangeably in one interface.

## Design tokens

| Token | Value | Use |
|---|---|---|
| Obsidian | `#080D13` | Main background |
| Graphite | `#101923` | Cards and elevated surfaces |
| Deep Slate | `#15212D` | Controls and hover surfaces |
| Structural line | `#293A48` | Borders and separators |
| Noble Gold | `#D6BA78` | Premium accent, brand mark, primary action |
| Soft Gold | `#F0DCA5` | Key titles and hover accent |
| Signal Teal | `#49D9CE` | Active/readout accent |
| Alert Coral | `#FF838B` | Error states only |
| Primary text | `#EDF3F7` | Body/headlines |
| Muted text | `#9AACBB` | Supporting copy |

## Typography

The Games hub uses a serif display stack, sans-serif body stack and monospaced engineering labels. Browser/system fallback fonts are used to avoid a blocking third-party font request. If custom fonts are later bundled, host them on OSGARD, check licensing and run the current font/privacy/performance checklist.

## Composition

- Reserve gold for the emblem, important titles, primary action and genuinely premium emphasis.
- Use teal for live interface state, not false live-player claims.
- Use coral for errors, not general decoration.
- Keep game cards text-forward until approved gameplay artwork is available. The current cards are procedural brand panels, not screenshots of gameplay.
- Every game may have a different controlled accent, but all cards use the same grid, typography, metadata hierarchy and focus states.
- Respect `prefers-reduced-motion`; motion must not carry information unavailable to static states.
- Never fabricate rating stars, player counts, “live” status, press quotes, sponsor logos or awards.

## Files

- `public/osgard-mark.svg` — reusable emblem/favicon.
- `public/games/index.html` — brand application and Games hub layout.
- `public/games/hub.css` — colour tokens, typography stacks, layout and motion.
- `public/games/catalog.json` — game-specific labels and tone assignment.

## Asset rights and next work

The mark and CSS geometry are original in-repository work. No third-party game logo/character artwork has been added. The current build intentionally uses stylized type-and-symbol covers; replacing them with authored in-game key art is the next visual-content step once screenshots or commissioned art are available.
