import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or malformed Authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
