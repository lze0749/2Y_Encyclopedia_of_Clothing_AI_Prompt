// ======================================
// 2Y Prompt History
// Version: v1.5.0
// ======================================

(() => {
    const STORAGE_KEY = "2y-prompt-history-v1";
    const MAX_RECORDS = 100;

    document.addEventListener("DOMContentLoaded", () => {
        createHistoryPanel();
        bindHistoryControls();
        bindCopyCapture();
        addNavigationButton();
        renderHistory();
    });

    function createHistoryPanel() {
        if (document.getElementById("promptHistoryPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "promptHistoryPanel";
        panel.className = "history-panel app-section-target";
        panel.innerHTML = `
            <div class="history-heading">
                <div>
                    <p class="history-eyebrow">LOCAL PROMPT HISTORY</p>
                    <h2>提示詞歷史紀錄</h2>
                    <p>保存最近複製或手動儲存的 Prompt。資料只存於目前瀏覽器。</p>
                </div>
                <span class="history-version">v1.5.0</span>
            </div>

            <div class="history-toolbar">
                <label class="history-search-field">
                    <span>搜尋紀錄</span>
                    <input id="historySearch" type="search"
                        placeholder="搜尋 Prompt、來源或平台">
                </label>

                <label class="history-filter-field">
                    <span>來源</span>
                    <select id="historySourceFilter">
                        <option value="all">全部來源</option>
                        <option value="Prompt Builder">Prompt Builder</option>
                        <option value="隨機穿搭">隨機穿搭</option>
                        <option value="參數實驗室">參數實驗室</option>
                        <option value="百科資料庫">百科資料庫</option>
                        <option value="其他">其他</option>
                    </select>
                </label>

                <button id="saveCurrentPromptsButton" type="button">
                    ＋ 儲存目前 Prompt
                </button>

                <button id="exportHistoryButton" class="history-secondary"
                    type="button">
                    匯出 JSON
                </button>

                <label class="history-import-button">
                    匯入 JSON
                    <input id="importHistoryInput" type="file"
                        accept=".json,application/json" hidden>
                </label>

                <button id="clearHistoryButton" class="history-danger"
                    type="button">
                    清除全部
                </button>
            </div>

            <div class="history-summary">
                <span id="historyCount">0 筆</span>
                <small>最多保留 ${MAX_RECORDS} 筆</small>
            </div>

            <div id="historyList" class="history-list" aria-live="polite">
                <p class="history-empty">尚無提示詞紀錄。</p>
            </div>
        `;

        content.appendChild(panel);
    }

    function bindHistoryControls() {
        document.getElementById("historySearch")
            ?.addEventListener("input", renderHistory);

        document.getElementById("historySourceFilter")
            ?.addEventListener("change", renderHistory);

        document.getElementById("saveCurrentPromptsButton")
            ?.addEventListener("click", saveCurrentPrompts);

        document.getElementById("exportHistoryButton")
            ?.addEventListener("click", exportHistory);

        document.getElementById("importHistoryInput")
            ?.addEventListener("change", importHistory);

        document.getElementById("clearHistoryButton")
            ?.addEventListener("click", clearHistory);
    }

    function bindCopyCapture() {
        document.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button || button.closest("#promptHistoryPanel")) return;

            const payload = resolveCopiedPayload(button);
            if (!payload?.prompt) return;

            window.setTimeout(() => {
                addRecord(payload);
            }, 80);
        }, true);
    }

    function resolveCopiedPayload(button) {
        const id = button.id || "";
        const text = button.textContent.trim().toLowerCase();

        if (id === "builderCopyPromptButton") {
            return fromTextarea("builderPromptOutput", "Prompt Builder");
        }

        if (id === "copyRandomPromptButton") {
            return fromTextarea("randomPromptOutput", "隨機穿搭");
        }

        if (id === "parameterCopyButton") {
            return fromTextarea("parameterPrompt", "參數實驗室");
        }

        if (
            button.classList.contains("copy-button") &&
            !text.includes("negative")
        ) {
            return {
                prompt: button.dataset.copy || "",
                negative: "",
                source: "百科資料庫",
                platform: inferPlatform(button)
            };
        }

        return null;
    }

    function fromTextarea(id, source) {
        const element = document.getElementById(id);
        if (!element?.value.trim()) return null;

        return {
            prompt: element.value.trim(),
            negative: findRelatedNegative(id),
            source,
            platform: inferCurrentPlatform(source)
        };
    }

    function findRelatedNegative(promptId) {
        const map = {
            builderPromptOutput: "builderNegativeOutput",
            randomPromptOutput: "randomNegativeOutput",
            parameterPrompt: "parameterNegative"
        };

        return document.getElementById(map[promptId])?.value.trim() || "";
    }

    function inferCurrentPlatform(source) {
        const map = {
            "Prompt Builder": "builderPlatform",
            "隨機穿搭": "randomPlatform",
            "參數實驗室": "parameterPlatform"
        };

        const value = document.getElementById(map[source])?.value || "";
        return formatPlatform(value);
    }

    function inferPlatform(button) {
        const section = button.closest(".prompt-section");
        const heading = section?.querySelector("h4")?.textContent.trim();
        return heading || "未指定";
    }

    function formatPlatform(value) {
        const labels = {
            pixai: "PixAI",
            niji: "Niji Journey",
            tensorart: "TensorArt",
            gpt: "GPT Image"
        };
        return labels[value] || "未指定";
    }

    function saveCurrentPrompts() {
        const candidates = [
            ["builderPromptOutput", "Prompt Builder"],
            ["randomPromptOutput", "隨機穿搭"],
            ["parameterPrompt", "參數實驗室"]
        ];

        let saved = 0;

        candidates.forEach(([id, source]) => {
            const payload = fromTextarea(id, source);
            if (payload?.prompt) {
                addRecord(payload, false);
                saved += 1;
            }
        });

        if (!saved) {
            showHistoryToast("目前頁面沒有可儲存的 Prompt");
            return;
        }

        renderHistory();
        showHistoryToast(`已儲存 ${saved} 筆 Prompt`);
    }

    function addRecord(payload, refresh = true) {
        const prompt = String(payload.prompt || "").trim();
        if (!prompt) return;

        const records = getRecords();
        const duplicate = records.find((record) =>
            record.prompt === prompt &&
            record.source === payload.source &&
            record.platform === payload.platform
        );

        if (duplicate) {
            duplicate.savedAt = new Date().toISOString();
            duplicate.negative = payload.negative || duplicate.negative;
        } else {
            records.unshift({
                id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                prompt,
                negative: String(payload.negative || "").trim(),
                source: payload.source || "其他",
                platform: payload.platform || "未指定",
                savedAt: new Date().toISOString()
            });
        }

        records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
        setRecords(records.slice(0, MAX_RECORDS));

        if (refresh) {
            renderHistory();
            showHistoryToast("已加入提示詞歷史");
        }
    }

    function renderHistory() {
        const list = document.getElementById("historyList");
        const count = document.getElementById("historyCount");
        if (!list) return;

        const query = document.getElementById("historySearch")
            ?.value.trim().toLowerCase() || "";

        const source = document.getElementById("historySourceFilter")
            ?.value || "all";

        const records = getRecords();
        const filtered = records.filter((record) => {
            const sourceMatches = source === "all" || record.source === source;
            const text = [
                record.prompt,
                record.negative,
                record.source,
                record.platform
            ].join(" ").toLowerCase();

            return sourceMatches && (!query || text.includes(query));
        });

        if (count) count.textContent = `${records.length} 筆`;

        if (!filtered.length) {
            list.innerHTML = `
                <p class="history-empty">
                    ${records.length ? "找不到符合條件的紀錄。" : "尚無提示詞紀錄。"}
                </p>
            `;
            return;
        }

        list.innerHTML = filtered.map((record) => `
            <article class="history-card">
                <div class="history-card-heading">
                    <div>
                        <span class="history-source">${escapeHtml(record.source)}</span>
                        <span class="history-platform">${escapeHtml(record.platform)}</span>
                    </div>
                    <time datetime="${escapeAttribute(record.savedAt)}">
                        ${escapeHtml(formatDate(record.savedAt))}
                    </time>
                </div>

                <p class="history-prompt">${escapeHtml(record.prompt)}</p>

                ${record.negative ? `
                    <details>
                        <summary>查看 Negative Prompt</summary>
                        <p>${escapeHtml(record.negative)}</p>
                    </details>
                ` : ""}

                <div class="history-card-actions">
                    <button type="button" data-history-copy="${escapeAttribute(record.id)}">
                        📋 複製
                    </button>
                    <button type="button" class="history-delete"
                        data-history-delete="${escapeAttribute(record.id)}">
                        刪除
                    </button>
                </div>
            </article>
        `).join("");

        list.querySelectorAll("[data-history-copy]").forEach((button) => {
            button.addEventListener("click", () => {
                const record = getRecords().find(
                    (item) => item.id === button.dataset.historyCopy
                );
                if (record) copyText(record.prompt, "歷史 Prompt 已複製");
            });
        });

        list.querySelectorAll("[data-history-delete]").forEach((button) => {
            button.addEventListener("click", () => {
                deleteRecord(button.dataset.historyDelete);
            });
        });
    }

    function deleteRecord(id) {
        setRecords(getRecords().filter((record) => record.id !== id));
        renderHistory();
        showHistoryToast("紀錄已刪除");
    }

    function clearHistory() {
        if (!getRecords().length) return;
        if (!window.confirm("確定清除全部提示詞歷史？")) return;

        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
        showHistoryToast("已清除全部歷史");
    }

    function exportHistory() {
        const records = getRecords();
        if (!records.length) {
            showHistoryToast("目前沒有紀錄可匯出");
            return;
        }

        const blob = new Blob(
            [JSON.stringify({ version: 1, records }, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `2Y-prompt-history-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async function importHistory(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        try {
            const parsed = JSON.parse(await file.text());
            const incoming = Array.isArray(parsed) ? parsed : parsed.records;

            if (!Array.isArray(incoming)) {
                throw new Error("JSON 不包含 records 陣列");
            }

            const valid = incoming.filter((record) =>
                record &&
                typeof record.prompt === "string" &&
                record.prompt.trim()
            ).map((record) => ({
                id: typeof record.id === "string"
                    ? record.id
                    : `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                prompt: record.prompt.trim(),
                negative: String(record.negative || "").trim(),
                source: String(record.source || "其他"),
                platform: String(record.platform || "未指定"),
                savedAt: record.savedAt || new Date().toISOString()
            }));

            const merged = new Map(
                getRecords().map((record) => [record.id, record])
            );

            valid.forEach((record) => merged.set(record.id, record));

            const result = [...merged.values()]
                .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
                .slice(0, MAX_RECORDS);

            setRecords(result);
            renderHistory();
            showHistoryToast(`已匯入 ${valid.length} 筆紀錄`);
        } catch (error) {
            alert(`匯入失敗：${error.message}`);
        }
    }

    function getRecords() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function setRecords(records) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container = document.getElementById("sectionNavLinks");
            if (!container || container.querySelector("[data-history-nav]")) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.historyNav = "true";
            button.innerHTML = "<span>🕘</span><span>歷史</span>";
            button.addEventListener("click", () => {
                document.getElementById("promptHistoryPanel")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            container.appendChild(button);
        }, 900);
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
        showHistoryToast(message);
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return new Intl.DateTimeFormat("zh-TW", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function showHistoryToast(message) {
        let toast = document.getElementById("historyToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "historyToast";
            toast.className = "history-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showHistoryToast.timer);
        showHistoryToast.timer = setTimeout(() => {
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
