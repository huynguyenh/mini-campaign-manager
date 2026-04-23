import { useEffect } from 'react';
import { cn } from '../lib/cn';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toastDismissed } from '../store/uiSlice';

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(() => dispatch(toastDismissed(t.id)), 4000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto cursor-pointer rounded-xl px-4 py-3 text-sm font-medium shadow-card-hover ring-1',
            t.kind === 'error' && 'bg-red-600 text-white ring-red-700',
            t.kind === 'success' && 'bg-emerald-900 text-white ring-emerald-800',
            t.kind === 'info' && 'bg-ink text-white ring-firefly-500',
          )}
          onClick={() => dispatch(toastDismissed(t.id))}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
