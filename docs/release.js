// 2Y Release Information v1.0.0
(() => {
    const VERSION = "1.0.0";
    document.addEventListener("DOMContentLoaded", () => {
        const titleGroup = document.querySelector(".title-group");
        if (titleGroup && !document.getElementById("releaseVersionBadge")) {
            const badge = document.createElement("span");
            badge.id = "releaseVersionBadge";
            badge.className = "release-version-badge";
            badge.textContent = `v${VERSION}`;
            titleGroup.appendChild(badge);
        }

        const dashboard = document.querySelector(".dashboard");
        if (dashboard && !document.getElementById("releaseInfoCard")) {
            const card = document.createElement("article");
            card.id = "releaseInfoCard";
            card.className = "card release-info-card";
            card.innerHTML = `
                <div class="release-info-heading">
                    <div>
                        <p class="release-kicker">STABLE RELEASE</p>
                        <h3>🍮 2Y v${VERSION}</h3>
                    </div>
                    <span>First Stable PWA</span>
                </div>
                <ul>
                    <li>JSON 驅動分類與提示詞資料庫</li>
                    <li>PixAI、Niji、TensorArt、GPT Image 輸出</li>
                    <li>Prompt Builder 與參數化服飾實驗室</li>
                    <li>自訂百科項目、匯入與匯出</li>
                    <li>手機導覽與離線 PWA</li>
                </ul>
            `;
            dashboard.appendChild(card);
        }
    });
})();
