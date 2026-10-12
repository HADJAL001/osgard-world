import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Clock3, ExternalLink,
  Gamepad2, Heart, Mail, Maximize2, MessageCircle, Monitor, Play, Search, Share2,
  Smartphone, Sparkles, X,
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { recordOsgardEvent } from './core/eventQueue'
import type { OsgardEventName } from './core/manifest'
import './games-hub.css'

type Locale = 'ru' | 'en'
type Category = 'all' | 'strategy' | 'coop' | 'tactical' | 'world' | 'creative'
type DeviceFilter = 'all' | 'desktop' | 'mobile'
type Consent = 'granted' | 'denied' | null

type GameDefinition = {
  id: string
  mark: string
  titleRu: string
  titleEn: string
  category: Exclude<Category, 'all'>
  genreRu: string
  genreEn: string
  descriptionRu: string
  descriptionEn: string
  href: string
  devices: DeviceFilter[]
  controlsRu: string
  controlsEn: string
  supportRu: string
  supportEn: string
  featuresRu: string[]
  featuresEn: string[]
  theme: string
}

const GAMES: GameDefinition[] = [
  {
    id: 'time',
    mark: 'ET',
    titleRu: 'ИМПЕРИЯ ВРЕМЕНИ',
    titleEn: 'EMPIRE OF TIME',
    category: 'strategy',
    genreRu: 'Сюжетная стратегия',
    genreEn: 'Story strategy',
    descriptionRu: 'Развивайте живой город: распоряжайтесь казной и энергией, стройте районы и договаривайтесь с фракциями. У каждого решения есть последствия.',
    descriptionEn: 'Shape a living city: manage the treasury and energy, develop districts and negotiate with factions. Every decision has consequences.',
    href: '/games/time',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Кликайте по районам, действиям совета и строительным карточкам. На телефоне используйте те же элементы интерфейса.',
    controlsEn: 'Select districts, council actions and building cards. On phones, use the same interface controls.',
    supportRu: 'Интерактивная React-игра внутри портала. Режим сохранения и диагностики реализован в самой игре.',
    supportEn: 'An interactive React game inside the portal. Save-state and diagnostics are implemented in the game itself.',
    featuresRu: ['Экономика и ресурсы', 'Районы и строительство', 'Фракции и летопись решений'],
    featuresEn: ['Economy and resources', 'Districts and construction', 'Factions and decision chronicle'],
    theme: 'time',
  },
  {
    id: 'swarm',
    mark: 'SW',
    titleRu: 'SWARM',
    titleEn: 'SWARM',
    category: 'coop',
    genreRu: 'Кооперативная симуляция',
    genreEn: 'Co-op simulation',
    descriptionRu: 'Одна команда — разные роли. Координируйте движение, синхронизируйте действия и добудьте ядро до окончания миссии.',
    descriptionEn: 'One crew, different roles. Coordinate movement, synchronize actions and extract the core before the mission ends.',
    href: '/games/swarm/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'ПК: WASD, пробел и F. На сенсорных устройствах предусмотрены отдельные экранные кнопки движения, прыжка и захвата.',
    controlsEn: 'Desktop: WASD, Space and F. Touch devices have dedicated on-screen move, jump and grab controls.',
    supportRu: 'Браузерная игра с разметкой сенсорного управления. Для онлайн-комнат требуется подключение к сети.',
    supportEn: 'A browser game with explicit touch controls. Online rooms require a network connection.',
    featuresRu: ['Роли команды', 'Онлайн-комната', 'Миссия и экстракция'],
    featuresEn: ['Team roles', 'Online room', 'Mission and extraction'],
    theme: 'swarm',
  },
  {
    id: 'null-shift',
    mark: 'NS',
    titleRu: 'NULL//SHIFT',
    titleEn: 'NULL//SHIFT',
    category: 'tactical',
    genreRu: 'Тактический рейд',
    genreEn: 'Tactical raid',
    descriptionRu: 'Проникните на объект, взломайте узлы, переключайте реальность и извлеките ядро. Следите за тревогой и нестабильностью.',
    descriptionEn: 'Infiltrate a facility, breach nodes, shift reality and extract the core. Watch the alarm and instability levels.',
    href: '/games/null-shift/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'ПК: клавиатура и мышь. Для телефона предусмотрены виртуальный джойстик и сенсорные кнопки действий.',
    controlsEn: 'Desktop: keyboard and mouse. Phones have a virtual joystick and touch action controls.',
    supportRu: 'В репозитории доступна самостоятельная браузерная версия. Отдельный Godot-проект хранится отдельно от веб-версии.',
    supportEn: 'A standalone browser build is present in the repository. The Godot project is maintained separately from the web build.',
    featuresRu: ['Тактическая арена', 'Переключение слоёв', 'Показатели рейда и экстракция'],
    featuresEn: ['Tactical arena', 'Reality-layer shifting', 'Raid telemetry and extraction'],
    theme: 'shift',
  },
  {
    id: 'inherit',
    mark: 'IN',
    titleRu: 'INHERIT',
    titleEn: 'INHERIT',
    category: 'world',
    genreRu: 'Живой мир и наследие',
    genreEn: 'Living world',
    descriptionRu: 'Оставьте след в меняющемся мире и передайте его следующему поколению. Летопись, объекты и история складываются в персональное наследие.',
    descriptionEn: 'Leave a trace in a changing world and pass it to the next generation. Chronicle, objects and history become a personal legacy.',
    href: '/games/inherit/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Основные действия доступны через интерфейс самой игры. На компьютере удобнее широкое окно; на телефоне проверьте все панели перед длинной сессией.',
    controlsEn: 'Core actions are available through the game UI. A wide window is more comfortable on desktop; on phones, check each panel before a long session.',
    supportRu: 'Автономная HTML-игра с локальным сохранением, PWA-манифестом и сервис-воркером.',
    supportEn: 'A standalone HTML game with local save, a PWA manifest and service worker.',
    featuresRu: ['Смена поколений', 'Объекты и действия', 'Экспорт и перенос истории'],
    featuresEn: ['Generational change', 'Objects and actions', 'History export and transfer'],
    theme: 'inherit',
  },
  {
    id: 'remix',
    mark: 'RX',
    titleRu: 'REMIX',
    titleEn: 'REMIX',
    category: 'creative',
    genreRu: 'Арена создателей',
    genreEn: 'Creator arena',
    descriptionRu: 'Создавайте испытания, пробуйте пользовательские сценарии и возвращайтесь к проверяемой истории матча там, где доступен игровой сервер.',
    descriptionEn: 'Create challenges, try player scenarios and revisit a verifiable match history where the game server is available.',
    href: '/games/remix/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Управление через элементы веб-интерфейса. Для сетевых функций требуется доступность игрового API.',
    controlsEn: 'Use the web interface controls. Network features require the game API to be reachable.',
    supportRu: 'Статическая точка входа и серверные возможности описаны в проекте; фактический статус сервера следует проверять в рабочем окружении.',
    supportEn: 'A static entry point and server features are represented in the project; verify live server status in the deployed environment.',
    featuresRu: ['Конструктор испытаний', 'Игровые сценарии', 'История результатов'],
    featuresEn: ['Challenge builder', 'Player scenarios', 'Result history'],
    theme: 'remix',
  },
]

const PROJECTS = [
  { id: 'osgard-new-world', name: 'OSGARD BEW WORLD', domain: 'osgardbewworld.com', href: 'https://osgardbewworld.com/', descRu: 'Создание сайтов, приложений и цифровых платформ.', descEn: 'Websites, apps and digital platforms.', categoryRu: 'Разработка', categoryEn: 'Development' },
  { id: 'o2-system', name: 'O2 SYSTEM', domain: 'o2system.art', href: 'https://o2system.art/', descRu: 'Система учёта кассы обменников.', descEn: 'Cash and transaction tracking for exchange offices.', categoryRu: 'Бизнес-система', categoryEn: 'Business system' },
  { id: 'senjorio', name: 'SENJORIO', domain: 'senjorio.com', href: 'https://senjorio.com/', descRu: 'Премиальное такси и мобильность.', descEn: 'Premium taxi and mobility.', categoryRu: 'Мобильность', categoryEn: 'Mobility' },
  { id: 'superday', name: 'SUPERDAY', domain: 'superday.run', href: 'https://superday.run/', descRu: 'Умная карта и планировщик дня.', descEn: 'Smart map and day planner.', categoryRu: 'Планирование', categoryEn: 'Planning' },
  { id: 'marcosa', name: 'MARCOSA', domain: 'marcosa.club', href: 'https://marcosa.club/', descRu: 'Социальная платформа нового поколения.', descEn: 'A next-generation social platform.', categoryRu: 'Сообщество', categoryEn: 'Community' },
  { id: 'myosa', name: 'MYOSA', domain: 'myosa.world', href: 'https://myosa.world/', descRu: 'Платформа искусственного интеллекта.', descEn: 'Artificial intelligence platform.', categoryRu: 'ИИ', categoryEn: 'AI' },
  { id: 'gold-glamour', name: 'GOLD GLAMOUR', domain: 'gold-glamour.online', href: 'https://gold-glamour.online/', descRu: 'Премиальные услуги с золотом и выездным обслуживанием.', descEn: 'Premium gold services and on-site appointments.', categoryRu: 'Премиальные услуги', categoryEn: 'Premium services' },
  { id: 'gardvpn', name: 'GARD VPN', domain: 'gardvpn.is', href: 'https://gardvpn.is/', descRu: 'VPN-сервис.', descEn: 'VPN service.', categoryRu: 'Безопасность', categoryEn: 'Security' },
  { id: 'osgardos', name: 'OSGARD OS', domain: 'osgardos.com', href: 'https://osgardos.com/', descRu: 'Развитие и систематизация бизнеса.', descEn: 'Business development and operating systems.', categoryRu: 'Бизнес', categoryEn: 'Business' },
  { id: 'vanguard', name: 'OSGARD VANGUARD STUDIO', domain: 'osgardvanguard.studio', href: 'https://osgardvanguard.studio/', descRu: 'Создание видео и визуальных материалов.', descEn: 'Video production and visual content.', categoryRu: 'Медиа', categoryEn: 'Media' },
]

const FAVORITES_KEY = 'osgard.games.favorites.v1'
const RECENT_KEY = 'osgard.games.recent.v1'
const ANALYTICS_CONSENT_KEY = 'osgard.games.analytics-consent.v1'
const EMAIL = 'osman.osmanov0099@gmail.com'
const WHATSAPP = 'https://wa.me/79640027222'

function readStringList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function readConsent(): Consent {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

function storeStringList(key: string, items: string[]) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* local features are optional */ }
}

function storeConsent(value: Exclude<Consent, null>) {
  try { localStorage.setItem(ANALYTICS_CONSENT_KEY, value) } catch { /* consent remains in memory */ }
}

function track(name: OsgardEventName, payload: Record<string, unknown>, consent: Consent) {
  if (consent !== 'granted') return
  try { recordOsgardEvent(name, payload) } catch { /* analytics must never block gameplay */ }
}

function gameTitle(game: GameDefinition, locale: Locale) {
  return locale === 'ru' ? game.titleRu : game.titleEn
}

function gameDescription(game: GameDefinition, locale: Locale) {
  return locale === 'ru' ? game.descriptionRu : game.descriptionEn
}

function formatProjectType(value: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    game: ['Разработка игры', 'Game development'],
    site: ['Сайт или веб-платформа', 'Website or web platform'],
    app: ['Приложение', 'Application'],
    platform: ['Цифровая платформа', 'Digital platform'],
    other: ['Другая задача', 'Other project'],
  }
  return labels[value]?.[locale === 'ru' ? 0 : 1] ?? value
}

function useLocalCatalogState() {
  const [favorites, setFavorites] = useState<string[]>(() => readStringList(FAVORITES_KEY))
  const [recent, setRecent] = useState<string[]>(() => readStringList(RECENT_KEY))
  const [consent, setConsent] = useState<Consent>(readConsent)
  const remember = (id: string) => {
    const next = [id, ...readStringList(RECENT_KEY).filter(item => item !== id)].slice(0, 5)
    storeStringList(RECENT_KEY, next)
    setRecent(next)
  }
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [id, ...favorites]
    storeStringList(FAVORITES_KEY, next)
    setFavorites(next)
    track('portal_opened', { surface: 'games-catalog', action: 'favorite_toggled', game: id, active: next.includes(id) }, consent)
  }
  const chooseConsent = (value: Exclude<Consent, null>) => {
    storeConsent(value)
    setConsent(value)
  }
  return { favorites, recent, consent, remember, toggleFavorite, chooseConsent }
}

export function GamesHub({ locale, setLocale }: { locale: Locale, setLocale: (value: Locale) => void }) {
  const ru = locale === 'ru'
  const { favorites, recent, consent, remember, toggleFavorite, chooseConsent } = useLocalCatalogState()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [device, setDevice] = useState<DeviceFilter>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [notice, setNotice] = useState('')
  const [consentPanelOpen, setConsentPanelOpen] = useState(() => readConsent() === null)
  const pageTracked = useRef(false)
  const categories: Array<{ id: Category, ru: string, en: string }> = [
    { id: 'all', ru: 'Все игры', en: 'All games' },
    { id: 'strategy', ru: 'Стратегия', en: 'Strategy' },
    { id: 'coop', ru: 'Кооператив', en: 'Co-op' },
    { id: 'tactical', ru: 'Тактика', en: 'Tactical' },
    { id: 'world', ru: 'Живой мир', en: 'Living world' },
    { id: 'creative', ru: 'Создание', en: 'Creator' },
  ]
  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return GAMES.filter(game => {
      const text = [game.titleRu, game.titleEn, game.genreRu, game.genreEn, game.descriptionRu, game.descriptionEn, ...game.featuresRu, ...game.featuresEn].join(' ').toLocaleLowerCase()
      const matchesQuery = !normalized || text.includes(normalized)
      const matchesCategory = category === 'all' || game.category === category
      const matchesDevice = device === 'all' || game.devices.includes(device)
      const matchesFavorites = !showFavorites || favorites.includes(game.id)
      return matchesQuery && matchesCategory && matchesDevice && matchesFavorites
    })
  }, [query, category, device, showFavorites, favorites])
  const recentGame = GAMES.find(game => game.id === recent[0])

  useEffect(() => {
    document.title = ru ? 'Игры OSGARD WORLD — каталог игровых миров' : 'OSGARD WORLD Games — playable worlds'
    const description = ru
      ? 'Каталог браузерных игр OSGARD WORLD: стратегия, кооператив, тактика и живые миры.'
      : 'OSGARD WORLD browser games: strategy, co-op, tactics and living worlds.'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (meta) meta.content = description
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = 'https://osgard.world/games'
  }, [ru])

  useEffect(() => {
    if (consent === 'granted' && !pageTracked.current) {
      pageTracked.current = true
      track('portal_opened', { surface: 'games-catalog' }, consent)
    }
  }, [consent])

  const handleShare = async () => {
    const shareData = { title: 'OSGARD WORLD Games', text: ru ? 'Выбери свой игровой мир OSGARD.' : 'Choose your OSGARD game world.', url: window.location.origin + '/games' }
    try {
      if (navigator.share) await navigator.share(shareData)
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url)
        setNotice(ru ? 'Ссылка на каталог скопирована.' : 'Catalog link copied.')
      } else setNotice(ru ? 'Скопируйте ссылку из адресной строки.' : 'Copy the link from the address bar.')
      track('share_created', { surface: 'games-catalog' }, consent)
    } catch {
      setNotice(ru ? 'Поделиться не получилось. Скопируйте ссылку из адресной строки.' : 'Sharing failed. Copy the link from the address bar.')
    }
  }

  const openProject = (projectId: string, domain: string) => {
    track('portal_opened', { surface: 'games-ecosystem-referral', project: projectId, outboundDomain: domain }, consent)
  }

  const handleLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const projectType = String(data.get('projectType') ?? 'game')
    const contact = String(data.get('contact') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()
    const budget = String(data.get('budget') ?? '').trim()
    if (!contact || !description) return
    const subject = ru ? 'Заявка на разработку — OSGARD' : 'Development inquiry — OSGARD'
    const body = [
      (ru ? 'Тип проекта: ' : 'Project type: ') + formatProjectType(projectType, locale),
      (ru ? 'Контакт для ответа: ' : 'Reply contact: ') + contact,
      (ru ? 'Бюджет (необязательно): ' : 'Budget (optional): ') + (budget || (ru ? 'не указан' : 'not provided')),
      '',
      (ru ? 'Задача: ' : 'Brief: ') + description,
      '',
      (ru ? 'Источник: OSGARD WORLD / Games' : 'Source: OSGARD WORLD / Games'),
    ].join('\n')
    track('site_builder_opened', { surface: 'games-lead-form', projectType }, consent)
    setNotice(ru ? 'Подготовлено письмо. Отправьте его в почтовом приложении; серверная отправка формы пока не подключена.' : 'Email draft prepared. Send it from your mail app; server-side form delivery is not connected yet.')
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
  }

  return <main className="gh-page">
    <header className="gh-header">
      <a className="gh-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
      <nav className="gh-nav" aria-label={ru ? 'Навигация игр' : 'Games navigation'}>
        <a href="/games" aria-current="page">{ru ? 'Игры' : 'Games'}</a>
        <a href="/worlds">{ru ? 'Миры' : 'Worlds'}</a>
        <a href="/development">{ru ? 'Разработка' : 'Development'}</a>
      </nav>
      <div className="gh-header-actions">
        <button className="gh-language" type="button" onClick={() => setLocale(ru ? 'en' : 'ru')} aria-label={ru ? 'Switch to English' : 'Переключить на русский'}>{ru ? 'RU' : 'EN'} <span>↔</span></button>
        <a className="gh-contact-link" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />{ru ? 'Обсудить игру' : 'Build a game'}</a>
      </div>
    </header>

    <section className="gh-hero">
      <div className="gh-hero-copy">
        <p className="gh-eyebrow"><span className="gh-signal" /> OSGARD WORLD / PLAY ARCHIVE</p>
        <h1>{ru ? <>Не просто игры.<br /><em>Миры, которые отвечают.</em></> : <>More than games.<br /><em>Worlds that respond.</em></>}</h1>
        <p className="gh-hero-lead">{ru ? 'Стратегия, совместные миссии и живые миры — каждый с собственными правилами, ритмом и последствиями.' : 'Strategy, co-op missions and living worlds — each with its own rules, rhythm and consequences.'}</p>
        <div className="gh-hero-actions">
          <a className="gh-primary" href="#gh-catalog"><Play size={16} fill="currentColor" />{ru ? 'Выбрать игру' : 'Choose a game'}<ArrowRight size={16} /></a>
          <a className="gh-secondary" href="#gh-ecosystem">{ru ? 'Экосистема OSGARD' : 'OSGARD ecosystem'} <ArrowUpRight size={15} /></a>
        </div>
        <div className="gh-proofline"><span><b>05</b>{ru ? 'игровых миров' : 'game worlds'}</span><i /><span>{ru ? 'Браузерный запуск' : 'Browser launch'}</span><i /><span>{ru ? 'ПК и сенсорные экраны' : 'Desktop and touch'}</span></div>
      </div>
      <div className="gh-hero-art" aria-hidden="true">
        <div className="gh-orbit gh-orbit-a" /><div className="gh-orbit gh-orbit-b" /><div className="gh-orbit gh-orbit-c" />
        <div className="gh-core"><span>OSGARD</span><b>PLAY</b><i>EST. IN SYSTEMS</i></div>
        <div className="gh-coordinate gh-coordinate-one">WORLD / 001</div>
        <div className="gh-coordinate gh-coordinate-two">LIVE STATE : SELECT</div>
        <div className="gh-art-node gh-art-node-one">ET</div><div className="gh-art-node gh-art-node-two">NS</div><div className="gh-art-node gh-art-node-three">SW</div>
      </div>
      <div className="gh-hero-bottom"><span>01 / THE COLLECTION</span><span>{ru ? 'Играйте. Исследуйте. Возвращайтесь.' : 'Play. Explore. Return.'}</span></div>
    </section>

    {recentGame && <section className="gh-continue">
      <div className="gh-continue-mark"><Clock3 size={17} /><span>{ru ? 'НЕДАВНО ОТКРЫВАЛИ' : 'RECENTLY OPENED'}</span></div>
      <div className="gh-continue-copy"><strong>{gameTitle(recentGame, locale)}</strong><span>{ru ? 'Ваш последний игровой мир на этом устройстве.' : 'Your last game world on this device.'}</span></div>
      <a href={'/game/' + recentGame.id} className="gh-continue-action">{ru ? 'Вернуться' : 'Return'}<ArrowRight size={15} /></a>
    </section>}

    <section id="gh-catalog" className="gh-catalog">
      <div className="gh-section-heading">
        <div><p className="gh-eyebrow">02 / SELECT YOUR WORLD</p><h2>{ru ? 'Найди свою следующую игру.' : 'Find your next game.'}</h2></div>
        <div className="gh-count"><strong>{String(filteredGames.length).padStart(2, '0')}</strong><span>{ru ? 'НАЙДЕНО' : 'FOUND'}</span></div>
      </div>
      <div className="gh-toolbar">
        <label className="gh-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={ru ? 'Поиск по названию, жанру или механике…' : 'Search by title, genre or mechanic…'} aria-label={ru ? 'Поиск игр' : 'Search games'} /><kbd>⌘ / Ctrl K</kbd></label>
        <div className="gh-toolbar-tools">
          <label className="gh-device-select"><Monitor size={15} /><select value={device} onChange={event => setDevice(event.target.value as DeviceFilter)} aria-label={ru ? 'Фильтр устройства' : 'Device filter'}><option value="all">{ru ? 'Все устройства' : 'All devices'}</option><option value="desktop">{ru ? 'Компьютер' : 'Desktop'}</option><option value="mobile">{ru ? 'Телефон / планшет' : 'Phone / tablet'}</option></select></label>
          <button className={'gh-filter-switch' + (showFavorites ? ' is-active' : '')} type="button" onClick={() => setShowFavorites(value => !value)} aria-pressed={showFavorites}><Heart size={15} fill={showFavorites ? 'currentColor' : 'none'} />{ru ? 'Избранное' : 'Favorites'} <span>{favorites.length}</span></button>
          <button className="gh-share" type="button" onClick={() => void handleShare()} aria-label={ru ? 'Поделиться каталогом' : 'Share catalog'}><Share2 size={17} /></button>
        </div>
      </div>
      <div className="gh-categories" role="group" aria-label={ru ? 'Категории игр' : 'Game categories'}>
        {categories.map(item => <button key={item.id} type="button" className={category === item.id ? 'is-active' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{ru ? item.ru : item.en}</button>)}
      </div>
      <div className="gh-grid">
        {filteredGames.map((game, index) => <article className={'gh-game-card gh-game-card--' + game.theme} key={game.id}>
          <div className="gh-card-art" aria-hidden="true">
            <span className="gh-card-index">{String(index + 1).padStart(2, '0')} / OSGARD PLAY</span>
            <div className="gh-card-glyph"><b>{game.mark}</b><i /><em /></div>
            <div className="gh-card-art-footer"><span>{game.genreEn.toUpperCase()}</span><span>WEB / INTERACTIVE</span></div>
          </div>
          <div className="gh-card-body">
            <div className="gh-card-kicker"><span>{ru ? game.genreRu : game.genreEn}</span><button type="button" className={'gh-favorite' + (favorites.includes(game.id) ? ' is-active' : '')} aria-label={(favorites.includes(game.id) ? (ru ? 'Убрать из избранного: ' : 'Remove from favorites: ') : (ru ? 'Добавить в избранное: ' : 'Add to favorites: ')) + gameTitle(game, locale)} aria-pressed={favorites.includes(game.id)} onClick={() => toggleFavorite(game.id)}><Heart size={17} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} /></button></div>
            <h3><a href={'/game/' + game.id}>{gameTitle(game, locale)}</a></h3>
            <p>{gameDescription(game, locale)}</p>
            <div className="gh-card-features">{(ru ? game.featuresRu : game.featuresEn).slice(0, 2).map(feature => <span key={feature}>{feature}</span>)}</div>
            <div className="gh-card-actions"><a className="gh-details" href={'/game/' + game.id}>{ru ? 'Об игре' : 'Game details'} <ChevronRight size={15} /></a><a className="gh-play" href={'/game/' + game.id + '?launch=1'}>{ru ? 'Играть' : 'Play'} <ArrowUpRight size={15} /></a></div>
          </div>
        </article>)}
      </div>
      {filteredGames.length === 0 && <div className="gh-empty"><Search size={24} /><h3>{ru ? 'Ничего не найдено' : 'No matches'}</h3><p>{ru ? 'Измени запрос, жанр или фильтр устройств.' : 'Change the search, category or device filter.'}</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); setDevice('all'); setShowFavorites(false) }}>{ru ? 'Сбросить фильтры' : 'Reset filters'}</button></div>}
      <div className="gh-catalog-note"><Sparkles size={15} /><p>{ru ? 'Игры открываются на этом домене. Некоторые сетевые режимы зависят от доступности соответствующего игрового API.' : 'Games open on this domain. Some network modes depend on the availability of their game API.'}</p></div>
    </section>

    <section className="gh-partner-band">
      <div className="gh-partner-symbol" aria-hidden="true"><span>O</span><i /></div>
      <div className="gh-partner-copy"><p className="gh-eyebrow">OSGARD / PARTNERSHIPS</p><h2>{ru ? 'Бренд может стать частью игрового мира.' : 'A brand can become part of a game world.'}</h2><p>{ru ? 'Обсудим спонсорский уровень, тематическое событие или отдельную игру под задачу бизнеса. Рекламные интеграции всегда будут обозначены явно.' : 'Discuss a sponsored level, themed event or a bespoke game for your business. Advertising integrations will always be clearly labelled.'}</p></div>
      <a href="#gh-contact" className="gh-secondary">{ru ? 'Обсудить интеграцию' : 'Discuss a partnership'}<ArrowUpRight size={15} /></a>
    </section>

    <section id="gh-ecosystem" className="gh-ecosystem">
      <div className="gh-section-heading"><div><p className="gh-eyebrow">03 / CONNECTED PRODUCTS</p><h2>{ru ? 'Одна экосистема. Разные инструменты.' : 'One ecosystem. Different tools.'}</h2><p className="gh-section-description">{ru ? 'Переходите из игрового пространства в продукты OSGARD по теме, которая вам интересна.' : 'Move from the game space to OSGARD products that match your interests.'}</p></div><a className="gh-text-link" href="/worlds">{ru ? 'Все миры' : 'All worlds'}<ArrowUpRight size={15} /></a></div>
      <div className="gh-project-grid">{PROJECTS.map((project, index) => <a className="gh-project-card" href={project.href} key={project.id} target="_blank" rel="noopener noreferrer" onClick={() => openProject(project.id, project.domain)}>
        <div className="gh-project-index"><span>0{index + 1}</span><ArrowUpRight size={14} /></div><strong>{project.name}</strong><p>{ru ? project.descRu : project.descEn}</p><div><small>{ru ? project.categoryRu : project.categoryEn}</small><span>{project.domain}</span></div>
      </a>)}</div>
    </section>

    <section id="gh-contact" className="gh-contact-section">
      <div className="gh-contact-copy"><p className="gh-eyebrow">04 / BUILD WITH OSGARD</p><h2>{ru ? <>Есть идея?<br /><em>Давайте создадим.</em></> : <>Have an idea?<br /><em>Let's build it.</em></>}</h2><p>{ru ? 'Есть идея игры, сайта или приложения? OSGARD поможет превратить её в цифровой продукт.' : 'Have an idea for a game, website or app? OSGARD can help turn it into a digital product.'}</p>
        <div className="gh-contact-options"><a href={'mailto:' + EMAIL} onClick={() => track('site_builder_opened', { surface: 'games-contact', channel: 'email' }, consent)}><Mail size={16} />{EMAIL}</a><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" onClick={() => track('site_builder_opened', { surface: 'games-contact', channel: 'whatsapp' }, consent)}><MessageCircle size={16} />WhatsApp <span>+7 964 002-72-22</span><ArrowUpRight size={14} /></a></div>
      </div>
      <form className="gh-lead-form" onSubmit={handleLead}>
        <div className="gh-form-heading"><span>{ru ? 'КОРОТКО О ПРОЕКТЕ' : 'A QUICK PROJECT BRIEF'}</span><small>{ru ? 'Ответим после получения письма' : 'We will respond after receiving your email'}</small></div>
        <label><span>{ru ? 'Что нужно создать?' : 'What do you want to build?'}</span><select name="projectType" required defaultValue="game"><option value="game">{ru ? 'Игру' : 'A game'}</option><option value="site">{ru ? 'Сайт или веб-платформу' : 'A website or web platform'}</option><option value="app">{ru ? 'Приложение' : 'An application'}</option><option value="platform">{ru ? 'Цифровую платформу' : 'A digital platform'}</option><option value="other">{ru ? 'Другое' : 'Something else'}</option></select></label>
        <label><span>{ru ? 'Контакт для ответа' : 'Reply contact'}</span><input name="contact" required maxLength={180} placeholder={ru ? 'Email, телефон или мессенджер' : 'Email, phone or messenger'} /></label>
        <label><span>{ru ? 'Кратко о задаче' : 'Tell us about the project'}</span><textarea name="description" required minLength={10} maxLength={3000} rows={4} placeholder={ru ? 'Цель, аудитория, ключевые функции…' : 'Goal, audience, key features…'} /></label>
        <label><span>{ru ? 'Ориентир бюджета (по желанию)' : 'Budget range (optional)'}</span><input name="budget" maxLength={120} placeholder={ru ? 'Можно оставить пустым' : 'Can be left blank'} /></label>
        <button className="gh-primary gh-submit" type="submit">{ru ? 'Подготовить заявку' : 'Prepare inquiry'}<ArrowRight size={16} /></button>
        <p className="gh-form-note">{ru ? 'Форма подготовит письмо в вашем почтовом приложении. Серверное хранение заявок пока не подключено.' : 'The form prepares an email in your mail app. Server-side lead storage is not connected yet.'}</p>
      </form>
    </section>

    <footer className="gh-footer">
      <a href="/" className="gh-footer-brand"><OsgardLogo variant="footer" /></a><span>© OSGARD WORLD · PLAY WITH PURPOSE</span>
      <div><a href="/privacy">{ru ? 'Конфиденциальность' : 'Privacy'}</a><a href="/terms">{ru ? 'Условия' : 'Terms'}</a><button type="button" onClick={() => setConsentPanelOpen(true)}>{ru ? 'Настройки аналитики' : 'Analytics settings'}</button></div>
    </footer>

    {consentPanelOpen && <div className="gh-consent" role="dialog" aria-modal="true" aria-labelledby="gh-consent-title">
      <div className="gh-consent-mark"><ShieldGlyph /></div><div className="gh-consent-copy"><strong id="gh-consent-title">{ru ? 'Вы управляете игровой аналитикой' : 'You control game analytics'}</strong><p>{ru ? 'Необязательные события этого каталога (открытие игр, переходы и поделиться) будут записываться только после согласия. Избранное и история нужны для локальных функций и остаются в браузере.' : 'Optional events from this catalog (game opens, referrals and sharing) are recorded only after consent. Favorites and recent history support local features and stay in your browser.'}</p><small>{ru ? 'Данные каталога не содержат текст заявок или контактные поля.' : 'Catalog analytics never contains your inquiry text or contact fields.'}</small></div><div className="gh-consent-actions"><button type="button" className="gh-consent-accept" onClick={() => { chooseConsent('granted'); setConsentPanelOpen(false) }}><Check size={15} />{ru ? 'Разрешить' : 'Allow'}</button><button type="button" className="gh-consent-deny" onClick={() => { chooseConsent('denied'); setConsentPanelOpen(false) }}>{ru ? 'Не разрешать' : 'Decline'}</button><button type="button" className="gh-consent-close" aria-label={ru ? 'Закрыть настройки' : 'Close settings'} onClick={() => setConsentPanelOpen(false)}><X size={15} /></button></div>
    </div>}
    {notice && <div className="gh-toast" role="status" aria-live="polite">{notice}<button type="button" onClick={() => setNotice('')} aria-label={ru ? 'Закрыть уведомление' : 'Dismiss notice'}><X size={14} /></button></div>}
  </main>
}

function ShieldGlyph() {
  return <svg width="28" height="32" viewBox="0 0 28 32" aria-hidden="true"><path d="M14 2 25 6v8c0 7-4.7 12-11 16C7.7 26 3 21 3 14V6z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m9 15 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
}

export function GameDetailPage({ slug }: { slug: string }) {
  const game = GAMES.find(item => item.id === slug)
  const [locale, setLocale] = useState<Locale>('ru')
  const ru = locale === 'ru'
  const { favorites, recent, consent, remember, toggleFavorite, chooseConsent } = useLocalCatalogState()
  const [playing, setPlaying] = useState(() => new URLSearchParams(window.location.search).get('launch') === '1')
  const [loadingGame, setLoadingGame] = useState(true)
  const [frameError, setFrameError] = useState(false)
  const [notice, setNotice] = useState('')
  const [consentPanelOpen, setConsentPanelOpen] = useState(() => readConsent() === null)
  const stageRef = useRef<HTMLDivElement>(null)
  const detailTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!game) {
      document.title = 'Game not found — OSGARD WORLD'
      return
    }
    const title = gameTitle(game, locale) + ' — OSGARD WORLD'
    document.title = title
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (meta) meta.content = gameDescription(game, locale)
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = 'https://osgard.world/game/' + game.id
  }, [game?.id, locale])

  useEffect(() => {
    if (game && consent === 'granted' && detailTracked.current !== game.id) {
      detailTracked.current = game.id
      track('game_opened', { game: game.id, surface: 'game-detail' }, consent)
    }
  }, [game?.id, consent])

  useEffect(() => {
    if (playing && game) {
      remember(game.id)
      setLoadingGame(true)
      setFrameError(false)
    }
  }, [playing, game?.id])

  const startPlaying = () => {
    if (!game) return
    remember(game.id)
    setLoadingGame(true)
    setFrameError(false)
    setPlaying(true)
  }

  const shareGame = async () => {
    if (!game) return
    const url = window.location.origin + '/game/' + game.id
    try {
      if (navigator.share) await navigator.share({ title: gameTitle(game, locale), text: gameDescription(game, locale), url })
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setNotice(ru ? 'Ссылка скопирована.' : 'Link copied.')
      } else setNotice(ru ? 'Скопируйте ссылку из адресной строки.' : 'Copy the link from the address bar.')
      track('share_created', { game: game.id, surface: 'game-detail' }, consent)
    } catch {
      setNotice(ru ? 'Не удалось поделиться. Скопируйте URL из адресной строки.' : 'Sharing failed. Copy the URL from the address bar.')
    }
  }

  const toggleFullscreen = () => {
    const stage = stageRef.current
    if (!stage) return
    if (!document.fullscreenElement) stage.requestFullscreen().catch(() => setNotice(ru ? 'Полноэкранный режим недоступен в этом браузере.' : 'Fullscreen is not available in this browser.'))
    else document.exitFullscreen().catch(() => setNotice(ru ? 'Не удалось выйти из полноэкранного режима.' : 'Could not exit fullscreen.'))
  }

  if (!game) return <main className="gh-page gh-not-found"><a href="/games"><ArrowLeft size={16} />{ru ? 'Вернуться в каталог' : 'Back to games'}</a><p className="gh-eyebrow">404 / WORLD NOT FOUND</p><h1>{ru ? 'Этого мира нет в каталоге.' : 'This world is not in the catalog.'}</h1><p>{ru ? 'Проверьте ссылку или выберите одну из доступных игр.' : 'Check the URL or choose one of the available games.'}</p><a className="gh-primary" href="/games">{ru ? 'Открыть игры' : 'Open games'}<ArrowRight size={16} /></a></main>

  const relatedGames = GAMES.filter(item => item.id !== game.id).slice(0, 3)

  return <main className={'gh-page gh-detail-page gh-detail--' + game.theme}>
    <header className="gh-header">
      <a className="gh-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
      <nav className="gh-nav" aria-label={ru ? 'Навигация игр' : 'Games navigation'}><a href="/games">{ru ? 'Все игры' : 'All games'}</a><a href="/worlds">{ru ? 'Миры' : 'Worlds'}</a><a href="/development">{ru ? 'Разработка' : 'Development'}</a></nav>
      <div className="gh-header-actions"><button className="gh-language" type="button" onClick={() => setLocale(ru ? 'en' : 'ru')}>{ru ? 'RU ↔ EN' : 'EN ↔ RU'}</button><a className="gh-contact-link" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />{ru ? 'Обсудить игру' : 'Build a game'}</a></div>
    </header>

    <div className="gh-detail-wrap">
      <div className="gh-breadcrumb"><a href="/games"><ArrowLeft size={14} />{ru ? 'Все игровые миры' : 'All game worlds'}</a><span>/</span><span>{gameTitle(game, locale)}</span><button type="button" onClick={() => void shareGame()}><Share2 size={15} />{ru ? 'Поделиться' : 'Share'}</button><button type="button" className={favorites.includes(game.id) ? 'is-active' : ''} onClick={() => toggleFavorite(game.id)}><Heart size={15} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} />{favorites.includes(game.id) ? (ru ? 'В избранном' : 'Saved') : (ru ? 'В избранное' : 'Save')}</button></div>

      {!playing ? <>
        <section className="gh-detail-hero">
          <div className="gh-detail-copy"><p className="gh-eyebrow">OSGARD PLAY / {game.id.toUpperCase()}</p><h1>{gameTitle(game, locale)}</h1><p className="gh-detail-genre">{ru ? game.genreRu : game.genreEn}</p><p className="gh-detail-description">{gameDescription(game, locale)}</p><div className="gh-detail-pills"><span><Monitor size={14} />{ru ? 'Браузер · ПК' : 'Browser · desktop'}</span><span><Smartphone size={14} />{ru ? 'Сенсорный интерфейс' : 'Touch interface'}</span><span><Gamepad2 size={14} />{ru ? 'Без установки' : 'No install'}</span></div><div className="gh-detail-actions"><button className="gh-primary" type="button" onClick={startPlaying}><Play size={17} fill="currentColor" />{ru ? 'Запустить игру' : 'Launch game'}<ArrowRight size={16} /></button><a className="gh-secondary" href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть отдельно' : 'Open standalone'}<ExternalLink size={15} /></a></div></div>
          <div className="gh-detail-art" aria-hidden="true"><div className="gh-detail-ring gh-detail-ring-one" /><div className="gh-detail-ring gh-detail-ring-two" /><div className="gh-detail-mark">{game.mark}</div><span>{game.genreEn.toUpperCase()}</span><small>OSGARD WORLD / PLAY</small></div>
        </section>
        <section className="gh-detail-info-grid"><article><p className="gh-eyebrow">01 / INPUT</p><h2>{ru ? 'Управление' : 'Controls'}</h2><p>{ru ? game.controlsRu : game.controlsEn}</p></article><article><p className="gh-eyebrow">02 / PLATFORM</p><h2>{ru ? 'Совместимость' : 'Compatibility'}</h2><p>{ru ? game.supportRu : game.supportEn}</p><small>{ru ? 'Фактическую производительность проверяйте на целевом устройстве и браузере.' : 'Verify actual performance on the target device and browser.'}</small></article><article><p className="gh-eyebrow">03 / FEATURES</p><h2>{ru ? 'Что внутри' : 'What is inside'}</h2><ul>{(ru ? game.featuresRu : game.featuresEn).map(feature => <li key={feature}><Check size={14} />{feature}</li>)}</ul></article></section>
      </> : <section className="gh-play-screen">
        <div className="gh-play-toolbar"><div><span className="gh-play-live" /><strong>{gameTitle(game, locale)}</strong><small>{ru ? 'Игровая сессия' : 'Game session'}</small></div><div><a href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть в отдельной вкладке' : 'Open in new tab'}<ExternalLink size={14} /></a><button type="button" onClick={toggleFullscreen}><Maximize2 size={15} />{ru ? 'На весь экран' : 'Fullscreen'}</button><button type="button" onClick={() => setPlaying(false)}><X size={15} />{ru ? 'Закрыть игру' : 'Close game'}</button></div></div>
        <div className="gh-game-stage" ref={stageRef}>
          {loadingGame && !frameError && <div className="gh-game-loading"><span className="gh-loader" /><p>{ru ? 'Подключаем игровой мир…' : 'Loading game world…'}</p></div>}
          {frameError ? <div className="gh-game-error"><p>{ru ? 'Не удалось загрузить встроенную игру.' : 'The embedded game could not be loaded.'}</p><a className="gh-primary" href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть игру отдельно' : 'Open game separately'}<ExternalLink size={15} /></a></div> : <iframe title={gameTitle(game, locale)} src={game.href} onLoad={() => { setLoadingGame(false); track('game_session_started', { game: game.id, surface: 'games-iframe' }, consent) }} onError={() => { setLoadingGame(false); setFrameError(true) }} allow="fullscreen; gamepad; clipboard-write" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin" />}
        </div>
        <p className="gh-play-note">{ru ? 'Игра выполняется в отдельном встроенном окне. Если управление или сетевой режим работают некорректно, откройте её в отдельной вкладке.' : 'The game runs in an embedded frame. If controls or network play do not work correctly, open it in a separate tab.'}</p>
      </section>}

      <section className="gh-related"><div className="gh-section-heading"><div><p className="gh-eyebrow">NEXT / CONTINUE EXPLORING</p><h2>{ru ? 'Другие игровые миры' : 'More game worlds'}</h2></div><a className="gh-text-link" href="/games">{ru ? 'Весь каталог' : 'Full catalog'}<ArrowUpRight size={15} /></a></div><div className="gh-related-grid">{relatedGames.map(item => <a href={'/game/' + item.id} key={item.id} className={'gh-related-card gh-related-card--' + item.theme}><span>{item.mark}</span><div><small>{ru ? item.genreRu : item.genreEn}</small><strong>{gameTitle(item, locale)}</strong></div><ArrowUpRight size={15} /></a>)}</div></section>
    </div>

    <footer className="gh-footer"><a href="/" className="gh-footer-brand"><OsgardLogo variant="footer" /></a><span>© OSGARD WORLD · PLAY WITH PURPOSE</span><div><a href="/privacy">{ru ? 'Конфиденциальность' : 'Privacy'}</a><a href="/terms">{ru ? 'Условия' : 'Terms'}</a><button type="button" onClick={() => setConsentPanelOpen(true)}>{ru ? 'Настройки аналитики' : 'Analytics settings'}</button></div></footer>
    {consentPanelOpen && <div className="gh-consent" role="dialog" aria-modal="true" aria-labelledby="gh-consent-title"><div className="gh-consent-mark"><ShieldGlyph /></div><div className="gh-consent-copy"><strong id="gh-consent-title">{ru ? 'Вы управляете игровой аналитикой' : 'You control game analytics'}</strong><p>{ru ? 'События игрового раздела отправляются только после согласия. Избранное и история используются локально.' : 'Games-section events are sent only after consent. Favorites and history are stored locally.'}</p></div><div className="gh-consent-actions"><button type="button" className="gh-consent-accept" onClick={() => { chooseConsent('granted'); setConsentPanelOpen(false) }}><Check size={15} />{ru ? 'Разрешить' : 'Allow'}</button><button type="button" className="gh-consent-deny" onClick={() => { chooseConsent('denied'); setConsentPanelOpen(false) }}>{ru ? 'Не разрешать' : 'Decline'}</button><button type="button" className="gh-consent-close" onClick={() => setConsentPanelOpen(false)} aria-label={ru ? 'Закрыть настройки' : 'Close settings'}><X size={15} /></button></div></div>}
    {notice && <div className="gh-toast" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={ru ? 'Закрыть уведомление' : 'Dismiss notice'}><X size={14} /></button></div>}
  </main>
}
