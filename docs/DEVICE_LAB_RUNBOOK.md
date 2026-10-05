# OSGARD Device Lab Runbook

## Automated gate

Run from the portal workspace:

```bash
npm ci
npm run qa:release
```

The gate requests every published route with desktop and mobile user agents, validates the expected HTML shell, and writes `release-readiness.json`.

## Manual viewport pass

Use the same route list from `scripts/production-route-matrix.mjs` at 390px mobile and 1440px desktop. Verify:

- no horizontal scroll;
- primary action remains visible;
- text and controls do not overlap;
- game surfaces remain interactive;
- guest routes do not require authentication to render.

## Evidence

Attach the JSON readiness report and viewport screenshots to the release artifact. The automated gate is necessary but does not claim physical-device coverage; iOS/Android lab execution remains an external release responsibility.
