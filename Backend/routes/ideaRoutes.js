const express = require("express");
const Idea = require("../models/idea");

const router = express.Router();

// GET all ideas
router.get("/", async (req, res) => {
    try {
        const ideas = await Idea.find()
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.json(ideas);
    } catch (error) {
        console.error("Error fetching ideas:", error.message);
        res.status(500).json({
            message: "Failed to fetch ideas"
        });
    }
});

// GET one idea
router.get("/:id", async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id)
            .populate("createdBy", "name email");

        if (!idea) {
            return res.status(404).json({
                message: "Idea not found"
            });
        }

        res.json(idea);
    } catch (error) {
        console.error("Error fetching idea:", error.message);
        res.status(500).json({
            message: "Failed to fetch idea"
        });
    }
});

// CREATE a new idea
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

        if (!title || !description || !category || !stage) {
            return res.status(400).json({
                message: "Title, description, category and stage are required"
            });
        }

        const newIdea = new Idea({
            title,
            description,
            category,
            stage,
            visibility,
            status,
            createdBy
        });

        const savedIdea = await newIdea.save();

        res.status(201).json(savedIdea);
    } catch (error) {
        console.error("Error creating idea:", error.message);
        res.status(500).json({
            message: "Failed to create idea"
        });
    }
});

// UPDATE an idea
router.put("/:id", async (req, res) => {
    try {
        const updatedIdea = await Idea.findByIdAndUpdate(
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

        res.json(updatedIdea);
    } catch (error) {
        console.error("Error updating idea:", error.message);
        res.status(500).json({
            message: "Failed to update idea"
        });
    }
});

// DELETE an idea
router.delete("/:id", async (req, res) => {
    try {
        const deletedIdea = await Idea.findByIdAndDelete(req.params.id);

        if (!deletedIdea) {
            return res.status(404).json({
                message: "Idea not found"
            });
        }

        res.json({
            message: "Idea deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting idea:", error.message);
        res.status(500).json({
            message: "Failed to delete idea"
        });
    }
});

module.exports = router;