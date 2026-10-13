import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("public/games/catalog-settings.js", "utf8");
const ids = ["null-shift", "time", "swarm", "inherit", "remix", "civic-cascade", "patina", "signal-run", "cascade-lab", "afterimage-run"];

function harness({ apiBaseUrl = "", config = null } = {}) {
  const calls = [];
  const cards = ids.map((id) => {
    const title = { textContent: "Original " + id, dataset: {} };
    const summary = { textContent: "Original description " + id, dataset: {} };
    const titleRow = {
      badge: null,
      querySelector(selector) { return selector === ".catalog-featured-badge" ? this.badge : null; },
      append(node) { this.badge = node; },
    };
    return {
      dataset: { game: id },
      title,
      summary,
      titleRow,
      querySelector(selector) {
        if (selector === ".game-title h3") return title;
        if (selector === ".copy > p") return summary;
        if (selector === ".game-title") return titleRow;
        return null;
      },
    };
  });
  const grid = {
    cards,
    querySelectorAll(selector) {
      return selector === "article.card[data-game]" ? this.cards.slice() : [];
    },
    append(card) {
      const previousIndex = this.cards.indexOf(card);
      if (previousIndex >= 0) this.cards.splice(previousIndex, 1);
      this.cards.push(card);
    },
  };
  const document = {
    head: { append() {} },
    querySelector(selector) { return selector === "#games-grid" ? grid : null; },
    createElement(tag) { return { tagName: String(tag).toUpperCase(), textContent: "", className: "", dataset: {} }; },
  };
  const fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, "https://osgard.world");
    calls.push({ url: url.href, options });
    if (url.pathname === "/games/commerce-config.json") {
      return { ok: true, json: async () => ({ apiBaseUrl }) };
    }
    if (url.pathname === "/commerce-api/v1/game-catalog" && config) {
      return { ok: true, json: async () => ({ revision: 1, config }) };
    }
    throw new Error("Unexpected request: " + url.href);
  };
  return { calls, cards, grid, document, fetch };
}

async function run(instance) {
  vm.runInNewContext(source, {
    document: instance.document,
    fetch: instance.fetch,
    location: { origin: "https://osgard.world" },
    URL,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
}

// Empty public API config must leave every statically-rendered card unchanged.
const staticOnly = harness();
await run(staticOnly);
assert.equal(staticOnly.calls.length, 1, "A blank API base should not attempt a catalogue API call");
assert.deepEqual(staticOnly.grid.cards.map((card) => card.dataset.game), ids);
assert.equal(staticOnly.cards.every((card) => !card.dataset.catalogAdminHidden), true);
assert.equal(staticOnly.cards[6].title.textContent, "Original patina");

// With an explicitly configured API, metadata-only settings can reorder, hide and label.
const games = ids.map((id, index) => ({
  id,
  visible: true,
  featured: false,
  order: index + 1,
  titleOverride: "",
  descriptionOverride: "",
}));
games.find((item) => item.id === "time").order = 1;
games.find((item) => item.id === "null-shift").order = 2;
games.find((item) => item.id === "patina").visible = false;
games.find((item) => item.id === "afterimage-run").featured = true;
games.find((item) => item.id === "afterimage-run").titleOverride = '<img src=x onerror=alert(1)>';
games.find((item) => item.id === "afterimage-run").descriptionOverride = "<script>alert(1)</script>";
const live = harness({ apiBaseUrl: "/commerce-api", config: { schemaVersion: 1, games } });
await run(live);
assert.equal(live.calls.length, 2, "A configured API should fetch public settings exactly once");
assert.equal(new URL(live.calls[1].url).pathname, "/commerce-api/v1/game-catalog");
assert.deepEqual(live.grid.cards.slice(0, 2).map((card) => card.dataset.game), ["time", "null-shift"]);
assert.equal(live.cards[6].dataset.catalogAdminHidden, "1", "Hidden game should remain in the DOM but not render");
assert.equal(live.cards[9].title.textContent, '<img src=x onerror=alert(1)>', "Override must be inserted as plain text");
assert.equal(live.cards[9].summary.textContent, "<script>alert(1)</script>", "Description override must remain plain text");
assert.equal(live.cards[9].titleRow.badge.textContent, "OSGARD PICK", "Featured state should add the explicit badge");
assert.ok(!source.includes("innerHTML"), "Catalog overrides must never use HTML insertion");

console.log("Game catalog runtime smoke: static fallback and opt-in text-only overrides passed.");
