// ======================================
// 2Y Catalog Health Dashboard
// Version: v2.3.0
// ======================================

(() => {
    const REQUIRED_FIELDS = [
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

    const VALID_GENDERS = new Set([
        "female",
        "male",
        "unisex",
        "none"
    ]);

    const state = {
        categories: [],
        mergedItems: [],
        manifest: { version: 1, packs: [] },
        packResults: [],
        issues: [],
        itemSources: new Map(),
        search: "",
        severity: "all",
        source: "all"
    };

    document.addEventListener("DOMContentLoaded", () => {
        createPanel();
        bindControls();
        addNavigationButton();
        runAudit();
    });

    function createPanel() {
        if (document.getElementById("catalogHealthPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "catalogHealthPanel";
        panel.className =
            "catalog-health-panel app-section-target";

        panel.innerHTML = `
            <div class="catalog-health-heading">
                <div>
                    <p class="catalog-health-eyebrow">
                        CATALOG QUALITY & COVERAGE
                    </p>

                    <h2>百科健康檢查儀表板</h2>

                    <p>
                        檢查核心百科與資料包的完整性、重複 ID、
                        分類覆蓋、搜尋品質及四平台 Prompt 狀態。
                    </p>
                </div>

                <span class="catalog-health-version">
                    v2.3.0
                </span>
            </div>

            <div class="catalog-health-actions">
                <button
                    id="runCatalogAuditButton"
                    type="button"
                >
                    🔍 重新檢查
                </button>

                <button
                    id="exportCatalogAuditJsonButton"
                    class="catalog-health-secondary"
                    type="button"
                >
                    匯出 JSON 報告
                </button>

                <button
                    id="exportCatalogAuditCsvButton"
                    class="catalog-health-secondary"
                    type="button"
                >
                    匯出 CSV 問題清單
                </button>

                <button
                    id="copyCatalogIssueIdsButton"
                    class="catalog-health-text-button"
                    type="button"
                >
                    📋 複製問題 ID
                </button>
            </div>

            <div class="catalog-health-score">
                <div>
                    <span>百科健康分數</span>
                    <strong id="catalogHealthScore">—</strong>
                    <small id="catalogHealthLabel">
                        正在檢查……
                    </small>
                </div>

                <div class="catalog-health-score-track">
                    <span id="catalogHealthScoreBar"></span>
                </div>
            </div>

            <div class="catalog-health-stats">
                <article>
                    <span>目前載入</span>
                    <strong id="catalogTotalItems">—</strong>
                    <small>筆項目</small>
                </article>

                <article>
                    <span>資料包</span>
                    <strong id="catalogPackCount">—</strong>
                    <small>個登記包</small>
                </article>

                <article>
                    <span>錯誤</span>
                    <strong id="catalogErrorCount">—</strong>
                    <small>需優先修正</small>
                </article>

                <article>
                    <span>警告</span>
                    <strong id="catalogWarningCount">—</strong>
                    <small>建議改善</small>
                </article>

                <article>
                    <span>資訊</span>
                    <strong id="catalogInfoCount">—</strong>
                    <small>維護提示</small>
                </article>
            </div>

            <div class="catalog-health-grid">
                <div class="catalog-health-card">
                    <div class="catalog-health-card-heading">
                        <div>
                            <h3>分類覆蓋</h3>
                            <p>目前各分類的項目數量。</p>
                        </div>
                    </div>

                    <div
                        id="catalogCategoryCoverage"
                        class="catalog-category-coverage"
                    >
                        <p class="catalog-health-empty">
                            正在計算……
                        </p>
                    </div>
                </div>

                <div class="catalog-health-card">
                    <div class="catalog-health-card-heading">
                        <div>
                            <h3>平台 Prompt 覆蓋</h3>
                            <p>四個平台欄位的完成比例。</p>
                        </div>
                    </div>

                    <div
                        id="catalogPlatformCoverage"
                        class="catalog-platform-coverage"
                    >
                        <p class="catalog-health-empty">
                            正在計算……
                        </p>
                    </div>
                </div>

                <div class="catalog-health-card">
                    <div class="catalog-health-card-heading">
                        <div>
                            <h3>來源摘要</h3>
                            <p>核心／自訂內容與各資料包狀態。</p>
                        </div>
                    </div>

                    <div
                        id="catalogSourceSummary"
                        class="catalog-source-summary"
                    >
                        <p class="catalog-health-empty">
                            正在載入……
                        </p>
                    </div>
                </div>
            </div>

            <div class="catalog-health-issues-card">
                <div class="catalog-health-issues-heading">
                    <div>
                        <h3>問題清單</h3>
                        <p id="catalogIssueResultCount">
                            0 筆
                        </p>
                    </div>

                    <div class="catalog-health-filters">
                        <label>
                            <span>搜尋</span>
                            <input
                                id="catalogIssueSearch"
                                type="search"
                                placeholder="搜尋 ID、名稱、問題"
                            >
                        </label>

                        <label>
                            <span>嚴重程度</span>
                            <select id="catalogSeverityFilter">
                                <option value="all">全部</option>
                                <option value="error">錯誤</option>
                                <option value="warning">警告</option>
                                <option value="info">資訊</option>
                            </select>
                        </label>

                        <label>
                            <span>來源</span>
                            <select id="catalogSourceFilter">
                                <option value="all">全部來源</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div
                    id="catalogIssueList"
                    class="catalog-issue-list"
                    aria-live="polite"
                >
                    <p class="catalog-health-empty">
                        正在檢查……
                    </p>
                </div>
            </div>
        `;

        const publisherPanel =
            document.getElementById("packPublisherPanel");

        if (publisherPanel) {
            publisherPanel.insertAdjacentElement(
                "afterend",
                panel
            );
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document
            .getElementById("runCatalogAuditButton")
            ?.addEventListener("click", runAudit);

        document
            .getElementById("exportCatalogAuditJsonButton")
            ?.addEventListener("click", exportJsonReport);

        document
            .getElementById("exportCatalogAuditCsvButton")
            ?.addEventListener("click", exportCsvReport);

        document
            .getElementById("copyCatalogIssueIdsButton")
            ?.addEventListener("click", copyIssueIds);

        document
            .getElementById("catalogIssueSearch")
            ?.addEventListener("input", (event) => {
                state.search =
                    event.target.value
                        .trim()
                        .toLowerCase();

                renderIssues();
            });

        document
            .getElementById("catalogSeverityFilter")
            ?.addEventListener("change", (event) => {
                state.severity = event.target.value;
                renderIssues();
            });

        document
            .getElementById("catalogSourceFilter")
            ?.addEventListener("change", (event) => {
                state.source = event.target.value;
                renderIssues();
            });
    }

    async function runAudit() {
        setLoadingState();

        state.issues = [];
        state.packResults = [];
        state.itemSources = new Map();

        try {
            const [
                categoryResponse,
                itemResponse,
                manifestResponse
            ] = await Promise.all([
                fetch(
                    "./data/categories.json",
                    { cache: "no-cache" }
                ),
                fetch(
                    "./data/items.json",
                    { cache: "no-cache" }
                ),
                fetch(
                    "./data/packs/manifest.json",
                    { cache: "no-cache" }
                )
            ]);

            if (!categoryResponse.ok) {
                throw new Error(
                    `categories.json HTTP ${categoryResponse.status}`
                );
            }

            if (!itemResponse.ok) {
                throw new Error(
                    `items.json HTTP ${itemResponse.status}`
                );
            }

            if (!manifestResponse.ok) {
                throw new Error(
                    `manifest.json HTTP ${manifestResponse.status}`
                );
            }

            state.categories =
                await categoryResponse.json();

            state.mergedItems =
                await itemResponse.json();

            state.manifest =
                await manifestResponse.json();

            if (!Array.isArray(state.categories)) {
                throw new Error(
                    "categories.json 最外層不是陣列"
                );
            }

            if (!Array.isArray(state.mergedItems)) {
                throw new Error(
                    "items.json 最外層不是陣列"
                );
            }

            if (
                !state.manifest ||
                !Array.isArray(state.manifest.packs)
            ) {
                throw new Error(
                    "資料包 manifest 格式不正確"
                );
            }

            await loadPackFiles();
            buildItemSources();
            auditManifest();
            auditPackDuplicates();
            auditItems();
            auditCoverage();

            renderAll();
            showToast("百科健康檢查完成");
        } catch (error) {
            console.error(error);

            addIssue({
                severity: "error",
                source: "系統",
                itemId: "",
                itemName: "",
                code: "AUDIT_LOAD_FAILED",
                message: error.message,
                suggestion:
                    "確認 JSON 路徑、格式與 Live Server 是否正常。"
            });

            renderAll();
            showToast("健康檢查未完整完成");
        }
    }

    async function loadPackFiles() {
        const results =
            await Promise.allSettled(
                state.manifest.packs.map(
                    async (entry) => {
                        const response =
                            await fetch(
                                entry.file,
                                { cache: "no-cache" }
                            );

                        if (!response.ok) {
                            throw new Error(
                                `${entry.file} HTTP ${response.status}`
                            );
                        }

                        const items =
                            await response.json();

                        if (!Array.isArray(items)) {
                            throw new Error(
                                `${entry.file} 最外層不是陣列`
                            );
                        }

                        return {
                            entry,
                            items,
                            ok: true
                        };
                    }
                )
            );

        state.packResults =
            results.map((result, index) => {
                const entry =
                    state.manifest.packs[index];

                if (result.status === "fulfilled") {
                    return result.value;
                }

                addIssue({
                    severity: "error",
                    source:
                        entry?.name_zh ||
                        entry?.id ||
                        "未知資料包",
                    itemId: "",
                    itemName: "",
                    code: "PACK_LOAD_FAILED",
                    message:
                        result.reason?.message ||
                        "資料包載入失敗",
                    suggestion:
                        "確認 manifest 的 file 路徑與實際檔名一致。"
                });

                return {
                    entry,
                    items: [],
                    ok: false,
                    error:
                        result.reason?.message ||
                        "載入失敗"
                };
            });
    }

    function buildItemSources() {
        const packIdSets = new Map();

        state.packResults.forEach((result) => {
            const sourceName =
                result.entry?.name_zh ||
                result.entry?.id ||
                "未知資料包";

            result.items.forEach((item) => {
                if (!item?.id) return;

                if (!packIdSets.has(item.id)) {
                    packIdSets.set(item.id, []);
                }

                packIdSets.get(item.id).push(sourceName);
            });
        });

        state.mergedItems.forEach((item) => {
            if (!item?.id) return;

            const sources =
                packIdSets.get(item.id);

            state.itemSources.set(
                item.id,
                sources?.length
                    ? sources.join("／")
                    : "核心／自訂"
            );
        });
    }

    function auditManifest() {
        const seenPackIds = new Set();
        const seenFiles = new Set();

        state.manifest.packs.forEach((entry, index) => {
            const source =
                entry?.name_zh ||
                entry?.id ||
                `資料包 ${index + 1}`;

            if (!entry?.id) {
                addIssue({
                    severity: "error",
                    source,
                    code: "PACK_ID_MISSING",
                    message: "Manifest 項目缺少 id。",
                    suggestion:
                        "補上小寫英文、數字與連字號組成的資料包 ID。"
                });
            } else {
                if (seenPackIds.has(entry.id)) {
                    addIssue({
                        severity: "error",
                        source,
                        code: "PACK_ID_DUPLICATE",
                        message:
                            `Manifest 重複資料包 ID：${entry.id}`,
                        suggestion:
                            "每個資料包 ID 必須唯一。"
                    });
                }

                seenPackIds.add(entry.id);
            }

            if (!entry?.file) {
                addIssue({
                    severity: "error",
                    source,
                    code: "PACK_FILE_MISSING",
                    message: "Manifest 項目缺少 file。",
                    suggestion:
                        "加入例如 ./data/packs/example.json。"
                });
            } else {
                if (seenFiles.has(entry.file)) {
                    addIssue({
                        severity: "warning",
                        source,
                        code: "PACK_FILE_DUPLICATE",
                        message:
                            `多個 Manifest 項目使用相同檔案：${entry.file}`,
                        suggestion:
                            "確認是否誤複製登記項目。"
                    });
                }

                seenFiles.add(entry.file);
            }

            const result =
                state.packResults[index];

            if (
                result?.ok &&
                Number(entry.item_count || 0) !==
                result.items.length
            ) {
                addIssue({
                    severity: "warning",
                    source,
                    code: "PACK_COUNT_MISMATCH",
                    message:
                        `Manifest item_count 為 ${entry.item_count || 0}，` +
                        `實際檔案為 ${result.items.length}。`,
                    suggestion:
                        `把 item_count 改成 ${result.items.length}。`
                });
            }

            if (!entry?.name_zh) {
                addIssue({
                    severity: "warning",
                    source,
                    code: "PACK_NAME_ZH_MISSING",
                    message:
                        "資料包缺少中文名稱。",
                    suggestion:
                        "加入 name_zh，方便管理器顯示。"
                });
            }

            if (!entry?.description_zh) {
                addIssue({
                    severity: "info",
                    source,
                    code: "PACK_DESCRIPTION_MISSING",
                    message:
                        "資料包尚未填寫中文說明。",
                    suggestion:
                        "簡述資料包主題與包含的服裝方向。"
                });
            }
        });
    }

    function auditPackDuplicates() {
        const idMap = new Map();

        state.packResults.forEach((result) => {
            const source =
                result.entry?.name_zh ||
                result.entry?.id ||
                "未知資料包";

            result.items.forEach((item, index) => {
                if (!item?.id) return;

                if (!idMap.has(item.id)) {
                    idMap.set(item.id, []);
                }

                idMap.get(item.id).push({
                    source,
                    index: index + 1,
                    name:
                        item.name_zh ||
                        item.name_en ||
                        ""
                });
            });
        });

        idMap.forEach((locations, itemId) => {
            if (locations.length <= 1) return;

            addIssue({
                severity: "error",
                source:
                    locations
                        .map((entry) => entry.source)
                        .join("／"),
                itemId,
                itemName:
                    locations[0]?.name || "",
                code: "CROSS_PACK_DUPLICATE_ID",
                message:
                    `ID 同時存在於 ${locations.length} 個資料包位置。`,
                suggestion:
                    "保留一筆，或替其他項目改成唯一 ID。"
            });
        });
    }

    function auditItems() {
        const categoryIds =
            new Set(
                state.categories
                    .map((category) => category.id)
            );

        const mergedSeen = new Set();

        state.mergedItems.forEach((item, index) => {
            const source =
                state.itemSources.get(item?.id) ||
                "核心／自訂";

            const itemId =
                item?.id || "";

            const itemName =
                item?.name_zh ||
                item?.name_en ||
                `第 ${index + 1} 筆`;

            REQUIRED_FIELDS.forEach((field) => {
                if (
                    item?.[field] === undefined ||
                    item?.[field] === null ||
                    item?.[field] === ""
                ) {
                    addIssue({
                        severity: "error",
                        source,
                        itemId,
                        itemName,
                        code: "ITEM_FIELD_MISSING",
                        message:
                            `缺少必填欄位：${field}`,
                        suggestion:
                            `補上 ${field} 欄位。`
                    });
                }
            });

            if (itemId) {
                if (mergedSeen.has(itemId)) {
                    addIssue({
                        severity: "error",
                        source,
                        itemId,
                        itemName,
                        code: "MERGED_DUPLICATE_ID",
                        message:
                            "合併後百科仍出現重複 ID。",
                        suggestion:
                            "檢查核心、自訂項目與資料包 ID。"
                    });
                }

                mergedSeen.add(itemId);

                if (
                    !/^[a-z0-9_][a-z0-9_-]*$/.test(itemId)
                ) {
                    addIssue({
                        severity: "error",
                        source,
                        itemId,
                        itemName,
                        code: "ITEM_ID_FORMAT",
                        message:
                            "項目 ID 格式不正確。",
                        suggestion:
                            "僅使用小寫英文字母、數字、底線與連字號。"
                    });
                }
            }

            if (
                item?.category &&
                !categoryIds.has(item.category)
            ) {
                addIssue({
                    severity: "error",
                    source,
                    itemId,
                    itemName,
                    code: "UNKNOWN_CATEGORY",
                    message:
                        `未知分類：${item.category}`,
                    suggestion:
                        "改用 categories.json 中已存在的分類 ID。"
                });
            }

            if (
                item?.gender &&
                !VALID_GENDERS.has(item.gender)
            ) {
                addIssue({
                    severity: "error",
                    source,
                    itemId,
                    itemName,
                    code: "INVALID_GENDER",
                    message:
                        `gender 不正確：${item.gender}`,
                    suggestion:
                        "使用 female、male、unisex 或 none。"
                });
            }

            if (!Array.isArray(item?.tags)) {
                addIssue({
                    severity: "error",
                    source,
                    itemId,
                    itemName,
                    code: "TAGS_NOT_ARRAY",
                    message:
                        "tags 必須是陣列。",
                    suggestion:
                        '例如 ["皮革", "leather"]。'
                });
            } else {
                if (!item.tags.length) {
                    addIssue({
                        severity: "warning",
                        source,
                        itemId,
                        itemName,
                        code: "TAGS_EMPTY",
                        message:
                            "此項目沒有搜尋標籤。",
                        suggestion:
                            "加入中文與英文材質、風格、服裝類型標籤。"
                    });
                }

                if (
                    item.tags.length &&
                    !item.tags.some((tag) =>
                        /[\u4e00-\u9fff]/.test(String(tag))
                    )
                ) {
                    addIssue({
                        severity: "warning",
                        source,
                        itemId,
                        itemName,
                        code: "CHINESE_TAG_MISSING",
                        message:
                            "缺少中文標籤，中文搜尋可能較弱。",
                        suggestion:
                            "加入材質、輪廓與服裝類型的中文關鍵字。"
                    });
                }
            }

            if (
                !item?.anatomy ||
                typeof item.anatomy !== "object" ||
                Array.isArray(item.anatomy)
            ) {
                addIssue({
                    severity: "error",
                    source,
                    itemId,
                    itemName,
                    code: "ANATOMY_INVALID",
                    message:
                        "anatomy 必須是物件。",
                    suggestion:
                        "使用 silhouette、material、closure 等鍵值。"
                });
            } else if (
                Object.keys(item.anatomy).length < 2
            ) {
                addIssue({
                    severity: "info",
                    source,
                    itemId,
                    itemName,
                    code: "ANATOMY_SPARSE",
                    message:
                        "結構欄位較少。",
                    suggestion:
                        "補充輪廓、材質、閉合方式、裝飾或下擺等結構。"
                });
            }

            if (
                String(item?.description_zh || "").length < 35
            ) {
                addIssue({
                    severity: "warning",
                    source,
                    itemId,
                    itemName,
                    code: "DESCRIPTION_ZH_SHORT",
                    message:
                        "中文詳細說明少於 35 個字。",
                    suggestion:
                        "補充輪廓、材質、剪裁、扣件及穿搭用途。"
                });
            }

            if (
                String(item?.description_en || "").length < 55
            ) {
                addIssue({
                    severity: "info",
                    source,
                    itemId,
                    itemName,
                    code: "DESCRIPTION_EN_SHORT",
                    message:
                        "英文詳細說明偏短。",
                    suggestion:
                        "補充 silhouette、material、construction 與 details。"
                });
            }

            if (
                !item?.prompts ||
                typeof item.prompts !== "object"
            ) {
                addIssue({
                    severity: "error",
                    source,
                    itemId,
                    itemName,
                    code: "PROMPTS_INVALID",
                    message:
                        "prompts 必須是物件。",
                    suggestion:
                        "建立 pixai、niji、tensorart、gpt 四個欄位。"
                });
            } else {
                PLATFORM_KEYS.forEach((key) => {
                    const prompt =
                        String(item.prompts[key] || "").trim();

                    if (!prompt) {
                        addIssue({
                            severity: "error",
                            source,
                            itemId,
                            itemName,
                            code: `PROMPT_${key.toUpperCase()}_MISSING`,
                            message:
                                `缺少 ${formatPlatform(key)} Prompt。`,
                            suggestion:
                                `補上 prompts.${key}。`
                        });
                    } else if (prompt.length < 35) {
                        addIssue({
                            severity: "info",
                            source,
                            itemId,
                            itemName,
                            code: `PROMPT_${key.toUpperCase()}_SHORT`,
                            message:
                                `${formatPlatform(key)} Prompt 偏短。`,
                            suggestion:
                                "補充材質、結構、剪裁與設計細節。"
                        });
                    }
                });
            }

            if (
                String(item?.negative || "").length < 20
            ) {
                addIssue({
                    severity: "warning",
                    source,
                    itemId,
                    itemName,
                    code: "NEGATIVE_SHORT",
                    message:
                        "Negative Prompt 過短。",
                    suggestion:
                        "至少加入 logo、text、watermark、malformed clothing 等。"
                });
            }
        });
    }

    function auditCoverage() {
        const counts =
            new Map(
                state.categories.map(
                    (category) => [category.id, 0]
                )
            );

        state.mergedItems.forEach((item) => {
            if (counts.has(item.category)) {
                counts.set(
                    item.category,
                    counts.get(item.category) + 1
                );
            }
        });

        state.categories.forEach((category) => {
            const count =
                counts.get(category.id) || 0;

            if (count === 0) {
                addIssue({
                    severity: "warning",
                    source: "分類覆蓋",
                    itemId: category.id,
                    itemName:
                        category.name_zh || category.id,
                    code: "CATEGORY_EMPTY",
                    message:
                        "此分類目前沒有任何項目。",
                    suggestion:
                        "新增至少 3 筆基礎內容，避免導覽後顯示空白。"
                });
            } else if (count < 3) {
                addIssue({
                    severity: "info",
                    source: "分類覆蓋",
                    itemId: category.id,
                    itemName:
                        category.name_zh || category.id,
                    code: "CATEGORY_LOW_COVERAGE",
                    message:
                        `此分類目前只有 ${count} 筆。`,
                    suggestion:
                        "建議擴充到至少 5 筆，提升隨機生成多樣性。"
                });
            }
        });
    }

    function renderAll() {
        renderScore();
        renderStats();
        renderCategoryCoverage();
        renderPlatformCoverage();
        renderSourceSummary();
        renderSourceFilter();
        renderIssues();
    }

    function renderScore() {
        const errors =
            state.issues.filter(
                (issue) => issue.severity === "error"
            ).length;

        const warnings =
            state.issues.filter(
                (issue) => issue.severity === "warning"
            ).length;

        const infos =
            state.issues.filter(
                (issue) => issue.severity === "info"
            ).length;

        const denominator =
            Math.max(state.mergedItems.length, 1);

        const penalty =
            errors * 8 +
            warnings * 3 +
            infos * 0.6;

        const normalizedPenalty =
            Math.min(
                100,
                penalty /
                Math.max(1, denominator / 20)
            );

        const score =
            Math.max(
                0,
                Math.round(100 - normalizedPenalty)
            );

        setText(
            "catalogHealthScore",
            String(score)
        );

        const bar =
            document.getElementById(
                "catalogHealthScoreBar"
            );

        if (bar) {
            bar.style.width = `${score}%`;
        }

        let label = "需要整理";

        if (score >= 90) {
            label = "百科狀態優良";
        } else if (score >= 75) {
            label = "整體健康";
        } else if (score >= 55) {
            label = "可持續改善";
        }

        setText(
            "catalogHealthLabel",
            label
        );
    }

    function renderStats() {
        setText(
            "catalogTotalItems",
            String(state.mergedItems.length)
        );

        setText(
            "catalogPackCount",
            String(state.manifest.packs.length)
        );

        setText(
            "catalogErrorCount",
            String(
                state.issues.filter(
                    (issue) =>
                        issue.severity === "error"
                ).length
            )
        );

        setText(
            "catalogWarningCount",
            String(
                state.issues.filter(
                    (issue) =>
                        issue.severity === "warning"
                ).length
            )
        );

        setText(
            "catalogInfoCount",
            String(
                state.issues.filter(
                    (issue) =>
                        issue.severity === "info"
                ).length
            )
        );
    }

    function renderCategoryCoverage() {
        const container =
            document.getElementById(
                "catalogCategoryCoverage"
            );

        if (!container) return;

        const counts = new Map();

        state.mergedItems.forEach((item) => {
            counts.set(
                item.category,
                (counts.get(item.category) || 0) + 1
            );
        });

        const maxCount =
            Math.max(
                1,
                ...state.categories.map(
                    (category) =>
                        counts.get(category.id) || 0
                )
            );

        container.innerHTML =
            state.categories.map((category) => {
                const count =
                    counts.get(category.id) || 0;

                const width =
                    Math.max(
                        count ? 5 : 0,
                        Math.round(
                            count / maxCount * 100
                        )
                    );

                return `
                    <article>
                        <div>
                            <span>
                                ${escapeHtml(category.icon || "✦")}
                                ${escapeHtml(category.name_zh || category.id)}
                            </span>

                            <strong>${count}</strong>
                        </div>

                        <div class="catalog-coverage-track">
                            <span style="width:${width}%"></span>
                        </div>
                    </article>
                `;
            }).join("");
    }

    function renderPlatformCoverage() {
        const container =
            document.getElementById(
                "catalogPlatformCoverage"
            );

        if (!container) return;

        const total =
            Math.max(state.mergedItems.length, 1);

        container.innerHTML =
            PLATFORM_KEYS.map((key) => {
                const completed =
                    state.mergedItems.filter(
                        (item) =>
                            String(
                                item?.prompts?.[key] || ""
                            ).trim()
                    ).length;

                const percent =
                    Math.round(
                        completed / total * 100
                    );

                return `
                    <article>
                        <div>
                            <span>
                                ${escapeHtml(formatPlatform(key))}
                            </span>

                            <strong>
                                ${completed}/${state.mergedItems.length}
                            </strong>
                        </div>

                        <div class="catalog-platform-track">
                            <span style="width:${percent}%"></span>
                        </div>

                        <small>${percent}%</small>
                    </article>
                `;
            }).join("");
    }

    function renderSourceSummary() {
        const container =
            document.getElementById(
                "catalogSourceSummary"
            );

        if (!container) return;

        const packIds = new Set();

        state.packResults.forEach((result) => {
            result.items.forEach((item) => {
                if (item?.id) packIds.add(item.id);
            });
        });

        const coreCount =
            state.mergedItems.filter(
                (item) => !packIds.has(item?.id)
            ).length;

        const rows = [
            {
                icon: "🧩",
                name: "核心／自訂",
                count: coreCount,
                status: "已載入"
            },
            ...state.packResults.map((result) => ({
                icon:
                    result.entry?.icon || "📦",
                name:
                    result.entry?.name_zh ||
                    result.entry?.id ||
                    "未知資料包",
                count:
                    result.items.length,
                status:
                    result.ok
                        ? result.entry?.default_enabled
                            ? "預設啟用"
                            : "預設停用"
                        : "載入失敗"
            }))
        ];

        container.innerHTML =
            rows.map((row) => `
                <article>
                    <span>${escapeHtml(row.icon)}</span>

                    <div>
                        <strong>${escapeHtml(row.name)}</strong>
                        <small>${escapeHtml(row.status)}</small>
                    </div>

                    <em>${row.count} 筆</em>
                </article>
            `).join("");
    }

    function renderSourceFilter() {
        const select =
            document.getElementById(
                "catalogSourceFilter"
            );

        if (!select) return;

        const sources =
            [...new Set(
                state.issues.map(
                    (issue) => issue.source
                )
            )]
                .filter(Boolean)
                .sort((a, b) =>
                    a.localeCompare(b, "zh-Hant")
                );

        select.innerHTML = `
            <option value="all">全部來源</option>
            ${sources.map((source) => `
                <option value="${escapeAttribute(source)}">
                    ${escapeHtml(source)}
                </option>
            `).join("")}
        `;

        if (sources.includes(state.source)) {
            select.value = state.source;
        } else {
            state.source = "all";
            select.value = "all";
        }
    }

    function renderIssues() {
        const container =
            document.getElementById(
                "catalogIssueList"
            );

        if (!container) return;

        const filtered =
            state.issues.filter((issue) => {
                const severityMatches =
                    state.severity === "all" ||
                    issue.severity === state.severity;

                const sourceMatches =
                    state.source === "all" ||
                    issue.source === state.source;

                const text = [
                    issue.source,
                    issue.itemId,
                    issue.itemName,
                    issue.code,
                    issue.message,
                    issue.suggestion
                ]
                    .join(" ")
                    .toLowerCase();

                const searchMatches =
                    !state.search ||
                    text.includes(state.search);

                return (
                    severityMatches &&
                    sourceMatches &&
                    searchMatches
                );
            });

        setText(
            "catalogIssueResultCount",
            `${filtered.length} / ${state.issues.length} 筆`
        );

        if (!filtered.length) {
            container.innerHTML = `
                <p class="catalog-health-empty">
                    ${state.issues.length
                        ? "找不到符合條件的問題。"
                        : "沒有發現需要列出的問題。"}
                </p>
            `;

            return;
        }

        container.innerHTML =
            filtered.map((issue) => `
                <article class="catalog-issue-card
                    ${escapeAttribute(issue.severity)}">
                    <div class="catalog-issue-heading">
                        <div>
                            <span class="catalog-issue-level">
                                ${severityIcon(issue.severity)}
                                ${severityLabel(issue.severity)}
                            </span>

                            <span class="catalog-issue-source">
                                ${escapeHtml(issue.source)}
                            </span>
                        </div>

                        <code>${escapeHtml(issue.code)}</code>
                    </div>

                    <h4>
                        ${escapeHtml(
                            issue.itemName ||
                            issue.itemId ||
                            issue.message
                        )}
                    </h4>

                    ${issue.itemId ? `
                        <p class="catalog-issue-id">
                            ${escapeHtml(issue.itemId)}
                        </p>
                    ` : ""}

                    <p class="catalog-issue-message">
                        ${escapeHtml(issue.message)}
                    </p>

                    <p class="catalog-issue-suggestion">
                        <strong>建議：</strong>
                        ${escapeHtml(issue.suggestion)}
                    </p>
                </article>
            `).join("");
    }

    function addIssue(issue) {
        state.issues.push({
            severity:
                issue.severity || "info",
            source:
                issue.source || "未知來源",
            itemId:
                issue.itemId || "",
            itemName:
                issue.itemName || "",
            code:
                issue.code || "GENERAL",
            message:
                issue.message || "",
            suggestion:
                issue.suggestion || ""
        });
    }

    function setLoadingState() {
        setText(
            "catalogHealthScore",
            "—"
        );

        setText(
            "catalogHealthLabel",
            "正在檢查……"
        );

        [
            "catalogTotalItems",
            "catalogPackCount",
            "catalogErrorCount",
            "catalogWarningCount",
            "catalogInfoCount"
        ].forEach((id) => setText(id, "—"));

        const issueList =
            document.getElementById(
                "catalogIssueList"
            );

        if (issueList) {
            issueList.innerHTML = `
                <p class="catalog-health-empty">
                    正在讀取核心百科與資料包……
                </p>
            `;
        }
    }

    function buildReport() {
        const categoryCounts = {};

        state.categories.forEach((category) => {
            categoryCounts[category.id] = 0;
        });

        state.mergedItems.forEach((item) => {
            categoryCounts[item.category] =
                (categoryCounts[item.category] || 0) + 1;
        });

        const platformCoverage = {};

        PLATFORM_KEYS.forEach((key) => {
            platformCoverage[key] =
                state.mergedItems.filter(
                    (item) =>
                        String(
                            item?.prompts?.[key] || ""
                        ).trim()
                ).length;
        });

        return {
            generatedAt:
                new Date().toISOString(),
            version: "2.3.0",
            summary: {
                totalItems:
                    state.mergedItems.length,
                packCount:
                    state.manifest.packs.length,
                errors:
                    state.issues.filter(
                        (issue) =>
                            issue.severity === "error"
                    ).length,
                warnings:
                    state.issues.filter(
                        (issue) =>
                            issue.severity === "warning"
                    ).length,
                info:
                    state.issues.filter(
                        (issue) =>
                            issue.severity === "info"
                    ).length
            },
            categoryCounts,
            platformCoverage,
            packs:
                state.packResults.map((result) => ({
                    id:
                        result.entry?.id || "",
                    name_zh:
                        result.entry?.name_zh || "",
                    file:
                        result.entry?.file || "",
                    declaredCount:
                        Number(
                            result.entry?.item_count || 0
                        ),
                    actualCount:
                        result.items.length,
                    loaded:
                        result.ok === true
                })),
            issues: state.issues
        };
    }

    function exportJsonReport() {
        downloadText(
            JSON.stringify(
                buildReport(),
                null,
                2
            ),
            `2Y-catalog-health-${
                new Date().toISOString().slice(0, 10)
            }.json`,
            "application/json;charset=utf-8"
        );

        showToast("JSON 健康報告已匯出");
    }

    function exportCsvReport() {
        const header = [
            "severity",
            "source",
            "item_id",
            "item_name",
            "code",
            "message",
            "suggestion"
        ];

        const rows =
            state.issues.map((issue) => [
                issue.severity,
                issue.source,
                issue.itemId,
                issue.itemName,
                issue.code,
                issue.message,
                issue.suggestion
            ]);

        const csv =
            [header, ...rows]
                .map((row) =>
                    row.map(csvEscape).join(",")
                )
                .join("\r\n");

        downloadText(
            "\ufeff" + csv,
            `2Y-catalog-issues-${
                new Date().toISOString().slice(0, 10)
            }.csv`,
            "text/csv;charset=utf-8"
        );

        showToast("CSV 問題清單已匯出");
    }

    async function copyIssueIds() {
        const ids =
            [...new Set(
                state.issues
                    .map((issue) => issue.itemId)
                    .filter(Boolean)
            )];

        if (!ids.length) {
            showToast("目前沒有問題 ID");
            return;
        }

        await copyText(ids.join("\n"));
        showToast(`已複製 ${ids.length} 個問題 ID`);
    }

    function csvEscape(value) {
        const text =
            String(value ?? "");

        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n")
        ) {
            return `"${text.replaceAll('"', '""')}"`;
        }

        return text;
    }

    function downloadText(
        text,
        filename,
        mimeType
    ) {
        const blob =
            new Blob([text], {
                type: mimeType
            });

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.click();

        URL.revokeObjectURL(url);
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

    function addNavigationButton() {
        window.setTimeout(() => {
            const container =
                document.getElementById(
                    "sectionNavLinks"
                );

            if (
                !container ||
                container.querySelector(
                    "[data-catalog-health-nav]"
                )
            ) {
                return;
            }

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "section-nav-link";
            button.dataset.catalogHealthNav =
                "true";
            button.innerHTML =
                "<span>🩺</span><span>百科健檢</span>";

            button.addEventListener("click", () => {
                document
                    .getElementById(
                        "catalogHealthPanel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1750);
    }

    function formatPlatform(key) {
        const labels = {
            pixai: "PixAI",
            niji: "Niji Journey",
            tensorart: "TensorArt",
            gpt: "GPT Image"
        };

        return labels[key] || key;
    }

    function severityIcon(level) {
        return {
            error: "❌",
            warning: "⚠",
            info: "ℹ"
        }[level] || "•";
    }

    function severityLabel(level) {
        return {
            error: "錯誤",
            warning: "警告",
            info: "資訊"
        }[level] || level;
    }

    function showToast(message) {
        let toast =
            document.getElementById(
                "catalogHealthToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "catalogHealthToast";
            toast.className =
                "catalog-health-toast";

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

    function setText(id, text) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = text;
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
