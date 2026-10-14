export const FEEDBACK_GAME_IDS = Object.freeze([
  "null-shift", "time", "swarm", "inherit", "remix",
  "civic-cascade", "patina", "signal-run", "cascade-lab",
  "afterimage-run", "aether-grid", "catalog",
]);
export const FEEDBACK_CATEGORIES = Object.freeze([
  "bug", "controls", "gameplay", "performance", "accessibility", "visual", "monetization", "other",
]);
export const FEEDBACK_SEVERITIES = Object.freeze(["minor", "major", "blocker"]);
export const FEEDBACK_STATUSES = Object.freeze(["new", "triaged", "in_progress", "resolved", "wontfix"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_ID = /^fb_[0-9a-f-]{36}$/i;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function clean(value, max) {
  if (typeof value !== "string" || value.length > max) return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}
function optional(value, max) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > max) return null;
  return clean(value, max);
}
function enumValue(value, allowed, fallback = "") {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function viewport(value) {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 10000 ? number : null;
}
export function normalizeFeedbackReportId(value) {
  return typeof value === "string" && REPORT_ID.test(value) ? value.toLowerCase() : "";
}

/**
 * Validate an explicit player-submitted support report.
 * Raw user agent, IP, URL and arbitrary diagnostic payloads are not part of this schema.
 */
export function validateGameFeedbackPayload(raw) {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (typeof body.website === "string" && body.website.trim()) return { ok: true, bot: true };

  const submissionId = typeof body.submissionId === "string" ? body.submissionId.trim() : "";
  const gameId = enumValue(body.gameId, FEEDBACK_GAME_IDS);
  const category = enumValue(body.category, FEEDBACK_CATEGORIES);
  const severity = enumValue(body.severity, FEEDBACK_SEVERITIES);
  const title = clean(body.title, 120);
  const description = clean(body.description, 3000);
  const steps = optional(body.stepsToReproduce, 1500);
  const expected = optional(body.expectedResult, 600);
  const actual = optional(body.actualResult, 600);
  const replyTo = optional(body.replyTo, 254);
  const deviceClass = enumValue(body.deviceClass, ["desktop", "tablet", "mobile", "unknown"], "unknown");
  const browserFamily = enumValue(body.browserFamily, ["chrome", "safari", "firefox", "edge", "other", "unknown"], "unknown");
  const viewportWidth = viewport(body.viewportWidth);
  const viewportHeight = viewport(body.viewportHeight);

  if (!UUID.test(submissionId)) return { ok: false, status: 400, code: "FEEDBACK_SUBMISSION_ID_INVALID" };
  if (!gameId) return { ok: false, status: 400, code: "FEEDBACK_GAME_INVALID" };
  if (!category) return { ok: false, status: 400, code: "FEEDBACK_CATEGORY_INVALID" };
  if (!severity) return { ok: false, status: 400, code: "FEEDBACK_SEVERITY_INVALID" };
  if (title.length < 8) return { ok: false, status: 400, code: "FEEDBACK_TITLE_TOO_SHORT" };
  if (typeof body.title !== "string" || body.title.length > 120) return { ok: false, status: 400, code: "FEEDBACK_TITLE_INVALID" };
  if (description.length < 20) return { ok: false, status: 400, code: "FEEDBACK_DESCRIPTION_TOO_SHORT" };
  if (typeof body.description !== "string" || body.description.length > 3000) return { ok: false, status: 400, code: "FEEDBACK_DESCRIPTION_INVALID" };
  if (steps === null || expected === null || actual === null || replyTo === null) return { ok: false, status: 400, code: "FEEDBACK_OPTION_TOO_LONG" };
  if (replyTo && !EMAIL.test(replyTo)) return { ok: false, status: 400, code: "FEEDBACK_EMAIL_INVALID" };
  if (viewportWidth === null || viewportHeight === null) return { ok: false, status: 400, code: "FEEDBACK_VIEWPORT_INVALID" };
  if (body.consent !== true) return { ok: false, status: 400, code: "FEEDBACK_ACK_REQUIRED" };

  return { ok: true, bot: false, data: {
    submissionId: submissionId.toLowerCase(), gameId, category, severity, title, description,
    stepsToReproduce: steps, expectedResult: expected, actualResult: actual, replyTo: replyTo.toLowerCase(),
    deviceClass, browserFamily, viewportWidth, viewportHeight,
  }};
}