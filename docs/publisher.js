// ======================================
// 2Y Data Pack Publishing Assistant
// Version: v2.2.0
// ======================================

(() => {
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
        currentManifest: {
            version: 1,
            packs: []
        },
        currentServiceWorker: "",
        categories: [],
        catalogIds: new Set(),
        packFiles: new Map(),
        manifestEntries: new Map(),
        report: {
            errors: [],
            warnings: [],
            info: []
        }
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindControls();

        try {
            await loadCurrentSiteData();
            renderCurrentPacks();
            renderImportedPacks();
            renderReport();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            showMessage(
                `發布助手初始化失敗：${error.message}`,
                true
            );
        }
    });

    function createPanel() {
        if (document.getElementById("packPublisherPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "packPublisherPanel";
        panel.className =
            "pack-publisher-panel app-section-target";

        panel.innerHTML = `
            <div class="pack-publisher-heading">
                <div>
                    <p class="pack-publisher-eyebrow">
                        DATA PACK RELEASE WORKFLOW
                    </p>

                    <h2>資料包發布助手</h2>

                    <p>
                        匯入資料包 JSON 與 Manifest 登記檔，
                        自動檢查內容，並產生可直接覆蓋的
                        <code>manifest.json</code> 與
                        <code>sw.js</code>。
                    </p>
                </div>

                <span class="pack-publisher-version">
                    v2.2.0
                </span>
            </div>

            <div class="pack-publisher-layout">
                <aside class="pack-publisher-sidebar">
                    <div class="pack-publisher-card">
                        <h3>匯入發布檔案</h3>

                        <label class="pack-publisher-import">
                            匯入資料包 JSON
                            <input
                                id="publisherPackFilesInput"
                                type="file"
                                accept=".json,application/json"
                                multiple
                                hidden
                            >
                        </label>

                        <label class="pack-publisher-import">
                            匯入 Manifest 登記檔
                            <input
                                id="publisherManifestEntriesInput"
                                type="file"
                                accept=".json,application/json"
                                multiple
                                hidden
                            >
                        </label>

                        <p class="pack-publisher-help">
                            資料包檔名建議與資料包 ID 相同，例如：
                            <code>gothic-vol-01.json</code>
                        </p>
                    </div>

                    <div class="pack-publisher-card">
                        <h3>發布設定</h3>

                        <label class="pack-publisher-check">
                            <input
                                id="publisherReplaceExisting"
                                type="checkbox"
                                checked
                            >
                            <span>
                                同 ID 時更新現有 Manifest 項目
                            </span>
                        </label>

                        <label class="pack-publisher-check">
                            <input
                                id="publisherDefaultEnabled"
                                type="checkbox"
                            >
                            <span>
                                自動建立的登記項目預設啟用
                            </span>
                        </label>

                        <button
                            id="validatePublisherButton"
                            type="button"
                        >
                            ✅ 驗證發布內容
                        </button>

                        <button
                            id="exportMergedManifestButton"
                            class="pack-publisher-export"
                            type="button"
                        >
                            匯出完整 manifest.json
                        </button>

                        <button
                            id="exportUpdatedServiceWorkerButton"
                            class="pack-publisher-export"
                            type="button"
                        >
                            匯出更新後 sw.js
                        </button>

                        <button
                            id="copyPublisherChecklistButton"
                            class="pack-publisher-secondary"
                            type="button"
                        >
                            📋 複製發布清單
                        </button>

                        <button
                            id="clearPublisherImportsButton"
                            class="pack-publisher-text-button"
                            type="button"
                        >
                            清除匯入內容
                        </button>
                    </div>

                    <div class="pack-publisher-card">
                        <h3>目前網站</h3>

                        <div class="pack-publisher-summary">
                            <span>現有資料包</span>
                            <strong id="publisherCurrentPackCount">0</strong>
                        </div>

                        <div class="pack-publisher-summary">
                            <span>匯入資料包</span>
                            <strong id="publisherImportedPackCount">0</strong>
                        </div>

                        <div class="pack-publisher-summary">
                            <span>準備發布</span>
                            <strong id="publisherReadyPackCount">0</strong>
                        </div>
                    </div>
                </aside>

                <div class="pack-publisher-workspace">
                    <div class="pack-publisher-section">
                        <div class="pack-publisher-section-heading">
                            <div>
                                <h3>目前 Manifest 資料包</h3>
                                <p>
                                    讀取自
                                    <code>docs/data/packs/manifest.json</code>
                                </p>
                            </div>
                        </div>

                        <div
                            id="publisherCurrentPacks"
                            class="pack-publisher-current-packs"
                        >
                            <p class="pack-publisher-empty">
                                正在載入……
                            </p>
                        </div>
                    </div>

                    <div class="pack-publisher-section">
                        <div class="pack-publisher-section-heading">
                            <div>
                                <h3>準備發布的資料包</h3>
                                <p>
                                    可同時匯入多個資料包。
                                </p>
                            </div>
                        </div>

                        <div
                            id="publisherImportedPacks"
                            class="pack-publisher-imported-packs"
                        >
                            <p class="pack-publisher-empty">
                                尚未匯入資料包 JSON。
                            </p>
                        </div>
                    </div>

                    <div class="pack-publisher-section">
                        <div class="pack-publisher-section-heading">
                            <div>
                                <h3>驗證報告</h3>
                                <p>
                                    匯出前請確認沒有紅色錯誤。
                                </p>
                            </div>
                        </div>

                        <div
                            id="publisherValidationReport"
                            class="pack-publisher-report"
                        >
                            <p class="pack-publisher-empty">
                                尚未執行驗證。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const bulkPanel =
            document.getElementById("bulkPackPanel");

        if (bulkPanel) {
            bulkPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document
            .getElementById("publisherPackFilesInput")
            ?.addEventListener("change", importPackFiles);

        document
            .getElementById("publisherManifestEntriesInput")
            ?.addEventListener(
                "change",
                importManifestEntries
            );

        document
            .getElementById("validatePublisherButton")
            ?.addEventListener("click", () => {
                validateAll();
                renderReport();
                renderImportedPacks();
            });

        document
            .getElementById("exportMergedManifestButton")
            ?.addEventListener("click", exportMergedManifest);

        document
            .getElementById(
                "exportUpdatedServiceWorkerButton"
            )
            ?.addEventListener(
                "click",
                exportUpdatedServiceWorker
            );

        document
            .getElementById("copyPublisherChecklistButton")
            ?.addEventListener(
                "click",
                copyPublisherChecklist
            );

        document
            .getElementById("clearPublisherImportsButton")
            ?.addEventListener("click", clearImports);

        document
            .getElementById("publisherDefaultEnabled")
            ?.addEventListener("change", () => {
                renderImportedPacks();
            });
    }

    async function loadCurrentSiteData() {
        const [
            manifestResponse,
            serviceWorkerResponse,
            categoryResponse,
            itemResponse
        ] = await Promise.all([
            fetch(
                "./data/packs/manifest.json",
                { cache: "no-cache" }
            ),
            fetch(
                "./sw.js",
                { cache: "no-cache" }
            ),
            fetch("./data/categories.json"),
            fetch("./data/items.json")
        ]);

        if (!manifestResponse.ok) {
            throw new Error(
                `manifest.json HTTP ${manifestResponse.status}`
            );
        }

        state.currentManifest =
            await manifestResponse.json();

        if (
            !state.currentManifest ||
            !Array.isArray(state.currentManifest.packs)
        ) {
            throw new Error(
                "目前 manifest.json 格式不正確"
            );
        }

        if (serviceWorkerResponse.ok) {
            state.currentServiceWorker =
                await serviceWorkerResponse.text();
        }

        if (categoryResponse.ok) {
            state.categories =
                await categoryResponse.json();
        }

        if (itemResponse.ok) {
            const items =
                await itemResponse.json();

            if (Array.isArray(items)) {
                state.catalogIds = new Set(
                    items
                        .map((item) => item?.id)
                        .filter(Boolean)
                );
            }
        }
    }

    async function importPackFiles(event) {
        const files =
            [...(event.target.files || [])];

        event.target.value = "";

        for (const file of files) {
            try {
                const parsed =
                    JSON.parse(await file.text());

                if (!Array.isArray(parsed)) {
                    throw new Error(
                        "最外層必須是 JSON 陣列"
                    );
                }

                const id =
                    normalizePackId(
                        file.name.replace(/\.json$/i, "")
                    );

                if (!id) {
                    throw new Error(
                        "檔名無法轉換成有效資料包 ID"
                    );
                }

                state.packFiles.set(id, {
                    id,
                    filename: `${id}.json`,
                    originalFilename: file.name,
                    items: parsed,
                    size: file.size
                });
            } catch (error) {
                state.report.errors.push(
                    `${file.name}：${error.message}`
                );
            }
        }

        validateAll();
        renderImportedPacks();
        renderReport();
        updateSummary();

        showToast(
            `已匯入 ${files.length} 個資料包檔案`
        );
    }

    async function importManifestEntries(event) {
        const files =
            [...(event.target.files || [])];

        event.target.value = "";

        for (const file of files) {
            try {
                const parsed =
                    JSON.parse(await file.text());

                const entries =
                    Array.isArray(parsed)
                        ? parsed
                        : parsed.packs &&
                          Array.isArray(parsed.packs)
                            ? parsed.packs
                            : [parsed];

                entries.forEach((entry) => {
                    if (!entry?.id) {
                        throw new Error(
                            "登記項目缺少 id"
                        );
                    }

                    const id =
                        normalizePackId(entry.id);

                    state.manifestEntries.set(
                        id,
                        normalizeManifestEntry(
                            entry,
                            id
                        )
                    );
                });
            } catch (error) {
                state.report.errors.push(
                    `${file.name}：${error.message}`
                );
            }
        }

        validateAll();
        renderImportedPacks();
        renderReport();
        updateSummary();

        showToast(
            `已匯入 ${files.length} 個 Manifest 檔案`
        );
    }

    function validateAll() {
        const errors = [];
        const warnings = [];
        const info = [];

        const categoryIds =
            new Set(
                state.categories
                    .map((category) => category.id)
            );

        const currentPackIds =
            new Set(
                state.currentManifest.packs
                    .map((pack) => pack.id)
            );

        const crossPackItemIds =
            new Map();

        state.packFiles.forEach((pack, packId) => {
            if (!pack.items.length) {
                errors.push(
                    `${pack.filename}：資料包沒有任何項目`
                );
                return;
            }

            const localIds = new Set();

            pack.items.forEach((item, index) => {
                const label =
                    `${pack.filename} 第 ${index + 1} 筆`;

                REQUIRED_ITEM_FIELDS.forEach((field) => {
                    if (
                        item?.[field] === undefined ||
                        item?.[field] === null ||
                        item?.[field] === ""
                    ) {
                        errors.push(
                            `${label}：缺少 ${field}`
                        );
                    }
                });

                if (!item?.id) {
                    return;
                }

                if (
                    !/^[a-z0-9_][a-z0-9_-]*$/.test(item.id)
                ) {
                    errors.push(
                        `${label}：項目 ID 格式不正確`
                    );
                }

                if (localIds.has(item.id)) {
                    errors.push(
                        `${label}：資料包內重複 ID「${item.id}」`
                    );
                }

                localIds.add(item.id);

                if (crossPackItemIds.has(item.id)) {
                    errors.push(
                        `${label}：與 ${
                            crossPackItemIds.get(item.id)
                        } 重複 ID「${item.id}」`
                    );
                } else {
                    crossPackItemIds.set(
                        item.id,
                        pack.filename
                    );
                }

                if (
                    item.category &&
                    !categoryIds.has(item.category)
                ) {
                    errors.push(
                        `${label}：未知分類「${item.category}」`
                    );
                }

                if (
                    !["female", "male", "unisex", "none"]
                        .includes(item.gender)
                ) {
                    errors.push(
                        `${label}：gender 不正確`
                    );
                }

                if (
                    !item.prompts ||
                    typeof item.prompts !== "object"
                ) {
                    errors.push(
                        `${label}：prompts 格式不正確`
                    );
                } else {
                    PLATFORM_KEYS.forEach((key) => {
                        if (!item.prompts[key]) {
                            errors.push(
                                `${label}：缺少 prompts.${key}`
                            );
                        }
                    });
                }

                if (
                    !Array.isArray(item.tags)
                ) {
                    errors.push(
                        `${label}：tags 必須是陣列`
                    );
                }

                if (
                    !item.anatomy ||
                    typeof item.anatomy !== "object" ||
                    Array.isArray(item.anatomy)
                ) {
                    errors.push(
                        `${label}：anatomy 必須是物件`
                    );
                }

                if (
                    state.catalogIds.has(item.id)
                ) {
                    warnings.push(
                        `${label}：ID「${item.id}」已存在於目前百科`
                    );
                }

                if (
                    String(item.description_zh || "")
                        .length < 35
                ) {
                    warnings.push(
                        `${label}：中文說明少於 35 個字`
                    );
                }
            });

            const entry =
                getResolvedManifestEntry(packId);

            if (!entry) {
                errors.push(
                    `${pack.filename}：無法建立 Manifest 登記項目`
                );
                return;
            }

            if (
                Number(entry.item_count) !==
                pack.items.length
            ) {
                warnings.push(
                    `${pack.filename}：Manifest item_count ` +
                    `${entry.item_count} 與實際 ${pack.items.length} 不同，` +
                    "匯出時會自動修正"
                );
            }

            const expectedPath =
                `./data/packs/${pack.filename}`;

            if (entry.file !== expectedPath) {
                warnings.push(
                    `${pack.filename}：Manifest file 會修正為 ${expectedPath}`
                );
            }

            if (currentPackIds.has(packId)) {
                info.push(
                    `${pack.filename}：將更新現有資料包「${packId}」`
                );
            } else {
                info.push(
                    `${pack.filename}：將新增資料包「${packId}」`
                );
            }
        });

        state.manifestEntries.forEach((entry, id) => {
            if (!state.packFiles.has(id)) {
                warnings.push(
                    `Manifest 登記項目「${id}」沒有對應的資料包 JSON`
                );
            }
        });

        if (!state.packFiles.size) {
            info.push(
                "尚未匯入資料包 JSON。"
            );
        }

        if (!state.currentServiceWorker) {
            warnings.push(
                "無法讀取目前 sw.js，將無法匯出更新後 Service Worker。"
            );
        }

        state.report = {
            errors: unique(errors),
            warnings: unique(warnings),
            info: unique(info)
        };

        updateSummary();

        return state.report;
    }

    function getResolvedManifestEntry(packId) {
        const pack =
            state.packFiles.get(packId);

        if (!pack) return null;

        const importedEntry =
            state.manifestEntries.get(packId);

        const currentEntry =
            state.currentManifest.packs.find(
                (entry) => entry.id === packId
            );

        const base =
            importedEntry ||
            currentEntry ||
            createAutomaticEntry(pack);

        const categoryNames = [
            ...new Set(
                pack.items.map((item) => {
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
        ].filter(Boolean);

        return {
            ...base,
            id: packId,
            name_zh:
                base.name_zh || packId,
            name_en:
                base.name_en || packId,
            description_zh:
                base.description_zh || "",
            icon:
                base.icon || "📦",
            version:
                base.version || "1.0.0",
            file:
                `./data/packs/${pack.filename}`,
            item_count:
                pack.items.length,
            categories:
                categoryNames,
            default_enabled:
                typeof base.default_enabled === "boolean"
                    ? base.default_enabled
                    : document.getElementById(
                        "publisherDefaultEnabled"
                    )?.checked === true
        };
    }

    function createAutomaticEntry(pack) {
        return {
            id: pack.id,
            name_zh: pack.id,
            name_en: pack.id,
            description_zh:
                "由 2Y 資料包發布助手自動建立的登記項目。",
            icon: "📦",
            version: "1.0.0",
            file:
                `./data/packs/${pack.filename}`,
            item_count:
                pack.items.length,
            categories: [],
            default_enabled:
                document.getElementById(
                    "publisherDefaultEnabled"
                )?.checked === true
        };
    }

    function normalizeManifestEntry(entry, id) {
        return {
            id,
            name_zh:
                String(entry.name_zh || id),
            name_en:
                String(entry.name_en || id),
            description_zh:
                String(entry.description_zh || ""),
            icon:
                String(entry.icon || "📦"),
            version:
                String(entry.version || "1.0.0"),
            file:
                String(
                    entry.file ||
                    `./data/packs/${id}.json`
                ),
            item_count:
                Number(entry.item_count || 0),
            categories:
                Array.isArray(entry.categories)
                    ? entry.categories.map(String)
                    : [],
            default_enabled:
                entry.default_enabled === true
        };
    }

    function buildMergedManifest() {
        const replaceExisting =
            document.getElementById(
                "publisherReplaceExisting"
            )?.checked !== false;

        const merged =
            new Map(
                state.currentManifest.packs.map(
                    (entry) => [entry.id, entry]
                )
            );

        state.packFiles.forEach((pack, id) => {
            const entry =
                getResolvedManifestEntry(id);

            if (
                merged.has(id) &&
                !replaceExisting
            ) {
                return;
            }

            merged.set(id, entry);
        });

        return {
            version:
                Number(
                    state.currentManifest.version || 1
                ),
            packs:
                [...merged.values()]
        };
    }

    function exportMergedManifest() {
        const report = validateAll();
        renderReport();

        if (report.errors.length) {
            alert(
                "仍有發布錯誤，請先修正再匯出。"
            );
            return;
        }

        if (!state.packFiles.size) {
            showToast("尚未匯入資料包");
            return;
        }

        downloadText(
            JSON.stringify(
                buildMergedManifest(),
                null,
                2
            ),
            "manifest.json",
            "application/json;charset=utf-8"
        );

        showToast(
            "完整 manifest.json 已匯出"
        );
    }

    function exportUpdatedServiceWorker() {
        const report = validateAll();
        renderReport();

        if (report.errors.length) {
            alert(
                "仍有發布錯誤，請先修正再匯出。"
            );
            return;
        }

        if (!state.currentServiceWorker) {
            alert("無法讀取目前 sw.js。");
            return;
        }

        if (!state.packFiles.size) {
            showToast("尚未匯入資料包");
            return;
        }

        let updated =
            state.currentServiceWorker;

        state.packFiles.forEach((pack) => {
            const path =
                `./data/packs/${pack.filename}`;

            updated =
                insertAssetPath(updated, path);
        });

        updated =
            bumpServiceWorkerVersion(updated);

        downloadText(
            updated,
            "sw.js",
            "text/javascript;charset=utf-8"
        );

        showToast("更新後 sw.js 已匯出");
    }

    function insertAssetPath(source, assetPath) {
        if (
            source.includes(`"${assetPath}"`) ||
            source.includes(`'${assetPath}'`)
        ) {
            return source;
        }

        const marker =
            /(\s*["']\.\/data\/packs\/manifest\.json["']\s*,?)/;

        if (marker.test(source)) {
            return source.replace(
                marker,
                (match) =>
                    `${match}\n    "${assetPath}",`
            );
        }

        const arrayStart =
            /const\s+APP_ASSETS\s*=\s*\[/;

        if (!arrayStart.test(source)) {
            throw new Error(
                "sw.js 找不到 APP_ASSETS 陣列"
            );
        }

        return source.replace(
            arrayStart,
            (match) =>
                `${match}\n    "${assetPath}",`
        );
    }

    function bumpServiceWorkerVersion(source) {
        const version =
            "2.2.0";

        let result = source.replace(
            /(Service Worker v)[0-9.]+/i,
            `$1${version}`
        );

        result = result.replace(
            /(const\s+CACHE_NAME\s*=\s*["'][^"']*?v)[0-9.]+(["'])/,
            `$1${version}$2`
        );

        return result;
    }

    function copyPublisherChecklist() {
        const report = validateAll();
        renderReport();

        const lines = [
            "2Y 資料包發布清單",
            "",
            "1. 將以下資料包 JSON 放入 docs/data/packs/：",
            ...[...state.packFiles.values()]
                .map((pack) => `   - ${pack.filename}`),
            "",
            "2. 用發布助手匯出的 manifest.json 覆蓋：",
            "   docs/data/packs/manifest.json",
            "",
            "3. 用發布助手匯出的 sw.js 覆蓋：",
            "   docs/sw.js",
            "",
            "4. 在 docs/app.js 更新版本號：",
            '   version: "2.2.0"',
            "",
            "5. Live Server 測試：",
            "   - 開啟資料包管理器",
            "   - 確認新資料包出現",
            "   - 啟用後搜尋新項目名稱",
            "",
            "6. GitHub Desktop Commit：",
            "   v2.2.0 Publish clothing data packs",
            "",
            `驗證錯誤：${report.errors.length}`,
            `驗證警告：${report.warnings.length}`
        ];

        copyText(
            lines.join("\n"),
            "發布清單已複製"
        );
    }

    function clearImports() {
        if (
            state.packFiles.size &&
            !window.confirm(
                "確定清除所有匯入內容？"
            )
        ) {
            return;
        }

        state.packFiles.clear();
        state.manifestEntries.clear();

        state.report = {
            errors: [],
            warnings: [],
            info: []
        };

        renderImportedPacks();
        renderReport();
        updateSummary();

        showToast("匯入內容已清除");
    }

    function renderCurrentPacks() {
        const container =
            document.getElementById(
                "publisherCurrentPacks"
            );

        if (!container) return;

        const packs =
            state.currentManifest.packs || [];

        if (!packs.length) {
            container.innerHTML = `
                <p class="pack-publisher-empty">
                    目前 Manifest 沒有資料包。
                </p>
            `;

            updateSummary();
            return;
        }

        container.innerHTML = packs
            .map((pack) => `
                <article class="pack-publisher-current-card">
                    <span>${escapeHtml(pack.icon || "📦")}</span>

                    <div>
                        <h4>
                            ${escapeHtml(pack.name_zh || pack.id)}
                        </h4>

                        <p>
                            ${escapeHtml(pack.id)}
                            · ${Number(pack.item_count || 0)} 筆
                            · ${pack.default_enabled ? "預設啟用" : "預設停用"}
                        </p>
                    </div>
                </article>
            `)
            .join("");

        updateSummary();
    }

    function renderImportedPacks() {
        const container =
            document.getElementById(
                "publisherImportedPacks"
            );

        if (!container) return;

        if (!state.packFiles.size) {
            container.innerHTML = `
                <p class="pack-publisher-empty">
                    尚未匯入資料包 JSON。
                </p>
            `;

            updateSummary();
            return;
        }

        container.innerHTML =
            [...state.packFiles.values()]
                .map((pack) => {
                    const entry =
                        getResolvedManifestEntry(pack.id);

                    const hasImportedEntry =
                        state.manifestEntries.has(pack.id);

                    const isExisting =
                        state.currentManifest.packs.some(
                            (current) =>
                                current.id === pack.id
                        );

                    const packErrors =
                        state.report.errors.filter(
                            (message) =>
                                message.includes(pack.filename)
                        );

                    const packWarnings =
                        state.report.warnings.filter(
                            (message) =>
                                message.includes(pack.filename)
                        );

                    return `
                        <article class="pack-publisher-imported-card
                            ${packErrors.length ? "error" : ""}
                            ${!packErrors.length && packWarnings.length ? "warning" : ""}
                        ">
                            <div class="pack-publisher-imported-heading">
                                <div>
                                    <span>
                                        ${escapeHtml(entry?.icon || "📦")}
                                    </span>

                                    <div>
                                        <h4>
                                            ${escapeHtml(
                                                entry?.name_zh ||
                                                pack.id
                                            )}
                                        </h4>

                                        <p>
                                            ${escapeHtml(pack.filename)}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    data-publisher-remove="${escapeAttribute(pack.id)}"
                                >
                                    移除
                                </button>
                            </div>

                            <div class="pack-publisher-badges">
                                <span>${pack.items.length} 筆</span>
                                <span>
                                    ${isExisting ? "更新現有" : "新增"}
                                </span>
                                <span>
                                    ${hasImportedEntry
                                        ? "使用匯入登記檔"
                                        : "自動建立登記檔"}
                                </span>
                            </div>

                            <p class="pack-publisher-description">
                                ${escapeHtml(
                                    entry?.description_zh ||
                                    "尚未填寫資料包說明"
                                )}
                            </p>

                            <div class="pack-publisher-card-status">
                                <span class="${packErrors.length ? "error" : "ok"}">
                                    ${packErrors.length
                                        ? `${packErrors.length} 個錯誤`
                                        : "無錯誤"}
                                </span>

                                <span class="${packWarnings.length ? "warning" : "ok"}">
                                    ${packWarnings.length
                                        ? `${packWarnings.length} 個警告`
                                        : "無警告"}
                                </span>
                            </div>
                        </article>
                    `;
                })
                .join("");

        container
            .querySelectorAll("[data-publisher-remove]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const id =
                        button.dataset.publisherRemove;

                    state.packFiles.delete(id);
                    state.manifestEntries.delete(id);

                    validateAll();
                    renderImportedPacks();
                    renderReport();
                    updateSummary();
                });
            });

        updateSummary();
    }

    function renderReport() {
        const container =
            document.getElementById(
                "publisherValidationReport"
            );

        if (!container) return;

        const {
            errors,
            warnings,
            info
        } = state.report;

        if (
            !errors.length &&
            !warnings.length &&
            !info.length
        ) {
            container.innerHTML = `
                <p class="pack-publisher-empty">
                    尚未執行驗證。
                </p>
            `;
            return;
        }

        container.innerHTML = `
            ${errors.length ? `
                <details class="pack-publisher-report-group error" open>
                    <summary>
                        ❌ 錯誤（${errors.length}）
                    </summary>
                    <ul>
                        ${errors.map((item) =>
                            `<li>${escapeHtml(item)}</li>`
                        ).join("")}
                    </ul>
                </details>
            ` : ""}

            ${warnings.length ? `
                <details class="pack-publisher-report-group warning">
                    <summary>
                        ⚠ 警告（${warnings.length}）
                    </summary>
                    <ul>
                        ${warnings.map((item) =>
                            `<li>${escapeHtml(item)}</li>`
                        ).join("")}
                    </ul>
                </details>
            ` : ""}

            ${info.length ? `
                <details class="pack-publisher-report-group info" open>
                    <summary>
                        ℹ 資訊（${info.length}）
                    </summary>
                    <ul>
                        ${info.map((item) =>
                            `<li>${escapeHtml(item)}</li>`
                        ).join("")}
                    </ul>
                </details>
            ` : ""}

            ${!errors.length && state.packFiles.size ? `
                <p class="pack-publisher-ready">
                    ✅ 沒有阻止發布的錯誤，可以匯出
                    manifest.json 與 sw.js。
                </p>
            ` : ""}
        `;
    }

    function updateSummary() {
        setText(
            "publisherCurrentPackCount",
            String(
                state.currentManifest.packs?.length || 0
            )
        );

        setText(
            "publisherImportedPackCount",
            String(state.packFiles.size)
        );

        const ready =
            state.report.errors.length
                ? 0
                : state.packFiles.size;

        setText(
            "publisherReadyPackCount",
            String(ready)
        );
    }

    function normalizePackId(value) {
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]+/g, "")
            .replace(/^-+|-+$/g, "");
    }

    function unique(values) {
        return [...new Set(values)];
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

    async function copyText(text, message) {
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

        showToast(message);
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
                    "[data-publisher-nav]"
                )
            ) {
                return;
            }

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "section-nav-link";
            button.dataset.publisherNav =
                "true";
            button.innerHTML =
                "<span>🚀</span><span>發布助手</span>";

            button.addEventListener(
                "click",
                () => {
                    document
                        .getElementById(
                            "packPublisherPanel"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                }
            );

            container.appendChild(button);
        }, 1650);
    }

    function showMessage(
        message,
        isError = false
    ) {
        const container =
            document.getElementById(
                "publisherValidationReport"
            );

        if (!container) return;

        container.innerHTML = `
            <p class="pack-publisher-empty
                ${isError ? "error" : ""}">
                ${escapeHtml(message)}
            </p>
        `;
    }

    function showToast(message) {
        let toast =
            document.getElementById(
                "packPublisherToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "packPublisherToast";
            toast.className =
                "pack-publisher-toast";

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
