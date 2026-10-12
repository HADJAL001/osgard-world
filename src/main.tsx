import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './miniapp.css'
import './founders.css'
import './brand.css'
import './navigation.css'
import './create.css'
import './mobility.css'
import './surfaces.css'
import './time.css'
import './online.css'
import './legacy.css'
import './week.css'
import './recommendations.css'
import './archive.css'
import './profile.css'
import './community.css'
import './stream.css'
import './games-platform.css'
import './game-player.css'
import './legal.css'
import App from './App'
import MiniApp from './MiniApp'
import { AurumPage, CatalogPage, ChroniclePage, ClubPage, DevelopmentPage, MastersPage, TimeCoinPage, WorldsPage } from './Sections'
import { EntertainmentCatalog } from './EntertainmentCatalog'
import { ResultPage } from './ResultPage'
import { BusinessDiagnostic } from './BusinessDiagnostic'
import { CreatePrototype } from './CreatePrototype'
import { MobilityPrototype } from './MobilityPrototype'
import { TimePrototype } from './TimePrototype'
import { WeekSurface } from './WeekSurface'
import { Recommendations } from './Recommendations'
import { ArchiveSurface } from './ArchiveSurface'
import { ProfileSurface } from './ProfileSurface'
import { InheritPrototype, RemixPrototype } from './LegacyCreatorPrototypes'
import { OnlineGamePrototype } from './OnlineGamePrototype'
import { CoreEvents } from './CoreEvents'
import { EcosystemSurface } from './EcosystemSurfaces'
import { CommunitySurface } from './CommunitySurface'
import { StreamSurface } from './StreamSurface'
import { GAME_DETAILS, GamesPlatform } from './GamesPlatform'
import { GameDetailPage } from './GameDetailPage'
import { GamePlayer } from './GamePlayer'
import { LegalPage } from './LegalPages'

const seo: Record<string, { title: string; description: string }> = {
  '/': { title: 'OSGARD WORLD � �������� ����������', description: 'OSGARD WORLD ���������� �������� ��� ������, �����������, �������, ������� � �������� �������� �������.' },
  '/worlds': { title: '���� OSGARD � ���� ��������� ����� ����������', description: '���� ������� ����� OSGARD: ������, �����������, ������, ���� ��� � ������ ����� ���������.' },
  '/catalog': { title: '������� OSGARD � ����������� � ���������', description: '������� �������� ������������ � ���������� OSGARD � ��������� ���������� � �������.' },
  '/chronicle': { title: '������� OSGARD � ������� ����������', description: '������� �������, ��������� � ������ �������� ���������� OSGARD.' },
  '/masters': { title: '���������� OSGARD � ����, ��������� ������', description: '���������� OSGARD � �� ������� � ������, ���������, �������� � ��������.' },
  '/club': { title: '���� OSGARD � �������� ������ �������', description: '�������� ���� OSGARD ��� ������� �������, ������ ����������� � ������� ������� � ��������.' },
  '/aurum': { title: 'AURUM � ����������� ���������� OSGARD', description: 'AURUM ��������� �������� OSGARD � ������ ������� � �������� ������� ��������� ���.' },
  '/timecoin': { title: 'TimeCoin OSGARD � ������ � �������', description: 'TimeCoin � ���������� ������� ����������, ������� � ����������� ������� OSGARD.' },
  '/development': { title: 'OSGARD Development � ���������� �������� ���������', description: '���������� ������, �������� � �������� ��������� OSGARD: �� ������ �� �������.' },
  '/entertainment': { title: 'OSGARD Entertainment � ������������� ����', description: '������������� ������� ��� OSGARD. �������� ���� � ��������� � ��� ��������� ���.' },
}

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
  '/entertainment': { title: 'OSGARD Entertainment — интерактивные игры', description: 'Игры OSGARD: выбирайте мир, запускайте сессию и сохраняйте результат.' },
  '/skillcred': { title: 'SkillCred — навыки, которые остаются с вами | OSGARD', description: 'Переносимые цифровые подтверждения навыков. Проверка Ed25519 в браузере.' },
  '/games': { title: 'OSGARD PLAY — премиальная игровая платформа', description: 'Каталог игр OSGARD WORLD: браузерные миры, поиск, жанры, избранное, история и собственная экосистема цифровых продуктов.' },
  '/privacy': { title: 'Политика конфиденциальности | OSGARD PLAY', description: 'Как игровая витрина OSGARD обрабатывает локальные настройки и необязательные продуктовые события.' },
  '/terms': { title: 'Условия использования | OSGARD PLAY', description: 'Правила использования каталога браузерных игр OSGARD WORLD.' },
  '/games/time': { title: 'Империя времени — стратегия живого города | OSGARD PLAY', description: 'Управляйте казной, энергией, районами и политическими фракциями. Каждое решение меняет летопись города.' },
}

function Seo({ path }: { path: string }) {
  React.useEffect(() => {
    const gameSlug = path.startsWith('/games/info/') || path.startsWith('/games/play/') ? path.split('/')[3] : ''
    const gameMeta = gameSlug && Object.prototype.hasOwnProperty.call(GAME_DETAILS, gameSlug) ? GAME_DETAILS[gameSlug as keyof typeof GAME_DETAILS] : null
    const detailTitle = path.startsWith('/games/play/') ? `${gameMeta?.title ?? 'Игра'} — игровая сессия | OSGARD PLAY` : `${gameMeta?.title ?? 'Игровой мир'} | OSGARD PLAY`
    const data = cleanSeo[path] ?? (gameMeta ? { title: detailTitle, description: `${gameMeta.tagline} ${gameMeta.description}` } : cleanSeo['/'])
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
  if (path === '/games') return <><Seo path="/games" /><GamesPlatform /></>
  if (path.startsWith('/games/play/')) return <><Seo path={path} /><GamePlayer gameId={path.split('/')[3] || ''} /></>
  if (path.startsWith('/games/info/')) return <><Seo path={path} /><GameDetailPage slug={path.split('/')[3] || ''} /></>
  if (path === '/privacy') return <><Seo path="/privacy" /><LegalPage kind="privacy" /></>
  if (path === '/terms') return <><Seo path="/terms" /><LegalPage kind="terms" /></>
  if (path === '/miniapp') return <MiniApp />
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
  const page = path === '/marcosa' ? <EcosystemSurface kind="marcosa" /> : path === '/media' ? <EcosystemSurface kind="media" /> : path === '/core-events' ? <CoreEvents /> : path === '/mobility' ? <MobilityPrototype /> : path === '/create' ? <CreatePrototype /> : path === '/business' ? <BusinessDiagnostic /> : path.startsWith('/r/') ? <ResultPage id={path.split('/')[2] || '1842'} /> : path === '/worlds' ? <WorldsPage locale={locale} setLocale={setLocale} /> : path === '/aurum' ? <AurumPage locale={locale} setLocale={setLocale} /> : path === '/timecoin' ? <TimeCoinPage locale={locale} setLocale={setLocale} /> : path === '/development' ? <DevelopmentPage locale={locale} setLocale={setLocale} /> : path === '/catalog' ? <CatalogPage locale={locale} setLocale={setLocale} /> : path === '/chronicle' ? <EcosystemSurface kind="chronicle" /> : path === '/masters' ? <MastersPage locale={locale} setLocale={setLocale} /> : path === '/club' ? <ClubPage locale={locale} setLocale={setLocale} /> : path === '/entertainment' ? <EntertainmentCatalog locale={locale} setLocale={setLocale} /> : <App />
  return <><Seo path={path} />{page}</>
}
createRoot(document.getElementById('root')!).render(<StrictMode><RoutedRoot /></StrictMode>)
