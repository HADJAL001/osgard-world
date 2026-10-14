import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveIosBuildNumber, resolveIosMarketingVersion } from './ios-release-version.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builtWeb = process.argv.includes('--built-web');
const read = (path) => readFileSync(join(root, path), 'utf8');
const mustExist = (path) => assert.ok(existsSync(join(root, path)), 'Missing required iOS artifact: ' + path);
const config = JSON.parse(read('capacitor.config.json'));
const listing = JSON.parse(read('appstore/metadata.ru.json'));
const codemagic = read('codemagic.yaml');
const prep = read('scripts/prepare-ios-app.mjs');
const iconGenerator = read('scripts/generate-ios-app-icon.mjs');
const privacy = read('mobile/PrivacyInfo.xcprivacy');
const commerceServer = read('services/osgard-commerce-api/src/server.mjs');
const consentedAnalytics = read('public/games/consented-analytics.js');
const referralAnalytics = read('public/games/game-session-recommendations.js');
const lifecycleAnalytics = read('public/games/player-lifecycle.js');
const guide = read('docs/IOS_APP_STORE_CODEMAGIC_RU.md');
const supportPage = read('public/support/osgard-play/index.html');
const gamesCatalog = read('public/games/index.html');
const gameManifest = read('src/core/manifest.ts');
const sitemap = read('public/sitemap.xml');

const bundledGamePages = {
  'null-shift': 'dist/games/null-shift/index.html',
  time: 'dist/games/time/index.html',
  swarm: 'dist/games/swarm/index.html',
  inherit: 'dist/games/inherit/index.html',
  remix: 'dist/games/remix/index.html',
  'civic-cascade': 'dist/games/civic-cascade/index.html',
  patina: 'dist/games/patina/index.html',
  'signal-run': 'dist/games/signal-run/index.html',
  'cascade-lab': 'dist/games/cascade-lab/index.html',
  'afterimage-run': 'dist/games/afterimage-run/index.html',
  'aether-grid': 'dist/games/aether-grid/index.html',
  'heist-echo': 'dist/games/heist-echo/index.html',
};
const extractCatalogGameIds = (html) =>
  Array.from(html.matchAll(/<article\b[^>]*\bdata-game="([^"]+)"/g), (match) => match[1]);
const sourceCatalogGameIds = extractCatalogGameIds(gamesCatalog);
const manifestGamesMatch = gameManifest.match(/export const OSGARD_GAMES:[\s\S]*?=\s*\[([\s\S]*?)\n\]/);
assert.ok(manifestGamesMatch, 'The shared OSGARD_GAMES launch registry must be parseable.');
const manifestGameIds = Array.from(manifestGamesMatch[1].matchAll(/\bid:\s*'([^']+)'/g), (match) => match[1]);
const expectedBundledGameIds = Object.keys(bundledGamePages).sort();
assert.equal(new Set(sourceCatalogGameIds).size, sourceCatalogGameIds.length, 'Visible game card IDs must be unique.');
assert.equal(new Set(manifestGameIds).size, manifestGameIds.length, 'The OSGARD_GAMES registry must not contain duplicate IDs.');
assert.deepEqual([...sourceCatalogGameIds].sort(), expectedBundledGameIds,
  'Every visible Games card must have exactly one declared local iOS page, including HEIST//ECHO.');
assert.deepEqual([...manifestGameIds].sort(), expectedBundledGameIds,
  'The shared OSGARD_GAMES registry and iOS game-page map must contain the same game IDs.');
const mobileRouteRewriterMatch = prep.match(/const routes = new Set\(\[([\s\S]*?)\]\);/);
assert.ok(mobileRouteRewriterMatch, 'iOS preparation script must declare a route-rewrite allowlist.');
const mobileRouteRewriteIds = Array.from(mobileRouteRewriterMatch[1].matchAll(/'([^']+)'/g), (match) => match[1]);
assert.deepEqual([...mobileRouteRewriteIds].sort(), expectedBundledGameIds,
  'Every React game-detail URL in the web catalogue must be rewritten to its local game page in the iOS bundle.');
const releaseTagPreflight = read('scripts/ios-release-tag-preflight.mjs');

assert.equal(config.appId, 'com.osgardworld.play');
assert.equal(config.appName, 'OSGARD PLAY');
assert.equal(config.webDir, 'dist');
assert.equal(config.ios.backgroundColor, '#080A0B');
assert.equal(listing.bundleId, config.appId, 'App Store listing Bundle ID must match the Capacitor app identity.');
assert.equal(listing.name, config.appName, 'App Store listing name must match the installed app name.');
assert.ok(listing.name.length >= 2 && listing.name.length <= 30, 'App Store name must fit the 30-character limit.');
assert.ok(listing.subtitle.length > 0 && listing.subtitle.length <= 30, 'App Store subtitle must fit the 30-character limit.');
assert.ok(listing.promotionalText.length <= 170, 'App Store promotional text must fit the 170-character limit.');
assert.ok(listing.description.length > 0 && listing.description.length <= 4000, 'App Store description must fit the 4,000-character limit.');
assert.ok(Buffer.byteLength(listing.keywords, 'utf8') <= 100, 'App Store keywords must fit the 100-byte limit.');
assert.equal(new URL(listing.supportUrl).origin, 'https://osgard.world', 'Support URL must use the official HTTPS domain.');
assert.equal(new URL(listing.privacyPolicyUrl).origin, 'https://osgard.world', 'Privacy policy URL must use the official HTTPS domain.');
assert.equal(new URL(listing.marketingUrl).origin, 'https://osgard.world', 'Marketing URL must use the official HTTPS domain.');
assert.ok(String(listing.copyright).includes('CONFIRMATION'), 'Copyright must remain flagged for legal rightsholder confirmation.');
assert.equal(resolveIosMarketingVersion({ CM_TAG: 'osgard-play-v1.2.3' }), '1.2.3');
assert.equal(resolveIosMarketingVersion({ APP_VERSION: '2.4.0' }), '2.4.0');
assert.equal(resolveIosMarketingVersion({}), '1.0.0', 'Manual builds retain a documented default version');
assert.equal(resolveIosBuildNumber({ BUILD_NUMBER: '42' }), '42');
assert.equal(resolveIosBuildNumber({}), '1', 'Local preflight has a deterministic fallback build number');
assert.throws(() => resolveIosMarketingVersion({ CM_TAG: 'osgard-play-vnext' }), /Expected osgard-play-vX\.Y\.Z/);
assert.throws(() => resolveIosMarketingVersion({ CM_TAG: 'osgard-play-v1.2.3', APP_VERSION: '1.2.4' }), /does not match/);
assert.throws(() => resolveIosMarketingVersion({ APP_VERSION: 'release-1.0.0' }), /numeric X\.Y\.Z/);
assert.throws(() => resolveIosBuildNumber({ BUILD_NUMBER: '0' }), /positive integer/);
assert.ok(!Object.hasOwn(config, 'server') || !config.server.url, 'App must bundle local pages, not a remote website wrapper.');
assert.ok(codemagic.includes('app_store_connect: OSGARD_PLAY_ASC'), 'App Store Connect integration name missing.');
assert.ok(codemagic.includes('distribution_type: app_store'), 'Apple App Store distribution signing missing.');
assert.ok(codemagic.includes('submit_to_testflight: true'), 'First release must deliver to TestFlight.');
assert.ok(!/submit_to_app_store\s*:\s*true/.test(codemagic), 'Public App Review must stay manual until device checks and listing are complete.');
for (const version of ['@capacitor/core@8.5.3', '@capacitor/cli@8.5.3', '@capacitor/ios@8.5.3', '@capacitor/share@8.0.1']) {
  assert.ok(codemagic.includes(version), 'Pinned native dependency missing: ' + version);
}
const xcodeSelector = codemagic.match(/^\s+xcode:\s*([^\s#]+)/m)?.[1];
assert.ok(xcodeSelector === 'latest' || Number.parseInt(String(xcodeSelector || '').split('.')[0], 10) >= 26,
  'App Store uploads require Xcode 26 or later with the iOS 26 SDK; do not pin an older Codemagic runner.');
assert.ok(codemagic.includes('xcode-project build-ipa'), 'IPA archive stage missing.');
assert.ok(codemagic.includes('script: node scripts/ios-release-tag-preflight.mjs'), 'Codemagic must validate its release tag before doing expensive work.');
assert.ok(codemagic.includes('npm run qa:ios-appstore'), 'Codemagic must run the source preflight during the iOS build.');
assert.ok(releaseTagPreflight.includes('resolveIosMarketingVersion') && prep.includes('resolveIosMarketingVersion') && prep.includes('resolveIosBuildNumber'), 'Xcode project must use the validated release version and build number.');
for (const command of [
  'npm run qa:games-portal',
  'npm run qa:games-detail',
  'npm run qa:null-shift',
  'npm run qa:games-model',
  'npm run qa:osgard-select',
  'npm run qa:consented-analytics-queue',
  'npm run qa:ecosystem'
]) assert.ok(codemagic.includes(command), 'TestFlight must run the required game/growth smoke: ' + command);
assert.ok(guide.includes('TestFlight') && guide.includes('capacitor://localhost') && guide.includes('App Review Guidelines'), 'Release guide is missing signing, CORS, or Apple-review notes.');
assert.ok(supportPage.includes('mailto:osman.osmanov0099@gmail.com') && supportPage.includes('href="/privacy/"'), 'App Store Support URL must provide a real contact and privacy-policy link.');
assert.ok(gamesCatalog.includes('href="/support/osgard-play/"'), 'The public Games catalogue must link to its support page.');
assert.ok(gamesCatalog.includes('/games/device-fit.css?v=__OSGARD_BUILD_VERSION__') && gamesCatalog.includes('/games/device-fit.js?v=__OSGARD_BUILD_VERSION__'), 'Smart Launch assets must be versioned in the public catalogue.');
const gamesLazyStart = gamesCatalog.indexOf('<script id="games-lazy-runtime">');
const gamesLazyEnd = gamesCatalog.indexOf('</script>', gamesLazyStart);
const gamesLazyRuntime = gamesLazyStart >= 0 && gamesLazyEnd > gamesLazyStart ? gamesCatalog.slice(gamesLazyStart, gamesLazyEnd) : '';
assert.ok(gamesLazyRuntime.includes("loadScript('experiment-core.js')") && gamesLazyRuntime.includes("loadScript('experiment-runtime.js')") && gamesLazyRuntime.includes("script.src=versioned('/games/'+path)"), 'Product experiment assets must remain versioned and consent-gated in the public catalogue.');
assert.ok(sitemap.includes('https://osgard.world/support/osgard-play/'), 'The support URL must be present in sitemap.xml.');
assert.ok(read('docs/IOS_APP_STORE_LISTING_RU.md').includes('https://osgard.world/support/osgard-play/'), 'App Store listing draft must point to the published app-support page.');
assert.ok(privacy.includes('<key>NSPrivacyTracking</key>') && privacy.includes('<false/>'), 'Privacy manifest must declare tracking state.');
assert.ok(commerceServer.includes('capacitor://localhost'), 'Default Commerce API CORS must allow the Capacitor local origin.');
for (const [label, source] of [['consented analytics', consentedAnalytics], ['referral analytics', referralAnalytics], ['game lifecycle', lifecycleAnalytics]]) {
  assert.ok(source.includes("parsed.origin === 'https://osgard.world'") || source.includes("parsed.origin==='https://osgard.world'") || source.includes("parsedBase.origin==='https://osgard.world'"), 'iOS must allow only the fixed OSGARD HTTPS Commerce gateway in ' + label + '.');
}
assert.ok(prep.includes('IOS_COMMERCE_API_BASE_URL') && prep.includes('OSGARD_PUBLIC_ORIGIN') && prep.includes('/games/null-shift/'), 'Native origin, public share-link and mobile game fixes missing.');
assert.ok(iconGenerator.includes('AppIcon-1024.png') && iconGenerator.includes('Contents.json'), 'App Store icon generator is incomplete.');

const tempIcons = join(tmpdir(), 'osgard-ios-icon-check-' + process.pid);
try {
  const result = spawnSync(process.execPath, [join(root, 'scripts/generate-ios-app-icon.mjs'), '--output-dir', tempIcons], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, 'Icon generator failed: ' + String(result.stderr || result.stdout || '').slice(-1200));
  const manifest = JSON.parse(readFileSync(join(tempIcons, 'Contents.json'), 'utf8'));
  assert.ok(manifest.images.some((image) => image.filename === 'AppIcon-1024.png' && image.size === '1024x1024'), '1024x1024 App Store marketing icon missing.');
  assert.ok(manifest.images.length >= 18, 'iPhone/iPad icon variants missing.');
  const pngPath = join(tempIcons, 'AppIcon-1024.png');
  const png = readFileSync(pngPath);
  assert.equal(png.readUInt32BE(0), 0x89504e47, 'Generated icon is not PNG.');
  assert.equal(png.readUInt32BE(16), 1024, 'App Store icon width must be 1024 px.');
  assert.equal(png.readUInt32BE(20), 1024, 'App Store icon height must be 1024 px.');
} finally {
  rmSync(tempIcons, { recursive: true, force: true });
}

if (builtWeb) {
  for (const path of [
    'dist/index.html', 'dist/games/index.html', 'dist/support/osgard-play/index.html',
    'dist/games/osgard-native-share.js', 'dist/games/commerce-config.json',
    'dist/games/device-fit.css', 'dist/games/device-fit.js', 'dist/games/experiment-core.js', 'dist/games/experiment-runtime.js',
    ...Object.values(bundledGamePages),
  ]) mustExist(path);
  const catalog = read('dist/games/index.html');
  const builtCatalogGameIds = extractCatalogGameIds(catalog);
  assert.equal(new Set(builtCatalogGameIds).size, builtCatalogGameIds.length, 'Packaged game card IDs must be unique.');
  assert.deepEqual([...builtCatalogGameIds].sort(), expectedBundledGameIds,
    'The packaged iOS catalogue and the source catalogue must ship all 12 locally runnable games.');
  const apiConfig = JSON.parse(read('dist/games/commerce-config.json'));
  assert.equal(new URL(apiConfig.apiBaseUrl).protocol, 'https:', 'Native API must use HTTPS.');
  assert.ok(catalog.includes('/games/osgard-native-share.js'), 'Native share bridge not injected into the catalogue.');
  assert.ok(catalog.includes('href="/support/osgard-play/"'), 'The packaged Games catalogue must link to the support page.');
  assert.ok(catalog.includes('WEBGL · iOS') || catalog.includes('WEBGL / iOS'), 'Mobile NULL//SHIFT label not updated.');
  assert.ok(catalog.includes('/games/null-shift/index.html'), 'iOS catalogue must open the bundled WebGL version.');
  assert.ok(!/href=['"]\/game\/(?:null-shift|time|swarm|inherit|remix|civic-cascade|patina|signal-run|cascade-lab|afterimage-run|aether-grid|heist-echo)['"]/.test(catalog),
    'Standalone catalogue route should not go through the React web SPA.');
  const shell = read('dist/index.html');
  assert.ok(shell.includes('OSGARD PLAY') && shell.includes('location.replace("/games/")'), 'App shell must land directly in the local Games hub.');
  const gamePage = read('dist/games/null-shift/index.html');
  assert.ok(gamePage.includes('osgard-native-share.js'), 'Native share bridge must be loaded on the local game.');
  const configText = readFileSync(join(root, 'dist/games/commerce-config.json'), 'utf8');
  assert.ok(!/sk_(?:live|test)_|whsec_|-----BEGIN (?:PRIVATE|RSA) KEY-----/.test(configText), 'Client config must not contain payment secrets.');
  console.log('PASS iOS web bundle: local Games hub, all 12 registry-aligned game entrypoints, iOS-safe NULL//SHIFT route, native share, HTTPS API config and no client payment secrets.');
} else {
  console.log('PASS iOS source preflight: Capacitor app identity, TestFlight-only Codemagic workflow, pinned Capacitor 8 packages, privacy manifest, release guide and generated 1024px icon set.');
}
