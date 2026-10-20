const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET CONVERSATIONS / MESSAGES FOR AUTHENTICATED USER
// ==========================================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const currentUserId = req.user._id;

        // Only return messages where the authenticated user is sender or receiver
        const messages = await Message.find({
            $or: [
                { sender: currentUserId },
                { receiver: currentUserId }
            ]
        })
            .populate("sender", "name email role profileImage")
            .populate("receiver", "name email role profileImage")
            .sort({ createdAt: 1 });

        res.json(messages);

    } catch (error) {

        console.error(
            "Error fetching messages:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch messages"
        });

    }

});


// ==========================================
// GET MESSAGES BETWEEN TWO USERS (PARTICIPANTS ONLY)
// ==========================================

router.get("/:user1/:user2", authMiddleware, async (req, res) => {

    try {

        const { user1, user2 } = req.params;

        // Validate MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(user1) || !mongoose.Types.ObjectId.isValid(user2)) {
            return res.status(400).json({
                message: "Invalid user ID(s)"
            });
        }

        const currentUserId = req.user._id.toString();
        const isParticipant = currentUserId === user1 || currentUserId === user2;
        const isAdmin = req.user.role && (req.user.role.toLowerCase() === "admin");

        // Enforce conversation membership
        if (!isParticipant && !isAdmin) {
            return res.status(403).json({
                message: "Access denied. You can only view your own conversations."
            });
        }

        const messages = await Message.find({
            $or: [
                {
                    sender: user1,
                    receiver: user2
                },
                {
                    sender: user2,
                    receiver: user1
                }
            ]
        })
            .populate("sender", "name email role profileImage")
            .populate("receiver", "name email role profileImage")
            .sort({ createdAt: 1 });

        res.json(messages);

    } catch (error) {

        console.error(
            "Error fetching conversation:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch conversation"
        });

    }

});


// ==========================================
// SEND NEW MESSAGE
// ==========================================

router.post("/", authMiddleware, async (req, res) => {

    try {

        const {
            receiver,
            message
        } = req.body;

        // Sender is derived strictly from the authenticated user
        const sender = req.user._id;

        if (!receiver || !message || !message.trim()) {

            return res.status(400).json({
                message:
                    "Receiver and message are required"
            });

        }

        // Validate receiver MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(receiver)) {

            return res.status(400).json({
                message: "Invalid receiver ID"
            });

        }

        // Prevent messaging oneself
        if (sender.toString() === receiver.toString()) {

            return res.status(400).json({
                message: "Cannot send message to yourself"
            });

        }

        // Verify receiver user actually exists
        const recipientUser = await User.findById(receiver);

        if (!recipientUser) {

            return res.status(404).json({
                message: "Receiver user not found"
            });

        }


        const newMessage = new Message({
            sender,
            receiver,
            message: message.trim()
        });


        const savedMessage =
            await newMessage.save();


        const populatedMessage =
            await Message.findById(
                savedMessage._id
            )
                .populate(
                    "sender",
                    "name email role profileImage"
                )
                .populate(
                    "receiver",
                    "name email role profileImage"
                );


        res.status(201).json(
            populatedMessage
        );


    } catch (error) {

        console.error(
            "Error sending message:",
            error.message
        );

        res.status(500).json({
            message: "Failed to send message"
        });

    }

});


module.exports = router;