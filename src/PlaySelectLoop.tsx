import { useEffect, useState } from 'react'

type Locale = 'ru' | 'en'
type Wallet = { balance: number; day: string }
const WALLET_KEY = 'osgard.games.shards-wallet.v1'

const services = [
  { id: 'marcosa', name: 'MARCOSA', category: 'SOCIAL / COMMUNITY', ru: 'Социальная сеть, сообщества и цифровые миры.', en: 'Social networking, communities and digital worlds.', url: 'https://marcosa.club/' },
  { id: 'projects', name: 'OSGARD BEW WORLD', category: 'DIGITAL STUDIO', ru: 'Создание игр, сайтов, приложений и цифровых продуктов.', en: 'Games, websites, apps and digital product development.', url: 'https://osgardbewworld.com/' },
  { id: 'o2-system', name: 'O2 SYSTEM', category: 'BUSINESS OPERATIONS', ru: 'Система учёта кассы обменников.', en: 'Cash and transaction accounting for exchange offices.', url: 'https://o2system.art/' },
  { id: 'senjorio', name: 'SENJORIO', category: 'PREMIUM MOBILITY', ru: 'Премиальный сервис такси.', en: 'Premium taxi service.', url: 'https://senjorio.com/' },
  { id: 'superday', name: 'SUPERDAY', category: 'MAP / DAILY PLANNING', ru: 'Умная карта и планировщик дня.', en: 'Smart map and day planner.', url: 'https://superday.run/' },
  { id: 'myosa', name: 'MYOSA', category: 'AI PLATFORM', ru: 'Платформа искусственного интеллекта.', en: 'AI platform.', url: 'https://myosa.world/' },
  { id: 'gold-glamour', name: 'GOLD GLAMOUR', category: 'PREMIUM SERVICES', ru: 'Премиальные услуги с золотом и выездным обслуживанием.', en: 'Premium gold-related and mobile services.', url: 'https://gold-glamour.online/' },
  { id: 'gardvpn', name: 'GARD VPN', category: 'PRIVACY / VPN', ru: 'VPN-сервис; проверьте доступность и условия на сайте проекта. Доступность домена не подтверждена независимо; межигровое промо пока отключено.', en: 'VPN service; check availability and terms on the project site. The domain has not been independently verified, so between-game promotion is disabled.', url: 'https://gardvpn.is/' },
  { id: 'osgard-business', name: 'OSGARD OS', category: 'BUSINESS DEVELOPMENT', ru: 'Направление развития бизнеса.', en: 'Business development.', url: 'https://osgardos.com/' },
  { id: 'vanguard', name: 'OSGARD VANGUARD STUDIO', category: 'VIDEO STUDIO', ru: 'Создание видео для цифровых продуктов и кампаний.', en: 'Video production for digital products and campaigns.', url: 'https://osgardvanguard.studio/' },
] as const

type PromoFrequency = 'each' | 'every3' | 'off'
type PromoPreferences = { frequency: PromoFrequency; selected: string[] }
const PROMO_PREFERENCES_KEY = 'osgard.games.postgame-service-preferences.v1'
const PROMOTABLE_SERVICE_IDS = services.filter(service => service.id !== 'gardvpn').map(service => service.id)

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

function readWallet(): Wallet {
  if (typeof window === 'undefined') return { balance: 0, day: '' }
  try {
    const value = JSON.parse(window.localStorage.getItem(WALLET_KEY) || '{}')
    return {
      balance: Number.isSafeInteger(value.balance) && value.balance >= 0 ? Math.min(value.balance, 1000000000) : 0,
      day: typeof value.lastRewardDay === 'string' ? value.lastRewardDay : '',
    }
  } catch {
    return { balance: 0, day: '' }
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
  const [balance, setBalance] = useState(() => readWallet().balance)
  const [status, setStatus] = useState('')
  const [pendingNetwork, setPendingNetwork] = useState('')
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
    const refresh = () => setBalance(readWallet().balance)
    const refreshPromoPreferences = () => {
      const next = readPromoPreferences()
      setPromoPreferences(next)
      setDraftFrequency(next.frequency)
      setDraftSelected(next.selected)
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('osgard:shards-updated', refresh)
    window.addEventListener('storage', refreshPromoPreferences)
    window.addEventListener('osgard:service-preferences-updated', refreshPromoPreferences)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('osgard:shards-updated', refresh)
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

  const grantReward = (source: string) => {
    const current = readWallet()
    const today = new Date().toISOString().slice(0, 10)
    if (current.day === today) {
      setBalance(current.balance)
      setStatus(ru ? 'Сегодня награда уже получена. Баланс: ' + current.balance + ' SHARDS.' : 'Today’s reward is already claimed. Balance: ' + current.balance + ' SHARDS.')
      setPendingNetwork('')
      return
    }
    const next = {
      balance: Math.min(1000000000, current.balance + 50),
      lastRewardDay: today,
      lastSource: source.slice(0, 60),
      updatedAt: new Date().toISOString(),
    }
    try {
      window.localStorage.setItem(WALLET_KEY, JSON.stringify(next))
      setBalance(next.balance)
      window.dispatchEvent(new CustomEvent('osgard:shards-updated', { detail: { balance: next.balance } }))
      setStatus(ru ? '+50 SHARDS добавлено. Баланс: ' + next.balance + '. Награда локальная и не имеет денежной стоимости.' : '+50 SHARDS added. Balance: ' + next.balance + '. Local points have no cash value.')
    } catch {
      setStatus(ru ? 'Браузер не разрешил сохранить награду на этом устройстве.' : 'The browser could not save the reward on this device.')
    }
    setPendingNetwork('')
  }

  const shareInvite = async () => {
    setPendingNetwork('')
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        setPendingNetwork('native-share')
        setStatus(ru
          ? 'Меню отправки закрыто. Если ты действительно опубликовал приглашение, подтверди ниже. Автоматически проверить публикацию невозможно.'
          : 'The share sheet closed. If you actually published the invite, confirm below. The post itself cannot be verified automatically.')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(ru
          ? 'Ссылка скопирована. Копирование само по себе не считается репостом и не даёт награду. Опубликуй её через соцсеть ниже, затем вернись и подтверди.'
          : 'Link copied. Copying alone is not a repost and earns no reward. Publish it through a social network below, then return and confirm.')
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setPendingNetwork('')
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена — награда не начислена.' : 'Share cancelled — no reward was granted.')
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
            const unavailable = !PROMOTABLE_SERVICE_IDS.includes(service.id)
            return <label className={'play-select-preference-option' + (unavailable ? ' is-unavailable' : '')} key={service.id}>
              <input
                type="checkbox"
                checked={draftSelected.includes(service.id)}
                disabled={unavailable}
                onChange={event => {
                  setDraftSelected(current => event.target.checked
                    ? [...new Set([...current, service.id])]
                    : current.filter(id => id !== service.id))
                  setPromoStatus('')
                }}
              />
              <span><strong>{service.name}</strong><small>{unavailable ? (ru ? 'Промо выключено до подтверждения доступности' : 'Promotion disabled until availability is confirmed') : service.category}</small></span>
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
        <div className="play-select-wallet"><span>OSGARD SHARDS</span><strong>{balance.toLocaleString(ru ? 'ru-RU' : 'en-US')}</strong></div>
        <button type="button" className="play-select-share-primary" onClick={shareInvite}>{ru ? 'Поделиться приглашением ↗' : 'Share invitation ↗'}</button>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={() => {
            setPendingNetwork(item.name)
            setStatus(ru ? 'Открой публикацию в ' + item.name + ', затем вернись и подтверди действие.' : 'Open the ' + item.name + ' composer, then return and confirm the action.')
          }}>{item.name} ↗</a>)}
        </div>
        {pendingNetwork && <button type="button" className="play-select-share-claim" onClick={() => grantReward('homepage-social-confirmation:' + pendingNetwork)}>
          {ru ? (pendingNetwork === 'native-share' ? 'Я действительно опубликовал — получить +50 SHARDS' : 'Я отправил в ' + pendingNetwork + ' — получить +50 SHARDS') : (pendingNetwork === 'native-share' ? 'I actually published the invite — claim +50 SHARDS' : 'I shared on ' + pendingNetwork + ' — claim +50 SHARDS')}
        </button>}
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
        <small>{ru ? 'SHARDS хранятся только локально, не являются деньгами и не обмениваются на денежную стоимость. Соцсети не подтверждают публикацию сайту; пользователь подтверждает отправку сам, а копирование ссылки награду не даёт.' : 'SHARDS are local points, not money and not redeemable. Social networks do not verify posts to this site; social-compose sharing uses player confirmation.'}</small>
      </aside>
    </div>
  </section>
}
