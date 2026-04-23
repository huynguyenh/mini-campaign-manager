import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { sequelize } from './db/index.js';

async function main() {
  await sequelize.authenticate();
  logger.info('database connection established');

  const app = createApp();
  app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, 'api listening');
  });
}

main().catch((err) => {
  logger.error({ err }, 'fatal: failed to boot api');
  process.exit(1);
});
