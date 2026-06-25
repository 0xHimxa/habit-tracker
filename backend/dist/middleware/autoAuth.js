"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAuth = exports.seedDefaultUser = void 0;
const User_1 = require("../models/User");
const DEFAULT_USER = {
    email: 'default@habittracker.local',
    password: 'DefaultPass123',
    name: 'Default User',
    timezone: 'UTC',
};
let defaultUserId = null;
const seedDefaultUser = async () => {
    let user = await User_1.User.findOne({ email: DEFAULT_USER.email });
    if (!user) {
        user = new User_1.User(DEFAULT_USER);
        await user.save();
        console.log('✅ Default user created');
    }
    defaultUserId = user._id.toString();
    return defaultUserId;
};
exports.seedDefaultUser = seedDefaultUser;
const autoAuth = async (req, _res, next) => {
    if (!defaultUserId) {
        await (0, exports.seedDefaultUser)();
    }
    const user = await User_1.User.findById(defaultUserId).select('email timezone');
    if (user) {
        req.user = {
            id: user._id.toString(),
            email: user.email,
            timezone: user.timezone,
        };
    }
    next();
};
exports.autoAuth = autoAuth;
//# sourceMappingURL=autoAuth.js.map