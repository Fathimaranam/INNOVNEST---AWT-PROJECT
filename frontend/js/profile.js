const USERS_API = "http://localhost:5000/api/users";
const IDEAS_API = "http://localhost:5000/api/ideas";


let currentUser = null;
let displayedUser = null;
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

    setupFollowButton();

    setupFollowListModals();

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

        const urlParams = new URLSearchParams(window.location.search);
        const profileUserId = urlParams.get("id") || urlParams.get("userId");

        const isViewingOther = profileUserId && profileUserId !== currentUser._id;

        if (isViewingOther) {

            const res = await fetch(`${USERS_API}/${profileUserId}`);

            if (!res.ok) {
                throw new Error("Profile not found");
            }

            displayedUser = await res.json();
            displayedUser._id = displayedUser._id || displayedUser.id;

        } else {

            // Refresh current user data from backend for latest follow relationship status
            try {
                const res = await fetch(`${USERS_API}/${currentUser._id}`);
                if (res.ok) {
                    displayedUser = await res.json();
                    displayedUser._id = displayedUser._id || displayedUser.id;
                } else {
                    displayedUser = currentUser;
                }
            } catch (e) {
                displayedUser = currentUser;
            }

        }

        displayProfile(displayedUser, isViewingOther);

        await loadUserIdeas(displayedUser._id);

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

function displayProfile(user, isViewingOther = false) {

    const firstLetter =
        user.name
            ? user.name.charAt(0).toUpperCase()
            : "U";


    // Always keep sidebar representing the currently logged in user
    if (typeof updateSidebarUser === "function" && currentUser) {
        updateSidebarUser(currentUser);
    }

    document.getElementById("profileAvatar")
        .textContent = firstLetter;


    document.getElementById("profileName")
        .textContent = user.name;


    document.getElementById("profileRole")
        .textContent = user.role || "Member";


    document.getElementById("profileLocation")
        .textContent =
        "📍 " + (user.location || "Location not specified");


    document.getElementById("profileBio")
        .textContent =
        user.bio || "No bio available.";


    const followersCount = user.followersCount !== undefined
        ? user.followersCount
        : (Array.isArray(user.followers) ? user.followers.length : (user.followers || 0));

    const followingCount = user.followingCount !== undefined
        ? user.followingCount
        : (Array.isArray(user.following) ? user.following.length : (user.following || 0));

    document.getElementById("followersCount")
        .textContent = followersCount;


    document.getElementById("followingCount")
        .textContent = followingCount;


    document.getElementById("connectionsCount")
        .textContent =
        user.connections || 0;


    displaySkills(user.skills || []);

    // Configure action buttons
    const editBtn = document.getElementById("editProfileBtn");
    const followBtn = document.getElementById("followProfileBtn");
    const messageBtn = document.getElementById("messageProfileBtn");

    if (isViewingOther) {

        if (editBtn) editBtn.classList.add("hidden");
        if (followBtn) followBtn.classList.remove("hidden");
        if (messageBtn) {
            messageBtn.classList.remove("hidden");
            messageBtn.href = `messages.html?user=${user._id}`;
        }

        // Determine if current logged-in user is already following this user
        const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
        const isFollowing = Array.isArray(user.followers) &&
            user.followers.some(f => {
                const fid = typeof f === "object" ? (f._id || f.id) : f;
                return fid && fid.toString() === currentUserId.toString();
            });

        updateFollowButtonUI(isFollowing);

    } else {

        if (editBtn) editBtn.classList.remove("hidden");
        if (followBtn) followBtn.classList.add("hidden");
        if (messageBtn) messageBtn.classList.add("hidden");

    }

}


/* ===============================
   FOLLOW / UNFOLLOW BUTTON
================================ */

function setupFollowButton() {

    const followBtn = document.getElementById("followProfileBtn");

    if (!followBtn) return;

    followBtn.addEventListener("click", async () => {

        if (!displayedUser || !currentUser) return;

        const targetId = displayedUser._id || displayedUser.id;
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");
        const isCurrentlyFollowing = followBtn.classList.contains("following-btn");

        followBtn.disabled = true;

        try {

            const endpoint = isCurrentlyFollowing
                ? `${USERS_API}/${targetId}/unfollow`
                : `${USERS_API}/${targetId}/follow`;

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

            updateFollowButtonUI(data.isFollowing);

            if (data.followersCount !== undefined) {
                document.getElementById("followersCount").textContent = data.followersCount;
                displayedUser.followersCount = data.followersCount;
            }

        } catch (err) {

            console.error("Follow error:", err);
            alert(err.message);

        } finally {

            followBtn.disabled = false;

        }

    });

}

function updateFollowButtonUI(isFollowing) {

    const followBtn = document.getElementById("followProfileBtn");
    if (!followBtn) return;

    if (isFollowing) {
        followBtn.textContent = "Unfollow";
        followBtn.classList.add("following-btn");
    } else {
        followBtn.textContent = "Follow";
        followBtn.classList.remove("following-btn");
    }

}


/* ===============================
   FOLLOWERS & FOLLOWING LIST MODAL
================================ */

function setupFollowListModals() {

    const followersCard = document.getElementById("followersStatCard");
    const followingCard = document.getElementById("followingStatCard");
    const modal = document.getElementById("followListModal");
    const closeBtn = document.getElementById("closeFollowListModal");

    if (followersCard) {
        followersCard.addEventListener("click", () => {
            openFollowListModal("followers");
        });
    }

    if (followingCard) {
        followingCard.addEventListener("click", () => {
            openFollowListModal("following");
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.add("hidden");
            }
        });
    }

}

async function openFollowListModal(type) {

    if (!displayedUser) return;

    const modal = document.getElementById("followListModal");
    const title = document.getElementById("followListModalTitle");
    const subtitle = document.getElementById("followListModalSubtitle");
    const container = document.getElementById("followListContainer");

    const isFollowers = type === "followers";
    title.textContent = isFollowers ? "Followers" : "Following";
    subtitle.textContent = isFollowers
        ? `People following ${displayedUser.name}`
        : `People ${displayedUser.name} follows`;

    container.innerHTML = `<div class="loading">Loading ${type}...</div>`;
    modal.classList.remove("hidden");

    try {

        const targetId = displayedUser._id || displayedUser.id;
        const res = await fetch(`${USERS_API}/${targetId}/${type}`);

        if (!res.ok) {
            throw new Error(`Unable to load ${type}`);
        }

        const list = await res.json();
        container.innerHTML = "";

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center;">
                    <p>${isFollowers ? "No followers yet." : "Not following anyone yet."}</p>
                </div>
            `;
            return;
        }

        list.forEach(u => {
            const item = document.createElement("div");
            item.className = "follow-user-item";
            const initial = u.name ? u.name.charAt(0).toUpperCase() : "?";

            item.innerHTML = `
                <div class="follow-user-avatar">${initial}</div>
                <div class="follow-user-info">
                    <strong>${escapeHTML(u.name)}</strong>
                    <span>${escapeHTML(u.role || "Member")}</span>
                </div>
                <a href="profile.html?id=${u._id || u.id}" class="follow-user-link">View Profile</a>
            `;

            container.appendChild(item);
        });

    } catch (err) {

        console.error("Error loading follow list:", err);
        container.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>Failed to load ${type}.</p></div>`;

    }

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