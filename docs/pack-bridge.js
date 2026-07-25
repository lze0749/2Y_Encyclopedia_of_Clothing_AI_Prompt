// ======================================
// 2Y Modular Data Pack Bridge
// Version: v1.9.0
// IMPORTANT: Load before custom-bridge.js and app.js
// ======================================

(() => {
    const SETTINGS_KEY = "2y-enabled-data-packs-v1";
    const originalFetch = window.fetch.bind(window);

    let mergedItemsPromise = null;

    function isMainItemsRequest(input) {
        try {
            const rawUrl =
                typeof input === "string"
                    ? input
                    : input?.url;

            if (!rawUrl) {
                return false;
            }

            const url = new URL(rawUrl, window.location.href);

            return url.pathname.endsWith("/data/items.json");
        } catch {
            return false;
        }
    }

    async function readJson(response, fallback) {
        if (!response?.ok) {
            return fallback;
        }

        try {
            return await response.json();
        } catch {
            return fallback;
        }
    }

    function getEnabledPackIds(manifest) {
        try {
            const stored = JSON.parse(
                localStorage.getItem(SETTINGS_KEY)
            );

            if (Array.isArray(stored)) {
                return new Set(stored);
            }
        } catch {
            // Ignore invalid local settings.
        }

        return new Set(
            (manifest.packs || [])
                .filter((pack) => pack.default_enabled)
                .map((pack) => pack.id)
        );
    }

    async function buildMergedItems(input, init) {
        const baseResponse = await originalFetch(input, init);

        if (!baseResponse.ok) {
            return {
                response: baseResponse,
                items: null
            };
        }

        const baseItems = await readJson(
            baseResponse.clone(),
            []
        );

        if (!Array.isArray(baseItems)) {
            return {
                response: baseResponse,
                items: null
            };
        }

        const manifestResponse = await originalFetch(
            "./data/packs/manifest.json",
            { cache: "no-cache" }
        );

        const manifest = await readJson(
            manifestResponse,
            { packs: [] }
        );

        const enabledIds = getEnabledPackIds(manifest);

        const activePacks = (manifest.packs || [])
            .filter((pack) => enabledIds.has(pack.id));

        const packResults = await Promise.allSettled(
            activePacks.map(async (pack) => {
                const response = await originalFetch(
                    pack.file,
                    { cache: "no-cache" }
                );

                const items = await readJson(response, []);

                return Array.isArray(items) ? items : [];
            })
        );

        const merged = new Map();

        baseItems.forEach((item) => {
            if (item?.id) {
                merged.set(item.id, item);
            }
        });

        packResults.forEach((result) => {
            if (result.status !== "fulfilled") {
                return;
            }

            result.value.forEach((item) => {
                if (item?.id) {
                    merged.set(item.id, item);
                }
            });
        });

        return {
            response: baseResponse,
            items: [...merged.values()]
        };
    }

    window.fetch = async function packAwareFetch(input, init) {
        if (!isMainItemsRequest(input)) {
            return originalFetch(input, init);
        }

        if (!mergedItemsPromise) {
            mergedItemsPromise = buildMergedItems(input, init)
                .catch((error) => {
                    console.warn(
                        "2Y data pack merge failed:",
                        error
                    );

                    mergedItemsPromise = null;

                    return {
                        response: null,
                        items: null
                    };
                });
        }

        const result = await mergedItemsPromise;

        if (!result?.items) {
            return result?.response ||
                originalFetch(input, init);
        }

        const headers = new Headers(
            result.response?.headers || {}
        );

        headers.set(
            "Content-Type",
            "application/json; charset=utf-8"
        );

        headers.set(
            "X-2Y-Data-Packs",
            "enabled"
        );

        return new Response(
            JSON.stringify(result.items),
            {
                status: 200,
                statusText: "OK",
                headers
            }
        );
    };
})();
