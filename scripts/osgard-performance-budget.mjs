import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readdir, lstat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MiB = 1024 * 1024;
export const DEFAULT_PERFORMANCE_BUDGETS = Object.freeze({
  maxJavaScriptFileBytes: 640 * 1024,
  maxCssFileBytes: 384 * 1024,
  maxHtmlFileBytes: 400 * 1024,
  maxJavaScriptTotalBytes: 8 * MiB,
  maxCssTotalBytes: 4 * MiB,
  maxHtmlTotalBytes: 6 * MiB,
  maxTextGzipBytes: 8 * MiB,
  maxDistributionBytes: 45 * MiB,
});

function pushCheck(checks, id, title, passed, actual, limit, detail = '') {
  checks.push({
    id,
    title,
    status: passed ? 'passed' : 'failed',
    actual,
    limit,
    ...(detail ? { detail } : {}),
  });
}

async function walk(root, directory, files, checks) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    const relPath = relative(root, fullPath).split(sep).join('/');
    const info = await lstat(fullPath);
    if (info.isSymbolicLink()) {
      pushCheck(checks, 'filesystem:no-symlinks:' + relPath,
        'Published distribution does not contain symbolic links', false, 'symlink', 'regular file or directory');
      continue;
    }
    if (info.isDirectory()) {
      await walk(root, fullPath, files, checks);
      continue;
    }
    if (!info.isFile()) {
      pushCheck(checks, 'filesystem:regular-files-only:' + relPath,
        'Published distribution only contains regular files and directories', false, 'special file', 'regular file');
      continue;
    }
    files.push({ path: relPath, bytes: info.size, ext: extname(entry.name).toLowerCase() });
  }
}

export async function auditPerformanceBudget(rootPath = 'dist', options = {}) {
  const root = resolve(rootPath);
  const checks = [];
  const files = [];
  const budget = { ...DEFAULT_PERFORMANCE_BUDGETS, ...(options.budgets || {}) };
  const report = {
    schema: 'osgard.performance-budget.v1',
    generatedAt: new Date().toISOString(),
    root: relative(process.cwd(), root).split(sep).join('/') || '.',
    status: 'running',
    budgets: budget,
    summary: {},
    checks,
    largestAssets: [],
    transferEstimate: { textAssets: 0, gzipBytes: 0 },
    sha256: '',
  };

  try {
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
      pushCheck(checks, 'filesystem:root', 'Distribution root is a real directory', false, 'invalid root', 'directory');
    } else {
      await walk(root, root, files, checks);
    }
  } catch (error) {
    pushCheck(checks, 'filesystem:root', 'Distribution root is readable', false,
      String(error?.message || error), 'existing readable directory');
  }

  const index = files.find(file => file.path === 'index.html');
  pushCheck(checks, 'entrypoint:index-html', 'Distribution contains a non-empty root index.html',
    Boolean(index && index.bytes > 0), index ? index.bytes : 0, '> 0 bytes');

  const javascript = files.filter(file => ['.js', '.mjs', '.cjs'].includes(file.ext));
  const css = files.filter(file => file.ext === '.css');
  const html = files.filter(file => file.ext === '.html');
  const sum = list => list.reduce((total, file) => total + file.bytes, 0);
  const totalBytes = sum(files);
  const jsBytes = sum(javascript);
  const cssBytes = sum(css);
  const htmlBytes = sum(html);

  for (const [kind, list, limit] of [
    ['javascript', javascript, budget.maxJavaScriptFileBytes],
    ['css', css, budget.maxCssFileBytes],
    ['html', html, budget.maxHtmlFileBytes],
  ]) {
    for (const file of list) {
      pushCheck(checks, 'asset:' + kind + '-file:' + file.path,
        'Individual ' + kind.toUpperCase() + ' asset remains within its size budget',
        file.bytes <= limit, file.bytes, limit, file.path);
    }
  }
  pushCheck(checks, 'aggregate:javascript', 'Total JavaScript payload remains within budget', jsBytes <= budget.maxJavaScriptTotalBytes, jsBytes, budget.maxJavaScriptTotalBytes);
  pushCheck(checks, 'aggregate:css', 'Total CSS payload remains within budget', cssBytes <= budget.maxCssTotalBytes, cssBytes, budget.maxCssTotalBytes);
  pushCheck(checks, 'aggregate:html', 'Total HTML payload remains within budget', htmlBytes <= budget.maxHtmlTotalBytes, htmlBytes, budget.maxHtmlTotalBytes);
  pushCheck(checks, 'aggregate:distribution', 'Total published distribution remains within budget', totalBytes <= budget.maxDistributionBytes, totalBytes, budget.maxDistributionBytes);

  let gzipBytes = 0;
  let textAssets = 0;
  const textExts = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.webmanifest']);
  const transferItems = [];
  for (const file of files) {
    if (!textExts.has(file.ext)) continue;
    try {
      const contents = await readFile(resolve(root, file.path));
      const gzBytes = gzipSync(contents, { level: 6 }).byteLength;
      gzipBytes += gzBytes;
      textAssets++;
      transferItems.push({ path: file.path, bytes: file.bytes, gzipBytes: gzBytes });
    } catch (error) {
      pushCheck(checks, 'asset:readable:' + file.path, 'Text asset can be read for transfer estimation', false, String(error?.message || error), 'readable file');
    }
  }
  report.transferEstimate = { textAssets, gzipBytes };
  pushCheck(checks, 'aggregate:text-gzip', 'Estimated gzip transfer size of text assets remains within budget',
    gzipBytes <= budget.maxTextGzipBytes, gzipBytes, budget.maxTextGzipBytes);

  report.largestAssets = files.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 15)
    .map(file => ({ path: file.path, bytes: file.bytes, extension: file.ext || '[none]' }));
  report.summary = {
    files: files.length,
    javascriptFiles: javascript.length,
    cssFiles: css.length,
    htmlFiles: html.length,
    totalBytes,
    javascriptBytes: jsBytes,
    cssBytes,
    htmlBytes,
    checks: checks.length,
    passed: checks.filter(item => item.status === 'passed').length,
    failed: checks.filter(item => item.status === 'failed').length,
  };
  report.status = report.summary.failed === 0 ? 'ready' : 'blocked';
  const normalized = {
    status: report.status,
    budgets: budget,
    summary: report.summary,
    checks: checks.map(({ id, status, actual, limit }) => ({ id, status, actual, limit })),
    files: files.slice().sort((a, b) => a.path.localeCompare(b.path)),
  };
  report.sha256 = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

  const reportPath = options.reportPath || process.env.OSGARD_PERFORMANCE_REPORT;
  if (reportPath) {
    const destination = resolve(reportPath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

async function main() {
  const root = process.argv[2] || 'dist';
  const reportPath = process.env.OSGARD_PERFORMANCE_REPORT || 'osgard-performance-budget.json';
  const result = await auditPerformanceBudget(root, { reportPath });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'ready') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('OSGARD performance budget failed:', error?.stack || error);
    process.exitCode = 1;
  });
}
