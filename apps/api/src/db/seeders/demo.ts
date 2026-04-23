import 'dotenv/config';
import bcrypt from 'bcrypt';
import { sequelize } from '../index.js';
import { User, Recipient, Campaign, CampaignRecipient } from '../models/index.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

const DEMO_USER = { email: 'demo@example.com', name: 'Demo Marketer', password: 'demo1234' };

async function seed() {
  await sequelize.authenticate();

  // Idempotent: wipe seeded rows only if they already exist
  const existingUser = await User.findOne({ where: { email: DEMO_USER.email } });
  if (existingUser) {
    logger.info('seed already applied (demo user exists) — skipping');
    return;
  }

  const password_hash = await bcrypt.hash(DEMO_USER.password, env.BCRYPT_ROUNDS);
  const user = await User.create({
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    password_hash,
  });

  const recipientData = Array.from({ length: 20 }, (_, i) => ({
    email: `recipient${i + 1}@example.com`,
    name: `Recipient ${i + 1}`,
  }));
  const recipients = await Recipient.bulkCreate(recipientData);

  // draft campaign — no recipients attached yet
  await Campaign.create({
    name: 'Welcome Series — Draft',
    subject: 'Welcome to our newsletter!',
    body: 'Hi there,\n\nThis is a draft of our welcome email.',
    status: 'draft',
    scheduled_at: null,
    created_by: user.id,
  });

  // scheduled campaign — tomorrow, with 10 recipients
  const scheduled = await Campaign.create({
    name: 'Product Launch — Scheduled',
    subject: 'Big news: new feature drop',
    body: 'We are launching something special tomorrow.',
    status: 'scheduled',
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    created_by: user.id,
  });
  await CampaignRecipient.bulkCreate(
    recipients.slice(0, 10).map((r) => ({
      campaign_id: scheduled.id,
      recipient_id: r.id,
      status: 'pending' as const,
      sent_at: null,
      opened_at: null,
    })),
  );

  // sent campaign — 20 recipients, mostly sent
  const sent = await Campaign.create({
    name: 'Holiday Promo — Sent',
    subject: 'Limited-time holiday offer',
    body: 'Save 25% this weekend only.',
    status: 'sent',
    scheduled_at: null,
    created_by: user.id,
  });
  const now = new Date();
  await CampaignRecipient.bulkCreate(
    recipients.map((r, i) => ({
      campaign_id: sent.id,
      recipient_id: r.id,
      status: (i < 18 ? 'sent' : 'failed') as 'sent' | 'failed',
      sent_at: i < 18 ? now : null,
      opened_at: i < 8 ? now : null,
    })),
  );

  logger.info(
    {
      user: user.email,
      recipients: recipients.length,
      campaigns: 3,
    },
    'seed complete',
  );
}

seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'seed failed');
    process.exit(1);
  });
