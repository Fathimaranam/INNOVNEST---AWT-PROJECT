const IDEAS_API = "http://localhost:5000/api/ideas";
const USERS_API = "http://localhost:5000/api/users";

let allIdeas = [];
let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {

    console.log("Frontpage loaded");

    setupNavigation();

    setupButtons();

    setupSearch();

    loadHomepageData();

});


/* ===============================
   LOAD HOMEPAGE DATA
================================ */

async function loadHomepageData() {

    try {

        const [ideasResponse, usersResponse] =
            await Promise.all([
                fetch(IDEAS_API),
                fetch(USERS_API)
            ]);


        if (!ideasResponse.ok) {
            throw new Error("Unable to load ideas");
        }


        if (!usersResponse.ok) {
            throw new Error("Unable to load users");
        }


        allIdeas =
            await ideasResponse.json();


        allUsers =
            await usersResponse.json();


        console.log(
            "Ideas loaded:",
            allIdeas.length
        );


        console.log(
            "Users loaded:",
            allUsers.length
        );


        updateHomepageStatistics();

        updateHeroIdea();

    } catch (error) {

        console.error(
            "Homepage data error:",
            error
        );

    }

}


/* ===============================
   UPDATE STATISTICS
================================ */

function updateHomepageStatistics() {

    const innovatorsStat =
        document.querySelector(
            ".stat:first-child strong"
        );


    const fundingStat =
        document.querySelector(
            ".stat:nth-child(2) strong"
        );


    if (innovatorsStat) {

        innovatorsStat.textContent =
            formatNumber(allUsers.length);

    }


    if (fundingStat) {

        /*
            This is a demo calculation.

            We use the number of ideas as a simple
            project statistic instead of displaying
            a fake $50M figure.
        */

        fundingStat.textContent =
            `${allIdeas.length} Ideas`;

    }

}


/* ===============================
   UPDATE HERO IDEA
================================ */

function updateHeroIdea() {

    if (allIdeas.length === 0) {
        return;
    }


    /*
        Find the most recently created idea.
    */

    const latestIdea =
        [...allIdeas].sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        )[0];


    const overlay =
        document.querySelector(
            ".image-overlay"
        );


    if (!overlay) {
        return;
    }


    const title =
        overlay.querySelector("strong");


    const description =
        overlay.querySelector("span");


    if (title) {

        title.textContent =
            latestIdea.title;

    }


    if (description) {

        description.textContent =
            `${latestIdea.category || "Startup"} • ${latestIdea.stage || "Idea Stage"}`;

    }

}


/* ===============================
   SEARCH
================================ */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }


            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!search) {
                return;
            }


            const matchingIdea =
                allIdeas.find(idea => {

                    return (

                        (idea.title || "")
                            .toLowerCase()
                            .includes(search)

                        ||

                        (idea.description || "")
                            .toLowerCase()
                            .includes(search)

                        ||

                        (idea.category || "")
                            .toLowerCase()
                            .includes(search)

                    );

                });


            if (matchingIdea) {

                window.location.href =
                    "ideas.html";

            } else {

                alert(
                    "No matching idea found."
                );

            }

        }
    );

}


/* ===============================
   BUTTONS
================================ */

function setupButtons() {

    const getStartedBtn =
        document.getElementById(
            "getStartedBtn"
        );


    const exploreIdeasBtn =
        document.getElementById(
            "exploreIdeasBtn"
        );


    const postIdeaBtn =
        document.getElementById(
            "postIdeaBtn"
        );


    if (getStartedBtn) {

        getStartedBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "ideas.html";

            }
        );

    }


    if (exploreIdeasBtn) {

        exploreIdeasBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "ideas.html";

            }
        );

    }


    if (postIdeaBtn) {

        postIdeaBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "ideas.html";

            }
        );

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
   NUMBER FORMATTER
================================ */

function formatNumber(number) {

    if (number >= 1000) {

        return (
            (number / 1000)
                .toFixed(1)
                .replace(".0", "")
            + "k+"
        );

    }


    return number;
}