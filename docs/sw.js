// Service Worker v0.4.0
const CACHE_NAME="2y-prompt-v0.4.0";
const APP_SHELL=["./","./index.html","./style.css","./library.css","./app.js","./manifest.json","./data/categories.json","./data/items.json","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ns=>Promise.all(ns.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;}).catch(async()=>await caches.match(e.request)||((e.request.mode==="navigate")?caches.match("./index.html"):new Response("Offline",{status:503}))));});
