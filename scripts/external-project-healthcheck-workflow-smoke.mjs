import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const workflowPath = '.github/workflows/external-project-healthcheck.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const checker = readFileSync('scripts/external-project-healthcheck.mjs', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.ok(workflow.includes('schedule:') && workflow.includes('cron: "19 7 * * *"'), 'Homepage checks must run daily on a schedule');
assert.ok(workflow.includes('workflow_dispatch:') && workflow.includes('type: boolean') && workflow.includes('default: false'), 'Manual runs must support an optional strict gate without failing routine runs for transient outages');
assert.ok(workflow.includes('permissions:\n  contents: read'), 'The scheduled workflow must use read-only repository permissions');
assert.ok(workflow.includes('timeout-minutes: 6'), 'The workflow must have a bounded runtime');
assert.ok(workflow.includes('node scripts/external-project-healthcheck.mjs --out artifacts/external-project-health.json'), 'The workflow must run the existing bounded audit rather than duplicating URL definitions');
assert.ok(workflow.includes('if: ${{ inputs.strict == true }}'), 'Strict failure must be an explicit manual choice');
assert.ok(workflow.includes('if: always()') && workflow.includes('actions/upload-artifact@v4') && workflow.includes('retention-days: 30'), 'The report must be uploaded even when strict policy fails');
assert.ok(!/secrets\.[A-Z0-9_]+/.test(workflow), 'The homepage checker must not need secrets or transmit credentials');
assert.ok(checker.includes('export const PROJECTS = [') && (checker.match(/url: 'https:\/\//g) || []).length === 10, 'The audit must cover the ten owner-listed HTTPS project homepages');
assert.ok(checker.includes('blocked_redirect_host_mismatch') && checker.includes('blocked_https_downgrade') && checker.includes('paidPromotionEligibleCount: 0'), 'A reachability response must not automatically authorize paid promotion');
assert.equal(packageJson.scripts['qa:external-project-healthcheck'], 'node scripts/external-project-healthcheck-smoke.mjs && node scripts/external-project-healthcheck-workflow-smoke.mjs', 'The package QA command must run both behavioral and workflow-contract checks');
assert.ok(existsSync('docs/OSGARD_WORLD_GAMING_AUDIT_RU.md'), 'The repository audit and release gates must be documented');

console.log('PASS external-project-healthcheck workflow contract: daily schedule, manual strict gate, read-only permissions, 10 HTTPS checks, artifact retention and no secrets.');
