import { pino } from 'pino';
import { env } from '../config/env.js';

// Plain JSON logs — reviewers can pipe through `pino-pretty` if they want color.
export const logger = pino({ level: env.LOG_LEVEL });
