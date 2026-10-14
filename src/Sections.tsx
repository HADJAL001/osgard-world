import './founders.css'
import './surfaces.css'
import { ArrowUpRight, ChevronLeft, Globe2, Menu, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Development } from './Development'
import { ModuleMark } from './ModuleMark'
import { OsgardLogo } from './OsgardLogo'

type Locale = 'ru' | 'en'
const botUrl = 'https://t.me/OSGARD_world_bot'
const products = [
  ['GARD VPN', 'gardvpn.is/', 'VPN', 'VPN service. Review features and terms on the official site.'],
  ['SENJORIO', 'senjorio.com/', 'TAXI', 'Premium taxi. Check service area and booking terms.'],
  ['OSGARD OS', 'osgardos.com/', 'BUSINESS', 'Business development tools and services.'],
  ['SUPER DAY', 'superday.run/', 'PLANNER', 'Smart map and day planner.'],
  ['OSGARD BEW WORLD', 'osgardbewworld.com/', 'CREATE', 'Digital product development: games, websites and applications.'],
  ['O2 SYSTEM', 'o2system.art/', 'ACCOUNTING', 'Cash and transaction accounting for exchange offices.'],
  ['OSGARD VANGUARD STUDIO', 'osgardvanguard.studio/', 'VIDEO', 'Video creation for digital products and campaigns.'],
]
const sectionLinks = [['Worlds', '/worlds'], ['Catalog', '/catalog'], ['Chronicle', '/chronicle'], ['Founders', '/masters'], ['Entertainment', '/entertainment/'], ['SkillCred', '/skillcred/'], ['Club', '/club']]
const ruSectionLabels: Record<string, string> = { Worlds: 'Миры', Catalog: 'Каталог', Chronicle: 'Хроника', Founders: 'Основатели', Entertainment: 'Развлечения', SkillCred: 'SkillCred', Club: 'Клуб' }

function SectionNav({ locale }: { locale: Locale }) {
  return <nav className="section-nav" aria-label="OSGARD sections">{sectionLinks.map(([label, path], index) => <a href={path} key={path}><small>0{index + 1}</small><span>{locale === 'ru' ? ruSectionLabels[label] : label}</span></a>)}</nav>
}

export function EntertainmentPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const liveGames = [
    { title: 'ИМПЕРИЯ ВРЕМЕНИ', genre: ru ? 'СЮЖЕТНАЯ СТРАТЕГИЯ' : 'STORY STRATEGY', text: ru ? 'Город, нефть, фракции и решения с последствиями.' : 'A living city shaped by oil, factions and consequential decisions.', href: '/games/time' },
    { title: 'SWARM', genre: ru ? 'КО-ОП СИМУЛЯЦИЯ' : 'CO-OP SIMULATION', text: ru ? 'Выберите роль, синхронизируйте команду и добудьте ядро.' : 'Choose a role, sync the crew and extract the core.', href: '/games/swarm/index.html' },
    { title: 'NULL//SHIFT', genre: ru ? 'КО-ОП RAID' : 'CO-OP RAID', text: ru ? 'Проникновение, терминал, охрана и совместная экстракция.' : 'Infiltration, terminal breach, guards and team extraction.', href: '/games/null-shift-godot/index.html' },
    { title: 'INHERIT', genre: ru ? 'НАСЛЕДИЕ МИРА' : 'LEGACY WORLD', text: ru ? 'Остров меняется от поколения к поколению. Оставьте след.' : 'An island changes from generation to generation. Leave a trace.', href: '/games/inherit/index.html' },
    { title: 'REMIX', genre: 'SERVER-OWNED ARENA', text: ru ? 'Создавайте испытания и оставляйте проверяемый replay.' : 'Create challenges and leave a verifiable replay.', href: '/games/remix/index.html' },
    { title: 'CIVIC CASCADE', genre: ru ? 'КРИЗИСНАЯ СТРАТЕГИЯ' : 'CRISIS STRATEGY', text: ru ? 'Восстановите энергосеть, воду и эвакуацию до каскадного отказа города.' : 'Restore power, water and evacuation routes before the city-wide cascading failure.', href: '/games/civic-cascade/' },
    { title: 'PATINA ATELIER', genre: ru ? 'РЕСТАВРАЦИОННАЯ ГОЛОВОЛОМКА' : 'CONSERVATION PUZZLE', text: ru ? 'Исследуйте поверхность, отделяйте загрязнение от оригинала и выбирайте бережное вмешательство.' : 'Inspect a surface, separate residue from original material and choose careful interventions.', href: '/games/patina/' },
    { title: 'SIGNAL RUN', genre: ru ? 'АРКАДА НА РЕАКЦИЮ' : 'REFLEX ARCADE', text: ru ? 'Меняйте полосы, собирайте сигналы и проходите ежедневные забеги.' : 'Switch lanes, collect signals and take on daily runs.', href: '/games/signal-run/' },
    { title: 'CASCADE LAB', genre: ru ? 'ФИЗИЧЕСКАЯ ГОЛОВОЛОМКА' : 'PHYSICS PUZZLE', text: ru ? 'Собирайте цепные реакции, запускайте механику и изучайте игровую физику.' : 'Build chain reactions, trigger mechanisms and inspect the in-game physics model.', href: '/games/cascade-lab/' },
    { title: 'AFTERIMAGE//RUN', genre: ru ? 'ЕЖЕДНЕВНЫЙ SCI-FI SPEEDRUN · v1.7.0 — КОНТРОЛЬНЫЕ ТОЧКИ' : 'DAILY SCI-FI SPEEDRUN · v1.6.0', text: ru ? 'Общий seed, призрак личного рекорда, сенсорный прыжок, PHASE DASH и вызов другу.' : 'One daily seed, personal-best ghost, responsive touch jump, PHASE DASH and a friend challenge.', href: '/games/afterimage-run/' },
    { title: 'AETHER GRID', genre: ru ? 'ЕЖЕДНЕВНАЯ ЛОГИЧЕСКАЯ ГОЛОВОЛОМКА' : 'DAILY LOGIC PUZZLE', text: ru ? 'Соедините источник с ядром в сетке из 25 узлов и бросьте вызов другу.' : 'Connect the source to the core across 25 nodes and challenge a friend.', href: '/games/aether-grid/' },
  ]
  return <Shell title="Entertainment" locale={locale} setLocale={setLocale}><section className="standalone-hero entertainment-hero"><div><p className="eyebrow">06 / OSGARD ENTERTAINMENT</p><h1>{ru ? 'Рабочие игры. Один вход.' : 'Playable worlds. One entry.'}</h1><p>{ru ? 'Только игры с действующими маршрутами. Выберите мир и запустите его в один клик.' : 'Only games with live routes. Choose a world and launch it in one click.'}</p></div><div className="entertainment-signal"><span>PLAY / SELECT</span><strong>{String(liveGames.length).padStart(2, '0')}</strong><i>LIVE WORLDS</i></div></section><section className="game-catalog" aria-label={ru ? 'Каталог игр' : 'Game catalog'}>{liveGames.map((game, index) => <a className="game-card" href={game.href} key={game.title}><div className="game-card-art"><span>0{index + 1}</span><b>{game.title === 'NULL//SHIFT' ? 'NS' : game.title === 'ИМПЕРИЯ ВРЕМЕНИ' ? 'ET' : game.title.slice(0, 2)}</b><i>{game.genre}</i></div><div className="game-card-copy"><p className="eyebrow">{game.genre}</p><h2>{game.title}</h2><p>{game.text}</p><span className="game-card-action">{ru ? 'Запустить игру' : 'Launch game'} <ArrowUpRight /></span></div></a>)}</section></Shell>
}

function Shell({ children, title, locale, setLocale }: { children: React.ReactNode, title: string, locale: Locale, setLocale: (v: Locale) => void }) {
  const [menu, setMenu] = useState(false)
  const ru = locale === 'ru'
  const go = (path: string) => { window.location.href = path }
  return <main className={`standalone standalone-${title.toLowerCase()}`}>
    <header className="standalone-header"><a className="brand brand-logo" href="/"><OsgardLogo /></a><nav className="standalone-top-nav" aria-label="OSGARD sections">{sectionLinks.map(([label, path]) => <a href={path} key={path}>{locale === 'ru' ? ruSectionLabels[label] : label}</a>)}<a href="/development">{ru ? 'Разработка' : 'Development'}</a></nav><span className="standalone-title">{title}</span><div className="standalone-actions"><button className="language" onClick={() => setLocale(ru ? 'en' : 'ru')}><Globe2 />{locale.toUpperCase()}</button><button className="menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>{menu && <div className="standalone-menu"><button onClick={() => go('/')}>{ru ? 'Портал' : 'Portal'}</button><button onClick={() => go('/worlds')}>{ru ? 'Миры' : 'Worlds'}</button><button onClick={() => go('/development')}>{ru ? 'Разработка' : 'Development'}</button><button onClick={() => go('/aurum')}>AURUM</button><button onClick={() => go('/timecoin')}>TimeCoin</button></div>}</header>
    {children}<SectionNav locale={locale} />
  </main>
}

export function WorldsPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [active, setActive] = useState(0)
  if (ru) return <Shell title="Worlds" locale={locale} setLocale={setLocale}><section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>Семь миров. Каждый со своим ритмом.</h1><p>Выберите портал. Сцена раскроет его характер и следующий шаг.</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}>{String(index + 1).padStart(2, '0')}</button>)}</div></section><section className="standalone-grid">{products.map(([name, url, metric, text], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noreferrer" key={name} onMouseEnter={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>{({'VPN service. Review features and terms on the official site.':'VPN-сервис. Возможности и условия — на официальном сайте.','Premium taxi. Check service area and booking terms.':'Премиальное такси. Проверьте зону работы и условия заказа.','Business development tools and services.':'Инструменты и услуги для развития бизнеса.','Smart map and day planner.':'Умная карта и планировщик дня.','Digital product development: games, websites and applications.':'Разработка цифровых продуктов: игр, сайтов и приложений.','Cash and transaction accounting for exchange offices.':'Учёт кассы и операций обменников.','Video creation for digital products and campaigns.':'Создание видео для цифровых продуктов и кампаний.'}[text] || text)}</p><ArrowUpRight /></a>)}</section></Shell>
  return <Shell title="Worlds" locale={locale} setLocale={setLocale}><section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>{ru ? 'Описание OSGARD.' : 'Seven worlds. Each with its own rhythm.'}</h1><p>{ru ? 'Описание OSGARD.' : 'Choose a portal. The scene reveals its character and next step.'}</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}>{String(index + 1).padStart(2, '0')}</button>)}</div></section><section className="standalone-grid">{products.map(([name, url, metric, text], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noreferrer" key={name} onMouseEnter={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>{text}</p><ArrowUpRight /></a>)}</section></Shell>
}

export function AurumPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  if (ru) return <Shell title="AURUM" locale={locale} setLocale={setLocale}><section className="standalone-hero aurum-hero"><div className="standalone-orbit aurum-disk"><b>AURUM</b>{products.map(([name], index) => <span key={name}>{String(index + 1).padStart(2, '0')}</span>)}</div><div><p className="eyebrow">08 / КООРДИНАЦИЯ</p><h1>Архитектор экосистемы.</h1><p>Сердро AURUM соединяет семь продуктов в одну ясную картину и помогает выбрать следующий шаг.</p><a className="cta" href="/#aurum">Вернуться в портал <ArrowUpRight /></a></div></section></Shell>
  return <Shell title="AURUM" locale={locale} setLocale={setLocale}><section className="standalone-hero aurum-hero"><div className="standalone-orbit aurum-disk"><i/><i/><i/><b>AURUM</b>{products.map(([name], index) => <span key={name} style={{ '--thread-index': index } as React.CSSProperties}>{String(index + 1).padStart(2, '0')}</span>)}</div><div><p className="eyebrow">08 / COORDINATION</p><h1>{ru ? 'Описание OSGARD.' : 'The ecosystem architect.'}</h1><p>{ru ? 'Описание OSGARD.' : 'A silver core connects seven products into one clear picture and helps choose the next step.'}</p><a className="cta" href="/#aurum">{ru ? 'Описание OSGARD.' : 'Return to portal'}<ArrowUpRight /></a></div></section></Shell>
}

export function TimeCoinPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [front, setFront] = useState(true)
  if (ru) return <Shell title="TimeCoin" locale={locale} setLocale={setLocale}><section className="standalone-hero timecoin-hero"><button className={`coin-seal ${front ? '' : 'is-flipped'}`} onClick={() => setFront(!front)} aria-label="Перевернуть TimeCoin"><span>{front ? 'T' : 'O'}</span><small>{front ? 'OSGARD / 2026' : 'TIME / ACCESS / STATUS'}</small></button><div><p className="eyebrow">09 / TIMECOIN</p><h1>Активность открывает возможности.</h1><p>Внутренняя единица OSGARD для доступа, статуса и специальных условий. Это не платёжный и не инвестиционный инструмент.</p><a className="cta" href="/#timecoin">Открыть в портале <ArrowUpRight /></a></div></section></Shell>
  return <Shell title="TimeCoin" locale={locale} setLocale={setLocale}><section className="standalone-hero timecoin-hero"><button className={`coin-seal ${front ? '' : 'is-flipped'}`} onClick={() => setFront(!front)} aria-label="Flip TimeCoin"><span>{front ? 'T' : 'O'}</span><small>{front ? 'OSGARD / 2026' : 'TIME / ACCESS / STATUS'}</small></button><div><p className="eyebrow">09 / TIMECOIN</p><h1>{ru ? 'Описание OSGARD.' : 'Activity opens possibility.'}</h1><p>{ru ? 'Описание OSGARD.' : 'A silver OSGARD coin for access, status and special conditions.'}</p><a className="cta" href="/#timecoin">{ru ? 'Описание OSGARD.' : 'Explore in portal'}<ArrowUpRight /></a></div></section></Shell>
}

export function DevelopmentPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  return <Shell title="Development" locale={locale} setLocale={setLocale}><Development locale={locale} botUrl={botUrl} /></Shell>
}

export function ChroniclePage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  if (ru) return <Shell title="Chronicle" locale={locale} setLocale={setLocale}><section className="standalone-hero chronicle-hero"><div className="chronicle-wheel"><b>2026</b><span>2019</span><span>2023</span><span>2027</span></div><div><p className="eyebrow">03 / ХРОНИКА</p><h1>Время, которое помнит.</h1><p>Следите за годами, решениями и мирами, из которых складывается OSGARD.</p></div></section></Shell>
  return <Shell title="Chronicle" locale={locale} setLocale={setLocale}><section className="standalone-hero chronicle-hero"><div className="chronicle-wheel"><b>2026</b><span>2019</span><span>2023</span><span>2027</span></div><div><p className="eyebrow">03 / CHRONICLE</p><h1>{ru ? 'Описание OSGARD.' : 'Time that remembers.'}</h1><p>{ru ? 'Описание OSGARD.' : 'Trace the years, decisions and worlds that form OSGARD.'}</p></div></section></Shell>
}

const catalogue = [
  { id: '01', name: 'AURUM CORE', type: 'ARCHIVE OBJECT', metric: '07 THREADS', mark: 4, tone: 'artifact-gold' },
  { id: '02', name: 'TIMECOIN', type: 'ACCESS TOKEN', metric: '2026 EDITION', mark: 5, tone: 'artifact-silver' },
  { id: '03', name: 'GARD SHIELD', type: 'PRIVATE PROTOCOL', metric: 'VPN SERVICE', mark: 0, tone: 'artifact-wine' },
  { id: '04', name: 'SUPER DAY', type: 'RHYTHM ENGINE', metric: 'DAY PLANNER', mark: 3, tone: 'artifact-blue' },
  { id: '05', name: 'VANGUARD FRAME', type: 'VISUAL COMMISSION', metric: 'VIDEO STUDIO', mark: 6, tone: 'artifact-amber' },
  { id: '06', name: 'O2 LEDGER', type: 'PRECISION SYSTEM', metric: 'CASH TRACKING', mark: 2, tone: 'artifact-green' },
]

export function CatalogPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const ru = locale === 'ru'
  if (ru) return <Shell title="Catalog" locale={locale} setLocale={setLocale}><section className="standalone-hero catalog-hero catalog-intro"><div><p className="eyebrow">02 / КАТАЛОГ / ЧАСТНЫЙ АРХИВ</p><h1>Объекты с собственным характером.</h1><p>Артефакты и инструменты OSGARD собраны в личную коллекцию. Откройте объект, чтобы увидеть его контур.</p></div><div className="artifact-grid"><i>O</i><i>G</i><i>+</i></div></section><section className="catalog-collection" aria-label="Каталог OSGARD"><div className="catalog-grid">{catalogue.map(item => <article key={item.id} className={`catalog-card ${item.tone}${selected === item.id ? ' is-open' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)}><div className="catalog-visual"><ModuleMark index={item.mark} className="catalog-mark"/><span className="catalog-number">{item.id}</span></div><div className="catalog-meta"><small>{item.type}</small><h2>{item.name}</h2><span>{item.metric}</span></div><div className="catalog-open">{selected === item.id ? 'Закрыть объект' : 'Открыть объект'} <ArrowUpRight /></div>{selected === item.id && <div className="catalog-detail"><p>Происхождение, функция и следующий маршрут доступны в личном аккаунте.</p><a href="https://t.me/OSGARD_world_bot" target="_blank" rel="noreferrer">Обсудить доступ <ArrowUpRight /></a></div>}</article>)}</div></section></Shell>
  return <Shell title="Catalog" locale={locale} setLocale={setLocale}>
    <section className="standalone-hero catalog-hero catalog-intro"><div><p className="eyebrow">02 / CATALOG / PRIVATE ARCHIVE</p><h1>{ru ? 'Описание OSGARD.' : 'Objects with a point of view.'}</h1><p>{ru ? 'Описание OSGARD.' : 'OSGARD artefacts and instruments, arranged as a personal collection. Open an object to see its contour.'}</p></div><div className="artifact-grid"><i>O</i><i>G</i><i>+</i></div></section>
    <section className="catalog-collection" aria-label="OSGARD catalogue"><div className="catalog-toolbar"><span>{ru ? 'Описание OSGARD.' : 'COLLECTION / 06 OBJECTS'}</span><span>{ru ? 'Описание OSGARD.' : 'Описание OSGARD.'}</span></div><div className="catalog-grid">{catalogue.map(item => <article key={item.id} className={`catalog-card ${item.tone}${selected === item.id ? ' is-open' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelected(selected === item.id ? null : item.id) }}><div className="catalog-visual"><ModuleMark index={item.mark} className="catalog-mark"/><span className="catalog-number">{item.id}</span><span className="catalog-orbit"/></div><div className="catalog-meta"><small>{item.type}</small><h2>{item.name}</h2><span>{item.metric}</span></div><div className="catalog-open">{selected === item.id ? (ru ? 'Описание OSGARD.' : 'Close object') : (ru ? 'Описание OSGARD.' : 'Open object')} <ArrowUpRight /></div>{selected === item.id && <div className="catalog-detail"><p>{ru ? 'Описание OSGARD.' : 'An OSGARD contour: provenance, function and the next route are available in the private account.'}</p><a href="https://t.me/OSGARD_world_bot" target="_blank" rel="noreferrer">{ru ? 'Описание OSGARD.' : 'Discuss access'} <ArrowUpRight /></a></div>}</article>)}</div></section>
  </Shell>
}

const masters = [
  { name: 'Осман', nameEn: 'SENYOR OSMAN', role: 'FOUNDER / VISION', roleRu: 'ОСНОВАТЕЛЬ / ВИДЕНИЕ', place: 'NORTH CIRCLE', mark: 0, quote: 'A world becomes valuable when it gives people a clearer next step.' },
  { name: 'Айлин Картина', nameEn: 'AYLIN KARTINA', role: 'FOUNDER / WORLDS', roleRu: 'ОСНОВАТЕЛЬ / МИРЫ', place: 'EAST ARCHIVE', mark: 4, quote: 'Every route is a decision made visible, then made beautiful.' },
  { name: 'Тимур Кодар', nameEn: 'TIMUR KODAR', role: 'FOUNDER / CRAFT', roleRu: 'ОСНОВАТЕЛЬ / МАСТЕРСТВО', place: 'PRIVATE STUDIO', mark: 2, quote: 'Precision is what remains when noise is removed.' },
]

export function MastersPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [active, setActive] = useState(0)
  const founder = masters[active]
  if (ru) return <Shell title="Founders" locale={locale} setLocale={setLocale}><section className="standalone-hero masters-hero founder-hero"><div className="master-portrait master-portrait-real"><img className="founder-photo" src={['/assets/founder-osman.jpg', '/assets/founder-kartina.jpg', '/assets/founder-kodar.jpg'][active]} alt="Основатель OSGARD"/><ModuleMark index={founder.mark} className="master-tamga"/></div><div><p className="eyebrow">04 / ОСНОВАТЕЛИ / {founder.place}</p><h1>Те, кто формирует мир.</h1><p>Три основателя. Три способа смотреть в будущее: защищать, соединять и превращать идею в работающую форму.</p><blockquote>«{founder.quote}»</blockquote><p className="master-current"><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][active]}</strong><span>Создатель экосистемы</span></p></div></section><section className="masters-roster founders-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][index]}</strong><small>Основатель</small></button>)}</section></Shell>
  return <Shell title="Founders" locale={locale} setLocale={setLocale}>
    <section className={`standalone-hero masters-hero founder-hero founder-${active}`}>
      <div className="master-portrait master-portrait-real"><img className="founder-photo" src={['/assets/founder-osman.jpg', '/assets/founder-kartina.jpg', '/assets/founder-kodar.jpg'][active]} alt={ru ? founder.name : founder.nameEn} /><ModuleMark index={founder.mark} className="master-tamga"/><span className="master-sigil">{String(active + 1).padStart(2, '0')}</span><span className="founder-orbit"/></div>
      <div><p className="eyebrow">04 / FOUNDERS / {founder.place}</p><h1>{ru ? 'Описание OSGARD.' : 'The ones who shaped the world.'}</h1><p>{ru ? 'Описание OSGARD.' : 'Three founders. Three ways to see the future: protect, connect and turn an idea into a working form.'}</p><blockquote>{founder.quote}</blockquote><p className="master-current"><strong>{ru ? founder.name : founder.nameEn}</strong><span>{ru ? founder.roleRu : founder.role}</span></p></div>
    </section>
    <section className="masters-roster founders-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{ru ? item.name : item.nameEn}</strong><small>{ru ? item.roleRu : item.role}</small></button>)}</section>
  </Shell>
}

export function ClubPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [entered, setEntered] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', interest: 'DROPS' })
  const [accessId, setAccessId] = useState('')
  if (ru) return <Shell title="Club" locale={locale} setLocale={setLocale}><section className="club-ritual"><div className="club-door"><div className="club-door-glow"/><OsgardLogo variant="preloader"/><span className="club-door-label">ЧАСТНЫЙ КРУГ / 05</span><button type="button" onClick={() => window.open(botUrl, '_blank', 'noopener,noreferrer')}>Войти в клуб <ArrowUpRight /></button></div><div className="club-copy"><p className="eyebrow">05 / КЛУБ / ПО ПРИГЛАШЕНИЯМ</p><h1>Для тех, кто создаёт смысл.</h1><p>Частный круг для раннего доступа, редких артефактов и прямого разговора с создателями.</p><div className="club-rooms"><span>01 / DROPS</span><span>02 / ВСТРЕЧИ</span><span>03 / БИБЛИОТЕКА</span></div></div></section></Shell>
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const id = `OSG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    window.localStorage.setItem('osgard-club-request', JSON.stringify({ ...form, accessId: id, createdAt: new Date().toISOString() }))
    setAccessId(id)
    setSubmitted(true)
    window.open(botUrl, '_blank', 'noopener,noreferrer')
  }
  return <Shell title="Club" locale={locale} setLocale={setLocale}><section className={`club-ritual ${entered ? 'is-entered' : ''}`}><div className="club-door"><div className="club-door-glow"/><OsgardLogo variant="preloader"/><span className="club-door-label">PRIVATE CIRCLE / 05</span>{!entered ? <button type="button" onClick={() => setEntered(true)}>{ru ? 'Описание OSGARD.' : 'Enter the club'} <ArrowUpRight /></button> : submitted ? <div className="club-confirm"><strong>{ru ? 'Описание OSGARD.' : 'Request received'}</strong><span>{ru ? 'Описание OSGARD.' : 'Your contour: '}<b>{accessId}</b></span><small>{ru ? 'Описание OSGARD.' : 'Telegram is open. The team will continue there.'}</small></div> : <form className="club-access-form" onSubmit={submit}><label><span>{ru ? 'Описание OSGARD.' : 'Name'}</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>{ru ? 'Описание OSGARD.' : 'Contact'}</span><input required type="email" value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} placeholder="you@domain.com" /></label><label><span>{ru ? 'Описание OSGARD.' : 'Interest'}</span><select value={form.interest} onChange={event => setForm({ ...form, interest: event.target.value })}><option>DROPS</option><option>MEETINGS</option><option>LIBRARY</option></select></label><button type="submit">{ru ? 'Описание OSGARD.' : 'Request access'} <ArrowUpRight /></button></form>}</div><div className="club-copy"><p className="eyebrow">05 / CLUB / INVITATION ONLY</p><h1>{ru ? 'Описание OSGARD.' : 'For those who build meaning.'}</h1><p>{ru ? 'Описание OSGARD.' : 'A private circle for early access, rare lots and direct conversations with the masters.'}</p><div className="club-rooms"><span>01 / DROPS</span><span>02 / MEETINGS</span><span>03 / LIBRARY</span></div></div></section></Shell>
}


