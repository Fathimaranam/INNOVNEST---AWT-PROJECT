// ===============================
// InnoNest Messages JavaScript
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Messages page loaded");

    setupNavigation();

    setupMessageForm();

});


// ===============================
// SEND MESSAGE
// ===============================

function setupMessageForm() {

    const input = document.querySelector("#messageInput");

    const sendButton = document.querySelector("#sendMessageBtn");

    const messageContainer =
        document.querySelector("#messageContainer");


    if (!input || !sendButton || !messageContainer) {
        return;
    }


    sendButton.addEventListener("click", () => {

        const message = input.value.trim();


        if (message === "") {
            return;
        }


        const messageElement =
            document.createElement("div");


        messageElement.className = "sent-message";


        messageElement.textContent = message;


        messageContainer.appendChild(messageElement);


        input.value = "";


        messageContainer.scrollTop =
            messageContainer.scrollHeight;

    });


    input.addEventListener("keypress", (event) => {

        if (event.key === "Enter") {

            sendButton.click();

        }

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