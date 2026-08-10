// ===============================
// InnoNest Notifications JavaScript
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Notifications page loaded");

    setupNavigation();

    setupNotifications();

});


// ===============================
// NOTIFICATIONS
// ===============================

function setupNotifications() {

    const markAllButton =
        document.querySelector("#markAllRead");


    if (!markAllButton) {
        return;
    }


    markAllButton.addEventListener("click", () => {

        const notifications =
            document.querySelectorAll(".notification-item");


        notifications.forEach((notification) => {

            notification.classList.remove("unread");

        });


        markAllButton.textContent = "All Read";

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