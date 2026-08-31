import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // Limit each IP to 30 AI requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request: Request) => {
    if (process.env.NODE_ENV === 'test' && request.header('x-test-rate-limit') !== 'true') {
      return true;
    }
    return false;
  },
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded for AI operations. Please try again later.',
      },
    });
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 general requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request: Request) => {
    if (process.env.NODE_ENV === 'test' && request.header('x-test-rate-limit') !== 'true') {
      return true;
    }
    return false;
  },
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please slow down your requests.',
      },
    });
  },
});
