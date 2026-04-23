import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sequelize } from '../../src/db/index.js';
import { Campaign, CampaignRecipient, Recipient, User } from '../../src/db/models/index.js';

const app = createApp();

// shared test fixtures
let tokenA: string;
let tokenB: string;
let userA: string;
let recipientIds: string[];

async function registerAndLogin(email: string, name: string) {
  const res = await request(app).post('/auth/register').send({ email, name, password: 'pass1234' });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

beforeAll(async () => {
  await sequelize.authenticate();
  // Clean slate for the two test users
  await User.destroy({ where: { email: ['userA@example.com', 'userB@example.com'] } });

  const a = await registerAndLogin('userA@example.com', 'Alice');
  tokenA = a.token;
  userA = a.userId;
  const b = await registerAndLogin('userB@example.com', 'Bob');
  tokenB = b.token;

  // Seed some recipients for attach
  await Recipient.destroy({ where: { email: ['rx1@example.com', 'rx2@example.com', 'rx3@example.com'] } });
  const rs = await Recipient.bulkCreate([
    { email: 'rx1@example.com', name: 'Rx 1' },
    { email: 'rx2@example.com', name: 'Rx 2' },
    { email: 'rx3@example.com', name: 'Rx 3' },
  ]);
  recipientIds = rs.map((r) => r.id);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Campaigns — happy paths', () => {
  it('creates a draft campaign with recipients attached as pending', async () => {
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Welcome',
        subject: 'Hi',
        body: 'Body text',
        recipient_ids: recipientIds,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');

    const rows = await CampaignRecipient.findAll({ where: { campaign_id: res.body.id } });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
  });

  it('lists only the caller’s campaigns', async () => {
    const resA = await request(app).get('/campaigns').set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.every((c: { created_by: string }) => c.created_by === userA)).toBe(true);

    const resB = await request(app).get('/campaigns').set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data).toEqual([]);
  });
});

describe('Campaigns — auth & ownership', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/campaigns');
    expect(res.status).toBe(401);
  });

  it('403 when another user tries to read a campaign', async () => {
    const created = await Campaign.create({
      name: 'Private',
      subject: 's',
      body: 'b',
      status: 'draft',
      scheduled_at: null,
      created_by: userA,
    });
    const res = await request(app)
      .get(`/campaigns/${created.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });
});

describe('Campaigns — state machine rules', () => {
  it('PATCH on a sent campaign returns 409 CAMPAIGN_NOT_DRAFT', async () => {
    const c = await Campaign.create({
      name: 'Sent c',
      subject: 's',
      body: 'b',
      status: 'sent',
      scheduled_at: null,
      created_by: userA,
    });
    const res = await request(app)
      .patch(`/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'nope' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CAMPAIGN_NOT_DRAFT');
  });

  it('DELETE on a scheduled campaign returns 409', async () => {
    const c = await Campaign.create({
      name: 'Sched',
      subject: 's',
      body: 'b',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 3600_000),
      created_by: userA,
    });
    const res = await request(app)
      .delete(`/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(409);
  });

  it('schedule rejects a past timestamp with 400', async () => {
    const c = await Campaign.create({
      name: 'Dr',
      subject: 's',
      body: 'b',
      status: 'draft',
      scheduled_at: null,
      created_by: userA,
    });
    const res = await request(app)
      .post(`/campaigns/${c.id}/schedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduled_at: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(400);
  });

  it('schedule flips draft to scheduled when given a future timestamp', async () => {
    const c = await Campaign.create({
      name: 'Dr2',
      subject: 's',
      body: 'b',
      status: 'draft',
      scheduled_at: null,
      created_by: userA,
    });
    const future = new Date(Date.now() + 3600_000).toISOString();
    const res = await request(app)
      .post(`/campaigns/${c.id}/schedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduled_at: future });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('scheduled');
  });
});
