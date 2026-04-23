import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  createCampaignSchema,
  createRecipientSchema,
  type CreateCampaignInput,
} from '@mcm/shared';
import { useAppDispatch } from '../../store/hooks';
import { toastShown } from '../../store/uiSlice';
import {
  useCreateCampaign,
  useCreateRecipient,
  useRecipients,
} from '../../api/hooks';
import { extractApiError } from '../../api/client';
import { cn } from '../../lib/cn';

export function CreateCampaignPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const createCampaign = useCreateCampaign();
  const createRecipient = useCreateRecipient();
  const { data: recipients } = useRecipients(1, 100);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newRec, setNewRec] = useState({ email: '', name: '' });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { name: '', subject: '', body: '', recipient_ids: [] },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const campaign = await createCampaign.mutateAsync({
        ...values,
        recipient_ids: Array.from(selected),
      });
      dispatch(toastShown('success', 'Campaign created'));
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  });

  const addRecipient = async () => {
    const parsed = createRecipientSchema.safeParse(newRec);
    if (!parsed.success) {
      dispatch(toastShown('error', 'Enter a valid email and name'));
      return;
    }
    try {
      const r = await createRecipient.mutateAsync(parsed.data);
      setSelected((prev) => new Set(prev).add(r.id));
      setNewRec({ email: '', name: '' });
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New campaign</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input className="w-full rounded-md border px-3 py-2 text-sm" {...register('name')} />
          {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Subject</span>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register('subject')}
          />
          {errors.subject && (
            <span className="text-xs text-red-600">{errors.subject.message}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Body</span>
          <textarea
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register('body')}
          />
          {errors.body && <span className="text-xs text-red-600">{errors.body.message}</span>}
        </label>

        <div className="space-y-3 rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">Recipients</div>
            <div className="text-xs text-slate-500">{selected.size} selected</div>
          </div>

          <div className="flex items-end gap-2">
            <input
              placeholder="email@example.com"
              value={newRec.email}
              onChange={(e) => setNewRec((s) => ({ ...s, email: e.target.value }))}
              className="flex-1 rounded-md border px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Name"
              value={newRec.name}
              onChange={(e) => setNewRec((s) => ({ ...s, name: e.target.value }))}
              className="flex-1 rounded-md border px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={addRecipient}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-100">
            {recipients?.data.length === 0 && (
              <div className="p-3 text-xs text-slate-500">No recipients yet — add one above.</div>
            )}
            {recipients?.data.map((r) => (
              <label
                key={r.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0',
                  selected.has(r.id) && 'bg-slate-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <span className="font-medium">{r.name}</span>
                <span className="text-slate-500">{r.email}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
