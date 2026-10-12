# External OSGARD projects — discovery check
**Checked:** 2026-10-13. This is a partial discovery check, not a security certification.

## Check results
The available browser fetch tool returned a `DisabledError` for direct opens of `osgard.world` and all ten provided project domains. This tool result does **not** establish that the domains are down; it means live HTTP status, current page content, TLS behavior and redirects could not be verified through that channel.

A search-index sweep produced limited third-party information:
- `senjorio.com`: ScamAdviser currently raises caution flags and describes the domain as very young; it also reports a valid SSL certificate. This is a low-confidence third-party reputation assessment, not evidence that the project is fraudulent. [Source](https://www.scamadviser.com/check-website/senjorio.com)
- `osgardos.com`: ScamAdviser currently raises caution flags about the very young domain, low visibility and registration characteristics; it reports a valid SSL certificate. This is not proof of wrongdoing. [Source](https://www.scamadviser.com/check-website/osgardos.com)
- `gold-glamour.online`: ScamAdviser gives a stronger warning, says the domain was registered recently and states it could not analyse the site content, while noting a valid SSL certificate. Treat this destination as **hold for manual review before paid traffic or conversion claims**. A reputation score is not a legal finding. [Source](https://www.scamadviser.com/check-website/gold-glamour.online)

The searches did not yield sufficient reliable current page-content evidence for the remaining provided domains to label their operation as independently verified. Their card descriptions in the Games hub are based on the project purposes supplied by the owner, not independently audited claims.

## Manual verification before campaigns
For every domain, confirm:
1. DNS A/AAAA/CNAME and HTTP/HTTPS responses for both apex and `www`.
2. Redirect chain, certificate hostname/expiry, and that the destination is controlled by the owner.
3. Actual landing page, contact/legal pages, current service description and final destination URL.
4. UTM/referral parameter handling, without appending user identifiers or PII.
5. Whether the site may be promoted commercially under the platform's ad-provider rules.

Until this is done, links remain ordinary user-directed external navigation, not verified sponsor destinations. Do not send paid traffic or report campaign conversions based on link presence alone.
