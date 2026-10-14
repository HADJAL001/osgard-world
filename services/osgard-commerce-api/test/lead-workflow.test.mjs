import test from "node:test";
import assert from "node:assert/strict";
import { LEAD_STATUSES, normalizeLeadId, normalizeLeadStatus, validateLeadWorkflowUpdate } from "../src/lead-workflow.mjs";

const validId = "58fdd1f2-5d99-44f3-8de7-0c0bf8e90c4a";

test("lead status catalogue is explicit and does not equate CRM conversion with payment", () => {
  assert.deepEqual(Object.keys(LEAD_STATUSES), ["new", "contacted", "qualified", "converted", "lost"]);
  assert.match(LEAD_STATUSES.converted, /сделка закрыта/i);
  assert.equal(normalizeLeadStatus("paid"), "");
});

test("lead identifiers require a canonical UUID and normalize case", () => {
  assert.equal(normalizeLeadId(validId), validId);
  assert.equal(normalizeLeadId(validId.toUpperCase()), validId);
  assert.equal(normalizeLeadId("../other"), "");
  assert.equal(normalizeLeadId(""), "");
});

test("valid lead state transitions follow the sales pipeline", () => {
  assert.equal(validateLeadWorkflowUpdate({ status: "contacted" }, "new").ok, true);
  assert.equal(validateLeadWorkflowUpdate({ status: "qualified" }, "contacted").ok, true);
  assert.equal(validateLeadWorkflowUpdate({ status: "converted" }, "qualified").ok, true);
  assert.equal(validateLeadWorkflowUpdate({ status: "contacted" }, "lost").ok, true);
});

test("invalid status jumps and terminal transitions are rejected", () => {
  assert.equal(validateLeadWorkflowUpdate({ status: "converted" }, "new").code, "LEAD_STATUS_TRANSITION_INVALID");
  assert.equal(validateLeadWorkflowUpdate({ status: "new" }, "contacted").code, "LEAD_STATUS_TRANSITION_INVALID");
  assert.equal(validateLeadWorkflowUpdate({ status: "lost" }, "converted").code, "LEAD_STATUS_TRANSITION_INVALID");
  assert.equal(validateLeadWorkflowUpdate({ status: "paid" }, "new").code, "LEAD_STATUS_INVALID");
});

test("internal notes are length-bounded, text-only, and can be updated independently", () => {
  const result = validateLeadWorkflowUpdate({ internalNote: "Позвонить завтра\r\nУточнить объём\u0000" }, "new");
  assert.equal(result.ok, true);
  assert.equal(result.value.internalNote, "Позвонить завтра\nУточнить объём");
  assert.equal(validateLeadWorkflowUpdate({ internalNote: "x".repeat(1201) }, "new").code, "LEAD_INTERNAL_NOTE_INVALID");
  assert.equal(validateLeadWorkflowUpdate({ internalNote: 12 }, "new").code, "LEAD_INTERNAL_NOTE_INVALID");
});

test("follow-up dates accept valid timestamps and explicit clearing", () => {
  const nowMs = Date.parse("2026-10-14T08:00:00.000Z");
  const valid = validateLeadWorkflowUpdate({ nextActionAt: "2026-10-15T10:30:00+02:00" }, "new", { nowMs });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.nextActionAt, "2026-10-15T08:30:00.000Z");
  assert.equal(validateLeadWorkflowUpdate({ nextActionAt: null }, "new", { nowMs }).value.nextActionAt, null);
  assert.equal(validateLeadWorkflowUpdate({ nextActionAt: "not-a-date" }, "new", { nowMs }).code, "LEAD_FOLLOW_UP_INVALID");
  assert.equal(validateLeadWorkflowUpdate({ nextActionAt: "2028-12-01T00:00:00Z" }, "new", { nowMs }).code, "LEAD_FOLLOW_UP_INVALID");
});

test("empty payload and unknown stored statuses fail closed", () => {
  assert.equal(validateLeadWorkflowUpdate({}, "new").code, "LEAD_UPDATE_EMPTY");
  assert.equal(validateLeadWorkflowUpdate({ status: "contacted" }, "legacy_unknown").code, "LEAD_CURRENT_STATUS_UNKNOWN");
  assert.equal(validateLeadWorkflowUpdate(null, "new").code, "LEAD_UPDATE_BODY_INVALID");
});

test("converted leads may receive a note without reopening the closed status", () => {
  const result = validateLeadWorkflowUpdate({ internalNote: "Условия согласованы" }, "converted");
  assert.equal(result.ok, true);
  assert.equal(result.value.status, "converted");
  assert.equal(result.value.statusProvided, false);
});
