import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GAME_CATALOG, GAME_CATALOG_SCHEMA_VERSION, validateGameCatalogPayload } from "../src/game-catalog.mjs";

const valid = () => ({ schemaVersion: GAME_CATALOG_SCHEMA_VERSION, items: DEFAULT_GAME_CATALOG.map((item) => ({ ...item, genres: [...item.genres] })) });

test("default catalogue contains all registered games with fixed local routes", () => {
  const result = validateGameCatalogPayload(valid());
  assert.equal(result.ok, true);
  assert.equal(result.catalog.items.length, 11);
  assert.equal(result.catalog.items[0].id, "null-shift");
  assert.ok(result.catalog.items.every((item) => item.href.startsWith("/games/")));
});

test("catalogue accepts editable content but canonicalizes launch links", () => {
  const payload = valid();
  payload.items[0].title = "NULL SHIFT — UPDATED";
  payload.items[0].href = "https://evil.example/collect";
  const result = validateGameCatalogPayload(payload);
  assert.equal(result.ok, true);
  assert.equal(result.catalog.items[0].title, "NULL SHIFT — UPDATED");
  assert.equal(result.catalog.items[0].href, "/games/null-shift-godot/");
});

test("catalogue refuses unregistered IDs, duplicates, and incomplete lists", () => {
  const unknown = valid(); unknown.items[0].id = "evil-route";
  assert.equal(validateGameCatalogPayload(unknown).code, "GAME_CATALOG_ID_INVALID");
  const duplicate = valid(); duplicate.items[1].id = duplicate.items[0].id;
  assert.equal(validateGameCatalogPayload(duplicate).code, "GAME_CATALOG_ID_INVALID");
  const incomplete = valid(); incomplete.items.pop();
  assert.equal(validateGameCatalogPayload(incomplete).code, "GAME_CATALOG_ITEMS_INVALID");
});

test("catalogue rejects unsafe or unbounded text, unsupported genres and statuses", () => {
  const html = valid(); html.items[0].title = "<script>alert(1)</script>";
  assert.equal(validateGameCatalogPayload(html).code, "GAME_CATALOG_TITLE_INVALID");
  const giant = valid(); giant.items[0].description = "x".repeat(600);
  assert.equal(validateGameCatalogPayload(giant).code, "GAME_CATALOG_DESCRIPTION_INVALID");
  const genre = valid(); genre.items[0].genres = ["javascript"];
  assert.equal(validateGameCatalogPayload(genre).code, "GAME_CATALOG_GENRES_INVALID");
  const status = valid(); status.items[0].status = "sold";
  assert.equal(validateGameCatalogPayload(status).code, "GAME_CATALOG_STATUS_INVALID");
});

test("catalogue rejects repeated sort order and invalid visibility/featured flags", () => {
  const order = valid(); order.items[1].sortOrder = order.items[0].sortOrder;
  assert.equal(validateGameCatalogPayload(order).code, "GAME_CATALOG_ORDER_INVALID");
  const visible = valid(); visible.items[0].visible = "true";
  assert.equal(validateGameCatalogPayload(visible).code, "GAME_CATALOG_FLAGS_INVALID");
});

test("catalogue normalizes text, genre arrays, and order without accepting route changes", () => {
  const payload = valid();
  payload.items[0].title = "  NULL   SHIFT  ";
  payload.items[0].description = "  A sufficiently detailed updated summary for this game.  ";
  payload.items[0].sortOrder = 2; payload.items[1].sortOrder = 1;
  const result = validateGameCatalogPayload(payload);
  assert.equal(result.ok, true);
  assert.equal(result.catalog.items[0].id, "time");
  assert.equal(result.catalog.items[1].title, "NULL SHIFT");
});
