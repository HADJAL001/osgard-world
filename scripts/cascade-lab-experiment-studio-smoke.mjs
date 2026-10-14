import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/experiment-studio.js', import.meta.url), 'utf8');
assert.match(html, /osgard-game-version" content="0\.26\.0-robustness-lab"/, 'CASCADE LAB metadata must identify application release 0.25.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.25.0<\/title>/, 'the browser title must identify application release 0.25.0');
assert.ok(html.includes('id="CASCADELAB020"') && html.includes('data-cascade-lab-studio="0.20.0"') && html.includes('experiment-studio.js?v=0.20.0'), 'Experiment Studio must be versioned and cache-busted');
for (const marker of [
  "osgard.cascade-lab.experiment-studio.v1",
  "osgard.cascade-lab.experiment-study.v1",
  "function startStudy(input)",
  "function reconcile()",
  "function calculateDelta(",
  "function exportAllJson()",
  "function exportAllCsv()",
  "function importArchive(payload)",
  "function startRepeat(studyId)",
  "function makeSocialUrl(platform, study)",
  "MAX_STUDIES = 40",
  "MAX_OBSERVATIONS = 5",
  "MAX_IMPORT_BYTES = 512 * 1024",
  "localOnly: true",
  "uploaded: false",
  "const rows = document.querySelector('.cl-ledger-records')"
]) assert.ok(source.includes(marker), 'Experiment Studio contract missing: ' + marker);
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Experiment Studio must not send telemetry or history over the network');
assert.ok(source.includes("platform === 'telegram'") && source.includes("platform === 'whatsapp'") && source.includes("platform === 'vk'") && source.includes("platform === 'x'") && source.includes("platform === 'linkedin'"), 'experiment summaries need explicit share-intent buttons for five networks');
new Function(source);

function makeNode(tag) {
  return {
    tagName: String(tag).toUpperCase(), children: [], listeners: {}, attrs: {}, dataset: {},
    id: '', value: '', textContent: '', className: '', hidden: false, isConnected: false,
    parentNode: null, files: [],
    get isConnectedTree() { return this.isConnected || Boolean(this.parentNode && this.parentNode.isConnectedTree); },
    get lastChild() { return this.children[this.children.length - 1] || null; },
    setAttribute(name, value) { this.attrs[name] = String(value); if (name === 'id') this.id = String(value); },
    append(...items) { for (const item of items) { if (!item) continue; item.parentNode = this; item.isConnected = this.isConnectedTree; this.children.push(item); } },
    replaceChildren(...items) { for (const item of this.children) item.parentNode = null; this.children = []; this.append(...items); },
    after(item) { if (!this.parentNode) return; const list = this.parentNode.children; const index = list.indexOf(this); item.parentNode = this.parentNode; item.isConnected = this.parentNode.isConnectedTree; list.splice(index + 1, 0, item); },
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); },
    click() { for (const handler of this.listeners.click || []) handler({ target: this, preventDefault() {} }); },
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(item => item !== this); this.parentNode = null; },
    querySelector(selector) {
      const match = node => selector[0] === '#' ? node.id === selector.slice(1) : selector[0] === '.' ? String(node.className || '').split(/\s+/).includes(selector.slice(1)) : node.tagName.toLowerCase() === selector.toLowerCase();
      const walk = parent => { for (const child of parent.children) { if (match(child)) return child; const nested = walk(child); if (nested) return nested; } return null; };
      return walk(this);
    }
  };
}
const body = makeNode('body'); body.isConnected = true;
const anchor = makeNode('section'); anchor.className = 'cl-hypothesis'; anchor.isConnected = true; body.append(anchor);
const ledgerRows = makeNode('div'); ledgerRows.className = 'cl-ledger-records'; body.append(ledgerRows);
const head = makeNode('head'); head.isConnected = true;
const document = {
  head,
  listeners: {},
  visibilityState: 'visible',
  querySelector(selector) {
    if (selector === '.cl-hypothesis') return anchor;
    if (selector === '.cl-ledger-records') return ledgerRows;
    if (selector === '#cascade-experiment-studio') return body.querySelector(selector);
    return body.querySelector(selector);
  },
  createElement(tag) { return makeNode(tag); },
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
};
const values = new Map();
const localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
let randomCount = 0;
const records = [
  { id:'run-1', at:new Date(Date.now()-5000).toISOString(), level:'PROTOCOL A', mode:'campaign', won:false, grade:'D', seconds:5.2, devices:3 },
  { id:'run-2', at:new Date(Date.now()-3000).toISOString(), level:'PROTOCOL A', mode:'campaign', won:true, grade:'A', seconds:4.5, devices:2 },
  { id:'run-daily', at:new Date(Date.now()-2000).toISOString(), level:'PROTOCOL A', mode:'daily', won:true, grade:'A+', seconds:4.0, devices:1 }
];
const window = {
  CASCADELAB015: { getSnapshot: () => records.map(row => ({...row})) },
  localStorage,
  crypto: { getRandomValues(bytes) { randomCount++; for (let i=0;i<bytes.length;i++) bytes[i]=(randomCount*17+i+1)%255; return bytes; } },
  setTimeout(fn) { fn(); return 1; },
  confirm() { return true; },
  addEventListener(name, handler) { (this.listeners ||= {})[name] = handler; }
};
class FakeMutationObserver { constructor(handler) { this.handler = handler; } observe() {} }
runInNewContext(source, { window, document, MutationObserver:FakeMutationObserver, URL, Blob, Uint8Array });

const api = window.CASCADELAB020;
assert.ok(api && api.version === '0.20.0', 'runtime public API should mount');
assert.equal(api.getStudies().length, 0, 'archive should start empty');
assert.equal(api.startStudy({baselineId:'missing',variable:'gravity',goal:'time',expected:'improve',hypothesis:'A clear hypothesis text',change:'Change exactly one variable'}), null, 'unknown baseline must be rejected');
assert.equal(api.startStudy({baselineId:'run-2',variable:'gravity',goal:'time',expected:'improve',targetObservations:2,hypothesis:'Changing gravity slightly changes travel time.',change:'Change only the gravity value by one step.',notes:'internal note'} )?.status, 'planned', 'valid controlled experiment should save');
let studies = api.getStudies();
assert.equal(studies.length, 1);
assert.equal(studies[0].baseline.mode, 'campaign');
assert.equal(studies[0].observations.length, 0);
assert.ok(values.has('osgard.cascade-lab.experiment-studio.v1'), 'archive should persist locally');

records.push({ id:'daily-after-plan', at:new Date(Date.now()+1000).toISOString(), level:'PROTOCOL A', mode:'daily', won:false, grade:'D', seconds:8, devices:5 });
api.reconcile();
assert.equal(api.getStudies()[0].observations.length, 0, 'a run from a different mode must not be compared');

records.push({ id:'run-3', at:new Date(Date.now()+2000).toISOString(), level:'PROTOCOL A', mode:'campaign', won:true, grade:'A+', seconds:3.75, devices:1 });
api.reconcile();
studies = api.getStudies();
assert.equal(studies[0].status, 'observing', 'partial replicate series should remain open');
assert.equal(studies[0].observations.length, 1, 'first matching attempt should be captured');
api.reconcile();
assert.equal(api.getStudies()[0].observations.length, 1, 'the same attempt must never be captured twice');

records.push({ id:'run-4', at:new Date(Date.now()+3000).toISOString(), level:'PROTOCOL A', mode:'campaign', won:true, grade:'A+', seconds:3.5, devices:1 });
api.reconcile();
studies = api.getStudies();
assert.equal(studies[0].status, 'observed', 'series should close at the selected observation count');
assert.equal(studies[0].observations.length, 2);
const delta = api.calculateDelta(studies[0].baseline, studies[0].observations[0]);
assert.equal(delta.outcome, 'unchanged');
assert.equal(delta.secondsDelta, -0.75);
assert.equal(delta.devicesDelta, -1);
assert.equal(delta.gradeSteps, 1);
assert.equal(delta.secondsPercent, -16.7);

const exported = api.exportPayload();
assert.equal(exported.schema, 'osgard.cascade-lab.experiment-studio-archive.v1');
assert.equal(exported.localOnly, true);
assert.equal(exported.uploaded, false);
assert.equal(api.importArchive(exported).imported, 0, 'duplicate IDs from re-import should be skipped');
assert.equal(api.importArchive({schema:'wrong',schemaVersion:1,studies:[]}).ok, false, 'invalid archive schema must be rejected atomically');
const repeated = api.startStudy({baselineId:'run-4',variable:'layout',goal:'reliability',expected:'reproduce',targetObservations:1,hypothesis:'Repeat the configuration to verify delivery reliability.',change:'Keep the build unchanged for this replication.'});
assert.ok(repeated && repeated.id !== studies[0].id, 'a second experiment must get a unique ID');
api.clearArchive();
assert.equal(api.getStudies().length, 0, 'clear action should erase the local archive');
console.log('CASCADE LAB Experiment Studio smoke: PASS — controlled studies, strict same-level/mode observations, deduplication, replication counts, metric deltas, safe local import/export and no network telemetry.');
