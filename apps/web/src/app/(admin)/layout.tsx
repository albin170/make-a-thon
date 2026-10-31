'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, clearAuthSession } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Customers', href: '/customers', icon: '👥' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Plans', href: '/plans', icon: '🗓️' },
  { name: 'Quotations', href: '/quotations', icon: '📄' },
  { name: 'Subscriptions', href: '/subscriptions', icon: '🔄' },
  { name: 'Invoices', href: '/invoices', icon: '💳' },
  { name: 'Payments', href: '/payments', icon: '💰' },
  { name: 'Billing Runs', href: '/billing', icon: '⚡' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Staff Users', href: '/users', icon: '🛡️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

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

  const handleLogout = () => {
    clearAuthSession();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-xs">BL</span>
              Brightloop SMS
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span>
                {user.role} Workspace
              </span>
            </div>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-medium text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 font-medium py-1 px-2 rounded hover:bg-slate-800"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>System</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 capitalize">
              {pathname.replace('/', '') || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ● API Online
            </span>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          {children}
        </section>
      </main>
    </div>
  );
}

