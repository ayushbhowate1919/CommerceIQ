import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { type UserDocument } from '../models/user.model.js';
import { environment } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';

type PublicUser = { id: string; name: string; email: string; role: string; createdAt: Date };
export type AuthResult = { token: string; user: PublicUser };

function getJwtSecret(): string {
  if (!environment.jwtSecret) throw new ApiError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured.');
  return environment.jwtSecret;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

function createToken(user: UserDocument): string {
  return jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), { expiresIn: '1h' });
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await User.exists({ email: input.email });
  if (existingUser) throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ name: input.name, email: input.email, passwordHash, role: 'merchant' });
  return { token: createToken(user), user: toPublicUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return { token: createToken(user), user: toPublicUser(user) };
}

export async function findAuthenticatedUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  return user;
}

export function logout(): void {
  // JWTs are stateless; the client discards its token on logout.
}
