import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
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
import { Button } from '../../components/Button';
import { Card, CardBody, CardHeader } from '../../components/Card';

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

  const inputCls =
    'w-full rounded-xl border border-firefly-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-firefly-400">
        <Link to="/campaigns" className="hover:text-ink">Campaigns</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">New</span>
      </nav>

      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">New campaign</h1>
        <p className="mt-1 text-sm text-firefly-400">
          Drafts stay editable until you schedule or send them.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Card>
          <CardBody className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
              <input className={inputCls} placeholder="Welcome series" {...register('name')} />
              {errors.name && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.name.message}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Subject line</span>
              <input
                className={inputCls}
                placeholder="Welcome aboard!"
                {...register('subject')}
              />
              {errors.subject && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.subject.message}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Body</span>
              <textarea
                rows={6}
                className={cn(inputCls, 'font-mono leading-relaxed')}
                placeholder="Hi {name}, ..."
                {...register('body')}
              />
              {errors.body && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.body.message}
                </span>
              )}
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Recipients</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                {selected.size} selected
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                placeholder="email@example.com"
                value={newRec.email}
                onChange={(e) => setNewRec((s) => ({ ...s, email: e.target.value }))}
                className={inputCls}
              />
              <input
                placeholder="Full name"
                value={newRec.name}
                onChange={(e) => setNewRec((s) => ({ ...s, name: e.target.value }))}
                className={inputCls}
              />
              <Button type="button" variant="secondary" onClick={addRecipient}>
                + Add
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-firefly-200/60 bg-ecru-100/40">
              {recipients?.data.length === 0 && (
                <div className="p-4 text-xs text-firefly-400">
                  No recipients yet — add one above.
                </div>
              )}
              {recipients?.data.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border-b border-firefly-200/60 px-4 py-2.5 text-sm last:border-b-0',
                    'hover:bg-white/60 transition-colors',
                    selected.has(r.id) && 'bg-emerald-100/40',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4 rounded border-firefly-200 text-emerald-900 focus:ring-emerald-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{r.name}</div>
                    <div className="truncate text-xs text-firefly-400">{r.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/campaigns')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}
