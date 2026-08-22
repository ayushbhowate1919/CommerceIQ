import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

export interface ReviewQueryInput {
  page: number;
  limit: number;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  productId?: string;
  search?: string;
  verifiedOnly?: boolean;
}

export function validateReviewQuery(rawQuery: Record<string, unknown>): ReviewQueryInput {
  const query: ReviewQueryInput = {
    page: 1,
    limit: 20,
  };

  if (rawQuery.page !== undefined) {
    const p = Number(rawQuery.page);
    if (Number.isNaN(p) || p < 1) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'page must be a positive integer.');
    }
    query.page = Math.floor(p);
  }

  if (rawQuery.limit !== undefined) {
    const l = Number(rawQuery.limit);
    if (Number.isNaN(l) || l < 1 || l > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be a number between 1 and 100.');
    }
    query.limit = Math.floor(l);
  }

  if (rawQuery.rating !== undefined && rawQuery.rating !== '') {
    const r = Number(rawQuery.rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'rating must be an integer between 1 and 5.');
    }
    query.rating = Math.floor(r);
  }

  if (rawQuery.minRating !== undefined && rawQuery.minRating !== '') {
    const r = Number(rawQuery.minRating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'minRating must be an integer between 1 and 5.');
    }
    query.minRating = Math.floor(r);
  }

  if (rawQuery.maxRating !== undefined && rawQuery.maxRating !== '') {
    const r = Number(rawQuery.maxRating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'maxRating must be an integer between 1 and 5.');
    }
    query.maxRating = Math.floor(r);
  }

  if (rawQuery.productId !== undefined && typeof rawQuery.productId === 'string' && rawQuery.productId.trim() !== '') {
    const pId = rawQuery.productId.trim();
    if (!mongoose.Types.ObjectId.isValid(pId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'productId must be a valid ObjectId.');
    }
    query.productId = pId;
  }

  if (rawQuery.search !== undefined && typeof rawQuery.search === 'string' && rawQuery.search.trim() !== '') {
    query.search = rawQuery.search.trim();
  }

  if (rawQuery.verifiedOnly !== undefined) {
    if (typeof rawQuery.verifiedOnly === 'boolean') {
      query.verifiedOnly = rawQuery.verifiedOnly;
    } else if (typeof rawQuery.verifiedOnly === 'string') {
      query.verifiedOnly = rawQuery.verifiedOnly.toLowerCase() === 'true';
    }
  }

  return query;
}

export function validateProductId(productId: string): string {
  if (!productId || typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId.trim())) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid product ID format.');
  }
  return productId.trim();
}
