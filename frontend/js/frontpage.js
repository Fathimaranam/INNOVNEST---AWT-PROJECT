// ===============================
// InnoNest Front Page JavaScript
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    console.log("InnoNest front page loaded");

    // Get Started button
    const getStartedBtn = document.querySelector("#getStartedBtn");

    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

    // Explore Ideas button
    const exploreIdeasBtn = document.querySelector("#exploreIdeasBtn");

    if (exploreIdeasBtn) {
        exploreIdeasBtn.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

    // Post Idea button
    const postIdeaBtn = document.querySelector("#postIdeaBtn");

    if (postIdeaBtn) {
        postIdeaBtn.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

    setupNavigation();
    setupSearch();
});


// ===============================
// Sidebar Navigation
// ===============================

function setupNavigation() {

    const home = document.querySelector("#navHome");
    const discover = document.querySelector("#navDiscover");
    const ideas = document.querySelector("#navIdeas");
    const community = document.querySelector("#navCommunity");
    const messages = document.querySelector("#navMessages");
    const notifications = document.querySelector("#navNotifications");
    const profile = document.querySelector("#navProfile");

    if (home) {
        home.addEventListener("click", () => {
            window.location.href = "frontpage.html";
        });
    }

    if (discover) {
        discover.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

    if (ideas) {
        ideas.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

    if (community) {
        community.addEventListener("click", () => {
            window.location.href = "community.html";
        });
    }

    if (messages) {
        messages.addEventListener("click", () => {
            window.location.href = "messages.html";
        });
    }

    if (notifications) {
        notifications.addEventListener("click", () => {
            window.location.href = "notification.html";
        });
    }

    if (profile) {
        profile.addEventListener("click", () => {
            window.location.href = "profile.html";
        });
    }
}


// ===============================
// Search
// ===============================

function setupSearch() {

    const searchInput = document.querySelector("#searchInput");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("keypress", (event) => {

        if (event.key === "Enter") {

            const searchText = searchInput.value.trim();

            if (searchText === "") {
                return;
            }

            console.log("Searching for:", searchText);

            // Send search term to ideas page
            window.location.href =
                `ideas.html?search=${encodeURIComponent(searchText)}`;
        }
    });
}