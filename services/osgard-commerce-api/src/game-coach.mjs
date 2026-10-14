const GAME_TITLES = Object.freeze({
  "null-shift": "NULL//SHIFT",
  time: "Империя времени",
  swarm: "SWARM",
  inherit: "INHERIT",
  remix: "REMIX",
  "civic-cascade": "CIVIC CASCADE",
  patina: "PATINA Atelier",
  "signal-run": "SIGNAL RUN",
  "cascade-lab": "CASCADE LAB",
  "afterimage-run": "AFTERIMAGE//RUN",
  "aether-grid": "AETHER GRID",
});

const RESULTS = new Set(["session_ended", "won", "lost", "unknown", "simulation_sweep"]);
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{1,80}$/i;

export const GAME_COACH_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "A short heading in the requested language." },
    observation: { type: "string", description: "A cautious observation grounded only in the supplied metrics." },
    tip: { type: "string", description: "One practical, non-monetized gameplay tip." },
    challenge: { type: "string", description: "One optional next-run experiment the player can try." },
  },
  required: ["title", "observation", "tip", "challenge"],
});

function boundedInteger(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

const CASCADE_LAB_DEVICES = new Set(["spring", "fan", "belt", "magnet", "switch", "bumper"]);
const CASCADE_LAB_LEVELS = Object.freeze({
  1: { title: "Первый каскад", capacity: 3 },
  2: { title: "Второй этаж", capacity: 3 },
  3: { title: "Магнитная аномалия", capacity: 4 },
  4: { title: "Красный шлюз", capacity: 4 },
  5: { title: "Хрупкий груз", capacity: 5 },
});

function finiteNumberInRange(value, minimum, maximum) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
function exactKeys(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.has(key));
}
function validateCascadeLabSimulationSweep(raw) {
  const rootKeys = new Set(["engineVersion", "levelId", "deviceType", "changedVariable", "stepDegrees", "controlIdentical", "baseline", "variants"]);
  if (!exactKeys(raw, rootKeys) || JSON.stringify(raw).length > 10_000) {
    return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_INVALID" };
  }
  const levelId = raw.levelId;
  const level = CASCADE_LAB_LEVELS[levelId];
  if (raw.engineVersion !== "0.26.0" || !level ||
      typeof raw.deviceType !== "string" || !CASCADE_LAB_DEVICES.has(raw.deviceType) ||
      raw.changedVariable !== "angle-degrees" ||
      !boundedInteger(raw.stepDegrees, 1, 15) ||
      typeof raw.controlIdentical !== "boolean") {
    return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_INVALID" };
  }
  const runKeys = new Set(["status", "timeSeconds", "deviceCount", "peakSpeed", "distance"]);
  const baseline = raw.baseline;
  if (!exactKeys(baseline, runKeys) ||
      !["won", "lost"].includes(baseline.status) ||
      !finiteNumberInRange(baseline.timeSeconds, 0, 28) ||
      !boundedInteger(baseline.deviceCount, 1, level.capacity) ||
      !finiteNumberInRange(baseline.peakSpeed, 0, 2_000) ||
      !finiteNumberInRange(baseline.distance, 0, 100_000)) {
    return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_INVALID" };
  }
  if (!Array.isArray(raw.variants) || raw.variants.length !== 5) {
    return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_INVALID" };
  }
  const expectedOffsets = [-2, -1, 0, 1, 2].map(multiplier => multiplier * raw.stepDegrees);
  const variantKeys = new Set(["offsetDegrees", "status", "timeSeconds", "deviceCount", "peakSpeed", "distance", "meanDeviationPixels"]);
  const variants = [];
  for (let index = 0; index < raw.variants.length; index++) {
    const variant = raw.variants[index];
    if (!exactKeys(variant, variantKeys) ||
        variant.offsetDegrees !== expectedOffsets[index] ||
        !["won", "lost"].includes(variant.status) ||
        !finiteNumberInRange(variant.timeSeconds, 0, 28) ||
        !boundedInteger(variant.deviceCount, 1, level.capacity) ||
        !finiteNumberInRange(variant.peakSpeed, 0, 2_000) ||
        !finiteNumberInRange(variant.distance, 0, 100_000) ||
        !(variant.meanDeviationPixels === null || finiteNumberInRange(variant.meanDeviationPixels, 0, 2_000))) {
      return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_INVALID" };
    }
    variants.push({
      offsetDegrees: variant.offsetDegrees,
      status: variant.status,
      timeSeconds: variant.timeSeconds,
      deviceCount: variant.deviceCount,
      peakSpeed: variant.peakSpeed,
      distance: variant.distance,
      meanDeviationPixels: variant.meanDeviationPixels,
    });
  }
  return {
    ok: true,
    experiment: {
      engineVersion: "0.26.0",
      protocolId: levelId,
      protocolTitle: level.title,
      changedDeviceType: raw.deviceType,
      changedVariable: "angle-degrees",
      stepDegrees: raw.stepDegrees,
      controlIdentical: raw.controlIdentical,
      baseline: {
        status: baseline.status,
        timeSeconds: baseline.timeSeconds,
        deviceCount: baseline.deviceCount,
        peakSpeed: baseline.peakSpeed,
        distance: baseline.distance,
      },
      variants,
      successfulCases: variants.filter(item => item.status === "won").length,
      caseCount: variants.length,
      medianTimeSeconds: [...variants].map(item => item.timeSeconds).sort((a, b) => a - b)[2],
      timeSpreadSeconds: Math.max(...variants.map(item => item.timeSeconds)) - Math.min(...variants.map(item => item.timeSeconds)),
    },
  };
}

export function validateGameCoachInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, code: "GAME_COACH_INPUT_INVALID" };
  }
  if (input.consent !== true) {
    return { ok: false, status: 400, code: "GAME_COACH_CONSENT_REQUIRED" };
  }

  const gameId = typeof input.gameId === "string" ? input.gameId.trim().toLowerCase() : "";
  if (!Object.hasOwn(GAME_TITLES, gameId)) {
    return { ok: false, status: 400, code: "GAME_COACH_GAME_ID_INVALID" };
  }
  if (input.locale !== "ru" && input.locale !== "en") {
    return { ok: false, status: 400, code: "GAME_COACH_LOCALE_INVALID" };
  }
  const result = input.result === undefined ? "session_ended" : input.result;
  if (!RESULTS.has(result)) {
    return { ok: false, status: 400, code: "GAME_COACH_RESULT_INVALID" };
  }
  if (result === "simulation_sweep") {
    if (gameId !== "cascade-lab") {
      return { ok: false, status: 400, code: "GAME_COACH_EXPERIMENT_GAME_INVALID" };
    }
    const checkedExperiment = validateCascadeLabSimulationSweep(input.experiment);
    if (!checkedExperiment.ok) return checkedExperiment;
    return {
      ok: true,
      data: {
        gameId,
        gameTitle: GAME_TITLES[gameId],
        locale: input.locale,
        result,
        experiment: checkedExperiment.experiment,
      },
    };
  }
  if (!boundedInteger(input.durationSeconds, 0, 14_400)) {
    return { ok: false, status: 400, code: "GAME_COACH_METRICS_INVALID" };
  }
  if (input.score !== undefined && input.score !== null && !boundedInteger(input.score, 0, 1_000_000_000)) {
    return { ok: false, status: 400, code: "GAME_COACH_METRICS_INVALID" };
  }
  if (input.mistakes !== undefined && input.mistakes !== null && !boundedInteger(input.mistakes, 0, 10_000)) {
    return { ok: false, status: 400, code: "GAME_COACH_METRICS_INVALID" };
  }

  // Only this fixed allow-list is ever passed to the model. Extra client fields,
  // names, free-form prompts, URLs, referral codes and account identifiers are discarded.
  return {
    ok: true,
    data: {
      gameId,
      gameTitle: GAME_TITLES[gameId],
      locale: input.locale,
      durationSeconds: input.durationSeconds,
      result,
      ...(input.score == null ? {} : { score: input.score }),
      ...(input.mistakes == null ? {} : { mistakes: input.mistakes }),
    },
  };
}

export function isGameCoachConfigured(env = process.env) {
  const key = typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  const enabled = env.OPENAI_GAME_COACH_ENABLED === "true";
  const model = typeof env.OPENAI_GAME_COACH_MODEL === "string" && MODEL_PATTERN.test(env.OPENAI_GAME_COACH_MODEL)
    ? env.OPENAI_GAME_COACH_MODEL
    : "gpt-6-luna";
  return { enabled: enabled && key.length > 0, model, apiKey: key };
}

export function extractResponsesText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part?.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export function validateGameCoachOutput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const limits = { title: 90, observation: 260, tip: 320, challenge: 200 };
  const result = {};
  for (const [key, maximum] of Object.entries(limits)) {
    if (typeof value[key] !== "string") return null;
    const text = value[key].trim();
    if (!text || text.length > maximum) return null;
    result[key] = text;
  }
  return result;
}

export async function generateGameCoachAdvice(input, {
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12_000,
} = {}) {
  const checked = validateGameCoachInput(input);
  if (!checked.ok) return checked;

  const configuration = isGameCoachConfigured(env);
  if (!configuration.enabled) {
    return { ok: false, status: 503, code: "OPENAI_GAME_COACH_NOT_CONFIGURED" };
  }
  if (typeof fetchImpl !== "function") {
    return { ok: false, status: 503, code: "OPENAI_GAME_COACH_UNAVAILABLE" };
  }

  const { gameTitle, locale, ...metrics } = checked.data;
  const isSimulationSweep = metrics.result === "simulation_sweep";
  const systemText = isSimulationSweep
    ? locale === "ru"
      ? "Ты — осторожный аналитик физических экспериментов CASCADE LAB. Разбирай только проверенную ниже сводку пяти конечных симуляций. Это игровая модель, не реальный инженерный симулятор. Если controlIdentical=false, не интерпретируй различия вариантов как надёжный сигнал: прямо объясни, что детерминизм контроля не подтверждён, и предложи сначала устранить расхождение. Если контроль совпал, можешь описать наблюдаемую чувствительность к одному углу устройства, но пять вариантов не доказывают причинность, не оценивают реальную надёжность и не гарантируют оптимум. Не выдумывай измерения и не назначай оптимальный угол, если сводка этого не подтверждает. Дай короткий заголовок, осторожное наблюдение, один следующий проверяемый шаг и одно дополнительное упражнение. Не предлагай оплату, рекламу, денежные награды или отправку новых данных. Верни строго JSON по переданной схеме на русском."
      : "You are a cautious analyst of CASCADE LAB physics experiments. Interpret only the validated summary of five finite simulation runs. This is an in-game model, not a real engineering simulator. If controlIdentical=false, do not interpret variant differences as a reliable signal: explicitly state that repeatability was not confirmed and recommend resolving that first. If the control matches, you may describe observed sensitivity to one device angle, but five variants do not prove causality, estimate real-world reliability, or guarantee an optimum. Do not invent measurements or nominate an optimal angle unless the summary supports it. Give a short title, cautious observation, one next verifiable step and one optional follow-up exercise. No purchases, ads, cash rewards or requests to upload more data. Return strict JSON matching the provided schema in English."
    : locale === "ru"
      ? "Ты — короткий игровой тренер OSGARD PLAY. Верни только объект, соответствующий JSON Schema. Дай один выполнимый совет, без оплаты, рекламы, обещаний награды или выдуманной механики. Не делай выводов о навыках человека и не утверждай, что метрики показывают то, чего они не измеряют. Если счёт или ошибки не переданы, не выдумывай их. observation — осторожное описание того, что известно; tip — один конкретный совет; challenge — одно необязательное упражнение на следующую сессию. Пиши естественно и кратко на русском."
      : "You are a concise OSGARD PLAY game coach. Return only the object matching the JSON Schema. Give one actionable gameplay tip, with no purchases, advertising, reward promises, or invented mechanics. Do not infer a person's ability and do not claim the metrics show what they do not measure. If score or mistakes are not provided, do not invent them. observation must be cautious, tip must be one practical action, and challenge must be one optional experiment for the next session. Keep it short and write naturally in English.";
  const userText = JSON.stringify({ game: gameTitle, ...metrics });

  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + configuration.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: configuration.model,
        store: false,
        max_output_tokens: 360,
        input: [
          { role: "system", content: systemText },
          { role: "user", content: userText },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "osgard_game_coach",
            strict: true,
            schema: GAME_COACH_OUTPUT_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, status: 503, code: "OPENAI_GAME_COACH_UNAVAILABLE" };
  }

  if (!response?.ok) {
    // Keep provider error details out of public responses and server logs.
    return { ok: false, status: 503, code: response?.status === 429 ? "OPENAI_GAME_COACH_BUSY" : "OPENAI_GAME_COACH_UNAVAILABLE" };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, status: 502, code: "OPENAI_GAME_COACH_BAD_RESPONSE" };
  }
  const outputText = extractResponsesText(payload);
  if (!outputText) return { ok: false, status: 502, code: "OPENAI_GAME_COACH_EMPTY_RESPONSE" };

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return { ok: false, status: 502, code: "OPENAI_GAME_COACH_BAD_RESPONSE" };
  }
  const advice = validateGameCoachOutput(parsed);
  if (!advice) return { ok: false, status: 502, code: "OPENAI_GAME_COACH_BAD_SCHEMA" };
  return { ok: true, advice };
}
