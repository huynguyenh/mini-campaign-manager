import type { CampaignStats } from '@mcm/shared';

export interface RawStatCounts {
  total: number;
  sent: number;
  failed: number;
  opened: number;
}

/**
 * Pure computation used by both the stats endpoint and unit tests.
 * - Divide-by-zero guarded.
 * - Rates rounded to 4 decimals (API contract).
 */
export function computeStats(counts: RawStatCounts): CampaignStats {
  const total = Math.max(0, counts.total);
  const sent = Math.max(0, counts.sent);
  const failed = Math.max(0, counts.failed);
  const opened = Math.max(0, counts.opened);

  const send_rate = total > 0 ? round4(sent / total) : 0;
  const open_rate = sent > 0 ? round4(opened / sent) : 0;

  return { total, sent, failed, opened, open_rate, send_rate };
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
