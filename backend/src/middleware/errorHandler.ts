import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  code?: number | string;
  details?: any;
  keyPattern?: any;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values((error as any).errors || {}).map((err: any) => ({
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

  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys((error as any).keyPattern || {})[0];
    res.status(409).json({
      success: false,
      error: `${field} already exists`,
      code: 'DUPLICATE_FIELD'
    });
    return;
  }

  // Handle JWT errors
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

  // Handle custom application errors
  if (error.statusCode) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
};