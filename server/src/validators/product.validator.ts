import { ApiError } from '../utils/api-error.js';

export type CreateProductInput = {
  name: string;
  sku: string;
  category: string;
  description?: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  rating?: number;
  reviewCount?: number;
  status?: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type ListProductsQuery = {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  sortBy: 'createdAt' | 'name' | 'price' | 'stock' | 'rating';
  sortOrder: 'asc' | 'desc';
};

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`);
  }
  return value.trim();
}

function readNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a number greater than or equal to 0.`);
  }
  return value;
}

function parseNumberField(value: unknown, field: string): number {
  if (typeof value === 'number') return readNonNegativeNumber(value, field);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return readNonNegativeNumber(parsed, field);
  }
  throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`);
}

export function validateCreateProductInput(body: unknown): CreateProductInput {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body is required.');
  }
  const input = body as Record<string, unknown>;

  const name = readRequiredString(input.name, 'name');
  const sku = readRequiredString(input.sku, 'sku');
  const category = readRequiredString(input.category, 'category');
  const price = parseNumberField(input.price, 'price');
  const costPrice = parseNumberField(input.costPrice, 'costPrice');
  const stock = parseNumberField(input.stock, 'stock');
  const reorderLevel = parseNumberField(input.reorderLevel, 'reorderLevel');

  let description = '';
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'description must be a string.');
    }
    description = input.description.trim();
  }

  let rating = 0;
  if (input.rating !== undefined && input.rating !== null && input.rating !== '') {
    const val = typeof input.rating === 'number' ? input.rating : Number(input.rating);
    if (Number.isNaN(val) || val < 0 || val > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'rating must be a number between 0 and 5.');
    }
    rating = val;
  }

  let reviewCount = 0;
  if (input.reviewCount !== undefined && input.reviewCount !== null && input.reviewCount !== '') {
    const val = typeof input.reviewCount === 'number' ? input.reviewCount : Number(input.reviewCount);
    if (Number.isNaN(val) || val < 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'reviewCount must be a number greater than or equal to 0.');
    }
    reviewCount = val;
  }

  let status = 'active';
  if (input.status !== undefined && input.status !== null && input.status !== '') {
    if (typeof input.status !== 'string' || !input.status.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status must be a non-empty string.');
    }
    status = input.status.trim();
  }

  return {
    name,
    sku,
    category,
    description,
    price,
    costPrice,
    stock,
    reorderLevel,
    rating,
    reviewCount,
    status,
  };
}

export function validateUpdateProductInput(body: unknown): UpdateProductInput {
  if (!body || typeof body !== 'object' || Object.keys(body as object).length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'At least one field to update is required.');
  }
  const input = body as Record<string, unknown>;
  const result: UpdateProductInput = {};

  if (input.name !== undefined) {
    result.name = readRequiredString(input.name, 'name');
  }
  if (input.sku !== undefined) {
    result.sku = readRequiredString(input.sku, 'sku');
  }
  if (input.category !== undefined) {
    result.category = readRequiredString(input.category, 'category');
  }
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'description must be a string.');
    }
    result.description = input.description.trim();
  }
  if (input.price !== undefined) {
    result.price = parseNumberField(input.price, 'price');
  }
  if (input.costPrice !== undefined) {
    result.costPrice = parseNumberField(input.costPrice, 'costPrice');
  }
  if (input.stock !== undefined) {
    result.stock = parseNumberField(input.stock, 'stock');
  }
  if (input.reorderLevel !== undefined) {
    result.reorderLevel = parseNumberField(input.reorderLevel, 'reorderLevel');
  }
  if (input.rating !== undefined) {
    const val = typeof input.rating === 'number' ? input.rating : Number(input.rating);
    if (Number.isNaN(val) || val < 0 || val > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'rating must be a number between 0 and 5.');
    }
    result.rating = val;
  }
  if (input.reviewCount !== undefined) {
    const val = typeof input.reviewCount === 'number' ? input.reviewCount : Number(input.reviewCount);
    if (Number.isNaN(val) || val < 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'reviewCount must be a number greater than or equal to 0.');
    }
    result.reviewCount = val;
  }
  if (input.status !== undefined) {
    if (typeof input.status !== 'string' || !input.status.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status must be a non-empty string.');
    }
    result.status = input.status.trim();
  }

  return result;
}

export function validateListProductsQuery(query: Record<string, unknown>): ListProductsQuery {
  let page = 1;
  if (query.page) {
    const parsedPage = Number(query.page);
    if (!Number.isNaN(parsedPage) && parsedPage >= 1) {
      page = Math.floor(parsedPage);
    }
  }

  let limit = 20;
  if (query.limit) {
    const parsedLimit = Number(query.limit);
    if (!Number.isNaN(parsedLimit) && parsedLimit >= 1) {
      limit = Math.min(100, Math.floor(parsedLimit));
    }
  }

  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined;
  const category = typeof query.category === 'string' && query.category.trim() ? query.category.trim() : undefined;
  const status = typeof query.status === 'string' && query.status.trim() ? query.status.trim() : undefined;

  const validSortFields = ['createdAt', 'name', 'price', 'stock', 'rating'] as const;
  let sortBy: ListProductsQuery['sortBy'] = 'createdAt';
  if (typeof query.sortBy === 'string' && validSortFields.includes(query.sortBy as (typeof validSortFields)[number])) {
    sortBy = query.sortBy as ListProductsQuery['sortBy'];
  }

  let sortOrder: ListProductsQuery['sortOrder'] = 'desc';
  if (typeof query.sortOrder === 'string' && (query.sortOrder.toLowerCase() === 'asc' || query.sortOrder.toLowerCase() === 'desc')) {
    sortOrder = query.sortOrder.toLowerCase() as ListProductsQuery['sortOrder'];
  }

  return {
    page,
    limit,
    search,
    category,
    status,
    sortBy,
    sortOrder,
  };
}
