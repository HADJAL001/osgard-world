import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const main = await read('src/main.tsx');
const app = await read('src/App.tsx');
const miniapp = await read('src/MiniApp.tsx');
const deferred = await read('src/DeferredLivingGlobe.tsx');

assert.match(main, /React\.lazy\(\(\)\s*=>\s*import\('\.\/MiniApp'\)\)/);
for (const moduleName of ['Sections', 'GameDetailPage', 'TimePrototype', 'OnlineGamePrototype', 'LegacyCreatorPrototypes', 'EcosystemSurfaces', 'MiniApp']) {
  assert.ok(main.includes(`import('./${moduleName}')`), 'Route must be dynamically imported: ' + moduleName);
}
for (const forbidden of [
  "from './Sections'", "from './GameDetailPage'", "from './TimePrototype'",
  "from './OnlineGamePrototype'", "from './LegacyCreatorPrototypes'", "from './EcosystemSurfaces'", "from './MiniApp'",
]) assert.equal(main.includes(forbidden), false, 'Route is still statically imported: ' + forbidden);

for (const stylesheet of ['miniapp.css','create.css','mobility.css','surfaces.css','time.css','online.css','legacy.css','week.css','recommendations.css','archive.css','profile.css','community.css','stream.css']) {
  assert.equal(main.includes(`import './${stylesheet}'`), false, 'Route stylesheet remains in the initial graph: ' + stylesheet);
}
assert.ok(app.includes("import { DeferredLivingGlobe } from './DeferredLivingGlobe'"));
assert.ok(app.includes('<DeferredLivingGlobe enabled={ready} />'), 'Home should not begin the globe download before the preloader finishes');
assert.ok(miniapp.includes("import { DeferredLivingGlobe } from './DeferredLivingGlobe'"));
assert.equal(app.includes("from './LivingGlobe'"), false, 'Home must not statically import Three.js');
assert.equal(miniapp.includes("from './LivingGlobe'"), false, 'MiniApp must not statically import Three.js');
assert.ok(deferred.includes("import('./LivingGlobe')"), 'Three.js must be a dynamic import');
assert.ok(deferred.includes("prefers-reduced-motion: reduce"), 'Reduced-motion users should retain the lightweight poster');
assert.ok(deferred.includes('1400') && deferred.includes('850'), '3D loading should be deferred beyond first paint');
assert.ok(deferred.includes('!enabled') && deferred.includes('[enabled]'), 'The globe must wait for the page visibility/preloader gate');
const styleOwners = {
  'MiniApp.tsx': 'miniapp.css',
  'CreatePrototype.tsx': 'create.css',
  'MobilityPrototype.tsx': 'mobility.css',
  'TimePrototype.tsx': 'time.css',
  'OnlineGamePrototype.tsx': 'online.css',
  'LegacyCreatorPrototypes.tsx': 'legacy.css',
  'WeekSurface.tsx': 'week.css',
  'Recommendations.tsx': 'recommendations.css',
  'ArchiveSurface.tsx': 'archive.css',
  'ProfileSurface.tsx': 'profile.css',
  'CommunitySurface.tsx': 'community.css',
  'StreamSurface.tsx': 'stream.css',
  'EcosystemSurfaces.tsx': 'surfaces.css',
  'Sections.tsx': 'surfaces.css',
  'CoreEvents.tsx': 'mobility.css',
};
for (const [component, stylesheet] of Object.entries(styleOwners)) {
  const source = await readFile(new URL('../src/' + component, import.meta.url), 'utf8');
  assert.ok(source.includes(`import './${stylesheet}'`), component + ' must own its route stylesheet');
}
assert.ok(main.includes('React.Suspense'), 'Route chunks must have a stable loading boundary');

console.log('PASS route-splitting contract: page chunks and route CSS are on-demand; Three.js globe is deferred and respects reduced-motion.');
