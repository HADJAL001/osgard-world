import {
  SCENARIO_PRESETS,
  calculateModel,
  calculateAllScenarios,
  trackedUrl
} from "./model.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const form = $("#forecast-form");
const fields = form ? $$("[data-model]", form) : [];
const output = $("#forecast-results");
const currency = $("#currency");
const presetButtons = $$("[data-preset]");
const defaults = { ...SCENARIO_PRESETS.base };
let lastResult = null;
let activePreset = "base";

function readInput() {
  const values = {};
  fields.forEach(field => {
    values[field.dataset.model] = field.type === "number" ? Number(field.value) : field.value;
  });
  return values;
}
function format(value, digits = 2) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}
function money(value) {
  const mark = currency?.value || "EUR";
  try {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: mark, maximumFractionDigits: 2 }).format(value);
  } catch {
    return format(value) + " " + mark;
  }
}
function setFields(input) {
  fields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(input, field.dataset.model)) field.value = String(input[field.dataset.model]);
  });
}
function reportEvent(name, payload = {}) {
  let allowed = false;
  let token = "";
  try {
    allowed = localStorage.getItem("osgard.games.analytics-consent.v1") === "yes";
    token = localStorage.getItem("osgard.auth.accessToken") || "";
  } catch {}
  if (!allowed || !token) return;
  const event = {
    id: window.crypto?.randomUUID?.() || name + "-" + Date.now(),
    name,
    world: "play",
    game: "partner-studio",
    payload: Object.assign({ source: "games_partner_studio", consented: true }, payload),
    occurredAt: new Date().toISOString(),
    schemaVersion: 1
  };
  fetch("/api/v1/player/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ event })
  }).catch(() => {});
}
function renderResult() {
  if (!form || !output) return;
  const input = readInput();
  lastResult = calculateModel(input);
  $("#out-visits").textContent = format(lastResult.visits, 0);
  $("#out-starts").textContent = format(lastResult.starts, 0);
  $("#out-sessions").textContent = format(lastResult.sessions, 0);
  $("#out-impressions").textContent = format(lastResult.paidImpressions, 0);
  $("#out-ad-revenue").textContent = money(lastResult.adRevenue);
  $("#out-purchase-revenue").textContent = money(lastResult.purchaseRevenue);
  $("#out-sponsor-revenue").textContent = money(lastResult.sponsorRevenue);
  $("#out-game-revenue").textContent = money(lastResult.gameRevenue);
  $("#out-costs").textContent = money(lastResult.operatingCosts);
  $("#out-game-result").textContent = money(lastResult.gameOperatingResult);
  $("#out-leads").textContent = format(lastResult.qualifiedLeads, 1);
  $("#out-project-sales").textContent = format(lastResult.expectedProjectSales, 2);
  $("#out-ecosystem-potential").textContent = money(lastResult.ecosystemPotentialResult);
  $("#out-rate-note").textContent = "Расчёт по введённым допущениям; не фактическая статистика и не обещание дохода.";
  $("#out-game-result").classList.toggle("negative", lastResult.gameOperatingResult < 0);
  renderComparison(input);
}
function renderComparison(current) {
  const body = $("#scenario-comparison tbody");
  if (!body) return;
  body.replaceChildren();
  calculateAllScenarios({
    netEcpm: current.netEcpm,
    paymentFeePct: current.paymentFeePct,
    averagePurchase: current.averagePurchase,
    confirmedSponsorRevenue: current.confirmedSponsorRevenue,
    fixedCosts: current.fixedCosts,
    acquisitionCosts: current.acquisitionCosts,
    contributionPerProject: current.contributionPerProject
  }).forEach(item => {
    const row = document.createElement("tr");
    [item.label, format(item.result.visits, 0), format(item.result.paidImpressions, 0), money(item.result.gameRevenue), money(item.result.gameOperatingResult)].forEach((text, i) => {
      const cell = document.createElement(i === 0 ? "th" : "td");
      cell.textContent = text;
      if (i === 0) cell.scope = "row";
      row.append(cell);
    });
    body.append(row);
  });
}
function applyPreset(key, announce = true) {
  const preset = SCENARIO_PRESETS[key];
  if (!preset) return;
  activePreset = key;
  setFields(preset);
  presetButtons.forEach(button => {
    const active = button.dataset.preset === key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderResult();
  if (announce) reportEvent("partner_forecast_preset_selected", { preset: key });
}
function download(name, type, text) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function exportForecast(formatName) {
  const input = readInput();
  const result = calculateModel(input);
  const payload = {
    model: "OSGARD PLAY illustrative revenue model",
    modelVersion: 1,
    exportedAt: new Date().toISOString(),
    currency: currency?.value || "EUR",
    assumptions: input,
    result,
    disclaimer: "Illustrative calculation only. Inputs are assumptions, not observed OSGARD traffic, ad rates, conversions or revenue."
  };
  if (formatName === "json") {
    download("osgard-play-forecast.json", "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
  } else {
    const lines = [
      ["Показатель", "Значение"],
      ["Посещения в месяц", result.visits],
      ["Запуски игр", result.starts],
      ["Игровые сессии", result.sessions],
      ["Заполненные рекламные возможности", result.paidImpressions],
      ["Доход от рекламы", result.adRevenue],
      ["Доход от покупок после комиссии", result.purchaseRevenue],
      ["Подтверждённый доход от спонсорства", result.sponsorRevenue],
      ["Общая выручка игр", result.gameRevenue],
      ["Расходы платформы", result.operatingCosts],
      ["Операционный результат игр", result.gameOperatingResult],
      ["Ожидаемые заявки на проекты", result.qualifiedLeads],
      ["Ожидаемые продажи проектов", result.expectedProjectSales],
      ["Модельный результат с вкладом экосистемы", result.ecosystemPotentialResult]
    ];
    const csv = "\uFEFF" + lines.map(line => line.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    download("osgard-play-forecast.csv", "text/csv;charset=utf-8", csv);
  }
  reportEvent("partner_forecast_exported", { format: formatName, preset: activePreset });
}
function submitLead(event) {
  event.preventDefault();
  const leadForm = event.currentTarget;
  if (!(leadForm instanceof HTMLFormElement) || !leadForm.reportValidity()) return;
  const data = new FormData(leadForm);
  const message = [
    "Здравствуйте! Хочу обсудить сотрудничество с OSGARD PLAY.",
    "Формат: " + String(data.get("format") || "не указан"),
    "Организация / бренд: " + String(data.get("brand") || "не указано"),
    "Бюджет (необязательно): " + String(data.get("budget") || "не указан"),
    "Контакт для ответа: " + String(data.get("contact") || "").trim(),
    "Задача: " + String(data.get("brief") || "").trim()
  ].join("\n");
  $("#lead-status").textContent = "Откроется WhatsApp. Проверьте текст и отправьте сообщение самостоятельно.";
  reportEvent("partner_lead_composed", { format: String(data.get("format") || "unspecified") });
  window.open("https://wa.me/79640027222?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}
function initProjectLinks() {
  $$("[data-ecosystem-link]").forEach(link => {
    const base = link.dataset.baseUrl || link.href;
    try { link.href = trackedUrl(base, link.dataset.project || "project"); } catch {}
    link.addEventListener("click", () => reportEvent("ecosystem_link_clicked", {
      project: link.dataset.project || "project",
      destination: new URL(link.href, location.href).hostname
    }));
  });
}
form?.addEventListener("input", renderResult);
form?.addEventListener("change", renderResult);
presetButtons.forEach(button => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
$("#export-json")?.addEventListener("click", () => exportForecast("json"));
$("#export-csv")?.addEventListener("click", () => exportForecast("csv"));
$("#save-model")?.addEventListener("click", () => {
  try {
    localStorage.setItem("osgard.games.partner-model.v1", JSON.stringify({ currency: currency?.value || "EUR", values: readInput(), savedAt: new Date().toISOString() }));
    $("#model-status").textContent = "Параметры сохранены только в этом браузере.";
  } catch {
    $("#model-status").textContent = "Браузер не разрешил сохранить параметры.";
  }
});
$("#load-model")?.addEventListener("click", () => {
  try {
    const saved = JSON.parse(localStorage.getItem("osgard.games.partner-model.v1") || "null");
    if (!saved || !saved.values) throw new Error("No local model");
    if (currency && ["EUR", "USD", "RUB"].includes(saved.currency)) currency.value = saved.currency;
    setFields(saved.values);
    renderResult();
    $("#model-status").textContent = "Параметры загружены с этого устройства.";
  } catch {
    $("#model-status").textContent = "Сохранённых параметров нет или они повреждены.";
  }
});
currency?.addEventListener("change", renderResult);
$("#lead-form")?.addEventListener("submit", submitLead);
$("#copy-email")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("osman.osmanov0099@gmail.com");
    $("#email-status").textContent = "Email скопирован.";
  } catch {
    $("#email-status").textContent = "Email: osman.osmanov0099@gmail.com";
  }
});
initProjectLinks();
applyPreset("base", false);
reportEvent("partner_studio_viewed", { pageVersion: "1.0.0" });
