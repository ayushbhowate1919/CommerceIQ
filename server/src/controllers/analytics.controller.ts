import type { NextFunction, Request, Response } from 'express';
import {
  getCategoryRevenue,
  getDashboardSummary,
  getOrderSummary,
  getPeriodComparison,
  getProductPerformance,
  getRevenueTrend,
  getTopProducts,
} from '../services/analytics.service.js';
import { ApiError } from '../utils/api-error.js';
import { validateAnalyticsQuery } from '../validators/analytics.validator.js';

function getMerchantId(request: Request): string {
  if (!request.authenticatedUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.authenticatedUser._id.toString();
}

export async function getDashboardSummaryHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getDashboardSummary(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getRevenueTrendHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getRevenueTrend(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getOrderSummaryHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getOrderSummary(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryRevenueHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getCategoryRevenue(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getTopProductsHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getTopProducts(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPeriodComparisonHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getPeriodComparison(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getProductPerformanceHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateAnalyticsQuery(request.query as Record<string, unknown>);
    const result = await getProductPerformance(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
