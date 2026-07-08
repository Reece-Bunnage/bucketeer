import { useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { FolderTree, Import, LayoutDashboard, List, Settings as SettingsIcon, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { seedDefaultBucketsOnce } from '@/lib/db/seed';
import { applyTheme, usePrefs } from '@/lib/prefs';
import { Dashboard } from '@/pages/Dashboard';
import { Buckets } from '@/pages/Buckets';
import { Transactions } from '@/pages/Transactions';
import { ImportPage } from '@/pages/ImportPage';
import { Settings } from '@/pages/Settings';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/buckets', label: 'Buckets', icon: FolderTree },
  { to: '/import', label: 'Import CSV', icon: Import },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const prefs = usePrefs();
  useEffect(() => {
    void seedDefaultBucketsOnce();
  }, []);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyTheme(prefs, mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [prefs]);
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="w-52 shrink-0 border-r p-4">
          <div className="mb-6 flex items-center gap-2 px-2 font-semibold">
            <Wallet className="h-5 w-5 text-primary" /> Bucketeer
          </div>
          <nav className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                    isActive ? 'bg-accent font-medium' : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <p className="mt-8 px-2 text-xs text-muted-foreground">
            All data stays on this computer.
          </p>
        </aside>
        <main className="min-w-0 flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/buckets" element={<Buckets />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
