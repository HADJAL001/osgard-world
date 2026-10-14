const ALLOWED_STATUSES = new Set(["ready", "test_only", "blocked", "review_required", "not_integrated", "armed"]);
const ALLOWED_PRIORITIES = new Set(["P0", "P1", "P2"]);
const ALLOWED_ROLES = new Set(["Engineering", "Product", "Security", "Growth", "Operations", "Owner"]);
const ALLOWED_EFFORT = new Set(["S", "M", "L"]);
const ALLOWED_RISK = new Set(["low", "medium", "high"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    priorities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          priority: { type: "string", enum: ["P0", "P1", "P2"] },
          title: { type: "string" },
          reason: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
          ownerRole: { type: "string", enum: ["Engineering", "Product", "Security", "Growth", "Operations", "Owner"] },
          effort: { type: "string", enum: ["S", "M", "L"] },
          risk: { type: "string", enum: ["low", "medium", "high"] },
          successMetric: { type: "string" },
        },
        required: ["id", "priority", "title", "reason", "evidenceIds", "ownerRole", "effort", "risk", "successMetric"],
      },
    },
    next7Days: { type: "array", items: { type: "string" } },
    questionsForOwner: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "priorities", "next7Days", "questionsForOwner"],
};

function cleanText(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(10000, Math.floor(number))) : 0;
}

/** Send only server-computed operational states, never customer/order/event records. */
export function buildOpsReviewContext(readiness) {
  const report = readiness && typeof readiness === "object" ? readiness : {};
  const overallStatus = ALLOWED_STATUSES.has(report.overallStatus) ? report.overallStatus : "review_required";
  const rawChecks = Array.isArray(report.checks) ? report.checks : [];
  const checks = [];
  const seen = new Set();
  for (const item of rawChecks.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const id = cleanText(item.id, 64);
    if (!ID_PATTERN.test(id) || seen.has(id)) continue;
    const status = ALLOWED_STATUSES.has(item.status) ? item.status : "review_required";
    const label = cleanText(item.label, 100);
    if (!label) continue;
    seen.add(id);
    checks.push({ id, label, status });
  }
  const rawCounts = report.counts && typeof report.counts === "object" ? report.counts : {};
  return {
    schemaVersion: 1,
    overallStatus,
    counts: {
      ready: safeCount(rawCounts.ready),
      blocked: safeCount(rawCounts.blocked),
      review: safeCount(rawCounts.review),
    },
    checks,
  };
}

function boundedString(value, max, field) {
  const result = cleanText(value, max);
  if (!result) throw new Error("AI_OPS_OUTPUT_INVALID_" + field.toUpperCase());
  return result;
}

function validateReview(value, allowedEvidenceIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI_OPS_OUTPUT_INVALID");
  const summary = boundedString(value.summary, 700, "summary");
  if (!Array.isArray(value.priorities) || value.priorities.length < 1 || value.priorities.length > 5) {
    throw new Error("AI_OPS_OUTPUT_INVALID_PRIORITIES");
  }
  const ids = new Set();
  const priorities = value.priorities.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("AI_OPS_OUTPUT_INVALID_PRIORITY");
    const id = cleanText(item.id, 64);
    if (!ID_PATTERN.test(id) || ids.has(id)) throw new Error("AI_OPS_OUTPUT_INVALID_PRIORITY_ID");
    ids.add(id);
    if (!ALLOWED_PRIORITIES.has(item.priority) || !ALLOWED_ROLES.has(item.ownerRole) ||
      !ALLOWED_EFFORT.has(item.effort) || !ALLOWED_RISK.has(item.risk)) {
      throw new Error("AI_OPS_OUTPUT_INVALID_PRIORITY_ENUM");
    }
    if (!Array.isArray(item.evidenceIds) || item.evidenceIds.length < 1 || item.evidenceIds.length > 5) {
      throw new Error("AI_OPS_OUTPUT_INVALID_EVIDENCE");
    }
    const evidenceIds = item.evidenceIds.map((entry) => cleanText(entry, 64));
    if (evidenceIds.some((entry) => !allowedEvidenceIds.has(entry))) throw new Error("AI_OPS_OUTPUT_UNKNOWN_EVIDENCE");
    return {
      id,
      priority: item.priority,
      title: boundedString(item.title, 140, "title"),
      reason: boundedString(item.reason, 500, "reason"),
      evidenceIds: [...new Set(evidenceIds)],
      ownerRole: item.ownerRole,
      effort: item.effort,
      risk: item.risk,
      successMetric: boundedString(item.successMetric, 240, "metric"),
    };
  });
  const boundedList = (input, maxItems, maxLength, field) => {
    if (!Array.isArray(input) || input.length > maxItems) throw new Error("AI_OPS_OUTPUT_INVALID_" + field.toUpperCase());
    return input.map((item) => boundedString(item, maxLength, field));
  };
  return {
    summary,
    priorities,
    next7Days: boundedList(value.next7Days, 7, 240, "next7days"),
    questionsForOwner: boundedList(value.questionsForOwner, 5, 240, "question"),
  };
}

function getOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
      if (part?.type === "refusal") throw new Error("AI_OPS_MODEL_REFUSED");
    }
  }
  return parts.join("\n").trim();
}

export async function generateOpsReview({
  apiKey = "",
  model = "gpt-5-mini",
  readiness,
  fetchImpl = globalThis.fetch,
  timeoutMs = 25000,
  now = () => new Date(),
} = {}) {
  if (typeof apiKey !== "string" || apiKey.trim().length < 10) {
    return { ok: false, status: 503, code: "AI_OPS_NOT_CONFIGURED", message: "AI Ops Copilot не настроен: задайте OPENAI_API_KEY только в серверных переменных." };
  }
  if (typeof fetchImpl !== "function") {
    return { ok: false, status: 503, code: "AI_OPS_UPSTREAM_UNAVAILABLE", message: "OpenAI API недоступен в текущей среде." };
  }
  const safeModel = typeof model === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(model) ? model : "gpt-5-mini";
  const context = buildOpsReviewContext(readiness);
  const allowedEvidenceIds = new Set(["overallStatus", ...context.checks.map((item) => item.id)]);
  const requestBody = {
    model: safeModel,
    store: false,
    max_output_tokens: 1600,
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text: [
            "You are the read-only OSGARD Operations Copilot for an independent games and digital-product platform.",
            "Analyze only the provided operational-readiness statuses. The evidence is incomplete by design; state uncertainty rather than inventing facts.",
            "Return 3–5 useful, prioritized actions. Every action must cite one or more exact evidenceIds from the supplied checks or overallStatus.",
            "Prioritize safety and broken release prerequisites before growth experiments and monetization.",
            "Never recommend turning on live payments, subscriptions, or ad networks without explicit human verification of legal terms, provider configuration, privacy and end-to-end QA.",
            "Do not assume website traffic, retention, revenue, conversion, domain health, user sentiment, or deployment status when not present.",
            "Actions are recommendations only. Do not claim to execute, approve, deploy, purchase, change secrets, or alter production settings.",
            "Keep output concise and actionable. All strings are plain text.",
          ].join(" "),
        }],
      },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(context) }] },
    ],
    text: { format: { type: "json_schema", name: "osgard_ops_review", strict: true, schema: REVIEW_SCHEMA } },
  };

  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey.trim(), "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(Math.max(1000, Math.min(30000, Number(timeoutMs) || 25000))),
    });
  } catch {
    return { ok: false, status: 502, code: "AI_OPS_UPSTREAM_UNAVAILABLE", message: "Не удалось связаться с OpenAI API. Повторите попытку позже." };
  }
  if (!response?.ok) {
    return {
      ok: false,
      status: response?.status === 429 ? 429 : response?.status === 401 || response?.status === 403 ? 503 : 502,
      code: response?.status === 429 ? "AI_OPS_RATE_LIMITED" : response?.status === 401 || response?.status === 403 ? "AI_OPS_CONFIGURATION_ERROR" : "AI_OPS_UPSTREAM_ERROR",
      message: response?.status === 429
        ? "Лимит запроса OpenAI достигнут. Подождите перед повтором."
        : response?.status === 401 || response?.status === 403
          ? "OpenAI отклонил серверную конфигурацию. Проверьте ключ и доступность модели."
          : "OpenAI API не завершил запрос. Попробуйте позже.",
    };
  }

  let payload;
  try { payload = await response.json(); }
  catch { return { ok: false, status: 502, code: "AI_OPS_RESPONSE_INVALID", message: "OpenAI вернул некорректный ответ." }; }
  if (payload?.status && payload.status !== "completed") {
    return { ok: false, status: 502, code: "AI_OPS_RESPONSE_INCOMPLETE", message: "AI-проверка не завершилась. Повторите попытку." };
  }
  try {
    const parsed = JSON.parse(getOutputText(payload));
    const review = validateReview(parsed, allowedEvidenceIds);
    return {
      ok: true,
      data: {
        schemaVersion: 1,
        advisoryOnly: true,
        generatedAt: now().toISOString(),
        model: safeModel,
        source: { overallStatus: context.overallStatus, checksReviewed: context.checks.length, dataScope: "redacted operational readiness states only" },
        review,
      },
    };
  } catch {
    return { ok: false, status: 502, code: "AI_OPS_OUTPUT_INVALID", message: "Ответ AI не прошёл проверку структуры или ссылок на доказательства." };
  }
}
