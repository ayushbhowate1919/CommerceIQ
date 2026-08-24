import { Schema, Type } from '@google/genai';

export interface GeneratedProductDescription {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  seoKeywords: string[];
}

export const productDescriptionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'An engaging, high-converting product title.',
    },
    shortDescription: {
      type: Type.STRING,
      description: 'A punchy 1-2 sentence hook summarizing the primary value proposition.',
    },
    longDescription: {
      type: Type.STRING,
      description: 'A detailed 2-3 paragraph description explaining features, benefits, and use cases.',
    },
    bulletPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'Key benefit bullet points highlighting core features (3 to 6 items).',
    },
    seoKeywords: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'Target SEO search keywords and metadata terms.',
    },
  },
  required: ['title', 'shortDescription', 'longDescription', 'bulletPoints', 'seoKeywords'],
};
