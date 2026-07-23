// ======================================
// 2Y Encyclopedia of Clothing AI Prompt
// Version: v0.3.0
// ======================================

const APP = {
    name: "2Y Encyclopedia of Clothing AI Prompt",
    version: "0.3.0",
    theme: "neon",
    language: "zh-TW"
};

const state = {
    categories: [],
    activeCategoryId: null
};

document.addEventListener("DOMContentLoaded", async () => {
    console.log(`${APP.name} v${APP.version}`);

    bindStartButton();
    await loadCategories();
});

function bindStartButton() {
    const startButton = document.getElementById("startButton");

    if (!startButton) {
        return;
    }

    startButton.addEventListener("click", () => {
        alert("🚧 Prompt Builder 開發中...");
    });
}

async function loadCategories() {
    const categoryList = document.getElementById("categoryList");

    try {
        const response = await fetch("./data/categories.json");

        if (!response.ok) {
            throw new Error(
                `無法載入分類資料：HTTP ${response.status}`
            );
        }

        state.categories = await response.json();

        renderCategories();
        renderStatistics();
    } catch (error) {
        console.error(error);

        if (categoryList) {
            categoryList.innerHTML = `
                <li class="error-item">
                    分類載入失敗，請確認 categories.json。
                </li>
            `;
        }
    }
}

function renderCategories() {
    const categoryList = document.getElementById("categoryList");

    if (!categoryList) {
        return;
    }

    categoryList.innerHTML = "";

    state.categories.forEach((category) => {
        const listItem = document.createElement("li");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "category-button";
        button.dataset.categoryId = category.id;

        button.innerHTML = `
            <span class="category-icon" aria-hidden="true">
                ${category.icon}
            </span>

            <span class="category-label">
                <strong>${category.name_zh}</strong>
                <small>${category.name_en}</small>
            </span>

            <span class="category-count">
                ${category.count}
            </span>
        `;

        button.addEventListener("click", () => {
            selectCategory(category);
        });

        listItem.appendChild(button);
        categoryList.appendChild(listItem);
    });
}

function selectCategory(category) {
    state.activeCategoryId = category.id;

    document
        .querySelectorAll(".category-button")
        .forEach((button) => {
            const isActive =
                button.dataset.categoryId === category.id;

            button.classList.toggle("active", isActive);
        });

    const pageTitle = document.getElementById("pageTitle");
    const pageDescription =
        document.getElementById("pageDescription");

    if (pageTitle) {
        pageTitle.textContent =
            `${category.icon} ${category.name_zh}`;
    }

    if (pageDescription) {
        pageDescription.textContent = category.description;
    }
}

function renderStatistics() {
    const statsList = document.getElementById("statsList");

    if (!statsList) {
        return;
    }

    const totalItems = state.categories.reduce(
        (sum, category) => sum + category.count,
        0
    );

    statsList.innerHTML = `
        <li>
            分類數量
            <span>${state.categories.length}</span>
        </li>

        <li>
            預設資料
            <span>${totalItems}</span>
        </li>

        <li>
            支援平台
            <span>4</span>
        </li>

        <li>
            App 版本
            <span>${APP.version}</span>
        </li>
    `;
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration =
                await navigator.serviceWorker.register("./sw.js");

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