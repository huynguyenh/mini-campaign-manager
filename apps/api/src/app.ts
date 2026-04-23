import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { authRouter } from './modules/auth/routes.js';
import { campaignsRouter } from './modules/campaigns/routes.js';
import { recipientsRouter } from './modules/recipients/routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Brute-force guard on auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
  });
  app.use('/auth', authLimiter, authRouter);
  app.use('/campaigns', campaignsRouter);
  app.use('/recipients', recipientsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
