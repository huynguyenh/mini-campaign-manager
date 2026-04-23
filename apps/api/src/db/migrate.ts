import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize } from './index.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function listApplied(): Promise<Set<string>> {
  const [rows] = await sequelize.query('SELECT name FROM _migrations');
  return new Set((rows as Array<{ name: string }>).map((r) => r.name));
}

async function up() {
  await ensureMetaTable();
  const applied = await listApplied();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.debug({ file }, 'migration already applied');
      continue;
    }
    logger.info({ file }, 'applying migration');
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    await sequelize.query(sql);
    await sequelize.query('INSERT INTO _migrations (name) VALUES (:name)', {
      replacements: { name: file },
    });
  }
  logger.info('migrations complete');
}

async function reset() {
  logger.warn('DROPPING all app tables — dev only');
  await sequelize.query(`
    DROP TABLE IF EXISTS campaign_recipients CASCADE;
    DROP TABLE IF EXISTS campaigns CASCADE;
    DROP TABLE IF EXISTS recipients CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS _migrations CASCADE;
    DROP TYPE IF EXISTS campaign_status CASCADE;
    DROP TYPE IF EXISTS recipient_status CASCADE;
  `);
  await up();
}

const cmd = process.argv[2] ?? 'up';

(async () => {
  try {
    if (cmd === 'up') await up();
    else if (cmd === 'reset') await reset();
    else {
      logger.error({ cmd }, 'unknown command (use: up | reset)');
      process.exit(1);
    }
    await sequelize.close();
  } catch (err) {
    logger.error({ err }, 'migration failed');
    process.exit(1);
  }
})();
