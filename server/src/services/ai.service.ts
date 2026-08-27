import { type Content } from '@google/genai';
import { getGeminiClient, getGeminiModelName, isGeminiConfigured } from '../ai/client.js';
import { buildAnalyticsAssistantSystemInstruction } from '../ai/prompts/analytics-assistant.prompt.js';
import {
  type BusinessSnapshotData,
  buildBusinessAdvisorPrompt,
} from '../ai/prompts/business-advisor.prompt.js';
import { buildProductDescriptionPrompt } from '../ai/prompts/description.prompt.js';
import {
  buildProductReviewsAnalysisPrompt,
  buildSingleReviewAnalysisPrompt,
} from '../ai/prompts/review-analysis.prompt.js';
import {
  type BusinessAdvisorResult,
  businessAdvisorSchema,
} from '../ai/schemas/business-advisor.schema.js';
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
import {
  ALL_ANALYTICS_TOOL_DECLARATIONS,
  type ToolCallResult,
  executeAnalyticsTool,
} from '../ai/tools/analytics-tools.js';
import AIInsight from '../models/ai-insight.model.js';
import Product from '../models/product.model.js';
import Review from '../models/review.model.js';
import { ApiError } from '../utils/api-error.js';
import {
  type ValidatedGenerateDescriptionInput,
  validateAnalyticsQueryInput,
  validateBusinessAdvisorInput,
  validateGenerateDescriptionInput,
  validateProductReviewsAnalysisInput,
  validateSingleReviewAnalysisInput,
} from '../validators/ai.validator.js';
import { getPeriodComparison, getTopProducts } from './analytics.service.js';
import { getInventorySummary } from './inventory.service.js';
import { getMerchantReviewSummaryService } from './review.service.js';


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

export async function generateBusinessAdvisorService(
  merchantId: string,
  rawInput: unknown
): Promise<BusinessAdvisorResult> {
  const { timeRange, forceRefresh } = validateBusinessAdvisorInput(rawInput);

  if (!forceRefresh) {
    const latestInsight = await AIInsight.findOne({ merchant: merchantId, type: 'business_advisor' })
      .sort({ createdAt: -1 })
      .exec();

    if (latestInsight && latestInsight.supportingMetrics) {
      const cached = latestInsight.supportingMetrics as BusinessAdvisorResult;
      if (cached.healthScore !== undefined && cached.executiveSummary && Array.isArray(cached.strengths)) {
        return cached;
      }
    }
  }

  const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;

  const [periodComp, topProducts, invSummary, reviewSummary] = await Promise.all([
    getPeriodComparison(merchantId, { range: timeRange }),
    getTopProducts(merchantId, { sortBy: 'revenue', limit: 5 }),
    getInventorySummary(merchantId, { lookbackDays: days }),
    getMerchantReviewSummaryService(merchantId),
  ]);

  const summary = periodComp.summary;
  const snapshot: BusinessSnapshotData = {
    timeRange,
    revenue: summary.revenue,
    previousRevenue: summary.revenueChange !== 0 ? Math.round((summary.revenue / (1 + summary.revenueChange / 100)) * 100) / 100 : summary.revenue,
    revenueGrowth: summary.revenueChange,
    orders: summary.orders,
    previousOrders: summary.ordersChange !== 0 ? Math.round(summary.orders / (1 + summary.ordersChange / 100)) : summary.orders,
    ordersGrowth: summary.ordersChange,
    aov: summary.aov,
    previousAov: summary.aovChange !== 0 ? Math.round((summary.aov / (1 + summary.aovChange / 100)) * 100) / 100 : summary.aov,
    topProducts: topProducts.map((p) => ({
      name: p.name,
      category: p.category,
      revenue: p.revenue,
      quantity: p.quantity,
    })),
    inventoryRisks: {
      totalProducts: invSummary.totalProducts,
      outOfStockCount: invSummary.outOfStockCount,
      criticalCount: invSummary.criticalRiskCount,
      highRiskCount: invSummary.highRiskCount,
    },
    reviewsSummary: {
      averageRating: reviewSummary.averageRating,
      totalReviews: reviewSummary.totalReviews,
      negativeReviewsCount: reviewSummary.negativeReviewsCount,
      lowestRatedProducts: reviewSummary.lowestRatedProducts.map((p) => ({
        name: p.name,
        averageRating: p.averageRating,
      })),
    },
  };

  if (!isGeminiConfigured()) {
    // If an existing insight was saved earlier, return it in degraded mode
    const fallbackInsight = await AIInsight.findOne({ merchant: merchantId, type: 'business_advisor' })
      .sort({ createdAt: -1 })
      .exec();

    if (fallbackInsight && fallbackInsight.supportingMetrics) {
      return fallbackInsight.supportingMetrics as BusinessAdvisorResult;
    }

    throw new ApiError(
      503,
      'AI_UNCONFIGURED',
      'GEMINI_API_KEY environment variable is missing on the server. Unable to generate AI Business Advisor analysis.'
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new ApiError(500, 'AI_CLIENT_ERROR', 'Gemini AI client initialization failed.');
  }

  const model = getGeminiModelName();
  const { systemInstruction, userPrompt } = buildBusinessAdvisorPrompt(snapshot);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: businessAdvisorSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'Gemini returned an empty response.');
    }

    const parsed = JSON.parse(text) as BusinessAdvisorResult;
    if (
      typeof parsed.healthScore !== 'number' ||
      !parsed.executiveSummary ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.risks) ||
      !Array.isArray(parsed.recommendedActions)
    ) {
      throw new ApiError(
        502,
        'AI_SCHEMA_MISMATCH',
        'Gemini response did not conform to expected Business Advisor schema.'
      );
    }

    parsed.timeRange = timeRange;
    parsed.analyzedAt = new Date().toISOString();

    await AIInsight.create({
      merchant: merchantId,
      type: 'business_advisor',
      title: `AI Business Advisor Summary (${timeRange})`,
      summary: parsed.executiveSummary,
      severity: parsed.healthScore >= 70 ? 'info' : parsed.healthScore >= 40 ? 'warning' : 'critical',
      source: 'gemini_advisor',
      supportingMetrics: parsed,
    });

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Gemini AI Advisor analysis failed.';
    throw new ApiError(502, 'AI_SERVICE_ERROR', `Failed to generate business advisor insights: ${errorMessage}`);
  }
}

export async function getLatestBusinessAdvisorService(
  merchantId: string
): Promise<BusinessAdvisorResult | null> {
  const latestInsight = await AIInsight.findOne({ merchant: merchantId, type: 'business_advisor' })
    .sort({ createdAt: -1 })
    .exec();

  if (!latestInsight || !latestInsight.supportingMetrics) {
    return null;
  }

  return latestInsight.supportingMetrics as BusinessAdvisorResult;
}

export interface ProcessAnalyticsQueryResult {
  answer: string;
  toolsUsed: ToolCallResult[];
  aiConfigured: boolean;
}

export async function processAnalyticsQueryService(
  merchantId: string,
  rawInput: unknown
): Promise<ProcessAnalyticsQueryResult> {
  const { query } = validateAnalyticsQueryInput(rawInput);

  if (!isGeminiConfigured()) {
    return {
      answer:
        'Gemini AI is currently unconfigured (GEMINI_API_KEY environment variable missing). Direct analytics and reporting are available via the merchant dashboard.',
      toolsUsed: [],
      aiConfigured: false,
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new ApiError(500, 'AI_CLIENT_ERROR', 'Gemini AI client initialization failed.');
  }

  const model = getGeminiModelName();
  const systemInstruction = buildAnalyticsAssistantSystemInstruction();
  const toolsUsed: ToolCallResult[] = [];

  const contents: Content[] = [
    {
      role: 'user',
      parts: [{ text: query }],
    },
  ];

  let maxLoops = 5;

  try {
    while (maxLoops > 0) {
      maxLoops -= 1;

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: ALL_ANALYTICS_TOOL_DECLARATIONS }],
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate || !candidate.content) {
        break;
      }

      contents.push(candidate.content);

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        const textAnswer = response.text?.trim() ?? 'Analysis complete.';
        return {
          answer: textAnswer,
          toolsUsed,
          aiConfigured: true,
        };
      }

      const responseParts: Array<Record<string, unknown>> = [];

      for (const call of functionCalls) {
        if (!call.name) continue;
        const callName = call.name;
        const callArgs = (call.args as Record<string, unknown>) ?? {};

        const result = await executeAnalyticsTool(merchantId, callName, callArgs);
        toolsUsed.push(result);

        responseParts.push({
          functionResponse: {
            name: callName,
            response: { output: result.output },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: responseParts,
      });
    }

    const finalAnswer =
      contents.length > 0
        ? contents[contents.length - 1]?.parts?.map((p) => p.text).filter(Boolean).join('\n') || 'Analysis complete.'
        : 'Analysis complete.';

    return {
      answer: finalAnswer,
      toolsUsed,
      aiConfigured: true,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during analytics query.';
    throw new ApiError(502, 'AI_SERVICE_ERROR', `Failed to process AI analytics query: ${errorMessage}`);
  }
}

