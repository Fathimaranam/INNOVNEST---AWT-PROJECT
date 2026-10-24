const MESSAGES_API =
    "http://localhost:5000/api/messages";

const USERS_API =
    "http://localhost:5000/api/users";

let currentUser = null;

let allMessages = [];

let allUsers = [];

let conversations = [];

let selectedUser = null;



document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Messages page loaded"
        );

        if (typeof requireAuth === "function") {
            currentUser = await requireAuth();
            if (!currentUser) return;
            currentUser._id = currentUser._id || currentUser.id;
        }

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


        if (!currentUser && typeof fetchCurrentUser === "function") {
            currentUser = await fetchCurrentUser();
        }


        if (!currentUser) {

            throw new Error(
                "Current user session not found"
            );

        }

        currentUser._id = currentUser._id || currentUser.id;


        updateSidebarUser();


        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

        const messagesResponse =
            await fetch(MESSAGES_API, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });


        if (!messagesResponse.ok) {

            throw new Error(
                "Unable to load messages"
            );

        }


        allMessages =
            await messagesResponse.json();


        buildConversations();


        displayConversations();


        // Automatically select conversation if target user is in URL query parameters (e.g. from Message Author)
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get("user") || urlParams.get("userId");

        if (targetUserId) {

            let targetUser = allUsers.find(
                u => (u._id || u.id) === targetUserId
            );

            if (!targetUser) {

                try {

                    const singleUserRes = await fetch(`${USERS_API}/${targetUserId}`);

                    if (singleUserRes.ok) {

                        targetUser = await singleUserRes.json();

                    }

                } catch (e) {

                    console.error("Error fetching target user for chat:", e);

                }

            }

            if (targetUser) {

                targetUser._id = targetUser._id || targetUser.id;

                selectConversation(targetUser);

            }

        }


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

    if (!currentUser) {
        return;
    }

    if (typeof window.InnovNestAuth?.updateSidebarUser === "function") {
        window.InnovNestAuth.updateSidebarUser(currentUser);
        return;
    }

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

    markConversationNotificationsRead(user);


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


    if (conversationMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 40px auto; max-width: 380px; padding: 25px; text-align: center;">
                <h3>No messages yet</h3>
                <p>Start a new conversation with <strong>${escapeHTML(selectedUser.name)}</strong> by sending a message below.</p>
            </div>
        `;
        return;
    }


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

                const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

                const response =
                    await fetch(
                        MESSAGES_API,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify({

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


/* ===============================
   NOTIFICATIONS: opening a conversation
   marks that sender's message notifications as read
================================ */

async function markConversationNotificationsRead(user) {

    const userId = user && (user._id || user.id);
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

    if (!userId || !token) {
        return;
    }

    try {

        const res = await fetch("http://localhost:5000/api/notifications/read-all", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ type: "message", actor: String(userId) })
        });

        if (res.ok) {
            const data = await res.json();
            if (typeof setNotificationBadge === "function") {
                setNotificationBadge(data.unreadCount);
            }
        }

    } catch (error) {

        console.warn("Could not update message notifications:", error.message);

    }

}
