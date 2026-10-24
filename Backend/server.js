const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from Backend/.env
dotenv.config({
    path: path.join(__dirname, ".env")
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Models
const User = require("./models/user");
const Idea = require("./models/idea");
const Message = require("./models/message");

// Routes
const ideaRoutes = require("./routes/ideaRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
// Use routes
app.use("/api/ideas", ideaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

// Connect and listen only when started directly (`node server.js`).
// Tests can require("./server") to get the app without binding port 5000.
// No data is seeded on startup.
function startServer() {

    console.log("Starting AWT backend...");
    console.log(
        "MongoDB URI loaded:",
        process.env.MONGODB_URI ? "YES" : "NO"
    );

    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is missing from Backend/.env");
        process.exit(1);
    }

    const PORT = process.env.PORT || 5000;

    mongoose
        .connect(process.env.MONGODB_URI)
        .then(() => {

            console.log("✅ MongoDB connected successfully!");
            console.log("MongoDB database:", mongoose.connection.name);

            app.listen(PORT, () => {
                console.log(`🚀 Server running on http://localhost:${PORT}`);
            });

        })
        .catch((error) => {

            console.error("❌ MongoDB connection failed:");
            console.error(error.message);

        });

}

if (require.main === module) {
    startServer();
}


// Root route
app.get("/", (req, res) => {

    res.json({
        message: "AWT Project Backend is running!"
    });

});

module.exports = app;
