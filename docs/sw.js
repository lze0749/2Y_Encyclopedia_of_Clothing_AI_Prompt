// 2Y Encyclopedia of Clothing AI Prompt
// Service Worker v1.2.0

const CACHE_NAME = "2y-prompt-v1.2.0";

const APP_SHELL = [
    "./", "./index.html", "./style.css", "./library.css", "./filters.css",
    "./builder.css", "./storage.css", "./mobile.css", "./custom.css",
    "./parameter.css", "./navigation.css", "./release.css", "./app.js",
    "./builder.js", "./storage.js", "./mobile.js", "./custom-bridge.js",
    "./custom.js", "./parameter.js", "./navigation.js", "./release.js",
    "./manifest.json", "./data/categories.json", "./data/items.json",
    "./data/attributes.json", "./icons/icon-192.png", "./icons/icon-512.png",
    "./icons/apple-touch-icon.png"
];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL))));
self.addEventListener("message", e => { if (e.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(n => Promise.all(n.filter(x => x !== CACHE_NAME).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const cp=r.clone(); caches.open(CACHE_NAME).then(c=>c.put("./index.html",cp)); return r; }).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => { if(r.ok){ const cp=r.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,cp)); } return r; }).catch(()=>cached)));
});
