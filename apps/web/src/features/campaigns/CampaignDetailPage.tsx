import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CampaignStatus } from '@mcm/shared';
import {
  useCampaign,
  useDeleteCampaign,
  useScheduleCampaign,
  useSendCampaign,
} from '../../api/hooks';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/Skeleton';
import { useAppDispatch } from '../../store/hooks';
import { toastShown } from '../../store/uiSlice';
import { extractApiError } from '../../api/client';
import { cn } from '../../lib/cn';

function formatRate(rate: number, sent: number) {
  // Zero-recipient / zero-sent: show an em-dash rather than a misleading 0%
  if (sent === 0) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div
        className="h-full bg-slate-900 transition-all"
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

  // Poll every 2s while the campaign is sending
  const [isPolling, setIsPolling] = useState(false);
  const { data, isLoading, isError, error } = useCampaign(id, {
    refetchInterval: isPolling ? 2000 : false,
  });

  // Flip polling on/off based on status
  if (data && data.status === 'sending' && !isPolling) setIsPolling(true);
  if (data && data.status !== 'sending' && isPolling) setIsPolling(false);

  const send = useSendCampaign(id ?? '');
  const schedule = useScheduleCampaign(id ?? '');
  const del = useDeleteCampaign();

  const [scheduleAt, setScheduleAt] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const msg = extractApiError(error);
    const forbidden = /forbidden|access/i.test(msg);
    const notFound = /not found/i.test(msg);
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="font-medium">
          {forbidden ? 'You do not have access to this campaign' : notFound ? 'Campaign not found' : 'Failed to load campaign'}
        </div>
        <div className="mt-1 text-xs">{msg}</div>
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
      setIsPolling(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm text-slate-600">{data.subject}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={data.stats.total.toString()} />
        <StatCard label="Sent" value={data.stats.sent.toString()} />
        <StatCard label="Failed" value={data.stats.failed.toString()} />
        <StatCard label="Opened" value={data.stats.opened.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">Send rate</span>
            <span className="text-slate-600">
              {formatRate(data.stats.send_rate, data.stats.total)}
            </span>
          </div>
          <ProgressBar value={data.stats.send_rate} />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">Open rate</span>
            <span className="text-slate-600">
              {formatRate(data.stats.open_rate, data.stats.sent)}
            </span>
          </div>
          <ProgressBar value={data.stats.open_rate} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex flex-wrap items-center gap-2">
          {actions.schedule && (
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm"
              />
              <button
                onClick={onSchedule}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Schedule
              </button>
            </div>
          )}
          {actions.send && (
            <button
              onClick={onSend}
              disabled={send.isPending || data.stats.total === 0}
              title={data.stats.total === 0 ? 'Add recipients before sending' : undefined}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {send.isPending ? 'Sending…' : 'Send now'}
            </button>
          )}
          {actions.delete && (
            <button
              onClick={onDelete}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          )}
          {data.status === 'sending' && (
            <span className="text-sm text-amber-700">Sending… stats refresh every 2s</span>
          )}
          {data.status === 'sent' && (
            <span className="text-sm text-emerald-700">Campaign sent — no further actions.</span>
          )}
        </div>
        {data.scheduled_at && (
          <p className="text-xs text-slate-500">
            Scheduled for: {new Date(data.scheduled_at).toLocaleString()}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-2 text-sm font-medium">
          Recipients ({data.recipients.length})
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent at</th>
            </tr>
          </thead>
          <tbody>
            {data.recipients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No recipients attached to this campaign.
                </td>
              </tr>
            )}
            {data.recipients.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.recipient?.email ?? '—'}</td>
                <td className="px-4 py-2">{r.recipient?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  <RecipientStatusPill status={r.status} />
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function RecipientStatusPill({ status }: { status: 'pending' | 'sent' | 'failed' }) {
  const styles: Record<typeof status, string> = {
    pending: 'bg-slate-100 text-slate-700',
    sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {status}
    </span>
  );
}
