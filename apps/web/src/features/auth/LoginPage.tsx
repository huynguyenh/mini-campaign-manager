import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@mcm/shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loggedIn } from '../../store/authSlice';
import { useLogin } from '../../api/hooks';
import { extractApiError } from '../../api/client';
import { toastShown } from '../../store/uiSlice';
import { Button } from '../../components/Button';

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
    <div className="relative grid min-h-screen lg:grid-cols-[1fr_480px]">
      {/* LEFT: Emerald hero with radial accent (no logo per instruction) */}
      <div className="relative hidden lg:block overflow-hidden bg-emerald-900 text-white">
        <div
          aria-hidden
          className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-emerald-500/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-24 bottom-0 h-[360px] w-[360px] rounded-full bg-emerald-700/60 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200/80">
            Mini Campaign Manager
          </div>
          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight">
              Draft, schedule, and send campaigns with confidence.
            </h1>
            <p className="mt-4 text-emerald-100/80">
              A minimal MarTech demo built for the S5Tech take-home — designed to show craft over
              feature sprawl.
            </p>
          </div>
          <div className="text-xs text-emerald-200/60">
            Local dev · Postgres 16 · Node 20 · React 18
          </div>
        </div>
      </div>

      {/* RIGHT: Auth card */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-firefly-400">Welcome back. Pick up where you left off.</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-100/40 p-3 text-xs text-emerald-900">
            <div className="font-semibold">Demo credentials</div>
            <div className="mt-1 font-mono text-[11px] leading-5 text-emerald-900/80">
              demo@example.com
              <br />
              demo1234
            </div>
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
                <span className="mt-1 block text-xs text-severity-high">
                  {errors.email.message}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-firefly-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                {...register('password')}
              />
              {errors.password && (
                <span className="mt-1 block text-xs text-severity-high">
                  {errors.password.message}
                </span>
              )}
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="text-center text-xs text-firefly-400">
            No account?{' '}
            <Link to="/register" className="font-medium text-emerald-900 hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
