import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, Cpu, ExternalLink,
  Gamepad2, Heart, Mail, Menu, Search, Share2, ShieldCheck, Smartphone,
  Sparkles, Swords, X, Zap,
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { recordOsgardEvent } from './core/eventQueue'
import './gamesHub.css'

type GameId = 'time' | 'swarm' | 'null-shift' | 'inherit' | 'remix'
type Genre = 'Все' | 'Стратегия' | 'Тактика' | 'Кооператив' | 'Создание'
type AnalyticsConsent = 'unset' | 'accepted' | 'declined'

type GameEntry = {
  id: GameId
  mark: string
  title: string
  genre: Exclude<Genre, 'Все'> | 'Стратегия / симуляция'
  mode: string
  description: string
  href: string
  keyArt: string
  controls: string
  experience: string
  featuredCopy: string
}

const GAMES: GameEntry[] = [
  {
    id: 'time',
    mark: 'ET',
    title: 'Империя времени',
    genre: 'Стратегия',
    mode: 'Стратегический прототип',
    description: 'Управляйте городом, районами, ресурсами и политическими решениями. Последствия решений фиксируются в игровой летописи.',
    href: '/games/time',
    keyArt: 'time',
    controls: 'Действия через игровые панели',
    experience: 'Одиночная сессия в браузере',
    featuredCopy: 'Постройте город, который помнит ваши решения.',
  },
  {
    id: 'swarm',
    mark: 'SW',
    title: 'SWARM',
    genre: 'Кооператив',
    mode: 'Кооперативная игровая модель',
    description: 'Подготовьте команду, согласуйте действия, заполните цель и выполните экстракцию в рамках игрового сценария.',
    href: '/play/swarm',
    keyArt: 'swarm',
    controls: 'Кнопки действий внутри игры',
    experience: 'Браузерный прототип; сетевой матч не заявлен',
    featuredCopy: 'Один рой. Несколько решений. Одна цель.',
  },
  {
    id: 'null-shift',
    mark: 'NS',
    title: 'NULL//SHIFT',
    genre: 'Тактика',
    mode: 'Тактический прототип',
    description: 'Взламывайте узлы, переключайте слой реальности, управляйте уровнем тревоги и забирайте ядро.',
    href: '/play/null-shift',
    keyArt: 'null',
    controls: 'Кнопки операций внутри игры',
    experience: 'Браузерный прототип; сетевой матч не заявлен',
    featuredCopy: 'Сместите реальность. Выйдите до захвата.',
  },
  {
    id: 'inherit',
    mark: 'IN',
    title: 'INHERIT',
    genre: 'Стратегия / симуляция',
    mode: 'Симуляция наследия',
    description: 'Экспериментируйте с развитием мира и оставляйте след, который влияет на следующие поколения.',
    href: '/play/inherit',
    keyArt: 'inherit',
    controls: 'Подсказки и действия внутри игры',
    experience: 'Браузерный прототип',
    featuredCopy: 'Мир меняется. Что останется после вас?',
  },
  {
    id: 'remix',
    mark: 'RX',
    title: 'REMIX',
    genre: 'Создание',
    mode: 'Конструктор игровых испытаний',
    description: 'Собирайте испытания и проверяйте созданные сценарии. Это вход в прототип создательского игрового цикла.',
    href: '/play/remix',
    keyArt: 'remix',
    controls: 'Инструменты создания внутри игры',
    experience: 'Браузерный прототип',
    featuredCopy: 'Не только проходите испытания — создавайте свои.',
  },
]

const PROJECTS = [
  { name: 'OSGARD BEW WORLD', url: 'https://osgardbewworld.com', type: 'Создание проектов', copy: 'Направление для превращения идей в цифровые продукты.', mark: 'OW', kind: 'create' },
  { name: 'O2 SYSTEM', url: 'https://o2system.art', type: 'Учёт для обменных пунктов', copy: 'Специализированное направление учёта операций.', mark: 'O2', kind: 'business' },
  { name: 'SENJORIO', url: 'https://senjorio.com', type: 'Премиальное такси', copy: 'Сервис мобильности и заказа поездок.', mark: 'SJ', kind: 'mobility' },
  { name: 'SUPER DAY', url: 'https://superday.run', type: 'Умная карта и планировщик', copy: 'Планирование маршрута и повседневных задач.', mark: 'SD', kind: 'time' },
  { name: 'MARCOSA', url: 'https://marcosa.club', type: 'Социальная платформа', copy: 'Направление общения и личных цифровых пространств.', mark: 'MC', kind: 'social' },
  { name: 'MYOSA', url: 'https://myosa.world', type: 'Платформа ИИ', copy: 'Направление инструментов искусственного интеллекта.', mark: 'MY', kind: 'ai' },
  { name: 'GOLD GLAMOUR', url: 'https://gold-glamour.online', type: 'Премиальные услуги', copy: 'Услуги с золотом и выездным обслуживанием.', mark: 'GG', kind: 'luxury' },
  { name: 'GARD VPN', url: 'https://gardvpn.is', type: 'VPN-сервис', copy: 'Отдельное направление защищённого соединения.', mark: 'GV', kind: 'security' },
  { name: 'OSGARD BUSINESS', url: 'https://osgardos.com', type: 'Развитие бизнеса', copy: 'Инструменты анализа и развития бизнеса.', mark: 'OB', kind: 'business' },
  { name: 'VANGUARD STUDIO', url: 'https://osgardvanguard.studio', type: 'Создание видео', copy: 'Направление производства визуальных материалов.', mark: 'VS', kind: 'media' },
]

const CONSENT_KEY = 'osgard.games.analytics-consent.v1'
const FAVORITES_KEY = 'osgard.games.favorites.v1'
const HISTORY_KEY = 'osgard.games.history.v1'
const LOCAL_EVENTS_KEY = 'osgard.games.local-events.v1'

function readStringArray(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

function readConsent(): AnalyticsConsent {
  try {
    const saved = localStorage.getItem(CONSENT_KEY)
    return saved === 'accepted' || saved === 'declined' ? saved : 'unset'
  } catch {
    return 'unset'
  }
}

function trackLocal(action: string, details: Record<string, string | number | boolean> = {}) {
  if (readConsent() !== 'accepted') return
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) ?? '[]') as unknown
    const current = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : []
    // Never put contact details, free-form messages, or raw search queries into analytics.
    const event = { action, details, occurredAt: new Date().toISOString(), schemaVersion: 1 }
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify([...current.slice(-248), event]))
  } catch {
    // Local analytics is optional and must not block the game catalog.
  }
}

function saveDownload(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function GamesHub() {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<Genre>('Все')
  const [favorites, setFavorites] = useState<string[]>(() => readStringArray(FAVORITES_KEY))
  const [history, setHistory] = useState<GameId[]>(() => readStringArray(HISTORY_KEY).filter((id): id is GameId => GAMES.some((game) => game.id === id)))
  const [consent, setConsent] = useState<AnalyticsConsent>(readConsent)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notice, setNotice] = useState('')
  const [leadNotice, setLeadNotice] = useState('')
  const [emailCopied, setEmailCopied] = useState(false)
  const [featuredId, setFeaturedId] = useState<GameId>(() => {
    const queryId = new URLSearchParams(window.location.search).get('game')
    return GAMES.some((game) => game.id === queryId) ? queryId as GameId : 'time'
  })
  const debugMode = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1', [])
  const didTrackView = useRef(false)
  const featured = GAMES.find((game) => game.id === featuredId) ?? GAMES[0]
  const lastPlayed = GAMES.find((game) => game.id === history[0])

  useEffect(() => {
    if (consent !== 'accepted' || didTrackView.current) return
    didTrackView.current = true
    recordOsgardEvent('portal_opened', { surface: 'games_hub', route: '/games', consent: 'accepted' })
    trackLocal('catalog_opened', { surface: 'games_hub' })
  }, [consent])

  const filteredGames = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('ru')
    return GAMES.filter((game) => {
      const matchesSearch = !normalized || [game.title, game.genre, game.mode, game.description].join(' ').toLocaleLowerCase('ru').includes(normalized)
      const matchesGenre = genre === 'Все' || game.genre === genre || (genre === 'Стратегия' && game.genre === 'Стратегия / симуляция') || (genre === 'Тактика' && game.id === 'null-shift') || (genre === 'Кооператив' && game.id === 'null-shift')
      return matchesSearch && matchesGenre
    })
  }, [search, genre])

  function openGame(game: GameEntry) {
    const nextHistory = [game.id, ...history.filter((id) => id !== game.id)].slice(0, 8)
    setHistory(nextHistory)
    setFeaturedId(game.id)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
    } catch {
      // The catalog remains available even when storage is blocked.
    }
    if (readConsent() === 'accepted') {
      recordOsgardEvent('game_opened', { game: game.id, href: game.href, surface: 'games_hub' })
      trackLocal('game_launch_requested', { game: game.id, route: game.href })
    }
  }

  function toggleFavorite(game: GameEntry) {
    const next = favorites.includes(game.id) ? favorites.filter((id) => id !== game.id) : [...favorites, game.id]
    setFavorites(next)
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    } catch {
      // Favorites are a convenience, not a requirement to play.
    }
    trackLocal('favorite_toggled', { game: game.id, favorite: next.includes(game.id) })
  }

  async function shareGame(game: GameEntry) {
    const url = window.location.origin + '/games?game=' + encodeURIComponent(game.id)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD PLAY — ' + game.title, text: game.featuredCopy, url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setNotice('Ссылка на ' + game.title + ' скопирована.')
      } else {
        window.prompt('Скопируйте ссылку на игру:', url)
      }
      if (readConsent() === 'accepted') {
        recordOsgardEvent('share_created', { surface: 'games_hub', game: game.id, channel: navigator.share ? 'native_share' : 'clipboard' })
        trackLocal('game_shared', { game: game.id })
      }
    } catch {
      setNotice('Поделиться не удалось. Попробуйте скопировать ссылку из адресной строки.')
    }
  }

  function acceptAnalytics(value: 'accepted' | 'declined') {
    setConsent(value)
    try {
      localStorage.setItem(CONSENT_KEY, value)
    } catch {
      // Consent choice remains in memory for this page view.
    }
    setNotice(value === 'accepted' ? 'Необязательная аналитика включена.' : 'Необязательная аналитика отключена.')
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText('osman.osmanov0099@gmail.com')
      setEmailCopied(true)
      window.setTimeout(() => setEmailCopied(false), 1800)
    } catch {
      window.location.href = 'mailto:osman.osmanov0099@gmail.com'
    }
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const kind = String(data.get('projectType') ?? 'Разработка цифрового продукта')
    const budget = String(data.get('budget') ?? 'Не указан')
    const contact = String(data.get('contact') ?? '').trim()
    const brief = String(data.get('brief') ?? '').trim()
    if (!contact || !brief) {
      setLeadNotice('Укажите контакт для ответа и кратко опишите задачу.')
      return
    }
    trackLocal('lead_mailto_prepared', { projectType: kind, budgetProvided: Boolean(budget && budget !== 'Не указан') })
    const subject = encodeURIComponent('Заявка OSGARD: ' + kind)
    const body = encodeURIComponent([
      'Тип проекта: ' + kind,
      'Бюджет: ' + (budget || 'Не указан'),
      'Контакт для ответа: ' + contact,
      '',
      'Описание задачи:',
      brief,
      '',
      'Источник: OSGARD WORLD / Games',
    ].join('\n'))
    setLeadNotice('Открывается почтовый клиент. Форма не отправляет данные на сервер.')
    window.location.href = 'mailto:osman.osmanov0099@gmail.com?subject=' + subject + '&body=' + body
  }

  function exportLocalAnalytics() {
    try {
      const events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) ?? '[]') as unknown
      saveDownload('osgard-games-local-analytics.json', JSON.stringify({ scope: 'this_browser_only', exportedAt: new Date().toISOString(), events: Array.isArray(events) ? events : [] }, null, 2), 'application/json')
    } catch {
      setNotice('Локальный журнал недоступен в этом браузере.')
    }
  }

  return (
    <main className="games-hub">
      <header className="gh-header">
        <a className="gh-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
        <nav className={mobileMenu ? 'gh-nav is-open' : 'gh-nav'} aria-label="Навигация игровой платформы">
          <a href="#games" onClick={() => setMobileMenu(false)}>Игры</a>
          <a href="#ecosystem" onClick={() => setMobileMenu(false)}>Экосистема</a>
          <a href="#monetization" onClick={() => setMobileMenu(false)}>Партнёрам</a>
          <a href="#contact" onClick={() => setMobileMenu(false)}>Заказать разработку</a>
        </nav>
        <div className="gh-header-actions">
          <a className="gh-header-link" href="/worlds">Миры OSGARD <ArrowUpRight size={15} /></a>
          <button className="gh-menu-button" type="button" aria-label={mobileMenu ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}>{mobileMenu ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="gh-hero">
        <div className="gh-hero-copy">
          <p className="gh-eyebrow"><span className="gh-live-dot" /> OSGARD WORLD / PLAY ARCHIVE</p>
          <h1>Войди в мир.<br /><em>Оставь след.</em></h1>
          <p className="gh-hero-lead">Игры OSGARD — отдельные игровые миры в одной экосистеме. Выбирайте, пробуйте, возвращайтесь к последней игре и делитесь ссылкой без навязчивых рекламных окон.</p>
          <div className="gh-hero-actions">
            <a className="gh-button gh-button-primary" href={featured.href} onClick={() => openGame(featured)}><Gamepad2 size={17} /> {lastPlayed ? 'Продолжить: ' + lastPlayed.title : 'Запустить первую игру'} <ArrowUpRight size={16} /></a>
            <a className="gh-button gh-button-quiet" href="#games">Исследовать каталог <ArrowRight size={16} /></a>
          </div>
          <div className="gh-hero-metrics" aria-label="Состав каталога">
            <div><strong>{GAMES.length.toString().padStart(2, '0')}</strong><span>игровых маршрута в коде</span></div>
            <div><strong>01</strong><span>единая витрина</span></div>
            <div><strong>PC / MOB</strong><span>адаптивная оболочка каталога</span></div>
          </div>
        </div>
        <div className="gh-hero-art" aria-hidden="true">
          <div className="gh-orbit gh-orbit-a" /><div className="gh-orbit gh-orbit-b" /><div className="gh-orbit gh-orbit-c" />
          <div className="gh-core"><span>OSGARD</span><strong>PLAY</strong><i>WORLD SYSTEM / 01</i></div>
          <div className="gh-art-label gh-art-label-top">SIMULATION / INTERACTIVE</div>
          <div className="gh-art-label gh-art-label-bottom">CHOOSE YOUR NEXT WORLD <b>↗</b></div>
        </div>
      </section>

      <section className="gh-catalog gh-section" id="games">
        <div className="gh-section-heading">
          <div><p className="gh-eyebrow">01 / PLAYABLE WORLDS</p><h2>Выбери свою игру.</h2><p>Без фиктивных рейтингов и счётчиков игроков: только названия, назначение и переходы, подключённые в приложении.</p></div>
          {lastPlayed && <a className="gh-last-played" href={lastPlayed.href} onClick={() => openGame(lastPlayed)}><History size={16} /><span><small>ПОСЛЕДНЯЯ ИГРА</small><strong>{lastPlayed.title}</strong></span><ArrowUpRight size={17} /></a>}
        </div>
        <div className="gh-controls">
          <label className="gh-search"><Search size={18} /><span className="gh-visually-hidden">Поиск игр</span><input value={search} onChange={(event) => { setSearch(event.target.value); trackLocal('catalog_search_used', { queryLength: event.target.value.length }) }} placeholder="Название, жанр или механика…" /><kbd>/</kbd></label>
          <div className="gh-filters" role="group" aria-label="Фильтр жанра">{(['Все', 'Стратегия', 'Тактика', 'Кооператив', 'Создание'] as Genre[]).map((item) => <button key={item} type="button" className={genre === item ? 'is-active' : ''} aria-pressed={genre === item} onClick={() => { setGenre(item); trackLocal('catalog_filter_used', { genre: item }) }}>{item}</button>)}</div>
          <button className="gh-favorites-filter" type="button" onClick={() => { setGenre('Все'); setSearch(favorites.length ? GAMES.filter((game) => favorites.includes(game.id)).map((game) => game.title).join(' ') : '___нет избранного___'); trackLocal('favorites_filter_used', { favorites: favorites.length }) }}><Heart size={15} /> Избранное <span>{favorites.length}</span></button>
        </div>
        {notice && <div className="gh-notice" role="status"><Check size={15} />{notice}<button aria-label="Закрыть сообщение" onClick={() => setNotice('')}><X size={15} /></button></div>}
        <div className="gh-game-grid">
          {filteredGames.map((game, index) => (
            <article className={'gh-game-card gh-game-' + game.keyArt + (featuredId === game.id ? ' is-featured' : '')} key={game.id}>
              <div className="gh-card-art">
                <div className="gh-card-art-top"><span>{String(index + 1).padStart(2, '0')} / OSGARD PLAY</span><button type="button" className={favorites.includes(game.id) ? 'gh-favorite is-active' : 'gh-favorite'} aria-label={favorites.includes(game.id) ? 'Убрать из избранного: ' + game.title : 'Добавить в избранное: ' + game.title} aria-pressed={favorites.includes(game.id)} onClick={() => toggleFavorite(game)}><Heart size={17} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} /></button></div>
                <div className="gh-card-mark"><i className="gh-mark-ring gh-mark-ring-one" /><i className="gh-mark-ring gh-mark-ring-two" /><b>{game.mark}</b></div>
                <span className="gh-card-genre">{game.genre}</span>
                <div className="gh-art-horizon" />
              </div>
              <div className="gh-card-body">
                <div className="gh-card-meta"><span><span className="gh-status-dot" />Маршрут в приложении</span><span>{game.mode}</span></div>
                <h3>{game.title}</h3><p>{game.description}</p>
                <div className="gh-card-details"><span><Compass size={14} />{game.controls}</span><span><Smartphone size={14} />{game.experience}</span></div>
                <div className="gh-card-actions"><a className="gh-button gh-button-primary" href={game.href} onClick={() => openGame(game)}>Играть <ArrowUpRight size={16} /></a><button className="gh-share-button" type="button" onClick={() => void shareGame(game)} aria-label={'Поделиться игрой ' + game.title}><Share2 size={16} /><span>Поделиться</span></button></div>
              </div>
            </article>
          ))}
          {!filteredGames.length && <div className="gh-empty"><Search size={26} /><h3>Ничего не найдено</h3><p>Измени поиск или выбери другой жанр.</p><button className="gh-button gh-button-quiet" type="button" onClick={() => { setSearch(''); setGenre('Все') }}>Сбросить фильтры</button></div>}
        </div>
      </section>

      <section className="gh-featured gh-section">
        <div className="gh-featured-index"><span>02 / SELECTED WORLD</span><b>{featured.mark}</b><i>OSGARD PLAY</i></div>
        <div className="gh-featured-copy"><p className="gh-eyebrow">РЕКОМЕНДАЦИЯ КАТАЛОГА · НЕ РЕЙТИНГ</p><h2>{featured.title}</h2><p>{featured.featuredCopy}</p><div className="gh-featured-actions"><a className="gh-button gh-button-primary" href={featured.href} onClick={() => openGame(featured)}>Войти в мир <ArrowUpRight size={16} /></a><button className="gh-button gh-button-quiet" type="button" onClick={() => void shareGame(featured)}><Share2 size={16} /> Поделиться</button></div></div>
        <div className="gh-featured-data"><div><span>ЖАНР</span><strong>{featured.genre}</strong></div><div><span>ФОРМАТ</span><strong>{featured.experience}</strong></div><div><span>УПРАВЛЕНИЕ</span><strong>{featured.controls}</strong></div></div>
      </section>

      <section className="gh-partners gh-section" id="monetization">
        <div className="gh-section-heading"><div><p className="gh-eyebrow">03 / PARTNERS & MONETIZATION</p><h2>Монетизация без ловушек.</h2><p>Места для рекламы зарезервированы, но рекламные сети, платежи и платная подписка не включаются без серверной настройки и необходимых аккаунтов.</p></div></div>
        <div className="gh-monetization-grid">
          <article><div className="gh-mini-icon"><ShieldCheck size={21} /></div><p className="gh-eyebrow">FORMAT A</p><h3>Спонсор мира</h3><p>Брендированное событие или специальный уровень с видимой пометкой «Реклама / спонсорство».</p><span className="gh-status-pill">Требуется партнёр</span></article>
          <article><div className="gh-mini-icon"><Zap size={21} /></div><p className="gh-eyebrow">FORMAT B</p><h3>Вознаграждение за просмотр</h3><p>Добровольная реклама — только если провайдер подтвердит просмотр и сервер проверит право на награду.</p><span className="gh-status-pill">Не подключено</span></article>
          <article><div className="gh-mini-icon"><Cpu size={21} /></div><p className="gh-eyebrow">FORMAT C</p><h3>Премиум-контент</h3><p>Дополнительные главы и оформление после появления спроса, с ясной ценой и проверкой покупки на сервере.</p><span className="gh-status-pill">Не подключено</span></article>
        </div>
        <aside className="gh-ad-slot" data-ad-slot="games-catalog-sponsor">
          <div className="gh-ad-slot-icon"><Sparkles size={22} /></div>
          <div><span>ПАРТНЁРСКОЕ МЕСТО / GAMES LOBBY</span><strong>Брендированное событие в игровом мире</strong><p>Рекламный показ здесь не загружается. Это резервное место для согласованного партнёра; спонсорский материал будет явно обозначен.</p></div>
          <a className="gh-button gh-button-quiet" href="#contact">Обсудить интеграцию <ArrowUpRight size={15} /></a>
        </aside>
      </section>

      <section className="gh-ecosystem gh-section" id="ecosystem">
        <div className="gh-section-heading"><div><p className="gh-eyebrow">04 / THE OSGARD NETWORK</p><h2>Игры — вход в экосистему.</h2><p>Десять направлений владельца. Описания основаны на предоставленном владельцем назначении проектов; доступность сайтов и технические интеграции требуют отдельной проверки.</p></div><a className="gh-text-link" href="/worlds">Все миры OSGARD <ArrowUpRight size={16} /></a></div>
        <div className="gh-project-grid">
          {PROJECTS.map((project) => <a className={'gh-project-card gh-project-' + project.kind} href={project.url} target="_blank" rel="noopener noreferrer" key={project.url} onClick={() => trackLocal('ecosystem_link_clicked', { project: project.name })}><span className="gh-project-mark">{project.mark}</span><div><small>{project.type}</small><h3>{project.name}</h3><p>{project.copy}</p></div><ExternalLink size={15} className="gh-project-external" /></a>)}
        </div>
        <p className="gh-disclaimer">Переходы ведут на официальные адреса, указанные владельцем. Доступность внешних сайтов и наличие API/SSO не подтверждены в текущей среде.</p>
      </section>

      <section className="gh-contact gh-section" id="contact">
        <div className="gh-contact-copy"><p className="gh-eyebrow">05 / BUILD WITH OSGARD</p><h2>Есть идея игры,<br /><em>сайта или приложения?</em></h2><p>Поможем превратить идею в цифровой продукт — от прототипа и игрового цикла до сайта и платформы.</p>
          <div className="gh-contact-methods"><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer"><span className="gh-contact-icon">WA</span><span><small>WHATSAPP</small><strong>+7 964 002-72-22</strong></span><ArrowUpRight size={17} /></a><button type="button" onClick={() => void copyEmail()}><span className="gh-contact-icon"><Mail size={17} /></span><span><small>EMAIL</small><strong>osman.osmanov0099@gmail.com</strong></span>{emailCopied ? <Check size={17} /> : <ExternalLink size={15} />}</button></div>
          <p className="gh-form-privacy">Форма подготавливает письмо в вашем почтовом приложении. Данные заявки не отправляются на сервер этой страницы.</p>
        </div>
        <form className="gh-lead-form" onSubmit={handleLeadSubmit}>
          <p className="gh-eyebrow">ОПИСАТЬ ЗАДАЧУ</p>
          <label>Что нужно создать?<select name="projectType" defaultValue="Игра"><option>Игра</option><option>Сайт</option><option>Приложение</option><option>Игровая платформа</option><option>Рекламная интеграция</option><option>Другое</option></select></label>
          <label>Бюджет (необязательно)<select name="budget" defaultValue=""><option value="">Не указывать</option><option>До 1 000 USD</option><option>1 000–5 000 USD</option><option>5 000–15 000 USD</option><option>15 000+ USD</option><option>Обсудить после оценки</option></select></label>
          <label>Контакт для ответа<input name="contact" required maxLength={180} autoComplete="email" placeholder="Email или мессенджер" /></label>
          <label>Кратко о задаче<textarea name="brief" required maxLength={2400} rows={4} placeholder="Что хотите получить и для кого?" /></label>
          <button className="gh-button gh-button-primary gh-submit" type="submit">Подготовить заявку <ArrowUpRight size={16} /></button>
          {leadNotice && <p className="gh-form-notice" role="status">{leadNotice}</p>}
        </form>
      </section>

      <footer className="gh-footer"><a href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo variant="footer" /></a><p>OSGARD WORLD GAMING<br /><span>Игровые миры, цифровые продукты, собственная экосистема.</span></p><div><a href="/games">Игры</a><a href="/development">Разработка</a><a href="/worlds">Миры</a><a href="mailto:osman.osmanov0099@gmail.com">Контакт</a></div><small>© {new Date().getFullYear()} OSGARD WORLD. Все игровые статусы обозначают текущую структуру кода, а не публичную телеметрию.</small></footer>

      {consent === 'unset' && <aside className="gh-consent" aria-label="Настройка аналитики"><div><ShieldCheck size={19} /><span><strong>Необязательная аналитика</strong><small>Помогает понять, какие игры открывают. Никаких рекламных SDK сейчас не загружается. Отказ не влияет на запуск игр.</small></span></div><div className="gh-consent-actions"><button type="button" onClick={() => acceptAnalytics('declined')}>Только необходимое</button><button type="button" onClick={() => acceptAnalytics('accepted')}>Разрешить аналитику</button></div></aside>}
      {debugMode && <aside className="gh-debug"><strong>Локальная аналитика / только это устройство</strong><span>Не является серверной админ-панелью и не показывает другие устройства или пользователей.</span><button type="button" onClick={exportLocalAnalytics}>Экспорт JSON</button><button type="button" onClick={() => { try { localStorage.removeItem(LOCAL_EVENTS_KEY); setNotice('Локальный журнал очищен.'); } catch {} }}>Очистить журнал</button></aside>}
    </main>
  )
}
