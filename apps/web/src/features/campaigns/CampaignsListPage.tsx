import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Campaign } from '@mcm/shared';
import { useCampaigns } from '../../api/hooks';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { extractApiError } from '../../api/client';
import { cn } from '../../lib/cn';

const PAGE_SIZE = 12;

export function CampaignsListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useCampaigns(page, PAGE_SIZE);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-firefly-400">
            {data ? (
              <>
                {data.total} total · page {page} of {totalPages}
              </>
            ) : isFetching ? (
              'Loading…'
            ) : (
              ''
            )}
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button>
            <span className="text-base leading-none">+</span> New campaign
          </Button>
        </Link>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-severity-high">
          Failed to load campaigns: {extractApiError(error)}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="rounded-2xl border border-firefly-200/60 bg-white p-5 shadow-card"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
              <div className="mt-5 flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}

        {!isLoading && data && data.data.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-firefly-200 bg-white/60 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M4 9h16" />
              </svg>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              No campaigns yet
            </h3>
            <p className="mt-1 text-sm text-firefly-400">
              Create your first campaign to get started.
            </p>
            <div className="mt-5">
              <Link to="/campaigns/new">
                <Button>+ New campaign</Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && data?.data.map((c) => <CampaignCard key={c.id} campaign={c} />)}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-sm text-firefly-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const scheduledAt = c.scheduled_at ? new Date(c.scheduled_at) : null;

  return (
    <Link
      to={`/campaigns/${c.id}`}
      className={cn(
        'group flex flex-col rounded-2xl border border-firefly-200/60 bg-white p-5 shadow-card',
        'transition-all hover:-translate-y-0.5 hover:shadow-card-hover hover:border-emerald-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={c.status} />
        <span className="text-xs text-firefly-400">
          {new Date(c.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold text-ink line-clamp-2 group-hover:text-emerald-900">
        {c.name}
      </h3>
      <p className="mt-1 text-sm text-firefly-500 line-clamp-2">{c.subject}</p>

      {scheduledAt && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-firefly-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {scheduledAt.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}

      <div className="mt-auto pt-5 text-sm font-medium text-emerald-900 opacity-0 transition-opacity group-hover:opacity-100">
        View details →
      </div>
    </Link>
  );
}
