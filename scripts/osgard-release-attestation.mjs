import { createHash } from 'node:crypto';
import { readdir, readFile, lstat, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, relative, resolve, sep, basename, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA = 'osgard.release-attestation.v1';
const SECRET_EXACT = new Set([
  '.env', '.env.local', '.env.production', '.npmrc', '.pypirc',
  'id_rsa', 'id_ed25519', 'credentials.json', 'service-account.json',
]);
const SECRET_EXTENSIONS = new Set(['.pem', '.p12', '.pfx', '.key', '.keystore']);
const SHA_RE = /^[a-f0-9]{64}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
function posixPath(value) {
  return value.split(sep).join('/');
}
function safeBuildPath(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('\\') ||
      value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Unsafe or non-canonical build path: ' + String(value));
  }
  return value;
}
function isSecretPath(path) {
  const name = basename(path).toLowerCase();
  if (SECRET_EXACT.has(name)) return true;
  if (/^\.env\.(?!example$|sample$)[a-z0-9._-]+$/i.test(name)) return true;
  if (name.startsWith('id_rsa') || name.startsWith('id_ed25519')) return true;
  return SECRET_EXTENSIONS.has(extname(name));
}
function canonicalFiles(files) {
  return files.slice().sort((a, b) => a.path.localeCompare(b.path, 'en'))
    .map(file => file.path + '\0' + file.bytes + '\0' + file.sha256 + '\n').join('');
}
async function inventory(root) {
  const rootStat = await lstat(root).catch(() => null);
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('Build root must exist as a real directory: ' + root);
  }
  const files = [];
  const totals = { files: 0, bytes: 0, javascriptBytes: 0, cssBytes: 0, imageBytes: 0, wasmBytes: 0 };
  const visit = async directory => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const stat = await lstat(absolute);
      const path = safeBuildPath(posixPath(relative(root, absolute)));
      if (stat.isSymbolicLink()) throw new Error('Symbolic link in production build is not allowed: ' + path);
      if (stat.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!stat.isFile()) throw new Error('Non-regular entry in production build: ' + path);
      if (isSecretPath(path)) throw new Error('Potential private configuration or key file in production build: ' + path);
      const bytes = stat.size;
      const digest = await sha256File(absolute);
      files.push({ path, bytes, sha256: digest });
      totals.files += 1;
      totals.bytes += bytes;
      const extension = extname(path).toLowerCase();
      if (['.js', '.mjs', '.cjs'].includes(extension)) totals.javascriptBytes += bytes;
      if (extension === '.css') totals.cssBytes += bytes;
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg'].includes(extension)) totals.imageBytes += bytes;
      if (extension === '.wasm') totals.wasmBytes += bytes;
    }
  };
  await visit(root);
  if (totals.files === 0) throw new Error('Production build contains no files.');
  if (!files.some(file => file.path === 'index.html' && file.bytes > 0)) {
    throw new Error('Production build must contain a non-empty root index.html.');
  }
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const warnings = [];
  for (const file of files) {
    if (/\.(?:js|mjs|cjs)$/i.test(file.path) && file.bytes > 600 * 1024) {
      warnings.push({ code: 'large-javascript', path: file.path, bytes: file.bytes, limitBytes: 600 * 1024 });
    }
    if (/\.map$/i.test(file.path)) warnings.push({ code: 'source-map-in-public-build', path: file.path, bytes: file.bytes });
  }
  if (totals.bytes > 100 * 1024 * 1024) {
    warnings.push({ code: 'large-build', bytes: totals.bytes, limitBytes: 100 * 1024 * 1024 });
  }
  return { files, totals, warnings, rootSha256: sha256(canonicalFiles(files)) };
}
function parseArgs(argv) {
  const args = argv.slice();
  const command = args.shift();
  if (!['create', 'verify'].includes(command)) {
    throw new Error('Usage: node scripts/osgard-release-attestation.mjs <create|verify> [--root dist] [--output release-attestation.json | --input release-attestation.json]');
  }
  const options = { command, root: resolve('dist'), output: resolve('release-attestation.json'), input: resolve('release-attestation.json'), contractReport: null, performanceReport: null };
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (!value) throw new Error('Missing value for ' + flag);
    if (flag === '--root') options.root = resolve(value);
    else if (flag === '--output') options.output = resolve(value);
    else if (flag === '--input') options.input = resolve(value);
    else if (flag === '--contract-report') options.contractReport = resolve(value);
    else if (flag === '--performance-report') options.performanceReport = resolve(value);
    else throw new Error('Unknown argument: ' + flag);
  }
  if (options.command === 'create') {
    const outputRelative = relative(options.root, options.output);
    if (outputRelative === '' || (!outputRelative.startsWith('..' + sep) && outputRelative !== '..' && !isAbsolute(outputRelative))) {
      throw new Error('Attestation output must be outside the build root so it cannot modify files after hashing.');
    }
  }
  return options;
}
async function packageMetadata() {
  try {
    const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
    return { name: String(pkg.name || 'osgard-world').slice(0, 120), version: String(pkg.version || '0.0.0').slice(0, 60) };
  } catch {
    return { name: 'osgard-world', version: 'unknown' };
  }
}
async function readPerformanceGate(reportPath) {
  const raw = await readFile(resolve(reportPath));
  const report = JSON.parse(raw.toString('utf8'));
  const counts = report?.summary;
  const fingerprint = String(report?.budget?.sha256 || '');
  if (report?.schema !== 'osgard.performance-budget.v1' ||
      report.status !== 'ready' ||
      !Array.isArray(report.checks) ||
      !counts ||
      !Number.isSafeInteger(counts.checks) || counts.checks < 1 ||
      !Number.isSafeInteger(counts.passed) || counts.passed < 0 ||
      !Number.isSafeInteger(counts.failed) || counts.failed !== 0 ||
      !Number.isSafeInteger(counts.warnings) || counts.warnings < 0 ||
      counts.checks !== report.checks.length ||
      counts.passed + counts.warnings !== counts.checks ||
      report.checks.some(item => !item || !['passed', 'warning'].includes(item.status)) ||
      !SHA_RE.test(fingerprint) ||
      !report.metrics || !Number.isSafeInteger(report.metrics.criticalGzipBytes) ||
      report.metrics.criticalGzipBytes < 0) {
    throw new Error('OSGARD performance budget is missing, blocked, or malformed: ' + resolve(reportPath));
  }
  return {
    schema: report.schema,
    reportSha256: sha256(raw),
    budgetFingerprint: fingerprint,
    checkCount: counts.checks,
    passed: counts.passed,
    warnings: counts.warnings,
    criticalGzipBytes: report.metrics.criticalGzipBytes,
    jsGzipBytes: Number.isSafeInteger(report.metrics.js?.gzipBytes) ? report.metrics.js.gzipBytes : null,
    cssGzipBytes: Number.isSafeInteger(report.metrics.css?.gzipBytes) ? report.metrics.css.gzipBytes : null,
    generatedAt: String(report.generatedAt || '').slice(0, 40),
  };
}
async function readContractGate(reportPath) {
  const raw = await readFile(resolve(reportPath));
  const report = JSON.parse(raw.toString('utf8'));
  const counts = report?.summary;
  const fingerprint = String(report?.contract?.sha256 || '');
  if (report?.schema !== 'osgard.contract-integrity.v1' ||
      report.status !== 'ready' ||
      !Array.isArray(report.checks) ||
      !counts ||
      !Number.isSafeInteger(counts.checks) || counts.checks < 1 ||
      !Number.isSafeInteger(counts.passed) || counts.passed < 0 ||
      !Number.isSafeInteger(counts.failed) || counts.failed !== 0 ||
      !Number.isSafeInteger(counts.warnings) || counts.warnings < 0 ||
      counts.checks !== report.checks.length ||
      counts.passed + counts.warnings !== counts.checks ||
      report.checks.some(item => !item || !['passed', 'warning'].includes(item.status)) ||
      !SHA_RE.test(fingerprint)) {
    throw new Error('OSGARD contract quality gate is missing, blocked, or malformed: ' + resolve(reportPath));
  }
  return {
    schema: report.schema,
    reportSha256: sha256(raw),
    contractFingerprint: fingerprint,
    checkCount: counts.checks,
    passed: counts.passed,
    warnings: counts.warnings,
    generatedAt: String(report.generatedAt || '').slice(0, 40),
  };
}
export async function createAttestation(rootPath, outputPath, contractReportPath = null, performanceReportPath = null) {
  const root = resolve(rootPath);
  const output = resolve(outputPath);
  const outputRelative = relative(root, output);
  if (outputRelative === '' || (!outputRelative.startsWith('..' + sep) && outputRelative !== '..' && !isAbsolute(outputRelative))) {
    throw new Error('Attestation output must be outside the build root.');
  }
  const data = await inventory(root);
  const pkg = await packageMetadata();
  const gatePath = contractReportPath || process.env.OSGARD_CONTRACT_AUDIT || null;
  const qualityGate = gatePath ? await readContractGate(gatePath) : null;
  const performancePath = performanceReportPath || process.env.OSGARD_PERFORMANCE_BUDGET || null;
  const performanceGate = performancePath ? await readPerformanceGate(performancePath) : null;
  const document = {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    source: {
      repository: 'HADJAL001/osgard-world',
      commit: String(process.env.GITHUB_SHA || process.env.OSGARD_GIT_SHA || 'local').slice(0, 100),
      ref: String(process.env.GITHUB_REF || process.env.OSGARD_GIT_REF || 'local').slice(0, 200),
      workflowRunId: String(process.env.GITHUB_RUN_ID || '').slice(0, 80) || null,
      package: pkg,
      node: process.version,
    },
    artifact: {
      rootSha256: data.rootSha256,
      fileCount: data.totals.files,
      totalBytes: data.totals.bytes,
      totals: data.totals,
      largestFiles: data.files.slice().sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path, 'en')).slice(0, 12),
      warnings: data.warnings,
    },
    files: data.files,
    ...(qualityGate ? { qualityGate } : {}),
    ...(performanceGate ? { performanceGate } : {}),
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(document, null, 2) + '\n', { mode: 0o600 });
  return document;
}
export async function verifyAttestation(rootPath, inputPath, contractReportPath = null, performanceReportPath = null) {
  const root = resolve(rootPath);
  const input = resolve(inputPath);
  const document = JSON.parse(await readFile(input, 'utf8'));
  if (!document || document.schema !== SCHEMA || !Array.isArray(document.files) ||
      !document.artifact || !SHA_RE.test(String(document.artifact.rootSha256 || ''))) {
    throw new Error('Unsupported or malformed release attestation.');
  }
  const seen = new Set();
  for (const item of document.files) {
    safeBuildPath(item?.path);
    if (seen.has(item.path)) throw new Error('Duplicate path in attestation: ' + item.path);
    seen.add(item.path);
    if (!Number.isSafeInteger(item.bytes) || item.bytes < 0 || !SHA_RE.test(String(item.sha256 || ''))) {
      throw new Error('Invalid file record in attestation: ' + item.path);
    }
  }
  let qualityGateVerified = false;
  if (document.qualityGate !== undefined) {
    const gatePath = contractReportPath || process.env.OSGARD_CONTRACT_AUDIT || resolve('osgard-contract-audit.json');
    let currentGate;
    try { currentGate = await readContractGate(gatePath); }
    catch (error) { throw new Error('Release quality-gate verification failed: ' + String(error.message || error)); }
    if (!document.qualityGate ||
        !SHA_RE.test(String(document.qualityGate.reportSha256 || '')) ||
        !SHA_RE.test(String(document.qualityGate.contractFingerprint || '')) ||
        document.qualityGate.reportSha256 !== currentGate.reportSha256 ||
        document.qualityGate.contractFingerprint !== currentGate.contractFingerprint ||
        document.qualityGate.checkCount !== currentGate.checkCount ||
        document.qualityGate.passed !== currentGate.passed ||
        document.qualityGate.warnings !== currentGate.warnings) {
      throw new Error('Release quality-gate report mismatch: the contract audit changed after attestation.');
    }
    qualityGateVerified = true;
  }
  let performanceGateVerified = false;
  const configuredPerformanceReport = performanceReportPath || process.env.OSGARD_PERFORMANCE_BUDGET || null;
  if (document.performanceGate !== undefined || configuredPerformanceReport) {
    if (document.performanceGate === undefined) {
      throw new Error('Release performance-gate verification failed: attestation has no performance budget binding.');
    }
    const performancePath = configuredPerformanceReport || resolve('osgard-performance-budget.json');
    let currentPerformance;
    try { currentPerformance = await readPerformanceGate(performancePath); }
    catch (error) { throw new Error('Release performance-gate verification failed: ' + String(error.message || error)); }
    if (!document.performanceGate ||
        !SHA_RE.test(String(document.performanceGate.reportSha256 || '')) ||
        !SHA_RE.test(String(document.performanceGate.budgetFingerprint || '')) ||
        document.performanceGate.reportSha256 !== currentPerformance.reportSha256 ||
        document.performanceGate.budgetFingerprint !== currentPerformance.budgetFingerprint ||
        document.performanceGate.checkCount !== currentPerformance.checkCount ||
        document.performanceGate.passed !== currentPerformance.passed ||
        document.performanceGate.warnings !== currentPerformance.warnings ||
        document.performanceGate.criticalGzipBytes !== currentPerformance.criticalGzipBytes) {
      throw new Error('Release performance report mismatch: performance evidence changed after attestation.');
    }
    performanceGateVerified = true;
  }
  const current = await inventory(root);
  const expectedByPath = new Map(document.files.map(file => [file.path, file]));
  const actualByPath = new Map(current.files.map(file => [file.path, file]));
  const missing = [...expectedByPath.keys()].filter(path => !actualByPath.has(path)).sort();
  const extra = [...actualByPath.keys()].filter(path => !expectedByPath.has(path)).sort();
  const changed = [];
  for (const [path, expected] of expectedByPath) {
    const actual = actualByPath.get(path);
    if (actual && (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes)) changed.push(path);
  }
  const rootMatches = current.rootSha256 === document.artifact.rootSha256;
  const countsMatch = document.artifact.fileCount === current.totals.files &&
    document.artifact.totalBytes === current.totals.bytes;
  const ok = missing.length === 0 && extra.length === 0 && changed.length === 0 && rootMatches && countsMatch;
  const result = {
    schema: 'osgard.release-verification.v1',
    status: ok ? 'verified' : 'mismatch',
    expectedRootSha256: document.artifact.rootSha256,
    actualRootSha256: current.rootSha256,
    expectedFileCount: document.artifact.fileCount,
    actualFileCount: current.totals.files,
    missing,
    extra,
    changed: changed.sort(),
    qualityGateVerified,
    contractFingerprint: qualityGateVerified ? document.qualityGate.contractFingerprint : null,
    performanceGateVerified,
    performanceBudgetFingerprint: performanceGateVerified ? document.performanceGate.budgetFingerprint : null,
    criticalGzipBytes: performanceGateVerified ? document.performanceGate.criticalGzipBytes : null,
  };
  if (!ok) {
    throw new Error('Release integrity mismatch: ' + JSON.stringify(result));
  }
  return result;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === 'create') {
    const report = await createAttestation(options.root, options.output, options.contractReport, options.performanceReport);
    console.log(JSON.stringify({
      status: 'attested',
      rootSha256: report.artifact.rootSha256,
      files: report.artifact.fileCount,
      totalBytes: report.artifact.totalBytes,
      warnings: report.artifact.warnings.length,
      qualityGateBound: Boolean(report.qualityGate),
      contractFingerprint: report.qualityGate?.contractFingerprint || null,
      performanceGateBound: Boolean(report.performanceGate),
      performanceBudgetFingerprint: report.performanceGate?.budgetFingerprint || null,
      criticalGzipBytes: report.performanceGate?.criticalGzipBytes ?? null,
      output: options.output,
    }, null, 2));
    return;
  }
  const result = await verifyAttestation(options.root, options.input, options.contractReport, options.performanceReport);
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('OSGARD release attestation failed: ' + String(error.message || error));
    process.exitCode = 1;
  });
}
