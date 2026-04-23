import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@mcm/shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loggedIn } from '../../store/authSlice';
import { useLogin } from '../../api/hooks';
import { extractApiError } from '../../api/client';
import { toastShown } from '../../store/uiSlice';

export function LoginPage() {
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const from = location.state?.from?.pathname ?? '/campaigns';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (token) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      dispatch(loggedIn(result));
      navigate(from, { replace: true });
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
        <h1 className="text-xl font-semibold">Sign in</h1>

        <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">
          <div className="font-medium text-slate-700">Demo credentials</div>
          <div>Email: <code>demo@example.com</code></div>
          <div>Password: <code>demo1234</code></div>
        </div>

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
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            autoComplete="current-password"
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-slate-600">
          No account?{' '}
          <Link to="/register" className="text-slate-900 underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
