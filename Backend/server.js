const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const app = express();

app.use(cors());
app.use(express.json());

console.log("Starting AWT backend...");
console.log("MongoDB URI loaded:", process.env.MONGODB_URI ? "YES" : "NO");

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB connected successfully!");

        app.listen(5000, () => {
            console.log("🚀 Server running on http://localhost:5000");
        });
    })
    .catch((error) => {
        console.error("❌ MongoDB connection failed:");
        console.error(error.message);
    });

app.get("/", (req, res) => {
    res.json({
        message: "AWT Project Backend is running!"
    });
});