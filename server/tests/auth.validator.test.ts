import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/utils/api-error.js';
import { validateLoginInput, validateRegisterInput } from '../src/validators/auth.validator.js';

test('normalizes a valid registration email', () => {
  const input = validateRegisterInput({ name: 'Merchant One', email: 'MERCHANT@example.com', password: 'securepass1' });
  assert.deepEqual(input, { name: 'Merchant One', email: 'merchant@example.com', password: 'securepass1' });
});

test('rejects invalid auth request values', () => {
  assert.throws(() => validateRegisterInput({ name: '', email: 'bad-email', password: 'short' }), (error: unknown) => error instanceof ApiError && error.code === 'VALIDATION_ERROR');
  assert.throws(() => validateLoginInput({ email: 'merchant@example.com', password: 'short' }), (error: unknown) => error instanceof ApiError && error.message.includes('at least 8'));
});
