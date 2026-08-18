import type { NextFunction, Request, Response } from 'express';
import { environment } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction): void {
  next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint was not found.'));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  void _next;
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    response.status(409).json({ success: false, error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' } });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: environment.nodeEnv === 'production' ? 'An unexpected error occurred.' : 'An unexpected error occurred.',
    },
  });
}
