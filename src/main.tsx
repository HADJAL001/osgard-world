import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './founders.css'
import './brand.css'
import './navigation.css'
import App from './App'

// Route-level code splitting: rarely visited surfaces stay out of the initial bundle.
const MiniApp = React.lazy(() => import('./MiniApp'))
const AurumPage = React.lazy(() => import('./Sections').then(module => ({ default: module.AurumPage })))
const CatalogPage = React.lazy(() => import('./Sections').then(module => ({ default: module.CatalogPage })))
const ChroniclePage = React.lazy(() => import('./Sections').then(module => ({ default: module.ChroniclePage })))
const ClubPage = React.lazy(() => import('./Sections').then(module => ({ default: module.ClubPage })))
const DevelopmentPage = React.lazy(() => import('./Sections').then(module => ({ default: module.DevelopmentPage })))
const EntertainmentPage = React.lazy(() => import('./Sections').then(module => ({ default: module.EntertainmentPage })))
const MastersPage = React.lazy(() => import('./Sections').then(module => ({ default: module.MastersPage })))
const TimeCoinPage = React.lazy(() => import('./Sections').then(module => ({ default: module.TimeCoinPage })))
const WorldsPage = React.lazy(() => import('./Sections').then(module => ({ default: module.WorldsPage })))
const ResultPage = React.lazy(() => import('./ResultPage').then(module => ({ default: module.ResultPage })))
const BusinessDiagnostic = React.lazy(() => import('./BusinessDiagnostic').then(module => ({ default: module.BusinessDiagnostic })))
const CreatePrototype = React.lazy(() => import('./CreatePrototype').then(module => ({ default: module.CreatePrototype })))
const MobilityPrototype = React.lazy(() => import('./MobilityPrototype').then(module => ({ default: module.MobilityPrototype })))
const TimePrototype = React.lazy(() => import('./TimePrototype').then(module => ({ default: module.TimePrototype })))
const WeekSurface = React.lazy(() => import('./WeekSurface').then(module => ({ default: module.WeekSurface })))
const Recommendations = React.lazy(() => import('./Recommendations').then(module => ({ default: module.Recommendations })))
const ArchiveSurface = React.lazy(() => import('./ArchiveSurface').then(module => ({ default: module.ArchiveSurface })))
const ProfileSurface = React.lazy(() => import('./ProfileSurface').then(module => ({ default: module.ProfileSurface })))
const InheritPrototype = React.lazy(() => import('./LegacyCreatorPrototypes').then(module => ({ default: module.InheritPrototype })))
const RemixPrototype = React.lazy(() => import('./LegacyCreatorPrototypes').then(module => ({ default: module.RemixPrototype })))
const OnlineGamePrototype = React.lazy(() => import('./OnlineGamePrototype').then(module => ({ default: module.OnlineGamePrototype })))
const CoreEvents = React.lazy(() => import('./CoreEvents').then(module => ({ default: module.CoreEvents })))
const EcosystemSurface = React.lazy(() => import('./EcosystemSurfaces').then(module => ({ default: module.EcosystemSurface })))
const CommunitySurface = React.lazy(() => import('./CommunitySurface').then(module => ({ default: module.CommunitySurface })))
const StreamSurface = React.lazy(() => import('./StreamSurface').then(module => ({ default: module.StreamSurface })))
const GameDetailPage = React.lazy(() => import('./GameDetailPage').then(module => ({ default: module.GameDetailPage })))

const cleanSeo: Record<string, { title: string; description: string }> = {
  '/': { title: 'OSGARD WORLD — цифровая экосистема', description: 'OSGARD объединяет продукты для защиты, мобильности, бизнеса, времени и создания цифровых решений.' },
  '/worlds': { title: 'Миры OSGARD — семь самостоятельных продуктов', description: 'Выберите мир OSGARD: защита, мобильность, бизнес, время и создание цифровых продуктов.' },
  '/catalog': { title: 'Каталог OSGARD — продукты и решения', description: 'Каталог самостоятельных продуктов OSGARD с понятными условиями и маршрутами.' },
  '/chronicle': { title: 'Хроника OSGARD — история экосистемы', description: 'События, продукты и ключевые этапы развития OSGARD.' },
  '/masters': { title: 'Мастера OSGARD — люди и команды', description: 'Команды OSGARD и их работа над продуктами, играми и цифровыми решениями.' },
  '/club': { title: 'Клуб OSGARD — закрытое пространство', description: 'Клуб OSGARD для раннего доступа, общения и совместного развития продуктов.' },
  '/aurum': { title: 'AURUM — координационный интеллект OSGARD', description: 'AURUM связывает продукты OSGARD в единую картину и помогает выбрать следующий шаг.' },
  '/timecoin': { title: 'TimeCoin OSGARD — правила и условия', description: 'Правила внутренней бонусной единицы OSGARD для доступа, статуса и специальных условий.' },
  '/development': { title: 'OSGARD Development — создание цифровых продуктов', description: 'Разработка сайтов, приложений и MVP-платформ от идеи до запуска.' },
  '/entertainment': { title: 'OSGARD Entertainment — интерактивные игры', description: 'Одиннадцать игр OSGARD: играйте в CIVIC CASCADE, PATINA Atelier, SIGNAL RUN, CASCADE LAB и другие игровые миры.' },
  '/skillcred': { title: 'SkillCred — навыки, которые остаются с вами | OSGARD', description: 'Переносимые цифровые подтверждения навыков. Проверка Ed25519 в браузере.' },
  '/games/time': { title: 'Империя времени — стратегия живого города | OSGARD PLAY', description: 'Управляйте казной, энергией, районами и политическими фракциями. Каждое решение меняет летопись города.' },
  '/game/cascade-lab': { title: 'CASCADE LAB — физическая головоломка | OSGARD PLAY', description: 'Собирайте цепные реакции из шести механизмов и исследуйте игровую физику. Самостоятельная браузерная головоломка.' },
  '/game/aether-grid': { title: 'AETHER GRID — ежедневная логическая головоломка | OSGARD PLAY', description: 'Соединяйте узлы сети, решайте общий ежедневный вызов и сравнивайте локальные рекорды с друзьями.' },
}

function Seo({ path }: { path: string }) {
  React.useEffect(() => {
    const data = cleanSeo[path] ?? cleanSeo['/']
    const canonical = `https://osgard.world${path === '/' ? '/' : path}`
    document.title = data.title
    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element) }
      element.setAttribute(attribute, value)
    }
    setMeta('meta[name="description"]', 'content', data.description)
    setMeta('meta[property="og:title"]', 'content', data.title)
    setMeta('meta[property="og:description"]', 'content', data.description)
    setMeta('meta[property="og:url"]', 'content', canonical)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = canonical
    const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.description, url: canonical, isPartOf: { '@type': 'WebSite', name: 'OSGARD WORLD', url: 'https://osgard.world/' } }
    let script = document.head.querySelector<HTMLScriptElement>('script[data-route-seo]')
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.routeSeo = 'true'; document.head.appendChild(script) }
    script.textContent = JSON.stringify(jsonLd)
  }, [path])
  return null
}

const path = location.pathname.replace(/\/+$/, '') || '/'

function RoutedRoot() {
  const [locale, setLocale] = React.useState<'ru' | 'en'>('ru')
  if (path === '/miniapp') return <MiniApp />
  const gameMatch = path.match(/^\/game\/([a-z0-9-]+)$/)
  if (gameMatch) return <GameDetailPage slug={gameMatch[1]} />
  if (path === '/games/time' || path === '/games/time-empire') return <><Seo path="/games/time" /><TimePrototype /></>
  if (path === '/play/swarm') return <OnlineGamePrototype game="swarm" />
  if (path === '/play/null-shift') return <OnlineGamePrototype game="null" />
  if (path === '/play/inherit') return <InheritPrototype />
  if (path === '/play/remix') return <RemixPrototype />
  if (path === '/week') return <WeekSurface />
  if (path === '/next') return <Recommendations />
  if (path === '/archive') return <ArchiveSurface />
  if (path === '/profile') return <ProfileSurface />
  if (path === '/community') return <CommunitySurface />
  if (path === '/stream') return <StreamSurface />
  if (path === '/archive') return <ArchiveSurface />
  const page = path === '/marcosa' ? <EcosystemSurface kind="marcosa" /> : path === '/media' ? <EcosystemSurface kind="media" /> : path === '/core-events' ? <CoreEvents /> : path === '/mobility' ? <MobilityPrototype /> : path === '/create' ? <CreatePrototype /> : path === '/business' ? <BusinessDiagnostic /> : path.startsWith('/r/') ? <ResultPage id={path.split('/')[2] || '1842'} /> : path === '/worlds' ? <WorldsPage locale={locale} setLocale={setLocale} /> : path === '/aurum' ? <AurumPage locale={locale} setLocale={setLocale} /> : path === '/timecoin' ? <TimeCoinPage locale={locale} setLocale={setLocale} /> : path === '/development' ? <DevelopmentPage locale={locale} setLocale={setLocale} /> : path === '/catalog' ? <CatalogPage locale={locale} setLocale={setLocale} /> : path === '/chronicle' ? <EcosystemSurface kind="chronicle" /> : path === '/masters' ? <MastersPage locale={locale} setLocale={setLocale} /> : path === '/club' ? <ClubPage locale={locale} setLocale={setLocale} /> : path === '/entertainment' ? <EntertainmentPage locale={locale} setLocale={setLocale} /> : <App />
  return <><Seo path={path} />{page}</>
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <React.Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050b1a', color: '#d7dbe0', fontFamily: 'system-ui, sans-serif' }}>Загрузка OSGARD…</div>}>
      <RoutedRoot />
    </React.Suspense>
  </StrictMode>
)
