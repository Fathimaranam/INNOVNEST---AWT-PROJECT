const express = require("express");
const mongoose = require("mongoose");
const Idea = require("../models/idea");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET ALL IDEAS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const ideas = await Idea.find()
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json(ideas);

    } catch (error) {

        console.error(
            "Error fetching ideas:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch ideas"
        });

    }

});


// ==========================================
// GET ONE IDEA
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid idea ID"
            });

        }


        const idea = await Idea.findById(
            req.params.id
        ).populate(
            "createdBy",
            "name email"
        );


        if (!idea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }


        res.status(200).json(idea);

    } catch (error) {

        console.error(
            "Error fetching idea:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch idea"
        });

    }

});


// ==========================================
// CREATE IDEA
// ==========================================

router.post("/", authMiddleware, async (req, res) => {

    try {

        const {
            title,
            description,
            category,
            stage,
            visibility,
            status
        } = req.body;


        // Required field validation
        if (
            !title ||
            !title.trim() ||
            !description ||
            !description.trim() ||
            !category ||
            !category.trim() ||
            !stage ||
            !stage.trim()
        ) {

            return res.status(400).json({
                message:
                    "Title, description, category and stage are required"
            });

        }


        // Create idea — createdBy is set from the authenticated user
        const newIdea = new Idea({

            title: title.trim(),

            description: description.trim(),

            category: category.trim(),

            stage: stage.trim(),

            visibility,

            status,

            createdBy: req.user._id

        });


        // Save idea
        const savedIdea = await newIdea.save();


        res.status(201).json(savedIdea);

    } catch (error) {

        console.error(
            "Error creating idea:",
            error.message
        );

        res.status(500).json({
            message: "Failed to create idea"
        });

    }

});


// ==========================================
// UPDATE IDEA
// ==========================================

router.put("/:id", authMiddleware, async (req, res) => {

    try {

        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid idea ID"
            });

        }

        const idea = await Idea.findById(req.params.id);

        if (!idea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }

        const isAdmin = req.user && req.user.role && req.user.role.toLowerCase() === "admin";
        const isOwner = idea.createdBy && idea.createdBy.toString() === req.user._id.toString();

        // Enforce ownership: only creator or authorized admin can update
        if (!isOwner && !isAdmin) {

            if (!idea.createdBy) {

                return res.status(403).json({
                    message: "Access denied. This idea has no recorded owner and cannot be modified."
                });

            }

            return res.status(403).json({
                message: "Access denied. You can only update your own ideas."
            });

        }

        const {
            title,
            description,
            category,
            stage,
            visibility,
            status
        } = req.body;

        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({ message: "Title cannot be empty" });
            }
            idea.title = title.trim();
        }

        if (description !== undefined) {
            if (!description.trim()) {
                return res.status(400).json({ message: "Description cannot be empty" });
            }
            idea.description = description.trim();
        }

        if (category !== undefined) {
            if (!category.trim()) {
                return res.status(400).json({ message: "Category cannot be empty" });
            }
            idea.category = category.trim();
        }

        if (stage !== undefined) {
            if (!stage.trim()) {
                return res.status(400).json({ message: "Stage cannot be empty" });
            }
            idea.stage = stage.trim();
        }

        if (visibility !== undefined) {
            if (!["public", "private"].includes(visibility)) {
                return res.status(400).json({ message: "Visibility must be 'public' or 'private'" });
            }
            idea.visibility = visibility;
        }

        if (status !== undefined) {
            if (!["active", "in-development", "closed"].includes(status)) {
                return res.status(400).json({ message: "Status must be 'active', 'in-development', or 'closed'" });
            }
            idea.status = status;
        }

        // createdBy is NEVER overwritten — preserving original ownership
        const savedIdea = await idea.save();

        const populatedIdea = await Idea.findById(savedIdea._id).populate("createdBy", "name email");

        res.status(200).json(populatedIdea);

    } catch (error) {

        console.error(
            "Error updating idea:",
            error.message
        );

        res.status(500).json({
            message: "Failed to update idea"
        });

    }

});


// ==========================================
// DELETE IDEA
// ==========================================

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid idea ID"
            });

        }

        const idea = await Idea.findById(req.params.id);

        if (!idea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }

        const isAdmin = req.user && req.user.role && req.user.role.toLowerCase() === "admin";
        const isOwner = idea.createdBy && idea.createdBy.toString() === req.user._id.toString();

        // Enforce ownership: only creator or authorized admin can delete
        if (!isOwner && !isAdmin) {

            if (!idea.createdBy) {

                return res.status(403).json({
                    message: "Access denied. This idea has no recorded owner and cannot be deleted."
                });

            }

            return res.status(403).json({
                message: "Access denied. You can only delete your own ideas."
            });

        }

        await Idea.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Idea deleted successfully"
        });

    } catch (error) {

        console.error(
            "Error deleting idea:",
            error.message
        );

        res.status(500).json({
            message: "Failed to delete idea"
        });

    }

});


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;