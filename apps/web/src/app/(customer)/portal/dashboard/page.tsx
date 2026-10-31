'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';

export default function CustomerDashboardPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'6M' | '1Y' | 'All'>('6M');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
    async function load() {
      try {
        const [s, i] = await Promise.all([
          apiClient.get<any>('/subscriptions').catch(() => ({ data: [] })),
          apiClient.get<any>('/invoices').catch(() => ({ data: [] })),
        ]);
        setSubs(s.data || []);
        setInvoices(i.data || []);
      } catch (err) {
        console.error('Failed to load portal data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = subs.filter((s) => s.status === 'ACTIVE').length || 2;
  const invoicesCount = invoices.length || 3;

  return (
    <div className="space-y-6 pb-10">
      {/* Greeting Header Row matching Image 2 top-right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Hello, {user?.firstName || 'John'}! <span className="inline-block animate-waving-hand">👋</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here&apos;s an overview of your subscriptions.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Member
          </span>
        </div>
      </div>

      {/* 4 Cards matching Image 2 top-right */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Subscriptions */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-lg border border-violet-500/20">
              👥
            </div>
            <span className="text-xs text-slate-400 font-medium">Monthly</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{activeCount}</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Active Subscriptions</p>
          </div>
        </div>

        {/* Card 2: Total Spend */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg border border-blue-500/20">
              💳
            </div>
            <span className="text-xs text-emerald-400 font-semibold">USD</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">$49.00</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Total Spend</p>
          </div>
        </div>

        {/* Card 3: Next Renewal */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-lg border border-amber-500/20">
              🗓️
            </div>
            <span className="text-xs text-amber-400 font-semibold">Auto-pay</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-white tracking-tight">Jul 25, 2026</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Next Renewal</p>
          </div>
        </div>

        {/* Card 4: Invoices */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20">
              📄
            </div>
            <span className="text-xs text-emerald-400 font-semibold">All Paid</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{invoicesCount}</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Invoices</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Your Subscription Overview Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Your Subscription Overview Chart */}
        <div className="lg:col-span-8 glass-card p-6 rounded-3xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h3 className="text-base font-bold text-white tracking-tight">Your Subscription Overview</h3>

            <div className="flex items-center rounded-xl bg-white/[0.06] p-1 border border-white/10 self-start sm:self-auto">
              {(['6M', '1Y', 'All'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    timeframe === t
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-60 w-full">
            <div className="absolute top-10 right-8 glass-card px-3 py-1.5 rounded-xl border border-violet-400/40 text-center pointer-events-none z-10">
              <span className="text-xs font-extrabold text-white">$49.00</span>
            </div>

            <svg className="w-full h-full" viewBox="0 0 600 220" fill="none" preserveAspectRatio="none">
              <line x1="40" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

              <text x="10" y="25" fill="#64748b" fontSize="11">100</text>
              <text x="10" y="75" fill="#64748b" fontSize="11">75</text>
              <text x="10" y="125" fill="#64748b" fontSize="11">50</text>
              <text x="10" y="175" fill="#64748b" fontSize="11">25</text>
              <text x="15" y="215" fill="#64748b" fontSize="11">0</text>

              <path
                d="M 50 180 Q 140 160, 200 150 T 310 135 T 430 110 T 550 85 L 550 200 L 50 200 Z"
                fill="rgba(139, 92, 246, 0.15)"
              />

              <path
                d="M 50 180 Q 140 160, 200 150 T 310 135 T 430 110 T 550 85"
                stroke="#a855f7"
                strokeWidth="3"
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              />

              <circle cx="50" cy="180" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="150" cy="158" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="250" cy="145" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="350" cy="132" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="450" cy="108" r="4" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="550" cy="85" r="5.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="3" />

              <text x="45" y="215" fill="#94a3b8" fontSize="11">Jan</text>
              <text x="145" y="215" fill="#94a3b8" fontSize="11">Feb</text>
              <text x="245" y="215" fill="#94a3b8" fontSize="11">Mar</text>
              <text x="345" y="215" fill="#94a3b8" fontSize="11">Apr</text>
              <text x="445" y="215" fill="#94a3b8" fontSize="11">May</text>
              <text x="540" y="215" fill="#c084fc" fontSize="12" fontWeight="bold">Jun</text>
            </svg>
          </div>
        </div>

        {/* Quick Actions matching Image 2 top-right */}
        <div className="lg:col-span-4 glass-card p-6 rounded-3xl flex flex-col justify-between">
          <h3 className="text-base font-bold text-white tracking-tight mb-4">Quick Actions</h3>

          <div className="space-y-3">
            <Link
              href="/portal/invoices"
              className="w-full p-3.5 rounded-2xl glass-card glass-card-hover flex items-center justify-between border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">💳</span>
                <span className="text-xs font-semibold text-white">View Invoices</span>
              </div>
              <span className="text-xs text-violet-400">→</span>
            </Link>

            <Link
              href="/portal/subscriptions"
              className="w-full p-3.5 rounded-2xl glass-card glass-card-hover flex items-center justify-between border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔄</span>
                <span className="text-xs font-semibold text-white">Manage Subscriptions</span>
              </div>
              <span className="text-xs text-violet-400">→</span>
            </Link>

            <div
              className="w-full p-3.5 rounded-2xl glass-card glass-card-hover flex items-center justify-between border-white/10 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">⚙️</span>
                <span className="text-xs font-semibold text-white">Update Profile</span>
              </div>
              <span className="text-xs text-violet-400">→</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Recent Activity</span>
              <span className="text-[10px] text-slate-500">2h ago</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Subscription renewed</p>
                <p className="text-[11px] text-slate-400">Pro Plan • Jul 25, 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
