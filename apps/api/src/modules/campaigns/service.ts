import { QueryTypes } from 'sequelize';
import { sequelize } from '../../db/index.js';
import { Campaign, CampaignRecipient, Recipient } from '../../db/models/index.js';
import { AppError } from '../../errors/AppError.js';
import type {
  CampaignDetail,
  CampaignStats,
  CreateCampaignInput,
  Paginated,
  ScheduleCampaignInput,
  UpdateCampaignInput,
} from '@mcm/shared';
import { computeStats } from './stats.js';

function requireOwnership(campaign: Campaign, userId: string) {
  if (campaign.created_by !== userId) {
    throw AppError.forbidden('You do not have access to this campaign');
  }
}

function requireDraft(campaign: Campaign) {
  if (campaign.status !== 'draft') {
    throw AppError.conflict(
      'CAMPAIGN_NOT_DRAFT',
      `Campaign can only be modified while in draft (current: ${campaign.status})`,
    );
  }
}

async function loadOwnedCampaign(id: string, userId: string): Promise<Campaign> {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw AppError.notFound('Campaign not found');
  requireOwnership(campaign, userId);
  return campaign;
}

export async function list(
  userId: string,
  page: number,
  pageSize: number,
): Promise<Paginated<Campaign>> {
  const { rows, count } = await Campaign.findAndCountAll({
    where: { created_by: userId },
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { data: rows, page, pageSize, total: count };
}

export async function create(userId: string, dto: CreateCampaignInput): Promise<Campaign> {
  return sequelize.transaction(async (tx) => {
    const campaign = await Campaign.create(
      {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        status: 'draft',
        scheduled_at: null,
        created_by: userId,
      },
      { transaction: tx },
    );

    if (dto.recipient_ids && dto.recipient_ids.length > 0) {
      const recipients = await Recipient.findAll({
        where: { id: dto.recipient_ids },
        transaction: tx,
      });
      if (recipients.length !== dto.recipient_ids.length) {
        throw AppError.badRequest(
          'VALIDATION_ERROR',
          'One or more recipient_ids are invalid',
        );
      }
      await CampaignRecipient.bulkCreate(
        recipients.map((r) => ({
          campaign_id: campaign.id,
          recipient_id: r.id,
          status: 'pending' as const,
          sent_at: null,
          opened_at: null,
        })),
        { transaction: tx },
      );
    }

    return campaign;
  });
}

export async function getDetail(userId: string, id: string): Promise<CampaignDetail> {
  const campaign = await loadOwnedCampaign(id, userId);
  const rows = await CampaignRecipient.findAll({
    where: { campaign_id: id },
    include: [{ model: Recipient, as: 'recipient' }],
    order: [['status', 'ASC']],
  });
  const stats = await computeStatsFor(id);
  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    body: campaign.body,
    status: campaign.status,
    scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.toISOString() : null,
    created_by: campaign.created_by,
    created_at: campaign.created_at.toISOString(),
    updated_at: campaign.updated_at.toISOString(),
    stats,
    recipients: rows.map((r) => ({
      id: r.id,
      campaign_id: r.campaign_id,
      recipient_id: r.recipient_id,
      status: r.status,
      sent_at: r.sent_at ? r.sent_at.toISOString() : null,
      opened_at: r.opened_at ? r.opened_at.toISOString() : null,
      recipient: (r as unknown as { recipient?: Recipient }).recipient
        ? {
            id: (r as unknown as { recipient: Recipient }).recipient.id,
            email: (r as unknown as { recipient: Recipient }).recipient.email,
            name: (r as unknown as { recipient: Recipient }).recipient.name,
          }
        : undefined,
    })),
  };
}

export async function update(
  userId: string,
  id: string,
  dto: UpdateCampaignInput,
): Promise<Campaign> {
  const campaign = await loadOwnedCampaign(id, userId);
  requireDraft(campaign);
  if (dto.name !== undefined) campaign.name = dto.name;
  if (dto.subject !== undefined) campaign.subject = dto.subject;
  if (dto.body !== undefined) campaign.body = dto.body;
  await campaign.save();
  return campaign;
}

export async function remove(userId: string, id: string): Promise<void> {
  const campaign = await loadOwnedCampaign(id, userId);
  requireDraft(campaign);
  await campaign.destroy();
}

export async function schedule(
  userId: string,
  id: string,
  dto: ScheduleCampaignInput,
): Promise<Campaign> {
  const campaign = await loadOwnedCampaign(id, userId);
  requireDraft(campaign);
  const scheduledAt = new Date(dto.scheduled_at);
  if (scheduledAt.getTime() <= Date.now()) {
    throw AppError.badRequest('INVALID_SCHEDULE', 'scheduled_at must be in the future');
  }
  campaign.scheduled_at = scheduledAt;
  campaign.status = 'scheduled';
  await campaign.save();
  return campaign;
}

export async function computeStatsFor(campaignId: string): Promise<CampaignStats> {
  const [row] = await sequelize.query<{
    total: string;
    sent: string;
    failed: string;
    opened: string;
  }>(
    `
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
      COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::text AS opened
    FROM campaign_recipients
    WHERE campaign_id = :id
    `,
    { replacements: { id: campaignId }, type: QueryTypes.SELECT },
  );
  return computeStats({
    total: Number(row?.total ?? 0),
    sent: Number(row?.sent ?? 0),
    failed: Number(row?.failed ?? 0),
    opened: Number(row?.opened ?? 0),
  });
}

export async function getStats(userId: string, id: string): Promise<CampaignStats> {
  await loadOwnedCampaign(id, userId); // ownership + existence check
  return computeStatsFor(id);
}

// Exported for worker (step 6)
export { loadOwnedCampaign, requireDraft };
