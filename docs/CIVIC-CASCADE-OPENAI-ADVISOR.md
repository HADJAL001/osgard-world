# CIVIC CASCADE — OpenAI Strategy Advisor

## Status
The code path is integrated in CIVIC CASCADE 3.4.0. Actual OpenAI requests remain disabled unless the OSGARD Commerce API service is configured with the feature flag and server key.

## Server configuration
Set these variables in the Commerce API service environment only:

- OPENAI_CIVIC_ADVISOR_ENABLED=true — explicit feature flag.
- OPENAI_API_KEY — private server secret. Never add it to the static site, browser bundle, HTML metadata, or build environment.
- OPENAI_CIVIC_ADVISOR_MODEL=gpt-6.1-sol — optional model override; the server defaults to gpt-6.1-sol if absent or malformed.

A frontend deploy by itself does not set Commerce API secrets or enable the service. Keep project spend limits and usage alerts configured. The endpoint allows at most three requests per IP per hour and uses a 15-second server timeout and 650 output-token cap.

## Request lifecycle
1. The consent checkbox starts unchecked.
2. Checking it triggers only GET /commerce-api/v1/civic-cascade-advisor/status. That status request carries no gameplay data.
3. Only a separate button press after the positive status response sends one allow-listed snapshot to POST /commerce-api/v1/civic-cascade-advisor.
4. Nginx exposes the endpoint under /commerce-api/ and strips that prefix before forwarding to Node; internal service routes remain /v1/.... The server validates scenario and objective enums, release/model version, numeric bounds, six node health values, baseline forecast horizons, no more than three candidates, at most four actions per candidate, resource costs, and all nine unique stress profiles. Unknown client fields and free-form prompts are discarded.
5. The server calls the OpenAI Responses API with strict JSON Schema, store=false, no tools, a fixed output limit and a bounded timeout. It validates the returned object a second time.
6. The answer can recommend only one of the provided candidate ranks or abstain with rank 0. It is rendered via textContent and cannot edit the command queue, alter the game state, award points, or run commands. Consent is cleared after the single request.

## Data minimisation
The request contains a short source-state metrics object, the six node-integrity values, the baseline forecast, and up to three plan candidates with forecasts and nine stress summaries each. It does not contain a player name, email, account identifier, free-form prompt, operation event tape, exported dossier, or browser credentials. No gameplay state is sent while the server feature flag is off. The AI response is not saved to a user profile and no additional telemetry is emitted by this feature.

The deterministic planner, forecast, Pareto portfolio, and SHA-256 dossier verifier remain the source of truth. The stress profiles are controlled synthetic inputs, not weather forecasts or empirically calibrated probabilities. The model output is critique, not proof of causality or an instruction to execute a plan. The dossier hash detects modifications but is not a digital signature.

## Verification commands
Run from the repository root:

- npm run qa:game-coach
- npm run qa:civic-cascade-forecast
- npm run qa:civic-release-contract
- npm run check
- npm run build

These automated tests stub the network call and do not spend OpenAI credits. A passing test proves contract behavior, not that production credentials are configured or the feature is enabled.

## Official OpenAI references
- Responses API: https://developers.openai.com/api/reference/resources/responses/methods/create
- Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Model catalog: https://developers.openai.com/api/docs/models
