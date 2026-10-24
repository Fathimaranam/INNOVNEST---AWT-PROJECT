// ===============================
// InnovNest Notifications
// Real, persisted notifications from GET /api/notifications.
// Types: "follow" (someone followed you) and "message" (someone sent you a DM).
// ===============================

const NOTIFICATIONS_API = "http://localhost:5000/api/notifications";

let allNotifications = [];
let activeFilter = "all";
let searchTerm = "";

document.addEventListener("DOMContentLoaded", async () => {

    if (typeof requireAuth === "function") {
        const user = await requireAuth();
        if (!user) return;
    }

    setupNavigation();
    setupControls();
    loadNotifications();

});


// ===============================
// API
// ===============================

function authHeaders(extra = {}) {
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");
    return { "Authorization": `Bearer ${token}`, ...extra };
}

async function loadNotifications() {

    const list = document.getElementById("notificationList");
    list.innerHTML = `<div class="notification-state">Loading notifications...</div>`;

    try {
        const res = await fetch(NOTIFICATIONS_API, { headers: authHeaders() });

        if (res.status === 401 && typeof logout === "function") {
            logout();
            return;
        }

        if (!res.ok) throw new Error("Request failed");

        const data = await res.json();
        allNotifications = Array.isArray(data.notifications) ? data.notifications : [];
        updateUnread(data.unreadCount);
        render();

    } catch (error) {
        console.error("Notifications error:", error);
        list.innerHTML = `
            <div class="notification-state notification-state-error">
                <strong>Unable to load notifications</strong>
                <p>Make sure the backend server is running, then try again.</p>
                <button type="button" class="secondary-button" id="retryNotifications">Retry</button>
            </div>`;
        document.getElementById("retryNotifications").addEventListener("click", loadNotifications);
    }

}

async function markOneRead(id) {
    const res = await fetch(`${NOTIFICATIONS_API}/${id}/read`, {
        method: "PATCH",
        headers: authHeaders()
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    const data = await res.json();
    const n = allNotifications.find(x => x._id === id);
    if (n) n.read = true;
    updateUnread(data.unreadCount);
}

async function markAllRead() {
    const button = document.getElementById("markAllRead");
    button.disabled = true;
    try {
        const res = await fetch(`${NOTIFICATIONS_API}/read-all`, {
            method: "PATCH",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({})
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        allNotifications.forEach(n => { n.read = true; });
        updateUnread(data.unreadCount);
        render();
    } catch (error) {
        console.error(error);
        button.disabled = false;
        alert("Could not mark notifications as read. Please try again.");
    }
}


// ===============================
// RENDER
// ===============================

function updateUnread(count) {
    const unread = Number(count) || 0;
    if (typeof setNotificationBadge === "function") setNotificationBadge(unread);
    const button = document.getElementById("markAllRead");
    if (button) button.disabled = unread === 0;
}

function render() {

    const list = document.getElementById("notificationList");

    const visible = allNotifications.filter(n => {
        if (activeFilter === "unread" && n.read) return false;
        if ((activeFilter === "follow" || activeFilter === "message") && n.type !== activeFilter) return false;
        if (searchTerm) {
            const hay = `${n.text} ${n.preview || ""}`.toLowerCase();
            if (!hay.includes(searchTerm)) return false;
        }
        return true;
    });

    if (allNotifications.length === 0) {
        list.innerHTML = `
            <div class="notification-state">
                <strong>No notifications yet</strong>
                <p>You'll be notified here when someone follows you or sends you a message.</p>
            </div>`;
        return;
    }

    if (visible.length === 0) {
        list.innerHTML = `
            <div class="notification-state">
                <strong>Nothing here</strong>
                <p>No notifications match this filter.</p>
            </div>`;
        return;
    }

    list.innerHTML = "";

    visible.forEach(n => {
        const item = document.createElement(n.link ? "a" : "div");
        item.className = `notification-item ${n.read ? "" : "unread"}`;
        if (n.link) item.href = n.link;

        const initial = n.actor && n.actor.name ? n.actor.name.charAt(0).toUpperCase() : "?";
        const icon = n.type === "follow" ? "👤" : "💬";

        item.innerHTML = `
            <div class="notification-avatar" aria-hidden="true">${escapeHTML(initial)}</div>
            <div class="notification-body">
                <p class="notification-text">
                    <span class="notification-type-icon" aria-hidden="true">${icon}</span>
                    ${escapeHTML(n.text)}
                </p>
                ${n.preview ? `<p class="notification-preview">“${escapeHTML(n.preview)}”</p>` : ""}
                <time class="notification-time" datetime="${escapeHTML(n.lastEventAt)}">${timeAgo(n.lastEventAt)}</time>
            </div>
            ${n.read ? "" : `<span class="notification-dot" aria-label="Unread"></span>`}
        `;

        // Clicking marks it read, then follows the link (profile or conversation) if one exists
        item.addEventListener("click", async (event) => {
            if (n.read) return;
            event.preventDefault();
            try {
                await markOneRead(n._id);
            } catch (error) {
                console.error(error);
            }
            if (n.link) {
                window.location.href = n.link;
            } else {
                render();
            }
        });

        list.appendChild(item);
    });

}

function timeAgo(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


// ===============================
// CONTROLS
// ===============================

function setupControls() {

    const markAllButton = document.getElementById("markAllRead");
    if (markAllButton) markAllButton.addEventListener("click", markAllRead);

    document.querySelectorAll(".notification-filter").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".notification-filter").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            activeFilter = button.dataset.filter;
            render();
        });
    });

    const search = document.getElementById("notificationSearch");
    if (search) {
        search.addEventListener("input", () => {
            searchTerm = search.value.toLowerCase().trim();
            render();
        });
    }

    // Opening "Post Idea" from this page goes to the Ideas page
    const postIdea = document.getElementById("postIdeaBtn");
    if (postIdea) {
        postIdea.addEventListener("click", () => {
            window.location.href = "ideas.html";
        });
    }

}


// ===============================
// NAVIGATION
// ===============================

function setupNavigation() {

    const navigation = {
        navHome: "frontpage.html",
        navDiscover: "ideas.html",
        navIdeas: "ideas.html",
        navCommunity: "community.html",
        navMessages: "messages.html",
        navNotifications: "notification.html",
        navProfile: "profile.html"
    };

    Object.keys(navigation).forEach((id) => {
        const element = document.querySelector(`#${id}`);
        if (element) {
            element.addEventListener("click", () => {
                window.location.href = navigation[id];
            });
        }
    });

}
