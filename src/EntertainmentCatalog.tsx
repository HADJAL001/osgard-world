import { ArrowUpRight, Globe2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { OsgardLogo } from './OsgardLogo'
import { OSGARD_GAMES } from './core/manifest'
import { recordOsgardEvent } from './core/eventQueue'

type Locale = 'ru' | 'en'
const decode = (value: string) => JSON.parse('"' + value + '"') as string
const games = [
  ['01', 'time', 'ET', '\\u0418\\u041c\\u041f\\u0415\\u0420\\u0418\\u042f \\u0412\\u0420\\u0415\\u041c\\u0415\\u041d\\u0418', '\\u0421\\u042e\\u0416\\u0415\\u0422\\u041d\\u0410\\u042f \\u0421\\u0422\\u0420\\u0410\\u0422\\u0415\\u0413\\u0418\\u042f', '\\u0413\\u043e\\u0440\\u043e\\u0434, \\u043d\\u0435\\u0444\\u0442\\u044c, \\u0444\\u0440\\u0430\\u043a\\u0446\\u0438\\u0438 \\u0438 \\u0440\\u0435\\u0448\\u0435\\u043d\\u0438\\u044f.', '/games/time'],
  ['02', 'swarm', 'SW', 'SWARM', '\\u041a\\u041e-\\u041e\\u041f \\u0421\\u0418\\u041c\\u0423\\u041b\\u042f\\u0426\\u0418\\u042f', '\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0440\\u043e\\u043b\\u044c \\u0438 \\u0441\\u0438\\u043d\\u0445\\u0440\\u043e\\u043d\\u043d\\u043e \\u0434\\u043e\\u0431\\u0443\\u0434\\u044c\\u0442\\u0435 \\u044f\\u0434\\u0440\\u043e.', '/games/swarm/index.html'],
  ['03', 'shift', 'NS', 'NULL//SHIFT', '\\u041a\\u041e-\\u041e\\u041f RAID', '\\u041f\\u0440\\u043e\\u043d\\u0438\\u043a\\u043d\\u043e\\u0432\\u0435\\u043d\\u0438\\u0435, \\u0442\\u0435\\u0440\\u043c\\u0438\\u043d\\u0430\\u043b, \\u043e\\u0445\\u0440\\u0430\\u043d\\u0430 \\u0438 \\u044d\\u043a\\u0441\\u0442\\u0440\\u0430\\u043a\\u0446\\u0438\\u044f.', '/games/null-shift-godot/index.html'],
  ['04', 'inherit', 'IN', 'INHERIT', '\\u041d\\u0410\\u0421\\u041b\\u0415\\u0414\\u0418\\u0415 \\u041c\\u0418\\u0420\\u0410', '\\u041e\\u0441\\u0442\\u0440\\u043e\\u0432 \\u043c\\u0435\\u043d\\u044f\\u0435\\u0442\\u0441\\u044f \\u043e\\u0442 \\u043f\\u043e\\u043a\\u043e\\u043b\\u0435\\u043d\\u0438\\u044f \\u043a \\u043f\\u043e\\u043a\\u043e\\u043b\\u0435\\u043d\\u0438\\u044e.', '/games/inherit/index.html'],
  ['05', 'remix', 'RX', 'REMIX', '\\u0410\\u0420\\u0415\\u041d\\u0410 \\u0421\\u041e\\u0417\\u0414\\u0410\\u0422\\u0415\\u041b\\u0415\\u0419', '\\u0421\\u043e\\u0437\\u0434\\u0430\\u0432\\u0430\\u0439\\u0442\\u0435 \\u0438\\u0441\\u043f\\u044b\\u0442\\u0430\\u043d\\u0438\\u044f \\u0438 \\u043e\\u0441\\u0442\\u0430\\u0432\\u043b\\u044f\\u0439\\u0442\\u0435 replay.', '/games/remix/index.html'],
  ['06', 'civic', 'CC', 'CIVIC CASCADE', 'КРИЗИСНАЯ СТРАТЕГИЯ', 'Управляй городскими авариями: вода, энергосеть и эвакуация.', '/games/civic-cascade/'],
  ['07', 'patina', 'PA', 'PATINA ATELIER', 'РЕСТАВРАЦИОННАЯ ЛАБОРАТОРИЯ', 'Исследуй керамику, различай загрязнения и сохраняй историю предмета.', '/games/patina/'],
  ['08', 'signal', 'SR', 'SIGNAL RUN', 'АРКАДА / РЕАКЦИЯ', 'Меняй полосу, собирай сигналы и уклоняйся от помех.', '/games/signal-run/'],
  ['09', 'cascade-lab', 'CL', 'CASCADE LAB', 'ФИЗИЧЕСКАЯ ГОЛОВОЛОМКА', 'Собирай цепные реакции, запускай механизмы и исследуй движение ядра.', '/games/cascade-lab/'],
  ['10', 'afterimage-run', 'AR', 'AFTERIMAGE//RUN', 'DAILY SCI-FI SPEEDRUN · v1.7.0 — PHASE SPLITS', 'Общий seed, личный призрак, улучшенный сенсорный ввод и вызов другу.', '/games/afterimage-run/'],
  ['11', 'aether-grid', 'AG', 'AETHER GRID', 'DAILY LOGIC PUZZLE', 'Соедини источник с ядром в сетке из 25 узлов и брось вызов другу.', '/games/aether-grid/'],
  ['12', 'heist-echo', 'HE', 'HEIST//ECHO', 'TACTICAL SANDBOX · RELEASE 4.0.0', 'Создавай карты, проверяй маршруты патрулей и анализируй операции в Black Box.', '/games/heist-echo/'],
].map(([id, key, mark, title, type, copy, href]) => ({ id, key, mark, title: decode(title), type: decode(type), copy: decode(copy), href }))

// Funnel Entertainment launches through the common player so every game can reuse
// OSGARD SELECT, the optional service chooser, post-session sharing and SHARDS.
const gameHubHref = (gameKey: string) => {
  const gameId = gameKey === 'shift' ? 'null-shift' : gameKey
  const query = new URLSearchParams({
    play: gameId,
    utm_source: 'osgard_entertainment',
    utm_medium: 'game_launch',
    utm_campaign: 'entertainment_to_games',
    utm_content: gameId,
  })
  return '/games/?' + query.toString()
}

export function EntertainmentCatalog({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const [menu, setMenu] = useState(false); const isRu = locale === 'ru'; const t = (en: string, escapedRu: string) => isRu ? decode(escapedRu) : en
  return <main className="entertainment-page"><header className="game-header"><a className="brand brand-logo" href="/"><OsgardLogo /></a><nav><a href="/worlds">{t('Worlds', '\\u041c\\u0438\\u0440\\u044b')}</a><a href="/development">{t('Development', '\\u0420\\u0430\\u0437\\u0440\\u0430\\u0431\\u043e\\u0442\\u043a\\u0430')}</a><a href="/">AURUM</a></nav><div className="game-header-actions"><button className="language" onClick={() => setLocale(isRu ? 'en' : 'ru')}><Globe2 />{locale.toUpperCase()}</button><button className="menu" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div>{menu && <div className="game-menu"><a href="/">{t('Portal', '\\u041f\\u043e\\u0440\\u0442\\u0430\\u043b')}</a><a href="/worlds">{t('Worlds', '\\u041c\\u0438\\u0440\\u044b')}</a><a href="/development">{t('Development', '\\u0420\\u0430\\u0437\\u0440\\u0430\\u0431\\u043e\\u0442\\u043a\\u0430')}</a></div>}</header><section className="entertainment-intro"><div><p className="eyebrow">OSGARD ENTERTAINMENT / LIVE ARCHIVE</p><h1>{isRu ? <>{decode('\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438 \\u043c\\u0438\\u0440.')}<br />{decode('\\u041d\\u0430\\u0447\\u043d\\u0438 \\u0438\\u0433\\u0440\\u0443.')}</> : <>Choose a world.<br />Start playing.</>}</h1><p>{t('Twelve independent games. Each has its own pace, rules and visual world. Select a card to enter.', 'Двенадцать независимых игр. У каждой свой ритм, правила и визуальный мир. Выбери карточку, чтобы войти.')}</p></div><div className="entertainment-counter"><span>LIVE</span><strong>{String(OSGARD_GAMES.length).padStart(2, '0')}</strong><small>{t('PLAYABLE WORLDS', '\\u0418\\u0413\\u0420\\u043e\\u0432\\u044b\\u0445 \\u043c\\u0438\\u0440\\u043e\\u0432')}</small></div></section><section className="premium-game-grid" aria-label={t('All OSGARD games', '\\u0412\\u0441\\u0435 \\u0438\\u0433\\u0440\\u044b OSGARD')}>{games.map(game => <a className={`premium-game-card premium-game-card--${game.key}`} href={gameHubHref(game.key)} key={game.key} onClick={() => recordOsgardEvent('game_opened', { game: game.key === 'shift' ? 'null-shift' : game.key, href: gameHubHref(game.key) })}><div className="premium-game-art"><span className="game-index">{game.id}</span><i className="art-orbit art-orbit-one" /><i className="art-orbit art-orbit-two" /><b>{game.mark}</b><em>{game.type}</em></div><div className="premium-game-content"><p>{game.id} / LIVE WORLD</p><h2>{game.title}</h2><span>{game.copy}</span><strong>{t('Enter game', '\\u0412\\u043e\\u0439\\u0442\\u0438 \\u0432 \\u0438\\u0433\\u0440\\u0443')} <ArrowUpRight /></strong></div></a>)}</section></main>
}
