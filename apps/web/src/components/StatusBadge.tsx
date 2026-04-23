import type { CampaignStatus } from '@mcm/shared';
import { cn } from '../lib/cn';

// Solid, saturated backgrounds — no more washed-out pills. Each status has a
// distinct hue lifted from the ZenLabs palette + severity tokens.
const STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-ecru-300 text-[#636230] ring-ecru-400/80',
  scheduled: 'bg-[#DFF2FE] text-[#0069A8] ring-[#B8E6FE]',
  sending: 'bg-[#FEF3C7] text-[#92400E] ring-[#FCD34D]',
  sent: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
};

const DOTS: Record<CampaignStatus, string> = {
  draft: 'bg-[#636230]',
  scheduled: 'bg-[#0084D1]',
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
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        STYLES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[status])} />
      {LABELS[status]}
    </span>
  );
}
