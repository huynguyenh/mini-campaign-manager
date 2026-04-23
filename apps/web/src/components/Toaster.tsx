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
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'rounded-md px-3 py-2 text-sm shadow-md',
            t.kind === 'error' && 'bg-red-600 text-white',
            t.kind === 'success' && 'bg-emerald-600 text-white',
            t.kind === 'info' && 'bg-slate-800 text-white',
          )}
          onClick={() => dispatch(toastDismissed(t.id))}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
