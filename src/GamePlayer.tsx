import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CircleAlert, ExternalLink, Gamepad2,
  Maximize2, RotateCcw, Share2, ShieldCheck, Smartphone
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { OSGARD_GAMES, type OsgardGameId } from './core/manifest'
import { recordOsgardEvent } from './core/eventQueue'

type PlayerStatus = 'loading' | 'ready' | 'error'

type PlayerDefinition = {
  title: string
  mark: string
  genre: string
  tagline: string
  description: string
  controls: string
  source: string
  fallback?: string
  expectedTitle: string[]
}

const playerDefinitions: Record<OsgardGameId, PlayerDefinition> = {
  time: {
    title: 'Империя времени',
    mark: 'ET',
    genre: 'Стратегия',
    tagline: 'Город — это система решений.',
    description: 'Управляйте городом, ресурсами и политическими решениями. Откройте игру в отдельной оболочке и продолжайте сессию на её родном экране.',
    controls: 'Интерактивные панели игры; мышь и сенсорное управление в зависимости от экрана.',
    source: '/games/time',
    expectedTitle: ['империя времени']
  },
  swarm: {
    title: 'SWARM',
    mark: 'SW',
    genre: 'Тактика / координация',
    tagline: 'Синхронность сильнее хаоса.',
    description: 'Подготовьте команду, согласуйте действия и достигните цели миссии. Сетевой матч не заявляется этой витриной.',
    controls: 'Следуйте подсказкам игрового экрана; поддержка касаний зависит от конкретного элемента интерфейса.',
    source: '/games/swarm/index.html',
    expectedTitle: ['swarm']
  },
  'null-shift': {
    title: 'NULL//SHIFT',
    mark: 'NS',
    genre: 'Тактический рейд',
    tagline: 'Сдвиньте реальность. Заберите ядро.',
    description: 'Тактический рейд в меняющейся реальности. Сначала используется экспорт Godot для браузера; при недоступности сборки экран переключится на резервную WebGL-версию.',
    controls: 'Клавиатура и мышь; в WebGL-версии предусмотрена отдельная панель мобильного управления.',
    source: '/games/null-shift-godot/index.html',
    fallback: '/games/null-shift/index.html',
    expectedTitle: ['null', 'shift']
  },
  inherit: {
    title: 'INHERIT',
    mark: 'IN',
    genre: 'Исследование / симуляция',
    tagline: 'Мир помнит решения поколений.',
    description: 'Исследуйте спокойный живой мир и оставляйте след, который передаётся дальше.',
    controls: 'Следуйте подсказкам игры; тестирование на конкретных сенсорных устройствах проводится отдельно.',
    source: '/games/inherit/index.html',
    expectedTitle: ['inherit']
  },
  remix: {
    title: 'REMIX',
    mark: 'RX',
    genre: 'Создание',
    tagline: 'Создавайте испытания, а не только проходите их.',
    description: 'Браузерная оболочка запускает сборку Unity WebGL. Для загрузки нужны совместимые WebGL 2 и достаточная память устройства.',
    controls: 'Мышь или сенсорное управление в зависимости от сценария; для слабых устройств загрузка может занять больше времени.',
    source: '/games/remix/index.html',
    expectedTitle: ['remix']
  }
}

const sourceManifest = new Map(OSGARD_GAMES.map(game => [game.id, game]))

function analyticsAllowed() {
  try {
    return window.localStorage.getItem('osgard.games.analytics-consent.v1') === 'analytics'
  } catch {
    return false
  }
}

function track(name: 'game_session_started' | 'game_session_completed' | 'share_created', payload: Record<string, unknown>) {
  if (!analyticsAllowed()) return
  recordOsgardEvent(name, { ...payload, surface: 'games-player' })
}

function rememberGame(id: OsgardGameId) {
  try {
    const key = 'osgard.games.history.v1'
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || '[]')
    const history = Array.isArray(parsed)
      ? parsed.filter((entry): entry is { id: OsgardGameId; at: number } =>
          Boolean(entry) && typeof entry === 'object' &&
          Object.prototype.hasOwnProperty.call(entry, 'id') &&
          sourceManifest.has((entry as { id: OsgardGameId }).id) &&
          Number.isFinite((entry as { at: number }).at))
      : []
    window.localStorage.setItem(key, JSON.stringify([{ id, at: Date.now() }, ...history.filter(entry => entry.id !== id)].slice(0, 12)))
  } catch {
    // Saving local history is optional and must never block the game.
  }
}

export function GamePlayer({ gameId }: { gameId: string }) {
  const isKnownGame = sourceManifest.has(gameId as OsgardGameId)
  const id = gameId as OsgardGameId
  const game = isKnownGame ? playerDefinitions[id] : null
  const [source, setSource] = useState(() => game?.source ?? '')
  const [status, setStatus] = useState<PlayerStatus>('loading')
  const [message, setMessage] = useState('Подготавливаем игровую сборку…')
  const [frameKey, setFrameKey] = useState(0)
  const [toast, setToast] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const frameShellRef = useRef<HTMLDivElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const fallbackUsedRef = useRef(false)
  const verifyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!game) return
    document.title = game.title + ' — OSGARD PLAY'
    const description = game.description
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://osgard.world/games/play/' + id
    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        document.head.appendChild(element)
      }
      element.setAttribute(attribute, value)
    }
    setMeta('meta[property="og:title"]', 'content', game.title + ' — OSGARD PLAY')
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', canonical.href)
  }, [game, id])

  useEffect(() => {
    if (status !== 'loading') return
    const watchdog = window.setTimeout(() => {
      setStatus(current => current === 'loading' ? 'error' : current)
      setMessage('Сборка отвечает слишком долго. Можно повторить запуск или открыть её отдельно.')
    }, 35000)
    return () => window.clearTimeout(watchdog)
  }, [status, source, frameKey])

  useEffect(() => () => {
    if (verifyTimerRef.current !== null) window.clearTimeout(verifyTimerRef.current)
    const startedAt = startedAtRef.current
    if (startedAt !== null) {
      track('game_session_completed', {
        game: id,
        elapsedSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
      })
      startedAtRef.current = null
    }
  }, [id])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!game) {
    return (
      <main className="owg-page ogp-player-page">
        <header className="owg-header"><a className="owg-brand" href="/games"><OsgardLogo /></a><a className="owg-header-contact" href="/games">Вернуться к играм <ArrowLeft size={15} /></a></header>
        <section className="ogp-not-found"><CircleAlert size={30} /><p className="owg-kicker">OSGARD PLAY / 404</p><h1>Игровой мир не найден.</h1><p>Проверьте ссылку или выберите другую игру из каталога.</p><a className="owg-button owg-button-primary" href="/games">Открыть каталог <ArrowRight size={16} /></a></section>
      </main>
    )
  }

  const finishSession = () => {
    const startedAt = startedAtRef.current
    if (startedAt !== null) {
      track('game_session_completed', {
        game: id,
        elapsedSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
      })
      startedAtRef.current = null
    }
  }

  const beginSession = () => {
    if (startedAtRef.current !== null) return
    startedAtRef.current = Date.now()
    rememberGame(id)
    track('game_session_started', { game: id, source, route: window.location.pathname })
  }

  const failOrFallback = (reason: string) => {
    if (id === 'null-shift' && game.fallback && source === game.source && !fallbackUsedRef.current) {
      fallbackUsedRef.current = true
      finishSession()
      setMessage('Godot-сборка недоступна. Переключаемся на резервную WebGL-версию…')
      setStatus('loading')
      setSource(game.fallback)
      return
    }
    setMessage(reason)
    setStatus('error')
  }

  const verifyFrame = () => {
    if (verifyTimerRef.current !== null) window.clearTimeout(verifyTimerRef.current)
    verifyTimerRef.current = window.setTimeout(() => {
      const frame = frameRef.current
      if (!frame) return
      let title = ''
      try {
        title = (frame.contentDocument?.title ?? '').toLocaleLowerCase('ru-RU')
      } catch {
        // If browser policy changes, the frame still can be considered loaded by its load event.
        title = game.title.toLocaleLowerCase('ru-RU')
      }
      const expected = game.expectedTitle.some(token => title.includes(token))
      if (expected) {
        setStatus('ready')
        setMessage('Игровой экран загружен. Удачной сессии.')
        beginSession()
      } else {
        failOrFallback('Игровая страница не подтвердила свою загрузку. Повторите попытку или откройте сборку отдельно.')
      }
    }, id === 'time' ? 1600 : 350)
  }

  const handleFrameError = () => failOrFallback('Не удалось загрузить игровую сборку. Проверьте соединение и попробуйте ещё раз.')

  const retry = () => {
    finishSession()
    setStatus('loading')
    setMessage('Повторно загружаем игру…')
    setFrameKey(key => key + 1)
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (frameShellRef.current?.requestFullscreen) await frameShellRef.current.requestFullscreen()
      else setToast('Полноэкранный режим не поддерживается этим браузером.')
    } catch {
      setToast('Браузер не разрешил полноэкранный режим. Попробуйте открыть игру отдельно.')
    }
  }

  const share = async () => {
    const url = new URL('/games/play/' + id, window.location.origin).toString()
    track('share_created', { kind: 'game', game: id })
    try {
      if (navigator.share) {
        await navigator.share({ title: game.title + ' — OSGARD PLAY', text: game.tagline, url })
        setToast('Ссылка отправлена')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setToast('Ссылка скопирована')
      } else {
        window.prompt('Скопируйте ссылку на игру:', url)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setToast('Не удалось поделиться ссылкой')
    }
  }

  const recommendations = OSGARD_GAMES.filter(entry => entry.id !== id).slice(0, 3)
  const directSource = source || game.source

  return (
    <main className="owg-page ogp-player-page">
      <div className="owg-ambient" aria-hidden="true"><span /><span /><span /></div>
      <header className="owg-header ogp-player-header">
        <a className="owg-brand" href="/games" aria-label="OSGARD PLAY — каталог игр"><OsgardLogo /></a>
        <nav className="owg-nav" aria-label="Навигация игровой платформы">
          <a href="/games">Все игры</a><a href="/games#ecosystem">Экосистема</a><a href="/development">Разработка</a>
        </nav>
        <div className="owg-header-actions">
          <a className="owg-header-contact" href="/games"><ArrowLeft size={14} /> Каталог</a>
        </div>
      </header>

      <section className="ogp-player-intro">
        <div><p className="owg-kicker">OSGARD PLAY <span>/</span> {game.genre.toUpperCase()}</p><h1>{game.title}</h1><p>{game.tagline}</p></div>
        <div className={'ogp-status-pill is-' + status} role="status" aria-live="polite"><span />{status === 'ready' ? 'Игра загружена' : status === 'error' ? 'Проблема загрузки' : 'Загрузка игры'}</div>
      </section>

      <section className="ogp-player-layout" aria-label={'Игровой экран ' + game.title}>
        <div className="ogp-player-main">
          <div className="ogp-frame-toolbar"><span><Gamepad2 size={14} /> SESSION / {game.mark}</span><span>{status === 'ready' ? 'READY' : status === 'error' ? 'RETRY REQUIRED' : 'INITIALIZING'}</span></div>
          <div className="ogp-frame-shell" ref={frameShellRef}>
            <iframe
              key={frameKey + ':' + source}
              ref={frameRef}
              title={game.title + ' — игровая область'}
              src={directSource}
              onLoad={verifyFrame}
              onError={handleFrameError}
              allow="autoplay; fullscreen; gamepad; clipboard-write"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {status === 'loading' && <div className="ogp-frame-overlay"><span className="ogp-loader" /><p className="owg-kicker">OSGARD / BUILD LOADER</p><h2>{message}</h2><p>Не закрывайте окно, пока браузер загружает ресурсы игры.</p></div>}
            {status === 'error' && <div className="ogp-frame-overlay ogp-frame-overlay-error"><CircleAlert size={28} /><p className="owg-kicker">BUILD / UNAVAILABLE</p><h2>Не удалось запустить игру.</h2><p>{message}</p><div className="ogp-overlay-actions"><button className="owg-button owg-button-primary" onClick={retry}><RotateCcw size={15} /> Повторить</button><a className="owg-button owg-button-quiet" href={directSource} target="_blank" rel="noopener noreferrer">Открыть отдельно <ExternalLink size={14} /></a></div></div>}
          </div>
          <div className="ogp-frame-actions">
            <button className="owg-button owg-button-quiet" type="button" onClick={retry}><RotateCcw size={15} /> Перезапустить</button>
            <button className="owg-button owg-button-quiet" type="button" onClick={() => void toggleFullscreen()}><Maximize2 size={15} /> На весь экран</button>
            <a className="owg-button owg-button-quiet" href={directSource} target="_blank" rel="noopener noreferrer">Открыть отдельно <ExternalLink size={14} /></a>
          </div>
          <p className="ogp-player-note"><ShieldCheck size={14} /> Игры загружаются из официальных каталогов OSGARD. Реклама не перекрывает поле игры; партнёрские интеграции будут явно обозначены.</p>
        </div>

        <aside className="ogp-player-sidebar">
          <a className="ogp-back-link" href="/games"><ArrowLeft size={15} /> Все игры OSGARD PLAY</a>
          <div className="ogp-info-card"><p className="owg-kicker">GAME DOSSIER / {game.mark}</p><div className={'ogp-game-mark accent-' + id.replace('-', '')}>{game.mark}</div><p className="ogp-genre">{game.genre}</p><h2>{game.title}</h2><p>{game.description}</p><div className="ogp-control-card"><strong>Управление</strong><p>{game.controls}</p><span><Smartphone size={14} /> Мобильная поддержка зависит от самой игры и браузера.</span></div><div className="ogp-side-actions"><button className="owg-button owg-button-outline" type="button" onClick={() => void share()}><Share2 size={15} /> Поделиться</button><a className="owg-button owg-button-primary" href={directSource} target="_blank" rel="noopener noreferrer">Открыть игру отдельно <ArrowUpRight size={15} /></a></div></div>
          <div className="ogp-commercial-card"><p className="owg-kicker">PARTNER / OSGARD</p><h3>Поддержать игровой мир.</h3><p>Брендированные события и спонсорские уровни обсуждаются отдельно. Здесь пока не подключена рекламная сеть.</p><a href="mailto:osman.osmanov0099@gmail.com?subject=OSGARD%20PLAY%20%E2%80%94%20%D0%BF%D0%B0%D1%80%D1%82%D0%BD%D1%91%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D0%B3%D1%80%D0%B0%D1%86%D0%B8%D1%8F">Обсудить интеграцию <ArrowUpRight size={14} /></a></div>
        </aside>
      </section>

      <section className="ogp-recommendations"><div className="ogp-recommendations-heading"><div><p className="owg-kicker">NEXT WORLD / 01</p><h2>Следующий мир ждёт.</h2></div><a className="owg-text-link" href="/games">Вся коллекция <ArrowRight size={15} /></a></div><div className="ogp-recommendation-grid">{recommendations.map(item => <a key={item.id} className="ogp-recommendation" href={'/games/play/' + item.id}><span>{playerDefinitions[item.id].mark}</span><div><strong>{playerDefinitions[item.id].title}</strong><small>{playerDefinitions[item.id].genre}</small></div><ArrowUpRight size={15} /></a>)}</div></section>
      <footer className="owg-footer ogp-player-footer"><div className="owg-footer-brand"><a href="/games"><OsgardLogo variant="footer" /></a><p>OSGARD WORLD GAMING<br />Своя игра. Свой мир. Своя система.</p></div><div className="owg-footer-links"><a href="/games">Каталог</a><a href="/privacy">Конфиденциальность</a><a href="/terms">Условия</a><a href="mailto:osman.osmanov0099@gmail.com">Контакт</a><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer">WhatsApp</a></div><div className="owg-footer-policy"><span>© OSGARD WORLD · 2026</span><p>Избранное и история хранятся на устройстве.</p></div></footer>
      {toast && <div className="owg-toast" role="status" aria-live="polite">{toast}</div>}
    </main>
  )
}
