import type { NextFunction, Request, Response } from 'express';
import { getInventoryRisks, getInventorySummary } from '../services/inventory.service.js';
import { ApiError } from '../utils/api-error.js';
import { validateInventoryQuery } from '../validators/inventory.validator.js';

function getMerchantId(request: Request): string {
  if (!request.authenticatedUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.authenticatedUser._id.toString();
}

export async function getInventoryRisksHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateInventoryQuery(request.query as Record<string, unknown>);
    const result = await getInventoryRisks(merchantId, query);
    response.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventorySummaryHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateInventoryQuery(request.query as Record<string, unknown>);
    const result = await getInventorySummary(merchantId, query);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
