import { request, type PaginationMetadata } from './client';
import type { ReviewItem, ReviewQueryParams, ReviewSummary } from '../types/review';

export async function fetchReviews(
  params: ReviewQueryParams = {}
): Promise<{ data: ReviewItem[]; pagination?: PaginationMetadata }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.rating) queryParams.set('rating', String(params.rating));
  if (params.productId) queryParams.set('productId', params.productId);
  if (params.search) queryParams.set('search', params.search);
  if (params.verifiedOnly) queryParams.set('verifiedOnly', 'true');

  const res = await request<ReviewItem[]>(`/reviews?${queryParams.toString()}`);
  return { data: res.data, pagination: res.pagination };
}

export async function fetchReviewSummary(): Promise<ReviewSummary> {
  const res = await request<ReviewSummary>('/reviews/summary');
  return res.data;
}
