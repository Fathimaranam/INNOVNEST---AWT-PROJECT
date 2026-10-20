const USERS_API =
    "http://localhost:5000/api/users";

let allUsers = [];
let currentUser = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Community page loaded"
        );

        if (typeof requireAuth === "function") {
            currentUser = await requireAuth();
            if (!currentUser) return;
        }

        setupNavigation();

        setupSearch();

        setupRoleFilter();

        loadCommunity();

    }
);


/* ===============================
   LOAD COMMUNITY
================================ */

async function loadCommunity() {

    try {

        const response =
            await fetch(USERS_API);

        if (!response.ok) {

            throw new Error(
                "Unable to load community"
            );

        }

        allUsers =
            await response.json();

        updateSidebar();

        updateStatistics(
            allUsers
        );

        displayUsers(
            allUsers
        );


    } catch (error) {

        console.error(error);

        document.getElementById(
            "communityContainer"
        ).innerHTML = `

            <div class="empty-state">

                <h3>
                    Unable to load community
                </h3>

                <p>
                    Make sure the backend server is running.
                </p>

            </div>

        `;

    }

}


/* ===============================
   SIDEBAR
================================ */

function updateSidebar() {

    if (!currentUser) {
        return;
    }

    if (typeof updateSidebarUser === "function") {
        updateSidebarUser(currentUser);
        return;
    }

    const firstLetter =
        currentUser.name
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "sidebarAvatar"
    ).textContent =
        firstLetter;


    document.getElementById(
        "sidebarName"
    ).textContent =
        currentUser.name;


    document.getElementById(
        "sidebarEmail"
    ).textContent =
        currentUser.email;

}


/* ===============================
   STATISTICS
================================ */

function updateStatistics(users) {

    document.getElementById(
        "totalMembers"
    ).textContent =
        users.length;


    document.getElementById(
        "totalFounders"
    ).textContent =
        users.filter(
            user =>
                user.role === "Founder"
        ).length;


    document.getElementById(
        "totalMentors"
    ).textContent =
        users.filter(
            user =>
                user.role === "Mentor"
        ).length;


    document.getElementById(
        "totalInvestors"
    ).textContent =
        users.filter(
            user =>
                user.role === "Investor"
        ).length;

}


/* ===============================
   DISPLAY USERS
================================ */

function displayUsers(users) {

    const container =
        document.getElementById(
            "communityContainer"
        );


    container.innerHTML = "";


    if (users.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <h3>
                    No members found
                </h3>

                <p>
                    Try another search or filter.
                </p>

            </div>

        `;

        return;

    }


    users.forEach(user => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "community-card";


        const firstLetter =
            user.name
                .charAt(0)
                .toUpperCase();


        const skills =
            user.skills || [];


        const skillHTML =
            skills
                .slice(0, 4)
                .map(
                    skill =>
                        `<span class="community-skill">
                            ${escapeHTML(skill)}
                        </span>`
                )
                .join("");


        const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
        const isCurrentUser =
            currentUserId &&
            user._id === currentUserId;

        const isFollowing = Array.isArray(user.followers) && currentUserId &&
            user.followers.some(f => {
                const fid = typeof f === "object" ? (f._id || f.id) : f;
                return fid && fid.toString() === currentUserId.toString();
            });

        const followerCount = user.followersCount !== undefined
            ? user.followersCount
            : (Array.isArray(user.followers) ? user.followers.length : (user.followers || 0));


        card.innerHTML = `

            <div class="community-card-top">

                <div class="community-avatar">
                    ${firstLetter}
                </div>


                <div class="community-user-info">

                    <h3>
                        ${escapeHTML(user.name)}
                    </h3>

                    <span class="community-role">
                        ${escapeHTML(
                            user.role || "Member"
                        )}
                    </span>

                </div>

            </div>


            <div class="community-location">
                📍 ${escapeHTML(
                    user.location ||
                    "Location not specified"
                )}
            </div>


            <p class="community-bio">
                ${escapeHTML(
                    user.bio ||
                    "No bio available."
                )}
            </p>


            <div class="community-skills">
                ${skillHTML}
            </div>


            <div class="community-card-bottom">

                <span class="community-followers" id="followers-count-${user._id}">
                    ${followerCount} followers
                </span>

                <div class="community-card-actions">
                    <a href="profile.html?id=${user._id}" class="community-profile-btn">
                        View Profile
                    </a>

                    ${
                        isCurrentUser
                        ? `
                            <span class="community-self-badge">
                                You
                            </span>
                        `
                        : `
                            <button
                                class="connect-button ${isFollowing ? "following-btn" : ""}"
                                data-user-id="${user._id}"
                                data-following="${isFollowing ? "true" : "false"}"
                            >
                                ${isFollowing ? "Unfollow" : "Follow"}
                            </button>
                        `
                    }
                </div>

            </div>

        `;


        container.appendChild(card);

    });


    setupConnectButtons();

}


/* ===============================
   CONNECT / FOLLOW BUTTON
================================ */

function setupConnectButtons() {

    const buttons =
        document.querySelectorAll(
            ".connect-button[data-user-id]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const userId = button.getAttribute("data-user-id");
                if (!userId) return;

                const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");
                if (!token) {
                    alert("Please log in to follow members.");
                    return;
                }

                const isCurrentlyFollowing = button.getAttribute("data-following") === "true";
                button.disabled = true;

                try {

                    const endpoint = isCurrentlyFollowing
                        ? `${USERS_API}/${userId}/unfollow`
                        : `${USERS_API}/${userId}/follow`;

                    const res = await fetch(endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || "Failed to update follow relationship");
                    }

                    const nowFollowing = data.isFollowing;
                    button.setAttribute("data-following", nowFollowing ? "true" : "false");
                    button.textContent = nowFollowing ? "Unfollow" : "Follow";

                    if (nowFollowing) {
                        button.classList.add("following-btn");
                    } else {
                        button.classList.remove("following-btn");
                    }

                    const countEl = document.getElementById(`followers-count-${userId}`);
                    if (countEl && data.followersCount !== undefined) {
                        countEl.textContent = `${data.followersCount} followers`;
                    }

                } catch (err) {

                    console.error("Community follow error:", err);
                    alert(err.message);

                } finally {

                    button.disabled = false;

                }

            }
        );

    });

}


/* ===============================
   SEARCH
================================ */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "communitySearch"
        );


    searchInput.addEventListener(
        "input",
        () => {

            applyFilters();

        }
    );

}


/* ===============================
   ROLE FILTER
================================ */

function setupRoleFilter() {

    const filter =
        document.getElementById(
            "roleFilter"
        );


    filter.addEventListener(
        "change",
        () => {

            applyFilters();

        }
    );

}


/* ===============================
   APPLY FILTERS
================================ */

function applyFilters() {

    const search =
        document.getElementById(
            "communitySearch"
        ).value
            .toLowerCase()
            .trim();


    const role =
        document.getElementById(
            "roleFilter"
        ).value;


    const filtered =
        allUsers.filter(user => {

            const matchesSearch =

                user.name
                    .toLowerCase()
                    .includes(search)

                ||

                (user.bio || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (user.location || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (user.skills || [])
                    .some(
                        skill =>
                            skill
                                .toLowerCase()
                                .includes(search)
                    );


            const matchesRole =
                role === "all" ||
                user.role === role;


            return (
                matchesSearch &&
                matchesRole
            );

        });


    displayUsers(
        filtered
    );

}


/* ===============================
   NAVIGATION
================================ */

function setupNavigation() {

    const navigation = {

        navHome:
            "frontpage.html",

        navDiscover:
            "ideas.html",

        navIdeas:
            "ideas.html",

        navCommunity:
            "community.html",

        navMessages:
            "messages.html",

        navNotifications:
            "notification.html",

        navProfile:
            "profile.html"

    };


    Object.keys(
        navigation
    ).forEach(id => {

        const element =
            document.getElementById(id);


        if (element) {

            element.addEventListener(
                "click",
                () => {

                    window.location.href =
                        navigation[id];

                }
            );

        }

    });

}


/* ===============================
   SECURITY HELPER
================================ */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;

}