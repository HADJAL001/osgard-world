# OSGARD external project homepage audit

## Purpose

This scheduled/manual check tests the ten official HTTPS homepage URLs listed for the OSGARD ecosystem. It records the response code, redirect destination, content type, response time, HTML title, and meta description where available. A GitHub Actions artifact stores the timestamped JSON report; the workflow summary provides a compact view.

## What a result means

- `reachable`: final HTTP response is 2xx/3xx and contains HTML with a title.
- `reachable_no_title`: final HTTP response is 2xx/3xx and contains HTML, but no document title was found.
- `reachable_non_html`: final HTTP response is 2xx/3xx but is not HTML.
- `http_error`: final HTTP response is outside 2xx/3xx.
- `network_error`: DNS, TLS, connection, or another request error prevented a response.
- `timeout`: request exceeded the configured timeout.

A HTTP 403 or a network error from one CI region does not prove that a service is unavailable to every visitor. The report preserves the exact status/error and timestamp so it can be checked again from another region.

## Boundaries

The intended product roles shown in the report are owner-provided descriptions, not independently verified capabilities. The audit makes one GET request to each homepage. It does not sign in, submit forms, probe protected APIs, test payments, verify security, or crawl private data. It does not add analytics to visitors' browsers or send secrets.

Homepage checks run daily, manually, and on pull requests that change this audit. External service failures are reported but do not block website deployment. Use `--strict` only in an environment where third-party homepage uptime is deliberately intended to be a release gate.

## Promotion preflight added — 14 October 2026

The scheduled homepage audit now also emits a conservative paid-promotion gate for each destination.

- `manual_review_required` means the final URL responded over HTTPS on the expected hostname (the only hostname alias allowed automatically is `www`), but the owner must still review page purpose, identity, terms, privacy, browser warnings and the primary action.
- `blocked_redirect_host_mismatch` means the final hostname differs from the owner-listed hostname. Treat it as a stop signal until the redirect chain and domain control are explained.
- `blocked_https_downgrade`, `blocked_http_status`, `blocked_no_response` and `blocked_invalid_final_url` indicate that the automated preflight cannot support paid promotion.
- The report schema is now version 2 and includes gate counts plus a reason on every project result. A successful homepage HTTP response is deliberately never called “approved”; `paidPromotionEligibleCount` remains zero in this automated report.

This is an audit/reporting safeguard. It does not itself pause a campaign in an ad network; no live ad network is currently represented as connected. An operator must review the report before activating paid promotion. The owner-listed organic directory links remain available. In particular, keep the prior caution for SENJORIO and GOLD GLAMOUR until domain control, content, terms and the main user flow have been manually reviewed.

The contract test covers same-host HTTPS responses, the www alias, an unexpected cross-host redirect, an HTTPS downgrade, HTTP failure, network error, timeout, report counts and the “never auto-approve” rule. Run it with:

```sh
node scripts/external-project-healthcheck-smoke.mjs
npm run qa:external-project-healthcheck
```

## Publication-linked verification — 14 October 2026

This audit has been attached to the OSGARD publication review so that changing this file runs the existing pull-request homepage check. Use the resulting timestamped GitHub Actions artifact for the actual HTTP statuses and redirect destinations. A report from this one CI region is a reachability snapshot only; it does not confirm login, API health, product function, ownership, legal compliance, or suitability for paid promotion. Keep paid promotion blocked pending manual review even if every homepage returns 2xx/3xx.

## Owner-requested network re-check — 15 October 2026

PR #480 updates this audit document so the existing GitHub Actions homepage-check workflow runs against all ten owner-listed HTTPS destinations. Use the timestamped workflow artifact for measured HTTP status, final redirect URL/host, content type, timing and page-title result. Do not infer a successful service or paid-promotion approval solely from a homepage response.

The browser fetch in the implementation session could not retrieve the exact public URLs (the tool returned inaccessible/Cache miss). Those responses are an inspection limitation, not evidence of downtime. The network-enabled workflow is the appropriate next measurement. If its run is also blocked by transient DNS/TLS/network errors, record the result as inconclusive and repeat from an independent network.

The automatic promotion gate remains fail-closed: even a same-host HTTPS response means manual review is required. No paid campaigns, advertising SDKs or payment processing are activated by this re-check.

## Measured CI homepage snapshot — 14 October 2026 22:15 UTC

Workflow: https://github.com/HADJAL001/osgard-world/actions/runs/38646379488

- 9/10 owner-listed HTTPS homepages returned HTTP 200 from the GitHub Actions runner.
- `osgardbewworld.com`: `network_error / blocked_no_response`, error text `fetch failed`; an independent retry or network is required before treating this as a reachable destination.
- `o2system.art`, `senjorio.com`, `superday.run`, `marcosa.club`, `myosa.world`, `gold-glamour.online`, `gardvpn.is`, `osgardos.com`, and `osgardvanguard.studio`: HTTP 200 on that run.
- Paid-promotion eligibility: **0/10**. One destination is blocked for no response; the other nine remain `manual_review_required`.

This is a timestamped reachability snapshot, not a test of product functions, checkout, domain ownership, security, legal compliance or advertising approval. Re-run the workflow before a campaign and complete the existing human-review gate for each destination.

