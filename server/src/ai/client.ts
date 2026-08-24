import { GoogleGenAI } from '@google/genai';
import { environment } from '../config/env.js';

let geminiClient: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(environment.geminiApiKey && environment.geminiApiKey.trim() !== '');
}

export function getGeminiModelName(): string {
  return environment.geminiModel ?? 'gemini-3.6-flash';
}

export function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: environment.geminiApiKey,
    });
  }

  return geminiClient;
}
