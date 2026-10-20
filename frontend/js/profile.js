const USERS_API = "http://localhost:5000/api/users";
const IDEAS_API = "http://localhost:5000/api/ideas";


let currentUser = null;
let currentUserIdeas = [];


document.addEventListener("DOMContentLoaded", async () => {

    console.log("Profile page loaded");

    if (typeof requireAuth === "function") {
        currentUser = await requireAuth();
        if (!currentUser) return;
        currentUser._id = currentUser._id || currentUser.id;
    }

    setupNavigation();

    setupProfileModal();

    loadProfile();

});


/* ===============================
   LOAD PROFILE
================================ */

async function loadProfile() {

    try {

        if (!currentUser && typeof fetchCurrentUser === "function") {
            currentUser = await fetchCurrentUser();
        }

        if (!currentUser) {
            throw new Error("User session not found");
        }

        currentUser._id = currentUser._id || currentUser.id;

        displayProfile(currentUser);

        await loadUserIdeas(currentUser._id);

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        document.getElementById("profileName")
            .textContent = "Unable to load profile";

    }

}


/* ===============================
   DISPLAY PROFILE
================================ */

function displayProfile(user) {

    const firstLetter =
        user.name
            ? user.name.charAt(0).toUpperCase()
            : "U";


    if (typeof updateSidebarUser === "function") {
        updateSidebarUser(user);
    }

    document.getElementById("profileAvatar")
        .textContent = firstLetter;


    document.getElementById("sidebarAvatar")
        .textContent = firstLetter;


    document.getElementById("profileName")
        .textContent = user.name;


    document.getElementById("sidebarName")
        .textContent = user.name;


    document.getElementById("sidebarEmail")
        .textContent = user.email;


    document.getElementById("profileRole")
        .textContent = user.role || "Member";


    document.getElementById("profileLocation")
        .textContent =
        "📍 " + (user.location || "Location not specified");


    document.getElementById("profileBio")
        .textContent =
        user.bio || "No bio available.";


    document.getElementById("followersCount")
        .textContent =
        user.followers || 0;


    document.getElementById("followingCount")
        .textContent =
        user.following || 0;


    document.getElementById("connectionsCount")
        .textContent =
        user.connections || 0;


    displaySkills(user.skills || []);

}


/* ===============================
   DISPLAY SKILLS
================================ */

function displaySkills(skills) {

    const container =
        document.getElementById("profileSkills");

    container.innerHTML = "";


    if (skills.length === 0) {

        container.textContent =
            "No skills added yet.";

        return;

    }


    skills.forEach(skill => {

        const element =
            document.createElement("span");

        element.className =
            "profile-skill";

        element.textContent =
            skill;

        container.appendChild(element);

    });

}


/* ===============================
   LOAD USER IDEAS
================================ */

async function loadUserIdeas(userId) {

    try {

        const response =
            await fetch(IDEAS_API);

        if (!response.ok) {

            throw new Error(
                "Unable to load ideas"
            );

        }

        const ideas =
            await response.json();


        currentUserIdeas =
            ideas.filter(idea => {

                if (!idea.createdBy) {
                    return false;
                }

                const creatorId =
                    typeof idea.createdBy === "object"
                        ? idea.createdBy._id
                        : idea.createdBy;

                return creatorId === userId;

            });


        displayUserIdeas(
            currentUserIdeas
        );


    } catch (error) {

        console.error(
            "Error loading user ideas:",
            error
        );

    }

}


/* ===============================
   DISPLAY USER IDEAS
================================ */

function displayUserIdeas(ideas) {

    const container =
        document.getElementById(
            "userIdeasContainer"
        );


    const count =
        document.getElementById(
            "userIdeaCount"
        );


    count.textContent =
        `${ideas.length} idea${ideas.length === 1 ? "" : "s"}`;


    container.innerHTML = "";


    if (ideas.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    No ideas yet
                </h3>

                <p>
                    You haven't posted any ideas.
                </p>

            </div>
        `;

        return;

    }


    ideas.forEach(idea => {

        const card =
            document.createElement("div");

        card.className =
            "idea-card";


        card.innerHTML = `

            <div class="idea-card-top">

                <div>

                    <h3>
                        ${escapeHTML(idea.title)}
                    </h3>

                    <p class="idea-card-description">
                        ${escapeHTML(idea.description)}
                    </p>

                </div>

                <span class="idea-visibility">
                    ${idea.visibility || "public"}
                </span>

            </div>


            <div class="idea-meta">

                <span class="idea-tag">
                    ${escapeHTML(
                        idea.category || "General"
                    )}
                </span>

                <span class="idea-tag">
                    ${escapeHTML(
                        idea.stage || "Idea Stage"
                    )}
                </span>

                <span class="idea-likes">
                    ❤️ ${idea.likes || 0} likes
                </span>

            </div>

        `;


        container.appendChild(card);

    });

}


/* ===============================
   EDIT PROFILE MODAL
================================ */

function setupProfileModal() {

    const modal =
        document.getElementById(
            "profileModal"
        );


    const editButton =
        document.getElementById(
            "editProfileBtn"
        );


    const closeButton =
        document.getElementById(
            "closeProfileModal"
        );


    editButton.addEventListener(
        "click",
        () => {

            if (!currentUser) {
                return;
            }


            document.getElementById(
                "editName"
            ).value =
                currentUser.name || "";


            document.getElementById(
                "editBio"
            ).value =
                currentUser.bio || "";


            document.getElementById(
                "editLocation"
            ).value =
                currentUser.location || "";


            modal.classList.remove(
                "hidden"
            );

        }
    );


    closeButton.addEventListener(
        "click",
        () => {

            modal.classList.add(
                "hidden"
            );

        }
    );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                modal.classList.add(
                    "hidden"
                );

            }

        }
    );


    document.getElementById(
        "profileForm"
    ).addEventListener(
        "submit",
        updateProfile
    );

}


/* ===============================
   UPDATE PROFILE
================================ */

async function updateProfile(event) {

    event.preventDefault();


    if (!currentUser) {
        return;
    }


    const name =
        document.getElementById(
            "editName"
        ).value.trim();


    const bio =
        document.getElementById(
            "editBio"
        ).value.trim();


    const location =
        document.getElementById(
            "editLocation"
        ).value.trim();


    const message =
        document.getElementById(
            "profileFormMessage"
        );


    try {

        message.textContent =
            "Saving...";

        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

        const response =
            await fetch(
                `${USERS_API}/${currentUser._id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        name,
                        bio,
                        location
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Failed to update profile"
            );

        }


        currentUser =
            result;

        currentUser._id = currentUser._id || currentUser.id;
        localStorage.setItem("user", JSON.stringify(currentUser));

        displayProfile(
            currentUser
        );


        message.textContent =
            "✅ Profile updated!";


        setTimeout(() => {

            document.getElementById(
                "profileModal"
            ).classList.add(
                "hidden"
            );

            message.textContent = "";

        }, 1000);


    } catch (error) {

        console.error(error);

        message.textContent =
            "❌ " + error.message;

    }

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


    Object.keys(navigation).forEach(
        id => {

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

        }
    );

}


/* ===============================
   SECURITY HELPER
================================ */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}