const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
console.log("✅ authRoutes.js loaded");
// ===============================
// SIGN UP
// POST /api/auth/signup
// ===============================

router.post("/signup", async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        // -------------------------------
        // VALIDATION
        // -------------------------------

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Name is required"
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters"
            });
        }

        // -------------------------------
        // EMAIL FORMAT
        // -------------------------------

       const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message:
                    "Please provide a valid email address"
            });
        }

        // -------------------------------
        // CHECK EXISTING USER
        // -------------------------------

        const normalizedEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });
        }

        // -------------------------------
        // HASH PASSWORD
        // -------------------------------

        const hashedPassword =
            await bcrypt.hash(password, 10);

        // -------------------------------
        // CREATE USER
        // -------------------------------

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "Founder"
        });

        const savedUser =
            await newUser.save();

        // -------------------------------
        // RESPONSE
        // Never send password
        // -------------------------------

        res.status(201).json({
            message:
                "Account created successfully",
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role
            }
        });

    } catch (error) {

        console.error(
            "Signup error:",
            error.message
        );

        res.status(500).json({
            message:
                "Failed to create account"
        });
    }
});


// ===============================
// LOGIN
// POST /api/auth/login
// ===============================

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        // -------------------------------
        // VALIDATION
        // -------------------------------

        if (!email || !email.trim()) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        // -------------------------------
        // FIND USER
        // Explicitly include password
        // because select:false
        // -------------------------------

        const user =
            await User.findOne({
                email: email.trim().toLowerCase()
            }).select("+password");

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        // -------------------------------
        // CHECK PASSWORD
        // -------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        // -------------------------------
        // CHECK JWT SECRET
        // -------------------------------

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing"
            );

            return res.status(500).json({
                message:
                    "Authentication configuration error"
            });
        }

        // -------------------------------
        // CREATE JWT
        // -------------------------------

        const token =
            jwt.sign(
                {
                    id: user._id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

        // -------------------------------
        // SEND RESPONSE
        // -------------------------------

        res.status(200).json({
            message: "Login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error.message
        );

        res.status(500).json({
            message:
                "Failed to login"
        });
    }
});
// ===============================
// GET CURRENT USER
// GET /api/auth/me
// ===============================
router.get("/me", authMiddleware, async (req, res) => {
    try {
        res.status(200).json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                bio: req.user.bio || "",
                location: req.user.location || "",
                skills: req.user.skills || [],
                followers: req.user.followers || 0,
                following: req.user.following || 0,
                connections: req.user.connections || 0,
                createdAt: req.user.createdAt,
                updatedAt: req.user.updatedAt
            }
        });
    } catch (error) {
        console.error("Error fetching current user:", error.message);
        res.status(500).json({
            message: "Failed to fetch user profile"
        });
    }
});

router.get("/test", (req, res) => {
    res.json({
        message: "Auth route is working!"
    });
});

module.exports = router;