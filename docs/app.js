document.addEventListener("DOMContentLoaded", () => {

    const page = document.getElementById("page");

    page.innerHTML = `
        <h2>🚀 2Y AI Prompt Encyclopedia</h2>

        <p>Version 0.1.0</p>

        <hr>

        <p>Welcome to the AI Prompt Encyclopedia.</p>

        <p>Next milestone:</p>

        <ul>
            <li>✅ PWA</li>
            <li>⬜ Theme Switch</li>
            <li>⬜ Search Engine</li>
            <li>⬜ Clothing Database</li>
            <li>⬜ Prompt Builder</li>
        </ul>
    `;

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js");
    }

});
