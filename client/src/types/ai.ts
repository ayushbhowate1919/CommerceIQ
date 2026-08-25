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

export interface SingleReviewAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  summary: string;
  suggestedAction: string;
  analyzedAt?: string;
}

export interface ProductReviewsAnalysis {
  overallSentiment: 'positive' | 'mixed' | 'negative' | 'neutral';
  sentimentScore: number;
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  summary: string;
  recommendedActions: string[];
  analyzedReviewCount?: number;
  analyzedAt?: string;
}

export interface RecommendedActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact: string;
  category: 'inventory' | 'marketing' | 'product' | 'customer_experience';
}

export interface BusinessAdvisorResult {
  healthScore: number;
  executiveSummary: string;
  strengths: string[];
  risks: string[];
  recommendedActions: RecommendedActionItem[];
  timeRange?: string;
  analyzedAt?: string;
}
