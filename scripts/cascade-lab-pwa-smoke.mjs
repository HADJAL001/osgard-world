import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
const root=resolve('public/games/cascade-lab'),html=readFileSync(resolve(root,'index.html'),'utf8');
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.webmanifest'),'utf8')),worker=readFileSync(resolve(root,'service-worker.js'),'utf8'),icon=readFileSync(resolve(root,'lab-icon.svg'),'utf8');
const routeMatrix=readFileSync(resolve('scripts/production-route-matrix.mjs'),'utf8');
assert.match(html,/osgard-game-pwa" content="0\.27\.0-offline-counterfactual-lab"/);
assert.ok(html.includes('rel="manifest" href="./manifest.webmanifest"')&&html.includes('id="installLabButton"')&&html.includes("navigator.serviceWorker.register('./service-worker.js?v=0.27.0'"));
assert.equal(manifest.name,'CASCADE LAB — Premium Physics Lab');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./?source=pwa');assert.equal(manifest.icons[0].src,'./lab-icon.svg');assert.match(icon,/<svg[^>]+viewBox="0 0 512 512"/);
const b=worker.match(/const PRECACHE=\[([\s\S]*?)\];/);assert.ok(b);const paths=[...b[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
for(const p of ['./','./index.html','./manifest.webmanifest','./lab-icon.svg'])assert.ok(paths.includes(p));
for(const [,src] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)){assert.ok(paths.includes(src),'Module must be in offline cache: '+src);assert.ok(existsSync(resolve(root,src.replace(/^\.\//,'').split('?')[0])));}
assert.ok(worker.includes("r.method!=='GET'")&&worker.includes("r.mode==='navigate'")&&worker.includes('Response.error()'));
const cacheVersion=worker.match(/CACHE=PREFIX\+'v(\d+\.\d+\.\d+)'/);
const registrationVersion=html.match(/serviceWorker\.register\('\.\/service-worker\.js\?v=(\d+\.\d+\.\d+)'/);
assert.ok(cacheVersion&&registrationVersion&&cacheVersion[1]===registrationVersion[1],
  'PWA registration must reference the exact service-worker cache version.');
const workerBranchStart=routeMatrix.indexOf("route === '/games/cascade-lab/service-worker.js'");
const workerBranchEnd=routeMatrix.indexOf(": route === '/games/cascade-lab/lab-icon.svg'",workerBranchStart);
assert.ok(workerBranchStart>=0&&workerBranchEnd>workerBranchStart,'Production route matrix must include a dedicated service-worker contract.');
const workerRouteContract=routeMatrix.slice(workerBranchStart,workerBranchEnd);
assert.ok(workerRouteContract.includes("v\\d+\\.\\d+\\.\\d+")&&!workerRouteContract.includes("v0\\.26\\.0"),
  'Production service-worker check must accept semantic cache versions rather than pinning an old one.');
const S='https://osgard.world/games/cascade-lab/',events=Object.create(null),data=new Map();
const response=(body,status=200)=>({body,status,ok:status>=200&&status<300,clone(){return this}});
function cache(map){const key=x=>typeof x==='string'?x:x.url;return{async addAll(a){for(const p of a)map.set(new URL(p,S).href,response('cached:'+p));},async match(x){return map.get(key(x))||null;},async put(x,v){map.set(key(x),v);}};}
const caches={async open(n){if(!data.has(n))data.set(n,new Map());return cache(data.get(n));},async keys(){return [...data.keys()]},async delete(n){return data.delete(n)}};
data.set('osgard-cascade-lab-shell-v0.25.0',new Map());data.set('osgard-cascade-lab-shell-v0.26.0',new Map());data.set('osgard-cascade-lab-shell-v0.26.1',new Map());data.set('unrelated-cache',new Map());
const selfMock={registration:{scope:S},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener(n,h){events[n]=h;}};
runInNewContext(worker,{self:selfMock,caches,URL,fetch:async()=>{throw Error('offline')},Response:{error:()=>response('offline',0)}});
let pending;events.install({waitUntil(p){pending=p;}});await pending;
const cache270=await caches.open('osgard-cascade-lab-shell-v0.27.0');assert.ok(await cache270.match(S));
let act;events.activate({waitUntil(p){act=p;}});await act;assert.ok(!(await caches.keys()).includes('osgard-cascade-lab-shell-v0.25.0'));assert.ok(!(await caches.keys()).includes('osgard-cascade-lab-shell-v0.26.0'));assert.ok(!(await caches.keys()).includes('osgard-cascade-lab-shell-v0.26.1'));assert.ok((await caches.keys()).includes('unrelated-cache'));
let nav;events.fetch({request:{method:'GET',mode:'navigate',url:S+'?source=pwa'},respondWith(p){nav=p;}});assert.equal((await nav).status,200);
let post=false;events.fetch({request:{method:'POST',mode:'same-origin',url:S+'events'},respondWith(){post=true;}});assert.equal(post,false);
let external=false;events.fetch({request:{method:'GET',mode:'cors',url:'https://marcosa.club/'},respondWith(){external=true;}});assert.equal(external,false);
const boot=html.match(/<script data-osgard-pwa-bootstrap>([\s\S]*?)<\/script>/);assert.ok(boot);new Function(boot[1]);
console.log('PASS CASCADE LAB PWA: manifest, install UI, exact module precache, scoped service worker, offline navigation simulation.');
