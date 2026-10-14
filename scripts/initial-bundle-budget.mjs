import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_BUDGET = Object.freeze({
  maxInitialJsBytes: 700 * 1024,
  maxInitialChunkBytes: 450 * 1024,
  maxAnyChunkBytes: 650 * 1024,
});
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}
export function collectInitialJavaScriptRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const attrs = attributes(tag);
    const tagName = match[1].toLowerCase();
    const isEntry = tagName === 'script' && attrs.type?.toLowerCase() === 'module' && attrs.src;
    const isPreload = tagName === 'link' && attrs.rel?.toLowerCase().split(/\s+/).includes('modulepreload') && attrs.href;
    if (!(isEntry || isPreload)) continue;
    const value = isEntry ? attrs.src : attrs.href;
    let url;
    try { url = new URL(value, 'https://osgard.invalid/'); }
    catch { throw new Error('Invalid initial JavaScript URL: ' + value); }
    if (url.origin !== 'https://osgard.invalid' || !url.pathname.startsWith('/assets/')) {
      throw new Error('Initial JavaScript must be a same-origin /assets/ file: ' + value);
    }
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes('\\') || decodedPath.split('/').some(segment => segment === '..' || segment === '.')) {
      throw new Error('Unsafe initial JavaScript path: ' + value);
    }
    if (!/\.(?:m?js)$/i.test(decodedPath)) {
      throw new Error('Initial module reference is not JavaScript: ' + value);
    }
    refs.add(decodedPath);
  }
  return [...refs].sort();
}
async function walkJavaScript(root) {
  const found = [];
  const visit = async directory => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not allowed in build assets: ' + relative(root, path));
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && /\.(?:m?js)$/i.test(entry.name)) {
        found.push({ path: relative(root, path).split(sep).join('/'), bytes: (await stat(path)).size });
      }
    }
  };
  await visit(root);
  return found;
}
export async function auditInitialBundle(rootPath = 'dist', budgets = {}) {
  const root = resolve(rootPath);
  const limits = { ...DEFAULT_BUDGET, ...budgets };
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const refs = collectInitialJavaScriptRefs(html);
  if (refs.length === 0) throw new Error('No initial module script or modulepreload references found in dist/index.html.');

  const initialChunks = [];
  for (const publicPath of refs) {
    const path = resolve(root, '.' + publicPath);
    if (!path.startsWith(root + sep)) throw new Error('Resolved asset escapes build root: ' + publicPath);
    const metadata = await stat(path).catch(() => null);
    if (!metadata?.isFile()) throw new Error('Initial JavaScript asset is missing: ' + publicPath);
    initialChunks.push({ path: publicPath.slice(1), bytes: metadata.size });
  }
  initialChunks.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const allChunks = await walkJavaScript(root);
  const initialJsBytes = initialChunks.reduce((total, chunk) => total + chunk.bytes, 0);
  const largestInitialChunkBytes = Math.max(...initialChunks.map(chunk => chunk.bytes));
  const largestChunk = allChunks.slice().sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path, 'en'))[0] ?? null;
  const checks = [
    { id: 'initial-js-budget', limitBytes: limits.maxInitialJsBytes, actualBytes: initialJsBytes, status: initialJsBytes <= limits.maxInitialJsBytes ? 'passed' : 'failed' },
    { id: 'initial-chunk-budget', limitBytes: limits.maxInitialChunkBytes, actualBytes: largestInitialChunkBytes, status: largestInitialChunkBytes <= limits.maxInitialChunkBytes ? 'passed' : 'failed' },
    { id: 'largest-chunk-budget', limitBytes: limits.maxAnyChunkBytes, actualBytes: largestChunk?.bytes ?? 0, status: (largestChunk?.bytes ?? 0) <= limits.maxAnyChunkBytes ? 'passed' : 'failed' },
  ];
  return {
    schema: 'osgard.performance-budget.v1',
    status: checks.every(item => item.status === 'passed') ? 'ready' : 'blocked',
    generatedAt: new Date().toISOString(),
    root: relative(SCRIPT_ROOT, root).split(sep).join('/'),
    budget: limits,
    initialJsBytes,
    initialJsKiB: Number((initialJsBytes / 1024).toFixed(1)),
    initialChunkCount: initialChunks.length,
    initialChunks,
    allJavaScriptChunkCount: allChunks.length,
    totalJavaScriptBytes: allChunks.reduce((total, chunk) => total + chunk.bytes, 0),
    largestChunk,
    checks,
  };
}
async function main() {
  const root = process.argv[2] || 'dist';
  const report = await auditInitialBundle(root);
  const outputPath = resolve(process.env.OSGARD_PERFORMANCE_REPORT || 'artifacts/osgard-performance-budget.json');
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('Performance report: ' + relative(SCRIPT_ROOT, outputPath).split(sep).join('/'));
  if (report.status !== 'ready') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('OSGARD performance budget failed: ' + String(error?.message || error));
    process.exitCode = 1;
  });
}
