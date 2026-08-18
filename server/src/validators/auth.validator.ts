import { ApiError } from '../utils/api-error.js';

export type RegisterInput = { name: string; email: string; password: string };
export type LoginInput = { email: string; password: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`);
  }
  return value.trim();
}

function validateEmail(value: unknown): string {
  const email = readRequiredString(value, 'email').toLowerCase();
  if (!emailPattern.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'email must be a valid email address.');
  }
  return email;
}

function validatePassword(value: unknown): string {
  const password = readRequiredString(value, 'password');
  if (password.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'password must be at least 8 characters long.');
  }
  return password;
}

export function validateRegisterInput(body: unknown): RegisterInput {
  if (!body || typeof body !== 'object') throw new ApiError(400, 'VALIDATION_ERROR', 'Request body is required.');
  const input = body as Record<string, unknown>;
  return { name: readRequiredString(input.name, 'name'), email: validateEmail(input.email), password: validatePassword(input.password) };
}

export function validateLoginInput(body: unknown): LoginInput {
  if (!body || typeof body !== 'object') throw new ApiError(400, 'VALIDATION_ERROR', 'Request body is required.');
  const input = body as Record<string, unknown>;
  return { email: validateEmail(input.email), password: validatePassword(input.password) };
}
