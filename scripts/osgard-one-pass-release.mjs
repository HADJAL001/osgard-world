#!/usr/bin/env node
/**
 * OSGARD WORLD one-pass release orchestrator.
 * Coordinates existing QA contracts. Never enables ads/payments or deploys.
 * External homepage reachability is informative; it cannot approve paid promo.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_DIR = path.join(ROOT, 'artifacts');
const REPORT_PATH = path.join(REPORT_DIR, 'osgard-one-pass-release.json');
const EXTERNAL_PATH = path.join(REPORT_DIR, 'external-project-health.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const DEFAULT_STEP_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_STEP_TIMEOUT_MS = 45 * 60 * 1000;
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const REPORT_OUTPUT_LIMIT = 8000;
const CONSOLE_OUTPUT_LIMIT = 40000;

const npm = (id, label, scriptName, options = {}) => ({
  id, label, command: npmCommand, args: ['run', scriptName],
  critical: options.critical !== false, kind: options.kind || 'qa',
  timeoutMs: options.timeoutMs || (options.kind === 'external' ? 60 * 1000 : DEFAULT_STEP_TIMEOUT_MS),
  timeoutMs: options.timeoutMs || (scriptName === 'qa:release' ? 35 * 60 * 1000 : DEFAULT_STEP_TIMEOUT_MS),
});
const node = (id, label, args, options = {}) => ({
  id, label, command: process.execPath, args,
  critical: options.critical !== false, kind: options.kind || 'qa',
});

export function buildPlan() {
  return [
    npm('source-preflight', 'Source architecture, catalogue, legal, privacy and monetization gate', 'qa:ecosystem-release'),
    npm('games-portal', 'Games catalogue, launch routes and portal contracts', 'qa:games-portal'),
    npm('game-details', 'Game details, progression, sharing and CASCADE LAB regression suites', 'qa:games-detail'),
    npm('entertainment', 'Entertainment hub and cross-surface discovery', 'qa:entertainment'),
    npm('game-recommendations', 'Contextual recommendations and local player history', 'qa:game-recommendations'),
    npm('game-operations', 'Operator controls and Games operations contracts', 'qa:games-operations'),
    npm('accessibility-funnel', 'Accessibility, consented funnel and client/server analytics schema', 'qa:games-accessibility-funnel'),
    npm('privacy-consent', 'Privacy page, consent controls and revoke semantics', 'qa:privacy-consent'),
    npm('owned-promo', 'Versioned OSGARD SELECT configuration and safe defaults', 'qa:osgard-select'),
    npm('owned-promo-config', 'Owned-promotion config and schema validation', 'qa:owned-promo-config'),
    npm('partner-studio', 'Sponsor enquiry, disabled default inventory and campaign safety', 'qa:partners-page'),
    npm('campaign-manager', 'Campaign validation and safe admin state', 'qa:campaign-manager'),
    npm('intermission-sponsor', 'Between-game first-party promotions and reward guardrails', 'qa:intermission-sponsor'),
    npm('ecosystem-directory', 'Ten owned-project links, categories, UTM attribution and safe targets', 'qa:ecosystem-directory'),
    npm('ecosystem-integrity', 'Cross-promotion, contacts, legal and route contracts', 'qa:ecosystem'),
    npm('project-intake', 'Project enquiry validation, consent and safe manual fallback', 'qa:project-intake'),
    npm('game-business-bridge', 'Game-to-development enquiry attribution', 'qa:game-business-bridge'),
    npm('games-assets', 'Generated game assets, static asset integrity and mobile assets', 'qa:games-assets'),
    npm('economics-model', 'Three-scenario financial model and spreadsheet-safe export', 'qa:games-model'),
    npm('device-fit', 'Responsive layout and local-only device capability contracts', 'qa:device-fit'),
    npm('null-shift-godot', 'Godot game asset/runtime-source contract (not a desktop-editor launch)', 'qa:null-shift-godot'),
    npm('ios-payload', 'iOS App Store web payload source preflight', 'qa:ios-appstore'),
    npm('external-health-contract', 'External-project audit safety and schema contract', 'qa:external-project-healthcheck'),
    node('external-homepage-http', 'Live HTTP homepage audit for ten owned projects (review-only; network can be transient)', [
      path.join(ROOT, 'scripts/external-project-healthcheck.mjs'), '--out', EXTERNAL_PATH,
    ], { critical: false, kind: 'external' }),
    npm('full-release-readiness', 'Full release suite: typecheck, dependency audit, build, archive preflight and production route/API probes', 'qa:release'),
  ];
}

export function summarizeReport(steps) {
  const pass = steps.filter((step) => step.status === 'PASS').length;
  const review = steps.filter((step) => step.status === 'REVIEW').length;
  const block = steps.filter((step) => step.status === 'BLOCK').length;
  return {
    total: steps.length, pass, review, block,
    status: block > 0 ? 'BLOCKED' : review > 0 ? 'REVIEW_REQUIRED' : 'SOURCE_READY_FOR_OPERATOR_REVIEW',
  };
}

export function evaluateExternalReport(report) {
  if (!report || typeof report !== 'object' || !Number.isSafeInteger(report.projectCount) ||
      !Number.isSafeInteger(report.reachableCount) || report.projectCount < 1 ||
      report.reachableCount < 0 || report.reachableCount > report.projectCount ||
      (report.unavailableCount !== undefined &&
        (!Number.isSafeInteger(report.unavailableCount) || report.unavailableCount < 0 ||
          report.unavailableCount > report.projectCount))) {
    return { status: 'REVIEW', detail: 'No valid HTTP report was produced; retry from a network-enabled runner.' };
  }
  return {
    status: report.reachableCount === report.projectCount ? 'PASS' : 'REVIEW',
    detail: 'Homepage HTTP results: ' + report.reachableCount + '/' + report.projectCount +
      ' reachable. ' + (report.paidPromotionReviewCount ?? report.projectCount) +
      ' destination(s) still require human review before paid promotion.',
  };
}

export function validatePlan(plan, packageScripts = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts) {
  if (!Array.isArray(plan) || plan.length === 0) throw new Error('One-pass plan must contain at least one step.');
  const ids = new Set();
  for (const step of plan) {
    if (!step || typeof step !== 'object' ||
        typeof step.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step.id) ||
        typeof step.label !== 'string' || !step.label.trim() ||
        typeof step.command !== 'string' || !step.command.trim() ||
        !Array.isArray(step.args) || !step.args.every((arg) => typeof arg === 'string')) {
      throw new Error('Invalid one-pass plan step: ' + String(step?.id || '<unknown>'));
    }
    if (ids.has(step.id)) throw new Error('Duplicate one-pass step ID: ' + step.id);
    ids.add(step.id);
    const timeout = step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > MAX_STEP_TIMEOUT_MS) {
      throw new Error('Invalid timeout for one-pass step ' + step.id + ': ' + timeout);
    }
    if (step.command === 'npm' || step.command === 'npm.cmd') {
      const scriptName = step.args[0] === 'run' ? step.args[1] : null;
      if (!scriptName || !Object.hasOwn(packageScripts, scriptName)) {
        throw new Error('Undefined npm script in one-pass step ' + step.id + ': ' + String(scriptName));
      }
    }
  }
  return { count: plan.length, ids: [...ids] };
}

function redactText(value) {
  return String(value || '')
    .replace(/\b(sk_live_|sk_test_|rk_live_|rk_test_)[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_SECRET]')
    .replace(/\bwhsec_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_SECRET]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|passwd|api[_-]?key|secret|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"' \r\n,;]+/gi, '$1=[REDACTED]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');
}
function tail(value, limit) {
  const clean = redactText(value);
  return clean.length <= limit ? clean : '[truncated to last ' + limit + ' characters]\n' + clean.slice(-limit);
}
function displayArgument(arg) {
  if (!path.isAbsolute(arg)) return arg;
  const rel = path.relative(ROOT, arg);
  if (rel && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return path.basename(arg);
}
function commandForReport(step) {
  return [step.command, ...step.args.map(displayArgument)].join(' ');
}
function reportDigest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
async function writeAtomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = file + '.' + process.pid + '.tmp';
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    await rename(temp, file);
  } catch (error) {
    try { await unlink(temp); } catch {}
    throw error;
  }
}

export function runStep(step, options = {}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  console.log('\n[OSGARD ONE-PASS] START ' + step.id + ' — ' + step.label);
  const timeoutMs = options.timeoutMs ?? step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  let result;
  try {
    result = spawnSync(step.command, step.args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: MAX_BUFFER_BYTES,
      timeout: timeoutMs,
      env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR || '0' },
      shell: process.platform === 'win32' && (step.command === 'npm.cmd' || step.command.endsWith('.cmd')),
      windowsHide: true,
    });
  } catch (error) {
    result = { status: null, stdout: '', stderr: '', error };
  }
  const durationMs = Date.now() - started;
  const stdout = redactText(result.stdout || '');
  const stderr = redactText(result.stderr || '');
  const output = [stdout, stderr].filter(Boolean).join('\n');
  const timedOut = result.error?.code === 'ETIMEDOUT' || /timed out/i.test(String(result.error?.message || ''));
  const outputOverflow = result.error?.code === 'ENOBUFS';
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  let status = exitCode === 0 ? 'PASS' : (step.critical === false ? 'REVIEW' : 'BLOCK');
  let detail = exitCode === 0 ? 'Command completed.' :
    timedOut ? 'Command timed out after ' + timeoutMs + ' ms.' :
    outputOverflow ? 'Command output exceeded the configured buffer of ' + MAX_BUFFER_BYTES + ' bytes.' :
    String(result.error?.message || 'Command exited with code ' + exitCode) + (output ? '\n' + tail(output, REPORT_OUTPUT_LIMIT) : '');

  const consoleOutput = tail(output, CONSOLE_OUTPUT_LIMIT);
  if (consoleOutput) console.log(consoleOutput);
  if (output.length > CONSOLE_OUTPUT_LIMIT) console.log('[OSGARD ONE-PASS] console output truncated for this step.');
  if (step.kind === 'external') {
    try {
      const external = JSON.parse(readFileSync(options.externalReportPath || EXTERNAL_PATH, 'utf8'));
      const assessment = evaluateExternalReport(external);
      if (exitCode !== 0) {
        status = 'REVIEW';
        detail = 'HTTP audit process exited with code ' + exitCode +
          (timedOut ? ' after timeout.' : '.') + ' The written report is informational only; it cannot override a failed command.';
      } else {
        status = assessment.status;
        detail = assessment.detail;
      }
    } catch {
      status = 'REVIEW';
      detail = 'HTTP audit did not produce a readable report; this is not proof that all domains are unavailable.';
    }
  }
  if (step.critical === false && status === 'BLOCK') status = 'REVIEW';
  console.log('[OSGARD ONE-PASS] ' + status + ' ' + step.id + ' (' + (durationMs / 1000).toFixed(1) + 's)');
  return {
    id: step.id,
    label: step.label,
    status,
    critical: step.critical !== false,
    command: commandForReport(step),
    startedAt,
    durationMs,
    timeoutMs,
    exitCode,
    timedOut,
    ...(result.signal ? { signal: result.signal } : {}),
    outputBytes: Buffer.byteLength(output, 'utf8'),
    detail: redactText(detail).slice(0, REPORT_OUTPUT_LIMIT + 500),
    ...(output ? { outputTail: tail(output, REPORT_OUTPUT_LIMIT) } : {}),
  };
}

export async function runOnePass({ plan = buildPlan() } = {}) {
  await mkdir(REPORT_DIR, { recursive: true });
  try { await unlink(EXTERNAL_PATH); } catch {}
  const steps = [];
  for (const step of plan) {
    // Continue through independent gates to give the operator a complete report.
    steps.push(runStep(step));
  }
  let externalReport = null;
  try { externalReport = JSON.parse(await readFile(EXTERNAL_PATH, 'utf8')); } catch {}
  let releaseReadiness = null;
  try { releaseReadiness = JSON.parse(await readFile(path.join(ROOT, 'release-readiness.json'), 'utf8')); } catch {}
  const summary = summarizeReport(steps);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: 'HADJAL001/osgard-world',
    scope: 'source QA, build/release checks, external homepage HTTP audit; not a production deployment or payment/ad activation',
    summary,
    steps,
    externalProjects: externalReport ? {
      checkedAt: externalReport.checkedAt,
      projectCount: externalReport.projectCount,
      reachableCount: externalReport.reachableCount,
      unavailableCount: externalReport.unavailableCount,
      paidPromotionEligibleCount: externalReport.paidPromotionEligibleCount,
      promotionGateCounts: externalReport.promotionGateCounts,
      report: 'artifacts/external-project-health.json',
    } : null,
    releaseReadiness: releaseReadiness ? {
      status: releaseReadiness.status,
      failedChecks: (releaseReadiness.checks || []).filter((check) => check.status === 'failed').map((check) => check.name),
    } : null,
    manualGates: [
      { id: 'live-ad-network', status: 'REVIEW', reason: 'Provider approval, account IDs, legal disclosures, consent and real test impressions are operator-controlled; no fake impressions or clicks are allowed.' },
      { id: 'live-payments', status: 'REVIEW', reason: 'Stripe/database secrets, price IDs, signed webhook deployment, entitlements/refunds and explicit opt-in remain required; live checkout defaults OFF.' },
      { id: 'production-deployment', status: 'REVIEW', reason: 'A passing source pipeline does not prove deployment. Verify the deploy workflow and run a fresh production route matrix against the deployed build.' },
      { id: 'project-promotion', status: 'REVIEW', reason: 'A homepage HTTP response is not a security, business, feature, or privacy audit. Each project needs manual review before paid promotion.' },
    ],
    policy: {
      adsAreNotSimulated: true,
      paymentsAreNotEnabledByThisScript: true,
      analyticsRequiresConsent: true,
      externalNetworkFailuresAreReviewOnly: true,
    },
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('\nOSGARD ONE-PASS SUMMARY');
  console.log(JSON.stringify({ summary, reportPath: path.relative(ROOT, REPORT_PATH), externalReachable: report.externalProjects?.reachableCount ?? null, releaseReadiness: report.releaseReadiness?.status ?? 'not produced' }, null, 2));
  if (summary.block > 0) process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOnePass().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
