import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sequelize } from '../../src/db/index.js';
import { Campaign, CampaignRecipient, Recipient, User } from '../../src/db/models/index.js';
import { runSend } from '../../src/workers/sendCampaign.js';

const app = createApp();
let token: string;
let userId: string;
let recipientIds: string[];

beforeAll(async () => {
  await sequelize.authenticate();
  await User.destroy({ where: { email: 'sender@example.com' } });
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'sender@example.com', name: 'Sender', password: 'pass1234' });
  token = reg.body.token;
  userId = reg.body.user.id;

  await Recipient.destroy({
    where: { email: Array.from({ length: 20 }, (_, i) => `send${i}@example.com`) },
  });
  const rs = await Recipient.bulkCreate(
    Array.from({ length: 20 }, (_, i) => ({ email: `send${i}@example.com`, name: `R${i}` })),
  );
  recipientIds = rs.map((r) => r.id);
});

afterAll(async () => {
  await sequelize.close();
});

async function freshCampaignWithRecipients() {
  const c = await Campaign.create({
    name: 'T',
    subject: 's',
    body: 'b',
    status: 'draft',
    scheduled_at: null,
    created_by: userId,
  });
  await CampaignRecipient.bulkCreate(
    recipientIds.map((rid) => ({
      campaign_id: c.id,
      recipient_id: rid,
      status: 'pending' as const,
      sent_at: null,
      opened_at: null,
    })),
  );
  return c;
}

describe('POST /campaigns/:id/send', () => {
  it('returns 400 NO_RECIPIENTS when the campaign has no recipients', async () => {
    const c = await Campaign.create({
      name: 'Empty',
      subject: 's',
      body: 'b',
      status: 'draft',
      scheduled_at: null,
      created_by: userId,
    });
    const res = await request(app)
      .post(`/campaigns/${c.id}/send`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_RECIPIENTS');
  });

  it('returns 202 and flips status to sending', async () => {
    const c = await freshCampaignWithRecipients();
    const res = await request(app)
      .post(`/campaigns/${c.id}/send`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('sending');
  });

  it('second send while already sending returns 409', async () => {
    const c = await freshCampaignWithRecipients();
    // Force the state artificially for the assertion
    c.status = 'sending';
    await c.save();
    const res = await request(app)
      .post(`/campaigns/${c.id}/send`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CAMPAIGN_IN_FLIGHT');
  });

  it('send on an already-sent campaign returns 409 CAMPAIGN_ALREADY_SENT', async () => {
    const c = await freshCampaignWithRecipients();
    c.status = 'sent';
    await c.save();
    const res = await request(app)
      .post(`/campaigns/${c.id}/send`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CAMPAIGN_ALREADY_SENT');
  });
});

describe('send worker (runSend)', () => {
  it('processes every recipient exactly once and ends with status=sent', async () => {
    const c = await freshCampaignWithRecipients();
    c.status = 'sending';
    await c.save();

    await runSend(c.id);

    const after = await Campaign.findByPk(c.id);
    expect(after?.status).toBe('sent');

    const rows = await CampaignRecipient.findAll({ where: { campaign_id: c.id } });
    // No recipient should be left in `pending`
    expect(rows.every((r) => r.status === 'sent' || r.status === 'failed')).toBe(true);
    // Sent rows must have sent_at, failed must not
    expect(
      rows.every((r) =>
        r.status === 'sent' ? r.sent_at !== null : r.sent_at === null,
      ),
    ).toBe(true);

    // Roughly 90% success (allow 5..20 out of 20 for test stability)
    const sentCount = rows.filter((r) => r.status === 'sent').length;
    expect(sentCount).toBeGreaterThanOrEqual(10);
  });
});
