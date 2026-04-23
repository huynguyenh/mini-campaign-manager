import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedOut } from '../store/authSlice';

function Wordmark() {
  return (
    <Link to="/campaigns" className="flex items-center gap-2 group">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-900 text-white font-display font-bold text-sm tracking-tight group-hover:bg-emerald-800 transition-colors"
      >
        M
      </span>
      <span className="font-display font-semibold text-ink text-[15px] tracking-tight">
        Mini Campaign Manager
      </span>
    </Link>
  );
}

export function AppShell() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-emerald-900 text-white'
        : 'text-firefly-500 hover:bg-ecru-200/60 hover:text-ink',
    );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-firefly-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Wordmark />
          <nav className="flex items-center gap-1.5">
            <NavLink to="/campaigns" className={linkClass} end>
              Campaigns
            </NavLink>
            <NavLink to="/campaigns/new" className={linkClass}>
              New
            </NavLink>
            <div className="mx-2 h-5 w-px bg-firefly-200/80" />
            <span className="hidden sm:inline text-sm text-firefly-400">{user?.email}</span>
            <button
              onClick={() => {
                dispatch(loggedOut());
                navigate('/login', { replace: true });
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-firefly-500 hover:bg-ecru-200/60 hover:text-ink transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
