// ===============================
// InnoNest Community JavaScript
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Community page loaded");

    setupNavigation();

    setupPostForm();

});


// ===============================
// CREATE COMMUNITY POST
// ===============================

function setupPostForm() {

    const postInput =
        document.querySelector("#postInput");

    const postButton =
        document.querySelector("#createPostBtn");

    const postContainer =
        document.querySelector("#postContainer");


    if (!postInput || !postButton || !postContainer) {
        return;
    }


    postButton.addEventListener("click", () => {

        const text = postInput.value.trim();


        if (text === "") {

            alert("Please enter something.");

            return;

        }


        const post = document.createElement("div");

        post.className = "community-post";


        post.innerHTML = `

            <strong>You</strong>

            <p>${text}</p>

            <small>Just now</small>

        `;


        postContainer.prepend(post);


        postInput.value = "";

    });

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