import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedOut } from '../store/authSlice';

export function AppShell() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm font-medium',
      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200',
    );

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/campaigns" className="text-lg font-semibold">
            Mini Campaign Manager
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/campaigns" className={linkClass} end>
              Campaigns
            </NavLink>
            <NavLink to="/campaigns/new" className={linkClass}>
              New
            </NavLink>
            <div className="mx-2 h-6 w-px bg-slate-200" />
            <span className="text-sm text-slate-600">{user?.email}</span>
            <button
              onClick={() => {
                dispatch(loggedOut());
                navigate('/login', { replace: true });
              }}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
