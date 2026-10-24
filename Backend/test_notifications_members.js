// Focused tests for: real member lists, idea authorship status, follow/message notifications.
//
// Safe to run against a real database: it only creates temporary accounts with
// unique "@innovnest-test.local" emails and deletes ONLY the records it created.
// Set TEST_MONGODB_URI to use a separate database (recommended); otherwise MONGODB_URI is used.
//
// Run from Backend/:  node test_notifications_members.js

const path = require("path");
const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/user");
const Idea = require("./models/idea");
const Message = require("./models/message");
const Notification = require("./models/notification");
const app = require("./server");

const results = [];
function record(name, passed, details = "") {
    results.push({ name, passed });
    console.log(`${passed ? "✅" : "❌"} ${name}${details ? `\n   ${details}` : ""}`);
}

async function run() {
    const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("Set TEST_MONGODB_URI or MONGODB_URI");
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");

    await mongoose.connect(uri);
    console.log("Connected to database:", mongoose.connection.name);

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));
    const base = `http://localhost:${server.address().port}`;

    const stamp = Date.now();
    const emails = ["a", "b"].map(k => `test-${stamp}-${k}@innovnest-test.local`);
    const created = { userIds: [], ideaIds: [], rawUserIds: [] };

    const api = async (method, url, { token, body } = {}) => {
        const res = await fetch(base + url, {
            method,
            headers: {
                ...(body ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: body ? JSON.stringify(body) : undefined
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* empty body */ }
        return { status: res.status, data };
    };

    try {
        // ---------- Signup & login ----------
        const sa = await api("POST", "/api/auth/signup", { body: { name: "Test Alice", email: emails[0], password: "password123" } });
        const sb = await api("POST", "/api/auth/signup", { body: { name: "Test Bob", email: emails[1], password: "password123" } });
        if (sa.data?.user?.id) created.userIds.push(sa.data.user.id);
        if (sb.data?.user?.id) created.userIds.push(sb.data.user.id);
        record("Signup creates genuine users (password not returned)",
            sa.status === 201 && sb.status === 201 && sa.data.user.password === undefined,
            `statuses ${sa.status}/${sb.status}`);

        const stored = await User.findOne({ email: emails[0] }).select("+password").lean();
        record("Stored password is a bcrypt hash, not plain text",
            !!stored && stored.password !== "password123" && /^\$2[aby]\$/.test(stored.password));

        const la = await api("POST", "/api/auth/login", { body: { email: emails[0], password: "password123" } });
        const lb = await api("POST", "/api/auth/login", { body: { email: emails[1], password: "password123" } });
        const badLogin = await api("POST", "/api/auth/login", { body: { email: emails[0], password: "wrongpass1" } });
        const A = { id: sa.data.user.id, token: la.data?.token };
        const B = { id: sb.data.user.id, token: lb.data?.token };
        const me = await api("GET", "/api/auth/me", { token: A.token });
        record("Login authenticates registered users and rejects wrong passwords",
            la.status === 200 && !!A.token && badLogin.status === 401 && me.data?.user?.id === A.id,
            `login ${la.status}, wrong password ${badLogin.status}, /me ${me.status}`);

        // ---------- Real member list ----------
        const seedLike = await User.collection.insertOne({
            name: "Seed Sample", email: `seed-${stamp}@innovnest-test.local`, role: "Founder",
            followers: [], following: [], createdAt: new Date()
        });
        created.rawUserIds.push(seedLike.insertedId);

        const list = await api("GET", "/api/users");
        const ids = (list.data || []).map(u => String(u._id));
        record("Public member list contains newly registered users",
            list.status === 200 && ids.includes(A.id) && ids.includes(B.id));
        record("Public member list excludes accounts without credentials (seed/sample)",
            !ids.includes(String(seedLike.insertedId)));
        record("Public member list never exposes password or email",
            (list.data || []).every(u => u.password === undefined && u.email === undefined));

        // ---------- Idea authorship ----------
        const ci = await api("POST", "/api/ideas", {
            token: A.token,
            body: { title: `Test idea ${stamp}`, description: "d", category: "AI", stage: "Idea Stage", createdBy: B.id }
        });
        if (ci.data?._id) created.ideaIds.push(ci.data._id);
        record("New idea is authored by the authenticated user (body createdBy ignored)",
            ci.status === 201 && String(ci.data.createdBy?._id) === A.id && ci.data.authorStatus === "available",
            `status ${ci.status}, author ${ci.data?.createdBy?.name}`);

        const unauthIdea = await api("POST", "/api/ideas", { body: { title: "x", description: "x", category: "x", stage: "x" } });
        record("Creating an idea without login is rejected", unauthIdea.status === 401);

        const legacyNoAuthor = await Idea.collection.insertOne({ title: `Legacy ${stamp}`, description: "d", category: "c", stage: "s", createdAt: new Date() });
        const legacyDangling = await Idea.collection.insertOne({ title: `Dangling ${stamp}`, description: "d", category: "c", stage: "s", createdBy: new mongoose.Types.ObjectId(), createdAt: new Date() });
        created.ideaIds.push(String(legacyNoAuthor.insertedId), String(legacyDangling.insertedId));

        const ideas = await api("GET", "/api/ideas");
        const byId = id => (ideas.data || []).find(i => String(i._id) === String(id));
        const mine = byId(ci.data?._id);
        const l1 = byId(legacyNoAuthor.insertedId);
        const l2 = byId(legacyDangling.insertedId);
        record("Idea list shows the real author name without private fields",
            mine?.createdBy?.name === "Test Alice" && mine.createdBy.email === undefined && mine.createdBy.password === undefined);
        record("Legacy idea without createdBy is reported as not_recorded (no fake author)",
            l1 && l1.createdBy === null && l1.authorStatus === "not_recorded");
        record("Idea pointing at a deleted account is reported as account_missing",
            l2 && l2.createdBy === null && l2.authorStatus === "account_missing");

        const single = await api("GET", `/api/ideas/${ci.data?._id}`);
        record("Single idea endpoint resolves the author the same way",
            single.status === 200 && single.data.createdBy?.name === "Test Alice");

        const otherEdit = await api("PUT", `/api/ideas/${ci.data?._id}`, { token: B.token, body: { title: "hijack" } });
        record("Ownership check preserved: other users cannot edit the idea", otherEdit.status === 403);

        // ---------- Follow + notification ----------
        const f1 = await api("POST", `/api/users/${A.id}/follow`, { token: B.token });
        const f2 = await api("POST", `/api/users/${A.id}/follow`, { token: B.token });
        const aDoc = await User.findById(A.id).lean();
        const bDoc = await User.findById(B.id).lean();
        record("Follow persists in MongoDB on both users; duplicate follow rejected",
            f1.status === 200 && f2.status === 400 &&
            aDoc.followers.map(String).includes(B.id) && bDoc.following.map(String).includes(A.id));

        let followNotes = await Notification.countDocuments({ recipient: A.id, actor: B.id, type: "follow" });
        record("Follow creates exactly one notification for the followed user", followNotes === 1);

        const unf = await api("POST", `/api/users/${A.id}/unfollow`, { token: B.token });
        await api("POST", `/api/users/${A.id}/follow`, { token: B.token });
        followNotes = await Notification.countDocuments({ recipient: A.id, actor: B.id, type: "follow" });
        record("Unfollow then re-follow does not duplicate the follow notification",
            unf.status === 200 && followNotes === 1);

        const selfFollow = await api("POST", `/api/users/${A.id}/follow`, { token: A.token });
        const actorNotes = await Notification.countDocuments({ recipient: B.id });
        record("No notification for self-follow or for the acting user",
            selfFollow.status === 400 && actorNotes === 0);

        const followers = await api("GET", `/api/users/${A.id}/followers`);
        const following = await api("GET", `/api/users/${B.id}/following`);
        record("Followers/following lists come from persisted relationships (no email exposed)",
            followers.data?.some(u => String(u._id) === B.id) &&
            following.data?.some(u => String(u._id) === A.id) &&
            followers.data.every(u => u.email === undefined));

        // ---------- Message + notification ----------
        const m1 = await api("POST", "/api/messages", { token: B.token, body: { receiver: A.id, message: "Hello Alice" } });
        const m2 = await api("POST", "/api/messages", { token: B.token, body: { receiver: A.id, message: "Second message" } });
        const msgNotes = await Notification.find({ recipient: A.id, actor: B.id, type: "message" }).lean();
        record("New messages notify the recipient (grouped while unread)",
            m1.status === 201 && m2.status === 201 && msgNotes.length === 1 && msgNotes[0].count === 2 &&
            msgNotes[0].preview === "Second message",
            `notifications ${msgNotes.length}, count ${msgNotes[0]?.count}`);

        const senderNotes = await Notification.countDocuments({ recipient: B.id });
        record("Sender receives no notification for their own message", senderNotes === 0);

        // ---------- Retrieval, authorization, read state ----------
        const noAuth = await api("GET", "/api/notifications");
        record("Notifications require authentication", noAuth.status === 401);

        const listA = await api("GET", "/api/notifications", { token: A.token });
        const countA = await api("GET", "/api/notifications/unread-count", { token: A.token });
        const followItem = listA.data?.notifications?.find(n => n.type === "follow");
        const msgItem = listA.data?.notifications?.find(n => n.type === "message");
        record("Recipient retrieves notifications with accurate unread count and links",
            listA.status === 200 && listA.data.notifications.length === 2 && countA.data?.unreadCount === 2 &&
            followItem?.link === `profile.html?id=${B.id}` && msgItem?.link === `messages.html?user=${B.id}` &&
            followItem?.actor?.email === undefined,
            `count ${countA.data?.unreadCount}`);

        const listB = await api("GET", "/api/notifications", { token: B.token });
        const steal = await api("PATCH", `/api/notifications/${followItem?._id}/read`, { token: B.token });
        record("Users cannot see or modify another user's notifications",
            listB.data?.notifications?.length === 0 && steal.status === 404);

        const readOne = await api("PATCH", `/api/notifications/${followItem?._id}/read`, { token: A.token });
        record("Marking one notification read updates unread count",
            readOne.status === 200 && readOne.data.notification.read === true && readOne.data.unreadCount === 1);

        const readConv = await api("PATCH", "/api/notifications/read-all", { token: A.token, body: { type: "message", actor: B.id } });
        record("Opening a conversation marks that sender's message notifications read",
            readConv.status === 200 && readConv.data.unreadCount === 0);

        await api("POST", "/api/messages", { token: B.token, body: { receiver: A.id, message: "Third" } });
        const afterRead = await Notification.countDocuments({ recipient: A.id, type: "message" });
        const countAfter = await api("GET", "/api/notifications/unread-count", { token: A.token });
        record("A message after reading starts a new unread notification",
            afterRead === 2 && countAfter.data?.unreadCount === 1);

        const readAll = await api("PATCH", "/api/notifications/read-all", { token: A.token, body: {} });
        record("Mark all as read sets unread count to 0", readAll.data?.unreadCount === 0);

        const badType = await api("PATCH", "/api/notifications/read-all", { token: A.token, body: { type: "like" } });
        record("Unsupported notification types are rejected", badType.status === 400);
    } finally {
        // Remove ONLY data created by this test run
        const userIds = [...created.userIds, ...created.rawUserIds.map(String)];
        await Notification.deleteMany({ $or: [{ recipient: { $in: userIds } }, { actor: { $in: userIds } }] });
        await Message.deleteMany({ $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }] });
        await Idea.deleteMany({ _id: { $in: created.ideaIds } });
        await User.updateMany({ $or: [{ followers: { $in: userIds } }, { following: { $in: userIds } }] }, { $pull: { followers: { $in: userIds }, following: { $in: userIds } } });
        await User.deleteMany({ _id: { $in: userIds } });

        server.close();
        await mongoose.disconnect();

        const passed = results.filter(r => r.passed).length;
        console.log(`\nSUMMARY: ${passed}/${results.length} passed`);
        process.exit(passed === results.length ? 0 : 1);
    }
}

run().catch(err => {
    console.error("Fatal:", err.message);
    process.exit(1);
});
