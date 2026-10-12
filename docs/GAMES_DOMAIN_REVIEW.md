# OSGARD ecosystem — outbound-domain review

**Checked:** 13 October 2026  
**Scope:** link inventory and discoverability, not a penetration test, certificate audit or legal review.

## Important limitation

Direct website retrieval was blocked by the research environment (DisabledError). Exact-domain search queries produced no authoritative results for most supplied domains. Therefore this review does **not** mark the URLs “available,” “safe,” or “verified.” Links below were supplied by the owner; catalogue descriptions are attributed to owner-provided information unless otherwise stated.

## Domain-by-domain inventory

| Project | URL | Intended purpose in the catalogue | Evidence / status |
|---|---|---|---|
| OSGARD BEW WORLD | https://osgardbewworld.com/ | Digital products and app development | Supplied project description; primary site content not independently retrieved |
| O2 SYSTEM | https://o2system.art/ | Cash/accounting system for exchange offices | Supplied project description; primary site content not independently retrieved |
| SENJORIO | https://senjorio.com/ | Premium taxi | Supplied purpose is taxi. A third-party search result identifies a taxi page in Makhachkala and separately gives low-confidence trust warnings; this is not proof of misconduct or proof that the website is safe |
| SUPER DAY | https://superday.run/ | Smart map and day planner | Supplied project description; exact-domain result not confirmed (search results for similarly named unrelated products must not be substituted) |
| MARCOSA | https://marcosa.club/ | Premium social network | Supplied project description; primary site content not independently retrieved |
| MYOSA | https://myosa.world/ | AI platform | Supplied project description; primary site content not independently retrieved; similarly named products on other domains are not evidence for this URL |
| GOLD GLAMOUR | https://gold-glamour.online/ | Premium gold and mobile services | Supplied project description. A third-party checker flagged the domain with a very low trust score and said it could not analyse its content. Treat as a **pre-promotion review gate**, not as a proven finding of fraud |
| GARD VPN | https://gardvpn.is/ | VPN service | Supplied project description; primary site content not independently retrieved |
| OSGARD OS | https://osgardos.com/ | Business development | Supplied project description. A third-party checker currently reports a very low trust score and a relatively young domain; these are heuristic risk signals, not proof of malicious behaviour |
| VANGUARD STUDIO | https://osgardvanguard.studio/ | Video creation | Supplied project description; primary site content not independently retrieved |

Third-party pages used only as cautionary signals:
- [ScamAdviser: senjorio.com](https://www.scamadviser.com/check-website/senjorio.com) — its crawl reports a recent registration / low-trust indicators.
- [ScamAdviser: gold-glamour.online](https://www.scamadviser.com/check-website/gold-glamour.online) — its crawl flags a low trust score and says it could not analyse the content.
- [ScamAdviser: osgardos.com](https://www.scamadviser.com/check-website/osgardos.com) — its crawl flags low-trust indicators and a recent registration.

A reputation score is an automated heuristic. It can produce false positives for new, small or privacy-protected sites; it should trigger verification rather than a definitive public accusation.

## Checks required before a paid campaign or high-trust flow

1. Open every exact HTTPS URL from a clean desktop and mobile browser; verify certificate validity, final redirect, canonical hostname and absence of browser warnings.
2. Confirm domain control through the owner’s DNS registrar or hosting account. Add a documented contact, privacy policy and terms to each project where required.
3. Test all main calls to action and expected task flows. Confirm that links do not redirect to unrelated brands, parked pages or unexpected downloads.
4. Run a security/header check, inspect third-party scripts and review consent/cookie behaviour. Do not embed partner scripts in a game until provider approval and policy requirements are understood.
5. For SENJORIO, GOLD GLAMOUR and OSGARD OS, resolve the third-party reputation flags before directing paid acquisition there. Verify ownership, service content and customer support details first.
6. Keep UTM parameters for attribution but never put personal data, email addresses, session tokens or account identifiers in query strings.
7. Recheck target domains and record timestamp/status before each campaign; external websites can change independently of this repository.

The new Games hub intentionally displays the supplied first-party projects with clear descriptions and tagged outbound URLs. It does not claim that this review proved those external services available or safe.
