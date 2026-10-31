'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, clearAuthSession } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: '🏠' },
  { name: 'My Subscriptions', href: '/portal/subscriptions', icon: '🔄' },
  { name: 'Invoices', href: '/portal/invoices', icon: '💳' },
];

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [proBannerClosed, setProBannerClosed] = useState(false);
  const [proBannerMinimized, setProBannerMinimized] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace('/login');
    } else {
      setUser(u);
    }
  }, [router]);

  const handleLogout = () => {
    clearAuthSession();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#060913] text-slate-100 font-sans overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/15 blur-[160px] pointer-events-none" />

      {/* Customer Sidebar matching Image 2 top-right */}
      <aside className="w-64 glass-panel border-r border-white/10 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link href="/portal/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.083-8-12.356-8-5.096 0-5.096 8 0 8 5.273 0 7.261-8 12.356-8z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Brightloop</span>
            </Link>
          </div>

          {/* Role pill indicator */}
          <div className="px-3 pt-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">Customer Portal</span>
              </div>
              {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                <Link
                  href="/dashboard"
                  className="text-[10px] bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 px-2 py-0.5 rounded border border-violet-400/30 transition"
                >
                  Admin ↗
                </Link>
              )}
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-360px)]">
            {navigation.map((item) => {
              const active = item.href === '/portal/dashboard' ? pathname === '/portal/dashboard' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition duration-150 ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {/* Upgrade to Pro Card Widget with Minimize & Close option */}
          {!proBannerClosed && (
            proBannerMinimized ? (
              <div className="mx-3 mb-3 p-2 rounded-xl bg-gradient-to-r from-violet-950/50 to-indigo-950/50 border border-violet-500/25 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setProBannerMinimized(false)}
                  className="flex items-center gap-1.5 text-violet-300 font-semibold hover:text-white transition"
                  title="Expand Upgrade to Pro"
                >
                  <span>💎</span>
                  <span>Pro Upgrade</span>
                  <span className="text-[10px]">▲</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProBannerClosed(true)}
                  className="text-slate-400 hover:text-white p-1 transition"
                  title="Close banner"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="p-3 mx-3 mb-3 rounded-2xl bg-gradient-to-br from-violet-900/40 to-indigo-950/40 border border-violet-500/25 p-4 text-center relative overflow-hidden">
                {/* Top header controls: Minimize & Close */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setProBannerMinimized(true)}
                    className="w-5 h-5 rounded-md hover:bg-white/10 hover:text-white flex items-center justify-center text-xs transition"
                    title="Minimize banner"
                  >
                    —
                  </button>
                  <button
                    type="button"
                    onClick={() => setProBannerClosed(true)}
                    className="w-5 h-5 rounded-md hover:bg-white/10 hover:text-white flex items-center justify-center text-xs transition"
                    title="Close banner"
                  >
                    ✕
                  </button>
                </div>

                <div className="w-9 h-9 rounded-xl bg-violet-600/30 text-violet-300 flex items-center justify-center mx-auto mb-2 text-lg border border-violet-400/30">
                  💎
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide">Upgrade to Pro</h4>
                <p className="text-[11px] text-slate-400 mt-1">Unlock more features and grow faster.</p>
                <Link
                  href="/portal/subscriptions"
                  className="mt-3 w-full py-1.5 rounded-lg btn-neon text-white text-xs font-semibold shadow-md shadow-violet-600/40 transition block text-center"
                >
                  Upgrade
                </Link>
              </div>
            )
          )}

          {/* User profile footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate mr-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user.firstName || 'John'} {user.lastName || 'Doe'}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-medium">Customer</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/5 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center w-full max-w-md">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search subscriptions, invoices..."
                className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active Member
            </span>
            <div className="p-2 rounded-xl glass-panel text-slate-300 text-xs">
              🌙
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
