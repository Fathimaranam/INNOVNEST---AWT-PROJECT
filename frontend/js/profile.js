// ===============================
// InnoNest Profile JavaScript
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Profile page loaded");

    setupNavigation();

    loadProfile();

});


// ===============================
// LOAD PROFILE
// ===============================

function loadProfile() {

    const profileName = document.querySelector("#profileName");

    if (profileName) {
        profileName.textContent = "Alex Mercer";
    }


    const profileBio = document.querySelector("#profileBio");

    if (profileBio) {

        profileBio.textContent =
            "Founder & Tech Enthusiast | Building the Future of Analytics";

    }

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