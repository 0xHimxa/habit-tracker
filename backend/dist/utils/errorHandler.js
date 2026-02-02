"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePagination = exports.validateDateRange = exports.validateObjectId = exports.createExternalServiceError = exports.createDatabaseConnectionError = exports.createRateLimitError = exports.createPastDateEditError = exports.createInvalidDateError = exports.createDuplicateCompletionError = exports.createCompletionNotFoundError = exports.createHabitNotFoundError = exports.ErrorLogger = exports.asyncHandler = exports.ErrorResponse = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, AppError);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT', details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT');
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR');
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error') {
        super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    }
}
exports.ExternalServiceError = ExternalServiceError;
class ErrorResponse {
    static send(res, error, requestId) {
        let statusCode = 500;
        let code = 'INTERNAL_ERROR';
        let message = 'Internal server error';
        let details = undefined;
        if (error instanceof AppError) {
            statusCode = error.statusCode;
            code = error.code;
            message = error.message;
            details = error.details;
        }
        else {
            console.error('Unexpected error:', {
                message: error.message,
                stack: error.stack,
                requestId
            });
        }
        const response = {
            success: false,
            error: message,
            code,
            ...(requestId && { requestId }),
            ...(details && { details })
        };
        if (process.env.NODE_ENV === 'development' && error.stack) {
            response.stack = error.stack;
        }
        return res.status(statusCode).json(response);
    }
    static validation(res, errors) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }
    static notFound(res, resource) {
        return res.status(404).json({
            success: false,
            error: `${resource} not found`,
            code: 'NOT_FOUND'
        });
    }
    static unauthorized(res, message) {
        return res.status(401).json({
            success: false,
            error: message || 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }
    static forbidden(res, message) {
        return res.status(403).json({
            success: false,
            error: message || 'Forbidden',
            code: 'FORBIDDEN'
        });
    }
    static conflict(res, message, details) {
        return res.status(409).json({
            success: false,
            error: message,
            code: 'CONFLICT',
            ...(details && { details })
        });
    }
    static rateLimit(res, message) {
        return res.status(429).json({
            success: false,
            error: message || 'Rate limit exceeded',
            code: 'RATE_LIMIT',
            retryAfter: 60
        });
    }
    static database(res, message) {
        return res.status(500).json({
            success: false,
            error: message || 'Database operation failed',
            code: 'DATABASE_ERROR'
        });
    }
    static externalService(res, service, message) {
        return res.status(502).json({
            success: false,
            error: message || `${service} service unavailable`,
            code: 'EXTERNAL_SERVICE_ERROR',
            service
        });
    }
}
exports.ErrorResponse = ErrorResponse;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
class ErrorLogger {
    static log(error, context) {
        const logData = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            ...(context && { context }),
            type: error.constructor.name
        };
        if (process.env.NODE_ENV === 'production') {
            console.error(JSON.stringify(logData));
        }
        else {
            console.error(logData);
        }
    }
    static logSecurity(event, context) {
        const logData = {
            timestamp: new Date().toISOString(),
            event,
            type: 'SECURITY',
            ...(context && { context })
        };
        console.warn(JSON.stringify(logData));
    }
}
exports.ErrorLogger = ErrorLogger;
const createHabitNotFoundError = (habitId) => new NotFoundError(`Habit with ID ${habitId} not found`);
exports.createHabitNotFoundError = createHabitNotFoundError;
const createCompletionNotFoundError = (completionId) => new NotFoundError(`Completion with ID ${completionId} not found`);
exports.createCompletionNotFoundError = createCompletionNotFoundError;
const createDuplicateCompletionError = (habitId, date) => new ConflictError(`Habit already completed for date ${date}`, { habitId, date });
exports.createDuplicateCompletionError = createDuplicateCompletionError;
const createInvalidDateError = (date) => new ValidationError(`Invalid date: ${date}`);
exports.createInvalidDateError = createInvalidDateError;
const createPastDateEditError = (date) => new ValidationError(`Cannot edit completions from ${date}. Edits allowed only within 30 days`);
exports.createPastDateEditError = createPastDateEditError;
const createRateLimitError = (endpoint) => new RateLimitError(`Rate limit exceeded for ${endpoint}`);
exports.createRateLimitError = createRateLimitError;
const createDatabaseConnectionError = () => new DatabaseError('Failed to connect to database');
exports.createDatabaseConnectionError = createDatabaseConnectionError;
const createExternalServiceError = (service, originalError) => new ExternalServiceError(service, originalError.message);
exports.createExternalServiceError = createExternalServiceError;
const validateObjectId = (id, fieldName = 'ID') => {
    if (!id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new ValidationError(`Invalid ${fieldName} format`);
    }
    return id;
};
exports.validateObjectId = validateObjectId;
const validateDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
    }
    if (start > end) {
        throw new ValidationError('Start date must be before end date');
    }
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
        throw new ValidationError('Date range cannot exceed 1 year');
    }
};
exports.validateDateRange = validateDateRange;
const validatePagination = (page, limit) => {
    if (page < 1) {
        throw new ValidationError('Page must be at least 1');
    }
    if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
    }
};
exports.validatePagination = validatePagination;
//# sourceMappingURL=errorHandler.js.map