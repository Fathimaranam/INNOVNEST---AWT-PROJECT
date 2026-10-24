const mongoose = require("mongoose");

const ideaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    stage: {
      type: String,
      required: true
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public"
    },

    status: {
      type: String,
      enum: ["active", "in-development", "closed"],
      default: "active"
    },

    // Cached like count, kept in sync with likedBy.length whenever someone likes/unlikes.
    likes: {
      type: Number,
      default: 0
    },

    // Members who liked this idea (one like per member)
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Idea", ideaSchema);