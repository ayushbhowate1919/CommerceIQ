import { request } from './client.js';
import type {
  GeminiHealthTestResult,
  GenerateDescriptionPayload,
  GeneratedDescriptionResult,
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
