import type { CampaignStatus } from '@mcm/shared';
import { cn } from '../lib/cn';

const STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-ecru-200 text-firefly-500 ring-ecru-300/60',
  scheduled: 'bg-firefly-200 text-firefly-500 ring-firefly-200',
  sending: 'bg-amber-50 text-amber-700 ring-amber-200',
  sent: 'bg-emerald-100 text-emerald-900 ring-emerald-300/60',
};

const DOTS: Record<CampaignStatus, string> = {
  draft: 'bg-firefly-400',
  scheduled: 'bg-firefly-500',
  sending: 'bg-amber-500 animate-pulse',
  sent: 'bg-emerald-700',
};

const LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
};

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: CampaignStatus;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        STYLES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[status])} />
      {LABELS[status]}
    </span>
  );
}
