import { z } from 'zod';

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const RECIPIENT_STATUSES = ['pending', 'sent', 'failed'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(50_000),
  recipient_ids: z.array(z.string().uuid()).optional().default([]),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    subject: z.string().trim().min(1).max(300).optional(),
    body: z.string().min(1).max(50_000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required');
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const scheduleCampaignSchema = z.object({
  scheduled_at: z
    .string()
    .datetime({ message: 'scheduled_at must be ISO 8601 datetime' })
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: 'scheduled_at must be in the future',
    }),
});
export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  open_rate: number;
  send_rate: number;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipientRow {
  id: string;
  campaign_id: string;
  recipient_id: string;
  status: RecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  recipient?: { id: string; email: string; name: string };
}

export interface CampaignDetail extends Campaign {
  stats: CampaignStats;
  recipients: CampaignRecipientRow[];
}
