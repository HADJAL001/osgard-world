import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync('public/games/consented-analytics.js', 'utf8');
const server = readFileSync('services/osgard-commerce-api/src/core.mjs', 'utf8');
const manifest = readFileSync('src/core/manifest.ts', 'utf8');
const detailPage = readFileSync('src/GameDetailPage.tsx', 'utf8');

function readSet(source, name) {
  const match = source.match(new RegExp('(?:export\\s+)?const\\s+' + name + '\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)'));
  assert.ok(match, 'Could not locate ' + name + ' set');
  const values = [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1]).sort();
  assert.equal(new Set(values).size, values.length, name + ' must not contain duplicates');
  return values;
}

const clientEvents = readSet(client, 'ALLOWED_EVENTS');
const serverEvents = readSet(server, 'ALLOWED_EVENTS');
assert.deepEqual(clientEvents, serverEvents, 'Browser and API event allowlists must stay identical');

const clientGames = readSet(client, 'GAME_IDS');
const serverGames = readSet(server, 'GAME_IDS');
assert.deepEqual(clientGames, serverGames, 'Browser and API game IDs must stay identical');

const manifestLine = manifest.split(String.fromCharCode(10)).find(line => line.startsWith('export type OsgardGameId = '))?.slice('export type OsgardGameId = '.length);
assert.ok(manifestLine, 'Canonical OSGARD game ID union must exist');
const manifestGames = [...manifestLine.matchAll(/'([^']+)'/g)].map(item => item[1]).sort();
assert.deepEqual(clientGames.filter(id => id !== 'unknown'), manifestGames,
  'Every catalog game must be accepted by consented client and server analytics');
assert.ok(clientGames.includes('afterimage-run'), 'AFTERIMAGE//RUN events must not be silently discarded');
assert.ok(clientGames.includes('unknown'), 'Non-game catalog events need the documented unknown ID');
assert.ok(client.includes("return value === 'yes' || value === 'granted';"),
  'Static queue must accept explicit consent from the React detail page');
assert.ok(detailPage.includes("value === 'granted' || value === 'yes'"),
  'React game detail must accept the Games hub consent value');
assert.ok(detailPage.includes("value === 'denied' || value === 'no'"),
  'React game detail must preserve a denial saved by the Games hub');

console.log('PASS analytics contract: identical browser/API event and game allowlists; all ten catalog games are supported.');
