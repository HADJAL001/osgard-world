import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { auditLiveBundle } from './live-bundle-audit-core.mjs';

const base = (process.env.OSGARD_BASE_URL || 'https://osgard.world').replace(/\/$/, '');
const auditPath = process.env.OSGARD_BRIEF_AUDIT || 'docs/BRIEF_COVERAGE_AUDIT.md';
const html = await (await fetch(base + '/?bundle-audit=' + Date.now(), { signal: AbortSignal.timeout(8000) })).text();
const documentedMarkdown = await readFile(auditPath, 'utf8');
const builtHtml = existsSync('dist/index.html') ? await readFile('dist/index.html', 'utf8') : null;
const report = auditLiveBundle({ base, liveHtml: html, documentedMarkdown, builtHtml });
console.log(JSON.stringify(report));
if (report.status !== 'ready') process.exitCode = 1;
