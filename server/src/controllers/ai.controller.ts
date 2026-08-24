import type { NextFunction, Request, Response } from 'express';
import { testGeminiHealthService } from '../services/ai.service.js';
import { ApiError } from '../utils/api-error.js';

function getMerchantId(request: Request): string {
  if (!request.authenticatedUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.authenticatedUser._id.toString();
}

export async function healthTestHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    getMerchantId(request);
    const healthResult = await testGeminiHealthService();

    response.json({
      success: true,
      data: healthResult,
    });
  } catch (error) {
    next(error);
  }
}
