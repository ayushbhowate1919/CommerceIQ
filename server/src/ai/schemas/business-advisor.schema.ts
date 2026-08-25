import { Schema, Type } from '@google/genai';

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

export const businessAdvisorSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    healthScore: {
      type: Type.NUMBER,
      description: 'Overall store health score from 0 (critical state) to 100 (excellent performance).',
    },
    executiveSummary: {
      type: Type.STRING,
      description: 'High-level executive summary synthesizing current store performance, sales growth, and operational health.',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key store achievements, growth drivers, or strong categories, citing explicit numerical metrics where possible.',
    },
    risks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Operational, inventory, or revenue risks that require attention, citing explicit numerical metrics.',
    },
    recommendedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          priority: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'Action priority level.',
          },
          action: {
            type: Type.STRING,
            description: 'Specific, practical merchant action.',
          },
          impact: {
            type: Type.STRING,
            description: 'Expected business outcome or metric improvement.',
          },
          category: {
            type: Type.STRING,
            enum: ['inventory', 'marketing', 'product', 'customer_experience'],
            description: 'Business domain category.',
          },
        },
        required: ['priority', 'action', 'impact', 'category'],
      },
      description: 'Prioritized list of actionable business recommendations.',
    },
  },
  required: ['healthScore', 'executiveSummary', 'strengths', 'risks', 'recommendedActions'],
};
