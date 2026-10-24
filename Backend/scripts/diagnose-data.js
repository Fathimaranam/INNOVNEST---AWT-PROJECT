// READ-ONLY data diagnostic. Makes no writes.
// Run from Backend/:  node scripts/diagnose-data.js
// Reports why ideas show "Author unavailable" and which accounts are seed-only (no password).

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is missing from Backend/.env");
        process.exit(1);
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    console.log("Database:", mongoose.connection.name);

    const users = await db.collection("users")
        .find({}, { projection: { name: 1, password: 1 } }).toArray();
    const userIds = new Set(users.map(u => u._id.toString()));
    const registered = users.filter(u => typeof u.password === "string" && u.password !== "");
    const seedOnly = users.filter(u => !(typeof u.password === "string" && u.password !== ""));

    console.log(`\nUsers: ${users.length} total`);
    console.log(`  Registered via signup (have password hash): ${registered.length}`);
    console.log(`  Without password (seed/sample, cannot log in, hidden from member lists): ${seedOnly.length}`);
    seedOnly.forEach(u => console.log(`    - ${u.name} (${u._id})`));

    const ideas = await db.collection("ideas")
        .find({}, { projection: { title: 1, createdBy: 1 } }).toArray();

    const noField = ideas.filter(i => !i.createdBy);
    const dangling = ideas.filter(i => i.createdBy && !userIds.has(i.createdBy.toString()));
    const nonObjectId = ideas.filter(i => i.createdBy && !(i.createdBy instanceof mongoose.mongo.ObjectId));

    console.log(`\nIdeas: ${ideas.length} total`);
    console.log(`  No createdBy stored (created before authentication): ${noField.length}`);
    noField.forEach(i => console.log(`    - "${i.title}" (${i._id})`));
    console.log(`  createdBy points to a user that no longer exists: ${dangling.length}`);
    dangling.forEach(i => console.log(`    - "${i.title}" (${i._id}) -> missing user ${i.createdBy}`));
    console.log(`  createdBy stored as a non-ObjectId value: ${nonObjectId.length}`);
    nonObjectId.forEach(i => console.log(`    - "${i.title}" (${i._id}) type=${typeof i.createdBy}`));

    await mongoose.disconnect();
}

main().catch(async err => {
    console.error("Diagnostic failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
