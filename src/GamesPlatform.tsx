import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, Check, Clock3, ExternalLink, Gamepad2, Heart,
  Mail, Monitor, Search, Send, Share2, ShieldCheck, Smartphone, Sparkles, X, Zap
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { OSGARD_GAMES, type OsgardGameId } from './core/manifest'
import { recordOsgardEvent } from './core/eventQueue'

type Genre = 'all' | 'strategy' | 'coop' | 'action' | 'simulation' | 'creative'
type SortMode = 'featured' | 'recent' | 'az'
type AnalyticsConsent = 'unset' | 'necessary' | 'analytics'
type PlayedGame = { id: OsgardGameId; at: number }

const FAVORITES_KEY = 'osgard.games.favorites.v1'
const HISTORY_KEY = 'osgard.games.history.v1'
const CONSENT_KEY = 'osgard.games.analytics-consent.v1'

const gameDetails: Record<OsgardGameId, {
  title: string
  mark: string
  genre: Exclude<Genre, 'all'>
  genreLabel: string
  tagline: string
  description: string
  controls: string
  platform: string
  accent: string
  tags: string[]
  featured?: boolean
}> = {
  time: {
    title: 'Империя времени', mark: 'ET', genre: 'strategy', genreLabel: 'Стратегия',
    tagline: 'Город — это система решений.',
    description: 'Развивайте город, распоряжайтесь ресурсами и наблюдайте, как выбор меняет его будущее.',
    controls: 'Клавиатура и мышь', platform: 'Браузерная стратегия', accent: 'amber',
    tags: ['Город', 'Менеджмент', 'Решения']
  },
  swarm: {
    title: 'SWARM', mark: 'SW', genre: 'coop', genreLabel: 'Кооператив',
    tagline: 'Синхронность сильнее хаоса.',
    description: 'Подготовьте команду, согласуйте действия и выведите ядро до того, как тревога захватит систему.',
    controls: 'Клавиатура и мышь', platform: 'Браузерная игра', accent: 'mint',
    tags: ['Тактика', 'Команда', 'Экстракция']
  },
  'null-shift': {
    title: 'NULL//SHIFT', mark: 'NS', genre: 'action', genreLabel: 'Экшен / рейд',
    tagline: 'Сдвиньте реальность. Заберите ядро.',
    description: 'Взломайте узлы безопасности, переключайте слои реальности и найдите безопасный путь к экстракции.',
    controls: 'Клавиатура, мышь и сенсорный экран', platform: 'Godot Web / WebGL', accent: 'ice',
    tags: ['Научная фантастика', 'Стелс', 'Рейд'], featured: true
  },
  inherit: {
    title: 'INHERIT', mark: 'IN', genre: 'simulation', genreLabel: 'Симуляция',
    tagline: 'Мир помнит решения поколений.',
    description: 'Исследуйте живой остров и оставляйте след в мире, который развивается вместе с вашим выбором.',
    controls: 'Касание или мышь', platform: 'Браузерная игра', accent: 'fern',
    tags: ['Мир', 'Наследие', 'Исследование']
  },
  remix: {
    title: 'REMIX', mark: 'RX', genre: 'creative', genreLabel: 'Творчество',
    tagline: 'Создавайте испытания, а не только проходите их.',
    description: 'Собирайте собственные испытания и делитесь игровыми повторами с сообществом.',
    controls: 'Клавиатура и мышь', platform: 'Браузерный конструктор', accent: 'rose',
    tags: ['Конструктор', 'Replay', 'Творчество']
  }
}

const genreOptions: Array<{ id: Genre; label: string }> = [
  { id: 'all', label: 'Все игры' },
  { id: 'strategy', label: 'Стратегия' },
  { id: 'coop', label: 'Кооператив' },
  { id: 'action', label: 'Экшен' },
  { id: 'simulation', label: 'Симуляция' },
  { id: 'creative', label: 'Творчество' }
]

const projects = [
  { id: 'development', name: 'OSGARD / Разработка', category: 'Создание', description: 'Сайты, приложения и цифровые продукты от идеи до запуска.', url: 'https://osgardbewworld.com', symbol: 'O/', accent: 'ice' },
  { id: 'o2', name: 'O2 SYSTEM', category: 'Бизнес', description: 'Цифровой учёт и инструменты для повседневных бизнес-операций.', url: 'https://o2system.art', symbol: 'O₂', accent: 'mint' },
  { id: 'senjor', name: 'SENJOR', category: 'Мобильность', description: 'Сервис персональных поездок.', url: 'https://senjorio.com', symbol: 'S', accent: 'amber' },
  { id: 'superday', name: 'SUPER DAY', category: 'Продуктивность', description: 'Планировщик дня с приоритизацией задач и AI-инструментами.', url: 'https://superday.run', symbol: '24', accent: 'ice' },
  { id: 'marcosa', name: 'MARCOSA', category: 'Сообщество', description: 'Социальное пространство для историй, миров и сообществ.', url: 'https://marcosa.club', symbol: 'M', accent: 'rose' },
  { id: 'myosa', name: 'OSA / MYOSA', category: 'AI', description: 'Проект искусственного интеллекта для задач и принятия решений.', url: 'https://myosa.world', symbol: 'AI', accent: 'violet' },
  { id: 'gold-glamour', name: 'GG EMPIRE', category: 'Услуги', description: 'Премиальные услуги и выездной сервис.', url: 'https://gold-glamour.online', symbol: 'GG', accent: 'amber' },
  { id: 'gardvpn', name: 'GARD VPN', category: 'Защита', description: 'Сервис защищённого подключения.', url: 'https://gardvpn.is', symbol: 'G', accent: 'mint' },
  { id: 'osgardos', name: 'OSGARD OS', category: 'Бизнес', description: 'Инструменты и решения для развития бизнеса.', url: 'https://osgardos.com', symbol: 'OS', accent: 'ice' },
  { id: 'vanguard', name: 'VANGUARD STUDIO', category: 'Видео', description: 'Создание видео и рекламных материалов.', url: 'https://osgardvanguard.studio', symbol: 'V', accent: 'rose' }
]

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function readConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'unset'
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'necessary' || value === 'analytics' ? value : 'unset'
  } catch {
    return 'unset'
  }
}

function trackedProjectUrl(url: string, projectId: string) {
  const target = new URL(url)
  target.searchParams.set('utm_source', 'osgard.world')
  target.searchParams.set('utm_medium', 'cross_promo')
  target.searchParams.set('utm_campaign', 'games_platform')
  target.searchParams.set('utm_content', projectId)
  return target.toString()
}

export function GamesPlatform() {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<Genre>('all')
  const [sort, setSort] = useState<SortMode>('featured')
  const [favorites, setFavorites] = useState<OsgardGameId[]>(() => readStorage(FAVORITES_KEY, []))
  const [history, setHistory] = useState<PlayedGame[]>(() => readStorage(HISTORY_KEY, []))
  const [consent, setConsent] = useState<AnalyticsConsent>(readConsent)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [projectType, setProjectType] = useState('Игра или игровой прототип')
  const [budget, setBudget] = useState('Пока не определён')
  const [email, setEmail] = useState('')
  const [brief, setBrief] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const viewTracked = useRef(false)

  const track = (name: 'portal_opened' | 'game_opened' | 'share_created', payload: Record<string, unknown> = {}) => {
    if (consent !== 'analytics') return
    recordOsgardEvent(name, { ...payload, surface: 'games-platform' })
  }

  useEffect(() => {
    document.title = 'OSGARD PLAY — игровые миры'
    const description = 'Премиальная игровая витрина OSGARD WORLD: каталог браузерных игр, история, избранное и цифровая экосистема.'
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    return () => { document.title = 'OSGARD WORLD — цифровая экосистема' }
  }, [])

  useEffect(() => {
    if (consent === 'analytics' && !viewTracked.current) {
      viewTracked.current = true
      recordOsgardEvent('portal_opened', { surface: 'games-platform', gameCount: OSGARD_GAMES.length })
    }
  }, [consent])

  useEffect(() => {
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) } catch { /* local preferences are optional */ }
  }, [favorites])

  useEffect(() => {
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12))) } catch { /* local history is optional */ }
  }, [history])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredGames = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('ru-RU')
    const list = OSGARD_GAMES.map((game, index) => ({ ...game, ...gameDetails[game.id], index }))
      .filter(game => genre === 'all' || game.genre === genre)
      .filter(game => !onlyFavorites || favorites.includes(game.id))
      .filter(game => {
        if (!normalized) return true
        const corpus = [game.title, game.tagline, game.description, game.genreLabel, game.platform, ...game.tags, game.reason].join(' ').toLocaleLowerCase('ru-RU')
        return corpus.includes(normalized)
      })
    if (sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    if (sort === 'recent') return list.sort((a, b) => (history.findIndex(item => item.id === a.id) < 0 ? 999 : history.findIndex(item => item.id === a.id)) - (history.findIndex(item => item.id === b.id) < 0 ? 999 : history.findIndex(item => item.id === b.id)))
    return list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.index - b.index)
  }, [search, genre, sort, onlyFavorites, favorites, history])

  const lastPlayed = history.length ? OSGARD_GAMES.find(game => game.id === history[0].id) : undefined
  const lastDetails = lastPlayed ? gameDetails[lastPlayed.id] : undefined

  const launchGame = (id: OsgardGameId, placement: string) => {
    const next = [{ id, at: Date.now() }, ...history.filter(item => item.id !== id)].slice(0, 12)
    setHistory(next)
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* history is optional */ }
    track('game_opened', { game: id, placement, href: OSGARD_GAMES.find(game => game.id === id)?.href })
  }

  const toggleFavorite = (id: OsgardGameId) => {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [id, ...current])
    setToast(favorites.includes(id) ? 'Игра удалена из избранного' : 'Игра добавлена в избранное')
  }

  const shareGame = async (id: OsgardGameId) => {
    const game = OSGARD_GAMES.find(item => item.id === id)
    if (!game) return
    const details = gameDetails[id]
    const url = new URL(game.href, window.location.origin).toString()
    track('share_created', { kind: 'game', game: id })
    try {
      if (navigator.share) {
        await navigator.share({ title: details.title + ' — OSGARD PLAY', text: details.tagline, url })
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

  const setAnalyticsConsent = (value: AnalyticsConsent) => {
    setConsent(value)
    try { window.localStorage.setItem(CONSENT_KEY, value) } catch { /* consent can be kept for this session only */ }
    setToast(value === 'analytics' ? 'Продуктовая аналитика включена' : 'Оставлены только необходимые функции')
  }

  const submitBrief = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = [
      'Заявка из OSGARD PLAY',
      'Тип проекта: ' + projectType,
      'Бюджет: ' + budget,
      'Контакт: ' + email,
      '',
      'Описание задачи:',
      brief
    ].join('\n')
    setFormNotice('Откроется почтовый клиент с подготовленной заявкой. Данные не отправляются сайту автоматически.')
    window.location.href = 'mailto:osman.osmanov0099@gmail.com?subject=' + encodeURIComponent('OSGARD — запрос на разработку') + '&body=' + encodeURIComponent(body)
  }

  return (
    <main className="owg-page">
      <div className="owg-ambient" aria-hidden="true"><span /><span /><span /></div>
      <header className="owg-header">
        <a className="owg-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
        <nav className={mobileMenu ? 'owg-nav is-open' : 'owg-nav'} aria-label="Главная навигация">
          <a className="is-active" href="/games">Игры</a>
          <a href="/worlds">Миры</a>
          <a href="#ecosystem">Экосистема</a>
          <a href="#studio">Разработка</a>
        </nav>
        <div className="owg-header-actions">
          <a className="owg-header-contact" href="mailto:osman.osmanov0099@gmail.com">Связаться <ArrowUpRight size={15} /></a>
          <button className="owg-menu-toggle" type="button" aria-label={mobileMenu ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(value => !value)}>{mobileMenu ? <X /> : <Gamepad2 />}</button>
        </div>
      </header>

      <section className="owg-hero" aria-labelledby="owg-title">
        <div className="owg-hero-copy">
          <p className="owg-kicker"><span className="owg-live-dot" /> OSGARD WORLD <span>/</span> PLAY</p>
          <h1 id="owg-title">Не просто игры.<br /><em>Целые миры.</em></h1>
          <p className="owg-hero-lead">Выберите игровой мир, погрузитесь в сессию и откройте следующий. Единая коллекция OSGARD — с собственным характером каждой игры.</p>
          <div className="owg-hero-actions">
            <a className="owg-button owg-button-primary" href={OSGARD_GAMES.find(game => game.id === 'null-shift')?.href ?? '/entertainment'} onClick={() => launchGame('null-shift', 'hero')}>Открыть NULL//SHIFT <ArrowRight size={17} /></a>
            <a className="owg-button owg-button-quiet" href="#catalog">Вся коллекция <ArrowRight size={16} /></a>
          </div>
          <div className="owg-proofline">
            <span><Gamepad2 size={15} /> {String(OSGARD_GAMES.length).padStart(2, '0')} игровых миров</span>
            <i />
            <span><Monitor size={15} /> Запуск в браузере</span>
            <i />
            <span><Smartphone size={15} /> Адаптация под касание</span>
          </div>
        </div>
        <div className="owg-hero-art" data-accent="ice" aria-label="Визуальная эмблема OSGARD PLAY">
          <div className="owg-art-grid" />
          <div className="owg-art-orbit owg-art-orbit-a" />
          <div className="owg-art-orbit owg-art-orbit-b" />
          <div className="owg-art-core"><span>O</span><i /></div>
          <div className="owg-art-scan" />
          <div className="owg-art-label owg-art-label-top"><span>FIG. 01</span><b>PLAY / PORTAL</b></div>
          <div className="owg-art-label owg-art-label-bottom"><span>OSGARD SYSTEMS</span><b>EXPLORE THE UNKNOWN</b></div>
          <span className="owg-art-node owg-art-node-a" /><span className="owg-art-node owg-art-node-b" /><span className="owg-art-node owg-art-node-c" />
        </div>
      </section>

      {lastPlayed && lastDetails && (
        <section className="owg-continue" aria-label="Продолжить игру">
          <div className="owg-continue-icon" data-accent={lastDetails.accent}>{lastDetails.mark}</div>
          <div className="owg-continue-copy"><span>ВАШ ПОСЛЕДНИЙ МИР</span><h2>{lastDetails.title}</h2><p>{lastDetails.tagline}</p></div>
          <a className="owg-button owg-button-primary" href={lastPlayed.href} onClick={() => launchGame(lastPlayed.id, 'continue')}>Вернуться <ArrowRight size={16} /></a>
        </section>
      )}

      <section className="owg-catalog" id="catalog" aria-labelledby="owg-catalog-title">
        <div className="owg-section-heading">
          <div><p className="owg-kicker">01 / THE GAME ARCHIVE</p><h2 id="owg-catalog-title">Найдите свой мир.</h2><p>По жанру, названию или настроению — без фиктивных рейтингов и искусственных счётчиков.</p></div>
          <div className="owg-catalog-count"><strong>{String(filteredGames.length).padStart(2, '0')}</strong><span>из {String(OSGARD_GAMES.length).padStart(2, '0')}</span></div>
        </div>
        <div className="owg-tools">
          <label className="owg-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Поиск игр, жанров и механик" aria-label="Поиск игр" />{search && <button type="button" aria-label="Очистить поиск" onClick={() => setSearch('')}><X size={15} /></button>}</label>
          <div className="owg-sort-wrap"><label htmlFor="owg-sort">Сортировка</label><select id="owg-sort" value={sort} onChange={event => setSort(event.target.value as SortMode)}><option value="featured">Рекомендуем</option><option value="recent">Недавно открытые</option><option value="az">По алфавиту</option></select></div>
        </div>
        <div className="owg-filter-row" role="group" aria-label="Фильтр по жанрам">{genreOptions.map(item => <button key={item.id} type="button" className={genre === item.id ? 'is-selected' : ''} aria-pressed={genre === item.id} onClick={() => setGenre(item.id)}>{item.label}</button>)}<button type="button" className={'owg-fav-filter' + (onlyFavorites ? ' is-selected' : '')} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(value => !value)}><Heart size={14} /> Избранное <span>{favorites.length}</span></button></div>
        <div className="owg-game-grid">
          {filteredGames.map((game, index) => (
            <article className={'owg-game-card owg-accent-' + game.accent + (index === 0 && sort === 'featured' && genre === 'all' && !search && !onlyFavorites ? ' is-featured' : '')} key={game.id}>
              <div className="owg-game-art" data-accent={game.accent}>
                <div className="owg-game-art-grid" /><div className="owg-game-art-orbit" /><div className="owg-game-art-halo" />
                <span className="owg-game-index">{String(game.index + 1).padStart(2, '0')} / OSGARD PLAY</span>
                <button className={'owg-favorite' + (favorites.includes(game.id) ? ' is-active' : '')} type="button" aria-label={favorites.includes(game.id) ? 'Убрать из избранного: ' + game.title : 'Добавить в избранное: ' + game.title} aria-pressed={favorites.includes(game.id)} onClick={() => toggleFavorite(game.id)}><Heart size={17} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} /></button>
                <strong>{game.mark}</strong><span className="owg-game-art-caption">{game.genreLabel.toUpperCase()}</span>
              </div>
              <div className="owg-game-body">
                <div className="owg-game-meta"><span>{game.genreLabel}</span><span><span className="owg-status-dot" /> В каталоге</span></div>
                <h3>{game.title}</h3><p className="owg-game-tagline">{game.tagline}</p><p className="owg-game-description">{game.description}</p>
                <div className="owg-game-tags">{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                <div className="owg-game-controls"><span><Monitor size={13} /> {game.platform}</span><span>{game.controls}</span></div>
                <div className="owg-game-actions">
                  <a className="owg-button owg-button-primary" href={game.href} onClick={() => launchGame(game.id, 'catalog-card')}>Играть <ArrowUpRight size={16} /></a>
                  <button className="owg-icon-button" type="button" aria-label={'Поделиться игрой ' + game.title} onClick={() => void shareGame(game.id)}><Share2 size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {filteredGames.length === 0 && <div className="owg-empty"><Search size={24} /><h3>Ничего не найдено</h3><p>Измените запрос или отключите один из фильтров.</p><button className="owg-button owg-button-quiet" type="button" onClick={() => { setSearch(''); setGenre('all'); setOnlyFavorites(false) }}>Сбросить фильтры</button></div>}
      </section>

      <section className="owg-sponsor" aria-labelledby="owg-sponsor-title">
        <div className="owg-sponsor-mark"><Sparkles size={24} /></div>
        <div><p className="owg-kicker">02 / PARTNER PROGRAMME</p><h2 id="owg-sponsor-title">Ваша аудитория — внутри игрового мира.</h2><p>Брендированные события, тематические задания и спонсорские размещения. Каждый формат маркируется, согласуется отдельно и не перекрывает игровой процесс.</p></div>
        <a className="owg-button owg-button-outline" href="mailto:osman.osmanov0099@gmail.com?subject=OSGARD%20PLAY%20%E2%80%94%20%D0%BF%D0%B0%D1%80%D1%82%D0%BD%D1%91%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D0%B3%D1%80%D0%B0%D1%86%D0%B8%D1%8F">Обсудить интеграцию <ArrowUpRight size={16} /></a>
        <small>Партнёрская сеть пока не подключена. Здесь не показываются фиктивные объявления или показы.</small>
      </section>

      <section className="owg-ecosystem" id="ecosystem" aria-labelledby="owg-ecosystem-title">
        <div className="owg-section-heading"><div><p className="owg-kicker">03 / THE NETWORK</p><h2 id="owg-ecosystem-title">Игры — вход в экосистему.</h2><p>Десять собственных направлений OSGARD. Переходы помечаются UTM-метками, чтобы отделять источники трафика.</p></div><a className="owg-text-link" href="https://osgard.world/worlds">Изучить миры <ArrowUpRight size={16} /></a></div>
        <div className="owg-project-grid">{projects.map(project => <a className={'owg-project-card owg-project-' + project.accent} key={project.id} href={trackedProjectUrl(project.url, project.id)} target="_blank" rel="noopener noreferrer" ><span className="owg-project-symbol">{project.symbol}</span><span className="owg-project-category">{project.category}</span><h3>{project.name}</h3><p>{project.description}</p><span className="owg-project-link">Открыть сайт <ExternalLink size={13} /></span></a>)}</div>
      </section>

      <section className="owg-studio" id="studio" aria-labelledby="owg-studio-title">
        <div className="owg-studio-copy"><p className="owg-kicker">04 / BUILT WITH OSGARD</p><h2 id="owg-studio-title">Есть идея игры,<br /><em>сайта или приложения?</em></h2><p>OSGARD поможет превратить её в цифровой продукт — от архитектуры и прототипа до запуска и измеримых результатов.</p><div className="owg-studio-links"><a href="mailto:osman.osmanov0099@gmail.com"><Mail size={16} /> osman.osmanov0099@gmail.com</a><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer"><Send size={16} /> WhatsApp · +7 964 002-72-22</a></div><div className="owg-studio-trust"><span><ShieldCheck size={15} /> Прямой контакт с разработчиком</span><span><Zap size={15} /> Без посреднической формы</span></div></div>
        <form className="owg-lead-form" onSubmit={submitBrief}>
          <div className="owg-form-heading"><span>PROJECT INQUIRY / 01</span><h3>Расскажите о задаче.</h3><p>Форма создаёт письмо в вашем почтовом клиенте — сервер сайта не сохраняет эти данные.</p></div>
          <label>Тип проекта<select value={projectType} onChange={event => setProjectType(event.target.value)}><option>Игра или игровой прототип</option><option>Сайт или веб-платформа</option><option>Мобильное приложение</option><option>AI-продукт</option><option>Рекламная / спонсорская интеграция</option><option>Другое</option></select></label>
          <label>Бюджет <span className="owg-optional">необязательно</span><select value={budget} onChange={event => setBudget(event.target.value)}><option>Пока не определён</option><option>До 50 000 ₽</option><option>50 000–150 000 ₽</option><option>150 000–500 000 ₽</option><option>Более 500 000 ₽</option></select></label>
          <label>Email для ответа<input type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Краткое описание<textarea required minLength={12} maxLength={2000} rows={4} placeholder="Что нужно создать и какого результата вы ждёте?" value={brief} onChange={event => setBrief(event.target.value)} /></label>
          <button className="owg-button owg-button-primary owg-submit" type="submit">Подготовить заявку <ArrowRight size={16} /></button>
          {formNotice && <p className="owg-form-notice" role="status">{formNotice}</p>}
        </form>
      </section>

      <footer className="owg-footer">
        <div className="owg-footer-brand"><a href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo variant="footer" /></a><p>OSGARD WORLD GAMING<br />Своя игра. Свой мир. Своя система.</p></div>
        <div className="owg-footer-links"><a href="/games">Игры</a><a href="/entertainment">Архив игр</a><a href="/development">Разработка</a><a href="/privacy">Конфиденциальность</a><a href="/terms">Условия</a><a href="mailto:osman.osmanov0099@gmail.com">Контакты</a></div>
        <div className="owg-footer-policy"><span>© OSGARD WORLD · 2026</span><button type="button" onClick={() => setToast(consent === 'analytics' ? 'Продуктовая аналитика включена' : 'Продуктовая аналитика отключена')}>Настройки данных</button><p>Избранное и история хранятся локально на этом устройстве.</p></div>
      </footer>

      {consent === 'unset' && <aside className="owg-consent" aria-label="Настройки продуктовой аналитики"><div className="owg-consent-icon"><ShieldCheck size={20} /></div><div className="owg-consent-copy"><strong>Вы контролируете аналитику.</strong><p>Необязательные продуктовые события выключены. Избранное и история работают локально; согласие можно изменить позже.</p></div><button type="button" className="owg-consent-necessary" onClick={() => setAnalyticsConsent('necessary')}>Только необходимое</button><button type="button" className="owg-consent-allow" onClick={() => setAnalyticsConsent('analytics')}>Разрешить аналитику <Check size={15} /></button></aside>}
      {consent !== 'unset' && <button type="button" className="owg-privacy-toggle" onClick={() => setAnalyticsConsent(consent === 'analytics' ? 'necessary' : 'analytics')}><ShieldCheck size={14} /> Аналитика: {consent === 'analytics' ? 'включена' : 'выключена'}</button>}
      {toast && <div className="owg-toast" role="status" aria-live="polite">{toast}</div>}
    </main>
  )
}
