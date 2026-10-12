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
  if (ru) return <Shell title="Worlds" locale={locale} setLocale={setLocale}><section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>Семь миров. Каждый со своим ритмом.</h1><p>Выберите портал. Сцена раскроет его характер и следующий шаг.</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}>{String(index + 1).padStart(2, '0')}</button>)}</div></section><section className="standalone-grid">{products.map(([name, url, metric, text], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noreferrer" key={name} onMouseEnter={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>{['VPN-сервис для повседневного использования.', 'Премиальное такси; география и тарифы — на сайте сервиса.', 'Диагностика бизнеса, анализ конкурентов и рекомендации по развитию.', 'Умная карта и планировщик дня.', 'Создание проектов, сайтов и приложений; объём согласуется отдельно.', 'Система учёта кассы обменников.', 'Студия создания видео; формат и условия согласуются по задаче.'][index]}</p><ArrowUpRight /></a>)}</section></Shell>
  if (ru) return <Shell title="Worlds" locale={locale} setLocale={setLocale}><section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>РЎРµРјСЊ РјРёСЂРѕРІ. РљР°Р¶РґС‹Р№ СЃРѕ СЃРІРѕРёРј СЂРёС‚РјРѕРј.</h1><p>Р’С‹Р±РµСЂРёС‚Рµ РїРѕСЂС‚Р°Р». РЎС†РµРЅР° СЂР°СЃРєСЂРѕРµС‚ РµРіРѕ С…Р°СЂР°РєС‚РµСЂ Рё СЃР»РµРґСѓСЋС‰РёР№ С€Р°Рі.</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}>{String(index + 1).padStart(2, '0')}</button>)}</div></section><section className="standalone-grid">{products.map(([name, url, metric], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noreferrer" key={name} onMouseEnter={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>РћС‚РєСЂРѕР№С‚Рµ РјРёСЂ Рё РІС‹Р±РµСЂРёС‚Рµ СЃР»РµРґСѓСЋС‰РёР№ С€Р°Рі.</p><ArrowUpRight /></a>)}</section></Shell>
  return <Shell title="Worlds" locale={locale} setLocale={setLocale}><section className="standalone-hero worlds-hero"><div><p className="eyebrow">01 / OSGARD WORLD</p><h1>{ru ? 'пїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'Seven worlds. Each with its own rhythm.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ.' : 'Choose a portal. The scene reveals its character and next step.'}</p></div><div className="worlds-orbit"><div className="worlds-core">OSGARD</div>{products.map(([name], index) => <button key={name} className={active === index ? 'is-active' : ''} style={{ '--orbit-index': index } as React.CSSProperties} onClick={() => setActive(index)} aria-label={name}>{String(index + 1).padStart(2, '0')}</button>)}</div></section><section className="standalone-grid">{products.map(([name, url, metric, text], index) => <a className={`standalone-product product-${index}${active === index ? ' is-active' : ''}`} href={`https://${url}`} target="_blank" rel="noreferrer" key={name} onMouseEnter={() => setActive(index)}><span>0{index + 1}</span><strong>{metric}</strong><h2>{name}</h2><p>{text}</p><ArrowUpRight /></a>)}</section></Shell>
}

export function AurumPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  if (ru) return <Shell title="AURUM" locale={locale} setLocale={setLocale}><section className="standalone-hero aurum-hero"><div className="standalone-orbit aurum-disk"><b>AURUM</b>{products.map(([name], index) => <span key={name}>{String(index + 1).padStart(2, '0')}</span>)}</div><div><p className="eyebrow">08 / КООРДИНАЦИЯ</p><h1>Архитектор экосистемы.</h1><p>Сердро AURUM соединяет семь продуктов в одну ясную картину и помогает выбрать следующий шаг.</p><a className="cta" href="/#aurum">Вернуться в портал <ArrowUpRight /></a></div></section></Shell>
  return <Shell title="AURUM" locale={locale} setLocale={setLocale}><section className="standalone-hero aurum-hero"><div className="standalone-orbit aurum-disk"><i/><i/><i/><b>AURUM</b>{products.map(([name], index) => <span key={name} style={{ '--thread-index': index } as React.CSSProperties}>{String(index + 1).padStart(2, '0')}</span>)}</div><div><p className="eyebrow">08 / COORDINATION</p><h1>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'The ecosystem architect.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ.' : 'A silver core connects seven products into one clear picture and helps choose the next step.'}</p><a className="cta" href="/#aurum">{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅ' : 'Return to portal'}<ArrowUpRight /></a></div></section></Shell>
}

export function TimeCoinPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const ru = locale === 'ru'
  const [front, setFront] = useState(true)
  if (ru) return <Shell title="TimeCoin" locale={locale} setLocale={setLocale}><section className="standalone-hero timecoin-hero"><button className={`coin-seal ${front ? '' : 'is-flipped'}`} onClick={() => setFront(!front)} aria-label="Перевернуть TimeCoin"><span>{front ? 'T' : 'O'}</span><small>{front ? 'OSGARD / 2026' : 'TIME / ACCESS / STATUS'}</small></button><div><p className="eyebrow">09 / TIMECOIN</p><h1>Активность открывает возможности.</h1><p>Внутренняя единица OSGARD для доступа, статуса и специальных условий. Это не платёжный и не инвестиционный инструмент.</p><a className="cta" href="/#timecoin">Открыть в портале <ArrowUpRight /></a></div></section></Shell>
  return <Shell title="TimeCoin" locale={locale} setLocale={setLocale}><section className="standalone-hero timecoin-hero"><button className={`coin-seal ${front ? '' : 'is-flipped'}`} onClick={() => setFront(!front)} aria-label="Flip TimeCoin"><span>{front ? 'T' : 'O'}</span><small>{front ? 'OSGARD / 2026' : 'TIME / ACCESS / STATUS'}</small></button><div><p className="eyebrow">09 / TIMECOIN</p><h1>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'Activity opens possibility.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅ OSGARD пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'A silver OSGARD coin for access, status and special conditions.'}</p><a className="cta" href="/#timecoin">{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Explore in portal'}<ArrowUpRight /></a></div></section></Shell>
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
  if (ru) return <Shell title="Chronicle" locale={locale} setLocale={setLocale}><section className="standalone-hero chronicle-hero"><div className="chronicle-wheel"><b>2026</b><span>2019</span><span>2023</span><span>2027</span></div><div><p className="eyebrow">03 / ХРОНИКА</p><h1>Время, которое помнит.</h1><p>Следите за годами, решениями и мирами, из которых складывается OSGARD.</p></div></section></Shell>
  return <Shell title="Chronicle" locale={locale} setLocale={setLocale}><section className="standalone-hero chronicle-hero"><div className="chronicle-wheel"><b>2026</b><span>2019</span><span>2023</span><span>2027</span></div><div><p className="eyebrow">03 / CHRONICLE</p><h1>{ru ? 'пїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'Time that remembers.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅ, пїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ OSGARD.' : 'Trace the years, decisions and worlds that form OSGARD.'}</p></div></section></Shell>
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
  { id: '01', name: 'AURUM CORE', type: 'ARCHIVE OBJECT', metric: '07 THREADS', mark: 4, tone: 'artifact-gold' },
  { id: '02', name: 'TIMECOIN', type: 'ACCESS TOKEN', metric: '2026 EDITION', mark: 5, tone: 'artifact-silver' },
  { id: '03', name: 'GARD SHIELD', type: 'PRIVATE PROTOCOL', metric: '99.9% QUIET', mark: 0, tone: 'artifact-wine' },
  { id: '04', name: 'SUPER DAY', type: 'RHYTHM ENGINE', metric: '+02 HOURS', mark: 3, tone: 'artifact-blue' },
  { id: '05', name: 'VANGUARD FRAME', type: 'VISUAL COMMISSION', metric: '4K MASTER', mark: 6, tone: 'artifact-amber' },
  { id: '06', name: 'O2 LEDGER', type: 'PRECISION SYSTEM', metric: '0.0% NOISE', mark: 2, tone: 'artifact-green' },
]

export function CatalogPage({ locale, setLocale }: { locale: Locale, setLocale: (v: Locale) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const ru = locale === 'ru'
  if (ru) return <Shell title="Catalog" locale={locale} setLocale={setLocale}><section className="standalone-hero catalog-hero catalog-intro"><div><p className="eyebrow">02 / КАТАЛОГ / ЧАСТНЫЙ АРХИВ</p><h1>Объекты с собственным характером.</h1><p>Артефакты и инструменты OSGARD собраны в личную коллекцию. Откройте объект, чтобы увидеть его контур.</p></div><div className="artifact-grid"><i>O</i><i>G</i><i>+</i></div></section><section className="catalog-collection" aria-label="Каталог OSGARD"><div className="catalog-grid">{catalogue.map(item => <article key={item.id} className={`catalog-card ${item.tone}${selected === item.id ? ' is-open' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)}><div className="catalog-visual"><ModuleMark index={item.mark} className="catalog-mark"/><span className="catalog-number">{item.id}</span></div><div className="catalog-meta"><small>{item.type}</small><h2>{item.name}</h2><span>{item.metric}</span></div><div className="catalog-open">{selected === item.id ? 'Закрыть объект' : 'Открыть объект'} <ArrowUpRight /></div>{selected === item.id && <div className="catalog-detail"><p>Происхождение, функция и следующий маршрут доступны в личном аккаунте.</p><a href="https://t.me/OSGARD_world_bot" target="_blank" rel="noreferrer">Обсудить доступ <ArrowUpRight /></a></div>}</article>)}</div></section></Shell>
  return <Shell title="Catalog" locale={locale} setLocale={setLocale}>
    <section className="standalone-hero catalog-hero catalog-intro"><div><p className="eyebrow">02 / CATALOG / PRIVATE ARCHIVE</p><h1>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'Objects with a point of view.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ OSGARD пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ.' : 'OSGARD artefacts and instruments, arranged as a personal collection. Open an object to see its contour.'}</p></div><div className="artifact-grid"><i>O</i><i>G</i><i>+</i></div></section>
    <section className="catalog-collection" aria-label="OSGARD catalogue"><div className="catalog-toolbar"><span>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ / 06 пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'COLLECTION / 06 OBJECTS'}</span><span>{ru ? 'пїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'ARCHIVE пїЅ COMMISSIONS пїЅ PAST'}</span></div><div className="catalog-grid">{catalogue.map(item => <article key={item.id} className={`catalog-card ${item.tone}${selected === item.id ? ' is-open' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelected(selected === item.id ? null : item.id) }}><div className="catalog-visual"><ModuleMark index={item.mark} className="catalog-mark"/><span className="catalog-number">{item.id}</span><span className="catalog-orbit"/></div><div className="catalog-meta"><small>{item.type}</small><h2>{item.name}</h2><span>{item.metric}</span></div><div className="catalog-open">{selected === item.id ? (ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Close object') : (ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Open object')} <ArrowUpRight /></div>{selected === item.id && <div className="catalog-detail"><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ OSGARD: пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'An OSGARD contour: provenance, function and the next route are available in the private account.'}</p><a href="https://t.me/OSGARD_world_bot" target="_blank" rel="noreferrer">{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ' : 'Discuss access'} <ArrowUpRight /></a></div>}</article>)}</div></section>
  </Shell>
}

const masters = [
  { name: 'пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ', nameEn: 'SENYOR OSMAN', role: 'FOUNDER / VISION', roleRu: 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ / пїЅпїЅпїЅпїЅпїЅпїЅпїЅ', place: 'NORTH CIRCLE', mark: 0, quote: 'A world becomes valuable when it gives people a clearer next step.' },
  { name: 'пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ', nameEn: 'AYLIN KARTINA', role: 'FOUNDER / WORLDS', roleRu: 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ / пїЅпїЅпїЅпїЅ', place: 'EAST ARCHIVE', mark: 4, quote: 'Every route is a decision made visible, then made beautiful.' },
  { name: 'пїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ', nameEn: 'TIMUR KODAR', role: 'FOUNDER / CRAFT', roleRu: 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ / пїЅпїЅпїЅпїЅпїЅпїЅпїЅ', place: 'PRIVATE STUDIO', mark: 2, quote: 'Precision is what remains when noise is removed.' },
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
  if (ru) return <Shell title="Founders" locale={locale} setLocale={setLocale}><section className="standalone-hero masters-hero founder-hero"><div className="master-portrait master-portrait-real"><img className="founder-photo" src={['/assets/founder-osman.jpg', '/assets/founder-kartina.jpg', '/assets/founder-kodar.jpg'][active]} alt="Основатель OSGARD"/><ModuleMark index={founder.mark} className="master-tamga"/></div><div><p className="eyebrow">04 / ОСНОВАТЕЛИ / {founder.place}</p><h1>Те, кто формирует мир.</h1><p>Три основателя. Три способа смотреть в будущее: защищать, соединять и превращать идею в работающую форму.</p><blockquote>«{founder.quote}»</blockquote><p className="master-current"><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][active]}</strong><span>Создатель экосистемы</span></p></div></section><section className="masters-roster founders-roster">{masters.map((item, index) => <button key={item.name} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><ModuleMark index={item.mark}/><span>0{index + 1}</span><strong>{['Осман', 'Айлин Картина', 'Тимур Кодар'][index]}</strong><small>Основатель</small></button>)}</section></Shell>
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
  return <Shell title="Club" locale={locale} setLocale={setLocale}><section className={`club-ritual ${entered ? 'is-entered' : ''}`}><div className="club-door"><div className="club-door-glow"/><OsgardLogo variant="preloader"/><span className="club-door-label">PRIVATE CIRCLE / 05</span>{!entered ? <button type="button" onClick={() => setEntered(true)}>{ru ? 'пїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅ' : 'Enter the club'} <ArrowUpRight /></button> : submitted ? <div className="club-confirm"><strong>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Request received'}</strong><span>{ru ? 'пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ: ' : 'Your contour: '}<b>{accessId}</b></span><small>{ru ? 'Telegram пїЅпїЅпїЅпїЅпїЅпїЅ. пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅ.' : 'Telegram is open. The team will continue there.'}</small></div> : <form className="club-access-form" onSubmit={submit}><label><span>{ru ? 'пїЅпїЅпїЅ' : 'Name'}</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Contact'}</span><input required type="email" value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} placeholder="you@domain.com" /></label><label><span>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅ' : 'Interest'}</span><select value={form.interest} onChange={event => setForm({ ...form, interest: event.target.value })}><option>DROPS</option><option>MEETINGS</option><option>LIBRARY</option></select></label><button type="submit">{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ' : 'Request access'} <ArrowUpRight /></button></form>}</div><div className="club-copy"><p className="eyebrow">05 / CLUB / INVITATION ONLY</p><h1>{ru ? 'пїЅпїЅпїЅ пїЅпїЅпїЅ, пїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ.' : 'For those who build meaning.'}</h1><p>{ru ? 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ, пїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅ пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ.' : 'A private circle for early access, rare lots and direct conversations with the masters.'}</p><div className="club-rooms"><span>01 / DROPS</span><span>02 / MEETINGS</span><span>03 / LIBRARY</span></div></div></section></Shell>
}


