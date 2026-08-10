// ===============================
// InnoNest Ideas JavaScript
// ===============================

const API_URL = "http://localhost:5000/api/ideas";

document.addEventListener("DOMContentLoaded", () => {

    console.log("Ideas page loaded");

    loadIdeas();

    setupIdeaForm();

    setupNavigation();

});


// ===============================
// LOAD IDEAS FROM MONGODB
// ===============================

async function loadIdeas() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch ideas");
        }

        const ideas = await response.json();

        console.log("Ideas received:", ideas);

        displayIdeas(ideas);

    } catch (error) {

        console.error("Error loading ideas:", error);

    }

}


// ===============================
// DISPLAY IDEAS
// ===============================

function displayIdeas(ideas) {

    const container = document.querySelector("#ideasContainer");

    if (!container) {
        console.log("ideasContainer not found");
        return;
    }

    container.innerHTML = "";

    if (ideas.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No ideas yet</h3>
                <p>Be the first person to post an idea.</p>
            </div>
        `;

        return;
    }


    ideas.forEach((idea) => {

        const ideaCard = document.createElement("div");

        ideaCard.className = "idea-card";

        ideaCard.innerHTML = `
            <h3>${idea.title}</h3>

            <p>${idea.description}</p>

            <div class="idea-meta">
                <span>${idea.category || "General"}</span>
                <span>${idea.stage || "Idea Stage"}</span>
                <span>${idea.visibility || "Public"}</span>
            </div>

            <button onclick="viewIdea('${idea._id}')">
                View Idea
            </button>
        `;

        container.appendChild(ideaCard);

    });

}


// ===============================
// CREATE IDEA
// ===============================

function setupIdeaForm() {

    const form = document.querySelector("#ideaForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();


        const title = document.querySelector("#ideaTitle").value;
        const description =
            document.querySelector("#ideaDescription").value;

        const category =
            document.querySelector("#ideaCategory").value;

        const stage =
            document.querySelector("#ideaStage").value;


        const ideaData = {

            title: title,

            description: description,

            category: category,

            stage: stage,

            visibility: "public",

            status: "active"

        };


        try {

            const response = await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(ideaData)

            });


            const result = await response.json();


            if (!response.ok) {

                alert(result.message || "Failed to create idea");

                return;

            }


            alert("Idea created successfully!");

            form.reset();

            loadIdeas();


        } catch (error) {

            console.error("Error creating idea:", error);

            alert("Unable to connect to backend.");

        }

    });

}


// ===============================
// VIEW ONE IDEA
// ===============================

function viewIdea(id) {

    window.location.href = `idea-details.html?id=${id}`;

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