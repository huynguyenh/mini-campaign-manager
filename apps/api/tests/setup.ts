import 'dotenv/config';

// Tests rely on a real Postgres (compose up); the DATABASE_URL is already in .env
// Keep JWT_SECRET stable for test runs
process.env.JWT_SECRET ??= 'test-only-secret-that-is-long-enough-for-tests';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
