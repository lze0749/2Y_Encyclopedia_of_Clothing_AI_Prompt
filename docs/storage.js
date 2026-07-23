// ======================================
// 2Y Favorites, Presets & Backup
// Version: v0.6.0
// ======================================

(() => {
    const FAVORITES_KEY = "2y-favorite-item-ids-v1";
    const PRESETS_KEY = "2y-prompt-presets-v1";
    const BUILDER_KEY = "2y-prompt-builder-selection-v1";

    const storageState = {
        items: [],
        categories: [],
        favoriteIds: loadArray(FAVORITES_KEY),
        presets: loadArray(PRESETS_KEY)
    };

    document.addEventListener("DOMContentLoaded", async () => {
        ensureStoragePanel();
        bindStorageControls();
        await loadStorageData();
        observePromptCards();
        renderStoragePanel();
    });

    function loadArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.warn(`無法讀取 ${key}`, error);
            return [];
        }
    }

    function saveArray(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async function loadStorageData() {
        try {
            const [itemsResponse, categoriesResponse] = await Promise.all([
                fetch("./data/items.json"),
                fetch("./data/categories.json")
            ]);

            if (!itemsResponse.ok || !categoriesResponse.ok) {
                throw new Error("收藏資料來源載入失敗");
            }

            storageState.items = await itemsResponse.json();
            storageState.categories = await categoriesResponse.json();

            const validItemIds = new Set(
                storageState.items.map((item) => item.id)
            );

            storageState.favoriteIds = storageState.favoriteIds.filter(
                (id) => validItemIds.has(id)
            );

            saveArray(FAVORITES_KEY, storageState.favoriteIds);
            decorateAllPromptCards();
        } catch (error) {
            console.error(error);
            showStorageToast("收藏資料載入失敗");
        }
    }

    function ensureStoragePanel() {
        if (document.getElementById("storagePanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) {
            return;
        }

        const panel = document.createElement("section");
        panel.id = "storagePanel";
        panel.className = "storage-panel";
        panel.innerHTML = `
            <div class="storage-heading">
                <div>
                    <p class="storage-eyebrow">MY LIBRARY</p>
                    <h2>收藏、方案與備份</h2>
                    <p>
                        收藏常用資料、儲存 Prompt Builder 組合，
                        並將個人資料匯出成 JSON 備份。
                    </p>
                </div>

                <span id="favoriteCountBadge" class="storage-badge">
                    0 個收藏
                </span>
            </div>

            <div class="storage-grid">
                <section class="storage-card">
                    <div class="storage-card-heading">
                        <h3>⭐ 我的收藏</h3>
                        <button
                            id="clearFavoritesButton"
                            class="storage-text-button"
                            type="button"
                        >
                            清除收藏
                        </button>
                    </div>

                    <div id="favoriteList" class="storage-list">
                        <p class="storage-empty">尚未收藏任何項目。</p>
                    </div>
                </section>

                <section class="storage-card">
                    <div class="storage-card-heading">
                        <h3>💾 Prompt 方案</h3>
                        <button
                            id="savePresetButton"
                            class="storage-primary-button"
                            type="button"
                        >
                            儲存目前組合
                        </button>
                    </div>

                    <div id="presetList" class="storage-list">
                        <p class="storage-empty">尚未儲存任何方案。</p>
                    </div>
                </section>

                <section class="storage-card backup-card">
                    <div class="storage-card-heading">
                        <h3>📦 匯出與匯入</h3>
                    </div>

                    <p class="storage-help">
                        備份內容包含收藏、已儲存方案與目前 Builder 選擇。
                    </p>

                    <div class="storage-actions">
                        <button
                            id="exportUserDataButton"
                            class="storage-primary-button"
                            type="button"
                        >
                            匯出 JSON 備份
                        </button>

                        <button
                            id="importUserDataButton"
                            class="storage-secondary-button"
                            type="button"
                        >
                            匯入 JSON 備份
                        </button>

                        <input
                            id="importUserDataInput"
                            type="file"
                            accept="application/json,.json"
                            hidden
                        >
                    </div>
                </section>
            </div>
        `;

        content.appendChild(panel);
    }

    function bindStorageControls() {
        document
            .getElementById("clearFavoritesButton")
            ?.addEventListener("click", clearFavorites);

        document
            .getElementById("savePresetButton")
            ?.addEventListener("click", saveCurrentPreset);

        document
            .getElementById("exportUserDataButton")
            ?.addEventListener("click", exportUserData);

        document
            .getElementById("importUserDataButton")
            ?.addEventListener("click", () => {
                document
                    .getElementById("importUserDataInput")
                    ?.click();
            });

        document
            .getElementById("importUserDataInput")
            ?.addEventListener("change", importUserData);
    }

    function observePromptCards() {
        const itemList = document.getElementById("itemList");
        if (!itemList) {
            return;
        }

        const observer = new MutationObserver(() => {
            decorateAllPromptCards();
        });

        observer.observe(itemList, {
            childList: true,
            subtree: true
        });
    }

    function decorateAllPromptCards() {
        document
            .querySelectorAll(".prompt-card")
            .forEach((card) => decoratePromptCard(card));
    }

    function decoratePromptCard(card) {
        if (card.dataset.favoriteReady === "true") {
            updateCardFavoriteButton(card);
            return;
        }

        const englishName = card
            .querySelector(".english-name")
            ?.textContent
            .trim();

        const item = storageState.items.find(
            (entry) => entry.name_en === englishName
        );

        if (!item) {
            return;
        }

        card.dataset.itemId = item.id;
        card.dataset.favoriteReady = "true";

        const header = card.querySelector(".prompt-card-header");
        if (!header) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "favorite-toggle-button";
        button.setAttribute("aria-label", `收藏 ${item.name_zh}`);

        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(item.id);
        });

        header.appendChild(button);
        updateCardFavoriteButton(card);
    }

    function updateCardFavoriteButton(card) {
        const itemId = card.dataset.itemId;
        const button = card.querySelector(".favorite-toggle-button");

        if (!itemId || !button) {
            return;
        }

        const isFavorite = storageState.favoriteIds.includes(itemId);

        button.classList.toggle("active", isFavorite);
        button.textContent = isFavorite ? "★" : "☆";
        button.title = isFavorite ? "取消收藏" : "加入收藏";
        button.setAttribute("aria-pressed", String(isFavorite));
    }

    function toggleFavorite(itemId) {
        if (storageState.favoriteIds.includes(itemId)) {
            storageState.favoriteIds = storageState.favoriteIds.filter(
                (id) => id !== itemId
            );
            showStorageToast("已取消收藏");
        } else {
            storageState.favoriteIds.push(itemId);
            showStorageToast("已加入收藏");
        }

        saveArray(FAVORITES_KEY, storageState.favoriteIds);
        decorateAllPromptCards();
        renderStoragePanel();
    }

    function clearFavorites() {
        if (!storageState.favoriteIds.length) {
            showStorageToast("目前沒有收藏");
            return;
        }

        if (!window.confirm("確定要清除全部收藏嗎？")) {
            return;
        }

        storageState.favoriteIds = [];
        saveArray(FAVORITES_KEY, storageState.favoriteIds);
        decorateAllPromptCards();
        renderStoragePanel();
        showStorageToast("已清除全部收藏");
    }

    function renderStoragePanel() {
        renderFavoriteList();
        renderPresetList();

        const badge = document.getElementById("favoriteCountBadge");
        if (badge) {
            badge.textContent =
                `${storageState.favoriteIds.length} 個收藏`;
        }
    }

    function renderFavoriteList() {
        const container = document.getElementById("favoriteList");
        if (!container) {
            return;
        }

        const favorites = storageState.favoriteIds
            .map((id) => storageState.items.find((item) => item.id === id))
            .filter(Boolean);

        if (!favorites.length) {
            container.innerHTML = `
                <p class="storage-empty">尚未收藏任何項目。</p>
            `;
            return;
        }

        container.innerHTML = favorites
            .map((item) => {
                const category = storageState.categories.find(
                    (entry) => entry.id === item.category
                );

                return `
                    <div class="storage-list-item">
                        <button
                            type="button"
                            class="storage-open-item"
                            data-open-item-id="${escapeAttribute(item.id)}"
                        >
                            <span class="storage-item-icon">
                                ${escapeHtml(category?.icon || "✦")}
                            </span>
                            <span>
                                <strong>${escapeHtml(item.name_zh)}</strong>
                                <small>${escapeHtml(item.name_en)}</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            class="storage-remove-button"
                            data-remove-favorite-id="${escapeAttribute(item.id)}"
                            aria-label="取消收藏 ${escapeAttribute(item.name_zh)}"
                        >
                            ×
                        </button>
                    </div>
                `;
            })
            .join("");

        container
            .querySelectorAll("[data-open-item-id]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    openFavoriteItem(button.dataset.openItemId);
                });
            });

        container
            .querySelectorAll("[data-remove-favorite-id]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    toggleFavorite(button.dataset.removeFavoriteId);
                });
            });
    }

    function openFavoriteItem(itemId) {
        const item = storageState.items.find(
            (entry) => entry.id === itemId
        );

        const searchInput = document.querySelector(".search-box");

        if (!item || !searchInput) {
            return;
        }

        searchInput.value = item.name_zh;
        searchInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        document.getElementById("libraryPanel")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function getCurrentBuilderState() {
        try {
            const value = JSON.parse(localStorage.getItem(BUILDER_KEY));

            return {
                selectedIds: Array.isArray(value?.selectedIds)
                    ? value.selectedIds
                    : [],
                platform: ["pixai", "niji", "tensorart", "gpt"]
                    .includes(value?.platform)
                    ? value.platform
                    : "pixai"
            };
        } catch (error) {
            return {
                selectedIds: [],
                platform: "pixai"
            };
        }
    }

    function saveCurrentPreset() {
        const builderState = getCurrentBuilderState();

        if (!builderState.selectedIds.length) {
            showStorageToast("請先在 Prompt Builder 加入項目");
            return;
        }

        const defaultName =
            `方案 ${storageState.presets.length + 1}`;

        const name = window.prompt(
            "請輸入方案名稱：",
            defaultName
        )?.trim();

        if (!name) {
            return;
        }

        const preset = {
            id: createId(),
            name,
            selectedIds: builderState.selectedIds,
            platform: builderState.platform,
            createdAt: new Date().toISOString()
        };

        storageState.presets.unshift(preset);
        saveArray(PRESETS_KEY, storageState.presets);
        renderPresetList();
        showStorageToast("Prompt 方案已儲存");
    }

    function renderPresetList() {
        const container = document.getElementById("presetList");
        if (!container) {
            return;
        }

        if (!storageState.presets.length) {
            container.innerHTML = `
                <p class="storage-empty">尚未儲存任何方案。</p>
            `;
            return;
        }

        container.innerHTML = storageState.presets
            .map((preset) => {
                const names = preset.selectedIds
                    .map((id) =>
                        storageState.items.find((item) => item.id === id)
                    )
                    .filter(Boolean)
                    .map((item) => item.name_zh)
                    .slice(0, 4);

                const summary = names.join("、") || "沒有可用項目";
                const moreCount = Math.max(
                    0,
                    preset.selectedIds.length - names.length
                );

                return `
                    <div class="storage-preset-item">
                        <div>
                            <strong>${escapeHtml(preset.name)}</strong>
                            <small>
                                ${escapeHtml(formatPlatform(preset.platform))}
                                · ${preset.selectedIds.length} 項
                            </small>
                            <p>
                                ${escapeHtml(summary)}
                                ${moreCount ? ` 等 ${moreCount + names.length} 項` : ""}
                            </p>
                        </div>

                        <div class="storage-preset-actions">
                            <button
                                type="button"
                                class="storage-apply-button"
                                data-apply-preset-id="${escapeAttribute(preset.id)}"
                            >
                                套用
                            </button>

                            <button
                                type="button"
                                class="storage-remove-button"
                                data-delete-preset-id="${escapeAttribute(preset.id)}"
                                aria-label="刪除 ${escapeAttribute(preset.name)}"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                `;
            })
            .join("");

        container
            .querySelectorAll("[data-apply-preset-id]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    applyPreset(button.dataset.applyPresetId);
                });
            });

        container
            .querySelectorAll("[data-delete-preset-id]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    deletePreset(button.dataset.deletePresetId);
                });
            });
    }

    function applyPreset(presetId) {
        const preset = storageState.presets.find(
            (entry) => entry.id === presetId
        );

        if (!preset) {
            return;
        }

        localStorage.setItem(
            BUILDER_KEY,
            JSON.stringify({
                selectedIds: preset.selectedIds,
                platform: preset.platform
            })
        );

        showStorageToast("正在套用方案……");

        window.setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    function deletePreset(presetId) {
        storageState.presets = storageState.presets.filter(
            (preset) => preset.id !== presetId
        );

        saveArray(PRESETS_KEY, storageState.presets);
        renderPresetList();
        showStorageToast("方案已刪除");
    }

    function exportUserData() {
        const payload = {
            app: "2Y Encyclopedia of Clothing AI Prompt",
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            favorites: storageState.favoriteIds,
            presets: storageState.presets,
            builder: getCurrentBuilderState()
        };

        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `2Y-Prompt-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        showStorageToast("JSON 備份已匯出");
    }

    async function importUserData(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        try {
            const data = JSON.parse(await file.text());

            if (
                !Array.isArray(data.favorites) ||
                !Array.isArray(data.presets)
            ) {
                throw new Error("檔案格式不正確");
            }

            const confirmed = window.confirm(
                "匯入會取代目前的收藏與已儲存方案。確定繼續嗎？"
            );

            if (!confirmed) {
                return;
            }

            storageState.favoriteIds = data.favorites;
            storageState.presets = data.presets;

            saveArray(FAVORITES_KEY, storageState.favoriteIds);
            saveArray(PRESETS_KEY, storageState.presets);

            if (data.builder) {
                localStorage.setItem(
                    BUILDER_KEY,
                    JSON.stringify(data.builder)
                );
            }

            showStorageToast("備份匯入成功，正在重新載入……");

            window.setTimeout(() => {
                window.location.reload();
            }, 700);
        } catch (error) {
            console.error(error);
            showStorageToast("無法匯入：JSON 格式不正確");
        }
    }

    function createId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `preset-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
    }

    function formatPlatform(platform) {
        const labels = {
            pixai: "PixAI",
            niji: "Niji Journey",
            tensorart: "TensorArt",
            gpt: "GPT Image"
        };

        return labels[platform] || platform;
    }

    function showStorageToast(message) {
        let toast = document.getElementById("storageToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "storageToast";
            toast.className = "storage-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(showStorageToast.timeoutId);
        showStorageToast.timeoutId = window.setTimeout(() => {
            toast.classList.remove("show");
        }, 1900);
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
