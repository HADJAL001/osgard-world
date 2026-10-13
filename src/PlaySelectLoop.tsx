import { useEffect, useState } from 'react'

type Locale = 'ru' | 'en'
type ReferralBalance = { pointsEarned: number; qualifiedSessions: number } | null
const ANALYTICS_KEY = 'osgard.games.analytics-consent.v1'
const REWARD_CONSENT_KEY = 'osgard.games.referral-reward-consent.v1'
const OWNER_TOKEN_KEY = 'osgard.games.referral-owner-token.v1'
const INVITE_CODES_KEY = 'osgard.games.shards-invite-codes.v1'

function storedConsent(key: string): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'yes' } catch { return false }
}

function randomHex(byteCount: number): string {
  if (typeof window === 'undefined' || !window.crypto || typeof window.crypto.getRandomValues !== 'function') return ''
  try {
    const bytes = new Uint8Array(byteCount)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  } catch { return '' }
}

function readOwnerToken(): string {
  try {
    const current = window.localStorage.getItem(OWNER_TOKEN_KEY) || ''
    if (/^[a-f0-9]{12}$/.test(current)) return current
    const token = randomHex(6)
    if (!token) return ''
    window.localStorage.setItem(OWNER_TOKEN_KEY, token)
    return token
  } catch { return '' }
}

function getInviteCode(): string {
  try {
    const stored = JSON.parse(window.localStorage.getItem(INVITE_CODES_KEY) || '{}') as Record<string, unknown>
    const existing = typeof stored['signal-run'] === 'string' ? stored['signal-run'] : ''
    if (/^og_[a-f0-9]{32}$/.test(existing)) return existing
    const random = randomHex(16)
    if (!random) return ''
    const code = 'og_' + random
    stored['signal-run'] = code
    window.localStorage.setItem(INVITE_CODES_KEY, JSON.stringify(stored))
    return code
  } catch { return '' }
}

const services = [
  { id: 'marcosa', name: 'MARCOSA', category: 'SOCIAL / COMMUNITY', ru: 'Социальная сеть, сообщества и цифровые миры.', en: 'Social networking, communities and digital worlds.', url: 'https://marcosa.club/' },
  { id: 'projects', name: 'OSGARD BEW WORLD', category: 'DIGITAL STUDIO', ru: 'Создание игр, сайтов, приложений и цифровых продуктов.', en: 'Games, websites, apps and digital product development.', url: 'https://osgardbewworld.com/' },
  { id: 'o2-system', name: 'O2 SYSTEM', category: 'BUSINESS OPERATIONS', ru: 'Система учёта кассы обменников.', en: 'Cash and transaction accounting for exchange offices.', url: 'https://o2system.art/' },
  { id: 'senjorio', name: 'SENJORIO', category: 'PREMIUM MOBILITY', ru: 'Премиальный сервис такси.', en: 'Premium taxi service.', url: 'https://senjorio.com/' },
  { id: 'superday', name: 'SUPERDAY', category: 'MAP / DAILY PLANNING', ru: 'Умная карта и планировщик дня.', en: 'Smart map and day planner.', url: 'https://superday.run/' },
  { id: 'myosa', name: 'MYOSA', category: 'AI PLATFORM', ru: 'Платформа искусственного интеллекта.', en: 'AI platform.', url: 'https://myosa.world/' },
  { id: 'gold-glamour', name: 'GOLD GLAMOUR', category: 'PREMIUM SERVICES', ru: 'Премиальные услуги с золотом и выездным обслуживанием.', en: 'Premium gold-related and mobile services.', url: 'https://gold-glamour.online/' },
  { id: 'gardvpn', name: 'GARD VPN', category: 'PRIVACY / VPN', ru: 'VPN-сервис; проверьте доступность и условия на сайте проекта. Доступность домена не подтверждена независимо.', en: 'VPN service; check the project site for availability and terms. The domain has not been independently verified.', url: 'https://gardvpn.is/' },
  { id: 'osgard-business', name: 'OSGARD OS', category: 'BUSINESS DEVELOPMENT', ru: 'Направление развития бизнеса.', en: 'Business development.', url: 'https://osgardos.com/' },
  { id: 'vanguard', name: 'OSGARD VANGUARD STUDIO', category: 'VIDEO STUDIO', ru: 'Создание видео для цифровых продуктов и кампаний.', en: 'Video production for digital products and campaigns.', url: 'https://osgardvanguard.studio/' },
] as const
function makeInviteUrl(): string {
  const url = new URL('/games/invite/signal-run/', window.location.origin)
  const code = getInviteCode()
  if (code) url.searchParams.set('og_ref', code)
  url.searchParams.set('og_game', 'signal-run')
  url.searchParams.set('utm_source', 'osgard_world')
  url.searchParams.set('utm_medium', 'entertainment_referral')
  url.searchParams.set('utm_campaign', 'play_with_friends')
  url.searchParams.set('utm_content', 'home_entertainment')
  return url.href
}

async function apiBaseUrl(): Promise<string | null> {
  let raw = ''
  try {
    const response = await fetch('/games/commerce-config.json', { cache: 'no-store' })
    const config = response.ok ? await response.json().catch(() => ({})) : {}
    raw = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : ''
  } catch {}
  if (!raw) {
    try {
      const readiness = await fetch('/commerce-api/readyz', { cache: 'no-store' })
      if (!readiness.ok) return null
      raw = '/commerce-api'
    } catch { return null }
  }
  let parsed: URL
  try { parsed = new URL(raw, window.location.origin) } catch { return null }
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname)
  const allowedPath = parsed.pathname === '/' || (parsed.origin === window.location.origin && parsed.pathname === '/commerce-api')
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) return null
  return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname)
}

async function registerInvite(code: string): Promise<boolean> {
  if (!storedConsent(ANALYTICS_KEY) || !storedConsent(REWARD_CONSENT_KEY) || !/^og_[a-f0-9]{32}$/.test(code)) return false
  const ownerToken = readOwnerToken()
  if (!ownerToken) return false
  const base = await apiBaseUrl()
  if (!base) return false
  try {
    const response = await fetch(base + '/v1/referrals/register', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, rewardConsent: true, code, gameId: 'signal-run', ownerToken }),
    })
    return response.ok
  } catch { return false }
}

async function fetchReferralBalance(): Promise<ReferralBalance> {
  if (!storedConsent(ANALYTICS_KEY) || !storedConsent(REWARD_CONSENT_KEY)) return null
  const ownerToken = readOwnerToken()
  if (!ownerToken) return null
  const base = await apiBaseUrl()
  if (!base) return null
  try {
    const response = await fetch(base + '/v1/referrals/balance', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, rewardConsent: true, ownerToken }),
    })
    if (!response.ok) return null
    const value = await response.json()
    return {
      pointsEarned: Number.isSafeInteger(value.pointsEarned) && value.pointsEarned >= 0 ? value.pointsEarned : 0,
      qualifiedSessions: Number.isSafeInteger(value.qualifiedSessions) && value.qualifiedSessions >= 0 ? value.qualifiedSessions : 0,
    }
  } catch { return null }
}

export function PlaySelectLoop({ locale }: { locale: Locale }) {
  const ru = locale === 'ru'
  const [inviteUrl] = useState(makeInviteUrl)
  const [balance, setBalance] = useState<ReferralBalance>(null)
  const [status, setStatus] = useState('')
  const [analyticsConsent, setAnalyticsConsent] = useState(() => storedConsent(ANALYTICS_KEY))
  const [rewardConsent, setRewardConsent] = useState(() => storedConsent(REWARD_CONSENT_KEY))
  const code = useState(() => {
    try { return new URL(inviteUrl).searchParams.get('og_ref') || '' } catch { return '' }
  })[0]
  const message = ru ? 'Пойдём сыграем в OSGARD PLAY. Выбирай свой мир:' : 'Let’s play OSGARD PLAY. Choose your world:'

  const updateConsentStorage = (key: string, enabled: boolean) => {
    try {
      if (enabled) window.localStorage.setItem(key, 'yes')
      else window.localStorage.removeItem(key)
    } catch {}
  }

  const refreshBalance = async () => {
    const value = await fetchReferralBalance()
    setBalance(value)
    return value
  }

  useEffect(() => {
    if (!analyticsConsent || !rewardConsent) {
      setBalance(null)
      return
    }
    let cancelled = false
    void (async () => {
      const registered = await registerInvite(code)
      const value = await fetchReferralBalance()
      if (cancelled) return
      setBalance(value)
      if (registered && value) {
        setStatus(ru
          ? value.pointsEarned + ' SHARDS за ' + value.qualifiedSessions + ' квалифицированных приглашённых сессий. За нового друга начисляется +50 после 60 секунд в той же игре.'
          : value.pointsEarned + ' SHARDS from ' + value.qualifiedSessions + ' qualified invited sessions. +50 is awarded after a new friend plays the same game for 60 seconds.')
      } else {
        setStatus(ru
          ? 'Сервер пока не подтвердил бонусную программу. Ссылкой можно делиться, но SHARDS начисляются только после регистрации приглашения и проверки игровой сессии.'
          : 'The server has not confirmed the reward programme. You can still share the link, but SHARDS are granted only after invite registration and session verification.')
      }
    })()
    return () => { cancelled = true }
  }, [analyticsConsent, rewardConsent, code, ru])

  const onConsentChange = (kind: 'analytics' | 'reward', enabled: boolean) => {
    if (kind === 'analytics') {
      updateConsentStorage(ANALYTICS_KEY, enabled)
      setAnalyticsConsent(enabled)
      if (!enabled) {
        setBalance(null)
        setStatus(ru ? 'Необязательная аналитика и бонусный учёт отключены. Играть и приглашать друзей можно без них.' : 'Optional analytics and reward tracking are disabled. You can still play and invite friends.')
      }
    } else {
      updateConsentStorage(REWARD_CONSENT_KEY, enabled)
      setRewardConsent(enabled)
      if (!enabled) {
        setBalance(null)
        setStatus(ru ? 'Бонусная программа отключена. Играть и делиться ссылками можно без неё.' : 'The rewards programme is disabled. You can still play and share links.')
      }
    }
  }

  const social = [
    { name: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + inviteUrl) },
    { name: 'VK', href: 'https://vk.com/share.php?url=' + encodeURIComponent(inviteUrl) + '&title=' + encodeURIComponent('OSGARD PLAY') },
    { name: 'X', href: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(inviteUrl) },
  ]

  const shareInvite = async () => {
    if (analyticsConsent && rewardConsent) {
      const registered = await registerInvite(code)
      if (!registered) {
        setStatus(ru
          ? 'Сервер пока не подтвердил регистрацию приглашения. Ссылка откроется, но награда не будет начислена без серверной проверки.'
          : 'The server has not confirmed invite registration. The link still works, but rewards require server verification.')
      }
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        if (analyticsConsent && rewardConsent) await refreshBalance()
        setStatus(ru
          ? 'Приглашение передано в меню отправки. +50 SHARDS начисляются только после подтверждённой сервером сессии друга не менее 60 секунд. Публикацию поста мы не проверяем.'
          : 'Invite handed to the share sheet. +50 SHARDS are awarded only after a server-qualified friend session of at least 60 seconds. We do not verify public posts.')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(ru
          ? 'Ссылка скопирована. Копирование само по себе не начисляет SHARDS — награда зависит от игровой сессии приглашённого друга.'
          : 'Link copied. Copying alone does not grant SHARDS; the reward depends on the invited friend’s play session.')
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена. SHARDS не начислены.' : 'Share cancelled. No SHARDS awarded.')
        : (ru ? 'Не удалось отправить приглашение. Выбери соцсеть ниже.' : 'Share failed. Choose a network below.'))
    }
  }

  return <section className="play-select-loop" aria-labelledby="play-select-title">
    <div className="play-select-header">
      <div>
        <p className="play-economy-eyebrow">OSGARD SELECT / OWNED PROJECTS</p>
        <h3 id="play-select-title">{ru ? 'Играй. Выбирай. Открывай другие миры.' : 'Play. Choose. Discover other worlds.'}</h3>
        <p>{ru ? 'Подборка собственных продуктов OSGARD. Никакого автозапуска: ты сам выбираешь, что открыть.' : 'A selection of OSGARD’s own products. Nothing opens automatically — you decide what to explore.'}</p>
      </div>
      <span className="play-select-disclosure">{ru ? 'РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ' : 'ADVERTISING · OSGARD OWNED PROJECTS'}</span>
    </div>
    <div className="play-select-layout">
      <div className="play-select-service-grid">
        {services.map((service, index) => {
          const url = new URL(service.url)
          url.searchParams.set('utm_source', 'osgard_world')
          url.searchParams.set('utm_medium', 'entertainment_select')
          url.searchParams.set('utm_campaign', 'between_worlds')
          url.searchParams.set('utm_content', service.id)
          return <a key={service.id} className={'play-select-service' + (index === 0 ? ' is-featured' : '')} href={url.href} target="_blank" rel="noopener noreferrer" aria-label={ru ? 'Открыть ' + service.name + ' — ' + service.category : 'Open ' + service.name + ' — ' + service.category}>
            <span>{String(index + 1).padStart(2, '0')} / {service.category}</span>
            <strong>{service.name}</strong>
            <p>{ru ? service.ru : service.en}</p>
            <em>{ru ? 'Открыть проект ↗' : 'Explore project ↗'}</em>
          </a>
        })}
        <a className="play-select-service play-select-all" href="/games/?utm_source=osgard_world&amp;utm_medium=entertainment_select&amp;utm_campaign=between_worlds&amp;utm_content=all_services">
          <span>OSG / DIRECTORY</span>
          <strong>{ru ? 'Все игры и сервисы' : 'All games and services'}</strong>
          <p>{ru ? 'Полный каталог, настройки межсессионных подборок и игровые миры.' : 'Full catalog, between-session preferences and game worlds.'}</p>
          <em>{ru ? 'Открыть каталог ↗' : 'Open catalog ↗'}</em>
        </a>
      </div>
      <aside className="play-select-referral">
        <p className="play-select-referral-eyebrow">OSGARD PLAY / FRIEND INVITE</p>
        <h4>{ru ? 'Твой следующий раунд — с другом.' : 'Your next round is better with a friend.'}</h4>
        <p>{ru ? 'Пригласи друга. +50 SHARDS начисляются только после серверной проверки его сессии в этой игре не короче 60 секунд.' : 'Invite a friend. +50 SHARDS are awarded only after the server verifies their session in this game for at least 60 seconds.'}</p>
        <div className="play-select-consents">
          <label><input type="checkbox" checked={analyticsConsent} onChange={event => onConsentChange('analytics', event.target.checked)} />{ru ? 'Разрешаю необязательную аналитику игровых событий.' : 'Allow optional gameplay analytics.'}</label>
          <label><input type="checkbox" checked={rewardConsent} onChange={event => onConsentChange('reward', event.target.checked)} />{ru ? 'Отдельно соглашаюсь на учёт приглашений для начисления SHARDS.' : 'Separately opt in to invitation tracking for SHARDS.'}</label>
        </div>
        <div className="play-select-wallet"><span>OSGARD SHARDS</span><strong>{balance ? balance.pointsEarned.toLocaleString(ru ? 'ru-RU' : 'en-US') : '—'}</strong></div>
        <button type="button" className="play-select-share-primary" onClick={() => void shareInvite()}>{ru ? 'Поделиться приглашением ↗' : 'Share invitation ↗'}</button>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={() => {
            if (analyticsConsent && rewardConsent) void registerInvite(code)
            setStatus(ru ? 'Откроется форма публикации в ' + item.name + '. SHARDS начисляются после квалифицированной игровой сессии приглашённого, а не за нажатие кнопки.' : 'Opening the ' + item.name + ' share composer. SHARDS depend on the invited player’s qualified game session, not on clicking this button.')
          }}>{item.name} ↗</a>)}
        </div>
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
        <small>{ru ? 'Без самоподтверждения репоста: сервер награждает только за новый токен приглашённого, отдельное согласие и квалифицированную сессию той же игры. SHARDS не имеют денежной стоимости, не обмениваются на деньги или покупки. Согласия можно отключить в любой момент.' : 'No self-claimed reposts: the server rewards only an invited browser token with separate consent and a qualified session in the same game. SHARDS have no cash value and are not redeemable for money or purchases. You can withdraw consent at any time.'}</small>
      </aside>
    </div>
  </section>
}
