// ======================================
// 2Y Prompt Auditor & Cleaner
// Version: v1.7.0
// ======================================

(() => {
    const SETTINGS_KEY = "2y-prompt-auditor-v1";
    const HISTORY_KEY = "2y-prompt-history-v1";
    const MAX_HISTORY = 100;

    const PLATFORM_LABELS = {
        generic: "通用",
        pixai: "PixAI",
        niji: "Niji Journey",
        tensorart: "TensorArt",
        gpt: "GPT Image"
    };

    const COVERAGE_RULES = [
        {
            key: "subject",
            label: "主體",
            terms: [
                "character", "person", "woman", "man", "girl", "boy",
                "人物", "角色", "女性", "男性", "模特"
            ]
        },
        {
            key: "outfit",
            label: "服裝",
            terms: [
                "dress", "shirt", "blouse", "hoodie", "jacket", "coat",
                "pants", "trousers", "skirt", "boots", "shoes", "outfit",
                "洋裝", "連身裙", "上衣", "襯衫", "外套", "褲", "裙",
                "靴", "鞋", "穿搭", "服裝"
            ]
        },
        {
            key: "material",
            label: "材質",
            terms: [
                "cotton", "leather", "silk", "satin", "velvet", "lace",
                "denim", "wool", "nylon", "mesh", "fabric", "material",
                "棉", "皮革", "絲綢", "緞面", "天鵝絨", "蕾絲",
                "牛仔", "羊毛", "尼龍", "網紗", "材質"
            ]
        },
        {
            key: "color",
            label: "配色",
            terms: [
                "black", "white", "red", "blue", "green", "purple",
                "pink", "gold", "silver", "neon", "pastel", "color",
                "黑", "白", "紅", "藍", "綠", "紫", "粉", "金", "銀",
                "螢光", "粉彩", "配色", "顏色"
            ]
        },
        {
            key: "pose",
            label: "姿勢",
            terms: [
                "pose", "standing", "sitting", "walking", "kneeling",
                "looking back", "arms crossed", "姿勢", "站姿", "坐姿",
                "行走", "跪姿", "回眸", "抱胸"
            ]
        },
        {
            key: "background",
            label: "背景",
            terms: [
                "background", "street", "library", "garden", "studio",
                "runway", "room", "alley", "temple", "背景", "街道",
                "圖書館", "花園", "攝影棚", "伸展台", "房間", "巷道", "神殿"
            ]
        },
        {
            key: "camera",
            label: "鏡頭",
            terms: [
                "camera", "full-body", "full body", "close-up", "portrait",
                "low angle", "top-down", "profile", "composition",
                "鏡頭", "全身", "近攝", "肖像", "低角度", "俯視",
                "側面", "構圖"
            ]
        },
        {
            key: "lighting",
            label: "光線",
            terms: [
                "lighting", "light", "rim light", "backlight", "softbox",
                "moonlight", "golden hour", "volumetric", "光線", "燈光",
                "輪廓光", "逆光", "柔光箱", "月光", "黃金時刻", "體積光"
            ]
        },
        {
            key: "mood",
            label: "氛圍",
            terms: [
                "mood", "atmosphere", "cinematic", "dreamy", "cozy",
                "dramatic", "mysterious", "氛圍", "情緒", "電影感",
                "夢幻", "溫暖", "戲劇性", "神秘"
            ]
        },
        {
            key: "quality",
            label: "品質",
            terms: [
                "masterpiece", "best quality", "highly detailed",
                "high detail", "high resolution", "photorealistic",
                "精緻", "高品質", "高細節", "高解析"
            ]
        }
    ];

    const CONFLICT_GROUPS = [
        {
            label: "畫面比例",
            patterns: [
                /--ar\s+([0-9]+:[0-9]+)/gi,
                /aspect ratio\s+([0-9]+:[0-9]+)/gi,
                /畫面比例\s*[:：]?\s*([0-9]+:[0-9]+)/gi
            ]
        },
        {
            label: "人物數量",
            literalGroups: [
                ["solo", "two people", "group"],
                ["單人", "雙人", "多人"]
            ]
        },
        {
            label: "鏡頭景別",
            literalGroups: [
                ["full body", "close-up", "headshot"],
                ["全身", "近攝", "大頭照"]
            ]
        },
        {
            label: "視角",
            literalGroups: [
                ["low angle", "top-down", "eye level"],
                ["低角度", "俯視", "平視"]
            ]
        }
    ];

    const NIJI_PARAMS = [
        "--ar", "--stylize", "--s", "--chaos", "--c", "--niji",
        "--no", "--seed", "--weird", "--w"
    ];

    const QUALITY_TERMS = [
        "masterpiece",
        "best quality",
        "high quality",
        "highly detailed",
        "high detail",
        "ultra detailed",
        "8k",
        "4k",
        "high resolution"
    ];

    const state = {
        platform: "generic",
        autoAnalyze: true
    };

    document.addEventListener("DOMContentLoaded", () => {
        createPanel();
        bindControls();
        restoreSettings();
        renderSettings();
        analyzePrompt();
        addNavigationButton();
    });

    function createPanel() {
        if (document.getElementById("promptAuditorPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "promptAuditorPanel";
        panel.className = "prompt-auditor-panel app-section-target";
        panel.innerHTML = `
            <div class="auditor-heading">
                <div>
                    <p class="auditor-eyebrow">PROMPT QUALITY CONTROL</p>
                    <h2>提示詞品質檢查器</h2>
                    <p>
                        檢查重複詞、平台參數、內容覆蓋度與可能衝突，
                        並產生較乾淨、容易維護的 Prompt。
                    </p>
                </div>
                <span class="auditor-version">v1.7.0</span>
            </div>

            <div class="auditor-source-actions">
                <button type="button" data-import-auditor="builder">
                    匯入 Prompt Builder
                </button>
                <button type="button" data-import-auditor="random">
                    匯入隨機穿搭
                </button>
                <button type="button" data-import-auditor="parameter">
                    匯入參數實驗室
                </button>
                <button type="button" data-import-auditor="platform">
                    匯入轉換器
                </button>
            </div>

            <div class="auditor-layout">
                <div class="auditor-input-panel">
                    <label class="auditor-field">
                        <span>目標平台</span>
                        <select id="auditorPlatform">
                            <option value="generic">通用</option>
                            <option value="pixai">PixAI</option>
                            <option value="niji">Niji Journey</option>
                            <option value="tensorart">TensorArt</option>
                            <option value="gpt">GPT Image</option>
                        </select>
                    </label>

                    <label class="auditor-check">
                        <input id="auditorAutoAnalyze" type="checkbox" checked>
                        <span>輸入時自動檢查</span>
                    </label>

                    <label class="auditor-wide-field">
                        <span>原始 Prompt *</span>
                        <textarea id="auditorPromptInput" rows="12"
                            placeholder="貼上或匯入要檢查的 Prompt"></textarea>
                    </label>

                    <label class="auditor-wide-field">
                        <span>Negative Prompt</span>
                        <textarea id="auditorNegativeInput" rows="5"
                            placeholder="可選：貼上 Negative Prompt"></textarea>
                    </label>

                    <div class="auditor-main-actions">
                        <button id="analyzePromptButton" type="button">
                            🔍 開始檢查
                        </button>
                        <button id="cleanPromptButton"
                            class="auditor-secondary" type="button">
                            ✨ 自動清理
                        </button>
                        <button id="clearAuditorButton"
                            class="auditor-text-button" type="button">
                            清除
                        </button>
                    </div>
                </div>

                <div class="auditor-report-panel">
                    <div class="auditor-score-card">
                        <div>
                            <span>Prompt 分數</span>
                            <strong id="auditorScore">0</strong>
                        </div>
                        <div class="auditor-score-track">
                            <span id="auditorScoreBar"></span>
                        </div>
                        <p id="auditorScoreLabel">尚未輸入 Prompt</p>
                    </div>

                    <div id="auditorCoverage" class="auditor-coverage"></div>

                    <div class="auditor-report-block">
                        <h3>檢查結果</h3>
                        <div id="auditorIssues" class="auditor-issues">
                            <p class="auditor-empty">尚未輸入 Prompt。</p>
                        </div>
                    </div>

                    <div class="auditor-report-block">
                        <div class="auditor-block-heading">
                            <h3>清理後 Prompt</h3>
                            <button id="copyCleanPromptButton"
                                type="button">
                                📋 複製
                            </button>
                        </div>
                        <textarea id="auditorCleanOutput" rows="10"
                            readonly></textarea>
                    </div>

                    <div class="auditor-report-block">
                        <div class="auditor-block-heading">
                            <h3>清理後 Negative</h3>
                            <button id="copyCleanNegativeButton"
                                type="button">
                                📋 複製
                            </button>
                        </div>
                        <textarea id="auditorCleanNegativeOutput" rows="5"
                            readonly></textarea>
                    </div>

                    <button id="saveAuditToHistoryButton"
                        class="auditor-history-button" type="button">
                        🕘 儲存清理結果到歷史
                    </button>
                </div>
            </div>
        `;

        const platformPanel =
            document.getElementById("platformConverterPanel");

        const historyPanel =
            document.getElementById("promptHistoryPanel");

        if (historyPanel) {
            historyPanel.insertAdjacentElement("beforebegin", panel);
        } else if (platformPanel) {
            platformPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document.getElementById("analyzePromptButton")
            ?.addEventListener("click", analyzePrompt);

        document.getElementById("cleanPromptButton")
            ?.addEventListener("click", () => {
                analyzePrompt();
                showToast("Prompt 已清理");
            });

        document.getElementById("clearAuditorButton")
            ?.addEventListener("click", clearAuditor);

        document.getElementById("copyCleanPromptButton")
            ?.addEventListener("click", () => {
                copyOutput("auditorCleanOutput", "清理後 Prompt 已複製");
            });

        document.getElementById("copyCleanNegativeButton")
            ?.addEventListener("click", () => {
                copyOutput(
                    "auditorCleanNegativeOutput",
                    "清理後 Negative 已複製"
                );
            });

        document.getElementById("saveAuditToHistoryButton")
            ?.addEventListener("click", saveToHistory);

        document.getElementById("auditorPlatform")
            ?.addEventListener("change", () => {
                state.platform = value("auditorPlatform") || "generic";
                persistSettings();
                analyzePrompt();
            });

        document.getElementById("auditorAutoAnalyze")
            ?.addEventListener("change", (event) => {
                state.autoAnalyze = event.target.checked;
                persistSettings();
            });

        let debounceTimer;

        ["auditorPromptInput", "auditorNegativeInput"].forEach((id) => {
            document.getElementById(id)?.addEventListener("input", () => {
                persistSettings();

                if (!state.autoAnalyze) return;

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(analyzePrompt, 260);
            });
        });

        document.querySelectorAll("[data-import-auditor]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    importFromSource(button.dataset.importAuditor);
                });
            });
    }

    function importFromSource(source) {
        const sourceMap = {
            builder: {
                prompt: "builderPromptOutput",
                negative: "builderNegativeOutput",
                platform: "builderPlatform",
                label: "Prompt Builder"
            },
            random: {
                prompt: "randomPromptOutput",
                negative: "randomNegativeOutput",
                platform: "randomPlatform",
                label: "隨機穿搭"
            },
            parameter: {
                prompt: "parameterPrompt",
                negative: "parameterNegative",
                platform: "parameterPlatform",
                label: "參數實驗室"
            }
        };

        if (source === "platform") {
            importFromPlatformConverter();
            return;
        }

        const config = sourceMap[source];
        if (!config) return;

        const prompt = document.getElementById(config.prompt)
            ?.value.trim() || "";

        if (!prompt) {
            showToast(`${config.label} 目前沒有 Prompt`);
            return;
        }

        setValue("auditorPromptInput", prompt);
        setValue(
            "auditorNegativeInput",
            document.getElementById(config.negative)?.value.trim() || ""
        );

        const platform = document.getElementById(config.platform)?.value;

        if (["pixai", "niji", "tensorart", "gpt"].includes(platform)) {
            state.platform = platform;
            setValue("auditorPlatform", platform);
        }

        persistSettings();
        analyzePrompt();
        scrollToPanel();
        showToast(`已匯入 ${config.label}`);
    }

    function importFromPlatformConverter() {
        const keys = ["pixai", "niji", "tensorart", "gpt"];

        const first = keys.find((key) =>
            document.getElementById(`platformOutput_${key}`)
                ?.value.trim()
        );

        if (!first) {
            showToast("多平台轉換器目前沒有 Prompt");
            return;
        }

        const prompt = document.getElementById(
            `platformOutput_${first}`
        ).value.trim();

        setValue("auditorPromptInput", prompt);
        setValue(
            "auditorNegativeInput",
            document.getElementById("platformNegativePrompt")
                ?.value.trim() || ""
        );

        state.platform = first;
        setValue("auditorPlatform", first);

        persistSettings();
        analyzePrompt();
        scrollToPanel();
        showToast(`已匯入 ${PLATFORM_LABELS[first]}`);
    }

    function analyzePrompt() {
        const prompt = value("auditorPromptInput");
        const negative = value("auditorNegativeInput");

        if (!prompt) {
            renderEmpty();
            return;
        }

        state.platform = value("auditorPlatform") || "generic";

        const normalizedPrompt = normalizeWhitespace(prompt);
        const promptSegments = splitSegments(normalizedPrompt);
        const duplicateResult = findDuplicates(promptSegments);
        const conflicts = findConflicts(normalizedPrompt);
        const platformIssues = findPlatformIssues(normalizedPrompt);
        const coverage = calculateCoverage(normalizedPrompt);
        const lengthIssues = findLengthIssues(promptSegments, normalizedPrompt);
        const cleanedPrompt = cleanPrompt(promptSegments, state.platform);
        const cleanedNegative = cleanNegative(negative);
        const issues = [
            ...duplicateResult.issues,
            ...conflicts,
            ...platformIssues,
            ...lengthIssues
        ];

        const score = calculateScore({
            coverage,
            duplicateCount: duplicateResult.duplicateCount,
            issueCount: issues.length,
            segmentCount: promptSegments.length
        });

        renderScore(score);
        renderCoverage(coverage);
        renderIssues(issues, coverage);
        setValue("auditorCleanOutput", cleanedPrompt);
        setValue("auditorCleanNegativeOutput", cleanedNegative);
        persistSettings();
    }

    function calculateCoverage(prompt) {
        const text = prompt.toLowerCase();

        return COVERAGE_RULES.map((rule) => ({
            ...rule,
            found: rule.terms.some((term) =>
                text.includes(term.toLowerCase())
            )
        }));
    }

    function findDuplicates(segments) {
        const seen = new Map();
        const duplicates = [];

        segments.forEach((segment) => {
            const key = normalizeKey(segment);

            if (!key) return;

            if (seen.has(key)) {
                duplicates.push(segment);
            } else {
                seen.set(key, segment);
            }
        });

        return {
            duplicateCount: duplicates.length,
            issues: duplicates.length
                ? [{
                    level: "warning",
                    title: `找到 ${duplicates.length} 個重複片段`,
                    detail: duplicates.slice(0, 6).join("、")
                }]
                : []
        };
    }

    function findConflicts(prompt) {
        const text = prompt.toLowerCase();
        const issues = [];

        CONFLICT_GROUPS.forEach((group) => {
            const values = new Set();

            (group.patterns || []).forEach((pattern) => {
                for (const match of prompt.matchAll(pattern)) {
                    values.add(match[1]);
                }
            });

            (group.literalGroups || []).forEach((terms) => {
                terms.forEach((term) => {
                    if (text.includes(term.toLowerCase())) {
                        values.add(term);
                    }
                });
            });

            if (values.size > 1) {
                issues.push({
                    level: "warning",
                    title: `${group.label}可能互相衝突`,
                    detail: [...values].join("、")
                });
            }
        });

        return issues;
    }

    function findPlatformIssues(prompt) {
        const text = prompt.toLowerCase();
        const foundParams = NIJI_PARAMS.filter((param) =>
            text.includes(param)
        );

        const issues = [];

        if (state.platform !== "niji" && foundParams.length) {
            issues.push({
                level: "warning",
                title: "包含 Niji／Midjourney 參數",
                detail: `${PLATFORM_LABELS[state.platform]} 通常不需要：${foundParams.join("、")}`
            });
        }

        if (state.platform === "niji") {
            if (!text.includes("--ar")) {
                issues.push({
                    level: "info",
                    title: "尚未設定 Niji 畫面比例",
                    detail: "可加入例如 --ar 2:3"
                });
            }

            if (
                !text.includes("--niji") &&
                !text.includes("--v ")
            ) {
                issues.push({
                    level: "info",
                    title: "尚未設定 Niji 模型參數",
                    detail: "可加入 --niji 6"
                });
            }
        }

        if (state.platform === "gpt" && prompt.includes(",")) {
            const commaCount = (prompt.match(/,/g) || []).length;

            if (commaCount >= 18) {
                issues.push({
                    level: "info",
                    title: "GPT Image Prompt 偏向標籤堆疊",
                    detail: "GPT Image 通常更適合完整句子與明確指示。"
                });
            }
        }

        return issues;
    }

    function findLengthIssues(segments, prompt) {
        const issues = [];

        if (segments.length > 70) {
            issues.push({
                level: "warning",
                title: "Prompt 片段過多",
                detail: `目前約 ${segments.length} 個片段，建議刪除低優先級詞彙。`
            });
        } else if (segments.length > 45) {
            issues.push({
                level: "info",
                title: "Prompt 較長",
                detail: `目前約 ${segments.length} 個片段，可考慮簡化。`
            });
        }

        if (prompt.length > 3000) {
            issues.push({
                level: "warning",
                title: "Prompt 字元數很高",
                detail: `目前約 ${prompt.length} 字元。`
            });
        }

        const qualityHits = QUALITY_TERMS.filter((term) =>
            prompt.toLowerCase().includes(term)
        );

        if (qualityHits.length >= 5) {
            issues.push({
                level: "info",
                title: "品質詞過度堆疊",
                detail: qualityHits.join("、")
            });
        }

        return issues;
    }

    function cleanPrompt(segments, platform) {
        let cleaned = deduplicateSegments(segments);

        if (platform !== "niji") {
            cleaned = cleaned.filter((segment) =>
                !NIJI_PARAMS.some((param) =>
                    segment.toLowerCase().startsWith(param)
                )
            );
        }

        if (platform === "gpt") {
            return convertToGptInstruction(cleaned);
        }

        return cleaned.join(", ");
    }

    function convertToGptInstruction(segments) {
        if (!segments.length) return "";

        const nijiParams = NIJI_PARAMS;
        const content = segments.filter((segment) =>
            !nijiParams.some((param) =>
                segment.toLowerCase().startsWith(param)
            )
        );

        return [
            "Create an image with the following design and visual requirements:",
            `${content.join(", ")}.`,
            "Keep the garment construction, materials, accessories, pose, background, lighting, and camera direction internally consistent.",
            "Do not add logos, text, watermarks, duplicated garments, or conflicting layers."
        ].join(" ");
    }

    function cleanNegative(negative) {
        if (!negative) {
            return [
                "logo",
                "text",
                "watermark",
                "malformed clothing",
                "broken garment structure",
                "inconsistent layers",
                "duplicate garments",
                "duplicate accessories"
            ].join(", ");
        }

        return deduplicateSegments(splitSegments(negative)).join(", ");
    }

    function splitSegments(text) {
        return text
            .replace(/\r/g, "\n")
            .split(/[,;\n]+/)
            .map((segment) => segment.trim())
            .filter(Boolean);
    }

    function deduplicateSegments(segments) {
        const seen = new Set();

        return segments.filter((segment) => {
            const key = normalizeKey(segment);

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        });
    }

    function normalizeKey(value) {
        return String(value)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[.!?。！？]+$/g, "")
            .trim();
    }

    function normalizeWhitespace(value) {
        return String(value)
            .replace(/\s+/g, " ")
            .replace(/\s*,\s*/g, ", ")
            .trim();
    }

    function calculateScore({
        coverage,
        duplicateCount,
        issueCount,
        segmentCount
    }) {
        const coverageScore =
            coverage.filter((item) => item.found).length /
            coverage.length * 70;

        const structureBonus =
            segmentCount >= 5 && segmentCount <= 50 ? 20 :
            segmentCount > 0 ? 10 : 0;

        const penalty =
            duplicateCount * 4 +
            issueCount * 3;

        return Math.round(
            Math.max(0, Math.min(100, coverageScore + structureBonus + 10 - penalty))
        );
    }

    function renderScore(score) {
        setText("auditorScore", String(score));

        const bar = document.getElementById("auditorScoreBar");
        if (bar) bar.style.width = `${score}%`;

        let label = "需要補充";

        if (score >= 85) label = "結構完整";
        else if (score >= 70) label = "整體良好";
        else if (score >= 50) label = "可再優化";

        setText("auditorScoreLabel", label);
    }

    function renderCoverage(coverage) {
        const container = document.getElementById("auditorCoverage");
        if (!container) return;

        container.innerHTML = coverage.map((item) => `
            <span class="auditor-coverage-chip ${item.found ? "found" : "missing"}">
                ${item.found ? "✓" : "○"} ${escapeHtml(item.label)}
            </span>
        `).join("");
    }

    function renderIssues(issues, coverage) {
        const container = document.getElementById("auditorIssues");
        if (!container) return;

        const missing = coverage.filter((item) => !item.found);

        const allIssues = [...issues];

        if (missing.length) {
            allIssues.push({
                level: "info",
                title: "可補充的內容",
                detail: missing.map((item) => item.label).join("、")
            });
        }

        if (!allIssues.length) {
            container.innerHTML = `
                <article class="auditor-issue success">
                    <strong>✓ 未發現明顯問題</strong>
                    <p>Prompt 結構與平台設定看起來合理。</p>
                </article>
            `;
            return;
        }

        container.innerHTML = allIssues.map((issue) => `
            <article class="auditor-issue ${escapeAttribute(issue.level)}">
                <strong>${issueIcon(issue.level)} ${escapeHtml(issue.title)}</strong>
                <p>${escapeHtml(issue.detail)}</p>
            </article>
        `).join("");
    }

    function issueIcon(level) {
        return {
            warning: "⚠",
            info: "ℹ",
            success: "✓"
        }[level] || "•";
    }

    function renderEmpty() {
        renderScore(0);
        setText("auditorScoreLabel", "尚未輸入 Prompt");

        const coverage = document.getElementById("auditorCoverage");
        if (coverage) coverage.innerHTML = "";

        const issues = document.getElementById("auditorIssues");
        if (issues) {
            issues.innerHTML =
                '<p class="auditor-empty">尚未輸入 Prompt。</p>';
        }

        setValue("auditorCleanOutput", "");
        setValue("auditorCleanNegativeOutput", "");
    }

    function clearAuditor() {
        setValue("auditorPromptInput", "");
        setValue("auditorNegativeInput", "");
        renderEmpty();
        persistSettings();
        showToast("已清除檢查內容");
    }

    async function copyOutput(id, message) {
        const text = document.getElementById(id)?.value.trim() || "";

        if (!text) {
            showToast("目前沒有可複製的內容");
            return;
        }

        await copyText(text);
        showToast(message);
    }

    function saveToHistory() {
        const prompt = value("auditorCleanOutput");
        const negative = value("auditorCleanNegativeOutput");

        if (!prompt) {
            showToast("目前沒有清理結果");
            return;
        }

        try {
            const records = JSON.parse(
                localStorage.getItem(HISTORY_KEY)
            ) || [];

            if (!Array.isArray(records)) {
                throw new Error("歷史資料格式錯誤");
            }

            const platform = PLATFORM_LABELS[state.platform];
            const source = "提示詞品質檢查器";

            const existing = records.find((record) =>
                record.prompt === prompt &&
                record.platform === platform &&
                record.source === source
            );

            if (existing) {
                existing.savedAt = new Date().toISOString();
                existing.negative = negative;
            } else {
                records.unshift({
                    id: `history_${Date.now()}_${Math.random()
                        .toString(36).slice(2, 8)}`,
                    prompt,
                    negative,
                    source,
                    platform,
                    savedAt: new Date().toISOString()
                });
            }

            records.sort((a, b) =>
                String(b.savedAt).localeCompare(String(a.savedAt))
            );

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(records.slice(0, MAX_HISTORY))
            );

            showToast("清理結果已儲存到歷史");
        } catch (error) {
            console.warn(error);
            showToast("無法儲存到歷史");
        }
    }

    function restoreSettings() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(SETTINGS_KEY)
            );

            if (!saved) return;

            if (PLATFORM_LABELS[saved.platform]) {
                state.platform = saved.platform;
            }

            state.autoAnalyze = saved.autoAnalyze !== false;
            setValue("auditorPromptInput", saved.prompt || "");
            setValue("auditorNegativeInput", saved.negative || "");
        } catch (error) {
            console.warn("無法還原品質檢查器設定", error);
        }
    }

    function renderSettings() {
        setValue("auditorPlatform", state.platform);

        const checkbox =
            document.getElementById("auditorAutoAnalyze");

        if (checkbox) checkbox.checked = state.autoAnalyze;
    }

    function persistSettings() {
        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify({
                platform: state.platform,
                autoAnalyze: state.autoAnalyze,
                prompt: value("auditorPromptInput"),
                negative: value("auditorNegativeInput")
            })
        );
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container =
                document.getElementById("sectionNavLinks");

            if (
                !container ||
                container.querySelector("[data-auditor-nav]")
            ) {
                return;
            }

            const button = document.createElement("button");
            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.auditorNav = "true";
            button.innerHTML =
                "<span>✅</span><span>品質檢查</span>";

            button.addEventListener("click", () => {
                scrollToPanel();
            });

            container.appendChild(button);
        }, 1100);
    }

    function scrollToPanel() {
        document.getElementById("promptAuditorPanel")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    async function copyText(text) {
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
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, next) {
        const element = document.getElementById(id);
        if (element) element.value = next;
    }

    function setText(id, next) {
        const element = document.getElementById(id);
        if (element) element.textContent = next;
    }

    function showToast(message) {
        let toast = document.getElementById("auditorToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "auditorToast";
            toast.className = "auditor-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
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
