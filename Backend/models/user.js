const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true,
            select: false
},
        role: {
            type: String,
            default: "Founder"
        },

        bio: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        skills: {
            type: [String],
            default: []
        },

        followers: {
            type: Number,
            default: 0
        },

        following: {
            type: Number,
            default: 0
        },

        connections: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);