// ======================================
// 2Y Section Navigation
// Version: v1.0.0
// ======================================

(() => {
    const SECTIONS = [
        { selector: ".dashboard", fallbackId: "homeSection", icon: "🏠", label: "首頁" },
        { selector: "#libraryPanel", fallbackId: "libraryPanel", icon: "📚", label: "百科" },
        { selector: "#promptBuilderPanel", fallbackId: "promptBuilderPanel", icon: "🧩", label: "組合器" },
        { selector: "#parameterLabPanel", fallbackId: "parameterLabPanel", icon: "🎛️", label: "參數實驗室" },
        { selector: "#customItemPanel", fallbackId: "customItemPanel", icon: "✍️", label: "自訂項目" },
        { selector: "#storagePanel, .storage-panel, #favoritesPanel", fallbackId: "storagePanel", icon: "⭐", label: "收藏與備份" }
    ];

    let sectionObserver = null;
    let mutationObserver = null;
    let refreshTimer = null;

    document.addEventListener("DOMContentLoaded", () => {
        createNavigation();
        createBackToTop();
        observeContent();
        scheduleRefresh();
    });

    window.addEventListener("load", scheduleRefresh);

    function createNavigation() {
        if (document.getElementById("sectionNav")) return;

        const nav = document.createElement("nav");
        nav.id = "sectionNav";
        nav.className = "section-nav";
        nav.setAttribute("aria-label", "App 功能導覽");
        nav.innerHTML = `
            <div id="sectionNavLinks" class="section-nav-links">
                <span class="section-nav-loading">正在整理功能區……</span>
            </div>
            <button id="focusSearchButton" class="section-nav-search" type="button">
                🔍 搜尋
            </button>
        `;

        const topbar = document.querySelector(".topbar");
        if (topbar) topbar.insertAdjacentElement("afterend", nav);
        else document.body.prepend(nav);

        document.getElementById("focusSearchButton")?.addEventListener("click", () => {
            const input = document.querySelector(".search-box");
            if (!input) return;
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    function createBackToTop() {
        if (document.getElementById("backToTopButton")) return;

        const button = document.createElement("button");
        button.id = "backToTopButton";
        button.className = "back-to-top-button";
        button.type = "button";
        button.setAttribute("aria-label", "回到頁首");
        button.textContent = "↑";
        button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
        document.body.appendChild(button);

        window.addEventListener("scroll", () => {
            button.classList.toggle("show", window.scrollY > 480);
        }, { passive: true });
    }

    function observeContent() {
        const content = document.querySelector(".content");
        if (!content) return;

        mutationObserver = new MutationObserver(scheduleRefresh);
        mutationObserver.observe(content, { childList: true });
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refreshNavigation, 100);
    }

    function getAvailableSections() {
        return SECTIONS.map(definition => {
            const element = document.querySelector(definition.selector);
            if (!element) return null;
            if (!element.id) element.id = definition.fallbackId;
            element.classList.add("app-section-target");
            return { ...definition, id: element.id, element };
        }).filter(Boolean);
    }

    function refreshNavigation() {
        const container = document.getElementById("sectionNavLinks");
        if (!container) return;

        const sections = getAvailableSections();
        container.innerHTML = "";

        sections.forEach((section, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "section-nav-link";
            button.dataset.sectionId = section.id;
            button.innerHTML = `<span aria-hidden="true">${section.icon}</span><span>${section.label}</span>`;
            if (index === 0) button.classList.add("active");
            button.addEventListener("click", () => {
                section.element.scrollIntoView({ behavior: "smooth", block: "start" });
                setActive(section.id);
            });
            container.appendChild(button);
        });

        setupIntersectionObserver(sections);
    }

    function setupIntersectionObserver(sections) {
        sectionObserver?.disconnect();
        if (!("IntersectionObserver" in window)) return;

        sectionObserver = new IntersectionObserver(entries => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
            if (visible[0]) setActive(visible[0].target.id);
        }, {
            rootMargin: "-22% 0px -58% 0px",
            threshold: [0.05, 0.2, 0.45]
        });

        sections.forEach(section => sectionObserver.observe(section.element));
    }

    function setActive(sectionId) {
        document.querySelectorAll(".section-nav-link").forEach(link => {
            const active = link.dataset.sectionId === sectionId;
            link.classList.toggle("active", active);
            if (active) link.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        });
    }
})();
