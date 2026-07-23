// ======================================
// 2Y Custom Item Editor
// Version: v0.8.0
// ======================================

(() => {
    const STORAGE_KEY = "2y-custom-items-v1";
    let categories = [];
    let editingId = null;

    document.addEventListener("DOMContentLoaded", async () => {
        ensurePanel();
        bindControls();
        await loadCategories();
        renderCustomItems();
    });

    function ensurePanel() {
        if (document.getElementById("customItemPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "customItemPanel";
        panel.className = "custom-item-panel";
        panel.innerHTML = `
            <div class="custom-heading">
                <div>
                    <p class="custom-eyebrow">UNLIMITED LIBRARY</p>
                    <h2>自訂百科項目</h2>
                    <p>把新的服飾、姿勢、背景、鏡頭或提示詞存進此裝置。</p>
                </div>
                <span class="custom-badge">v0.8.0</span>
            </div>

            <form id="customItemForm" class="custom-form">
                <div class="custom-grid">
                    <label>
                        <span>分類 *</span>
                        <select id="customCategory" required>
                            <option value="">載入中……</option>
                        </select>
                    </label>

                    <label>
                        <span>適用 *</span>
                        <select id="customGender" required>
                            <option value="unisex">男女皆可</option>
                            <option value="female">女裝</option>
                            <option value="male">男裝</option>
                            <option value="none">通用元素</option>
                        </select>
                    </label>

                    <label>
                        <span>中文名稱 *</span>
                        <input id="customNameZh" required maxlength="80">
                    </label>

                    <label>
                        <span>英文名稱 *</span>
                        <input id="customNameEn" required maxlength="120">
                    </label>

                    <label class="custom-wide">
                        <span>中文詳細說明 *</span>
                        <textarea id="customDescriptionZh" rows="3" required></textarea>
                    </label>

                    <label class="custom-wide">
                        <span>英文詳細說明 *</span>
                        <textarea id="customDescriptionEn" rows="3" required></textarea>
                    </label>

                    <label>
                        <span>材質</span>
                        <input id="customMaterial" placeholder="heavyweight cotton">
                    </label>

                    <label>
                        <span>版型／輪廓</span>
                        <input id="customFit" placeholder="oversized">
                    </label>

                    <label>
                        <span>袖型／結構</span>
                        <input id="customSleeve" placeholder="bishop sleeves">
                    </label>

                    <label>
                        <span>長度</span>
                        <input id="customLength" placeholder="hip length">
                    </label>

                    <label>
                        <span>顏色</span>
                        <input id="customColor" placeholder="neon purple and green">
                    </label>

                    <label>
                        <span>風格</span>
                        <input id="customStyle" placeholder="cyberpunk, gothic">
                    </label>

                    <label class="custom-wide">
                        <span>標籤（逗號分隔）</span>
                        <input id="customTags" placeholder="hoodie, streetwear, cotton">
                    </label>

                    <label class="custom-wide">
                        <span>PixAI Prompt</span>
                        <textarea id="customPixai" rows="3" placeholder="留空時會依英文說明自動產生"></textarea>
                    </label>

                    <label class="custom-wide">
                        <span>Niji Prompt</span>
                        <textarea id="customNiji" rows="3" placeholder="留空時會依英文說明自動產生"></textarea>
                    </label>

                    <label class="custom-wide">
                        <span>TensorArt Prompt</span>
                        <textarea id="customTensorart" rows="3" placeholder="留空時會依英文說明自動產生"></textarea>
                    </label>

                    <label class="custom-wide">
                        <span>GPT Image Prompt</span>
                        <textarea id="customGpt" rows="3" placeholder="留空時會依英文說明自動產生"></textarea>
                    </label>

                    <label class="custom-wide">
                        <span>Negative Prompt</span>
                        <textarea id="customNegative" rows="3">logo, text, watermark, malformed clothing, broken garment structure</textarea>
                    </label>
                </div>

                <div class="custom-actions">
                    <button id="customSaveButton" type="submit">儲存自訂項目</button>
                    <button id="customCancelButton" type="button" class="custom-secondary" hidden>取消編輯</button>
                    <button id="customExportButton" type="button" class="custom-secondary">匯出自訂 JSON</button>
                    <label class="custom-import-button">
                        匯入自訂 JSON
                        <input id="customImportInput" type="file" accept=".json,application/json" hidden>
                    </label>
                </div>
            </form>

            <div class="custom-list-heading">
                <h3>已儲存項目</h3>
                <span id="customCount">0</span>
            </div>

            <div id="customItemList" class="custom-item-list">
                <p class="custom-empty">尚未建立自訂項目。</p>
            </div>
        `;

        content.appendChild(panel);
    }

    function bindControls() {
        document.getElementById("customItemForm")?.addEventListener("submit", saveItem);
        document.getElementById("customCancelButton")?.addEventListener("click", resetForm);
        document.getElementById("customExportButton")?.addEventListener("click", exportItems);
        document.getElementById("customImportInput")?.addEventListener("change", importItems);
    }

    async function loadCategories() {
        try {
            const response = await fetch("./data/categories.json");
            if (!response.ok) throw new Error("分類載入失敗");
            categories = await response.json();

            const select = document.getElementById("customCategory");
            select.innerHTML = `
                <option value="">請選擇分類</option>
                ${categories.map(category => `
                    <option value="${escapeAttribute(category.id)}">
                        ${escapeHtml(category.icon)} ${escapeHtml(category.name_zh)}
                    </option>
                `).join("")}
            `;
        } catch (error) {
            console.error(error);
        }
    }

    function getItems() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function setItems(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent("2y-custom-items-changed"));
    }

    function saveItem(event) {
        event.preventDefault();

        const nameZh = value("customNameZh");
        const nameEn = value("customNameEn");
        const descriptionZh = value("customDescriptionZh");
        const descriptionEn = value("customDescriptionEn");
        const category = value("customCategory");
        const gender = value("customGender");

        const anatomy = cleanObject({
            material: value("customMaterial"),
            fit: value("customFit"),
            sleeve_or_structure: value("customSleeve"),
            length: value("customLength"),
            color: value("customColor"),
            style: value("customStyle")
        });

        const tags = value("customTags")
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);

        const base = descriptionEn.replace(/\.$/, "");
        const item = {
            id: editingId || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            category,
            name_zh: nameZh,
            name_en: nameEn,
            gender,
            description_zh: descriptionZh,
            description_en: descriptionEn,
            anatomy,
            tags,
            prompts: {
                pixai: value("customPixai") || `masterpiece, best quality, highly detailed, ${base}, detailed material texture, clean silhouette`,
                niji: value("customNiji") || `${base}, polished anime fashion design, refined details --niji 6`,
                tensorart: value("customTensorart") || `${base}, detailed construction, realistic material texture, high detail`,
                gpt: value("customGpt") || `Create an image featuring ${base}. Preserve the stated construction, fit, material, color, and decorative details.`
            },
            negative: value("customNegative"),
            custom: true,
            updated_at: new Date().toISOString()
        };

        const items = getItems();
        const index = items.findIndex(entry => entry.id === item.id);

        if (index >= 0) items[index] = item;
        else items.push(item);

        setItems(items);
        renderCustomItems();
        resetForm();
        toast(index >= 0 ? "自訂項目已更新" : "自訂項目已儲存");
    }

    function renderCustomItems() {
        const list = document.getElementById("customItemList");
        const count = document.getElementById("customCount");
        const items = getItems();

        if (count) count.textContent = String(items.length);
        if (!list) return;

        if (!items.length) {
            list.innerHTML = `<p class="custom-empty">尚未建立自訂項目。</p>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const category = categories.find(entry => entry.id === item.category);
            return `
                <article class="custom-saved-card">
                    <div>
                        <p>${escapeHtml(category?.icon || "✦")} ${escapeHtml(category?.name_zh || item.category)}</p>
                        <h4>${escapeHtml(item.name_zh)}</h4>
                        <small>${escapeHtml(item.name_en)}</small>
                    </div>
                    <div class="custom-card-actions">
                        <button type="button" data-edit="${escapeAttribute(item.id)}">編輯</button>
                        <button type="button" data-delete="${escapeAttribute(item.id)}" class="danger">刪除</button>
                    </div>
                </article>
            `;
        }).join("");

        list.querySelectorAll("[data-edit]").forEach(button => {
            button.addEventListener("click", () => editItem(button.dataset.edit));
        });

        list.querySelectorAll("[data-delete]").forEach(button => {
            button.addEventListener("click", () => deleteItem(button.dataset.delete));
        });
    }

    function editItem(id) {
        const item = getItems().find(entry => entry.id === id);
        if (!item) return;

        editingId = id;
        setValue("customCategory", item.category);
        setValue("customGender", item.gender);
        setValue("customNameZh", item.name_zh);
        setValue("customNameEn", item.name_en);
        setValue("customDescriptionZh", item.description_zh);
        setValue("customDescriptionEn", item.description_en);
        setValue("customMaterial", item.anatomy?.material || "");
        setValue("customFit", item.anatomy?.fit || "");
        setValue("customSleeve", item.anatomy?.sleeve_or_structure || "");
        setValue("customLength", item.anatomy?.length || "");
        setValue("customColor", item.anatomy?.color || "");
        setValue("customStyle", item.anatomy?.style || "");
        setValue("customTags", (item.tags || []).join(", "));
        setValue("customPixai", item.prompts?.pixai || "");
        setValue("customNiji", item.prompts?.niji || "");
        setValue("customTensorart", item.prompts?.tensorart || "");
        setValue("customGpt", item.prompts?.gpt || "");
        setValue("customNegative", item.negative || "");

        document.getElementById("customSaveButton").textContent = "更新自訂項目";
        document.getElementById("customCancelButton").hidden = false;
        document.getElementById("customItemPanel").scrollIntoView({behavior:"smooth"});
    }

    function deleteItem(id) {
        const items = getItems();
        const target = items.find(entry => entry.id === id);
        if (!target) return;

        if (!window.confirm(`確定刪除「${target.name_zh}」？`)) return;

        setItems(items.filter(entry => entry.id !== id));
        renderCustomItems();
        toast("自訂項目已刪除");
    }

    function resetForm() {
        editingId = null;
        document.getElementById("customItemForm")?.reset();
        setValue("customGender", "unisex");
        setValue("customNegative", "logo, text, watermark, malformed clothing, broken garment structure");
        document.getElementById("customSaveButton").textContent = "儲存自訂項目";
        document.getElementById("customCancelButton").hidden = true;
    }

    function exportItems() {
        const items = getItems();
        if (!items.length) {
            toast("目前沒有自訂項目可匯出");
            return;
        }

        const blob = new Blob(
            [JSON.stringify({version:1, items}, null, 2)],
            {type:"application/json"}
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `2Y-custom-items-${new Date().toISOString().slice(0,10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async function importItems(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        try {
            const parsed = JSON.parse(await file.text());
            const incoming = Array.isArray(parsed) ? parsed : parsed.items;

            if (!Array.isArray(incoming)) throw new Error("JSON 格式不正確");

            const valid = incoming.filter(item =>
                item &&
                typeof item.id === "string" &&
                typeof item.category === "string" &&
                typeof item.name_zh === "string" &&
                typeof item.name_en === "string" &&
                item.prompts &&
                typeof item.prompts === "object"
            );

            const map = new Map(getItems().map(item => [item.id, item]));
            valid.forEach(item => map.set(item.id, {...item, custom:true}));

            setItems([...map.values()]);
            renderCustomItems();
            toast(`已匯入 ${valid.length} 筆自訂項目`);
        } catch (error) {
            alert(`匯入失敗：${error.message}`);
        }
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, next) {
        const element = document.getElementById(id);
        if (element) element.value = next ?? "";
    }

    function cleanObject(object) {
        return Object.fromEntries(
            Object.entries(object).filter(([, value]) => value)
        );
    }

    function toast(message) {
        let element = document.getElementById("customToast");
        if (!element) {
            element = document.createElement("div");
            element.id = "customToast";
            element.className = "custom-toast";
            document.body.appendChild(element);
        }

        element.textContent = message;
        element.classList.add("show");
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => element.classList.remove("show"), 1800);
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
        return escapeHtml(value).replaceAll("\n", "&#10;").replaceAll("\r", "&#13;");
    }
})();
