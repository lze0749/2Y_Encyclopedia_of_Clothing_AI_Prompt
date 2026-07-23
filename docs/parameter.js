// ======================================
// 2Y Parameter Lab
// Version: v0.9.0
// ======================================

(() => {
    const STORAGE_KEY = "2y-parameter-lab-v1";
    let data = null;

    document.addEventListener("DOMContentLoaded", async () => {
        createPanel();
        bindStaticControls();
        await loadData();
        restoreState();
        generatePrompt();
    });

    function createPanel() {
        if (document.getElementById("parameterLabPanel")) return;

        const content = document.querySelector(".content");
        if (!content) return;

        const panel = document.createElement("section");
        panel.id = "parameterLabPanel";
        panel.className = "parameter-lab";
        panel.innerHTML = `
            <div class="parameter-heading">
                <div>
                    <p class="parameter-eyebrow">PARAMETERIZED FASHION</p>
                    <h2>參數化服飾實驗室</h2>
                    <p>用服裝結構、顏色、材質與風格組合出大量不同提示詞。</p>
                </div>
                <span class="parameter-badge">v0.9.0</span>
            </div>

            <div class="parameter-layout">
                <div id="parameterControls" class="parameter-controls">
                    <p class="parameter-loading">正在載入服飾參數……</p>
                </div>

                <div class="parameter-output-panel">
                    <div class="parameter-output-heading">
                        <h3>生成結果</h3>
                        <span id="combinationCount">可組合數量：計算中</span>
                    </div>

                    <label class="parameter-text-field">
                        <span>中文摘要</span>
                        <textarea id="parameterSummary" rows="4" readonly></textarea>
                    </label>

                    <label class="parameter-text-field">
                        <span>Prompt</span>
                        <textarea id="parameterPrompt" rows="9" readonly></textarea>
                    </label>

                    <div class="parameter-button-row">
                        <button id="parameterCopyButton" type="button">📋 複製 Prompt</button>
                        <button id="parameterRandomButton" type="button" class="parameter-secondary">🎲 隨機組合</button>
                        <button id="parameterResetButton" type="button" class="parameter-secondary">重設</button>
                    </div>

                    <label class="parameter-text-field">
                        <span>Negative Prompt</span>
                        <textarea id="parameterNegative" rows="4">logo, text, watermark, malformed clothing, broken garment structure, incoherent layers, missing garment details, duplicate accessories</textarea>
                    </label>

                    <button id="parameterCopyNegativeButton" type="button" class="parameter-negative-button">
                        📋 複製 Negative
                    </button>
                </div>
            </div>
        `;

        content.appendChild(panel);
    }

    function bindStaticControls() {
        document.getElementById("parameterCopyButton")?.addEventListener("click", () => {
            copyText(document.getElementById("parameterPrompt")?.value || "", "Prompt 已複製");
        });

        document.getElementById("parameterCopyNegativeButton")?.addEventListener("click", () => {
            copyText(document.getElementById("parameterNegative")?.value || "", "Negative Prompt 已複製");
        });

        document.getElementById("parameterRandomButton")?.addEventListener("click", randomize);
        document.getElementById("parameterResetButton")?.addEventListener("click", reset);
    }

    async function loadData() {
        const response = await fetch("./data/attributes.json");
        if (!response.ok) throw new Error("attributes.json 載入失敗");
        data = await response.json();
        renderControls();
        updateCombinationCount();
    }

    function renderControls() {
        const controls = document.getElementById("parameterControls");
        if (!controls || !data) return;

        controls.innerHTML = `
            ${selectField("parameterPlatform","平台",Object.entries(data.platforms).map(([value,item]) => ({value, zh:item.label})))}
            ${selectField("parameterBase","服飾基礎",data.bases.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterColor","顏色",data.colors.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterMaterial","材質",data.materials.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterFit","版型",data.fits.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterSleeve","袖型",data.sleeves.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterNeckline","領型",data.necklines.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterLength","長度",data.lengths.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterPattern","圖案",data.patterns.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterDetail","裝飾細節",data.details.map(item => ({value:item.en, zh:item.zh})))}
            ${selectField("parameterStyle","風格",data.styles.map(item => ({value:item.en, zh:item.zh})))}

            <label class="parameter-field parameter-wide">
                <span>補充細節（可選）</span>
                <input id="parameterExtra" placeholder="例如：hood resting behind the neck">
            </label>
        `;

        controls.querySelectorAll("select,input").forEach(element => {
            element.addEventListener("input", () => {
                persistState();
                generatePrompt();
            });
        });
    }

    function selectField(id, label, options) {
        return `
            <label class="parameter-field">
                <span>${escapeHtml(label)}</span>
                <select id="${id}">
                    ${options.map((item,index) => `
                        <option value="${escapeAttribute(item.value)}" ${index === 0 ? "selected" : ""}>
                            ${escapeHtml(item.zh)}
                        </option>
                    `).join("")}
                </select>
            </label>
        `;
    }

    function generatePrompt() {
        if (!data) return;

        const platformKey = value("parameterPlatform");
        const platform = data.platforms[platformKey];
        if (!platform) return;

        const parts = [
            value("parameterColor"),
            value("parameterMaterial"),
            value("parameterFit"),
            value("parameterLength"),
            value("parameterBase"),
            value("parameterNeckline"),
            value("parameterSleeve"),
            value("parameterPattern"),
            value("parameterDetail"),
            value("parameterStyle"),
            value("parameterExtra")
        ].filter(Boolean);

        const garment = parts.join(", ");

        let prompt;
        if (platformKey === "gpt") {
            prompt = `${platform.prefix} ${garment}. ${platform.suffix}`;
        } else {
            prompt = `${platform.prefix}, ${garment}, ${platform.suffix}`;
        }

        const summary = [
            zhFrom("bases", value("parameterBase")),
            zhFrom("colors", value("parameterColor")),
            zhFrom("materials", value("parameterMaterial")),
            zhFrom("fits", value("parameterFit")),
            zhFrom("lengths", value("parameterLength")),
            zhFrom("necklines", value("parameterNeckline")),
            zhFrom("sleeves", value("parameterSleeve")),
            zhFrom("patterns", value("parameterPattern")),
            zhFrom("details", value("parameterDetail")),
            zhFrom("styles", value("parameterStyle"))
        ].filter(Boolean).join("／");

        const promptBox = document.getElementById("parameterPrompt");
        const summaryBox = document.getElementById("parameterSummary");

        if (promptBox) promptBox.value = prompt;
        if (summaryBox) summaryBox.value = summary;
    }

    function zhFrom(key, englishValue) {
        const list = data?.[key] || [];
        return list.find(item => item.en === englishValue)?.zh || "";
    }

    function randomize() {
        if (!data) return;

        setRandom("parameterBase", data.bases.map(item => item.en));
        setRandom("parameterColor", data.colors.map(item => item.en));
        setRandom("parameterMaterial", data.materials.map(item => item.en));
        setRandom("parameterFit", data.fits.map(item => item.en));
        setRandom("parameterSleeve", data.sleeves.map(item => item.en));
        setRandom("parameterNeckline", data.necklines.map(item => item.en));
        setRandom("parameterLength", data.lengths.map(item => item.en));
        setRandom("parameterPattern", data.patterns.map(item => item.en));
        setRandom("parameterDetail", data.details.map(item => item.en));
        setRandom("parameterStyle", data.styles.map(item => item.en));

        persistState();
        generatePrompt();
        toast("已產生隨機組合");
    }

    function reset() {
        document.querySelectorAll("#parameterControls select").forEach(select => {
            select.selectedIndex = 0;
        });
        const extra = document.getElementById("parameterExtra");
        if (extra) extra.value = "";
        localStorage.removeItem(STORAGE_KEY);
        generatePrompt();
        toast("參數已重設");
    }

    function setRandom(id, values) {
        const element = document.getElementById(id);
        if (!element || !values.length) return;
        element.value = values[Math.floor(Math.random() * values.length)];
    }

    function updateCombinationCount() {
        if (!data) return;
        const keys = ["bases","colors","materials","fits","sleeves","necklines","lengths","patterns","details","styles"];
        const count = keys.reduce((total,key) => total * data[key].length, 1);
        const target = document.getElementById("combinationCount");
        if (target) target.textContent = `理論組合：約 ${count.toLocaleString("zh-TW")} 種`;
    }

    function persistState() {
        const ids = [
            "parameterPlatform","parameterBase","parameterColor","parameterMaterial",
            "parameterFit","parameterSleeve","parameterNeckline","parameterLength",
            "parameterPattern","parameterDetail","parameterStyle","parameterExtra"
        ];

        const state = Object.fromEntries(ids.map(id => [id, value(id)]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function restoreState() {
        try {
            const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!state) return;
            Object.entries(state).forEach(([id,next]) => {
                const element = document.getElementById(id);
                if (element && next !== undefined) element.value = next;
            });
        } catch {}
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    async function copyText(text, message) {
        if (!text) return;
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
        toast(message);
    }

    function toast(message) {
        let element = document.getElementById("parameterToast");
        if (!element) {
            element = document.createElement("div");
            element.id = "parameterToast";
            element.className = "parameter-toast";
            document.body.appendChild(element);
        }
        element.textContent = message;
        element.classList.add("show");
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => element.classList.remove("show"), 1800);
    }

    function escapeHtml(value = "") {
        return String(value)
            .replaceAll("&","&amp;")
            .replaceAll("<","&lt;")
            .replaceAll(">","&gt;")
            .replaceAll('"',"&quot;")
            .replaceAll("'","&#039;");
    }

    function escapeAttribute(value = "") {
        return escapeHtml(value).replaceAll("\n","&#10;").replaceAll("\r","&#13;");
    }
})();
