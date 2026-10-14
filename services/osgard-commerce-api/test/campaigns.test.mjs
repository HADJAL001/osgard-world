import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCampaignId,
  validateCampaignPayload,
  campaignFromRow,
  publicCampaignView,
} from "../src/campaigns.mjs";

const now = Date.parse("2026-10-14T12:00:00.000Z");
const base = {
  sponsorName: "Example Sponsor",
  title: "A clearly labelled campaign",
  description: "A real sponsor description with useful information.",
  targetUrl: "https://sponsor.example/offer",
  placement: "catalog_feature",
  status: "draft",
  sponsorDisclosure: "Реклама",
  frequencyCap: 3,
};

test("valid draft is normalized without becoming publicly active", () => {
  const result = validateCampaignPayload(base, { nowMs: now });
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "draft");
  assert.equal(result.data.frequencyCap, 3);
  assert.equal(publicCampaignView({ campaign_id: "cmp_12345678", ...result.data }), null);
});

test("scheduled campaigns require a future start and ordered time window", () => {
  const good = validateCampaignPayload({
    ...base, status: "scheduled",
    startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-20T00:00:00Z",
  }, { nowMs: now });
  assert.equal(good.ok, true);
  assert.equal(good.data.startsAt, "2026-10-15T00:00:00.000Z");
  assert.equal(validateCampaignPayload({
    ...base, status: "scheduled",
    startsAt: "2026-10-13T00:00:00Z", endsAt: "2026-10-20T00:00:00Z",
  }, { nowMs: now }).code, "CAMPAIGN_SCHEDULE_START_MUST_BE_FUTURE");
});

test("active catalog campaign needs a window that includes now", () => {
  const result = validateCampaignPayload({
    ...base, status: "active",
    startsAt: "2026-10-14T11:00:00Z", endsAt: "2026-10-15T11:00:00Z",
  }, { nowMs: now });
  assert.equal(result.ok, true);
  assert.equal(validateCampaignPayload({ ...base, status: "active" }, { nowMs: now }).code, "CAMPAIGN_DATE_WINDOW_REQUIRED");
  assert.equal(validateCampaignPayload({
    ...base, status: "active",
    startsAt: "2026-10-14T13:00:00Z", endsAt: "2026-10-15T11:00:00Z",
  }, { nowMs: now }).code, "CAMPAIGN_ACTIVE_WINDOW_MUST_INCLUDE_NOW");
});

test("after-session campaigns are publishable while in-game slots remain blocked", () => {
  const active = validateCampaignPayload({
    ...base, placement: "after_session", status: "active",
    startsAt: "2026-10-14T11:00:00Z", endsAt: "2026-10-15T11:00:00Z",
  }, { nowMs: now });
  assert.equal(active.ok, true);
  assert.equal(active.data.placement, "after_session");
  assert.equal(publicCampaignView({
    campaign_id: "cmp_87654321", sponsor_name: active.data.sponsorName,
    title: active.data.title, description: active.data.description, target_url: active.data.targetUrl,
    placement: active.data.placement, sponsor_disclosure: active.data.sponsorDisclosure,
    status: active.data.status, starts_at: new Date(active.data.startsAt), ends_at: new Date(active.data.endsAt),
    frequency_cap: active.data.frequencyCap,
  }).placement, "after_session");

  const scheduled = validateCampaignPayload({
    ...base, placement: "after_session", status: "scheduled",
    startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-20T00:00:00Z",
  }, { nowMs: now });
  assert.equal(scheduled.ok, true);

  for (const status of ["active", "scheduled"]) {
    const result = validateCampaignPayload({
      ...base, placement: "game_event", status,
      startsAt: status === "active" ? "2026-10-14T11:00:00Z" : "2026-10-15T00:00:00Z",
      endsAt: "2026-10-20T00:00:00Z",
    }, { nowMs: now });
    assert.equal(result.code, "CAMPAIGN_PLACEMENT_NOT_INTEGRATED");
  }
});

test("non-HTTPS, credentialed, queried and fragmented links fail closed", () => {
  for (const targetUrl of [
    "http://sponsor.example/offer",
    "javascript:alert(1)",
    "https://user:pass@sponsor.example/offer",
    "https://sponsor.example/offer?token=secret",
    "https://sponsor.example/offer#fragment",
    "not-a-url",
  ]) {
    assert.equal(validateCampaignPayload({ ...base, targetUrl }, { nowMs: now }).ok, false, targetUrl);
  }
});

test("all user-facing text is required, bounded and non-empty", () => {
  assert.equal(validateCampaignPayload({ ...base, sponsorName: " " }, { nowMs: now }).code, "CAMPAIGN_SPONSOR_REQUIRED");
  assert.equal(validateCampaignPayload({ ...base, title: "ab" }, { nowMs: now }).code, "CAMPAIGN_TITLE_REQUIRED");
  assert.equal(validateCampaignPayload({ ...base, description: "short" }, { nowMs: now }).code, "CAMPAIGN_DESCRIPTION_TOO_SHORT");
  assert.equal(validateCampaignPayload({ ...base, title: "x".repeat(101) }, { nowMs: now }).code, "CAMPAIGN_TITLE_REQUIRED");
});

test("placement, status and disclosure use allow-lists", () => {
  assert.equal(validateCampaignPayload({ ...base, placement: "top_of_gameplay" }, { nowMs: now }).code, "CAMPAIGN_PLACEMENT_INVALID");
  assert.equal(validateCampaignPayload({ ...base, status: "published" }, { nowMs: now }).code, "CAMPAIGN_STATUS_INVALID");
  assert.equal(validateCampaignPayload({ ...base, sponsorDisclosure: "best offer" }, { nowMs: now }).code, "CAMPAIGN_DISCLOSURE_REQUIRED");
});

test("frequency cap is an integer from 1 through 20", () => {
  for (const frequencyCap of [0, -1, 21, 2.5, "many"]) {
    assert.equal(validateCampaignPayload({ ...base, frequencyCap }, { nowMs: now }).code, "CAMPAIGN_FREQUENCY_CAP_INVALID");
  }
});

test("date values must be valid and ordered", () => {
  assert.equal(validateCampaignPayload({ ...base, startsAt: "yesterday", endsAt: "tomorrow" }, { nowMs: now }).code, "CAMPAIGN_DATE_INVALID");
  assert.equal(validateCampaignPayload({ ...base, startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-14T00:00:00Z" }, { nowMs: now }).code, "CAMPAIGN_DATE_ORDER_INVALID");
  assert.equal(validateCampaignPayload({ ...base, startsAt: "2026-10-14T00:00:00Z" }, { nowMs: now }).code, "CAMPAIGN_DATE_WINDOW_REQUIRED");
});

test("public projection exposes only approved fields and insists on explicit disclosure", () => {
  const row = {
    campaign_id: "cmp_12345678",
    sponsor_name: "Example Sponsor",
    title: "A clearly labelled campaign",
    description: "A real sponsor description with useful information.",
    target_url: "https://sponsor.example/offer",
    placement: "catalog_feature",
    sponsor_disclosure: "Партнёрский материал",
    status: "active",
    starts_at: new Date("2026-10-14T11:00:00Z"),
    ends_at: new Date("2026-10-15T11:00:00Z"),
    frequency_cap: 3,
    created_at: new Date("2026-10-14T10:00:00Z"),
    impressions_30d: 8,
    clicks_30d: 2,
    internal_note: "private operator note",
  };
  const result = publicCampaignView(row);
  assert.deepEqual(Object.keys(result).sort(), [
    "description", "endsAt", "frequencyCap", "id", "placement", "sponsorDisclosure",
    "sponsorName", "startsAt", "targetUrl", "title",
  ].sort());
  assert.equal(result.sponsorDisclosure, "Партнёрский материал");
  assert.equal("internal_note" in result, false);
});

test("campaign IDs follow a narrow route-safe format", () => {
  assert.equal(normalizeCampaignId("cmp_12345678"), "cmp_12345678");
  for (const value of ["../etc/passwd", "short", "x".repeat(65), "has space"]) {
    assert.equal(normalizeCampaignId(value), "");
  }
});

test("database mapper tolerates absent aggregate columns without inventing metrics", () => {
  const mapped = campaignFromRow({ campaign_id: "cmp_12345678", status: "draft" });
  assert.equal(mapped.impressions30d, 0);
  assert.equal(mapped.clicks30d, 0);
  assert.equal(mapped.frequencyCap, 3);
});
