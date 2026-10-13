import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRelatedGames } from '../src/core/gameRecommendations.mjs';

const games = [
  { id: 'time', category: 'strategy' },
  { id: 'swarm', category: 'coop' },
  { id: 'null-shift', category: 'tactical' },
  { id: 'inherit', category: 'world' },
  { id: 'remix', category: 'creative' },
  { id: 'signal-run', category: 'creative' },
  { id: 'civic-cascade', category: 'strategy' },
  { id: 'patina', category: 'creative' },
  { id: 'cascade-lab', category: 'creative' },
  { id: 'afterimage-run', category: 'creative' },
  { id: 'aether-grid', category: 'creative' },
];

const find = id => games.find(game => game.id === id);
const gameDetailSource = readFileSync(new URL('../src/GameDetailPage.tsx', import.meta.url), 'utf8');
const detailIds = [...gameDetailSource.matchAll(/^\s*id: '([a-z0-9-]+)'/gm)].map(match => match[1]);
assert.deepEqual([...new Set(detailIds)].sort(), games.map(game => game.id).sort(),
  'Contextual recommendations must cover the same game IDs as the individual game pages');
for (const game of games) {
  const related = getRelatedGames(game, games);
  assert.ok(related.some(item => item.reason === 'curated'),
    'Every published game must have at least one curated recommendation: ' + game.id);
  assert.ok(related.every(item => item.game.id !== game.id), 'A game must not recommend itself: ' + game.id);
}
const base = getRelatedGames(find('civic-cascade'), games);
assert.deepEqual(base.map(item => item.game.id), ['time', 'null-shift', 'inherit']);
assert.equal(new Set(base.map(item => item.game.id)).size, base.length, 'recommendations must not duplicate games');
assert.ok(!base.some(item => item.game.id === 'civic-cascade'), 'the current game must be excluded');
assert.equal(base[0].reason, 'curated');

const aether = getRelatedGames(find('aether-grid'), games);
assert.deepEqual(aether.map(item => item.game.id), ['cascade-lab', 'afterimage-run', 'signal-run'],
  'AETHER GRID must get curated related games, not generic category-order fallbacks');
assert.ok(aether.every(item => item.reason === 'curated'), 'AETHER GRID recommendations must be explicitly curated');

const favorite = getRelatedGames(find('civic-cascade'), games, { favorites: ['patina'] });
assert.equal(favorite[2].game.id, 'patina', 'a saved favorite may enter the visible top three');
assert.equal(favorite[2].reason, 'favorite', 'the UI must explain favorite-driven relevance');

const recent = getRelatedGames(find('civic-cascade'), games, { recent: ['time'] });
assert.deepEqual(recent.slice(0, 2).map(item => item.game.id), ['null-shift', 'inherit'],
  'recently opened games should be deprioritized when alternatives are relevant');

const favoriteRecent = getRelatedGames(find('civic-cascade'), games, {
  favorites: ['time'],
  recent: ['time'],
});
assert.equal(favoriteRecent[0].game.id, 'time', 'a favorite must not be penalized by recency');
assert.equal(favoriteRecent[0].reason, 'favorite');

assert.deepEqual(getRelatedGames(find('time'), games, {}, 1).map(item => item.game.id), ['civic-cascade']);
assert.deepEqual(getRelatedGames(find('time'), games, {}, -2), []);
assert.equal(getRelatedGames(find('time'), games, {}, 999).length, 5, 'the requested limit must be bounded');
assert.deepEqual(getRelatedGames({ id: 'not-in-list', category: 'creative' }, games, {}).length, 3,
  'unknown IDs should fail softly and still return deterministic options');
assert.deepEqual(getRelatedGames(find('time'), games, { favorites: 'not-an-array', recent: null }).map(x => x.game.id),
  getRelatedGames(find('time'), games).map(x => x.game.id), 'malformed preferences must be ignored safely');

const duplicateGames = [...games, { id: 'civic-cascade', category: 'strategy' }];
assert.equal(getRelatedGames(find('time'), duplicateGames).filter(x => x.game.id === 'civic-cascade').length, 1,
  'duplicate IDs must not produce duplicate cards');

console.log('PASS OSGARD contextual game discovery: curated relevance, favorites, recent history, bounded output and malformed preferences.');
