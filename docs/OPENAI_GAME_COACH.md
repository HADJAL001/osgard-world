# OSGARD AI Game Coach — API and release notes
Date: 2026-10-14

## Purpose
Give a player one concise, optional post-session tip in the existing OSGARD Games intermission. It is not an AI chatbot, does not control the game and does not grant rewards. All 11 known Games IDs use a fixed server-side allow-list.

## User flow
1. A genuine game session ends through the existing `player-lifecycle.js` event contract.
2. The existing between-game screen renders the Game Coach card next to the owned-project selector and referral reward.
3. The user ticks a separate, one-request consent checkbox.
4. The browser asks `GET /v1/game-coach/status`. If the server feature is disabled, the UI explains that the session summary was not sent.
5. If enabled, the browser submits only `consent`, `gameId`, locale, duration and a fixed `session_ended` result to `POST /v1/game-coach`.
6. The server validates the allow-list and bounds, constructs its own instructions, calls OpenAI Responses API with strict JSON Schema and `store: false`, validates the output again and returns the four bounded fields.
7. The result lives in the visible page only; OSGARD does not store the advice in a player profile.

## Server configuration
Configure these variables in the **Commerce API service environment**, not in the browser or the static site's build variables:

- `OPENAI_GAME_COACH_ENABLED=true` — explicit feature switch. Without this exact value, the feature is disabled.
- `OPENAI_API_KEY=...` — private API key available only to the server process.
- `OPENAI_GAME_COACH_MODEL=gpt-6-luna` — optional model override. If omitted or malformed, the implementation falls back to `gpt-6-luna`.

Before enabling:
- Set project spend limits/alerts and usage limits in the OpenAI project.
- Verify the server can reach `https://api.openai.com/v1/responses`.
- Check that the deployed Commerce API process receives the environment variables; a frontend redeploy alone does not set secrets.
- Test from a real browser with consent and test the disabled state with the feature flag turned off.

## Security and privacy controls
- Per-request consent is distinct from analytics consent.
- No name, email, auth token, account ID, session ID, referral code or free-form user prompt is accepted into the model payload.
- Request validation limits duration to 4 hours, score to 1 billion and mistake count to 10,000.
- Model is called server-side; key is never served to public JavaScript.
- Endpoint rate limit: 5 requests/hour per client IP (existing express-rate-limit policy).
- Maximum output: 360 tokens. Response is constrained to a strict JSON Schema and all text fields are bounded again by the server.
- Request uses `store: false`; this disables Responses API application-state storage for the response. It does not replace review of OpenAI's current data-processing/retention settings.
- If model/config/network/API/output validation fails, the game still works and no in-game reward or progress is changed.
- No request is made before the player checks consent and presses the button; if status reports disabled, game metrics are not sent.

## Endpoints
- `GET /v1/game-coach/status` → `{ enabled: boolean }` with no-store response caching.
- `POST /v1/game-coach` → `{ advice: { title, observation, tip, challenge } }` or a generic error code without provider error payloads.

## Tests
Run from repository root:

```bash
npm run qa:game-coach
npm run check
npm run build
```

The new test set covers consent, game and metric allow-lists, removal of extra client fields, disabled-by-default behavior, Responses API request shape, secret placement, schema validation, rate limit wiring, browser-side data minimisation and the release gates.

## Limitations
- It is not live until an OpenAI key and server feature flag are configured. CI tests use a fake fetch; they do not spend money or prove access to the production OpenAI account.
- Advice is generated from a minimal event summary, not a complete telemetry stream, so it should never claim to know unprovided mistakes, exact causes or player skill.
- This first version is advice-only. It does not save model context across sessions, send user-created prompts, modify an account, or invoke in-game actions.

## Official OpenAI references
- [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [GPT-6 Luna model and current API pricing](https://developers.openai.com/api/docs/models/gpt-6-luna)
