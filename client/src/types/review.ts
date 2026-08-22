export interface ReviewProductInfo {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
}

export interface ReviewCustomerInfo {
  _id: string;
  name: string;
  email: string;
  city?: string;
}

export interface ReviewItem {
  _id: string;
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  createdAt: string;
  productId?: ReviewProductInfo;
  customerId?: ReviewCustomerInfo;
}

export interface StarDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface LowestRatedProduct {
  productId: string;
  name: string;
  sku: string;
  category: string;
  averageRating: number;
  reviewCount: number;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  negativeReviewsCount: number;
  positiveReviewsCount: number;
  starDistribution: StarDistribution[];
  lowestRatedProducts: LowestRatedProduct[];
  recentNegativeReviews: ReviewItem[];
}

export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  rating?: number;
  productId?: string;
  search?: string;
  verifiedOnly?: boolean;
}
