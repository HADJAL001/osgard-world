# OSGARD ecosystem outbound attribution

## Purpose

This change records approved first-party project-link clicks in the OSGARD ecosystem directory. It does not change external links, their UTM parameters, or the visitor's navigation.

## Event and data minimization

When (and only when) the visitor has explicitly set osgard.games.analytics-consent.v1 to yes, clicking a link with class project-link inside one of the ten allow-listed project cards may enqueue one event named cross_promo_clicked through the shared window.OSGARD_CONSENTED_ANALYTICS queue.

The event is limited to:
- random event ID for idempotent processing;
- per-tab session ID;
- event name cross_promo_clicked;
- local source tag ecosystem-<approved-project-id>;
- gameId: unknown (the directory click is not a game session);
- local route path without query parameters;
- duration set to zero.

The event contains no outbound destination URL, UTM parameters, name, email, telephone number, description, or payment data. The click handler does not prevent or delay navigation. Unknown project IDs fail closed.

If consent is absent or denied, this handler does not enqueue an event or create a session identifier. The existing shared analytics queue enforces the same consent setting, bounded local retention, event allow-list, batch limit, server acknowledgement, and clearing pending events after consent withdrawal.

## Delivery status is not the same as an event

The page reads only the public /games/commerce-config.json setting and visibly discloses whether a valid API address is configured. An empty, invalid, unreachable, or unacknowledged backend must not be represented as live server analytics.

At the time this branch was created, public/games/commerce-config.json has an empty apiBaseUrl. Therefore server-side click measurement is not yet live/confirmed. The event may only be retained by the shared client queue if consent is granted; without a valid, reachable Commerce API and an accepted server response, it must not be counted as delivered or as revenue.

## Backend activation checklist

1. Deploy the existing services/osgard-commerce-api through approved private infrastructure.
2. Configure PostgreSQL, test-mode Stripe credentials, webhook signing secret, and test Price IDs through the deployment secret store—not in the repository or public JSON.
3. Keep live payments and OSGARD PREMIUM sales disabled until product terms, fulfilment, cancellation, entitlement and refund handling have been reviewed and tested.
4. Verify API readiness and the private network/reverse proxy; a successful /healthz alone is not enough.
5. Set the public apiBaseUrl only to the verified HTTPS API origin or approved same-origin /commerce-api route.
6. Run npm run qa:ecosystem-directory, npm run qa:ecosystem-clicks, and npm run qa:consented-analytics-queue.
7. Run the production route check after deployment and verify that only consented events with successful backend acknowledgement appear in the protected analytics overview.

## How to validate

- npm run qa:ecosystem-directory checks project links, UTM attribution, responsive/reduced-motion/focus styles, SEO and event contracts.
- npm run qa:ecosystem-clicks runs a VM smoke test covering consent granted/denied, event schema, allow-list rejection, no external URL/PII in the payload, missing analytics queue, and disclosure of an empty API configuration.
- npm run qa:consented-analytics-queue checks the shared queue's offline/online behavior, config allow-list, deduplication and consent withdrawal.

This patch does not connect a live ad network, fabricate impressions/clicks, activate payment collection, or deploy changes to the live website by itself.
