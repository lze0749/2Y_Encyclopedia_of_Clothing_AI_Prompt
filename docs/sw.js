// 2Y Encyclopedia of Clothing AI Prompt
// Service Worker v0.7.0

const CACHE_NAME = "2y-prompt-v0.7.0";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./library.css",
    "./builder.css",
    "./storage.css",
    "./mobile.css",
    "./app.js",
    "./builder.js",
    "./storage.js",
    "./mobile.js",
    "./manifest.json",
    "./data/categories.json",
    "./data/items.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put("./index.html", copy);
                    });

                    return response;
                })
                .catch(() => caches.match("./index.html"))
        );

        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkRequest = fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();

                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, copy);
                        });
                    }

                    return response;
                })
                .catch(() => cached);

            return cached || networkRequest;
        })
    );
});
