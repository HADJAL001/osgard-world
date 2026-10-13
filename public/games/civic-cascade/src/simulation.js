export const MISSION_DURATION = 90;
export const SIMULATION_SPEED = 1.5;
export const TOOL_ORDER = ['traffic', 'power', 'drain'];

// Target profiles intentionally create strategic trade-offs instead of cosmetic target selection.
export const TRAFFIC_TARGETS = {
  'J-02': { label: 'Северный подход', detail: 'Лучше сохраняет доступ к северному району', congestionRelief: 14, accessBonus: 25 },
  'J-04': { label: 'Центральная развязка', detail: 'Максимально снижает общую загруженность', congestionRelief: 24, accessBonus: 14 },
  'J-07': { label: 'Медицинский коридор', detail: 'Сбалансированный эффект для экстренных служб', congestionRelief: 18, accessBonus: 21 },
  'J-09': { label: 'Южный маршрут', detail: 'Сильнее помогает эвакуации из низины', congestionRelief: 12, accessBonus: 28 },
  'J-11': { label: 'Транспортный узел', detail: 'Стабильный компромисс между потоком и доступом', congestionRelief: 20, accessBonus: 18 },
};

export const DRAIN_TARGETS = {
  'G-03': { label: 'Верхний водосброс', detail: 'Быстро сбрасывает больше воды', waterReduction: 20, duration: 24, rateRelief: .072, accessBonus: 4 },
  'G-05': { label: 'Канал жилого квартала', detail: 'Умеренный сброс, дольше помогает эвакуации', waterReduction: 14, duration: 38, rateRelief: .042, accessBonus: 10 },
};

export const SCENARIOS = {
  storm: {
    id: 'storm', code: 'C7-STORM-90-3', district: 'Северная набережная', sectorCode: 'C-07',
    titleLead: 'Штормовой', titleAccent: 'нагон', level: '03', incidentNumber: '07',
    description: 'Северная набережная. Вода прибывает быстрее прогноза. Больница теряет питание, транспортный коридор перегружен.',
    objectives: [['Стабилизировать больницу', 'Критическая нагрузка'], ['Открыть путь скорой', 'Северный коридор'], ['Сдержать затопление', 'Низинный квартал']],
    briefingEvents: [
      ['ШТОРМОВОЙ НАГОН', 'Уровень воды растёт быстрее прогноза.', 'critical'],
      ['БОЛЬНИЦА: РЕЗЕРВ 18%', 'Без стабилизации сеть может отключиться.', 'warning'],
      ['КОРИДОР СКОРОЙ ПЕРЕГРУЖЕН', 'Выберите инструменты и спасите район.', 'info'],
    ],
    water: 23, grid: 96, access: 88, congestion: 34, population: 840,
    waterRiseBase: .31, waterRiseProgress: .17, gridDrainBase: .31, gridDrainBackup: .14, gridDrainProgress: .18,
    congestionBase: 32, congestionGrowth: 28, accessBase: 89, accessLoss: 15, accessWaterWeight: .76,
  },
  grid: {
    id: 'grid', code: 'I4-GRID-90-3', district: 'Энергетический узел', sectorCode: 'I-04',
    titleLead: 'Каскадный', titleAccent: 'сбой', level: '04', incidentNumber: '14',
    description: 'Энергетический узел перегружен. Подстанция теряет мощность, больница работает на остаточном питании, насосы скоро отключатся.',
    objectives: [['Вернуть питание больнице', 'Медицинский контур'], ['Подать энергию насосам', 'Подстанция 04'], ['Сохранить аварийный маршрут', 'Доступ экстренных служб']],
    briefingEvents: [
      ['СБОЙ ПОДСТАНЦИИ 04', 'Запас мощности падает ниже безопасного уровня.', 'critical'],
      ['БОЛЬНИЦА НА РЕЗЕРВЕ', 'Медицинский блок не выдержит длительное отключение.', 'warning'],
      ['НАСОСНАЯ ТЕРЯЕТ ПИТАНИЕ', 'Без энергии уровень воды продолжит расти.', 'info'],
    ],
    water: 9, grid: 43, access: 69, congestion: 48, population: 720,
    waterRiseBase: .18, waterRiseProgress: .08, gridDrainBase: .38, gridDrainBackup: .16, gridDrainProgress: .20,
    congestionBase: 47, congestionGrowth: 18, accessBase: 77, accessLoss: 11, accessWaterWeight: .4,
  },
  evacuation: {
    id: 'evacuation', code: 'LQ-EVAC-90-3', district: 'Нижний квартал', sectorCode: 'LQ-22',
    titleLead: 'Эвакуация', titleAccent: 'на пределе', level: '05', incidentNumber: '22',
    description: 'Прибрежная магистраль перегружена. Вода поднимается, а больница и эвакуационные пункты могут потерять доступ.',
    objectives: [['Сохранить работу больницы', 'Резерв питания'], ['Открыть путь эвакуации', 'Главная магистраль'], ['Сбросить воду из низины', 'Аварийные шлюзы']],
    briefingEvents: [
      ['ОКНО ЭВАКУАЦИИ СОКРАЩАЕТСЯ', 'В низине скопились жители. Главный маршрут перегружен.', 'critical'],
      ['ЭНЕРГИЯ НА ПРЕДЕЛЕ', 'Пиковая нагрузка не оставляет большого запаса.', 'warning'],
      ['ШЛЮЗЫ ПОД ДАВЛЕНИЕМ', 'Откройте сброс до затопления нижней магистрали.', 'info'],
    ],
    water: 36, grid: 79, access: 36, congestion: 75, population: 960,
    waterRiseBase: .29, waterRiseProgress: .13, gridDrainBase: .28, gridDrainBackup: .14, gridDrainProgress: .16,
    congestionBase: 75, congestionGrowth: 18, accessBase: 46, accessLoss: 9, accessWaterWeight: .76,
  },
};

export function getScenario(scenarioId = 'storm') {
  return SCENARIOS[scenarioId] || SCENARIOS.storm;
}

export function getTrafficProfile(scenarioId, targetId) {
  const source = TRAFFIC_TARGETS[targetId];
  if (!source) return null;
  const profile = { ...source };
  const scenario = getScenario(scenarioId);
  if ((scenario.id === 'storm' && targetId === 'J-04') || (scenario.id === 'grid' && targetId === 'J-11') || (scenario.id === 'evacuation' && targetId === 'J-09')) {
    profile.congestionRelief += 3;
    profile.accessBonus += 3;
    profile.affinity = true;
  } else profile.affinity = false;
  return profile;
}

export function getDrainProfile(scenarioId, targetId) {
  const source = DRAIN_TARGETS[targetId];
  if (!source) return null;
  const profile = { ...source };
  const scenario = getScenario(scenarioId);
  if ((scenario.id === 'storm' && targetId === 'G-03') || (scenario.id !== 'storm' && targetId === 'G-05')) {
    profile.accessBonus += 2;
    profile.duration += 4;
    profile.affinity = true;
  } else profile.affinity = false;
  return profile;
}

export const TOOLS = {
  traffic: {
    name: 'Перенаправить поток',
    shortName: 'ПРИОРИТЕТНЫЙ КОРИДОР',
    description: 'Разгрузить перекрёсток и открыть коридор для экстренных служб.',
    hint: 'Нажмите на отмеченный перекрёсток.',
  },
  power: {
    name: 'Резервное питание',
    shortName: 'РЕЗЕРВНАЯ ЭНЕРГИЯ',
    description: 'Поддержать больницу или включить насосную станцию.',
    hint: 'Нажмите на больницу или насосную станцию.',
  },
  drain: {
    name: 'Отвести воду',
    shortName: 'АВАРИЙНЫЙ СБРОС',
    description: 'Открыть шлюз и снизить давление воды в низинном районе.',
    hint: 'Нажмите на один из шлюзов у реки.',
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function makeInitialState(scenarioId = 'storm') {
  const scenario = getScenario(scenarioId);
  return {
    scenarioId: scenario.id,
    phase: 'briefing',
    crisisStage: 'briefing',
    elapsed: 0,
    water: scenario.water,
    grid: scenario.grid,
    access: scenario.access,
    integrity: 100,
    rescued: 0,
    population: scenario.population,
    congestion: scenario.congestion,
    pumpActive: false,
    pumpPowerCut: false,
    hospitalBackup: false,
    substationFlooded: false,
    signalOutage: false,
    roadWashout: false,
    roadRestored: false,
    corridorOpen: false,
    corridorStrength: 0,
    corridorAccessBonus: 0,
    gateOpen: null,
    gateAccessBonus: 0,
    drainRateRelief: .055,
    effects: { traffic: 0, power: 0, drain: 0 },
    used: { traffic: false, power: false, drain: false },
    targets: { traffic: null, power: null, drain: null },
    repairCharges: 2,
    repairJobs: [],
    repairs: [],
    alerts: { waterWarning: false, waterCritical: false, gridWarning: false, gridCritical: false, accessWarning: false, accessCritical: false, substationFlooded: false, signalOutage: false, pumpPowerCut: false, roadWashout: false },
    interventions: [],
    events: scenario.briefingEvents.map(([title, detail, level]) => ({ at: '00:00', elapsed: 0, title, detail, level })),
    timeline: scenario.briefingEvents.map(([title, detail, level]) => ({ at: '00:00', elapsed: 0, title, detail, level })),
    score: 0,
    grade: null,
    result: null,
    lastEventSecond: -1,
    telemetry: [],
    lastTelemetrySecond: -1,
  };
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function addEvent(state, title, detail, level = 'info') {
  const event = { at: formatClock(state.elapsed), elapsed: Number(state.elapsed.toFixed(2)), title, detail, level };
  state.events.unshift(event);
  state.events = state.events.slice(0, 12);
  if (!Array.isArray(state.timeline)) state.timeline = [];
  state.timeline.push({ ...event });
  // Retain a bounded, exportable event history for diagnosis and challenge sharing.
  if (state.timeline.length > 160) state.timeline.splice(0, state.timeline.length - 160);
}

function metricSnapshot(state) {
  return Object.fromEntries(['water', 'grid', 'access', 'congestion', 'integrity', 'rescued'].map((key) => [key, Number(state[key].toFixed(2))]));
}

function telemetrySnapshot(state) {
  return {
    elapsed: Number(state.elapsed.toFixed(2)),
    water: Number(state.water.toFixed(2)),
    grid: Number(state.grid.toFixed(2)),
    access: Number(state.access.toFixed(2)),
    congestion: Number(state.congestion.toFixed(2)),
    integrity: Number(state.integrity.toFixed(2)),
    rescued: Number(state.rescued.toFixed(2)),
    crisisStage: state.crisisStage,
    failures: {
      substationFlooded: Boolean(state.substationFlooded),
      signalOutage: Boolean(state.signalOutage),
      pumpPowerCut: Boolean(state.pumpPowerCut),
      roadWashout: Boolean(state.roadWashout),
    },
    repairsInProgress: state.repairJobs.map(job => ({ system: job.system, progress: Number((job.progress || 0).toFixed(3)), suspended: Boolean(job.suspended) })),
  };
}

// The mission black box stores one compact sample per in-game second. The
// bounded array is small enough for low-memory devices and can be replayed later.
function recordTelemetry(state, force = false) {
  if (!Array.isArray(state.telemetry)) state.telemetry = [];
  const second = Math.floor(state.elapsed + 0.0001);
  if (!force && second <= state.lastTelemetrySecond) return;
  state.telemetry.push(telemetrySnapshot(state));
  state.lastTelemetrySecond = second;
  if (state.telemetry.length > 120) state.telemetry.splice(0, state.telemetry.length - 120);
}

function recordIntervention(state, tool, target, before, message) {
  state.interventions.push({
    tool,
    target: target.id,
    targetType: target.type,
    at: formatClock(state.elapsed),
    elapsed: Number(state.elapsed.toFixed(2)),
    message,
    before,
    after: metricSnapshot(state),
  });
}

export function startMission(state) {
  if (state.phase !== 'briefing') return false;
  state.phase = 'running';
  state.crisisStage = 'developing';
  const scenario = getScenario(state.scenarioId);
  addEvent(state, 'ФАЗА I · РАЗВИТИЕ', 'Системы ещё сохраняют управляемость. Следите за первыми порогами риска.', 'info');
  addEvent(state, 'СИМУЛЯЦИЯ ЗАПУЩЕНА', `До критического исхода — 90 секунд игрового времени. Сценарий: ${scenario.district.toLowerCase()}.`, 'warning');
  recordTelemetry(state, true);
  return true;
}

export function applyIntervention(state, tool, target) {
  if (state.phase !== 'running') return { ok: false, reason: 'Сначала запустите симуляцию.' };
  if (!TOOL_ORDER.includes(tool)) return { ok: false, reason: 'Неизвестный инструмент.' };
  if (state.used[tool]) return { ok: false, reason: 'Этот инструмент уже использован.' };
  const before = metricSnapshot(state);
  const scenario = getScenario(state.scenarioId);

  if (tool === 'traffic') {
    if (!target || target.type !== 'junction' || !Object.hasOwn(TRAFFIC_TARGETS, target.id)) return { ok: false, reason: TOOLS.traffic.hint };
    // A small scenario affinity rewards reading the situation, without invalidating alternatives.
    const profile = getTrafficProfile(scenario.id, target.id);
    state.used.traffic = true;
    state.targets.traffic = target.id;
    state.corridorOpen = true;
    state.corridorStrength = profile.congestionRelief;
    state.corridorAccessBonus = profile.accessBonus;
    state.effects.traffic = 24;
    state.congestion = Math.max(8, state.congestion - profile.congestionRelief);
    state.access = clamp(state.access + profile.accessBonus, 0, 100);
    const message = `Перекрёсток ${target.id}: загруженность −${profile.congestionRelief}, доступ служб +${profile.accessBonus}.`;
    recordIntervention(state, tool, target, before, message);
    addEvent(state, 'КОРИДОР ОТКРЫТ', message, 'success');
    return { ok: true, message: 'Приоритетный коридор открыт.' };
  }

  if (tool === 'power') {
    const validHospital = target?.type === 'hospital' && target.id === 'H-01';
    const validPump = target?.type === 'pump' && target.id === 'P-04';
    if (!validHospital && !validPump) return { ok: false, reason: TOOLS.power.hint };
    state.used.power = true;
    state.targets.power = target.type;
    if (target.type === 'hospital') {
      state.hospitalBackup = true;
      state.grid = clamp(state.grid + 18, 0, 100);
      const message = 'Резервный контур запитан. Медицинское оборудование защищено от дальнейшего падения мощности.';
      recordIntervention(state, tool, target, before, message);
      addEvent(state, 'БОЛЬНИЦА ПОД ЗАЩИТОЙ', message, 'success');
      return { ok: true, message: 'Резерв больницы активирован.' };
    }
    state.pumpActive = true;
    state.water = Math.max(0, state.water - 9);
    const message = 'Насосы откачивают воду, снижая её дальнейший подъём; больничный контур при этом не усилен.';
    recordIntervention(state, tool, target, before, message);
    addEvent(state, 'НАСОСНАЯ ЗАПУЩЕНА', message, 'success');
    return { ok: true, message: 'Насосная станция работает.' };
  }

  if (tool === 'drain') {
    if (!target || target.type !== 'gate' || !Object.hasOwn(DRAIN_TARGETS, target.id)) return { ok: false, reason: TOOLS.drain.hint };
    const profile = getDrainProfile(scenario.id, target.id);
    state.used.drain = true;
    state.targets.drain = target.id;
    state.gateOpen = target.id;
    state.drainRateRelief = profile.rateRelief;
    state.water = Math.max(0, state.water - profile.waterReduction);
    state.effects.drain = profile.duration;
    state.gateAccessBonus = profile.accessBonus;
    state.access = clamp(state.access + profile.accessBonus, 0, 100);
    const message = `${target.id}: уровень воды −${profile.waterReduction}; снижение подъёма действует ${profile.duration} секунд; доступ служб +${profile.accessBonus}.`;
    recordIntervention(state, tool, target, before, message);
    addEvent(state, 'ШЛЮЗ ОТКРЫТ', message, 'success');
    return { ok: true, message: `Водосброс ${target.id} активирован.` };
  }
  return { ok: false, reason: 'Не удалось выполнить действие.' };
}

export const REPAIR_SYSTEMS = {
  substation: { label: 'Подстанция 04', duration: 14, detail: 'Восстановить защиту и распределительный узел.' },
  signals: { label: 'Светофорная сеть', duration: 8, detail: 'Вернуть сигналы после стабилизации напряжения.' },
  pump: { label: 'Насосная станция', duration: 11, detail: 'Восстановить насосы после аварийного отключения.' },
  road: { label: 'Прибрежная магистраль', duration: 13, detail: 'Восстановить размытый участок дороги после снижения воды.' },
};

function activeRepairJob(state, system) {
  return state.repairJobs.find(job => job.system === system) || null;
}

export function getRepairAvailability(state, system) {
  const config = REPAIR_SYSTEMS[system];
  if (!config) return { available: false, reason: 'Неизвестная ремонтная цель.', activeJob: null, completed: false };
  const activeJob = activeRepairJob(state, system);
  if (activeJob) return {
    available: false,
    reason: activeJob.suspended ? 'РАБОТА ПРИОСТАНОВЛЕНА' : 'БРИГАДА РАБОТАЕТ',
    activeJob,
    progress: clamp(1 - activeJob.remaining / activeJob.duration, 0, 1),
    completed: false,
  };
  const failed = system === 'substation' ? state.substationFlooded
    : system === 'signals' ? state.signalOutage
      : system === 'pump' ? state.pumpPowerCut
        : state.roadWashout;
  const completed = !failed && state.repairs.some(item => item.system === system);
  if (state.phase !== 'running') return { available: false, reason: state.phase === 'briefing' ? 'ЗАПУСТИТЕ ОПЕРАЦИЮ' : state.phase === 'paused' ? 'СИМУЛЯЦИЯ НА ПАУЗЕ' : 'ОПЕРАЦИЯ ЗАВЕРШЕНА', activeJob: null, completed };
  if (!failed) return { available: false, reason: completed ? 'СИСТЕМА ВОССТАНОВЛЕНА' : system === 'pump' && !state.pumpActive ? 'НАСОСНАЯ ЕЩЁ НЕ ЗАПУЩЕНА' : 'АВАРИЯ НЕ ЗАФИКСИРОВАНА', activeJob: null, completed };
  if (state.repairCharges <= 0) return { available: false, reason: 'РЕМОНТНЫЕ БРИГАДЫ ИСЧЕРПАНЫ', activeJob: null, completed };
  if (system === 'substation' && state.water >= 54) return { available: false, reason: 'СНИЗЬТЕ ВОДУ НИЖЕ 54%', activeJob: null, completed };
  if (system === 'signals' && state.grid <= 28) return { available: false, reason: 'НУЖНО НАПРЯЖЕНИЕ ВЫШЕ 28%', activeJob: null, completed };
  if (system === 'pump' && state.grid <= 20) return { available: false, reason: 'НУЖНО НАПРЯЖЕНИЕ ВЫШЕ 20%', activeJob: null, completed };
  if (system === 'pump' && state.water >= 78) return { available: false, reason: 'НАСОСНАЯ НЕДОСТУПНА ПОД ВОДОЙ', activeJob: null, completed };
  if (system === 'road' && state.water >= 58) return { available: false, reason: 'СНИЗЬТЕ ВОДУ НИЖЕ 58%', activeJob: null, completed };
  return { available: true, reason: 'БРИГАДА ГОТОВА К ВЫЕЗДУ', activeJob: null, completed: false };
}

function repairMetrics(state) {
  return metricSnapshot(state);
}

export function dispatchRepair(state, system) {
  if (!REPAIR_SYSTEMS[system]) return { ok: false, reason: 'Неизвестная ремонтная цель.' };
  const availability = getRepairAvailability(state, system);
  if (!availability.available) return { ok: false, reason: availability.reason };
  const config = REPAIR_SYSTEMS[system];
  const job = {
    id: `${system}-${Math.round(state.elapsed * 100)}-${state.repairs.length + state.repairJobs.length + 1}`,
    system,
    label: config.label,
    duration: config.duration,
    remaining: config.duration,
    progress: 0,
    suspended: false,
    startedAt: Number(state.elapsed.toFixed(2)),
    startedClock: formatClock(state.elapsed),
  };
  state.repairCharges -= 1;
  state.repairJobs.push(job);
  addEvent(state, 'АВАРИЙНАЯ БРИГАДА НАПРАВЛЕНА', `${config.label}: ремонт займёт около ${config.duration} секунд игрового времени. Если условия станут опасными, работа приостановится.`, 'warning');
  return { ok: true, message: `Бригада направлена: ${config.label}. Расчётное время — ${config.duration} с.` };
}

function isRepairSafe(state, system) {
  if (system === 'substation') return state.water < 54;
  if (system === 'signals') return state.grid > 24;
  if (system === 'pump') return state.grid > 18 && state.water < 78;
  if (system === 'road') return state.water < 58;
  return false;
}

function completeRepair(state, job) {
  const before = repairMetrics(state);
  if (job.system === 'substation') {
    state.substationFlooded = false;
    state.grid = clamp(state.grid + 9, 0, 100);
    state.integrity = clamp(state.integrity + 5, 0, 100);
  } else if (job.system === 'signals') {
    state.signalOutage = false;
    state.congestion = clamp(state.congestion - 7, 5, 100);
    state.access = clamp(state.access + 5, 0, 100);
    state.integrity = clamp(state.integrity + 3, 0, 100);
  } else if (job.system === 'pump') {
    state.pumpPowerCut = false;
    state.pumpActive = true;
    state.water = Math.max(0, state.water - 2);
    state.integrity = clamp(state.integrity + 2, 0, 100);
  } else if (job.system === 'road') {
    state.roadWashout = false;
    state.roadRestored = true;
    state.alerts.roadWashout = false;
    state.congestion = clamp(state.congestion - 10, 5, 100);
    state.access = clamp(state.access + 12, 0, 100);
    state.integrity = clamp(state.integrity + 4, 0, 100);
  }
  const record = {
    system: job.system,
    target: job.label,
    at: formatClock(state.elapsed),
    elapsed: Number(state.elapsed.toFixed(2)),
    duration: job.duration,
    before,
    after: repairMetrics(state),
  };
  state.repairs.push(record);
  const messages = {
    substation: ['ПОДСТАНЦИЯ ВОССТАНОВЛЕНА', 'Защита распределительного узла восстановлена. Потери мощности от подтопления сняты, пока вода остаётся ниже опасного уровня.'],
    signals: ['СВЕТОФОРЫ ВОЗВРАЩЕНЫ В СТРОЙ', 'Узел управления сигналами восстановлен. Заторы снижаются, доступ экстренных служб улучшается.'],
    pump: ['НАСОСНАЯ ВОЗОБНОВИЛА РАБОТУ', 'Релейная защита сброшена, насосы запущены. Откачка продолжается, пока энергосеть держит безопасный уровень.'],
    road: ['ПРИБРЕЖНАЯ МАГИСТРАЛЬ ВОССТАНОВЛЕНА', 'Размытый участок укреплён. Доступ экстренных служб улучшен, дорожная нагрузка снижена.'],
  }[job.system];
  addEvent(state, messages[0], messages[1], 'success');
}

function advanceRepairJobs(state, dt) {
  if (!state.repairJobs.length) return;
  const stillWorking = [];
  for (const job of state.repairJobs) {
    const safe = isRepairSafe(state, job.system);
    if (!safe) {
      if (!job.suspended) {
        job.suspended = true;
        addEvent(state, 'РЕМОНТ ПРИОСТАНОВЛЕН', `${job.label}: текущие условия слишком опасны. Бригада продолжит работу, когда система станет доступна.`, 'warning');
      }
      stillWorking.push(job);
      continue;
    }
    if (job.suspended) {
      job.suspended = false;
      addEvent(state, 'РЕМОНТ ВОЗОБНОВЛЁН', `${job.label}: условия снова безопасны, бригада продолжает работу.`, 'info');
    }
    job.remaining = Math.max(0, job.remaining - dt);
    job.progress = clamp(1 - job.remaining / job.duration, 0, 1);
    if (job.remaining <= 0.001) completeRepair(state, job);
    else stillWorking.push(job);
  }
  state.repairJobs = stillWorking;
}

function updateCrisisStage(state) {
  if (state.phase !== 'running') return;
  const hardCritical = state.water >= 58 || state.grid <= 24 || state.access <= 30;
  const activeFailure = state.substationFlooded || state.signalOutage || state.pumpPowerCut || state.roadWashout;
  const warning = state.water >= 40 || state.grid <= 50 || state.access <= 50;
  let next = 'developing';
  if (hardCritical || activeFailure) next = 'critical';
  else if (state.repairs.length > 0) next = 'recovery';
  else if (warning) next = 'escalation';
  if (next === state.crisisStage) return;
  state.crisisStage = next;
  const labels = {
    developing: ['ФАЗА I · РАЗВИТИЕ', 'Кризис пока управляем. Наблюдайте за изменением показателей.', 'info'],
    escalation: ['ФАЗА II · ЭСКАЛАЦИЯ', 'Один или несколько параметров вошли в зону риска. Подготовьте вмешательство.', 'warning'],
    critical: ['ФАЗА III · КРИТИЧЕСКАЯ', 'Зафиксирован отказ инфраструктуры или критический порог. Действуйте по приоритетам.', 'critical'],
    recovery: ['ФАЗА IV · ВОССТАНОВЛЕНИЕ', 'Ремонт уже дал результат. Сохраняйте безопасные условия и контролируйте повторный отказ.', 'success'],
  }[next];
  addEvent(state, labels[0], labels[1], labels[2]);
}

export function tick(state, realDeltaSeconds) {
  if (state.phase !== 'running') return state;
  const dt = clamp(realDeltaSeconds, 0, 0.12) * SIMULATION_SPEED;
  if (dt <= 0) return state;
  const scenario = getScenario(state.scenarioId);
  // A powered pump is not immune to a total grid collapse: below 12% reserve,
  // the breaker trips once and pumping relief is lost for the rest of this mission.
  if (state.pumpActive && !state.pumpPowerCut && state.grid <= 12) {
    state.pumpPowerCut = true;
    state.alerts.pumpPowerCut = true;
    addEvent(state, 'НАСОСНАЯ ОБЕСТОЧЕНА', 'Запас энергосети упал ниже 12%. Насосы остановились, поэтому вода снова прибывает без откачки.', 'critical');
  }
  const before = state.elapsed;
  state.elapsed = Math.min(MISSION_DURATION, state.elapsed + dt);
  const progress = state.elapsed / MISSION_DURATION;

  const pumpRelief = state.pumpActive && !state.pumpPowerCut ? 0.17 : 0;
  const drainRelief = state.effects.drain > 0 ? state.drainRateRelief : 0;
  state.water = clamp(state.water + dt * (scenario.waterRiseBase + progress * scenario.waterRiseProgress - pumpRelief - drainRelief), 0, 100);
  if (state.effects.drain > 0) state.effects.drain = Math.max(0, state.effects.drain - dt);
  if (state.effects.traffic > 0) state.effects.traffic = Math.max(0, state.effects.traffic - dt);
  if (state.effects.power > 0) state.effects.power = Math.max(0, state.effects.power - dt);

  // Interdependent infrastructure model: floodwater can reach the exposed substation.
  // Once inundated, insulation and switchgear remain impaired for the rest of this operation.
  let cascadeAlerted = false;
  // Prolonged severe flooding washes out the low coastal road. It creates a second
  // incident layer: access drops and congestion rises until water is safe and crews repair it.
  if (state.water >= 60 && !state.roadWashout) {
    state.roadWashout = true;
    state.roadRestored = false;
    state.alerts.roadWashout = true;
    cascadeAlerted = true;
    addEvent(state, 'ПРИБРЕЖНАЯ МАГИСТРАЛЬ РАЗМЫТА', 'Вода подмыла основание низкой дороги. Доступ экстренных служб падает; сначала снизьте уровень воды, затем направьте бригаду на восстановление.', 'critical');
  }
  if (state.water >= 58 && !state.substationFlooded) {
    state.substationFlooded = true;
    state.alerts.substationFlooded = true;
    cascadeAlerted = true;
    addEvent(state, 'ПОДСТАНЦИЯ В ЗОНЕ ПОДТОПЛЕНИЯ', 'Вода достигла распределительного узла. Потери энергосети ускоряются — это может ухудшить работу сигналов и доступ служб.', 'critical');
  }
  const gridDrain = state.hospitalBackup ? scenario.gridDrainBackup : scenario.gridDrainBase;
  const floodGridPenalty = state.substationFlooded
    ? 0.085 + Math.max(0, state.water - 58) * 0.012
    : 0;
  state.grid = clamp(state.grid - dt * (gridDrain + progress * scenario.gridDrainProgress + Math.max(0, state.water - 48) * 0.018 + floodGridPenalty), 0, 100);

  // A low-voltage cascade disables traffic lights; the resulting congestion then
  // reduces emergency access and slows evacuation in the same live simulation.
  if (state.grid <= 24 && !state.signalOutage) {
    state.signalOutage = true;
    state.alerts.signalOutage = true;
    cascadeAlerted = true;
    addEvent(state, 'СИГНАЛЫ СВЕТОФОРОВ ОТКЛЮЧЕНЫ', 'Запас мощности упал ниже безопасного порога. Заторы растут, проезд экстренных служб ухудшается.', 'critical');
  }

  const waterStress = Math.max(0, state.water - 39);
  const signalCongestionPenalty = state.signalOutage ? 8 : Math.max(0, 30 - state.grid) * 0.18;
  const roadFailureCongestionPenalty = state.roadWashout ? 14 : 0;
  state.congestion = clamp(scenario.congestionBase + progress * scenario.congestionGrowth + waterStress * 0.38 + signalCongestionPenalty + roadFailureCongestionPenalty - state.corridorStrength, 5, 100);
  const signalAccessPenalty = state.signalOutage ? 8 : Math.max(0, 30 - state.grid) * 0.28;
  const roadFailureAccessPenalty = state.roadWashout ? 22 : 0;
  state.access = clamp(scenario.accessBase - progress * scenario.accessLoss - waterStress * scenario.accessWaterWeight - state.congestion * 0.12 - signalAccessPenalty - roadFailureAccessPenalty + state.corridorAccessBonus + state.gateAccessBonus, 0, 100);

  const danger = Math.max(0, state.water - 42) * 0.04
    + Math.max(0, 48 - state.grid) * 0.025
    + Math.max(0, 42 - state.access) * 0.018;
  state.integrity = clamp(state.integrity - dt * danger, 0, 100);

  // One-shot threshold alerts communicate meaningful state changes instead of relying only on periodic logs.
  let thresholdAlerted = cascadeAlerted;
  const alert = (key, condition, title, detail, level) => {
    if (condition && !state.alerts[key]) {
      state.alerts[key] = true;
      thresholdAlerted = true;
      addEvent(state, title, detail, level);
    }
  };
  alert('waterWarning', state.water >= 40, 'ВОДА ПЕРЕШЛА УРОВЕНЬ НАБЛЮДЕНИЯ', 'Низкие участки начинают влиять на скорость эвакуации.', 'warning');
  alert('waterCritical', state.water >= 58, 'КРИТИЧЕСКИЙ УРОВЕНЬ ВОДЫ', 'Вода перекрывает низинные улицы. Отвод или откачка особенно важны.', 'critical');
  alert('gridWarning', state.grid <= 50, 'ЗАПАС МОЩНОСТИ НИЖЕ 50%', 'Оцените, что важнее защитить: медицинский контур или насосную станцию.', 'warning');
  alert('gridCritical', state.grid <= 30, 'УГРОЗА ОТКЛЮЧЕНИЯ ЭНЕРГОСЕТИ', 'Без резерва критические службы теряют устойчивость.', 'critical');
  alert('accessWarning', state.access <= 50, 'ДОСТУП СЛУЖБ ОГРАНИЧЕН', 'Перенаправление потока может сохранить путь эвакуации.', 'warning');
  alert('accessCritical', state.access <= 30, 'ЭКСТРЕННЫЙ КОРИДОР ПОД УГРОЗОЙ', 'Доступность маршрутов критична для эвакуации жителей.', 'critical');

  const interventionBonus = (state.corridorOpen ? 1.7 : 0)
    + (state.hospitalBackup ? 1.0 : 0)
    + (state.pumpActive ? 0.6 : 0)
    + (state.gateOpen ? 0.8 : 0);
  const evacuationRate = 0.35 + state.access * 0.045 + state.grid * 0.015 - waterStress * 0.10 + interventionBonus;
  if (state.access > 18 && state.grid > 12) {
    state.rescued = Math.min(state.population, state.rescued + Math.max(0.8, evacuationRate) * dt);
  }

  // Mobile crews work inside the simulation clock. Unsafe water or voltage pauses
  // repairs rather than granting an impossible instant recovery.
  advanceRepairJobs(state, dt);
  updateCrisisStage(state);

  const second = Math.floor(state.elapsed);
  if (second !== state.lastEventSecond && second % 15 === 0 && second > 0 && !thresholdAlerted) {
    state.lastEventSecond = second;
    if (state.water > 57) addEvent(state, 'НИЗИНА ЗАТОПЛЕНА', 'Вода начинает перекрывать второстепенные дороги.', 'critical');
    else if (state.grid < 52) addEvent(state, 'ЭНЕРГОСЕТЬ НЕСТАБИЛЬНА', 'Критические объекты теряют запас мощности.', 'warning');
    else if (state.access < 50) addEvent(state, 'ДОСТУП ОГРАНИЧЕН', 'Некоторые службы теряют быстрый маршрут.', 'warning');
    else addEvent(state, 'СИТУАЦИЯ ОБНОВЛЕНА', 'Службы продолжают работу. Следите за уровнем воды.', 'info');
  }

  recordTelemetry(state);
  if (before < MISSION_DURATION && state.elapsed >= MISSION_DURATION) finishMission(state);
  return state;
}

export function finishMission(state) {
  if (state.phase !== 'running') return state.result;
  state.phase = 'complete';
  const rescuedPct = state.rescued / state.population;
  const score = Math.round(
    state.rescued * 1.6 + state.integrity * 3.7 + state.grid * 1.5 + state.access * 1.6 + (state.used.traffic ? 35 : 0) + (state.used.power ? 35 : 0) + (state.used.drain ? 35 : 0) + state.repairs.length * 45
  );
  const grade = score >= 1950 ? 'S' : score >= 1700 ? 'A' : score >= 1450 ? 'B' : score >= 1200 ? 'C' : 'D';
  state.score = score;
  state.grade = grade;
  state.crisisStage = (rescuedPct >= 0.65 && state.integrity >= 55 && !state.pumpPowerCut && !state.signalOutage && !state.substationFlooded && !state.roadWashout) ? 'contained' : 'uncontrolled';
  state.result = {
    score,
    grade,
    crisisStage: state.crisisStage,
    repairTeamsUsed: 2 - state.repairCharges,
    repairTeamsRemaining: state.repairCharges,
    repairs: state.repairs.map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    pendingRepairs: state.repairJobs.map(job => ({ system: job.system, remaining: Number(job.remaining.toFixed(2)), suspended: job.suspended })),
    rescued: Math.round(state.rescued),
    population: state.population,
    rescuedPct: Math.round(rescuedPct * 100),
    integrity: Math.round(state.integrity),
    congestion: Math.round(state.congestion),
    grid: Math.round(state.grid),
    access: Math.round(state.access),
    water: Math.round(state.water),
    toolsUsed: TOOL_ORDER.filter(tool => state.used[tool]).length,
    targets: { ...state.targets },
    cascade: { substationFlooded: state.substationFlooded, signalOutage: state.signalOutage, pumpPowerCut: state.pumpPowerCut, roadWashout: state.roadWashout, roadRestored: state.roadRestored },
    telemetry: (state.telemetry || []).map(sample => ({ ...sample, failures: { ...(sample.failures || {}) }, repairsInProgress: (sample.repairsInProgress || []).map(job => ({ ...job })) })),
    timeline: (state.timeline || []).map(event => ({ ...event })),
    interventions: (state.interventions || []).map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
  };
  addEvent(state, state.crisisStage === 'contained' ? 'КРИЗИС ЛОКАЛИЗОВАН' : 'КРИЗИС НЕ ПОЛНОСТЬЮ ЛОКАЛИЗОВАН', state.crisisStage === 'contained' ? 'Критические службы сохраняют работоспособность, достигнут приемлемый уровень защиты жителей.' : 'К завершению операции остаются серьёзные риски или критические отказы.', state.crisisStage === 'contained' ? 'success' : 'critical');
  addEvent(state, 'МИССИЯ ЗАВЕРШЕНА', `Результат ${grade} · ${state.result.rescued} жителей эвакуированы.`, grade === 'S' || grade === 'A' ? 'success' : 'warning');
  // The report owns a complete immutable copy, including the two closing events.
  state.result.timeline = state.timeline.map(event => ({ ...event }));
  return state.result;
}

const FORECAST_METRICS = ['water', 'grid', 'access', 'congestion', 'integrity', 'rescued'];

function cloneStateForForecast(state) {
  return {
    ...state,
    used: { ...state.used },
    targets: { ...state.targets },
    effects: { ...state.effects },
    alerts: { ...state.alerts },
    interventions: state.interventions.map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    repairJobs: state.repairJobs.map(job => ({ ...job })),
    repairs: state.repairs.map(item => ({ ...item, before: { ...item.before }, after: { ...item.after } })),
    events: state.events.map(event => ({ ...event })),
    timeline: state.timeline.map(event => ({ ...event })),
    telemetry: (state.telemetry || []).map(sample => ({ ...sample, failures: { ...(sample.failures || {}) }, repairsInProgress: (sample.repairsInProgress || []).map(job => ({ ...job })) })),
    result: state.result ? { ...state.result, targets: { ...state.result.targets } } : null,
  };
}

function forecastSnapshot(state) {
  return Object.fromEntries(FORECAST_METRICS.map(key => [key, Number(state[key].toFixed(2))]));
}

/**
 * Estimate one intervention against doing nothing from the exact same state.
 * Both runs use cloned state and the normal simulation tick, so the preview never
 * consumes a resource, advances the live operation, or mutates the event history.
 * Forecast duration is measured in game seconds, not wall-clock seconds.
 */
export function previewIntervention(state, tool, target, forecastSeconds = 8) {
  if (state.phase !== 'running') return { ok: false, reason: 'Preview requires a running mission.' };
  const current = forecastSnapshot(state);
  const acted = cloneStateForForecast(state);
  const applied = applyIntervention(acted, tool, target);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  const immediate = forecastSnapshot(acted);
  const baseline = cloneStateForForecast(state);
  const requestedSeconds = clamp(Number(forecastSeconds) || 0, 0, 20);
  const targetElapsed = Math.min(MISSION_DURATION, state.elapsed + requestedSeconds);
  const advance = (sample) => {
    let safety = 0;
    while (sample.phase === 'running' && sample.elapsed < targetElapsed - 0.0001 && safety < 240) {
      const remaining = targetElapsed - sample.elapsed;
      tick(sample, Math.min(0.12, remaining / SIMULATION_SPEED));
      safety += 1;
    }
    return forecastSnapshot(sample);
  };
  const projected = advance(acted);
  const noAction = advance(baseline);
  return {
    ok: true,
    tool,
    targetId: target.id,
    current,
    immediate,
    projected,
    noAction,
    forecastSeconds: Number((targetElapsed - state.elapsed).toFixed(2)),
    // Positive values always mean a helpful difference versus not intervening.
    advantage: {
      water: Number((noAction.water - projected.water).toFixed(2)),
      grid: Number((projected.grid - noAction.grid).toFixed(2)),
      access: Number((projected.access - noAction.access).toFixed(2)),
      congestion: Number((noAction.congestion - projected.congestion).toFixed(2)),
      integrity: Number((projected.integrity - noAction.integrity).toFixed(2)),
      rescued: Number((projected.rescued - noAction.rescued).toFixed(2)),
    },
    message: applied.message,
  };
}