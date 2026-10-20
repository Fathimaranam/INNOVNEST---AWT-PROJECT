// ==========================================
// InnovNest - Shared Session Management Module
// ==========================================

const API_AUTH_URL = "http://localhost:5000/api/auth";

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
    updateSidebarUser
};

window.getToken = getToken;
window.getCachedUser = getCachedUser;
window.isAuthenticated = isAuthenticated;
window.fetchCurrentUser = fetchCurrentUser;
window.logout = logout;
window.requireAuth = requireAuth;
window.updateSidebarUser = updateSidebarUser;
