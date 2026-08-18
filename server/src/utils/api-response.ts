import type { Response } from 'express';

export function sendSuccess(response: Response, data: unknown, statusCode = 200): void {
  response.status(statusCode).json({ success: true, data });
}
