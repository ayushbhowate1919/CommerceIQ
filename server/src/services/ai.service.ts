import { getGeminiClient, getGeminiModelName, isGeminiConfigured } from '../ai/client.js';
import { buildProductDescriptionPrompt } from '../ai/prompts/description.prompt.js';
import {
  type GeneratedProductDescription,
  productDescriptionSchema,
} from '../ai/schemas/description.schema.js';
import { ApiError } from '../utils/api-error.js';
import {
  type ValidatedGenerateDescriptionInput,
  validateGenerateDescriptionInput,
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
