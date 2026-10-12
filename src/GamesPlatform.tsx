import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowUpRight, Check, ChevronRight, ExternalLink, Expand, Gamepad2, Heart,
  History, Menu, Monitor, Play, Search, Share2, Smartphone, Sparkles, X,
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { OSGARD_GAMES, type OsgardGameId } from './core/manifest'
import { recordOsgardEvent } from './core/eventQueue'
import './games-platform.css'

type Locale = 'ru' | 'en'
type Genre = 'strategy' | 'simulation' | 'coop' | 'action' | 'creation'
type Shelf = 'all' | 'favorites' | 'recent'
type ProbeState = 'checking' | 'ready' | 'missing' | 'unknown'
type PageMode = 'catalog' | 'detail' | 'play'

type GameDetails = {
  mark: string
  subtitleRu: string
  subtitleEn: string
  descriptionRu: string
  descriptionEn: string
  genres: Genre[]
  engineRu: string
  engineEn: string
  controlsRu: string
  controlsEn: string
  devicesRu: string
  devicesEn: string
  accent: 'time' | 'swarm' | 'shift' | 'inherit' | 'remix'
  criticalFiles: string[]
}

type CatalogGame = (typeof OSGARD_GAMES)[number] & GameDetails & { order: number }

const DETAILS: Record<OsgardGameId, GameDetails> = {
  time: {
    mark: 'ET',
    subtitleRu: 'СТРАТЕГИЯ ЖИВОГО ГОРОДА',
    subtitleEn: 'LIVING CITY STRATEGY',
    descriptionRu: 'Управляйте городом, ресурсами и фракциями. Решения меняют ход событий и состояние системы.',
    descriptionEn: 'Manage a city, its resources and factions. Decisions change the course of events and the state of the system.',
    genres: ['strategy', 'simulation'],
    engineRu: 'Интерактивная браузерная игра портала',
    engineEn: 'Portal-hosted browser game',
    controlsRu: 'Открой игру и следуй подсказкам управления внутри интерфейса.',
    controlsEn: 'Open the game and follow the controls shown in its interface.',
    devicesRu: 'Браузер на компьютере и мобильном устройстве; качество управления зависит от текущей версии игры.',
    devicesEn: 'Browser on desktop and mobile; control support depends on the current game version.',
    accent: 'time',
    criticalFiles: ['/games/time'],
  },
  swarm: {
    mark: 'SW',
    subtitleRu: 'СОВМЕСТНАЯ СИМУЛЯЦИЯ',
    subtitleEn: 'CO-OP SIMULATION',
    descriptionRu: 'Выберите роль и действуйте согласованно, чтобы добраться до цели. Для сетевого режима требуется соединение.',
    descriptionEn: 'Choose a role and coordinate with others to reach the objective. Online play requires a connection.',
    genres: ['coop', 'action'],
    engineRu: 'Браузерная игра с отдельными файлами клиента',
    engineEn: 'Browser game with a separate client bundle',
    controlsRu: 'Открой игру и проверь подсказки управления перед началом сессии.',
    controlsEn: 'Open the game and review the controls before starting a session.',
    devicesRu: 'Запускается из браузера. Реальную совместимость конкретного устройства нужно подтвердить в игре.',
    devicesEn: 'Runs in a browser. Actual device compatibility should be confirmed in-game.',
    accent: 'swarm',
    criticalFiles: ['/games/swarm/index.html', '/games/swarm/game.js', '/games/swarm/styles.css'],
  },
  'null-shift': {
    mark: 'NS',
    subtitleRu: 'CO-OP RAID / NULL//SHIFT',
    subtitleEn: 'CO-OP RAID / NULL//SHIFT',
    descriptionRu: 'Проникновение в меняющееся пространство: исследование, терминалы, охрана и эвакуация. Игра использует отдельную веб-сборку движка.',
    descriptionEn: 'Enter a changing environment, explore, interact with terminals, avoid security and extract. The game uses a separate web engine build.',
    genres: ['action', 'coop'],
    engineRu: 'Отдельная веб-сборка Godot',
    engineEn: 'Separate Godot web export',
    controlsRu: 'Клавиатура и экранные элементы управления, если они поддерживаются сборкой. Используй внутриигровые подсказки.',
    controlsEn: 'Keyboard and on-screen controls where supported by the build. Use the in-game prompts.',
    devicesRu: 'Предусмотрена веб-сборка. Запуск движка и сенсорное управление требуют проверки на целевом устройстве.',
    devicesEn: 'A web build is provisioned. Engine startup and touch controls require testing on the target device.',
    accent: 'shift',
    criticalFiles: [
      '/games/null-shift-godot/index.html',
      '/games/null-shift-godot/index.js',
      '/games/null-shift-godot/index.wasm',
      '/games/null-shift-godot/index.pck',
    ],
  },
  inherit: {
    mark: 'IN',
    subtitleRu: 'НАСЛЕДИЕ МЕНЯЮЩЕГОСЯ МИРА',
    subtitleEn: 'A WORLD THAT CHANGES',
    descriptionRu: 'Исследуй остров, который меняется от поколения к поколению, и посмотри, как решения влияют на его наследие.',
    descriptionEn: 'Explore an island that changes from generation to generation and see how decisions shape its legacy.',
    genres: ['simulation', 'strategy'],
    engineRu: 'Самостоятельная браузерная игра',
    engineEn: 'Standalone browser game',
    controlsRu: 'Инструкции по управлению показываются в самой игре.',
    controlsEn: 'Controls are explained inside the game.',
    devicesRu: 'Веб-страница доступна на мобильных и настольных браузерах; управление необходимо проверить в игре.',
    devicesEn: 'The web page is available in mobile and desktop browsers; controls should be checked in-game.',
    accent: 'inherit',
    criticalFiles: ['/games/inherit/index.html'],
  },
  remix: {
    mark: 'RX',
    subtitleRu: 'АРЕНА СОЗДАТЕЛЕЙ',
    subtitleEn: 'CREATOR ARENA',
    descriptionRu: 'Создавай испытания, проходи сценарии и оставляй повтор прохождения. Для WebGL-сборки могут понадобиться память и поддерживаемый браузер.',
    descriptionEn: 'Create challenges, play scenarios and keep a replay. The WebGL build may require available memory and a supported browser.',
    genres: ['creation', 'action'],
    engineRu: 'Unity WebGL',
    engineEn: 'Unity WebGL',
    controlsRu: 'Следуй инструкциям на экране. При проблемах загрузки попробуй настольный браузер.',
    controlsEn: 'Follow the on-screen instructions. If loading fails, try a desktop browser.',
    devicesRu: 'Браузер с WebGL. На мобильных устройствах запуск зависит от поддержки графики и доступной памяти.',
    devicesEn: 'WebGL browser. On mobile, launch depends on graphics support and available memory.',
    accent: 'remix',
    criticalFiles: [
      '/games/remix/index.html',
      '/games/remix/player/Build/REMIX-webgl3.loader.js',
      '/games/remix/player/Build/REMIX-webgl3.data.gz',
      '/games/remix/player/Build/REMIX-webgl3.wasm.gz',
    ],
  },
}

const CATALOG: CatalogGame[] = OSGARD_GAMES.map((game, index) => ({
  ...game,
  ...DETAILS[game.id],
  order: index,
}))

const GENRES: Array<{ id: Genre | 'all'; ru: string; en: string }> = [
  { id: 'all', ru: 'Все жанры', en: 'All genres' },
  { id: 'strategy', ru: 'Стратегия', en: 'Strategy' },
  { id: 'simulation', ru: 'Симулятор', en: 'Simulation' },
  { id: 'coop', ru: 'Кооператив', en: 'Co-op' },
  { id: 'action', ru: 'Экшен', en: 'Action' },
  { id: 'creation', ru: 'Создание', en: 'Creation' },
]

const VALID_IDS = new Set<string>(OSGARD_GAMES.map((game) => game.id))
const FAVORITES_KEY = 'osgard.games.favorites.v1'
const RECENT_KEY = 'osgard.games.recent.v1'

function readIds(key: string): OsgardGameId[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((item): item is OsgardGameId => typeof item === 'string' && VALID_IDS.has(item)))].slice(0, 5)
  } catch {
    return []
  }
}

function infoHref(id: OsgardGameId) {
  return '/games/info/' + id
}

function playHref(id: OsgardGameId) {
  return '/games/play/' + id
}

async function probeFile(path: string): Promise<boolean | null> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(path, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
    if (!response.ok) return false
    const mime = (response.headers.get('content-type') ?? '').toLowerCase()
    if (path.endsWith('.html') || path === '/games/time') return mime.includes('text/html') || mime.includes('application/xhtml+xml')
    if (path.endsWith('.js')) return mime.includes('javascript') || mime.includes('ecmascript')
    if (path.endsWith('.wasm')) return mime.includes('wasm') || mime.includes('octet-stream')
    if (path.endsWith('.pck')) return mime.length > 0 && !mime.includes('text/html')
    if (path.endsWith('.gz')) return mime.length > 0 && !mime.includes('text/html')
    return mime.length > 0
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function statusText(state: ProbeState, ru: boolean) {
  if (state === 'checking') return ru ? 'Проверяем вход…' : 'Checking entry…'
  if (state === 'ready') return ru ? 'Файлы входа найдены' : 'Entry files found'
  if (state === 'missing') return ru ? 'Нужна проверка сборки' : 'Build check needed'
  return ru ? 'Проверка недоступна' : 'Could not verify'
}

function genreName(genre: Genre, ru: boolean) {
  const item = GENRES.find((candidate) => candidate.id === genre)
  return item ? (ru ? item.ru : item.en) : genre
}

export function GamesPlatform({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  const isRu = locale === 'ru'
  const pathname = window.location.pathname
  const playMatch = pathname.match(/^\/games\/play\/([^/]+)\/?$/)
  const infoMatch = pathname.match(/^\/games\/info\/([^/]+)\/?$/)
  const pageMode: PageMode = playMatch ? 'play' : infoMatch ? 'detail' : 'catalog'
  const slug = (playMatch?.[1] ?? infoMatch?.[1]) as OsgardGameId | undefined
  const activeGame = slug && VALID_IDS.has(slug) ? CATALOG.find((game) => game.id === slug) : undefined
  const [mobileMenu, setMobileMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const [shelf, setShelf] = useState<Shelf>('all')
  const [favorites, setFavorites] = useState<OsgardGameId[]>(() => readIds(FAVORITES_KEY))
  const [recent, setRecent] = useState<OsgardGameId[]>(() => readIds(RECENT_KEY))
  const [probeStates, setProbeStates] = useState<Partial<Record<OsgardGameId, ProbeState>>>({})
  const [notice, setNotice] = useState('')
  const [frameLoaded, setFrameLoaded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const sessionRecorded = useRef(false)

  useEffect(() => {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) } catch { /* browser storage is optional */ }
  }, [favorites])

  useEffect(() => {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)) } catch { /* browser storage is optional */ }
  }, [recent])

  useEffect(() => {
    let cancelled = false
    const runProbes = async () => {
      const results = await Promise.all(CATALOG.map(async (game) => {
        const values = await Promise.all(game.criticalFiles.map(probeFile))
        const state: ProbeState = values.some((value) => value === false)
          ? 'missing'
          : values.some((value) => value === null)
            ? 'unknown'
            : 'ready'
        return [game.id, state] as const
      }))
      if (!cancelled) {
        setProbeStates(Object.fromEntries(results) as Partial<Record<OsgardGameId, ProbeState>>)
      }
    }
    void runProbes()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (pageMode === 'play' && activeGame && !sessionRecorded.current) {
      sessionRecorded.current = true
      setRecent((current) => [activeGame.id, ...current.filter((id) => id !== activeGame.id)].slice(0, 5))
      recordOsgardEvent('game_opened', { game: activeGame.id, href: activeGame.href, source: 'osgard_games_embedded' })
    }
  }, [pageMode, activeGame])

  useEffect(() => {
    const title = pageMode === 'catalog'
      ? (isRu ? 'Игры OSGARD — игровая витрина' : 'OSGARD Games — game library')
      : activeGame
        ? activeGame.title + (pageMode === 'play' ? (isRu ? ' — играть | OSGARD' : ' — play | OSGARD') : (isRu ? ' — игра | OSGARD' : ' — game | OSGARD'))
        : (isRu ? 'Игра не найдена — OSGARD' : 'Game not found — OSGARD')
    document.title = title
    const description = activeGame
      ? (isRu ? activeGame.descriptionRu : activeGame.descriptionEn)
      : (isRu ? 'Игровая витрина OSGARD: поиск, жанры, избранное и быстрый запуск собственных игр.' : 'OSGARD game library with search, genres, favourites and quick launch for first-party games.')
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) }
    meta.content = description
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = window.location.origin + window.location.pathname
    return () => { document.title = 'OSGARD WORLD — цифровая экосистема' }
  }, [pageMode, activeGame, isRu])

  const visibleGames = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(isRu ? 'ru-RU' : 'en-US')
    const candidates = CATALOG.filter((game) => {
      if (shelf === 'favorites' && !favorites.includes(game.id)) return false
      if (shelf === 'recent' && !recent.includes(game.id)) return false
      if (genre !== 'all' && !game.genres.includes(genre)) return false
      if (!needle) return true
      const fields = [
        game.title, game.reason, game.subtitleRu, game.subtitleEn, game.descriptionRu,
        game.descriptionEn, ...game.genres.map((item) => genreName(item, true)),
        ...game.genres.map((item) => genreName(item, false)),
      ]
      return fields.some((field) => field.toLocaleLowerCase(isRu ? 'ru-RU' : 'en-US').includes(needle))
    })
    if (shelf === 'recent') return candidates.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
    return candidates.sort((a, b) => a.order - b.order)
  }, [favorites, genre, isRu, recent, search, shelf])

  const toggleFavorite = (id: OsgardGameId) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [id, ...current].slice(0, 5))
  }

  const remember = (id: OsgardGameId) => {
    setRecent((current) => [id, ...current.filter((item) => item !== id)].slice(0, 5))
  }

  const shareGame = async (game: CatalogGame) => {
    const url = window.location.origin + infoHref(game.id)
    try {
      if (navigator.share) {
        await navigator.share({ title: game.title, text: isRu ? 'Игра из OSGARD WORLD' : 'A game from OSGARD WORLD', url })
      } else {
        await navigator.clipboard.writeText(url)
        setNotice(isRu ? 'Ссылка скопирована' : 'Link copied')
      }
      recordOsgardEvent('share_created', { game: game.id, url, source: 'osgard_games' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice(isRu ? 'Не удалось поделиться автоматически. Скопируй адрес страницы из браузера.' : 'Sharing failed. Copy the page address from the browser.')
    }
  }

  const startGame = (game: CatalogGame) => {
    remember(game.id)
  }

  const fullscreen = async () => {
    const frame = frameRef.current
    if (!frame) return
    try {
      if (!document.fullscreenElement) await frame.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      setNotice(isRu ? 'Полный экран не поддерживается этим браузером.' : 'Fullscreen is not supported by this browser.')
    }
  }

  const t = (ru: string, en: string) => isRu ? ru : en
  const selectedState = activeGame ? (probeStates[activeGame.id] ?? 'checking') : 'checking'

  return (
    <div className="osg-games-shell">
      <header className="osg-games-header">
        <a className="osg-games-brand" href="/" aria-label="OSGARD WORLD"><OsgardLogo /></a>
        <nav className="osg-games-nav" aria-label={t('Навигация игровой платформы', 'Game platform navigation')}>
          <a href="/games" aria-current={pageMode === 'catalog' ? 'page' : undefined}>{t('Игры', 'Games')}</a>
          <a href="/worlds">{t('Миры OSGARD', 'OSGARD worlds')}</a>
          <a href="/development">{t('Разработка', 'Development')}</a>
        </nav>
        <div className="osg-games-header-actions">
          <button className="osg-games-language" onClick={() => setLocale(isRu ? 'en' : 'ru')} aria-label={t('Сменить язык', 'Change language')}>{locale.toUpperCase()}</button>
          <button className="osg-games-menu-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label={mobileMenu ? t('Закрыть меню', 'Close menu') : t('Открыть меню', 'Open menu')} aria-expanded={mobileMenu}>{mobileMenu ? <X /> : <Menu />}</button>
        </div>
        {mobileMenu && <div className="osg-games-mobile-menu"><a href="/games">{t('Игры', 'Games')}</a><a href="/worlds">{t('Миры OSGARD', 'OSGARD worlds')}</a><a href="/development">{t('Разработка', 'Development')}</a></div>}
      </header>

      <main className="osg-games-main">
        {pageMode === 'catalog' && (
          <>
            <section className="osg-games-hero">
              <div className="osg-games-hero-copy">
                <p className="osg-games-eyebrow"><Sparkles size={14} /> OSGARD WORLD / PLAY ARCHIVE</p>
                <h1>{t('Играй. Исследуй. Открывай следующий мир.', 'Play. Explore. Open the next world.')}</h1>
                <p className="osg-games-lead">{t('Пять самостоятельных игр, единая витрина и быстрый возврат к тому, что тебе интересно.', 'Five independent games in one library, with search and a quick path back to what interests you.')}</p>
                <div className="osg-games-hero-actions">
                  {recent[0] && CATALOG.find((game) => game.id === recent[0]) && (
                    <a className="osg-games-primary" href={playHref(recent[0])} onClick={() => startGame(CATALOG.find((game) => game.id === recent[0])!)}><Play size={16} fill="currentColor" />{t('Вернуться к последней игре', 'Return to last game')}<ArrowUpRight size={16} /></a>
                  )}
                  <a className="osg-games-secondary" href="#osg-games-library">{t('Открыть каталог', 'Browse library')}<ChevronRight size={16} /></a>
                </div>
              </div>
              <aside className="osg-games-hero-aside" aria-label={t('Сведения о каталоге', 'Library details')}>
                <span className="osg-games-orbit osg-games-orbit-a" />
                <span className="osg-games-orbit osg-games-orbit-b" />
                <span className="osg-games-core-mark">O<span>/</span>G</span>
                <small>{t('СОБСТВЕННАЯ ИГРОВАЯ ЭКОСИСТЕМА', 'FIRST-PARTY GAME ECOSYSTEM')}</small>
                <strong>{String(CATALOG.length).padStart(2, '0')}</strong>
                <span className="osg-games-aside-label">{t('ИГРЫ В КАТАЛОГЕ', 'GAMES IN LIBRARY')}</span>
              </aside>
            </section>

            <section className="osg-games-library" id="osg-games-library" aria-labelledby="osg-games-library-title">
              <div className="osg-games-section-head">
                <div><p className="osg-games-eyebrow">01 / LIBRARY</p><h2 id="osg-games-library-title">{t('Выбери свой режим', 'Choose your mode')}</h2></div>
                <p>{t('Ищи по названию, отбирай по жанру, сохраняй избранное. Состояние хранится в этом браузере.', 'Search by name, filter by genre and save favourites. Your library settings stay in this browser.')}</p>
              </div>
              <div className="osg-games-tools">
                <label className="osg-games-search"><Search size={18} /><span className="osg-games-visually-hidden">{t('Поиск игр', 'Search games')}</span><input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder={t('Название, жанр или описание…', 'Title, genre or description…')} type="search" /><kbd>⌘ / Ctrl K</kbd></label>
                <div className="osg-games-shelves" role="group" aria-label={t('Раздел каталога', 'Library shelf')}>
                  <button className={shelf === 'all' ? 'is-active' : ''} onClick={() => setShelf('all')}><Gamepad2 size={15} />{t('Все игры', 'All games')}<span>{CATALOG.length}</span></button>
                  <button className={shelf === 'favorites' ? 'is-active' : ''} onClick={() => setShelf('favorites')}><Heart size={15} />{t('Избранное', 'Favourites')}<span>{favorites.length}</span></button>
                  <button className={shelf === 'recent' ? 'is-active' : ''} onClick={() => setShelf('recent')}><History size={15} />{t('Недавние', 'Recent')}<span>{recent.length}</span></button>
                </div>
              </div>
              <div className="osg-games-genres" role="group" aria-label={t('Фильтр по жанру', 'Filter by genre')}>
                {GENRES.map((item) => <button key={item.id} className={genre === item.id ? 'is-active' : ''} onClick={() => setGenre(item.id)} aria-pressed={genre === item.id}>{isRu ? item.ru : item.en}</button>)}
              </div>
              <div className="osg-games-results-line"><span>{t('НАЙДЕНО', 'RESULTS')} <b>{String(visibleGames.length).padStart(2, '0')}</b></span><span>{t('СТАТУС ПРОВЕРЯЕТСЯ ПО ФАЙЛАМ ВХОДА', 'STATUS CHECKS REQUIRED ENTRY FILES')}</span></div>
              {visibleGames.length > 0 ? (
                <div className="osg-games-grid">
                  {visibleGames.map((game) => {
                    const state = probeStates[game.id] ?? 'checking'
                    return (
                      <article className={'osg-game-card osg-game-card--' + game.accent} key={game.id}>
                        <div className="osg-game-art">
                          <a className="osg-game-art-link" href={infoHref(game.id)} aria-label={t('Подробнее об игре ', 'Game details: ') + game.title}>
                            <span className="osg-game-art-index">{String(game.order + 1).padStart(2, '0')} / OSGARD PLAY</span>
                            <span className="osg-game-visual-mark">{game.mark}</span>
                            <span className="osg-game-art-title">{game.title}</span>
                            <span className="osg-game-art-subtitle">{isRu ? game.subtitleRu : game.subtitleEn}</span>
                          </a>
                          <button className={'osg-game-favorite ' + (favorites.includes(game.id) ? 'is-active' : '')} onClick={() => toggleFavorite(game.id)} aria-label={(favorites.includes(game.id) ? t('Убрать из избранного: ', 'Remove from favourites: ') : t('Добавить в избранное: ', 'Add to favourites: ')) + game.title} aria-pressed={favorites.includes(game.id)}><Heart size={17} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} /></button>
                          <span className={'osg-game-runtime osg-game-runtime--' + state} title={t('Проверка HTTP-точек и обязательных файлов; это не полноценный тест запуска игры.', 'Checks HTTP entry points and required files; it is not a full game runtime test.')}>{state === 'ready' ? <Check size={12} /> : state === 'checking' ? <span className="osg-game-status-dot" /> : <span className="osg-game-status-dot" />}{statusText(state, isRu)}</span>
                        </div>
                        <div className="osg-game-card-body">
                          <div className="osg-game-card-meta"><span>{isRu ? game.subtitleRu : game.subtitleEn}</span><span>{game.id.toUpperCase()}</span></div>
                          <h3><a href={infoHref(game.id)}>{game.title}</a></h3>
                          <p>{isRu ? game.descriptionRu : game.descriptionEn}</p>
                          <div className="osg-game-tags">{game.genres.map((item) => <span key={item}>{genreName(item, isRu)}</span>)}</div>
                          <div className="osg-game-card-actions">
                            <a className="osg-games-primary" href={playHref(game.id)} onClick={() => startGame(game)}><Play size={15} fill="currentColor" />{t('Играть', 'Play')}<ArrowUpRight size={15} /></a>
                            <a className="osg-game-details-link" href={infoHref(game.id)}>{t('Детали', 'Details')}<ChevronRight size={15} /></a>
                            <button className="osg-game-share" onClick={() => void shareGame(game)} aria-label={t('Поделиться игрой ', 'Share game ') + game.title}><Share2 size={16} /></button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="osg-games-empty"><Search size={24} /><h3>{t('Ничего не найдено', 'No games found')}</h3><p>{t('Измени запрос или фильтр, чтобы увидеть игры.', 'Change the search query or filter to see games.')}</p><button onClick={() => { setSearch(''); setGenre('all'); setShelf('all') }}>{t('Сбросить фильтры', 'Reset filters')}</button></div>
              )}
            </section>

            <section className="osg-games-crosspromo">
              <div><p className="osg-games-eyebrow">02 / BEYOND PLAY</p><h2>{t('Идея для своего цифрового мира?', 'Have an idea for your own digital world?')}</h2><p>{t('OSGARD помогает превращать идеи в игры, сайты и приложения. Начни с описания задачи — без навязчивых рекламных вставок внутри игры.', 'OSGARD helps turn ideas into games, websites and apps. Start by describing the project — without intrusive ads inside the game.')}</p></div>
              <a href="/development" className="osg-games-primary">{t('Обсудить разработку', 'Discuss a project')}<ArrowUpRight size={16} /></a>
            </section>
          </>
        )}

        {pageMode === 'detail' && activeGame && (
          <section className="osg-game-detail">
            <a className="osg-games-back" href="/games"><ArrowLeft size={16} />{t('К каталогу', 'Back to library')}</a>
            <div className={'osg-game-detail-hero osg-game-card--' + activeGame.accent}>
              <div className="osg-game-detail-art"><span>{activeGame.mark}</span><small>{isRu ? activeGame.subtitleRu : activeGame.subtitleEn}</small><strong>{activeGame.title}</strong></div>
              <div className="osg-game-detail-copy"><p className="osg-games-eyebrow">{String(activeGame.order + 1).padStart(2, '0')} / OSGARD PLAY</p><h1>{activeGame.title}</h1><p>{isRu ? activeGame.descriptionRu : activeGame.descriptionEn}</p><div className="osg-game-tags">{activeGame.genres.map((item) => <span key={item}>{genreName(item, isRu)}</span>)}</div><div className="osg-game-detail-actions"><a className="osg-games-primary" href={playHref(activeGame.id)} onClick={() => startGame(activeGame)}><Play size={16} fill="currentColor" />{t('Запустить игру', 'Launch game')}<ArrowUpRight size={16} /></a><button className="osg-games-secondary" onClick={() => void shareGame(activeGame)}><Share2 size={15} />{t('Поделиться', 'Share')}</button><button className={'osg-games-secondary ' + (favorites.includes(activeGame.id) ? 'is-active' : '')} onClick={() => toggleFavorite(activeGame.id)}><Heart size={15} fill={favorites.includes(activeGame.id) ? 'currentColor' : 'none'} />{favorites.includes(activeGame.id) ? t('В избранном', 'Favourited') : t('В избранное', 'Add favourite')}</button></div></div>
            </div>
            <div className="osg-game-info-grid">
              <section className="osg-game-info-panel"><p className="osg-games-eyebrow">01 / ENGINE</p><h2>{t('Техническая информация', 'Technical information')}</h2><dl><div><dt>{t('Тип запуска', 'Runtime')}</dt><dd>{isRu ? activeGame.engineRu : activeGame.engineEn}</dd></div><div><dt>{t('Файлы входа', 'Entry files')}</dt><dd><span className={'osg-game-status-pill osg-game-status-pill--' + selectedState}>{statusText(selectedState, isRu)}</span></dd></div><div><dt>{t('Устройства', 'Devices')}</dt><dd>{isRu ? activeGame.devicesRu : activeGame.devicesEn}</dd></div></dl><p className="osg-game-note">{t('Проверка показывает доступность обязательных URL и тип ответа сервера. Она не подтверждает загрузку графики, вход в сетевую сессию или работу на физическом телефоне.', 'The check verifies required URLs and response types. It does not prove graphics startup, online session connectivity or operation on a physical phone.')}</p></section>
              <section className="osg-game-info-panel"><p className="osg-games-eyebrow">02 / CONTROLS</p><h2>{t('Как начать', 'How to start')}</h2><p>{isRu ? activeGame.controlsRu : activeGame.controlsEn}</p><div className="osg-game-device-row"><span><Monitor size={17} />{t('Компьютер', 'Desktop')}</span><span><Smartphone size={17} />{t('Телефон', 'Mobile')}</span></div><p className="osg-game-note">{t('Сенсорная поддержка и производительность зависят от конкретной игры и устройства. Если загрузка не завершается, вернись в каталог или открой игру напрямую.', 'Touch support and performance depend on the specific game and device. If loading does not finish, return to the library or open the game directly.')}</p><div className="osg-game-info-actions"><a href={activeGame.href} className="osg-games-secondary" target="_blank" rel="noreferrer">{t('Открыть отдельно', 'Open separately')}<ExternalLink size={14} /></a><a href={playHref(activeGame.id)} className="osg-games-secondary">{t('В игровом окне', 'In game frame')}<ChevronRight size={14} /></a></div></section>
            </div>
            <section className="osg-games-related"><div className="osg-games-section-head"><div><p className="osg-games-eyebrow">03 / KEEP EXPLORING</p><h2>{t('Следующий игровой мир', 'Your next game')}</h2></div><a href="/games">{t('Весь каталог', 'Full library')}<ArrowUpRight size={15} /></a></div><div className="osg-games-related-list">{CATALOG.filter((game) => game.id !== activeGame.id).slice(0, 3).map((game) => <a href={infoHref(game.id)} className={'osg-games-related-card osg-game-card--' + game.accent} key={game.id}><span>{game.mark}</span><div><strong>{game.title}</strong><small>{isRu ? game.subtitleRu : game.subtitleEn}</small></div><ArrowUpRight size={16} /></a>)}</div></section>
          </section>
        )}

        {pageMode === 'play' && activeGame && (
          <section className="osg-game-player">
            <div className="osg-game-player-top"><a className="osg-games-back" href={infoHref(activeGame.id)}><ArrowLeft size={16} />{t('Об игре', 'Game details')}</a><div><p className="osg-games-eyebrow">OSGARD PLAY / SESSION</p><h1>{activeGame.title}</h1></div><div className="osg-game-player-actions"><button className="osg-games-secondary" onClick={() => void fullscreen()}><Expand size={15} />{t('На весь экран', 'Fullscreen')}</button><a className="osg-games-secondary" href={activeGame.href} target="_blank" rel="noreferrer">{t('Открыть отдельно', 'Open separately')}<ExternalLink size={14} /></a></div></div>
            <div className="osg-game-frame-shell">
              {!frameLoaded && <div className="osg-game-frame-loading"><span className="osg-game-loading-ring" /><strong>{t('Открываем игровую страницу', 'Opening game page')}</strong><span>{t('Если движок не запустится, воспользуйся ссылкой «Открыть отдельно».', 'If the engine does not start, use “Open separately”.')}</span></div>}
              <iframe ref={frameRef} className="osg-game-iframe" src={activeGame.href} title={activeGame.title} allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowFullScreen onLoad={() => setFrameLoaded(true)} />
            </div>
            <div className="osg-game-player-footer"><span className={'osg-game-status-pill osg-game-status-pill--' + selectedState}>{statusText(selectedState, isRu)}</span><span>{t('Измеряется наличие точки входа, а не успешность запуска игрового движка.', 'The check measures entry-point availability, not successful startup of the game engine.')}</span><button onClick={() => void shareGame(activeGame)}><Share2 size={14} />{t('Поделиться', 'Share')}</button></div>
          </section>
        )}

        {pageMode !== 'catalog' && !activeGame && (
          <section className="osg-games-not-found"><p className="osg-games-eyebrow">OSGARD PLAY / 404</p><h1>{t('Игровой мир не найден', 'Game world not found')}</h1><p>{t('Эта игра отсутствует в каталоге или ссылка устарела.', 'This game is not in the library or the link has expired.')}</p><a className="osg-games-primary" href="/games"><ArrowLeft size={16} />{t('Вернуться в каталог', 'Return to library')}</a></section>
        )}
      </main>

      <footer className="osg-games-footer">
        <a className="osg-games-footer-brand" href="/"><OsgardLogo /><span>PLAY / EXPLORE / BUILD</span></a>
        <div className="osg-games-footer-links"><a href="/worlds">{t('Экосистема', 'Ecosystem')}</a><a href="/development">{t('Разработка', 'Development')}</a><a href="mailto:osman.osmanov0099@gmail.com">{t('Написать OSGARD', 'Email OSGARD')}</a><a href="https://wa.me/79640027222" target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={13} /></a></div>
        <p>OSGARD WORLD · {new Date().getFullYear()} · {t('Игры и цифровые продукты', 'Games and digital products')}</p>
      </footer>
      {notice && <div className="osg-games-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label={t('Закрыть сообщение', 'Dismiss message')}><X size={14} /></button></div>}
    </div>
  )
}
