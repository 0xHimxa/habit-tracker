"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors || {}).map((err) => ({
            field: err.path,
            message: err.message
        }));
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validationErrors
        });
        return;
    }
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        res.status(409).json({
            success: false,
            error: `${field} already exists`,
            code: 'DUPLICATE_FIELD'
        });
        return;
    }
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
        return;
    }
    if (error.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
        return;
    }
    if (error.statusCode) {
        res.status(error.statusCode).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND'
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map