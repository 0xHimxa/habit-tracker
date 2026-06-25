"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const habits_1 = __importDefault(require("./routes/habits"));
const completions_1 = __importDefault(require("./routes/completions"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const autoAuth_1 = require("./middleware/autoAuth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Habit Tracker API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/habits', habits_1.default);
app.use('/api/completions', completions_1.default);
app.use('/api/analytics', analytics_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const startServer = async () => {
    try {
        await (0, database_1.connectDB)();
        await (0, autoAuth_1.seedDefaultUser)();
        app.listen(PORT, () => {
            console.log(`🚀 Habit Tracker API running on port ${PORT}`);
            console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
process.on('unhandledRejection', (error, promise) => {
    console.error('Unhandled Rejection at:', promise, 'error:', error);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map