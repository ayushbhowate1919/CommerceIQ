export interface GenerateDescriptionPromptInput {
  name: string;
  category?: string;
  features?: string[];
  targetAudience?: string;
  tone?: string;
  keywords?: string[];
}

export function buildProductDescriptionPrompt(input: GenerateDescriptionPromptInput): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction =
    'You are an expert e-commerce copywriter and SEO optimization specialist. Your job is to create high-converting, compelling, and accurate product copy tailored to the merchant\'s brand tone and target audience. Ground your copy in the provided features without inventing unsupported technical claims.';

  const featuresList = input.features && input.features.length > 0 ? input.features.join(', ') : 'Standard features';
  const keywordsList = input.keywords && input.keywords.length > 0 ? input.keywords.join(', ') : 'None specified';

  const userPrompt = `Create optimized product copy for the following item:

- Product Name: ${input.name}
- Category: ${input.category ?? 'General'}
- Key Features: ${featuresList}
- Target Audience: ${input.targetAudience ?? 'General Shoppers'}
- Desired Tone: ${input.tone ?? 'Professional'}
- Focus Keywords: ${keywordsList}

Ensure the generated copy includes a magnetic product title, a punchy short description hook, a detailed multi-paragraph long description, 3-6 clear feature bullet points, and relevant SEO keywords.`;

  return { systemInstruction, userPrompt };
}
