// 2Y Encyclopedia of Clothing AI Prompt
// Service Worker v1.6.0

const CACHE_NAME = "2y-prompt-v1.6.0";

const APP_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./library.css",
    "./filters.css",
    "./builder.css",
    "./storage.css",
    "./mobile.css",
    "./custom.css",
    "./parameter.css",
    "./navigation.css",
    "./release.css",
    "./random.css",
    "./history.css",
    "./platform.css",
    "./custom-bridge.js",
    "./app.js",
    "./builder.js",
    "./storage.js",
    "./mobile.js",
    "./custom.js",
    "./parameter.js",
    "./navigation.js",
    "./release.js",
    "./random.js",
    "./history.js",
    "./platform.js",
    "./manifest.json",
    "./data/categories.json",
    "./data/items.json",
    "./data/attributes.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await Promise.allSettled(
                APP_ASSETS.map(async asset => {
                    try { await cache.add(asset); }
                    catch { console.warn("略過無法快取：", asset); }
                })
            );
        })
    );
});

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put("./index.html", copy));
                    }
                    return response;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || network;
        })
    );
});
