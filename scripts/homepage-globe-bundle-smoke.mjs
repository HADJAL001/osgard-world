import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const dist = resolve('dist');
const assetDir = resolve(dist, 'assets');
assert.ok(existsSync(resolve(dist, 'index.html')) && existsSync(assetDir), 'Run the production build before checking the homepage globe bundle');

const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const scriptTags = [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+\.js)["'][^>]*>/g)];
const entrySrc = scriptTags[0]?.[1];
assert.ok(entrySrc, 'Production HTML must include a module entry script');
const entryPath = resolve(dist, entrySrc.replace(/^\//, ''));
assert.ok(existsSync(entryPath), 'Could not find the built application entry: ' + entrySrc);

const entryName = basename(entryPath);
const jsFiles = readdirSync(assetDir).filter(name => name.endsWith('.js'));
const entrySource = readFileSync(entryPath, 'utf8');
const globeFiles = jsFiles.filter(name => readFileSync(resolve(assetDir, name), 'utf8').includes('Interactive OSGARD ecosystem model'));
assert.equal(globeFiles.length, 1, 'The interactive globe must be present in one separate production chunk');

const globeName = globeFiles[0];
const globeSource = readFileSync(resolve(assetDir, globeName), 'utf8');
assert.notEqual(globeName, entryName, 'The Three.js-powered globe must not be bundled into the initial application entry');
assert.ok(!entrySource.includes('Interactive OSGARD ecosystem model'), 'The initial application entry must not contain the globe implementation');

const dynamicLoadExists = entrySource.includes('import("./' + globeName + '")') ||
  entrySource.includes("import('./" + globeName + "')") ||
  entrySource.includes('import("/assets/' + globeName + '")') ||
  entrySource.includes("import('/assets/" + globeName + "')");
assert.ok(dynamicLoadExists, 'The application entry must dynamically import the globe chunk');

const threeFiles = jsFiles.filter(name => /^three-[\w-]+\.js$/.test(name));
assert.ok(threeFiles.length >= 1, 'Three.js should remain a separate shared dependency chunk');

const staticImportTargets = source => [...source.matchAll(/import\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*from\s*["']([^"']+)["']/g)].map(match => match[1]);
const entryStaticImports = staticImportTargets(entrySource);
assert.ok(!entryStaticImports.some(specifier => threeFiles.some(name => specifier.endsWith(name))),
  'The initial app entry must not statically import the Three.js dependency chunk');
const globeStaticImports = staticImportTargets(globeSource);
assert.ok(globeStaticImports.some(specifier => threeFiles.some(name => specifier.endsWith(name))),
  'The deferred globe module must statically depend on the Three.js chunk');

console.log('PASS homepage globe bundle: Three.js is excluded from static entry imports and loaded through the deferred globe chunk.');
