import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { authRouter } from './modules/auth/routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);

  // Other routers plugged in here in later steps (campaigns, recipients)

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
