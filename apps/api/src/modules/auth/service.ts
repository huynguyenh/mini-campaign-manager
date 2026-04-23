import bcrypt from 'bcrypt';
import { User } from '../../db/models/index.js';
import { AppError } from '../../errors/AppError.js';
import { signToken } from '../../utils/jwt.js';
import { env } from '../../config/env.js';
import type { AuthResponse, LoginInput, RegisterInput } from '@mcm/shared';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('EMAIL_EXISTS', 'Email already registered');
  }
  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await User.create({
    email: input.email,
    name: input.name,
    password_hash,
  });
  const token = signToken({ sub: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await User.findOne({ where: { email: input.email } });
  // Generic message to avoid user enumeration
  const invalid = new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  if (!user) throw invalid;
  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw invalid;
  const token = signToken({ sub: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}
