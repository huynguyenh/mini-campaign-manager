import { Campaign, CampaignRecipient } from '../../db/models/index.js';
import { AppError } from '../../errors/AppError.js';
import { runSend } from '../../workers/sendCampaign.js';

/**
 * Kicks off a send for `campaignId`. Returns the campaign in its new `sending` state.
 *
 * Uses an atomic conditional UPDATE (`WHERE status IN ('draft','scheduled')`) so two
 * concurrent requests cannot both pass the "not sending" guard — Postgres row-locking
 * guarantees exactly one UPDATE touches the row; the losing request sees affectedCount=0
 * and is rejected with the appropriate error.
 */
export async function triggerSend(userId: string, campaignId: string) {
  // Recipients must exist before we try to flip state. Check first; if it passes we
  // still race on this value, but adding a recipient during a send is an accepted
  // tradeoff for the demo (and would just mean a few extra pending rows get picked up).
  const recipientCount = await CampaignRecipient.count({
    where: { campaign_id: campaignId },
  });
  if (recipientCount === 0) {
    // Existence/ownership check still needs to happen — don't leak 400 before 404/403.
    const exists = await Campaign.findOne({
      where: { id: campaignId, created_by: userId },
    });
    if (!exists) throw AppError.notFound('Campaign not found');
    throw AppError.badRequest('NO_RECIPIENTS', 'Add recipients before sending');
  }

  const [affected] = await Campaign.update(
    { status: 'sending' },
    {
      where: {
        id: campaignId,
        created_by: userId,
        status: ['draft', 'scheduled'],
      },
    },
  );

  if (affected === 0) {
    // Didn't flip the row → figure out *why* so we can return the right error.
    const current = await Campaign.findOne({
      where: { id: campaignId, created_by: userId },
    });
    if (!current) throw AppError.notFound('Campaign not found');
    if (current.status === 'sent') {
      throw AppError.conflict('CAMPAIGN_ALREADY_SENT', 'Campaign has already been sent');
    }
    if (current.status === 'sending') {
      throw AppError.conflict('CAMPAIGN_IN_FLIGHT', 'Campaign is already being sent');
    }
    // Shouldn't happen, but make it loud if it does
    throw AppError.conflict('CAMPAIGN_NOT_DRAFT', `Cannot send from status ${current.status}`);
  }

  setImmediate(() => {
    void runSend(campaignId);
  });

  const updated = await Campaign.findByPk(campaignId);
  return updated!;
}
