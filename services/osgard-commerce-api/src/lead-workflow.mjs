export const LEAD_STATUSES = Object.freeze({
  new: "Новая",
  contacted: "Связались",
  qualified: "Квалифицирована",
  converted: "Сделка закрыта",
  lost: "Не актуальна",
});

const TRANSITIONS = Object.freeze({
  new: new Set(["contacted", "qualified", "lost"]),
  contacted: new Set(["qualified", "converted", "lost"]),
  qualified: new Set(["contacted", "converted", "lost"]),
  converted: new Set(),
  lost: new Set(["contacted"]),
});

const NOTE_LIMIT = 1200;
const MAX_FOLLOW_UP_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
const LEAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeLeadId(value) {
  return typeof value === "string" && LEAD_ID_PATTERN.test(value) ? value.toLowerCase() : "";
}

export function validateLeadWorkflowUpdate(input, currentStatus, { nowMs = Date.now() } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, code: "LEAD_UPDATE_BODY_INVALID" };
  }

  if (!Object.hasOwn(LEAD_STATUSES, currentStatus)) {
    return { ok: false, status: 409, code: "LEAD_CURRENT_STATUS_UNKNOWN" };
  }

  const statusProvided = Object.hasOwn(input, "status");
  const noteProvided = Object.hasOwn(input, "internalNote");
  const nextActionAtProvided = Object.hasOwn(input, "nextActionAt");

  if (!statusProvided && !noteProvided && !nextActionAtProvided) {
    return { ok: false, status: 400, code: "LEAD_UPDATE_EMPTY" };
  }

  const nextStatus = statusProvided ? input.status : currentStatus;
  if (typeof nextStatus !== "string" || !Object.hasOwn(LEAD_STATUSES, nextStatus)) {
    return { ok: false, status: 400, code: "LEAD_STATUS_INVALID" };
  }
  if (statusProvided && nextStatus !== currentStatus && !TRANSITIONS[currentStatus].has(nextStatus)) {
    return { ok: false, status: 409, code: "LEAD_STATUS_TRANSITION_INVALID" };
  }

  let internalNote;
  if (noteProvided) {
    if (typeof input.internalNote !== "string" || input.internalNote.length > NOTE_LIMIT) {
      return { ok: false, status: 400, code: "LEAD_INTERNAL_NOTE_INVALID" };
    }
    internalNote = input.internalNote
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
      .trim();
  }

  let nextActionAt;
  if (nextActionAtProvided) {
    if (input.nextActionAt === null || input.nextActionAt === "") {
      nextActionAt = null;
    } else {
      if (typeof input.nextActionAt !== "string" || input.nextActionAt.length > 64) {
        return { ok: false, status: 400, code: "LEAD_FOLLOW_UP_INVALID" };
      }
      const parsedMs = Date.parse(input.nextActionAt);
      if (!Number.isFinite(parsedMs) || parsedMs > nowMs + MAX_FOLLOW_UP_AHEAD_MS) {
        return { ok: false, status: 400, code: "LEAD_FOLLOW_UP_INVALID" };
      }
      nextActionAt = new Date(parsedMs).toISOString();
    }
  }

  return {
    ok: true,
    value: {
      status: nextStatus,
      statusProvided,
      internalNote,
      noteProvided,
      nextActionAt,
      nextActionAtProvided,
    },
  };
}

export function normalizeLeadStatus(value) {
  return typeof value === "string" && Object.hasOwn(LEAD_STATUSES, value) ? value : "";
}
