import type { Request, Response, NextFunction } from 'express';
import { login, logout, register, toPublicUser } from '../services/auth.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { validateLoginInput, validateRegisterInput } from '../validators/auth.validator.js';

export async function registerUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(response, await register(validateRegisterInput(request.body)), 201); } catch (error) { next(error); }
}

export async function loginUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(response, await login(validateLoginInput(request.body))); } catch (error) { next(error); }
}

export function logoutUser(_request: Request, response: Response, next: NextFunction): void {
  try { logout(); sendSuccess(response, { message: 'Logged out successfully.' }); } catch (error) { next(error); }
}

export function getCurrentUser(request: Request, response: Response): void {
  sendSuccess(response, { user: toPublicUser(request.authenticatedUser!) });
}
