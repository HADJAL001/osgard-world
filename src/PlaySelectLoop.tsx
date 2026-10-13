import { useEffect, useState } from 'react'

type Locale = 'ru' | 'en'
const services = [
  { id: 'marcosa', name: 'MARCOSA', category: 'SOCIAL / COMMUNITY', ru: 'Социальная сеть, сообщества и цифровые миры.', en: 'Social networking, communities and digital worlds.', url: 'https://marcosa.club/' },
  { id: 'projects', name: 'OSGARD BEW WORLD', category: 'DIGITAL STUDIO', ru: 'Создание игр, сайтов, приложений и цифровых продуктов.', en: 'Games, websites, apps and digital product development.', url: 'https://osgardbewworld.com/' },
  { id: 'o2-system', name: 'O2 SYSTEM', category: 'BUSINESS OPERATIONS', ru: 'Система учёта кассы обменников.', en: 'Cash and transaction accounting for exchange offices.', url: 'https://o2system.art/' },
  { id: 'senjorio', name: 'SENJORIO', category: 'PREMIUM MOBILITY', ru: 'Премиальный сервис такси.', en: 'Premium taxi service.', url: 'https://senjorio.com/' },
  { id: 'superday', name: 'SUPERDAY', category: 'MAP / DAILY PLANNING', ru: 'Умная карта и планировщик дня.', en: 'Smart map and day planner.', url: 'https://superday.run/' },
  { id: 'myosa', name: 'MYOSA', category: 'AI PLATFORM', ru: 'Платформа искусственного интеллекта.', en: 'AI platform.', url: 'https://myosa.world/' },
  { id: 'gold-glamour', name: 'GOLD GLAMOUR', category: 'PREMIUM SERVICES', ru: 'Премиальные услуги с золотом и выездным обслуживанием.', en: 'Premium gold-related and mobile services.', url: 'https://gold-glamour.online/' },
  { id: 'gardvpn', name: 'GARD VPN', category: 'PRIVACY / VPN', ru: 'VPN-сервис; проверьте доступность и условия на сайте проекта. Доступность домена не подтверждена независимо. Ссылка доступна для выбора, но её работу нужно проверить.', en: 'VPN service; check availability and terms on the project site. The domain has not been independently verified, so between-game promotion is disabled.', url: 'https://gardvpn.is/' },
  { id: 'osgard-business', name: 'OSGARD OS', category: 'BUSINESS DEVELOPMENT', ru: 'Направление развития бизнеса.', en: 'Business development.', url: 'https://osgardos.com/' },
  { id: 'vanguard', name: 'OSGARD VANGUARD STUDIO', category: 'VIDEO STUDIO', ru: 'Создание видео для цифровых продуктов и кампаний.', en: 'Video production for digital products and campaigns.', url: 'https://osgardvanguard.studio/' },
] as const

type PromoFrequency = 'each' | 'every3' | 'off'
type PromoPreferences = { frequency: PromoFrequency; selected: string[] }
const PROMO_PREFERENCES_KEY = 'osgard.games.postgame-service-preferences.v1'
const PROMOTABLE_SERVICE_IDS = services.map(service => service.id)

function readPromoPreferences(): PromoPreferences {
  if (typeof window === 'undefined') return { frequency: 'each', selected: [...PROMOTABLE_SERVICE_IDS] }
  try {
    const value = JSON.parse(window.localStorage.getItem(PROMO_PREFERENCES_KEY) || 'null')
    if (!value || typeof value !== 'object') return { frequency: 'each', selected: [...PROMOTABLE_SERVICE_IDS] }
    const frequency: PromoFrequency = value.frequency === 'every3' || value.frequency === 'off' ? value.frequency : 'each'
    const selected = Array.isArray(value.selected)
      ? PROMOTABLE_SERVICE_IDS.filter(id => value.selected.includes(id))
      : [...PROMOTABLE_SERVICE_IDS]
    return { frequency, selected }
  } catch {
    return { frequency: 'each', selected: [...PROMOTABLE_SERVICE_IDS] }
  }
}

function makeInviteUrl(): string {
  const bytes = new Uint8Array(4)
  try {
    window.crypto.getRandomValues(bytes)
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const url = new URL('/games/invite/signal-run/', window.location.origin)
  url.searchParams.set('og_ref', 'og_' + Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''))
  url.searchParams.set('og_game', 'signal-run')
  url.searchParams.set('utm_source', 'osgard_world')
  url.searchParams.set('utm_medium', 'entertainment_referral')
  url.searchParams.set('utm_campaign', 'play_with_friends')
  url.searchParams.set('utm_content', 'home_entertainment')
  return url.href
}

export function PlaySelectLoop({ locale }: { locale: Locale }) {
  const ru = locale === 'ru'
  const [inviteUrl] = useState(makeInviteUrl)
  const [status, setStatus] = useState('')
  const [promoPreferences, setPromoPreferences] = useState<PromoPreferences>(readPromoPreferences)
  const [promoSettingsOpen, setPromoSettingsOpen] = useState(false)
  const [draftFrequency, setDraftFrequency] = useState<PromoFrequency>(() => readPromoPreferences().frequency)
  const [draftSelected, setDraftSelected] = useState<string[]>(() => readPromoPreferences().selected)
  const [promoStatus, setPromoStatus] = useState('')
  const message = ru ? 'Пойдём сыграем в OSGARD PLAY. Выбирай свой мир:' : 'Let’s play OSGARD PLAY. Choose your world:'
  const frequencyDescription = promoPreferences.frequency === 'each'
    ? (ru ? 'После каждой завершённой игры' : 'After every completed game')
    : promoPreferences.frequency === 'every3'
      ? (ru ? 'Раз в три завершённых игры' : 'Every third completed game')
      : (ru ? 'Межигровое промо отключено' : 'Between-game promotions disabled')

  useEffect(() => {
    const refreshPromoPreferences = () => {
      const next = readPromoPreferences()
      setPromoPreferences(next)
      setDraftFrequency(next.frequency)
      setDraftSelected(next.selected)
    }
    window.addEventListener('storage', refreshPromoPreferences)
    window.addEventListener('osgard:service-preferences-updated', refreshPromoPreferences)
    return () => {
      window.removeEventListener('storage', refreshPromoPreferences)
      window.removeEventListener('osgard:service-preferences-updated', refreshPromoPreferences)
    }
  }, [])

  const savePromoPreferences = () => {
    const next: PromoPreferences = {
      frequency: draftFrequency,
      selected: PROMOTABLE_SERVICE_IDS.filter(id => draftSelected.includes(id)),
    }
    try {
      window.localStorage.setItem(PROMO_PREFERENCES_KEY, JSON.stringify(next))
      setPromoPreferences(next)
      setDraftSelected(next.selected)
      setPromoStatus(ru
        ? 'Настройки сохранены и будут использоваться в межигровой подборке.'
        : 'Saved. These preferences will also be used between games.')
      window.dispatchEvent(new CustomEvent('osgard:service-preferences-updated'))
    } catch {
      setPromoStatus(ru
        ? 'Не удалось сохранить настройки браузера. Попробуй ещё раз.'
        : 'The browser could not save these preferences. Please try again.')
    }
  }

  const setAllPromoServices = (selected: boolean) => {
    setDraftSelected(selected ? [...PROMOTABLE_SERVICE_IDS] : [])
    setPromoStatus('')
  }

  const social = [
    { name: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + inviteUrl) },
    { name: 'VK', href: 'https://vk.com/share.php?url=' + encodeURIComponent(inviteUrl) + '&title=' + encodeURIComponent('OSGARD PLAY') },
    { name: 'X', href: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(inviteUrl) },
  ]

  const shareInvite = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        setStatus(ru
          ? 'Приглашение передано в меню отправки. Публикацию соцсетью нельзя подтвердить автоматически; на главной награда не начисляется.'
          : 'The invite was passed to the share sheet. A social post cannot be automatically verified; no reward is granted on the homepage.')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(ru
          ? 'Ссылка на каталог скопирована. SHARDS учитываются только внутри игры после серверной проверки приглашённой сессии и отдельного согласия.'
          : 'Catalog link copied. SHARDS are counted only inside a game after a referred session is verified by the server and the player has opted in.')
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена. Награда не начислялась.' : 'Share cancelled. No reward was granted.')
        : (ru ? 'Не удалось отправить приглашение. Выбери соцсеть ниже.' : 'Share failed. Choose a network below.'))
    }
  }

  return <section  return <section className="play-select-loop" aria-labelledby="play-select-title">
    <div className="play-select-header">
      <div>
        <p className="play-economy-eyebrow">OSGARD SELECT / OWNED PROJECTS</p>
        <h3 id="play-select-title">{ru ? 'Играй. Выбирай. Открывай другие миры.' : 'Play. Choose. Discover other worlds.'}</h3>
        <p>{ru ? 'Подборка собственных продуктов OSGARD. Никакого автозапуска: ты сам выбираешь, что открыть.' : 'A selection of OSGARD’s own products. Nothing opens automatically — you decide what to explore.'}</p>
      </div>
      <span className="play-select-disclosure">{ru ? 'РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ' : 'ADVERTISING · OSGARD OWNED PROJECTS'}</span>
    </div>
    <div className="play-select-preferences">
      <div className="play-select-preferences-bar">
        <div>
          <strong>{ru ? 'Межигровые предложения' : 'Between-game offers'}</strong>
          <span>{frequencyDescription} · {promoPreferences.selected.length} / {PROMOTABLE_SERVICE_IDS.length} {ru ? 'сервисов выбрано' : 'services selected'}</span>
        </div>
        <button
          type="button"
          className="play-select-preferences-toggle"
          aria-expanded={promoSettingsOpen}
          aria-controls="play-select-preferences-panel"
          onClick={() => {
            if (!promoSettingsOpen) {
              const latest = readPromoPreferences()
              setPromoPreferences(latest)
              setDraftFrequency(latest.frequency)
              setDraftSelected(latest.selected)
            }
            setPromoSettingsOpen(!promoSettingsOpen)
            setPromoStatus('')
          }}
        >{promoSettingsOpen ? (ru ? 'Закрыть настройки' : 'Close preferences') : (ru ? 'Настроить предложения ↗' : 'Customize offers ↗')}</button>
      </div>
      {promoSettingsOpen && <div className="play-select-preferences-panel" id="play-select-preferences-panel">
        <label className="play-select-frequency">
          <span>{ru ? 'Как часто показывать между играми' : 'How often to show between games'}</span>
          <select value={draftFrequency} onChange={event => setDraftFrequency(event.target.value as PromoFrequency)}>
            <option value="each">{ru ? 'После каждой завершённой игры' : 'After every completed game'}</option>
            <option value="every3">{ru ? 'Раз в три завершённых игры' : 'Every third completed game'}</option>
            <option value="off">{ru ? 'Не показывать межигровую подборку' : 'Turn off between-game offers'}</option>
          </select>
        </label>
        <div className="play-select-preference-heading">
          <strong>{ru ? 'Выбери проекты для подборки' : 'Choose projects for the intermission'}</strong>
          <span>{ru ? 'Изменения применятся и на странице игр.' : 'Changes also apply on the Games page.'}</span>
        </div>
        <div className="play-select-preference-grid">
          {services.map(service => {
            const unverified = service.id === 'gardvpn'
            return <label className={'play-select-preference-option' + (unverified ? ' is-unverified' : '')} key={service.id}>
              <input
                type="checkbox"
                checked={draftSelected.includes(service.id)}
                onChange={event => {
                  setDraftSelected(current => event.target.checked
                    ? [...new Set([...current, service.id])]
                    : current.filter(id => id !== service.id))
                  setPromoStatus('')
                }}
              />
              <span><strong>{service.name}</strong><small>{unverified ? (ru ? 'Доступность не подтверждена; откроется сайт проекта' : 'Availability not verified; opens the project site') : service.category}</small></span>
            </label>
          })}
        </div>
        <div className="play-select-preference-actions">
          <button type="button" onClick={() => setAllPromoServices(true)}>{ru ? 'Все доступные' : 'Select all available'}</button>
          <button type="button" onClick={() => setAllPromoServices(false)}>{ru ? 'Ничего не показывать' : 'Select none'}</button>
          <button type="button" className="is-save" onClick={savePromoPreferences}>{ru ? 'Сохранить настройки' : 'Save preferences'}</button>
        </div>
        <p className="play-select-preferences-status" role="status" aria-live="polite">{promoStatus}</p>
        <small className="play-select-preferences-note">{ru
          ? 'Это настройки саморекламы OSGARD, а не сторонней рекламной сети. Полный каталог собственных проектов остаётся доступен ниже.'
          : 'These preferences control OSGARD’s own cross-promotion, not a third-party ad network. The full owned-project directory remains below.'}</small>
      </div>}
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
            {service.id === 'gardvpn' && <small className="play-select-service-note">{ru ? 'СТАТУС ССЫЛКИ НЕ ПОДТВЕРЖДЁН' : 'LINK STATUS NOT VERIFIED'}</small>}
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
        <p>{ru ? 'Поделись приглашением. +50 SHARDS доступны после явного подтверждения публикации — не чаще раза в UTC-день на этом устройстве. Копирование ссылки само по себе не награждается.' : 'Share an invite. +50 SHARDS can be claimed after you explicitly confirm publishing the invite, once per UTC day on this device. Copying a link alone earns no reward.'}</p>
        <p>{ru
          ? 'SHARDS начисляются только внутри игры, если сервер подтвердит приглашение и игровую сессию друга от 60 секунд. На главной странице очки не выдаются; соцсети не сообщают OSGARD, был ли пост опубликован.'
          : 'SHARDS are earned only inside a game after the server verifies an invitation and a friend’s 60-second session. No points are awarded on the homepage; social networks do not tell OSGARD whether a post was published.'}</p>
        <button type="button" className="play-select-share-primary" onClick={shareInvite}>{ru ? 'Поделиться приглашением ↗' : 'Share invitation ↗'}</button>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={() => {
            setStatus(ru
              ? 'Откроется форма ' + item.name + '. Награда на главной не начисляется; серверные SHARDS учитываются только за подходящую приглашённую сессию внутри игры.'
              : 'Opening the ' + item.name + ' composer. No homepage reward is granted; server-verified SHARDS are earned only through a qualifying referred game session.')
          }}>{item.name} ↗</a>)}
        </div>
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
        <small>{ru ? 'SHARDS — пилотные очки без денежной стоимости и без обмена на покупки. Участие в проверке приглашений отдельно добровольное.' : 'SHARDS are pilot points with no cash value and cannot be redeemed for purchases. Referral tracking is separately opt-in.'}</small>
      </aside>
    </div>
  </section>
}
