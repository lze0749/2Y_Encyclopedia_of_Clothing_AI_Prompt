// ======================================
// 2Y Mobile App Shell & PWA Install UX
// Version: v0.7.0
// ======================================

(() => {
    let deferredInstallPrompt = null;

    document.addEventListener("DOMContentLoaded", () => {
        ensureMobileShell();
        bindMobileNavigation();
        bindConnectionStatus();
        bindInstallEvents();
        watchServiceWorkerUpdates();
    });

    function ensureMobileShell() {
        const topbar = document.querySelector(".topbar");
        const sidebar = document.querySelector(".sidebar");

        if (topbar && !document.getElementById("mobileMenuButton")) {
            const menuButton = document.createElement("button");
            menuButton.id = "mobileMenuButton";
            menuButton.className = "mobile-menu-button";
            menuButton.type = "button";
            menuButton.setAttribute("aria-label", "開啟分類選單");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.innerHTML = `
                <span aria-hidden="true">☰</span>
            `;

            topbar.insertBefore(menuButton, topbar.firstChild);
        }

        if (sidebar && !document.getElementById("mobileSidebarOverlay")) {
            const overlay = document.createElement("button");
            overlay.id = "mobileSidebarOverlay";
            overlay.className = "mobile-sidebar-overlay";
            overlay.type = "button";
            overlay.setAttribute("aria-label", "關閉分類選單");
            document.body.appendChild(overlay);
        }

        if (!document.getElementById("appStatusDock")) {
            const dock = document.createElement("div");
            dock.id = "appStatusDock";
            dock.className = "app-status-dock";
            dock.innerHTML = `
                <span id="connectionBadge" class="connection-badge">
                    檢查連線中
                </span>

                <button
                    id="installAppButton"
                    class="install-app-button"
                    type="button"
                    hidden
                >
                    安裝 App
                </button>

                <button
                    id="refreshAppButton"
                    class="refresh-app-button"
                    type="button"
                    hidden
                >
                    更新 App
                </button>
            `;

            document.body.appendChild(dock);
        }
    }

    function bindMobileNavigation() {
        const menuButton = document.getElementById("mobileMenuButton");
        const overlay = document.getElementById("mobileSidebarOverlay");
        const sidebar = document.querySelector(".sidebar");

        if (!menuButton || !overlay || !sidebar) {
            return;
        }

        const setOpen = (isOpen) => {
            document.body.classList.toggle("mobile-nav-open", isOpen);
            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
            menuButton.setAttribute(
                "aria-label",
                isOpen ? "關閉分類選單" : "開啟分類選單"
            );
        };

        menuButton.addEventListener("click", () => {
            setOpen(
                !document.body.classList.contains("mobile-nav-open")
            );
        });

        overlay.addEventListener("click", () => setOpen(false));

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        });

        sidebar.addEventListener("click", (event) => {
            const clickedButton = event.target.closest("button");

            if (
                clickedButton &&
                window.matchMedia("(max-width: 900px)").matches
            ) {
                setOpen(false);
            }
        });

        window.addEventListener("resize", () => {
            if (!window.matchMedia("(max-width: 900px)").matches) {
                setOpen(false);
            }
        });
    }

    function bindConnectionStatus() {
        const badge = document.getElementById("connectionBadge");

        if (!badge) {
            return;
        }

        const update = () => {
            const online = navigator.onLine;

            badge.textContent = online ? "● 線上" : "● 離線模式";
            badge.classList.toggle("offline", !online);
        };

        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        update();
    }

    function bindInstallEvents() {
        const installButton =
            document.getElementById("installAppButton");

        if (!installButton) {
            return;
        }

        window.addEventListener("beforeinstallprompt", (event) => {
            event.preventDefault();
            deferredInstallPrompt = event;
            installButton.hidden = false;
        });

        installButton.addEventListener("click", async () => {
            if (!deferredInstallPrompt) {
                return;
            }

            deferredInstallPrompt.prompt();

            await deferredInstallPrompt.userChoice;

            deferredInstallPrompt = null;
            installButton.hidden = true;
        });

        window.addEventListener("appinstalled", () => {
            deferredInstallPrompt = null;
            installButton.hidden = true;
            showMobileToast("2Y Prompt 已安裝");
        });

        if (isStandaloneMode()) {
            installButton.hidden = true;
        }
    }

    function watchServiceWorkerUpdates() {
        const refreshButton =
            document.getElementById("refreshAppButton");

        if (!refreshButton || !("serviceWorker" in navigator)) {
            return;
        }

        navigator.serviceWorker.ready
            .then((registration) => {
                if (registration.waiting) {
                    showUpdateButton(registration.waiting);
                }

                registration.addEventListener("updatefound", () => {
                    const worker = registration.installing;

                    if (!worker) {
                        return;
                    }

                    worker.addEventListener("statechange", () => {
                        if (
                            worker.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            showUpdateButton(worker);
                        }
                    });
                });

                window.setInterval(() => {
                    registration.update().catch(() => {});
                }, 60 * 60 * 1000);
            })
            .catch((error) => {
                console.warn("Service Worker 尚未就緒", error);
            });

        let refreshing = false;

        navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
                if (refreshing) {
                    return;
                }

                refreshing = true;
                window.location.reload();
            }
        );

        function showUpdateButton(worker) {
            refreshButton.hidden = false;

            refreshButton.onclick = () => {
                worker.postMessage({
                    type: "SKIP_WAITING"
                });
            };
        }
    }

    function isStandaloneMode() {
        return (
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true
        );
    }

    function showMobileToast(message) {
        let toast = document.getElementById("mobileAppToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "mobileAppToast";
            toast.className = "mobile-app-toast";
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(showMobileToast.timeoutId);

        showMobileToast.timeoutId = window.setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
    }
})();
