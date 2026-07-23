// ======================================
// 2Y Encyclopedia of Clothing AI Prompt
// Version: v0.2.1
// ======================================

const APP = {
    name: "2Y Encyclopedia of Clothing AI Prompt",
    version: "0.2.1",
    theme: "neon",
    language: "zh-TW"
};

document.addEventListener("DOMContentLoaded", () => {
    console.log(`${APP.name} v${APP.version}`);

    const startButton = document.getElementById("startButton");

    if (startButton) {
        startButton.addEventListener("click", () => {
            alert("🚧 Prompt Builder 開發中...");
        });
    }
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register(
                "./sw.js"
            );

            console.log(
                "Service Worker registered:",
                registration.scope
            );
        } catch (error) {
            console.error(
                "Service Worker registration failed:",
                error
            );
        }
    });
}