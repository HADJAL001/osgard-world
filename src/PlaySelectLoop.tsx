import { useEffect, useState } from 'react'

type Locale = 'ru' | 'en'
type GameId = 'signal-run'
type Service = { id: string; name: string; category: string; ru: string; en: string; url: string }

const INVITE_CODES_KEY = 'osgard.games.shards-invite-codes.v1'
const OWNER_TOKEN_KEY = 'osgard.games.referral-owner-token.v1'
const REWARD_CONSENT_KEY = 'osgard.games.referral-reward-consent.v1'
const ANALYTICS_CONSENT_KEY = 'osgard.games.analytics-consent.v1'

const services: Service[] = [
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
]

function secureHex(bytes: number): string {
  try {
    if (!window.crypto?.getRandomValues) return ''
    const data = new Uint8Array(bytes)
    window.crypto.getRandomValues(data)
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

function hasAnalyticsConsent(): boolean {
  try { return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'yes' } catch { return false }
}

function hasRewardConsent(): boolean {
  try { return window.localStorage.getItem(REWARD_CONSENT_KEY) === 'yes' } catch { return false }
}

function inviteCode(gameId: GameId): string {
  if (typeof window === 'undefined') return ''
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(INVITE_CODES_KEY) || '{}')
    const codes = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    const existing = codes[gameId]
    if (typeof existing === 'string' && /^og_[a-f0-9]{32}$/.test(existing)) return existing
    const random = secureHex(16)
    if (!random) return ''
    const code = 'og_' + random
    window.localStorage.setItem(INVITE_CODES_KEY, JSON.stringify({ ...codes, [gameId]: code }))
    return code
  } catch {
    return ''
  }
}

function ownerToken(): string {
  try {
    const existing = window.localStorage.getItem(OWNER_TOKEN_KEY) || ''
    if (/^[a-f0-9]{12}$/.test(existing)) return existing
    const random = secureHex(6)
    if (!random) return ''
    window.localStorage.setItem(OWNER_TOKEN_KEY, random)
    return random
  } catch {
    return ''
  }
}

function makeInviteUrl(): string {
  const url = new URL('/games/', window.location.origin)
  const code = inviteCode('signal-run')
  if (code) {
    url.pathname = '/games/invite/signal-run/'
    url.searchParams.set('og_ref', code)
    url.searchParams.set('og_game', 'signal-run')
    url.searchParams.set('utm_source', 'osgard_play')
    url.searchParams.set('utm_medium', 'referral')
    url.searchParams.set('utm_campaign', 'play_with_friends')
    url.searchParams.set('utm_content', 'signal-run')
  } else {
    url.searchParams.set('utm_source', 'osgard_world')
    url.searchParams.set('utm_medium', 'entertainment')
    url.searchParams.set('utm_campaign', 'between_worlds')
  }
  return url.href
}

async function commerceBase(): Promise<string> {
  try {
    const response = await fetch('/games/commerce-config.json', { cache: 'no-store' })
    const config = response.ok ? await response.json().catch(() => ({})) as { apiBaseUrl?: string } : {}
    return String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '')
  } catch {
    return '/commerce-api'
  }
}

async function registerInvite(gameId: GameId, code: string): Promise<boolean> {
  if (!hasAnalyticsConsent() || !hasRewardConsent() || !/^og_[a-f0-9]{32}$/.test(code)) return false
  const owner = ownerToken()
  if (!owner) return false
  try {
    const base = await commerceBase()
    const response = await fetch(base + '/v1/referrals/register', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, rewardConsent: true, code, gameId, ownerToken: owner }),
    })
    if (!response.ok) return false
    const eventId = secureHex(12)
    const sessionId = secureHex(12)
    if (!eventId || !sessionId) return true
    const event = {
      eventId: 'evt_' + eventId,
      name: 'share_created',
      sessionId: 'session_' + sessionId,
      gameId,
      source: 'game-invite:' + gameId + ':' + code + ':' + owner,
      path: window.location.pathname,
      durationSeconds: 0,
    }
    await fetch(base + '/v1/events', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, events: [event] }),
    }).catch(() => undefined)
    return true
  } catch {
    return false
  }
}

async function readReferralBalance(code: string): Promise<{ points: number; sessions: number }> {
  if (!code || !hasAnalyticsConsent() || !hasRewardConsent()) throw new Error('CONSENT_REQUIRED')
  const base = await commerceBase()
  const response = await fetch(base + '/v1/referrals/reward-status', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const result = await response.json().catch(() => ({})) as { pointsEarned?: unknown; qualifiedSessions?: unknown; error?: string }
  if (!response.ok) throw new Error(result.error || 'REFERRAL_STATUS_UNAVAILABLE')
  return {
    points: Number.isSafeInteger(result.pointsEarned) ? Number(result.pointsEarned) : 0,
    sessions: Number.isSafeInteger(result.qualifiedSessions) ? Number(result.qualifiedSessions) : 0,
  }
}

export function PlaySelectLoop({ locale }: { locale: Locale }) {
  const ru = locale === 'ru'
  const [inviteUrl] = useState(makeInviteUrl)
  const [rewardConsent, setRewardConsent] = useState(hasRewardConsent)
  const [balance, setBalance] = useState<number | null>(null)
  const [qualifiedSessions, setQualifiedSessions] = useState(0)
  const [status, setStatus] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const code = (() => { try { return new URL(inviteUrl).searchParams.get('og_ref') || '' } catch { return '' } })()
  const message = ru ? 'Пойдём сыграем в OSGARD PLAY. Выбирай свой мир:' : 'Let’s play OSGARD PLAY. Choose your world:'

  const refreshBalance = async () => {
    try {
      const next = await readReferralBalance(code)
      setBalance(next.points)
      setQualifiedSessions(next.sessions)
      setStatus(ru
        ? 'Сервер подтвердил ' + next.sessions + ' подходящих игровых сессий приглашённых друзей.'
        : 'The server verified ' + next.sessions + ' qualifying invited game sessions.')
    } catch {
      setBalance(null)
      setQualifiedSessions(0)
      setStatus(!hasAnalyticsConsent()
        ? (ru ? 'Для учёта наград сначала включи необязательную аналитику в настройках OSGARD.' : 'Enable optional OSGARD analytics to track referral rewards.')
        : (!hasRewardConsent()
          ? (ru ? 'Включи отдельное согласие на программу наград ниже.' : 'Enable the separate rewards-program consent below.')
          : (ru ? 'Серверный баланс временно недоступен. Попробуй позже.' : 'Server balance is temporarily unavailable. Try again later.')))
    }
  }

  useEffect(() => {
    void refreshBalance()
    // Consent can change elsewhere in the portal; refresh when this tab regains focus.
    const onFocus = () => { void refreshBalance() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [inviteUrl, rewardConsent])

  const prepareInvite = async (): Promise<boolean> => {
    if (!code) {
      setStatus(ru ? 'Браузер не разрешил создать защищённую ссылку.' : 'This browser could not create a secure invite link.')
      return false
    }
    if (!hasAnalyticsConsent() || !hasRewardConsent()) {
      setStatus(!hasAnalyticsConsent()
        ? (ru ? 'Ссылка откроется, но аналитика выключена — серверные награды не учитываются.' : 'The link still works, but analytics is off and server rewards will not be tracked.')
        : (ru ? 'Ссылка откроется без учёта наград. Для наград включи участие ниже.' : 'The link still works, but rewards are not tracked. Opt in below to participate.'))
      return false
    }
    setIsBusy(true)
    const registered = await registerInvite('signal-run', code)
    setIsBusy(false)
    if (!registered) setStatus(ru
      ? 'Не удалось зарегистрировать приглашение на сервере. Ссылкой можно делиться, но награда не будет учтена.'
      : 'Could not register the invite on the server. You can still share the link, but rewards will not be tracked.')
    return registered
  }

  const shareInvite = async () => {
    setStatus('')
    const registered = await prepareInvite()
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        setStatus(registered
          ? (ru ? 'Приглашение отправлено в системное меню. +50 SHARDS появятся только если друг запустит игру и проведёт сессию не менее 60 секунд.' : 'Invite opened in the share sheet. +50 SHARDS are earned only if a friend launches a game and plays for at least 60 seconds.')
          : (ru ? 'Открылось меню отправки. Без включённых согласий награда не учитывается.' : 'Share sheet opened. Rewards are not tracked without consent.'))
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(registered
          ? (ru ? 'Ссылка скопирована. Копирование само по себе не даёт очки; +50 SHARDS начислятся после подтверждённой сессии друга.' : 'Link copied. Copying alone earns no points; +50 SHARDS are awarded after a qualifying friend session.')
          : (ru ? 'Ссылка скопирована. Для серверных наград требуется согласие и доступный сервер.' : 'Link copied. Server rewards require consent and an available server.'))
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена. Награда не начислена за отмену.' : 'Share cancelled. No reward is issued for a cancelled share.')
        : (ru ? 'Не удалось отправить приглашение. Выбери соцсеть ниже.' : 'Share failed. Choose a social network below.'))
    }
  }

  const social = [
    { name: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + inviteUrl) },
    { name: 'VK', href: 'https://vk.com/share.php?url=' + encodeURIComponent(inviteUrl) + '&title=' + encodeURIComponent('OSGARD PLAY') },
    { name: 'X', href: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(inviteUrl) },
  ]

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
        <p>{ru ? 'Поделись приглашением. +50 SHARDS начисляются сервером после подходящей игровой сессии друга длиной от 60 секунд. Публикацию соцсети нельзя проверить автоматически; сама отправка не даёт очки.' : 'Share an invite. The server awards +50 SHARDS after a friend plays a qualifying game session of at least 60 seconds. Social-network posts cannot be verified automatically; sending the link alone earns no points.'}</p>
        <label className="play-select-reward-consent">
          <input type="checkbox" checked={rewardConsent} onChange={event => {
            setRewardConsent(event.target.checked)
            try { if (event.target.checked) window.localStorage.setItem(REWARD_CONSENT_KEY, 'yes'); else window.localStorage.removeItem(REWARD_CONSENT_KEY) } catch {}
            if (event.target.checked && !hasAnalyticsConsent()) setStatus(ru ? 'Для работы серверных наград требуется отдельное включение необязательной аналитики.' : 'Server rewards also require optional analytics consent.')
            else setStatus(event.target.checked ? (ru ? 'Согласие на программу наград включено.' : 'Rewards-program consent enabled.') : (ru ? 'Участие в программе наград отключено.' : 'Rewards program disabled.'))
          }} />
          <span>{ru ? 'Разрешаю учитывать открытие приглашения и игровую сессию для наград. Участие добровольное.' : 'I consent to tracking invite opens and qualifying game sessions for rewards. Participation is optional.'}</span>
        </label>
        <div className="play-select-wallet"><span>OSGARD SHARDS · SERVER</span><strong>{balance === null ? '—' : balance.toLocaleString(ru ? 'ru-RU' : 'en-US')}</strong></div>
        <small className="play-select-reward-note">{ru ? 'Подтверждённых сессий: ' + qualifiedSessions + '. SHARDS — непокупаемые пилотные очки без денежной стоимости. Они не начисляются за клик или неподтверждённый пост.' : 'Verified qualifying sessions: ' + qualifiedSessions + '. SHARDS are pilot points with no cash value, not purchasable. Clicks and unverified posts do not earn them.'}</small>
        <div className="play-select-share-actions">
          <button type="button" className="play-select-share-primary" onClick={shareInvite} disabled={isBusy}>{isBusy ? (ru ? 'Регистрируем…' : 'Registering…') : (ru ? 'Поделиться приглашением ↗' : 'Share invitation ↗')}</button>
          <button type="button" className="play-select-share-refresh" onClick={() => { void refreshBalance() }}>{ru ? 'Обновить баланс' : 'Refresh balance'}</button>
        </div>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={async event => {
            const destination = item.href
            if (!hasAnalyticsConsent() || !hasRewardConsent()) {
              setStatus(ru ? 'Соцсеть откроется. Для учёта серверных наград нужны оба добровольных согласия.' : 'The social composer opens. Both optional consents are required to track rewards.')
              return
            }
            event.preventDefault()
            const popup = window.open('about:blank', '_blank')
            if (popup) popup.opener = null
            setIsBusy(true)
            const registered = await registerInvite('signal-run', code)
            setIsBusy(false)
            setStatus(registered
              ? (ru ? 'Приглашение зарегистрировано. +50 SHARDS появятся после игровой сессии друга от 60 секунд.' : 'Invite registered. +50 SHARDS are earned after a friend’s 60-second qualifying session.')
              : (ru ? 'Сервер не зарегистрировал приглашение; награда не учитывается.' : 'The server did not register this invite; no reward will be tracked.'))
            if (popup && !popup.closed) popup.location.href = destination
            else if (!popup) window.location.assign(destination)
          }}>{item.name} ↗</a>)}
        </div>
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
      </aside>
    </div>
  </section>
}
