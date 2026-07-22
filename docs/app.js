// ======================================
// 2Y Encyclopedia of Clothing AI Prompt
// Version: v0.1.0
// ======================================

const APP = {
    name: "2Y Encyclopedia of Clothing AI Prompt",
    version: "0.1.0",
    theme: "neon",
    language: "zh-TW"
};

document.addEventListener("DOMContentLoaded", () => {
    console.log(`${APP.name} v${APP.version}`);

    const button = document.getElementById("startButton");

    if (button) {
        button.addEventListener("click", () => {
            alert("🚧 Prompt Builder 開發中...");
        });
    }
});
