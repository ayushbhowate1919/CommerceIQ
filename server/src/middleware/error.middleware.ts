import type { NextFunction, Request, Response } from 'express';
import { environment } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction): void {
  next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint was not found.'));
}

function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  if (environment.geminiApiKey) {
    sanitized = sanitized.replaceAll(environment.geminiApiKey, '[REDACTED_GEMINI_KEY]');
  }
  if (environment.jwtSecret) {
    sanitized = sanitized.replaceAll(environment.jwtSecret, '[REDACTED_JWT_SECRET]');
  }
  if (environment.mongoUri) {
    sanitized = sanitized.replaceAll(environment.mongoUri, '[REDACTED_MONGO_URI]');
  }
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_TOKEN]');
  sanitized = sanitized.replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"');
  return sanitized;
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  void _next;
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    const errObj = error as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown>; message?: string };
    if (errObj.keyPattern?.sku || errObj.keyValue?.sku || (typeof errObj.message === 'string' && errObj.message.includes('sku'))) {
      response.status(409).json({ success: false, error: { code: 'SKU_ALREADY_EXISTS', message: 'A product with this SKU already exists.' } });
      return;
    }
    response.status(409).json({ success: false, error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' } });
    return;
  }

  if (error instanceof Error) {
    console.error(sanitizeErrorMessage(error.message));
  } else if (typeof error === 'string') {
    console.error(sanitizeErrorMessage(error));
  } else {
    console.error('An unknown error occurred');
  }

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}

