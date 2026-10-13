import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pagePath = resolve(root, 'public/games/growth-studio/index.html');
assert.ok(existsSync(pagePath), 'Growth Studio page must exist');
const page = readFileSync(pagePath, 'utf8');
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, pass: true }); }
  catch (error) { checks.push({ name, pass: false, error: String(error.message || error) }); }
}

check('premium responsive page and reduced-motion support', () => {
  assert.ok(page.includes('OSGARD Growth Studio'));
  assert.ok(page.includes('@media(max-width:640px)'));
  assert.ok(page.includes('prefers-reduced-motion:reduce'));
  assert.ok(!/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(page));
});
check('all nine existing game identifiers are available', () => {
  for (const id of ['signal-run','remix','null-shift','time','swarm','inherit','civic-cascade','patina','cascade-lab']) assert.ok(page.includes('value="'+id+'"'), id);
});
check('invite URL follows canonical catalogue og_ref/og_game contract', () => {
  for (const item of ["function inviteCode()", "url.searchParams.set('og_ref'", "url.searchParams.set('og_game',game)", "url.searchParams.set('utm_source','osgard_play')", "url.searchParams.set('utm_medium','referral')", "url.searchParams.set('utm_campaign','play_with_friends')", "url.searchParams.set('utm_content',game)"]) assert.ok(page.includes(item), item);
  assert.ok(!page.includes("url.searchParams.set('challenge',game)"), 'Campaign builder should not emit legacy challenge/ref links');
});
check('analytics checks existing consent and sends only the allowlisted share event', () => {
  assert.ok(page.includes("localStorage.getItem(CONSENT_KEY)==='yes'"));
  assert.ok(page.includes("name:'share_created'"));
  assert.ok(page.includes("'/v1/events'"));
  assert.ok(page.includes("source:'game-invite:'+state.game+':'+state.code"));
  assert.ok(page.includes("if(!state.game||!getConsent())return false"));
});
check('share flow does not count cancellation and supports explicit clipboard action', () => {
  assert.ok(page.includes('async function shareInvite()'));
  assert.ok(page.includes("await navigator.share("));
  assert.ok(page.includes("await navigator.clipboard.writeText(state.url)"));
  assert.ok(page.includes("error.name==='AbortError'"));
  assert.ok(page.includes('Доставка сообщения не подтверждена'));
});
check('offline branded card is a local 1200x630 canvas export', () => {
  assert.ok(page.includes('canvas id="share-card" width="1200" height="630"'));
  assert.ok(page.includes("toDataURL('image/png')"));
  assert.ok(page.includes("canvas.getContext('2d')"));
  assert.ok(page.includes('OSGARD PLAY  /  CHALLENGE'));
  assert.ok(page.includes("$('poster-placeholder').hidden=Boolean(state.url)"), 'Placeholder should remain until an invite is generated');
});
check('model calculator exposes full referral funnel and labels assumptions', () => {
  for (const id of ['cohort-size','share-rate','invites-per-sharer','open-rate','start-rate','complete-rate','m-shares','m-opens','m-starts','m-k']) assert.ok(page.includes('id="'+id+'"'), id);
  assert.ok(page.includes("status:'hypothesis-only'"));
  assert.ok(page.includes('not live audience measurements'));
  assert.ok(page.includes('Числа являются сценарием') || page.includes('сценарий'));
});
check('campaign brief and experiment can be exported locally', () => {
  assert.ok(page.includes('URL.createObjectURL'));
  assert.ok(page.includes('application/json;charset=utf-8'));
  assert.ok(page.includes('text/markdown;charset=utf-8'));
  assert.ok(page.includes("kind:'osgard-growth-campaign-brief'"));
});
check('existing economics and partner pilot pages remain discoverable', () => {
  assert.ok(page.includes('href="/games/monetization/"'));
  assert.ok(page.includes('href="/games/partners/"'));
  assert.ok(page.includes('utm_campaign=sponsor_pilot'));
});
check('inline JavaScript syntax parses', () => {
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0][1]));
});
check('Partner Studio links to Growth Studio', () => {
  const partnerPage = readFileSync(resolve(root, 'public/games/partners/index.html'), 'utf8');
  assert.ok(partnerPage.includes('href="/games/growth-studio/"'));
});
const failed = checks.filter(item => !item.pass);
console.log('OSGARD Growth Studio smoke: ' + (checks.length - failed.length) + ' PASS / ' + failed.length + ' FAIL');
for (const item of checks) console.log((item.pass ? 'PASS ' : 'FAIL ') + item.name + (item.error ? ' — ' + item.error : ''));
if (failed.length) process.exitCode = 1;
