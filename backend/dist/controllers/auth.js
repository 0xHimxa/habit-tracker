"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.refreshToken = exports.login = exports.signup = void 0;
const zod_1 = require("zod");
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const authValidators_1 = require("../utils/authValidators");
const signup = async (req, res) => {
    try {
        const { email, password, name, timezone } = authValidators_1.signupSchema.parse(req.body);
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: 'Email already registered',
                code: 'EMAIL_EXISTS'
            });
            return;
        }
        const user = new User_1.User({
            email,
            password,
            name,
            timezone: timezone || 'UTC'
        });
        await user.save();
        const { accessToken, refreshToken } = (0, auth_1.generateTokens)(user._id.toString(), user.email);
        const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            createdAt: user.createdAt
        };
        res.status(201).json({
            success: true,
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password } = authValidators_1.loginSchema.parse(req.body);
        const user = await User_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }
        const { accessToken, refreshToken } = (0, auth_1.generateTokens)(user._id.toString(), user.email);
        const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            createdAt: user.createdAt
        };
        res.json({
            success: true,
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = authValidators_1.refreshTokenSchema.parse(req.body);
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        const user = await User_1.User.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        const tokens = (0, auth_1.generateTokens)(user._id.toString(), user.email);
        res.json({
            success: true,
            data: tokens
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const validationErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
};
exports.refreshToken = refreshToken;
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
            return;
        }
        const user = await User_1.User.findById(req.user.id).select('-password');
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                timezone: user.timezone,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=auth.js.map