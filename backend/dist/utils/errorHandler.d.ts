import { Response } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    details?: any;
    isOperational: boolean;
    constructor(message: string, statusCode: number, code: string, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message?: string);
}
export declare class ErrorResponse {
    static send(res: Response, error: AppError | Error, requestId?: string): Response;
    static validation(res: Response, errors: Array<{
        field: string;
        message: string;
    }>): Response;
    static notFound(res: Response, resource: string): Response;
    static unauthorized(res: Response, message?: string): Response;
    static forbidden(res: Response, message?: string): Response;
    static conflict(res: Response, message: string, details?: any): Response;
    static rateLimit(res: Response, message?: string): Response;
    static database(res: Response, message?: string): Response;
    static externalService(res: Response, service: string, message?: string): Response;
}
export declare const asyncHandler: (fn: (req: any, res: any, next: any) => Promise<any>) => (req: any, res: any, next: any) => void;
export declare class ErrorLogger {
    static log(error: Error, context?: {
        userId?: string;
        ip?: string;
        userAgent?: string;
        route?: string;
        method?: string;
    }): void;
    static logSecurity(event: string, context?: any): void;
}
export declare const createHabitNotFoundError: (habitId: string) => NotFoundError;
export declare const createCompletionNotFoundError: (completionId: string) => NotFoundError;
export declare const createDuplicateCompletionError: (habitId: string, date: string) => ConflictError;
export declare const createInvalidDateError: (date: string) => ValidationError;
export declare const createPastDateEditError: (date: string) => ValidationError;
export declare const createRateLimitError: (endpoint: string) => RateLimitError;
export declare const createDatabaseConnectionError: () => DatabaseError;
export declare const createExternalServiceError: (service: string, originalError: Error) => ExternalServiceError;
export declare const validateObjectId: (id: string, fieldName?: string) => string;
export declare const validateDateRange: (startDate: string, endDate: string) => void;
export declare const validatePagination: (page: number, limit: number) => void;
//# sourceMappingURL=errorHandler.d.ts.map