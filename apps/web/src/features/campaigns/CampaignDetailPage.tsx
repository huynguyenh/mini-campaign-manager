import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CampaignStatus } from '@mcm/shared';
import {
  useCampaign,
  useDeleteCampaign,
  useScheduleCampaign,
  useSendCampaign,
} from '../../api/hooks';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { useAppDispatch } from '../../store/hooks';
import { toastShown } from '../../store/uiSlice';
import { extractApiError } from '../../api/client';
import { cn } from '../../lib/cn';

function formatRate(rate: number, denom: number) {
  if (denom === 0) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function ProgressBar({ value, tone = 'emerald' }: { value: number; tone?: 'emerald' | 'firefly' }) {
  const barCls = tone === 'emerald' ? 'bg-emerald-500' : 'bg-firefly-300';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ecru-200">
      <div
        className={cn('h-full rounded-full transition-all', barCls)}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

const ACTIONABLE: Record<CampaignStatus, { schedule: boolean; send: boolean; delete: boolean }> = {
  draft: { schedule: true, send: true, delete: true },
  scheduled: { schedule: false, send: true, delete: false },
  sending: { schedule: false, send: false, delete: false },
  sent: { schedule: false, send: false, delete: false },
};

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data, isLoading, isError, error } = useCampaign(id);

  const send = useSendCampaign(id ?? '');
  const schedule = useScheduleCampaign(id ?? '');
  const del = useDeleteCampaign();
  const [scheduleAt, setScheduleAt] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    const msg = extractApiError(error);
    const notFound = /not found/i.test(msg);
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          !
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-ink">
          {notFound ? 'Campaign not found' : 'Failed to load campaign'}
        </h3>
        <p className="mt-1 text-sm text-firefly-400">{msg}</p>
        <div className="mt-5">
          <Link to="/campaigns">
            <Button variant="secondary" size="sm">← Back to campaigns</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const actions = ACTIONABLE[data.status];

  const onSchedule = async () => {
    if (!scheduleAt) {
      dispatch(toastShown('error', 'Pick a future date/time'));
      return;
    }
    const when = new Date(scheduleAt);
    if (when.getTime() <= Date.now()) {
      dispatch(toastShown('error', 'Scheduled time must be in the future'));
      return;
    }
    try {
      await schedule.mutateAsync({ scheduled_at: when.toISOString() });
      dispatch(toastShown('success', 'Campaign scheduled'));
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  };

  const onSend = async () => {
    try {
      await send.mutateAsync();
      dispatch(toastShown('info', 'Sending…'));
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this draft campaign? This cannot be undone.')) return;
    try {
      await del.mutateAsync(data.id);
      dispatch(toastShown('success', 'Campaign deleted'));
      navigate('/campaigns');
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-firefly-400">
        <Link to="/campaigns" className="hover:text-ink">Campaigns</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{data.name}</span>
      </nav>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-6 p-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <StatusBadge status={data.status} size="md" />
              {data.scheduled_at && data.status === 'scheduled' && (
                <span className="text-xs text-firefly-400">
                  Scheduled for{' '}
                  {new Date(data.scheduled_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{data.name}</h1>
            <p className="mt-1 text-firefly-500">{data.subject}</p>
          </div>
        </div>
        {data.body && (
          <div className="border-t border-firefly-200/60 bg-ecru-100/60 px-6 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-firefly-500">
              {data.body}
            </p>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Recipients" value={data.stats.total} tone="ink" />
        <StatTile label="Sent" value={data.stats.sent} tone="emerald" />
        <StatTile label="Failed" value={data.stats.failed} tone="severity" />
        <StatTile label="Opened" value={data.stats.opened} tone="ink" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink">Send rate</span>
              <span className="font-display text-xl font-semibold text-emerald-900">
                {formatRate(data.stats.send_rate, data.stats.total)}
              </span>
            </div>
            <ProgressBar value={data.stats.send_rate} tone="emerald" />
            <p className="mt-2 text-xs text-firefly-400">
              {data.stats.sent} / {data.stats.total} recipients
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink">Open rate</span>
              <span className="font-display text-xl font-semibold text-firefly-500">
                {formatRate(data.stats.open_rate, data.stats.sent)}
              </span>
            </div>
            <ProgressBar value={data.stats.open_rate} tone="firefly" />
            <p className="mt-2 text-xs text-firefly-400">
              {data.stats.opened} opens of {data.stats.sent} sent
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-ink">Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {actions.schedule && (
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="rounded-xl border border-firefly-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <Button variant="secondary" size="sm" onClick={onSchedule}>
                  Schedule
                </Button>
              </div>
            )}
            {actions.send && (
              <Button
                onClick={onSend}
                disabled={send.isPending || data.stats.total === 0}
                title={data.stats.total === 0 ? 'Add recipients before sending' : undefined}
              >
                {send.isPending ? 'Sending…' : 'Send now'}
              </Button>
            )}
            {actions.delete && (
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            )}
            {data.status === 'sending' && (
              <span className="inline-flex items-center gap-2 text-sm text-amber-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Sending… stats refresh every 2s
              </span>
            )}
            {data.status === 'sent' && (
              <span className="text-sm text-emerald-800">
                Campaign sent — no further actions.
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              Recipients
              <span className="ml-2 text-sm font-normal text-firefly-400">
                {data.recipients.length}
              </span>
            </h2>
          </div>
        </CardHeader>
        <div className="divide-y divide-firefly-200/60">
          {data.recipients.length === 0 && (
            <div className="p-8 text-center text-sm text-firefly-400">
              No recipients attached to this campaign.
            </div>
          )}
          {data.recipients.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">
                  {r.recipient?.name ?? '—'}
                </div>
                <div className="truncate text-xs text-firefly-400">
                  {r.recipient?.email ?? '—'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.sent_at && (
                  <span className="hidden text-xs text-firefly-400 sm:inline">
                    {new Date(r.sent_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
                <RecipientStatusPill status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ink' | 'emerald' | 'severity';
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-900'
      : tone === 'severity'
        ? value > 0
          ? 'text-red-600'
          : 'text-firefly-400'
        : 'text-ink';
  return (
    <Card>
      <CardBody>
        <div className="text-xs font-medium uppercase tracking-wider text-firefly-400">
          {label}
        </div>
        <div className={cn('mt-1 font-display text-3xl font-semibold', toneCls)}>
          {value.toLocaleString()}
        </div>
      </CardBody>
    </Card>
  );
}

function RecipientStatusPill({ status }: { status: 'pending' | 'sent' | 'failed' }) {
  const styles: Record<typeof status, string> = {
    pending: 'bg-ecru-200 text-firefly-500 ring-ecru-300/60',
    sent: 'bg-emerald-100 text-emerald-900 ring-emerald-300/60',
    failed: 'bg-red-50 text-red-600 ring-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1',
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
