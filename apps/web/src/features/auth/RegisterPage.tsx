import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@mcm/shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loggedIn } from '../../store/authSlice';
import { useRegister } from '../../api/hooks';
import { extractApiError } from '../../api/client';
import { toastShown } from '../../store/uiSlice';
import { Button } from '../../components/Button';

export function RegisterPage() {
  const token = useAppSelector((s) => s.auth.token);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const reg = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  if (token) return <Navigate to="/campaigns" replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await reg.mutateAsync(values);
      dispatch(loggedIn(result));
      navigate('/campaigns', { replace: true });
    } catch (err) {
      dispatch(toastShown('error', extractApiError(err)));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Create an account</h2>
          <p className="mt-1 text-sm text-firefly-400">Get started in under a minute.</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-firefly-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              {...register('email')}
            />
            {errors.email && (
              <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
            <input
              type="text"
              autoComplete="name"
              className="w-full rounded-xl border border-firefly-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              {...register('name')}
            />
            {errors.name && (
              <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-firefly-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              {...register('password')}
            />
            {errors.password && (
              <span className="mt-1 block text-xs text-red-600">
                {errors.password.message}
              </span>
            )}
          </label>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>

        <p className="text-center text-xs text-firefly-400">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-900 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
