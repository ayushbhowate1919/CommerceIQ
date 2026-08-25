import { Schema, Type } from '@google/genai';

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

export const singleReviewAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: ['positive', 'neutral', 'negative'],
      description: 'Overall sentiment of the single review.',
    },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key product themes or features discussed in the review.',
    },
    summary: {
      type: Type.STRING,
      description: 'A concise 1-sentence summary of the customer feedback.',
    },
    suggestedAction: {
      type: Type.STRING,
      description: 'Specific operational recommendation for the merchant based on this review.',
    },
  },
  required: ['sentiment', 'topics', 'summary', 'suggestedAction'],
};

export const productReviewsAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallSentiment: {
      type: Type.STRING,
      enum: ['positive', 'mixed', 'negative', 'neutral'],
      description: 'Aggregate customer sentiment across all analyzed reviews.',
    },
    sentimentScore: {
      type: Type.NUMBER,
      description: 'Sentiment score from 0.0 (very negative) to 1.0 (very positive).',
    },
    topPositiveThemes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Recurring positive themes or product highlights.',
    },
    topNegativeThemes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Recurring negative themes or customer pain points.',
    },
    summary: {
      type: Type.STRING,
      description: 'Executive summary synthesizing customer reviews for this product.',
    },
    recommendedActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Prioritized merchant recommendations to address feedback and improve ratings.',
    },
  },
  required: [
    'overallSentiment',
    'sentimentScore',
    'topPositiveThemes',
    'topNegativeThemes',
    'summary',
    'recommendedActions',
  ],
};
