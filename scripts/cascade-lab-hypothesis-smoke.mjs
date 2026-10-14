import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/hypothesis-lab.js', import.meta.url), 'utf8');

assert.match(html, /osgard-game-version" content="0\.27\.0-reproducibility-lab"/, 'CASCADE LAB metadata must identify application release 0.25.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.25.0<\/title>/, 'the browser title must identify application release 0.25.0');
assert.ok(html.includes('id="CASCADELAB018"') && html.includes('data-cascade-lab-experiment="0.18.0"') && html.includes('hypothesis-lab.js?v=0.18.0'), 'the hypothesis layer must be versioned and cache-busted');
assert.ok(html.includes('id="CASCADELAB020"') && html.includes('data-cascade-lab-studio="0.20.0"') && html.includes('experiment-studio.js?v=0.20.0'), 'the 0.20 Experiment Studio must load as the latest experiment layer');
for (const marker of [
  "osgard.cascade-lab.next-experiment.v1",
  "function proposalForPair(pair)",
  "function reconcilePlan(",
  "function startPlan(",
  "не определяет истинную причину",
  "localOnly: true",
  "uploaded: false",
  "MutationObserver",
  "CASCADELAB018"
]) assert.ok(source.includes(marker), 'Hypothesis Lab contract missing: ' + marker);
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'the experiment plan must not send game history over the network');
new Function(source);

function node(tag) {
  return {
    tagName: tag,
    className: '',
    textContent: '',
    children: [],
    listeners: {},
    dataset: {},
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = [...items]; },
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); },
    click() { for (const handler of this.listeners.click || []) handler({ target: this }); },
    remove() { this.removed = true; },
    after(item) { this.inserted = item; },
    before(item) { this.inserted = item; }
  };
}

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};
let records = [
  { id: 'run-1', at: '2026-10-14T01:00:00.000Z', level: 'PROTOCOL A', won: false, grade: 'D', seconds: 5.2, devices: 3, mode: 'test', note: '' },
  { id: 'run-2', at: '2026-10-14T01:01:00.000Z', level: 'PROTOCOL A', won: false, grade: 'C', seconds: 5.6, devices: 4, mode: 'test', note: '' }
];
const bottomGrid = node('div');
const recordList = node('div');
const head = node('head');
const document = {
  head,
  visibilityState: 'visible',
  listeners: {},
  querySelector(selector) {
    if (selector === '.bottom-grid') return bottomGrid;
    if (selector === '.app-footer' || selector === 'footer') return null;
    if (selector === '.cl-ledger-records') return recordList;
    return null;
  },
  createElement(tag) { return node(tag); },
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
};
class FakeMutationObserver {
  constructor(handler) { this.handler = handler; }
  observe() {}
}
const window = {
  localStorage,
  crypto: { getRandomValues(bytes) { for (let i = 0; i < bytes.length; i++) bytes[i] = i + 17; return bytes; } },
  setTimeout() { return 1; },
  URL,
  CASCADELAB015: { getSnapshot: () => records.map(row => ({ ...row })) }
};
runInNewContext(source, { window, document, localStorage, MutationObserver: FakeMutationObserver, URL, Blob, console });
const api = window.CASCADELAB018;
assert.ok(api && api.version === '0.18.0', 'the browser must expose the Hypothesis Lab API');
assert.ok(bottomGrid.inserted && bottomGrid.inserted.className === 'cl-hypothesis', 'the next-experiment tool must be visible on the main game surface');

const pair = { previous: records[0], current: records[1] };
const repeatFailure = api.buildProposal(pair);
assert.ok(repeatFailure.proposal.title.includes('Изолируй'), 'two failures must suggest a single-variable diagnostic test');
const recovery = api.buildProposal({ previous: { ...records[0], won: false }, current: { ...records[1], won: true } });
assert.ok(recovery.proposal.title.includes('воспроизводимость'), 'a failed-to-success pair must suggest reproducing the successful setup');
const regression = api.buildProposal({ previous: { ...records[0], won: true }, current: { ...records[1], won: false } });
assert.ok(regression.proposal.title.includes('регрессии'), 'a success-to-failure pair must suggest a controlled regression test');
const optimized = api.buildProposal({
  previous: { ...records[0], won: true, seconds: 7, devices: 5 },
  current: { ...records[1], won: true, seconds: 5, devices: 4 }
});
assert.ok(optimized.proposal.title.includes('Подтверди'), 'an improved successful pair must recommend confirming the improvement');

const plan = api.startPlan(pair);
assert.equal(plan.status, 'planned', 'the experiment plan must be saved with a baseline');
assert.equal(plan.baselineId, 'run-2', 'the plan must point at the latest attempt');
assert.ok(storage.has('osgard.cascade-lab.next-experiment.v1'), 'the plan must persist only in local storage');

records.unshift({
  id: 'run-3',
  at: new Date(Date.parse(plan.createdAt) + 1000).toISOString(),
  level: 'PROTOCOL A',
  won: true,
  grade: 'B',
  seconds: 4.8,
  devices: 4,
  mode: 'test',
  note: ''
});
const observation = api.reconcile();
assert.equal(observation.status, 'observed', 'a later saved attempt of the same level must resolve the plan');
assert.equal(observation.result.id, 'run-3', 'the observed result must be the first saved same-level attempt after the plan');
assert.equal(observation.observation.outcome, 'recovered', 'the observation must report a changed outcome without claiming a cause');
assert.ok(observation.observation.limitation.includes('не проверяет'), 'the UI must disclose that compliance with the single-change plan is not verified');
api.clearPlan();
assert.equal(api.getPlan(), null, 'the plan can be cleared to begin another experiment');
assert.equal(storage.has('osgard.cascade-lab.next-experiment.v1'), false, 'clearing the plan must remove its local record');

console.log('CASCADE LAB Hypothesis Lab smoke: PASS — controlled recommendations, local plan persistence, same-level observation, safe outcome labels and no network upload.');