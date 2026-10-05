const express = require("express");
const mongoose = require("mongoose");
const Idea = require("../models/idea");

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

router.post("/", async (req, res) => {

    try {

        const {
            title,
            description,
            category,
            stage,
            visibility,
            status,
            createdBy
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


        // Create idea
        const newIdea = new Idea({

            title: title.trim(),

            description: description.trim(),

            category: category.trim(),

            stage: stage.trim(),

            visibility,

            status,

            createdBy

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

router.put("/:id", async (req, res) => {

    try {

        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid idea ID"
            });

        }


        const updatedIdea =
            await Idea.findByIdAndUpdate(

                req.params.id,

                req.body,

                {
                    new: true,
                    runValidators: true
                }

            );


        if (!updatedIdea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }


        res.status(200).json(updatedIdea);

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

router.delete("/:id", async (req, res) => {

    try {

        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

            return res.status(400).json({
                message: "Invalid idea ID"
            });

        }


        const deletedIdea =
            await Idea.findByIdAndDelete(
                req.params.id
            );


        if (!deletedIdea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }


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