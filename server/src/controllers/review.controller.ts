import type { NextFunction, Request, Response } from 'express';
import {
  getReviewsService,
  getMerchantReviewSummaryService,
  getProductReviewSummaryService,
} from '../services/review.service.js';
import { ApiError } from '../utils/api-error.js';
import {
  validateReviewQuery,
  validateProductId,
} from '../validators/review.validator.js';

function getMerchantId(request: Request): string {
  if (!request.authenticatedUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.authenticatedUser._id.toString();
}

export async function listReviewsHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateReviewQuery(request.query as Record<string, unknown>);
    const result = await getReviewsService(merchantId, query);
    response.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReviewSummaryHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const summary = await getMerchantReviewSummaryService(merchantId);
    response.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductReviewsHandler(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const productId = validateProductId(request.params.productId as string);
    const summary = await getProductReviewSummaryService(merchantId, productId);
    response.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.'));
      return;
    }
    next(error);
  }
}
