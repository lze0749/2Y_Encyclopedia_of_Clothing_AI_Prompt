// ======================================
// 2Y Dual Character Prompt Builder
// Version: v2.4.0
// ======================================

(() => {
    const HISTORY_KEY = "2y-prompt-history-v1";

    const PLATFORM_LABELS = {
        pixai: "PixAI",
        niji: "Niji Journey",
        tensorart: "TensorArt",
        gpt: "GPT Image"
    };

    const CATEGORY_LABELS = {
        tops: "上衣／內搭",
        pants: "褲子",
        skirts: "裙子",
        dresses: "連身裙",
        outerwear: "外套",
        accessories: "飾品",
        hairstyles: "髮型",
        "hair-accessories": "髮飾",
        shoes: "鞋子",
        hands: "手部配件",
        nails: "美甲",
        bags: "包袋",
        "handheld-props": "手持配件",
        waist: "腰部配飾",
        poses: "雙人姿勢"
    };

    const REQUIRED_OUTFIT_CATEGORIES = [
        "tops",
        "outerwear",
        "accessories",
        "hairstyles",
        "shoes"
    ];

    const OPTIONAL_CATEGORIES = [
        "hair-accessories",
        "hands",
        "nails",
        "bags",
        "handheld-props",
        "waist"
    ];

    const RELATIONSHIP_PROMPTS = {
        friends:
            "two close friends with natural relaxed chemistry",
        lovers:
            "a romantic couple with affectionate body language",
        rivals:
            "two stylish rivals with tense competitive chemistry",
        siblings:
            "two siblings with familiar coordinated body language",
        partners:
            "two trusted partners with balanced teamwork",
        strangers:
            "two strangers sharing a visually meaningful moment",
        guardian:
            "a protective guardian and a younger companion",
        performers:
            "two performance partners with synchronized stage presence"
    };

    const INTERACTION_PROMPTS = {
        side:
            "standing side by side, both full bodies clearly visible",
        face:
            "facing each other, readable eye contact and distinct silhouettes",
        back:
            "standing back to back, contrasting silhouettes",
        holdhands:
            "holding hands naturally, clear separate arms and fingers",
        embrace:
            "a gentle two-person embrace, unobstructed faces",
        dance:
            "a synchronized dance pose with controlled spacing",
        action:
            "a coordinated dynamic action pose, clear body separation",
        seated:
            "one seated and one standing nearby, balanced visual hierarchy"
    };

    const NEGATIVE =
        "single person, extra person, merged bodies, fused limbs, shared torso, duplicated face, duplicated arms, duplicated legs, malformed hands, incorrect hand contact, tangled clothing, overlapping outfits, identity mixing, face blending, logo, text, watermark";

    const state = {
        items: [],
        categories: [],
        selectedA: [],
        selectedB: [],
        pose: null,
        platform: "pixai"
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindControls();

        try {
            await loadData();
            renderSelections();
            renderOutputs();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    });

    function createPanel() {
        if (document.getElementById("dualCharacterPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "dualCharacterPanel";
        panel.className =
            "dual-character-panel app-section-target";

        panel.innerHTML = `
            <div class="dual-character-heading">
                <div>
                    <p class="dual-character-eyebrow">
                        TWO-PERSON PROMPT BUILDER
                    </p>

                    <h2>雙人角色穿搭設置</h2>

                    <p>
                        分別建立角色 A 與角色 B 的服裝，
                        再加入雙人關係、互動姿勢與構圖約束。
                    </p>
                </div>

                <span class="dual-character-version">
                    v2.4.0
                </span>
            </div>

            <div class="dual-character-settings">
                <label>
                    <span>輸出平台</span>
                    <select id="dualPlatform">
                        <option value="pixai">PixAI</option>
                        <option value="niji">Niji Journey</option>
                        <option value="tensorart">TensorArt</option>
                        <option value="gpt">GPT Image</option>
                    </select>
                </label>

                <label>
                    <span>雙人關係</span>
                    <select id="dualRelationship">
                        <option value="friends">朋友</option>
                        <option value="lovers">戀人</option>
                        <option value="rivals">競爭對手</option>
                        <option value="siblings">兄弟姊妹</option>
                        <option value="partners">搭檔</option>
                        <option value="strangers">陌生人</option>
                        <option value="guardian">守護者與同伴</option>
                        <option value="performers">表演搭檔</option>
                    </select>
                </label>

                <label>
                    <span>互動構圖</span>
                    <select id="dualInteraction">
                        <option value="side">並肩站立</option>
                        <option value="face">面對面</option>
                        <option value="back">背靠背</option>
                        <option value="holdhands">牽手</option>
                        <option value="embrace">擁抱</option>
                        <option value="dance">雙人舞</option>
                        <option value="action">共同動作</option>
                        <option value="seated">一坐一站</option>
                    </select>
                </label>

                <label class="dual-character-check">
                    <input id="dualCoordinatedTheme"
                        type="checkbox" checked>
                    <span>兩人使用協調主題與配色</span>
                </label>
            </div>

            <div class="dual-character-grid">
                ${characterForm("A", "角色 A")}
                ${characterForm("B", "角色 B")}
            </div>

            <div class="dual-character-main-actions">
                <button id="generateDualCharactersButton"
                    type="button">
                    🎲 產生雙人穿搭
                </button>

                <button id="rerollDualPoseButton"
                    class="dual-secondary"
                    type="button">
                    🔄 只重抽雙人姿勢
                </button>

                <button id="swapDualCharactersButton"
                    class="dual-secondary"
                    type="button">
                    ⇄ 交換 A／B
                </button>
            </div>

            <div class="dual-character-result">
                <div class="dual-result-columns">
                    <div>
                        <h3>角色 A</h3>
                        <div id="dualSelectionA"
                            class="dual-selection-list">
                            <p>尚未產生。</p>
                        </div>
                    </div>

                    <div>
                        <h3>角色 B</h3>
                        <div id="dualSelectionB"
                            class="dual-selection-list">
                            <p>尚未產生。</p>
                        </div>
                    </div>
                </div>

                <div class="dual-pose-display">
                    <span>雙人姿勢</span>
                    <strong id="dualPoseName">尚未產生</strong>
                </div>

                <label class="dual-output-field">
                    <span>Prompt</span>
                    <textarea id="dualPromptOutput"
                        rows="15" readonly></textarea>
                </label>

                <div class="dual-copy-actions">
                    <button id="copyDualPromptButton"
                        type="button">
                        📋 複製 Prompt
                    </button>

                    <button id="saveDualHistoryButton"
                        class="dual-secondary"
                        type="button">
                        🕘 儲存到歷史
                    </button>
                </div>

                <label class="dual-output-field">
                    <span>Negative Prompt</span>
                    <textarea id="dualNegativeOutput"
                        rows="6" readonly></textarea>
                </label>
            </div>
        `;

        const expansionPanel =
            document.getElementById(
                "expansionDashboardPanel"
            );

        if (expansionPanel) {
            expansionPanel.insertAdjacentElement(
                "afterend",
                panel
            );
        } else {
            content.appendChild(panel);
        }
    }

    function characterForm(key, title) {
        return `
            <article class="dual-character-card">
                <h3>${title}</h3>

                <label>
                    <span>角色名稱</span>
                    <input id="dualName${key}"
                        placeholder="${title}">
                </label>

                <label>
                    <span>性別偏好</span>
                    <select id="dualGender${key}">
                        <option value="all">全部</option>
                        <option value="female">女裝＋中性</option>
                        <option value="male">男裝＋中性</option>
                        <option value="unisex">僅中性</option>
                    </select>
                </label>

                <label>
                    <span>服裝形式</span>
                    <select id="dualMode${key}">
                        <option value="auto">自動</option>
                        <option value="separates">上衣＋褲／裙</option>
                        <option value="dress">連身裙</option>
                    </select>
                </label>

                <label>
                    <span>角色定位</span>
                    <input id="dualRole${key}"
                        placeholder="例如：冷靜劍士、活潑魔法師">
                </label>
            </article>
        `;
    }

    function bindControls() {
        document
            .getElementById("generateDualCharactersButton")
            ?.addEventListener("click", generateDual);

        document
            .getElementById("rerollDualPoseButton")
            ?.addEventListener("click", rerollPose);

        document
            .getElementById("swapDualCharactersButton")
            ?.addEventListener("click", swapCharacters);

        document
            .getElementById("copyDualPromptButton")
            ?.addEventListener("click", async () => {
                const text =
                    value("dualPromptOutput");

                if (!text) {
                    showToast("目前沒有 Prompt");
                    return;
                }

                await copyText(text);
                showToast("雙人 Prompt 已複製");
            });

        document
            .getElementById("saveDualHistoryButton")
            ?.addEventListener("click", saveToHistory);

        [
            "dualPlatform",
            "dualRelationship",
            "dualInteraction",
            "dualCoordinatedTheme",
            "dualNameA",
            "dualNameB",
            "dualRoleA",
            "dualRoleB"
        ].forEach((id) => {
            const element =
                document.getElementById(id);

            element?.addEventListener(
                element.type === "checkbox"
                    ? "change"
                    : "input",
                renderOutputs
            );

            element?.addEventListener(
                "change",
                renderOutputs
            );
        });
    }

    async function loadData() {
        const [itemResponse, categoryResponse] =
            await Promise.all([
                fetch("./data/items.json"),
                fetch("./data/categories.json")
            ]);

        if (!itemResponse.ok) {
            throw new Error(
                `items.json HTTP ${itemResponse.status}`
            );
        }

        state.items =
            await itemResponse.json();

        state.categories =
            categoryResponse.ok
                ? await categoryResponse.json()
                : [];
    }

    function generateDual() {
        state.platform =
            value("dualPlatform") || "pixai";

        const coordinated =
            document.getElementById(
                "dualCoordinatedTheme"
            )?.checked === true;

        state.selectedA =
            buildCharacter(
                value("dualGenderA") || "all",
                value("dualModeA") || "auto",
                []
            );

        state.selectedB =
            buildCharacter(
                value("dualGenderB") || "all",
                value("dualModeB") || "auto",
                coordinated
                    ? state.selectedA
                    : []
            );

        state.pose =
            pickDualPose();

        renderSelections();
        renderOutputs();

        showToast("已產生雙人角色穿搭");
    }

    function buildCharacter(gender, mode, referenceItems) {
        const selected = [];

        let resolvedMode = mode;

        if (resolvedMode === "auto") {
            resolvedMode =
                Math.random() < 0.35
                    ? "dress"
                    : "separates";
        }

        if (resolvedMode === "dress") {
            addRandom(
                selected,
                "dresses",
                gender,
                referenceItems
            );
        } else {
            addRandom(
                selected,
                "tops",
                gender,
                referenceItems
            );

            addRandom(
                selected,
                Math.random() < 0.5
                    ? "pants"
                    : "skirts",
                gender,
                referenceItems
            );
        }

        REQUIRED_OUTFIT_CATEGORIES.forEach((category) => {
            addRandom(
                selected,
                category,
                gender,
                referenceItems,
                category === "outerwear"
                    ? 0.72
                    : 1
            );
        });

        OPTIONAL_CATEGORIES.forEach((category) => {
            addRandom(
                selected,
                category,
                gender,
                referenceItems,
                0.48
            );
        });

        return uniqueById(selected);
    }

    function addRandom(
        selected,
        category,
        gender,
        referenceItems,
        probability = 1
    ) {
        if (Math.random() > probability) {
            return;
        }

        const candidates =
            state.items.filter((item) => {
                if (item?.category !== category) {
                    return false;
                }

                if (
                    !matchesGender(item, gender)
                ) {
                    return false;
                }

                return !selected.some(
                    (entry) => entry.id === item.id
                );
            });

        if (!candidates.length) {
            return;
        }

        const weighted =
            candidates.map((item) => ({
                item,
                weight:
                    coordinationWeight(
                        item,
                        referenceItems
                    )
            }));

        const picked =
            weightedPick(weighted);

        if (picked) {
            selected.push(picked);
        }
    }

    function coordinationWeight(item, referenceItems) {
        if (!referenceItems.length) {
            return 1;
        }

        const text =
            searchableText(item);

        const referenceText =
            referenceItems
                .map(searchableText)
                .join(" ");

        const themes = [
            "gothic",
            "techwear",
            "streetwear",
            "fantasy",
            "formal",
            "romantic",
            "traditional",
            "purple",
            "green",
            "black",
            "white",
            "gold",
            "silver",
            "leather",
            "velvet",
            "satin",
            "nylon",
            "lace"
        ];

        let weight = 1;

        themes.forEach((theme) => {
            if (
                text.includes(theme) &&
                referenceText.includes(theme)
            ) {
                weight += 2;
            }
        });

        return weight;
    }

    function pickDualPose() {
        const candidates =
            state.items.filter((item) =>
                item?.category === "poses" &&
                includesAny(item, [
                    "雙人",
                    "兩人",
                    "two people",
                    "two characters",
                    "duo",
                    "pair pose",
                    "couple pose"
                ])
            );

        if (candidates.length) {
            return candidates[
                Math.floor(Math.random() * candidates.length)
            ];
        }

        return {
            id: "fallback_dual_pose",
            category: "poses",
            name_zh: "雙人並肩站立",
            name_en: "Two-Person Side-by-Side Pose",
            prompts: {
                pixai:
                    "two distinct characters standing side by side, full bodies visible, clear body separation",
                niji:
                    "two distinct characters standing side by side, full-body composition, clear body separation",
                tensorart:
                    "two distinct people standing side by side, clean anatomy, separate limbs",
                gpt:
                    "Place two distinct characters side by side with both full bodies visible and no body overlap."
            }
        };
    }

    function rerollPose() {
        state.pose = pickDualPose();
        renderSelections();
        renderOutputs();
        showToast("已重抽雙人姿勢");
    }

    function swapCharacters() {
        [
            ["dualNameA", "dualNameB"],
            ["dualGenderA", "dualGenderB"],
            ["dualModeA", "dualModeB"],
            ["dualRoleA", "dualRoleB"]
        ].forEach(([a, b]) => {
            const aValue = value(a);
            const bValue = value(b);

            setValue(a, bValue);
            setValue(b, aValue);
        });

        const selectedA =
            state.selectedA;

        state.selectedA =
            state.selectedB;

        state.selectedB =
            selectedA;

        renderSelections();
        renderOutputs();
        showToast("已交換角色 A 與角色 B");
    }

    function renderSelections() {
        renderCharacterSelection(
            "dualSelectionA",
            state.selectedA
        );

        renderCharacterSelection(
            "dualSelectionB",
            state.selectedB
        );

        setText(
            "dualPoseName",
            state.pose
                ? `${state.pose.name_zh} · ${state.pose.name_en}`
                : "尚未產生"
        );
    }

    function renderCharacterSelection(id, items) {
        const container =
            document.getElementById(id);

        if (!container) return;

        if (!items.length) {
            container.innerHTML =
                "<p>尚未產生。</p>";

            return;
        }

        container.innerHTML =
            items.map((item) => `
                <span>
                    <strong>
                        ${escapeHtml(item.name_zh)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            CATEGORY_LABELS[item.category] ||
                            item.category
                        )}
                    </small>
                </span>
            `).join("");
    }

    function renderOutputs() {
        state.platform =
            value("dualPlatform") || "pixai";

        const prompt =
            buildPrompt();

        setValue(
            "dualPromptOutput",
            prompt
        );

        setValue(
            "dualNegativeOutput",
            NEGATIVE
        );
    }

    function buildPrompt() {
        if (
            !state.selectedA.length ||
            !state.selectedB.length
        ) {
            return "";
        }

        const nameA =
            value("dualNameA") || "Character A";

        const nameB =
            value("dualNameB") || "Character B";

        const roleA =
            value("dualRoleA");

        const roleB =
            value("dualRoleB");

        const relationship =
            RELATIONSHIP_PROMPTS[
                value("dualRelationship") || "friends"
            ];

        const interaction =
            INTERACTION_PROMPTS[
                value("dualInteraction") || "side"
            ];

        const promptA =
            state.selectedA
                .map((item) =>
                    item.prompts?.[state.platform]
                )
                .filter(Boolean)
                .join(", ");

        const promptB =
            state.selectedB
                .map((item) =>
                    item.prompts?.[state.platform]
                )
                .filter(Boolean)
                .join(", ");

        const posePrompt =
            state.pose?.prompts?.[state.platform] ||
            state.pose?.name_en ||
            "";

        const coordination =
            document.getElementById(
                "dualCoordinatedTheme"
            )?.checked
                ? "coordinated visual theme and color harmony, clearly different outfits"
                : "clearly distinct outfit themes and color identities";

        if (state.platform === "gpt") {
            return [
                "Create one image containing exactly two distinct characters.",
                `${nameA}${roleA ? ` (${roleA})` : ""}: ${promptA}.`,
                `${nameB}${roleB ? ` (${roleB})` : ""}: ${promptB}.`,
                `Relationship: ${relationship}.`,
                `Interaction and composition: ${interaction}; ${posePrompt}.`,
                `Styling requirement: ${coordination}.`,
                "Keep each character's face, body, outfit, hands, accessories, and identity completely separate and internally consistent."
            ].join(" ");
        }

        return [
            "exactly two characters",
            relationship,
            interaction,
            `Character A, ${nameA}${roleA ? `, ${roleA}` : ""}: ${promptA}`,
            `Character B, ${nameB}${roleB ? `, ${roleB}` : ""}: ${promptB}`,
            posePrompt,
            coordination,
            "two distinct faces, two complete separate bodies, clear limb separation, both outfits fully readable"
        ]
            .filter(Boolean)
            .join(", ");
    }

    function saveToHistory() {
        const prompt =
            value("dualPromptOutput");

        if (!prompt) {
            showToast("目前沒有雙人 Prompt");
            return;
        }

        try {
            const records =
                JSON.parse(
                    localStorage.getItem(HISTORY_KEY)
                ) || [];

            const source =
                "雙人角色穿搭";

            const platform =
                PLATFORM_LABELS[state.platform] ||
                state.platform;

            records.unshift({
                id:
                    `history_${Date.now()}_${Math.random()
                        .toString(36).slice(2, 8)}`,
                prompt,
                negative: NEGATIVE,
                source,
                platform,
                savedAt:
                    new Date().toISOString()
            });

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(records.slice(0, 100))
            );

            showToast("雙人 Prompt 已儲存到歷史");
        } catch (error) {
            console.warn(error);
            showToast("無法儲存到歷史");
        }
    }

    function matchesGender(item, gender) {
        if (
            item.gender === "none" ||
            gender === "all"
        ) {
            return true;
        }

        if (gender === "female") {
            return ["female", "unisex"]
                .includes(item.gender);
        }

        if (gender === "male") {
            return ["male", "unisex"]
                .includes(item.gender);
        }

        return item.gender === "unisex";
    }

    function weightedPick(entries) {
        const total =
            entries.reduce(
                (sum, entry) =>
                    sum + entry.weight,
                0
            );

        let cursor =
            Math.random() * total;

        for (const entry of entries) {
            cursor -= entry.weight;

            if (cursor <= 0) {
                return entry.item;
            }
        }

        return entries.at(-1)?.item;
    }

    function searchableText(item) {
        return [
            item.name_zh,
            item.name_en,
            item.description_zh,
            item.description_en,
            ...(item.tags || []),
            ...Object.values(item.anatomy || {}),
            ...Object.values(item.prompts || {})
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
    }

    function includesAny(item, terms) {
        const text =
            searchableText(item);

        return terms.some((term) =>
            text.includes(term.toLowerCase())
        );
    }

    function uniqueById(items) {
        return [
            ...new Map(
                items.map((item) => [item.id, item])
            ).values()
        ];
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea =
                document.createElement("textarea");

            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }
    }

    function showError(message) {
        const output =
            document.getElementById(
                "dualPromptOutput"
            );

        if (output) {
            output.value =
                `雙人設置載入失敗：${message}`;
        }
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container =
                document.getElementById(
                    "sectionNavLinks"
                );

            if (
                !container ||
                container.querySelector(
                    "[data-dual-nav]"
                )
            ) {
                return;
            }

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "section-nav-link";
            button.dataset.dualNav =
                "true";
            button.innerHTML =
                "<span>👥</span><span>雙人設置</span>";

            button.addEventListener("click", () => {
                document
                    .getElementById(
                        "dualCharacterPanel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1950);
    }

    function showToast(message) {
        let toast =
            document.getElementById(
                "dualCharacterToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "dualCharacterToast";
            toast.className =
                "dual-character-toast";

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(showToast.timer);

        showToast.timer =
            window.setTimeout(() => {
                toast.classList.remove("show");
            }, 1800);
    }

    function value(id) {
        return document
            .getElementById(id)
            ?.value.trim() || "";
    }

    function setValue(id, next) {
        const element =
            document.getElementById(id);

        if (element) {
            element.value = next;
        }
    }

    function setText(id, next) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = next;
        }
    }

    function escapeHtml(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();
