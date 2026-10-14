const PLACEMENTS = new Set(["catalog_feature", "after_session", "game_event"]);
const STATUSES = new Set(["draft", "scheduled", "active", "paused"]);
const DISCLOSURES = new Set(["Реклама", "Партнёрский материал", "Спонсорский материал"]);
const ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

function text(value, max) {
  if (typeof value !== "string" || value.length > max) return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 1024) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return "";
    return url.href;
  } catch {
    return "";
  }
}

function isoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const ms = typeof value === "string" || value instanceof Date ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

export function normalizeCampaignId(value) {
  return typeof value === "string" && ID_PATTERN.test(value) ? value : "";
}

export function validateCampaignPayload(input, { nowMs = Date.now() } = {}) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const sponsorName = text(body.sponsorName, 100);
  const title = text(body.title, 100);
  const description = text(body.description, 500);
  const targetUrl = safeHttpsUrl(body.targetUrl);
  const placement = text(body.placement, 32);
  const status = text(body.status, 16);
  const sponsorDisclosure = text(body.sponsorDisclosure, 40);
  const startsAt = isoDate(body.startsAt);
  const endsAt = isoDate(body.endsAt);
  const frequencyCap = Number(body.frequencyCap ?? 3);

  if (sponsorName.length < 2) return { ok: false, status: 400, code: "CAMPAIGN_SPONSOR_REQUIRED" };
  if (title.length < 3) return { ok: false, status: 400, code: "CAMPAIGN_TITLE_REQUIRED" };
  if (description.length < 10) return { ok: false, status: 400, code: "CAMPAIGN_DESCRIPTION_TOO_SHORT" };
  if (!targetUrl) return { ok: false, status: 400, code: "CAMPAIGN_URL_MUST_BE_SAFE_HTTPS" };
  if (!PLACEMENTS.has(placement)) return { ok: false, status: 400, code: "CAMPAIGN_PLACEMENT_INVALID" };
  if (!STATUSES.has(status)) return { ok: false, status: 400, code: "CAMPAIGN_STATUS_INVALID" };
  if (!DISCLOSURES.has(sponsorDisclosure)) return { ok: false, status: 400, code: "CAMPAIGN_DISCLOSURE_REQUIRED" };
  if (!Number.isInteger(frequencyCap) || frequencyCap < 1 || frequencyCap > 20) {
    return { ok: false, status: 400, code: "CAMPAIGN_FREQUENCY_CAP_INVALID" };
  }
  if (startsAt === undefined || endsAt === undefined) {
    return { ok: false, status: 400, code: "CAMPAIGN_DATE_INVALID" };
  }

  const startMs = startsAt ? Date.parse(startsAt) : NaN;
  const endMs = endsAt ? Date.parse(endsAt) : NaN;
  const hasWindow = startsAt !== null && endsAt !== null;
  if ((startsAt === null) !== (endsAt === null)) {
    return { ok: false, status: 400, code: "CAMPAIGN_DATE_WINDOW_REQUIRED" };
  }
  if (hasWindow && endMs <= startMs) {
    return { ok: false, status: 400, code: "CAMPAIGN_DATE_ORDER_INVALID" };
  }
  if ((status === "scheduled" || status === "active") && !hasWindow) {
    return { ok: false, status: 400, code: "CAMPAIGN_DATE_WINDOW_REQUIRED" };
  }
  if (status === "scheduled" && startMs <= nowMs) {
    return { ok: false, status: 400, code: "CAMPAIGN_SCHEDULE_START_MUST_BE_FUTURE" };
  }
  if (status === "active" && (startMs > nowMs || endMs <= nowMs)) {
    return { ok: false, status: 400, code: "CAMPAIGN_ACTIVE_WINDOW_MUST_INCLUDE_NOW" };
  }
  // Only the catalog slot is integrated. Other placements remain non-public until a
  // specific game's lifecycle has been wired and tested.
  if (["active", "scheduled"].includes(status) && !["catalog_feature", "after_session"].includes(placement)) {
    return { ok: false, status: 409, code: "CAMPAIGN_PLACEMENT_NOT_INTEGRATED" };
  }

  return {
    ok: true,
    data: {
      sponsorName, title, description, targetUrl, placement, status, sponsorDisclosure,
      startsAt, endsAt, frequencyCap,
    },
  };
}

export function campaignFromRow(row) {
  return {
    id: String(row.campaign_id ?? row.id ?? ""),
    sponsorName: String(row.sponsor_name ?? row.sponsorName ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    targetUrl: String(row.target_url ?? row.targetUrl ?? ""),
    placement: String(row.placement ?? ""),
    sponsorDisclosure: String(row.sponsor_disclosure ?? row.sponsorDisclosure ?? ""),
    status: String(row.status ?? "draft"),
    startsAt: isoDate(row.starts_at ?? row.startsAt),
    endsAt: isoDate(row.ends_at ?? row.endsAt),
    frequencyCap: Number(row.frequency_cap ?? row.frequencyCap ?? 3),
    createdAt: isoDate(row.created_at ?? row.createdAt),
    updatedAt: isoDate(row.updated_at ?? row.updatedAt),
    impressions30d: Math.max(0, Number(row.impressions_30d ?? row.impressions30d ?? 0)),
    clicks30d: Math.max(0, Number(row.clicks_30d ?? row.clicks30d ?? 0)),
  };
}

export function publicCampaignView(row) {
  const campaign = campaignFromRow(row);
  const targetUrl = safeHttpsUrl(campaign.targetUrl);
  const sponsorName = text(campaign.sponsorName, 100);
  const title = text(campaign.title, 100);
  const description = text(campaign.description, 500);
  if (
    !normalizeCampaignId(campaign.id) ||
    !targetUrl ||
    !PLACEMENTS.has(campaign.placement) ||
    !DISCLOSURES.has(campaign.sponsorDisclosure) ||
    sponsorName.length < 2 ||
    title.length < 3 ||
    description.length < 10 ||
    campaign.status !== "active" ||
    !campaign.startsAt ||
    !campaign.endsAt
  ) return null;
  const startMs = Date.parse(campaign.startsAt);
  const endMs = Date.parse(campaign.endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return {
    id: campaign.id,
    sponsorName,
    title,
    description,
    targetUrl,
    placement: campaign.placement,
    sponsorDisclosure: campaign.sponsorDisclosure,
    frequencyCap: Number.isInteger(campaign.frequencyCap) ? Math.max(1, Math.min(20, campaign.frequencyCap)) : 3,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
  };
}
