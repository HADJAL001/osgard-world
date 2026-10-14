'use strict';
const PREFIX='osgard-cascade-lab-shell-',CACHE=PREFIX+'v0.27.1',ROOT=new URL('./',self.registration.scope).href;
const PRECACHE=['./','./index.html','./manifest.webmanifest','./lab-icon.svg','./delta-lens.js','./hypothesis-lab.js?v=0.18.0','./engineering-suite.js?v=0.19.0','./experiment-studio.js?v=0.20.0','./case-passport.js?v=0.21.0','./trajectory-xray.js?v=0.22.0','./mission-director.js?v=0.24.1','./evidence-integrity.js?v=0.25.0','./reproducibility-lab.js?v=0.27.0'];
function inside(url){const u=new URL(url),s=new URL(self.registration.scope);return u.origin===s.origin&&u.pathname.startsWith(s.pathname);}
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(PRECACHE);await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
 const r=e.request;if(!r||r.method!=='GET')return;const u=new URL(r.url);if(!inside(u))return;
 if(r.mode==='navigate'){e.respondWith((async()=>{try{const fresh=await fetch(r);if(fresh&&fresh.ok){const c=await caches.open(CACHE);await c.put(ROOT,fresh.clone());}return fresh;}catch{const c=await caches.open(CACHE);return await c.match(ROOT)||await c.match(new URL('./index.html',ROOT).href)||Response.error();}})());return;}
 e.respondWith((async()=>{const c=await caches.open(CACHE);const old=await c.match(r);if(old)return old;try{const fresh=await fetch(r);if(fresh&&fresh.ok&&inside(new URL(r.url)))await c.put(r,fresh.clone());return fresh;}catch{return Response.error();}})());
});
