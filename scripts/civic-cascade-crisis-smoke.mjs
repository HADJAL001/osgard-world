import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('public/games/civic-cascade/index.html', 'utf8');
const release = JSON.parse(readFileSync('public/games/civic-cascade/release.json', 'utf8'));
assert.match(release.version, /^\d+\.\d+\.\d+$/, 'release.json must declare a semantic version');
assert.equal(release.releaseId, 'civic-cascade-web-' + release.version, 'release ID must match release.json version');
assert.equal(release.buildContract.missionChallenges.enabled, true, 'Mission challenge contract missing');
assert.equal(release.buildContract.missionChallenges.globalLeaderboard, false, 'Release must not claim a global leaderboard');
assert.equal(release.buildContract.operationDebrief?.enabled, true, 'Causal operation debrief contract missing');
assert.equal(release.buildContract.operationDebrief?.maxEvents, 20, 'Causal ledger must be bounded');
for (const marker of ['cc-causal-debrief','cc-causal-summary','cc-causal-count','cc-causal-risk-change','cc-causal-weakest','cc-causal-best','cc-causal-ledger','cc-doctrine-ai-advisor','cc-doctrine-ai-consent','cc-doctrine-ai-run','cc-doctrine-ai-status','cc-doctrine-ai-result]) assert.ok(html.includes('id="'+marker+'"'), 'Causal debrief DOM marker missing: '+marker);
const inline = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
assert.ok(inline && inline.length > 5000, 'CIVIC CASCADE inline runtime missing');
new Function(inline);
const parserMatch = inline.match(/function parseMissionChallenge\(search\)\{[\s\S]*?\n\}/);
assert.ok(parserMatch, 'Challenge URL validator must exist');
const parseChallenge = new Function('search', 'scenarioData', parserMatch[0] + '\nreturn parseMissionChallenge(search);');
const challengeScenarios = { flood: { name: 'Flood' }, blackout: { name: 'Blackout' }, blockade: { name: 'Blockade' } };
assert.deepEqual(parseChallenge('?cc_challenge=1&cc_scenario=blackout&cc_target=850&cc_ref=cc_0123abcd', challengeScenarios), { scenario: 'blackout', target: 850, ref: 'cc_0123abcd' });
assert.equal(parseChallenge('?cc_challenge=1&cc_scenario=unknown&cc_target=850', challengeScenarios), null, 'Unknown scenarios must not be accepted');
assert.equal(parseChallenge('?cc_challenge=1&cc_scenario=flood&cc_target=1000001', challengeScenarios), null, 'Challenge target must be bounded');
assert.equal(parseChallenge('?cc_challenge=1&cc_scenario=flood&cc_target=4.5', challengeScenarios), null, 'Fractional scores must be rejected');
assert.equal(parseChallenge('?cc_scenario=flood&cc_target=850', challengeScenarios), null, 'Ordinary visits must not become challenge sessions');
assert.ok(html.includes('name="osgard-game-version" content="' + release.version + '-'), 'CIVIC CASCADE HTML release marker must match release.json');
assert.ok(html.includes('id="cc-incident"') && html.includes('id="cc-incident-options"'), 'Crisis decision UI is missing');
assert.ok(html.includes('id="cc-result-challenge"') && html.includes('id="cc-challenge-banner"'), 'Shareable score challenge UI is missing');
assert.ok(inline.includes('function createMissionChallengeUrl') && inline.includes('utm_campaign') && inline.includes('civic_cascade_friend_challenge'), 'Challenge URLs need explicit campaign attribution');
assert.ok(inline.includes('localStorage') && inline.includes('function parseMissionChallenge'), 'Challenge routing must preserve the existing local-save architecture');
assert.ok(inline.includes('state.actionCount=(state.actionCount||0)+1'), 'Tactical action counter is not wired');
assert.ok(inline.includes('if(crisisIncidents[state.actionCount])openIncident(crisisIncidents[state.actionCount])'), 'Crisis triggers are not connected to tactical actions');
assert.ok(inline.includes('if(finished||activeIncident)return'), 'Mission completion must wait for an active crisis choice');
assert.ok(inline.includes("if(key==='actionCount'&&v===undefined)v=0") && inline.includes("key==='actionCount'&&s[key]===undefined?0:s[key]"), 'Legacy checkpoints must migrate without losing compatibility');
assert.ok(inline.includes('if(finished||activeIncident){toast(activeIncident?'), 'Checkpoint save must be blocked while an incident awaits a decision');

const start = inline.indexOf('const crisisIncidents={');
const end = inline.indexOf('\nfunction renderIncident(', start);
assert.ok(start >= 0 && end > start, 'Crisis incident deck could not be isolated for effect tests');
const deckSource = inline.slice(start, end);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const seedState = () => ({
  scenario: 'flood', water: 62, grid: 58, access: 49, supplies: 74,
  crews: 4, maxCrews: 4, waterRate: .2, gridRate: .12, accessRate: .12,
  riskOffset: 0, openedRoutes: 2, repairs: 0, pumps: 0, stabilized: 0,
  actionCount: 0, elapsed: 0, score: 0,
});
const createDeck = (state) => new Function('state', 'clamp', deckSource + '\nreturn crisisIncidents;')(state, clamp);
const probeState = seedState();
const deck = createDeck(probeState);
assert.deepEqual(Object.keys(deck).map(Number), [2, 4, 6], 'Exactly three ordered incident checkpoints should exist');

let testedChoices = 0;
for (const [actionNumber, incident] of Object.entries(deck)) {
  assert.ok(incident.id && incident.title && incident.copy, 'Incident ' + actionNumber + ' requires a title and decision description');
  assert.equal(incident.choices.length, 3, 'Incident ' + actionNumber + ' must provide two strategic answers and one no-cost fallback');
  assert.equal(incident.choices.filter(choice => choice.cost === 0).length, 1, 'Every incident must remain resolvable when supplies are exhausted');
  for (const choice of incident.choices) {
    assert.ok(choice.id && choice.label && choice.detail && choice.log && typeof choice.apply === 'function', 'Incident choice is incomplete: ' + choice.id);
    assert.ok(Number.isFinite(choice.cost) && choice.cost >= 0 && choice.cost <= 100, 'Invalid resource cost for ' + choice.id);
    const state = seedState();
    const isolatedDeck = createDeck(state);
    const isolatedChoice = isolatedDeck[actionNumber].choices.find(item => item.id === choice.id);
    state.supplies -= isolatedChoice.cost;
    isolatedChoice.apply();
    for (const key of ['water', 'grid', 'access', 'supplies']) {
      assert.ok(Number.isFinite(state[key]) && state[key] >= 0 && state[key] <= 100, choice.id + ' must keep ' + key + ' within 0–100');
    }
    assert.ok(Number.isInteger(state.crews) && state.crews >= 0 && state.crews <= state.maxCrews, choice.id + ' must keep crew counts valid');
    assert.ok(Number.isFinite(state.score) && state.score >= 0, choice.id + ' must keep score finite');
    testedChoices++;
  }
}

assert.equal(testedChoices, 9, 'All nine crisis responses should be evaluated');
console.log('PASS CIVIC CASCADE 2.7.0: mission challenges, safe query validation, three action-triggered incidents, pause-before-victory, legacy checkpoint migration, nine effects and no-supplies fallbacks.');

