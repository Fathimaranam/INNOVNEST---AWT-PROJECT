const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Access denied. Token is missing."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from environment variables");
            return res.status(500).json({
                message: "Authentication configuration error."
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token has expired."
                });
            }
            return res.status(401).json({
                message: "Invalid or malformed token."
            });
        }

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                message: "User belonging to this token no longer exists."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication middleware error:", error.message);
        return res.status(500).json({
            message: "Authentication error."
        });
    }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
