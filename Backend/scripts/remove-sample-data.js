// Removes the 5 sample accounts created by seed.js, and only data they own.
//
// DRY RUN by default — shows what would be deleted and changes nothing:
//     node scripts/remove-sample-data.js
// Actually delete (after reviewing the dry run):
//     node scripts/remove-sample-data.js --confirm
//
// Safety:
//  - Targets only these exact account IDs (from scripts/diagnose-data.js).
//  - Refuses to run if any of them has a password (i.e. is a real signed-up account).
//  - Ideas without an author (createdBy missing) are NOT touched.
//  - Real users are not deleted; only references to the sample accounts are removed
//    from their followers / following lists and from idea likes.

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SAMPLE_ACCOUNTS = {
    "6a7a116ec5bc2ec62bcc4655": "Sarah Jenkins",
    "6a7a116ec5bc2ec62bcc4656": "David Chen",
    "6a7a116ec5bc2ec62bcc4657": "Alex Mercer",
    "6a7a116ec5bc2ec62bcc4658": "Priya Nair",
    "6a7a116ec5bc2ec62bcc4659": "Rahul Menon"
};

const CONFIRM = process.argv.includes("--confirm");

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing from Backend/.env");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const ids = Object.keys(SAMPLE_ACCOUNTS).map(id => new mongoose.Types.ObjectId(id));

    console.log("Database:", mongoose.connection.name);
    console.log(CONFIRM ? "MODE: DELETE (--confirm)\n" : "MODE: DRY RUN (nothing will be changed)\n");

    // ---- Safety checks ----
    const accounts = await db.collection("users")
        .find({ _id: { $in: ids } }, { projection: { name: 1, password: 1 } }).toArray();

    const withPassword = accounts.filter(u => typeof u.password === "string" && u.password !== "");
    if (withPassword.length) {
        console.error("STOPPED: these accounts have a password, so they may be real users:");
        withPassword.forEach(u => console.error(`  - ${u.name} (${u._id})`));
        await mongoose.disconnect();
        process.exit(1);
    }

    const nameMismatch = accounts.filter(u => SAMPLE_ACCOUNTS[u._id.toString()] !== u.name);
    if (nameMismatch.length) {
        console.error("STOPPED: account names do not match the expected sample accounts:");
        nameMismatch.forEach(u => console.error(`  - ${u._id}: found "${u.name}"`));
        await mongoose.disconnect();
        process.exit(1);
    }

    // ---- What would be removed ----
    const ideas = await db.collection("ideas")
        .find({ createdBy: { $in: ids } }, { projection: { title: 1, createdBy: 1 } }).toArray();
    const messageFilter = { $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }] };
    const messageCount = await db.collection("messages").countDocuments(messageFilter);
    const notificationFilter = { $or: [{ actor: { $in: ids } }, { recipient: { $in: ids } }] };
    const notificationCount = await db.collection("notifications").countDocuments(notificationFilter);
    const relationFilter = { _id: { $nin: ids }, $or: [{ followers: { $in: ids } }, { following: { $in: ids } }] };
    const realUsersAffected = await db.collection("users").countDocuments(relationFilter);
    const likeFilter = { _id: { $nin: ideas.map(i => i._id) }, likedBy: { $in: ids } };
    const ideasWithSampleLikes = await db.collection("ideas").countDocuments(likeFilter);

    console.log(`Sample accounts to delete: ${accounts.length}`);
    accounts.forEach(u => console.log(`  - ${u.name} (${u._id})`));
    console.log(`\nIdeas owned by sample accounts: ${ideas.length}`);
    ideas.forEach(i => console.log(`  - "${i.title}" by ${SAMPLE_ACCOUNTS[i.createdBy.toString()]}`));
    console.log(`\nMessages sent to or from sample accounts: ${messageCount}`);
    console.log(`Notifications involving sample accounts: ${notificationCount}`);
    console.log(`Real users whose follower/following lists mention sample accounts: ${realUsersAffected} (lists cleaned, users kept)`);
    console.log(`Other ideas liked by sample accounts: ${ideasWithSampleLikes} (likes removed, ideas kept)`);

    if (!CONFIRM) {
        console.log("\nDry run only. Nothing was changed.");
        console.log("To delete the above, run: node scripts/remove-sample-data.js --confirm");
        await mongoose.disconnect();
        return;
    }

    // ---- Delete ----
    const r1 = await db.collection("ideas").deleteMany({ _id: { $in: ideas.map(i => i._id) } });
    const r2 = await db.collection("messages").deleteMany(messageFilter);
    const r3 = await db.collection("notifications").deleteMany(notificationFilter);
    const r4 = await db.collection("users").updateMany(relationFilter, { $pullAll: { followers: ids, following: ids } });

    // Recount likes on ideas the sample accounts had liked
    const likedIdeas = await db.collection("ideas").find(likeFilter, { projection: { _id: 1 } }).toArray();
    await db.collection("ideas").updateMany(likeFilter, { $pullAll: { likedBy: ids } });
    for (const idea of likedIdeas) {
        const fresh = await db.collection("ideas").findOne({ _id: idea._id }, { projection: { likedBy: 1 } });
        await db.collection("ideas").updateOne({ _id: idea._id }, { $set: { likes: (fresh.likedBy || []).length } });
    }

    const r5 = await db.collection("users").deleteMany({ _id: { $in: ids }, password: { $exists: false } });

    console.log("\nDone:");
    console.log(`  Ideas deleted: ${r1.deletedCount}`);
    console.log(`  Messages deleted: ${r2.deletedCount}`);
    console.log(`  Notifications deleted: ${r3.deletedCount}`);
    console.log(`  Real users' follow lists cleaned: ${r4.modifiedCount}`);
    console.log(`  Ideas' likes cleaned: ${likedIdeas.length}`);
    console.log(`  Sample accounts deleted: ${r5.deletedCount}`);

    await mongoose.disconnect();
}

main().catch(async err => {
    console.error("Failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
