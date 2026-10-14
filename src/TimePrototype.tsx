import './time.css'
import {
  Activity, ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, CircleHelp, Coins, Expand, Factory, Landmark, Leaf, MapPinned, Minimize2, Play,
  RotateCcw, Save, ShieldAlert, ShieldCheck, Sparkles, TrendingUp, Users, Vote, Waves, Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BUILDINGS, COUNCIL_ACTIONS, POLICIES, applyCouncilAction, buildStructure, createTimeState, getTurnForecast, hasUsedCouncilAction, resolveTimeTurn,
  type BuildingId, type ChronicleEntry, type CouncilActionId, type DistrictId, type PolicyId, type TimeState,
} from './core/timeState'
import { recordOsgardEvent } from './core/eventQueue'
import { completePlayerSession, startPlayerSession } from './core/playerApi'

type Tab = 'council' | 'construction' | 'chronicle'
type MapLayer = 'prosperity' | 'politics' | 'infrastructure'
type QualityMode = 'cinematic' | 'balanced'
type Diagnostics = { fps: number; frameMs: number; frameP95Ms: number; slowFrames: number; fpsHistory: number[]; longTasks: number; longTaskSupported: boolean; tickMs: number; actions: number; save: 'saved' | 'error'; saveMs: number; saveBytes: number; inputLatencyMs: number | null; inputAverageMs: number | null; inputSamples: number; responseLatencyMs: number | null; responseAverageMs: number | null; responseSamples: number; viewportWidth: number; viewportHeight: number; devicePixelRatio: number; logicalCores: number; heapUsedMB: number | null; heapLimitMB: number | null; qualityMode: QualityMode; lastAction: string }

const SAVE_KEY = 'osgard.time.empire.save.v1'
const GUIDE_DISMISSED_KEY = 'osgard.time.empire.guide.dismissed.v1'
const factions = [
  { id: 'guild' as const, name: 'Гильдии мастеров', short: 'ГИЛЬДИИ', mark: 'G', icon: Factory, description: 'Производство и торговля' },
  { id: 'commons' as const, name: 'Горожане', short: 'ГРАЖДАНЕ', mark: 'C', icon: Users, description: 'Благосостояние и налоги' },
  { id: 'senate' as const, name: 'Сенат', short: 'СЕНАТ', mark: 'S', icon: Landmark, description: 'Порядок и легитимность' },
]
const buildingIds: BuildingId[] = ['SOLAR_ARRAY', 'MARKET_HALL', 'ACADEMY', 'CIVIC_FORUM']
const mapLayers: Array<{ id: MapLayer; label: string; description: string }> = [
  { id: 'prosperity', label: 'Процветание', description: 'Уровень развития и благополучия кварталов' },
  { id: 'politics', label: 'Политика', description: 'Поддержка ключевой городской силы' },
  { id: 'infrastructure', label: 'Инфраструктура', description: 'Тип постройки и уровень улучшения' },
]
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
function readBrowserMemory() {
  const measured = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (!measured || !Number.isFinite(measured.usedJSHeapSize) || !Number.isFinite(measured.jsHeapSizeLimit)) return null
  return { usedMB: Number((measured.usedJSHeapSize / 1048576).toFixed(1)), limitMB: Number((measured.jsHeapSizeLimit / 1048576).toFixed(1)) }
}

export function TimePrototype() {
  const [state, setState] = useState<TimeState>(loadSavedState)
  const [tax, setTax] = useState(state.taxRate)
  const [policy, setPolicy] = useState<PolicyId>(state.policy)
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>('forum')
  const [mapLayer, setMapLayer] = useState<MapLayer>('prosperity')
  const [tab, setTab] = useState<Tab>('council')
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [cinematicMap, setCinematicMap] = useState(false)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [guideDismissed, setGuideDismissed] = useState(() => { try { return localStorage.getItem(GUIDE_DISMISSED_KEY) === '1' } catch { return false } })
  const [districtVisited, setDistrictVisited] = useState(false)
  const [planTouched, setPlanTouched] = useState(false)
  const [announcement, setAnnouncement] = useState('Совет ожидает вашего решения.')
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({ fps: 0, frameMs: 0, frameP95Ms: 0, slowFrames: 0, fpsHistory: [], longTasks: 0, longTaskSupported: false, tickMs: 0, actions: 0, save: 'saved', saveMs: 0, saveBytes: 0, inputLatencyMs: null, inputAverageMs: null, inputSamples: 0, responseLatencyMs: null, responseAverageMs: null, responseSamples: 0, viewportWidth: 0, viewportHeight: 0, devicePixelRatio: 1, logicalCores: 0, heapUsedMB: null, heapLimitMB: null, qualityMode: 'cinematic', lastAction: 'Нет подтверждённых действий' })
  const session = useRef<string | null>(null)
  const completed = useRef(false)
  const stateRef = useRef(state)
  const cityPanelRef = useRef<HTMLElement | null>(null)
  const commandPanelRef = useRef<HTMLElement | null>(null)
  const cinematicToggleRef = useRef<HTMLButtonElement | null>(null)
  const mapViewportRef = useRef<HTMLDivElement | null>(null)
  const mapWorldRef = useRef<HTMLDivElement | null>(null)
  const mapPanRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, lastX: 0, lastY: 0, moved: false })
  const diagnosticRef = useRef({ frames: 0, elapsed: 0, start: 0, last: 0, samples: [] as number[], slowFrames: 0, lowFpsWindows: 0, highFpsWindows: 0, qualityMode: 'cinematic' as QualityMode })
  const inputMetricRef = useRef({ samples: 0, totalMs: 0 })

  stateRef.current = state
  const district = state.districts.find((item) => item.id === selectedDistrict) ?? state.districts[0]
  const selectedBuilding = district.building ? BUILDINGS[district.building] : null
  const forecast = useMemo(() => getTurnForecast(state, { taxRate: tax, policy }), [state, tax, policy])
  const allies = factions.filter((faction) => state.approval[faction.id] >= 52).length
  const missionProgress = Math.min(100, Math.round((state.tick / 8) * 100))
  const activeBuildings = state.districts.filter((item) => item.building).length
  const councilActionUsed = hasUsedCouncilAction(state)
  const latestEntries = [...state.archive].reverse().slice(0, 5)
  const fpsHistoryPoints = diagnostics.fpsHistory.map((fps, index, values) => {
    const x = values.length === 1 ? 360 : index / (values.length - 1) * 360
    const y = 43 - (Math.min(120, Math.max(0, fps)) / 120) * 34
    return x.toFixed(1) + ',' + y.toFixed(1)
  }).join(' ')
  const fpsHistoryLatest = diagnostics.fpsHistory[diagnostics.fpsHistory.length - 1] ?? diagnostics.fps
  const fpsHistoryAverage = diagnostics.fpsHistory.length
    ? Math.round(diagnostics.fpsHistory.reduce((sum, value) => sum + value, 0) / diagnostics.fpsHistory.length)
    : 0
  const fpsHistoryLastY = 43 - (Math.min(120, Math.max(0, fpsHistoryLatest)) / 120) * 34

  useEffect(() => {
    let alive = true
    void startPlayerSession('time', { surface: 'time', schemaVersion: 2, entry: 'imperium-of-time' }).then((value) => {
      if (!alive) return
      try { if (window.parent !== window) window.parent.postMessage({ type: 'osgard:game-lifecycle', game: 'time', state: 'started', at: Date.now() }, window.location.origin) } catch { /* embedded lifecycle is optional */ }
      if (!value?.id) return
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
      try { if (window.parent !== window) window.parent.postMessage({ type: 'osgard:game-lifecycle', game: 'time', state: 'completed', at: Date.now() }, window.location.origin) } catch { /* standalone game remains supported */ }
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
    let observer: PerformanceObserver | null = null
    const meter = diagnosticRef.current
    const resetWindow = () => { meter.frames = 0; meter.elapsed = 0; meter.start = 0; meter.last = 0; meter.samples = []; meter.slowFrames = 0; meter.lowFpsWindows = 0; meter.highFpsWindows = 0 }
    const sample = (now: number) => {
      if (!alive || document.visibilityState !== 'visible') return
      if (meter.last > 0) {
        const delta = now - meter.last
        if (Number.isFinite(delta) && delta > 0) {
          meter.frames += 1; meter.elapsed += delta; meter.samples.push(delta)
          if (delta > 25) meter.slowFrames += 1
        }
      }
      meter.last = now
      if (!meter.start) meter.start = now
      if (now - meter.start >= 1000) {
        const duration = now - meter.start
        const fps = Math.round((meter.frames * 1000) / duration)
        const frameMs = meter.samples.length ? meter.elapsed / meter.samples.length : 0
        const sortedSamples = [...meter.samples].sort((a, b) => a - b)
        const p95Index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(sortedSamples.length * 0.95) - 1))
        const frameP95Ms = sortedSamples.length ? sortedSamples[p95Index] : 0
        if (fps < 38) { meter.lowFpsWindows += 1; meter.highFpsWindows = 0; if (meter.lowFpsWindows >= 3) meter.qualityMode = 'balanced' }
        else if (fps >= 52) { meter.highFpsWindows += 1; meter.lowFpsWindows = 0; if (meter.highFpsWindows >= 5) meter.qualityMode = 'cinematic' }
        else { meter.lowFpsWindows = 0; meter.highFpsWindows = 0 }
        const memory = readBrowserMemory()
        setDiagnostics((old) => ({ ...old, fps, frameMs: Number(frameMs.toFixed(1)), frameP95Ms: Number(frameP95Ms.toFixed(1)), slowFrames: meter.slowFrames, qualityMode: meter.qualityMode, heapUsedMB: memory?.usedMB ?? null, heapLimitMB: memory?.limitMB ?? null, fpsHistory: [...old.fpsHistory.slice(-29), fps] }))
        meter.frames = 0; meter.elapsed = 0; meter.samples = []; meter.slowFrames = 0; meter.start = now
      }
      frame = requestAnimationFrame(sample)
    }
    const onVisibility = () => {
      cancelAnimationFrame(frame)
      resetWindow()
      setDiagnostics((old) => ({ ...old, fps: 0, frameMs: 0, frameP95Ms: 0, slowFrames: 0, fpsHistory: [] }))
      if (document.visibilityState === 'visible' && alive) frame = requestAnimationFrame(sample)
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver((list) => { if (list.getEntries().length) setDiagnostics((old) => ({ ...old, longTasks: old.longTasks + list.getEntries().length })) })
        observer.observe({ entryTypes: ['longtask'] })
        setDiagnostics((old) => ({ ...old, longTaskSupported: true }))
      } catch { observer?.disconnect(); observer = null }
    }
    if (document.visibilityState === 'visible') frame = requestAnimationFrame(sample)
    return () => { alive = false; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility); observer?.disconnect() }
  }, [])

  useEffect(() => {
    let alive = true
    const updateEnvironment = () => {
      const memory = readBrowserMemory()
      if (!alive) return
      setDiagnostics((old) => ({
        ...old,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        logicalCores: navigator.hardwareConcurrency || 0,
        heapUsedMB: memory?.usedMB ?? old.heapUsedMB,
        heapLimitMB: memory?.limitMB ?? old.heapLimitMB,
      }))
    }
    const measureInputHandling = (event: Event) => {
      const delay = performance.now() - event.timeStamp
      // Event timestamps and performance.now() share the same high-resolution time origin in modern browsers.
      // Ignore browsers/events that report incompatible timestamps instead of inventing a value.
      if (!Number.isFinite(delay) || delay < 0 || delay > 1000) return
      inputMetricRef.current.samples += 1
      inputMetricRef.current.totalMs += delay
      const inputSamples = inputMetricRef.current.samples
      setDiagnostics((old) => ({
        ...old,
        inputLatencyMs: Number(delay.toFixed(2)),
        inputAverageMs: Number((inputMetricRef.current.totalMs / inputSamples).toFixed(2)),
        inputSamples,
      }))
    }
    updateEnvironment()
    window.addEventListener('resize', updateEnvironment, { passive: true })
    document.addEventListener('pointerdown', measureInputHandling, { capture: true, passive: true })
    document.addEventListener('keydown', measureInputHandling, { capture: true })
    return () => {
      alive = false
      window.removeEventListener('resize', updateEnvironment)
      document.removeEventListener('pointerdown', measureInputHandling, true)
      document.removeEventListener('keydown', measureInputHandling, true)
    }
  }, [])

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'Escape') {
        if (cinematicMap) { setCinematicMap(false); cinematicToggleRef.current?.focus() }
        else setDiagnosticsOpen(false)
        return
      }
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      if (event.key === '1') setTab('council')
      if (event.key === '2') setTab('construction')
      if (event.key === '3') setTab('chronicle')
      if (event.key === '+' || event.key === '=') adjustMapZoom(0.06)
      if (event.key === '-') adjustMapZoom(-0.06)
      if (event.key === '0') resetMapView()
    }
    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [cinematicMap, mapZoom])

  useEffect(() => {
    if (!cinematicMap) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => cinematicToggleRef.current?.focus())
    return () => { document.body.style.overflow = previousOverflow; cancelAnimationFrame(focusFrame) }
  }, [cinematicMap])

  function adjustMapZoom(delta: number) {
    const nextZoom = Number(Math.max(0.86, Math.min(1.24, mapZoom + delta)).toFixed(2))
    const bounds = mapViewportRef.current?.getBoundingClientRect()
    const maxX = bounds ? Math.max(0, (nextZoom - 1) * bounds.width / 2) : 0
    const maxY = bounds ? Math.max(0, (nextZoom - 1) * bounds.height / 2) : 0
    setMapZoom(nextZoom)
    setMapOffset((current) => ({
      x: Math.max(-maxX, Math.min(maxX, current.x)),
      y: Math.max(-maxY, Math.min(maxY, current.y)),
    }))
  }

  function resetMapView() {
    setMapZoom(1)
    setMapOffset({ x: 0, y: 0 })
    mapPanRef.current.pointerId = -1
    mapPanRef.current.moved = false
    if (mapViewportRef.current) mapViewportRef.current.dataset.mapPanning = 'false'
  }

  function beginMapPan(event: React.PointerEvent<HTMLDivElement>) {
    if (mapZoom <= 1.02 || event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button')) return
    const pan = mapPanRef.current
    if (pan.pointerId !== -1) return
    pan.pointerId = event.pointerId
    pan.startX = event.clientX
    pan.startY = event.clientY
    pan.originX = mapOffset.x
    pan.originY = mapOffset.y
    pan.lastX = mapOffset.x
    pan.lastY = mapOffset.y
    pan.moved = false
  }

  function moveMapPan(event: React.PointerEvent<HTMLDivElement>) {
    const pan = mapPanRef.current
    if (pan.pointerId !== event.pointerId) return
    const deltaX = event.clientX - pan.startX
    const deltaY = event.clientY - pan.startY
    if (!pan.moved && Math.hypot(deltaX, deltaY) < 5) return
    if (!pan.moved) {
      pan.moved = true
      event.currentTarget.dataset.mapPanning = 'true'
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* capture can fail when pointer already left */ }
    }
    const bounds = mapViewportRef.current?.getBoundingClientRect()
    const maxX = bounds ? Math.max(0, (mapZoom - 1) * bounds.width / 2) : 0
    const maxY = bounds ? Math.max(0, (mapZoom - 1) * bounds.height / 2) : 0
    pan.lastX = Math.max(-maxX, Math.min(maxX, pan.originX + deltaX))
    pan.lastY = Math.max(-maxY, Math.min(maxY, pan.originY + deltaY))
    if (mapWorldRef.current) mapWorldRef.current.style.transform = 'translate3d(' + pan.lastX + 'px, ' + pan.lastY + 'px, 0) scale(' + mapZoom + ')'
  }

  function finishMapPan(event: React.PointerEvent<HTMLDivElement>) {
    const pan = mapPanRef.current
    if (pan.pointerId !== event.pointerId) return
    if (pan.moved) setMapOffset({ x: pan.lastX, y: pan.lastY })
    pan.pointerId = -1
    event.currentTarget.dataset.mapPanning = 'false'
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* capture may already be released */ }
  }

  function blockClickAfterMapPan(event: React.MouseEvent<HTMLDivElement>) {
    if (!mapPanRef.current.moved) return
    event.preventDefault()
    event.stopPropagation()
    mapPanRef.current.moved = false
  }

  function handleMapWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    adjustMapZoom(event.deltaY < 0 ? 0.06 : -0.06)
  }

  function measureUiResponse(actionStartedAt: number) {
    // Two animation frames approximate handler-to-render progress; this is not physical pixel-on-glass latency.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const measured = Number((performance.now() - actionStartedAt).toFixed(2))
        setDiagnostics((old) => {
          const samples = old.responseSamples + 1
          const average = ((old.responseAverageMs ?? 0) * old.responseSamples + measured) / samples
          return { ...old, responseLatencyMs: measured, responseAverageMs: Number(average.toFixed(2)), responseSamples: samples }
        })
      })
    })
  }

  function applyTurn() {
    if (state.status !== 'ACTIVE') return
    const start = performance.now()
    try {
      const next = resolveTimeTurn(state, { taxRate: tax, policy })
      const elapsed = Number((performance.now() - start).toFixed(2))
      setDiagnostics((old) => ({ ...old, tickMs: elapsed, actions: old.actions + 1, lastAction: 'Продвижение такта' }))
      setState(next)
      setAnnouncement(next.archive[next.archive.length - 1]?.detail ?? next.lastAction)
      recordOsgardEvent('portal_opened', { game: 'time', action: 'RESOLVE_TURN', taxRate: tax, policy, tick: next.tick, calcMs: elapsed })
      measureUiResponse(start)
      if (next.status === 'COLLAPSED') setTab('chronicle')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'Не удалось рассчитать ход.')
    }
  }

  function applyDecree(actionId: CouncilActionId) {
    if (state.status !== 'ACTIVE' || councilActionUsed) return
    const start = performance.now()
    try {
      const next = applyCouncilAction(state, actionId, district.id)
      const elapsed = Number((performance.now() - start).toFixed(2))
      setDiagnostics((old) => ({ ...old, tickMs: elapsed, actions: old.actions + 1, lastAction: 'Указ Совета: ' + actionId }))
      setState(next)
      setAnnouncement(next.lastConsequence)
      recordOsgardEvent('portal_opened', { game: 'time', action: 'COUNCIL_DECREE', decree: actionId, district: district.id, treasury: next.treasury, calcMs: elapsed })
      measureUiResponse(start)
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'Указ не удалось исполнить.')
    }
  }

  function build(buildingId: BuildingId) {
    if (state.status !== 'ACTIVE') return
    const start = performance.now()
    try {
      const next = buildStructure(state, district.id, buildingId)
      const elapsed = Number((performance.now() - start).toFixed(2))
      setDiagnostics((old) => ({ ...old, tickMs: elapsed, actions: old.actions + 1, lastAction: 'Строительство: ' + BUILDINGS[buildingId].name }))
      setState(next)
      setAnnouncement(next.lastConsequence)
      recordOsgardEvent('portal_opened', { game: 'time', action: 'BUILD', district: district.id, building: buildingId, level: next.districts.find((item) => item.id === district.id)?.buildingLevel ?? 0, calcMs: elapsed })
      measureUiResponse(start)
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
    setMapLayer('prosperity')
    resetMapView()
    setTab('council')
    setDiagnostics((old) => ({ ...old, tickMs: 0, actions: 0, lastAction: 'Начата новая партия' }))
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

  function exportDiagnostics() {
    try {
      const memory = readBrowserMemory()
      const report = {
        format: 'OSGARD_IMPERIUM_RUNTIME_DIAGNOSTICS',
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        note: 'Browser-local measurements. FPS/latency vary by device, tab visibility and current workload; unavailable browser APIs are null.',
        game: {
          status: state.status,
          year: state.year,
          tick: state.tick,
          taxRate: state.taxRate,
          policy: state.policy,
          treasury: state.treasury,
          energy: state.energy,
          stability: state.stability,
          population: state.population,
          score: state.score,
          selectedDistrict,
          approval: state.approval,
          districts: state.districts.map((item) => ({ id: item.id, prosperity: item.prosperity, population: item.population, building: item.building, buildingLevel: item.buildingLevel })),
        },
        runtime: {
          ...diagnostics,
          fpsHistory: [...diagnostics.fpsHistory],
          currentRenderQuality: diagnostics.qualityMode,
          currentAction: diagnostics.lastAction,
        },
        environment: {
          viewportCssPixels: { width: window.innerWidth, height: window.innerHeight },
          effectiveDisplayPixels: { width: Math.round(window.innerWidth * (window.devicePixelRatio || 1)), height: Math.round(window.innerHeight * (window.devicePixelRatio || 1)) },
          devicePixelRatio: window.devicePixelRatio || 1,
          browserReportedLogicalCores: navigator.hardwareConcurrency || null,
          jsHeap: memory ? { usedMB: memory.usedMB, limitMB: memory.limitMB } : null,
          reducedMotionPreference: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          visibility: document.visibilityState,
        },
      }
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'osgard-imperium-diagnostics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setAnnouncement('Диагностический отчёт сохранён на этом устройстве. В нём указаны реальные замеры браузера и состояние текущей партии.')
      recordOsgardEvent('portal_opened', { game: 'time', action: 'EXPORT_DIAGNOSTICS', tick: state.tick, quality: diagnostics.qualityMode, actions: diagnostics.actions })
    } catch {
      setAnnouncement('Не удалось сформировать отчёт. Проверьте, что браузер разрешает локальное скачивание файлов.')
    }
  }

  const chooseDistrict = (id: DistrictId) => {
    setSelectedDistrict(id)
    setDistrictVisited(true)
    const target = state.districts.find((item) => item.id === id)
    if (target) setAnnouncement(target.name + ' — ' + target.description)
  }

  const active = state.status === 'ACTIVE'
  const showFirstTurnGuide = state.tick === 0 && !guideDismissed

  return (
    <main className={'time-game' + (cinematicMap ? ' is-cinematic-view' : '')} data-render-quality={diagnostics.qualityMode}>
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

      {showFirstTurnGuide && <section className="tg-start-guide" aria-labelledby="tgGuideTitle">
        <div className="tg-guide-head"><div><span className="tg-overline">FIRST TURN / КРАТКОЕ ОБУЧЕНИЕ</span><h2 id="tgGuideTitle">Первый такт — три решения</h2></div><button type="button" className="tg-guide-dismiss" onClick={() => { setGuideDismissed(true); try { localStorage.setItem(GUIDE_DISMISSED_KEY, '1') } catch { /* optional */ } }}>СКРЫТЬ <span aria-hidden="true">×</span></button></div>
        <div className="tg-guide-steps">
          <button type="button" className={'tg-guide-step ' + (districtVisited ? 'is-complete' : '')} onClick={() => cityPanelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })}><span className="tg-guide-index">01</span><span className="tg-guide-copy"><strong>Осмотрите районы</strong><small>Нажмите на участок карты и изучите его состояние.</small></span><span className="tg-guide-state">{districtVisited ? 'ГОТОВО ✓' : 'КАРТА'}</span></button>
          <button type="button" className={'tg-guide-step ' + (planTouched ? 'is-complete' : '')} onClick={() => { setTab('council'); commandPanelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }) }}><span className="tg-guide-index">02</span><span className="tg-guide-copy"><strong>Задайте курс</strong><small>Измените налог или выберите один из четырёх курсов.</small></span><span className="tg-guide-state">{planTouched ? 'ГОТОВО ✓' : 'СОВЕТ'}</span></button>
          <button type="button" className="tg-guide-step" onClick={() => { setTab('council'); commandPanelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }) }}><span className="tg-guide-index">03</span><span className="tg-guide-copy"><strong>Запустите такт</strong><small>Проверьте прогноз и нажмите «Продвинуть время».</small></span><span className="tg-guide-state">ХОД →</span></button>
        </div><div className="tg-guide-foot"><span>Постройки необязательны, но меняют будущие расчёты.</span><span>{Number(districtVisited) + Number(planTouched)} / 2 ПОДГОТОВЛЕНО</span></div>
      </section>}

      {diagnosticsOpen && <section className="tg-diagnostics" aria-label="Диагностика производительности">
        <div className="tg-diagnostic-title"><Activity size={15} /><div><strong>ДИАГНОСТИКА RUNTIME</strong><small>Измерения этого браузера, обновляются в реальном времени</small></div><span className="tg-quality-pill" data-quality={diagnostics.qualityMode}>{diagnostics.qualityMode === 'cinematic' ? 'CINEMATIC' : 'BALANCED AUTO'}</span><span className="tg-live-pill">LIVE</span><button type="button" className="tg-diagnostic-export" onClick={exportDiagnostics}><Save size={12} /> ЭКСПОРТ JSON</button></div>
        <div className="tg-diagnostic-grid">
          <Diagnostic label="Частота кадров" value={diagnostics.fps ? String(diagnostics.fps) + ' FPS' : '…'} description="Измерение requestAnimationFrame" tone={diagnostics.fps >= 50 ? 'positive' : diagnostics.fps >= 30 ? 'neutral' : 'negative'} />
          <Diagnostic label="Интервал кадра" value={diagnostics.frameMs ? diagnostics.frameMs + ' мс' : '…'} description="Среднее за последнюю секунду" tone={diagnostics.frameMs > 32 ? 'negative' : 'positive'} />
          <Diagnostic label="P95 кадра" value={diagnostics.frameP95Ms ? diagnostics.frameP95Ms + ' мс' : '…'} description="95% интервалов не выше" tone={diagnostics.frameP95Ms > 32 ? 'negative' : diagnostics.frameP95Ms > 20 ? 'neutral' : 'positive'} />
          <Diagnostic label="Медленные кадры" value={String(diagnostics.slowFrames)} description="Интервал свыше 25 мс за секунду" tone={diagnostics.slowFrames > 4 ? 'negative' : 'positive'} />
          <Diagnostic label="Долгие задачи" value={diagnostics.longTaskSupported ? String(diagnostics.longTasks) : 'Н/Д'} description={diagnostics.longTaskSupported ? 'Основной поток дольше 50 мс' : 'Браузер не поддерживает API'} tone={diagnostics.longTaskSupported && diagnostics.longTasks > 0 ? 'negative' : 'neutral'} />
          <Diagnostic label="Расчёт действия" value={diagnostics.actions ? diagnostics.tickMs.toFixed(2) + ' мс' : '—'} description="Последняя симуляция / стройка" tone={diagnostics.tickMs > 50 ? 'negative' : 'positive'} />
          <Diagnostic label="Запись сохранения" value={diagnostics.saveMs ? diagnostics.saveMs.toFixed(2) + ' мс' : '…'} description="Измеренная длительность localStorage" tone={diagnostics.saveMs > 16 ? 'negative' : 'positive'} />
          <Diagnostic label="Размер сохранения" value={diagnostics.saveBytes ? (diagnostics.saveBytes / 1024).toFixed(1) + ' КБ' : '…'} description="Фактический размер JSON в UTF-8" />
          <Diagnostic label="Действия" value={String(diagnostics.actions)} description="Успешные локальные команды" />
          <Diagnostic label="Обработка ввода" value={diagnostics.inputLatencyMs === null ? '—' : diagnostics.inputLatencyMs.toFixed(2) + ' мс'} description="Событие браузера → обработчик JS; не сетевой ping" tone={diagnostics.inputLatencyMs !== null && diagnostics.inputLatencyMs > 50 ? 'negative' : 'neutral'} />
          <Diagnostic label="Отклик интерфейса" value={diagnostics.responseLatencyMs === null ? '—' : diagnostics.responseLatencyMs.toFixed(1) + ' мс'} description={'Среднее ' + (diagnostics.responseAverageMs === null ? '—' : diagnostics.responseAverageMs.toFixed(1) + ' мс') + ' · обработчик → второй requestAnimationFrame, не измерение фотона'} tone={diagnostics.responseLatencyMs !== null && diagnostics.responseLatencyMs > 100 ? 'negative' : diagnostics.responseLatencyMs !== null && diagnostics.responseLatencyMs > 50 ? 'neutral' : 'positive'} />
          <Diagnostic label="Размер рабочей области" value={diagnostics.viewportWidth ? diagnostics.viewportWidth + ' × ' + diagnostics.viewportHeight : '…'} description={'CSS-пиксели · DPR ' + diagnostics.devicePixelRatio.toFixed(2)} />
          <Diagnostic label="Память JS" value={diagnostics.heapUsedMB === null ? 'Н/Д' : diagnostics.heapUsedMB + ' МБ'} description={diagnostics.heapLimitMB === null ? 'Браузер не предоставляет memory API' : 'Доступный предел JS heap: ' + diagnostics.heapLimitMB + ' МБ'} tone={diagnostics.heapUsedMB !== null && diagnostics.heapLimitMB !== null && diagnostics.heapUsedMB / diagnostics.heapLimitMB > 0.8 ? 'negative' : 'neutral'} />
          <Diagnostic label="Логические потоки" value={diagnostics.logicalCores ? String(diagnostics.logicalCores) : 'Н/Д'} description="Значение, сообщённое браузером" />
        </div>
        <div className="tg-diagnostic-foot"><span>ПОСЛЕДНЯЯ КОМАНДА</span><strong>{diagnostics.lastAction}</strong><span>УСРЕДНЕНИЕ ОБРАБОТКИ ВВОДА: {diagnostics.inputAverageMs === null ? '—' : diagnostics.inputAverageMs.toFixed(2) + ' мс'} · ВЫБОРКА {diagnostics.inputSamples}</span></div>
        <div className="tg-diagnostic-trend">
          <div className="tg-diagnostic-trend-head">
            <div><span>FRAME RATE / FOREGROUND</span><small>Последние 30 секундных замеров · фоновые паузы исключены</small></div>
            <div className="tg-diagnostic-trend-stat"><strong>{fpsHistoryAverage ? fpsHistoryAverage + ' FPS' : '—'}</strong><span>СРЕДНЕЕ</span></div>
          </div>
          <svg viewBox="0 0 360 48" preserveAspectRatio="none" role="img" aria-label={diagnostics.fpsHistory.length ? 'Измеренный FPS за последние ' + diagnostics.fpsHistory.length + ' секунд активной вкладки. Последнее значение: ' + fpsHistoryLatest + ' FPS.' : 'График появится после начала измерений'}>
            <path className="tg-diagnostic-gridline" d="M0 9H360 M0 26H360 M0 43H360" />
            <path className="tg-diagnostic-target" d="M0 26H360" />
            {diagnostics.fpsHistory.length > 1 && <polyline className="tg-diagnostic-line" points={fpsHistoryPoints} />}
            {diagnostics.fpsHistory.length > 0 && <circle className="tg-diagnostic-last-point" cx="360" cy={fpsHistoryLastY} r="3" />}
          </svg>
          <div className="tg-diagnostic-trend-foot"><span>0 FPS</span><span>ОРИЕНТИР: 60 FPS / 16,7 МС</span><span>120 FPS</span><span>{diagnostics.fpsHistory.length}/30</span></div>
        </div>
      </section>}

      <div className="tg-play-grid">
        <section ref={cityPanelRef} id="tgCityPanel" className={'tg-city-panel' + (cinematicMap ? ' is-cinematic' : '')} aria-label={cinematicMap ? 'Кинематографический атлас города' : 'Карта города'} role={cinematicMap ? 'dialog' : undefined} aria-modal={cinematicMap ? true : undefined}>
          <div className="tg-panel-head">
            <div><span className="tg-overline">ATLAS / URBS IX</span><h2>Живая карта</h2></div>
            <div className="tg-map-controls">
              <button type="button" aria-label="Уменьшить карту" onClick={() => adjustMapZoom(-0.06)}>−</button>
              <button className="tg-zoom-reset" type="button" aria-label="Сбросить положение и масштаб карты" title="Сбросить положение и масштаб карты" onClick={resetMapView}>{Math.round(mapZoom * 100)}%</button>
              <button type="button" aria-label="Увеличить карту" onClick={() => adjustMapZoom(0.06)}>+</button>
              <button ref={cinematicToggleRef} className="tg-cinema-button" type="button" aria-label={cinematicMap ? 'Выйти из кинематографического вида карты' : 'Открыть кинематографический вид карты'} aria-pressed={cinematicMap} title={cinematicMap ? 'Закрыть кинематографический вид (Esc)' : 'Кинематографический вид карты'} onClick={() => setCinematicMap((value) => !value)}>{cinematicMap ? <Minimize2 size={15} /> : <Expand size={15} />}</button>
            </div>
          </div>
          <div className="tg-map-layers" role="group" aria-label="Слой данных городской карты">
            <span className="tg-map-layers-label">АТЛАС / СЛОЙ</span>
            {mapLayers.map((layer) => <button key={layer.id} type="button" aria-pressed={mapLayer === layer.id} title={layer.description} onClick={() => setMapLayer(layer.id)}>
              {layer.id === 'prosperity' ? <TrendingUp size={13} /> : layer.id === 'politics' ? <Users size={13} /> : <Building2 size={13} />}
              <span>{layer.label}</span>
            </button>)}
          </div>
          <div ref={mapViewportRef} className="tg-map-viewport" data-map-zoomed={mapZoom > 1.02 ? 'true' : 'false'} data-map-panning="false" onPointerDown={beginMapPan} onPointerMove={moveMapPan} onPointerUp={finishMapPan} onPointerCancel={finishMapPan} onClickCapture={blockClickAfterMapPan} onWheel={handleMapWheel} aria-label="Атлас города. Выберите район касанием или мышью; увеличенную карту можно перетаскивать." data-city-status={state.status} data-city-tick={state.tick} data-city-energy={state.energy < 25 ? 'critical' : state.energy < 55 ? 'strained' : 'stable'} data-city-stability={state.stability < 25 ? 'critical' : state.stability < 55 ? 'strained' : 'stable'} data-city-treasury={state.treasury <= 0 ? 'critical' : state.treasury < 1000 ? 'strained' : 'stable'} data-city-support={allies < 1 ? 'critical' : allies < 2 ? 'strained' : 'stable'} data-city-layer={mapLayer}>
            <div ref={mapWorldRef} className="tg-map-world" style={{ transform: 'translate3d(' + mapOffset.x + 'px, ' + mapOffset.y + 'px, 0) scale(' + mapZoom + ')' }}>
              <svg className="tg-city-map" viewBox="0 0 840 520" role="img" aria-label="Схематическая карта четырёх районов имперского города">
                <defs>
                  <linearGradient id="tgLand" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#17252b" /><stop offset="100%" stopColor="#0b1119" /></linearGradient>
                  <linearGradient id="tgGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8d7a6" /><stop offset="100%" stopColor="#8c6b36" /></linearGradient>
                  <radialGradient id="tgGlow"><stop offset="0%" stopColor="#d9bd79" stopOpacity=".32" /><stop offset="100%" stopColor="#d9bd79" stopOpacity="0" /></radialGradient>
                  <pattern id="tgGrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#9ab3b0" strokeOpacity=".09" strokeWidth=".7" /></pattern>
                  <filter id="tgBloom"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="tgHorizon" x1="0" y1="0" x2="0.12" y2="1"><stop offset="0%" stopColor="#1e3138" /><stop offset="52%" stopColor="#101d24" /><stop offset="100%" stopColor="#091116" /></linearGradient>
                <radialGradient id="tgAurora" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#a3d8c1" stopOpacity=".28" /><stop offset="38%" stopColor="#8bb7ad" stopOpacity=".09" /><stop offset="100%" stopColor="#0b141a" stopOpacity="0" /></radialGradient>
                <linearGradient id="tgCanalDepth" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1e5555" /><stop offset="48%" stopColor="#112f39" /><stop offset="100%" stopColor="#081820" /></linearGradient>
                <pattern id="tgBlockTexture" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 18 0M-4 4 4 -4M14 22 22 14" stroke="#8aa8a0" strokeOpacity=".035" strokeWidth="1" /></pattern>
                </defs>
                <rect width="840" height="520" fill="#0a1116" />
                <rect width="840" height="520" fill="url(#tgHorizon)" opacity=".62" />
                <rect width="840" height="520" fill="url(#tgGrid)" />
                <rect width="840" height="520" fill="url(#tgBlockTexture)" />
                <ellipse className="tg-map-aurora" cx="420" cy="82" rx="390" ry="190" fill="url(#tgAurora)" />
                <path className="tg-map-ridge" d="M0 170 48 141 81 151 124 106 162 130 204 91 245 132 291 103 328 125 376 79 412 111 458 75 501 120 552 94 590 124 644 89 694 123 739 106 794 151 840 127V0H0Z" fill="#132329" opacity=".42" />
                <g className="tg-map-contours" fill="none" aria-hidden="true"><path d="M-30 220C82 152 161 171 240 214S394 269 477 205 639 149 870 215" /><path d="M-24 238C92 171 160 191 244 233S396 289 486 222 645 173 865 237" /><path d="M-30 458C92 394 165 424 240 455S392 498 477 442 647 399 871 461" /></g>
                <g className="tg-city-stars" aria-hidden="true">
                  {Array.from({ length: 52 }, (_, i) => {
                    const x = (i * 131 + 37) % 820 + 10
                    const y = (i * 71 + 23) % 500 + 10
                    return <circle key={i} cx={x} cy={y} r={i % 8 === 0 ? 1.2 : 0.55} fill={i % 5 === 0 ? '#e3d19b' : '#9ccfc2'} opacity={i % 6 === 0 ? '.72' : '.28'} />
                  })}
                </g>
                <ellipse cx="432" cy="266" rx="315" ry="240" fill="url(#tgGlow)" opacity=".45" />
                <path d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#4a9889" strokeWidth="48" opacity=".08" />
                <path d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="url(#tgCanalDepth)" strokeWidth="36" opacity=".9" />
                <path className="tg-water-bank" d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#7da898" strokeWidth="1.8" strokeDasharray="3 8" opacity=".52" />
                <path d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#54746e" strokeWidth="1.4" strokeDasharray="8 7" opacity=".58" />
                <path className="tg-water-shimmer" d="M-20 350 C135 305 176 402 317 344 S551 193 867 230" fill="none" stroke="#a0d6c3" strokeWidth="1.2" strokeDasharray="2 42 14 75" opacity=".8" />
                <g className="tg-city-walls" fill="none" aria-hidden="true"><path d="M82 187 113 116 219 77 314 61 402 79 476 45 573 62 674 105 761 188 789 278 749 377 671 440 567 478 455 487 351 477 247 492 143 451 82 368 59 273Z" stroke="#cbb57d" strokeWidth="8" strokeOpacity=".035" /><path d="M82 187 113 116 219 77 314 61 402 79 476 45 573 62 674 105 761 188 789 278 749 377 671 440 567 478 455 487 351 477 247 492 143 451 82 368 59 273Z" stroke="#b9c7ae" strokeWidth="1.2" strokeOpacity=".25" strokeDasharray="2 9" /></g>
                <g className="tg-city-streets" fill="none" aria-hidden="true"><path d="M68 101 160 78 234 95 305 65 397 72 470 54 569 65 651 99 720 149 777 219" stroke="#d6c38c" strokeWidth="5" strokeOpacity=".025" /><path d="M86 218 174 238 257 227 333 264 418 250 504 281 601 271 734 315" stroke="#a2d0c0" strokeWidth="4" strokeOpacity=".035" /></g>
                <g fill="none" stroke="#a4a77c" strokeOpacity=".20" strokeWidth="2">
                  <path d="M68 101 160 78 234 95 305 65 397 72 470 54 569 65 651 99 720 149 777 219" />
                  <path d="M86 218 174 238 257 227 333 264 418 250 504 281 601 271 734 315" />
                  <path d="M119 451 203 423 284 445 367 416 449 432 534 412 621 435 700 409 780 384" />
                  <path d="M194 41 211 118 238 190 230 274 255 355 263 479" />
                  <path d="M380 36 371 120 399 196 382 277 409 355 398 486" />
                  <path d="M566 45 544 121 579 205 560 287 587 360 581 481" />
                  <path d="M703 115 654 178 668 256 700 333 668 425" />
                </g>
                <g className="tg-city-lights" aria-hidden="true">{Array.from({ length: 64 }, (_, i) => { const angle = ((i * 137.508) % 360) * Math.PI / 180; const radius = 112 + (i % 9) * 19; const x = 420 + Math.cos(angle) * radius * 1.45; const y = 260 + Math.sin(angle) * radius * .77; if (x < 12 || x > 828 || y < 14 || y > 506) return null; const bright = i % 9 === 0; return <g key={i} className={'tg-city-light ' + (bright ? 'is-bright' : '')}><circle cx={x} cy={y} r={bright ? 1.65 : .8} fill={i % 4 === 0 ? '#e5d19b' : '#8fc7ad'} opacity={bright ? '.86' : '.44'} />{bright && <circle className="tg-city-light-halo" cx={x} cy={y} r="4.5" fill="#d9c28b" />}</g> })}</g>
                <g className="tg-canal-bridges" aria-hidden="true"><path d="M174 358Q195 347 216 365" fill="none" stroke="#071116" strokeWidth="17" strokeLinecap="round" /><path d="M174 358Q195 347 216 365" fill="none" stroke="#b5a879" strokeWidth="7" strokeLinecap="round" strokeOpacity=".55" /><path d="M379 315Q396 299 414 298" fill="none" stroke="#071116" strokeWidth="15" strokeLinecap="round" /><path d="M379 315Q396 299 414 298" fill="none" stroke="#b5a879" strokeWidth="6" strokeLinecap="round" strokeOpacity=".5" /></g>
                <g fill="url(#tgLand)" stroke="#8fa098" strokeOpacity=".30" strokeWidth="1.4">
                  <path d={districts[0].points} />
                  <path d={districts[1].points} />
                  <path d={districts[2].points} />
                  <path d={districts[3].points} />
                </g>
                {districts.map((shape) => {
                  const item = state.districts.find((d) => d.id === shape.id)!
                  const isSelected = selectedDistrict === shape.id
                  const politicalSignal = shape.id === 'foundry' ? state.approval.guild :
                    shape.id === 'commons' ? state.approval.commons : shape.id === 'forum' ? state.approval.senate :
                    Math.round((state.approval.guild + state.approval.commons + state.approval.senate) / 3)
                  const mapSignal = mapLayer === 'politics' ? politicalSignal :
                    mapLayer === 'infrastructure' ? (item.building ? item.buildingLevel * 100 / 3 : 0) : item.prosperity
                  const structureColors: Record<BuildingId, string> = {
                    SOLAR_ARRAY: '#7ec6b2', MARKET_HALL: '#d9c28b', ACADEMY: '#a8bfe3', CIVIC_FORUM: '#f0dfad',
                  }
                  const mapColor = mapLayer === 'infrastructure'
                    ? item.building ? structureColors[item.building] : '#52636b'
                    : mapSignal < 35 ? '#d98473' : mapSignal >= 65 ? '#8fc7ad' : '#d8bd7b'
                  const mapMetric = mapLayer === 'infrastructure'
                    ? item.building ? 'LVL ' + item.buildingLevel + '/3' : 'EMPTY'
                    : Math.round(mapSignal) + '%'
                  const mapMetricLabel = mapLayer === 'prosperity' ? 'PROSPERITY' : mapLayer === 'politics'
                    ? shape.id === 'foundry' ? 'GUILD SUPPORT' : shape.id === 'commons' ? 'CIVIC SUPPORT' : shape.id === 'forum' ? 'SENATE SUPPORT' : 'CITY SUPPORT'
                    : 'INFRASTRUCTURE'
                  return <g key={shape.id} className={'tg-map-district ' + (isSelected ? 'is-selected' : '')} role="button" tabIndex={0} aria-label={item.name + ', процветание ' + item.prosperity + '%'} aria-pressed={isSelected} onClick={() => chooseDistrict(shape.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseDistrict(shape.id) } }}>
                    <circle className="tg-district-heat" cx={shape.markerX} cy={shape.markerY} r={31 + Math.round(mapSignal / 5)} fill={mapColor} fillOpacity={isSelected ? '.22' : mapSignal > 0 ? '.055' : '.025'} />
                    <polygon points={shape.points} fill={mapColor} fillOpacity={isSelected ? '.14' : mapLayer === 'infrastructure' && !item.building ? '.018' : '.045'} stroke={isSelected ? '#ecdca7' : mapColor} strokeWidth={isSelected ? '2.1' : '1'} strokeOpacity={isSelected ? '.95' : '.55'} />
                    {isSelected && <circle className="tg-selection-ring" cx={shape.markerX} cy={shape.markerY} r="62" />}
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
                    <text x={shape.labelX} y={shape.labelY + 17} textAnchor="middle" fill={isSelected ? '#c2d8cc' : '#93a6a1'} fontSize="8" fontFamily="monospace" letterSpacing=".3">{mapMetricLabel} / {mapMetric}</text>
                    {isSelected && <circle cx={shape.markerX} cy={shape.markerY} r="53" fill="url(#tgGlow)" filter="url(#tgBloom)" />}
                  </g>
                })}
                <g className="tg-city-citadel" transform="translate(420 265)">
                  <circle className="tg-citadel-orbit" r="78" fill="none" stroke="#d9c28b" strokeOpacity=".18" strokeWidth=".8" strokeDasharray="2 8" />
                  <circle r="64" fill="#0b1217" stroke="#cfb77b" strokeOpacity=".45" strokeWidth="1.5" />
                  <circle r="52" fill="none" stroke="#e6d3a0" strokeOpacity=".32" strokeDasharray="2 5" />
                  <circle className="tg-citadel-pulse" r="45" fill="none" stroke="#a3d8c1" strokeOpacity=".3" strokeWidth=".7" />
                  <circle r="37" fill="url(#tgGlow)" />
                  <path d="M0 -26 17 -16V5L0 25-17 5V-16Z" fill="#18272b" stroke="url(#tgGold)" strokeWidth="1.4" />
                  <path d="M-8 1 0 -13 8 1 0 12Z" fill="#d1b675" fillOpacity=".82" />
                  <text x="0" y="43" textAnchor="middle" fill="#e4d4aa" fontSize="8" fontFamily="monospace" letterSpacing="1.5">IMPERIUM</text>
                </g>
                <path className="tg-signal-path" d="M420 265 Q370 205 286 209 T542 181 T594 404" fill="none" stroke="#e2c884" strokeWidth="1" strokeDasharray="4 9" opacity=".56" />
                <g className="tg-city-traffic" aria-hidden="true">
                  <circle r="2.5" fill="#f0dfad"><animateMotion dur="14s" repeatCount="indefinite" path="M82 196 C178 140 250 226 340 210 S500 168 642 246" /></circle>
                  <circle r="2" fill="#8ff0d0"><animateMotion dur="19s" begin="-7s" repeatCount="indefinite" path="M118 369 C204 302 293 368 388 328 S553 280 710 341" /></circle>
                  <circle r="1.8" fill="#f0dfad"><animateMotion dur="23s" begin="-13s" repeatCount="indefinite" path="M224 89 C282 165 333 186 420 265 S562 355 657 435" /></circle>
                  <circle r="1.6" fill="#8ff0d0"><animateMotion dur="17s" begin="-4s" repeatCount="indefinite" path="M739 157 C639 190 570 216 521 253 S390 331 284 421" /></circle>
                </g>
                <g className="tg-map-compass" transform="translate(783 61)"><circle r="22" fill="#10191f" stroke="#7c938a" strokeOpacity=".45" /><path d="M0 -16 6 4 0 0-6 4Z" fill="#d7c28f" /><text x="0" y="34" fill="#9aaca6" fontSize="8" textAnchor="middle">N</text></g>
              </svg>
            </div>
            <div className="tg-map-impact" key={[state.tick, state.treasury, state.energy, state.stability, state.approval.guild, state.approval.commons, state.approval.senate, state.districts.map((item) => item.buildingLevel).join('-')].join(':')} aria-hidden="true"><span /></div>
            <div className="tg-map-key">
              <span><i className="key-selected" /> ВЫБРАННЫЙ РАЙОН</span>
              <span><i className="key-built" /> ПОСТРОЙКА</span>
              <span className="tg-map-layer-legend"><i style={{ background: mapLayer === 'infrastructure' ? '#7ec6b2' : mapLayer === 'politics' ? '#d9c28b' : '#8fc7ad' }} /> {mapLayer === 'prosperity' ? 'ПРОЦВЕТАНИЕ' : mapLayer === 'politics' ? 'ПОДДЕРЖКА ФРАКЦИЙ' : 'УРОВЕНЬ И ТИП ЗДАНИЯ'}</span>
              <span className="tg-map-shortcuts">КЛАВИШИ: 1–3 · +/− · 0</span>
              <span className="tg-map-pan-hint">DRAG · CTRL + КОЛЕСО</span>
              <span className="tg-map-coordinates">CITY IX / {district.id.toUpperCase()} / {String(state.tick).padStart(2, '0')}</span>
            </div>
          </div>
          <div className="tg-selected-district">
            <div className="tg-district-index"><MapPinned size={15} /><span>РАЙОН / {String(state.districts.findIndex((item) => item.id === district.id) + 1).padStart(2, '0')}</span></div>
            <div className="tg-district-main"><div><h3>{district.name}</h3><p>{district.description}</p></div><div className="tg-prosperity"><strong>{district.prosperity}%</strong><span>ПРОЦВЕТАНИЕ</span></div></div>
            <div className="tg-district-footer"><span>{money(district.population)} жителей</span><span>{district.building ? BUILDINGS[district.building].name + ' · ур. ' + district.buildingLevel : 'Участок свободен'}</span><button type="button" onClick={() => setTab('construction')}>УПРАВЛЯТЬ РАЙОНОМ <ArrowUpRight size={13} /></button></div>
          </div>
        </section>

        <section ref={commandPanelRef} className="tg-command-panel" aria-label="Панель управления городом">
          <div className="tg-panel-head tg-command-head"><div><span className="tg-overline">IMPERIAL CHAMBER</span><h2>Кабинет правителя</h2></div><span className={'tg-status-chip ' + (active ? 'is-active' : state.status === 'ELECTED' ? 'is-won' : 'is-lost')}><i />{active ? 'АКТИВЕН' : state.status === 'ELECTED' ? 'МАНДАТ ПРОДЛЁН' : 'КРИЗИС'}</span></div>
          <div className="tg-tabs" role="tablist" aria-label="Инструменты управления">
            <button type="button" role="tab" aria-selected={tab === 'council'} className={tab === 'council' ? 'is-active' : ''} onClick={() => setTab('council')}><Vote size={14} />СОВЕТ</button>
            <button type="button" role="tab" aria-selected={tab === 'construction'} className={tab === 'construction' ? 'is-active' : ''} onClick={() => setTab('construction')}><Building2 size={14} />СТРОЙКА</button>
            <button type="button" role="tab" aria-selected={tab === 'chronicle'} className={tab === 'chronicle' ? 'is-active' : ''} onClick={() => setTab('chronicle')}><Activity size={14} />ЛЕТОПИСЬ</button>
          </div>

          {tab === 'council' && <div className="tg-tab-content">
            <div className="tg-panel-section-title"><span>01 / НАЛОГОВАЯ ПОЛИТИКА</span><span>0—40%</span></div>
            <div className="tg-tax-heading"><div><span>Ставка города</span><small>Изменится при завершении такта</small></div><strong>{tax}<small>%</small></strong></div>
            <input className="tg-tax-slider" aria-label="Налоговая ставка" type="range" min="0" max="40" step="1" value={tax} disabled={!active} style={{ '--range-fill': (tax / 40 * 100) + '%' } as React.CSSProperties} onChange={(event) => { setPlanTouched(true); setTax(Number(event.currentTarget.value)) }} />
            <div className="tg-range-labels"><span>0% · МЯГКО</span><span>40% · ЖЁСТКО</span></div>
            <div className="tg-policy-heading"><span>02 / КУРС УПРАВЛЕНИЯ</span><span>ВЫБЕРИТЕ ОДИН</span></div>
            <div className="tg-policy-grid">
              {Object.entries(POLICIES).map(([key, item]) => {
                const id = key as PolicyId
                const Icon = id === 'BALANCED' ? ShieldCheck : id === 'INDUSTRY' ? Factory : id === 'GREEN' ? Leaf : Users
                return <button type="button" key={key} disabled={!active} className={'tg-policy-option ' + (policy === id ? 'is-selected' : '')} aria-pressed={policy === id} onClick={() => { setPlanTouched(true); setPolicy(id) }}>
                  <span className="tg-policy-icon"><Icon size={16} /></span><span><strong>{item.label}</strong><small>{item.short}</small></span>{policy === id && <Check size={14} className="tg-policy-check" />}
                </button>
              })}
            </div>
            <div className="tg-decree-section">
              <div className="tg-decree-heading"><span>03 / ОСОБЫЙ УКАЗ СОВЕТА</span><span className={councilActionUsed ? 'is-used' : ''}>{councilActionUsed ? 'ИСПОЛЬЗОВАН В ЭТОМ ТАКТЕ' : 'ОДИН РАЗ ЗА ТАКТ'}</span></div>
              <p className="tg-decree-intro">{councilActionUsed ? 'Решение уже принято. Новый указ станет доступен после продвижения времени.' : 'Выберите одно дополнительное действие до завершения такта. Указ расходует казну сразу и записывается в летопись.'}</p>
              <div className="tg-decree-grid">
                {Object.entries(COUNCIL_ACTIONS).map(([key, action]) => {
                  const id = key as CouncilActionId
                  const disabled = !active || councilActionUsed || state.treasury < action.cost || (id === 'GRID_REPAIR' && state.energy >= 92)
                  const Icon = id === 'GRID_REPAIR' ? Zap : id === 'CIVIC_RELIEF' ? Users : Landmark
                  return <button type="button" key={id} className="tg-decree-card" disabled={disabled} aria-label={action.name + ', стоимость ' + money(action.cost)} onClick={() => applyDecree(id)}>
                    <span className="tg-decree-icon"><Icon size={16} /></span>
                    <span className="tg-decree-copy"><strong>{action.name}</strong><small>{action.description}</small><em>{action.effect}</em><b>{id === 'GRID_REPAIR' && state.energy >= 92 ? 'СЕТЬ УЖЕ СТАБИЛЬНА' : 'ИСПОЛНИТЬ · ' + money(action.cost) + ' ₽'}</b></span>
                    <ArrowUpRight size={14} className="tg-decree-arrow" />
                  </button>
                })}
              </div>
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
              <div className="tg-faction-score"><strong key={score}>{score}<small>/100</small></strong><span>ОДОБРЕНИЕ</span></div>
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
            <div className={'tg-mobile-command-dock' + (!active ? ' is-terminal' : '')} aria-label="Быстрое управление тактом">
        <div className="tg-mobile-dock-copy">
          <span>ТАКТ {String(state.tick + 1).padStart(2, '0')} / ПРОГНОЗ</span>
          <strong>КАЗНА {signed(forecast.treasuryDelta, ' ₽')} · ЭН {signed(forecast.energyDelta)}</strong>
        </div>
        <button type="button" disabled={!active} onClick={applyTurn} aria-label={'Завершить такт ' + (state.tick + 1) + ', расчётный баланс казны ' + signed(forecast.treasuryDelta)}>
          <Play size={14} fill="currentColor" /><span>Завершить такт</span><ArrowRight size={15} />
        </button>
      </div>
      <div className="tg-live-announcement" role="status" aria-live="polite">{announcement}</div>
      <footer className="tg-site-footer"><span>OSGARD PLAY / IMPERIUM OF TIME</span><span>CLIENT-SIDE SIMULATION · LOCAL SAVE</span><a href="/entertainment">ВЫЙТИ В КАТАЛОГ <ArrowUpRight size={12} /></a></footer>
    </main>
  )
}

function Resource({ icon, label, value, hint, tone = 'neutral', meter }: { icon: React.ReactNode; label: string; value: string; hint: string; tone?: string; meter?: number }) {
  return <article className="tg-resource-card"><div className="tg-resource-label"><span>{icon}</span>{label}</div><strong key={value}>{value}</strong><div className={'tg-resource-hint tone-' + tone}>{hint}</div>{meter !== undefined && <div className="tg-resource-meter"><span style={{ width: meter + '%' }} /></div>}</article>
}
function Diagnostic({ label, value, description, tone = 'neutral' }: { label: string; value: string; description: string; tone?: 'positive' | 'neutral' | 'negative' }) {
  return <div className={'tg-diagnostic-item tone-' + tone}><span>{label}</span><strong>{value}</strong><small>{description}</small></div>
}
