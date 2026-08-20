import { ApiError } from '../utils/api-error.js';

export type InventoryRiskLevel = 'critical' | 'high' | 'medium' | 'healthy';

export interface InventoryQueryInput {
  lookbackDays?: number;
  riskLevel?: InventoryRiskLevel;
  reorderOnly?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function validateInventoryQuery(rawQuery: Record<string, unknown>): InventoryQueryInput {
  const query: InventoryQueryInput = {};

  if (rawQuery.lookbackDays !== undefined) {
    const days = Number(rawQuery.lookbackDays);
    if (Number.isNaN(days) || days < 1 || days > 365) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'lookbackDays must be a number between 1 and 365.');
    }
    query.lookbackDays = Math.floor(days);
  } else {
    query.lookbackDays = 30;
  }

  if (rawQuery.riskLevel !== undefined) {
    if (typeof rawQuery.riskLevel !== 'string' || !['critical', 'high', 'medium', 'healthy'].includes(rawQuery.riskLevel)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid riskLevel. Allowed: critical, high, medium, healthy.');
    }
    query.riskLevel = rawQuery.riskLevel as InventoryRiskLevel;
  }

  if (rawQuery.reorderOnly !== undefined) {
    if (typeof rawQuery.reorderOnly === 'boolean') {
      query.reorderOnly = rawQuery.reorderOnly;
    } else if (typeof rawQuery.reorderOnly === 'string') {
      query.reorderOnly = rawQuery.reorderOnly.toLowerCase() === 'true';
    }
  }

  if (rawQuery.category !== undefined && typeof rawQuery.category === 'string') {
    query.category = rawQuery.category.trim();
  }

  if (rawQuery.search !== undefined && typeof rawQuery.search === 'string') {
    query.search = rawQuery.search.trim();
  }

  if (rawQuery.page !== undefined) {
    const p = Number(rawQuery.page);
    if (Number.isNaN(p) || p < 1) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'page must be a positive integer.');
    }
    query.page = Math.floor(p);
  } else {
    query.page = 1;
  }

  if (rawQuery.limit !== undefined) {
    const l = Number(rawQuery.limit);
    if (Number.isNaN(l) || l < 1 || l > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be a number between 1 and 100.');
    }
    query.limit = Math.floor(l);
  } else {
    query.limit = 20;
  }

  return query;
}
