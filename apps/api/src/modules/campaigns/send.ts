import { CampaignRecipient } from '../../db/models/index.js';
import { AppError } from '../../errors/AppError.js';
import { runSend } from '../../workers/sendCampaign.js';
import { loadOwnedCampaign } from './service.js';

/**
 * Kicks off a send for `campaignId`. Returns the campaign in its new `sending` state.
 * Throws 409 if already sending/sent, 400 if no recipients.
 */
export async function triggerSend(userId: string, campaignId: string) {
  const campaign = await loadOwnedCampaign(campaignId, userId);

  if (campaign.status === 'sent') {
    throw AppError.conflict('CAMPAIGN_ALREADY_SENT', 'Campaign has already been sent');
  }
  if (campaign.status === 'sending') {
    throw AppError.conflict('CAMPAIGN_IN_FLIGHT', 'Campaign is already being sent');
  }
  // status is draft or scheduled — both are acceptable starting points

  const recipientCount = await CampaignRecipient.count({ where: { campaign_id: campaign.id } });
  if (recipientCount === 0) {
    throw AppError.badRequest('NO_RECIPIENTS', 'Add recipients before sending');
  }

  campaign.status = 'sending';
  await campaign.save();

  setImmediate(() => {
    void runSend(campaign.id);
  });

  return campaign;
}
