import mongoose, { FilterQuery } from 'mongoose';
import Review, { ReviewDocument } from '../models/review.model.js';
import Product from '../models/product.model.js';
import { ReviewQueryInput } from '../validators/review.validator.js';

export interface StarDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}

export interface LowestRatedProductItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  averageRating: number;
  reviewCount: number;
}

export interface ReviewSummaryResult {
  totalReviews: number;
  averageRating: number;
  negativeReviewsCount: number;
  positiveReviewsCount: number;
  starDistribution: StarDistributionItem[];
  lowestRatedProducts: LowestRatedProductItem[];
  recentNegativeReviews: Array<{
    _id: string;
    rating: number;
    text: string;
    verifiedPurchase: boolean;
    createdAt: string;
    product?: { _id: string; name: string; sku: string };
    customer?: { _id: string; name: string; email: string };
  }>;
}

export interface ProductReviewSummaryResult {
  productId: string;
  productName: string;
  totalReviews: number;
  averageRating: number;
  starDistribution: StarDistributionItem[];
}

export async function getReviewsService(
  merchantId: string,
  query: ReviewQueryInput
) {
  const filter: FilterQuery<ReviewDocument> = {
    merchant: new mongoose.Types.ObjectId(merchantId),
  };

  if (query.productId) {
    filter.productId = new mongoose.Types.ObjectId(query.productId);
  }

  if (query.rating !== undefined) {
    filter.rating = query.rating;
  } else {
    if (query.minRating !== undefined || query.maxRating !== undefined) {
      filter.rating = {};
      if (query.minRating !== undefined) filter.rating.$gte = query.minRating;
      if (query.maxRating !== undefined) filter.rating.$lte = query.maxRating;
    }
  }

  if (query.verifiedOnly !== undefined) {
    filter.verifiedPurchase = query.verifiedOnly;
  }

  if (query.search) {
    filter.text = { $regex: query.search, $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;
  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('productId', 'name sku category price rating reviewCount')
      .populate('customerId', 'name email city')
      .lean(),
  ]);

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    reviews,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getMerchantReviewSummaryService(
  merchantId: string
): Promise<ReviewSummaryResult> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

  const [statsResult, starDistResult, lowestRatedProductsResult, recentNegative] = await Promise.all([
    // Overall total and average rating
    Review.aggregate([
      { $match: { merchant: merchantObjectId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          negativeCount: {
            $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] },
          },
          positiveCount: {
            $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] },
          },
        },
      },
    ]),

    // 1-5 star distribution
    Review.aggregate([
      { $match: { merchant: merchantObjectId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),

    // Lowest rated products (with at least 1 review)
    Review.aggregate([
      { $match: { merchant: merchantObjectId } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
      { $sort: { averageRating: 1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          sku: '$product.sku',
          category: '$product.category',
          averageRating: { $round: ['$averageRating', 1] },
          reviewCount: 1,
        },
      },
    ]),

    // Recent negative reviews (rating <= 2)
    Review.find({
      merchant: merchantObjectId,
      rating: { $lte: 2 },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('productId', 'name sku')
      .populate('customerId', 'name email')
      .lean(),
  ]);

  const stats = statsResult[0] || {
    totalReviews: 0,
    averageRating: 0,
    negativeCount: 0,
    positiveCount: 0,
  };

  const totalReviews = stats.totalReviews || 0;
  const averageRating = totalReviews > 0 ? Number(stats.averageRating.toFixed(1)) : 0;

  // Build star distribution map
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  starDistResult.forEach((item) => {
    if (item._id >= 1 && item._id <= 5) {
      starCounts[item._id] = item.count;
    }
  });

  const starDistribution: StarDistributionItem[] = [5, 4, 3, 2, 1].map((star) => ({
    rating: star,
    count: starCounts[star] || 0,
    percentage: totalReviews > 0 ? Math.round(((starCounts[star] || 0) / totalReviews) * 100) : 0,
  }));

  const recentNegativeFormatted = recentNegative.map((rev) => ({
    _id: String(rev._id),
    rating: rev.rating,
    text: rev.text,
    verifiedPurchase: rev.verifiedPurchase,
    createdAt: (rev.createdAt as Date).toISOString(),
    product: rev.productId && typeof rev.productId === 'object' && 'name' in rev.productId
      ? { _id: String((rev.productId as unknown as { _id: mongoose.Types.ObjectId })._id), name: String((rev.productId as unknown as { name: string }).name), sku: String((rev.productId as unknown as { sku: string }).sku) }
      : undefined,
    customer: rev.customerId && typeof rev.customerId === 'object' && 'name' in rev.customerId
      ? { _id: String((rev.customerId as unknown as { _id: mongoose.Types.ObjectId })._id), name: String((rev.customerId as unknown as { name: string }).name), email: String((rev.customerId as unknown as { email: string }).email) }
      : undefined,
  }));

  return {
    totalReviews,
    averageRating,
    negativeReviewsCount: stats.negativeCount || 0,
    positiveReviewsCount: stats.positiveCount || 0,
    starDistribution,
    lowestRatedProducts: lowestRatedProductsResult.map((p) => ({
      productId: String(p.productId),
      name: p.name,
      sku: p.sku,
      category: p.category,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
    })),
    recentNegativeReviews: recentNegativeFormatted,
  };
}

export async function getProductReviewSummaryService(
  merchantId: string,
  productId: string
): Promise<ProductReviewSummaryResult> {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
  const productObjectId = new mongoose.Types.ObjectId(productId);

  const product = await Product.findOne({ _id: productObjectId, merchant: merchantObjectId }).lean();
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const [statsResult, starDistResult] = await Promise.all([
    Review.aggregate([
      { $match: { merchant: merchantObjectId, productId: productObjectId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
    ]),
    Review.aggregate([
      { $match: { merchant: merchantObjectId, productId: productObjectId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = statsResult[0] || { totalReviews: 0, averageRating: 0 };
  const totalReviews = stats.totalReviews || 0;
  const averageRating = totalReviews > 0 ? Number(stats.averageRating.toFixed(1)) : 0;

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  starDistResult.forEach((item) => {
    if (item._id >= 1 && item._id <= 5) {
      starCounts[item._id] = item.count;
    }
  });

  const starDistribution: StarDistributionItem[] = [5, 4, 3, 2, 1].map((star) => ({
    rating: star,
    count: starCounts[star] || 0,
    percentage: totalReviews > 0 ? Math.round(((starCounts[star] || 0) / totalReviews) * 100) : 0,
  }));

  return {
    productId: String(product._id),
    productName: product.name,
    totalReviews,
    averageRating,
    starDistribution,
  };
}
