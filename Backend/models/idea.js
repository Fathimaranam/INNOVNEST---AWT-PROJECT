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

    likes: {
      type: Number,
      default: 0
    },

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