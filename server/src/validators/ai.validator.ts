import { ApiError } from '../utils/api-error.js';

export interface GenerateDescriptionInputPayload {
  name: string;
  category?: string;
  features?: string | string[];
  targetAudience?: string;
  tone?: string;
  keywords?: string | string[];
}

export interface ValidatedGenerateDescriptionInput {
  name: string;
  category?: string;
  features?: string[];
  targetAudience?: string;
  tone?: string;
  keywords?: string[];
}

function parseArrayField(field?: string | string[]): string[] | undefined {
  if (!field) return undefined;
  if (Array.isArray(field)) {
    const cleaned = field.map((item) => String(item).trim()).filter((item) => item.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof field === 'string') {
    const cleaned = field
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  return undefined;
}

export function validateGenerateDescriptionInput(payload: unknown): ValidatedGenerateDescriptionInput {
  if (!payload || typeof payload !== 'object') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body must be a valid JSON object.');
  }

  const raw = payload as Record<string, unknown>;

  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Product name is required.');
  }

  const name = raw.name.trim();
  if (name.length < 2 || name.length > 150) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Product name must be between 2 and 150 characters.');
  }

  const category = typeof raw.category === 'string' && raw.category.trim().length > 0 ? raw.category.trim() : undefined;
  const targetAudience =
    typeof raw.targetAudience === 'string' && raw.targetAudience.trim().length > 0
      ? raw.targetAudience.trim()
      : undefined;
  const tone = typeof raw.tone === 'string' && raw.tone.trim().length > 0 ? raw.tone.trim() : undefined;

  const features = parseArrayField(raw.features as string | string[] | undefined);
  const keywords = parseArrayField(raw.keywords as string | string[] | undefined);

  return {
    name,
    category,
    features,
    targetAudience,
    tone,
    keywords,
  };
}
