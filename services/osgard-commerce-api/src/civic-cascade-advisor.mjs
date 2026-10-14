import { extractResponsesText } from "./game-coach.mjs";

const NODE_IDS = Object.freeze(["hub", "substation", "pump", "bridge", "hospital", "shelter"]);
const ACTIONS = new Set(["pump", "grid", "route", "repair"]);
const OBJECTIVES = new Set(["balanced", "risk", "protect", "conserve"]);
const SCENARIOS = Object.freeze({
  flood: "Подтопление: игровая модель оценивает воду, доступность, снабжение и каскадные последствия.",
  blackout: "Сбой энергосети: игровая модель оценивает сеть, зависимые узлы и каскадные последствия.",
  blockade: "Блокировка доступа: игровая модель оценивает маршруты, снабжение и целостность инфраструктуры.",
});
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{1,80}$/i;
const MODEL_VERSION = "3.3.0";
const PROFILE_META = Object.freeze({
  "water-surge-mild": ["water-surge", "mild"],
  "water-surge-moderate": ["water-surge", "moderate"],
  "water-surge-severe": ["water-surge", "severe"],
  "grid-overload-mild": ["grid-overload", "mild"],
  "grid-overload-moderate": ["grid-overload", "moderate"],
  "grid-overload-severe": ["grid-overload", "severe"],
  "weak-node-shock-mild": ["weak-node-shock", "mild"],
  "weak-node-shock-moderate": ["weak-node-shock", "moderate"],
  "weak-node-shock-severe": ["weak-node-shock", "severe"],
});

export const CIVIC_CASCADE_ADVISOR_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", description: "A concise headline in the requested language." },
    recommendedRank: { type: "integer", minimum: 0, maximum: 3, description: "A supplied candidate rank, or 0 if evidence does not justify a choice." },
    rationale: { type: "string", description: "A concise audit rationale grounded in supplied simulation values." },
    tradeoff: { type: "string", description: "The strongest visible resource and resilience trade-off." },
    riskToWatch: { type: "string", description: "The most important supplied stress result to monitor." },
    validationStep: { type: "string", description: "One bounded experiment within the game simulation." },
    limitations: { type: "string", description: "A clear statement of what the deterministic game model cannot prove." },
  },
  required: ["headline", "recommendedRank", "rationale", "tradeoff", "riskToWatch", "validationStep", "limitations"],
});
const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const allowedNode = value => typeof value === "string" && NODE_IDS.includes(value);

function normalizeForecast(rows) {
  if (!Array.isArray(rows) || rows.length !== 3) return null;
  const result = [];
  for (let index = 0; index < 3; index += 1) {
    const row = rows[index];
    if (!isObject(row) || row.seconds !== [30, 60, 90][index]) return null;
    if (!["water", "grid", "access", "risk", "weakestIntegrity"].every(key => inRange(row[key], 0, 100))) return null;
    if (row.weakestNode != null && !allowedNode(row.weakestNode)) return null;
    if (!Array.isArray(row.criticalNodes) || row.criticalNodes.length > NODE_IDS.length || !row.criticalNodes.every(allowedNode)) return null;
    result.push({
      seconds: row.seconds, water: row.water, grid: row.grid, access: row.access, risk: row.risk,
      weakestNode: row.weakestNode ?? null, weakestIntegrity: row.weakestIntegrity,
      criticalNodes: [...new Set(row.criticalNodes)],
    });
  }
  return result;
}

function normalizeCandidate(candidate) {
  if (!isObject(candidate) || !Number.isInteger(candidate.rank) || candidate.rank < 1 || candidate.rank > 3) return null;
  if (typeof candidate.paretoMember !== "boolean" || !inRange(candidate.resourceCost, 0, 1000) || !inRange(candidate.crewsUsed, 0, NODE_IDS.length)) return null;
  if (!isObject(candidate.scores) || !inRange(candidate.scores.nominal, -100000, 100000) || !inRange(candidate.scores.stressAdjusted, -100000, 100000)) return null;
  if (!Array.isArray(candidate.orders) || candidate.orders.length < 1 || candidate.orders.length > 4) return null;
  const orders = [];
  for (let i = 0; i < candidate.orders.length; i += 1) {
    const order = candidate.orders[i];
    if (!isObject(order) || order.position !== i + 1 || !ACTIONS.has(order.action)) return null;
    if (order.action === "repair" ? !allowedNode(order.nodeId) : order.nodeId !== null) return null;
    orders.push({ position: order.position, action: order.action, nodeId: order.nodeId });
  }
  const forecast = normalizeForecast(candidate.forecast);
  const robustness = candidate.robustness;
  if (!forecast || !isObject(robustness) || robustness.profileCount !== 9 ||
      !Number.isInteger(robustness.stableProfiles) || robustness.stableProfiles < 0 || robustness.stableProfiles > 9 ||
      !inRange(robustness.worstRiskDelta, -100, 100) || !inRange(robustness.worstIntegrityDelta, -100, 100) ||
      !Array.isArray(robustness.profiles) || robustness.profiles.length !== 9) return null;
  const seen = new Set();
  const profiles = [];
  for (const profile of robustness.profiles) {
    if (!isObject(profile) || !Object.hasOwn(PROFILE_META, profile.id) || seen.has(profile.id)) return null;
    const [family, severity] = PROFILE_META[profile.id];
    if (profile.family !== family || profile.severity !== severity ||
        !inRange(profile.riskDelta90, -100, 100) ||
        !inRange(profile.weakestIntegrityDelta, -100, 100) ||
        !Number.isInteger(profile.criticalNodeDelta) ||
        profile.criticalNodeDelta < -NODE_IDS.length || profile.criticalNodeDelta > NODE_IDS.length) return null;
    seen.add(profile.id);
    profiles.push({ id: profile.id, family, severity, riskDelta90: profile.riskDelta90,
      weakestIntegrityDelta: profile.weakestIntegrityDelta, criticalNodeDelta: profile.criticalNodeDelta });
  }
  if (seen.size !== 9) return null;
  return {
    rank: candidate.rank, paretoMember: candidate.paretoMember, resourceCost: candidate.resourceCost,
    crewsUsed: candidate.crewsUsed, scores: { nominal: candidate.scores.nominal, stressAdjusted: candidate.scores.stressAdjusted },
    orders, forecast,
    robustness: {
      profileCount: 9, stableProfiles: robustness.stableProfiles,
      worstRiskDelta: robustness.worstRiskDelta, worstIntegrityDelta: robustness.worstIntegrityDelta,
      profiles: profiles.sort((a, b) => a.id.localeCompare(b.id)),
    },
  };
}

export function validateCivicCascadeAdvisorInput(input) {
  if (!isObject(input)) return { ok: false, status: 400, code: "CIVIC_ADVISOR_INPUT_INVALID" };
  if (input.consent !== true) return { ok: false, status: 400, code: "CIVIC_ADVISOR_CONSENT_REQUIRED" };
  if (!["ru", "en"].includes(input.locale)) return { ok: false, status: 400, code: "CIVIC_ADVISOR_INPUT_INVALID" };
  if (!Object.hasOwn(SCENARIOS, input.scenarioId) || !OBJECTIVES.has(input.objective) || input.modelVersion !== MODEL_VERSION) {
    return { ok: false, status: 400, code: "CIVIC_ADVISOR_INPUT_INVALID" };
  }
  if (!isObject(input.sourceMetrics) || !isObject(input.nodeIntegrity)) return { ok: false, status: 400, code: "CIVIC_ADVISOR_INPUT_INVALID" };
  const bounds = {
    water: [0, 100], grid: [0, 100], access: [0, 100], supplies: [0, 100], crews: [0, NODE_IDS.length],
    riskOffset: [0, 100], waterRate: [-1, 1], gridRate: [-1, 1], accessRate: [-1, 1], actionCount: [0, 1000],
  };
  const sourceMetrics = {};
  for (const key of ["water", "grid", "access", "supplies", "crews"]) {
    if (!inRange(input.sourceMetrics[key], ...bounds[key])) return { ok: false, status: 400, code: "CIVIC_ADVISOR_METRICS_INVALID" };
    sourceMetrics[key] = input.sourceMetrics[key];
  }
  for (const [key, [min, max]] of Object.entries(bounds)) {
    if (Object.hasOwn(sourceMetrics, key)) continue;
    const value = input.sourceMetrics[key];
    if (value == null) continue;
    if (!inRange(value, min, max)) return { ok: false, status: 400, code: "CIVIC_ADVISOR_METRICS_INVALID" };
    sourceMetrics[key] = value;
  }
  const nodeIntegrity = {};
  for (const id of NODE_IDS) {
    if (!inRange(input.nodeIntegrity[id], 0, 100)) return { ok: false, status: 400, code: "CIVIC_ADVISOR_METRICS_INVALID" };
    nodeIntegrity[id] = input.nodeIntegrity[id];
  }
  const baselineForecast = normalizeForecast(input.baselineForecast);
  if (!baselineForecast || !Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 3) {
    return { ok: false, status: 400, code: "CIVIC_ADVISOR_INPUT_INVALID" };
  }
  const candidates = input.candidates.map(normalizeCandidate);
  if (candidates.some(candidate => !candidate) || new Set(candidates.map(candidate => candidate.rank)).size !== candidates.length) {
    return { ok: false, status: 400, code: "CIVIC_ADVISOR_CANDIDATE_INVALID" };
  }
  const data = {
    locale: input.locale, modelVersion: MODEL_VERSION, scenarioId: input.scenarioId,
    scenarioDescription: SCENARIOS[input.scenarioId], objective: input.objective,
    sourceMetrics, nodeIntegrity, baselineForecast, candidates,
    evidenceRules: { stressProfilesAreSynthetic: true, forecastIsApproximate: true, futureRandomIncidentsIncluded: false, aiMayNotExecuteOrders: true },
  };
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > 18000) return { ok: false, status: 413, code: "CIVIC_ADVISOR_INPUT_TOO_LARGE" };
  return { ok: true, data };
}

export function isCivicCascadeAdvisorConfigured(env = process.env) {
  const apiKey = typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  const enabled = env.OPENAI_CIVIC_ADVISOR_ENABLED === "true";
  const model = typeof env.OPENAI_CIVIC_ADVISOR_MODEL === "string" && MODEL_PATTERN.test(env.OPENAI_CIVIC_ADVISOR_MODEL)
    ? env.OPENAI_CIVIC_ADVISOR_MODEL
    : "gpt-6.1-sol";
  return { enabled: enabled && apiKey.length > 0, model, apiKey };
}

export function validateCivicCascadeAdvisorOutput(value, allowedRanks = [1, 2, 3]) {
  if (!isObject(value) || !Number.isInteger(value.recommendedRank) || value.recommendedRank < 0 ||
      value.recommendedRank > 3 || (value.recommendedRank !== 0 && !allowedRanks.includes(value.recommendedRank))) return null;
  const limits = { headline: 100, rationale: 520, tradeoff: 360, riskToWatch: 320, validationStep: 320, limitations: 320 };
  const advice = { recommendedRank: value.recommendedRank };
  for (const [key, maximum] of Object.entries(limits)) {
    if (typeof value[key] !== "string") return null;
    const clean = value[key].trim();
    if (!clean || clean.length > maximum) return null;
    advice[key] = clean;
  }
  return advice;
}

export async function generateCivicCascadeAdvice(input, { env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const checked = validateCivicCascadeAdvisorInput(input);
  if (!checked.ok) return checked;
  const config = isCivicCascadeAdvisorConfigured(env);
  if (!config.enabled) return { ok: false, status: 503, code: "OPENAI_CIVIC_ADVISOR_NOT_CONFIGURED" };
  if (typeof fetchImpl !== "function") return { ok: false, status: 503, code: "OPENAI_CIVIC_ADVISOR_UNAVAILABLE" };
  const systemText = checked.data.locale === "ru"
    ? "Ты — критический аналитик детерминированной игры CIVIC CASCADE. Верни только объект по JSON Schema. Это вымышленная игровая модель, не реальный город и не операционная рекомендация для настоящей инфраструктуры. Сравнивай только переданные кандидаты и поля: риск, целостность слабейшего узла, ресурсы и девять синтетических стресс-профилей. Не выдумывай метрики, причины, вероятности, погоду или результаты, которых нет в JSON. Не создавай новые команды и не проси выполнить действия вне списка. recommendedRank — ранг предоставленного кандидата или 0, если данные не дают оснований выбрать одного лидера. Укажи главный компромисс, худший вид стресса и один небольшой тест внутри симуляции. Не раскрывай скрытые рассуждения; дай краткое объяснение по числам. Пиши естественно на русском."
    : "You are a critical reviewer of the deterministic CIVIC CASCADE game. Return only the object matching the JSON Schema. This is a fictional game model, not a real city or operational advice for real infrastructure. Compare only supplied candidates and fields: risk, weakest-node integrity, resources and nine synthetic stress profiles. Do not invent metrics, causes, probabilities, weather or results absent from the JSON. Do not create new commands or request actions outside the provided list. recommendedRank must be a supplied candidate rank or 0 when the data does not justify a clear choice. State the main trade-off, the worst stress family and one small in-game experiment. Do not reveal hidden reasoning; provide a concise explanation tied to the numbers. Write naturally in English.";
  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model, store: false, max_output_tokens: 650,
        input: [
          { role: "system", content: systemText },
          { role: "user", content: JSON.stringify(checked.data) },
        ],
        text: { format: { type: "json_schema", name: "civic_cascade_strategy_review", strict: true, schema: CIVIC_CASCADE_ADVISOR_OUTPUT_SCHEMA } },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, status: 503, code: "OPENAI_CIVIC_ADVISOR_UNAVAILABLE" };
  }
  if (!response?.ok) return { ok: false, status: 503, code: response?.status === 429 ? "OPENAI_CIVIC_ADVISOR_BUSY" : "OPENAI_CIVIC_ADVISOR_UNAVAILABLE" };
  let payload;
  try { payload = await response.json(); } catch { return { ok: false, status: 502, code: "OPENAI_CIVIC_ADVISOR_BAD_RESPONSE" }; }
  const outputText = extractResponsesText(payload);
  if (!outputText) return { ok: false, status: 502, code: "OPENAI_CIVIC_ADVISOR_EMPTY_RESPONSE" };
  let parsed;
  try { parsed = JSON.parse(outputText); } catch { return { ok: false, status: 502, code: "OPENAI_CIVIC_ADVISOR_BAD_RESPONSE" }; }
  const advice = validateCivicCascadeAdvisorOutput(parsed, checked.data.candidates.map(candidate => candidate.rank));
  if (!advice) return { ok: false, status: 502, code: "OPENAI_CIVIC_ADVISOR_BAD_SCHEMA" };
  return { ok: true, advice };
}
