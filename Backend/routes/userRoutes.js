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

        const formattedUsers = users.map(u => {
            const obj = u.toObject();
            obj.followersCount = Array.isArray(u.followers) ? u.followers.length : 0;
            obj.followingCount = Array.isArray(u.following) ? u.following.length : 0;
            return obj;
        });

        res.status(200).json(formattedUsers);

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

        // Explicitly exclude password hash, populate followers & following
        const user = await User.findById(req.params.id)
            .select("-password")
            .populate("followers", "name email role profileImage bio")
            .populate("following", "name email role profileImage bio");

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        const userObj = user.toObject();
        userObj.followersCount = Array.isArray(user.followers) ? user.followers.length : 0;
        userObj.followingCount = Array.isArray(user.following) ? user.following.length : 0;

        res.status(200).json(userObj);

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
// FOLLOW USER
// POST /api/users/:id/follow
// ==========================================

router.post("/:id/follow", authMiddleware, async (req, res) => {

    try {

        const targetId = req.params.id;
        const followerId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(targetId)) {

            return res.status(400).json({
                message: "Invalid target user ID"
            });

        }

        // Prevent users from following themselves
        if (followerId.toString() === targetId.toString()) {

            return res.status(400).json({
                message: "You cannot follow yourself"
            });

        }

        const targetUser = await User.findById(targetId);

        if (!targetUser) {

            return res.status(404).json({
                message: "User to follow not found"
            });

        }

        // Prevent duplicate follow relationships
        const alreadyFollowing = Array.isArray(targetUser.followers) &&
            targetUser.followers.some(id => id.toString() === followerId.toString());

        if (alreadyFollowing) {

            return res.status(400).json({
                message: "You are already following this user"
            });

        }

        // Persist the relationship in MongoDB:
        // Target's followers list includes followerId
        // Follower's following list includes targetId
        await User.findByIdAndUpdate(targetId, {
            $addToSet: { followers: followerId }
        });

        await User.findByIdAndUpdate(followerId, {
            $addToSet: { following: targetId }
        });

        const updatedTarget = await User.findById(targetId);
        const updatedFollower = await User.findById(followerId);

        const targetFollowersCount = Array.isArray(updatedTarget.followers) ? updatedTarget.followers.length : 0;
        const targetFollowingCount = Array.isArray(updatedTarget.following) ? updatedTarget.following.length : 0;

        res.status(200).json({
            message: `You are now following ${targetUser.name}`,
            isFollowing: true,
            followersCount: targetFollowersCount,
            followingCount: targetFollowingCount,
            targetUser: {
                id: updatedTarget._id,
                name: updatedTarget.name,
                followersCount: targetFollowersCount,
                followingCount: targetFollowingCount
            },
            currentUser: {
                id: updatedFollower._id,
                followersCount: Array.isArray(updatedFollower.followers) ? updatedFollower.followers.length : 0,
                followingCount: Array.isArray(updatedFollower.following) ? updatedFollower.following.length : 0
            }
        });

    } catch (error) {

        console.error(
            "Error following user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to follow user"
        });

    }

});


// ==========================================
// UNFOLLOW USER
// POST /api/users/:id/unfollow & DELETE /api/users/:id/follow
// ==========================================

const handleUnfollow = async (req, res) => {

    try {

        const targetId = req.params.id;
        const followerId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(targetId)) {

            return res.status(400).json({
                message: "Invalid target user ID"
            });

        }

        if (followerId.toString() === targetId.toString()) {

            return res.status(400).json({
                message: "You cannot unfollow yourself"
            });

        }

        const targetUser = await User.findById(targetId);

        if (!targetUser) {

            return res.status(404).json({
                message: "User to unfollow not found"
            });

        }

        // Remove relationship consistently from both views
        await User.findByIdAndUpdate(targetId, {
            $pull: { followers: followerId }
        });

        await User.findByIdAndUpdate(followerId, {
            $pull: { following: targetId }
        });

        const updatedTarget = await User.findById(targetId);
        const updatedFollower = await User.findById(followerId);

        const targetFollowersCount = Array.isArray(updatedTarget.followers) ? updatedTarget.followers.length : 0;
        const targetFollowingCount = Array.isArray(updatedTarget.following) ? updatedTarget.following.length : 0;

        res.status(200).json({
            message: `You have unfollowed ${targetUser.name}`,
            isFollowing: false,
            followersCount: targetFollowersCount,
            followingCount: targetFollowingCount,
            targetUser: {
                id: updatedTarget._id,
                name: updatedTarget.name,
                followersCount: targetFollowersCount,
                followingCount: targetFollowingCount
            },
            currentUser: {
                id: updatedFollower._id,
                followersCount: Array.isArray(updatedFollower.followers) ? updatedFollower.followers.length : 0,
                followingCount: Array.isArray(updatedFollower.following) ? updatedFollower.following.length : 0
            }
        });

    } catch (error) {

        console.error(
            "Error unfollowing user:",
            error.message
        );

        res.status(500).json({
            message: "Failed to unfollow user"
        });

    }

};

router.post("/:id/unfollow", authMiddleware, handleUnfollow);
router.delete("/:id/follow", authMiddleware, handleUnfollow);


// ==========================================
// GET USER'S FOLLOWERS LIST
// GET /api/users/:id/followers
// ==========================================

router.get("/:id/followers", async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid user ID"
            });

        }

        const user = await User.findById(req.params.id)
            .populate("followers", "name email role profileImage bio location");

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        res.status(200).json(user.followers || []);

    } catch (error) {

        console.error(
            "Error fetching followers list:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch followers"
        });

    }

});


// ==========================================
// GET USER'S FOLLOWING LIST
// GET /api/users/:id/following
// ==========================================

router.get("/:id/following", async (req, res) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid user ID"
            });

        }

        const user = await User.findById(req.params.id)
            .populate("following", "name email role profileImage bio location");

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        res.status(200).json(user.following || []);

    } catch (error) {

        console.error(
            "Error fetching following list:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch following users"
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