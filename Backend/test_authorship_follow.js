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
    console.log("TESTING IDEA AUTHORSHIP & FOLLOWERS/FOLLOWING");
    console.log("==================================================");

    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log("Connected to MongoDB:", mongoose.connection.name);

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Test server running on ${baseUrl}`);

    const results = [];

    function record(testNumber, group, description, passed, details = "") {
        results.push({ testNumber, group, description, passed, details });
        const icon = passed ? "✅" : "❌";
        console.log(`${icon} [${group}] Test ${testNumber}: ${description}`);
        if (details) console.log(`   Details: ${details}`);
    }

    try {
        const users = await User.find({}).limit(2);
        if (users.length < 2) {
            throw new Error("Need at least 2 users in the database to test.");
        }

        const accountA = users[0];
        const accountB = users[1];

        const tokenA = jwt.sign({ id: accountA._id, email: accountA.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const tokenB = jwt.sign({ id: accountB._id, email: accountB.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        console.log(`Account A: ${accountA.name} (${accountA._id})`);
        console.log(`Account B: ${accountB.name} (${accountB._id})`);

        // Ensure clean initial follow state between A and B
        await User.findByIdAndUpdate(accountA._id, { $pull: { following: accountB._id, followers: accountB._id } });
        await User.findByIdAndUpdate(accountB._id, { $pull: { following: accountA._id, followers: accountA._id } });

        // ==================================================
        // PART 1: IDEA AUTHORSHIP TESTS
        // ==================================================
        let createdIdeaId = null;

        // 1. Account B creates a new idea
        {
            const res = await fetch(`${baseUrl}/api/ideas`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenB}`
                },
                body: JSON.stringify({
                    title: "NextGen Quantum AI",
                    description: "High-performance AI model platform for startups",
                    category: "Technology",
                    stage: "Prototype",
                    visibility: "public"
                })
            });
            const data = await res.json();
            createdIdeaId = data._id;
            const passed = res.status === 201 && data.createdBy && (data.createdBy._id || data.createdBy) === accountB._id.toString();
            record(1, "Idea Authorship", "Account B creates idea and createdBy is assigned to Account B", passed,
                `Status: ${res.status}, Author Name: ${data.createdBy?.name}, Author ID: ${data.createdBy?._id}`);
        }

        // 2. Account A retrieves ideas and verifies Account B appears as author
        {
            const res = await fetch(`${baseUrl}/api/ideas`);
            const ideas = await res.json();
            const found = ideas.find(i => i._id === createdIdeaId);
            const passed = !!found && found.createdBy && found.createdBy.name === accountB.name && (found.createdBy._id === accountB._id.toString());
            record(2, "Idea Authorship", "Account B's actual name and profile info appear on ideas retrieval", passed,
                `Idea Found: ${!!found}, Author Name in list: ${found?.createdBy?.name}, Expected: ${accountB.name}`);
        }

        // 3. View Profile check: GET /api/users/:accountBId returns Account B's profile
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}`);
            const profileB = await res.json();
            const passed = res.status === 200 && profileB._id === accountB._id.toString() && profileB.name === accountB.name && profileB.password === undefined;
            record(3, "Idea Authorship", "Account B's public profile is retrievable via View Profile route", passed,
                `Status: ${res.status}, Profile Name: ${profileB.name}, Password excluded: ${profileB.password === undefined}`);
        }

        // 4. Message Author: Account A initiates conversation with Account B
        let sentMessageId = null;
        {
            const res = await fetch(`${baseUrl}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    receiver: accountB._id.toString(),
                    message: "Hi! I saw your Quantum AI idea and would love to collaborate."
                })
            });
            const msgData = await res.json();
            sentMessageId = msgData._id;
            const passed = res.status === 201 && msgData.sender._id === accountA._id.toString() && msgData.receiver._id === accountB._id.toString();
            record(4, "Idea Authorship", "Message Author correctly creates/sends message to the idea author", passed,
                `Status: ${res.status}, Sender: ${msgData.sender?.name}, Receiver: ${msgData.receiver?.name}`);
        }

        // 5. Self-messaging prevention: Account B cannot message themselves
        {
            const res = await fetch(`${baseUrl}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenB}`
                },
                body: JSON.stringify({
                    receiver: accountB._id.toString(),
                    message: "Self message attempt"
                })
            });
            const passed = res.status === 400;
            record(5, "Idea Authorship", "Prevent users from messaging themselves through their own ideas", passed,
                `Status: ${res.status} (400 expected)`);
        }

        // 6. Handle legacy ideas without authors safely
        {
            const res = await fetch(`${baseUrl}/api/ideas`);
            const ideas = await res.json();
            const legacyIdeas = ideas.filter(i => !i.createdBy);
            const passed = legacyIdeas.length > 0;
            record(6, "Idea Authorship", "Existing legacy ideas without authors handled safely without crashes", passed,
                `Legacy ideas without author reference: ${legacyIdeas.length} found`);
        }

        // Clean up idea and message created during test
        if (createdIdeaId) await Idea.findByIdAndDelete(createdIdeaId);
        if (sentMessageId) await Message.findByIdAndDelete(sentMessageId);

        // ==================================================
        // PART 2: FOLLOWERS & FOLLOWING TESTS
        // ==================================================

        // 7. Account A follows Account B
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}/follow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const data = await res.json();
            const passed = res.status === 200 && data.isFollowing === true;
            record(7, "Followers/Following", "Account A successfully follows Account B", passed,
                `Status: ${res.status}, isFollowing: ${data.isFollowing}, B followers count: ${data.followersCount}`);
        }

        // 8. Verify B appears in A's following list
        {
            const res = await fetch(`${baseUrl}/api/users/${accountA._id}/following`);
            const followingList = await res.json();
            const bInFollowing = Array.isArray(followingList) && followingList.some(u => (u._id || u).toString() === accountB._id.toString());
            record(8, "Followers/Following", "Account B appears in Account A's following list", bInFollowing,
                `Following count: ${followingList.length}, B present: ${bInFollowing}`);
        }

        // 9. Verify A appears in B's followers list
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}/followers`);
            const followersList = await res.json();
            const aInFollowers = Array.isArray(followersList) && followersList.some(u => (u._id || u).toString() === accountA._id.toString());
            record(9, "Followers/Following", "Account A appears in Account B's followers list", aInFollowers,
                `Followers count: ${followersList.length}, A present: ${aInFollowers}`);
        }

        // 10. Refresh verification: retrieve both profiles from MongoDB and check persistence
        {
            const resA = await fetch(`${baseUrl}/api/users/${accountA._id}`);
            const profileA = await resA.json();
            const resB = await fetch(`${baseUrl}/api/users/${accountB._id}`);
            const profileB = await resB.json();

            const persisted = profileA.followingCount >= 1 && profileB.followersCount >= 1;
            record(10, "Followers/Following", "Follow relationship persists in MongoDB across profile refreshes", persisted,
                `A followingCount: ${profileA.followingCount}, B followersCount: ${profileB.followersCount}`);
        }

        // 11. Attempt to follow the same person twice (prevent duplicate follow)
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}/follow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const data = await res.json();
            const duplicateBlocked = res.status === 400 && data.message.includes("already following");
            record(11, "Followers/Following", "Duplicate follow requests are rejected", duplicateBlocked,
                `Status: ${res.status} (400 expected), Message: ${data.message}`);
        }

        // 12. Attempt to follow oneself (prevent self-follow)
        {
            const res = await fetch(`${baseUrl}/api/users/${accountA._id}/follow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const data = await res.json();
            const selfFollowBlocked = res.status === 400 && data.message.includes("cannot follow yourself");
            record(12, "Followers/Following", "Self-follow requests are rejected", selfFollowBlocked,
                `Status: ${res.status} (400 expected), Message: ${data.message}`);
        }

        // 13. Attempt unauthorized follow without token
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}/follow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const unauthBlocked = res.status === 401;
            record(13, "Followers/Following", "Unauthenticated follow requests are rejected", unauthBlocked,
                `Status: ${res.status} (401 expected)`);
        }

        // 14. Account A unfollows Account B
        {
            const res = await fetch(`${baseUrl}/api/users/${accountB._id}/unfollow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenA}`
                }
            });
            const data = await res.json();
            const unfollowPassed = res.status === 200 && data.isFollowing === false;

            // Verify B is no longer in A's following list
            const resFollowing = await fetch(`${baseUrl}/api/users/${accountA._id}/following`);
            const followingList = await resFollowing.json();
            const bRemoved = !followingList.some(u => (u._id || u).toString() === accountB._id.toString());

            // Verify A is no longer in B's followers list
            const resFollowers = await fetch(`${baseUrl}/api/users/${accountB._id}/followers`);
            const followersList = await resFollowers.json();
            const aRemoved = !followersList.some(u => (u._id || u).toString() === accountA._id.toString());

            const passed = unfollowPassed && bRemoved && aRemoved;
            record(14, "Followers/Following", "Unfollow removes relationship consistently from both users' lists & counts", passed,
                `Unfollow status: ${res.status}, B removed from A: ${bRemoved}, A removed from B: ${aRemoved}`);
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
    console.error("Fatal error:", err);
    process.exit(1);
});
