const path = require("path");
const dotenv = require("dotenv");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

dotenv.config({
    path: path.join(__dirname, ".env")
});

const User = require("./models/user");
const Idea = require("./models/idea");
const Message = require("./models/message");
const app = require("./server");

async function runTests() {
    console.log("==================================================");
    console.log("RUNNING PHASE 4.1 SECURITY & FUNCTIONALITY SUITE");
    console.log("==================================================");

    // Wait for mongoose connection if not yet connected
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log("Connected to MongoDB:", mongoose.connection.name);

    // Start a temporary HTTP server on an available port
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Test server running on ${baseUrl}`);

    const results = [];

    function record(testNumber, description, passed, details = "") {
        results.push({ testNumber, description, passed, details });
        const icon = passed ? "✅" : "❌";
        console.log(`${icon} Test ${testNumber}: ${description}`);
        if (details) console.log(`   Details: ${details}`);
    }

    try {
        // Fetch existing users for testing
        const existingUsers = await User.find({}).limit(4);
        if (existingUsers.length < 2) {
            throw new Error("Need at least 2 existing users in database to test authorization rules.");
        }

        const userA = existingUsers[0];
        const userB = existingUsers[1];
        const userC = existingUsers[2] || existingUsers[0];
        const userD = existingUsers[3] || existingUsers[1];

        const tokenA = jwt.sign({ id: userA._id, email: userA.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const tokenB = jwt.sign({ id: userB._id, email: userB.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const expiredToken = jwt.sign({ id: userA._id, email: userA.email }, process.env.JWT_SECRET, { expiresIn: "-1s" });

        console.log(`Testing with User A: ${userA.name} (${userA._id}) and User B: ${userB.name} (${userB._id})`);

        // --------------------------------------------------
        // TEST 1: Unauthenticated users cannot create ideas
        // --------------------------------------------------
        {
            const res = await fetch(`${baseUrl}/api/ideas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Test Unauth Idea",
                    description: "Desc",
                    category: "Tech",
                    stage: "Idea"
                })
            });
            const data = await res.json();
            const passed = res.status === 401 && data.message.includes("Access denied");
            record(1, "Unauthenticated users cannot create ideas", passed, `Status: ${res.status}, Message: ${data.message}`);
        }

        // --------------------------------------------------
        // TEST 2 & 3: Authenticated user creates idea & becomes actual creator
        // --------------------------------------------------
        let createdIdeaId = null;
        {
            const res = await fetch(`${baseUrl}/api/ideas`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    title: "Secured Idea by User A",
                    description: "A secure startup platform concept",
                    category: "Technology",
                    stage: "Prototype",
                    createdBy: userB._id.toString() // Attempt impersonation
                })
            });
            const data = await res.json();
            createdIdeaId = data._id;
            const passedCreate = res.status === 201 && !!data._id;
            record(2, "Authenticated users can create ideas", passedCreate, `Status: ${res.status}, ID: ${data._id}`);

            // createdBy is returned as the author object ({ _id, name, role }); accept an ID string too
            const creatorId = data.createdBy && typeof data.createdBy === "object" ? String(data.createdBy._id) : data.createdBy;
            const passedOwner = creatorId === userA._id.toString() && creatorId !== userB._id.toString();
            record(3, "The authenticated user becomes the actual idea creator (impersonation blocked)", passedOwner, `Creator ID: ${creatorId}, User A ID: ${userA._id}`);
        }

        // --------------------------------------------------
        // TEST 4: Users cannot update or delete ideas they do not own
        // --------------------------------------------------
        {
            // User B tries to update User A's idea
            const resUpdateB = await fetch(`${baseUrl}/api/ideas/${createdIdeaId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenB}`
                },
                body: JSON.stringify({ title: "Tampered by User B" })
            });
            const dataUpdateB = await resUpdateB.json();
            const updateBlocked = resUpdateB.status === 403;

            // User B tries to delete User A's idea
            const resDeleteB = await fetch(`${baseUrl}/api/ideas/${createdIdeaId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${tokenB}`
                }
            });
            const dataDeleteB = await resDeleteB.json();
            const deleteBlocked = resDeleteB.status === 403;

            // User A (owner) updates their own idea
            const resUpdateA = await fetch(`${baseUrl}/api/ideas/${createdIdeaId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({ title: "Updated by Owner User A" })
            });
            const dataUpdateA = await resUpdateA.json();
            const updateOwnerPassed = resUpdateA.status === 200 && dataUpdateA.title === "Updated by Owner User A";

            // User A (owner) cleans up the test idea
            const resDeleteA = await fetch(`${baseUrl}/api/ideas/${createdIdeaId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const deleteOwnerPassed = resDeleteA.status === 200;

            const passed = updateBlocked && deleteBlocked && updateOwnerPassed && deleteOwnerPassed;
            record(4, "Users cannot update or delete ideas they do not own (owner can update and delete)", passed,
                `User B update status: ${resUpdateB.status} (403 expected), User B delete status: ${resDeleteB.status} (403 expected), Owner update: ${resUpdateA.status}, Owner delete: ${resDeleteA.status}`);
        }

        // --------------------------------------------------
        // TEST 5: Unauthenticated users cannot send messages
        // --------------------------------------------------
        {
            const res = await fetch(`${baseUrl}/api/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiver: userB._id.toString(),
                    message: "Unauth message attempt"
                })
            });
            const data = await res.json();
            const passed = res.status === 401 && data.message.includes("Access denied");
            record(5, "Unauthenticated users cannot send messages", passed, `Status: ${res.status}, Message: ${data.message}`);
        }

        // --------------------------------------------------
        // TEST 6: Message senders are derived from authentication
        // --------------------------------------------------
        let createdMessageId = null;
        {
            // Valid send from User A to User B
            const res = await fetch(`${baseUrl}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    receiver: userB._id.toString(),
                    message: "Security verification test message"
                })
            });
            const data = await res.json();
            createdMessageId = data._id;

            const senderDerived = res.status === 201 && data.sender._id === userA._id.toString();

            // Self-messaging blocked
            const resSelf = await fetch(`${baseUrl}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    receiver: userA._id.toString(),
                    message: "Talking to myself"
                })
            });
            const selfBlocked = resSelf.status === 400;

            const passed = senderDerived && selfBlocked;
            record(6, "Message senders are derived from authentication (self-messaging prevented)", passed,
                `Sender ID: ${data.sender?._id}, Status: ${res.status}, Self-msg status: ${resSelf.status}`);

            // Clean up test message immediately
            if (createdMessageId) {
                await Message.findByIdAndDelete(createdMessageId);
            }
        }

        // --------------------------------------------------
        // TEST 7: Users cannot retrieve conversations they do not belong to
        // --------------------------------------------------
        {
            // 7a: Unauthenticated GET /api/messages fails with 401
            const resUnauth = await fetch(`${baseUrl}/api/messages`);
            const unauthBlocked = resUnauth.status === 401;

            // 7b: User A retrieves GET /api/messages (scoped to userA)
            const resUserA = await fetch(`${baseUrl}/api/messages`, {
                headers: { "Authorization": `Bearer ${tokenA}` }
            });
            const dataUserA = await resUserA.json();
            const onlyUserAMessages = resUserA.status === 200 && Array.isArray(dataUserA) &&
                dataUserA.every(m => m.sender._id === userA._id.toString() || m.receiver._id === userA._id.toString());

            // 7c: User A tries to view conversation between userB and userC
            const resSnoop = await fetch(`${baseUrl}/api/messages/${userB._id}/${userC._id}`, {
                headers: { "Authorization": `Bearer ${tokenA}` }
            });
            const snoopBlocked = resSnoop.status === 403;

            // 7d: User A views conversation between userA and userB
            const resOwnConvo = await fetch(`${baseUrl}/api/messages/${userA._id}/${userB._id}`, {
                headers: { "Authorization": `Bearer ${tokenA}` }
            });
            const ownConvoPassed = resOwnConvo.status === 200;

            const passed = unauthBlocked && onlyUserAMessages && snoopBlocked && ownConvoPassed;
            record(7, "Users cannot retrieve conversations they do not belong to", passed,
                `Unauth status: ${resUnauth.status}, Scoped messages: ${onlyUserAMessages}, Snoop status: ${resSnoop.status} (403 expected), Own convo: ${resOwnConvo.status}`);
        }

        // --------------------------------------------------
        // TEST 8: Users cannot modify or delete another user's profile
        // --------------------------------------------------
        {
            // Unauthenticated PUT
            const resUnauthPut = await fetch(`${baseUrl}/api/users/${userB._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bio: "Hacked" })
            });
            const unauthPutBlocked = resUnauthPut.status === 401;

            // User A attempts to modify User B's profile
            const resUserAPutB = await fetch(`${baseUrl}/api/users/${userB._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({ bio: "Attacker payload" })
            });
            const crossUserPutBlocked = resUserAPutB.status === 403;

            // User A attempts to delete User B's account
            const resUserADelB = await fetch(`${baseUrl}/api/users/${userB._id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const crossUserDelBlocked = resUserADelB.status === 403;

            // User A updates their own profile successfully
            const originalBio = userA.bio || "";
            const resSelfUpdate = await fetch(`${baseUrl}/api/users/${userA._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({ bio: "Verified secure bio" })
            });
            const dataSelfUpdate = await resSelfUpdate.json();
            const selfUpdatePassed = resSelfUpdate.status === 200 && dataSelfUpdate.bio === "Verified secure bio";
            const noPasswordInResponse = dataSelfUpdate.password === undefined;

            // Restore original bio
            await User.findByIdAndUpdate(userA._id, { bio: originalBio });

            const passed = unauthPutBlocked && crossUserPutBlocked && crossUserDelBlocked && selfUpdatePassed && noPasswordInResponse;
            record(8, "Users cannot modify or delete another user's profile (passwords protected)", passed,
                `Unauth PUT: ${resUnauthPut.status}, Cross-user PUT: ${resUserAPutB.status} (403), Cross-user DEL: ${resUserADelB.status} (403), Self PUT: ${resSelfUpdate.status}, Password hidden: ${noPasswordInResponse}`);
        }

        // --------------------------------------------------
        // TEST 9: Public idea discovery still works
        // --------------------------------------------------
        {
            const res = await fetch(`${baseUrl}/api/ideas`);
            const data = await res.json();
            const passed = res.status === 200 && Array.isArray(data) && data.length > 0;
            record(9, "Public idea discovery still works without authentication", passed,
                `Status: ${res.status}, Total ideas fetched: ${data.length}`);
        }

        // --------------------------------------------------
        // TEST 10: Existing ideas and message history remain available
        // --------------------------------------------------
        {
            const ideaCount = await Idea.countDocuments();
            const messageCount = await Message.countDocuments();
            const userCount = await User.countDocuments();
            const passed = ideaCount >= 12 && messageCount >= 14 && userCount >= 6;
            record(10, "Existing ideas and message history remain fully preserved", passed,
                `Preserved counts -> Users: ${userCount}, Ideas: ${ideaCount}, Messages: ${messageCount}`);
        }

        // --------------------------------------------------
        // TEST 11: Invalid and expired tokens are handled correctly
        // --------------------------------------------------
        {
            // Invalid token
            const resInvalid = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { "Authorization": "Bearer invalid.token.payload" }
            });
            const dataInvalid = await resInvalid.json();
            const invalidHandled = resInvalid.status === 401 && dataInvalid.message.includes("Invalid");

            // Expired token
            const resExpired = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${expiredToken}` }
            });
            const dataExpired = await resExpired.json();
            const expiredHandled = resExpired.status === 401 && dataExpired.message.includes("expired");

            const passed = invalidHandled && expiredHandled;
            record(11, "Invalid and expired tokens are handled correctly", passed,
                `Invalid status: ${resInvalid.status} (${dataInvalid.message}), Expired status: ${resExpired.status} (${dataExpired.message})`);
        }

        // --------------------------------------------------
        // TEST 12: Existing features still work after the changes
        // --------------------------------------------------
        {
            // GET /api/auth/me with valid token
            const resMe = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${tokenA}` }
            });
            const dataMe = await resMe.json();
            const mePassed = resMe.status === 200 && dataMe.user && dataMe.user.id === userA._id.toString();

            // GET /api/users (public directory)
            const resUsers = await fetch(`${baseUrl}/api/users`);
            const dataUsers = await resUsers.json();
            const usersPassed = resUsers.status === 200 && Array.isArray(dataUsers) && dataUsers.length > 0;
            const noPasswordsInUsers = dataUsers.every(u => u.password === undefined);

            const passed = mePassed && usersPassed && noPasswordsInUsers;
            record(12, "Existing features (auth/me, public user directory) still work after changes", passed,
                `Auth /me: ${resMe.status}, Public users: ${resUsers.status}, Passwords excluded: ${noPasswordsInUsers}`);
        }

    } finally {
        server.close();
        console.log("==================================================");
        const total = results.length;
        const passedCount = results.filter(r => r.passed).length;
        console.log(`TEST SUMMARY: ${passedCount}/${total} PASSED`);
        console.log("==================================================");
        process.exit(passedCount === total ? 0 : 1);
    }
}

runTests().catch(err => {
    console.error("Test runner fatal error:", err);
    process.exit(1);
});
