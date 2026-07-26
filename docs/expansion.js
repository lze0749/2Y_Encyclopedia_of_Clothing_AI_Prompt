// ======================================
// 2Y Database Expansion Dashboard
// Version: v2.4.0
// ======================================

(() => {
    const state = {
        items: [],
        targets: [],
        totalTarget: 0
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();

        try {
            await loadData();
            render();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            renderError(error.message);
        }
    });

    function createPanel() {
        if (document.getElementById("expansionDashboardPanel")) {
            return;
        }

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "expansionDashboardPanel";
        panel.className =
            "expansion-dashboard-panel app-section-target";

        panel.innerHTML = `
            <div class="expansion-dashboard-heading">
                <div>
                    <p class="expansion-dashboard-eyebrow">
                        41K CATALOG ROADMAP
                    </p>

                    <h2>預設資料庫擴增進度</h2>

                    <p>
                        追蹤 22 個分類、總計 41,000 筆的最終目標。
                        計數包含目前啟用的資料包與自訂項目。
                    </p>
                </div>

                <span class="expansion-dashboard-version">
                    v2.4.0
                </span>
            </div>

            <div class="expansion-dashboard-summary">
                <article>
                    <span>目前資料</span>
                    <strong id="expansionCurrentTotal">—</strong>
                    <small>筆</small>
                </article>

                <article>
                    <span>最終目標</span>
                    <strong id="expansionTargetTotal">41,000</strong>
                    <small>筆</small>
                </article>

                <article>
                    <span>尚需擴增</span>
                    <strong id="expansionRemainingTotal">—</strong>
                    <small>筆</small>
                </article>

                <article>
                    <span>整體進度</span>
                    <strong id="expansionOverallPercent">—</strong>
                    <small>百分比</small>
                </article>

                <article>
                    <span>雙人姿勢</span>
                    <strong id="expansionDuoPoseCount">—</strong>
                    <small>筆</small>
                </article>
            </div>

            <div class="expansion-overall-track">
                <span id="expansionOverallBar"></span>
            </div>

            <div class="expansion-dashboard-actions">
                <button id="exportExpansionPlanButton" type="button">
                    匯出進度 JSON
                </button>

                <button
                    id="exportExpansionCsvButton"
                    class="expansion-secondary"
                    type="button"
                >
                    匯出 CSV
                </button>
            </div>

            <div
                id="expansionTargetGrid"
                class="expansion-target-grid"
            >
                <p class="expansion-empty">
                    正在計算資料庫進度……
                </p>
            </div>
        `;

        const healthPanel =
            document.getElementById("catalogHealthPanel");

        if (healthPanel) {
            healthPanel.insertAdjacentElement("afterend", panel);
        } else {
            content.appendChild(panel);
        }

        document
            .getElementById("exportExpansionPlanButton")
            ?.addEventListener("click", exportJson);

        document
            .getElementById("exportExpansionCsvButton")
            ?.addEventListener("click", exportCsv);
    }

    async function loadData() {
        const [itemsResponse, targetsResponse] =
            await Promise.all([
                fetch("./data/items.json"),
                fetch("./data/database-targets.json")
            ]);

        if (!itemsResponse.ok) {
            throw new Error(
                `items.json HTTP ${itemsResponse.status}`
            );
        }

        if (!targetsResponse.ok) {
            throw new Error(
                `database-targets.json HTTP ${targetsResponse.status}`
            );
        }

        state.items = await itemsResponse.json();

        const targetData =
            await targetsResponse.json();

        state.targets =
            Array.isArray(targetData.targets)
                ? targetData.targets
                : [];

        state.totalTarget =
            Number(targetData.total_target || 41000);
    }

    function render() {
        const progress =
            buildProgress();

        const currentTotal =
            state.items.length;

        const remaining =
            Math.max(
                0,
                state.totalTarget - currentTotal
            );

        const percent =
            state.totalTarget
                ? currentTotal / state.totalTarget * 100
                : 0;

        setText(
            "expansionCurrentTotal",
            numberFormat(currentTotal)
        );

        setText(
            "expansionTargetTotal",
            numberFormat(state.totalTarget)
        );

        setText(
            "expansionRemainingTotal",
            numberFormat(remaining)
        );

        setText(
            "expansionOverallPercent",
            `${percent.toFixed(2)}%`
        );

        setText(
            "expansionDuoPoseCount",
            numberFormat(countDuoPoses())
        );

        const bar =
            document.getElementById(
                "expansionOverallBar"
            );

        if (bar) {
            bar.style.width =
                `${Math.min(100, percent)}%`;
        }

        const grid =
            document.getElementById(
                "expansionTargetGrid"
            );

        if (!grid) return;

        grid.innerHTML =
            progress.map((entry) => `
                <article class="expansion-target-card">
                    <div class="expansion-target-heading">
                        <div>
                            <span>${escapeHtml(entry.icon)}</span>
                            <div>
                                <h3>${escapeHtml(entry.name_zh)}</h3>
                                <p><code>${escapeHtml(entry.id)}</code></p>
                            </div>
                        </div>

                        <strong>${entry.percent.toFixed(1)}%</strong>
                    </div>

                    <div class="expansion-target-numbers">
                        <span>
                            目前 ${numberFormat(entry.current)}
                        </span>

                        <span>
                            目標 ${numberFormat(entry.target)}
                        </span>

                        <span>
                            尚缺 ${numberFormat(entry.remaining)}
                        </span>
                    </div>

                    <div class="expansion-target-track">
                        <span style="width:${Math.min(100, entry.percent)}%"></span>
                    </div>

                    ${entry.id === "poses" ? `
                        <p class="expansion-duo-note">
                            其中雙人姿勢：
                            ${numberFormat(countDuoPoses())} 筆
                        </p>
                    ` : ""}
                </article>
            `).join("");
    }

    function buildProgress() {
        return state.targets.map((target) => {
            const current =
                countTarget(target.id);

            const remaining =
                Math.max(
                    0,
                    Number(target.target) - current
                );

            const percent =
                Number(target.target)
                    ? current / Number(target.target) * 100
                    : 0;

            return {
                ...target,
                current,
                remaining,
                percent
            };
        });
    }

    function countTarget(targetId) {
        return state.items.filter((item) => {
            if (!item) return false;

            if (targetId === "bags") {
                if (item.category === "bags") return true;

                if (item.category === "bags-props") {
                    return includesAny(item, [
                        "包", "bag", "pouch",
                        "satchel", "backpack",
                        "clutch", "case"
                    ]);
                }

                return false;
            }

            if (targetId === "handheld-props") {
                if (item.category === "handheld-props") {
                    return true;
                }

                if (item.category === "bags-props") {
                    return !includesAny(item, [
                        "包", "bag", "pouch",
                        "satchel", "backpack",
                        "clutch", "case"
                    ]);
                }

                return false;
            }

            return item.category === targetId;
        }).length;
    }

    function countDuoPoses() {
        return state.items.filter((item) =>
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
        ).length;
    }

    function includesAny(item, terms) {
        const text = [
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

        return terms.some((term) =>
            text.includes(term.toLowerCase())
        );
    }

    function exportJson() {
        const report = {
            generatedAt:
                new Date().toISOString(),
            totalCurrent:
                state.items.length,
            totalTarget:
                state.totalTarget,
            totalRemaining:
                Math.max(
                    0,
                    state.totalTarget - state.items.length
                ),
            duoPoseCount:
                countDuoPoses(),
            progress:
                buildProgress()
        };

        downloadText(
            JSON.stringify(report, null, 2),
            `2Y-database-expansion-${
                new Date().toISOString().slice(0, 10)
            }.json`,
            "application/json;charset=utf-8"
        );
    }

    function exportCsv() {
        const header = [
            "id",
            "name_zh",
            "current",
            "target",
            "remaining",
            "percent"
        ];

        const rows =
            buildProgress().map((entry) => [
                entry.id,
                entry.name_zh,
                entry.current,
                entry.target,
                entry.remaining,
                entry.percent.toFixed(2)
            ]);

        const csv =
            "\ufeff" +
            [header, ...rows]
                .map((row) =>
                    row.map(csvEscape).join(",")
                )
                .join("\r\n");

        downloadText(
            csv,
            `2Y-database-expansion-${
                new Date().toISOString().slice(0, 10)
            }.csv`,
            "text/csv;charset=utf-8"
        );
    }

    function renderError(message) {
        const grid =
            document.getElementById(
                "expansionTargetGrid"
            );

        if (!grid) return;

        grid.innerHTML = `
            <p class="expansion-empty error">
                擴增進度載入失敗：
                ${escapeHtml(message)}
            </p>
        `;
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
                    "[data-expansion-nav]"
                )
            ) {
                return;
            }

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "section-nav-link";
            button.dataset.expansionNav =
                "true";
            button.innerHTML =
                "<span>📈</span><span>擴增進度</span>";

            button.addEventListener("click", () => {
                document
                    .getElementById(
                        "expansionDashboardPanel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1850);
    }

    function downloadText(text, filename, type) {
        const blob =
            new Blob([text], { type });

        const url =
            URL.createObjectURL(blob);

        const anchor =
            document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        anchor.click();

        URL.revokeObjectURL(url);
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

    function numberFormat(value) {
        return new Intl.NumberFormat(
            "zh-TW"
        ).format(value);
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
})();
