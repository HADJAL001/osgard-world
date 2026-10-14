export const GAME_CATALOG_SCHEMA_VERSION = 1;

export const DEFAULT_GAME_CATALOG = Object.freeze([
  { id: "null-shift", title: "NULL//SHIFT", description: "Взломай терминал, забери квантовое ядро и выйди из меняющейся арены. Основной вход — Godot-сборка; браузерный WebGL остаётся альтернативой.", genres: ["tactical", "social"], visible: true, featured: true, sortOrder: 1, status: "playable", href: "/games/null-shift-godot/" },
  { id: "time", title: "Империя времени", description: "Управляй казной, энергией, районами и политическими фракциями. Это развиваемый прототип, а не завершённая большая стратегия.", genres: ["systems", "tactical"], visible: true, featured: false, sortOrder: 2, status: "prototype", href: "/games/time" },
  { id: "swarm", title: "SWARM", description: "Координируй роли, захвати ядро и доберись до выхода. Есть браузерная тренировка; сетевой режим зависит от игрового API.", genres: ["social", "tactical"], visible: true, featured: false, sortOrder: 3, status: "playable", href: "/games/swarm/" },
  { id: "inherit", title: "INHERIT", description: "Оставляй следы в спокойном мире, чтобы следующие поколения находили твои решения. Изменения сохраняются локально в браузере.", genres: ["systems", "creative"], visible: true, featured: false, sortOrder: 4, status: "playable", href: "/games/inherit/" },
  { id: "remix", title: "REMIX", description: "Браузерный клиент и матч-консоль. Создание сетевого матча требует доступного REMIX API; при проблемах соединения игра должна показать статус.", genres: ["social", "creative"], visible: true, featured: false, sortOrder: 5, status: "playable", href: "/games/remix/" },
  { id: "civic-cascade", title: "CIVIC CASCADE", description: "Управляй городскими авариями: вода, энергосеть и эвакуация. Проверяй цепочки последствий и выбирай порядок действий.", genres: ["systems", "tactical"], visible: true, featured: false, sortOrder: 6, status: "playable", href: "/games/civic-cascade/" },
  { id: "patina", title: "PATINA ATELIER", description: "Исследуй керамику, различай загрязнения и сохраняй историю предмета в реставрационной лаборатории.", genres: ["creative", "systems"], visible: true, featured: false, sortOrder: 7, status: "playable", href: "/games/patina/" },
  { id: "signal-run", title: "SIGNAL RUN", description: "Короткая аркада на реакцию: меняй полосу, собирай сигналы и уклоняйся от цифровых помех.", genres: ["arcade", "creative"], visible: true, featured: false, sortOrder: 8, status: "playable", href: "/games/signal-run/" },
  { id: "cascade-lab", title: "CASCADE LAB", description: "Собирай цепные реакции, исследуй траекторию и физику, разбирай причины отказов и сравнивай контролируемые эксперименты.", genres: ["creative", "tactical"], visible: true, featured: false, sortOrder: 9, status: "playable", href: "/games/cascade-lab/" },
  { id: "afterimage-run", title: "AFTERIMAGE//RUN", description: "Ежедневный sci-fi забег с общим seed, фазовыми воротами и призраком личного рекорда. Поделись испытанием и сравни результат.", genres: ["arcade", "creative"], visible: true, featured: false, sortOrder: 10, status: "playable", href: "/games/afterimage-run/" },
  { id: "aether-grid", title: "AETHER GRID", description: "Ежедневная логическая головоломка: соедини источник с ядром в сетке из узлов и брось вызов другу.", genres: ["creative", "tactical"], visible: true, featured: false, sortOrder: 11, status: "playable", href: "/games/aether-grid/" },
]);

const GAME_IDS = new Set(DEFAULT_GAME_CATALOG.map((item) => item.id));
const GAME_ROUTES = new Map(DEFAULT_GAME_CATALOG.map((item) => [item.id, item.href]));
const ALLOWED_GENRES = new Set(["tactical", "systems", "social", "creative", "arcade"]);
const ALLOWED_STATUSES = new Set(["playable", "prototype"]);

function cleanText(value, max) {
  if (typeof value !== "string") return null;
  const result = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!result || result.length > max || /[<>]/.test(result)) return null;
  return result;
}

export function validateGameCatalogPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body.schemaVersion !== GAME_CATALOG_SCHEMA_VERSION) {
    return { ok: false, status: 400, code: "GAME_CATALOG_SCHEMA_INVALID" };
  }
  if (!Array.isArray(body.items) || body.items.length !== DEFAULT_GAME_CATALOG.length) {
    return { ok: false, status: 400, code: "GAME_CATALOG_ITEMS_INVALID" };
  }

  const seenIds = new Set();
  const seenOrders = new Set();
  const items = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, status: 400, code: "GAME_CATALOG_ITEM_INVALID" };
    const id = typeof raw.id === "string" ? raw.id : "";
    if (!GAME_IDS.has(id) || seenIds.has(id)) return { ok: false, status: 400, code: "GAME_CATALOG_ID_INVALID" };
    seenIds.add(id);

    const title = cleanText(raw.title, 80);
    const description = cleanText(raw.description, 520);
    if (!title || title.length < 2) return { ok: false, status: 400, code: "GAME_CATALOG_TITLE_INVALID" };
    if (!description || description.length < 10) return { ok: false, status: 400, code: "GAME_CATALOG_DESCRIPTION_INVALID" };
    if (typeof raw.visible !== "boolean" || typeof raw.featured !== "boolean") {
      return { ok: false, status: 400, code: "GAME_CATALOG_FLAGS_INVALID" };
    }
    if (!Number.isInteger(raw.sortOrder) || raw.sortOrder < 1 || raw.sortOrder > 99 || seenOrders.has(raw.sortOrder)) {
      return { ok: false, status: 400, code: "GAME_CATALOG_ORDER_INVALID" };
    }
    seenOrders.add(raw.sortOrder);
    if (!ALLOWED_STATUSES.has(raw.status)) return { ok: false, status: 400, code: "GAME_CATALOG_STATUS_INVALID" };
    if (!Array.isArray(raw.genres) || raw.genres.length < 1 || raw.genres.length > 4 ||
        raw.genres.some((genre) => typeof genre !== "string" || !ALLOWED_GENRES.has(genre)) ||
        new Set(raw.genres).size !== raw.genres.length) {
      return { ok: false, status: 400, code: "GAME_CATALOG_GENRES_INVALID" };
    }

    items.push({
      id, title, description, genres: [...raw.genres],
      visible: raw.visible, featured: raw.featured, sortOrder: raw.sortOrder, status: raw.status,
      href: GAME_ROUTES.get(id),
    });
  }
  if (seenIds.size !== GAME_IDS.size || [...GAME_IDS].some((id) => !seenIds.has(id))) {
    return { ok: false, status: 400, code: "GAME_CATALOG_REGISTRY_INCOMPLETE" };
  }
  return { ok: true, catalog: { schemaVersion: GAME_CATALOG_SCHEMA_VERSION, items: items.sort((a, b) => a.sortOrder - b.sortOrder) } };
}
