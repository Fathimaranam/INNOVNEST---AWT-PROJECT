const MESSAGES_API =
    "http://localhost:5000/api/messages";

const USERS_API =
    "http://localhost:5000/api/users";


// Sarah is our current demo user
const CURRENT_USER_EMAIL =
    "sarah@innovnest.com";


let currentUser = null;

let allMessages = [];

let allUsers = [];

let conversations = [];

let selectedUser = null;



document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Messages page loaded"
        );

        setupNavigation();

        setupSearch();

        setupMessageForm();

        loadMessages();

    }
);



/* ===============================
   LOAD USERS + MESSAGES
================================ */

async function loadMessages() {

    try {

        const usersResponse =
            await fetch(USERS_API);


        if (!usersResponse.ok) {

            throw new Error(
                "Unable to load users"
            );

        }


        allUsers =
            await usersResponse.json();


        currentUser =
            allUsers.find(
                user =>
                    user.email ===
                    CURRENT_USER_EMAIL
            );


        if (!currentUser) {

            throw new Error(
                "Current demo user not found"
            );

        }


        updateSidebarUser();


        const messagesResponse =
            await fetch(MESSAGES_API);


        if (!messagesResponse.ok) {

            throw new Error(
                "Unable to load messages"
            );

        }


        allMessages =
            await messagesResponse.json();


        buildConversations();


        displayConversations();


    } catch (error) {

        console.error(
            "Message loading error:",
            error
        );


        document.getElementById(
            "conversationList"
        ).innerHTML = `

            <div class="empty-state">

                <h3>
                    Unable to load messages
                </h3>

                <p>
                    Make sure the backend is running.
                </p>

            </div>

        `;

    }

}



/* ===============================
   SIDEBAR USER
================================ */

function updateSidebarUser() {

    const firstLetter =
        currentUser.name
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "sidebarAvatar"
    ).textContent =
        firstLetter;


    document.getElementById(
        "sidebarName"
    ).textContent =
        currentUser.name;


    document.getElementById(
        "sidebarEmail"
    ).textContent =
        currentUser.email;

}



/* ===============================
   BUILD CONVERSATIONS
================================ */

function buildConversations() {

    const map = new Map();


    allMessages.forEach(message => {

        const sender =
            message.sender;

        const receiver =
            message.receiver;


        if (!sender || !receiver) {
            return;
        }


        let otherUser;


        if (
            sender._id === currentUser._id
        ) {

            otherUser = receiver;

        } else {

            otherUser = sender;

        }


        if (
            otherUser._id ===
            currentUser._id
        ) {

            return;

        }


        const existing =
            map.get(otherUser._id);


        if (
            !existing ||
            new Date(message.createdAt)
            >
            new Date(existing.lastMessage.createdAt)
        ) {

            map.set(
                otherUser._id,
                {
                    user: otherUser,
                    lastMessage: message
                }
            );

        }

    });


    conversations =
        Array.from(map.values());


    conversations.sort(
        (a, b) =>
            new Date(
                b.lastMessage.createdAt
            ) -
            new Date(
                a.lastMessage.createdAt
            )
    );

}



/* ===============================
   DISPLAY CONVERSATIONS
================================ */

function displayConversations(
    filteredConversations =
        conversations
) {

    const container =
        document.getElementById(
            "conversationList"
        );


    const count =
        document.getElementById(
            "conversationCount"
        );


    count.textContent =
        filteredConversations.length;


    container.innerHTML = "";


    if (
        filteredConversations.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <h3>
                    No conversations
                </h3>

                <p>
                    No messages found.
                </p>

            </div>

        `;

        return;

    }


    filteredConversations.forEach(
        conversation => {

            const user =
                conversation.user;


            const lastMessage =
                conversation.lastMessage;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "conversation-item";


            if (
                selectedUser &&
                selectedUser._id === user._id
            ) {

                item.classList.add(
                    "active"
                );

            }


            const firstLetter =
                user.name
                    .charAt(0)
                    .toUpperCase();


            item.innerHTML = `

                <div class="conversation-avatar">
                    ${firstLetter}
                </div>


                <div class="conversation-info">

                    <strong>
                        ${escapeHTML(
                            user.name
                        )}
                    </strong>


                    <div class="conversation-preview">
                        ${escapeHTML(
                            lastMessage.message
                        )}
                    </div>

                </div>


                <span class="conversation-time">
                    ${formatTime(
                        lastMessage.createdAt
                    )}
                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    selectConversation(
                        user
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}



/* ===============================
   SELECT CONVERSATION
================================ */

function selectConversation(user) {

    selectedUser = user;


    document.getElementById(
        "chatEmpty"
    ).classList.add(
        "hidden"
    );


    document.getElementById(
        "activeChat"
    ).classList.remove(
        "hidden"
    );


    const firstLetter =
        user.name
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "chatUserAvatar"
    ).textContent =
        firstLetter;


    document.getElementById(
        "chatUserName"
    ).textContent =
        user.name;


    document.getElementById(
        "chatUserRole"
    ).textContent =
        user.role || "Member";


    displayChatMessages();


    displayConversations();

}



/* ===============================
   DISPLAY CHAT MESSAGES
================================ */

function displayChatMessages() {

    const container =
        document.getElementById(
            "chatMessages"
        );


    container.innerHTML = "";


    if (!selectedUser) {
        return;
    }


    const conversationMessages =
        allMessages.filter(
            message => {

                if (
                    !message.sender ||
                    !message.receiver
                ) {

                    return false;

                }


                const senderId =
                    message.sender._id;


                const receiverId =
                    message.receiver._id;


                return (

                    (
                        senderId ===
                        currentUser._id

                        &&

                        receiverId ===
                        selectedUser._id
                    )

                    ||

                    (
                        senderId ===
                        selectedUser._id

                        &&

                        receiverId ===
                        currentUser._id
                    )

                );

            }
        );


    conversationMessages.forEach(
        message => {

            const isSent =
                message.sender._id ===
                currentUser._id;


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "message-bubble-container";


            wrapper.classList.add(
                isSent
                    ? "sent"
                    : "received"
            );


            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                "message-bubble";


            bubble.classList.add(
                isSent
                    ? "sent"
                    : "received"
            );


            bubble.innerHTML = `

                ${escapeHTML(
                    message.message
                )}

                <span class="message-time">
                    ${formatDateTime(
                        message.createdAt
                    )}
                </span>

            `;


            wrapper.appendChild(
                bubble
            );


            container.appendChild(
                wrapper
            );

        }
    );


    container.scrollTop =
        container.scrollHeight;

}



/* ===============================
   SEND MESSAGE
================================ */

function setupMessageForm() {

    const form =
        document.getElementById(
            "messageForm"
        );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!selectedUser) {

                alert(
                    "Please select a conversation first."
                );

                return;

            }


            const input =
                document.getElementById(
                    "messageInput"
                );


            const messageText =
                input.value.trim();


            if (!messageText) {
                return;
            }


            try {

                const response =
                    await fetch(
                        MESSAGES_API,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    sender:
                                        currentUser._id,

                                    receiver:
                                        selectedUser._id,

                                    message:
                                        messageText

                                })

                        }
                    );


                const newMessage =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        newMessage.message ||
                        "Failed to send message"
                    );

                }


                allMessages.push(
                    newMessage
                );


                input.value = "";


                displayChatMessages();


                buildConversations();


                displayConversations();


            } catch (error) {

                console.error(
                    "Send message error:",
                    error
                );


                alert(
                    "Failed to send message."
                );

            }

        }
    );

}



/* ===============================
   SEARCH CONVERSATIONS
================================ */

function setupSearch() {

    const search =
        document.getElementById(
            "messageSearch"
        );


    search.addEventListener(
        "input",
        () => {

            const value =
                search.value
                    .toLowerCase()
                    .trim();


            const filtered =
                conversations.filter(
                    conversation =>
                        conversation.user.name
                            .toLowerCase()
                            .includes(value)
                );


            displayConversations(
                filtered
            );

        }
    );

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


    Object.keys(
        navigation
    ).forEach(id => {

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

    });

}



/* ===============================
   DATE HELPERS
================================ */

function formatTime(date) {

    if (!date) {
        return "";
    }


    return new Date(date)
        .toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


function formatDateTime(date) {

    if (!date) {
        return "";
    }


    return new Date(date)
        .toLocaleString(
            [],
            {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}



/* ===============================
   SECURITY HELPER
================================ */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;

}