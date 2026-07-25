// ======================================
// 2Y Prompt Project Manager
// Version: v1.8.0
// ======================================

(() => {
    const STORAGE_KEY = "2y-prompt-projects-v1";
    const MAX_PROJECTS = 60;
    const MAX_ENTRIES_PER_PROJECT = 50;

    const SOURCE_MAP = {
        builder: {
            label: "Prompt Builder",
            promptId: "builderPromptOutput",
            negativeId: "builderNegativeOutput",
            platformId: "builderPlatform"
        },
        random: {
            label: "隨機穿搭",
            promptId: "randomPromptOutput",
            negativeId: "randomNegativeOutput",
            platformId: "randomPlatform"
        },
        parameter: {
            label: "參數實驗室",
            promptId: "parameterPrompt",
            negativeId: "parameterNegative",
            platformId: "parameterPlatform"
        },
        auditor: {
            label: "品質檢查器",
            promptId: "auditorCleanOutput",
            negativeId: "auditorCleanNegativeOutput",
            platformId: "auditorPlatform"
        }
    };

    const state = {
        editingProjectId: null,
        selectedProjectId: null,
        search: "",
        tagFilter: "all",
        pinnedOnly: false
    };

    document.addEventListener("DOMContentLoaded", () => {
        createPanel();
        bindControls();
        restoreUiState();
        renderAll();
        addNavigationButton();
    });

    function createPanel() {
        if (document.getElementById("promptProjectsPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "promptProjectsPanel";
        panel.className = "projects-panel app-section-target";
        panel.innerHTML = `
            <div class="projects-heading">
                <div>
                    <p class="projects-eyebrow">PROMPT PROJECT WORKSPACE</p>
                    <h2>角色造型專案管理</h2>
                    <p>
                        把角色設定、穿搭方向、平台 Prompt、Negative Prompt
                        與備註整理成可長期保存的專案。
                    </p>
                </div>
                <span class="projects-version">v1.8.0</span>
            </div>

            <div class="projects-layout">
                <aside class="projects-sidebar">
                    <form id="projectForm" class="project-form">
                        <h3 id="projectFormTitle">建立新專案</h3>

                        <label>
                            <span>專案名稱 *</span>
                            <input id="projectName" maxlength="80" required
                                placeholder="例如：紫綠魔法學院角色">
                        </label>

                        <label>
                            <span>角色名稱</span>
                            <input id="projectCharacter" maxlength="80"
                                placeholder="角色或模特名稱">
                        </label>

                        <label>
                            <span>主題／風格</span>
                            <input id="projectTheme" maxlength="120"
                                placeholder="例如：gothic academy, neon fantasy">
                        </label>

                        <label>
                            <span>用途</span>
                            <select id="projectPurpose">
                                <option value="角色立繪">角色立繪</option>
                                <option value="服裝設定圖">服裝設定圖</option>
                                <option value="卡牌插畫">卡牌插畫</option>
                                <option value="社群頭像">社群頭像</option>
                                <option value="時裝目錄">時裝目錄</option>
                                <option value="桌布">桌布</option>
                                <option value="其他">其他</option>
                            </select>
                        </label>

                        <label>
                            <span>標籤（逗號分隔）</span>
                            <input id="projectTags"
                                placeholder="purple, green, gothic">
                        </label>

                        <label>
                            <span>專案備註</span>
                            <textarea id="projectNotes" rows="5"
                                placeholder="角色背景、服裝規則、禁用元素、待修改項目……"></textarea>
                        </label>

                        <div class="project-form-actions">
                            <button id="projectSaveButton" type="submit">
                                建立專案
                            </button>
                            <button id="projectCancelEditButton"
                                class="projects-secondary" type="button" hidden>
                                取消編輯
                            </button>
                        </div>
                    </form>

                    <div class="projects-import-export">
                        <button id="exportAllProjectsButton"
                            class="projects-secondary" type="button">
                            匯出全部 JSON
                        </button>

                        <label class="projects-import-button">
                            匯入專案 JSON
                            <input id="importProjectsInput" type="file"
                                accept=".json,application/json" hidden>
                        </label>
                    </div>
                </aside>

                <div class="projects-workspace">
                    <div class="projects-toolbar">
                        <label class="projects-search-field">
                            <span>搜尋專案</span>
                            <input id="projectsSearch" type="search"
                                placeholder="搜尋名稱、角色、主題、標籤">
                        </label>

                        <label class="projects-filter-field">
                            <span>標籤</span>
                            <select id="projectsTagFilter">
                                <option value="all">全部標籤</option>
                            </select>
                        </label>

                        <label class="projects-pin-filter">
                            <input id="projectsPinnedOnly" type="checkbox">
                            <span>只看置頂</span>
                        </label>
                    </div>

                    <div class="projects-summary">
                        <span id="projectsCount">0 個專案</span>
                        <small>最多保存 ${MAX_PROJECTS} 個專案</small>
                    </div>

                    <div id="projectsList" class="projects-list">
                        <p class="projects-empty">尚未建立專案。</p>
                    </div>

                    <div id="projectDetail" class="project-detail">
                        <p class="projects-empty">
                            選擇一個專案後，可加入目前頁面的 Prompt。
                        </p>
                    </div>
                </div>
            </div>
        `;

        const historyPanel = document.getElementById("promptHistoryPanel");

        if (historyPanel) {
            historyPanel.insertAdjacentElement("beforebegin", panel);
        } else {
            content.appendChild(panel);
        }
    }

    function bindControls() {
        document.getElementById("projectForm")
            ?.addEventListener("submit", saveProject);

        document.getElementById("projectCancelEditButton")
            ?.addEventListener("click", resetForm);

        document.getElementById("projectsSearch")
            ?.addEventListener("input", (event) => {
                state.search = event.target.value.trim().toLowerCase();
                persistUiState();
                renderProjects();
            });

        document.getElementById("projectsTagFilter")
            ?.addEventListener("change", (event) => {
                state.tagFilter = event.target.value;
                persistUiState();
                renderProjects();
            });

        document.getElementById("projectsPinnedOnly")
            ?.addEventListener("change", (event) => {
                state.pinnedOnly = event.target.checked;
                persistUiState();
                renderProjects();
            });

        document.getElementById("exportAllProjectsButton")
            ?.addEventListener("click", exportAllProjects);

        document.getElementById("importProjectsInput")
            ?.addEventListener("change", importProjects);
    }

    function saveProject(event) {
        event.preventDefault();

        const name = value("projectName");
        if (!name) return;

        const projects = getProjects();
        const now = new Date().toISOString();

        const project = {
            id: state.editingProjectId ||
                `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            character: value("projectCharacter"),
            theme: value("projectTheme"),
            purpose: value("projectPurpose") || "其他",
            tags: parseTags(value("projectTags")),
            notes: value("projectNotes"),
            pinned: false,
            entries: [],
            createdAt: now,
            updatedAt: now
        };

        const index = projects.findIndex((item) => item.id === project.id);

        if (index >= 0) {
            project.pinned = projects[index].pinned;
            project.entries = projects[index].entries || [];
            project.createdAt = projects[index].createdAt || now;
            projects[index] = project;
        } else {
            if (projects.length >= MAX_PROJECTS) {
                showToast(`最多保存 ${MAX_PROJECTS} 個專案`);
                return;
            }
            projects.unshift(project);
        }

        setProjects(projects);
        state.selectedProjectId = project.id;
        resetForm();
        renderAll();
        showToast(index >= 0 ? "專案已更新" : "專案已建立");
    }

    function renderAll() {
        renderTagFilter();
        renderProjects();
        renderProjectDetail();
    }

    function renderProjects() {
        const list = document.getElementById("projectsList");
        const count = document.getElementById("projectsCount");
        if (!list) return;

        const projects = getProjects();
        const filtered = projects.filter((project) => {
            const text = [
                project.name,
                project.character,
                project.theme,
                project.purpose,
                ...(project.tags || []),
                project.notes
            ].join(" ").toLowerCase();

            const searchMatches = !state.search || text.includes(state.search);
            const tagMatches =
                state.tagFilter === "all" ||
                (project.tags || []).includes(state.tagFilter);
            const pinMatches = !state.pinnedOnly || project.pinned;

            return searchMatches && tagMatches && pinMatches;
        });

        filtered.sort((a, b) =>
            Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
            String(b.updatedAt).localeCompare(String(a.updatedAt))
        );

        if (count) {
            count.textContent = `${projects.length} 個專案`;
        }

        if (!filtered.length) {
            list.innerHTML = `
                <p class="projects-empty">
                    ${projects.length ? "找不到符合條件的專案。" : "尚未建立專案。"}
                </p>
            `;
            return;
        }

        list.innerHTML = filtered.map((project) => `
            <article class="project-card
                ${project.id === state.selectedProjectId ? "selected" : ""}
                ${project.pinned ? "pinned" : ""}">
                <button type="button" class="project-card-main"
                    data-project-select="${escapeAttribute(project.id)}">
                    <span class="project-card-title">
                        ${project.pinned ? "📌 " : ""}
                        ${escapeHtml(project.name)}
                    </span>
                    <span class="project-card-meta">
                        ${escapeHtml(project.character || "未設定角色")}
                        · ${escapeHtml(project.purpose || "其他")}
                        · ${(project.entries || []).length} 筆 Prompt
                    </span>
                    <span class="project-card-tags">
                        ${(project.tags || []).slice(0, 4).map((tag) =>
                            `<em>${escapeHtml(tag)}</em>`
                        ).join("")}
                    </span>
                </button>

                <div class="project-card-actions">
                    <button type="button"
                        data-project-pin="${escapeAttribute(project.id)}"
                        title="${project.pinned ? "取消置頂" : "置頂"}">
                        ${project.pinned ? "📍" : "📌"}
                    </button>
                    <button type="button"
                        data-project-edit="${escapeAttribute(project.id)}">
                        編輯
                    </button>
                    <button type="button"
                        data-project-duplicate="${escapeAttribute(project.id)}">
                        複製
                    </button>
                </div>
            </article>
        `).join("");

        list.querySelectorAll("[data-project-select]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedProjectId = button.dataset.projectSelect;
                persistUiState();
                renderProjects();
                renderProjectDetail();
            });
        });

        list.querySelectorAll("[data-project-pin]").forEach((button) => {
            button.addEventListener("click", () => {
                togglePin(button.dataset.projectPin);
            });
        });

        list.querySelectorAll("[data-project-edit]").forEach((button) => {
            button.addEventListener("click", () => {
                editProject(button.dataset.projectEdit);
            });
        });

        list.querySelectorAll("[data-project-duplicate]").forEach((button) => {
            button.addEventListener("click", () => {
                duplicateProject(button.dataset.projectDuplicate);
            });
        });
    }

    function renderProjectDetail() {
        const container = document.getElementById("projectDetail");
        if (!container) return;

        const project = getProjects().find(
            (item) => item.id === state.selectedProjectId
        );

        if (!project) {
            container.innerHTML = `
                <p class="projects-empty">
                    選擇一個專案後，可加入目前頁面的 Prompt。
                </p>
            `;
            return;
        }

        const entries = [...(project.entries || [])]
            .sort((a, b) =>
                String(b.createdAt).localeCompare(String(a.createdAt))
            );

        container.innerHTML = `
            <div class="project-detail-heading">
                <div>
                    <p class="project-detail-kicker">SELECTED PROJECT</p>
                    <h3>${escapeHtml(project.name)}</h3>
                    <p>
                        ${escapeHtml(project.character || "未設定角色")}
                        · ${escapeHtml(project.theme || "未設定主題")}
                        · ${escapeHtml(project.purpose || "其他")}
                    </p>
                </div>

                <div class="project-detail-actions">
                    <button type="button" data-project-export="${escapeAttribute(project.id)}">
                        匯出此專案
                    </button>
                    <button type="button" class="project-delete-button"
                        data-project-delete="${escapeAttribute(project.id)}">
                        刪除專案
                    </button>
                </div>
            </div>

            ${project.notes ? `
                <div class="project-notes">
                    <strong>備註</strong>
                    <p>${escapeHtml(project.notes)}</p>
                </div>
            ` : ""}

            <div class="project-capture-panel">
                <h4>加入目前 Prompt</h4>
                <div class="project-capture-actions">
                    <button type="button" data-project-capture="builder">
                        ＋ Prompt Builder
                    </button>
                    <button type="button" data-project-capture="random">
                        ＋ 隨機穿搭
                    </button>
                    <button type="button" data-project-capture="parameter">
                        ＋ 參數實驗室
                    </button>
                    <button type="button" data-project-capture="auditor">
                        ＋ 品質檢查器
                    </button>
                    <button type="button" data-project-capture="platform">
                        ＋ 多平台轉換器
                    </button>
                </div>
            </div>

            <div class="project-brief-actions">
                <button type="button" data-project-copy-brief="${escapeAttribute(project.id)}">
                    📋 複製專案摘要
                </button>
                <button type="button" data-project-copy-prompts="${escapeAttribute(project.id)}">
                    📋 複製全部 Prompt
                </button>
            </div>

            <div class="project-entry-summary">
                <h4>Prompt 紀錄</h4>
                <span>${entries.length} / ${MAX_ENTRIES_PER_PROJECT}</span>
            </div>

            <div class="project-entries">
                ${entries.length ? entries.map((entry) => `
                    <article class="project-entry-card">
                        <div class="project-entry-heading">
                            <div>
                                <span>${escapeHtml(entry.source)}</span>
                                <em>${escapeHtml(entry.platform)}</em>
                            </div>
                            <time datetime="${escapeAttribute(entry.createdAt)}">
                                ${escapeHtml(formatDate(entry.createdAt))}
                            </time>
                        </div>

                        <p>${escapeHtml(entry.prompt)}</p>

                        ${entry.negative ? `
                            <details>
                                <summary>查看 Negative Prompt</summary>
                                <p>${escapeHtml(entry.negative)}</p>
                            </details>
                        ` : ""}

                        <div class="project-entry-actions">
                            <button type="button"
                                data-entry-copy="${escapeAttribute(entry.id)}">
                                📋 複製
                            </button>
                            <button type="button"
                                data-entry-delete="${escapeAttribute(entry.id)}"
                                class="project-entry-delete">
                                刪除
                            </button>
                        </div>
                    </article>
                `).join("") : `
                    <p class="projects-empty">此專案尚未加入 Prompt。</p>
                `}
            </div>
        `;

        bindDetailActions(project);
    }

    function bindDetailActions(project) {
        const container = document.getElementById("projectDetail");
        if (!container) return;

        container.querySelectorAll("[data-project-capture]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    capturePrompt(button.dataset.projectCapture);
                });
            });

        container.querySelector("[data-project-export]")
            ?.addEventListener("click", () => {
                exportSingleProject(project.id);
            });

        container.querySelector("[data-project-delete]")
            ?.addEventListener("click", () => {
                deleteProject(project.id);
            });

        container.querySelector("[data-project-copy-brief]")
            ?.addEventListener("click", () => {
                copyText(buildProjectBrief(project), "專案摘要已複製");
            });

        container.querySelector("[data-project-copy-prompts]")
            ?.addEventListener("click", () => {
                copyText(buildAllPrompts(project), "全部 Prompt 已複製");
            });

        container.querySelectorAll("[data-entry-copy]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const entry = (project.entries || []).find(
                        (item) => item.id === button.dataset.entryCopy
                    );
                    if (entry) copyText(entry.prompt, "Prompt 已複製");
                });
            });

        container.querySelectorAll("[data-entry-delete]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    deleteEntry(project.id, button.dataset.entryDelete);
                });
            });
    }

    function capturePrompt(sourceKey) {
        const project = getProjects().find(
            (item) => item.id === state.selectedProjectId
        );

        if (!project) return;

        if ((project.entries || []).length >= MAX_ENTRIES_PER_PROJECT) {
            showToast(`每個專案最多 ${MAX_ENTRIES_PER_PROJECT} 筆 Prompt`);
            return;
        }

        let payload;

        if (sourceKey === "platform") {
            payload = readPlatformConverter();
        } else {
            payload = readSource(SOURCE_MAP[sourceKey]);
        }

        if (!payload?.prompt) {
            showToast("目前功能沒有可加入的 Prompt");
            return;
        }

        const projects = getProjects();
        const index = projects.findIndex((item) => item.id === project.id);
        if (index < 0) return;

        const duplicate = (projects[index].entries || []).find((entry) =>
            entry.prompt === payload.prompt &&
            entry.source === payload.source &&
            entry.platform === payload.platform
        );

        if (duplicate) {
            showToast("此 Prompt 已存在於專案");
            return;
        }

        const entry = {
            id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ...payload,
            createdAt: new Date().toISOString()
        };

        projects[index].entries = [
            ...(projects[index].entries || []),
            entry
        ];
        projects[index].updatedAt = new Date().toISOString();

        setProjects(projects);
        renderAll();
        showToast(`已加入 ${payload.source}`);
    }

    function readSource(config) {
        if (!config) return null;

        const prompt = document.getElementById(config.promptId)
            ?.value.trim() || "";

        if (!prompt) return null;

        const platformValue =
            document.getElementById(config.platformId)?.value || "";

        return {
            source: config.label,
            platform: formatPlatform(platformValue),
            prompt,
            negative:
                document.getElementById(config.negativeId)?.value.trim() || ""
        };
    }

    function readPlatformConverter() {
        const keys = ["pixai", "niji", "tensorart", "gpt"];
        const key = keys.find((platform) =>
            document.getElementById(`platformOutput_${platform}`)
                ?.value.trim()
        );

        if (!key) return null;

        return {
            source: "多平台轉換器",
            platform: formatPlatform(key),
            prompt:
                document.getElementById(`platformOutput_${key}`)
                    ?.value.trim() || "",
            negative:
                document.getElementById("platformNegativePrompt")
                    ?.value.trim() || ""
        };
    }

    function editProject(id) {
        const project = getProjects().find((item) => item.id === id);
        if (!project) return;

        state.editingProjectId = id;
        setValue("projectName", project.name);
        setValue("projectCharacter", project.character || "");
        setValue("projectTheme", project.theme || "");
        setValue("projectPurpose", project.purpose || "其他");
        setValue("projectTags", (project.tags || []).join(", "));
        setValue("projectNotes", project.notes || "");

        setText("projectFormTitle", "編輯專案");
        setText("projectSaveButton", "更新專案");
        document.getElementById("projectCancelEditButton").hidden = false;

        document.getElementById("projectForm")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function resetForm() {
        state.editingProjectId = null;
        document.getElementById("projectForm")?.reset();
        setValue("projectPurpose", "角色立繪");
        setText("projectFormTitle", "建立新專案");
        setText("projectSaveButton", "建立專案");
        document.getElementById("projectCancelEditButton").hidden = true;
    }

    function togglePin(id) {
        const projects = getProjects();
        const project = projects.find((item) => item.id === id);
        if (!project) return;

        project.pinned = !project.pinned;
        project.updatedAt = new Date().toISOString();

        setProjects(projects);
        renderAll();
        showToast(project.pinned ? "專案已置頂" : "已取消置頂");
    }

    function duplicateProject(id) {
        const projects = getProjects();
        const original = projects.find((item) => item.id === id);
        if (!original) return;

        if (projects.length >= MAX_PROJECTS) {
            showToast(`最多保存 ${MAX_PROJECTS} 個專案`);
            return;
        }

        const now = new Date().toISOString();
        const copy = {
            ...structuredCloneSafe(original),
            id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `${original.name}（副本）`,
            pinned: false,
            createdAt: now,
            updatedAt: now,
            entries: (original.entries || []).map((entry) => ({
                ...entry,
                id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            }))
        };

        projects.unshift(copy);
        setProjects(projects);
        state.selectedProjectId = copy.id;
        renderAll();
        showToast("專案副本已建立");
    }

    function deleteProject(id) {
        const project = getProjects().find((item) => item.id === id);
        if (!project) return;

        if (!window.confirm(`確定刪除「${project.name}」？`)) return;

        setProjects(getProjects().filter((item) => item.id !== id));

        if (state.selectedProjectId === id) {
            state.selectedProjectId = null;
        }

        if (state.editingProjectId === id) {
            resetForm();
        }

        renderAll();
        showToast("專案已刪除");
    }

    function deleteEntry(projectId, entryId) {
        const projects = getProjects();
        const project = projects.find((item) => item.id === projectId);
        if (!project) return;

        project.entries = (project.entries || []).filter(
            (entry) => entry.id !== entryId
        );
        project.updatedAt = new Date().toISOString();

        setProjects(projects);
        renderAll();
        showToast("Prompt 紀錄已刪除");
    }

    function buildProjectBrief(project) {
        return [
            `專案名稱：${project.name}`,
            `角色名稱：${project.character || "未設定"}`,
            `主題／風格：${project.theme || "未設定"}`,
            `用途：${project.purpose || "其他"}`,
            `標籤：${(project.tags || []).join(", ") || "無"}`,
            `備註：${project.notes || "無"}`,
            `Prompt 數量：${(project.entries || []).length}`
        ].join("\n");
    }

    function buildAllPrompts(project) {
        const entries = project.entries || [];

        if (!entries.length) {
            return buildProjectBrief(project);
        }

        return [
            buildProjectBrief(project),
            "",
            ...entries.map((entry, index) => [
                `=== PROMPT ${index + 1} · ${entry.source} · ${entry.platform} ===`,
                entry.prompt,
                entry.negative
                    ? `Negative Prompt:\n${entry.negative}`
                    : ""
            ].filter(Boolean).join("\n"))
        ].join("\n\n");
    }

    function exportSingleProject(id) {
        const project = getProjects().find((item) => item.id === id);
        if (!project) return;

        downloadJson(
            {
                version: 1,
                exportedAt: new Date().toISOString(),
                projects: [project]
            },
            `2Y-project-${safeFilename(project.name)}.json`
        );
    }

    function exportAllProjects() {
        const projects = getProjects();

        if (!projects.length) {
            showToast("目前沒有專案可匯出");
            return;
        }

        downloadJson(
            {
                version: 1,
                exportedAt: new Date().toISOString(),
                projects
            },
            `2Y-prompt-projects-${new Date().toISOString().slice(0, 10)}.json`
        );
    }

    async function importProjects(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        try {
            const parsed = JSON.parse(await file.text());
            const incoming = Array.isArray(parsed)
                ? parsed
                : parsed.projects;

            if (!Array.isArray(incoming)) {
                throw new Error("JSON 不包含 projects 陣列");
            }

            const valid = incoming
                .filter((project) =>
                    project &&
                    typeof project.name === "string" &&
                    project.name.trim()
                )
                .map(normalizeImportedProject);

            const merged = new Map(
                getProjects().map((project) => [project.id, project])
            );

            valid.forEach((project) => merged.set(project.id, project));

            const result = [...merged.values()]
                .sort((a, b) =>
                    String(b.updatedAt).localeCompare(String(a.updatedAt))
                )
                .slice(0, MAX_PROJECTS);

            setProjects(result);
            renderAll();
            showToast(`已匯入 ${valid.length} 個專案`);
        } catch (error) {
            alert(`匯入失敗：${error.message}`);
        }
    }

    function normalizeImportedProject(project) {
        const now = new Date().toISOString();

        return {
            id: typeof project.id === "string"
                ? project.id
                : `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: project.name.trim(),
            character: String(project.character || ""),
            theme: String(project.theme || ""),
            purpose: String(project.purpose || "其他"),
            tags: Array.isArray(project.tags)
                ? project.tags.map(String)
                : [],
            notes: String(project.notes || ""),
            pinned: Boolean(project.pinned),
            entries: Array.isArray(project.entries)
                ? project.entries.slice(0, MAX_ENTRIES_PER_PROJECT).map(
                    (entry) => ({
                        id: typeof entry.id === "string"
                            ? entry.id
                            : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        source: String(entry.source || "其他"),
                        platform: String(entry.platform || "未指定"),
                        prompt: String(entry.prompt || ""),
                        negative: String(entry.negative || ""),
                        createdAt: entry.createdAt || now
                    })
                )
                : [],
            createdAt: project.createdAt || now,
            updatedAt: project.updatedAt || now
        };
    }

    function renderTagFilter() {
        const select = document.getElementById("projectsTagFilter");
        if (!select) return;

        const tags = [...new Set(
            getProjects().flatMap((project) => project.tags || [])
        )].sort((a, b) => a.localeCompare(b, "zh-Hant"));

        select.innerHTML = `
            <option value="all">全部標籤</option>
            ${tags.map((tag) => `
                <option value="${escapeAttribute(tag)}">
                    ${escapeHtml(tag)}
                </option>
            `).join("")}
        `;

        if (tags.includes(state.tagFilter)) {
            select.value = state.tagFilter;
        } else {
            state.tagFilter = "all";
            select.value = "all";
        }
    }

    function addNavigationButton() {
        window.setTimeout(() => {
            const container = document.getElementById("sectionNavLinks");

            if (
                !container ||
                container.querySelector("[data-projects-nav]")
            ) {
                return;
            }

            const button = document.createElement("button");
            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.projectsNav = "true";
            button.innerHTML = "<span>📁</span><span>專案</span>";

            button.addEventListener("click", () => {
                document.getElementById("promptProjectsPanel")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

            container.appendChild(button);
        }, 1200);
    }

    function getProjects() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function setProjects(projects) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }

    function restoreUiState() {
        try {
            const value = JSON.parse(
                sessionStorage.getItem(`${STORAGE_KEY}-ui`)
            );

            if (!value) return;

            state.selectedProjectId = value.selectedProjectId || null;
            state.search = value.search || "";
            state.tagFilter = value.tagFilter || "all";
            state.pinnedOnly = Boolean(value.pinnedOnly);

            setValue("projectsSearch", state.search);

            const checkbox =
                document.getElementById("projectsPinnedOnly");

            if (checkbox) checkbox.checked = state.pinnedOnly;
        } catch {}
    }

    function persistUiState() {
        sessionStorage.setItem(
            `${STORAGE_KEY}-ui`,
            JSON.stringify({
                selectedProjectId: state.selectedProjectId,
                search: state.search,
                tagFilter: state.tagFilter,
                pinnedOnly: state.pinnedOnly
            })
        );
    }

    function parseTags(text) {
        return [...new Set(
            text.split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
        )];
    }

    function formatPlatform(value) {
        const labels = {
            pixai: "PixAI",
            niji: "Niji Journey",
            tensorart: "TensorArt",
            gpt: "GPT Image",
            generic: "通用"
        };

        return labels[value] || "未指定";
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return new Intl.DateTimeFormat("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function downloadJson(data, filename) {
        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function safeFilename(value) {
        return String(value)
            .replace(/[\\/:*?"<>|]+/g, "-")
            .replace(/\s+/g, "-")
            .slice(0, 60);
    }

    function structuredCloneSafe(value) {
        if (typeof structuredClone === "function") {
            return structuredClone(value);
        }

        return JSON.parse(JSON.stringify(value));
    }

    async function copyText(text, message) {
        if (!text) {
            showToast("目前沒有可複製的內容");
            return;
        }

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
        let toast = document.getElementById("projectsToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "projectsToast";
            toast.className = "projects-toast";
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
