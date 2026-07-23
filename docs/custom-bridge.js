// ======================================
// 2Y Custom Items Bridge
// Version: v0.8.0
// Loads local custom entries into app.js and builder.js
// ======================================

(() => {
    const STORAGE_KEY = "2y-custom-items-v1";
    const nativeFetch = window.fetch.bind(window);

    function getCustomItems() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    window.fetch = async (input, init) => {
        const requestUrl =
            typeof input === "string"
                ? input
                : input instanceof Request
                    ? input.url
                    : String(input);

        const response = await nativeFetch(input, init);

        if (!requestUrl.includes("/data/items.json") &&
            !requestUrl.endsWith("./data/items.json") &&
            !requestUrl.endsWith("data/items.json")) {
            return response;
        }

        if (!response.ok) return response;

        const baseItems = await response.clone().json();
        const customItems = getCustomItems();

        return new Response(
            JSON.stringify([...baseItems, ...customItems]),
            {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            }
        );
    };

    window.addEventListener("2y-custom-items-changed", () => {
        // Existing modules keep data in memory, so reload once after a save/delete/import.
        // The service worker is network-first for the page, and custom data remains in localStorage.
        window.setTimeout(() => window.location.reload(), 120);
    });
})();
