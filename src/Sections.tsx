import { ArrowUpRight, ChevronLeft, Globe2, Menu, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Development } from './Development'
import { ModuleMark } from './ModuleMark'
import { OsgardLogo } from './OsgardLogo'

type Locale = 'ru' | 'en'
const botUrl = 'https://t.me/OSGARD_world_bot'
const products = [
  ['GARD VPN', 'gardvpn.is', 'VPN', 'A VPN service for everyday use. Check availability and terms on the official site.'],
  ['SENJORIO', 'senjorio.com', 'Taxi', 'Premium taxi. Geography, fares and availability are listed by the service.'],
  ['OSGARD BUSINESS', 'osgardos.com', 'Business growth', 'Business diagnostics, competitor analysis and growth recommendations.'],
  ['SUPERDAY', 'superday.run', 'Day planning', 'A smart map and day planner. Check features and availability on the site.'],
  ['OSGARD PROJECTS', 'osgardbewworld.com', 'Build', 'Create projects, websites and applications with scope agreed per project.'],
  ['O2 SYSTEM', 'o2system.art', 'Accounting', 'An accounting system for exchange-office cash operations. Confirm features on the product site.'],
  ['OSGARD VANGUARD', 'osgardvanguard.studio', 'Video', 'A video studio. Format, schedule and price are agreed per project.'],
]

const sectionLinks = [['Worlds', '/worlds'], ['Catalog', '/catalog'], ['Chronicle', '/chronicle'], ['Founders', '/masters'], ['Entertainment', '/games/'], ['SkillCred', '/skillcred/'], ['Club', '/club']]
const ruSectionLabels: Record<string, string> = { Worlds: 'Миры', Catalog: 'Каталог', Chronicle: 'Хроника', Founders: 'Основатели', Entertainment: 'Игры', SkillCred: 'SkillCred', Club: 'Клуб' }

function SectionNav({ locale }: { locale: Locale }) {
  return <nav className="section-nav" aria-label="OSGARD sections">{sectionLinks.map(([label, path], index) => <a href={path} key={path}><small>0{index + 1}</small><span>{locale === 'ru' ? ruSectionLabels[label] : label}</span></a>)}</nav>
}

export function EntertainmentPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const games = [
    { title: 'NULL//SHIFT', genre: ru ? 'ТАКТИЧЕСКИЙ КООПЕРАТИВ' : 'TACTICAL CO-OP', text: ru ? 'Проникновение, взаимодействие с терминалами и совместная эвакуация.' : 'Infiltration, terminal interactions and cooperative extraction.', href: '/games/null-shift-godot/' },
    { title: 'ИМПЕРИЯ ВРЕМЕНИ', genre: ru ? 'СТРАТЕГИЧЕСКИЙ ПРОТОТИП' : 'STRATEGY PROTOTYPE', text: ru ? 'Эксперимент с управлением городом, ресурсами и последствиями решений.' : 'A prototype about city management, resources and the consequences of decisions.', href: '/games/time' },
    { title: 'SWARM', genre: ru ? 'СЕТЕВОЙ КООПЕРАТИВ' : 'ONLINE CO-OP', text: ru ? 'Выберите роль и действуйте вместе. Сетевые возможности зависят от доступности сервера.' : 'Choose a role and coordinate. Online play depends on server availability.', href: '/games/swarm/' },
    { title: 'INHERIT', genre: ru ? 'МИР С ЛОКАЛЬНЫМ СОХРАНЕНИЕМ' : 'LOCAL-SAVE WORLD', text: ru ? 'Остров и наследие поколений. Прогресс хранится в браузере этого устройства.' : 'An island shaped by generations. Progress is stored in this browser.', href: '/games/inherit/' },
    { title: 'REMIX', genre: ru ? 'СЕТЕВЫЕ ИСПЫТАНИЯ' : 'ONLINE CHALLENGES', text: ru ? 'Создание испытаний и матчи, зависящие от доступности серверной части.' : 'Create challenges and play matches when the backend is available.', href: '/games/remix/' },
  ]
  return <Shell title="Entertainment" locale={locale} setLocale={setLocale}>
    <section className="standalone-hero entertainment-hero">
      <div><p className="eyebrow">06 / OSGARD PLAY</p><h1>{ru ? 'Пять игровых миров. Один вход.' : 'Five game worlds. One entry.'}</h1><p>{ru ? 'Откройте карточку, проверьте управление и запустите игру. Доступность онлайн-систем зависит от соответствующего сервера.' : 'Open a game card, review controls and launch. Online systems depend on their respective servers.'}</p></div>
      <div className="entertainment-signal"><span>GAME LIBRARY</span><strong>{String(games.length).padStart(2, '0')}</strong><i>{ru ? 'ИГРОВЫЕ ПРОЕКТЫ' : 'GAME PROJECTS'}</i></div>
    </section>
    <section className="game-catalog" aria-label={ru ? 'Каталог игр' : 'Game catalog'}>{games.map((game, index) => <a className="game-card" href={game.href} key={game.title}>
      <div className="game-card-art"><span>0{index + 1}</span><b>{index === 0 ? 'NS' : index === 1 ? 'ET' : game.title.slice(0, 2)}</b><i>{game.genre}</i></div>
      <div className="game-card-copy"><p className="eyebrow">{game.genre}</p><h2>{game.title}</h2><p>{game.text}</p><span className="game-card-action">{ru ? 'Открыть игру' : 'Open game'} <ArrowUpRight /></span></div>
    </a>)}</section>
    <section className="standalone-hero"><div><p className="eyebrow">OSGARD / BUILD WITH US</p><h2>{ru ? 'Есть идея игры или цифрового продукта?' : 'Have an idea for a game or digital product?'}</h2><p>{ru ? 'OSGARD поможет превратить её в цифровой продукт. Опишите задачу — обсудим формат и объём работ.' : 'OSGARD can help turn it into a digital product. Share the brief so we can discuss scope.'}</p><a className="cta" href="https://wa.me/79640027222" target="_blank" rel="noreferrer">{ru ? 'Обсудить в WhatsApp' : 'Discuss on WhatsApp'} <ArrowUpRight /></a></div></section>
  </Shell>
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
  const descriptions = [
    'VPN-сервис; доступность и условия зависят от региона.',
    'Премиальное такси; география и тарифы — на сайте сервиса.',
    'Диагностика бизнеса, анализ конкурентов и рекомендации по развитию.',
    'Умная карта и планировщик дня.',
    'Создание проектов, сайтов и приложений; объём согласуется отдельно.',
    'Система учёта кассы обменников.',
    'Студия создания видео; формат и условия согласуются по задаче.',
  ]
  return <Shell title="Worlds" locale={locale} setLocale={setLocale}>
    <section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>{ru ? 'Семь направлений. Один связанный мир.' : 'Seven directions. One connected world.'}</h1><p>{ru ? 'Выберите направление экосистемы и переходите на его официальный сайт, чтобы уточнить реальные возможности и условия.' : 'Choose a direction in the ecosystem and visit its official site to confirm current features and terms.'}</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button type="button" key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}><span>{String(index + 1).padStart(2, '0')}</span></button>)}</div></section>
    <section className="standalone-grid" aria-label={ru ? 'Направления OSGARD' : 'OSGARD directions'}>{products.map(([name, url, metric, text], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noopener noreferrer" key={name} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>{ru ? descriptions[index] : text}</p><ArrowUpRight /></a>)}</section>
  </Shell>
}

export function AurumPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  return <Shell title="AURUM" locale={locale} setLocale={setLocale}><section className="standalone-hero aurum-hero"><div className="standalone-orbit aurum-disk"><i/><i/><i/><b>AURUM</b>{products.map(([name], index) => <span key={name} style={{ '--thread-index': index } as React.CSSProperties}>{String(index + 1).padStart(2, '0')}</span>)}</div><div><p className="eyebrow">08 / {ru ? 'КООРДИНАЦИЯ' : 'COORDINATION'}</p><h1>{ru ? 'Архитектура экосистемы.' : 'The ecosystem architecture.'}</h1><p>{ru ? 'AURUM — концепция единого взгляда на направления OSGARD. Эта страница описывает принцип связности; она не заявляет о наличии отдельного автономного интеллектуального сервиса.' : 'AURUM is a concept for viewing OSGARD directions together. This page describes the ecosystem principle; it does not claim that a separate autonomous AI service is live.'}</p><a className="cta" href="/">{ru ? 'Вернуться в портал' : 'Return to portal'} <ArrowUpRight /></a></div></section></Shell>
}

export function TimeCoinPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [front, setFront] = useState(true)
  return <Shell title="TimeCoin" locale={locale} setLocale={setLocale}><section className="standalone-hero timecoin-hero"><button type="button" className={`coin-seal ${front ? '' : 'is-flipped'}`} onClick={() => setFront(!front)} aria-label={ru ? 'Перевернуть знак TimeCoin' : 'Flip the TimeCoin emblem'}><span>{front ? 'T' : 'O'}</span><small>{front ? 'OSGARD / 2026' : 'TIME / ACCESS / STATUS'}</small></button><div><p className="eyebrow">09 / TIMECOIN</p><h1>{ru ? 'Активность открывает возможности.' : 'Activity can open possibilities.'}</h1><p>{ru ? 'TimeCoin представлен как концепция внутренней бонусной программы OSGARD. Производственный выпуск, платежи, передача и правила использования не подтверждены этой страницей. Не рассматривайте TimeCoin как деньги или инвестицию.' : 'TimeCoin is presented as a concept for an internal OSGARD rewards programme. This page does not confirm live issuance, payments, transferability or usage rules. Do not treat TimeCoin as money or an investment.'}</p><a className="cta" href="/#timecoin">{ru ? 'Вернуться в портал' : 'Return to portal'} <ArrowUpRight /></a></div></section></Shell>
}

export function DevelopmentPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  return <Shell title="Development" locale={locale} setLocale={setLocale}><Development locale={locale} botUrl={botUrl} /></Shell>
}

function LegacyCatalogPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  return <Shell title="Catalog" locale={locale} setLocale={setLocale}><section className="standalone-hero catalog-hero"><div><p className="eyebrow">02 / CATALOG</p><h1>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'Objects with a point of view.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ OSGARD пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'OSGARD tools and artefacts, arranged as a personal collection.'}</p></div><div className="artifact-grid"><i>01</i><i>02</i><i>03</i></div></section></Shell>
}

export function ChroniclePage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const stages = ru ? ['ИДЕЯ', 'ПРОТОТИП', 'СЛЕДУЮЩИЙ ЭТАП'] : ['IDEA', 'PROTOTYPE', 'NEXT STAGE']
  return <Shell title="Chronicle" locale={locale} setLocale={setLocale}><section className="standalone-hero chronicle-hero"><div className="chronicle-wheel"><b>OSG</b><span>01</span><span>02</span><span>03</span></div><div><p className="eyebrow">03 / {ru ? 'ХРОНИКА' : 'CHRONICLE'}</p><h1>{ru ? 'История, которую строим дальше.' : 'A story still being built.'}</h1><p>{ru ? 'Здесь будут появляться подтверждённые этапы и события OSGARD. Пока это структура для будущей хроники, а не заявление о конкретных датах запуска.' : 'Verified OSGARD milestones can be added here. For now this is a structure for the future chronicle, not a claim about launch dates.'}</p><div className="club-rooms">{stages.map((stage, index) => <span key={stage}>0{index + 1} / {stage}</span>)}</div></div></section></Shell>
}

function LegacyMastersLandingPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  return <Shell title="Masters" locale={locale} setLocale={setLocale}><section className="standalone-hero masters-hero"><div className="master-portrait"><span>пїЅ</span></div><div><p className="eyebrow">04 / MASTERS</p><h1>{ru ? 'пїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'Hands that remember.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'People whose knowledge turns material, code and history into living form.'}</p></div></section></Shell>
}

function LegacyClubPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  return <Shell title="Club" locale={locale} setLocale={setLocale}><section className="standalone-hero club-hero"><div className="club-seal">OSGARD<br/><small>PRIVATE CIRCLE</small></div><div><p className="eyebrow">05 / CLUB</p><h1>{ru ? 'пїЅпїЅпїЅ пїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'For those who build meaning.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'A private circle for early access, personal routes and new worlds.'}</p><a className="cta" href={botUrl} target="_blank" rel="noreferrer">{ru ? 'пїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅ' : 'Enter the club'}<ArrowUpRight /></a></div></section></Shell>
}

const catalogue = [
  { id: '01', name: 'AURUM CORE', type: 'COORDINATION CONCEPT', metric: 'OSGARD ECOSYSTEM', mark: 4, tone: 'artifact-gold' },
  { id: '02', name: 'TIMECOIN', type: 'BONUS PROGRAMME CONCEPT', metric: 'TERMS TO BE CONFIRMED', mark: 5, tone: 'artifact-silver' },
  { id: '03', name: 'GARD VPN', type: 'VPN SERVICE', metric: 'CHECK AVAILABILITY', mark: 0, tone: 'artifact-wine' },
  { id: '04', name: 'SUPER DAY', type: 'DAY PLANNER', metric: 'MAP / PLAN', mark: 3, tone: 'artifact-blue' },
  { id: '05', name: 'VANGUARD FRAME', type: 'VIDEO STUDIO', metric: 'VIDEO PRODUCTION', mark: 6, tone: 'artifact-amber' },
  { id: '06', name: 'O2 LEDGER', type: 'CASH ACCOUNTING', metric: 'EXCHANGE OPERATIONS', mark: 2, tone: 'artifact-green' }
]

export function CatalogPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const ru = locale === 'ru'
  return <Shell title="Catalog" locale={locale} setLocale={setLocale}>
    <section className="standalone-hero catalog-hero catalog-intro"><div><p className="eyebrow">02 / {ru ? 'КАТАЛОГ / ЧАСТНЫЙ АРХИВ' : 'CATALOG / COLLECTION'}</p><h1>{ru ? 'Объекты с собственным характером.' : 'Objects with a point of view.'}</h1><p>{ru ? 'Визуальные символы и направления OSGARD собраны в одну коллекцию. Откройте карточку, чтобы посмотреть описание и перейти к обсуждению доступа.' : 'OSGARD symbols and directions in one visual collection. Open an item for a short description and a route to discuss access.'}</p></div><div className="artifact-grid"><i>O</i><i>G</i><i>+</i></div></section>
    <section className="catalog-collection" aria-label={ru ? 'Каталог OSGARD' : 'OSGARD catalogue'}><div className="catalog-toolbar"><span>{ru ? 'КОЛЛЕКЦИЯ / 06 ОБЪЕКТОВ' : 'COLLECTION / 06 OBJECTS'}</span><span>{ru ? 'КОНЦЕПТЫ / НАПРАВЛЕНИЯ' : 'CONCEPTS / DIRECTIONS'}</span></div><div className="catalog-grid">{catalogue.map(item => {
      const opened = selected === item.id
      return <article key={item.id} className={`catalog-card ${item.tone}${opened ? ' is-open' : ''}`} tabIndex={0} aria-expanded={opened} onClick={() => setSelected(opened ? null : item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(opened ? null : item.id) } }}><div className="catalog-visual"><ModuleMark index={item.mark} className="catalog-mark"/><span className="catalog-number">{item.id}</span><span className="catalog-orbit"/></div><div className="catalog-meta"><small>{item.type}</small><h2>{item.name}</h2><span>{item.metric}</span></div><div className="catalog-open">{opened ? (ru ? 'Закрыть описание' : 'Close description') : (ru ? 'Открыть описание' : 'Open description')} <ArrowUpRight /></div>{opened && <div className="catalog-detail"><p>{ru ? 'Это концептуальная карточка направления OSGARD. Актуальные возможности и условия уточняйте на официальной странице соответствующего продукта.' : 'This is a concept card for an OSGARD direction. Check the official product page for current features and terms.'}</p><a href="https://wa.me/79640027222" target="_blank" rel="noreferrer">{ru ? 'Обсудить проект' : 'Discuss a project'} <ArrowUpRight /></a></div>}</article>
    })}</div></section>
  </Shell>
}

const masters = [
  { name: 'Осман', nameEn: 'OSMAN', role: 'FOUNDER / VISION', roleRu: 'ОСНОВАТЕЛЬ / ВИДЕНИЕ', place: 'NORTH CIRCLE', mark: 0, quote: 'A world becomes valuable when it gives people a clearer next step.', quoteRu: 'Мир становится ценным, когда помогает людям увидеть следующий шаг.' },
  { name: 'Айлин Картина', nameEn: 'AYLIN KARTINA', role: 'FOUNDER / WORLDS', roleRu: 'ОСНОВАТЕЛЬ / МИРЫ', place: 'EAST ARCHIVE', mark: 4, quote: 'Every route is a decision made visible, then made beautiful.', quoteRu: 'Каждый маршрут превращает решение в понятную форму.' },
  { name: 'Тимур Кодар', nameEn: 'TIMUR KODAR', role: 'FOUNDER / CRAFT', roleRu: 'ОСНОВАТЕЛЬ / ИНЖЕНЕРИЯ', place: 'PRIVATE STUDIO', mark: 2, quote: 'Precision is what remains when noise is removed.', quoteRu: 'Точность остаётся, когда исчезает лишний шум.' },
]

function LegacyMastersPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [active, setActive] = useState(0)
  const master = masters[active]
  return <Shell title="Masters" locale={locale} setLocale={setLocale}><section className="standalone-hero masters-hero"><div className="master-portrait master-portrait-real"><ModuleMark index={master.mark} className="master-tamga"/><span className="master-sigil">{String(active + 1).padStart(2, '0')}</span></div><div><p className="eyebrow">04 / MASTERS / {master.place}</p><h1>{ru ? 'пїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'Hands that remember.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'People whose knowledge turns material, code and history into living form.'}</p><blockquote>пїЅ{master.quote}пїЅ</blockquote><p className="master-current"><strong>{master.name}</strong><span>{master.role}</span></p></div></section><section className="masters-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{item.name}</strong><small>{item.role}</small></button>)}</section></Shell>
}

export function MastersPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [active, setActive] = useState(0)
  const founder = masters[active]
  if (ru) return <Shell title="Founders" locale={locale} setLocale={setLocale}><section className="standalone-hero masters-hero founder-hero"><div className="master-portrait master-portrait-real"><img className="founder-photo" src={['/assets/founder-osman.jpg', '/assets/founder-kartina.jpg', '/assets/founder-kodar.jpg'][active]} alt="Основатель OSGARD"/><ModuleMark index={founder.mark} className="master-tamga"/></div><div><p className="eyebrow">04 / ОСНОВАТЕЛИ / {founder.place}</p><h1>Те, кто формирует мир.</h1><p>Три основателя. Три способа смотреть в будущее: защищать, соединять и превращать идею в работающую форму.</p><blockquote>«{founder.quoteRu}»</blockquote><p className="master-current"><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][active]}</strong><span>Создатель экосистемы</span></p></div></section><section className="masters-roster founders-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][index]}</strong><small>Основатель</small></button>)}</section></Shell>
  return <Shell title="Founders" locale={locale} setLocale={setLocale}>
    <section className={`standalone-hero masters-hero founder-hero founder-${active}`}>
      <div className="master-portrait master-portrait-real"><img className="founder-photo" src={['/assets/founder-osman.jpg', '/assets/founder-kartina.jpg', '/assets/founder-kodar.jpg'][active]} alt={ru ? founder.name : founder.nameEn} /><ModuleMark index={founder.mark} className="master-tamga"/><span className="master-sigil">{String(active + 1).padStart(2, '0')}</span><span className="founder-orbit"/></div>
      <div><p className="eyebrow">04 / FOUNDERS / {founder.place}</p><h1>{ru ? 'пїЅпїЅ, пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'The ones who shaped the world.'}</h1><p>{ru ? 'пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ: пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'Three founders. Three ways to see the future: protect, connect and turn an idea into a working form.'}</p><blockquote>пїЅ{founder.quote}пїЅ</blockquote><p className="master-current"><strong>{ru ? founder.name : founder.nameEn}</strong><span>{ru ? founder.roleRu : founder.role}</span></p></div>
    </section>
    <section className="masters-roster founders-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{ru ? item.name : item.nameEn}</strong><small>{ru ? item.roleRu : item.role}</small></button>)}</section>
  </Shell>
}

export function ClubPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [entered, setEntered] = useState(false)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ name: '', contact: '', interest: 'DROPS' })
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = [
      ru ? 'Здравствуйте! Хочу обсудить OSGARD Club.' : 'Hello! I would like to discuss OSGARD Club.',
      (ru ? 'Имя: ' : 'Name: ') + form.name.trim(),
      (ru ? 'Контакт для ответа: ' : 'Reply contact: ') + form.contact.trim(),
      (ru ? 'Интерес: ' : 'Interest: ') + form.interest,
    ].join('\n')
    const url = 'https://wa.me/79640027222?text=' + encodeURIComponent(message)
    window.open(url, '_blank', 'noopener,noreferrer')
    setStatus(ru ? 'Открылся WhatsApp. Данные не отправлены на сайт: проверьте сообщение и отправьте его вручную.' : 'WhatsApp was opened. The website did not receive this request; review and send the message manually.')
  }
  return <Shell title="Club" locale={locale} setLocale={setLocale}><section className={`club-ritual ${entered ? 'is-entered' : ''}`}><div className="club-door"><div className="club-door-glow"/><OsgardLogo variant="preloader"/><span className="club-door-label">{ru ? 'КЛУБ / ЗАПРОС ДОСТУПА' : 'CLUB / ACCESS REQUEST'}</span>{!entered ? <button type="button" onClick={() => setEntered(true)}>{ru ? 'Запросить приглашение' : 'Request an invitation'} <ArrowUpRight /></button> : <form className="club-access-form" onSubmit={submit}><label><span>{ru ? 'Имя' : 'Name'}</span><input required maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>{ru ? 'Контакт для ответа' : 'Reply contact'}</span><input required maxLength={160} value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} placeholder={ru ? 'Телефон, email или Telegram' : 'Phone, email or Telegram'} /></label><label><span>{ru ? 'Что интересно' : 'What interests you'}</span><select value={form.interest} onChange={event => setForm({ ...form, interest: event.target.value })}><option value="DROPS">{ru ? 'Игры и ранний доступ' : 'Games and early access'}</option><option value="MEETINGS">{ru ? 'Обсуждение проектов' : 'Project discussions'}</option><option value="LIBRARY">{ru ? 'Материалы и коллекции' : 'Materials and collections'}</option></select></label><button type="submit">{ru ? 'Подготовить сообщение WhatsApp' : 'Prepare WhatsApp message'} <ArrowUpRight /></button><small role="status">{status || (ru ? 'Форма не сохраняет данные на сервере. Сообщение отправляется только после вашего подтверждения в WhatsApp.' : 'The form does not save data on a server. The message is sent only after you confirm it in WhatsApp.')}</small></form>}</div><div className="club-copy"><p className="eyebrow">05 / {ru ? 'КЛУБ' : 'CLUB'} / CONCEPT</p><h1>{ru ? 'Для тех, кто создаёт смысл.' : 'For those who build meaning.'}</h1><p>{ru ? 'Клуб — концепция сообщества вокруг игр и цифровых продуктов OSGARD. Закрытые функции и членство не активированы; запрос можно обсудить напрямую.' : 'The club is a concept for a community around OSGARD games and digital products. Membership and gated features are not activated; an inquiry can be discussed directly.'}</p><div className="club-rooms"><span>01 / {ru ? 'ИГРЫ' : 'GAMES'}</span><span>02 / {ru ? 'ПРОЕКТЫ' : 'PROJECTS'}</span><span>03 / {ru ? 'СООБЩЕСТВО' : 'COMMUNITY'}</span></div><a href="mailto:osman.osmanov0099@gmail.com">{ru ? 'Написать по email' : 'Contact by email'} <ArrowUpRight /></a></div></section></Shell>
}
