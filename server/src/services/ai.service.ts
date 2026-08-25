import { getGeminiClient, getGeminiModelName, isGeminiConfigured } from '../ai/client.js';
import { buildProductDescriptionPrompt } from '../ai/prompts/description.prompt.js';
import {
  buildProductReviewsAnalysisPrompt,
  buildSingleReviewAnalysisPrompt,
} from '../ai/prompts/review-analysis.prompt.js';
import {
  type GeneratedProductDescription,
  productDescriptionSchema,
} from '../ai/schemas/description.schema.js';
import {
  type ProductReviewsAnalysis,
  type SingleReviewAnalysis,
  productReviewsAnalysisSchema,
  singleReviewAnalysisSchema,
} from '../ai/schemas/review-analysis.schema.js';
import Product from '../models/product.model.js';
import Review from '../models/review.model.js';
import { ApiError } from '../utils/api-error.js';
import {
  type ValidatedGenerateDescriptionInput,
  validateGenerateDescriptionInput,
  validateProductReviewsAnalysisInput,
  validateSingleReviewAnalysisInput,
} from '../validators/ai.validator.js';

export interface GeminiHealthTestResult {
  configured: boolean;
  status: 'ok' | 'unconfigured' | 'error';
  model: string;
  responseText?: string;
  error?: string;
}

export async function testGeminiHealthService(): Promise<GeminiHealthTestResult> {
  const model = getGeminiModelName();

  if (!isGeminiConfigured()) {
    return {
      configured: false,
      status: 'unconfigured',
      model,
      responseText: 'GEMINI_API_KEY environment variable is not set or empty. AI features running in degraded offline mode.',
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      configured: false,
      status: 'unconfigured',
      model,
      responseText: 'Gemini client failed to initialize.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: 'Respond with concise JSON: {"status": "ok", "message": "Gemini operational"}',
    });

    const text = response.text?.trim() ?? 'No response text returned';

    return {
      configured: true,
      status: 'ok',
      model,
      responseText: text,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini SDK error';
    return {
      configured: true,
      status: 'error',
      model,
      error: errorMessage,
    };
  }
}

export async function generateProductDescriptionService(
  rawInput: unknown
): Promise<GeneratedProductDescription> {
  const validatedInput: ValidatedGenerateDescriptionInput = validateGenerateDescriptionInput(rawInput);

  if (!isGeminiConfigured()) {
    throw new ApiError(
      503,
      'AI_UNCONFIGURED',
      'GEMINI_API_KEY environment variable is missing on the server. Unable to generate AI product description.'
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new ApiError(500, 'AI_CLIENT_ERROR', 'Gemini AI client initialization failed.');
  }

  const model = getGeminiModelName();
  const { systemInstruction, userPrompt } = buildProductDescriptionPrompt(validatedInput);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: productDescriptionSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'Gemini returned an empty response.');
    }

    const parsed = JSON.parse(text) as GeneratedProductDescription;

    if (
      !parsed.title ||
      !parsed.shortDescription ||
      !parsed.longDescription ||
      !Array.isArray(parsed.bulletPoints) ||
      !Array.isArray(parsed.seoKeywords)
    ) {
      throw new ApiError(
        502,
        'AI_SCHEMA_MISMATCH',
        'Gemini response did not conform to expected product description schema.'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const errorMessage = error instanceof Error ? error.message : 'Gemini AI generation failed.';
    throw new ApiError(502, 'AI_SERVICE_ERROR', `Failed to generate product description: ${errorMessage}`);
  }
}

export async function analyzeSingleReviewService(
  merchantId: string,
  rawInput: unknown
): Promise<SingleReviewAnalysis> {
  const { reviewId, forceRefresh } = validateSingleReviewAnalysisInput(rawInput);

  const review = await Review.findOne({ _id: reviewId, merchant: merchantId }).populate<{
    productId: { name: string };
  }>('productId', 'name');

  if (!review) {
    throw new ApiError(404, 'NOT_FOUND', 'Review not found or does not belong to merchant.');
  }

  if (review.aiAnalysis && !forceRefresh) {
    const cached = review.aiAnalysis as SingleReviewAnalysis;
    if (cached.sentiment && cached.topics && cached.summary && cached.suggestedAction) {
      return cached;
    }
  }

  if (!isGeminiConfigured()) {
    if (review.aiAnalysis) {
      return review.aiAnalysis as SingleReviewAnalysis;
    }
    throw new ApiError(
      503,
      'AI_UNCONFIGURED',
      'GEMINI_API_KEY environment variable is missing on the server. Unable to analyze review.'
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new ApiError(500, 'AI_CLIENT_ERROR', 'Gemini AI client initialization failed.');
  }

  const model = getGeminiModelName();
  const productName = (review.productId as unknown as { name?: string })?.name ?? 'Product';
  const { systemInstruction, userPrompt } = buildSingleReviewAnalysisPrompt({
    rating: review.rating,
    text: review.text,
    productName,
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: singleReviewAnalysisSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'Gemini returned an empty response.');
    }

    const parsed = JSON.parse(text) as SingleReviewAnalysis;
    if (!parsed.sentiment || !parsed.summary || !parsed.suggestedAction || !Array.isArray(parsed.topics)) {
      throw new ApiError(
        502,
        'AI_SCHEMA_MISMATCH',
        'Gemini response did not conform to expected single review analysis schema.'
      );
    }

    parsed.analyzedAt = new Date().toISOString();

    review.aiAnalysis = parsed;
    await review.save();

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const errorMessage = error instanceof Error ? error.message : 'Gemini AI analysis failed.';
    throw new ApiError(502, 'AI_SERVICE_ERROR', `Failed to analyze review: ${errorMessage}`);
  }
}

export async function analyzeProductReviewsService(
  merchantId: string,
  rawInput: unknown
): Promise<ProductReviewsAnalysis> {
  const { productId, limit = 50 } = validateProductReviewsAnalysisInput(rawInput);

  const product = await Product.findOne({ _id: productId, merchant: merchantId });
  if (!product) {
    throw new ApiError(404, 'NOT_FOUND', 'Product not found or does not belong to merchant.');
  }

  const reviews = await Review.find({ productId, merchant: merchantId })
    .sort({ createdAt: -1 })
    .limit(limit);

  if (reviews.length === 0) {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 0.5,
      topPositiveThemes: [],
      topNegativeThemes: [],
      summary: 'No customer reviews available for this product yet.',
      recommendedActions: ['Encourage verified buyers to submit reviews after purchase.'],
      analyzedReviewCount: 0,
      analyzedAt: new Date().toISOString(),
    };
  }

  if (!isGeminiConfigured()) {
    throw new ApiError(
      503,
      'AI_UNCONFIGURED',
      'GEMINI_API_KEY environment variable is missing on the server. Unable to perform product review analysis.'
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new ApiError(500, 'AI_CLIENT_ERROR', 'Gemini AI client initialization failed.');
  }

  const model = getGeminiModelName();
  const { systemInstruction, userPrompt } = buildProductReviewsAnalysisPrompt({
    productName: product.name,
    category: product.category,
    reviews: reviews.map((r) => ({
      rating: r.rating,
      text: r.text,
      verifiedPurchase: r.verifiedPurchase,
    })),
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: productReviewsAnalysisSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'Gemini returned an empty response.');
    }

    const parsed = JSON.parse(text) as ProductReviewsAnalysis;
    if (
      !parsed.overallSentiment ||
      typeof parsed.sentimentScore !== 'number' ||
      !Array.isArray(parsed.topPositiveThemes) ||
      !Array.isArray(parsed.topNegativeThemes) ||
      !parsed.summary ||
      !Array.isArray(parsed.recommendedActions)
    ) {
      throw new ApiError(
        502,
        'AI_SCHEMA_MISMATCH',
        'Gemini response did not conform to expected product reviews analysis schema.'
      );
    }

    parsed.analyzedReviewCount = reviews.length;
    parsed.analyzedAt = new Date().toISOString();

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const errorMessage = error instanceof Error ? error.message : 'Gemini AI analysis failed.';
    throw new ApiError(502, 'AI_SERVICE_ERROR', `Failed to analyze product reviews: ${errorMessage}`);
  }
}
