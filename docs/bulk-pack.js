// ======================================
// 2Y Bulk Data Pack Importer
// Version: v2.1.0
// ======================================

(() => {
    const DB_NAME = "2y-data-pack-studio";
    const DB_VERSION = 1;
    const STORE_NAME = "drafts";
    const DRAFT_ID = "current-pack-draft";

    const REQUIRED_COLUMNS = [
        "id",
        "category",
        "name_zh",
        "name_en",
        "gender",
        "description_zh",
        "description_en",
        "tags",
        "anatomy",
        "base_prompt",
        "negative"
    ];

    const VALID_GENDERS = new Set([
        "female",
        "male",
        "unisex",
        "none"
    ]);

    const state = {
        categories: [],
        catalogIds: new Set(),
        rows: [],
        parsedItems: [],
        errors: [],
        warnings: []
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindControls();

        try {
            await loadReferenceData();
            renderCategoryGuide();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            showMessage(
                `批次匯入器初始化失敗：${error.message}`,
                true
            );
        }
    });

    function createPanel() {
        if (document.getElementById("bulkPackPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "bulkPackPanel";
        panel.className = "bulk-pack-panel app-section-target";
        panel.innerHTML = `
            <div class="bulk-pack-heading">
                <div>
                    <p class="bulk-pack-eyebrow">
                        CSV / TSV DATA PACK BUILDER
                    </p>
                    <h2>批次服裝資料製作器</h2>
                    <p>
                        使用試算表一次建立大量百科項目。
                        貼上或匯入 CSV／TSV 後，自動產生四平台 Prompt、
                        驗證資料並匯出資料包 JSON。
                    </p>
                </div>
                <span class="bulk-pack-version">v2.1.0</span>
            </div>

            <div class="bulk-pack-layout">
                <aside class="bulk-pack-sidebar">
                    <div class="bulk-pack-card">
                        <h3>資料包資訊</h3>

                        <label class="bulk-pack-field">
                            <span>資料包 ID *</span>
                            <input id="bulkPackId"
                                placeholder="例如：streetwear-vol-01">
                        </label>

                        <label class="bulk-pack-field">
                            <span>中文名稱 *</span>
                            <input id="bulkPackNameZh"
                                placeholder="街頭服飾擴充包 Vol.01">
                        </label>

                        <label class="bulk-pack-field">
                            <span>英文名稱</span>
                            <input id="bulkPackNameEn"
                                placeholder="Streetwear Expansion Vol.01">
                        </label>

                        <label class="bulk-pack-field">
                            <span>中文說明</span>
                            <textarea id="bulkPackDescriptionZh"
                                rows="4"
                                placeholder="說明資料包內容與用途"></textarea>
                        </label>

                        <div class="bulk-pack-inline">
                            <label class="bulk-pack-field">
                                <span>圖示</span>
                                <input id="bulkPackIcon"
                                    maxlength="8"
                                    value="📦">
                            </label>

                            <label class="bulk-pack-field">
                                <span>版本</span>
                                <input id="bulkPackVersion"
                                    value="1.0.0">
                            </label>
                        </div>

                        <label class="bulk-pack-check">
                            <input id="bulkPackDefaultEnabled"
                                type="checkbox">
                            <span>預設啟用此資料包</span>
                        </label>
                    </div>

                    <div class="bulk-pack-card">
                        <h3>批次工具</h3>

                        <button id="downloadBulkTemplateButton"
                            type="button">
                            ⬇ 下載 CSV 範本
                        </button>

                        <label class="bulk-pack-import-button">
                            匯入 CSV／TSV
                            <input id="importBulkFileInput"
                                type="file"
                                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                                hidden>
                        </label>

                        <button id="parseBulkDataButton"
                            class="bulk-pack-secondary"
                            type="button">
                            🔍 解析與驗證
                        </button>

                        <button id="sendBulkToStudioButton"
                            class="bulk-pack-secondary"
                            type="button">
                            🧰 傳送到資料包工作室
                        </button>

                        <button id="exportBulkPackButton"
                            class="bulk-pack-export"
                            type="button">
                            匯出資料包 JSON
                        </button>

                        <button id="exportBulkManifestButton"
                            class="bulk-pack-secondary"
                            type="button">
                            匯出 Manifest 登記檔
                        </button>

                        <button id="clearBulkDataButton"
                            class="bulk-pack-text-button"
                            type="button">
                            清除批次內容
                        </button>
                    </div>

                    <div class="bulk-pack-card">
                        <h3>支援分類</h3>
                        <div id="bulkCategoryGuide"
                            class="bulk-category-guide">
                            載入中……
                        </div>
                    </div>
                </aside>

                <div class="bulk-pack-workspace">
                    <div class="bulk-pack-input-card">
                        <div class="bulk-pack-input-heading">
                            <div>
                                <h3>貼上 CSV 或 TSV</h3>
                                <p>
                                    建議使用下載的範本。含逗號的欄位必須用雙引號包住。
                                </p>
                            </div>

                            <div class="bulk-pack-input-actions">
                                <button id="loadBulkExampleButton"
                                    class="bulk-pack-secondary"
                                    type="button">
                                    載入範例
                                </button>

                                <button id="copyBulkHeaderButton"
                                    class="bulk-pack-secondary"
                                    type="button">
                                    複製欄位標題
                                </button>
                            </div>
                        </div>

                        <textarea id="bulkDataInput"
                            rows="16"
                            spellcheck="false"
                            placeholder="id,category,name_zh,name_en,gender,description_zh,description_en,tags,anatomy,base_prompt,negative"></textarea>
                    </div>

                    <div class="bulk-pack-stats">
                        <article>
                            <span>資料列</span>
                            <strong id="bulkRowCount">0</strong>
                        </article>

                        <article>
                            <span>有效項目</span>
                            <strong id="bulkValidCount">0</strong>
                        </article>

                        <article>
                            <span>錯誤</span>
                            <strong id="bulkErrorCount">0</strong>
                        </article>

                        <article>
                            <span>警告</span>
                            <strong id="bulkWarningCount">0</strong>
                        </article>
                    </div>

                    <div id="bulkValidationReport"
                        class="bulk-validation-report"
                        hidden></div>

                    <div class="bulk-pack-preview-card">
                        <div class="bulk-pack-preview-heading">
                            <div>
                                <h3>預覽</h3>
                                <p>最多顯示前 100 筆。</p>
                            </div>

                            <label>
                                <span>搜尋預覽</span>
                                <input id="bulkPreviewSearch"
                                    type="search"
                                    placeholder="搜尋 ID、名稱、分類">
                            </label>
                        </div>

                        <div class="bulk-table-wrap">
                            <table class="bulk-preview-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>狀態</th>
                                        <th>ID</th>
                                        <th>分類</th>
                                        <th>中文名稱</th>
                                        <th>英文名稱</th>
                                        <th>性別</th>
                                        <th>標籤</th>
                                    </tr>
                                </thead>
                                <tbody id="bulkPreviewBody">
                                    <tr>
                                        <td colspan="8">
                                            尚未解析資料。
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const studioPanel =
            document.getElementById("dataPackStudioPanel");

        if (studioPanel) {
            studioPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document.getElementById("downloadBulkTemplateButton")
            ?.addEventListener("click", downloadTemplate);

        document.getElementById("importBulkFileInput")
            ?.addEventListener("change", importFile);

        document.getElementById("parseBulkDataButton")
            ?.addEventListener("click", parseAndValidate);

        document.getElementById("loadBulkExampleButton")
            ?.addEventListener("click", loadExample);

        document.getElementById("copyBulkHeaderButton")
            ?.addEventListener("click", copyHeader);

        document.getElementById("clearBulkDataButton")
            ?.addEventListener("click", clearData);

        document.getElementById("exportBulkPackButton")
            ?.addEventListener("click", exportPack);

        document.getElementById("exportBulkManifestButton")
            ?.addEventListener("click", exportManifest);

        document.getElementById("sendBulkToStudioButton")
            ?.addEventListener("click", sendToStudio);

        document.getElementById("bulkPreviewSearch")
            ?.addEventListener("input", renderPreview);
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
                    items.map((item) => item?.id).filter(Boolean)
                );
            }
        }
    }

    function renderCategoryGuide() {
        const container =
            document.getElementById("bulkCategoryGuide");

        if (!container) return;

        container.innerHTML = state.categories.map((category) => `
            <span title="${escapeAttribute(category.name_en || "")}">
                ${escapeHtml(category.icon || "✦")}
                <code>${escapeHtml(category.id)}</code>
                ${escapeHtml(category.name_zh || "")}
            </span>
        `).join("");
    }

    function loadExample() {
        document.getElementById("bulkDataInput").value =
`id,category,name_zh,name_en,gender,description_zh,description_en,tags,anatomy,base_prompt,negative
pack_s01_outer_neon_bomber,outerwear,螢光滾邊短版飛行外套,Neon-Trim Cropped Bomber Jacket,unisex,"短版飛行外套以霧黑尼龍製作，肩線略微加寬，前襟配置雙向拉鍊，領口、袖口與下擺加入螢光紫綠滾邊，適合街頭與科技機能造型。","A cropped matte-black nylon bomber with slightly broadened shoulders, a two-way front zip, and neon purple-green ribbed trim.","尼龍|nylon|飛行外套|bomber|螢光|streetwear","silhouette: cropped bomber|material: matte black nylon|closure: two-way front zipper|trim: neon purple and green ribbing","a cropped matte-black nylon bomber jacket, broadened shoulders, two-way front zipper, neon purple and green ribbed trim","logo, text, watermark, malformed jacket, broken zipper, duplicated sleeves"
pack_s01_pants_panel_cargo,pants,拼色立體口袋工裝褲,Color-Blocked Dimensional Cargo Trousers,unisex,"高腰工裝褲使用黑色與深紫色耐磨布拼接，大腿兩側配置立體翻蓋口袋，膝部採預彎剪裁，褲腳以螢光綠抽繩收束。","High-waisted cargo trousers in black and deep-purple durable fabric, with dimensional flap pockets, articulated knees, and neon-green drawcord hems.","工裝褲|cargo|拼色|紫色|螢光綠|streetwear","silhouette: high-waisted tapered cargo trousers|material: durable black and purple fabric|pockets: dimensional thigh flap pockets|hem: neon green drawcords","high-waisted black and deep-purple cargo trousers, dimensional thigh pockets, articulated knees, neon-green drawcord hems","logo, text, watermark, malformed trousers, duplicated pockets, broken leg anatomy"`;

        setValue("bulkPackId", "streetwear-vol-01");
        setValue(
            "bulkPackNameZh",
            "街頭服飾擴充包 Vol.01"
        );
        setValue(
            "bulkPackNameEn",
            "Streetwear Expansion Vol.01"
        );
        setValue(
            "bulkPackDescriptionZh",
            "以街頭、科技機能與螢光配色為主的服裝擴充包。"
        );
        setValue("bulkPackIcon", "🧢");

        parseAndValidate();
    }

    function copyHeader() {
        copyText(
            REQUIRED_COLUMNS.join(","),
            "欄位標題已複製"
        );
    }

    function downloadTemplate() {
        const rows = [
            REQUIRED_COLUMNS,
            [
                "pack_x01_outer_example",
                "outerwear",
                "範例外套",
                "Example Coat",
                "unisex",
                "請填寫至少三十五字的中文詳細說明，包含輪廓、材質、結構、扣件與設計特色。",
                "Write a detailed English description covering silhouette, material, construction, closures, and design details.",
                "外套|coat|材質|風格",
                "silhouette: long coat|material: black wool|closure: silver clasps",
                "a long black wool coat, structured shoulders, silver clasps, detailed seams",
                "logo, text, watermark, malformed clothing, broken garment structure"
            ]
        ];

        const csv = rows
            .map((row) => row.map(csvEscape).join(","))
            .join("\r\n");

        downloadText(
            csv,
            "2Y-bulk-data-pack-template.csv",
            "text/csv;charset=utf-8"
        );
    }

    async function importFile(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        try {
            const text = await file.text();
            document.getElementById("bulkDataInput").value = text;

            if (!value("bulkPackId")) {
                const inferred = file.name
                    .replace(/\.(csv|tsv)$/i, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                setValue("bulkPackId", inferred);
            }

            parseAndValidate();
            showToast(`已匯入 ${file.name}`);
        } catch (error) {
            alert(`檔案讀取失敗：${error.message}`);
        }
    }

    function parseAndValidate() {
        const text = value("bulkDataInput");

        state.rows = [];
        state.parsedItems = [];
        state.errors = [];
        state.warnings = [];

        if (!text) {
            updateStats();
            renderReport();
            renderPreview();
            showToast("請先貼上或匯入 CSV／TSV");
            return;
        }

        const delimiter = detectDelimiter(text);
        const matrix = parseDelimited(text, delimiter);

        if (matrix.length < 2) {
            state.errors.push("沒有可解析的資料列。");
            updateStats();
            renderReport();
            renderPreview();
            return;
        }

        const headers = matrix[0].map((header) =>
            String(header).trim()
        );

        const missingHeaders = REQUIRED_COLUMNS.filter(
            (column) => !headers.includes(column)
        );

        if (missingHeaders.length) {
            state.errors.push(
                `缺少欄位：${missingHeaders.join("、")}`
            );
        }

        const seenIds = new Map();

        state.rows = matrix.slice(1)
            .filter((row) =>
                row.some((cell) => String(cell).trim())
            )
            .map((row, rowIndex) => {
                const raw = {};

                headers.forEach((header, columnIndex) => {
                    raw[header] =
                        String(row[columnIndex] ?? "").trim();
                });

                const item = convertRowToItem(raw);
                const rowErrors = validateItem(item);
                const rowWarnings = [];

                if (item.id) {
                    if (seenIds.has(item.id)) {
                        rowErrors.push(
                            `ID 與第 ${seenIds.get(item.id)} 列重複`
                        );
                    } else {
                        seenIds.set(item.id, rowIndex + 2);
                    }

                    if (state.catalogIds.has(item.id)) {
                        rowWarnings.push(
                            "ID 已存在於目前百科，啟用後會覆蓋原項目"
                        );
                    }
                }

                if (
                    item.description_zh &&
                    item.description_zh.length < 35
                ) {
                    rowWarnings.push(
                        "中文說明少於 35 個字"
                    );
                }

                if (
                    Array.isArray(item.tags) &&
                    !item.tags.some((tag) =>
                        /[\u4e00-\u9fff]/.test(tag)
                    )
                ) {
                    rowWarnings.push(
                        "缺少中文標籤，中文搜尋可能較弱"
                    );
                }

                if (rowErrors.length) {
                    state.errors.push(
                        `第 ${rowIndex + 2} 列：${rowErrors.join("；")}`
                    );
                }

                if (rowWarnings.length) {
                    state.warnings.push(
                        `第 ${rowIndex + 2} 列：${rowWarnings.join("；")}`
                    );
                }

                return {
                    rowNumber: rowIndex + 2,
                    raw,
                    item,
                    errors: rowErrors,
                    warnings: rowWarnings
                };
            });

        state.parsedItems = state.rows
            .filter((entry) => !entry.errors.length)
            .map((entry) => entry.item);

        updateStats();
        renderReport();
        renderPreview();

        showToast(
            state.errors.length
                ? "解析完成，但仍有錯誤"
                : "解析與驗證完成"
        );
    }

    function convertRowToItem(raw) {
        const basePrompt = raw.base_prompt || "";

        return {
            id: normalizeItemId(raw.id || ""),
            category: raw.category || "",
            name_zh: raw.name_zh || "",
            name_en: raw.name_en || "",
            description_zh: raw.description_zh || "",
            description_en: raw.description_en || "",
            gender: (raw.gender || "unisex").toLowerCase(),
            anatomy: parseAnatomy(raw.anatomy || ""),
            tags: parsePipeList(raw.tags || ""),
            prompts: generatePrompts(basePrompt),
            negative: raw.negative ||
                "logo, text, watermark, malformed clothing, broken garment structure, inconsistent seams, duplicated garments, duplicated accessories"
        };
    }

    function generatePrompts(base) {
        if (!base) {
            return {
                pixai: "",
                niji: "",
                tensorart: "",
                gpt: ""
            };
        }

        return {
            pixai: joinComma([
                "masterpiece",
                "best quality",
                "highly detailed",
                base,
                "clear garment construction",
                "precise fabric texture"
            ]),
            niji: `${joinComma([
                base,
                "polished fashion illustration",
                "refined folds",
                "readable garment construction",
                "elegant material rendering"
            ])} --niji 6`,
            tensorart: joinComma([
                "high quality",
                "high detail",
                base,
                "realistic textile response",
                "precise seams and hardware"
            ]),
            gpt: [
                "Create a polished fashion image featuring",
                `${base}.`,
                "Preserve the exact silhouette, materials, closures, seams, and accessories."
            ].join(" ")
        };
    }

    function validateItem(item) {
        const errors = [];

        if (!item.id) {
            errors.push("缺少 id");
        } else if (
            !/^[a-z0-9_][a-z0-9_-]*$/.test(item.id)
        ) {
            errors.push("id 格式不正確");
        }

        if (!item.category) {
            errors.push("缺少 category");
        } else if (
            !state.categories.some(
                (category) => category.id === item.category
            )
        ) {
            errors.push(`未知分類 ${item.category}`);
        }

        if (!item.name_zh) errors.push("缺少 name_zh");
        if (!item.name_en) errors.push("缺少 name_en");
        if (!item.description_zh) {
            errors.push("缺少 description_zh");
        }
        if (!item.description_en) {
            errors.push("缺少 description_en");
        }

        if (!VALID_GENDERS.has(item.gender)) {
            errors.push(`gender 不正確：${item.gender}`);
        }

        if (!Array.isArray(item.tags)) {
            errors.push("tags 格式不正確");
        }

        if (!item.anatomy ||
            typeof item.anatomy !== "object" ||
            Array.isArray(item.anatomy)) {
            errors.push("anatomy 格式不正確");
        }

        Object.entries(item.prompts || {}).forEach(
            ([platform, prompt]) => {
                if (!prompt) {
                    errors.push(`缺少 ${platform} Prompt`);
                }
            }
        );

        if (!item.negative) {
            errors.push("缺少 negative");
        }

        return errors;
    }

    function renderReport() {
        const report =
            document.getElementById("bulkValidationReport");

        if (!report) return;

        if (!state.errors.length && !state.warnings.length) {
            report.hidden = state.rows.length === 0;

            if (!report.hidden) {
                report.className =
                    "bulk-validation-report success";
                report.innerHTML = `
                    <h4>✅ 驗證通過</h4>
                    <p>
                        共 ${state.parsedItems.length} 筆有效項目，
                        可以匯出或傳送到資料包工作室。
                    </p>
                `;
            }

            return;
        }

        report.hidden = false;
        report.className =
            `bulk-validation-report ${
                state.errors.length ? "error" : "warning"
            }`;

        report.innerHTML = `
            <h4>
                ${state.errors.length
                    ? "❌ 驗證失敗"
                    : "⚠ 驗證完成，但有警告"}
            </h4>

            ${state.errors.length ? `
                <details open>
                    <summary>錯誤（${state.errors.length}）</summary>
                    <ul>
                        ${state.errors.slice(0, 80).map((error) =>
                            `<li>${escapeHtml(error)}</li>`
                        ).join("")}
                    </ul>
                </details>
            ` : ""}

            ${state.warnings.length ? `
                <details>
                    <summary>警告（${state.warnings.length}）</summary>
                    <ul>
                        ${state.warnings.slice(0, 80).map((warning) =>
                            `<li>${escapeHtml(warning)}</li>`
                        ).join("")}
                    </ul>
                </details>
            ` : ""}
        `;
    }

    function renderPreview() {
        const body =
            document.getElementById("bulkPreviewBody");

        if (!body) return;

        const query =
            value("bulkPreviewSearch").toLowerCase();

        const rows = state.rows
            .filter((entry) => {
                if (!query) return true;

                return [
                    entry.item.id,
                    entry.item.category,
                    entry.item.name_zh,
                    entry.item.name_en,
                    ...(entry.item.tags || [])
                ].join(" ").toLowerCase().includes(query);
            })
            .slice(0, 100);

        if (!rows.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="8">
                        ${state.rows.length
                            ? "找不到符合條件的預覽。"
                            : "尚未解析資料。"}
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = rows.map((entry) => {
            const status =
                entry.errors.length
                    ? "error"
                    : entry.warnings.length
                        ? "warning"
                        : "valid";

            const label =
                status === "error"
                    ? "錯誤"
                    : status === "warning"
                        ? "警告"
                        : "有效";

            return `
                <tr class="${status}">
                    <td>${entry.rowNumber}</td>
                    <td>
                        <span class="bulk-status ${status}">
                            ${label}
                        </span>
                    </td>
                    <td><code>${escapeHtml(entry.item.id)}</code></td>
                    <td>${escapeHtml(entry.item.category)}</td>
                    <td>${escapeHtml(entry.item.name_zh)}</td>
                    <td>${escapeHtml(entry.item.name_en)}</td>
                    <td>${escapeHtml(entry.item.gender)}</td>
                    <td>${escapeHtml(
                        (entry.item.tags || []).join("、")
                    )}</td>
                </tr>
            `;
        }).join("");
    }

    function updateStats() {
        setText("bulkRowCount", String(state.rows.length));
        setText(
            "bulkValidCount",
            String(state.parsedItems.length)
        );
        setText(
            "bulkErrorCount",
            String(state.errors.length)
        );
        setText(
            "bulkWarningCount",
            String(state.warnings.length)
        );
    }

    function exportPack() {
        parseAndValidate();

        if (state.errors.length || !state.parsedItems.length) {
            alert(
                "資料仍有錯誤或沒有有效項目，請先修正。"
            );
            return;
        }

        const metadata = readMetadata();

        if (!validateMetadata(metadata)) {
            return;
        }

        downloadJson(
            state.parsedItems,
            `${metadata.id}.json`
        );

        showToast("資料包 JSON 已匯出");
    }

    function exportManifest() {
        parseAndValidate();

        if (state.errors.length || !state.parsedItems.length) {
            alert(
                "資料仍有錯誤或沒有有效項目，請先修正。"
            );
            return;
        }

        const metadata = readMetadata();

        if (!validateMetadata(metadata)) {
            return;
        }

        const categoryNames = [
            ...new Set(
                state.parsedItems.map((item) => {
                    const category =
                        state.categories.find(
                            (entry) =>
                                entry.id === item.category
                        );

                    return category?.name_zh || item.category;
                })
            )
        ];

        const entry = {
            id: metadata.id,
            name_zh: metadata.name_zh,
            name_en: metadata.name_en,
            description_zh: metadata.description_zh,
            icon: metadata.icon,
            version: metadata.version,
            file: `./data/packs/${metadata.id}.json`,
            item_count: state.parsedItems.length,
            categories: categoryNames,
            default_enabled: metadata.default_enabled
        };

        downloadJson(
            entry,
            `${metadata.id}-manifest-entry.json`
        );

        showToast("Manifest 登記檔已匯出");
    }

    async function sendToStudio() {
        parseAndValidate();

        if (state.errors.length || !state.parsedItems.length) {
            alert(
                "資料仍有錯誤或沒有有效項目，請先修正。"
            );
            return;
        }

        const metadata = readMetadata();

        if (!validateMetadata(metadata)) {
            return;
        }

        try {
            const db = await openDatabase();

            await new Promise((resolve, reject) => {
                const transaction =
                    db.transaction(STORE_NAME, "readwrite");

                transaction.objectStore(STORE_NAME).put({
                    id: DRAFT_ID,
                    metadata,
                    items: state.parsedItems,
                    savedAt: new Date().toISOString()
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () =>
                    reject(transaction.error);
            });

            db.close();

            showToast(
                "已傳送到資料包工作室，請前往工作室檢查"
            );

            window.setTimeout(() => {
                document.getElementById("dataPackStudioPanel")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            }, 450);
        } catch (error) {
            alert(
                `傳送到資料包工作室失敗：${error.message}`
            );
        }
    }

    function validateMetadata(metadata) {
        if (!metadata.id) {
            alert("請填寫資料包 ID。");
            return false;
        }

        if (!/^[a-z0-9][a-z0-9-]*$/.test(metadata.id)) {
            alert(
                "資料包 ID 只能使用小寫英文字母、數字與連字號。"
            );
            return false;
        }

        if (!metadata.name_zh) {
            alert("請填寫資料包中文名稱。");
            return false;
        }

        return true;
    }

    function readMetadata() {
        return {
            id: normalizePackId(value("bulkPackId")),
            name_zh: value("bulkPackNameZh"),
            name_en: value("bulkPackNameEn"),
            description_zh:
                value("bulkPackDescriptionZh"),
            icon: value("bulkPackIcon") || "📦",
            version:
                value("bulkPackVersion") || "1.0.0",
            default_enabled:
                document.getElementById(
                    "bulkPackDefaultEnabled"
                )?.checked === true
        };
    }

    function clearData() {
        if (
            value("bulkDataInput") &&
            !window.confirm("確定清除批次內容？")
        ) {
            return;
        }

        document.getElementById("bulkDataInput").value = "";
        state.rows = [];
        state.parsedItems = [];
        state.errors = [];
        state.warnings = [];

        updateStats();
        renderReport();
        renderPreview();
        showToast("批次內容已清除");
    }

    function detectDelimiter(text) {
        const firstLine = text
            .split(/\r?\n/, 1)[0] || "";

        const tabCount =
            (firstLine.match(/\t/g) || []).length;
        const commaCount =
            (firstLine.match(/,/g) || []).length;

        return tabCount > commaCount ? "\t" : ",";
    }

    function parseDelimited(text, delimiter) {
        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            const next = text[index + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }

                continue;
            }

            if (char === delimiter && !inQuotes) {
                row.push(field);
                field = "";
                continue;
            }

            if (
                (char === "\n" || char === "\r") &&
                !inQuotes
            ) {
                if (char === "\r" && next === "\n") {
                    index += 1;
                }

                row.push(field);
                rows.push(row);
                row = [];
                field = "";
                continue;
            }

            field += char;
        }

        row.push(field);

        if (
            row.length > 1 ||
            row.some((cell) => String(cell).trim())
        ) {
            rows.push(row);
        }

        return rows;
    }

    function parsePipeList(text) {
        return [
            ...new Set(
                String(text)
                    .split(/[|｜]/)
                    .map((item) => item.trim())
                    .filter(Boolean)
            )
        ];
    }

    function parseAnatomy(text) {
        const result = {};

        parsePipeList(text).forEach((part, index) => {
            const separator = part.indexOf(":");

            if (separator < 0) {
                result[`detail_${index + 1}`] = part;
                return;
            }

            const key = part.slice(0, separator).trim();
            const val = part.slice(separator + 1).trim();

            if (key && val) {
                result[key] = val;
            }
        });

        return result;
    }

    function normalizeItemId(text) {
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
            .map((part) => String(part || "").trim())
            .filter(Boolean)
            .filter((part) => {
                const key = part.toLowerCase();

                if (seen.has(key)) return false;

                seen.add(key);
                return true;
            })
            .join(", ");
    }

    function csvEscape(value) {
        const text = String(value ?? "");

        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n")
        ) {
            return `"${text.replaceAll('"', '""')}"`;
        }

        return text;
    }

    function downloadJson(data, filename) {
        downloadText(
            JSON.stringify(data, null, 2),
            filename,
            "application/json;charset=utf-8"
        );
    }

    function downloadText(text, filename, mimeType) {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.click();

        URL.revokeObjectURL(url);
    }

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request =
                indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(
                        STORE_NAME,
                        { keyPath: "id" }
                    );
                }
            };

            request.onsuccess = () =>
                resolve(request.result);

            request.onerror = () =>
                reject(
                    request.error ||
                    new Error("IndexedDB 開啟失敗")
                );
        });
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container =
                document.getElementById("sectionNavLinks");

            if (
                !container ||
                container.querySelector("[data-bulk-pack-nav]")
            ) {
                return;
            }

            const button = document.createElement("button");

            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.bulkPackNav = "true";
            button.innerHTML =
                "<span>📊</span><span>批次製作</span>";

            button.addEventListener("click", () => {
                document.getElementById("bulkPackPanel")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1550);
    }

    async function copyText(text, message) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
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
        const body =
            document.getElementById("bulkPreviewBody");

        if (!body) return;

        body.innerHTML = `
            <tr>
                <td colspan="8"
                    class="${isError ? "bulk-error-cell" : ""}">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }

    function showToast(message) {
        let toast =
            document.getElementById("bulkPackToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "bulkPackToast";
            toast.className = "bulk-pack-toast";
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

    function setValue(id, next) {
        const element = document.getElementById(id);

        if (element) {
            element.value = next;
        }
    }

    function setText(id, next) {
        const element = document.getElementById(id);

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
