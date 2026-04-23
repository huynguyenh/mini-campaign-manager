import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@mcm/shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loggedIn } from '../../store/authSlice';
import { useRegister } from '../../api/hooks';
import { extractApiError } from '../../api/client';
import { toastShown } from '../../store/uiSlice';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Create an account</h1>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register('email')}
          />
          {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            type="text"
            autoComplete="name"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register('name')}
          />
          {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register('password')}
          />
          {errors.password && (
            <span className="text-xs text-red-600">{errors.password.message}</span>
          )}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-slate-600">
          Have an account?{' '}
          <Link to="/login" className="text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
