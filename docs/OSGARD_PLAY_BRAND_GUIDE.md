# OSGARD WORLD / PLAY — brand direction

**Master brand:** OSGARD WORLD  
**Product sub-brand:** OSGARD PLAY  
**Revision:** 13 October 2026

## Logo directions evaluated

1. **North Compass (selected).** A precise radial compass-star inside two orbital rings. It signals exploration, game navigation and a connected ecosystem; its central diamond remains recognizable at favicon scale. Use champagne as the main metal and cyan as the live-system glint.
2. **Obsidian Monolith.** A solid cut-stone O mark with a single vertical glint. Best for enterprise / business applications but less descriptive for a game catalogue.
3. **Signal Circuit.** A network of connected nodes built into a ring. It communicates platform infrastructure but risks resembling a generic technology/network icon and loses detail at small sizes.

North Compass is the current master mark. The SVG at public/assets/osgard-mark.svg is the production-ready vector source for favicon and small product marks; the Games hub repeats the same geometry in its inline logo so it does not depend on remote assets.

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| Obsidian | #080B10 | Primary canvas |
| Midnight | #10151E | Cards and overlays |
| Raised panel | #141B25 | Hover / nested UI surfaces |
| Champagne | #D7B978 | Premium identity and primary actions |
| Champagne bright | #F0D9A1 | Emphasis and high-contrast metallic accent |
| Signal cyan | #53D7FF | Live/technical status; never decorative error color |
| Text white | #F5F3ED | Main typography |
| Muted text | #A2AAB8 | Metadata, descriptions, secondary controls |
| Danger | #FF8D88 | Errors and safety-critical status |

## Typography

- Display headings: Georgia/system serif fallback for the self-contained Games hub. The older React portal uses Cormorant/Playfair where already implemented.
- Interface: OS system sans-serif stack; avoid remote webfont requests in this static entry.
- Telemetry and micro labels: system monospace, uppercase and increased tracking. Body copy uses normal case for readability.

## Component rules

- One major call to action per view; secondary actions remain outlined.
- A game card includes title, verified genre, runtime/compatibility note, summary and one launch action. Do not display invented ratings or user counts.
- Live cyan is reserved for technical/live state; champagne signals premium identity and important action.
- Premium visual effects stay CSS-based in the catalogue. The game engine controls its own rendering quality; web chrome must not degrade gameplay frame rate.
- Any third-party placement must have a sponsor label and must not cover game input. Inactive inventory must never contain fake ads.
- Reduced-motion preferences must reduce transitions/animations. All actions must have visible focus styles and accessible labels.
- The exact wordmark is “OSGARD WORLD”; the game directory label is “OSGARD PLAY”. Avoid introducing alternate spellings.

## Campaign templates

**First-party project card:** project brand → concise confirmed service description → outbound link with utm_source=osgard.world, utm_medium=games, utm_campaign=osgard_ecosystem, utm_content=<project-id>.

**Sponsor card after contract:** “Реклама” or “Спонсорский материал” label → sponsor name → short claim reviewed by sponsor → destination URL → campaign tracking. Keep the sponsored card separate from game controls.

**Development lead:** “Есть идея игры, сайта или приложения? OSGARD поможет превратить её в цифровой продукт.” → “Обсудить разработку” → form fields: project type, optional budget, return contact, description → clear notice explaining where the form submits.

## Asset handling

Keep public/assets/osgard-mark.svg under source control. Do not embed provider API keys, email delivery credentials, payment secrets or private analytics identifiers in client code. Add social preview images only after creating the actual source asset and validating the exact public URL.
