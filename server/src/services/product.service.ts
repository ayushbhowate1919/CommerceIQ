import mongoose from 'mongoose';
import Product, { type ProductDocument } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from '../validators/product.validator.js';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type PaginatedProducts = {
  data: ProductDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
  }
}

export async function createProduct(merchantId: string, input: CreateProductInput): Promise<ProductDocument> {
  const product = await Product.create({
    merchant: merchantId,
    ...input,
  });
  return product;
}

export async function getProducts(merchantId: string, query: ListProductsQuery): Promise<PaginatedProducts> {
  const filter: Record<string, unknown> = { merchant: merchantId };

  if (query.category) {
    filter.category = { $regex: new RegExp(`^${escapeRegex(query.category)}$`, 'i') };
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
  }

  const skip = (query.page - 1) * query.limit;
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

  const [total, data] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort({ [query.sortBy]: sortDirection })
      .skip(skip)
      .limit(query.limit),
  ]);

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getProductById(merchantId: string, id: string): Promise<ProductDocument> {
  ensureValidObjectId(id);
  const product = await Product.findOne({ _id: id, merchant: merchantId });
  if (!product) {
    throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
  }
  return product;
}

export async function updateProduct(merchantId: string, id: string, input: UpdateProductInput): Promise<ProductDocument> {
  ensureValidObjectId(id);
  const product = await Product.findOneAndUpdate(
    { _id: id, merchant: merchantId },
    { $set: input },
    { new: true, runValidators: true },
  );

  if (!product) {
    throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
  }

  return product;
}

export async function deleteProduct(merchantId: string, id: string): Promise<void> {
  ensureValidObjectId(id);
  const deleted = await Product.findOneAndDelete({ _id: id, merchant: merchantId });
  if (!deleted) {
    throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
  }
}
