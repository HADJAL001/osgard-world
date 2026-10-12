import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ExternalLink,
  Gamepad2, Heart, Maximize2, MessageCircle, Monitor, Play, Share2,
  Smartphone, X,
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
    href: '/games/null-shift-godot/index.html',
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
    supportRu: 'HTML-игра с локальным сохранением и поддержкой установки. Общая летопись требует настроенного серверного API; без него поколения остаются локальными.',
    supportEn: 'An installable HTML game with device-local saves. Shared lineage requires a configured server API; otherwise generations remain local.',
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


function ShieldGlyph() {
  return <svg width="28" height="32" viewBox="0 0 28 32" aria-hidden="true"><path d="M14 2 25 6v8c0 7-4.7 12-11 16C7.7 26 3 21 3 14V6z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m9 15 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
}

export function GameDetailPage({ slug }: { slug: string }) {
  const game = GAMES.find(item => item.id === slug)
  const [locale, setLocale] = useState<Locale>('ru')
  const ru = locale === 'ru'
  const { favorites, consent, remember, toggleFavorite, chooseConsent } = useLocalCatalogState()
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
    const canonicalUrl = 'https://osgard.world/game/' + game.id
    const description = gameDescription(game, locale)
    canonical.href = canonicalUrl
    const setMeta = (selector: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element) }
      element.setAttribute('content', value)
    }
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[property="og:url"]', canonicalUrl)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)
    const schema = { '@context': 'https://schema.org', '@type': 'VideoGame', name: gameTitle(game, locale), description, genre: locale === 'ru' ? game.genreRu : game.genreEn, gamePlatform: 'Web browser', applicationCategory: 'Game', url: canonicalUrl, publisher: { '@type': 'Organization', name: 'OSGARD WORLD', url: 'https://osgard.world/' } }
    let script = document.head.querySelector<HTMLScriptElement>('script[data-game-schema]')
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.gameSchema = 'true'; document.head.appendChild(script) }
    script.textContent = JSON.stringify(schema)
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

  if (!game) return <main className="gh-page gh-not-found"><a href="/games/"><ArrowLeft size={16} />{ru ? 'Вернуться в каталог' : 'Back to games'}</a><p className="gh-eyebrow">404 / WORLD NOT FOUND</p><h1>{ru ? 'Этого мира нет в каталоге.' : 'This world is not in the catalog.'}</h1><p>{ru ? 'Проверьте ссылку или выберите одну из доступных игр.' : 'Check the URL or choose one of the available games.'}</p><a className="gh-primary" href="/games">{ru ? 'Открыть игры' : 'Open games'}<ArrowRight size={16} /></a></main>

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
          {frameError ? <div className="gh-game-error"><p>{ru ? 'Не удалось загрузить встроенную игру.' : 'The embedded game could not be loaded.'}</p><a className="gh-primary" href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть игру отдельно' : 'Open game separately'}<ExternalLink size={15} /></a></div> : <iframe title={gameTitle(game, locale)} src={game.href} onLoad={() => {
            let attempts = 0
            const validateFrame = () => {
              try {
                const frame = stageRef.current?.querySelector('iframe')
                const frameDocument = frame?.contentDocument
                const frameTitle = frameDocument?.title ?? ''
                const titleChecks: Record<string, RegExp> = {
                  time: /империя времени|empire of time/i,
                  swarm: /swarm/i,
                  'null-shift': /null\s*\/\/\s*shift|null\s*shift/i,
                  inherit: /inherit/i,
                  remix: /remix/i,
                }
                const validTitle = game.id === 'time'
                  ? Boolean(frameDocument?.querySelector('.time-game'))
                  : (titleChecks[game.id]?.test(frameTitle) ?? false)
                if (validTitle) {
                  setLoadingGame(false)
                  return
                }
                // The strategy page is a React SPA; wait for its component to mount
                // instead of interpreting the initial HTML shell as a failed launch.
                if (attempts < 20) {
                  attempts += 1
                  window.setTimeout(validateFrame, 250)
                  return
                }
                setLoadingGame(false)
                setFrameError(true)
              } catch {
                setLoadingGame(false)
                setFrameError(true)
              }
            }
            validateFrame()
          }} onError={() => { setLoadingGame(false); setFrameError(true) }} allow="fullscreen; gamepad; clipboard-write" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin" />}
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
