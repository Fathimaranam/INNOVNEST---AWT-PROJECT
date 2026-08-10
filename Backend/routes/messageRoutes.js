const express = require("express");
const Message = require("../models/message");

const router = express.Router();


// ==========================================
// GET ALL MESSAGES
// ==========================================

router.get("/", async (req, res) => {

    try {

        const messages = await Message.find()
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
// GET MESSAGES BETWEEN TWO USERS
// ==========================================

router.get("/:user1/:user2", async (req, res) => {

    try {

        const { user1, user2 } = req.params;

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

router.post("/", async (req, res) => {

    try {

        const {
            sender,
            receiver,
            message
        } = req.body;


        if (!sender || !receiver || !message) {

            return res.status(400).json({
                message:
                    "Sender, receiver and message are required"
            });

        }


        const newMessage = new Message({
            sender,
            receiver,
            message
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