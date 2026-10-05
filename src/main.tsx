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

function Seo({ path }: { path: string }) {
  React.useEffect(() => {
    const data = seo[path] ?? seo['/']
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
  if (path === '/games/time') return <TimePrototype />
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
