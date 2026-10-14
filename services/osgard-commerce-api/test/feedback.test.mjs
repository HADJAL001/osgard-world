import test from "node:test";
import assert from "node:assert/strict";
import {
  FEEDBACK_CATEGORIES, FEEDBACK_GAME_IDS, FEEDBACK_SEVERITIES, FEEDBACK_STATUSES,
  normalizeFeedbackReportId, validateGameFeedbackPayload,
} from "../src/feedback.mjs";

const valid = {
  submissionId: "b42d7de2-64c5-4f80-a909-95ee13e5b4d3",
  gameId: "civic-cascade",
  category: "performance",
  severity: "major",
  title: "Traffic freezes after pause",
  description: "The city simulation freezes when I resume after several minutes.",
  stepsToReproduce: "Start a scenario, pause, wait, then resume.",
  expectedResult: "Simulation continues smoothly.",
  actualResult: "The animation no longer updates.",
  replyTo: "player@example.com",
  deviceClass: "desktop",
  browserFamily: "chrome",
  viewportWidth: 1450,
  viewportHeight: 900,
  consent: true,
};

test("feedback vocabulary uses only the catalogue IDs and bounded workflow enums", () => {
  assert.equal(FEEDBACK_GAME_IDS.length, 12);
  assert.ok(FEEDBACK_CATEGORIES.includes("accessibility"));
  assert.deepEqual(FEEDBACK_SEVERITIES, ["minor", "major", "blocker"]);
  assert.deepEqual(FEEDBACK_STATUSES, ["new", "triaged", "in_progress", "resolved", "wontfix"]);
});

test("valid feedback is normalized and excludes unsubmitted browser identifiers", () => {
  const result = validateGameFeedbackPayload({ ...valid, rawUserAgent: "must not be stored", ip: "192.0.2.4" });
  assert.equal(result.ok, true);
  assert.equal(result.data.replyTo, "player@example.com");
  assert.equal(result.data.viewportWidth, 1450);
  assert.equal(Object.hasOwn(result.data, "rawUserAgent"), false);
  assert.equal(Object.hasOwn(result.data, "ip"), false);
});

test("unknown game, category and severity are rejected", () => {
  assert.equal(validateGameFeedbackPayload({ ...valid, gameId: "no-such-game" }).code, "FEEDBACK_GAME_INVALID");
  assert.equal(validateGameFeedbackPayload({ ...valid, category: "make-me-admin" }).code, "FEEDBACK_CATEGORY_INVALID");
  assert.equal(validateGameFeedbackPayload({ ...valid, severity: "infinite" }).code, "FEEDBACK_SEVERITY_INVALID");
});

test("report must be explicit, detailed and consented", () => {
  assert.equal(validateGameFeedbackPayload({ ...valid, consent: false }).code, "FEEDBACK_ACK_REQUIRED");
  assert.equal(validateGameFeedbackPayload({ ...valid, description: "too short" }).code, "FEEDBACK_DESCRIPTION_TOO_SHORT");
  assert.equal(validateGameFeedbackPayload({ ...valid, title: "bug" }).code, "FEEDBACK_TITLE_TOO_SHORT");
  assert.equal(validateGameFeedbackPayload({ ...valid, submissionId: "anything" }).code, "FEEDBACK_SUBMISSION_ID_INVALID");
});

test("optional reply contact may be blank, but malformed contact fails", () => {
  assert.equal(validateGameFeedbackPayload({ ...valid, replyTo: "" }).ok, true);
  assert.equal(validateGameFeedbackPayload({ ...valid, replyTo: "not-an-email" }).code, "FEEDBACK_EMAIL_INVALID");
});

test("overlong inputs and viewport values fail closed", () => {
  assert.equal(validateGameFeedbackPayload({ ...valid, description: "x".repeat(3001) }).code, "FEEDBACK_DESCRIPTION_INVALID");
  assert.equal(validateGameFeedbackPayload({ ...valid, stepsToReproduce: "x".repeat(1501) }).code, "FEEDBACK_OPTION_TOO_LONG");
  assert.equal(validateGameFeedbackPayload({ ...valid, viewportWidth: 99999 }).code, "FEEDBACK_VIEWPORT_INVALID");
});

test("honeypot is acknowledged without validating or accepting its content", () => {
  assert.deepEqual(validateGameFeedbackPayload({ website: "bot", arbitrary: "private" }), { ok: true, bot: true });
});

test("report IDs accept only the server-generated prefixed UUID shape", () => {
  assert.equal(normalizeFeedbackReportId("fb_B42D7DE2-64C5-4F80-A909-95EE13E5B4D3"), "fb_b42d7de2-64c5-4f80-a909-95ee13e5b4d3");
  assert.equal(normalizeFeedbackReportId("../../orders"), "");
  assert.equal(normalizeFeedbackReportId("fb_123"), "");
});