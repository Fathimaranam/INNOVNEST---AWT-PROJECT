const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const router = express.Router();


// ==========================================
// CREATE USER
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            name,
            email,
            role,
            bio,
            location,
            skills
        } = req.body;


        // Validate name
        if (!name || !name.trim()) {

            return res.status(400).json({
                message: "Name is required"
            });

        }


        // Validate email
        if (!email || !email.trim()) {

            return res.status(400).json({
                message: "Email is required"
            });

        }


        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {

            return res.status(400).json({
                message: "Please provide a valid email address"
            });

        }


        // Check duplicate email
        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {

            return res.status(400).json({
                message: "Email already exists"
            });

        }


        // Create user
        const newUser = new User({

            name: name.trim(),

            email: email.toLowerCase().trim(),

            role,

            bio,

            location,

            skills

        });


        // Save user
        const savedUser = await newUser.save();


        // Return created user
        res.status(201).json(savedUser);

    } catch (error) {

        console.error(
            "Error creating user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to create user"
        });

    }

});


// ==========================================
// GET ALL USERS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const users = await User.find()
            .sort({ createdAt: -1 });

        res.status(200).json(users);

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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        message: "Invalid user ID"
    });
}
        const user = await User.findById(
            req.params.id
        );


        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }


        res.status(200).json(user);

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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        message: "Invalid user ID"
    });
}
        const {
            name,
            bio,
            location,
            role,
            skills
        } = req.body;


        // Validate name if provided
        if (name !== undefined && !name.trim()) {

            return res.status(400).json({
                message: "Name cannot be empty"
            });

        }


        // Validate skills if provided
        if (skills !== undefined && !Array.isArray(skills)) {

            return res.status(400).json({
                message: "Skills must be an array"
            });

        }


        const updatedUser =
            await User.findByIdAndUpdate(

                req.params.id,

                {
                    name:
                        name !== undefined
                            ? name.trim()
                            : undefined,

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


        res.status(200).json(updatedUser);

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


// ==========================================
// DELETE USER
// ==========================================

router.delete("/:id", async (req, res) => {

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        message: "Invalid user ID"
    });
}
        const deletedUser =
            await User.findByIdAndDelete(
                req.params.id
            );


        if (!deletedUser) {

            return res.status(404).json({
                message: "User not found"
            });

        }


        res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {

        console.error(
            "Error deleting user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to delete user"
        });

    }

});


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;