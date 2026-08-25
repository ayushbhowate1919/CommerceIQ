import type { NextFunction, Request, Response } from 'express';
import {
  analyzeProductReviewsService,
  analyzeSingleReviewService,
  generateProductDescriptionService,
  testGeminiHealthService,
} from '../services/ai.service.js';
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

export async function generateDescriptionHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    getMerchantId(request);
    const result = await generateProductDescriptionService(request.body);

    response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeSingleReviewHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const reviewId = request.params.reviewId;
    const result = await analyzeSingleReviewService(merchantId, {
      ...request.body,
      reviewId: reviewId ?? request.body?.reviewId,
    });

    response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeProductReviewsHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const productId = request.params.productId;
    const result = await analyzeProductReviewsService(merchantId, {
      ...request.body,
      productId: productId ?? request.body?.productId,
    });

    response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
