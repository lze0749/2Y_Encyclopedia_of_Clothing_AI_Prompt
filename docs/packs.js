// ======================================
// 2Y Data Pack Manager
// Version: v1.9.0
// ======================================

(() => {
    const SETTINGS_KEY = "2y-enabled-data-packs-v1";

    const state = {
        manifest: null,
        enabledIds: new Set(),
        currentItemCount: 0
    };

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindStaticControls();

        try {
            await loadManifest();
            await loadCurrentItemCount();
            render();
            addNavigationButton();
        } catch (error) {
            console.error(error);
            renderError(error.message);
        }
    });

    function createPanel() {
        if (document.getElementById("dataPackPanel")) {
            return;
        }

        const content = document.querySelector(".content");

        if (!content) {
            return;
        }

        const panel = document.createElement("section");
        panel.id = "dataPackPanel";
        panel.className =
            "data-pack-panel app-section-target";

        panel.innerHTML = `
            <div class="data-pack-heading">
                <div>
                    <p class="data-pack-eyebrow">
                        MODULAR CATALOG EXPANSION
                    </p>

                    <h2>服裝資料包管理器</h2>

                    <p>
                        將大型服裝百科拆成多個 JSON 資料包。
                        可依需求啟用或停用，避免所有資料都塞進
                        單一 items.json。
                    </p>
                </div>

                <span class="data-pack-version">
                    v1.9.0
                </span>
            </div>

            <div class="data-pack-stats">
                <article>
                    <span>目前載入</span>
                    <strong id="dataPackCurrentCount">—</strong>
                    <small>筆百科資料</small>
                </article>

                <article>
                    <span>已啟用</span>
                    <strong id="dataPackEnabledCount">—</strong>
                    <small>個擴充包</small>
                </article>

                <article>
                    <span>可用資料包</span>
                    <strong id="dataPackAvailableCount">—</strong>
                    <small>個資料包</small>
                </article>
            </div>

            <div class="data-pack-toolbar">
                <button
                    id="enableAllDataPacksButton"
                    type="button"
                >
                    全部啟用
                </button>

                <button
                    id="disableAllDataPacksButton"
                    class="data-pack-secondary"
                    type="button"
                >
                    全部停用
                </button>

                <button
                    id="applyDataPacksButton"
                    class="data-pack-apply"
                    type="button"
                >
                    套用並重新載入
                </button>
            </div>

            <p class="data-pack-note">
                變更資料包後需要重新載入頁面。
                自訂項目仍會由 custom-bridge.js 合併進百科。
            </p>

            <div
                id="dataPackList"
                class="data-pack-list"
                aria-live="polite"
            >
                <p class="data-pack-empty">
                    正在載入資料包清單……
                </p>
            </div>
        `;

        const projectsPanel =
            document.getElementById(
                "promptProjectsPanel"
            );

        const historyPanel =
            document.getElementById(
                "promptHistoryPanel"
            );

        if (projectsPanel) {
            projectsPanel.insertAdjacentElement(
                "beforebegin",
                panel
            );
        } else if (historyPanel) {
            historyPanel.insertAdjacentElement(
                "beforebegin",
                panel
            );
        } else {
            content.appendChild(panel);
        }
    }

    function bindStaticControls() {
        document
            .getElementById(
                "enableAllDataPacksButton"
            )
            ?.addEventListener("click", () => {
                state.enabledIds = new Set(
                    (state.manifest?.packs || [])
                        .map((pack) => pack.id)
                );

                render();
            });

        document
            .getElementById(
                "disableAllDataPacksButton"
            )
            ?.addEventListener("click", () => {
                state.enabledIds = new Set();
                render();
            });

        document
            .getElementById(
                "applyDataPacksButton"
            )
            ?.addEventListener("click", () => {
                localStorage.setItem(
                    SETTINGS_KEY,
                    JSON.stringify(
                        [...state.enabledIds]
                    )
                );

                showToast(
                    "資料包設定已保存，正在重新載入"
                );

                window.setTimeout(() => {
                    window.location.reload();
                }, 550);
            });
    }

    async function loadManifest() {
        const response = await fetch(
            "./data/packs/manifest.json",
            { cache: "no-cache" }
        );

        if (!response.ok) {
            throw new Error(
                `manifest.json HTTP ${response.status}`
            );
        }

        state.manifest = await response.json();

        if (
            !state.manifest ||
            !Array.isArray(state.manifest.packs)
        ) {
            throw new Error(
                "manifest.json 格式不正確"
            );
        }

        state.enabledIds =
            readEnabledIds(state.manifest);
    }

    async function loadCurrentItemCount() {
        const response = await fetch(
            "./data/items.json"
        );

        if (!response.ok) {
            return;
        }

        const items = await response.json();

        state.currentItemCount =
            Array.isArray(items)
                ? items.length
                : 0;
    }

    function readEnabledIds(manifest) {
        try {
            const stored = JSON.parse(
                localStorage.getItem(SETTINGS_KEY)
            );

            if (Array.isArray(stored)) {
                return new Set(stored);
            }
        } catch {
            // Ignore invalid settings.
        }

        return new Set(
            manifest.packs
                .filter((pack) =>
                    pack.default_enabled
                )
                .map((pack) => pack.id)
        );
    }

    function render() {
        const packs =
            state.manifest?.packs || [];

        setText(
            "dataPackCurrentCount",
            String(state.currentItemCount)
        );

        setText(
            "dataPackEnabledCount",
            String(state.enabledIds.size)
        );

        setText(
            "dataPackAvailableCount",
            String(packs.length)
        );

        const container =
            document.getElementById(
                "dataPackList"
            );

        if (!container) {
            return;
        }

        if (!packs.length) {
            container.innerHTML = `
                <p class="data-pack-empty">
                    尚未建立任何資料包。
                </p>
            `;

            return;
        }

        container.innerHTML = packs
            .map((pack) => {
                const enabled =
                    state.enabledIds.has(pack.id);

                return `
                    <article
                        class="data-pack-card
                            ${enabled ? "enabled" : ""}"
                    >
                        <div class="data-pack-card-heading">
                            <div>
                                <span class="data-pack-icon">
                                    ${escapeHtml(
                                        pack.icon || "📦"
                                    )}
                                </span>

                                <div>
                                    <h3>
                                        ${escapeHtml(
                                            pack.name_zh ||
                                            pack.id
                                        )}
                                    </h3>

                                    <p>
                                        ${escapeHtml(
                                            pack.name_en || ""
                                        )}
                                    </p>
                                </div>
                            </div>

                            <label
                                class="data-pack-switch"
                            >
                                <input
                                    type="checkbox"
                                    data-pack-toggle="
                                        ${escapeAttribute(pack.id)}
                                    "
                                    ${enabled ? "checked" : ""}
                                >

                                <span></span>
                            </label>
                        </div>

                        <p class="data-pack-description">
                            ${escapeHtml(
                                pack.description_zh || ""
                            )}
                        </p>

                        <div class="data-pack-meta">
                            <span>
                                ${Number(
                                    pack.item_count || 0
                                )} 筆
                            </span>

                            <span>
                                ${escapeHtml(
                                    pack.version || "1.0.0"
                                )}
                            </span>

                            <span>
                                ${escapeHtml(
                                    (pack.categories || [])
                                        .join(" · ")
                                )}
                            </span>
                        </div>
                    </article>
                `;
            })
            .join("");

        container
            .querySelectorAll(
                "[data-pack-toggle]"
            )
            .forEach((input) => {
                input.addEventListener(
                    "change",
                    () => {
                        const id =
                            input.dataset.packToggle
                                ?.trim();

                        if (!id) {
                            return;
                        }

                        if (input.checked) {
                            state.enabledIds.add(id);
                        } else {
                            state.enabledIds.delete(id);
                        }

                        render();
                    }
                );
            });
    }

    function renderError(message) {
        const container =
            document.getElementById(
                "dataPackList"
            );

        if (!container) {
            return;
        }

        container.innerHTML = `
            <p class="data-pack-empty error">
                資料包載入失敗：
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
                    "[data-packs-nav]"
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
            button.dataset.packsNav = "true";
            button.innerHTML =
                "<span>📦</span><span>資料包</span>";

            button.addEventListener(
                "click",
                () => {
                    document
                        .getElementById(
                            "dataPackPanel"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                }
            );

            container.appendChild(button);
        }, 1300);
    }

    function setText(id, text) {
        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = text;
        }
    }

    function showToast(message) {
        let toast =
            document.getElementById(
                "dataPackToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "dataPackToast";
            toast.className =
                "data-pack-toast";

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
