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


        const isCurrentUser =
            currentUser &&
            user._id === currentUser._id;


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

                <span class="community-followers">
                    ${user.followers || 0} followers
                </span>


                ${
                    isCurrentUser
                    ? `
                        <button
                            class="connect-button"
                            disabled
                        >
                            Your Profile
                        </button>
                    `
                    : `
                        <button
                            class="connect-button"
                            data-user-id="${user._id}"
                        >
                            Connect
                        </button>
                    `
                }

            </div>

        `;


        container.appendChild(card);

    });


    setupConnectButtons();

}


/* ===============================
   CONNECT BUTTON
================================ */

function setupConnectButtons() {

    const buttons =
        document.querySelectorAll(
            ".connect-button[data-user-id]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                button.textContent =
                    "Connected ✓";

                button.disabled = true;

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