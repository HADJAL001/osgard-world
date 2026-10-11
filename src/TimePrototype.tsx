import {
  Activity, ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, CircleHelp, Coins, Factory, Landmark, Leaf, MapPinned, Play,
  RotateCcw, Save, ShieldAlert, ShieldCheck, Sparkles, TrendingUp, Users, Vote, Waves, Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BUILDINGS, POLICIES, buildStructure, createTimeState, getTurnForecast, resolveTimeTurn,
  type BuildingId, type ChronicleEntry, type DistrictId, type PolicyId, type TimeState,
} from './core/timeState'
import { recordOsgardEvent } from './core/eventQueue'
import { completePlayerSession, startPlayerSession } from './core/playerApi'

type Tab = 'council' | 'construction' | 'chronicle'
type Diagnostics = { fps: number; frameMs: number; frameP95Ms: number; slowFrames: number; tickMs: number; actions: number; save: 'saved' | 'error'; saveMs: number; saveBytes: number }

const SAVE_KEY = 'osgard.time.empire.save.v1'
const factions = [
  { id: 'guild' as const, name: 'Гильдии мастеров', short: 'ГИЛЬДИИ', mark: 'G', icon: Factory, description: 'Производство и торговля' },
  { id: 'commons' as const, name: 'Горожане', short: 'ГРАЖДАНЕ', mark: 'C', icon: Users, description: 'Благосостояние и налоги' },
  { id: 'senate' as const, name: 'Сенат', short: 'СЕНАТ', mark: 'S', icon: Landmark, description: 'Порядок и легитимность' },
]
const buildingIds: BuildingId[] = ['SOLAR_ARRAY', 'MARKET_HALL', 'ACADEMY', 'CIVIC_FORUM']
const districts: Array<{ id: DistrictId; points: string; labelX: number; labelY: number; markerX: number; markerY: number }> = [
  { id: 'foundry', points: '130,124 355,82 421,210 360,274 190,297 112,211', labelX: 245, labelY: 174, markerX: 280, markerY: 209 },
  { id: 'forum', points: '385,87 595,85 685,202 565,284 424,242 421,210', labelX: 525, labelY: 143, markerX: 542, markerY: 181 },
  { id: 'commons', points: '112,211 190,297 360,274 431,323 414,450 205,472 108,354', labelX: 268, labelY: 384, markerX: 286, markerY: 415 },
  { id: 'aqueduct', points: '424,242 565,284 685,202 759,348 655,459 414,450 431,323', labelX: 572, labelY: 360, markerX: 594, markerY: 404 },
]
function loadSavedState(): TimeState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createTimeState()
    const parsed = JSON.parse(raw) as Partial<TimeState>
    if (parsed.schemaVersion === 1 && Array.isArray(parsed.districts) && parsed.districts.length === 4 &&
      Array.isArray(parsed.archive) && parsed.approval && Number.isFinite(parsed.tick) &&
      ['ACTIVE', 'COLLAPSED', 'ELECTED'].includes(String(parsed.status))) return parsed as TimeState
  } catch { /* save files are optional and may be from an interrupted write */ }
  return createTimeState()
}
function money(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value))
}
function signed(value: number, unit = '') {
  return (value > 0 ? '+' : '') + money(value) + unit
}
function relativeTone(value: number, neutral = 0) {
  return value > neutral ? 'positive' : value < neutral ? 'negative' : 'neutral'
}
function shortImpact(entry: ChronicleEntry) {
  return entry.impact.replace(/Казна/g, '₽').replace(/Энергия/g, 'ЭН').replace(/Стабильность/g, 'СТАБ.')
}

export function TimePrototype() {
  const [state, setState] = useState<TimeState>(loadSavedState)
  const [tax, setTax] = useState(state.taxRate)
  const [policy, setPolicy] = useState<PolicyId>(state.policy)
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>('forum')
  const [tab, setTab] = useState<Tab>('council')
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [mapZoom, setMapZoom] = useState(1)
  const [announcement, setAnnouncement] = useState('Совет ожидает вашего решения.')
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({ fps: 0, frameMs: 0, frameP95Ms: 0, slowFrames: 0, tickMs: 0, actions: 0, save: 'saved', saveMs: 0, saveBytes: 0 })
  const session = useRef<string | null>(null)
  const completed = useRef(false)
  const stateRef = useRef(state)
  const diagnosticRef = useRef({ frames: 0, elapsed: 0, start: 0, last: 0, samples: [] as number[], slowFrames: 0 })

  stateRef.current = state
  const district = state.districts.find((item) => item.id === selectedDistrict) ?? state.districts[0]
  const selectedBuilding = district.building ? BUILDINGS[district.building] : null
  const forecast = useMemo(() => getTurnForecast(state, { taxRate: tax, policy }), [state, tax, policy])
  const allies = factions.filter((faction) => state.approval[faction.id] >= 52).length
  const missionProgress = Math.min(100, Math.round((state.tick / 8) * 100))
  const activeBuildings = state.districts.filter((item) => item.building).length
  const latestEntries = [...state.archive].reverse().slice(0, 5)

  useEffect(() => {
    let alive = true
    void startPlayerSession('time', { surface: 'time', schemaVersion: 2, entry: 'imperium-of-time' }).then((value) => {
      if (!alive || !value?.id) return
      session.current = value.id
      if (stateRef.current.status !== 'ACTIVE' && !completed.current) {
        completed.current = true
        void completePlayerSession(value.id, { status: stateRef.current.status, tick: stateRef.current.tick, treasury: stateRef.current.treasury, score: stateRef.current.score })
      }
    })
    recordOsgardEvent('game_opened', { game: 'time', version: 2, saved: state.tick > 0 })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (state.status !== 'ACTIVE' && session.current && !completed.current) {
      completed.current = true
      void completePlayerSession(session.current, { status: state.status, tick: state.tick, treasury: state.treasury, score: state.score, population: state.population })
      recordOsgardEvent('game_session_completed', { game: 'time', status: state.status, tick: state.tick, score: state.score })
    }
  }, [state.status, state.tick, state.treasury, state.score, state.population])

  useEffect(() => {
    const started = performance.now()
    try {
      const serialized = JSON.stringify(state)
      localStorage.setItem(SAVE_KEY, serialized)
      const saveMs = Number((performance.now() - started).toFixed(2))
      const saveBytes = new Blob([serialized]).size
      setDiagnostics((old) => ({ ...old, save: 'saved', saveMs, saveBytes }))
    } catch {
      const saveMs = Number((performance.now() - started).toFixed(2))
      setDiagnostics((old) => ({ ...old, save: 'error', saveMs }))
    }
  }, [state])

  useEffect(() => {
    let frame = 0
    let alive = true
    const sample = (now: number) => {
      if (!alive) return
      const meter = diagnosticRef.current
      if (meter.last > 0) {
        const delta = now - meter.last
        meter.frames += 1
        meter.elapsed += delta
        meter.samples.push(delta)
        if (meter.samples.length > 240) meter.samples.shift()
        if (delta > 25) meter.slowFrames += 1
      }
      meter.last = now
      if (!meter.start) meter.start = now
      if (now - meter.start >= 1000) {
        const duration = now - meter.start
        const fps = Math.round((meter.frames * 1000) / duration)
        const frameMs = meter.frames ? meter.elapsed / meter.frames : 0
        const sortedSamples = [...meter.samples].sort((a, b) => a - b)
        const p95Index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(sortedSamples.length * 0.95) - 1))
        const frameP95Ms = sortedSamples.length ? sortedSamples[p95Index] : 0
        setDiagnostics((old) => ({
          ...old,
          fps,
          frameMs: Number(frameMs.toFixed(1)),
          frameP95Ms: Number(frameP95Ms.toFixed(1)),
          slowFrames: meter.slowFrames,
        }))
        meter.frames = 0
        meter.elapsed = 0
        meter.slowFrames = 0
        meter.start = now
      }
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    return () => { alive = false; cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      if (event.key === 'Escape') {
        setDiagnosticsOpen(false)
        return
      }
      if (event.key === '1') setTab('council')
      if (event.key === '2') setTab('construction')
      if (event.key === '3') setTab('chronicle')
      if (event.key === '+' || event.key === '=') setMapZoom((zoom) => Math.min(1.24, Number((zoom + 0.06).toFixed(2))))
      if (event.key === '-') setMapZoom((zoom) => Math.max(0.86, Number((zoom - 0.06).toFixed(2))))
      if (event.key === '0') setMapZoom(1)
    }
    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [])

  function applyTurn() {
    if (state.status !== 'ACTIVE') return
    const start = performance.now()
    try {
      const next = resolveTimeTurn(state, { taxRate: tax, policy })
      const elapsed = Number((performance.now() - start).toFixed(2))
      setDiagnostics((old) => ({ ...old, tickMs: elapsed, actions: old.actions + 1 }))
      setState(next)
      setAnnouncement(next.archive[next.archive.length - 1]?.detail ?? next.lastAction)
      recordOsgardEvent('portal_opened', { game: 'time', action: 'RESOLVE_TURN', taxRate: tax, policy, tick: next.tick, calcMs: elapsed })
      if (next.status === 'COLLAPSED') setTab('chronicle')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'Не удалось рассчитать ход.')
    }
  }

  function build(buildingId: BuildingId) {
    if (state.status !== 'ACTIVE') return
    const start = performance.now()
    try {
      const next = buildStructure(state, district.id, buildingId)
      const elapsed = Number((performance.now() - start).toFixed(2))
      setDiagnostics((old) => ({ ...old, tickMs: elapsed, actions: old.actions + 1 }))
      setState(next)
      setAnnouncement(next.lastConsequence)
      recordOsgardEvent('portal_opened', { game: 'time', action: 'BUILD', district: district.id, building: buildingId, level: next.districts.find((item) => item.id === district.id)?.buildingLevel ?? 0, calcMs: elapsed })
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'Строительство не выполнено.')
    }
  }

  function resetGame() {
    const next = createTimeState()
    setState(next)
    setTax(next.taxRate)
    setPolicy(next.policy)
    setSelectedDistrict('forum')
    setTab('council')
    setAnnouncement('Новая летопись началась. Решения прошлого цикла сохранены только в вашей памяти.')
    completed.current = false
    session.current = null
    void startPlayerSession('time', { surface: 'time', schemaVersion: 2, entry: 'imperium-of-time', restarted: true }).then((value) => {
      session.current = value?.id ?? null
      if (value?.id && stateRef.current.status !== 'ACTIVE' && !completed.current) {
        completed.current = true
        void completePlayerSession(value.id, { status: stateRef.current.status, tick: stateRef.current.tick, treasury: stateRef.current.treasury, score: stateRef.current.score })
      }
    })
    recordOsgardEvent('portal_opened', { game: 'time', action: 'RESET_GAME' })
  }

  const chooseDistrict = (id: DistrictId) => {
    setSelectedDistrict(id)
    const target = state.districts.find((item) => item.id === id)
    if (target) setAnnouncement(target.name + ' — ' + target.description)
  }

  const active = state.status === 'ACTIVE'

  return (
    <main className="time-game">
      <div className="time-game-noise" aria-hidden="true" />
      <header className="tg-topbar">
        <a className="tg-brand" href="/entertainment" aria-label="Назад к играм OSGARD">
          <span className="tg-brand-mark"><Landmark size={17} /></span>
          <span><strong>OSGARD<span> / PLAY</span></strong><small>IMPERIUM OF TIME · 02</small></span>
        </a>
        <div className="tg-chapter"><span className="tg-live-dot" /> <span>CHRONICLE ENGINE</span><i /> <span>СЕЗОН {String(state.tick + 1).padStart(2, '0')}</span></div>
        <div className="tg-top-actions">
          <span className="tg-save-state"><Save size={12} /> {diagnostics.save === 'saved' ? 'СОХРАНЕНО' : 'ЛОКАЛЬНОЕ СОХРАНЕНИЕ НЕДОСТУПНО'}</span>
          <button className="tg-icon-button" type="button" aria-label="Диагностика производительности" aria-expanded={diagnosticsOpen} onClick={() => setDiagnosticsOpen((value) => !value)}><Activity size={16} /></button>
          <button className="tg-icon-button" type="button" aria-label="Начать новую партию" onClick={resetGame}><RotateCcw size={16} /></button>
        </div>
      </header>

      <div className="tg-intro">
        <div className="tg-title-block">
          <div className="tg-overline"><span>{state.year} / MANDATE I</span><span>·</span><span>ЦИКЛ {String(state.tick).padStart(2, '0')}</span></div>
          <h1>Империя <em>времени.</em></h1>
          <p>Город запоминает каждое решение. Казна, энергия и три силы определят, переживёт ли империя следующий такт.</p>
        </div>
        <div className="tg-mission-card">
          <div className="tg-mission-head"><span>ОСНОВНАЯ ЦЕЛЬ</span><span>МАНДАТ 01</span></div>
          <strong>Удержать город до выборов</strong>
          <p>Доживите до 8-го такта, сохраните минимум две фракции-союзника и не допустите истощения казны.</p>
          <div className="tg-mission-track"><span style={{ width: missionProgress + '%' }} /></div>
          <div className="tg-mission-foot"><span>{state.tick} / 8 тактов</span><span>{allies} / 3 союзника</span></div>
        </div>
      </div>

      <section className="tg-resource-strip" aria-label="Состояние города">
        <Resource icon={<Coins />} label="КАЗНА" value={'₽ ' + money(state.treasury)} hint={(forecast.treasuryDelta >= 0 ? '+' : '') + money(forecast.treasuryDelta) + ' / такт'} tone={relativeTone(forecast.treasuryDelta)} />
        <Resource icon={<Zap />} label="ЭНЕРГИЯ" value={state.energy + '%'} hint={(forecast.energyDelta >= 0 ? '+' : '') + forecast.energyDelta + ' / такт'} tone={relativeTone(forecast.energyDelta)} meter={state.energy} />
        <Resource icon={<Users />} label="НАСЕЛЕНИЕ" value={money(state.population)} hint={'4 района · ' + activeBuildings + ' строений'} />
        <Resource icon={<ShieldCheck />} label="СТАБИЛЬНОСТЬ" value={state.stability + '%'} hint={state.stability >= 60 ? 'Порядок устойчив' : state.stability >= 30 ? 'Растёт напряжение' : 'Кризис близко'} tone={state.stability >= 60 ? 'positive' : state.stability >= 30 ? 'neutral' : 'negative'} meter={state.stability} />
      </section>

      {diagnosticsOpen && <section className="tg-diagnostics" aria-label="Диагностика производительности">
        <div className="tg-diagnostic-title"><Activity size={15} /><div><strong>ДИАГНОСТИКА RUNTIME</strong><small>Измерения этого браузера, обновляются в реальном времени</small></div><span className="tg-live-pill">LIVE</span></div>
        <div className="tg-diagnostic-grid">
          <Diagnostic label="Частота кадров" value={diagnostics.fps ? String(diagnostics.fps) + ' FPS' : '…'} description="Измерение requestAnimationFrame" tone={diagnostics.fps >= 50 ? 'positive' : diagnostics.fps >= 30 ? 'neutral' : 'negative'} />
          <Diagnostic label="Интервал кадра" value={diagnostics.frameMs ? diagnostics.frameMs + ' мс' : '…'} description="Среднее за последнюю секунду" tone={diagnostics.frameMs > 32 ? 'negative' : 'positive'} />
          <Diagnostic label="P95 кадра" value={diagnostics.frameP95Ms ? diagnostics.frameP95Ms + ' мс' : '…'} description="95% интервалов не выше" tone={diagnostics.frameP95Ms > 32 ? 'negative' : diagnostics.frameP95Ms > 20 ? 'neutral' : 'positive'} />
          <Diagnostic label="Медленные кадры" value={String(diagnostics.slowFrames)} description="Интервал свыше 25 мс за секунду" tone={diagnostics.slowFrames > 4 ? 'negative' : 'positive'} />
          <Diagnostic label="Расчёт действия" value={diagnostics.actions ? diagnostics.tickMs.toFixed(2) + ' мс' : '—'} description="Последняя симуляция / стройка" tone={diagnostics.tickMs > 50 ? 'negative' : 'positive'} />
          <Diagnostic label="Запись сохранения" value={diagnostics.saveMs ? diagnostics.saveMs.toFixed(2) + ' мс' : '…'} description="Измеренная длительность localStorage" tone={diagnostics.saveMs > 16 ? 'negative' : 'positive'} />
          <Diagnostic label="Размер сохранения" value={diagnostics.saveBytes ? (diagnostics.saveBytes / 1024).toFixed(1) + ' КБ' : '…'} description="Фактический размер JSON в UTF-8" />
          <Diagnostic label="Действия" value={String(diagnostics.actions)} description="Успешные локальные команды" />
        </div>
      </section>}

      <div className="tg-play-grid">
        <section className="tg-city-panel" aria-label="Карта города">
          <div className="tg-panel-head">
            <div><span className="tg-overline">ATLAS / URBS IX</span><h2>Живая карта</h2></div>
            <div className="tg-map-controls">
              <button type="button" aria-label="Уменьшить карту" onClick={() => setMapZoom((zoom) => Math.max(0.86, Number((zoom - 0.06).toFixed(2))))}>−</button>
              <button className="tg-zoom-reset" type="button" aria-label="Сбросить масштаб карты" title="Сбросить масштаб карты" onClick={() => setMapZoom(1)}>{Math.round(mapZoom * 100)}%</button>
              <button type="button" aria-label="Увеличить карту" onClick={() => setMapZoom((zoom) => Math.min(1.24, Number((zoom + 0.06).toFixed(2))))}>+</button>
            </div>
          </div>
          <div className="tg-map-viewport" data-city-status={state.status} data-city-tick={state.tick}>
            <div
              className="tg-map-world"
              key={state.tick + ':' + state.districts.map((item) => item.buildingLevel).join('-')}
              style={{ transform: 'scale(' + mapZoom + ')' }}
            >
              <svg className="tg-city-map" viewBox="0 0 840 520" role="img" aria-label="Схематическая карта четырёх районов имперского города">
                <defs>
                  <linearGradient id="tgLand" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#17252b" /><stop offset="100%" stopColor="#0b1119" /></linearGradient>
                  <linearGradient id="tgGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8d7a6" /><stop offset="100%" stopColor="#8c6b36" /></linearGradient>
                  <radialGradient id="tgGlow"><stop offset="0%" stopColor="#d9bd79" stopOpacity=".32" /><stop offset="100%" stopColor="#d9bd79" stopOpacity="0" /></radialGradient>
                  <pattern id="tgGrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#9ab3b0" strokeOpacity=".09" strokeWidth=".7" /></pattern>
                  <filter id="tgBloom"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <rect width="840" height="520" fill="#0a1116" />
                <rect width="840" height="520" fill="url(#tgGrid)" />
                <g className="tg-city-stars" aria-hidden="true">
                  {Array.from({ length: 52 }, (_, i) => {
                    const x = (i * 131 + 37) % 820 + 10
                    const y = (i * 71 + 23) % 500 + 10
                    return <circle key={i} cx={x} cy={y} r={i % 8 === 0 ? 1.2 : 0.55} fill={i % 5 === 0 ? '#e3d19b' : '#9ccfc2'} opacity={i % 6 === 0 ? '.72' : '.28'} />
                  })}
                </g>
                <ellipse cx="432" cy="266" rx="315" ry="240" fill="url(#tgGlow)" opacity=".45" />
                <path d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#17343a" strokeWidth="35" opacity=".78" />
                <path d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#54746e" strokeWidth="1.4" strokeDasharray="8 7" opacity=".58" />
                <path className="tg-water-shimmer" d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#a0d6c3" strokeWidth="1.2" strokeDasharray="2 42 14 75" opacity=".8" />
                <g fill="none" stroke="#a4a77c" strokeOpacity=".20" strokeWidth="2">
                  <path d="M68 101 160 78 234 95 305 65 397 72 470 54 569 65 651 99 720 149 777 219" />
                  <path d="M86 218 174 238 257 227 333 264 418 250 504 281 601 271 734 315" />
                  <path d="M119 451 203 423 284 445 367 416 449 432 534 412 621 435 700 409 780 384" />
                  <path d="M194 41 211 118 238 190 230 274 255 355 263 479" />
                  <path d="M380 36 371 120 399 196 382 277 409 355 398 486" />
                  <path d="M566 45 544 121 579 205 560 287 587 360 581 481" />
                  <path d="M703 115 654 178 668 256 700 333 668 425" />
                </g>
                <g fill="url(#tgLand)" stroke="#8fa098" strokeOpacity=".30" strokeWidth="1.4">
                  <path d={districts[0].points} />
                  <path d={districts[1].points} />
                  <path d={districts[2].points} />
                  <path d={districts[3].points} />
                </g>
                {districts.map((shape) => {
                  const item = state.districts.find((d) => d.id === shape.id)!
                  const isSelected = selectedDistrict === shape.id
                  return <g key={shape.id} className={'tg-map-district ' + (isSelected ? 'is-selected' : '')} role="button" tabIndex={0} aria-label={item.name + ', процветание ' + item.prosperity + '%'} aria-pressed={isSelected} onClick={() => chooseDistrict(shape.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseDistrict(shape.id) } }}>
                    <circle className="tg-district-heat" cx={shape.markerX} cy={shape.markerY} r={31 + Math.round(item.prosperity / 5)} fill={item.prosperity < 35 ? '#d98473' : item.prosperity >= 65 ? '#8fc7ad' : '#d8bd7b'} fillOpacity={isSelected ? '.22' : '.055'} />
                    <polygon points={shape.points} fill={isSelected ? '#d8bd7b' : item.prosperity < 35 ? '#d98473' : item.prosperity >= 65 ? '#8fc7ad' : '#9db5b2'} fillOpacity={isSelected ? '.15' : '.035'} stroke={isSelected ? '#ecdca7' : item.prosperity < 35 ? '#d98473' : item.prosperity >= 65 ? '#8fc7ad' : '#9ab5b0'} strokeWidth={isSelected ? '2.1' : '1'} strokeOpacity={isSelected ? '.9' : '.45'} />
                    <g className="tg-city-blocks" transform={'translate(' + (shape.markerX - 44) + ' ' + (shape.markerY - 32) + ')'}>
                      {Array.from({ length: 8 }, (_, i) => {
                        const height = 7 + ((i * 3 + item.prosperity) % 6) + (item.building ? item.buildingLevel * 2 : 0)
                        const tone = item.prosperity < 35 ? '#a96561' : item.building === 'SOLAR_ARRAY' ? '#5d9d91' : item.building === 'MARKET_HALL' ? '#bd9b5f' : item.building === 'ACADEMY' ? '#8f9db0' : item.building === 'CIVIC_FORUM' ? '#c0ad7b' : '#6d8589'
                        return <g key={i} className="tg-city-building" transform={'translate(' + ((i % 4) * 23) + ' ' + (Math.floor(i / 4) * 26) + ')'}>
                          <ellipse cx="9" cy={height + 7} rx="11" ry="3" fill="#000" opacity=".22" />
                          <polygon points={'0,6 7,1 17,6 9,11'} fill={item.building && i === 3 ? '#e0ca8c' : tone} stroke="#e1d3a7" strokeOpacity=".54" strokeWidth=".55" />
                          <polygon points={'0,6 9,11 9,' + (height + 7) + ' 0,' + (height + 2)} fill={tone} fillOpacity={isSelected ? '.98' : '.72'} stroke="#b9c7b6" strokeOpacity=".32" strokeWidth=".5" />
                          <polygon points={'9,11 17,6 17,' + (height + 2) + ' 9,' + (height + 7)} fill="#263a3d" fillOpacity=".95" stroke="#a3b6aa" strokeOpacity=".3" strokeWidth=".5" />
                          <path d={'M3 12v' + Math.max(2, height - 3) + ' M6 13v' + Math.max(2, height - 4)} stroke={isSelected ? '#e8dcae' : '#c4d2bd'} strokeOpacity=".48" strokeWidth="1.1" />
                          <path d={'M12 13v' + Math.max(2, height - 4)} stroke="#d9bd79" strokeOpacity=".58" strokeWidth="1" />
                          {item.building && i === 3 && (item.building === 'SOLAR_ARRAY'
                            ? <g className="tg-building-solar"><path d="M1 4 7 0 11 3 5 7Z" fill="#8dcfc1" stroke="#d9e0bd" strokeWidth=".55" /><path d="M7 0 7 5M4 2 9 3" stroke="#244344" strokeWidth=".55" /></g>
                            : item.building === 'MARKET_HALL'
                              ? <path d="M1 4 7 -1 14 3 9 7Z" fill="#cda96e" stroke="#ead4a1" strokeWidth=".7" />
                              : item.building === 'ACADEMY'
                                ? <g><path d="M1 5 8 -1 15 4 8 9Z" fill="#8c9eaa" stroke="#e0d6b6" strokeWidth=".6" /><circle cx="8" cy="2" r="3.3" fill="#d1c08c" fillOpacity=".62" /></g>
                                : <g><path d="M1 5 8 -1 15 4 8 9Z" fill="#c8b782" stroke="#e3d5ad" strokeWidth=".6" /><path d="M4 5v4M8 5v4M12 5v4" stroke="#f0dfad" strokeWidth=".75" /></g>)}
                        </g>
                      })}
                    </g>
                    {item.building && <g transform={'translate(' + (shape.markerX + 38) + ' ' + (shape.markerY - 38) + ')'}><circle r="14" fill="#0a1116" stroke="#d6c185" strokeWidth="1.2" /><path d="M-5 3h10M-4 -2h8M-2 -7h4" stroke="#e2d09e" strokeWidth="1.2" /><text x="0" y="23" textAnchor="middle" fill="#e4d7ac" fontSize="9">LVL {item.buildingLevel}</text></g>}
                    <text x={shape.labelX} y={shape.labelY} textAnchor="middle" fill={isSelected ? '#f0e5c1' : '#c0cbc7'} fontSize="11" fontFamily="monospace" letterSpacing="1.3">{item.name.toLocaleUpperCase('ru-RU')}</text>
                    <text x={shape.labelX} y={shape.labelY + 17} textAnchor="middle" fill="#93a6a1" fontSize="9" fontFamily="monospace">PROSPERITY / {item.prosperity}%</text>
                    {isSelected && <circle cx={shape.markerX} cy={shape.markerY} r="53" fill="url(#tgGlow)" filter="url(#tgBloom)" />}
                  </g>
                })}
                <g transform="translate(420 265)">
                  <circle r="64" fill="#0b1217" stroke="#cfb77b" strokeOpacity=".45" strokeWidth="1.5" />
                  <circle r="52" fill="none" stroke="#e6d3a0" strokeOpacity=".32" strokeDasharray="2 5" />
                  <circle r="37" fill="url(#tgGlow)" />
                  <path d="M0 -26 17 -16V5L0 25-17 5V-16Z" fill="#18272b" stroke="url(#tgGold)" strokeWidth="1.4" />
                  <path d="M-8 1 0 -13 8 1 0 12Z" fill="#d1b675" fillOpacity=".82" />
                  <text x="0" y="43" textAnchor="middle" fill="#e4d4aa" fontSize="8" fontFamily="monospace" letterSpacing="1.5">IMPERIUM</text>
                </g>
                <path className="tg-signal-path" d="M420 265 Q370 205 286 209 T542 181 T594 404" fill="none" stroke="#e2c884" strokeWidth="1" strokeDasharray="4 9" opacity=".56" />
                <g className="tg-map-compass" transform="translate(783 61)"><circle r="22" fill="#10191f" stroke="#7c938a" strokeOpacity=".45" /><path d="M0 -16 6 4 0 0-6 4Z" fill="#d7c28f" /><text x="0" y="34" fill="#9aaca6" fontSize="8" textAnchor="middle">N</text></g>
              </svg>
            </div>
            <div className="tg-map-key">
              <span><i className="key-selected" /> ВЫБРАННЫЙ РАЙОН</span>
              <span><i className="key-built" /> ПОСТРОЙКА</span>
              <span className="tg-map-shortcuts">КЛАВИШИ: 1–3 · +/− · 0</span>
              <span className="tg-map-coordinates">CITY IX / {district.id.toUpperCase()} / {String(state.tick).padStart(2, '0')}</span>
            </div>
          </div>
          <div className="tg-selected-district">
            <div className="tg-district-index"><MapPinned size={15} /><span>РАЙОН / {String(state.districts.findIndex((item) => item.id === district.id) + 1).padStart(2, '0')}</span></div>
            <div className="tg-district-main"><div><h3>{district.name}</h3><p>{district.description}</p></div><div className="tg-prosperity"><strong>{district.prosperity}%</strong><span>ПРОЦВЕТАНИЕ</span></div></div>
            <div className="tg-district-footer"><span>{money(district.population)} жителей</span><span>{district.building ? BUILDINGS[district.building].name + ' · ур. ' + district.buildingLevel : 'Участок свободен'}</span><button type="button" onClick={() => setTab('construction')}>УПРАВЛЯТЬ РАЙОНОМ <ArrowUpRight size={13} /></button></div>
          </div>
        </section>

        <section className="tg-command-panel" aria-label="Панель управления городом">
          <div className="tg-panel-head tg-command-head"><div><span className="tg-overline">IMPERIAL CHAMBER</span><h2>Кабинет правителя</h2></div><span className={'tg-status-chip ' + (active ? 'is-active' : state.status === 'ELECTED' ? 'is-won' : 'is-lost')}><i />{active ? 'АКТИВЕН' : state.status === 'ELECTED' ? 'МАНДАТ ПРОДЛЁН' : 'КРИЗИС'}</span></div>
          <div className="tg-tabs" role="tablist" aria-label="Инструменты управления">
            <button type="button" role="tab" aria-selected={tab === 'council'} className={tab === 'council' ? 'is-active' : ''} onClick={() => setTab('council')}><Vote size={14} />СОВЕТ</button>
            <button type="button" role="tab" aria-selected={tab === 'construction'} className={tab === 'construction' ? 'is-active' : ''} onClick={() => setTab('construction')}><Building2 size={14} />СТРОЙКА</button>
            <button type="button" role="tab" aria-selected={tab === 'chronicle'} className={tab === 'chronicle' ? 'is-active' : ''} onClick={() => setTab('chronicle')}><Activity size={14} />ЛЕТОПИСЬ</button>
          </div>

          {tab === 'council' && <div className="tg-tab-content">
            <div className="tg-panel-section-title"><span>01 / НАЛОГОВАЯ ПОЛИТИКА</span><span>0—40%</span></div>
            <div className="tg-tax-heading"><div><span>Ставка города</span><small>Изменится при завершении такта</small></div><strong>{tax}<small>%</small></strong></div>
            <input className="tg-tax-slider" aria-label="Налоговая ставка" type="range" min="0" max="40" step="1" value={tax} disabled={!active} style={{ '--range-fill': (tax / 40 * 100) + '%' } as React.CSSProperties} onChange={(event) => setTax(Number(event.currentTarget.value))} />
            <div className="tg-range-labels"><span>0% · МЯГКО</span><span>40% · ЖЁСТКО</span></div>
            <div className="tg-policy-heading"><span>02 / КУРС УПРАВЛЕНИЯ</span><span>ВЫБЕРИТЕ ОДИН</span></div>
            <div className="tg-policy-grid">
              {Object.entries(POLICIES).map(([key, item]) => {
                const id = key as PolicyId
                const Icon = id === 'BALANCED' ? ShieldCheck : id === 'INDUSTRY' ? Factory : id === 'GREEN' ? Leaf : Users
                return <button type="button" key={key} disabled={!active} className={'tg-policy-option ' + (policy === id ? 'is-selected' : '')} aria-pressed={policy === id} onClick={() => setPolicy(id)}>
                  <span className="tg-policy-icon"><Icon size={16} /></span><span><strong>{item.label}</strong><small>{item.short}</small></span>{policy === id && <Check size={14} className="tg-policy-check" />}
                </button>
              })}
            </div>
            <div className="tg-preview-card">
              <div className="tg-preview-head"><span>ПРОГНОЗ СЛЕДУЮЩЕГО ТАКТА</span><CircleHelp size={13} /></div>
              <div className="tg-preview-row"><span>Баланс казны</span><strong className={relativeTone(forecast.treasuryDelta)}>{signed(forecast.treasuryDelta, ' ₽')}</strong></div>
              <div className="tg-preview-row"><span>Энергетический баланс</span><strong className={relativeTone(forecast.energyDelta)}>{signed(forecast.energyDelta, ' ед.')}</strong></div>
              <p>Прогноз учитывает выбранный налог, курс и текущие здания. Случайное событие будет добавлено после хода.</p>
            </div>
            <button type="button" className="tg-resolve-button" disabled={!active} onClick={applyTurn}><span><Play size={17} fill="currentColor" /></span><span><strong>Продвинуть время</strong><small>Завершить такт {state.tick + 1} · {state.year + 1}</small></span><ArrowRight size={17} /></button>
            <p className="tg-action-hint"><span className="tg-hint-led" /> Решение вступит в силу только после симуляции такта.</p>
          </div>}

          {tab === 'construction' && <div className="tg-tab-content">
            <div className="tg-build-focus"><div className="tg-build-focus-icon"><Building2 size={19} /></div><div><span>ВЫБРАННЫЙ РАЙОН</span><strong>{district.name}</strong><small>{selectedBuilding ? selectedBuilding.name + ' · уровень ' + district.buildingLevel : 'Пустой участок · доступно строительство'}</small></div></div>
            <p className="tg-build-intro">Постройка сразу списывает средства. Её экономический эффект начнёт действовать со следующего такта. Каждый тип специализирует район.</p>
            <div className="tg-building-list">
              {buildingIds.map((id) => {
                const item = BUILDINGS[id]
                const builtHere = district.building === id
                const blocked = Boolean(district.building && district.building !== id)
                const maxed = builtHere && district.buildingLevel >= 3
                const cost = item.cost * (builtHere ? district.buildingLevel + 1 : 1)
                const canAfford = state.treasury >= cost
                const Icon = id === 'SOLAR_ARRAY' ? Zap : id === 'MARKET_HALL' ? Coins : id === 'ACADEMY' ? Sparkles : Landmark
                return <article className={'tg-building-card ' + (builtHere ? 'is-built' : '')} key={id}>
                  <div className="tg-building-icon"><Icon size={17} /></div><div className="tg-building-copy"><div className="tg-building-name">{item.name}{builtHere && <span>LVL {district.buildingLevel}</span>}</div><p>{item.description}</p><div className="tg-building-effects">{item.income > 0 && <span>+{item.income} ₽</span>}{item.energy > 0 && <span>+{item.energy} ЭН</span>}<span>−{item.upkeep} ₽ содержания</span></div></div>
                  <button type="button" disabled={!active || blocked || maxed || !canAfford} onClick={() => build(id)}>{maxed ? 'MAX' : builtHere ? 'УЛУЧШИТЬ' : blocked ? 'ЗАНЯТО' : <>{money(cost)} ₽ <ArrowUpRight size={13} /></>}</button>
                </article>
              })}
            </div>
            <p className="tg-build-note"><ShieldAlert size={14} /> В одном районе можно развивать один тип здания до 3-го уровня. Другой тип потребует свободного района.</p>
          </div>}

          {tab === 'chronicle' && <div className="tg-tab-content tg-chronicle-content">
            <div className="tg-chronicle-title"><div><span>ARCHIVE / CITY RECORD</span><h3>Летопись империи</h3></div><span>{state.archive.length} ЗАПИСЕЙ</span></div>
            <div className="tg-chronicle-list">
              {latestEntries.map((entry) => <article className={'tg-chronicle-entry tone-' + entry.tone} key={entry.id}><div className="tg-entry-mark">{String(entry.tick).padStart(2, '0')}</div><div className="tg-entry-copy"><div><span>{entry.category}</span><time>{entry.year}</time></div><strong>{entry.title}</strong><p>{entry.detail}</p><small>{shortImpact(entry)}</small></div></article>)}
            </div>
            <p className="tg-chronicle-note">Каждый ход и каждая постройка попадают в историю. Последние 36 событий хранятся в локальном сохранении.</p>
          </div>}
        </section>
      </div>

      <section className="tg-factions-section">
        <div className="tg-section-title"><div><span className="tg-overline">POLITICAL TEMPERATURE</span><h2>Три силы. Один трон.</h2></div><p>Ни одна сторона не контролирует город в одиночку. Высокое одобрение создаёт устойчивые союзы; потеря доверия подводит к кризису.</p></div>
        <div className="tg-faction-grid">
          {factions.map((faction) => {
            const score = state.approval[faction.id]
            const Icon = faction.icon
            return <article className="tg-faction-card" key={faction.id}>
              <div className="tg-faction-top"><span className="tg-faction-symbol"><Icon size={17} /></span><span className={'tg-faction-state ' + (score >= 65 ? 'is-ally' : score < 35 ? 'is-hostile' : '')}>{score >= 65 ? 'СОЮЗНИК' : score < 35 ? 'ОПОЗИЦИЯ' : 'НАБЛЮДАЕТ'}</span></div>
              <div className="tg-faction-name">{faction.name}</div><p>{faction.description}</p>
              <div className="tg-faction-score"><strong>{score}<small>/100</small></strong><span>ОДОБРЕНИЕ</span></div>
              <div className="tg-approval-track"><span style={{ width: score + '%' }} /></div>
            </article>
          })}
        </div>
      </section>

      <section className="tg-footer-grid">
        <div className="tg-last-decision"><span className="tg-overline">ПОСЛЕДСТВИЕ / ТАКТ {state.tick}</span><div className="tg-last-icon"><Waves size={17} /></div><h3>{state.lastAction}</h3><p>{announcement}</p><div className="tg-last-foot"><span>ГОРОДСКОЙ АРХИВ</span><button type="button" onClick={() => setTab('chronicle')}>Открыть летопись <ChevronRight size={14} /></button></div></div>
        <div className="tg-score-card"><span className="tg-overline">НАКОПЛЕННОЕ ВЛИЯНИЕ</span><div className="tg-score-value">{money(state.score)}<span>PT</span></div><p>Очки растут за устойчивые решения, развитие районов и сохранённые союзы.</p><div className="tg-score-footer"><span><TrendingUp size={14} /> {state.tick} завершённых тактов</span><span><Save size={13} /> автосохранение</span></div></div>
      </section>

      {!active && <div className="tg-outcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="tgOutcomeTitle">
        <section className={'tg-outcome-card ' + (state.status === 'ELECTED' ? 'is-won' : 'is-lost')}>
          <div className="tg-outcome-emblem">{state.status === 'ELECTED' ? <Vote size={25} /> : <ShieldAlert size={25} />}</div>
          <span className="tg-overline">{state.status === 'ELECTED' ? 'MANDATE RENEWED' : 'EMPIRE COLLAPSED'}</span>
          <h2 id="tgOutcomeTitle">{state.status === 'ELECTED' ? 'Город выбрал продолжение.' : 'Империя не выдержала.'}</h2>
          <p>{state.status === 'ELECTED' ? 'Вы удержали две или более фракций, сохранили резерв и дошли до выборов. Летопись цикла сохранена.' : 'Казна, энергетика или легитимность достигли критического уровня. Изучите летопись и измените стратегию.'}</p>
          <div className="tg-outcome-stats"><div><span>ТАКТ</span><strong>{state.tick}</strong></div><div><span>КАЗНА</span><strong>₽ {money(state.treasury)}</strong></div><div><span>ВЛИЯНИЕ</span><strong>{money(state.score)}</strong></div></div>
          <button type="button" className="tg-resolve-button" onClick={resetGame}><span><RotateCcw size={17} /></span><span><strong>Начать новую летопись</strong><small>Новый город · тот же набор правил</small></span><ArrowRight size={17} /></button>
          <button type="button" className="tg-outcome-archive" onClick={() => { setTab('chronicle'); const first = document.querySelector('.tg-command-panel'); first?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Изучить летопись цикла</button>
        </section>
      </div>}
      <div className="tg-live-announcement" role="status" aria-live="polite">{announcement}</div>
      <footer className="tg-site-footer"><span>OSGARD PLAY / IMPERIUM OF TIME</span><span>CLIENT-SIDE SIMULATION · LOCAL SAVE</span><a href="/entertainment">ВЫЙТИ В КАТАЛОГ <ArrowUpRight size={12} /></a></footer>
    </main>
  )
}

function Resource({ icon, label, value, hint, tone = 'neutral', meter }: { icon: React.ReactNode; label: string; value: string; hint: string; tone?: string; meter?: number }) {
  return <article className="tg-resource-card"><div className="tg-resource-label"><span>{icon}</span>{label}</div><strong>{value}</strong><div className={'tg-resource-hint tone-' + tone}>{hint}</div>{meter !== undefined && <div className="tg-resource-meter"><span style={{ width: meter + '%' }} /></div>}</article>
}
function Diagnostic({ label, value, description, tone = 'neutral' }: { label: string; value: string; description: string; tone?: 'positive' | 'neutral' | 'negative' }) {
  return <div className={'tg-diagnostic-item tone-' + tone}><span>{label}</span><strong>{value}</strong><small>{description}</small></div>
}
