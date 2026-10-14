import test from "node:test";
import assert from "node:assert/strict";
import {
  createDailyBudget,
  requestResearchDirector,
  ResearchDirectorError,
  validateResearchDirectorRequest,
  researchDirectorContract,
} from "../src/research-director.mjs";

function makeRun(overrides = {}) {
  return {
    levelId: 1, mode: "campaign", dailyDate: null, status: "lost", reasonCode: "off-track",
    timeSeconds: 5.2, deviceCount: 2, grade: "D", parDevices: 1, parTime: 4.5,
    gateCount: 0, gateOpen: false, expectedCheckpoints: 1, reachedCheckpoints: 0,
    position: { x: 1010, y: 490 }, velocity: { x: 410, y: 80 },
    telemetry: { distance: 620, peakSpeed: 480, lastImpactSpeed: 320, impacts: 2, contacts: 5, activations: 1 },
    devices: [{ type: "spring", x: 500, y: 400, angle: -0.5 }],
    trajectory: [
      { t: 0, x: 90, y: 440, vx: 0, vy: 0, gateOpen: false },
      { t: 1, x: 200, y: 420, vx: 110, vy: -20, gateOpen: false },
      { t: 2.5, x: 550, y: 390, vx: 180, vy: 40, gateOpen: false },
      { t: 5.2, x: 1010, y: 490, vx: 410, vy: 80, gateOpen: false }
    ],
    events: [{ type: "spring", t: 1.1, speed: null }, { type: "fall", t: 5.2, speed: 420 }],
    ...overrides
  };
}
function makeRequest(overrides = {}) {
  return {
    schema: researchDirectorContract.requestSchema,
    consentToOpenAI: true,
    locale: "ru",
    goal: "reliability",
    currentRun: makeRun(),
    priorRuns: [makeRun({ status: "lost", timeSeconds: 5.5 })],
    ...overrides
  };
}
function validOutput(overrides = {}) {
  return {
    status: "recommendation",
    headline: "Проверь один угол перед повторным запуском",
    observations: [
      { evidenceId: "current_status", interpretation: "Текущая попытка не завершилась доставкой." },
      { evidenceId: "trajectory", interpretation: "Последняя выборка показывает уход за пределы трассы." }
    ],
    hypothesis: "Изменение угла пружины может повлиять на выходную траекторию.",
    confidence: "low",
    alternativeExplanation: "Возможен также пропуск контрольной точки.",
    nextExperiment: {
      variable: "device_angle",
      title: "Один угловой шаг",
      steps: ["Сохрани схему как базу.", "Измени только угол пружины на один шаг.", "Повтори тот же протокол."],
      keepConstant: "Оставь позиции, остальные углы и режим прежними.",
      successSignal: "Отследи исход и факт прохождения сканера.",
      stopCondition: "Остановись после трёх сопоставимых повторов или при повреждении груза."
    },
    limitations: "Наблюдение не доказывает причину. Сначала повтори контроль.",
    ...overrides
  };
}
function openAIResponse(result) {
  return {
    ok: true, status: 200,
    async json() { return { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(result) }] }] }; }
  };
}

test("request validation requires consent, schema and a known research goal", () => {
  assert.equal(validateResearchDirectorRequest(makeRequest({ consentToOpenAI: false })).code, "CONSENT_REQUIRED");
  assert.equal(validateResearchDirectorRequest(makeRequest({ schema: "unknown" })).code, "INVALID_SCHEMA");
  assert.equal(validateResearchDirectorRequest(makeRequest({ goal: "rewrite-game-code" })).code, "INVALID_GOAL");
  assert.equal(validateResearchDirectorRequest("not-an-object").code, "INVALID_REQUEST");
});

test("request validation rejects malformed metrics, unapproved devices and mixed scenarios", () => {
  assert.equal(validateResearchDirectorRequest(makeRequest({ currentRun: makeRun({ levelId: 99 }) })).code, "INVALID_CURRENT_RUN");
  assert.equal(validateResearchDirectorRequest(makeRequest({
    priorRuns: [makeRun({ levelId: 2 })]
  })).code, "MIXED_SCENARIOS");
  assert.equal(validateResearchDirectorRequest(makeRequest({
    priorRuns: [makeRun({ mode: "daily", dailyDate: "2026-10-14" })]
  })).code, "MIXED_SCENARIOS");
  assert.equal(validateResearchDirectorRequest(makeRequest({
    currentRun: makeRun({ devices: [{ type: "admin-tool", x: 1, y: 2, angle: 0 }] })
  })).code, "INVALID_CURRENT_RUN");
});

test("normalized context contains no user identifiers, notes, run IDs or free-form event labels", () => {
  const input = makeRequest({
    name: "private-person", email: "person@example.com",
    note: "Never send this note",
    currentRun: { ...makeRun(), id: "secret-run-id", at: "2026-10-14T11:00:00Z", privateNote: "sensitive" }
  });
  const checked = validateResearchDirectorRequest(input);
  assert.equal(checked.ok, true);
  const serialized = JSON.stringify(checked.value);
  for (const secret of ["private-person", "person@example.com", "Never send this note", "secret-run-id", "sensitive"]) {
    assert.equal(serialized.includes(secret), false, "private field leaked: " + secret);
  }
  assert.deepEqual(checked.value.availableVariables, ["repeat_control", "device_position", "device_angle", "device_count"]);
  assert.ok(checked.value.evidenceIds.includes("recent_history"));
});

test("daily challenges must compare only with the same date", () => {
  const currentRun = makeRun({ mode: "daily", dailyDate: "2026-10-14" });
  const previous = makeRun({ mode: "daily", dailyDate: "2026-10-13" });
  assert.equal(validateResearchDirectorRequest(makeRequest({ currentRun, priorRuns: [previous] })).code, "MIXED_SCENARIOS");
});

test("OpenAI Responses request uses strict JSON Schema, store:false and bounded context", async () => {
  let captured;
  const report = await requestResearchDirector(makeRequest(), {
    apiKey: "sk-test-key-long-enough-for-validation",
    model: "gpt-6-luna",
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return openAIResponse(validOutput());
    }
  });
  assert.equal(report.model, "gpt-6-luna");
  assert.equal(report.result.schema, researchDirectorContract.responseSchema);
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  assert.equal(captured.options.method, "POST");
  assert.match(captured.options.headers.Authorization, /^Bearer sk-test-/);
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.max_output_tokens, 850);
  assert.equal(captured.body.text.format.type, "json_schema");
  assert.equal(captured.body.text.format.strict, true);
  assert.equal(captured.body.text.format.schema.additionalProperties, false);
  assert.ok(captured.body.input.length < 12000);
  assert.equal(captured.body.input.includes("person@example.com"), false);
  assert.equal(captured.body.input.includes("privateNote"), false);
});

test("model recommendations may cite only actual evidence and available controls", async () => {
  await assert.rejects(
    requestResearchDirector(makeRequest(), {
      apiKey: "sk-test-key-long-enough-for-validation",
      fetchImpl: async () => openAIResponse(validOutput({
        observations: [{ evidenceId: "unobserved_sensor", interpretation: "Вымышленное измерение." }]
      }))
    }),
    error => error instanceof ResearchDirectorError && error.code === "AI_OUTPUT_FAILED_VALIDATION"
  );
  await assert.rejects(
    requestResearchDirector(makeRequest({ priorRuns: [], currentRun: makeRun({ devices: [{ type: "spring", x: 2, y: 3, angle: 0 }] }) }), {
      apiKey: "sk-test-key-long-enough-for-validation",
      fetchImpl: async () => openAIResponse(validOutput({
        nextExperiment: { ...validOutput().nextExperiment, variable: "switch_alignment" }
      }))
    }),
    error => error instanceof ResearchDirectorError && error.code === "AI_OUTPUT_FAILED_VALIDATION"
  );
});

test("provider throttling, refusal, incomplete output and invalid keys fail closed", async () => {
  await assert.rejects(requestResearchDirector(makeRequest(), { apiKey: "", fetchImpl: async () => openAIResponse(validOutput()) }),
    error => error.code === "AI_ADVISOR_NOT_CONFIGURED");
  await assert.rejects(requestResearchDirector(makeRequest(), {
    apiKey: "sk-test-key-long-enough-for-validation",
    fetchImpl: async () => ({ ok: false, status: 429 })
  }), error => error.code === "AI_PROVIDER_RATE_LIMIT" && error.status === 429);
  await assert.rejects(requestResearchDirector(makeRequest(), {
    apiKey: "sk-test-key-long-enough-for-validation",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: "incomplete", output: [] }) })
  }), error => error.code === "AI_RESPONSE_INCOMPLETE");
  await assert.rejects(requestResearchDirector(makeRequest(), {
    apiKey: "sk-test-key-long-enough-for-validation",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }) })
  }), error => error.code === "AI_RESPONSE_REFUSED");
});

test("daily request budget limits both concurrent requests and total attempts, then resets at UTC day", () => {
  let now = Date.parse("2026-10-14T23:59:00Z");
  const budget = createDailyBudget({ limit: 2, maxConcurrent: 1, now: () => now });
  const first = budget.acquire();
  assert.ok(first);
  assert.equal(budget.acquire(), null, "concurrent request must be blocked");
  first.release();
  const second = budget.acquire();
  assert.ok(second);
  second.release();
  assert.equal(budget.acquire(), null, "daily call cap must be enforced");
  now += 120000;
  const afterReset = budget.acquire();
  assert.ok(afterReset, "daily budget must reset at UTC day boundary");
  afterReset.release();
  assert.equal(budget.snapshot().used, 1);
});

test("output schema exposes no tools and only one next experiment", () => {
  assert.equal(researchDirectorContract.responseJsonSchema.additionalProperties, false);
  assert.deepEqual(researchDirectorContract.supportedVariables, [
    "repeat_control", "device_position", "device_angle", "device_count", "switch_alignment", "checkpoint_alignment"
  ]);
});
