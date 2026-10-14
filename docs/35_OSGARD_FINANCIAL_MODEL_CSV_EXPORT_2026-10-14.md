# OSGARD WORLD — Financial model CSV export

Date: 2026-10-14
Branch: `feat/osgard-financial-model-csv-export-20261014`

## Change
The existing monetization scenario calculator now exports the same live-on-page assumptions to both JSON and semicolon-delimited CSV for spreadsheet use. CSV contains one header row and three scenario rows (conservative, base and optimistic), including input assumptions, modeled revenue streams, operating costs, net operating result, annual target and calculated starting-traffic requirement.

## Data and privacy
All calculations run in the browser. Export creates a local download only; it does not make a request or transmit user-edited assumptions. The document is UTF-8 with BOM and CRLF line endings, and uses quoted cells. Text cells beginning with spreadsheet formula markers are neutralized; numeric values remain numeric, including a negative modeled operating result.

## Commercial boundaries
CSV labels every metric as an estimate/input. It does not represent measured users, paid conversions, signed sponsor deals, actual ad impressions or actual revenue. Ads and OSGARD PREMIUM remain inactive until their separate release gates and provider configuration pass.

## Validate
```sh
npm run qa:games-model
npm run check
npm run build
```

The CSV contract smoke checks three scenario rows, spreadsheet encoding, formula injection, numeric fidelity, target-traffic inclusion, and the absence of a new analytics/network path.
