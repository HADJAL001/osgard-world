import { analyzeExperiment, calculateSampleSize, normalizeImport } from "./model.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#experiment-form");
const statusNode = $("#analysis-status");
const resultNode = $("#result-metrics");
const decisionNode = $("#decision-panel");
const barsNode = $("#conversion-bars");
const apiStatus = $("#api-status");
const sampleForm = $("#sample-form");
let lastInput = null;
let lastAnalysis = null;
let lastSample = null;
let operatorToken = "";

const text = (node, value) => { node.textContent = String(value); };
const status = (node, message, kind = "") => { text(node, message); node.dataset.kind = kind; };
const formatPct = (value) => value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("ru-RU", { style:"percent", maximumFractionDigits:2 }).format(value);
const formatP = (value) => value === null || !Number.isFinite(value) ? "—" : value < 0.001 ? "< 0,001" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits:3 }).format(value);
const formatCount = (value) => new Intl.NumberFormat("ru-RU").format(value);

function readInput() {
  const getNum = (id) => {
    const raw = $("#" + id).value.trim();
    return raw === "" ? 0 : Number(raw);
  };
  return {
    experimentId: $("#experiment-id").value.trim(),
    experimentName: $("#experiment-name").value.trim().slice(0, 100),
    guardrailTolerancePct: getNum("guardrail-limit"),
    variantA: { exposures: getNum("a-exposures"), conversions: getNum("a-conversions"), guardrailFailures: getNum("a-guardrails") },
    variantB: { exposures: getNum("b-exposures"), conversions: getNum("b-conversions"), guardrailFailures: getNum("b-guardrails") },
  };
}

function makeMetric(label, value, note) {
  const card = document.createElement("article");
  card.className = "metric";
  const span = document.createElement("span");
  const strong = document.createElement("strong");
  const small = document.createElement("small");
  text(span, label); text(strong, value); text(small, note);
  card.append(span, strong, small);
  return card;
}

function renderAnalysis(input) {
  const analysis = analyzeExperiment(input);
  lastInput = input;
  lastAnalysis = analysis;
  const m = analysis.metrics;
  resultNode.replaceChildren(
    makeMetric("Конверсия A", formatPct(m.rateA), m.rateA === null ? "Нет наблюдений" : "95% CI: " + formatPct(m.intervalA.low) + "—" + formatPct(m.intervalA.high)),
    makeMetric("Конверсия B", formatPct(m.rateB), m.rateB === null ? "Нет наблюдений" : "95% CI: " + formatPct(m.intervalB.low) + "—" + formatPct(m.intervalB.high)),
    makeMetric("Абсолютная разница", m.difference === null ? "—" : (m.difference >= 0 ? "+" : "") + formatPct(m.difference), "95% CI: " + formatPct(m.differenceInterval.low) + "—" + formatPct(m.differenceInterval.high)),
    makeMetric("p-value", formatP(m.pValue), m.relativeUplift === null ? "Относительный прирост не определён" : "Относительный прирост: " + (m.relativeUplift >= 0 ? "+" : "") + formatPct(m.relativeUplift))
  );
  const stateMap = {
    "inconclusive": ["wait", "Данных недостаточно для решения"],
    "b-leading": ["win", "Вариант B — предварительный сигнал роста"],
    "a-leading": ["wait", "Контроль A выглядит лучше"],
    "stop-b": ["stop", "Остановить вариант B: защитная метрика"],
  };
  const view = stateMap[analysis.recommendation] || stateMap.inconclusive;
  decisionNode.dataset.state = view[0];
  const title = document.createElement("h3");
  const p = document.createElement("p");
  text(title, view[1]); text(p, analysis.explanation);
  decisionNode.replaceChildren(title, p);
  const barA = m.rateA === null ? 0 : Math.max(0, Math.min(100, m.rateA * 100));
  const barB = m.rateB === null ? 0 : Math.max(0, Math.min(100, m.rateB * 100));
  barsNode.innerHTML =
    '<div class="bar-row"><span>Вариант A</span><div class="bar-track" role="img" aria-label="Конверсия A ' + formatPct(m.rateA) + '"><div class="bar-fill" style="width:' + barA + '%"></div></div><b>' + formatPct(m.rateA) + '</b></div>' +
    '<div class="bar-row"><span>Вариант B</span><div class="bar-track" role="img" aria-label="Конверсия B ' + formatPct(m.rateB) + '"><div class="bar-fill b" style="width:' + barB + '%"></div></div><b>' + formatPct(m.rateB) + '</b></div>';
  status(statusNode, "Проанализирован вручную введённый или импортированный агрегат. Экспозиции A/B: " + formatCount(input.variantA.exposures) + " / " + formatCount(input.variantB.exposures) + ". Результат не является гарантией причинности.", "success");
  return analysis;
}

function download(filename, body, type) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.rel = "noopener";
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPayload() {
  if (!lastInput || !lastAnalysis) renderAnalysis(readInput());
  return {
    schema: "osgard.experiment-export.v1",
    generatedAt: new Date().toISOString(),
    input: lastInput,
    analysis: lastAnalysis,
    note: "Aggregated observations only. No names, emails, IP addresses or raw user-level records.",
  };
}

function csvField(value) {
  const raw = String(value ?? "");
  return '"' + raw.replace(/"/g, '""') + '"';
}

function exportCsv() {
  const payload = exportPayload();
  const rows = [
    ["experimentId", "variant", "exposures", "conversions", "guardrailFailures"],
    [payload.input.experimentId, "a", payload.input.variantA.exposures, payload.input.variantA.conversions, payload.input.variantA.guardrailFailures],
    [payload.input.experimentId, "b", payload.input.variantB.exposures, payload.input.variantB.conversions, payload.input.variantB.guardrailFailures],
  ];
  download("osgard-experiment-" + payload.input.experimentId + ".csv", rows.map(row => row.map(csvField).join(",")).join("\r\n") + "\r\n", "text/csv;charset=utf-8");
}

function importJson(textValue) {
  if (textValue.length > 65536) throw new Error("Файл превышает ограничение 64 КБ.");
  return normalizeImport(JSON.parse(textValue));
}

function parseCsv(textValue) {
  if (textValue.length > 65536) throw new Error("Файл превышает ограничение 64 КБ.");
  const lines = textValue.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 3 || lines.length > 10) throw new Error("CSV должен содержать заголовок и две строки: A и B.");
  const parseRow = (line) => {
    const output = [];
    let current = "", quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { output.push(current); current = ""; }
      else current += char;
    }
    if (quoted) throw new Error("Незакрытая кавычка в CSV.");
    output.push(current);
    return output;
  };
  const header = parseRow(lines[0]).map(value => value.trim());
  const required = ["experimentId","variant","exposures","conversions","guardrailFailures"];
  if (header.join("|") !== required.join("|")) throw new Error("CSV заголовок должен быть: " + required.join(", "));
  const rows = lines.slice(1).map(parseRow);
  const byVariant = {};
  let experimentId = "";
  for (const row of rows) {
    if (row.length !== required.length) throw new Error("В CSV строке неверное число столбцов.");
    const item = Object.fromEntries(header.map((key, index) => [key, row[index].trim()]));
    if (!["a","b"].includes(item.variant) || byVariant[item.variant]) throw new Error("CSV должен содержать варианты a и b по одному разу.");
    if (!experimentId) experimentId = item.experimentId;
    if (experimentId !== item.experimentId) throw new Error("В CSV смешаны разные эксперименты.");
    byVariant[item.variant] = {
      exposures: Number(item.exposures), conversions: Number(item.conversions),
      guardrailFailures: Number(item.guardrailFailures),
    };
  }
  if (!byVariant.a || !byVariant.b) throw new Error("Нужны строки для варианта a и b.");
  return normalizeImport({ experimentId, variantA: byVariant.a, variantB: byVariant.b, guardrailTolerancePct: 1.5 });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { renderAnalysis(readInput()); }
  catch (error) { status(statusNode, error instanceof Error ? error.message : "Не удалось рассчитать эксперимент.", "error"); }
});

$("#export-json").addEventListener("click", () => {
  try { const payload = exportPayload(); download("osgard-experiment-" + payload.input.experimentId + ".json", JSON.stringify(payload, null, 2) + "\n", "application/json;charset=utf-8"); }
  catch (error) { status(statusNode, error instanceof Error ? error.message : "Экспорт не выполнен.", "error"); }
});
$("#export-csv").addEventListener("click", () => { try { exportCsv(); } catch (error) { status(statusNode, error instanceof Error ? error.message : "Экспорт не выполнен.", "error"); } });
$("#reset-form").addEventListener("click", () => {
  ["a-exposures","a-conversions","a-guardrails","b-exposures","b-conversions","b-guardrails"].forEach(id => { $("#" + id).value = ""; });
  lastInput = null; lastAnalysis = null;
  status(statusNode, "Поля очищены. Это не удаляет серверные агрегаты и не изменяет игровой каталог.");
  resultNode.replaceChildren(
    makeMetric("Конверсия A", "—", "Нет наблюдений"),
    makeMetric("Конверсия B", "—", "Нет наблюдений"),
    makeMetric("Абсолютная разница", "—", "B − A"),
    makeMetric("p-value", "—", "Нужны данные обоих вариантов")
  );
  decisionNode.dataset.state = "wait";
  const title = document.createElement("h3");
  const paragraph = document.createElement("p");
  text(title, "Решение не принято"); text(paragraph, "Внеси новые реальные данные.");
  decisionNode.replaceChildren(title, paragraph);
  barsNode.replaceChildren();
});

sampleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    lastSample = calculateSampleSize({
      baselineRatePct: Number($("#baseline-rate").value),
      mdePct: Number($("#mde").value),
      alpha: Number($("#alpha").value),
      power: Number($("#power").value),
    });
    $("#sample-results").replaceChildren(
      makeMetric("Наблюдений на вариант", formatCount(lastSample.observationsPerArm), "При заданных допущениях"),
      makeMetric("Всего наблюдений", formatCount(lastSample.totalObservations), "A + B"),
      makeMetric("Базовая конверсия", formatPct(lastSample.inputs.baselineRatePct / 100), "Предположение"),
      makeMetric("Минимальный эффект", lastSample.inputs.mdePct.toLocaleString("ru-RU") + " п.п.", "Предположение")
    );
    status($("#sample-status"), lastSample.note, "success");
  } catch (error) { status($("#sample-status"), error instanceof Error ? error.message : "Расчёт выборки не выполнен.", "error"); }
});

$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error("Файл превышает ограничение 64 КБ.");
    const content = await file.text();
    const input = file.name.toLowerCase().endsWith(".csv") ? parseCsv(content) : importJson(content);
    $("#experiment-id").value = input.experimentId;
    $("#guardrail-limit").value = String(input.guardrailTolerancePct);
    $("#a-exposures").value = String(input.variantA.exposures);
    $("#a-conversions").value = String(input.variantA.conversions);
    $("#a-guardrails").value = String(input.variantA.guardrailFailures);
    $("#b-exposures").value = String(input.variantB.exposures);
    $("#b-conversions").value = String(input.variantB.conversions);
    $("#b-guardrails").value = String(input.variantB.guardrailFailures);
    renderAnalysis(input);
    status(statusNode, "Импортированы только агрегированные значения A/B. Персональные данные не читаются.", "success");
  } catch (error) { status(statusNode, error instanceof Error ? error.message : "Импорт не выполнен.", "error"); }
  finally { event.target.value = ""; }
});

function validApiBase(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const url = new URL(raw.trim(), location.origin);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    const sameOriginPrefix = url.origin === location.origin && url.pathname === "/commerce-api";
    const remoteRoot = url.pathname === "/" && url.origin !== "null";
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash) return "";
    if (!(sameOriginPrefix || remoteRoot)) return "";
    return url.origin + (url.pathname === "/" ? "" : url.pathname);
  } catch { return ""; }
}

$("#live-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  operatorToken = $("#operator-token").value.trim();
  $("#operator-token").value = "";
  if (operatorToken.length < 32) { operatorToken = ""; status(apiStatus, "Токен должен содержать не менее 32 символов. Проверь переменные сервера и не используй Stripe-ключ.", "error"); return; }
  const button = $("#load-live");
  button.disabled = true;
  status(apiStatus, "Читаю публичную конфигурацию и запрашиваю только агрегаты…");
  try {
    const configResponse = await fetch("/games/commerce-config.json", { cache: "no-store", credentials: "same-origin" });
    if (!configResponse.ok) throw new Error("Публичный commerce-config недоступен.");
    const config = await configResponse.json();
    const base = validApiBase(config.apiBaseUrl);
    if (!base) throw new Error("Commerce API не настроен или URL не прошёл проверку. Ручной CSV/JSON импорт доступен без API; секреты не добавляются в публичный config.");
    const response = await fetch(base + "/v1/admin/overview", {
      headers: { "Authorization": "Bearer " + operatorToken, "Accept": "application/json" },
      cache: "no-store", credentials: "omit", redirect: "error",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Commerce API ответил HTTP " + response.status + ": " + String(payload.message || payload.error || "запрос отклонён").slice(0, 160));
    if (!Array.isArray(payload.experimentVariantStats)) throw new Error("API доступен, но ещё не отдаёт experimentVariantStats. Обнови сервис Commerce API вместе с этой веткой.");
    const id = $("#experiment-id").value.trim();
    const rows = payload.experimentVariantStats.filter(row => row.experimentId === id);
    if (!rows.length) {
      status(apiStatus, "В базе нет подтверждённых экспозиций для " + id + " за последние 30 дней. Это отсутствие зарегистрированных событий, не доказательство отсутствия игроков.", "success");
      return;
    }
    const find = (variant) => rows.find(row => row.variant === variant) || {};
    const a = find("a"), b = find("b");
    const set = (variant, prefix) => {
      $("#" + prefix + "-exposures").value = String(Number(variant.exposures || 0));
      $("#" + prefix + "-conversions").value = String(Number(variant.conversions || 0));
      $("#" + prefix + "-guardrails").value = String(Number(variant.guardrailFailures || 0));
    };
    set(a, "a"); set(b, "b");
    renderAnalysis(readInput());
    status(apiStatus, "Загружены только агрегаты за 30 дней для " + id + ". Токен хранится только в памяти вкладки; серверная конфигурация не изменялась.", "success");
  } catch (error) {
    status(apiStatus, error instanceof Error ? error.message : "Загрузка не выполнена.", "error");
  } finally { operatorToken = ""; button.disabled = false; }
});

$("#clear-token").addEventListener("click", () => {
  operatorToken = "";
  $("#operator-token").value = "";
  status(apiStatus, "Токен очищен из памяти и поля.");
});

async function explainApiConfig() {
  try {
    const response = await fetch("/games/commerce-config.json", { cache: "no-store" });
    const config = response.ok ? await response.json() : {};
    status(apiStatus, config.apiBaseUrl ? "Найден публичный адрес Commerce API. Для запроса потребуется административный токен." : "Commerce API пока не настроен в публичном конфиге. Никакие live-метрики не подменяются нулями; используй ручной импорт.", "");
  } catch { status(apiStatus, "Не удалось прочитать конфиг API. Можно продолжить с проверенным CSV/JSON.", ""); }
}
void explainApiConfig();
