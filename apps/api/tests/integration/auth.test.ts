import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sequelize } from '../../src/db/index.js';
import { User } from '../../src/db/models/index.js';

const app = createApp();

describe('POST /auth/register', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });
  afterAll(async () => {
    await sequelize.close();
  });
  beforeEach(async () => {
    await User.destroy({ where: { email: 'newuser@example.com' } });
  });

  it('registers a new user and returns a JWT', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'newuser@example.com', name: 'New User', password: 'pass1234' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'newuser@example.com', name: 'U', password: 'pass1234' });
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'newuser@example.com', name: 'U', password: 'pass1234' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'short@example.com', name: 'U', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await User.destroy({ where: { email: 'loginme@example.com' } });
    await request(app)
      .post('/auth/register')
      .send({ email: 'loginme@example.com', name: 'Login', password: 'pass1234' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'loginme@example.com', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects wrong password with 401 and a generic message', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'loginme@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toMatch(/invalid/i);
  });

  it('rejects unknown email with the same generic 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
