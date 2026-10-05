import { cp, mkdir, readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const swarmRoot = resolve(projectRoot, '..', 'swarm-mvp');
const targetRoot = resolve(projectRoot, 'public', 'games', 'swarm');
const assets = ['index.html', 'game.js', 'styles.css'];

await mkdir(targetRoot, { recursive: true });

try { await access(swarmRoot) } catch {
  console.log(`SWARM sibling source not present; keeping checked-in assets in ${targetRoot}`)
  process.exit(0)
}

for (const asset of assets) {
  const source = resolve(swarmRoot, asset);
  const target = resolve(targetRoot, asset);
  await readFile(source);
  await cp(source, target);
}

console.log(`Synced SWARM assets (${assets.length}) from ${swarmRoot}`);
