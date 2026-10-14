import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveIosBuildNumber, resolveIosMarketingVersion } from './ios-release-version.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const args = new Set(process.argv.slice(2));
const webOnly = args.has('--web-only');
const iosOnly = args.has('--ios-project');
if (webOnly && iosOnly) throw new Error('Choose one mode at a time.');

function assertFile(path, label) {
  if (!existsSync(path)) throw new Error(label + ' is missing: ' + path);
}
function walk(dir) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}
function replaceFile(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) writeFileSync(path, after);
  return after;
}

function prepareWeb() {
  const gamesDir = join(dist, 'games');
  const catalog = join(gamesDir, 'index.html');
  assertFile(join(dist, 'index.html'), 'Vite root bundle');
  const builtAppIndex = readFileSync(join(dist, 'index.html'), 'utf8');
  assertFile(catalog, 'Games catalogue');
  assertFile(join(gamesDir, 'null-shift', 'index.html'), 'Mobile WebGL NULL//SHIFT game');
  assertFile(join(gamesDir, 'heist-echo', 'index.html'), 'HEIST//ECHO standalone game');
  assertFile(join(gamesDir, 'osgard-native-share.js'), 'Native share bridge bundle');
  assertFile(join(gamesDir, 'commerce-config.json'), 'Commerce config');

  const apiBase = String(process.env.IOS_COMMERCE_API_BASE_URL || 'https://osgard.world/commerce-api').trim().replace(/\/+$/, '');
  let url;
  try { url = new URL(apiBase); } catch { throw new Error('IOS_COMMERCE_API_BASE_URL must be an absolute HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'osgard.world' ||
      !['/', '/commerce-api'].includes(url.pathname.replace(/\/+$/, '') || '/')) {
    throw new Error('For this first build, IOS_COMMERCE_API_BASE_URL must use https://osgard.world or https://osgard.world/commerce-api.');
  }

  const files = walk(gamesDir).filter((path) => /\.(html|js)$/.test(path));
  for (const path of files) {
    replaceFile(path, (source) => {
      let text = source;
      text = text.replace(/new URL\((['"])(\/games\/)\1\s*,\s*location\.origin\s*\)/g,
        (_match, quote, route) => 'new URL(' + quote + route + quote + ', (window.OSGARD_PUBLIC_ORIGIN || location.origin))');
      text = text.replace(/\bfetch\(\s*(['"])(\/api\/[^'"]*)\1/g,
        (_match, quote, route) => 'fetch(' + quote + 'https://osgard.world' + route + quote);
      text = text.replaceAll('/games/null-shift-godot/', '/games/null-shift/');
      return text;
    });
  }

  replaceFile(catalog, (source) => {
    let text = source;
    text = text.replaceAll('GODOT / WEB', 'WEBGL / iOS');
    text = text.replaceAll('GODOT 4 · WEB', 'WEBGL · iOS');
    text = text.replaceAll('Основной вход — Godot-сборка; браузерный WebGL остаётся альтернативой.',
      'В iPhone-сборке используется локально упакованная WebGL-версия с сенсорным управлением.');
    const routes = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade', 'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid', 'heist-echo']);
    text = text.replace(/href=(['"])\/game\/([a-z0-9-]+)\1/gi, (match, quote, slug) =>
      routes.has(slug) ? 'href=' + quote + '/games/' + slug + '/index.html' + quote : match);
    text = text.replaceAll('href="/games/time"', 'href="/games/time/index.html"');
    return text;
  });

  for (const path of walk(gamesDir).filter((item) => item.endsWith('.html'))) {
    replaceFile(path, (source) => {
      if (source.includes('/games/osgard-native-share.js')) return source;
      const bootstrap = '<script>window.OSGARD_PUBLIC_ORIGIN = "https://osgard.world";</script>\n' +
        '<script src="/games/osgard-native-share.js" defer></script>';
      return source.includes('</head>') ? source.replace('</head>', bootstrap + '\n</head>') : source;
    });
  }

  const godotFallback = join(gamesDir, 'null-shift-godot');
  mkdirSync(godotFallback, { recursive: true });
  writeFileSync(join(godotFallback, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>NULL//SHIFT — OSGARD PLAY</title></head><body><p>Opening the mobile-ready version…</p><script>location.replace("/games/null-shift/");</script></body></html>\n');

  writeFileSync(join(gamesDir, 'commerce-config.json'), JSON.stringify({
    apiBaseUrl: apiBase,
    notes: 'OSGARD PLAY iOS bundle. Public HTTPS endpoint only; no secrets. Analytics remains consent-gated.',
  }, null, 2) + '\n');

  // TIME / EMPIRE is a React route in the existing app, not a standalone HTML game.
  // Preserve its built app entry so the Capacitor file router can launch that route locally.
  const timeDir = join(gamesDir, 'time');
  mkdirSync(timeDir, { recursive: true });
  let timeEntry = builtAppIndex
    .replace('<title>OSGARD WORLD — цифровая экосистема</title>', '<title>Империя времени — OSGARD PLAY</title>')
    .replace('href="https://osgard.world/"', 'href="https://osgard.world/games/time"');
  const timeBootstrap = '<script>window.OSGARD_PUBLIC_ORIGIN = "https://osgard.world"; history.replaceState(null, "", "/games/time");</script>\n' +
    '<script src="/games/osgard-native-share.js" defer></script>';
  timeEntry = timeEntry.includes('OSGARDNativeShare')
    ? timeEntry
    : timeEntry.replace('</head>', timeBootstrap + '\n</head>');
  writeFileSync(join(timeDir, 'index.html'), timeEntry);

  const appShell = '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="theme-color" content="#080a0b"><meta name="robots" content="noindex,nofollow">' +
    '<meta name="apple-mobile-web-app-capable" content="yes"><title>OSGARD PLAY</title>' +
    '<style>:root{color-scheme:dark;background:#080a0b;color:#f2f0e8;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 42%,#26302d 0,#0b0e0d 48%,#080a0b 100%)}main{text-align:center;padding:28px}.mark{width:72px;height:72px;border:1px solid #d7bf84;border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;color:#d7bf84;font:300 32px/1 Georgia,serif}p{color:#aab1a8;font-size:12px;letter-spacing:.2em;text-transform:uppercase}</style>' +
    '</head><body><main role="status" aria-live="polite"><div class="mark">O</div><strong>OSGARD PLAY</strong><p>Preparing your next world</p></main>' +
    '<script>location.replace("/games/");</script></body></html>';
  writeFileSync(join(dist, 'index.html'), appShell);
  console.log('Prepared local-first iOS web bundle with packaged games, system share bridge and HTTPS analytics config.');
}

function addPrivacyManifest(pbxPath) {
  let pbx = readFileSync(pbxPath, 'utf8');
  if (pbx.includes('PrivacyInfo.xcprivacy')) return;
  const buildId = 'C0DECAFE0000000000000001';
  const fileId = 'C0DECAFE0000000000000002';
  const buildSection = '/* Begin PBXBuildFile section */';
  const fileSection = '/* Begin PBXFileReference section */';
  const groupSection = '/* Begin PBXGroup section */';
  const resourceSection = '/* Begin PBXResourcesBuildPhase section */';
  for (const marker of [buildSection, fileSection, groupSection, resourceSection]) {
    if (!pbx.includes(marker)) throw new Error('Xcode project is missing expected section: ' + marker);
  }
  pbx = pbx.replace(buildSection, buildSection + '\n\t\t' + buildId +
    ' /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ' + fileId + ' /* PrivacyInfo.xcprivacy */; };');
  pbx = pbx.replace(fileSection, fileSection + '\n\t\t' + fileId +
    ' /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');

  const groupAt = pbx.indexOf(groupSection);
  const childrenAt = pbx.indexOf('children = (', groupAt);
  const childrenEnd = pbx.indexOf('\n\t\t\t);', childrenAt);
  if (childrenAt < 0 || childrenEnd < 0) throw new Error('Cannot locate Xcode group children for the privacy manifest.');
  pbx = pbx.slice(0, childrenEnd) + '\n\t\t\t\t' + fileId +
    ' /* PrivacyInfo.xcprivacy */,' + pbx.slice(childrenEnd);

  const resourceAt = pbx.indexOf(resourceSection);
  const resourceFilesAt = pbx.indexOf('files = (', resourceAt);
  const resourceFilesEnd = pbx.indexOf('\n\t\t\t);', resourceFilesAt);
  if (resourceFilesAt < 0 || resourceFilesEnd < 0) throw new Error('Cannot locate Xcode app resource phase.');
  pbx = pbx.slice(0, resourceFilesEnd) + '\n\t\t\t\t' + buildId +
    ' /* PrivacyInfo.xcprivacy in Resources */,' + pbx.slice(resourceFilesEnd);
  writeFileSync(pbxPath, pbx);
}

function prepareIosProject() {
  const appDir = join(root, 'ios', 'App', 'App');
  const projectDir = join(root, 'ios', 'App', 'App.xcodeproj');
  const plistPath = join(appDir, 'Info.plist');
  const pbxPath = join(projectDir, 'project.pbxproj');
  assertFile(plistPath, 'Generated Info.plist');
  assertFile(pbxPath, 'Generated Xcode project');
  const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
  copyFileSync(join(root, 'mobile', 'PrivacyInfo.xcprivacy'), join(appDir, 'PrivacyInfo.xcprivacy'));

  let plist = readFileSync(plistPath, 'utf8');
  function setString(key, value) {
    const regex = new RegExp('(<key>' + key + '</key>\\s*<string>)[^<]*(</string>)');
    if (regex.test(plist)) plist = plist.replace(regex, '$1' + value + '$2');
    else plist = plist.replace('</dict>', '<key>' + key + '</key><string>' + value + '</string></dict>');
  }
  setString('CFBundleDisplayName', 'OSGARD PLAY');
  setString('CFBundleName', 'OSGARD PLAY');
  if (!plist.includes('<key>ITSAppUsesNonExemptEncryption</key>')) {
    plist = plist.replace('</dict>', '<key>ITSAppUsesNonExemptEncryption</key><false/></dict>');
  }
  if (!plist.includes('<key>UIUserInterfaceStyle</key>')) {
    plist = plist.replace('</dict>', '<key>UIUserInterfaceStyle</key><string>Dark</string></dict>');
  }
  writeFileSync(plistPath, plist);

  let pbx = readFileSync(pbxPath, 'utf8');
  const buildNumber = resolveIosBuildNumber(process.env);
  const marketingVersion = resolveIosMarketingVersion(process.env);
  pbx = pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, 'PRODUCT_BUNDLE_IDENTIFIER = ' + config.appId + ';');
  pbx = pbx.replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g, 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;');
  pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + marketingVersion + ';');
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = ' + buildNumber + ';');
  pbx = pbx.replace(/INFOPLIST_KEY_CFBundleDisplayName = [^;]+;/g, 'INFOPLIST_KEY_CFBundleDisplayName = "OSGARD PLAY";');
  writeFileSync(pbxPath, pbx);
  addPrivacyManifest(pbxPath);

  const iconDir = join(appDir, 'Assets.xcassets', 'AppIcon.appiconset');
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'generate-ios-app-icon.mjs'), '--output-dir', iconDir], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Could not generate App Store icon assets.');
  console.log('Prepared native Xcode project for ' + config.appId + ', version ' + marketingVersion + ' (' + buildNumber + ').');
}

if (!iosOnly) prepareWeb();
if (!webOnly) {
  const projectPath = join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (existsSync(projectPath)) prepareIosProject();
  else if (iosOnly) throw new Error('First generate the native project with npx cap add ios --packagemanager SPM.');
}
