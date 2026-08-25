import { request } from './client.js';
import type {
  GeminiHealthTestResult,
  GenerateDescriptionPayload,
  GeneratedDescriptionResult,
  ProductReviewsAnalysis,
  SingleReviewAnalysis,
} from '../types/ai.js';

export async function checkAiHealth(): Promise<GeminiHealthTestResult> {
  const response = await request<GeminiHealthTestResult>('/ai/health-test', {
    method: 'POST',
  });
  return response.data;
}

export async function generateProductDescriptionApi(
  payload: GenerateDescriptionPayload
): Promise<GeneratedDescriptionResult> {
  const response = await request<GeneratedDescriptionResult>('/ai/generate-description', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function analyzeSingleReviewApi(
  reviewId: string,
  forceRefresh = false
): Promise<SingleReviewAnalysis> {
  const response = await request<SingleReviewAnalysis>(`/ai/analyze-review/${reviewId}`, {
    method: 'POST',
    body: JSON.stringify({ forceRefresh }),
  });
  return response.data;
}

export async function analyzeProductReviewsApi(
  productId: string,
  forceRefresh = false
): Promise<ProductReviewsAnalysis> {
  const response = await request<ProductReviewsAnalysis>(`/ai/analyze-product-reviews/${productId}`, {
    method: 'POST',
    body: JSON.stringify({ forceRefresh }),
  });
  return response.data;
}
