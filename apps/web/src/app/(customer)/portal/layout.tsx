'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, clearAuthSession } from '@/lib/auth';

const navigation = [
  { name: 'Portal Home', href: '/portal/dashboard', icon: '🏠' },
  { name: 'My Subscriptions', href: '/portal/subscriptions', icon: '🔄' },
  { name: 'My Invoices', href: '/portal/invoices', icon: '💳' },
];

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

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
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-800 text-white flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-700">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded bg-emerald-600 flex items-center justify-center text-xs">BL</span>
              Customer Portal
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Role: <strong className="text-emerald-400">{user.role}</strong></span>
              {(user.role === "ADMIN" || user.role === "STAFF") && (
                <Link href="/dashboard" className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded font-medium">
                  → Admin Panel
                </Link>
              )}
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs font-medium text-white truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-slate-400 truncate mb-2">{user.email}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-red-400 hover:text-red-300 font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

