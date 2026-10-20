const API_URL = "http://localhost:5000/api/ideas";

let allIdeas = [];

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Ideas page loaded");

    if (typeof requireAuth === "function") {
        const user = await requireAuth();
        if (!user) return;
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


    ideas.forEach((idea) => {

        const card =
            document.createElement("div");

        card.className = "idea-card";

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
                    ${escapeHTML(idea.category || "General")}
                </span>

                <span class="idea-tag">
                    ${escapeHTML(idea.stage || "Idea Stage")}
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