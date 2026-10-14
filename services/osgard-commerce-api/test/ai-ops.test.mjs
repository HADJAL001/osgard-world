import test from "node:test";
import assert from "node:assert/strict";
import { buildOpsReviewContext, generateOpsReview } from "../src/ai-ops.mjs";

const readiness = {
  overallStatus: "blocked",
  generatedAt: "2026-10-14T08:00:00Z",
  counts: { ready: 3, blocked: 2, review: 4 },
  checks: [
    { id: "database", label: "База данных", status: "blocked", detail: "postgres://private-user:private-pass@db/private" },
    { id: "ad-network", label: "Рекламная сеть", status: "not_integrated", detail: "private@example.com sk_test_secret" },
    { id: "production-release", label: "Публикация и rollback", status: "review_required" },
  ],
  customerEmail: "private@example.com",
  orderDetails: [{ email: "private@example.com", amount: 12345 }],
};

const validReview = {
  summary: "Сначала устранить блокирующие предпосылки и подтвердить production-сборку.",
  priorities: [
    { id: "stabilize-database", priority: "P0", title: "Проверить готовность базы и миграций", reason: "Статус database указан как blocked, поэтому зависимые операции требуют проверки.", evidenceIds: ["database"], ownerRole: "Engineering", effort: "M", risk: "medium", successMetric: "Тесты API и readiness проходят на подготовленной базе." },
    { id: "hold-ads", priority: "P1", title: "Сохранять рекламу выключенной до интеграции", reason: "Сеть не интегрирована; не объявлять показы и доход.", evidenceIds: ["ad-network"], ownerRole: "Operations", effort: "S", risk: "low", successMetric: "Публичный рекламный слот скрыт без активной подтверждённой кампании." },
    { id: "release-qa", priority: "P1", title: "Завершить post-deploy проверку", reason: "Публикация и rollback требуют ручной проверки.", evidenceIds: ["production-release"], ownerRole: "Engineering", effort: "M", risk: "medium", successMetric: "Production route matrix и ручная проверка завершены." },
  ],
  next7Days: ["Запустить API tests", "Проверить серверные readiness статусы"],
  questionsForOwner: ["Кто отвечает за production release gate?"],
};
const response = (payload, ok = true, status = 200) => ({ ok, status, json: async () => payload });

test("readiness context contains only bounded status metadata, never PII or diagnostics", () => {
  const safe = buildOpsReviewContext(readiness);
  const serialized = JSON.stringify(safe);
  assert.equal(safe.checks.length, 3);
  assert.equal(safe.overallStatus, "blocked");
  assert.doesNotMatch(serialized, /private@example\.com|private-pass|postgres:|sk_test_secret|customerEmail|orderDetails|detail/);
});

test("missing OpenAI key fails closed and does not invoke network", async () => {
  let called = false;
  const result = await generateOpsReview({ apiKey: "", readiness, fetchImpl: async () => { called = true; } });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "AI_OPS_NOT_CONFIGURED");
  assert.equal(called, false);
});

test("successful review uses Responses API, strict schema, store=false and a redacted request", async () => {
  let requestUrl = "";
  let requestOptions;
  const result = await generateOpsReview({
    apiKey: "sk-project-test-key",
    model: "gpt-5-mini",
    readiness,
    now: () => new Date("2026-10-14T10:00:00.000Z"),
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return response({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(validReview) }] }] });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(requestUrl, "https://api.openai.com/v1/responses");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers.Authorization, "Bearer sk-project-test-key");
  const body = JSON.parse(requestOptions.body);
  assert.equal(body.store, false);
  assert.equal(body.model, "gpt-5-mini");
  assert.deepEqual(body.tools, undefined);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.name, "osgard_ops_review");
  assert.equal(body.input.length, 2);
  const serializedInput = JSON.stringify(body.input);
  assert.doesNotMatch(serializedInput, /private@example\.com|private-pass|postgres:|sk_test_secret|orderDetails/);
  assert.equal(result.data.advisoryOnly, true);
  assert.equal(result.data.source.checksReviewed, 3);
  assert.equal(result.data.generatedAt, "2026-10-14T10:00:00.000Z");
  assert.equal(result.data.review.priorities.length, 3);
});

test("unknown evidence references are rejected rather than silently accepted", async () => {
  const bad = structuredClone(validReview);
  bad.priorities[0].evidenceIds = ["made-up-check"];
  const result = await generateOpsReview({ apiKey: "sk-project-test-key", readiness, fetchImpl: async () => response({ status: "completed", output_text: JSON.stringify(bad) }) });
  assert.equal(result.ok, false);
  assert.equal(result.code, "AI_OPS_OUTPUT_INVALID");
});

test("upstream errors do not leak provider response bodies", async () => {
  const result = await generateOpsReview({ apiKey: "sk-project-test-key", readiness, fetchImpl: async () => response({ error: "private provider detail sk-proj-secret" }, false, 401) });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "AI_OPS_CONFIGURATION_ERROR");
  assert.doesNotMatch(JSON.stringify(result), /sk-proj-secret|private provider detail/);
});

test("incomplete model responses fail closed", async () => {
  const result = await generateOpsReview({ apiKey: "sk-project-test-key", readiness, fetchImpl: async () => response({ status: "incomplete", output: [] }) });
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.equal(result.code, "AI_OPS_RESPONSE_INCOMPLETE");
});

test("network failure is mapped to a safe error", async () => {
  const result = await generateOpsReview({ apiKey: "sk-project-test-key", readiness, fetchImpl: async () => { throw new Error("private DNS/system detail"); } });
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.equal(result.code, "AI_OPS_UPSTREAM_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(result), /private DNS|system detail/);
});

test("generated text is bounded before returning to the admin UI", async () => {
  const bad = structuredClone(validReview);
  bad.priorities[0].title = "x".repeat(5000);
  const result = await generateOpsReview({
    apiKey: "sk-project-test-key",
    readiness,
    fetchImpl: async () => response({ status: "completed", output_text: JSON.stringify(bad) }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.review.priorities[0].title.length, 140);
});
