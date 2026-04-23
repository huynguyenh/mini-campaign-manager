import type { CampaignStatus } from '@mcm/shared';
import { cn } from '../lib/cn';

const STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-slate-200 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
};

const LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
