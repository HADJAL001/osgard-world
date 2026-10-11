export type FactionId = 'guild' | 'commons' | 'senate'
export type PolicyId = 'BALANCED' | 'INDUSTRY' | 'GREEN' | 'WELFARE'
export type BuildingId = 'SOLAR_ARRAY' | 'MARKET_HALL' | 'ACADEMY' | 'CIVIC_FORUM'
export type DistrictId = 'forum' | 'foundry' | 'commons' | 'aqueduct'
export type CityStatus = 'ACTIVE' | 'COLLAPSED' | 'ELECTED'

export type DistrictState = { id: DistrictId; name: string; description: string; prosperity: number; population: number; building: BuildingId | null; buildingLevel: number }
export type ChronicleEntry = {
  id: string; tick: number; year: number; category: 'POLITICS' | 'ECONOMY' | 'CIVIC' | 'ENERGY' | 'CONSTRUCTION' | 'ELECTION'
  title: string; detail: string; impact: string; tone: 'positive' | 'warning' | 'neutral'
}
export type TimeState = {
  schemaVersion: 1; tick: number; year: number; treasury: number; energy: number; population: number; stability: number
  approval: Record<FactionId, number>; taxRate: number; policy: PolicyId; districts: DistrictState[]; archive: ChronicleEntry[]
  status: CityStatus; lastConsequence: string; lastAction: string; randomSeed: number; score: number
}
export type TurnPlan = { taxRate: number; policy: PolicyId }
export type TurnForecast = { treasuryDelta: number; energyDelta: number; commonsDelta: number; guildDelta: number; senateDelta: number; upkeep: number; income: number }

export const POLICIES: Record<PolicyId, { name: string; label: string; short: string; description: string }> = {
  BALANCED: { name: 'Сбалансированный курс', label: 'Баланс', short: 'Устойчивость', description: 'Умеренные расходы и предсказуемая реакция городских сил.' },
  INDUSTRY: { name: 'Промышленный рывок', label: 'Промышленность', short: 'Доход', description: 'Больше казённых поступлений ценой повышенного расхода энергии.' },
  GREEN: { name: 'Зелёный пакт', label: 'Энергия', short: 'Энергия', description: 'Увеличивает энергетический резерв и поддерживает район акведуков.' },
  WELFARE: { name: 'Гражданская поддержка', label: 'Благосостояние', short: 'Лояльность', description: 'Поддерживает горожан, но требует дополнительных средств казны.' },
}
export const BUILDINGS: Record<BuildingId, { name: string; label: string; cost: number; upkeep: number; income: number; energy: number; description: string }> = {
  SOLAR_ARRAY: { name: 'Солнечный контур', label: 'Энергия', cost: 220, upkeep: 7, income: 0, energy: 7, description: 'Каждый уровень добавляет энергетический прирост на каждом такте.' },
  MARKET_HALL: { name: 'Торговая галерея', label: 'Торговля', cost: 180, upkeep: 12, income: 34, energy: 0, description: 'Увеличивает поступления от торговли и занятости.' },
  ACADEMY: { name: 'Академия', label: 'Наука', cost: 165, upkeep: 9, income: 15, energy: 0, description: 'Поддерживает гильдии и сенат; приносит небольшой доход.' },
  CIVIC_FORUM: { name: 'Гражданский форум', label: 'Общество', cost: 150, upkeep: 10, income: 0, energy: 0, description: 'Повышает доверие граждан и укрепляет стабильность.' },
}
const initialDistricts = (): DistrictState[] => [
  { id: 'forum', name: 'Сенатский форум', description: 'Закон, администрация и общественная жизнь.', prosperity: 62, population: 3200, building: null, buildingLevel: 0 },
  { id: 'foundry', name: 'Литейный квартал', description: 'Гильдии мастеров, мастерские и производство.', prosperity: 54, population: 4100, building: null, buildingLevel: 0 },
  { id: 'commons', name: 'Нижний город', description: 'Жилые улицы, рынки и городские службы.', prosperity: 58, population: 4300, building: null, buildingLevel: 0 },
  { id: 'aqueduct', name: 'Акведуки', description: 'Водоснабжение, энергетика и городская инфраструктура.', prosperity: 67, population: 1200, building: null, buildingLevel: 0 },
]
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))
const countBuilding = (s: TimeState, id: BuildingId) => s.districts.filter((d) => d.building === id).reduce((sum, d) => sum + d.buildingLevel, 0)
const buildingUpkeep = (s: TimeState) => s.districts.reduce((sum, d) => d.building ? sum + BUILDINGS[d.building].upkeep * d.buildingLevel : sum, 0)
function appendArchive(archive: ChronicleEntry[], entry: ChronicleEntry) { return [...archive, entry].slice(-36) }

export function createTimeState(): TimeState {
  return {
    schemaVersion: 1, tick: 0, year: 2048, treasury: 1000, energy: 100, population: 12800, stability: 72,
    approval: { guild: 60, commons: 60, senate: 60 }, taxRate: 10, policy: 'BALANCED', districts: initialDistricts(),
    archive: [{ id: 'founding', tick: 0, year: 2048, category: 'CIVIC', title: 'Начало нового цикла', detail: 'Империя вступает в новый политический сезон. Первое решение — за вами.', impact: 'Город основан', tone: 'neutral' }],
    status: 'ACTIVE', lastConsequence: 'No policy has been enacted yet.', lastAction: 'Совет ожидает первое решение правителя.', randomSeed: 734821, score: 0,
  }
}

export function getTurnForecast(state: TimeState, plan: TurnPlan): TurnForecast {
  if (!Number.isFinite(plan.taxRate) || plan.taxRate < 0 || plan.taxRate > 40) throw new Error('Tax rate out of range')
  const markets = countBuilding(state, 'MARKET_HALL')
  const academies = countBuilding(state, 'ACADEMY')
  const forums = countBuilding(state, 'CIVIC_FORUM')
  const solar = countBuilding(state, 'SOLAR_ARRAY')
  const income = Math.round(45 + plan.taxRate * 5 + markets * 34 + academies * 15 + (plan.policy === 'INDUSTRY' ? 32 : 0))
  const upkeep = Math.round(90 + buildingUpkeep(state) + (plan.policy === 'WELFARE' ? 32 : 0) + (plan.policy === 'INDUSTRY' ? 10 : 0))
  const production = plan.policy === 'GREEN' ? 12 : plan.policy === 'INDUSTRY' ? 4 : 5
  const demand = plan.policy === 'INDUSTRY' ? 8 : 7
  const taxPressure = plan.taxRate >= 22 ? Math.ceil((plan.taxRate - 20) / 3) : 0
  const relief = plan.taxRate <= 7 ? 2 : 0
  return {
    treasuryDelta: income - upkeep, energyDelta: production + solar * 7 - demand, income, upkeep,
    commonsDelta: (plan.policy === 'WELFARE' ? 4 : 0) + relief - taxPressure + forums,
    guildDelta: (plan.policy === 'INDUSTRY' ? 3 : plan.policy === 'GREEN' ? 1 : 0) - (plan.taxRate >= 30 ? 2 : 0) + academies,
    senateDelta: (plan.policy === 'BALANCED' || plan.policy === 'GREEN' ? 2 : plan.policy === 'WELFARE' ? -1 : -2) +
      (plan.taxRate >= 12 && plan.taxRate <= 24 ? 1 : 0) + academies,
  }
}

type Incident = {
  seed: number
  category: ChronicleEntry['category']
  title: string
  detail: string
  impact: string
  tone: ChronicleEntry['tone']
  treasury: number
  energy: number
  approval: Partial<Record<FactionId, number>>
  stability: number
}
function incidentFor(seed: number): Incident {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const items = [
    { category: 'ECONOMY' as const, title: 'Торговый караван', detail: 'Караван прибыл раньше срока: торговцы пополнили городские склады.', impact: 'Казна +45 · Гильдии +2', tone: 'positive' as const, treasury: 45, energy: 0, approval: { guild: 2 }, stability: 0 },
    { category: 'ENERGY' as const, title: 'Перегрузка энергосети', detail: 'Старая линия перегрелась. Инженеры отключили часть узлов до следующего такта.', impact: 'Энергия −8 · Сенат −1', tone: 'warning' as const, treasury: 0, energy: -8, approval: { senate: -1 }, stability: -2 },
    { category: 'CIVIC' as const, title: 'Ночной фестиваль', detail: 'Городские площади снова полны людей: напряжение между кварталами ослабло.', impact: 'Граждане +4 · Стабильность +3', tone: 'positive' as const, treasury: -20, energy: 0, approval: { commons: 4 }, stability: 3 },
    { category: 'ECONOMY' as const, title: 'Заказ гильдий', detail: 'Мастера получили крупный внешний заказ и наняли новых работников.', impact: 'Казна +35 · Энергия −4', tone: 'positive' as const, treasury: 35, energy: -4, approval: { guild: 3 }, stability: 0 },
    { category: 'POLITICS' as const, title: 'Запрос сената', detail: 'Совет старейшин потребовал открыть отчёт по расходам и публичным обещаниям.', impact: 'Казна −25 · Сенат +3', tone: 'neutral' as const, treasury: -25, energy: 0, approval: { senate: 3 }, stability: 2 },
  ]
  return { seed: nextSeed, ...items[nextSeed % items.length] }
}

export function resolveTimeTurn(state: TimeState, plan: TurnPlan): TimeState {
  if (state.status !== 'ACTIVE') throw new Error('City is not active')
  const forecast = getTurnForecast(state, plan)
  const tick = state.tick + 1
  const year = state.year + 1
  const incident = incidentFor(state.randomSeed)
  const approval = {
    guild: clamp(state.approval.guild + forecast.guildDelta + (incident.approval.guild ?? 0)),
    commons: clamp(state.approval.commons + forecast.commonsDelta + (incident.approval.commons ?? 0)),
    senate: clamp(state.approval.senate + forecast.senateDelta + (incident.approval.senate ?? 0)),
  }
  const treasury = state.treasury + forecast.treasuryDelta + incident.treasury
  const energy = clamp(state.energy + forecast.energyDelta + incident.energy)
  const average = (approval.guild + approval.commons + approval.senate) / 3
  const stability = clamp(state.stability + Math.round((average - 55) / 22) + (energy < 35 ? -4 : energy > 85 ? 1 : 0) + (treasury < 250 ? -3 : 0) + incident.stability)
  const districts = state.districts.map((district) => {
    const delta = (plan.policy === 'INDUSTRY' && district.id === 'foundry' ? 3 : 0) +
      (plan.policy === 'GREEN' && district.id === 'aqueduct' ? 3 : 0) +
      (plan.policy === 'WELFARE' && district.id === 'commons' ? 2 : 0) +
      (plan.policy === 'BALANCED' && district.id === 'forum' ? 1 : 0) + (average >= 62 ? 1 : 0)
    const populationDelta = district.prosperity >= 60 && energy > 25 ? 35 : district.prosperity < 30 ? -60 : 0
    return { ...district, prosperity: clamp(district.prosperity + delta - (energy < 20 ? 2 : 0)), population: Math.max(0, district.population + populationDelta) }
  })
  const collapse = treasury <= 0 || energy <= 0 || stability <= 5 || Object.values(approval).every((value) => value < 15)
  const allies = Object.values(approval).filter((value) => value >= 52).length
  const elected = tick >= 8 && treasury >= 500 && stability >= 35 && allies >= 2
  const status: CityStatus = collapse ? 'COLLAPSED' : elected ? 'ELECTED' : 'ACTIVE'
  const consequence = plan.taxRate > state.taxRate ? 'Higher tax funds the treasury but reduces commons approval.' :
    plan.taxRate < state.taxRate ? 'Lower tax protects approval but drains the treasury.' : 'A steady tax preserves the current political balance.'
  const energyText = forecast.energyDelta < 0 ? 'Energy -' + Math.abs(forecast.energyDelta) + '.' : 'Energy +' + forecast.energyDelta + '.'
  const policyName = POLICIES[plan.policy].name
  const entry: ChronicleEntry = {
    id: 'turn-' + tick + '-' + incident.seed, tick, year, category: 'POLITICS', title: 'Такт ' + tick + '. ' + policyName,
    detail: consequence + ' ' + energyText + ' ' + incident.detail,
    impact: 'Казна ' + (forecast.treasuryDelta + incident.treasury >= 0 ? '+' : '') + (forecast.treasuryDelta + incident.treasury) +
      ' · Энергия ' + (forecast.energyDelta + incident.energy >= 0 ? '+' : '') + (forecast.energyDelta + incident.energy),
    tone: collapse ? 'warning' : incident.tone,
  }
  const eventEntry = { id: 'event-' + tick + '-' + incident.seed, tick, year, category: incident.category, title: incident.title, detail: incident.detail, impact: incident.impact, tone: incident.tone } as ChronicleEntry
  const score = state.score + Math.max(0, Math.round((treasury - state.treasury) / 10)) + Math.round(average) + Math.round(stability / 5) + Math.round(districts.reduce((sum, d) => sum + d.prosperity, 0) / 10)
  return {
    ...state, tick, year, treasury, energy, population: districts.reduce((sum, d) => sum + d.population, 0),
    stability, approval, taxRate: plan.taxRate, policy: plan.policy, districts,
    archive: appendArchive(appendArchive(state.archive, entry), eventEntry), status, lastConsequence: consequence + ' ' + energyText,
    lastAction: status === 'ELECTED' ? 'Сенат продлил мандат: город сохранил устойчивость.' :
      status === 'COLLAPSED' ? 'Город больше не может поддерживать прежний порядок.' : 'Принято решение: «' + policyName + '».',
    randomSeed: incident.seed, score,
  }
}

export function buildStructure(state: TimeState, districtId: DistrictId, buildingId: BuildingId): TimeState {
  if (state.status !== 'ACTIVE') throw new Error('City is not active')
  const district = state.districts.find((item) => item.id === districtId)
  if (!district) throw new Error('District not found')
  if (district.building && district.building !== buildingId) throw new Error('This district already has a different structure')
  if (district.buildingLevel >= 3) throw new Error('Maximum structure level reached')
  const level = district.buildingLevel + 1
  const cost = BUILDINGS[buildingId].cost * level
  if (state.treasury < cost) throw new Error('Not enough treasury')
  const districts = state.districts.map((item) => item.id === districtId ? { ...item, building: buildingId, buildingLevel: level, prosperity: clamp(item.prosperity + 4) } : item)
  const entry: ChronicleEntry = {
    id: 'build-' + state.tick + '-' + districtId + '-' + buildingId + '-' + level,
    tick: state.tick, year: state.year, category: 'CONSTRUCTION', title: BUILDINGS[buildingId].name + ': уровень ' + level,
    detail: district.name + ': ' + BUILDINGS[buildingId].description, impact: 'Казна −' + cost, tone: 'positive',
  }
  return { ...state, treasury: state.treasury - cost, districts, archive: appendArchive(state.archive, entry),
    lastConsequence: BUILDINGS[buildingId].name + ' · ' + district.name + ' · уровень ' + level + '.',
    lastAction: 'Построено: ' + BUILDINGS[buildingId].name + '.', score: state.score + 20 * level }
}

// Compatibility adapter for existing TIME transition tests and integrations.
export function applyTax(state: TimeState, taxRate: number): TimeState {
  return resolveTimeTurn(state, { taxRate, policy: state.policy ?? 'BALANCED' })
}
