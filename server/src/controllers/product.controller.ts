import type { NextFunction, Request, Response } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../services/product.service.js';
import { ApiError } from '../utils/api-error.js';
import {
  validateCreateProductInput,
  validateListProductsQuery,
  validateUpdateProductInput,
} from '../validators/product.validator.js';

function getMerchantId(request: Request): string {
  if (!request.authenticatedUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.authenticatedUser._id.toString();
}

export async function createProductHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const input = validateCreateProductInput(request.body);
    const product = await createProduct(merchantId, input);
    response.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function getProductsHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const query = validateListProductsQuery(request.query as Record<string, unknown>);
    const result = await getProducts(merchantId, query);
    response.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductByIdHandler(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const product = await getProductById(merchantId, request.params.id);
    response.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProductHandler(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    const input = validateUpdateProductInput(request.body);
    const product = await updateProduct(merchantId, request.params.id, input);
    response.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductHandler(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const merchantId = getMerchantId(request);
    await deleteProduct(merchantId, request.params.id);
    response.json({ success: true, data: { message: 'Product deleted successfully.' } });
  } catch (error) {
    next(error);
  }
}
