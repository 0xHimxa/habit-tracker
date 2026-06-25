"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const generateTokens = (userId, email) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
        throw new Error('Invalid access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
    }
    catch (error) {
        throw new Error('Invalid refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Access token required' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, exports.verifyAccessToken)(token);
        const user = await User_1.User.findById(decoded.userId).select('email timezone');
        if (!user) {
            res.status(401).json({ success: false, error: 'User not found' });
            return;
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            timezone: user.timezone
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = (0, exports.verifyAccessToken)(token);
            const user = await User_1.User.findById(decoded.userId).select('email timezone');
            if (user) {
                req.user = {
                    id: user._id.toString(),
                    email: user.email,
                    timezone: user.timezone
                };
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map