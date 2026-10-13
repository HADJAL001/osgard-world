import {
  MISSION_DURATION,
  SCENARIOS,
  SIMULATION_SPEED,
  TOOLS,
  TOOL_ORDER,
  TRAFFIC_TARGETS,
  DRAIN_TARGETS,
  getTrafficProfile,
  getDrainProfile,
  previewIntervention,
  addEvent,
  applyIntervention,
  dispatchRepair,
  getRepairAvailability,
  formatClock,
  getScenario,
  makeInitialState,
  startMission,
  tick,
} from './simulation.js';
import { QUALITY_FACTORS, QUALITY_LABELS, QUALITY_NAMES, getEffectiveQuality, getStaticCacheScale, shouldReduceMotion } from './visual-settings.js';
import { STRATEGY_HISTORY_LIMIT, appendStrategyRun, compareStrategyRuns, formatStrategyDate, normalizeStrategyHistory, summarizeStrategyRun } from './strategy-lab.js';
import { createRuntimeReport, runSimulationBenchmark, summarizeFrameSamples } from './runtime-lab.js';
import { MAP_CAMERA_MAX_ZOOM, MAP_CAMERA_MIN_ZOOM, mapPointToWorld, normalizeMapCamera, panMapCamera, pinchMapCamera, zoomMapCamera, zoomMapCameraAtPoint } from './map-camera.js';
import { ambientParticleAt, getAtmosphereProfile, scenarioAtmosphereStatus } from './atmosphere.js';

const BASE_W = 1200;
const BASE_H = 760;
const canvas = document.querySelector('#cityCanvas');
let ctx = canvas.getContext('2d', { alpha: false });
const requestedScenario = new URLSearchParams(window.location.search).get('scenario');
let selectedScenarioId = Object.hasOwn(SCENARIOS, requestedScenario) ? requestedScenario : 'storm';
const state = makeInitialState(selectedScenarioId);
let selectedTool = null;
let lastFrame = 0;
let lastUiRender = 0;
let view = { width: BASE_W, height: BASE_H, dpr: 1, scale: 1, ox: 0, oy: 0 };
let mapCamera = { zoom: 1, x: 0, y: 0 };
let cameraTransition = null;
let mapPanMode = false;
let panGesture = null;
let suppressMapClick = false;
let mouseWorld = { x: 0, y: 0 };
let toastTimer = null;
let audioContext = null;
let soundEnabled = false;
let mapExportBusy = false;
let staticDots = [];
let scenarioRecords = {};
const RECORDS_STORAGE_KEY = 'cc-records-v1';
const VISUAL_SETTINGS_KEY = 'cc-visual-settings-v130';
const STRATEGY_HISTORY_KEY = 'cc-strategy-history-v130';
let strategyHistory = loadStrategyHistory();
let currentStrategyRun = null;
let selectedStrategyBaselineId = null;
const systemMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let visualMode = 'auto';
let userReduceMotion = false;
let adaptiveQuality = 1;
let lastAppliedVisualMode = null;
let previousEventCount = -1;
let lastPhase = state.phase;
let previousRepairCount = state.repairs.length;
const performanceStats = { frames: [], frameSamples: [], longFrames: 0, drawMs: 0, updateMs: 0, inputMs: 0, lastDiagnosticAt: 0, lastInterval: 16.7, warnings: 0 };
let lastRuntimeBenchmark = null;
const transientPulses = [];
let lastVisibleState = !document.hidden;
let diagnosticOpen = false;
let lastForecastBucket = -1;
let renderQuality = 1;
let lowFpsSince = 0;
let stableFpsSince = 0;
let staticSceneCache = null;
let staticSceneCacheScenario = null;
const STATIC_CACHE_SCALE = 2;
let staticSceneCacheScale = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function isReducedMotion() {
  return shouldReduceMotion(userReduceMotion, systemMotionPreference.matches);
}

function cacheScaleForQuality() {
  return getStaticCacheScale(visualMode, renderQuality, STATIC_CACHE_SCALE);
}

function applyEffectiveQuality() {
  const next = getEffectiveQuality(visualMode, adaptiveQuality);
  const oldQuality = renderQuality;
  const oldCacheScale = staticSceneCacheScale ?? cacheScaleForQuality();
  const modeChanged = lastAppliedVisualMode !== visualMode;
  renderQuality = next;
  const newCacheScale = cacheScaleForQuality();
  if (Math.abs(oldQuality - next) > .0001 || oldCacheScale !== newCacheScale || modeChanged) {
    staticSceneCache = null;
    staticSceneCacheScenario = null;
    staticSceneCacheScale = null;
    resizeCanvas();
  }
  lastAppliedVisualMode = visualMode;
  document.documentElement.classList.toggle('reduced-motion', isReducedMotion());
  const status = $('#visualSettingsStatus');
  if (status) {
    const modeLabel = QUALITY_NAMES[visualMode];
    status.textContent = `${modeLabel} · качество ${Math.round(renderQuality * 100)}% · ${scenarioAtmosphereStatus(state.scenarioId)}${systemMotionPreference.matches ? ' · движение уменьшено системой' : userReduceMotion ? ' · движение уменьшено' : ''}`;
  }
  const motionToggle = $('#reduceMotionToggle');
  if (motionToggle) motionToggle.checked = userReduceMotion;
  const qualitySelect = $('#visualQualitySelect');
  if (qualitySelect) qualitySelect.value = visualMode;
}

function loadVisualSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(VISUAL_SETTINGS_KEY) || '{}');
    if (saved && Object.hasOwn(QUALITY_FACTORS, saved.mode)) visualMode = saved.mode;
    userReduceMotion = saved?.reduceMotion === true;
  } catch { /* local settings are optional in private or restricted browsing */ }
}

function saveVisualSettings() {
  try { localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify({ mode: visualMode, reduceMotion: userReduceMotion })); }
  catch { /* settings still apply for the current session when storage is unavailable */ }
}

function toggleVisualSettings(force) {
  const panel = $('#visualSettingsPanel');
  const button = $('#visualSettingsBtn');
  if (!panel || !button) return;
  const open = typeof force === 'boolean' ? force : panel.hidden;
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.classList.toggle('active', open);
  if (open) $('#visualQualitySelect')?.focus({ preventScroll: true });
}

function loadScenarioRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY) || '{}');
    scenarioRecords = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    // Migrate the older single global record to the original storm scenario only once.
    const legacyScore = Number(localStorage.getItem('cc-best-score')) || 0;
    if (!scenarioRecords.storm && legacyScore > 0) {
      scenarioRecords.storm = {
        score: legacyScore,
        grade: localStorage.getItem('cc-best-grade') || '—',
        rescued: null,
        rescuedPct: null,
        completedAt: null,
        migrated: true,
      };
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(scenarioRecords));
    }
  } catch {
    scenarioRecords = {};
  }
}

function saveScenarioRecords() {
  try { localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(scenarioRecords)); } catch { /* storage may be disabled */ }
}

function renderPersonalRecord(scenarioId = selectedScenarioId) {
  const scenario = getScenario(scenarioId);
  const record = scenarioRecords[scenarioId];
  const title = $('#protocolTitle');
  const subtitle = $('#protocolSubtitle');
  const grade = $('#bestGrade');
  if (!title || !subtitle || !grade) return;
  if (!record) {
    title.textContent = 'Ожидает завершения';
    subtitle.textContent = 'Личный рекорд сохранится после операции';
    grade.textContent = '—';
    grade.classList.remove('best');
    return;
  }
  title.textContent = `Личный рекорд · ${scenario.sectorCode}`;
  const saved = Number.isFinite(record.score) ? record.score.toLocaleString('ru-RU') : '—';
  const rescued = Number.isFinite(record.rescuedPct) ? ` · ${record.rescuedPct}% спасено` : '';
  subtitle.textContent = `${saved} очков${rescued} · локально`;
  grade.textContent = record.grade || '—';
  grade.classList.toggle('best', record.grade === 'S' || record.grade === 'A');
}

const junctions = [
  { id: 'J-02', x: 250, y: 560 },
  { id: 'J-04', x: 465, y: 390 },
  { id: 'J-07', x: 680, y: 390 },
  { id: 'J-09', x: 895, y: 560 },
  { id: 'J-11', x: 895, y: 390 },
];
const powerTargets = [
  { id: 'H-01', type: 'hospital', x: 785, y: 310, label: 'БОЛЬНИЦА' },
  { id: 'P-04', type: 'pump', x: 955, y: 635, label: 'НАСОСНАЯ' },
];
const gateTargets = [
  { id: 'G-03', type: 'gate', x: 1037, y: 365, label: 'ШЛЮЗ G-03' },
  { id: 'G-05', type: 'gate', x: 1037, y: 535, label: 'ШЛЮЗ G-05' },
];
const buildings = [
  { x: 82, y: 77, w: 124, h: 103, kind: 'residential', label: 'ЖИЛОЙ КВАРТАЛ' },
  { x: 286, y: 77, w: 130, h: 104, kind: 'office' },
  { x: 500, y: 77, w: 124, h: 103, kind: 'office' },
  { x: 715, y: 77, w: 123, h: 103, kind: 'residential' },
  { x: 919, y: 77, w: 94, h: 103, kind: 'industrial' },
  { x: 78, y: 255, w: 130, h: 91, kind: 'office' },
  { x: 288, y: 255, w: 129, h: 91, kind: 'residential' },
  { x: 500, y: 255, w: 124, h: 91, kind: 'industrial' },
  { x: 720, y: 270, w: 130, h: 80, kind: 'hospital' },
  { x: 920, y: 255, w: 93, h: 91, kind: 'residential' },
  { x: 80, y: 425, w: 128, h: 92, kind: 'industrial' },
  { x: 291, y: 425, w: 126, h: 92, kind: 'shelter' },
  { x: 500, y: 425, w: 124, h: 92, kind: 'office' },
  { x: 719, y: 425, w: 128, h: 92, kind: 'residential' },
  { x: 920, y: 425, w: 93, h: 92, kind: 'industrial' },
  { x: 82, y: 590, w: 124, h: 94, kind: 'residential' },
  { x: 288, y: 590, w: 130, h: 94, kind: 'office' },
  { x: 500, y: 590, w: 124, h: 94, kind: 'residential' },
  { x: 720, y: 590, w: 128, h: 94, kind: 'office' },
  { x: 919, y: 590, w: 94, h: 94, kind: 'pump' },
];

function seededRandom(seed = 731) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const rand = seededRandom();
for (let i = 0; i < 360; i++) {
  staticDots.push({ x: 18 + rand() * 1020, y: 32 + rand() * 690, r: .4 + rand() * 1.25, a: .025 + rand() * .11 });
}

function roundRect(c, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dprCap = renderQuality < .62 ? 1 : renderQuality < .86 ? 1.5 : visualMode === 'cinematic' ? 2.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const scale = Math.min(rect.width / BASE_W, rect.height / BASE_H);
  view = {
    width: rect.width,
    height: rect.height,
    dpr,
    scale,
    ox: (rect.width - BASE_W * scale) / 2,
    oy: (rect.height - BASE_H * scale) / 2,
  };
}

function drawBackground(t) {
  const ground = ctx.createLinearGradient(0, 0, BASE_W, BASE_H);
  const districtGround = state.scenarioId === 'grid'
    ? ['#343b3a', '#293435', '#1c2b31']
    : state.scenarioId === 'evacuation'
      ? ['#2c3d3a', '#243634', '#172c31']
      : ['#203c38', '#19332f', '#162e2e'];
  ground.addColorStop(0, districtGround[0]);
  ground.addColorStop(.52, districtGround[1]);
  ground.addColorStop(1, districtGround[2]);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Fine cadastral grid and neighborhood parcels.
  ctx.save();
  ctx.strokeStyle = state.scenarioId === 'grid'
    ? 'rgba(222, 183, 119, .065)'
    : state.scenarioId === 'evacuation'
      ? 'rgba(206, 189, 149, .055)'
      : 'rgba(154, 205, 176, .055)';
  ctx.lineWidth = 1;
  for (let x = 22; x < 1070; x += 31) {
    ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 730); ctx.stroke();
  }
  for (let y = 38; y < 740; y += 29) {
    ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(1070, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(7, 22, 25, .17)';
  [[35,35,1030,175],[32,244,1034,125],[32,410,1034,126],[32,579,1035,140]].forEach(([x,y,w,h]) => {
    roundRect(ctx,x,y,w,h,12); ctx.fill();
  });
  ctx.restore();

  for (const d of staticDots) {
    ctx.globalAlpha = d.a;
    ctx.fillStyle = '#c3dbb8';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Small green courtyards and planted strips.
  const greens = [
    [220, 75, 20, 108], [433, 72, 22, 108], [645, 76, 20, 105], [864, 74, 19, 105],
    [220, 257, 22, 89], [432, 257, 21, 90], [645, 258, 19, 90], [865, 257, 20, 90],
    [220, 425, 22, 91], [432, 425, 20, 91], [645, 425, 20, 91], [865, 426, 19, 90],
    [221, 590, 19, 94], [432, 590, 20, 94], [645, 591, 20, 92], [866, 590, 19, 94],
  ];
  for (const [x,y,w,h] of greens) {
    const industrialSector = state.scenarioId === 'grid';
    ctx.fillStyle = industrialSector ? 'rgba(147, 125, 87, .14)' : 'rgba(74, 126, 89, .18)';
    roundRect(ctx,x,y,w,h,5); ctx.fill();
    if (industrialSector) {
      ctx.strokeStyle = 'rgba(207, 176, 119, .18)';
      ctx.lineWidth = 1;
      for (let mark = 0; mark < Math.floor(h / 23); mark++) {
        ctx.beginPath(); ctx.moveTo(x + 3, y + 10 + mark * 23); ctx.lineTo(x + w - 3, y + 10 + mark * 23); ctx.stroke();
      }
    } else {
      for (let i = 0; i < 3; i++) drawTree(x + 5 + i * 6, y + 12 + (i % 2) * (h - 22), .58 + (i % 2) * .12, t);
    }
  }

  // District labels adapt to the selected scenario.
  const scenario = getScenario(state.scenarioId);
  const mapLabels = {
    storm: ['N O R T H   Q U A Y', 'RESIDENTIAL GRID / C', 'LOW-LYING ZONE 04'],
    grid: ['E N E R G Y   N O D E', 'SUBSTATION GRID / I', 'PUMP CONTROL ZONE'],
    evacuation: ['L O W E R   D I S T R I C T', 'EVACUATION ZONE / SOUTH', 'ASSEMBLY POINT / 03'],
  }[scenario.id];
  ctx.save();
  ctx.fillStyle = 'rgba(170, 215, 196, .23)';
  ctx.font = '9px ui-monospace, monospace';
  ctx.letterSpacing = '1.4px';
  ctx.fillText(mapLabels[0], 40, 54);
  ctx.fillText(mapLabels[1], 42, 403);
  ctx.fillText(mapLabels[2], 694, 706);
  ctx.restore();
}

function drawTree(x, y, s = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(5, 16, 17, .28)';
  ctx.beginPath(); ctx.ellipse(1.5, 4, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#244d43'; ctx.beginPath(); ctx.arc(0, 0, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#37705c'; ctx.beginPath(); ctx.arc(-1, -1.3, 3.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(123, 185, 133, ${.19 + .035 * Math.sin(t * .8 + x)})`;
  ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRiver(t) {
  const shore = ctx.createLinearGradient(1018, 0, 1200, 0);
  shore.addColorStop(0, '#1c4a50');
  shore.addColorStop(.12, '#1d5360');
  shore.addColorStop(.36, '#174454');
  shore.addColorStop(1, '#102e43');
  ctx.beginPath();
  ctx.moveTo(1073, 0); ctx.lineTo(1200, 0); ctx.lineTo(1200, 760); ctx.lineTo(1069, 760);
  ctx.lineTo(1061, 642); ctx.lineTo(1070, 541); ctx.lineTo(1058, 425); ctx.lineTo(1072, 308); ctx.lineTo(1063, 199); ctx.lineTo(1077, 96); ctx.closePath();
  ctx.fillStyle = shore; ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.rect(1075, 0, 125, BASE_H); ctx.clip();
  for (let i = 0; i < 17; i++) {
    const y = (i * 51 + t * (8 + (i % 3) * 2)) % 830 - 35;
    const x = 1086 + (i * 17) % 69;
    ctx.strokeStyle = `rgba(96, 205, 206, ${.07 + (i % 4) * .025})`;
    ctx.lineWidth = 1 + (i % 3) * .35;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 14, y - 3, x + 25, y + 3, x + 43, y); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(121, 215, 209, .18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1074, 0); ctx.bezierCurveTo(1056, 133, 1082, 192, 1067, 305); ctx.bezierCurveTo(1057, 425, 1082, 505, 1066, 630); ctx.lineTo(1071, 760); ctx.stroke();

  ctx.save();
  ctx.translate(1112, 370);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(162, 223, 217, .24)';
  ctx.font = '9px ui-monospace, monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText('N O R T H   C H A N N E L', -75, 0);
  ctx.restore();
}

function drawRoads(t) {
  const hYs = [220, 390, 560];
  const vXs = [250, 465, 680, 895];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(2, 11, 16, .65)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#101f27'; ctx.lineWidth = 45;
  for (const y of hYs) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(1065, y); ctx.stroke(); }
  for (const x of vXs) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 715); ctx.stroke(); }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#34484a'; ctx.lineWidth = 40;
  for (const y of hYs) { ctx.beginPath(); ctx.moveTo(38, y); ctx.lineTo(1064, y); ctx.stroke(); }
  for (const x of vXs) { ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, 716); ctx.stroke(); }
  ctx.strokeStyle = '#1d2b33'; ctx.lineWidth = 32;
  for (const y of hYs) { ctx.beginPath(); ctx.moveTo(38, y); ctx.lineTo(1064, y); ctx.stroke(); }
  for (const x of vXs) { ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, 716); ctx.stroke(); }

  // Lane dividers are broken to feel like real city road paint.
  ctx.setLineDash([13, 19]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(177, 205, 191, .22)';
  for (const y of hYs) { ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(1050, y); ctx.stroke(); }
  for (const x of vXs) { ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, 705); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(145, 184, 170, .12)'; ctx.lineWidth = 1;
  for (const y of hYs) { ctx.beginPath(); ctx.moveTo(47, y - 16); ctx.lineTo(1055, y - 16); ctx.stroke(); ctx.beginPath(); ctx.moveTo(47, y + 16); ctx.lineTo(1055, y + 16); ctx.stroke(); }
  for (const x of vXs) { ctx.beginPath(); ctx.moveTo(x - 16, 44); ctx.lineTo(x - 16, 710); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 16, 44); ctx.lineTo(x + 16, 710); ctx.stroke(); }
  ctx.restore();

  // Crosswalks and road reflectors.
  for (const j of junctions) {
    ctx.save(); ctx.translate(j.x, j.y);
    ctx.fillStyle = 'rgba(177, 209, 192, .22)';
    for (let i = -3; i <= 3; i++) {
      roundRect(ctx, -21 + i * 6, -23, 3.2, 8, 1); ctx.fill();
      roundRect(ctx, -21 + i * 6, 15, 3.2, 8, 1); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 199, 125, .5)';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  // Road names on the edge.
  ctx.save(); ctx.fillStyle = 'rgba(150, 183, 172, .37)'; ctx.font = '8px ui-monospace, monospace'; ctx.letterSpacing = '1.1px';
  ctx.fillText('NORTH AVENUE', 64, 202); ctx.fillText('DOCK STREET', 64, 372); ctx.fillText('LOWER QUAY RD', 64, 542);
  ctx.restore();
}

function drawGridInfrastructure(t) {
  if (state.scenarioId !== 'grid') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(227, 185, 117, .22)';
  ctx.lineWidth = 1.25;
  ctx.setLineDash([7, 8]);
  const links = [
    [[442, 122], [657, 300]],
    [[657, 300], [875, 468]],
    [[875, 468], [651, 636]],
  ];
  for (const [[x1, y1], [x2, y2]] of links) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 55, y1 + 36, x2 - 45, y2 - 32, x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const pylons = [[442, 122], [657, 300], [875, 468], [651, 636]];
  for (const [x, y] of pylons) {
    ctx.shadowColor = 'rgba(255, 190, 106, .28)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(209, 177, 121, .62)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - 17); ctx.lineTo(x - 11, y + 17); ctx.lineTo(x + 11, y + 17); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x, y + 18);
    ctx.moveTo(x - 8, y - 4); ctx.lineTo(x + 8, y - 4);
    ctx.moveTo(x - 10, y + 5); ctx.lineTo(x + 10, y + 5);
    ctx.moveTo(x - 14, y - 12); ctx.lineTo(x + 14, y - 12);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = state.grid < 28 ? '#ff8a75' : `rgba(255, 203, 123, ${.6 + .2 * Math.sin(t * 3 + x)})`;
    ctx.beginPath(); ctx.arc(x, y - 18, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEvacuationScene(t) {
  if (state.scenarioId !== 'evacuation') return;
  ctx.save();
  // Amber lane-control arrows make the crowded evacuation corridor distinct from the storm map.
  ctx.strokeStyle = 'rgba(255, 184, 110, .72)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -t * 14;
  ctx.beginPath(); ctx.moveTo(298, 548); ctx.lineTo(470, 548); ctx.stroke();
  ctx.setLineDash([]);
  for (let x = 620; x <= 665; x += 15) {
    ctx.fillStyle = '#e7a76d';
    ctx.beginPath(); ctx.moveTo(x, 534); ctx.lineTo(x + 5, 545); ctx.lineTo(x - 1, 545); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26373a'; ctx.fillRect(x - 1, 545, 4, 5);
  }
  // Small groups waiting beside the evacuation assembly point.
  const people = [[280, 520], [291, 516], [302, 523], [312, 516], [324, 521], [336, 515], [348, 523], [360, 518], [371, 522]];
  people.forEach(([x, y], i) => {
    const sway = Math.sin(t * 1.4 + i * .8) * .65;
    ctx.fillStyle = i % 3 === 0 ? '#f0b777' : i % 3 === 1 ? '#9bcfc1' : '#d6d8c4';
    ctx.beginPath(); ctx.arc(x + sway, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(208, 224, 211, .75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + sway, y - 1); ctx.lineTo(x + sway, y + 4); ctx.moveTo(x + sway, y + 1); ctx.lineTo(x - 2 + sway, y + 3); ctx.moveTo(x + sway, y + 1); ctx.lineTo(x + 2 + sway, y + 3); ctx.stroke();
  });
  ctx.fillStyle = 'rgba(255, 191, 126, .84)';
  ctx.font = '8px ui-monospace, monospace';
  ctx.fillText('ASSEMBLY / FLOW CONTROL', 294, 507);
  ctx.restore();
}

function drawBuilding(b, t, idx) {
  const { x, y, w, h, kind } = b;
  let palettes = {
    residential: ['#314b4b', '#263d40', '#45625c'],
    office: ['#2d464b', '#21383f', '#4a6969'],
    industrial: ['#354c49', '#263e3e', '#68736a'],
    shelter: ['#3a5550', '#24443f', '#7bba9d'],
    hospital: ['#405957', '#2d4648', '#92c8b7'],
    pump: ['#46574e', '#2d423c', '#c0a679'],
  }[kind] || ['#314b4b', '#263d40', '#45625c'];
  if (state.scenarioId === 'grid') {
    const industrialPalettes = {
      residential: ['#414847', '#303839', '#777c70'],
      office: ['#3a4546', '#293639', '#8a8b79'],
      industrial: ['#4a5149', '#323b3b', '#c0a36e'],
      shelter: ['#424b43', '#2e3d38', '#a7a17e'],
      hospital: ['#4a5048', '#303d3c', '#d2b47e'],
      pump: ['#4b5148', '#2e3938', '#e1b979'],
    };
    palettes = industrialPalettes[kind] || palettes;
  } else if (state.scenarioId === 'evacuation' && kind === 'shelter') {
    palettes = ['#465b52', '#2d4641', '#e1b579'];
  }
  const inset = kind === 'hospital' ? 5 : 7;
  ctx.save();
  // Building shadow and lot.
  ctx.fillStyle = 'rgba(2, 10, 13, .38)';
  roundRect(ctx, x - 4, y + 4, w + 9, h + 8, 5); ctx.fill();
  ctx.fillStyle = kind === 'pump' ? '#2c463f' : '#2a413e';
  roundRect(ctx, x - 4, y - 3, w + 8, h + 7, 5); ctx.fill();
  ctx.fillStyle = palettes[0];
  roundRect(ctx, x, y, w, h, 3); ctx.fill();

  // Roof gradient and technical partitions.
  const roof = ctx.createLinearGradient(x, y, x + w, y + h);
  roof.addColorStop(0, palettes[2]); roof.addColorStop(.35, palettes[0]); roof.addColorStop(1, palettes[1]);
  ctx.fillStyle = roof;
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(186, 222, 201, .10)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + inset + 1, y + inset + 1, w - inset * 2 - 2, h - inset * 2 - 2);

  if (kind === 'hospital') {
    // Roof wings and solar-lit medical cross.
    ctx.fillStyle = '#476b67';
    ctx.fillRect(x + 14, y + 14, 35, h - 28);
    ctx.fillRect(x + w - 49, y + 14, 33, h - 28);
    ctx.fillStyle = 'rgba(141, 205, 186, .22)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 20 + i * 8, y + 23, 3, h - 46);
    ctx.fillStyle = '#d2e6ce'; ctx.fillRect(x + w / 2 - 4, y + 19, 8, 27); ctx.fillRect(x + w / 2 - 14, y + 28, 28, 8);
    ctx.fillStyle = '#203c3d'; ctx.fillRect(x + w / 2 - 10, y + h - 21, 20, 11);
    ctx.fillStyle = '#9ecdc0'; ctx.fillRect(x + w / 2 - 7, y + h - 18, 14, 6);
  } else if (kind === 'pump') {
    ctx.fillStyle = '#172e31';
    for (let i = 0; i < 3; i++) {
      roundRect(ctx, x + 13 + i * 24, y + 13, 17, h - 26, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(155,204,185,.3)'; ctx.strokeRect(x + 16 + i * 24, y + 16, 11, h - 32);
    }
    ctx.fillStyle = '#d7b77c'; ctx.fillRect(x + w - 26, y + 15, 5, 5);
  } else if (kind === 'shelter') {
    ctx.fillStyle = 'rgba(181, 223, 187, .12)';
    ctx.fillRect(x + 12, y + 15, w - 24, h - 30);
    ctx.strokeStyle = '#7bb89c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 20); ctx.lineTo(x + w / 2, y + h - 20); ctx.moveTo(x + 23, y + h / 2); ctx.lineTo(x + w - 23, y + h / 2); ctx.stroke();
    ctx.fillStyle = '#b4e2bb'; ctx.fillRect(x + w / 2 - 4, y + h / 2 - 4, 8, 8);
  } else if (kind === 'industrial') {
    ctx.fillStyle = 'rgba(10, 24, 26, .4)'; ctx.fillRect(x + 12, y + 13, w - 24, h - 26);
    ctx.strokeStyle = 'rgba(176, 203, 179, .21)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 17 + i * (w - 35) / 3, y + 16); ctx.lineTo(x + 17 + i * (w - 35) / 3, y + h - 17); ctx.stroke(); }
    ctx.fillStyle = '#52665a'; ctx.fillRect(x + 15, y + 15, w * .38, h * .22);
    ctx.fillStyle = '#67746a'; ctx.fillRect(x + w * .56, y + h * .57, w * .25, h * .2);
    if (state.scenarioId === 'grid') {
      const stackXs = [x + w * .27, x + w * .68];
      stackXs.forEach((sx, n) => {
        ctx.fillStyle = '#202c2e'; roundRect(ctx, sx, y + 6, 9, 25, 2); ctx.fill();
        ctx.fillStyle = '#b88c55'; ctx.fillRect(sx - 1, y + 8, 11, 3);
        ctx.strokeStyle = `rgba(210, 187, 140, ${.12 + .05 * Math.sin(t * 1.7 + n)})`;
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx + 4, y + 8); ctx.lineTo(sx + 4, y + 29); ctx.stroke();
      });
      ctx.fillStyle = `rgba(255, 190, 104, ${.48 + .18 * Math.sin(t * 2.5 + idx)})`;
      ctx.beginPath(); ctx.arc(x + w - 13, y + 11, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Apartment / office rooftops with repeating HVAC and skylight details.
    ctx.fillStyle = 'rgba(10, 25, 28, .35)';
    ctx.fillRect(x + 13, y + 13, w - 26, h - 26);
    const cols = Math.max(3, Math.floor((w - 25) / 21));
    const rows = Math.max(2, Math.floor((h - 28) / 20));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bx = x + 16 + col * ((w - 34) / cols);
        const by = y + 16 + row * ((h - 34) / rows);
        ctx.fillStyle = (row + col + idx) % 4 === 0 ? 'rgba(165, 207, 192, .20)' : 'rgba(110, 158, 148, .13)';
        ctx.fillRect(bx, by, Math.max(4, (w - 45) / cols), Math.max(4, (h - 45) / rows));
      }
    }
    ctx.fillStyle = '#1c3437';
    roundRect(ctx, x + w * .61, y + h * .14, w * .19, h * .21, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(143,195,177,.19)'; ctx.strokeRect(x + w * .62, y + h * .15, w * .17, h * .19);
  }

  // Rooftop rim and incident glow.
  ctx.strokeStyle = 'rgba(176, 213, 194, .13)'; ctx.lineWidth = 1;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 3); ctx.stroke();
  if (kind === 'hospital') {
    const glow = .26 + .12 * Math.sin(t * 2.3);
    ctx.fillStyle = `rgba(255, 190, 119, ${glow})`;
    ctx.beginPath(); ctx.arc(x + w - 12, y + 13, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawNeighborhoodDecor(t) {
  // Rooftop aerials and warm windows breathe very slightly, not flashy neon.
  const specs = [
    [110, 113], [315, 118], [530, 112], [748, 111], [944, 111],
    [110, 285], [315, 286], [523, 281], [941, 285], [110, 459], [316, 457], [529, 460], [744, 459], [943, 461],
    [113, 621], [315, 625], [530, 624], [743, 624],
  ];
  ctx.save();
  for (let i = 0; i < specs.length; i++) {
    const [x, y] = specs[i];
    const glow = .12 + .09 * (Math.sin(t * 1.8 + i) + 1);
    ctx.shadowColor = 'rgba(255, 179, 105, .45)'; ctx.shadowBlur = 7;
    ctx.fillStyle = `rgba(255, 196, 132, ${glow})`;
    roundRect(ctx, x, y, 3.4, 4.6, 1); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawFlood(t) {
  const level = state.water;
  const frontX = 1072 - Math.max(0, level - 14) * 2.45;
  const frontY = 385 - Math.max(0, level - 15) * .88;
  const water = ctx.createLinearGradient(frontX, frontY, 1080, 700);
  water.addColorStop(0, `rgba(67, 178, 203, ${.10 + level * .0015})`);
  water.addColorStop(.55, `rgba(31, 125, 165, ${.22 + level * .0018})`);
  water.addColorStop(1, 'rgba(18, 73, 112, .68)');
  ctx.beginPath();
  ctx.moveTo(1070, 312);
  ctx.bezierCurveTo(1046, 334, frontX + 40, frontY - 44, frontX, frontY + 15);
  ctx.bezierCurveTo(frontX - 18, 464, frontX + 31, 509, frontX - 9, 567);
  ctx.bezierCurveTo(frontX - 40, 642, frontX + 22, 691, frontX - 3, 760);
  ctx.lineTo(1200, 760); ctx.lineTo(1200, 0); ctx.lineTo(1073, 0);
  ctx.bezierCurveTo(1064, 111, 1083, 213, 1070, 312);
  ctx.closePath(); ctx.fillStyle = water; ctx.fill();

  // The waterline spills across low streets in visible sheets.
  const streetAlpha = .11 + smooth(28, 70, level) * .28;
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(64, 169, 202, ${streetAlpha})`;
  ctx.lineWidth = 21;
  ctx.beginPath(); ctx.moveTo(Math.max(880, frontX - 100), 560); ctx.lineTo(1073, 560); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(Math.max(920, frontX - 62), 390); ctx.lineTo(1070, 390); ctx.stroke();
  ctx.strokeStyle = `rgba(125, 226, 222, ${.10 + level * .0014})`;
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 9; i++) {
    const y = 354 + i * 39;
    const shift = Math.sin(t * 1.2 + i * .7) * 10;
    ctx.beginPath(); ctx.moveTo(Math.max(frontX - 20, 965) + shift, y); ctx.bezierCurveTo(1040, y - 4, 1080, y + 4, 1137, y - 1); ctx.stroke();
  }
  // As the flood advances it branches into the low street grid. These thin,
  // animated sheets make changing water levels visible on the map itself.
  const inland = smooth(34, 74, level);
  if (inland > 0.005) {
    const left = 1010 - inland * 285;
    ctx.save();
    ctx.globalAlpha = .18 + inland * .54;
    const streetSheet = ctx.createLinearGradient(left, 0, 1068, 0);
    streetSheet.addColorStop(0, 'rgba(37,132,165,0)');
    streetSheet.addColorStop(.32, 'rgba(45,156,188,.42)');
    streetSheet.addColorStop(1, 'rgba(72,186,203,.66)');
    ctx.fillStyle = streetSheet;
    ctx.beginPath();
    ctx.moveTo(left, 548 + Math.sin(t * 1.1) * 3);
    ctx.bezierCurveTo(left + 55, 541, left + 86, 552, left + 118, 548);
    ctx.lineTo(1070, 545); ctx.lineTo(1070, 578);
    ctx.bezierCurveTo(left + 135, 583, left + 70, 568, left, 576); ctx.closePath(); ctx.fill();
    // The vertical connecting road carries runoff toward the lower junction.
    ctx.fillStyle = `rgba(49,151,185,${.12 + inland * .28})`;
    ctx.beginPath(); ctx.moveTo(881, 425); ctx.bezierCurveTo(889, 452, 886, 487, 889, 520);
    ctx.lineTo(903, 548); ctx.lineTo(914, 548); ctx.bezierCurveTo(904, 500, 912, 461, 906, 425); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(164,239,231,${.11 + inland * .27})`; ctx.lineWidth = .9;
    for (let i = 0; i < 7; i++) {
      const x = left + ((i * 43 + t * (9 + i % 3 * 2)) % Math.max(24, 285 * inland));
      const y = 551 + Math.sin(t * 1.6 + i * .8) * 7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 7, y - 2, x + 15, y + 3, x + 23, y); ctx.stroke();
    }
    // A foam line tracks the incoming edge more quickly as the water becomes critical.
    ctx.globalAlpha = .28 + inland * .58;
    ctx.strokeStyle = level >= 58 ? 'rgba(255,181,132,.7)' : 'rgba(160,236,230,.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(left, 544 + Math.sin(t * 2) * 2); ctx.bezierCurveTo(left + 28, 538, left + 51, 550, left + 80, 544); ctx.stroke();
    ctx.restore();
  }

  // Rain streaks concentrate over the exposed coastline.
  ctx.save();
  ctx.strokeStyle = 'rgba(168, 223, 225, .12)'; ctx.lineWidth = .75;
  for (let i = 0; i < 55; i++) {
    const x = (i * 97 + t * 19) % 1110;
    const y = (i * 71 + t * 47) % 730;
    const active = x > frontX - 40 || (i % 6 === 0 && x > 680);
    if (!active) continue;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 8 + (i % 3) * 3); ctx.stroke();
  }
  ctx.restore();

  // Water sensors at several depths make rising danger legible on the actual map.
  const sensorX = clamp(frontX + 15, 900, 1080);
  const sensorY = clamp(frontY + 18, 340, 600);
  ctx.save();
  ctx.globalAlpha = .7;
  ctx.strokeStyle = level > 58 ? '#ffad7d' : '#7ed8e6'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(sensorX, sensorY, 8 + 2 * Math.sin(t * 2), 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(sensorX, sensorY, 15 + 2 * Math.sin(t * 1.3), 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

const PRIORITY_ROUTES = {
  'J-02': [[250, 560], [250, 390], [465, 390], [895, 390], [895, 560]],
  'J-04': [[465, 390], [895, 390], [895, 560]],
  'J-07': [[680, 390], [895, 390], [895, 560]],
  'J-09': [[895, 560], [895, 390], [680, 390]],
  'J-11': [[895, 390], [895, 560]],
};

function activePriorityRoute() {
  return PRIORITY_ROUTES[state.targets.traffic] || PRIORITY_ROUTES['J-04'];
}

function pointOnPolyline(points, distance) {
  const segments = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const length = Math.hypot(x2 - x1, y2 - y1);
    segments.push({ x1, y1, x2, y2, length, angle: Math.atan2(y2 - y1, x2 - x1) });
    total += length;
  }
  let remaining = ((distance % total) + total) % total;
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const f = segment.length ? remaining / segment.length : 0;
      return { x: lerp(segment.x1, segment.x2, f), y: lerp(segment.y1, segment.y2, f), angle: segment.angle };
    }
    remaining -= segment.length;
  }
  const last = segments[segments.length - 1];
  return { x: last.x2, y: last.y2, angle: last.angle };
}

function drawRoute(t) {
  if (!state.corridorOpen) return;
  const points = activePriorityRoute();
  const trace = () => {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(83, 226, 202, .13)'; ctx.lineWidth = 18;
  trace(); ctx.stroke();
  ctx.strokeStyle = 'rgba(114, 240, 211, .72)'; ctx.lineWidth = 2.4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 12;
  trace(); ctx.stroke();
  ctx.setLineDash([]);
  const total = points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0);
  const marker = pointOnPolyline(points, (t * 70) % total);
  ctx.fillStyle = 'rgba(144, 255, 221, .95)';
  ctx.shadowColor = 'rgba(97,255,224,.8)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(marker.x, marker.y, 3 + Math.sin(t * 4) * .5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawVehicle(x, y, angle, color, glow = false, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.fillStyle = 'rgba(1, 7, 12, .64)'; roundRect(ctx, -9, -5, 20, 12, 3.2); ctx.fill();
  if (glow) { ctx.globalAlpha = .22; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(1, 1, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  const car = ctx.createLinearGradient(-7, -4, 8, 5);
  car.addColorStop(0, color); car.addColorStop(1, '#1c3439');
  ctx.fillStyle = car; roundRect(ctx, -8, -5, 16, 9, 2.5); ctx.fill();
  ctx.fillStyle = 'rgba(190, 229, 218, .52)'; roundRect(ctx, -3, -3.6, 6, 6.4, 1.4); ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 165, .7)'; ctx.fillRect(6, -3, 1.5, 1.7); ctx.fillRect(6, 1.5, 1.5, 1.7);
  ctx.fillStyle = 'rgba(255, 100, 94, .54)'; ctx.fillRect(-8, -3, 1.3, 1.6); ctx.fillRect(-8, 1.7, 1.3, 1.6);
  ctx.restore();
}

function drawTraffic(t) {
  // The traffic pattern is deterministic; congestion visibly reduces density after routing.
  const count = state.corridorOpen ? Math.max(6, Math.round(7 + state.congestion / 18)) : Math.round(8 + state.congestion / 8);
  for (let i = 0; i < count; i++) {
    const range = 955;
    let p = (t * (18 + (i % 4) * 3) + i * 97) % range;
    let x = 56 + p;
    let y = [210, 230, 380, 400, 550, 570][i % 6];
    if (state.water > 52 && y > 530 && x > 830) y += 3 * Math.sin(t * 2 + i);
    const laneAngle = (i % 3 === 0) ? Math.PI : 0;
    drawVehicle(x, y + Math.sin(t * 1.5 + i) * .55, laneAngle, i % 5 === 0 ? '#d1b681' : (i % 2 ? '#739f9d' : '#7a8e8f'), false, .78);
  }
  for (let i = 0; i < 7; i++) {
    const range = 615;
    const y = 68 + ((t * (17 + i % 3 * 4) + i * 107) % range);
    const x = [239, 261, 454, 476, 669, 691, 884][i];
    drawVehicle(x + Math.sin(t + i) * .7, y, Math.PI / 2, '#829997', false, .72);
  }
  if (state.corridorOpen) {
    // Emergency vehicle follows the actual route selected by the player.
    const points = activePriorityRoute();
    const total = points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0);
    const vehicle = pointOnPolyline(points, (t * 54) % total);
    drawVehicle(vehicle.x, vehicle.y - 9, vehicle.angle, '#e6ebe1', true, .93);
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y - 9); ctx.rotate(vehicle.angle);
    ctx.fillStyle = `rgba(223,107,108,${.45 + .5 * Math.sin(t * 12)})`; ctx.fillRect(3, -5, 5, 3);
    ctx.fillStyle = `rgba(104,215,209,${.45 + .5 * Math.sin(t * 12 + Math.PI)})`; ctx.fillRect(7, -5, 4, 3);
    ctx.restore();
  } else {
    // A trapped ambulance hints at the blocked route.
    const blink = .45 + .45 * Math.sin(t * 5);
    drawVehicle(638, 379, 0, '#e5e4d4', true, .95);
    ctx.save(); ctx.fillStyle = `rgba(255, 76, 83, ${blink})`; ctx.fillRect(642, 375, 5, 3); ctx.fillStyle = `rgba(83, 179, 240, ${1 - blink})`; ctx.fillRect(647, 375, 4, 3); ctx.restore();
  }
}

function drawAssetIcon(x, y, type, pulse, selected, used) {
  ctx.save();
  const accent = type === 'hospital' ? '#ffc47d' : type === 'pump' ? '#80d9e4' : type === 'gate' ? '#7bd8ec' : '#77dccc';
  if (selected) {
    ctx.shadowColor = accent; ctx.shadowBlur = 18;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y, 22 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10,28,31,.8)'; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = used ? 'rgba(114,224,204,.23)' : 'rgba(182,219,204,.28)';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(10,28,31,.72)'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = used ? '#69cdb8' : accent; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (type === 'hospital') {
    ctx.strokeRect(x - 5, y - 6, 10, 12); ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.stroke();
  } else if (type === 'pump') {
    ctx.beginPath(); ctx.arc(x, y + 1, 5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x + 8, y - 6); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 10); ctx.stroke();
  } else if (type === 'gate') {
    ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x - 6, y + 5); ctx.lineTo(x + 6, y + 5); ctx.stroke();
  }
  ctx.restore();
}

function drawJunctionTarget(target, t, selected, used) {
  ctx.save();
  if (selected) {
    ctx.strokeStyle = 'rgba(122, 198, 255, .7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(target.x, target.y, 20 + Math.sin(t * 3) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(122, 198, 255, .26)'; ctx.beginPath(); ctx.arc(target.x, target.y, 28 + Math.sin(t * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8ac6ff'; ctx.beginPath(); ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  const ringColor = state.corridorOpen && target.id === state.targets.traffic ? '#74dfc8' : 'rgba(144, 191, 185, .48)';
  ctx.strokeStyle = ringColor; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(target.x, target.y, 9, 0, Math.PI * 2); ctx.stroke();
  if (!used && selected) {
    ctx.fillStyle = 'rgba(123, 188, 255, .12)'; ctx.beginPath(); ctx.arc(target.x, target.y, 13, 0, Math.PI * 2); ctx.fill();
  }
  if (state.corridorOpen && target.id === state.targets.traffic) {
    ctx.fillStyle = 'rgba(114,224,204,.95)'; ctx.beginPath(); ctx.arc(target.x, target.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawMapLabels(t) {
  ctx.save();
  // Hospital label and power state.
  ctx.font = '8px ui-monospace, monospace'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(198, 226, 210, .82)'; ctx.fillText('MEDICAL CENTRE', 730, 361);
  ctx.fillStyle = state.hospitalBackup ? '#72e0cc' : (state.grid < 45 ? '#ff8583' : '#ffca8e');
  ctx.beginPath(); ctx.arc(835, 282, 2.2 + Math.sin(t * 3) * .7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = state.hospitalBackup ? '#78dfc9' : '#c3ad83'; ctx.fillText(state.hospitalBackup ? 'BACKUP ONLINE' : 'GRID / 04', 851, 283);
  ctx.fillStyle = 'rgba(189, 219, 202, .65)'; ctx.fillText('EVACUATION POINT', 297, 529);
  ctx.fillStyle = state.pumpPowerCut ? '#ff8279' : state.pumpActive ? '#79dfd0' : '#b6c2ab'; ctx.fillText(state.pumpPowerCut ? 'PUMP / POWER LOST' : state.pumpActive ? 'PUMP / ACTIVE' : 'PUMP STATION', 915, 697);

  // Small road-node labels.
  for (const j of junctions) {
    if (state.corridorOpen && j.id === state.targets.traffic) {
      ctx.fillStyle = 'rgba(106,234,203,.9)'; ctx.fillText('PRIORITY', j.x - 24, j.y + 33);
    }
  }
  if (state.gateOpen) {
    const gate = gateTargets.find(g => g.id === state.gateOpen);
    if (gate) {
      ctx.fillStyle = '#85def0'; ctx.fillText('OPEN / RELEASE', gate.x - 39, gate.y + 26);
    }
  }
  ctx.restore();
}

function drawWetSurface(t) {
  // Glossy wet asphalt and shallow puddles make the map read as a cinematic storm scene.
  const horizontalRoads = [220, 390, 560];
  const verticalRoads = [250, 465, 680, 895];
  ctx.save();
  ctx.lineCap = 'round';
  for (const y of horizontalRoads) {
    const sheen = ctx.createLinearGradient(0, y - 16, 0, y + 16);
    sheen.addColorStop(0, 'rgba(115, 185, 194, .025)');
    sheen.addColorStop(.45, 'rgba(159, 210, 210, .085)');
    sheen.addColorStop(1, 'rgba(56, 126, 145, .035)');
    ctx.strokeStyle = sheen; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(43, y); ctx.lineTo(1064, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(166, 215, 213, .06)'; ctx.lineWidth = 1;
    for (let k = 0; k < 8; k++) {
      const x = 75 + ((k * 137 + t * (8 + k % 3)) % 955);
      ctx.beginPath(); ctx.moveTo(x, y - 11 + (k % 3) * 9); ctx.lineTo(x + 17 + (k % 4) * 4, y - 11 + (k % 3) * 9); ctx.stroke();
    }
  }
  for (const x of verticalRoads) {
    const sheen = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
    sheen.addColorStop(0, 'rgba(65, 130, 149, .025)');
    sheen.addColorStop(.5, 'rgba(158, 213, 214, .065)');
    sheen.addColorStop(1, 'rgba(65, 130, 149, .02)');
    ctx.strokeStyle = sheen; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(x, 43); ctx.lineTo(x, 714); ctx.stroke();
  }

  // Deterministic puddles keep the frame stable while their highlights move with the rain.
  const puddles = [
    [108, 212, 22, 3], [332, 227, 17, 2], [583, 209, 25, 3], [764, 237, 19, 3],
    [367, 381, 27, 3], [553, 401, 15, 2], [829, 375, 22, 3], [143, 549, 18, 2],
    [344, 574, 25, 3], [721, 543, 19, 2], [953, 581, 20, 3], [804, 218, 13, 2],
  ];
  for (let i = 0; i < puddles.length; i++) {
    const [x, y, rx, ry] = puddles[i];
    ctx.fillStyle = 'rgba(3, 19, 27, .24)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, Math.sin(i * 2) * .06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(146, 207, 212, ${.035 + .025 * (Math.sin(t * 1.7 + i) + 1)})`;
    ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(x + Math.sin(t + i) * 2, y, rx * .72, ry * .65, 0, .15, Math.PI * .94); ctx.stroke();
  }
  ctx.restore();
}

function drawRainLayer(t) {
  ctx.save();
  ctx.lineCap = 'round';
  // Two depth layers: distant fine rain and a small number of brighter foreground streaks.
  const profile = getAtmosphereProfile(state.scenarioId, renderQuality, isReducedMotion());
  const rainCount = profile.particleCount;
  const motionT = t * profile.motionScale;
  for (let i = 0; i < rainCount; i++) {
    const x = ((i * 83 + motionT * (31 + i % 5 * 3)) % 1240) - 18;
    const y = ((i * 59 + motionT * (68 + i % 4 * 9)) % 800) - 20;
    const foreground = i % 7 === 0;
    ctx.strokeStyle = foreground ? 'rgba(169, 226, 230, .18)' : 'rgba(142, 199, 208, .075)';
    ctx.lineWidth = foreground ? 1.05 : .62;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (foreground ? 4.5 : 2.8), y + (foreground ? 14 : 9)); ctx.stroke();
  }
  // Low mist drifts over the channel and the exposed harbour edge.
  const mist = ctx.createLinearGradient(890, 0, 1165, 0);
  mist.addColorStop(0, 'rgba(129, 205, 211, 0)');
  mist.addColorStop(.58, `rgba(106, 176, 191, ${.025 + .012 * Math.sin(motionT * .37)})`);
  mist.addColorStop(1, 'rgba(125, 202, 210, .075)');
  ctx.fillStyle = mist; ctx.fillRect(880, 0, 320, BASE_H);
  ctx.restore();
}

function drawGridElectricalAtmosphere(t) {
  const profile = getAtmosphereProfile('grid', renderQuality, isReducedMotion());
  const stress = clamp((82 - state.grid) / 82, 0, 1);
  const motionT = t * profile.motionScale;
  const node = { x: 965, y: 119 };
  const pulse = 0.5 + 0.5 * Math.sin(motionT * (1.2 + stress * 2.6));
  const glowRadius = 32 + stress * 36 + pulse * 10;
  ctx.save();
  const glow = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, glowRadius);
  glow.addColorStop(0, `rgba(255,198,112,${(0.10 + stress * 0.18 + pulse * 0.05) * profile.glow})`);
  glow.addColorStop(.42, `rgba(99,210,218,${(0.045 + stress * 0.08) * profile.glow})`);
  glow.addColorStop(1, 'rgba(60,155,180,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(node.x - glowRadius, node.y - glowRadius, glowRadius * 2, glowRadius * 2);
  // Electrical stress is visible in the grid itself; this is a rendered warning, not a simulated electrical arc in the physics model.
  ctx.globalAlpha = 0.20 + stress * 0.5;
  ctx.strokeStyle = state.grid < 30 ? '#ffb06d' : '#82e0de';
  ctx.lineWidth = 1.15 + stress * 0.6;
  ctx.setLineDash([3, 4]);
  ctx.lineDashOffset = -motionT * (3 + stress * 8);
  [[node.x, node.y, 1080, 120], [node.x, node.y, 895, 210], [node.x, node.y, 895, 390]].forEach(([x1, y1, x2, y2], i) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (i - 1) * 14, y1 + 30);
    ctx.lineTo((x1 + x2) / 2 + Math.sin(motionT * 2 + i) * 5, (y1 + y2) / 2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  if (!isReducedMotion() && renderQuality > 0.48) {
    const sparks = Math.max(5, Math.round(profile.particleCount * (0.22 + stress * 0.3)));
    for (let i = 0; i < sparks; i++) {
      const particle = ambientParticleAt(i, motionT * (0.6 + stress), BASE_W, BASE_H, 'grid');
      const localX = node.x + Math.sin(particle.phase + motionT * 2.1) * (9 + stress * 23);
      const localY = node.y + Math.cos(particle.phase * 1.7 + motionT * 1.6) * (6 + stress * 19);
      ctx.globalAlpha = particle.alpha * (0.4 + stress * 1.5);
      ctx.fillStyle = i % 4 === 0 ? '#ffc779' : '#90e9e6';
      ctx.shadowBlur = 5 * profile.glow;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(localX, localY, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEvacuationAtmosphere(t) {
  const profile = getAtmosphereProfile('evacuation', renderQuality, isReducedMotion());
  const motionT = t * profile.motionScale;
  ctx.save();
  // Low haze around the southern assembly corridor, with restrained warm emergency lighting.
  const haze = ctx.createLinearGradient(60, 440, 1080, 700);
  haze.addColorStop(0, 'rgba(198,164,119,0)');
  haze.addColorStop(.55, `rgba(202,151,100,${0.018 * profile.glow})`);
  haze.addColorStop(1, `rgba(238,157,94,${0.05 * profile.glow})`);
  ctx.fillStyle = haze;
  ctx.fillRect(42, 410, 1040, 310);

  const motes = profile.particleCount;
  for (let i = 0; i < motes; i++) {
    const particle = ambientParticleAt(i, motionT, BASE_W, BASE_H, 'evacuation');
    const x = 110 + ((particle.x + 110) % 980);
    const y = 390 + ((particle.y * .48 + i * 17) % 315);
    ctx.globalAlpha = particle.alpha * profile.glow;
    ctx.fillStyle = i % 6 === 0 ? '#ffc17d' : '#b7d7cd';
    ctx.beginPath();
    ctx.ellipse(x, y, particle.radius * 1.8, particle.radius * .75, -0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Alternating beacon glows on the evacuation route. The subdued pulse avoids camera-flash intensity.
  const beacons = [[250, 390], [465, 390], [680, 390], [895, 390], [895, 560]];
  beacons.forEach(([x, y], i) => {
    const phase = motionT * 4.1 + i * 1.9;
    const strength = isReducedMotion() ? 0.26 : 0.16 + 0.36 * (0.5 + 0.5 * Math.sin(phase));
    const color = i % 2 ? '72,190,230' : '255,171,99';
    const g = ctx.createRadialGradient(x, y - 5, 1, x, y - 5, 19);
    g.addColorStop(0, `rgba(${color},${strength * profile.glow})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 20, y - 25, 40, 40);
  });
  ctx.restore();
}

function drawScenarioAtmosphere(t) {
  if (state.scenarioId === 'storm') drawRainLayer(t);
  else if (state.scenarioId === 'grid') drawGridElectricalAtmosphere(t);
  else if (state.scenarioId === 'evacuation') drawEvacuationAtmosphere(t);
}

function drawCinematicGrade(t) {
  ctx.save();
  // Very restrained cool bloom around the harbour: ambient lighting, not a UI glow wash.
  const bloom = ctx.createRadialGradient(1080, 360, 5, 1080, 360, 315);
  bloom.addColorStop(0, `rgba(73, 188, 208, ${.035 + .014 * Math.sin(t * .45)})`);
  bloom.addColorStop(.45, 'rgba(49, 132, 164, .025)');
  bloom.addColorStop(1, 'rgba(22, 79, 108, 0)');
  ctx.fillStyle = bloom; ctx.fillRect(730, 40, 470, 660);

  const vignette = ctx.createRadialGradient(590, 365, 175, 600, 375, 775);
  vignette.addColorStop(0, 'rgba(1, 9, 16, 0)');
  vignette.addColorStop(.67, 'rgba(1, 8, 15, .035)');
  vignette.addColorStop(1, 'rgba(1, 7, 13, .24)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Irregular, deterministic storm lightning: two short, restrained pulses and a
  // branching bolt. It is tied to the storm scenario and disabled for reduced-motion users.
  if (state.scenarioId === 'storm' && state.phase === 'running' && getAtmosphereProfile('storm', renderQuality, isReducedMotion()).lightning) {
    const cycleLength = 13.6;
    const cycle = Math.floor(t / cycleLength);
    const cycleTime = t - cycle * cycleLength;
    const seedRaw = Math.sin((cycle + 1) * 127.1 + 311.7) * 43758.5453;
    const seed = seedRaw - Math.floor(seedRaw);
    const strikeAt = 1.25 + seed * 9.8;
    const age = cycleTime - strikeAt;
    let flash = 0;
    if (age >= 0 && age < .035) flash = age / .035;
    else if (age >= .035 && age < .062) flash = .74 * (1 - (age - .035) / .027);
    else if (age >= .108 && age < .132) flash = .38 * (1 - (age - .108) / .024);
    if (flash > .015) {
      const severity = state.water > 45 ? 1 : .68;
      const tint = flash * severity * (renderQuality < .8 ? .045 : .07);
      const lightning = ctx.createLinearGradient(0, 0, 850, 560);
      lightning.addColorStop(0, `rgba(186, 229, 241, ${tint})`);
      lightning.addColorStop(.45, `rgba(107, 184, 211, ${tint * .38})`);
      lightning.addColorStop(1, 'rgba(67, 138, 173, 0)');
      ctx.fillStyle = lightning; ctx.fillRect(0, 0, BASE_W, BASE_H);

      const startX = 835 + seed * 245;
      const startY = 25;
      const points = [
        [startX, startY],
        [startX - 22, 67 + seed * 16],
        [startX + 6, 92 + seed * 22],
        [startX - 35, 132 + seed * 19],
        [startX - 12, 157 + seed * 20],
        [startX - 58, 205 + seed * 18],
      ];
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = flash * (renderQuality < .8 ? .48 : .74);
      ctx.strokeStyle = '#83d9f4'; ctx.lineWidth = 4.2; ctx.shadowColor = '#8de1ff'; ctx.shadowBlur = 15;
      ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(232,248,255,.96)'; ctx.lineWidth = 1.15;
      ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.strokeStyle = 'rgba(180,232,250,.88)'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(points[2][0], points[2][1]); ctx.lineTo(points[2][0] + 29, points[2][1] + 10); ctx.lineTo(points[2][0] + 20, points[2][1] + 29); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(points[3][0], points[3][1]); ctx.lineTo(points[3][0] - 22, points[3][1] + 9); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}


function drawCascadeOverlays(t) {
  // World-space, event-driven visual feedback for the infrastructure cascade.
  if (state.substationFlooded) {
    ctx.save();
    const reduceMotion = isReducedMotion();
    const pulse = reduceMotion ? .58 : .45 + .22 * Math.sin(t * 3.1);
    const floodGlow = ctx.createRadialGradient(965, 119, 7, 965, 119, 86);
    floodGlow.addColorStop(0, `rgba(255, 127, 91, ${.10 + pulse * .08})`);
    floodGlow.addColorStop(.55, 'rgba(235, 115, 83, .055)');
    floodGlow.addColorStop(1, 'rgba(235, 115, 83, 0)');
    ctx.fillStyle = floodGlow;
    ctx.fillRect(875, 32, 180, 175);
    ctx.strokeStyle = `rgba(255, 145, 101, ${pulse})`;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.ellipse(965, 119, 47 + Math.sin(t * 1.4) * 2, 38 + Math.sin(t * 1.4) * 2, -.18, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 168, 127, .95)';
    ctx.font = '8px ui-monospace, monospace';
    ctx.letterSpacing = '.8px';
    ctx.fillText('SUBSTATION / FLOOD RISK', 882, 70);
    ctx.fillStyle = `rgba(255, 131, 101, ${reduceMotion ? .85 : .65 + .3 * Math.sin(t * 4)})`;
    ctx.beginPath(); ctx.arc(965, 119, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (state.pumpPowerCut) {
    const reduceMotion = isReducedMotion();
    const pulse = reduceMotion ? .72 : .5 + .24 * Math.sin(t * 4.1);
    ctx.save();
    const glow = ctx.createRadialGradient(955, 635, 3, 955, 635, 66);
    glow.addColorStop(0, `rgba(255, 111, 94, ${.10 + pulse * .08})`);
    glow.addColorStop(1, 'rgba(255, 111, 94, 0)');
    ctx.fillStyle = glow; ctx.fillRect(890, 570, 130, 130);
    ctx.strokeStyle = `rgba(255, 128, 111, ${pulse})`; ctx.lineWidth = 1.3;
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(955, 635, 26 + (reduceMotion ? 0 : Math.sin(t * 2) * 2), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 132, 112, .9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(949, 629); ctx.lineTo(961, 641); ctx.moveTo(961, 629); ctx.lineTo(949, 641); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 146, 127, .96)'; ctx.font = '8px ui-monospace, monospace'; ctx.fillText('PUMP POWER LOST', 912, 669);
    ctx.restore();
  }

  if (state.signalOutage) {
    const signalPoints = junctions.filter((_, index) => index % 2 === 0);
    ctx.save();
    for (let i = 0; i < signalPoints.length; i++) {
      const j = signalPoints[i];
      const x = j.x + 22; const y = j.y - 23;
      ctx.fillStyle = 'rgba(7, 17, 23, .94)';
      roundRect(ctx, x - 4, y - 9, 8, 18, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(245, 133, 105, .48)'; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = '#432d2b';
      for (let light = 0; light < 3; light++) {
        ctx.beginPath(); ctx.arc(x, y - 5 + light * 5, 1.65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(255, 133, 108, ${.56 + .35 * Math.sin(t * 4.2 + i)})`;
      ctx.beginPath(); ctx.arc(x, y - 5, 1.65, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 132, 105, .20)'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(238, 390); ctx.lineTo(913, 390); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Washout and repair are shown on the low coastal road itself, not only in UI.
  if (state.roadWashout || state.roadRestored) {
    const reduceMotion = isReducedMotion();
    const x = 895, y = 560;
    ctx.save();
    if (state.roadWashout) {
      const pulse = reduceMotion ? .78 : .56 + .22 * Math.sin(t * 4.4);
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 92);
      glow.addColorStop(0, `rgba(255,117,93,${.19 + pulse * .10})`);
      glow.addColorStop(1, 'rgba(255,117,93,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - 98, y - 75, 196, 150);
      ctx.strokeStyle = `rgba(255,139,111,${pulse})`; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(x - 46, y - 7); ctx.lineTo(x - 14, y + 2); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x + 24, y + 8); ctx.lineTo(x + 48, y - 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15,20,24,.94)'; roundRect(ctx, x - 67, y + 21, 134, 17, 3); ctx.fill();
      ctx.strokeStyle = `rgba(255,139,111,${pulse})`; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = '#ff9a82'; ctx.font = '7px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('МАГИСТРАЛЬ РАЗМЫТА / ЗАКРЫТА', x, y + 32);
      ctx.fillStyle = `rgba(255,145,108,${pulse})`;
      for (let i = 0; i < 5; i++) { const dx = x - 26 + i * 13; ctx.beginPath(); ctx.moveTo(dx, y - 22 - (i % 2) * 4); ctx.lineTo(dx + 7, y - 31 - (i % 3) * 3); ctx.lineTo(dx + 13, y - 22 - (i % 2) * 4); ctx.fill(); }
    } else {
      const pulse = reduceMotion ? .72 : .48 + .16 * Math.sin(t * 2.1);
      ctx.strokeStyle = `rgba(114,224,204,${pulse})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x + 44, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(8,24,28,.88)'; roundRect(ctx, x - 62, y + 18, 124, 15, 3); ctx.fill();
      ctx.fillStyle = '#8be5d0'; ctx.font = '7px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('МАГИСТРАЛЬ ВОССТАНОВЛЕНА', x, y + 28);
    }
    ctx.restore();
  }
}

function drawRepairOverlays(t) {
  const locations = {
    substation: { x: 965, y: 119, label: 'FIELD CREW / SUBSTATION' },
    signals: { x: 680, y: 390, label: 'FIELD CREW / SIGNALS' },
    pump: { x: 955, y: 635, label: 'FIELD CREW / PUMP' },
    road: { x: 895, y: 560, label: 'FIELD CREW / COASTAL ROAD' },
  };
  for (const job of state.repairJobs) {
    const point = locations[job.system];
    if (!point) continue;
    const progress = clamp(1 - job.remaining / job.duration, 0, 1);
    const pulse = isReducedMotion() ? .74 : .60 + .18 * Math.sin(t * 4 + point.x);
    const color = job.suspended ? '#ff8f8b' : '#ffc47d';
    ctx.save();
    const glow = ctx.createRadialGradient(point.x, point.y, 4, point.x, point.y, 72);
    glow.addColorStop(0, job.suspended ? 'rgba(255,119,126,.14)' : 'rgba(255,196,125,.14)');
    glow.addColorStop(1, 'rgba(255,196,125,0)');
    ctx.fillStyle = glow; ctx.fillRect(point.x - 76, point.y - 76, 152, 152);
    ctx.strokeStyle = `rgba(255,196,125,${pulse})`; ctx.lineWidth = 1.3; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(point.x, point.y, 28, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(point.x, point.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
    // Compact moving work-light marker: a warm service vehicle rather than a static UI badge.
    const drift = isReducedMotion() ? 0 : Math.sin(t * 1.7 + point.y) * 4;
    roundRect(ctx, point.x + 20 + drift, point.y + 16, 19, 10, 2); ctx.fillStyle = 'rgba(8,20,25,.96)'; ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(point.x + 24 + drift, point.y + 14, 8, 2);
    ctx.fillStyle = 'rgba(7,17,21,.88)'; roundRect(ctx, point.x - 67, point.y + 39, 134, 16, 3); ctx.fill();
    ctx.fillStyle = job.suspended ? '#ffaaa1' : '#f5d29c'; ctx.font = '7px ui-monospace, monospace'; ctx.letterSpacing = '.25px';
    ctx.fillText(`${job.suspended ? 'STANDBY' : 'REPAIR'} / ${Math.round(progress * 100)}%`, point.x - 59, point.y + 50);
    ctx.restore();
  }
}

function drawTransientPulses(t) {
  while (transientPulses.length && t - transientPulses[0].time > 1.25) transientPulses.shift();
  for (const pulse of transientPulses) {
    const age = Math.max(0, t - pulse.time);
    const progress = age / 1.25;
    ctx.save();
    ctx.globalAlpha = (1 - progress) * .78;
    ctx.strokeStyle = pulse.color;
    for (let ring = 0; ring < 3; ring++) {
      const radius = 9 + age * (40 + ring * 15) + ring * 10;
      ctx.lineWidth = Math.max(.7, 2 - progress * 1.5);
      ctx.beginPath(); ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = (1 - progress) * .28;
    ctx.fillStyle = pulse.color;
    ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 4 + progress * 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function ensureStaticSceneCache() {
  const cacheScale = cacheScaleForQuality();
  if (staticSceneCache && staticSceneCacheScenario === state.scenarioId && staticSceneCacheScale === cacheScale) return staticSceneCache;
  const cache = document.createElement('canvas');
  cache.width = Math.round(BASE_W * cacheScale);
  cache.height = Math.round(BASE_H * cacheScale);
  const cacheContext = cache.getContext('2d', { alpha: false });
  if (!cacheContext) return null;
  const previousContext = ctx;
  const previousView = view;
  try {
    ctx = cacheContext;
    view = { width: cache.width, height: cache.height, dpr: 1, scale: cacheScale, ox: 0, oy: 0 };
    ctx.setTransform(cacheScale, 0, 0, cacheScale, 0, 0);
    drawBackground(0);
    drawRoads(0);
    buildings.forEach((building, index) => drawBuilding(building, 0, index));
  } finally {
    ctx = previousContext;
    view = previousView;
  }
  staticSceneCache = cache;
  staticSceneCacheScenario = state.scenarioId;
  staticSceneCacheScale = cacheScale;
  return cache;
}

function updateMapCameraUI() {
  const label = $('#mapZoomLabel');
  if (label) label.textContent = `${Math.round(mapCamera.zoom * 100)}%`;
  const zoomIn = $('#mapZoomIn');
  const zoomOut = $('#mapZoomOut');
  if (zoomIn) zoomIn.disabled = mapCamera.zoom >= MAP_CAMERA_MAX_ZOOM - .001;
  if (zoomOut) zoomOut.disabled = mapCamera.zoom <= MAP_CAMERA_MIN_ZOOM + .001;
  const pan = $('#mapPanToggle');
  if (pan) pan.setAttribute('aria-pressed', String(mapPanMode));
  $('#mapFrame')?.classList.toggle('pan-active', mapPanMode);
  // The map is an interactive surface: reserve touch gestures for accurate pan/pinch. Page scroll remains available outside the canvas.
  canvas.style.touchAction = 'none';
  canvas.style.cursor = mapPanMode ? (panGesture?.moved ? 'grabbing' : 'grab') : 'crosshair';
  const diag = $('#diagMapCamera');
  if (diag) diag.textContent = `${Math.round(mapCamera.zoom * 100)}%`;
  const diagMode = $('#diagMapCameraMode');
  if (diagMode) diagMode.textContent = mapPanMode ? 'РУЧНОЕ ПЕРЕМЕЩЕНИЕ' : mapCamera.zoom > 1.001 ? 'ПРИБЛИЖЕНИЕ' : 'ОБЩИЙ ОБЗОР';
}

function setMapCamera(nextCamera, animated = true) {
  const target = normalizeMapCamera(nextCamera, BASE_W, BASE_H);
  cameraTransition = null;
  if (!animated || isReducedMotion()) {
    mapCamera = target;
  } else {
    cameraTransition = { from: { ...mapCamera }, to: target, startedAt: performance.now(), duration: 260 };
  }
  updateMapCameraUI();
}

function updateMapCameraTransition(now) {
  if (!cameraTransition) return;
  const transition = cameraTransition;
  const progress = clamp((now - transition.startedAt) / transition.duration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  mapCamera = normalizeMapCamera({
    zoom: lerp(transition.from.zoom, transition.to.zoom, eased),
    x: lerp(transition.from.x, transition.to.x, eased),
    y: lerp(transition.from.y, transition.to.y, eased),
  }, BASE_W, BASE_H);
  if (progress >= 1) {
    mapCamera = transition.to;
    cameraTransition = null;
  }
  updateMapCameraUI();
}

function setMapPanMode(enabled) {
  mapPanMode = Boolean(enabled);
  cameraTransition = null;
  updateMapCameraUI();
  showToast(mapPanMode ? 'Режим «РУКА»: перетаскивайте карту. Нажмите ещё раз, чтобы выбирать объекты.' : 'Режим выбора объектов восстановлен.');
}

function resetMapCamera() {
  panGesture = null;
  suppressMapClick = false;
  mapPanMode = false;
  setMapCamera({ zoom: 1, x: 0, y: 0 });
}

function drawMap(t) {
  // Use a stable logical coordinate system and letterbox it inside any viewport.
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
  const activeCamera = mapExportBusy ? { zoom: 1, x: 0, y: 0 } : mapCamera;
  ctx.translate(activeCamera.x, activeCamera.y);
  ctx.scale(activeCamera.zoom, activeCamera.zoom);
  ctx.fillStyle = '#0b1d24'; ctx.fillRect(0, 0, BASE_W, BASE_H);
  // The cached static base is supersampled according to the chosen visual preset.
  // 8K PNG export bypasses the cache and redraws geometry at the requested output scale.
  if (mapExportBusy) {
    drawBackground(t);
    drawRoads(t);
    buildings.forEach((b, i) => drawBuilding(b, t, i));
  } else {
    const cache = ensureStaticSceneCache();
    if (cache) ctx.drawImage(cache, 0, 0, BASE_W, BASE_H);
    else {
      drawBackground(t);
      drawRoads(t);
      buildings.forEach((b, i) => drawBuilding(b, t, i));
    }
  }
  drawRiver(t);
  drawGridInfrastructure(t);
  drawEvacuationScene(t);
  drawNeighborhoodDecor(t);
  drawWetSurface(t);
  drawFlood(t);
  drawCascadeOverlays(t);
  drawRepairOverlays(t);
  drawRoute(t);
  drawTraffic(t);
  drawScenarioAtmosphere(t);

  // Selected intervention targets pulse above the scene but do not cover building details.
  const trafficSelected = selectedTool === 'traffic' && !state.used.traffic;
  const powerSelected = selectedTool === 'power' && !state.used.power;
  const drainSelected = selectedTool === 'drain' && !state.used.drain;
  junctions.forEach(j => drawJunctionTarget(j, t, trafficSelected, state.used.traffic));
  powerTargets.forEach(target => drawAssetIcon(target.x, target.y, target.type, (Math.sin(t * 2.2) + 1) / 2, powerSelected, state.used.power));
  gateTargets.forEach(target => drawAssetIcon(target.x, target.y, target.type, (Math.sin(t * 2.2) + 1) / 2, drainSelected, state.used.drain));
  drawTransientPulses(t);
  drawMapLabels(t);
  drawCinematicGrade(t);

  // Fine survey crosshairs, scale marker, and corner locator marks.
  ctx.save();
  ctx.strokeStyle = 'rgba(171, 221, 204, .33)'; ctx.lineWidth = 1;
  const corners = [[18,18,1,1],[BASE_W-18,18,-1,1],[18,BASE_H-18,1,-1],[BASE_W-18,BASE_H-18,-1,-1]];
  for (const [x,y,sx,sy] of corners) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * 14); ctx.lineTo(x, y); ctx.lineTo(x + sx * 14, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(175,214,200,.35)'; ctx.beginPath(); ctx.moveTo(42, 730); ctx.lineTo(92, 730); ctx.moveTo(42, 726); ctx.lineTo(42, 734); ctx.moveTo(92, 726); ctx.lineTo(92, 734); ctx.stroke();
  ctx.fillStyle = 'rgba(174,216,201,.5)'; ctx.font = '7px ui-monospace, monospace'; ctx.fillText('250 M', 48, 722);
  ctx.restore();
}

function canvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.ox) / Math.max(view.scale, 0.0001),
    y: (clientY - rect.top - view.oy) / Math.max(view.scale, 0.0001),
  };
}

function getWorldPoint(event) {
  return mapPointToWorld(canvasPointFromClient(event.clientX, event.clientY), mapCamera, BASE_W, BASE_H);
}

function nearestTarget(x, y, list, maxDistance) {
  let found = null;
  let best = maxDistance;
  for (const target of list) {
    const d = Math.hypot(target.x - x, target.y - y);
    if (d <= best) { best = d; found = target; }
  }
  return found;
}

function getTargetAt(x, y, tool) {
  if (tool === 'traffic') return nearestTarget(x, y, junctions, 40) ? { ...nearestTarget(x, y, junctions, 40), type: 'junction' } : null;
  if (tool === 'power') return nearestTarget(x, y, powerTargets, 47);
  if (tool === 'drain') return nearestTarget(x, y, gateTargets, 35);
  return null;
}

function getAnyTargetAt(x, y) {
  const choices = [
    ...junctions.map(t => ({ ...t, type: 'junction', label: `Перекрёсток ${t.id}` })),
    ...powerTargets.map(t => ({ ...t, label: t.type === 'hospital' ? 'Городская больница' : 'Насосная станция' })),
    ...gateTargets.map(t => ({ ...t, label: `Аварийный шлюз ${t.id}` })),
  ];
  return nearestTarget(x, y, choices, 35);
}

function selectTool(tool) {
  if (!TOOL_ORDER.includes(tool)) return;
  if (state.used[tool]) {
    showToast('Этот ресурс уже использован в текущей операции.');
    return;
  }
  selectedTool = selectedTool === tool ? null : tool;
  renderToolControls();
  if (selectedTool) {
    const item = TOOLS[selectedTool];
    const text = state.phase === 'briefing' ? `Запустите симуляцию, затем: ${item.hint.toLowerCase()}` : item.hint;
    $('#targetHintText').textContent = text;
    $('#targetHint').classList.remove('hidden');
    $('#toolInstruction').innerHTML = `<span class="instruction-cross">⌖</span><span><b>ЦЕЛЬ ДЛЯ: ${item.shortName}</b><small>${text}</small></span>`;
    playTone(520, .055, 'sine');
  } else {
    $('#targetHint').classList.add('hidden');
    $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем нажмите на подходящий объект на карте.</small></span>';
  }
}

function targetImpactItems(tool, target, forecast) {
  if (!forecast?.ok) return [];
  const lowerIsBetter = new Set(['water', 'congestion']);
  const fields = tool === 'traffic'
    ? [['congestion', 'ЗАТОР'], ['access', 'ДОСТУП'], ['integrity', 'УСТОЙЧИВОСТЬ']]
    : tool === 'power' && target.type === 'hospital'
      ? [['grid', 'ЭНЕРГИЯ'], ['integrity', 'УСТОЙЧИВОСТЬ'], ['rescued', 'ЭВАКУАЦИЯ']]
      : [['water', 'ВОДА'], ['access', 'ДОСТУП'], ['integrity', 'УСТОЙЧИВОСТЬ']];
  return fields.map(([key, title]) => {
    const raw = forecast.advantage[key];
    const value = Math.round(Math.abs(raw));
    const beneficial = raw >= 0;
    const sign = lowerIsBetter.has(key) ? (raw >= 0 ? '−' : '+') : (raw >= 0 ? '+' : '−');
    return { title, text: `${title} ${sign}${value}`, beneficial, value };
  }).filter(item => item.value > 0);
}

function targetWithForecast(tool, target, label, hint) {
  const forecast = previewIntervention(state, tool, target, 8);
  return { ...target, label, hint, forecast: forecast.ok ? forecast : null, impacts: targetImpactItems(tool, target, forecast) };
}

function findTargetForTool(tool, targetId) {
  if (tool === 'traffic') {
    const target = junctions.find(item => item.id === targetId);
    return target ? { ...target, type: 'junction' } : null;
  }
  if (tool === 'power') return powerTargets.find(item => item.id === targetId) || null;
  if (tool === 'drain') return gateTargets.find(item => item.id === targetId) || null;
  return null;
}

function paintTargetImpacts(button, tool, target, forecast) {
  let host = button.querySelector('.quick-target-impacts');
  const impacts = targetImpactItems(tool, target, forecast);
  if (!impacts.length) {
    host?.remove();
  } else {
    if (!host) {
      host = document.createElement('span');
      host.className = 'quick-target-impacts';
      button.querySelector('.quick-target-copy').append(host);
    }
    host.replaceChildren();
    for (const impact of impacts) {
      const chip = document.createElement('span');
      chip.className = `quick-target-impact${impact.beneficial ? ' is-good' : ' is-risk'}`;
      chip.textContent = impact.text;
      host.append(chip);
    }
  }
  const label = button.querySelector('.quick-target-label')?.textContent || target.id;
  const hint = button.querySelector('.quick-target-hint')?.textContent || '';
  button.setAttribute('aria-label', `Применить инструмент «${TOOLS[tool].name}» к цели ${label}. ${hint}. ${impacts.map(item => item.text).join(', ')}`);
}

function refreshQuickTargetForecasts() {
  if (!selectedTool || state.phase !== 'running' || state.used[selectedTool]) return;
  const bucket = Math.floor(state.elapsed / 5);
  if (bucket === lastForecastBucket) return;
  lastForecastBucket = bucket;
  const host = $('#quickTargets');
  if (!host || host.classList.contains('hidden')) return;
  const seconds = Math.max(0, Math.min(8, MISSION_DURATION - state.elapsed));
  const heading = host.querySelector('.quick-target-heading');
  if (heading) heading.textContent = `ПРОГНОЗ НА ${Math.ceil(seconds)} СЕК. · СРАВНЕНИЕ С БЕЗДЕЙСТВИЕМ`;
  for (const button of host.querySelectorAll('.quick-target-button')) {
    const target = findTargetForTool(selectedTool, button.dataset.targetId);
    if (!target) continue;
    const forecast = previewIntervention(state, selectedTool, target, seconds);
    paintTargetImpacts(button, selectedTool, target, forecast);
  }
}

function availableTargetsForTool(tool) {
  if (tool === 'traffic') return junctions.map(target => {
    const profile = getTrafficProfile(state.scenarioId, target.id);
    const picked = { ...target, type: 'junction' };
    return targetWithForecast(tool, picked, `${target.id} · ${profile.label}`, `${profile.detail}${profile.affinity ? ' · подходит сценарию' : ''} · −${profile.congestionRelief} загр. / +${profile.accessBonus} доступ`);
  });
  if (tool === 'power') return powerTargets.map(target => targetWithForecast(
    tool,
    { ...target },
    target.type === 'hospital' ? 'H-01 · Городская больница' : 'P-04 · Насосная станция',
    target.type === 'hospital' ? '+18 к запасу энергосети и замедление её падения' : '−9 к уровню воды и более медленный подъём',
  ));
  if (tool === 'drain') return gateTargets.map(target => {
    const profile = getDrainProfile(state.scenarioId, target.id);
    return targetWithForecast(tool, { ...target }, `${target.id} · ${profile.label}`, `${profile.detail}${profile.affinity ? ' · подходит сценарию' : ''} · −${profile.waterReduction} воды / ${profile.duration} с`);
  });
  return [];
}

function renderQuickTargets() {
  const host = $('#quickTargets');
  if (!host) return;
  const signature = `${selectedTool || 'none'}:${state.phase}:${selectedTool && state.used[selectedTool] ? 'used' : 'ready'}`;
  if (host.dataset.signature === signature) return;
  host.dataset.signature = signature;
  host.replaceChildren();
  if (!selectedTool || state.phase !== 'running' || state.used[selectedTool]) {
    host.classList.add('hidden');
    return;
  }
  const heading = document.createElement('div');
  heading.className = 'quick-target-heading';
  heading.textContent = `ПРОГНОЗ НА ${Math.ceil(Math.min(8, MISSION_DURATION - state.elapsed))} СЕК. · СРАВНЕНИЕ С БЕЗДЕЙСТВИЕМ`;
  host.append(heading);
  for (const target of availableTargetsForTool(selectedTool)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-target-button';
    button.innerHTML = `<span class="quick-target-pip"></span><span class="quick-target-copy"><span class="quick-target-label"></span><small class="quick-target-hint"></small></span><span class="quick-target-arrow">↗</span>`;
    button.querySelector('.quick-target-label').textContent = target.label;
    button.querySelector('.quick-target-hint').textContent = target.hint || '';
    button.dataset.targetId = target.id;
    button.dataset.targetType = target.type;
    paintTargetImpacts(button, selectedTool, target, target.forecast);
    button.addEventListener('click', () => executeTarget(target));
    host.append(button);
  }
  host.classList.remove('hidden');
  lastForecastBucket = Math.floor(state.elapsed / 5);
}

function renderToolInstructionIdle() {
  $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем выберите объект на карте или воспользуйтесь списком целей.</small></span>';
}

function executeTarget(target) {
  const inputStarted = performance.now();
  if (!selectedTool) {
    showToast(state.phase === 'running' ? 'Выберите один из трёх инструментов справа.' : 'Запустите симуляцию, затем выберите инструмент.');
    performanceStats.inputMs = performance.now() - inputStarted;
    return;
  }
  if (state.phase !== 'running') {
    showToast(state.phase === 'paused' ? 'Симуляция на паузе. Возобновите её перед вмешательством.' : 'Сначала запустите симуляцию. Инструмент уже выбран.');
    performanceStats.inputMs = performance.now() - inputStarted;
    return;
  }
  const result = applyIntervention(state, selectedTool, target);
  performanceStats.inputMs = performance.now() - inputStarted;
  if (result.ok) {
    const color = selectedTool === 'traffic' ? '#8bbdff' : selectedTool === 'power' ? '#ffc47d' : '#78e7d0';
    transientPulses.push({ x: target.x, y: target.y, time: performance.now() / 1000, color });
    showToast(result.message);
    playTone(760, .09, 'sine');
    selectedTool = null;
    renderToolControls();
    $('#targetHint').classList.add('hidden');
    $('#toolInstruction').innerHTML = '<span class="instruction-cross">✓</span><span><b>РЕСУРС ИСПОЛЬЗОВАН</b><small>Решение зарегистрировано. Следите за его последствиями.</small></span>';
    renderUI(true);
  } else {
    showToast(result.reason);
    playTone(170, .07, 'triangle');
  }
}

function useSelectedTool(event) {
  const point = getWorldPoint(event);
  mouseWorld = point;
  if (event.shiftKey) {
    const target = getAnyTargetAt(point.x, point.y);
    showToast(target ? `${target.label || target.type} · ${Math.round(point.x)}, ${Math.round(point.y)}` : `Координаты сектора · ${Math.round(point.x)}, ${Math.round(point.y)}`);
    return;
  }
  if (!selectedTool) {
    executeTarget(null);
    return;
  }
  const target = getTargetAt(point.x, point.y, selectedTool);
  if (!target) {
    performanceStats.inputMs = 0;
    showToast(TOOLS[selectedTool].hint);
    playTone(170, .07, 'triangle');
    return;
  }
  executeTarget(target);
}

function setPhaseStatus() {
  const status = $('#systemStatus');
  const mapPhase = $('#mapPhase');
  const startBtn = $('#startBtn');
  const pauseBtn = $('#pauseBtn');
  const clockCaption = $('#clockCaption');
  const clockPhase = $('#clockPhase');
  if (state.phase === 'briefing') {
    status.textContent = 'СИСТЕМА ГОТОВА';
    mapPhase.textContent = 'ОЖИДАНИЕ КОМАНДЫ';
    startBtn.disabled = false;
    startBtn.querySelector('span').textContent = 'ЗАПУСТИТЬ СИМУЛЯЦИЮ';
    pauseBtn.disabled = true;
    pauseBtn.innerHTML = '<span>Ⅱ</span> ПАУЗА';
    clockCaption.textContent = 'ВРЕМЯ ОПЕРАЦИИ';
    clockPhase.textContent = 'ОЖИДАНИЕ ЗАПУСКА';
  } else if (state.phase === 'running') {
    status.textContent = 'СИМУЛЯЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ';
    mapPhase.textContent = 'СИСТЕМЫ АКТИВНЫ';
    startBtn.disabled = true;
    startBtn.querySelector('span').textContent = 'СИМУЛЯЦИЯ ИДЁТ';
    pauseBtn.disabled = false;
    pauseBtn.innerHTML = '<span>Ⅱ</span> ПАУЗА';
    clockCaption.textContent = 'СИМУЛЯЦИЯ АКТИВНА';
    clockPhase.textContent = 'КРИЗИС РАЗВИВАЕТСЯ';
  } else if (state.phase === 'paused') {
    status.textContent = 'СИМУЛЯЦИЯ НА ПАУЗЕ';
    mapPhase.textContent = 'ВРЕМЯ ОСТАНОВЛЕНО';
    startBtn.disabled = false;
    startBtn.querySelector('span').textContent = 'ПРОДОЛЖИТЬ ОПЕРАЦИЮ';
    pauseBtn.disabled = false;
    pauseBtn.innerHTML = '<span>▶</span> ПРОДОЛЖИТЬ';
    clockCaption.textContent = 'СИМУЛЯЦИЯ НА ПАУЗЕ';
    clockPhase.textContent = 'ВРЕМЯ ОСТАНОВЛЕНО';
  } else {
    status.textContent = 'ОПЕРАЦИЯ ЗАВЕРШЕНА';
    mapPhase.textContent = 'ПРОТОКОЛ ЗАПИСАН';
    startBtn.disabled = false;
    startBtn.querySelector('span').textContent = 'НОВАЯ ОПЕРАЦИЯ';
    pauseBtn.disabled = true;
    pauseBtn.innerHTML = '<span>Ⅱ</span> ПАУЗА';
    clockCaption.textContent = 'МИССИЯ ЗАВЕРШЕНА';
    clockPhase.textContent = 'РЕЗУЛЬТАТ ЗАПИСАН';
  }
  $('#scenarioSelect').disabled = state.phase === 'running' || state.phase === 'paused';
  renderQuickTargets();
}

function renderScenarioInfo() {
  const scenario = getScenario(selectedScenarioId);
  $('#scenarioSelect').value = selectedScenarioId;
  $('.status-copy small').textContent = `ГОРОДСКАЯ СЕТЬ · СЕКТОР ${scenario.sectorCode}`;
  $('#incidentNumber').textContent = `№ ${scenario.incidentNumber}-CC`;
  $('#incidentLevel').textContent = `УРОВЕНЬ ${scenario.level}`;
  $('#incidentTitle').innerHTML = `${scenario.titleLead}<br><em>${scenario.titleAccent}</em>`;
  $('#incidentDescription').textContent = scenario.description;
  $('#districtName').innerHTML = `${scenario.district} <span> / ${scenario.sectorCode}</span>`;
  const ids = [
    ['objectivePowerTitle', 'objectivePowerSub'],
    ['objectiveTrafficTitle', 'objectiveTrafficSub'],
    ['objectiveWaterTitle', 'objectiveWaterSub'],
  ];
  scenario.objectives.forEach((pair, i) => {
    $(`#${ids[i][0]}`).textContent = pair[0];
    $(`#${ids[i][1]}`).textContent = pair[1];
  });
  renderPersonalRecord(scenario.id);
  const visualStatus = $('#visualSettingsStatus');
  if (visualStatus) visualStatus.textContent = `${QUALITY_NAMES[visualMode]} · качество ${Math.round(renderQuality * 100)}% · ${scenarioAtmosphereStatus(scenario.id)}${isReducedMotion() ? ' · движение уменьшено' : ''}`;
}

function changeScenario(scenarioId) {
  if (!Object.hasOwn(SCENARIOS, scenarioId)) return;
  if (state.phase === 'running' || state.phase === 'paused') {
    $('#scenarioSelect').value = selectedScenarioId;
    showToast('Сначала завершите или сбросьте текущую операцию.');
    return;
  }
  resetMapCamera();
  selectedScenarioId = scenarioId;
  const fresh = makeInitialState(selectedScenarioId);
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  previousRepairCount = 0;
  selectedTool = null;
  previousEventCount = -1;
  $('#resultOverlay').classList.add('hidden');
  $('#resultOverlay').classList.remove('shown');
  $('#missionReplayPanel')?.classList.add('hidden');
  $('#strategyLabPanel')?.classList.add('hidden');
  currentStrategyRun = null;
  selectedStrategyBaselineId = null;
  $('#targetHint').classList.add('hidden');
  renderScenarioInfo();
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', selectedScenarioId);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  setPhaseStatus();
  renderUI(true);
  renderToolControls();
  $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем нажмите на подходящий объект на карте.</small></span>';
  showToast(`Загружен сценарий: ${getScenario(selectedScenarioId).district}.`);
}

function togglePause() {
  if (state.phase === 'running') {
    state.phase = 'paused';
    addEvent(state, 'СИМУЛЯЦИЯ ПРИОСТАНОВЛЕНА', 'Время остановлено. Можно проверить ситуацию и продолжить.', 'info');
    showToast('Симуляция поставлена на паузу.');
  } else if (state.phase === 'paused') {
    state.phase = 'running';
    addEvent(state, 'СИМУЛЯЦИЯ ВОЗОБНОВЛЕНА', 'Операция продолжается.', 'info');
    showToast('Симуляция возобновлена.');
  }
  setPhaseStatus();
  renderUI(true);
}

function resetMission() {
  resetMapCamera();
  const fresh = makeInitialState(selectedScenarioId);
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  previousRepairCount = 0;
  selectedTool = null;
  $('#resultOverlay').classList.add('hidden');
  $('#resultOverlay').classList.remove('shown');
  $('#missionReplayPanel')?.classList.add('hidden');
  $('#strategyLabPanel')?.classList.add('hidden');
  currentStrategyRun = null;
  selectedStrategyBaselineId = null;
  $('#targetHint').classList.add('hidden');
  renderScenarioInfo();
  $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем нажмите на подходящий объект на карте.</small></span>';
  $('#operationNote').textContent = 'После старта время пойдёт. Доступны 3 основных вмешательства и 2 ремонтные бригады.';
  previousEventCount = -1;
  setPhaseStatus();
  renderUI(true);
  renderToolControls();
  showToast(`Сценарий ${getScenario(selectedScenarioId).code} перезапущен. Все ресурсы восстановлены.`);
}

function startOrResume() {
  if (state.phase === 'briefing') {
    startMission(state);
    playTone(640, .12, 'sine');
    $('#operationNote').textContent = 'Кризис активен. Используйте 3 вмешательства и до 2 ремонтных бригад для восстановления после отказов.';
    showToast('Симуляция запущена. Время операции пошло.');
  } else if (state.phase === 'paused') {
    togglePause();
    return;
  } else if (state.phase === 'complete') {
    resetMission();
    startMission(state);
    $('#operationNote').textContent = 'Кризис активен. Используйте 3 вмешательства и до 2 ремонтных бригад для восстановления после отказов.';
  }
  setPhaseStatus();
  renderUI(true);
  renderToolControls();
}

function renderToolControls() {
  $$('.tool-card').forEach(button => {
    const tool = button.dataset.tool;
    const isSelected = selectedTool === tool && !state.used[tool];
    button.classList.toggle('selected', isSelected);
    button.classList.toggle('spent', state.used[tool]);
    button.setAttribute('aria-pressed', String(isSelected));
    button.disabled = state.used[tool] || state.phase === 'complete';
    const charge = $(`#charge${tool[0].toUpperCase()}${tool.slice(1)}`);
    charge.innerHTML = state.used[tool] ? '0' : '1<span>×</span>';
    if (state.used[tool]) charge.classList.add('spent-charge');
    else charge.classList.remove('spent-charge');
  });
  renderQuickTargets();
}

function setMetric(id, value, max = 100) {
  const node = $(id);
  if (node) node.style.width = `${clamp(value / max * 100, 0, 100)}%`;
}

function renderEventList() {
  if (previousEventCount === state.events.length && $('#eventList').children.length) {
    const newest = $('#eventList').dataset.newest;
    if (newest === state.events[0]?.title) return;
  }
  const list = $('#eventList');
  list.replaceChildren();
  for (const event of state.events.slice(0, 6)) {
    const article = document.createElement('article');
    article.className = `event-item level-${event.level}`;
    const time = document.createElement('time'); time.className = 'event-time'; time.textContent = event.at;
    const body = document.createElement('div'); body.className = 'event-body';
    const title = document.createElement('b'); title.textContent = event.title;
    const detail = document.createElement('p'); detail.textContent = event.detail;
    body.append(title, detail); article.append(time, body); list.append(article);
  }
  list.dataset.newest = state.events[0]?.title || '';
  previousEventCount = state.events.length;
}

function updateCascadeMonitor() {
  const waterNode = $('#cascadeWaterNode');
  const gridNode = $('#cascadeGridNode');
  const accessNode = $('#cascadeAccessNode');
  const overall = $('#cascadeOverallStatus');
  if (!waterNode || !gridNode || !accessNode || !overall) return;
  updateCrisisStageBanner();

  const levelClass = (value, warning, critical, highIsBad = true) => {
    if (highIsBad) return value >= critical ? 'is-critical' : value >= warning ? 'is-warning' : 'is-stable';
    return value <= critical ? 'is-critical' : value <= warning ? 'is-warning' : 'is-stable';
  };
  const waterLevel = levelClass(state.water, 40, 58, true);
  const gridLevel = state.signalOutage || state.pumpPowerCut ? 'is-critical' : state.substationFlooded || state.grid < 45 ? 'is-warning' : 'is-stable';
  const accessLevel = levelClass(state.access, 50, 30, false);
  waterNode.className = `cascade-node ${waterLevel}`;
  gridNode.className = `cascade-node ${gridLevel}`;
  accessNode.className = `cascade-node ${accessLevel}`;
  $('#cascadeWaterValue').textContent = `${Math.round(state.water)}%`;
  $('#cascadeGridValue').textContent = `${Math.round(state.grid)}%`;
  $('#cascadeAccessValue').textContent = `${Math.round(state.access)}%`;
  $('#cascadeWaterState').textContent = state.water >= 58 ? 'КРИТИЧЕСКИЙ УРОВЕНЬ' : state.water >= 40 ? 'ЗОНА ПОДТОПЛЕНИЯ' : 'В НОРМЕ';
  $('#cascadeGridState').textContent = state.pumpPowerCut ? 'НАСОСНАЯ ОБЕСТОЧЕНА' : state.signalOutage ? 'СВЕТОФОРЫ ОТКЛЮЧЕНЫ' : state.substationFlooded ? 'УЗЕЛ ПОДТОПЛЕН' : state.grid < 45 ? 'ЗАПАС МОЩНОСТИ НИЗКИЙ' : 'КОНТУР СТАБИЛЕН';
  $('#cascadeAccessState').textContent = state.roadWashout ? 'МАГИСТРАЛЬ РАЗМЫТА' : state.access <= 30 ? 'ЭКСТРЕННЫЙ ПРОЕЗД ПОД УГРОЗОЙ' : state.access < 50 ? 'ПРОЕЗД ЗАТРУДНЁН' : state.roadRestored ? 'МАГИСТРАЛЬ ВОССТАНОВЛЕНА' : 'МАРШРУТ ДОСТУПЕН';
  $('#cascadeWaterLink').classList.toggle('is-active', state.water >= 40);
  $('#cascadeAccessLink').classList.toggle('is-active', state.substationFlooded || state.signalOutage || state.roadWashout || state.grid < 45);

  const cascadeActive = state.pumpPowerCut || state.signalOutage || state.roadWashout || (state.substationFlooded && state.grid < 42) || state.access <= 30;
  const warning = state.substationFlooded || state.water >= 40 || state.grid < 45 || state.access < 50;
  overall.className = `cascade-overall ${cascadeActive ? 'status-danger' : warning ? 'status-warning' : 'status-good'}`;
  overall.textContent = cascadeActive ? 'КАСКАДНЫЙ СБОЙ' : warning ? 'УСИЛЕННОЕ НАБЛЮДЕНИЕ' : 'КОНТУР СТАБИЛЕН';
  const explainer = $('#cascadeExplainer');
  if (state.roadWashout && state.pumpPowerCut) explainer.textContent = 'Двойной отказ: насосная остановилась, а прибрежная дорога размыта. Сначала верните отвод воды и стабилизируйте энергосеть, затем направляйте бригаду на дорогу.';
  else if (state.roadWashout) explainer.textContent = 'Прибрежная магистраль размыта водой. Заторы и потеря доступа затрудняют эвакуацию. Снизьте воду ниже 58%, затем направьте бригаду на восстановление дороги.';
  else if (state.roadRestored) explainer.textContent = 'Прибрежная дорога восстановлена. Контролируйте повторный подъём воды: при длительном затоплении основание может быть размыто снова.';
  else if (state.pumpPowerCut && state.signalOutage) explainer.textContent = 'Двойной отказ: насосная остановилась, а светофоры погасли. Вода прибывает быстрее, заторы мешают службам. При следующем запуске стабилизируйте энергосеть до активации насосной.';
  else if (state.pumpPowerCut) explainer.textContent = 'Энергосеть больше не может питать насосную: откачка остановилась и уровень воды начнёт расти быстрее. В следующей операции защищайте энергоконтур раньше, чем включать насосы.';
  else if (state.signalOutage) explainer.textContent = 'Связь уже нарушена: энергосеть отключила светофоры, заторы давят на доступ экстренных служб. Используйте доступный коридор до дальнейшего ухудшения.';
  else if (state.substationFlooded) explainer.textContent = 'Вода повредила распределительный узел: энергосеть теряет запас быстрее. Это может привести к отказу светофоров и снижению доступа служб.';
  else if (state.water >= 40) explainer.textContent = 'Уровень воды достиг зоны риска. Если вода поднимется до подстанции, нагрузка на энергосеть ускорится и ударит по транспортной системе.';
  else if (state.grid < 45) explainer.textContent = 'Запас энергосети снижается. Защита критических контуров сейчас может предотвратить дальнейшие проблемы с транспортом и эвакуацией.';
  else explainer.textContent = 'Вода, энергосеть и доступ служб влияют друг на друга. Следите за цепочкой, чтобы заранее предотвращать каскадный отказ.';
}

function renderRepairControls() {
  const panel = $('#repairActions');
  if (!panel) return;
  const statusLabels = {
    substation: { idle: 'НЕТ АВАРИИ', available: 'ОТПРАВИТЬ', working: 'РЕМОНТ', suspended: 'ПАУЗА', complete: 'ВОССТАНОВЛЕНО' },
    signals: { idle: 'НЕТ АВАРИИ', available: 'ОТПРАВИТЬ', working: 'РЕМОНТ', suspended: 'ПАУЗА', complete: 'ВОССТАНОВЛЕНО' },
    pump: { idle: 'НЕТ АВАРИИ', available: 'ОТПРАВИТЬ', working: 'РЕМОНТ', suspended: 'ПАУЗА', complete: 'ВОССТАНОВЛЕНО' },
    road: { idle: 'НЕТ АВАРИИ', available: 'ОТПРАВИТЬ', working: 'РЕМОНТ', suspended: 'ПАУЗА', complete: 'ВОССТАНОВЛЕНО' },
  };
  let workingCount = 0;
  for (const button of panel.querySelectorAll('[data-repair-target]')) {
    const system = button.dataset.repairTarget;
    const availability = getRepairAvailability(state, system);
    const job = availability.activeJob;
    const available = availability.available;
    const completed = availability.completed && !job;
    const suspended = Boolean(job?.suspended);
    const working = Boolean(job && !suspended);
    if (job) workingCount += 1;
    button.disabled = state.phase !== 'running' || !available;
    button.classList.toggle('is-working', working);
    button.classList.toggle('is-suspended', suspended);
    button.classList.toggle('is-complete', completed);
    button.title = availability.reason;
    const title = button.querySelector('.repair-action-copy b')?.textContent || system;
    const copy = button.querySelector('.repair-action-copy small');
    const status = button.querySelector('.repair-action-status');
    const progress = button.querySelector('.repair-progress i');
    const progressTrack = button.querySelector('.repair-progress');
    if (job) {
      const pct = Math.round((availability.progress || 0) * 100);
      const outsideRunning = state.phase !== 'running';
      if (copy) copy.textContent = outsideRunning ? (state.phase === 'paused' ? `Пауза · осталось ${Math.max(0, job.remaining).toFixed(1).replace('.', ',')} с` : 'Операция завершена до конца ремонта') : suspended ? `Приостановлено · ${availability.reason.toLowerCase()}` : `Осталось ${Math.max(0, job.remaining).toFixed(1).replace('.', ',')} с игрового времени`;
      if (status) status.textContent = outsideRunning ? 'ПАУЗА' : suspended ? statusLabels[system].suspended : `${pct}% · РЕМОНТ`;
      if (progress) progress.style.width = `${pct}%`;
      if (outsideRunning) button.classList.add('is-suspended');
      progressTrack?.classList.remove('is-idle');
    } else {
      if (progress) progress.style.width = completed ? '100%' : '0%';
      if (progressTrack) progressTrack.classList.toggle('is-idle', !completed);
      if (copy) {
        if (available) copy.textContent = ({ substation: 'Вода безопасна · работа 14 с', signals: 'Напряжение стабильно · работа 8 с', pump: 'Питание доступно · работа 11 с', road: 'Вода ниже 58% · работа 13 с' })[system];
        else if (completed) copy.textContent = `Готово · ${state.repairs.filter(item => item.system === system).at(-1)?.at || '—'}`;
        else copy.textContent = availability.reason;
      }
      if (status) status.textContent = available ? statusLabels[system].available : completed ? statusLabels[system].complete : statusLabels[system].idle;
    }
    button.setAttribute('aria-label', `${title}. ${availability.reason}${job ? `, прогресс ${Math.round((availability.progress || 0) * 100)} процентов` : ''}`);
  }
  const badge = $('#repairCrewsBadge');
  if (badge) badge.textContent = `${state.repairCharges} / 2 БРИГАДЫ`;
  const footer = $('#repairFooterText');
  if (footer) {
    if (state.phase !== 'running') footer.textContent = state.phase === 'briefing' ? 'После старта станет доступен ремонт повреждённых систем.' : state.phase === 'paused' ? 'Ремонтные работы остановлены вместе с симуляцией.' : `Завершено ремонтов: ${state.repairs.length} · Осталось бригад: ${state.repairCharges}.`;
    else if (state.repairCharges <= 0) footer.textContent = `${workingCount} бригад(ы) ещё работают. Свободных бригад больше нет.`;
    else footer.textContent = `${workingCount} бригад(ы) в работе · ${state.repairCharges} свободно. Ремонт не расходует 3 основных вмешательства.`;
  }
}

function updateCrisisStageBanner() {
  const banner = $('#crisisStageBanner');
  if (!banner) return;
  const stage = state.crisisStage || 'briefing';
  const copy = {
    briefing: ['ОЖИДАНИЕ ЗАПУСКА', 'Запустите операцию, чтобы отслеживать фазы кризиса.', '00 / 04'],
    developing: ['ФАЗА I · РАЗВИТИЕ', 'Системы пока управляемы. Следите за первыми порогами риска.', '01 / 04'],
    escalation: ['ФАЗА II · ЭСКАЛАЦИЯ', 'Параметры вошли в зону риска. Подготовьте следующий шаг.', '02 / 04'],
    critical: ['ФАЗА III · КРИТИЧЕСКАЯ', 'Зафиксирован отказ или критический порог. Приоритет — остановить каскад.', '03 / 04'],
    recovery: ['ФАЗА IV · ВОССТАНОВЛЕНИЕ', 'Ремонт дал результат. Удержите системы в безопасном состоянии.', '04 / 04'],
    contained: ['КРИЗИС ЛОКАЛИЗОВАН', 'Операция завершена: критические контуры удержаны.', 'ЗАКРЫТО'],
    uncontrolled: ['КРИЗИС НЕ ЛОКАЛИЗОВАН', 'К завершению остались серьёзные риски или критические отказы.', 'ЗАКРЫТО'],
  }[stage] || ['СТАДИЯ НЕ ОПРЕДЕЛЕНА', 'Проверьте состояние симуляции.', '—'];
  banner.dataset.stage = stage;
  $('#crisisStageTitle').textContent = copy[0];
  $('#crisisStageDetail').textContent = copy[1];
  $('#crisisStageIndex').textContent = copy[2];
}

function renderUI(force = false) {
  $('#waterValue').textContent = Math.round(state.water);
  $('#gridValue').textContent = Math.round(state.grid);  $('#accessValue').textContent = Math.round(state.access);
  $('#populationNumber').textContent = state.population;
  $('#evacuationLabel').textContent = `${Math.round(state.rescued)} / ${state.population}`;
  $('#evacuationFill').style.width = `${state.rescued / state.population * 100}%`;
  const scenario = getScenario(state.scenarioId);
  const waterRate = scenario.waterRiseBase + (state.elapsed / MISSION_DURATION) * scenario.waterRiseProgress - (state.pumpActive && !state.pumpPowerCut ? 0.17 : 0) - (state.effects.drain > 0 ? state.drainRateRelief : 0);
  $('#waterDelta').textContent = `${waterRate >= 0 ? '+' : '−'}${Math.abs(waterRate).toFixed(2)}`;
  $('#clockValue').textContent = formatClock(MISSION_DURATION - state.elapsed);
  $('#waterBar').style.width = `${state.water}%`;
  $('#gridBar').style.width = `${state.grid}%`;
  $('#accessBar').style.width = `${state.access}%`;
  $('#clockBar').style.width = `${(1 - state.elapsed / MISSION_DURATION) * 100}%`;

  const wStatus = $('#waterStatus');
  wStatus.textContent = state.water >= 58 ? 'КРИТИЧЕСКИЙ' : state.water >= 40 ? 'ОПАСНО' : 'РАСТЁТ';
  wStatus.className = `metric-status ${state.water >= 58 ? 'status-danger' : state.water >= 40 ? 'status-warning' : 'status-good'}`;
  const gStatus = $('#gridStatus');
  gStatus.textContent = state.grid < 35 ? 'АВАРИЙНАЯ' : state.grid < 60 ? 'НЕСТАБИЛЬНА' : 'СТАБИЛЬНА';
  gStatus.className = `metric-status ${state.grid < 35 ? 'status-danger' : state.grid < 60 ? 'status-warning' : 'status-good'}`;
  const aStatus = $('#accessStatus');
  aStatus.textContent = state.access < 35 ? 'ПЕРЕКРЫТ' : state.access < 58 ? 'ЗАТРУДНЁН' : 'ДОСТУПЕН';
  aStatus.className = `metric-status ${state.access < 35 ? 'status-danger' : state.access < 58 ? 'status-warning' : 'status-good'}`;
  $('#backupStatus').textContent = state.hospitalBackup ? 'РЕЗЕРВ АКТИВЕН' : 'РЕЗЕРВ ГОТОВ';
  $('#routeStatus').textContent = state.roadWashout ? 'МАГИСТРАЛЬ РАЗМЫТА' : state.signalOutage ? 'СВЕТОФОРЫ ОТКЛЮЧЕНЫ' : state.corridorOpen ? 'ПРИОРИТЕТ АКТИВЕН' : 'МАРШРУТ НЕ ЗАДАН';
  updateCascadeMonitor();
  if (state.roadWashout) {
    $('#weatherStatus').textContent = 'КАСКАД / ПРИБРЕЖНАЯ ДОРОГА РАЗМЫТА';
  } else if (state.pumpPowerCut) {
    $('#weatherStatus').textContent = 'КАСКАД / НАСОСНАЯ ОБЕСТОЧЕНА';
  } else if (state.signalOutage) {
    $('#weatherStatus').textContent = 'КАСКАД / СВЕТОФОРЫ ОТКЛЮЧЕНЫ';
  } else if (state.substationFlooded) {
    $('#weatherStatus').textContent = 'ИНФРАСТРУКТУРА / ПОДСТАНЦИЯ ПОД ВОДОЙ';
  } else if (state.scenarioId === 'grid') {
    $('#weatherStatus').textContent = state.grid < 25 ? 'ЭНЕРГОСЕТЬ / АВАРИЯ' : state.grid < 52 ? 'ЭНЕРГОСЕТЬ / РИСК' : 'ЭНЕРГОСЕТЬ / НАБЛЮДЕНИЕ';
  } else if (state.scenarioId === 'evacuation') {
    $('#weatherStatus').textContent = state.access < 30 ? 'ЭВАКУАЦИЯ / КОРИДОР ЗАКРЫТ' : state.water >= 58 ? 'ЭВАКУАЦИЯ / ОКНО ЗАКРЫВАЕТСЯ' : 'ЭВАКУАЦИЯ / ОКНО ОТКРЫТО';
  } else {
    $('#weatherStatus').textContent = state.water >= 58 ? 'ШТОРМ / ФАЗА III' : state.water >= 40 ? 'ЛИВЕНЬ / ФАЗА II' : 'ЛИВЕНЬ / ФАЗА I';
  }

  $('#objPower').textContent = state.hospitalBackup ? 'ЗАЩИЩЕНА' : state.grid < 35 ? 'КРИТИЧНО' : 'АКТИВНА';
  $('#objPower').parentElement.classList.toggle('complete', state.hospitalBackup);
  $('#objTraffic').textContent = state.roadWashout ? 'МАГИСТРАЛЬ РАЗМЫТА' : state.corridorOpen ? 'ОТКРЫТ' : 'АКТИВНА';
  $('#objTraffic').parentElement.classList.toggle('complete', state.corridorOpen && !state.roadWashout);
  $('#objTraffic').parentElement.classList.toggle('is-failed', state.roadWashout);
  const waterResponseActive = Boolean(state.gateOpen || (state.pumpActive && !state.pumpPowerCut));
  $('#objWater').textContent = state.pumpPowerCut ? 'НАСОС ОБЕСТОЧЕН' : waterResponseActive ? 'РЕАГИРОВАНИЕ' : state.water >= 58 ? 'КРИТИЧНО' : 'АКТИВНА';
  $('#objWater').parentElement.classList.toggle('complete', waterResponseActive);
  setPhaseStatus();
  renderToolControls();
  renderRepairControls();
  renderEventList();

  if (state.phase === 'complete' && state.result && !$('#resultOverlay').classList.contains('shown')) {
    showResult();
  }
  if (force) lastUiRender = performance.now();
}

const REPLAY_SERIES = [
  { key: 'water', path: 'replayWaterPath', dot: 'replayWaterDot', value: 'replayWaterValue', label: 'Вода', inverse: true },
  { key: 'grid', path: 'replayGridPath', dot: 'replayGridDot', value: 'replayGridValue', label: 'Энергосеть', inverse: false },
  { key: 'access', path: 'replayAccessPath', dot: 'replayAccessDot', value: 'replayAccessValue', label: 'Доступ служб', inverse: false },
  { key: 'congestion', path: 'replayCongestionPath', dot: 'replayCongestionDot', value: 'replayCongestionValue', label: 'Заторы', inverse: true },
];
let replaySelectedIndex = 0;

function replaySamples() {
  return state.result?.telemetry || [];
}

function replayX(elapsed) {
  return 44 + clamp(Number(elapsed) || 0, 0, MISSION_DURATION) / MISSION_DURATION * 770;
}

function replayY(value) {
  return 18 + (1 - clamp(Number(value) || 0, 0, 100) / 100) * 156;
}

function renderMissionReplay() {
  const panel = $('#missionReplayPanel');
  if (!panel || !state.result) return;
  const samples = replaySamples();
  if (!samples.length) {
    panel.classList.remove('hidden');
    $('#replaySampleCount').textContent = 'НЕТ ДАННЫХ';
    $('#replayEventReadout').innerHTML = '<b>ЗАПИСЬ НЕДОСТУПНА</b><span>В этой операции не сохранились телеметрические точки.</span>';
    $('#replayScrubber').disabled = true;
    return;
  }
  panel.classList.remove('hidden');
  $('#replaySampleCount').textContent = `${samples.length} ТОЧЕК · 1 ГЦ`;
  const grid = [0, 25, 50, 75, 100].map((value) => {
    const y = replayY(value).toFixed(2);
    return `<line class="replay-gridline" x1="44" y1="${y}" x2="814" y2="${y}"/>`;
  }).join('');
  $('#replayGridLines').innerHTML = grid;
  for (const series of REPLAY_SERIES) {
    const path = samples.map((sample, index) => `${index === 0 ? 'M' : 'L'}${replayX(sample.elapsed).toFixed(2)},${replayY(sample[series.key]).toFixed(2)}`).join(' ');
    $(`#${series.path}`).setAttribute('d', path);
  }
  const important = (state.result.timeline || []).filter(event => Number.isFinite(Number(event.elapsed)) && ['critical', 'warning', 'success'].includes(event.level));
  const markers = important.map(event => {
    const x = replayX(event.elapsed).toFixed(2);
    const type = event.level === 'critical' ? 'critical' : event.level === 'warning' ? 'warning' : 'success';
    const title = String(event.title || 'Событие').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
    return `<circle class="replay-event-marker marker-${type}" cx="${x}" cy="9" r="3"><title>${title} · ${formatClock(event.elapsed)}</title></circle>`;
  }).join('');
  $('#replayEventMarkers').innerHTML = markers;
  const scrubber = $('#replayScrubber');
  scrubber.max = String(samples.length - 1);
  scrubber.disabled = samples.length < 2;
  replaySelectedIndex = samples.length - 1;
  scrubber.value = String(replaySelectedIndex);
  renderReplayPosition(replaySelectedIndex);
}

function renderReplayPosition(index) {
  const samples = replaySamples();
  if (!samples.length) return;
  replaySelectedIndex = clamp(Math.round(Number(index) || 0), 0, samples.length - 1);
  const sample = samples[replaySelectedIndex];
  const x = replayX(sample.elapsed);
  $('#replayScrubber').value = String(replaySelectedIndex);
  $('#replayCursor').setAttribute('x1', x.toFixed(2));
  $('#replayCursor').setAttribute('x2', x.toFixed(2));
  $('#replayTimeValue').textContent = formatClock(sample.elapsed);
  for (const series of REPLAY_SERIES) {
    const value = clamp(Number(sample[series.key]) || 0, 0, 100);
    $(`#${series.dot}`).setAttribute('cx', x.toFixed(2));
    $(`#${series.dot}`).setAttribute('cy', replayY(value).toFixed(2));
    $(`#${series.value}`).textContent = `${Math.round(value)}%`;
  }
  const events = (state.result?.timeline || []).filter(event => Number.isFinite(Number(event.elapsed)));
  const nearby = events
    .map(event => ({ ...event, distance: Math.abs(Number(event.elapsed) - Number(sample.elapsed)) }))
    .filter(event => event.distance <= 1.65)
    .sort((a, b) => a.distance - b.distance)[0];
  const readout = $('#replayEventReadout');
  const stageNames = { briefing: 'БРИФИНГ', developing: 'РАЗВИТИЕ', escalation: 'ЭСКАЛАЦИЯ', critical: 'КРИТИЧЕСКАЯ ФАЗА', recovery: 'ВОССТАНОВЛЕНИЕ', contained: 'КРИЗИС ЛОКАЛИЗОВАН', uncontrolled: 'КРИЗИС НЕ ЛОКАЛИЗОВАН' };
  if (nearby) {
    readout.dataset.level = nearby.level || 'info';
    readout.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = `${formatClock(nearby.elapsed)} · ${nearby.title || 'Событие'}`;
    const detail = document.createElement('span');
    detail.textContent = nearby.detail || 'Зафиксирован переход состояния системы.';
    readout.append(title, detail);
  } else {
    readout.dataset.level = sample.crisisStage === 'critical' || sample.crisisStage === 'uncontrolled' ? 'critical' : 'info';
    readout.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = `${formatClock(sample.elapsed)} · ${stageNames[sample.crisisStage] || 'СОСТОЯНИЕ ГОРОДА'}`;
    const active = Object.entries(sample.failures || {}).filter(([, value]) => value).map(([key]) => ({ substationFlooded: 'подстанция под водой', signalOutage: 'светофоры отключены', pumpPowerCut: 'насосная обесточена', roadWashout: 'прибрежная дорога размыта' }[key] || key));
    const detail = document.createElement('span');
    detail.textContent = active.length ? `Активные отказы: ${active.join(', ')}.` : `Состояние систем: вода ${Math.round(sample.water)}%, энергосеть ${Math.round(sample.grid)}%, доступ служб ${Math.round(sample.access)}%.`;
    readout.append(title, detail);
  }
}

function seekReplayEvent(direction) {
  const samples = replaySamples();
  const events = (state.result?.timeline || [])
    .filter(event => ['critical', 'warning', 'success'].includes(event.level) && Number.isFinite(Number(event.elapsed)))
    .sort((a, b) => Number(a.elapsed) - Number(b.elapsed));
  if (!samples.length || !events.length) return;
  const currentTime = Number(samples[replaySelectedIndex]?.elapsed) || 0;
  const targetEvent = direction < 0
    ? [...events].reverse().find(event => Number(event.elapsed) < currentTime - 0.5)
    : events.find(event => Number(event.elapsed) > currentTime + 0.5);
  const targetTime = targetEvent ? Number(targetEvent.elapsed) : direction < 0 ? 0 : MISSION_DURATION;
  let nearest = 0;
  let minDistance = Infinity;
  samples.forEach((sample, index) => {
    const distance = Math.abs(Number(sample.elapsed) - targetTime);
    if (distance < minDistance) { minDistance = distance; nearest = index; }
  });
  renderReplayPosition(nearest);
}

function loadStrategyHistory() {
  try {
    return normalizeStrategyHistory(JSON.parse(localStorage.getItem(STRATEGY_HISTORY_KEY) || '[]'));
  } catch {
    return [];
  }
}

function persistStrategyHistory() {
  try {
    localStorage.setItem(STRATEGY_HISTORY_KEY, JSON.stringify(strategyHistory));
    return true;
  } catch {
    showToast('История сравнений доступна только до закрытия вкладки: браузер запретил локальное хранение.');
    return false;
  }
}

function saveCompletedStrategyRun(result) {
  const scenario = getScenario(selectedScenarioId);
  const completedAt = new Date().toISOString();
  const id = `${selectedScenarioId}-${Date.now()}-${Math.round(result.score)}`;
  const run = summarizeStrategyRun(result, scenario, { id, completedAt });
  if (!run) return null;
  currentStrategyRun = run;
  strategyHistory = appendStrategyRun(strategyHistory, run, STRATEGY_HISTORY_LIMIT);
  persistStrategyHistory();
  return run;
}

function createStrategyCell(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function formatMetricDelta(metric, delta) {
  if (metric.key === 'score') {
    const rounded = Math.round(delta);
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('ru-RU')}`;
  }
  if (metric.key === 'failureCount') {
    const rounded = Math.round(delta);
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }
  const rounded = Math.round(delta);
  return `${rounded > 0 ? '+' : ''}${rounded} п.п.`;
}

function renderStrategyComparison(baselineId = selectedStrategyBaselineId) {
  if (!currentStrategyRun) return;
  const panel = $('#strategyComparison');
  const empty = $('#strategyCompareEmpty');
  const baseline = strategyHistory.find(run => run.id === baselineId && run.id !== currentStrategyRun.id && run.scenarioId === currentStrategyRun.scenarioId);
  if (!baseline) {
    panel.classList.add('hidden');
    empty.classList.remove('hidden');
    $('#strategyBaselineSelect').value = '';
    return;
  }
  selectedStrategyBaselineId = baseline.id;
  empty.classList.add('hidden');
  panel.classList.remove('hidden');
  const result = compareStrategyRuns(currentStrategyRun, baseline);
  if (!result.ok) {
    panel.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  const metricByRun = run => `${run.score.toLocaleString('ru-RU')} очков`;
  $('#strategyBaselineGrade').textContent = baseline.grade;
  $('#strategyBaselineScore').textContent = metricByRun(baseline);
  $('#strategyBaselineMeta').textContent = `${formatStrategyDate(baseline.completedAt)} · эвакуация ${baseline.rescuedPct}% · ${baseline.failureCount} активных отказов`;
  $('#strategyCurrentGrade').textContent = currentStrategyRun.grade;
  $('#strategyCurrentScore').textContent = metricByRun(currentStrategyRun);
  $('#strategyCurrentMeta').textContent = `${formatStrategyDate(currentStrategyRun.completedAt)} · эвакуация ${currentStrategyRun.rescuedPct}% · ${currentStrategyRun.failureCount} активных отказов`;
  const delta = result.scoreDelta;
  const scoreDelta = $('#strategyCurrentScore');
  scoreDelta.dataset.trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const body = $('#strategyComparisonRows');
  body.replaceChildren();
  for (const metric of result.metrics) {
    const row = document.createElement('tr');
    row.className = `strategy-row-${metric.outcome}`;
    const assessment = metric.outcome === 'better' ? 'ЛУЧШЕ' : metric.outcome === 'worse' ? 'ХУЖЕ' : 'ПОХОЖЕ';
    row.append(
      createStrategyCell('th', 'strategy-metric-label', metric.label),
      createStrategyCell('td', '', metric.format(metric.baselineValue)),
      createStrategyCell('td', 'strategy-current-value', metric.format(metric.currentValue)),
      createStrategyCell('td', `strategy-delta strategy-${metric.outcome}`, formatMetricDelta(metric, metric.delta)),
      createStrategyCell('td', `strategy-verdict strategy-${metric.outcome}`, assessment),
    );
    body.append(row);
  }
  const insightList = $('#strategyInsightList');
  insightList.replaceChildren();
  result.insights.forEach((insight, index) => {
    const item = document.createElement('li');
    item.append(createStrategyCell('span', 'strategy-insight-index', String(index + 1).padStart(2, '0')));
    item.append(createStrategyCell('span', '', insight));
    insightList.append(item);
  });
}

function renderStrategyLab(run = currentStrategyRun) {
  const panel = $('#strategyLabPanel');
  if (!panel || !run) return;
  currentStrategyRun = run;
  panel.classList.remove('hidden');
  const sameScenario = strategyHistory
    .filter(item => item.scenarioId === run.scenarioId && item.id !== run.id)
    .sort((a, b) => (b.score - a.score) || (Date.parse(b.completedAt || '') - Date.parse(a.completedAt || '')));
  $('#strategyHistoryCount').textContent = `${strategyHistory.length} / ${STRATEGY_HISTORY_LIMIT}`;
  $('#strategyHistoryCaption').textContent = strategyHistory.length
    ? `В этом браузере сохранено ${strategyHistory.length} из ${STRATEGY_HISTORY_LIMIT} последних попыток. Данные не отправляются на сервер.`
    : 'История пока пуста. Завершите миссию, чтобы сохранить первую попытку на этом устройстве.';
  const select = $('#strategyBaselineSelect');
  const compareButton = $('#strategyCompareBtn');
  const clearButton = $('#strategyHistoryClearBtn');
  select.replaceChildren();
  if (!sameScenario.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Пока нет другой попытки';
    select.append(option);
    select.disabled = true;
    compareButton.disabled = true;
    clearButton.disabled = strategyHistory.length === 0;
    $('#strategyCompareEmpty').classList.remove('hidden');
    $('#strategyComparison').classList.add('hidden');
    $('#strategyCompareEmpty').querySelector('b').textContent = 'СОЗДАЙТЕ БАЗУ ДЛЯ СРАВНЕНИЯ';
    $('#strategyCompareEmpty').querySelector('p').textContent = 'Завершите ещё одну попытку этого сценария. Результаты сохраняются только в этом браузере — аккаунт и сеть не нужны.';
    return;
  }
  sameScenario.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.grade} · ${item.score.toLocaleString('ru-RU')} очков · ${formatStrategyDate(item.completedAt)}`;
    select.append(option);
  });
  select.disabled = false;
  compareButton.disabled = false;
  clearButton.disabled = strategyHistory.length === 0;
  const chosen = sameScenario.find(item => item.id === selectedStrategyBaselineId) || sameScenario[0];
  selectedStrategyBaselineId = chosen.id;
  select.value = chosen.id;
  renderStrategyComparison(chosen.id);
}

function showResult() {
  const r = state.result;
  $('#resultGrade').textContent = r.grade;
  $('#resultGrade').className = `result-grade grade-${r.grade}`;
  $('#resultTitle').textContent = r.rescuedPct >= 75 ? 'Район удержан' : r.rescuedPct >= 48 ? 'Город понёс потери' : 'Кризис вышел из-под контроля';
  const diagnosis = r.cascade?.roadWashout && r.cascade?.pumpPowerCut
    ? 'Вода размыла прибрежную магистраль и остановила насосную после энергетического сбоя. Для полного восстановления нужно стабилизировать электросеть и снизить воду, затем восстановить дорогу.'
    : r.cascade?.roadWashout
      ? 'Критическое затопление размыло прибрежную магистраль: заторы выросли, а доступ экстренных служб снизился. Для ремонта нужно сначала снизить уровень воды ниже 58%.'
      : r.cascade?.pumpPowerCut && r.cascade?.signalOutage
        ? 'Каскадный отказ затронул сразу две системы: низкое напряжение остановило насосную и отключило светофоры, ускорив затопление и ухудшив доступ служб.'
    : r.cascade?.pumpPowerCut
      ? 'Каскадный отказ затронул насосную: критическое падение энергосети остановило откачку воды.'
      : r.cascade?.signalOutage
        ? 'Каскадный отказ: низкое напряжение отключило светофоры, усилило заторы и ухудшило доступ служб.'
        : r.cascade?.substationFlooded
          ? 'Каскадный отказ начался с подтопления подстанции: после достижения критического уровня вода ускорила потерю мощности.'
          : r.water >= 58
            ? 'Главная причина потерь — критическое затопление низких улиц.'
            : r.grid < 35
              ? 'Главная причина потерь — отказ энергосети и критических служб.'
              : r.access < 35
                ? 'Главная причина потерь — закрытый коридор эвакуации.'
                : r.rescuedPct >= 75
                  ? 'Ключевые службы сохранили работоспособность; сравните результат с другим порядком решений.'
                  : 'Система удержалась частично. Сравните, какой контур следовало защитить первым.';
  const missedTools = TOOL_ORDER.filter((tool) => !state.used[tool]).map((tool) => ({ traffic: 'коридор', power: 'резервное питание', drain: 'отвод воды' }[tool]));
  const nextStep = missedTools.length ? ` Не использовано: ${missedTools.join(', ')}.` : ' Все три ресурса использованы.';
  const completedRepairs = r.repairs?.length || 0;
  const pendingRepairs = r.pendingRepairs?.length || 0;
  const repairNames = completedRepairs ? ` (${r.repairs.map(item => item.target).join(', ')})` : '';
  const repairSummary = ` Ремонт: завершено ${completedRepairs}${repairNames}, незавершённых ${pendingRepairs}; бригад использовано ${r.repairTeamsUsed || 0} из 2.`;
  const stageSummary = r.crisisStage === 'contained' ? ' Кризис локализован.' : ' Кризис полностью локализовать не удалось.';
  $('#resultDescription').textContent = `${r.rescuedPct}% жителей эвакуированы. Энергосеть — ${r.grid}%, доступ служб — ${r.access}%. ${diagnosis}${repairSummary}${stageSummary}${nextStep}`;
  $('#resultSaved').textContent = `${r.rescued}`;
  $('#resultScore').textContent = r.score.toLocaleString('ru-RU');
  $('#resultOverlay').classList.remove('hidden');
  $('#resultOverlay').classList.add('shown');
  saveCompletedStrategyRun(r);
  renderMissionReplay();
  renderStrategyLab(currentStrategyRun);
  $('#operationNote').textContent = `Операция завершена с оценкой ${r.grade}. Можно повторить сценарий и сравнить результат.`;
  const completedScenario = getScenario(selectedScenarioId);
  const previousRecord = scenarioRecords[selectedScenarioId];
  const isNewRecord = !previousRecord || r.score > previousRecord.score;
  if (isNewRecord) {
    scenarioRecords[selectedScenarioId] = {
      score: r.score,
      grade: r.grade,
      rescued: r.rescued,
      rescuedPct: r.rescuedPct,
      completedAt: new Date().toISOString(),
      targets: { ...state.targets },
    };
    saveScenarioRecords();
  }
  const best = scenarioRecords[selectedScenarioId];
  $('#protocolTitle').textContent = isNewRecord ? `НОВЫЙ РЕКОРД · ${completedScenario.sectorCode}` : `Операция ${completedScenario.sectorCode} · ${r.grade}`;
  $('#protocolSubtitle').textContent = isNewRecord
    ? `${r.score.toLocaleString('ru-RU')} очков · ${r.rescuedPct}% жителей спасено`
    : `${r.score.toLocaleString('ru-RU')} очков · рекорд ${best.score.toLocaleString('ru-RU')}`;
  $('#bestGrade').textContent = best.grade || r.grade;
  $('#bestGrade').classList.toggle('best', best.grade === 'S' || best.grade === 'A');
  showToast(isNewRecord ? `Новый личный рекорд сценария · ${r.grade}.` : `Операция завершена · оценка ${r.grade}.`);
  playTone(r.grade === 'S' || r.grade === 'A' ? 860 : 300, .19, 'sine');
}

function showToast(message) {
  $('#toastText').textContent = message;
  const toast = $('#toast');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2700);
}

function playTone(frequency = 440, duration = .06, type = 'sine') {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.035, audioContext.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + duration + .015);
  } catch { /* audio is an enhancement; gameplay does not depend on it */ }
}

async function copyChallengeCode() {
  const scenario = getScenario(selectedScenarioId);
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', selectedScenarioId);
  url.searchParams.delete('debug');
  const shareUrl = url.toString();
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast(`Ссылка на испытание «${scenario.district}» скопирована.`);
  } catch {
    const temp = document.createElement('textarea');
    temp.value = shareUrl; temp.style.position = 'fixed'; temp.style.opacity = '0';
    document.body.append(temp); temp.select();
    const success = document.execCommand('copy'); temp.remove();
    showToast(success ? `Ссылка на «${scenario.district}» скопирована.` : `${scenario.code} · ${shareUrl}`);
  }
}

function renderExportCanvas(width = 7680) {
  const height = Math.round(width * BASE_H / BASE_W);
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d', { alpha: false });
  if (!outputContext) throw new Error('Canvas export context is unavailable');
  const previousContext = ctx;
  const previousView = view;
  try {
    ctx = outputContext;
    const scale = Math.min(width / BASE_W, height / BASE_H);
    view = { width, height, dpr: 1, scale, ox: (width - BASE_W * scale) / 2, oy: (height - BASE_H * scale) / 2 };
    drawMap(performance.now() / 1000);
  } finally {
    ctx = previousContext;
    view = previousView;
  }
  return output;
}

function saveMapFrame() {
  if (mapExportBusy) return;
  mapExportBusy = true;
  const exportScenarioId = selectedScenarioId;
  const exportButton = $('#saveFrameBtn');
  exportButton.disabled = true;
  exportButton.setAttribute('aria-busy', 'true');
  showToast('Создаю мастер-кадр 8K PNG…');
  const finishState = () => {
    mapExportBusy = false;
    exportButton.disabled = false;
    exportButton.removeAttribute('aria-busy');
  };
  // Wait a frame so the toast is visible before the heavier high-resolution render.
  requestAnimationFrame(() => {
    try {
      const output = renderExportCanvas(7680);
      const finish = (blob) => {
        finishState();
        if (!blob) { showToast('Браузер не смог сформировать 8K PNG. Попробуйте экспорт на компьютере.'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `civic-cascade-${exportScenarioId}-8k-map.png`;
        link.href = url;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        showToast('Мастер-кадр 8K PNG сохранён.');
      };
      if (output.toBlob) output.toBlob(finish, 'image/png');
      else finish(dataUrlToBlob(output.toDataURL('image/png')));
    } catch (error) {
      finishState();
      console.error('8K frame export failed:', error);
      showToast('Не удалось создать 8K кадр: браузер ограничил память. На слабом устройстве попробуйте позже.');
    }
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function saveOperationCard() {
  if (!state.result) { saveMapFrame(); return; }
  try {
    const scenario = getScenario(selectedScenarioId);
    const result = state.result;
    const card = document.createElement('canvas');
    card.width = 1600; card.height = 1000;
    const c = card.getContext('2d');
    const bg = c.createLinearGradient(0, 0, 1600, 1000);
    bg.addColorStop(0, '#07151b'); bg.addColorStop(.55, '#0b2027'); bg.addColorStop(1, '#08151d');
    c.fillStyle = bg; c.fillRect(0, 0, card.width, card.height);
    c.strokeStyle = 'rgba(130,190,174,.06)'; c.lineWidth = 1;
    for (let x = 24; x < 1600; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1000); c.stroke(); }
    for (let y = 24; y < 1000; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(1600, y); c.stroke(); }

    // Brand header and incident ID.
    c.fillStyle = '#72e0cc';
    [[54,48],[78,48],[54,72],[78,72]].forEach(([x,y],i) => { c.fillStyle = ['#72e0cc','#3da89e','#55bcb0','#ffc47d'][i]; roundRect(c,x,y,17,17,4); c.fill(); });
    c.fillStyle = '#e7f1eb'; c.font = '700 22px ui-sans-serif, system-ui, sans-serif'; c.letterSpacing = '3px'; c.fillText('CIVIC CASCADE', 120, 67);
    c.fillStyle = '#678c8d'; c.font = '11px ui-monospace, monospace'; c.letterSpacing = '2px'; c.fillText('FIELD OPERATIONS / FINAL REPORT', 120, 88);
    roundRect(c, 1260, 48, 286, 36, 6); c.fillStyle = 'rgba(114,224,204,.08)'; c.fill();
    c.strokeStyle = 'rgba(114,224,204,.25)'; c.stroke();
    c.fillStyle = '#72e0cc'; c.beginPath(); c.arc(1280, 66, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a6c7bd'; c.font = '10px ui-monospace, monospace'; c.letterSpacing = '1.2px'; c.fillText('OPERATION CLOSED', 1295, 70);
    c.strokeStyle = 'rgba(149,191,199,.16)'; c.beginPath(); c.moveTo(54, 119); c.lineTo(1546, 119); c.stroke();

    // Map image gets its own framed space; the right column is a purpose-built shareable result.
    const mapX = 54, mapY = 151, mapW = 990, mapH = mapW * BASE_H / BASE_W;
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 28; c.shadowOffsetY = 10;
    roundRect(c, mapX, mapY, mapW, mapH, 9); c.fillStyle = '#0d2329'; c.fill(); c.restore();
    c.save(); roundRect(c, mapX, mapY, mapW, mapH, 9); c.clip(); c.drawImage(canvas, mapX, mapY, mapW, mapH); c.restore();
    c.strokeStyle = 'rgba(142,205,186,.22)'; roundRect(c, mapX, mapY, mapW, mapH, 9); c.stroke();
    roundRect(c, mapX + 16, mapY + 15, 206, 28, 4); c.fillStyle = 'rgba(5,18,23,.85)'; c.fill();
    c.fillStyle = '#91b7ad'; c.font = '9px ui-monospace, monospace'; c.letterSpacing = '1px'; c.fillText(`${scenario.sectorCode} / ${scenario.code}`, mapX + 27, mapY + 33);

    const rx = 1082, rw = 464;
    roundRect(c, rx, mapY, rw, 606, 9); c.fillStyle = 'rgba(6,19,25,.72)'; c.fill();
    c.strokeStyle = 'rgba(149,191,199,.15)'; roundRect(c, rx, mapY, rw, 606, 9); c.stroke();
    c.fillStyle = '#71938f'; c.font = '10px ui-monospace, monospace'; c.letterSpacing = '2px'; c.fillText('ОЦЕНКА ОПЕРАЦИИ', rx + 28, mapY + 40);
    c.fillStyle = result.grade === 'S' ? '#ffe0a0' : result.grade === 'D' ? '#ff8588' : '#72e0cc';
    c.font = '500 112px ui-monospace, monospace'; c.letterSpacing = '-7px'; c.fillText(result.grade, rx + 25, mapY + 165);
    c.fillStyle = '#e6f1eb'; c.font = '600 27px ui-sans-serif, system-ui, sans-serif'; c.letterSpacing = '-.5px';
    c.fillText(result.rescuedPct >= 75 ? 'Район удержан' : result.rescuedPct >= 48 ? 'Город понёс потери' : 'Кризис вышел из-под контроля', rx + 29, mapY + 218);
    c.fillStyle = '#759397'; c.font = '14px ui-sans-serif, system-ui, sans-serif'; c.letterSpacing = '0px';
    const title = `${scenario.titleLead} ${scenario.titleAccent} · ${scenario.district}`;
    c.fillText(title, rx + 29, mapY + 247, rw - 58);
    c.strokeStyle = 'rgba(149,191,199,.13)'; c.beginPath(); c.moveTo(rx + 28, mapY + 276); c.lineTo(rx + rw - 28, mapY + 276); c.stroke();

    const stats = [
      { label: 'ЭВАКУИРОВАНО', value: `${result.rescued}`, sub: `ИЗ ${result.population}` },
      { label: 'ОЧКИ ОПЕРАЦИИ', value: result.score.toLocaleString('ru-RU'), sub: `${result.toolsUsed} ВМЕШАТЕЛЬСТВА` },
    ];
    stats.forEach((item, i) => {
      const x = rx + 29 + i * 213;
      c.fillStyle = '#597a7c'; c.font = '9px ui-monospace, monospace'; c.letterSpacing = '1.2px'; c.fillText(item.label, x, mapY + 310);
      c.fillStyle = '#e0ece6'; c.font = '500 32px ui-monospace, monospace'; c.letterSpacing = '-1px'; c.fillText(item.value, x, mapY + 352);
      c.fillStyle = '#73948f'; c.font = '9px ui-monospace, monospace'; c.letterSpacing = '.5px'; c.fillText(item.sub, x, mapY + 373);
    });
    c.strokeStyle = 'rgba(149,191,199,.13)'; c.beginPath(); c.moveTo(rx + 28, mapY + 395); c.lineTo(rx + rw - 28, mapY + 395); c.stroke();

    const bars = [
      { label: 'ВОДА', value: result.water, color: '#65c5df' },
      { label: 'ЭНЕРГОСЕТЬ', value: result.grid, color: '#ffc47d' },
      { label: 'ДОСТУП СЛУЖБ', value: result.access, color: '#72e0cc' },
    ];
    bars.forEach((bar, i) => {
      const y = mapY + 430 + i * 45;
      c.fillStyle = '#719096'; c.font = '9px ui-monospace, monospace'; c.letterSpacing = '.8px'; c.fillText(bar.label, rx + 29, y);
      c.fillStyle = '#d7e7df'; c.font = '12px ui-monospace, monospace'; c.textAlign = 'right'; c.fillText(`${bar.value}%`, rx + rw - 29, y); c.textAlign = 'left';
      roundRect(c, rx + 29, y + 10, rw - 58, 5, 2); c.fillStyle = '#1a343a'; c.fill();
      roundRect(c, rx + 29, y + 10, (rw - 58) * bar.value / 100, 5, 2); c.fillStyle = bar.color; c.fill();
    });
    c.fillStyle = '#688b8b'; c.font = '10px ui-sans-serif, system-ui, sans-serif'; c.letterSpacing = '0px';
    c.fillText(`РЕМОНТЫ: ${result.repairs?.length || 0}  ·  ${result.crisisStage === 'contained' ? 'КРИЗИС ЛОКАЛИЗОВАН' : 'ТРЕБУЕТСЯ ДАЛЬНЕЙШЕЕ ВОССТАНОВЛЕНИЕ'}`, rx + 29, mapY + 584);

    c.strokeStyle = 'rgba(149,191,199,.16)'; c.beginPath(); c.moveTo(54, 838); c.lineTo(1546, 838); c.stroke();
    c.fillStyle = '#6b8e8b'; c.font = '10px ui-monospace, monospace'; c.letterSpacing = '1.3px'; c.fillText('CIVIC CASCADE  /  НЕЗАВИСИМАЯ СИМУЛЯЦИЯ', 54, 868);
    c.fillStyle = '#4b6a70'; c.font = '9px ui-monospace, monospace'; c.letterSpacing = '.6px'; c.fillText(`ИСПЫТАНИЕ ${scenario.code}  ·  90 СЕКУНД  ·  РЕМОНТ И ВОССТАНОВЛЕНИЕ`, 54, 891);
    c.fillStyle = '#3d5a60'; c.textAlign = 'right'; c.fillText('BUILD 1.6.0 / ATMOSPHERE', 1546, 891); c.textAlign = 'left';

    const link = document.createElement('a');
    link.download = `civic-cascade-${selectedScenarioId}-${result.grade}-result.png`;
    link.href = card.toDataURL('image/png');
    link.click();
    showToast('Карточка результата создана. Её можно отправить друзьям или опубликовать.');
  } catch (error) {
    console.error('Unable to export result card', error);
    showToast('Не удалось создать карточку. Попробуйте сохранить карту отдельно.');
  }
}

function exportOperationReport() {
  if (state.phase !== 'complete' || !state.result) {
    showToast('Сначала завершите операцию — тогда появится полный диагностический протокол.');
    return;
  }
  const scenario = getScenario(state.scenarioId);
  const report = {
    format: 'civic-cascade-operation-report',
    version: '1.6.0',
    exportedAt: new Date().toISOString(),
    scenario: { id: scenario.id, code: scenario.code, district: scenario.district, sectorCode: scenario.sectorCode },
    durationSeconds: Number(state.elapsed.toFixed(2)),
    result: { ...state.result },
    interventions: state.interventions.map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    repairs: state.repairs.map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    pendingRepairs: state.repairJobs.map(job => ({ system: job.system, remaining: Number(job.remaining.toFixed(2)), suspended: job.suspended })),
    eventTimeline: state.timeline.map(item => ({ ...item })),
    finalMetrics: { water: Number(state.water.toFixed(2)), grid: Number(state.grid.toFixed(2)), access: Number(state.access.toFixed(2)), congestion: Number(state.congestion.toFixed(2)), integrity: Number(state.integrity.toFixed(2)), rescued: Math.round(state.rescued), population: state.population, crisisStage: state.crisisStage, repairCharges: state.repairCharges, substationFlooded: state.substationFlooded, signalOutage: state.signalOutage, pumpPowerCut: state.pumpPowerCut, roadWashout: state.roadWashout, roadRestored: state.roadRestored },
    note: 'Локальная диагностическая запись игрового прохождения. Не содержит сетевых данных или персональной информации.',
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `civic-cascade-${scenario.code.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('Диагностический протокол сохранён в JSON.');
}

function runRuntimeModelBenchmark() {
  const button = $('#diagBenchmarkBtn');
  const status = $('#diagBenchmarkStatus');
  if (!button || !status || button.disabled) return;
  button.disabled = true;
  status.dataset.health = '';
  status.textContent = 'ИЗОЛИРОВАННЫЙ ТЕСТ ТРЁХ СЦЕНАРИЕВ…';
  // Yield once so the button/status paint before the bounded synchronous model test.
  requestAnimationFrame(() => {
    try {
      lastRuntimeBenchmark = runSimulationBenchmark({ stepsPerScenario: 450, stepSeconds: 0.12 });
      const passed = lastRuntimeBenchmark.passed;
      status.dataset.health = passed ? 'good' : 'low';
      status.textContent = `${passed ? 'УСПЕШНО' : 'ЕСТЬ ПРОБЛЕМЫ'} · ${lastRuntimeBenchmark.checksPassed}/${lastRuntimeBenchmark.checksTotal} проверок · ${lastRuntimeBenchmark.totalWallTimeMs.toFixed(1)} мс`;
      showToast(`Тест модели завершён: ${lastRuntimeBenchmark.checksPassed}/${lastRuntimeBenchmark.checksTotal}. Скорость измеряет симуляцию, не FPS.`);
    } catch (error) {
      status.dataset.health = 'low';
      status.textContent = `ОШИБКА ТЕСТА · ${String(error?.message || error).slice(0, 100)}`;
    } finally {
      button.disabled = false;
    }
  });
}

function exportRuntimeDiagnostics() {
  const report = createRuntimeReport({
    frameSamples: performanceStats.frameSamples,
    state,
    visualSettings: { mode: visualMode, adaptiveQuality, effectiveQuality: renderQuality, reducedMotion: isReducedMotion(), atmosphere: scenarioAtmosphereStatus(state.scenarioId) },
    mapCamera: { ...mapCamera, panMode: mapPanMode },
    benchmark: lastRuntimeBenchmark,
  });
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `civic-cascade-runtime-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  const status = $('#diagBenchmarkStatus');
  if (status) { status.dataset.health = 'good'; status.textContent = 'ЛОКАЛЬНЫЙ JSON-ОТЧЁТ СОХРАНЁН'; }
  showToast('Отчёт диагностики сохранён локально. Игра не отправляет эти данные на сервер.');
}

function setSound() {
  soundEnabled = !soundEnabled;
  $('#soundBtn').setAttribute('aria-pressed', String(soundEnabled));
  $('#soundBtn').title = soundEnabled ? 'Отключить звуковые сигналы' : 'Включить звуковые сигналы';
  showToast(soundEnabled ? 'Короткие звуковые сигналы включены.' : 'Звуковые сигналы отключены.');
  if (soundEnabled) playTone(680, .09, 'sine');
}

function updateDiagnostics(now) {
  if (!$('#diagnosticsPanel') || now - performanceStats.lastDiagnosticAt < 250) return;
  performanceStats.lastDiagnosticAt = now;
  const times = performanceStats.frames;
  while (times.length && now - times[0] > 2000) times.shift();
  const fps = times.length > 1 ? Math.round((times.length - 1) * 1000 / Math.max(1, times[times.length - 1] - times[0])) : 0;
  const frameSummary = summarizeFrameSamples(performanceStats.frameSamples.map((sample) => sample.ms));
  const frameMs = frameSummary.meanMs || performanceStats.lastInterval;
  const p95FrameMs = frameSummary.p95Ms;
  const $set = (id, value) => { const node = $(`#${id}`); if (node) node.textContent = value; };
  $set('diagFps', `${fps} FPS`);
  $set('diagFrameTime', `${frameMs.toFixed(1)} мс`);
  $set('diagFrameP95', `${p95FrameMs.toFixed(1)} мс`);
  const p95Status = $('#diagFrameP95Status');
  if (p95Status) {
    if (frameSummary.sampleCount < 12) {
      p95Status.textContent = 'СБОР ДАННЫХ';
      p95Status.dataset.health = '';
    } else {
      p95Status.textContent = p95FrameMs <= 16.7 ? 'В БЮДЖЕТЕ КАДРА' : p95FrameMs <= 25 ? 'ПОВЫШЕННАЯ ЗАДЕРЖКА' : 'ЗАМЕТНЫЕ ПРОСАДКИ';
      p95Status.dataset.health = p95FrameMs <= 16.7 ? 'good' : p95FrameMs <= 25 ? 'mid' : 'low';
    }
  }
  $set('diagDrawTime', `${performanceStats.drawMs.toFixed(2)} мс`);
  $set('diagQuality', `КАЧЕСТВО: ${Math.round(renderQuality * 100)}% · ${QUALITY_LABELS[visualMode]}`);
  $set('diagUpdateTime', `${performanceStats.updateMs.toFixed(2)} мс`);
  $set('diagCanvasSize', `${canvas.width} × ${canvas.height}`);
  $set('diagViewport', `ЭКРАН: ${Math.round(canvas.clientWidth)} × ${Math.round(canvas.clientHeight)} CSS PX`);
  $set('diagDpr', `${(window.devicePixelRatio || 1).toFixed(2)}×`);
  $set('diagMapCamera', `${Math.round(mapCamera.zoom * 100)}%`);
  $set('diagMapCameraMode', mapPanMode ? 'РУЧНОЕ ПЕРЕМЕЩЕНИЕ' : mapCamera.zoom > 1.001 ? 'ПРИБЛИЖЕНИЕ' : 'ОБЩИЙ ОБЗОР');
  const memory = performance.memory;
  $set('diagMemory', memory ? `${Math.round(memory.usedJSHeapSize / 1048576)} МБ` : 'Н/Д');
  $set('diagMemoryNote', memory ? `ЛИМИТ ${Math.round(memory.jsHeapSizeLimit / 1048576)} МБ` : 'БРАУЗЕР НЕ РАСКРЫВАЕТ ЭТИ ДАННЫЕ');
  $set('diagDroppedFrames', String(performanceStats.longFrames));
  $set('diagInputTime', `${performanceStats.inputMs.toFixed(2)} мс`);
  if (fps > 0 && fps < 28) {
    stableFpsSince = 0;
    if (!lowFpsSince) lowFpsSince = now;
    if (now - lowFpsSince > 1400 && adaptiveQuality > .6) {
      adaptiveQuality = .6;
      applyEffectiveQuality();
    }
  } else if (fps >= 50) {
    lowFpsSince = 0;
    if (!stableFpsSince) stableFpsSince = now;
    if (now - stableFpsSince > 4500 && adaptiveQuality < 1) {
      adaptiveQuality = 1;
      applyEffectiveQuality();
    }
  } else {
    stableFpsSince = 0;
  }
  const fpsStatus = $('#diagFpsStatus');
  if (fpsStatus) {
    fpsStatus.textContent = fps >= 55 ? 'СТАБИЛЬНО' : fps >= 40 ? 'ПРИЕМЛЕМО' : 'НИЗКАЯ ЧАСТОТА';
    fpsStatus.dataset.health = fps >= 55 ? 'good' : fps >= 40 ? 'mid' : 'low';
  }
  const health = $('#diagnosticHealth');
  const warnings = [];
  if (fps > 0 && fps < 40) warnings.push('FPS НИЖЕ 40');
  if (performanceStats.drawMs > 20) warnings.push('ДОЛГАЯ ОТРИСОВКА');
  if (frameSummary.sampleCount >= 12 && p95FrameMs > 25) warnings.push('P95 КАДРА ВЫШЕ 25 МС');
  if (performanceStats.updateMs > 8) warnings.push('ДОЛГАЯ ЛОГИКА');
  if (document.hidden) warnings.push('ВКЛАДКА НЕАКТИВНА');
  if (renderQuality < 1) warnings.push('ЭФФЕКТЫ АДАПТИРОВАНЫ ДЛЯ ПЛАВНОСТИ');
  if (health) {
    health.textContent = warnings.length ? 'ТРЕБУЕТ ВНИМАНИЯ' : fps ? 'В НОРМЕ' : 'СБОР ДАННЫХ';
    health.dataset.health = warnings.length ? 'warn' : 'good';
  }
  $set('diagWarnings', warnings.length ? `ПРЕДУПРЕЖДЕНИЯ: ${warnings.join(' · ')}` : 'ПРЕДУПРЕЖДЕНИЯ: НЕТ');
  $set('diagDeviceClass', `УСТРОЙСТВО: ${matchMedia('(pointer: coarse)').matches ? 'СЕНСОРНОЕ' : 'МЫШЬ / ТАЧПАД'} · ${window.innerWidth < 700 ? 'МОБИЛЬНЫЙ ЭКРАН' : window.innerWidth < 1200 ? 'СРЕДНИЙ ЭКРАН' : 'БОЛЬШОЙ ЭКРАН'}`);
  $set('diagVisibility', `ВКЛАДКА: ${document.hidden ? 'ФОНОВАЯ' : 'АКТИВНАЯ'} · ФАЗА: ${state.phase.toUpperCase()}`);
  $set('diagSimulationRate', `СИМ ×${SIMULATION_SPEED.toFixed(1)} · ${state.elapsed.toFixed(1)}/${MISSION_DURATION}с · РЕМ ${state.repairs.length} · БР ${state.repairCharges}`);
}

function toggleDiagnostics(force) {
  const panel = $('#diagnosticsPanel');
  const button = $('#diagnosticsToggle');
  if (!panel || !button) return;
  diagnosticOpen = typeof force === 'boolean' ? force : !diagnosticOpen;
  panel.hidden = !diagnosticOpen;
  button.setAttribute('aria-expanded', String(diagnosticOpen));
  button.classList.toggle('active', diagnosticOpen);
  if (diagnosticOpen) {
    updateDiagnostics(performance.now());
    panel.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }
}

function update(delta, now) {
  const logicStart = performance.now();
  if (state.phase === 'running' && !document.hidden) {
    tick(state, delta);
    if (state.repairs.length < previousRepairCount) previousRepairCount = state.repairs.length;
    if (state.repairs.length > previousRepairCount) {
      const finished = state.repairs.slice(previousRepairCount);
      const repairPoints = { substation: [965, 119], signals: [680, 390], pump: [955, 635] };
      for (const repair of finished) { const point = repairPoints[repair.system]; if (point) transientPulses.push({ x: point[0], y: point[1], time: now / 1000, color: '#72e0cc' }); }
      previousRepairCount = state.repairs.length;
    }
    refreshQuickTargetForecasts();
    if (state.phase === 'complete') renderUI(true);
  }
  performanceStats.updateMs = performance.now() - logicStart;
  const drawStart = performance.now();
  drawMap(now / 1000);
  performanceStats.drawMs = performance.now() - drawStart;
  if (now - lastUiRender > 135 || state.phase !== lastPhase) {
    renderUI();
    lastUiRender = now;
    lastPhase = state.phase;
  }
  updateDiagnostics(now);
}

function loop(now) {
  updateMapCameraTransition(now);
  if (!lastFrame) lastFrame = now;
  const rawDelta = now - lastFrame;
  performanceStats.lastInterval = rawDelta;
  if (rawDelta > 33.3 && !document.hidden) performanceStats.longFrames += 1;
  performanceStats.frameSamples.push({ at: now, ms: rawDelta });
  while (performanceStats.frameSamples.length > 240) performanceStats.frameSamples.shift();
  while (performanceStats.frameSamples.length && now - performanceStats.frameSamples[0].at > 2200) performanceStats.frameSamples.shift();
  performanceStats.frames.push(now);
  while (performanceStats.frames.length && now - performanceStats.frames[0] > 2200) performanceStats.frames.shift();
  lastFrame = now;
  if (!document.hidden) update(Math.min(rawDelta / 1000, .12), now);
  requestAnimationFrame(loop);
}

// Tactical camera controls: buttons, cursor-anchored wheel zoom, touch pinch and hand-mode pan.
$('#mapZoomIn')?.addEventListener('click', () => setMapCamera(zoomMapCamera(cameraTransition?.to || mapCamera, 1, BASE_W, BASE_H)));
$('#mapZoomOut')?.addEventListener('click', () => setMapCamera(zoomMapCamera(cameraTransition?.to || mapCamera, -1, BASE_W, BASE_H)));
$('#mapCameraReset')?.addEventListener('click', resetMapCamera);
$('#mapPanToggle')?.addEventListener('click', () => setMapPanMode(!mapPanMode));
const touchPointers = new Map();
let pinchGesture = null;
canvas.addEventListener('wheel', (event) => {
  if (event.deltaY === 0) return;
  event.preventDefault();
  const focus = canvasPointFromClient(event.clientX, event.clientY);
  const base = cameraTransition?.to || mapCamera;
  const step = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 0.12 : 0.16;
  const zoom = base.zoom + (event.deltaY < 0 ? step : -step);
  cameraTransition = null;
  mapCamera = zoomMapCameraAtPoint(base, zoom, focus, BASE_W, BASE_H);
  updateMapCameraUI();
}, { passive: false });

function updatePinchCamera() {
  if (!pinchGesture) return;
  const a = touchPointers.get(pinchGesture.ids[0]);
  const b = touchPointers.get(pinchGesture.ids[1]);
  if (!a || !b) return;
  const pointA = canvasPointFromClient(a.clientX, a.clientY);
  const pointB = canvasPointFromClient(b.clientX, b.clientY);
  const midpoint = { x: (pointA.x + pointB.x) / 2, y: (pointA.y + pointB.y) / 2 };
  const distance = Math.max(12, Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y));
  mapCamera = pinchMapCamera(pinchGesture.camera, pinchGesture.midpoint, pinchGesture.distance, midpoint, distance, BASE_W, BASE_H);
  pinchGesture.moved = pinchGesture.moved || Math.abs(distance - pinchGesture.distance) > 5 || Math.hypot(midpoint.x - pinchGesture.midpoint.x, midpoint.y - pinchGesture.midpoint.y) > 5;
  cameraTransition = null;
  updateMapCameraUI();
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') {
    touchPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
    if (touchPointers.size === 2) {
      const entries = [...touchPointers.entries()];
      const p1 = canvasPointFromClient(entries[0][1].clientX, entries[0][1].clientY);
      const p2 = canvasPointFromClient(entries[1][1].clientX, entries[1][1].clientY);
      const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchGesture = {
        ids: [entries[0][0], entries[1][0]],
        midpoint,
        distance: Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
        camera: { ...mapCamera },
        moved: false,
      };
      panGesture = null;
      cameraTransition = null;
      suppressMapClick = true;
      event.preventDefault();
      return;
    }
  }
  if (!mapPanMode || event.button !== 0) return;
  event.preventDefault();
  cameraTransition = null;
  panGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    cameraX: mapCamera.x,
    cameraY: mapCamera.y,
    moved: false,
  };
  try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
});
canvas.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch' && touchPointers.has(event.pointerId)) {
    touchPointers.delete(event.pointerId);
    if (pinchGesture && pinchGesture.ids.includes(event.pointerId)) {
      suppressMapClick = true;
      pinchGesture = null;
      panGesture = null;
    }
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
  }
  if (panGesture && panGesture.pointerId === event.pointerId) {
    suppressMapClick = panGesture.moved;
    panGesture = null;
    updateMapCameraUI();
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
  }
});
canvas.addEventListener('pointercancel', (event) => {
  touchPointers.delete(event.pointerId);
  if (pinchGesture?.ids.includes(event.pointerId)) pinchGesture = null;
  if (panGesture && panGesture.pointerId === event.pointerId) panGesture = null;
  updateMapCameraUI();
});
// Controls are intentionally simple: every resource maps to one kind of real target.
$$('.tool-card').forEach(button => button.addEventListener('click', () => selectTool(button.dataset.tool)));
$$('.repair-action').forEach(button => button.addEventListener('click', () => {
  const result = dispatchRepair(state, button.dataset.repairTarget);
  if (!result.ok) { showToast(result.reason); renderRepairControls(); return; }
  selectedTool = null;
  $('#targetHint').classList.add('hidden');
  renderToolControls();
  renderUI(true);
  playTone(430, .075, 'triangle');
  showToast(result.message);
}));
canvas.addEventListener('click', (event) => {
  if (suppressMapClick) { suppressMapClick = false; event.preventDefault(); return; }
  if (mapPanMode) return;
  useSelectedTool(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' && touchPointers.has(event.pointerId)) {
    touchPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (pinchGesture && pinchGesture.ids.includes(event.pointerId)) {
      updatePinchCamera();
      return;
    }
  }
  if (panGesture && panGesture.pointerId === event.pointerId) {
    const dxPx = event.clientX - panGesture.startX;
    const dyPx = event.clientY - panGesture.startY;
    if (Math.hypot(dxPx, dyPx) > 3) panGesture.moved = true;
    if (panGesture.moved) {
      mapCamera = panMapCamera(
        { zoom: mapCamera.zoom, x: panGesture.cameraX, y: panGesture.cameraY },
        dxPx / Math.max(view.scale, .0001),
        dyPx / Math.max(view.scale, .0001),
        BASE_W,
        BASE_H,
      );
      updateMapCameraUI();
    }
    return;
  }
  const p = getWorldPoint(event); mouseWorld = p;
  $('#coordsReadout').textContent = `X ${String(Math.round(p.x)).padStart(3, '0')} / Y ${String(Math.round(p.y)).padStart(3, '0')}`;
  const target = selectedTool ? getTargetAt(p.x, p.y, selectedTool) : null;
  canvas.style.cursor = mapPanMode ? 'grab' : target ? 'pointer' : 'crosshair';
});
$('#startBtn').addEventListener('click', startOrResume);
$('#pauseBtn').addEventListener('click', togglePause);
$('#resetBtn').addEventListener('click', resetMission);
$('#retryBtn').addEventListener('click', resetMission);
$('#strategyLabRevealBtn')?.addEventListener('click', () => {
  $('#strategyLabPanel')?.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  $('#strategyBaselineSelect')?.focus({ preventScroll: true });
});
$('#strategyCompareBtn')?.addEventListener('click', () => renderStrategyComparison($('#strategyBaselineSelect')?.value));
$('#strategyBaselineSelect')?.addEventListener('change', event => {
  selectedStrategyBaselineId = event.target.value || null;
  renderStrategyComparison(selectedStrategyBaselineId);
});
$('#strategyHistoryClearBtn')?.addEventListener('click', () => {
  strategyHistory = [];
  selectedStrategyBaselineId = null;
  try { localStorage.removeItem(STRATEGY_HISTORY_KEY); } catch { /* memory-only clear still applies */ }
  if (currentStrategyRun) renderStrategyLab(currentStrategyRun);
  else {
    $('#strategyLabPanel')?.classList.add('hidden');
    $('#strategyHistoryCount').textContent = `0 / ${STRATEGY_HISTORY_LIMIT}`;
  }
  showToast('Локальная история стратегий очищена.');
});
$('#reviewMissionBtn')?.addEventListener('click', () => {
  $('#missionReplayPanel')?.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  $('#replayScrubber')?.focus({ preventScroll: true });
});
$('#replayScrubber')?.addEventListener('input', event => renderReplayPosition(event.target.value));
$('#replayPrevEvent')?.addEventListener('click', () => seekReplayEvent(-1));
$('#replayNextEvent')?.addEventListener('click', () => seekReplayEvent(1));
$('#cancelToolBtn').addEventListener('click', () => { selectedTool = null; renderToolControls(); $('#targetHint').classList.add('hidden'); $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем нажмите на подходящий объект на карте.</small></span>'; });
$('#shareCodeBtn').addEventListener('click', copyChallengeCode);
$('#exportReportBtn').addEventListener('click', exportOperationReport);
$('#saveFrameBtn').addEventListener('click', saveMapFrame);
$('#resultShareBtn').addEventListener('click', saveOperationCard);
$('#soundBtn').addEventListener('click', setSound);
$('#scenarioSelect').addEventListener('change', (event) => changeScenario(event.target.value));
$('#diagnosticsToggle')?.addEventListener('click', () => toggleDiagnostics());
$('#diagBenchmarkBtn')?.addEventListener('click', runRuntimeModelBenchmark);
$('#diagExportBtn')?.addEventListener('click', exportRuntimeDiagnostics);$('#visualSettingsBtn')?.addEventListener('click', () => toggleVisualSettings());
$('#visualQualitySelect')?.addEventListener('change', (event) => {
  const mode = event.target.value;
  if (!Object.hasOwn(QUALITY_FACTORS, mode)) return;
  visualMode = mode;
  applyEffectiveQuality();
  saveVisualSettings();
  showToast(`Режим графики: ${QUALITY_NAMES[visualMode].toLowerCase()}.`);
});
$('#reduceMotionToggle')?.addEventListener('change', (event) => {
  userReduceMotion = event.target.checked;
  applyEffectiveQuality();
  saveVisualSettings();
  showToast(isReducedMotion() ? 'Анимация и вспышки уменьшены.' : 'Анимация возвращена. Системные ограничения движения сохраняются.');
});
document.addEventListener('pointerdown', (event) => {
  const panel = $('#visualSettingsPanel');
  const button = $('#visualSettingsBtn');
  if (panel && !panel.hidden && !panel.contains(event.target) && !button?.contains(event.target)) toggleVisualSettings(false);
});
systemMotionPreference.addEventListener?.('change', () => applyEffectiveQuality());
document.addEventListener('visibilitychange', () => {
  lastFrame = 0;
  if (document.hidden && state.phase === 'running') {
    $('#operationNote').textContent = 'Вкладка неактивна: симуляция приостановлена для экономии ресурсов.';
  }
  if (!document.hidden && state.phase === 'running') {
    $('#operationNote').textContent = 'Симуляция активна. Проверьте город и оставшиеся вмешательства.';
  }
});
window.addEventListener('resize', resizeCanvas, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
  if (tag === 'SELECT' && event.key !== 'Escape') return;
  if (event.key === '1') selectTool('traffic');
  if (event.key === '2') selectTool('power');
  if (event.key === '3') selectTool('drain');
  if (event.key === 'Escape') {
    if ($('#visualSettingsPanel') && !$('#visualSettingsPanel').hidden) {
      toggleVisualSettings(false);
      $('#visualSettingsBtn')?.focus({ preventScroll: true });
      return;
    }
    selectedTool = null;
    renderToolControls();
    $('#targetHint').classList.add('hidden');
    $('#toolInstruction').innerHTML = '<span class="instruction-cross">⌖</span><span><b>ВЫБЕРИТЕ ИНСТРУМЕНТ</b><small>Затем нажмите на подходящий объект на карте.</small></span>';
  }
  if (event.code === 'Space') {
    event.preventDefault();
    if (state.phase === 'briefing') startOrResume();
    else if (state.phase === 'running' || state.phase === 'paused') togglePause();
  }
  if (event.key.toLowerCase() === 'r' && (state.phase === 'complete' || event.shiftKey)) resetMission();
  if (event.key.toLowerCase() === 'd') toggleDiagnostics();
  if (event.key.toLowerCase() === 'v') toggleVisualSettings();
  if (event.key === '+' || event.key === '=') setMapCamera(zoomMapCamera(cameraTransition?.to || mapCamera, 1, BASE_W, BASE_H));
  if (event.key === '-' || event.key === '_') setMapCamera(zoomMapCamera(cameraTransition?.to || mapCamera, -1, BASE_W, BASE_H));
  if (event.key === '0') resetMapCamera();
  if (event.key.toLowerCase() === 'p') setMapPanMode(!mapPanMode);
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) && mapCamera.zoom > MAP_CAMERA_MIN_ZOOM) {
    event.preventDefault();
    const distance = event.shiftKey ? 90 : 36;
    const dx = event.key === 'ArrowLeft' ? distance : event.key === 'ArrowRight' ? -distance : 0;
    const dy = event.key === 'ArrowUp' ? distance : event.key === 'ArrowDown' ? -distance : 0;
    setMapCamera(panMapCamera(mapCamera, dx, dy, BASE_W, BASE_H));
  }
});

loadScenarioRecords();
loadVisualSettings();
applyEffectiveQuality();

// Private QA hook is enabled only with ?debug=1; release/default play has no debug controls.
if (new URLSearchParams(window.location.search).get('debug') === '1') {
  window.__CC_TEST__ = {
    advanceToEnd() {
      let iterations = 0;
      while (state.phase === 'running' && iterations < 1000) {
        tick(state, 0.12);
        iterations += 1;
      }
      renderUI(true);
      drawMap(performance.now() / 1000);
      return state.result ? JSON.parse(JSON.stringify(state.result)) : null;
    },
    snapshot() {
      return JSON.parse(JSON.stringify({ phase: state.phase, elapsed: state.elapsed, used: state.used, crisisStage: state.crisisStage, repairCharges: state.repairCharges, repairJobs: state.repairJobs, repairs: state.repairs, result: state.result, strategyHistoryCount: strategyHistory.length, currentStrategyRunId: currentStrategyRun?.id ?? null, visual: { mode: visualMode, renderQuality, reduceMotion: isReducedMotion(), cacheScale: cacheScaleForQuality() }, camera: { ...mapCamera, panMode: mapPanMode }, atmosphere: scenarioAtmosphereStatus(state.scenarioId) }));
    },
    setSystemsForTest(overrides = {}) {
      const allowed = ['water', 'grid', 'access', 'congestion', 'integrity', 'substationFlooded', 'signalOutage', 'pumpPowerCut', 'pumpActive'];
      for (const key of allowed) if (Object.hasOwn(overrides, key)) state[key] = overrides[key];
      renderUI(true);
      drawMap(performance.now() / 1000);
      return this.snapshot();
    },
    dispatchRepair(system) {
      const result = dispatchRepair(state, system);
      renderUI(true);
      drawMap(performance.now() / 1000);
      return { ...result, state: this.snapshot() };
    },
    advanceGameSeconds(seconds) {
      const target = Math.min(MISSION_DURATION, state.elapsed + Math.max(0, Number(seconds) || 0));
      let iterations = 0;
      while (state.phase === 'running' && state.elapsed < target - 0.0001 && iterations < 1200) {
        tick(state, Math.min(0.12, (target - state.elapsed) / SIMULATION_SPEED));
        iterations += 1;
      }
      renderUI(true);
      drawMap(performance.now() / 1000);
      return this.snapshot();
    },
  };
}

renderScenarioInfo();
resizeCanvas();
setPhaseStatus();
renderUI(true);
renderToolControls();
updateMapCameraUI();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}), { once: true });
}
requestAnimationFrame(loop);