import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { environment } from '../config/env.js';
import { findAuthenticatedUser } from '../services/auth.service.js';
import { ApiError } from '../utils/api-error.js';

type TokenPayload = { sub?: string };

export async function requireAuthentication(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || !environment.jwtSecret) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
    const payload = jwt.verify(token, environment.jwtSecret) as TokenPayload;
    if (!payload.sub) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
    request.authenticatedUser = await findAuthenticatedUser(payload.sub);
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.'));
  }
}
