const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || "fallback_secret_key",
        { expiresIn: "7d" }
    );
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while registering user",
            error: error.message,
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while logging in",
            error: error.message,
        });
    }
};
const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
};

/** HH:mm formatını doğrular (00:00 – 23:59). */
const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const updateMe = async (req, res) => {
    try {
        const allowedFields = [
            "name",
            "profileType",
            "emergencyContactName",
            "emergencyContactPhone",
        ];

        const updateData = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // sleepSchedule: nested object — ayrı işlenir
        if (req.body.sleepSchedule !== undefined) {
            const { nightStart, nightEnd } = req.body.sleepSchedule || {};
            if (!HH_MM_REGEX.test(nightStart) || !HH_MM_REGEX.test(nightEnd)) {
                return res.status(400).json({
                    success: false,
                    message: "sleepSchedule.nightStart ve nightEnd HH:mm formatında olmalıdır (örn: '23:00').",
                });
            }
            updateData.sleepSchedule = { nightStart, nightEnd };
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while updating profile",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateMe,
};