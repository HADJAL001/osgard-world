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

The intended product roles shown in the report are owner-provided descriptions, not independently verified capabilities. The audit makes one bounded GET request to each homepage. Response bodies are capped at 1 MiB and the stream is cancelled as soon as the cap is crossed. A successful HTTP response that exceeds the cap is reported as `reachable_body_too_large` (not as an outage); an oversized HTTP error remains `http_error`. In either case, title/description metadata is not parsed. The audit does not sign in, submit forms, probe protected APIs, test payments, verify security, or crawl private data. It does not add analytics to visitors' browsers or send secrets.

Homepage checks run daily, manually, and on pull requests that change this audit. External service failures are reported but do not block website deployment. Use `--strict` only in an environment where third-party homepage uptime is deliberately intended to be a release gate.
