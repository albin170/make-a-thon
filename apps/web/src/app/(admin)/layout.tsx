'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, clearAuthSession } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: '🏠' },
  { name: 'Customers', href: '/customers', icon: '👥' },
  { name: 'Subscriptions', href: '/subscriptions', icon: '🔄' },
  { name: 'Invoices', href: '/invoices', icon: '💳' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Plans', href: '/plans', icon: '🗓️' },
  { name: 'Quotations', href: '/quotations', icon: '📄' },
  { name: 'Payments', href: '/payments', icon: '💰' },
  { name: 'Billing Runs', href: '/billing', icon: '⚡' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Staff Users', href: '/users', icon: '🛡️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace('/login');
    } else if (u.role === 'CUSTOMER') {
      router.replace('/portal/dashboard');
    } else {
      setUser(u);
    }
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      clearAuthSession();
      router.replace('/login');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/subscriptions?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#060913] text-slate-100 font-sans overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[450px] h-[450px] rounded-full bg-cyan-600/10 blur-[140px] pointer-events-none" />

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Responsive Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-white/10 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.083-8-12.356-8-5.096 0-5.096 8 0 8 5.273 0 7.261-8 12.356-8z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Brightloop</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>

          {/* Quick Workspace Switcher */}
          <div className="px-3 pt-3">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400 font-medium">WORKSPACE</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {user.role}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Link
                  href="/dashboard"
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-semibold transition ${
                    pathname === '/dashboard' || pathname.startsWith('/users') || pathname.startsWith('/billing')
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
                <Link
                  href="/staff/dashboard"
                  className="flex-1 text-center py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Staff
                </Link>
                <Link
                  href="/portal/dashboard"
                  className="flex-1 text-center py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Customer
                </Link>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-360px)]">
            {navigation.map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2 text-sm font-medium rounded-xl transition duration-150 ${
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
          {/* User profile footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate mr-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user.firstName || 'Admin'} {user.lastName || 'User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
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
        <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3">
          {/* Search bar with ⌘ K shortcut */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subscriptions, invoices, customers (Press Enter)..."
                className="w-full pl-10 pr-12 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-400"
              />
              <div className="hidden sm:flex absolute inset-y-0 right-0 pr-2.5 items-center pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/10 rounded border border-white/10">
                  ↵
                </kbd>
              </div>
            </form>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active System
            </span>

            <div className="p-2 rounded-xl glass-panel text-slate-300 flex items-center gap-1 text-xs">
              <span>🌙</span>
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
