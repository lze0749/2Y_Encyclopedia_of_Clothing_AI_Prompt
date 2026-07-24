// ======================================
// 2Y Section Navigation
// Version: v1.2.2
// ======================================

(() => {
    const sections = [
        {
            selector: ".dashboard",
            label: "首頁",
            icon: "🏠"
        },
        {
            selector: "#libraryPanel",
            label: "百科",
            icon: "📚"
        },
        {
            selector: "#promptBuilderPanel",
            label: "組合器",
            icon: "🧩"
        },
        {
            selector: "#parameterLabPanel",
            label: "參數實驗室",
            icon: "🎛️"
        },
        {
            selector: "#customItemPanel",
            label: "自訂項目",
            icon: "✍️"
        }
    ];

    document.addEventListener("DOMContentLoaded", () => {
        createNavigation();

        window.setTimeout(refreshNavigation, 300);
        window.setTimeout(refreshNavigation, 1000);

        const content = document.querySelector(".content");

        if (content) {
            const observer = new MutationObserver(() => {
                refreshNavigation();
            });

            observer.observe(content, {
                childList: true
            });
        }
    });

    function createNavigation() {
        if (document.getElementById("sectionNav")) {
            return;
        }

        const nav = document.createElement("nav");

        nav.id = "sectionNav";
        nav.className = "section-nav";
        nav.setAttribute(
            "aria-label",
            "App 功能導覽"
        );

        nav.innerHTML = `
            <div
                id="sectionNavLinks"
                class="section-nav-links"
            ></div>

            <button
                id="focusSearchButton"
                class="section-nav-search"
                type="button"
            >
                🔍 搜尋
            </button>
        `;

        const topbar = document.querySelector(".topbar");

        if (topbar) {
            topbar.insertAdjacentElement(
                "afterend",
                nav
            );
        } else {
            document.body.prepend(nav);
        }

        document
            .getElementById("focusSearchButton")
            ?.addEventListener(
                "click",
                focusSearch
            );

        refreshNavigation();
    }

    function refreshNavigation() {
        const container =
            document.getElementById(
                "sectionNavLinks"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        sections.forEach((section, index) => {
            const target =
                document.querySelector(
                    section.selector
                );

            if (!target) {
                return;
            }

            if (!target.id) {
                target.id =
                    `appSection${index}`;
            }

            target.classList.add(
                "app-section-target"
            );

            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "section-nav-link";

            button.innerHTML = `
                <span aria-hidden="true">
                    ${section.icon}
                </span>

                <span>
                    ${section.label}
                </span>
            `;

            button.addEventListener(
                "click",
                () => {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    setActiveButton(button);
                }
            );

            container.appendChild(button);
        });

        const firstButton =
            container.querySelector(
                ".section-nav-link"
            );

        if (firstButton) {
            firstButton.classList.add(
                "active"
            );
        }
    }

    function setActiveButton(activeButton) {
        document
            .querySelectorAll(
                ".section-nav-link"
            )
            .forEach((button) => {
                button.classList.toggle(
                    "active",
                    button === activeButton
                );
            });
    }

    function focusSearch() {
        const input =
            document.querySelector(
                ".search-box"
            );

        const sidebar =
            document.querySelector(
                ".sidebar"
            );

        if (!input) {
            console.warn(
                "找不到搜尋框 .search-box"
            );
            return;
        }

        const isMobile =
            window.matchMedia(
                "(max-width: 900px)"
            ).matches;

        if (isMobile) {
            document.body.classList.add(
                "mobile-nav-open"
            );

            const menuButton =
                document.getElementById(
                    "mobileMenuButton"
                );

            if (menuButton) {
                menuButton.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }
        }

        if (sidebar) {
            sidebar.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }

        window.setTimeout(() => {
            input.focus();
            input.select();

            input.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            input.classList.add(
                "search-focus-pulse"
            );

            window.setTimeout(() => {
                input.classList.remove(
                    "search-focus-pulse"
                );
            }, 1500);
        }, isMobile ? 280 : 60);
    }
})();