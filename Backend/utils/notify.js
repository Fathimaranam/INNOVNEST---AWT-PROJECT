const Notification = require("../models/notification");

// Notification creation is a side effect of a real event (follow, message).
// It must never break the main action, so errors are logged and swallowed.

function sameId(a, b) {
    return a && b && a.toString() === b.toString();
}

// One follow notification per (recipient, follower).
// Re-following after an unfollow re-surfaces the same notification instead of duplicating it.
async function notifyFollow(recipientId, actorId) {
    if (!recipientId || !actorId || sameId(recipientId, actorId)) return null;

    try {
        return await Notification.findOneAndUpdate(
            { recipient: recipientId, actor: actorId, type: "follow" },
            {
                $set: {
                    entityType: "User",
                    entityId: actorId,
                    read: false,
                    readAt: null,
                    lastEventAt: new Date(),
                    count: 1
                }
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
    } catch (error) {
        console.error("Failed to create follow notification:", error.message);
        return null;
    }
}

// Unread messages from the same sender are grouped into one notification
// ("Alex sent you 3 messages"). Once read, the next message starts a new one.
async function notifyMessage(recipientId, actorId, messageDoc) {
    if (!recipientId || !actorId || sameId(recipientId, actorId)) return null;

    const text = (messageDoc && messageDoc.message) || "";
    const preview = text.length > 120 ? text.slice(0, 117) + "..." : text;

    try {
        return await Notification.findOneAndUpdate(
            { recipient: recipientId, actor: actorId, type: "message", read: false },
            {
                $set: {
                    entityType: "Message",
                    entityId: messageDoc ? messageDoc._id : undefined,
                    preview,
                    lastEventAt: new Date()
                },
                $inc: { count: 1 },
                $setOnInsert: { readAt: null }
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: false }
        );
    } catch (error) {
        console.error("Failed to create message notification:", error.message);
        return null;
    }
}

// One like notification per (liker, idea). Unliking and liking again does not
// create a second notification or mark the existing one unread again.
async function notifyLike(recipientId, actorId, idea) {
    if (!recipientId || !actorId || !idea || sameId(recipientId, actorId)) return null;

    const title = idea.title || "";

    try {
        return await Notification.findOneAndUpdate(
            { recipient: recipientId, actor: actorId, type: "like", entityId: idea._id },
            {
                $setOnInsert: {
                    entityType: "Idea",
                    preview: title.length > 120 ? title.slice(0, 117) + "..." : title,
                    read: false,
                    readAt: null,
                    count: 1,
                    lastEventAt: new Date()
                }
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: false }
        );
    } catch (error) {
        console.error("Failed to create like notification:", error.message);
        return null;
    }
}

module.exports = { notifyFollow, notifyMessage, notifyLike };
