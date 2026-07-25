// ======================================
// 2Y Multilingual Search Aliases
// Version: v1.3.0
// Load this AFTER custom-bridge.js and BEFORE app.js / builder.js.
// ======================================

(() => {
    const previousFetch = window.fetch.bind(window);

    const CATEGORY_ALIASES = {
        tops: ["上衣", "內搭", "衣服", "top", "innerwear"],
        pants: ["褲子", "長褲", "下身", "pants", "trousers"],
        skirts: ["裙子", "半身裙", "skirt"],
        dresses: ["連身裙", "洋裝", "禮服", "dress", "gown"],
        outerwear: ["外套", "大衣", "風衣", "斗篷", "披肩", "coat", "cape"],
        accessories: ["飾品", "配件", "首飾", "accessory", "jewelry"],
        hairstyles: ["髮型", "頭髮", "髮飾", "hair", "hairstyle"],
        shoes: ["鞋子", "鞋履", "靴子", "shoes", "boots"],
        hands: ["手套", "手部配件", "美甲", "指甲", "gloves", "nails"],
        "bags-props": ["包包", "包袋", "手持物", "道具", "bag", "prop"],
        waist: ["腰部配件", "腰帶", "腰封", "waist", "belt"],
        poses: ["姿勢", "動作", "手勢", "pose"],
        foreground: ["前景", "foreground"],
        background: ["背景", "場景", "background", "scene"],
        camera: ["鏡頭", "構圖", "視角", "camera", "composition"],
        lighting: ["光線", "燈光", "打光", "lighting"],
        filters: ["濾鏡", "調色", "filter", "color grade"],
        moods: ["氛圍", "情緒", "mood", "atmosphere"],
        purposes: ["用途", "使用情境", "use case", "purpose"]
    };

    const GROUPS = [
        [["leather", "patent leather"], ["皮革", "皮質", "皮衣", "皮褲", "皮靴"]],
        [["patent leather"], ["漆皮", "亮面皮革"]],
        [["cotton"], ["棉", "棉質", "純棉"]],
        [["wool"], ["羊毛", "毛料", "羊毛混紡"]],
        [["silk"], ["絲綢", "真絲"]],
        [["satin"], ["緞面", "緞質"]],
        [["velvet"], ["天鵝絨", "絲絨"]],
        [["linen"], ["亞麻", "麻料"]],
        [["denim"], ["牛仔", "牛仔布"]],
        [["lace"], ["蕾絲", "花邊"]],
        [["chiffon"], ["雪紡"]],
        [["tulle"], ["薄紗", "網紗裙"]],
        [["mesh"], ["網紗", "網眼"]],
        [["nylon", "technical fabric"], ["尼龍", "機能布料"]],
        [["transparent pvc", "transparent tpu"], ["透明塑膠", "透明材質", "PVC", "TPU"]],
        [["metal", "metallic"], ["金屬", "金屬質感", "甲片"]],
        [["fur"], ["毛絨", "毛領", "人造毛"]],
        [["jacquard", "brocade"], ["提花", "織錦"]],
        [["knit"], ["針織", "毛衣"]],

        [["gothic"], ["哥德", "暗黑"]],
        [["punk"], ["龐克", "叛逆"]],
        [["techwear", "technical"], ["科技機能", "機能", "機能風"]],
        [["cyberpunk"], ["賽博龐克", "電馭叛客"]],
        [["steampunk"], ["蒸氣龐克"]],
        [["fantasy"], ["奇幻", "幻想"]],
        [["victorian"], ["維多利亞"]],
        [["streetwear"], ["街頭", "街頭風"]],
        [["formal", "tailored", "tailoring"], ["正式", "西裝", "剪裁"]],
        [["romantic"], ["浪漫"]],
        [["minimal"], ["極簡", "簡約"]],
        [["academy", "preppy"], ["學院", "學院風"]],
        [["armor", "armored"], ["盔甲", "輕甲", "戰士"]],
        [["traditional", "East Asian"], ["傳統", "東方風"]],
        [["futuristic"], ["未來感", "未來主義"]],

        [["purple"], ["紫色", "紫"]],
        [["neon green"], ["螢光綠", "霓虹綠"]],
        [["green"], ["綠色", "綠"]],
        [["black"], ["黑色", "黑"]],
        [["white", "ivory"], ["白色", "白", "象牙白"]],
        [["red", "burgundy", "scarlet"], ["紅色", "酒紅", "猩紅"]],
        [["blue", "teal"], ["藍色", "青綠"]],
        [["gold", "golden"], ["金色", "金"]],
        [["silver"], ["銀色", "銀"]],
        [["gradient"], ["漸層", "漸變"]],
        [["transparent", "sheer"], ["透明", "半透明"]],

        [["hoodie", "hooded"], ["帽T", "連帽", "連帽上衣"]],
        [["shirt"], ["襯衫"]],
        [["blouse"], ["女式襯衫", "襯衫上衣"]],
        [["corset"], ["束身衣", "束腰", "馬甲"]],
        [["vest"], ["背心"]],
        [["jacket"], ["短外套", "夾克"]],
        [["coat"], ["大衣", "長外套"]],
        [["cape"], ["斗篷"]],
        [["trench"], ["風衣"]],
        [["parka"], ["派克大衣"]],
        [["bomber"], ["飛行外套", "飛行夾克"]],
        [["skirt"], ["裙子", "半身裙"]],
        [["dress", "gown"], ["連身裙", "洋裝", "禮服"]],
        [["pants", "trousers"], ["褲子", "長褲"]],
        [["cargo"], ["工裝", "多口袋"]],
        [["boots"], ["靴子"]],
        [["sneakers"], ["運動鞋"]],
        [["gloves"], ["手套"]],
        [["bag", "satchel", "crossbody"], ["包包", "包袋", "側背包"]],

        [["ruffle"], ["荷葉邊", "荷葉"]],
        [["pleat"], ["百褶", "打褶", "褶線"]],
        [["embroider"], ["刺繡"]],
        [["chain"], ["鍊條", "鏈條"]],
        [["buckle"], ["扣帶", "金屬扣"]],
        [["zip"], ["拉鍊"]],
        [["pocket"], ["口袋"]],
        [["asymmetr"], ["不對稱"]],
        [["oversized"], ["寬鬆", "大版", "oversize"]],
        [["cropped"], ["短版", "露腰"]],
        [["high-waist"], ["高腰"]],
        [["wide-leg"], ["寬褲", "寬腿"]]
    ];

    function isItemsRequest(input) {
        const url =
            typeof input === "string"
                ? input
                : input instanceof Request
                    ? input.url
                    : String(input);

        return (
            url.endsWith("data/items.json") ||
            url.endsWith("./data/items.json") ||
            url.includes("/data/items.json?")
        );
    }

    function searchableText(item) {
        return [
            item.category,
            item.name_zh,
            item.name_en,
            item.description_zh,
            item.description_en,
            ...Object.keys(item.anatomy || {}),
            ...Object.values(item.anatomy || {}),
            ...(item.tags || []),
            ...Object.values(item.prompts || {}),
            item.negative
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
    }

    function enrich(item) {
        const text = searchableText(item);
        const tags = new Set(item.tags || []);

        (CATEGORY_ALIASES[item.category] || [])
            .forEach((alias) => tags.add(alias));

        GROUPS.forEach(([matches, aliases]) => {
            const hit = matches.some((term) =>
                text.includes(String(term).toLowerCase())
            );

            if (hit) {
                aliases.forEach((alias) => tags.add(alias));
            }
        });

        return {
            ...item,
            tags: [...tags]
        };
    }

    window.fetch = async (input, init) => {
        const response = await previousFetch(input, init);

        if (!isItemsRequest(input) || !response.ok) {
            return response;
        }

        try {
            const items = await response.clone().json();

            if (!Array.isArray(items)) {
                return response;
            }

            const headers = new Headers(response.headers);
            headers.set(
                "Content-Type",
                "application/json; charset=utf-8"
            );
            headers.set("Cache-Control", "no-store");

            return new Response(
                JSON.stringify(items.map(enrich)),
                {
                    status: response.status,
                    statusText: response.statusText,
                    headers
                }
            );
        } catch (error) {
            console.warn(
                "搜尋別名處理失敗，改用原始資料。",
                error
            );

            return response;
        }
    };
})();
