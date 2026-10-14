# OSGARD SELECT — intermission cross-promotion and social growth
Date: 14 October 2026

## Player experience

OSGARD SELECT uses the existing post-run-recommendations flow in the Games portal; it does not create a second catalog or interrupt active gameplay. It is shown after a game session finishes or the player returns to the catalog, in the existing premium intermission panel.

The panel is explicitly labelled **«РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD»**. It never auto-opens another service. A player can inspect an offer, filter by service category, choose which services to see, set the frequency, collapse the offer list, or pause the promotions for 24 hours. The default for new and migrated preferences is **after every completed game**; an existing explicit frequency setting is preserved during migration.

The owner-managed list contains the ten currently eligible services plus GARD VPN as an inactive operator-managed entry. GARD VPN remains excluded from player-facing promotion until actual VPN connection establishment is verified; the label and official URL may be reviewed in the operator interface, but it is not included in public promotional cards or player choices.
- OSGARD BEW WORLD — project and app creation
- O2 SYSTEM — currency-exchange cash-desk accounting
- SENJORIO — premium taxi
- SUPERDAY — map and day planner
- MARCOSA — social platform
- MYOSA — AI platform
- GOLD GLAMOUR — premium gold-related and on-site services
- GARD VPN — VPN service landing page
- OSGARD OS — business-development services
- OSGARD VANGUARD STUDIO — video production

OSGARD PARTNER STUDIO is also present as an internal B2B offering. The catalogue copy describes the supplied service scope; it does not claim the external site is currently reachable or that a product feature/connection was independently verified.

## Attribution and metrics

Project links are allow-listed by the server-owned service IDs and receive first-party UTM fields identifying the source, placement, service and current game. External services open in a new tab with rel="noopener noreferrer". Click and visible-impression events are sent through the existing consent-gated OSGARD analytics queue. Intermission impression measurement requires the panel to be visible at least 50% for one second, and persistent frequency/exposure analytics is not stored without consent.

The public promo configuration is versioned as schema 2. A legacy server response/configuration is upgraded in the player to include GARD VPN and every-game default for users without an older local preference. Local preferences are also migrated: GARD VPN is added to an existing non-empty service selection while the player's saved frequency choice is preserved; an explicit empty selection (show no services) remains empty. The backend migrator upgrades old PostgreSQL config rows on public/admin reads and writes the schema-2 representation when possible.

## Social sharing and rewards

The post-game reward shelf provides invitation links and platform share links for Telegram, WhatsApp, VK, X and Facebook, with the existing Web Share/clipboard support where available. Invite URLs point to OSGARD game invites and carry attribution, so referrals can be measured on the same domain.

There are two deliberately distinct reward paths:

1. **Community SHARDS:** the player opens a social share flow and can manually confirm that they published the invite. The current local wallet grants at most +50 cosmetic SHARDS per UTC day. This is not cash or a payment, and the platform cannot independently verify that a social post was published; the UI states that manual confirmation is not proof.
2. **Qualified referral reward:** when consent is enabled and Commerce API/referral routes are configured, the server checks registered invitation evidence. Eligible claims require a friend to open the invite and complete a session of at least 30 seconds; the client consumes server-issued claim receipts and acknowledges the accepted codes to prevent repeat claims.

The catalog does not invent verified reposts, paid conversions, sponsor impressions, or revenue. A page-load is not considered a completed game session.

## Deployment notes

The existing direct SSH frontend release workflow packages public/games assets into the normal release archive. The branch also modifies the Commerce API source and tests so the /v1/owned-promo/config route can migrate old database settings. The repository documentation describes Commerce API as a separate Node.js 22 service/container: the frontend release workflow runs its checks but does not itself prove that the live API container was rebuilt/restarted. Therefore a merged frontend deploy can publish the client-side compatibility migration immediately, but server-side admin/config migration requires deploying/restarting the Commerce API from the reviewed source through the existing operator procedure.

## QA

The direct frontend release gate now runs npm run qa:owned-promo-config as well as the existing campaign-manager checks. The owned-promo test checks service allow-list validation, admin controls, public API migration, user-frequency preservation, reduced-motion/mobile CSS and consent-gated measurement. The Commerce API unit suite includes a migration test ensuring old config enables GARD VPN, uses each-session defaults and refuses unknown future schema versions.
