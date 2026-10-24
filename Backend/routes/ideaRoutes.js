const express = require("express");
const mongoose = require("mongoose");
const Idea = require("../models/idea");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/user");
const { notifyLike } = require("../utils/notify");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Public author fields only — never email, password or tokens.
const AUTHOR_FIELDS = "name role";

// Resolve authors explicitly so the API can say WHY an author is missing:
//   authorStatus "available"       -> createdBy is the author object
//   authorStatus "not_recorded"    -> the idea document has no createdBy (created before authentication existed)
//   authorStatus "account_missing" -> createdBy points to a user account that no longer exists
// createdBy keeps its existing contract: the author object, or null.
async function withAuthors(ideaDocs) {
    const ideas = ideaDocs.map(d => (d && typeof d.toObject === "function" ? d.toObject() : d));

    const authorIds = [...new Set(
        ideas
            .map(i => i.createdBy)
            .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
            .map(id => id.toString())
    )];

    const authors = authorIds.length
        ? await User.find({ _id: { $in: authorIds } }).select(AUTHOR_FIELDS).lean()
        : [];

    const authorMap = new Map(authors.map(a => [a._id.toString(), a]));

    return ideas.map(idea => {
        const rawId = idea.createdBy ? idea.createdBy.toString() : null;
        const author = rawId ? authorMap.get(rawId) : null;

        // Like count comes only from real likes (likedBy). Older documents may hold a
        // seeded "likes" number with no likers behind it; that number is not shown.
        const likedBy = Array.isArray(idea.likedBy) ? idea.likedBy.map(id => id.toString()) : [];

        return {
            ...idea,
            likedBy,
            likes: likedBy.length,
            createdBy: author || null,
            authorStatus: author ? "available" : (rawId ? "account_missing" : "not_recorded")
        };
    });
}

// ==========================================
// PRIVACY
// Private ideas are visible only to their author. Everyone else (including
// logged-out visitors) sees public ideas only. Ideas saved without a
// visibility value are treated as public.
// ==========================================

// Optional login: returns the user ID from a valid Bearer token, or null.
// An invalid/expired token simply means "guest" here — it never exposes private ideas.
function optionalUserId(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ") || !process.env.JWT_SECRET) return null;
    try {
        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
        return decoded && decoded.id && mongoose.Types.ObjectId.isValid(decoded.id) ? String(decoded.id) : null;
    } catch (error) {
        return null;
    }
}

function visibleIdeasFilter(viewerId) {
    const publicOnly = { visibility: { $ne: "private" } };
    return viewerId
        ? { $or: [publicOnly, { createdBy: new mongoose.Types.ObjectId(viewerId) }] }
        : publicOnly;
}

function canView(idea, viewerId) {
    if (!idea || idea.visibility !== "private") return true;
    return !!viewerId && !!idea.createdBy && idea.createdBy.toString() === String(viewerId);
}

async function withAuthor(ideaDoc) {
    return (await withAuthors([ideaDoc]))[0];
}


// ==========================================
// GET ALL IDEAS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const ideas = await Idea.find(visibleIdeasFilter(optionalUserId(req)))
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(await withAuthors(ideas));

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


        const found = await Idea.findById(req.params.id).lean();

        // A private idea is reported as "not found" to anyone but its author,
        // so its existence is not revealed either.
        const idea = canView(found, optionalUserId(req)) ? found : null;


        if (!idea) {

            return res.status(404).json({
                message: "Idea not found"
            });

        }


        res.status(200).json(await withAuthor(idea));

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


        // Create idea — createdBy is derived strictly from the authenticated user
        const newIdea = new Idea({

            title: title.trim(),

            description: description.trim(),

            category: category.trim(),

            stage: stage.trim(),

            visibility: visibility && ["public", "private"].includes(visibility) ? visibility : "public",

            status: status && ["active", "in-development", "closed"].includes(status) ? status : "active",

            createdBy: req.user._id

        });


        // Save idea
        const savedIdea = await newIdea.save();

        res.status(201).json(await withAuthor(savedIdea));

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
// LIKE / UNLIKE IDEA
// POST   /api/ideas/:id/like  -> like (idempotent)
// DELETE /api/ideas/:id/like  -> unlike (idempotent)
// ==========================================

async function setLike(req, res, like) {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid idea ID" });
        }

        const userId = req.user._id;

        // Private ideas cannot be liked (or even found) by other members
        const target = await Idea.findById(req.params.id).select("visibility createdBy").lean();
        if (!target || !canView(target, userId)) {
            return res.status(404).json({ message: "Idea not found" });
        }

        // Atomic: a member can be in likedBy at most once
        const result = like
            ? await Idea.updateOne(
                { _id: req.params.id, likedBy: { $ne: userId } },
                { $addToSet: { likedBy: userId } }
            )
            : await Idea.updateOne(
                { _id: req.params.id },
                { $pull: { likedBy: userId } }
            );

        const idea = await Idea.findById(req.params.id).select("title likedBy createdBy").lean();

        if (!idea) {
            return res.status(404).json({ message: "Idea not found" });
        }

        const likes = Array.isArray(idea.likedBy) ? idea.likedBy.length : 0;

        // Keep the stored count in sync with the real likers
        await Idea.updateOne({ _id: idea._id }, { $set: { likes } });

        // Notify the author only for a genuinely new like by someone else
        if (like && result.modifiedCount === 1 && idea.createdBy) {
            const authorExists = await User.exists({ _id: idea.createdBy });
            if (authorExists) {
                await notifyLike(idea.createdBy, userId, idea);
            }
        }

        res.status(200).json({
            ideaId: idea._id,
            liked: like,
            likes
        });

    } catch (error) {

        console.error("Error updating like:", error.message);

        res.status(500).json({ message: "Failed to update like" });

    }

}

router.post("/:id/like", authMiddleware, (req, res) => setLike(req, res, true));
router.delete("/:id/like", authMiddleware, (req, res) => setLike(req, res, false));


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

        res.status(200).json(await withAuthor(savedIdea));

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