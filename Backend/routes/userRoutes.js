const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CREATE USER (REDIRECT TO SIGNUP)
// ==========================================

router.post("/", async (req, res) => {

    return res.status(400).json({
        message: "Direct user creation is deprecated. Please use POST /api/auth/signup to register securely."
    });

});


// ==========================================
// GET ALL USERS (PUBLIC DIRECTORY)
// ==========================================

router.get("/", async (req, res) => {

    try {

        // Explicitly exclude password hash and sensitive auth fields
        const users = await User.find()
            .select("-password")
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

        // Explicitly exclude password hash
        const user = await User.findById(req.params.id).select("-password");

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
// UPDATE USER (AUTHENTICATED - OWNER OR ADMIN)
// ==========================================

router.put("/:id", authMiddleware, async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid user ID"
            });

        }

        const isAdmin = req.user && req.user.role && req.user.role.toLowerCase() === "admin";
        const isSelf = req.user._id.toString() === req.params.id;

        // Enforce account ownership: only self or authorized admin can update
        if (!isSelf && !isAdmin) {

            return res.status(403).json({
                message: "Access denied. You can only update your own account."
            });

        }

        const {
            name,
            bio,
            location,
            role,
            skills
        } = req.body;

        const updateData = {};

        // Validate name if provided
        if (name !== undefined) {

            if (!name.trim()) {

                return res.status(400).json({
                    message: "Name cannot be empty"
                });

            }

            updateData.name = name.trim();

        }

        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;

        // Validate skills if provided
        if (skills !== undefined) {

            if (!Array.isArray(skills)) {

                return res.status(400).json({
                    message: "Skills must be an array"
                });

            }

            updateData.skills = skills;

        }

        // Prevent non-admin users from escalating their privileges to Admin
        if (role !== undefined) {

            if (isAdmin) {

                updateData.role = role;

            } else {

                const allowedRoles = ["Founder", "Developer", "Designer", "Investor", "Member"];

                if (allowedRoles.includes(role)) {

                    updateData.role = role;

                } else if (role.toLowerCase() === "admin") {

                    return res.status(403).json({
                        message: "Access denied. You cannot assign yourself an administrative role."
                    });

                }

            }

        }

        // Strictly protect password and email from this general profile update endpoint
        delete updateData.password;
        delete updateData.email;

        const updatedUser =
            await User.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            ).select("-password");

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
// DELETE USER (AUTHENTICATED - OWNER OR ADMIN)
// ==========================================

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid user ID"
            });

        }

        const isAdmin = req.user && req.user.role && req.user.role.toLowerCase() === "admin";
        const isSelf = req.user._id.toString() === req.params.id;

        // Enforce account ownership: only self or authorized admin can delete
        if (!isSelf && !isAdmin) {

            return res.status(403).json({
                message: "Access denied. You can only delete your own account."
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