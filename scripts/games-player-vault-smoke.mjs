import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

const source = readFileSync('public/games/vault/vault-core.js', 'utf8');
const sandbox = { TextEncoder, crypto: webcrypto };
runInNewContext(source, sandbox, { filename: 'vault-core.js' });
const core = sandbox.OSGARDPlayerVaultCore;
assert.ok(core, 'vault core must register its public API');
const encoder = new TextEncoder();

class FakeStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); this.reads = []; }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { this.reads.push(key); return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
async function validDigest(doc) {
  const payload = { ...doc };
  delete payload.integrity;
  const bytes = encoder.encode(core.canonical(payload));
  const digest = await webcrypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function withDigest(doc) {
  const copy = structuredClone(doc);
  delete copy.integrity;
  return validDigest(copy).then(checksum => ({ ...copy, integrity: { algorithm: 'SHA-256', checksum } }));
}
function test(name, fn) {
  return Promise.resolve().then(fn).then(() => console.log('ok - ' + name));
}

await test('exports only the explicit allow-list and never reads credentials or consent', async () => {
  const storage = new FakeStorage({
    'osgard.games.favorites.v1': JSON.stringify(['time', 'swarm', 'fake-game', 'time']),
    'inherit-world-v1': JSON.stringify({
      generation: 174, budget: 98, changes: ['placed tree'], objects: [
        { tool: 'tree', x: 15.234, y: 30 }, { tool: '<img onerror=alert(1)>', x: 4, y: 5 }, { tool: 'stone', x: 999, y: 12 }
      ],
      history: [{ generation: 174, by: '<svg onload=x>', action: 'left a <script> safe trace & mark', when: 'today' }],
      pending: [{ type: 'light', x: 50, y: 51 }], snapshots: [{ generation: 174, objects: [{ tool: 'path', x: 1, y: 2 }] }]
    }),
    'inherit-author': '@Player <script>',
    'inherit-last-passed': '174',
    'inherit-journey': JSON.stringify({ opened: true, '__proto__': true, 'bad key': true }),
    'osgard.signal-run.daily-streak.v1': JSON.stringify({ count: 7, lastDate: '2026-10-13' }),
    'osgard.signal-run.daily-best.2026-10-13': '428',
    'osgard.auth.accessToken': 'secret-access-token',
    'osgard.games.analytics-consent.v1': 'yes',
    'osgard.games.invite-code.v1': 'private-invite',
    'remix-api-url': 'https://api.example.invalid/?token=private',
    'session-like-temp': 'temporary',
  });
  const result = await core.createBackup(storage, webcrypto, encoder, new Date('2026-10-14T05:00:00.000Z'));
  const ids = result.backup.entries.map(item => item.id);
  assert.equal(JSON.stringify(ids), JSON.stringify([...ids].sort()));
  assert.equal(result.backup.format, 'osgard-player-vault');
  assert.equal(result.backup.schemaVersion, 1);
  assert.ok(ids.includes('catalog-favorites'));
  assert.ok(ids.includes('inherit-world'));
  assert.ok(ids.includes('signal-run-streak'));
  assert.ok(ids.includes('signal-run-best:2026-10-13'));
  assert.ok(!ids.includes('osgard.auth.accessToken'));
  for (const forbidden of ['osgard.auth.accessToken', 'osgard.games.analytics-consent.v1', 'osgard.games.invite-code.v1', 'remix-api-url', 'session-like-temp']) {
    assert.ok(!storage.reads.includes(forbidden), 'must not read sensitive or unknown value: ' + forbidden);
    assert.ok(!JSON.stringify(result.backup).includes(forbidden), 'backup must not expose forbidden key: ' + forbidden);
  }
  const favorites = result.backup.entries.find(item => item.id === 'catalog-favorites');
  assert.equal(JSON.stringify(favorites.value), JSON.stringify(['time', 'swarm']));
  const world = result.backup.entries.find(item => item.id === 'inherit-world').value;
  assert.equal(world.objects.length, 1, 'invalid tool and out-of-bounds objects are dropped');
  assert.equal(world.objects[0].x, 15.23);
  assert.ok(!JSON.stringify(world.history).includes('<'));
  assert.ok(!JSON.stringify(world.history).includes('&'));
  assert.ok(!JSON.stringify(result.backup).includes('<script>'));
  assert.equal(result.backup.integrity.algorithm, 'SHA-256');
});

await test('valid backup passes checksum verification and exports only normalized entries', async () => {
  const storage = new FakeStorage({
    'osgard.games.favorites.v1': JSON.stringify(['afterimage-run', 'aether-grid']),
    'osgard.signal-run.daily-best.2026-10-14': '512'
  });
  const created = await core.createBackup(storage, webcrypto, encoder, new Date('2026-10-14T05:00:00.000Z'));
  const checked = await core.validateBackup(created.backup, webcrypto, encoder);
  assert.equal(checked.supportedCount, 2);
  assert.equal(checked.createdAt, created.backup.createdAt);
  assert.ok(checked.entries.some(entry => entry.id === 'catalog-favorites'));
  assert.ok(checked.entries.some(entry => core.serializeEntry(entry) === '512'));
});

await test('detects accidental tampering after backup creation', async () => {
  const created = await core.createBackup(new FakeStorage({
    'osgard.games.favorites.v1': JSON.stringify(['time'])
  }), webcrypto, encoder, new Date('2026-10-14T05:00:00.000Z'));
  const tampered = structuredClone(created.backup);
  tampered.entries[0].value = ['swarm'];
  await assert.rejects(() => core.validateBackup(tampered, webcrypto, encoder), /Контрольная сумма не совпадает/);
});

await test('rejects unknown keys even if an attacker recomputes the checksum', async () => {
  const created = await core.createBackup(new FakeStorage({
    'osgard.games.favorites.v1': JSON.stringify(['time'])
  }), webcrypto, encoder, new Date('2026-10-14T05:00:00.000Z'));
  const bad = structuredClone(created.backup);
  bad.entries.push({ id: 'access-token', key: 'osgard.auth.accessToken', value: 'secret' });
  const signed = await withDigest(bad);
  await assert.rejects(() => core.validateBackup(signed, webcrypto, encoder), /неподдерживаемая или повторяющаяся запись/);
});

await test('rejects duplicate records, invalid favorites and oversized files', async () => {
  const created = await core.createBackup(new FakeStorage({
    'osgard.games.favorites.v1': JSON.stringify(['time'])
  }), webcrypto, encoder, new Date('2026-10-14T05:00:00.000Z'));
  const duplicate = structuredClone(created.backup);
  duplicate.entries.push(structuredClone(duplicate.entries[0]));
  await assert.rejects(async () => core.validateBackup(await withDigest(duplicate), webcrypto, encoder), /повторяющаяся запись/);
  const invalid = structuredClone(created.backup);
  invalid.entries[0].value = 'not-an-array';
  await assert.rejects(async () => core.validateBackup(await withDigest(invalid), webcrypto, encoder), /не прошли проверку/);
  await assert.rejects(() => core.validateBackup('x'.repeat(core.MAX_BACKUP_BYTES + 1), webcrypto, encoder), /лимита 1 MiB/);
});

await test('storage serialization only maps approved records back to local keys', async () => {
  const entry = { id: 'catalog-favorites', key: 'osgard.games.favorites.v1', value: ['time', 'swarm'] };
  assert.equal(core.serializeEntry(entry), '["time","swarm"]');
  assert.equal(core.expectedIdForKey('osgard.auth.accessToken'), null);
  assert.equal(core.expectedIdForKey('osgard.signal-run.daily-best.2026-10-14'), 'signal-run-best:2026-10-14');
  assert.equal(core.expectedIdForKey('osgard.signal-run.daily-best.2026-02-30'), null);
});

await test('INHERIT schema clamps bounds and rejects malformed top-level values', () => {
  assert.equal(core.normalizeWorld({ generation: 'NaN', budget: 1, objects: [] }), null);
  const safe = core.normalizeWorld({
    generation: 1000000001, budget: -1, objects: [{ tool: 'tree', x: 2, y: 5 }]
  });
  assert.equal(safe, null);
});

console.log('PLAYER VAULT SMOKE: 7 checks passed');
