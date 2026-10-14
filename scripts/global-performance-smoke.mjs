import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const main=read('src/main.tsx'), app=read('src/App.tsx'), css=read('src/styles.css');
const ru=read('public/games/index.html'), en=read('public/games/en/index.html');
const enCss=read('public/games/en/styles.css'), enJs=read('public/games/en/app.js');
const sitemap=read('public/sitemap.xml'), matrix=read('scripts/production-route-matrix.mjs');
const pkg=JSON.parse(read('package.json'));
const ids=[...en.matchAll(/<article class="game-card" data-game="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(ids,['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid']);
assert.ok(main.includes("const App = React.lazy(() => import('./App'))"));
assert.ok(main.includes('<React.Suspense fallback={<RouteLoading />}>'));
assert.ok(main.includes("const GameDetailPage = React.lazy(() => import('./GameDetailPage')"));
for(const name of ['MiniApp','Sections','TimePrototype','OnlineGamePrototype','LegacyCreatorPrototypes','CommunitySurface','StreamSurface']){
 assert.ok(main.includes("import('./"+name+"')"),'Missing dynamic route chunk: '+name);
 assert.ok(!main.split('\n').some(line=>line.startsWith('import ')&&line.includes("from './"+name+"'")),'Route must not be eager: '+name);
}
assert.ok(app.includes("const LazyLivingGlobe = lazy(() => import('./LivingGlobe')"));
assert.ok(app.includes('new IntersectionObserver')&&app.includes("rootMargin: '100px'"));
assert.ok(!app.includes("import { LivingGlobe } from './LivingGlobe'"));
assert.ok(app.includes("className=\\\"play-catalog-link\\\" href={ru ? '/games/' : '/games/en/'}") && app.includes("'/games/en/?utm_source=osgard_world&utm_medium=entertainment&utm_campaign=between_worlds'"), 'Homepage Games entry should preserve the selected language and campaign attribution');
assert.ok(css.includes('.globe-mount{')&&css.includes('.route-loading{')&&css.includes('prefers-reduced-motion:reduce'));
const routeStyles=[['src/MiniApp.tsx','miniapp.css'],['src/Sections.tsx','founders.css'],['src/Sections.tsx','surfaces.css'],['src/CreatePrototype.tsx','create.css'],['src/MobilityPrototype.tsx','mobility.css'],['src/TimePrototype.tsx','time.css'],['src/OnlineGamePrototype.tsx','online.css'],['src/LegacyCreatorPrototypes.tsx','legacy.css'],['src/WeekSurface.tsx','week.css'],['src/Recommendations.tsx','recommendations.css'],['src/ArchiveSurface.tsx','archive.css'],['src/ProfileSurface.tsx','profile.css'],['src/CommunitySurface.tsx','community.css'],['src/StreamSurface.tsx','stream.css']];
for(const [source,name] of routeStyles){
 assert.ok(read(source).includes("import './"+name+"'"),'Route CSS is not owned by lazy component: '+source);
 assert.ok(!main.includes("import './"+name+"'"),'Route CSS remains eager: '+name);
}
assert.ok(en.includes('<html lang="en">')&&en.includes('rel="canonical" href="https://osgard.world/games/en/"'));
assert.ok(en.includes('hreflang="en"')&&en.includes('hreflang="ru"')&&ru.includes('href="/games/en/"')&&ru.includes('hreflang="en"'));
assert.ok(sitemap.includes('<loc>https://osgard.world/games/en/</loc>'));
for(const filter of ['tactical','strategy','puzzle','arcade','creative'])assert.ok(en.includes('data-filter="'+filter+'"'));
assert.ok(enJs.includes('osgard.games.favorites.v1')&&enJs.includes('osgard.games.recent.v1')&&enJs.includes("event.key !== '/'"));
assert.ok(!enJs.includes('XMLHttpRequest')&&!enJs.includes('gtag('));
const hosts=['osgardbewworld.com','o2system.art','senjorio.com','superday.run','marcosa.club','myosa.world','gold-glamour.online','gardvpn.is','osgardos.com','osgardvanguard.studio'];
for(const host of hosts)assert.ok(en.includes('https://'+host+'/?utm_source=osgard_games'),'Missing owner-listed project link: '+host);
assert.equal((en.match(/utm_campaign=ecosystem_directory/g)||[]).length,10);
assert.ok(en.includes('mailto:osman.osmanov0099@gmail.com')&&en.includes('https://wa.me/79640027222'));
assert.ok(en.includes('no ad network or live checkout is represented as active'));
assert.ok(enCss.includes('@media(max-width:760px)')&&enCss.includes('prefers-reduced-motion:reduce')&&enCss.includes(':focus-visible'));
assert.equal(pkg.scripts['qa:global-performance'],'node scripts/global-performance-smoke.mjs');
assert.ok(matrix.includes("'/games/en/'")&&matrix.includes("route === '/games/en/app.js'")&&matrix.includes("route === '/games/en/styles.css'"));
assert.ok(read('scripts/optimize-games-static-assets.mjs').includes("'en/styles.css', 'en/app.js'"));
console.log('PASS global performance: lazy routes, deferred 3D, route-owned CSS, bilingual SEO, 11 games, 10 attributed project links, local-only state and compressed delivery.');
