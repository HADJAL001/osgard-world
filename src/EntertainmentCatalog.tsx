import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Compass,
  Globe2,
  Heart,
  Menu,
  Play,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  X,
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { recordOsgardEvent } from './core/eventQueue'
import './entertainment.css'

type Locale = 'ru' | 'en'
type Genre = 'all' | 'strategy' | 'coop' | 'tactical' | 'world' | 'creator'
type GameId = 'time' | 'swarm' | 'null-shift' | 'inherit' | 'remix'
type Game = {
  id: GameId
  number: string
  mark: string
  title: string
  titleEn: string
  type: string
  typeEn: string
  description: string
  descriptionEn: string
  href: string
  genres: Exclude<Genre, 'all'>[]
}

const FAVORITES_KEY = 'osgard.entertainment.favorites.v1'
const RECENT_KEY = 'osgard.entertainment.recent.v1'
const validGameIds = new Set<GameId>(['time', 'swarm', 'null-shift', 'inherit', 'remix'])

const games: Game[] = [
  {
    id: 'time', number: '01', mark: 'ET',
    title: 'ИМПЕРИЯ ВРЕМЕНИ', titleEn: 'IMPERIUM OF TIME',
    type: 'СЮЖЕТНАЯ СТРАТЕГИЯ', typeEn: 'NARRATIVE STRATEGY',
    description: 'Город, нефть, фракции и решения, которые меняют ход истории.',
    descriptionEn: 'A city, oil, factions, and choices that shape the story.',
    href: '/games/time', genres: ['strategy'],
  },
  {
    id: 'swarm', number: '02', mark: 'SW',
    title: 'SWARM', titleEn: 'SWARM',
    type: 'КООПЕРАТИВНАЯ СИМУЛЯЦИЯ', typeEn: 'CO-OP SIMULATION',
    description: 'Выбери роль, синхронизируйся с командой и добудь ядро.',
    descriptionEn: 'Choose a role, synchronize with your team, and secure the core.',
    href: '/games/swarm/index.html', genres: ['coop', 'strategy'],
  },
  {
    id: 'null-shift', number: '03', mark: 'N//S',
    title: 'NULL//SHIFT', titleEn: 'NULL//SHIFT',
    type: 'ТАКТИЧЕСКИЙ RAID', typeEn: 'TACTICAL RAID',
    description: 'Проникновение, терминал, охрана и экстракция. План решает всё.',
    descriptionEn: 'Infiltration, terminals, security, and extraction. Every move matters.',
    href: '/games/null-shift-godot/index.html', genres: ['tactical', 'coop'],
  },
  {
    id: 'inherit', number: '04', mark: 'IN',
    title: 'INHERIT', titleEn: 'INHERIT',
    type: 'ЖИВОЙ МИР', typeEn: 'LIVING WORLD',
    description: 'Остров меняется от поколения к поколению. Твоё наследие остаётся.',
    descriptionEn: 'An island changes from one generation to the next. Your legacy remains.',
    href: '/games/inherit/index.html', genres: ['world'],
  },
  {
    id: 'remix', number: '05', mark: 'RX',
    title: 'REMIX', titleEn: 'REMIX',
    type: 'АРЕНА СОЗДАТЕЛЕЙ', typeEn: 'CREATOR ARENA',
    description: 'Создавай испытания, делись идеями и оставляй собственный replay.',
    descriptionEn: 'Create challenges, share ideas, and leave your own replay.',
    href: '/games/remix/index.html', genres: ['creator'],
  },
]

const genreLabels: Record<Genre, { ru: string; en: string }> = {
  all: { ru: 'Все миры', en: 'All worlds' },
  strategy: { ru: 'Стратегия', en: 'Strategy' },
  coop: { ru: 'Кооператив', en: 'Co-op' },
  tactical: { ru: 'Тактика', en: 'Tactical' },
  world: { ru: 'Живые миры', en: 'Living worlds' },
  creator: { ru: 'Создание', en: 'Creation' },
}

function readStoredIds(key: string, limit: number): GameId[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((value): value is GameId => typeof value === 'string' && validGameIds.has(value as GameId)))].slice(0, limit)
  } catch {
    return []
  }
}

function recordVisit(game: Game, history: GameId[]) {
  const next = [game.id, ...history.filter(id => id !== game.id)].slice(0, 5)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Private browsing or storage limits must never block game navigation.
  }
  recordOsgardEvent('game_opened', { game: game.id, href: game.href, source: 'entertainment_catalog' })
  return next
}

export function EntertainmentCatalog({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  const isRu = locale === 'ru'
  const searchRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState<Genre>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortMode, setSortMode] = useState<'curated' | 'az'>('curated')
  const [favorites, setFavorites] = useState<GameId[]>(() => readStoredIds(FAVORITES_KEY, games.length))
  const [recent, setRecent] = useState<GameId[]>(() => readStoredIds(RECENT_KEY, 5))
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) } catch { /* Local-only convenience. */ }
  }, [favorites])

  useEffect(() => {
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent)) } catch { /* Local-only convenience. */ }
  }, [recent])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredGames = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(isRu ? 'ru-RU' : 'en-US')
    const result = games.filter(game => {
      const title = isRu ? game.title : game.titleEn
      const type = isRu ? game.type : game.typeEn
      const description = isRu ? game.description : game.descriptionEn
      const matchesQuery = !needle || [title, type, description, game.id].some(value => value.toLocaleLowerCase(isRu ? 'ru-RU' : 'en-US').includes(needle))
      const matchesGenre = activeGenre === 'all' || game.genres.includes(activeGenre)
      const matchesFavorite = !favoritesOnly || favorites.includes(game.id)
      return matchesQuery && matchesGenre && matchesFavorite
    })
    if (sortMode === 'az') result.sort((a, b) => (isRu ? a.title : a.titleEn).localeCompare(isRu ? b.title : b.titleEn, isRu ? 'ru' : 'en'))
    return result
  }, [activeGenre, favorites, favoritesOnly, isRu, query, sortMode])

  const lastGame = games.find(game => game.id === recent[0])
  const recentGames = recent.slice(1, 4).map(id => games.find(game => game.id === id)).filter((game): game is Game => Boolean(game))

  const labels = isRu
    ? {
        eyebrow: 'OSGARD WORLD / КУЛЬТУРА ИГРЫ',
        titleLead: 'Не просто играть.',
        titleAccent: 'Войти в другой мир.',
        intro: 'Пять самостоятельных игровых миров. Найди свой ритм — от большой стратегии до тактической операции и свободного творчества.',
        explore: 'Исследовать каталог',
        random: 'Удиви меня',
        share: 'Поделиться',
        index: 'КОЛЛЕКЦИЯ ИГРОВЫХ МИРОВ',
        library: 'Выбери свой мир',
        libraryCopy: 'Без лишнего шума. Только игры, в которые хочется вернуться.',
        search: 'Поиск игры, жанра или механики',
        searchShort: 'нажми / для поиска',
        favorites: 'Избранное',
        sortCurated: 'По подборке',
        sortAz: 'По алфавиту',
        show: 'ПОКАЗАНО',
        worlds: 'МИРОВ',
        open: 'Войти в игру',
        addFavorite: 'Добавить в избранное',
        removeFavorite: 'Убрать из избранного',
        browser: 'ИГРА В БРАУЗЕРЕ',
        continueTitle: 'Продолжить последнюю игру',
        continueCopy: 'Твой последний выбранный мир — в одном шаге отсюда.',
        resume: 'Продолжить',
        recentTitle: 'Недавно открывали',
        recentEmpty: 'История появится здесь после первого запуска игры.',
        noResults: 'Ничего не найдено',
        noResultsCopy: 'Попробуй другой запрос или сбрось фильтры.',
        reset: 'Сбросить фильтры',
        favoriteEmpty: 'Избранное пока пусто',
        favoriteEmptyCopy: 'Отметь сердцем игры, к которым хочешь вернуться.',
        footerTitle: 'Твой следующий мир уже здесь.',
        footerCopy: 'Новые игровые проекты проходят проверку перед публикацией. История и избранное хранятся только в этом браузере.',
        submit: 'Предложить игру',
        portal: 'В портал OSGARD',
        language: 'Язык интерфейса',
        countLabel: 'ИНТЕРАКТИВНЫХ МИРОВ',
        onlineNote: 'Без фиктивных рейтингов и счётчиков онлайна',
        shareDone: 'Ссылка скопирована',
        shareUnavailable: 'Не удалось скопировать ссылку в этом браузере',
        shareCancelled: 'Поделиться отменено',
      }
    : {
        eyebrow: 'OSGARD WORLD / PLAY CULTURE',
        titleLead: 'More than a game.',
        titleAccent: 'Enter another world.',
        intro: 'Five independent game worlds. Find your rhythm — from grand strategy to tactical operations and open-ended creation.',
        explore: 'Explore the catalogue',
        random: 'Surprise me',
        share: 'Share',
        index: 'A COLLECTION OF GAME WORLDS',
        library: 'Choose your world',
        libraryCopy: 'No noise. Just games worth returning to.',
        search: 'Search a game, genre or mechanic',
        searchShort: 'press / to search',
        favorites: 'Favorites',
        sortCurated: 'Curated',
        sortAz: 'A–Z',
        show: 'SHOWING',
        worlds: 'WORLDS',
        open: 'Enter game',
        addFavorite: 'Add to favorites',
        removeFavorite: 'Remove from favorites',
        browser: 'BROWSER GAME',
        continueTitle: 'Continue your last game',
        continueCopy: 'Your most recently selected world is one step away.',
        resume: 'Continue',
        recentTitle: 'Recently opened',
        recentEmpty: 'Your history will appear here after the first game launch.',
        noResults: 'No worlds found',
        noResultsCopy: 'Try another query or reset the filters.',
        reset: 'Reset filters',
        favoriteEmpty: 'Your favorites are empty',
        favoriteEmptyCopy: 'Tap the heart on any game you want to keep close.',
        footerTitle: 'Your next world is already here.',
        footerCopy: 'New games are reviewed before publication. Favorites and history are stored in this browser only.',
        submit: 'Submit a game',
        portal: 'OSGARD portal',
        language: 'Interface language',
        countLabel: 'INTERACTIVE WORLDS',
        onlineNote: 'No fabricated ratings or player counts',
        shareDone: 'Link copied',
        shareUnavailable: 'This browser could not copy the link',
        shareCancelled: 'Share cancelled',
      }

  const rememberAndOpen = (game: Game) => {
    const next = recordVisit(game, recent)
    setRecent(next)
  }

  const launchRandom = () => {
    if (!filteredGames.length) return
    const game = filteredGames[Math.floor(Math.random() * filteredGames.length)]
    rememberAndOpen(game)
    window.location.assign(game.href)
  }

  const toggleFavorite = (id: GameId) => {
    setFavorites(current => current.includes(id) ? current.filter(value => value !== id) : [id, ...current])
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD Entertainment', text: labels.libraryCopy, url: window.location.href })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
      } else {
        throw new Error('Clipboard unavailable')
      }
      setShareMessage(labels.shareDone)
      recordOsgardEvent('share_created', { source: 'entertainment_catalog', url: window.location.pathname })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setShareMessage(labels.shareCancelled)
        return
      }
      setShareMessage(labels.shareUnavailable)
    }
  }

  return (
    <main className="entertainment-page">
      <a className="ent-skip-link" href="#entertainment-library">{isRu ? 'К каталогу игр' : 'Skip to game catalogue'}</a>
      <header className="ent-header">
        <a className="ent-brand" href="/" aria-label="OSGARD WORLD">
          <OsgardLogo />
          <span><b>OSGARD</b><small>ENTERTAINMENT</small></span>
        </a>
        <nav className="ent-nav" aria-label={isRu ? 'Главная навигация' : 'Main navigation'}>
          <a href="/worlds">{isRu ? 'Миры' : 'Worlds'}</a>
          <a href="/games/">{isRu ? 'Игровая платформа' : 'Game platform'}</a>
          <a href="/development">{isRu ? 'Разработка' : 'Development'}</a>
        </nav>
        <div className="ent-header-actions">
          <button className="ent-language" onClick={() => setLocale(isRu ? 'en' : 'ru')} aria-label={labels.language}>
            <Globe2 size={15} aria-hidden="true" /> {locale.toUpperCase()}
          </button>
          <button className="ent-menu-toggle" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? (isRu ? 'Закрыть меню' : 'Close menu') : (isRu ? 'Открыть меню' : 'Open menu')} aria-expanded={menuOpen} aria-controls="ent-mobile-menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <nav className="ent-mobile-menu" id="ent-mobile-menu" aria-label={isRu ? 'Мобильная навигация' : 'Mobile navigation'}>
          <a href="/worlds">{isRu ? 'Миры OSGARD' : 'OSGARD worlds'}</a>
          <a href="/games/">{isRu ? 'Игровая платформа' : 'Game platform'}</a>
          <a href="/development">{isRu ? 'Разработка' : 'Development'}</a>
        </nav>}
      </header>

      <div className="ent-page-shell">
        <section className="ent-hero" aria-labelledby="ent-hero-title">
          <div className="ent-hero-copy">
            <p className="ent-eyebrow"><i /> {labels.eyebrow}<span> / 001—005</span></p>
            <h1 id="ent-hero-title">{labels.titleLead}<br /><em>{labels.titleAccent}</em></h1>
            <p className="ent-hero-lead">{labels.intro}</p>
            <div className="ent-hero-actions">
              <a className="ent-button ent-button-gold" href="#entertainment-library">{labels.explore}<ArrowDownRight size={17} /></a>
              <button className="ent-button ent-button-quiet" onClick={launchRandom} disabled={!filteredGames.length}><Shuffle size={15} />{labels.random}</button>
              <button className="ent-share-button" onClick={handleShare}><Share2 size={15} />{labels.share}</button>
            </div>
            <div className="ent-trustline"><span><i /> {labels.browser}</span><span>{labels.onlineNote}</span></div>
          </div>
          <div className="ent-hero-art" aria-hidden="true">
            <div className="ent-orbit ent-orbit-a" />
            <div className="ent-orbit ent-orbit-b" />
            <div className="ent-orbit ent-orbit-c" />
            <div className="ent-orbit-core"><span>O</span><i /></div>
            <span className="ent-art-label ent-art-top">OW / 001<br /><b>PLAY ARCHIVE</b></span>
            <span className="ent-art-label ent-art-bottom">DESIGNED FOR<br /><b>DISCOVERY</b></span>
            <span className="ent-art-coordinate">55° 45′ 07″ N</span>
          </div>
          <div className="ent-hero-index"><span>01</span><i /> OSGARD WORLDS / ENTERTAINMENT</div>
        </section>

        {lastGame && (
          <section className="ent-continue" aria-label={labels.continueTitle}>
            <div className="ent-continue-mark"><Play size={18} fill="currentColor" /></div>
            <div className="ent-continue-copy">
              <p className="ent-eyebrow">{labels.continueTitle}</p>
              <h2>{isRu ? lastGame.title : lastGame.titleEn}</h2>
              <p>{labels.continueCopy}</p>
            </div>
            <a className="ent-continue-link" href={lastGame.href} onClick={() => rememberAndOpen(lastGame)}>{labels.resume}<ArrowUpRight size={17} /></a>
          </section>
        )}

        <section className="ent-library" id="entertainment-library" aria-labelledby="ent-library-title">
          <div className="ent-section-heading">
            <div>
              <p className="ent-eyebrow">{labels.index}</p>
              <h2 id="ent-library-title">{labels.library}<span>.</span></h2>
              <p>{labels.libraryCopy}</p>
            </div>
            <div className="ent-library-count"><strong>{String(filteredGames.length).padStart(2, '0')}</strong><span>{labels.worlds}</span></div>
          </div>

          <div className="ent-controls">
            <label className="ent-search">
              <Search size={17} aria-hidden="true" />
              <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.search} aria-label={labels.search} />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label={isRu ? 'Очистить поиск' : 'Clear search'}><X size={15} /></button> : <kbd aria-hidden="true">/</kbd>}
            </label>
            <div className="ent-control-actions">
              <label className="ent-sort-label">
                <span>{isRu ? 'Порядок' : 'Sort'}</span>
                <select value={sortMode} onChange={event => setSortMode(event.target.value as 'curated' | 'az')} aria-label={isRu ? 'Сортировка игр' : 'Sort games'}>
                  <option value="curated">{labels.sortCurated}</option>
                  <option value="az">{labels.sortAz}</option>
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>
              <button className={'ent-favorite-filter' + (favoritesOnly ? ' is-active' : '')} onClick={() => setFavoritesOnly(value => !value)} aria-pressed={favoritesOnly}>
                <Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} />{labels.favorites}<span>{favorites.length}</span>
              </button>
            </div>
          </div>

          <div className="ent-filter-list" role="group" aria-label={isRu ? 'Фильтр по жанру' : 'Filter by genre'}>
            {(Object.keys(genreLabels) as Genre[]).map(genre => (
              <button key={genre} className={'ent-filter-chip' + (activeGenre === genre ? ' is-active' : '')} onClick={() => setActiveGenre(genre)} aria-pressed={activeGenre === genre}>
                {genreLabels[genre][isRu ? 'ru' : 'en']}
              </button>
            ))}
            <button className="ent-random-inline" onClick={launchRandom} disabled={!filteredGames.length}><Shuffle size={13} />{labels.random}</button>
          </div>

          <div className="ent-result-line"><span>{labels.show} {String(filteredGames.length).padStart(2, '0')} / {games.length.toString().padStart(2, '0')}</span><span>{isRu ? 'КАТАЛОГ ОБНОВЛЯЕТСЯ ПО МЕРЕ ПРОВЕРКИ ИГР' : 'CATALOGUE GROWS AS GAMES ARE REVIEWED'}</span></div>

          {filteredGames.length > 0 ? (
            <div className="ent-game-grid">
              {filteredGames.map((game, index) => {
                const isFavorite = favorites.includes(game.id)
                const isFeatured = index === 0 && activeGenre === 'all' && !favoritesOnly && !query.trim() && sortMode === 'curated'
                return (
                  <article className={'ent-game-card ent-game-card--' + game.id + (isFeatured ? ' is-featured' : '')} key={game.id} data-game={game.id}>
                    <a className="ent-game-art" href={game.href} aria-label={(isRu ? game.title : game.titleEn) + ' — ' + labels.open} onClick={() => rememberAndOpen(game)}>
                      <span className="ent-game-art-top">{game.number} <i /> OSGARD PLAY</span>
                      <span className="ent-game-glyph">{game.mark}</span>
                      <span className="ent-game-orbit ent-game-orbit-one" />
                      <span className="ent-game-orbit ent-game-orbit-two" />
                      <span className="ent-game-art-bottom">{isRu ? game.type : game.typeEn}</span>
                      <span className="ent-game-launch"><ArrowUpRight size={17} /></span>
                    </a>
                    <div className="ent-game-info">
                      <div className="ent-game-meta"><span><i />{isRu ? game.type : game.typeEn}</span><span>{game.number} / 05</span></div>
                      <div className="ent-game-title-row">
                        <h3>{isRu ? game.title : game.titleEn}</h3>
                        <button className={'ent-heart' + (isFavorite ? ' is-active' : '')} onClick={() => toggleFavorite(game.id)} aria-label={isFavorite ? labels.removeFavorite : labels.addFavorite} aria-pressed={isFavorite}>
                          <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p>{isRu ? game.description : game.descriptionEn}</p>
                      <div className="ent-game-bottom">
                        <div className="ent-game-tags">{game.genres.map(genre => <span key={genre}>{genreLabels[genre][isRu ? 'ru' : 'en']}</span>)}</div>
                        <a href={game.href} onClick={() => rememberAndOpen(game)} className="ent-open-game">{labels.open}<ArrowUpRight size={16} /></a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="ent-empty-state">
              <Sparkles size={22} />
              <h3>{favoritesOnly && favorites.length === 0 ? labels.favoriteEmpty : labels.noResults}</h3>
              <p>{favoritesOnly && favorites.length === 0 ? labels.favoriteEmptyCopy : labels.noResultsCopy}</p>
              <button className="ent-button ent-button-quiet" onClick={() => { setQuery(''); setActiveGenre('all'); setFavoritesOnly(false); setSortMode('curated') }}>{labels.reset}<X size={15} /></button>
            </div>
          )}

          <div className="ent-history">
            <div className="ent-history-heading">
              <div><p className="ent-eyebrow">{isRu ? 'ТВОЯ КОЛЛЕКЦИЯ' : 'YOUR COLLECTION'}</p><h3>{labels.recentTitle}</h3></div>
              <span>{isRu ? 'СОХРАНЯЕТСЯ НА УСТРОЙСТВЕ' : 'STORED ON THIS DEVICE'}</span>
            </div>
            {recentGames.length ? <div className="ent-recent-list">{recentGames.map(game => (
              <a href={game.href} key={game.id} onClick={() => rememberAndOpen(game)}>
                <span className={'ent-recent-mark ent-recent-mark--' + game.id}>{game.mark}</span>
                <span><b>{isRu ? game.title : game.titleEn}</b><small>{isRu ? game.type : game.typeEn}</small></span>
                <ArrowUpRight size={16} />
              </a>
            ))}</div> : <p className="ent-history-empty">{labels.recentEmpty}</p>}
          </div>
        </section>

        <section className="ent-final-panel">
          <div className="ent-final-seal"><Compass size={28} strokeWidth={1.1} /><span>OW</span></div>
          <div className="ent-final-copy"><p className="ent-eyebrow">{isRu ? 'ТВОЙ ХОД' : 'YOUR MOVE'}</p><h2>{labels.footerTitle}</h2><p>{labels.footerCopy}</p></div>
          <a className="ent-button ent-button-gold" href="mailto:osman.osmanov0099@gmail.com?subject=OSGARD%20Entertainment%20%E2%80%94%20submit%20a%20game">{labels.submit}<ArrowUpRight size={17} /></a>
        </section>

        <footer className="ent-footer">
          <a href="/" className="ent-footer-brand"><OsgardLogo /><span>OSGARD WORLD</span></a>
          <p>© OSGARD WORLD · 2026</p>
          <nav aria-label={isRu ? 'Правовая информация' : 'Legal'}>
            <a href="/privacy/">{isRu ? 'Конфиденциальность' : 'Privacy'}</a>
            <a href="/terms/">{isRu ? 'Условия' : 'Terms'}</a>
            <a href="/games/">OSGARD PLAY</a>
          </nav>
        </footer>
      </div>
      <div className="ent-live-status" aria-live="polite" role="status">{shareMessage}</div>
    </main>
  )
}
