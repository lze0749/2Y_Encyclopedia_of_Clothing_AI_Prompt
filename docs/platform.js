// ======================================
// 2Y Multi-Platform Prompt Converter
// Version: v1.6.0
// ======================================

(() => {
    const SETTINGS_KEY = "2y-platform-converter-v1";
    const HISTORY_KEY = "2y-prompt-history-v1";
    const MAX_HISTORY = 100;

    const PRESETS = {
        fashion: {
            label: "時裝設計",
            shared: [
                "coherent outfit construction",
                "clear garment silhouette",
                "detailed fabric texture",
                "consistent accessories"
            ],
            pixai: [
                "masterpiece",
                "best quality",
                "highly detailed"
            ],
            niji: [
                "polished anime fashion illustration",
                "refined folds",
                "expressive styling"
            ],
            tensorart: [
                "high detail",
                "precise seams",
                "realistic textile texture"
            ],
            gpt: "Create a polished fashion image that clearly preserves the garment construction, materials, silhouette, colors, and accessories."
        },
        editorial: {
            label: "寫實時尚攝影",
            shared: [
                "fashion editorial",
                "realistic textile response",
                "clean styling",
                "professional composition"
            ],
            pixai: [
                "photorealistic",
                "high resolution",
                "editorial lighting"
            ],
            niji: [
                "fashion magazine composition",
                "cinematic styling",
                "refined visual hierarchy"
            ],
            tensorart: [
                "photorealistic",
                "realistic skin and fabric",
                "professional fashion photography"
            ],
            gpt: "Create a realistic fashion-editorial image with professional lighting, convincing materials, and clearly readable garment construction."
        },
        fantasy: {
            label: "奇幻角色設計",
            shared: [
                "cohesive fantasy costume",
                "story-rich details",
                "ornate but readable construction",
                "consistent materials"
            ],
            pixai: [
                "masterpiece",
                "fantasy character design",
                "highly detailed"
            ],
            niji: [
                "polished fantasy anime illustration",
                "dramatic costume design",
                "cinematic atmosphere"
            ],
            tensorart: [
                "high-detail fantasy concept art",
                "realistic materials",
                "coherent armor and garment layers"
            ],
            gpt: "Create a detailed fantasy character image with coherent costume layers, readable accessories, and a strong story-driven design."
        },
        catalog: {
            label: "服飾目錄",
            shared: [
                "full outfit clearly visible",
                "neutral clean background",
                "even lighting",
                "accurate garment proportions"
            ],
            pixai: [
                "best quality",
                "clean catalog presentation",
                "sharp details"
            ],
            niji: [
                "fashion catalog illustration",
                "clean layout",
                "minimal distraction"
            ],
            tensorart: [
                "catalog photography",
                "even studio lighting",
                "accurate material texture"
            ],
            gpt: "Create a clean fashion-catalog image that shows the full outfit clearly against a neutral background with even lighting."
        }
    };

    const VARIANT_MODIFIERS = [
        "front-facing full-body composition",
        "three-quarter fashion pose",
        "dynamic walking pose",
        "low-angle full-body shot",
        "soft studio lighting",
        "cinematic rim lighting",
        "minimal catalog background",
        "editorial environment"
    ];

    const state = {
        preset: "fashion",
        aspect: "2:3",
        stylize: 250,
        chaos: 0,
        quality: "high",
        variantCount: 1,
        useNiji: true
    };

    document.addEventListener("DOMContentLoaded", () => {
        createPanel();
        bindControls();
        restoreSettings();
        renderSettings();
        generateOutputs();
        addNavigationButton();
    });

    function createPanel() {
        if (document.getElementById("platformConverterPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "platformConverterPanel";
        panel.className = "platform-converter-panel app-section-target";
        panel.innerHTML = `
            <div class="platform-heading">
                <div>
                    <p class="platform-eyebrow">CROSS-PLATFORM PROMPT TOOL</p>
                    <h2>多平台提示詞轉換器</h2>
                    <p>
                        輸入一段基礎描述，同時產生適合 PixAI、Niji Journey、
                        TensorArt 與 GPT Image 的版本。
                    </p>
                </div>
                <span class="platform-version">v1.6.0</span>
            </div>

            <div class="platform-input-grid">
                <label class="platform-wide-field">
                    <span>基礎 Prompt *</span>
                    <textarea id="platformBasePrompt" rows="6"
                        placeholder="例如：紫色短版機能外套，螢光綠滾邊，模組化口袋，黑色工裝褲，雨夜霓虹巷道"></textarea>
                </label>

                <label class="platform-wide-field">
                    <span>Negative Prompt</span>
                    <textarea id="platformNegativePrompt" rows="3">logo, text, watermark, malformed clothing, broken garment structure, inconsistent layers, duplicate accessories</textarea>
                </label>

                <label class="platform-field">
                    <span>用途預設</span>
                    <select id="platformPreset">
                        <option value="fashion">時裝設計</option>
                        <option value="editorial">寫實時尚攝影</option>
                        <option value="fantasy">奇幻角色設計</option>
                        <option value="catalog">服飾目錄</option>
                    </select>
                </label>

                <label class="platform-field">
                    <span>畫面比例</span>
                    <select id="platformAspect">
                        <option value="1:1">1:1 正方形</option>
                        <option value="2:3" selected>2:3 直式</option>
                        <option value="3:4">3:4 直式</option>
                        <option value="4:5">4:5 社群直式</option>
                        <option value="16:9">16:9 橫式</option>
                        <option value="9:16">9:16 手機直式</option>
                    </select>
                </label>

                <label class="platform-field">
                    <span>品質層級</span>
                    <select id="platformQuality">
                        <option value="standard">標準</option>
                        <option value="high" selected>高品質</option>
                        <option value="max">最高細節</option>
                    </select>
                </label>

                <label class="platform-field">
                    <span>變體數量</span>
                    <select id="platformVariantCount">
                        <option value="1">1 組</option>
                        <option value="2">2 組</option>
                        <option value="4">4 組</option>
                        <option value="8">8 組</option>
                    </select>
                </label>

                <label class="platform-field">
                    <span>Niji Stylize</span>
                    <input id="platformStylize" type="number"
                        min="0" max="1000" step="50" value="250">
                </label>

                <label class="platform-field">
                    <span>Niji Chaos</span>
                    <input id="platformChaos" type="number"
                        min="0" max="100" step="5" value="0">
                </label>

                <label class="platform-check">
                    <input id="platformUseNiji" type="checkbox" checked>
                    <span>加入 <code>--niji 6</code></span>
                </label>

                <label class="platform-wide-field">
                    <span>額外要求（可選）</span>
                    <input id="platformExtra"
                        placeholder="例如：keep the face unobstructed, full body visible">
                </label>
            </div>

            <div class="platform-main-actions">
                <button id="generatePlatformPromptsButton" type="button">
                    ✨ 產生四平台版本
                </button>
                <button id="copyAllPlatformPromptsButton"
                    class="platform-secondary" type="button">
                    📋 複製全部
                </button>
                <button id="exportPlatformPromptsButton"
                    class="platform-secondary" type="button">
                    匯出 TXT
                </button>
                <button id="clearPlatformPromptsButton"
                    class="platform-text-button" type="button">
                    清除
                </button>
            </div>

            <div id="platformOutputs" class="platform-output-grid">
                ${createOutputCard("PixAI", "pixai", "🟣")}
                ${createOutputCard("Niji Journey", "niji", "🌈")}
                ${createOutputCard("TensorArt", "tensorart", "🔷")}
                ${createOutputCard("GPT Image", "gpt", "🟢")}
            </div>
        `;

        const historyPanel = document.getElementById("promptHistoryPanel");

        if (historyPanel) {
            historyPanel.insertAdjacentElement("beforebegin", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function createOutputCard(label, key, icon) {
        return `
            <article class="platform-output-card">
                <div class="platform-output-heading">
                    <h3>${icon} ${label}</h3>
                    <button type="button" data-copy-platform="${key}">
                        📋 複製
                    </button>
                </div>
                <textarea id="platformOutput_${key}" rows="13" readonly
                    placeholder="輸入基礎 Prompt 後產生。"></textarea>
            </article>
        `;
    }

    function bindControls() {
        document.getElementById("generatePlatformPromptsButton")
            ?.addEventListener("click", () => {
                readSettings();
                persistSettings();
                generateOutputs();
                showToast("已產生四平台版本");
            });

        document.getElementById("copyAllPlatformPromptsButton")
            ?.addEventListener("click", copyAll);

        document.getElementById("exportPlatformPromptsButton")
            ?.addEventListener("click", exportTxt);

        document.getElementById("clearPlatformPromptsButton")
            ?.addEventListener("click", clearAll);

        document.querySelectorAll("[data-copy-platform]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const key = button.dataset.copyPlatform;
                    const text = document.getElementById(
                        `platformOutput_${key}`
                    )?.value.trim() || "";

                    if (!text) {
                        showToast("目前沒有可複製的內容");
                        return;
                    }

                    copyText(text);
                    saveToHistory(text, key);
                    showToast(`${formatPlatform(key)} Prompt 已複製`);
                });
            });

        [
            "platformPreset",
            "platformAspect",
            "platformQuality",
            "platformVariantCount",
            "platformStylize",
            "platformChaos",
            "platformUseNiji",
            "platformBasePrompt",
            "platformNegativePrompt",
            "platformExtra"
        ].forEach((id) => {
            document.getElementById(id)?.addEventListener("change", () => {
                readSettings();
                persistSettings();
                generateOutputs();
            });
        });
    }

    function readSettings() {
        state.preset = value("platformPreset") || "fashion";
        state.aspect = value("platformAspect") || "2:3";
        state.quality = value("platformQuality") || "high";
        state.variantCount = clampInt(value("platformVariantCount"), 1, 8, 1);
        state.stylize = clampInt(value("platformStylize"), 0, 1000, 250);
        state.chaos = clampInt(value("platformChaos"), 0, 100, 0);
        state.useNiji =
            document.getElementById("platformUseNiji")?.checked !== false;
    }

    function generateOutputs() {
        readSettings();

        const base = value("platformBasePrompt");
        const extra = value("platformExtra");
        const negative = value("platformNegativePrompt");
        const preset = PRESETS[state.preset] || PRESETS.fashion;

        const outputs = {
            pixai: buildPixAI(base, extra, preset),
            niji: buildNiji(base, extra, preset),
            tensorart: buildTensorArt(base, extra, preset),
            gpt: buildGPT(base, extra, preset)
        };

        Object.entries(outputs).forEach(([key, variants]) => {
            const textarea = document.getElementById(`platformOutput_${key}`);

            if (!textarea) return;

            textarea.value = base
                ? variants.map((prompt, index) =>
                    state.variantCount > 1
                        ? `VARIANT ${index + 1}\n${prompt}`
                        : prompt
                  ).join("\n\n")
                : "";
        });

        document.getElementById("platformConverterPanel")
            ?.setAttribute("data-negative", negative);
    }

    function buildPixAI(base, extra, preset) {
        return buildVariants((modifier) => {
            const quality = qualityTags("pixai");
            return joinComma([
                ...quality,
                ...preset.pixai,
                base,
                ...preset.shared,
                modifier,
                extra,
                `aspect ratio ${state.aspect}`
            ]);
        });
    }

    function buildNiji(base, extra, preset) {
        return buildVariants((modifier) => {
            const params = [
                `--ar ${state.aspect}`,
                `--stylize ${state.stylize}`,
                state.chaos ? `--chaos ${state.chaos}` : "",
                state.useNiji ? "--niji 6" : ""
            ].filter(Boolean).join(" ");

            return `${joinComma([
                base,
                ...preset.niji,
                ...preset.shared,
                modifier,
                extra
            ])} ${params}`.trim();
        });
    }

    function buildTensorArt(base, extra, preset) {
        return buildVariants((modifier) => {
            const quality = qualityTags("tensorart");
            return joinComma([
                ...quality,
                ...preset.tensorart,
                base,
                ...preset.shared,
                modifier,
                extra,
                `aspect ratio ${state.aspect}`
            ]);
        });
    }

    function buildGPT(base, extra, preset) {
        return buildVariants((modifier) => {
            const qualityInstruction = {
                standard: "Use clear, balanced detail.",
                high: "Use high detail and polished visual quality.",
                max: "Use extremely detailed materials, seams, accessories, and lighting while keeping the design coherent."
            }[state.quality];

            return [
                preset.gpt,
                base ? `Subject and design: ${base}.` : "",
                `Composition: ${modifier}.`,
                `Aspect ratio: ${state.aspect}.`,
                qualityInstruction,
                extra ? `Additional requirement: ${extra}.` : "",
                "Avoid conflicting garment layers, duplicated accessories, unreadable construction, logos, text, and watermarks."
            ].filter(Boolean).join(" ");
        });
    }

    function buildVariants(builder) {
        const count = state.variantCount;
        const offset = Math.floor(Math.random() * VARIANT_MODIFIERS.length);

        return Array.from({ length: count }, (_, index) => {
            const modifier =
                VARIANT_MODIFIERS[(offset + index) % VARIANT_MODIFIERS.length];

            return builder(modifier);
        });
    }

    function qualityTags(platform) {
        const tables = {
            pixai: {
                standard: ["best quality"],
                high: ["masterpiece", "best quality", "highly detailed"],
                max: ["masterpiece", "best quality", "ultra detailed", "intricate fabric texture"]
            },
            tensorart: {
                standard: ["high quality"],
                high: ["high quality", "high detail", "sharp garment details"],
                max: ["ultra detailed", "high resolution", "precise garment construction", "intricate textile texture"]
            }
        };

        return tables[platform]?.[state.quality] || [];
    }

    function copyAll() {
        const blocks = ["pixai", "niji", "tensorart", "gpt"]
            .map((key) => {
                const text = document.getElementById(
                    `platformOutput_${key}`
                )?.value.trim();

                return text
                    ? `=== ${formatPlatform(key)} ===\n${text}`
                    : "";
            })
            .filter(Boolean);

        if (!blocks.length) {
            showToast("目前沒有可複製的內容");
            return;
        }

        const text = blocks.join("\n\n");
        copyText(text);
        showToast("四平台 Prompt 已複製");
    }

    function exportTxt() {
        const base = value("platformBasePrompt");

        if (!base) {
            showToast("請先輸入基礎 Prompt");
            return;
        }

        const negative = value("platformNegativePrompt");

        const content = ["pixai", "niji", "tensorart", "gpt"]
            .map((key) => {
                const text = document.getElementById(
                    `platformOutput_${key}`
                )?.value.trim() || "";

                return `=== ${formatPlatform(key)} ===\n${text}`;
            })
            .concat(`=== Negative Prompt ===\n${negative}`)
            .join("\n\n");

        const blob = new Blob([content], {
            type: "text/plain;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
            `2Y-platform-prompts-${new Date().toISOString().slice(0, 10)}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function clearAll() {
        document.getElementById("platformBasePrompt").value = "";
        document.getElementById("platformExtra").value = "";
        generateOutputs();
        persistSettings();
        showToast("已清除轉換內容");
    }

    function saveToHistory(prompt, platformKey) {
        try {
            const records = JSON.parse(
                localStorage.getItem(HISTORY_KEY)
            ) || [];

            if (!Array.isArray(records)) return;

            const platform = formatPlatform(platformKey);
            const source = "多平台轉換器";
            const negative = value("platformNegativePrompt");

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
        } catch (error) {
            console.warn("無法寫入提示詞歷史", error);
        }
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container = document.getElementById("sectionNavLinks");
            if (!container || container.querySelector("[data-platform-nav]")) {
                return;
            }

            const button = document.createElement("button");
            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.platformNav = "true";
            button.innerHTML = "<span>🔁</span><span>轉換器</span>";

            button.addEventListener("click", () => {
                document.getElementById("platformConverterPanel")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1000);
    }

    function restoreSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (!saved) return;

            if (PRESETS[saved.preset]) state.preset = saved.preset;
            if (saved.aspect) state.aspect = saved.aspect;
            if (["standard", "high", "max"].includes(saved.quality)) {
                state.quality = saved.quality;
            }

            state.variantCount = clampInt(saved.variantCount, 1, 8, 1);
            state.stylize = clampInt(saved.stylize, 0, 1000, 250);
            state.chaos = clampInt(saved.chaos, 0, 100, 0);
            state.useNiji = saved.useNiji !== false;

            setValue("platformBasePrompt", saved.basePrompt || "");
            setValue("platformNegativePrompt", saved.negativePrompt ||
                "logo, text, watermark, malformed clothing, broken garment structure, inconsistent layers, duplicate accessories");
            setValue("platformExtra", saved.extra || "");
        } catch (error) {
            console.warn("無法還原轉換器設定", error);
        }
    }

    function renderSettings() {
        setValue("platformPreset", state.preset);
        setValue("platformAspect", state.aspect);
        setValue("platformQuality", state.quality);
        setValue("platformVariantCount", String(state.variantCount));
        setValue("platformStylize", String(state.stylize));
        setValue("platformChaos", String(state.chaos));

        const checkbox = document.getElementById("platformUseNiji");
        if (checkbox) checkbox.checked = state.useNiji;
    }

    function persistSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            ...state,
            basePrompt: value("platformBasePrompt"),
            negativePrompt: value("platformNegativePrompt"),
            extra: value("platformExtra")
        }));
    }

    function joinComma(parts) {
        const seen = new Set();

        return parts
            .flat()
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

    function formatPlatform(key) {
        const labels = {
            pixai: "PixAI",
            niji: "Niji Journey",
            tensorart: "TensorArt",
            gpt: "GPT Image"
        };
        return labels[key] || key;
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, next) {
        const element = document.getElementById(id);
        if (element) element.value = next;
    }

    function clampInt(value, min, max, fallback) {
        const number = Number.parseInt(value, 10);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    function showToast(message) {
        let toast = document.getElementById("platformToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "platformToast";
            toast.className = "platform-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
    }
})();
