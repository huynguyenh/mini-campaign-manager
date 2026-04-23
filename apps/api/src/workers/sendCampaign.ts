import { Campaign, CampaignRecipient } from '../db/models/index.js';
import { logger } from '../utils/logger.js';

const CHUNK_SIZE = 10;
const MIN_LATENCY_MS = 50;
const MAX_LATENCY_MS = 200;
const SUCCESS_RATE = 0.9;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Simulated send worker. Runs in the same process via setImmediate; no Redis/queue.
 * Per-recipient outcome is random (90% sent, 10% failed) with small jitter.
 */
export async function runSend(campaignId: string): Promise<void> {
  const started = Date.now();
  logger.info({ campaignId }, 'send worker: started');

  try {
    const recipients = await CampaignRecipient.findAll({
      where: { campaign_id: campaignId, status: 'pending' },
    });

    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (cr) => {
          const delay =
            MIN_LATENCY_MS + Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
          await sleep(delay);
          const success = Math.random() < SUCCESS_RATE;
          cr.status = success ? 'sent' : 'failed';
          cr.sent_at = success ? new Date() : null;
          await cr.save();
        }),
      );
    }

    await Campaign.update(
      { status: 'sent', updated_at: new Date() },
      { where: { id: campaignId } },
    );

    logger.info(
      { campaignId, total: recipients.length, durationMs: Date.now() - started },
      'send worker: completed',
    );
  } catch (err) {
    // Intentionally do not roll back status — leaving the campaign in `sending`
    // makes the failure observable to the operator.
    logger.error({ err, campaignId }, 'send worker: failed');
  }
}
