import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink, Gamepad2, Monitor, Share2, Smartphone } from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { OSGARD_GAMES, type OsgardGameId } from './core/manifest'
import { GAME_DETAILS } from './GamesPlatform'
import { recordOsgardEvent } from './core/eventQueue'

const HISTORY_KEY = 'osgard.games.history.v1'
const CONSENT_KEY = 'osgard.games.analytics-consent.v1'

function recordLaunch(id: OsgardGameId) {
  try {
    const previous = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]') as unknown
    const safe = Array.isArray(previous) ? previous.filter((item): item is { id: OsgardGameId; at: number } =>
      !!item && typeof item === 'object'
      && typeof (item as { id?: unknown }).id === 'string'
      && OSGARD_GAMES.some(game => game.id === (item as { id: string }).id)
      && typeof (item as { at?: unknown }).at === 'number'
    ) : []
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([{ id, at: Date.now() }, ...safe.filter(item => item.id !== id)].slice(0, 12)))
  } catch { /* browser history is optional */ }
  try {
    if (window.localStorage.getItem(CONSENT_KEY) === 'analytics') {
      recordOsgardEvent('game_opened', { game: id, placement: 'detail-page', surface: 'games-platform' })
    }
  } catch { /* analytics is optional */ }
}

export function GameDetailPage({ slug }: { slug: string }) {
  const gameEntry = OSGARD_GAMES.find(game => game.id === slug)
  if (!gameEntry) {
    return (
      <main className="owg-page owg-detail-page">
        <header className="owg-header"><a className="owg-brand" href="/games"><OsgardLogo /></a><a className="owg-header-contact" href="/games"><ArrowLeft size={15} /> Каталог игр</a></header>
        <section className="owg-detail-not-found"><p className="owg-kicker">OSGARD PLAY / 404</p><h1>Этот мир не найден.</h1><p>Возможно, ссылка устарела или игра отсутствует в каталоге.</p><a className="owg-button owg-button-primary" href="/games">Вернуться к играм <ArrowRight size={16} /></a></section>
      </main>
    )
  }

  const game = GAME_DETAILS[gameEntry.id]
  const share = async () => {
    const url = new URL(window.location.href).toString()
    try {
      if (navigator.share) await navigator.share({ title: game.title + ' — OSGARD PLAY', text: game.tagline, url })
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else window.prompt('Скопируйте ссылку на игру:', url)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') window.alert('Не удалось поделиться ссылкой.')
    }
  }

  return (
    <main className={'owg-page owg-detail-page owg-detail-' + game.accent}>
      <div className="owg-ambient" aria-hidden="true"><span /><span /><span /></div>
      <header className="owg-header">
        <a className="owg-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
        <nav className="owg-nav"><a href="/games">Игры</a><a href="/worlds">Миры</a><a href="/games#ecosystem">Экосистема</a><a href="#game-details">Об игре</a></nav>
        <a className="owg-header-contact" href="/games"><ArrowLeft size={15} /> Все игры</a>
      </header>
      <div className="owg-detail-breadcrumb"><a href="/games">OSGARD PLAY</a><ArrowRight size={12} /><span>{game.title}</span></div>
      <section className="owg-detail-hero">
        <div className="owg-detail-hero-art" data-accent={game.accent}>
          <div className="owg-game-art-grid" /><div className="owg-game-art-orbit" /><div className="owg-game-art-halo" />
          <span className="owg-game-index">{String(OSGARD_GAMES.findIndex(item => item.id === gameEntry.id) + 1).padStart(2, '0')} / OSGARD PLAY</span>
          <strong>{game.mark}</strong><span className="owg-game-art-caption">{game.genreLabel.toUpperCase()}</span>
        </div>
        <div className="owg-detail-intro">
          <p className="owg-kicker"><Gamepad2 size={14} /> GAME PROFILE <span>/</span> {game.genreLabel.toUpperCase()}</p>
          <h1>{game.title}</h1>
          <p className="owg-detail-tagline">{game.tagline}</p>
          <p className="owg-detail-description">{game.description}</p>
          <div className="owg-detail-tags">{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          <div className="owg-detail-actions">
            <a className="owg-button owg-button-primary" href={gameEntry.href} onClick={() => recordLaunch(gameEntry.id)}>Играть сейчас <ArrowUpRight size={17} /></a>
            <button className="owg-button owg-button-quiet" type="button" onClick={() => void share()}><Share2 size={15} /> Поделиться</button>
          </div>
          <p className="owg-detail-caveat">Игра запускается по настроенному веб-маршруту. Доступность сборки зависит от текущего релиза; сведения о платежах и рейтингах здесь не подразумеваются.</p>
        </div>
      </section>
      <section className="owg-detail-info" id="game-details">
        <div className="owg-detail-info-heading"><p className="owg-kicker">GAME BRIEF / 01</p><h2>Как войти в этот мир.</h2><p>Короткий паспорт игры перед запуском — жанр, управление и тип веб-сборки.</p></div>
        <div className="owg-detail-facts">
          <article><span className="owg-detail-fact-icon"><Gamepad2 size={18} /></span><div><small>ЖАНР</small><strong>{game.genreLabel}</strong><p>{game.tags.join(' · ')}</p></div></article>
          <article><span className="owg-detail-fact-icon"><Monitor size={18} /></span><div><small>ПЛАТФОРМА</small><strong>{game.platform}</strong><p>Запуск через существующий веб-маршрут OSGARD.</p></div></article>
          <article><span className="owg-detail-fact-icon"><Smartphone size={18} /></span><div><small>УПРАВЛЕНИЕ</small><strong>{game.controls}</strong><p>Сенсорные элементы зависят от конкретной игровой сборки.</p></div></article>
          <article><span className="owg-detail-fact-icon"><ExternalLink size={18} /></span><div><small>ПРЯМОЙ ВХОД</small><strong>{game.title}</strong><p>Открывается в отдельном игровом маршруте; возврат ведёт в каталог.</p></div></article>
        </div>
      </section>
      <section className="owg-detail-bottom"><div><p className="owg-kicker">OSGARD / NEXT WORLD</p><h2>Один мир — начало коллекции.</h2><p>После сессии выберите следующую игру или посмотрите остальные направления экосистемы.</p></div><a className="owg-button owg-button-outline" href="/games">Вернуться в каталог <ArrowRight size={16} /></a></section>
      <footer className="owg-footer"><div className="owg-footer-brand"><a href="/"><OsgardLogo variant="footer" /></a><p>OSGARD WORLD GAMING<br />Своя игра. Свой мир. Своя система.</p></div><div className="owg-footer-links"><a href="/games">Игры</a><a href="/privacy">Конфиденциальность</a><a href="/terms">Условия</a><a href="mailto:osman.osmanov0099@gmail.com">Контакты</a></div><div className="owg-footer-policy"><span>© OSGARD WORLD · 2026</span><a href="https://wa.me/79640027222" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></footer>
    </main>
  )
}
