import { getGeminiClient, getGeminiModelName, isGeminiConfigured } from '../ai/client.js';

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
