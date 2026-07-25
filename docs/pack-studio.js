// ======================================
// 2Y Data Pack Studio
// Version: v2.0.0
// ======================================

(() => {
    const DB_NAME = "2y-data-pack-studio";
    const DB_VERSION = 1;
    const STORE_NAME = "drafts";
    const DRAFT_ID = "current-pack-draft";

    const REQUIRED_ITEM_FIELDS = [
        "id",
        "category",
        "name_zh",
        "name_en",
        "description_zh",
        "description_en",
        "gender",
        "anatomy",
        "tags",
        "prompts",
        "negative"
    ];

    const PLATFORM_KEYS = [
        "pixai",
        "niji",
        "tensorart",
        "gpt"
    ];

    const state = {
        categories: [],
        catalogIds: new Set(),
        items: [],
        editingIndex: null,
        db: null,
        autoSaveTimer: null
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindControls();

        try {
            await loadReferenceData();
            await openDatabase();
            await restoreDraft();
            renderCategoryOptions();
            renderPackSummary();
            renderItems();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            showStudioMessage(
                `資料包工作室初始化失敗：${error.message}`,
                true
            );
        }
    });

    function createPanel() {
        if (document.getElementById("dataPackStudioPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "dataPackStudioPanel";
        panel.className = "pack-studio-panel app-section-target";
        panel.innerHTML = `
            <div class="pack-studio-heading">
                <div>
                    <p class="pack-studio-eyebrow">DATA PACK AUTHORING TOOL</p>
                    <h2>服裝資料包工作室</h2>
                    <p>
                        建立、驗證與匯出可放入
                        <code>docs/data/packs/</code>
                        的服裝百科資料包。
                    </p>
                </div>
                <span class="pack-studio-version">v2.0.0</span>
            </div>

            <div class="pack-studio-layout">
                <aside class="pack-studio-sidebar">
                    <div class="pack-studio-card">
                        <h3>資料包資訊</h3>

                        <label class="pack-studio-field">
                            <span>資料包 ID *</span>
                            <input id="studioPackId"
                                placeholder="例如：gothic-vol-01">
                        </label>

                        <label class="pack-studio-field">
                            <span>中文名稱 *</span>
                            <input id="studioPackNameZh"
                                placeholder="例如：哥德服飾擴充包 Vol.01">
                        </label>

                        <label class="pack-studio-field">
                            <span>英文名稱</span>
                            <input id="studioPackNameEn"
                                placeholder="Gothic Fashion Expansion Vol.01">
                        </label>

                        <label class="pack-studio-field">
                            <span>中文說明</span>
                            <textarea id="studioPackDescriptionZh"
                                rows="4"
                                placeholder="說明資料包內容與用途"></textarea>
                        </label>

                        <div class="pack-studio-inline">
                            <label class="pack-studio-field">
                                <span>圖示</span>
                                <input id="studioPackIcon"
                                    maxlength="8"
                                    value="📦">
                            </label>

                            <label class="pack-studio-field">
                                <span>版本</span>
                                <input id="studioPackVersion"
                                    value="1.0.0">
                            </label>
                        </div>

                        <label class="pack-studio-check">
                            <input id="studioPackDefaultEnabled"
                                type="checkbox">
                            <span>預設啟用此資料包</span>
                        </label>

                        <div class="pack-studio-meta-actions">
                            <button id="newStudioPackButton"
                                class="pack-studio-secondary"
                                type="button">
                                新建空白包
                            </button>

                            <label class="pack-studio-import-button">
                                匯入資料包 JSON
                                <input id="importStudioPackInput"
                                    type="file"
                                    accept=".json,application/json"
                                    hidden>
                            </label>
                        </div>
                    </div>

                    <div class="pack-studio-card">
                        <h3>資料包摘要</h3>

                        <div class="pack-studio-summary">
                            <span>項目數</span>
                            <strong id="studioItemCount">0</strong>
                        </div>

                        <div class="pack-studio-summary">
                            <span>分類數</span>
                            <strong id="studioCategoryCount">0</strong>
                        </div>

                        <div class="pack-studio-summary">
                            <span>驗證狀態</span>
                            <strong id="studioValidationStatus">未檢查</strong>
                        </div>

                        <button id="validateStudioPackButton"
                            type="button">
                            ✅ 驗證資料包
                        </button>

                        <button id="exportStudioPackButton"
                            class="pack-studio-export"
                            type="button">
                            匯出資料包 JSON
                        </button>

                        <button id="exportManifestEntryButton"
                            class="pack-studio-secondary"
                            type="button">
                            匯出 Manifest 登記檔
                        </button>
                    </div>
                </aside>

                <div class="pack-studio-workspace">
                    <form id="studioItemForm"
                        class="pack-studio-item-form">
                        <div class="pack-studio-form-heading">
                            <div>
                                <p>ENCYCLOPEDIA ITEM</p>
                                <h3 id="studioItemFormTitle">
                                    新增百科項目
                                </h3>
                            </div>

                            <button id="cancelStudioItemEditButton"
                                class="pack-studio-text-button"
                                type="button"
                                hidden>
                                取消編輯
                            </button>
                        </div>

                        <div class="pack-studio-form-grid">
                            <label class="pack-studio-field">
                                <span>項目 ID *</span>
                                <input id="studioItemId" required
                                    placeholder="pack_g01_outer_velvet_coat">
                            </label>

                            <label class="pack-studio-field">
                                <span>分類 *</span>
                                <select id="studioItemCategory" required>
                                    <option value="">載入中……</option>
                                </select>
                            </label>

                            <label class="pack-studio-field">
                                <span>適用性別 *</span>
                                <select id="studioItemGender">
                                    <option value="unisex">男女皆可</option>
                                    <option value="female">女裝</option>
                                    <option value="male">男裝</option>
                                    <option value="none">非服裝／場景</option>
                                </select>
                            </label>

                            <label class="pack-studio-field">
                                <span>中文名稱 *</span>
                                <input id="studioItemNameZh" required>
                            </label>

                            <label class="pack-studio-field">
                                <span>英文名稱 *</span>
                                <input id="studioItemNameEn" required>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>中文詳細說明 *</span>
                                <textarea id="studioItemDescriptionZh"
                                    rows="5" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>英文詳細說明 *</span>
                                <textarea id="studioItemDescriptionEn"
                                    rows="4" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>標籤（逗號分隔）</span>
                                <input id="studioItemTags"
                                    placeholder="皮革, leather, gothic, 外套">
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>結構欄位</span>
                                <textarea id="studioItemAnatomy"
                                    rows="5"
                                    placeholder="每行一個欄位，例如：
silhouette: long fitted coat
material: black velvet
closure: silver clasps"></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>基礎英文 Prompt *</span>
                                <textarea id="studioBasePrompt"
                                    rows="5"
                                    placeholder="a long fitted black velvet coat, silver clasps, structured shoulders"></textarea>
                            </label>

                            <div class="pack-studio-wide-field">
                                <span>平台 Prompt</span>

                                <button id="generateStudioPlatformPromptsButton"
                                    class="pack-studio-secondary"
                                    type="button">
                                    ✨ 依基礎 Prompt 自動產生
                                </button>
                            </div>

                            <label class="pack-studio-wide-field">
                                <span>PixAI Prompt *</span>
                                <textarea id="studioPromptPixai"
                                    rows="4" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>Niji Journey Prompt *</span>
                                <textarea id="studioPromptNiji"
                                    rows="4" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>TensorArt Prompt *</span>
                                <textarea id="studioPromptTensorart"
                                    rows="4" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>GPT Image Prompt *</span>
                                <textarea id="studioPromptGpt"
                                    rows="4" required></textarea>
                            </label>

                            <label class="pack-studio-wide-field">
                                <span>Negative Prompt *</span>
                                <textarea id="studioItemNegative"
                                    rows="4">logo, text, watermark, malformed clothing, broken garment structure, inconsistent seams, duplicated garments, duplicated accessories</textarea>
                            </label>
                        </div>

                        <div class="pack-studio-item-actions">
                            <button id="saveStudioItemButton"
                                type="submit">
                                ＋ 加入資料包
                            </button>

                            <button id="duplicateCurrentStudioItemButton"
                                class="pack-studio-secondary"
                                type="button">
                                複製目前表單
                            </button>

                            <button id="clearStudioItemFormButton"
                                class="pack-studio-text-button"
                                type="button">
                                清空表單
                            </button>
                        </div>
                    </form>

                    <div class="pack-studio-list-card">
                        <div class="pack-studio-list-heading">
                            <div>
                                <h3>資料包項目</h3>
                                <p>拖曳排序功能未啟用；匯出時依目前列表順序。</p>
                            </div>

                            <label>
                                <span>搜尋</span>
                                <input id="studioItemSearch"
                                    type="search"
                                    placeholder="搜尋名稱、ID、標籤">
                            </label>
                        </div>

                        <div id="studioValidationReport"
                            class="pack-studio-validation-report"
                            hidden></div>

                        <div id="studioItemsList"
                            class="pack-studio-items-list">
                            <p class="pack-studio-empty">
                                尚未加入任何項目。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const packPanel =
            document.getElementById("dataPackPanel");

        if (packPanel) {
            packPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document.getElementById("studioItemForm")
            ?.addEventListener("submit", saveItem);

        document.getElementById("generateStudioPlatformPromptsButton")
            ?.addEventListener("click", generatePlatformPrompts);

        document.getElementById("cancelStudioItemEditButton")
            ?.addEventListener("click", resetItemForm);

        document.getElementById("clearStudioItemFormButton")
            ?.addEventListener("click", resetItemForm);

        document.getElementById("duplicateCurrentStudioItemButton")
            ?.addEventListener("click", duplicateCurrentForm);

        document.getElementById("validateStudioPackButton")
            ?.addEventListener("click", validateAndRender);

        document.getElementById("exportStudioPackButton")
            ?.addEventListener("click", exportPack);

        document.getElementById("exportManifestEntryButton")
            ?.addEventListener("click", exportManifestEntry);

        document.getElementById("newStudioPackButton")
            ?.addEventListener("click", newPack);

        document.getElementById("importStudioPackInput")
            ?.addEventListener("change", importPack);

        document.getElementById("studioItemSearch")
            ?.addEventListener("input", renderItems);

        [
            "studioPackId",
            "studioPackNameZh",
            "studioPackNameEn",
            "studioPackDescriptionZh",
            "studioPackIcon",
            "studioPackVersion",
            "studioPackDefaultEnabled"
        ].forEach((id) => {
            document.getElementById(id)?.addEventListener(
                "input",
                scheduleDraftSave
            );

            document.getElementById(id)?.addEventListener(
                "change",
                scheduleDraftSave
            );
        });
    }

    async function loadReferenceData() {
        const [categoryResponse, itemResponse] =
            await Promise.all([
                fetch("./data/categories.json"),
                fetch("./data/items.json")
            ]);

        if (!categoryResponse.ok) {
            throw new Error(
                `categories.json HTTP ${categoryResponse.status}`
            );
        }

        state.categories = await categoryResponse.json();

        if (itemResponse.ok) {
            const items = await itemResponse.json();

            if (Array.isArray(items)) {
                state.catalogIds = new Set(
                    items
                        .map((item) => item?.id)
                        .filter(Boolean)
                );
            }
        }
    }

    function renderCategoryOptions() {
        const select =
            document.getElementById("studioItemCategory");

        if (!select) return;

        select.innerHTML = `
            <option value="">請選擇分類</option>
            ${state.categories.map((category) => `
                <option value="${escapeAttribute(category.id)}">
                    ${escapeHtml(category.icon || "✦")}
                    ${escapeHtml(category.name_zh || category.id)}
                </option>
            `).join("")}
        `;
    }

    function saveItem(event) {
        event.preventDefault();

        const item = readItemForm();
        const errors = validateSingleItem(item);

        if (errors.length) {
            alert(
                `此項目尚未完成：\n\n${errors.join("\n")}`
            );
            return;
        }

        const existingDraftIndex =
            state.items.findIndex(
                (entry, index) =>
                    entry.id === item.id &&
                    index !== state.editingIndex
            );

        if (existingDraftIndex >= 0) {
            alert(
                `資料包內已有相同 ID：${item.id}`
            );
            return;
        }

        if (
            state.catalogIds.has(item.id) &&
            state.editingIndex === null
        ) {
            const proceed = window.confirm(
                `目前百科已存在 ID「${item.id}」。\n` +
                "匯出後會覆蓋同 ID 項目。\n\n仍要加入嗎？"
            );

            if (!proceed) return;
        }

        if (state.editingIndex === null) {
            state.items.push(item);
        } else {
            state.items[state.editingIndex] = item;
        }

        const wasEditing =
            state.editingIndex !== null;

        resetItemForm();
        renderPackSummary();
        renderItems();
        saveDraft();

        showToast(
            wasEditing
                ? "項目已更新"
                : "項目已加入資料包"
        );
    }

    function readItemForm() {
        return {
            id: normalizeId(value("studioItemId")),
            category: value("studioItemCategory"),
            name_zh: value("studioItemNameZh"),
            name_en: value("studioItemNameEn"),
            description_zh:
                value("studioItemDescriptionZh"),
            description_en:
                value("studioItemDescriptionEn"),
            gender:
                value("studioItemGender") || "unisex",
            anatomy:
                parseAnatomy(value("studioItemAnatomy")),
            tags:
                parseTags(value("studioItemTags")),
            prompts: {
                pixai:
                    value("studioPromptPixai"),
                niji:
                    value("studioPromptNiji"),
                tensorart:
                    value("studioPromptTensorart"),
                gpt:
                    value("studioPromptGpt")
            },
            negative:
                value("studioItemNegative")
        };
    }

    function generatePlatformPrompts() {
        const base = value("studioBasePrompt");

        if (!base) {
            showToast("請先輸入基礎英文 Prompt");
            return;
        }

        setValue(
            "studioPromptPixai",
            joinComma([
                "masterpiece",
                "best quality",
                "highly detailed",
                base,
                "clear garment construction",
                "precise fabric texture"
            ])
        );

        setValue(
            "studioPromptNiji",
            `${joinComma([
                base,
                "polished fashion illustration",
                "refined folds",
                "readable garment construction",
                "elegant material rendering"
            ])} --niji 6`
        );

        setValue(
            "studioPromptTensorart",
            joinComma([
                "high quality",
                "high detail",
                base,
                "realistic textile response",
                "precise seams and hardware"
            ])
        );

        setValue(
            "studioPromptGpt",
            [
                "Create a polished fashion image featuring",
                `${base}.`,
                "Preserve the exact silhouette, materials, closures, seams, and accessories."
            ].join(" ")
        );

        showToast("四平台 Prompt 已產生");
    }

    function duplicateCurrentForm() {
        const id = value("studioItemId");

        setValue(
            "studioItemId",
            id
                ? `${normalizeId(id)}_copy`
                : ""
        );

        setValue(
            "studioItemNameZh",
            value("studioItemNameZh")
                ? `${value("studioItemNameZh")} 副本`
                : ""
        );

        state.editingIndex = null;
        updateItemFormMode();
        showToast("已建立表單副本，請修改 ID");
    }

    function editItem(index) {
        const item = state.items[index];
        if (!item) return;

        state.editingIndex = index;

        setValue("studioItemId", item.id);
        setValue("studioItemCategory", item.category);
        setValue("studioItemGender", item.gender);
        setValue("studioItemNameZh", item.name_zh);
        setValue("studioItemNameEn", item.name_en);
        setValue(
            "studioItemDescriptionZh",
            item.description_zh
        );
        setValue(
            "studioItemDescriptionEn",
            item.description_en
        );
        setValue(
            "studioItemTags",
            (item.tags || []).join(", ")
        );
        setValue(
            "studioItemAnatomy",
            Object.entries(item.anatomy || {})
                .map(([key, val]) => `${key}: ${val}`)
                .join("\n")
        );
        setValue(
            "studioBasePrompt",
            extractBasePrompt(item)
        );
        setValue(
            "studioPromptPixai",
            item.prompts?.pixai || ""
        );
        setValue(
            "studioPromptNiji",
            item.prompts?.niji || ""
        );
        setValue(
            "studioPromptTensorart",
            item.prompts?.tensorart || ""
        );
        setValue(
            "studioPromptGpt",
            item.prompts?.gpt || ""
        );
        setValue(
            "studioItemNegative",
            item.negative || ""
        );

        updateItemFormMode();

        document.getElementById("studioItemForm")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    function deleteItem(index) {
        const item = state.items[index];
        if (!item) return;

        if (
            !window.confirm(
                `確定刪除「${item.name_zh}」？`
            )
        ) {
            return;
        }

        state.items.splice(index, 1);

        if (state.editingIndex === index) {
            resetItemForm();
        } else if (
            state.editingIndex !== null &&
            state.editingIndex > index
        ) {
            state.editingIndex -= 1;
        }

        renderPackSummary();
        renderItems();
        saveDraft();
        showToast("項目已刪除");
    }

    function duplicateItem(index) {
        const item = state.items[index];
        if (!item) return;

        const copy = JSON.parse(
            JSON.stringify(item)
        );

        copy.id = `${copy.id}_copy`;
        copy.name_zh = `${copy.name_zh} 副本`;

        state.items.splice(index + 1, 0, copy);

        renderPackSummary();
        renderItems();
        saveDraft();
        showToast("項目副本已建立");
    }

    function moveItem(index, direction) {
        const nextIndex = index + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= state.items.length
        ) {
            return;
        }

        const [item] = state.items.splice(index, 1);
        state.items.splice(nextIndex, 0, item);

        if (state.editingIndex === index) {
            state.editingIndex = nextIndex;
        } else if (
            state.editingIndex === nextIndex
        ) {
            state.editingIndex = index;
        }

        renderItems();
        saveDraft();
    }

    function renderItems() {
        const container =
            document.getElementById("studioItemsList");

        if (!container) return;

        const query =
            value("studioItemSearch").toLowerCase();

        const visible = state.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => {
                if (!query) return true;

                return [
                    item.id,
                    item.name_zh,
                    item.name_en,
                    item.category,
                    ...(item.tags || [])
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);
            });

        if (!visible.length) {
            container.innerHTML = `
                <p class="pack-studio-empty">
                    ${state.items.length
                        ? "找不到符合條件的項目。"
                        : "尚未加入任何項目。"}
                </p>
            `;
            return;
        }

        container.innerHTML = visible
            .map(({ item, index }) => {
                const category =
                    state.categories.find(
                        (entry) =>
                            entry.id === item.category
                    );

                const collision =
                    state.catalogIds.has(item.id);

                return `
                    <article class="pack-studio-item-card
                        ${collision ? "collision" : ""}">
                        <div class="pack-studio-item-heading">
                            <div>
                                <span>
                                    ${escapeHtml(
                                        category?.icon || "✦"
                                    )}
                                </span>

                                <div>
                                    <h4>
                                        ${escapeHtml(item.name_zh)}
                                    </h4>

                                    <p>
                                        ${escapeHtml(item.name_en)}
                                    </p>
                                </div>
                            </div>

                            <em>#${index + 1}</em>
                        </div>

                        <code>${escapeHtml(item.id)}</code>

                        <p class="pack-studio-item-description">
                            ${escapeHtml(item.description_zh)}
                        </p>

                        <div class="pack-studio-item-tags">
                            <span>
                                ${escapeHtml(
                                    category?.name_zh ||
                                    item.category
                                )}
                            </span>

                            <span>
                                ${escapeHtml(item.gender)}
                            </span>

                            ${(item.tags || [])
                                .slice(0, 5)
                                .map((tag) => `
                                    <span>
                                        ${escapeHtml(tag)}
                                    </span>
                                `)
                                .join("")}
                        </div>

                        ${collision ? `
                            <p class="pack-studio-collision-note">
                                ⚠ 此 ID 已存在於目前百科
                            </p>
                        ` : ""}

                        <div class="pack-studio-item-actions-row">
                            <button type="button"
                                data-studio-move-up="${index}">
                                ↑
                            </button>

                            <button type="button"
                                data-studio-move-down="${index}">
                                ↓
                            </button>

                            <button type="button"
                                data-studio-edit="${index}">
                                編輯
                            </button>

                            <button type="button"
                                data-studio-duplicate="${index}">
                                複製
                            </button>

                            <button type="button"
                                class="danger"
                                data-studio-delete="${index}">
                                刪除
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");

        bindItemListActions(container);
    }

    function bindItemListActions(container) {
        container
            .querySelectorAll("[data-studio-edit]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    editItem(
                        Number(button.dataset.studioEdit)
                    );
                });
            });

        container
            .querySelectorAll("[data-studio-delete]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    deleteItem(
                        Number(button.dataset.studioDelete)
                    );
                });
            });

        container
            .querySelectorAll("[data-studio-duplicate]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    duplicateItem(
                        Number(button.dataset.studioDuplicate)
                    );
                });
            });

        container
            .querySelectorAll("[data-studio-move-up]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    moveItem(
                        Number(button.dataset.studioMoveUp),
                        -1
                    );
                });
            });

        container
            .querySelectorAll("[data-studio-move-down]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    moveItem(
                        Number(button.dataset.studioMoveDown),
                        1
                    );
                });
            });
    }

    function validateAndRender() {
        const result = validatePack();

        const report =
            document.getElementById(
                "studioValidationReport"
            );

        if (!report) return;

        report.hidden = false;
        report.className =
            `pack-studio-validation-report ${
                result.errors.length
                    ? "error"
                    : result.warnings.length
                        ? "warning"
                        : "success"
            }`;

        report.innerHTML = `
            <h4>
                ${result.errors.length
                    ? "❌ 驗證失敗"
                    : result.warnings.length
                        ? "⚠ 可匯出，但有警告"
                        : "✅ 驗證通過"}
            </h4>

            ${result.errors.length ? `
                <div>
                    <strong>錯誤</strong>
                    <ul>
                        ${result.errors.map((item) =>
                            `<li>${escapeHtml(item)}</li>`
                        ).join("")}
                    </ul>
                </div>
            ` : ""}

            ${result.warnings.length ? `
                <div>
                    <strong>警告</strong>
                    <ul>
                        ${result.warnings.map((item) =>
                            `<li>${escapeHtml(item)}</li>`
                        ).join("")}
                    </ul>
                </div>
            ` : ""}

            ${!result.errors.length &&
              !result.warnings.length ? `
                <p>
                    資料包資訊、項目格式與 ID
                    都通過基本檢查。
                </p>
            ` : ""}
        `;

        setText(
            "studioValidationStatus",
            result.errors.length
                ? "失敗"
                : result.warnings.length
                    ? "有警告"
                    : "通過"
        );

        showToast(
            result.errors.length
                ? "資料包驗證失敗"
                : "資料包驗證完成"
        );

        return result;
    }

    function validatePack() {
        const errors = [];
        const warnings = [];

        const metadata = readPackMetadata();

        if (!metadata.id) {
            errors.push("缺少資料包 ID。");
        } else if (
            !/^[a-z0-9][a-z0-9-]*$/.test(metadata.id)
        ) {
            errors.push(
                "資料包 ID 只能使用小寫英文字母、數字與連字號。"
            );
        }

        if (!metadata.name_zh) {
            errors.push("缺少資料包中文名稱。");
        }

        if (!state.items.length) {
            errors.push("資料包尚未包含任何項目。");
        }

        const seen = new Set();

        state.items.forEach((item, index) => {
            const prefix =
                `第 ${index + 1} 筆「${
                    item.name_zh || item.id || "未命名"
                }」`;

            const itemErrors =
                validateSingleItem(item);

            itemErrors.forEach((error) => {
                errors.push(`${prefix}：${error}`);
            });

            if (seen.has(item.id)) {
                errors.push(
                    `${prefix}：ID「${item.id}」在資料包內重複。`
                );
            }

            seen.add(item.id);

            if (state.catalogIds.has(item.id)) {
                warnings.push(
                    `${prefix}：ID「${item.id}」已存在於目前百科，啟用後會覆蓋原項目。`
                );
            }

            if (
                item.description_zh.length < 35
            ) {
                warnings.push(
                    `${prefix}：中文說明較短，建議至少 35 個字。`
                );
            }

            if (
                !item.tags.some((tag) =>
                    /[\u4e00-\u9fff]/.test(tag)
                )
            ) {
                warnings.push(
                    `${prefix}：標籤缺少中文關鍵字，中文搜尋可能較弱。`
                );
            }
        });

        return { errors, warnings };
    }

    function validateSingleItem(item) {
        const errors = [];

        REQUIRED_ITEM_FIELDS.forEach((field) => {
            if (
                item[field] === undefined ||
                item[field] === null ||
                item[field] === ""
            ) {
                errors.push(`缺少欄位 ${field}`);
            }
        });

        if (
            item.id &&
            !/^[a-z0-9_][a-z0-9_-]*$/.test(item.id)
        ) {
            errors.push(
                "項目 ID 只能使用小寫英文字母、數字、底線與連字號"
            );
        }

        if (
            item.category &&
            !state.categories.some(
                (category) =>
                    category.id === item.category
            )
        ) {
            errors.push(
                `未知分類 ${item.category}`
            );
        }

        if (
            !["female", "male", "unisex", "none"]
                .includes(item.gender)
        ) {
            errors.push(
                `gender 不正確：${item.gender}`
            );
        }

        if (
            !item.anatomy ||
            typeof item.anatomy !== "object" ||
            Array.isArray(item.anatomy)
        ) {
            errors.push(
                "anatomy 必須是物件"
            );
        }

        if (!Array.isArray(item.tags)) {
            errors.push("tags 必須是陣列");
        }

        if (
            !item.prompts ||
            typeof item.prompts !== "object"
        ) {
            errors.push("prompts 必須是物件");
        } else {
            PLATFORM_KEYS.forEach((key) => {
                if (!item.prompts[key]) {
                    errors.push(
                        `缺少 prompts.${key}`
                    );
                }
            });
        }

        return errors;
    }

    function exportPack() {
        const result = validatePack();

        if (result.errors.length) {
            validateAndRender();
            alert(
                "資料包仍有錯誤，請先修正再匯出。"
            );
            return;
        }

        const metadata = readPackMetadata();

        downloadJson(
            state.items,
            `${metadata.id}.json`
        );

        saveDraft();
        showToast("資料包 JSON 已匯出");
    }

    function exportManifestEntry() {
        const result = validatePack();

        if (result.errors.length) {
            validateAndRender();
            alert(
                "資料包仍有錯誤，請先修正再匯出。"
            );
            return;
        }

        const metadata = readPackMetadata();

        const categoryNames = [
            ...new Set(
                state.items.map((item) => {
                    const category =
                        state.categories.find(
                            (entry) =>
                                entry.id === item.category
                        );

                    return (
                        category?.name_zh ||
                        item.category
                    );
                })
            )
        ];

        const manifestEntry = {
            id: metadata.id,
            name_zh: metadata.name_zh,
            name_en: metadata.name_en,
            description_zh:
                metadata.description_zh,
            icon: metadata.icon || "📦",
            version:
                metadata.version || "1.0.0",
            file:
                `./data/packs/${metadata.id}.json`,
            item_count: state.items.length,
            categories: categoryNames,
            default_enabled:
                metadata.default_enabled
        };

        downloadJson(
            manifestEntry,
            `${metadata.id}-manifest-entry.json`
        );

        showToast("Manifest 登記檔已匯出");
    }

    async function importPack(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        try {
            const parsed =
                JSON.parse(await file.text());

            if (!Array.isArray(parsed)) {
                throw new Error(
                    "資料包 JSON 最外層必須是陣列"
                );
            }

            const normalized = parsed.map(
                normalizeImportedItem
            );

            state.items = normalized;
            state.editingIndex = null;

            const filenameId =
                file.name
                    .replace(/\.json$/i, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/^-+|-+$/g, "");

            if (
                filenameId &&
                !value("studioPackId")
            ) {
                setValue(
                    "studioPackId",
                    filenameId
                );
            }

            resetItemForm();
            renderPackSummary();
            renderItems();
            await saveDraft();

            showToast(
                `已匯入 ${normalized.length} 筆項目`
            );
        } catch (error) {
            alert(
                `匯入失敗：${error.message}`
            );
        }
    }

    function normalizeImportedItem(item) {
        return {
            id: normalizeId(item?.id || ""),
            category:
                String(item?.category || ""),
            name_zh:
                String(item?.name_zh || ""),
            name_en:
                String(item?.name_en || ""),
            description_zh:
                String(item?.description_zh || ""),
            description_en:
                String(item?.description_en || ""),
            gender:
                String(item?.gender || "unisex"),
            anatomy:
                item?.anatomy &&
                typeof item.anatomy === "object" &&
                !Array.isArray(item.anatomy)
                    ? item.anatomy
                    : {},
            tags:
                Array.isArray(item?.tags)
                    ? item.tags.map(String)
                    : [],
            prompts: {
                pixai:
                    String(
                        item?.prompts?.pixai || ""
                    ),
                niji:
                    String(
                        item?.prompts?.niji || ""
                    ),
                tensorart:
                    String(
                        item?.prompts?.tensorart || ""
                    ),
                gpt:
                    String(
                        item?.prompts?.gpt || ""
                    )
            },
            negative:
                String(item?.negative || "")
        };
    }

    function newPack() {
        const hasData =
            state.items.length ||
            value("studioPackNameZh");

        if (
            hasData &&
            !window.confirm(
                "確定清除目前資料包草稿？"
            )
        ) {
            return;
        }

        state.items = [];
        state.editingIndex = null;

        [
            "studioPackId",
            "studioPackNameZh",
            "studioPackNameEn",
            "studioPackDescriptionZh"
        ].forEach((id) => setValue(id, ""));

        setValue("studioPackIcon", "📦");
        setValue("studioPackVersion", "1.0.0");

        const checkbox =
            document.getElementById(
                "studioPackDefaultEnabled"
            );

        if (checkbox) checkbox.checked = false;

        resetItemForm();
        renderPackSummary();
        renderItems();
        saveDraft();

        showToast("已建立空白資料包");
    }

    function readPackMetadata() {
        return {
            id:
                normalizePackId(
                    value("studioPackId")
                ),
            name_zh:
                value("studioPackNameZh"),
            name_en:
                value("studioPackNameEn"),
            description_zh:
                value(
                    "studioPackDescriptionZh"
                ),
            icon:
                value("studioPackIcon") ||
                "📦",
            version:
                value("studioPackVersion") ||
                "1.0.0",
            default_enabled:
                document.getElementById(
                    "studioPackDefaultEnabled"
                )?.checked === true
        };
    }

    function renderPackSummary() {
        setText(
            "studioItemCount",
            String(state.items.length)
        );

        setText(
            "studioCategoryCount",
            String(
                new Set(
                    state.items
                        .map((item) =>
                            item.category
                        )
                        .filter(Boolean)
                ).size
            )
        );

        setText(
            "studioValidationStatus",
            "未檢查"
        );

        const report =
            document.getElementById(
                "studioValidationReport"
            );

        if (report) {
            report.hidden = true;
        }
    }

    function resetItemForm() {
        state.editingIndex = null;

        document
            .getElementById(
                "studioItemForm"
            )
            ?.reset();

        setValue(
            "studioItemGender",
            "unisex"
        );

        setValue(
            "studioItemNegative",
            "logo, text, watermark, malformed clothing, broken garment structure, inconsistent seams, duplicated garments, duplicated accessories"
        );

        updateItemFormMode();
    }

    function updateItemFormMode() {
        const editing =
            state.editingIndex !== null;

        setText(
            "studioItemFormTitle",
            editing
                ? "編輯百科項目"
                : "新增百科項目"
        );

        setText(
            "saveStudioItemButton",
            editing
                ? "更新項目"
                : "＋ 加入資料包"
        );

        const cancel =
            document.getElementById(
                "cancelStudioItemEditButton"
            );

        if (cancel) {
            cancel.hidden = !editing;
        }
    }

    function extractBasePrompt(item) {
        const gpt =
            item.prompts?.gpt || "";

        return gpt
            .replace(
                /^Create a polished fashion image featuring\s*/i,
                ""
            )
            .replace(
                /\.?\s*Preserve the exact silhouette.*$/i,
                ""
            )
            .trim();
    }

    function parseAnatomy(text) {
        const result = {};

        text.split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
                const separator =
                    line.indexOf(":");

                if (separator < 0) {
                    result[
                        `detail_${Object.keys(result).length + 1}`
                    ] = line;

                    return;
                }

                const key =
                    line
                        .slice(0, separator)
                        .trim();

                const val =
                    line
                        .slice(separator + 1)
                        .trim();

                if (key && val) {
                    result[key] = val;
                }
            });

        return result;
    }

    function parseTags(text) {
        return [
            ...new Set(
                text
                    .split(/[,，]/)
                    .map((tag) => tag.trim())
                    .filter(Boolean)
            )
        ];
    }

    function normalizeId(text) {
        return String(text)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_-]+/g, "")
            .replace(/^[-_]+|[-_]+$/g, "");
    }

    function normalizePackId(text) {
        return String(text)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]+/g, "")
            .replace(/^-+|-+$/g, "");
    }

    function joinComma(parts) {
        const seen = new Set();

        return parts
            .map((part) =>
                String(part || "").trim()
            )
            .filter(Boolean)
            .filter((part) => {
                const key =
                    part.toLowerCase();

                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            })
            .join(", ");
    }

    function downloadJson(data, filename) {
        const blob = new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json;charset=utf-8"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.click();

        URL.revokeObjectURL(url);
    }

    async function openDatabase() {
        state.db = await new Promise(
            (resolve, reject) => {
                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );

                request.onupgradeneeded =
                    () => {
                        const db =
                            request.result;

                        if (
                            !db.objectStoreNames
                                .contains(STORE_NAME)
                        ) {
                            db.createObjectStore(
                                STORE_NAME,
                                { keyPath: "id" }
                            );
                        }
                    };

                request.onsuccess =
                    () => resolve(
                        request.result
                    );

                request.onerror =
                    () => reject(
                        request.error ||
                        new Error(
                            "IndexedDB 開啟失敗"
                        )
                    );
            }
        );
    }

    async function saveDraft() {
        if (!state.db) return;

        const draft = {
            id: DRAFT_ID,
            metadata: readPackMetadata(),
            items: state.items,
            savedAt:
                new Date().toISOString()
        };

        await new Promise(
            (resolve, reject) => {
                const transaction =
                    state.db.transaction(
                        STORE_NAME,
                        "readwrite"
                    );

                transaction
                    .objectStore(STORE_NAME)
                    .put(draft);

                transaction.oncomplete =
                    () => resolve();

                transaction.onerror =
                    () => reject(
                        transaction.error
                    );
            }
        );
    }

    function scheduleDraftSave() {
        window.clearTimeout(
            state.autoSaveTimer
        );

        state.autoSaveTimer =
            window.setTimeout(() => {
                saveDraft().catch(
                    console.warn
                );
            }, 350);
    }

    async function restoreDraft() {
        if (!state.db) return;

        const draft =
            await new Promise(
                (resolve, reject) => {
                    const transaction =
                        state.db.transaction(
                            STORE_NAME,
                            "readonly"
                        );

                    const request =
                        transaction
                            .objectStore(
                                STORE_NAME
                            )
                            .get(DRAFT_ID);

                    request.onsuccess =
                        () => resolve(
                            request.result
                        );

                    request.onerror =
                        () => reject(
                            request.error
                        );
                }
            );

        if (!draft) return;

        const metadata =
            draft.metadata || {};

        setValue(
            "studioPackId",
            metadata.id || ""
        );

        setValue(
            "studioPackNameZh",
            metadata.name_zh || ""
        );

        setValue(
            "studioPackNameEn",
            metadata.name_en || ""
        );

        setValue(
            "studioPackDescriptionZh",
            metadata.description_zh || ""
        );

        setValue(
            "studioPackIcon",
            metadata.icon || "📦"
        );

        setValue(
            "studioPackVersion",
            metadata.version || "1.0.0"
        );

        const checkbox =
            document.getElementById(
                "studioPackDefaultEnabled"
            );

        if (checkbox) {
            checkbox.checked =
                metadata.default_enabled === true;
        }

        state.items =
            Array.isArray(draft.items)
                ? draft.items.map(
                    normalizeImportedItem
                )
                : [];
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
                    "[data-pack-studio-nav]"
                )
            ) {
                return;
            }

            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "section-nav-link";
            button.dataset.packStudioNav =
                "true";
            button.innerHTML =
                "<span>🧰</span><span>資料包工作室</span>";

            button.addEventListener(
                "click",
                () => {
                    document
                        .getElementById(
                            "dataPackStudioPanel"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                }
            );

            container.appendChild(button);
        }, 1450);
    }

    function showStudioMessage(
        message,
        isError = false
    ) {
        const container =
            document.getElementById(
                "studioItemsList"
            );

        if (!container) return;

        container.innerHTML = `
            <p class="pack-studio-empty
                ${isError ? "error" : ""}">
                ${escapeHtml(message)}
            </p>
        `;
    }

    function showToast(message) {
        let toast =
            document.getElementById(
                "packStudioToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "packStudioToast";
            toast.className =
                "pack-studio-toast";

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(
            showToast.timer
        );

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

    function escapeAttribute(value = "") {
        return escapeHtml(value)
            .replaceAll("\n", "&#10;")
            .replaceAll("\r", "&#13;");
    }
})();
