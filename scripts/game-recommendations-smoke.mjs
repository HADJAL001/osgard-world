import assert from 'node:assert/strict';
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
];

const find = id => games.find(game => game.id === id);
const base = getRelatedGames(find('civic-cascade'), games);
assert.deepEqual(base.map(item => item.game.id), ['time', 'null-shift', 'inherit']);
assert.equal(new Set(base.map(item => item.game.id)).size, base.length, 'recommendations must not duplicate games');
assert.ok(!base.some(item => item.game.id === 'civic-cascade'), 'the current game must be excluded');
assert.equal(base[0].reason, 'curated');

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
