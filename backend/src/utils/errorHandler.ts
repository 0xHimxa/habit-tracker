import { Response } from 'express';

// Custom error classes for better error handling
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// Error response formatter
export class ErrorResponse {
  static send(
    res: Response,
    error: AppError | Error,
    requestId?: string
  ): Response {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else {
      // Log unexpected errors
      console.error('Unexpected error:', {
        message: error.message,
        stack: error.stack,
        requestId
      });
    }

    const response: any = {
      success: false,
      error: message,
      code,
      ...(requestId && { requestId }),
      ...(details && { details })
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      response.stack = error.stack;
    }

    return res.status(statusCode).json(response);
  }

  static validation(res: Response, errors: Array<{ field: string; message: string }>): Response {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  static notFound(res: Response, resource: string): Response {
    return res.status(404).json({
      success: false,
      error: `${resource} not found`,
      code: 'NOT_FOUND'
    });
  }

  static unauthorized(res: Response, message?: string): Response {
    return res.status(401).json({
      success: false,
      error: message || 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }

  static forbidden(res: Response, message?: string): Response {
    return res.status(403).json({
      success: false,
      error: message || 'Forbidden',
      code: 'FORBIDDEN'
    });
  }

  static conflict(res: Response, message: string, details?: any): Response {
    return res.status(409).json({
      success: false,
      error: message,
      code: 'CONFLICT',
      ...(details && { details })
    });
  }

  static rateLimit(res: Response, message?: string): Response {
    return res.status(429).json({
      success: false,
      error: message || 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: 60 // Suggest retry after 60 seconds
    });
  }

  static database(res: Response, message?: string): Response {
    return res.status(500).json({
      success: false,
      error: message || 'Database operation failed',
      code: 'DATABASE_ERROR'
    });
  }

  static externalService(res: Response, service: string, message?: string): Response {
    return res.status(502).json({
      success: false,
      error: message || `${service} service unavailable`,
      code: 'EXTERNAL_SERVICE_ERROR',
      service
    });
  }
}

// Async error wrapper for consistent error handling
export const asyncHandler = (
  fn: (req: any, res: any, next: any) => Promise<any>
) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error logging utility
export class ErrorLogger {
  static log(error: Error, context?: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    route?: string;
    method?: string;
  }): void {
    const logData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      ...(context && { context }),
      type: error.constructor.name
    };

    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to use a proper logging service
      console.error(JSON.stringify(logData));
    } else {
      console.error(logData);
    }
  }

  static logSecurity(event: string, context?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      type: 'SECURITY',
      ...(context && { context })
    };

    console.warn(JSON.stringify(logData));
  }
}

// Common error creators
export const createHabitNotFoundError = (habitId: string) => 
  new NotFoundError(`Habit with ID ${habitId} not found`);

export const createCompletionNotFoundError = (completionId: string) => 
  new NotFoundError(`Completion with ID ${completionId} not found`);

export const createDuplicateCompletionError = (habitId: string, date: string) => 
  new ConflictError(`Habit already completed for date ${date}`, { habitId, date });

export const createInvalidDateError = (date: string) => 
  new ValidationError(`Invalid date: ${date}`);

export const createPastDateEditError = (date: string) => 
  new ValidationError(`Cannot edit completions from ${date}. Edits allowed only within 30 days`);

export const createRateLimitError = (endpoint: string) => 
  new RateLimitError(`Rate limit exceeded for ${endpoint}`);

export const createDatabaseConnectionError = () => 
  new DatabaseError('Failed to connect to database');

export const createExternalServiceError = (service: string, originalError: Error) => 
  new ExternalServiceError(service, originalError.message);

// Validation helpers
export const validateObjectId = (id: string, fieldName: string = 'ID'): string => {
  if (!id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
  return id;
};

export const validateDateRange = (startDate: string, endDate: string): void => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format');
  }
  
  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }
  
  // Limit to 1 year range
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    throw new ValidationError('Date range cannot exceed 1 year');
  }
};

export const validatePagination = (page: number, limit: number): void => {
  if (page < 1) {
    throw new ValidationError('Page must be at least 1');
  }
  
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
};