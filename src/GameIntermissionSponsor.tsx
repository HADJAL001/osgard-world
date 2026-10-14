import { useEffect, useRef, useState } from 'react'
import './game-intermission-sponsor.css'

type Locale = 'ru' | 'en'
type Campaign = {
  id: string
  sponsorName: string
  title: string
  description: string
  targetUrl: string
  placement: 'after_session'
  sponsorDisclosure: 'Реклама' | 'Партнёрский материал' | 'Спонсорский материал'
  frequencyCap: number
  startsAt: string
  endsAt: string
}
type Props = { gameId: string; locale: Locale }
type AnalyticsEvent = {
  eventId: string
  name: 'sponsored_campaign_impression' | 'sponsored_campaign_clicked'
  sessionId: string
  gameId: string
  source: string
  path: string
  durationSeconds: number
}
type AnalyticsBridge = { enqueue: (event: AnalyticsEvent) => Promise<boolean>; clear?: () => void }
declare global {
  interface Window { OSGARD_CONSENTED_ANALYTICS?: AnalyticsBridge }
}

const CONSENT_KEY = 'osgard.games.analytics-consent.v1'
const EXPOSURE_KEY = 'osgard.games.intermission-exposure.v1'
const DISCLOSURES = new Set(['Реклама', 'Партнёрский материал', 'Спонсорский материал'])
const CAMPAIGN_ID = /^[a-zA-Z0-9_-]{8,64}$/
const SESSION_ID = 'sess_' + randomId()
let analyticsBridgePromise: Promise<AnalyticsBridge | null> | null = null

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '')
  } catch { /* use the local fallback */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function hasConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes' } catch { return false }
}

function canUseLocalStorage() {
  try {
    const key = EXPOSURE_KEY + '.test'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch { return false }
}

function readExposures(): Record<string, number[]> | null {
  if (!hasConsent()) return {}
  if (!canUseLocalStorage()) return null
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(EXPOSURE_KEY) || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const now = Date.now()
    const result: Record<string, number[]> = {}
    for (const [id, entries] of Object.entries(raw).slice(0, 100)) {
      if (!CAMPAIGN_ID.test(id) || !Array.isArray(entries)) continue
      const valid = entries.filter((value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value <= now && now - value < 86_400_000
      ).slice(-20)
      if (valid.length) result[id] = valid
    }
    return result
  } catch { return {} }
}

function allowedTarget(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 1024) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password || url.search || url.hash) return null
    return url
  } catch { return null }
}

async function resolveApiBase(): Promise<string> {
  try {
    const response = await fetch('/games/commerce-config.json', {
      cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000),
    })
    const config = response.ok ? await response.json() as { apiBaseUrl?: unknown } : {}
    const raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : ''
    if (!raw) {
      const healthResponse = await fetch('/commerce-api/healthz', {
        cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000),
      })
      const health = healthResponse.ok ? await healthResponse.json().catch(() => ({})) as { service?: string; databaseReady?: boolean } : {}
      return health.service === 'osgard-commerce-api' && health.databaseReady === true
        ? location.origin + '/commerce-api'
        : ''
    }
    const parsed = new URL(raw, location.origin)
    const localApi = ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.protocol === 'http:' && parsed.pathname === '/'
    const sameOriginApi = parsed.origin === location.origin && parsed.protocol === 'https:' && parsed.pathname === '/commerce-api'
    if ((!sameOriginApi && !localApi) || parsed.username || parsed.password || parsed.search || parsed.hash) return ''
    return parsed.origin + parsed.pathname
  } catch { return '' }
}

function getAnalyticsBridge(): Promise<AnalyticsBridge | null> {
  if (!hasConsent()) return Promise.resolve(null)
  if (window.OSGARD_CONSENTED_ANALYTICS) return Promise.resolve(window.OSGARD_CONSENTED_ANALYTICS)
  if (!analyticsBridgePromise) {
    analyticsBridgePromise = new Promise<AnalyticsBridge | null>(resolve => {
      const script = document.createElement('script')
      script.src = '/games/consented-analytics.js'
      script.async = true
      script.dataset.osgardConsentedAnalytics = 'true'
      script.onload = () => resolve(window.OSGARD_CONSENTED_ANALYTICS ?? null)
      script.onerror = () => resolve(null)
      document.head.appendChild(script)
    })
  }
  const pending = analyticsBridgePromise
  if (!pending) return Promise.resolve(null)
  return pending.then(bridge => {
    if (analyticsBridgePromise === pending) analyticsBridgePromise = null
    return bridge
  })
}

function sendEvent(campaign: Campaign, gameId: string, name: AnalyticsEvent['name']) {
  if (!hasConsent()) return
  void getAnalyticsBridge().then(bridge => {
    if (!bridge || !hasConsent()) return
    const event: AnalyticsEvent = {
      eventId: 'evt_' + randomId(),
      name,
      sessionId: SESSION_ID,
      gameId,
      source: 'sponsor-campaign:' + campaign.id,
      path: '/game/' + gameId,
      durationSeconds: 0,
    }
    void bridge.enqueue(event)
  })
}

function campaignFrom(value: unknown): Campaign | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  const target = allowedTarget(item.targetUrl)
  const disclosure = typeof item.sponsorDisclosure === 'string' && DISCLOSURES.has(item.sponsorDisclosure)
    ? item.sponsorDisclosure as Campaign['sponsorDisclosure']
    : null
  if (!CAMPAIGN_ID.test(String(item.id || '')) ||
      item.placement !== 'after_session' ||
      !disclosure ||
      typeof item.sponsorName !== 'string' || item.sponsorName.length < 2 || item.sponsorName.length > 100 ||
      typeof item.title !== 'string' || item.title.length < 3 || item.title.length > 100 ||
      typeof item.description !== 'string' || item.description.length < 10 || item.description.length > 500 ||
      !target || !Number.isInteger(item.frequencyCap) || Number(item.frequencyCap) < 1 || Number(item.frequencyCap) > 20 ||
      typeof item.startsAt !== 'string' || typeof item.endsAt !== 'string' ||
      !Number.isFinite(Date.parse(item.startsAt)) || !Number.isFinite(Date.parse(item.endsAt)) ||
      Date.parse(item.startsAt) > Date.now() || Date.parse(item.endsAt) <= Date.now()) return null
  return {
    id: String(item.id), sponsorName: item.sponsorName, title: item.title, description: item.description,
    targetUrl: target.href, placement: 'after_session', sponsorDisclosure: disclosure,
    frequencyCap: Number(item.frequencyCap), startsAt: item.startsAt, endsAt: item.endsAt,
  }
}

async function loadCampaigns(): Promise<Campaign[]> {
  const exposures = readExposures()
  if (exposures === null) return []
  const base = await resolveApiBase()
  if (!base) return []
  const response = await fetch(base + '/v1/campaigns/active?placement=after_session', {
    cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) return []
  const body = await response.json().catch(() => ({})) as { items?: unknown }
  if (!Array.isArray(body.items)) return []
  const valid: Campaign[] = []
  const seen = new Set<string>()
  for (const raw of body.items.slice(0, 20)) {
    const item = campaignFrom(raw)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    if (hasConsent() && (exposures?.[item.id] || []).length >= item.frequencyCap) continue
    valid.push(item)
  }
  return valid
}

function isActuallyVisible(element: HTMLElement) {
  if (!element.isConnected || document.hidden) return false
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0))
  const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))
  return width * height >= rect.width * rect.height * 0.5
}

export function GameIntermissionSponsor({ gameId, locale }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [ready, setReady] = useState(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const impressionSent = useRef(false)
  const ru = locale === 'ru'
  const campaign = campaigns.find(item => item.id === selectedId) ?? campaigns[0] ?? null

  useEffect(() => {
    let cancelled = false
    setReady(false)
    impressionSent.current = false
    void loadCampaigns().then(items => {
      if (cancelled) return
      setCampaigns(items)
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id ?? '')
      setReady(true)
    }).catch(() => {
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [gameId])

  useEffect(() => {
    impressionSent.current = false
  }, [selectedId])

  useEffect(() => {
    const card = cardRef.current
    if (!card || !campaign || impressionSent.current || !('IntersectionObserver' in window)) return
    let timer = 0
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || document.hidden || timer) continue
        timer = window.setTimeout(() => {
          timer = 0
          if (impressionSent.current || !isActuallyVisible(card)) return
          impressionSent.current = true
          if (hasConsent()) {
            const exposures = readExposures()
            if (exposures === null) return
            const current = exposures[campaign.id] || []
            if (current.length >= campaign.frequencyCap) { setCampaigns(items => items.filter(item => item.id !== campaign.id)); setSelectedId(id => id === campaign.id ? '' : id); return }
            current.push(Date.now())
            exposures[campaign.id] = current.slice(-20)
            try { localStorage.setItem(EXPOSURE_KEY, JSON.stringify(exposures)) } catch { return }
            sendEvent(campaign, gameId, 'sponsored_campaign_impression')
          }
        }, 1000)
      }
    }, { threshold: [0.5] })
    observer.observe(card)
    return () => { if (timer) window.clearTimeout(timer); observer.disconnect() }
  }, [campaign, gameId])

  if (!campaign || !ready) return null
  const target = allowedTarget(campaign.targetUrl)
  if (!target) return null
  target.searchParams.set('utm_source', 'osgard_world')
  target.searchParams.set('utm_medium', 'sponsored')
  target.searchParams.set('utm_campaign', campaign.id)
  target.searchParams.set('utm_content', gameId + '_after_session')

  return <section className="gh-intermission-sponsor" aria-labelledby="gh-intermission-title">
    <div className="gh-intermission-sponsor__eyebrow">{ru ? 'ПОСЛЕ СЕССИИ' : 'AFTER SESSION'} <span>·</span> OSGARD SELECT</div>
    {campaigns.length > 1 && <label className="gh-intermission-sponsor__chooser">
      <span>{ru ? 'Выберите предложение' : 'Choose an offer'}</span>
      <select value={campaign?.id ?? ''} onChange={event => setSelectedId(event.currentTarget.value)} aria-label={ru ? 'Выберите рекламное предложение' : 'Choose a sponsored offer'}>
        {campaigns.map(item => <option key={item.id} value={item.id}>{item.sponsorName} — {item.title}</option>)}
      </select>
    </label>}
    <article className="gh-intermission-sponsor__card" ref={node => { cardRef.current = node }}>
      <div className="gh-intermission-sponsor__copy">
        <span className="gh-intermission-sponsor__disclosure">{campaign.sponsorDisclosure}</span>
        <span className="gh-intermission-sponsor__sponsor">{campaign.sponsorName}</span>
        <h2 id="gh-intermission-title">{campaign.title}</h2>
        <p>{campaign.description}</p>
      </div>
      <a href={target.href} target="_blank" rel="sponsored noopener noreferrer" onClick={() => sendEvent(campaign, gameId, 'sponsored_campaign_clicked')}>
        {ru ? 'Изучить предложение' : 'Explore offer'} <span aria-hidden="true">↗</span>
      </a>
    </article>
    <p className="gh-intermission-sponsor__note">
      {ru ? 'Спонсорское предложение. Отдельно от игрового управления. Доступно только при активной кампании; необязательная аналитика работает по вашему согласию.' : 'Sponsored offer, separate from gameplay controls. Shown only for an active campaign; optional analytics runs with your consent.'}
    </p>
  </section>
}
