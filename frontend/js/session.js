// ==========================================
// InnovNest - Shared Session Management Module
// ==========================================

const API_AUTH_URL = "http://localhost:5000/api/auth";
const API_NOTIFICATIONS_URL = "http://localhost:5000/api/notifications";

/**
 * Get the stored JWT token.
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem("token");
}

/**
 * Get the cached user profile from localStorage.
 * @returns {object|null}
 */
function getCachedUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Check if a token exists in local storage.
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!getToken();
}

/**
 * Clear all authentication tokens and cached user data.
 */
function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

/**
 * Verify and fetch the current user's profile from GET /api/auth/me.
 * If token is expired or invalid, clears the session and returns null.
 * @returns {Promise<object|null>}
 */
async function fetchCurrentUser() {
    const token = getToken();
    if (!token) {
        clearSession();
        return null;
    }

    try {
        const response = await fetch(`${API_AUTH_URL}/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            clearSession();
            return null;
        }

        const data = await response.json();
        if (data && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            return data.user;
        }

        clearSession();
        return null;
    } catch (error) {
        console.error("Session verification network error:", error.message);
        return getCachedUser();
    }
}

/**
 * Log out the current user:
 * Clears client auth state and redirects to login.html.
 * Note: InnovNest uses stateless JWTs; the token is permanently discarded on the client.
 */
function logout() {
    clearSession();
    window.location.href = "login.html";
}

/**
 * Enforce authentication on protected pages.
 * If user is unauthenticated or token verification fails, redirects to login.html.
 * @returns {Promise<object|null>} The verified user object
 */
async function requireAuth() {
    const token = getToken();
    if (!token) {
        clearSession();
        window.location.replace("login.html");
        return null;
    }

    const user = await fetchCurrentUser();
    if (!user) {
        window.location.replace("login.html");
        return null;
    }

    updateSidebarUser(user);
    setupNotificationIndicators();
    return user;
}

/**
 * Redirect already-authenticated users away from guest pages (login.html, signup.html).
 * @param {string} destination - Page to redirect to (default: "frontpage.html")
 */
async function redirectIfAuthenticated(destination = "frontpage.html") {
    if (isAuthenticated()) {
        const user = await fetchCurrentUser();
        if (user) {
            window.location.replace(destination);
        }
    }
}

/**
 * Dynamically updates the sidebar user section with the actual logged-in user's details.
 * @param {object|null} user
 */
function updateSidebarUser(user) {
    const avatar = document.getElementById("sidebarAvatar");
    const name = document.getElementById("sidebarName");
    const email = document.getElementById("sidebarEmail");
    const logoutBtn = document.getElementById("sidebarLogoutBtn");
    const userContainer = document.querySelector(".sidebar-user");

    if (!user) {
        if (avatar) avatar.textContent = "?";
        if (name) name.textContent = "Guest";
        if (email) email.textContent = "Not logged in";
        if (logoutBtn) {
            logoutBtn.textContent = "Log in";
            logoutBtn.className = "sidebar-login-btn";
            logoutBtn.onclick = (e) => {
                e.stopPropagation();
                window.location.href = "login.html";
            };
        }
        return;
    }

    const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
    if (avatar) avatar.textContent = initial;
    if (name) name.textContent = user.name || "Member";
    if (email) email.textContent = user.email || "";

    if (logoutBtn) {
        logoutBtn.textContent = "Log out";
        logoutBtn.className = "sidebar-logout-btn";
        logoutBtn.onclick = (e) => {
            e.stopPropagation();
            logout();
        };
    }

    if (userContainer) {
        userContainer.style.cursor = "pointer";
        userContainer.onclick = (e) => {
            if (e.target.id === "sidebarLogoutBtn") return;
            window.location.href = "profile.html";
        };
    }
}

// ==========================================
// Notification unread indicators (real backend data only)
// ==========================================

let lastBadgeRefresh = 0;

/**
 * Render the unread count on the sidebar Notifications item and the topbar bell.
 * A count of 0 (or unknown) shows no badge — never a placeholder number.
 * @param {number} count
 */
function setNotificationBadge(count) {
    const value = Number.isFinite(count) && count > 0 ? (count > 99 ? "99+" : String(count)) : "";

    [
        { el: document.getElementById("navNotifications"), cls: "nav-badge" },
        { el: document.getElementById("notificationTopBtn"), cls: "icon-badge" }
    ].forEach(({ el, cls }) => {
        if (!el) return;
        let badge = el.querySelector("." + cls);
        if (!value) {
            if (badge) badge.remove();
            el.removeAttribute("data-unread");
            return;
        }
        if (!badge) {
            badge = document.createElement("span");
            badge.className = cls;
            el.appendChild(badge);
        }
        badge.textContent = value;
        el.setAttribute("data-unread", value);
        el.setAttribute("aria-label", `Notifications, ${value} unread`);
    });
}

/**
 * Fetch the unread count from GET /api/notifications/unread-count and update badges.
 * Silently leaves badges untouched if the request fails.
 */
async function refreshNotificationBadge() {
    const token = getToken();
    if (!token) return;
    lastBadgeRefresh = Date.now();
    try {
        const res = await fetch(`${API_NOTIFICATIONS_URL}/unread-count`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setNotificationBadge(data.unreadCount);
    } catch (error) {
        console.warn("Could not refresh notification count:", error.message);
    }
}

let notificationIndicatorsReady = false;

/**
 * Load the unread count once per page, make the topbar bell open Notifications,
 * and refresh when the tab regains focus (at most every 30s) — no constant polling.
 */
function setupNotificationIndicators() {
    if (notificationIndicatorsReady) return;
    notificationIndicatorsReady = true;

    const bell = document.getElementById("notificationTopBtn");
    if (bell) {
        bell.addEventListener("click", () => {
            window.location.href = "notification.html";
        });
    }

    refreshNotificationBadge();

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastBadgeRefresh > 30000) {
            refreshNotificationBadge();
        }
    });
}

// Export to global scope
window.InnovNestAuth = {
    getToken,
    getCachedUser,
    isAuthenticated,
    clearSession,
    fetchCurrentUser,
    logout,
    requireAuth,
    redirectIfAuthenticated,
    updateSidebarUser,
    setNotificationBadge,
    refreshNotificationBadge
};

window.getToken = getToken;
window.getCachedUser = getCachedUser;
window.isAuthenticated = isAuthenticated;
window.fetchCurrentUser = fetchCurrentUser;
window.logout = logout;
window.requireAuth = requireAuth;
window.updateSidebarUser = updateSidebarUser;
window.setNotificationBadge = setNotificationBadge;
window.refreshNotificationBadge = refreshNotificationBadge;
