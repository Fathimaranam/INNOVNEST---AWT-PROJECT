const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/notification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Every notification route is private to the authenticated recipient.
router.use(authMiddleware);

const ACTOR_FIELDS = "name role";

// Shape a notification for the client: safe actor fields, a readable text, and a link.
function serialize(n) {
    const actor = n.actor && typeof n.actor === "object" && n.actor.name
        ? { _id: n.actor._id, name: n.actor.name, role: n.actor.role || "Member" }
        : null;

    const actorName = actor ? actor.name : "A member who no longer has an account";
    let text = "";
    let link = null;

    if (n.type === "follow") {
        text = `${actorName} started following you`;
        if (actor) link = `profile.html?id=${actor._id}`;
    } else if (n.type === "message") {
        text = n.count > 1
            ? `${actorName} sent you ${n.count} messages`
            : `${actorName} sent you a message`;
        if (actor) link = `messages.html?user=${actor._id}`;
    } else if (n.type === "like") {
        text = n.preview
            ? `${actorName} liked your idea “${n.preview}”`
            : `${actorName} liked your idea`;
        if (n.entityId) link = `ideas.html?idea=${n.entityId}`;
    }

    return {
        _id: n._id,
        type: n.type,
        actor,
        text,
        preview: n.type === "message" ? (n.preview || "") : "",
        count: n.count || 1,
        read: !!n.read,
        readAt: n.readAt || null,
        link,
        createdAt: n.createdAt,
        lastEventAt: n.lastEventAt || n.createdAt
    };
}

async function unreadCountFor(userId) {
    return Notification.countDocuments({ recipient: userId, read: false });
}


// ==========================================
// GET /api/notifications  -> { notifications, unreadCount }
// ==========================================
router.get("/", async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("actor", ACTOR_FIELDS)
            .sort({ lastEventAt: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({
            notifications: notifications.map(serialize),
            unreadCount: await unreadCountFor(req.user._id)
        });
    } catch (error) {
        console.error("Error fetching notifications:", error.message);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});


// ==========================================
// GET /api/notifications/unread-count -> { unreadCount }
// ==========================================
router.get("/unread-count", async (req, res) => {
    try {
        res.status(200).json({ unreadCount: await unreadCountFor(req.user._id) });
    } catch (error) {
        console.error("Error counting notifications:", error.message);
        res.status(500).json({ message: "Failed to count notifications" });
    }
});


// ==========================================
// PATCH /api/notifications/read-all
// Optional body filters: { type: "message"|"follow", actor: "<userId>" }
// (used by the Messages page to clear message notifications for an opened conversation)
// ==========================================
router.patch("/read-all", async (req, res) => {
    try {
        const filter = { recipient: req.user._id, read: false };
        const { type, actor } = req.body || {};

        if (type !== undefined) {
            if (!["follow", "message", "like"].includes(type)) {
                return res.status(400).json({ message: "Invalid notification type" });
            }
            filter.type = type;
        }

        if (actor !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(actor)) {
                return res.status(400).json({ message: "Invalid actor ID" });
            }
            filter.actor = actor;
        }

        const result = await Notification.updateMany(filter, {
            $set: { read: true, readAt: new Date() }
        });

        res.status(200).json({
            updated: result.modifiedCount || 0,
            unreadCount: await unreadCountFor(req.user._id)
        });
    } catch (error) {
        console.error("Error marking notifications read:", error.message);
        res.status(500).json({ message: "Failed to update notifications" });
    }
});


// ==========================================
// PATCH /api/notifications/:id/read
// ==========================================
router.patch("/:id/read", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        // Scoped to the recipient: another user's notification is reported as not found
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { $set: { read: true, readAt: new Date() } },
            { returnDocument: "after" }
        ).populate("actor", ACTOR_FIELDS).lean();

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({
            notification: serialize(notification),
            unreadCount: await unreadCountFor(req.user._id)
        });
    } catch (error) {
        console.error("Error marking notification read:", error.message);
        res.status(500).json({ message: "Failed to update notification" });
    }
});


module.exports = router;
