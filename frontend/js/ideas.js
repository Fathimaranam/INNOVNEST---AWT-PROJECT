const API_URL = "http://localhost:5000/api/ideas";

let allIdeas = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Ideas page loaded");

    if (typeof requireAuth === "function") {
        currentUser = await requireAuth();
        if (!currentUser) return;
        currentUser._id = currentUser._id || currentUser.id;
    } else if (typeof fetchCurrentUser === "function") {
        currentUser = await fetchCurrentUser();
        if (currentUser) currentUser._id = currentUser._id || currentUser.id;
    }

    setupNavigation();

    setupModal();

    setupIdeaForm();

    setupFilter();

    setupSearch();

    loadIdeas();

});


/* ===============================
   LOAD IDEAS
================================ */

async function loadIdeas() {

    const container =
        document.getElementById("ideasContainer");

    try {

        container.innerHTML = `
            <div class="loading">
                Loading ideas...
            </div>
        `;

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load ideas");
        }

        allIdeas = await response.json();

        displayIdeas(allIdeas);

        updateStatistics(allIdeas);

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    Unable to load ideas
                </h3>

                <p>
                    Make sure the backend server is running.
                </p>

            </div>
        `;

    }

}


/* ===============================
   DISPLAY IDEAS
================================ */

function displayIdeas(ideas) {

    const container =
        document.getElementById("ideasContainer");

    container.innerHTML = "";

    if (ideas.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    No ideas yet
                </h3>

                <p>
                    Be the first person to publish
                    a startup idea.
                </p>

            </div>
        `;

        return;

    }

    const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;

    ideas.forEach((idea) => {

        const hasAuthor = idea.createdBy && typeof idea.createdBy === "object" && idea.createdBy.name;
        // authorStatus comes from the API and explains a missing author honestly
        const missingAuthorLabel = idea.authorStatus === "account_missing"
            ? "Author account no longer exists"
            : "Author not recorded (legacy idea)";
        const authorName = hasAuthor ? idea.createdBy.name : missingAuthorLabel;
        const authorId = hasAuthor ? (idea.createdBy._id || idea.createdBy.id) : null;
        const authorRole = hasAuthor ? (idea.createdBy.role || "Founder") : "";
        const authorInitial = hasAuthor ? authorName.charAt(0).toUpperCase() : "?";
        const authorImage = hasAuthor && idea.createdBy.profileImage ? idea.createdBy.profileImage : null;

        const isOwner = currentUserId && authorId && currentUserId.toString() === authorId.toString();

        const card =
            document.createElement("div");

        card.className = "idea-card";

        card.id = `idea-${idea._id}`;

        const likedByMe = !!currentUserId &&
            Array.isArray(idea.likedBy) &&
            idea.likedBy.some(id => String(id) === String(currentUserId));

        const likeCount = idea.likes || 0;

        card.innerHTML = `

            <div class="idea-author-header">

                <div class="idea-author-info">

                    <div class="idea-author-avatar">
                        ${
                            authorImage
                                ? `<img src="${escapeHTML(authorImage)}" alt="${escapeHTML(authorName)}">`
                                : authorInitial
                        }
                    </div>

                    <div class="idea-author-details">

                        <span class="idea-author-name">
                            ${escapeHTML(authorName)}
                        </span>

                        ${
                            authorRole
                                ? `<span class="idea-author-role">${escapeHTML(authorRole)}</span>`
                                : ""
                        }

                    </div>

                </div>

                <div class="idea-author-actions">

                    ${
                        authorId
                            ? `
                                <a href="profile.html?id=${authorId}" class="idea-btn-profile">
                                    View Profile
                                </a>

                                ${
                                    isOwner
                                        ? `
                                            <span class="idea-self-badge">
                                                Your Idea
                                            </span>
                                        `
                                        : `
                                            <a href="messages.html?user=${authorId}" class="idea-btn-message">
                                                Message Author
                                            </a>
                                        `
                                }
                            `
                            : `
                                <span class="idea-no-author">
                                    No profile available
                                </span>
                            `
                    }

                </div>

            </div>


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
                    ${escapeHTML(idea.category || "General")}
                </span>

                <span class="idea-tag">
                    ${escapeHTML(idea.stage || "Idea Stage")}
                </span>

                <button
                    type="button"
                    class="idea-like-btn ${likedByMe ? "liked" : ""}"
                    data-idea-id="${idea._id}"
                    aria-pressed="${likedByMe ? "true" : "false"}"
                    aria-label="${likedByMe ? "Unlike" : "Like"} this idea"
                >
                    <span class="idea-like-icon" aria-hidden="true">${likedByMe ? "♥" : "♡"}</span>
                    <span class="idea-like-count">${likeCount}</span>
                    <span>${likeCount === 1 ? "like" : "likes"}</span>
                </button>

            </div>

        `;

        container.appendChild(card);

    });

    setupLikeButtons(container);

    highlightLinkedIdea();

}


/* ===============================
   LIKES (one per member, saved in MongoDB)
================================ */

function setupLikeButtons(container) {

    container.querySelectorAll(".idea-like-btn").forEach((button) => {

        button.addEventListener("click", async () => {

            const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

            if (!token || !currentUser) {
                window.location.href = "login.html";
                return;
            }

            const ideaId = button.dataset.ideaId;
            const isLiked = button.getAttribute("aria-pressed") === "true";

            button.disabled = true;

            try {

                const response = await fetch(`${API_URL}/${ideaId}/like`, {
                    method: isLiked ? "DELETE" : "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Could not update like");
                }

                // Keep local data in sync so search/filter re-renders stay correct
                const myId = String(currentUser._id || currentUser.id);
                const idea = allIdeas.find(i => String(i._id) === String(ideaId));

                if (idea) {
                    const others = (idea.likedBy || []).filter(id => String(id) !== myId);
                    idea.likedBy = result.liked ? [...others, myId] : others;
                    idea.likes = result.likes;
                }

                button.classList.toggle("liked", result.liked);
                button.setAttribute("aria-pressed", result.liked ? "true" : "false");
                button.setAttribute("aria-label", `${result.liked ? "Unlike" : "Like"} this idea`);
                button.querySelector(".idea-like-icon").textContent = result.liked ? "♥" : "♡";
                button.querySelector(".idea-like-count").textContent = result.likes;
                button.lastElementChild.textContent = result.likes === 1 ? "like" : "likes";

                updateStatistics(allIdeas);

            } catch (error) {

                console.error("Like error:", error);
                alert(error.message);

            } finally {

                button.disabled = false;

            }

        });

    });

}


// Opening ideas.html?idea=<id> (e.g. from a "liked your idea" notification)
// scrolls to that idea and briefly highlights it.
function highlightLinkedIdea() {

    const ideaId = new URLSearchParams(window.location.search).get("idea");

    if (!ideaId) {
        return;
    }

    const card = document.getElementById(`idea-${ideaId}`);

    if (!card) {
        return;
    }

    card.classList.add("idea-highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => card.classList.remove("idea-highlight"), 2500);

}


/* ===============================
   STATISTICS
================================ */

function updateStatistics(ideas) {

    const totalIdeas =
        document.getElementById("totalIdeas");

    const totalLikes =
        document.getElementById("totalLikes");


    if (totalIdeas) {

        totalIdeas.textContent =
            ideas.length;

    }


    if (totalLikes) {

        const likes =
            ideas.reduce(
                (sum, idea) => sum + (idea.likes || 0),
                0
            );

        totalLikes.textContent = likes;

    }

}


/* ===============================
   MODAL
================================ */

function setupModal() {

    const modal =
        document.getElementById("ideaModal");

    const openButtons = [
        document.getElementById("createIdeaBtn"),
        document.getElementById("postIdeaBtn")
    ];

    const closeButton =
        document.getElementById("closeIdeaModal");


    openButtons.forEach((button) => {

        if (button) {

            button.addEventListener("click", () => {

                modal.classList.remove("hidden");

            });

        }

    });


    if (closeButton) {

        closeButton.addEventListener("click", () => {

            modal.classList.add("hidden");

        });

    }


    modal.addEventListener("click", (event) => {

        if (event.target === modal) {

            modal.classList.add("hidden");

        }

    });

}


/* ===============================
   CREATE IDEA
================================ */

function setupIdeaForm() {

    const form =
        document.getElementById("ideaForm");


    if (!form) {
        return;
    }


    form.addEventListener("submit", async (event) => {

        event.preventDefault();


        const title =
            document.getElementById("ideaTitle").value.trim();

        const description =
            document.getElementById("ideaDescription").value.trim();

        const category =
            document.getElementById("ideaCategory").value;

        const stage =
            document.getElementById("ideaStage").value;

        const visibility =
            document.getElementById("ideaVisibility").value;


        const message =
            document.getElementById("ideaFormMessage");


        const ideaData = {

            title,
            description,
            category,
            stage,
            visibility,
            status: "active"

        };


        try {

            message.textContent =
                "Publishing idea...";


            const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify(ideaData)

                });


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Failed to create idea"
                );

            }


            // Local UI feedback only — no self-notification is stored
            message.textContent =
                "✅ Idea published successfully!";


            form.reset();


            await loadIdeas();


            setTimeout(() => {

                document
                    .getElementById("ideaModal")
                    .classList.add("hidden");

                message.textContent = "";

            }, 1000);


        } catch (error) {

            console.error(error);

            message.textContent =
                "❌ " + error.message;

        }

    });

}


/* ===============================
   FILTER
================================ */

function setupFilter() {

    const filter =
        document.getElementById("ideaFilter");


    if (!filter) {
        return;
    }


    filter.addEventListener("change", () => {

        const value = filter.value;


        if (value === "all") {

            displayIdeas(allIdeas);

            return;

        }


        const filtered =
            allIdeas.filter(
                idea => idea.visibility === value
            );


        displayIdeas(filtered);

    });

}


/* ===============================
   SEARCH
================================ */

function setupSearch() {

    const searchInput =
        document.getElementById("searchInput");


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener("input", () => {

        const search =
            searchInput.value.toLowerCase().trim();


        const filtered =
            allIdeas.filter((idea) => {

                return (

                    idea.title
                        .toLowerCase()
                        .includes(search)

                    ||

                    idea.description
                        .toLowerCase()
                        .includes(search)

                    ||

                    idea.category
                        .toLowerCase()
                        .includes(search)

                );

            });


        displayIdeas(filtered);

    });

}


/* ===============================
   NAVIGATION
================================ */

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

        const element =
            document.getElementById(id);


        if (element) {

            element.addEventListener("click", () => {

                window.location.href =
                    navigation[id];

            });

        }

    });

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