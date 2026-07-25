// ======================================
// 2Y Random Outfit Generator
// Version: v1.4.0
// ======================================

(() => {
    const STORAGE_KEY = "2y-random-outfit-v1";

    const state = {
        items: [],
        categories: [],
        selectedIds: [],
        platform: "pixai",
        gender: "all",
        outfitMode: "auto",
        includeOuterwear: true,
        includeForeground: false
    };

    const CATEGORY_ORDER = [
        "tops",
        "pants",
        "skirts",
        "dresses",
        "outerwear",
        "accessories",
        "hairstyles",
        "shoes",
        "hands",
        "bags-props",
        "waist",
        "poses",
        "foreground",
        "background",
        "camera",
        "lighting",
        "filters",
        "moods",
        "purposes"
    ];

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindControls();
        restoreSettings();

        try {
            await loadData();
            renderSettings();
            restorePreviousResult();
            bindQuickAction();
        } catch (error) {
            console.error(error);
            showMessage(`隨機穿搭資料載入失敗：${error.message}`, true);
        }
    });

    function createPanel() {
        if (document.getElementById("randomOutfitPanel")) {
            return;
        }

        const content = document.querySelector(".content");

        if (!content) {
            return;
        }

        const panel = document.createElement("section");
        panel.id = "randomOutfitPanel";
        panel.className = "random-outfit-panel app-section-target";
        panel.innerHTML = `
            <div class="random-heading">
                <div>
                    <p class="random-eyebrow">RANDOM OUTFIT GENERATOR</p>
                    <h2>隨機完整穿搭</h2>
                    <p>
                        自動抽取服裝、髮型、鞋子、配件、姿勢、背景、
                        鏡頭與光線，組合成可直接使用的生圖提示詞。
                    </p>
                </div>

                <span class="random-version">v1.4.0</span>
            </div>

            <div class="random-layout">
                <div class="random-controls">
                    <label class="random-field">
                        <span>輸出平台</span>
                        <select id="randomPlatform">
                            <option value="pixai">PixAI</option>
                            <option value="niji">Niji Journey</option>
                            <option value="tensorart">TensorArt</option>
                            <option value="gpt">GPT Image</option>
                        </select>
                    </label>

                    <label class="random-field">
                        <span>適用偏好</span>
                        <select id="randomGender">
                            <option value="all">全部</option>
                            <option value="female">女裝＋中性</option>
                            <option value="male">男裝＋中性</option>
                            <option value="unisex">僅男女皆可</option>
                        </select>
                    </label>

                    <label class="random-field">
                        <span>服裝形式</span>
                        <select id="randomOutfitMode">
                            <option value="auto">自動決定</option>
                            <option value="separates">上衣＋下身</option>
                            <option value="dress">連身裙</option>
                        </select>
                    </label>

                    <label class="random-check">
                        <input id="randomOuterwear" type="checkbox" checked>
                        <span>加入外套／斗篷</span>
                    </label>

                    <label class="random-check">
                        <input id="randomForeground" type="checkbox">
                        <span>加入前景元素</span>
                    </label>

                    <button
                        id="generateRandomOutfitButton"
                        class="random-main-button"
                        type="button"
                    >
                        🎲 產生完整穿搭
                    </button>

                    <button
                        id="rerollSceneButton"
                        class="random-secondary-button"
                        type="button"
                    >
                        🎬 只重抽場景與鏡頭
                    </button>

                    <button
                        id="clearRandomOutfitButton"
                        class="random-text-button"
                        type="button"
                    >
                        清除結果
                    </button>
                </div>

                <div class="random-workspace">
                    <div class="random-section-title">
                        <h3>抽選結果</h3>
                        <span id="randomItemCount">0 個元素</span>
                    </div>

                    <div
                        id="randomSelectedItems"
                        class="random-selected-items"
                        aria-live="polite"
                    >
                        <p class="random-empty">
                            按下「產生完整穿搭」開始。
                        </p>
                    </div>

                    <label class="random-output-field">
                        <span>Prompt</span>
                        <textarea
                            id="randomPromptOutput"
                            rows="11"
                            readonly
                            placeholder="生成後會顯示完整 Prompt。"
                        ></textarea>
                    </label>

                    <div class="random-copy-row">
                        <button id="copyRandomPromptButton" type="button">
                            📋 複製 Prompt
                        </button>
                    </div>

                    <label class="random-output-field">
                        <span>Negative Prompt</span>
                        <textarea
                            id="randomNegativeOutput"
                            rows="5"
                            readonly
                            placeholder="生成後會顯示 Negative Prompt。"
                        ></textarea>
                    </label>

                    <div class="random-copy-row">
                        <button
                            id="copyRandomNegativeButton"
                            class="negative"
                            type="button"
                        >
                            📋 複製 Negative
                        </button>
                    </div>
                </div>
            </div>
        `;

        const parameterPanel =
            document.getElementById("parameterLabPanel");

        if (parameterPanel) {
            parameterPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document
            .getElementById("generateRandomOutfitButton")
            ?.addEventListener("click", generateCompleteOutfit);

        document
            .getElementById("rerollSceneButton")
            ?.addEventListener("click", rerollScene);

        document
            .getElementById("clearRandomOutfitButton")
            ?.addEventListener("click", clearResult);

        document
            .getElementById("copyRandomPromptButton")
            ?.addEventListener("click", () => {
                copyText(
                    document.getElementById("randomPromptOutput")?.value || "",
                    "完整 Prompt 已複製"
                );
            });

        document
            .getElementById("copyRandomNegativeButton")
            ?.addEventListener("click", () => {
                copyText(
                    document.getElementById("randomNegativeOutput")?.value || "",
                    "Negative Prompt 已複製"
                );
            });

        [
            "randomPlatform",
            "randomGender",
            "randomOutfitMode",
            "randomOuterwear",
            "randomForeground"
        ].forEach((id) => {
            document.getElementById(id)?.addEventListener("change", () => {
                readSettingsFromControls();
                persistSettings();
                renderOutputs();
            });
        });
    }

    async function loadData() {
        const [categoryResponse, itemResponse] = await Promise.all([
            fetch("./data/categories.json"),
            fetch("./data/items.json")
        ]);

        if (!categoryResponse.ok) {
            throw new Error(`categories.json HTTP ${categoryResponse.status}`);
        }

        if (!itemResponse.ok) {
            throw new Error(`items.json HTTP ${itemResponse.status}`);
        }

        state.categories = await categoryResponse.json();
        state.items = await itemResponse.json();

        if (!Array.isArray(state.items) || !state.items.length) {
            throw new Error("items.json 沒有可用資料");
        }
    }

    function renderSettings() {
        setValue("randomPlatform", state.platform);
        setValue("randomGender", state.gender);
        setValue("randomOutfitMode", state.outfitMode);
        setChecked("randomOuterwear", state.includeOuterwear);
        setChecked("randomForeground", state.includeForeground);
    }

    function readSettingsFromControls() {
        state.platform = value("randomPlatform") || "pixai";
        state.gender = value("randomGender") || "all";
        state.outfitMode = value("randomOutfitMode") || "auto";
        state.includeOuterwear =
            document.getElementById("randomOuterwear")?.checked ?? true;
        state.includeForeground =
            document.getElementById("randomForeground")?.checked ?? false;
    }

    function generateCompleteOutfit() {
        if (!state.items.length) {
            showMessage("資料仍在載入中。", true);
            return;
        }

        readSettingsFromControls();

        const selected = [];
        const mode =
            state.outfitMode === "auto"
                ? (Math.random() < 0.42 ? "dress" : "separates")
                : state.outfitMode;

        if (mode === "dress") {
            pushRandom(selected, "dresses");
        } else {
            pushRandom(selected, "tops");

            const lowerCategory =
                Math.random() < 0.5 ? "pants" : "skirts";

            pushRandom(selected, lowerCategory);
        }

        if (state.includeOuterwear && Math.random() < 0.82) {
            pushRandom(selected, "outerwear");
        }

        pushRandom(selected, "accessories", 2);
        pushRandom(selected, "hairstyles");
        pushRandom(selected, "shoes");

        if (Math.random() < 0.66) {
            pushRandom(selected, "hands");
        }

        if (Math.random() < 0.72) {
            pushRandom(selected, "bags-props");
        }

        if (Math.random() < 0.66) {
            pushRandom(selected, "waist");
        }

        pushRandom(selected, "poses");

        if (state.includeForeground) {
            pushRandom(selected, "foreground");
        }

        pushRandom(selected, "background");
        pushRandom(selected, "camera");
        pushRandom(selected, "lighting");
        pushRandom(selected, "filters");
        pushRandom(selected, "moods");
        pushRandom(selected, "purposes");

        state.selectedIds = uniqueById(selected).map((item) => item.id);

        persistSettings();
        renderSelection();
        renderOutputs();
        showToast("已產生一組完整穿搭");
    }

    function rerollScene() {
        if (!state.selectedIds.length) {
            generateCompleteOutfit();
            return;
        }

        readSettingsFromControls();

        const sceneCategories = new Set([
            "foreground",
            "background",
            "camera",
            "lighting",
            "filters",
            "moods",
            "purposes",
            "poses"
        ]);

        const keptItems = getSelectedItems().filter(
            (item) => !sceneCategories.has(item.category)
        );

        const selected = [...keptItems];

        pushRandom(selected, "poses");

        if (state.includeForeground) {
            pushRandom(selected, "foreground");
        }

        pushRandom(selected, "background");
        pushRandom(selected, "camera");
        pushRandom(selected, "lighting");
        pushRandom(selected, "filters");
        pushRandom(selected, "moods");
        pushRandom(selected, "purposes");

        state.selectedIds = uniqueById(selected).map((item) => item.id);

        persistSettings();
        renderSelection();
        renderOutputs();
        showToast("已重新抽選場景與鏡頭");
    }

    function pushRandom(target, category, count = 1) {
        const candidates = getCandidates(category).filter(
            (item) => !target.some((selected) => selected.id === item.id)
        );

        if (!candidates.length) {
            return;
        }

        const shuffled = [...candidates].sort(() => Math.random() - 0.5);

        shuffled.slice(0, count).forEach((item) => target.push(item));
    }

    function getCandidates(category) {
        const sceneCategory = [
            "poses",
            "foreground",
            "background",
            "camera",
            "lighting",
            "filters",
            "moods",
            "purposes"
        ].includes(category);

        return state.items.filter((item) => {
            if (item.category !== category) {
                return false;
            }

            if (sceneCategory || item.gender === "none") {
                return true;
            }

            if (state.gender === "all") {
                return ["female", "male", "unisex"].includes(item.gender);
            }

            if (state.gender === "female") {
                return ["female", "unisex"].includes(item.gender);
            }

            if (state.gender === "male") {
                return ["male", "unisex"].includes(item.gender);
            }

            return item.gender === "unisex";
        });
    }

    function getSelectedItems() {
        return state.selectedIds
            .map((id) => state.items.find((item) => item.id === id))
            .filter(Boolean)
            .sort((a, b) => {
                return (
                    CATEGORY_ORDER.indexOf(a.category) -
                    CATEGORY_ORDER.indexOf(b.category)
                );
            });
    }

    function renderSelection() {
        const container = document.getElementById("randomSelectedItems");
        const count = document.getElementById("randomItemCount");
        const selected = getSelectedItems();

        if (count) {
            count.textContent = `${selected.length} 個元素`;
        }

        if (!container) {
            return;
        }

        if (!selected.length) {
            container.innerHTML = `
                <p class="random-empty">
                    按下「產生完整穿搭」開始。
                </p>
            `;
            return;
        }

        container.innerHTML = selected
            .map((item) => {
                const category = state.categories.find(
                    (entry) => entry.id === item.category
                );

                return `
                    <article class="random-selected-card">
                        <span class="random-selected-icon">
                            ${escapeHtml(category?.icon || "✦")}
                        </span>

                        <span class="random-selected-name">
                            <strong>${escapeHtml(item.name_zh)}</strong>
                            <small>
                                ${escapeHtml(category?.name_zh || item.category)}
                                · ${escapeHtml(item.name_en)}
                            </small>
                        </span>

                        <button
                            type="button"
                            data-remove-random="${escapeAttribute(item.id)}"
                            aria-label="移除 ${escapeAttribute(item.name_zh)}"
                        >
                            ×
                        </button>
                    </article>
                `;
            })
            .join("");

        container
            .querySelectorAll("[data-remove-random]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    state.selectedIds = state.selectedIds.filter(
                        (id) => id !== button.dataset.removeRandom
                    );

                    persistSettings();
                    renderSelection();
                    renderOutputs();
                });
            });
    }

    function renderOutputs() {
        const selected = getSelectedItems();
        const promptOutput = document.getElementById("randomPromptOutput");
        const negativeOutput =
            document.getElementById("randomNegativeOutput");

        const promptParts = selected
            .map((item) => item.prompts?.[state.platform])
            .filter(Boolean);

        const negativeParts = selected
            .map((item) => item.negative)
            .filter(Boolean);

        if (promptOutput) {
            promptOutput.value = deduplicateExact(promptParts).join(",\n");
        }

        if (negativeOutput) {
            negativeOutput.value = deduplicateCommaTerms(negativeParts)
                .join(", ");
        }
    }

    function clearResult() {
        state.selectedIds = [];
        persistSettings();
        renderSelection();
        renderOutputs();
        showToast("已清除隨機穿搭");
    }

     function bindQuickAction() {
    let button =
        document.getElementById(
            "randomPromptButton"
        );

    const startButton =
        document.getElementById(
            "startButton"
        );

    if (!button && startButton) {
        button =
            document.createElement(
                "button"
            );

        button.id =
            "randomPromptButton";

        button.type = "button";

        button.className =
            "random-home-button";

        button.textContent =
            "🎲 Random Prompt";

        startButton.insertAdjacentElement(
            "afterend",
            button
        );
    }

    if (
        !button ||
        button.dataset.randomBound === "true"
    ) {
        return;
    }

    button.dataset.randomBound = "true";

    button.addEventListener(
        "click",
        () => {
            const panel =
                document.getElementById(
                    "randomOutfitPanel"
                );

            panel?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            window.setTimeout(
                generateCompleteOutfit,
                300
            );
        }
    );
}

    function restoreSettings() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (!stored) {
                return;
            }

            if (["pixai", "niji", "tensorart", "gpt"].includes(stored.platform)) {
                state.platform = stored.platform;
            }

            if (["all", "female", "male", "unisex"].includes(stored.gender)) {
                state.gender = stored.gender;
            }

            if (["auto", "separates", "dress"].includes(stored.outfitMode)) {
                state.outfitMode = stored.outfitMode;
            }

            state.includeOuterwear = stored.includeOuterwear !== false;
            state.includeForeground = stored.includeForeground === true;

            if (Array.isArray(stored.selectedIds)) {
                state.selectedIds = stored.selectedIds;
            }
        } catch (error) {
            console.warn("無法還原隨機穿搭設定", error);
        }
    }

    function restorePreviousResult() {
        const validIds = new Set(state.items.map((item) => item.id));

        state.selectedIds = state.selectedIds.filter((id) => validIds.has(id));

        renderSelection();
        renderOutputs();
    }

    function persistSettings() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                platform: state.platform,
                gender: state.gender,
                outfitMode: state.outfitMode,
                includeOuterwear: state.includeOuterwear,
                includeForeground: state.includeForeground,
                selectedIds: state.selectedIds
            })
        );
    }

    function deduplicateExact(parts) {
        const seen = new Set();

        return parts.filter((part) => {
            const normalized = part.trim().toLowerCase();

            if (!normalized || seen.has(normalized)) {
                return false;
            }

            seen.add(normalized);
            return true;
        });
    }

    function deduplicateCommaTerms(parts) {
        const seen = new Set();
        const result = [];

        parts
            .join(",")
            .split(",")
            .map((term) => term.trim())
            .filter(Boolean)
            .forEach((term) => {
                const normalized = term.toLowerCase();

                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    result.push(term);
                }
            });

        return result;
    }

    function uniqueById(items) {
        return [...new Map(items.map((item) => [item.id, item])).values()];
    }

    async function copyText(text, message) {
        if (!text) {
            showToast("目前沒有可複製的內容");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }

        showToast(message);
    }

    function showMessage(message, isError = false) {
        const container = document.getElementById("randomSelectedItems");

        if (!container) {
            return;
        }

        container.innerHTML = `
            <p class="random-empty ${isError ? "error" : ""}">
                ${escapeHtml(message)}
            </p>
        `;
    }

    function showToast(message) {
        let toast = document.getElementById("randomOutfitToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "randomOutfitToast";
            toast.className = "random-outfit-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, nextValue) {
        const element = document.getElementById(id);

        if (element) {
            element.value = nextValue;
        }
    }

    function setChecked(id, checked) {
        const element = document.getElementById(id);

        if (element) {
            element.checked = Boolean(checked);
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

    function escapeAttribute(value = "") {
        return escapeHtml(value)
            .replaceAll("\n", "&#10;")
            .replaceAll("\r", "&#13;");
    }
})();
