const mongoose = require("mongoose");

// Persistent, event-driven notifications.
// Only event types the application genuinely supports are allowed:
//   follow  -> someone started following the recipient
//   message -> someone sent the recipient a direct message
//   like    -> someone liked one of the recipient's ideas
// (Comments do not exist in the app, so there is no comment type.)
const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: ["follow", "message", "like"],
            required: true
        },

        // Related entity (e.g. the latest Message for a message notification)
        entityType: {
            type: String,
            enum: ["User", "Message", "Idea"],
            default: "User"
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId
        },

        // For message notifications: short preview of the latest unread message
        preview: {
            type: String,
            default: "",
            maxlength: 140
        },

        // Number of events grouped into this notification (e.g. 3 unread messages from one person)
        count: {
            type: Number,
            default: 1
        },

        read: {
            type: Boolean,
            default: false,
            index: true
        },

        readAt: {
            type: Date,
            default: null
        },

        // When the most recent event for this notification happened (used for sorting)
        lastEventAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({ recipient: 1, read: 1, lastEventAt: -1 });
notificationSchema.index({ recipient: 1, actor: 1, type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
