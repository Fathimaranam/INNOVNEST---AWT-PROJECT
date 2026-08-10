const express = require("express");
const User = require("../models/user");

const router = express.Router();


// ==========================================
// GET ALL USERS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const users = await User.find()
            .sort({ createdAt: -1 });

        res.json(users);

    } catch (error) {

        console.error(
            "Error fetching users:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch users"
        });

    }

});


// ==========================================
// GET ONE USER
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        const user = await User.findById(
            req.params.id
        );

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        res.json(user);

    } catch (error) {

        console.error(
            "Error fetching user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch user"
        });

    }

});


// ==========================================
// UPDATE USER
// ==========================================

router.put("/:id", async (req, res) => {

    try {

        const {
            name,
            bio,
            location,
            role,
            skills
        } = req.body;


        const updatedUser =
            await User.findByIdAndUpdate(
                req.params.id,
                {
                    name,
                    bio,
                    location,
                    role,
                    skills
                },
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!updatedUser) {

            return res.status(404).json({
                message: "User not found"
            });

        }


        res.json(updatedUser);

    } catch (error) {

        console.error(
            "Error updating user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to update user"
        });

    }

});


module.exports = router;