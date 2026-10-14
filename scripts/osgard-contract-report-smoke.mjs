import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.env.OSGARD_CONTRACT_REPORT || 'osgard-contract-audit.json');
const report = JSON.parse(await readFile(path, 'utf8'));
assert.equal(report.schema, 'osgard.contract-integrity.v1', 'unexpected audit schema');
assert.equal(report.status, 'ready', 'contract audit must be ready before release');
assert.ok(Array.isArray(report.checks) && report.checks.length > 0, 'audit must contain checks');
assert.ok(report.summary && typeof report.summary === 'object', 'audit must contain summary counts');

const ids = report.checks.map(item => item.id);
assert.ok(ids.every(id => typeof id === 'string' && id.length > 0), 'every check must have a stable ID');
assert.equal(new Set(ids).size, ids.length, 'check IDs must be unique');
assert.ok(report.checks.every(item => typeof item.title === 'string' && item.title.trim().length > 0),
  'every check title must be a non-empty string (guards against argument-order regressions)');
assert.ok(report.checks.every(item => ['passed', 'warning', 'failed'].includes(item.status)),
  'every check must have an explicit recognized status');

const passed = report.checks.filter(item => item.status === 'passed').length;
const warnings = report.checks.filter(item => item.status === 'warning').length;
const failed = report.checks.filter(item => item.status === 'failed').length;
assert.equal(report.summary.checks, report.checks.length, 'summary check count must equal report length');
assert.equal(report.summary.passed, passed, 'summary pass count must match individual checks');
assert.equal(report.summary.warnings, warnings, 'summary warning count must match individual checks');
assert.equal(report.summary.failed, failed, 'summary failure count must match individual checks');
assert.equal(failed, 0, 'a release quality report cannot contain failures');
assert.equal(passed + warnings, report.checks.length, 'every check must be passed or an explicitly accepted warning');
assert.match(report.contract?.sha256 || '', /^[a-f0-9]{64}$/, 'normalized contract fingerprint must be SHA-256');
console.log('PASS OSGARD contract report integrity:', report.summary.checks, 'checks;', passed, 'passed;', warnings, 'warnings; fingerprint', report.contract.sha256);
