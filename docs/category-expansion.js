// ======================================
// 2Y Category Expansion Bridge
// Version: v2.4.0
// IMPORTANT: Load before pack-bridge.js and app.js
// ======================================

(() => {
    const originalFetch = window.fetch.bind(window);

    const additions = [
        {
            id: "hair-accessories",
            name_zh: "髮飾",
            name_en: "Hair Accessories",
            icon: "🎀",
            description_zh: "髮帶、髮夾、髮簪、髮冠、帽飾與其他髮部裝飾。"
        },
        {
            id: "nails",
            name_zh: "美甲",
            name_en: "Nail Art",
            icon: "💅",
            description_zh: "指甲形狀、色彩、材質、彩繪、珠飾與立體美甲設計。"
        },
        {
            id: "bags",
            name_zh: "包袋",
            name_en: "Bags",
            icon: "👜",
            description_zh: "手提包、肩背包、腰包、後背包、箱包與特殊造型包袋。"
        },
        {
            id: "handheld-props",
            name_zh: "手持配件",
            name_en: "Handheld Props",
            icon: "🪄",
            description_zh: "武器、書本、傘、花束、杯具、樂器與其他手持物件。"
        }
    ];

    const labelOverrides = {
        tops: {
            name_zh: "上衣／內搭",
            name_en: "Tops & Innerwear"
        },
        outerwear: {
            name_zh: "外套／斗篷／披肩",
            name_en: "Outerwear, Capes & Shawls"
        },
        accessories: {
            name_zh: "飾品配件",
            name_en: "Jewelry & Accessories"
        },
        hands: {
            name_zh: "手部配件",
            name_en: "Hand Accessories"
        },
        "bags-props": {
            name_zh: "包袋／手持配件（舊分類）",
            name_en: "Bags & Props (Legacy)"
        },
        waist: {
            name_zh: "腰部配飾",
            name_en: "Waist Accessories"
        },
        poses: {
            name_zh: "姿勢（單人／雙人）",
            name_en: "Poses (Solo & Duo)"
        }
    };

    function isCategoriesRequest(input) {
        try {
            const raw =
                typeof input === "string"
                    ? input
                    : input?.url;

            if (!raw) return false;

            const url = new URL(raw, window.location.href);

            return url.pathname.endsWith("/data/categories.json");
        } catch {
            return false;
        }
    }

    window.fetch = async function categoryAwareFetch(input, init) {
        if (!isCategoriesRequest(input)) {
            return originalFetch(input, init);
        }

        const response = await originalFetch(input, init);

        if (!response.ok) {
            return response;
        }

        try {
            const categories = await response.clone().json();

            if (!Array.isArray(categories)) {
                return response;
            }

            const merged = new Map();

            categories.forEach((category) => {
                if (!category?.id) return;

                merged.set(category.id, {
                    ...category,
                    ...(labelOverrides[category.id] || {})
                });
            });

            additions.forEach((category) => {
                if (!merged.has(category.id)) {
                    merged.set(category.id, category);
                }
            });

            const headers = new Headers(response.headers);

            headers.set(
                "Content-Type",
                "application/json; charset=utf-8"
            );

            headers.set(
                "X-2Y-Category-Expansion",
                "v2.4.0"
            );

            return new Response(
                JSON.stringify([...merged.values()]),
                {
                    status: 200,
                    statusText: "OK",
                    headers
                }
            );
        } catch (error) {
            console.warn(
                "2Y category expansion failed:",
                error
            );

            return response;
        }
    };
})();
