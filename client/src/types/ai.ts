export interface GenerateDescriptionPayload {
  name: string;
  category?: string;
  features?: string | string[];
  targetAudience?: string;
  tone?: string;
  keywords?: string | string[];
}

export interface GeneratedDescriptionResult {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  seoKeywords: string[];
}

export interface GeminiHealthTestResult {
  configured: boolean;
  status: 'ok' | 'unconfigured' | 'error';
  model: string;
  responseText?: string;
  error?: string;
}
