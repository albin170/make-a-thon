'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';

interface Metrics {
  activeSubscriptions: number;
  revenueReceived: string;
  outstandingBalance: string;
  overdueInvoices: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'6M' | '1Y' | 'All'>('6M');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
    async function load() {
      try {
        const res = await apiClient.get<Metrics>('/reports/dashboard');
        setMetrics(res);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRevenue = metrics ? Number(metrics.revenueReceived || 0) : 49.0;
  const activeSubs = metrics ? metrics.activeSubscriptions : 2;
  const pendingRenewals = metrics ? metrics.overdueInvoices : 1;
  const totalInvoices = 3;

  return (
    <div className="space-y-6 pb-10">
      {/* Top Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Welcome back, {user?.firstName || 'Alex'}! <span className="inline-block animate-waving-hand">👋</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage your subscriptions, revenue, and stay in control.</p>
        </div>

        {/* Administrator Operational Status Badge */}
        <div className="glass-card px-5 py-3 rounded-2xl flex items-center justify-between gap-4 border-violet-500/25 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg shrink-0 border border-emerald-500/30">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">System Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300">Live PostgreSQL Database & Workers</p>
            </div>
          </div>
          <Link
            href="/billing"
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition shrink-0"
          >
            Billing Runs ⚡
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards Row with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Subscriptions */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-lg border border-violet-500/20">
              👥
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ +1
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">{activeSubs}</span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Active Subscriptions</p>
            </div>
            <svg className="w-24 h-10 text-violet-500" viewBox="0 0 100 40" fill="none">
              <path
                d="M0 30 Q 25 35, 50 15 T 100 10"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg border border-blue-500/20">
              💳
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ +12%
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total Revenue</p>
            </div>
            <svg className="w-24 h-10 text-blue-500" viewBox="0 0 100 40" fill="none">
              <path
                d="M0 32 Q 25 15, 50 28 T 100 8"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Pending Renewal */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-lg border border-amber-500/20">
              🗓️
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ↑ 0%
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">{pendingRenewals}</span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Pending Renewal</p>
            </div>
            <svg className="w-24 h-10 text-amber-500" viewBox="0 0 100 40" fill="none">
              <path
                d="M0 25 Q 30 38, 60 20 T 100 15"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Total Invoices */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20">
              📄
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ +1
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">{totalInvoices}</span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total Invoices</p>
            </div>
            <svg className="w-24 h-10 text-emerald-500" viewBox="0 0 100 40" fill="none">
              <path
                d="M0 35 Q 30 20, 60 30 T 100 12"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid: Subscription Overview Chart + Admin Operations Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Subscription Overview Chart */}
        <div className="lg:col-span-8 glass-card p-6 rounded-3xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center text-sm border border-violet-500/30">
                📊
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Subscription Overview</h3>
                <p className="text-xs text-slate-400">Monthly billing velocity & recurring trend</p>
              </div>
            </div>

            {/* Timeframe Filter Pills */}
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

          {/* Interactive Glowing SVG Area Chart */}
          <div className="relative h-64 w-full">
            <div className="absolute top-6 right-2 sm:right-6 glass-card px-3 py-1.5 rounded-xl border border-violet-400/40 shadow-lg text-center pointer-events-none z-10">
              <span className="text-xs font-extrabold text-white">$87.50</span>
              <p className="text-[10px] text-violet-300">Jun peak</p>
            </div>

            <svg className="w-full h-full" viewBox="0 0 600 240" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="violetGlowGradientAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#6366f1" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>

              <line x1="50" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="50" y1="75" x2="580" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="50" y1="130" x2="580" y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="50" y1="185" x2="580" y2="185" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

              <text x="15" y="25" fill="#64748b" fontSize="11" fontFamily="sans-serif">100</text>
              <text x="15" y="80" fill="#64748b" fontSize="11" fontFamily="sans-serif">75</text>
              <text x="15" y="135" fill="#64748b" fontSize="11" fontFamily="sans-serif">50</text>
              <text x="15" y="190" fill="#64748b" fontSize="11" fontFamily="sans-serif">25</text>
              <text x="25" y="235" fill="#64748b" fontSize="11" fontFamily="sans-serif">0</text>

              <path
                d="M 60 190 Q 150 170, 200 160 T 320 145 T 440 120 T 560 65 L 560 220 L 60 220 Z"
                fill="url(#violetGlowGradientAdmin)"
              />

              <path
                d="M 60 190 Q 150 170, 200 160 T 320 145 T 440 120 T 560 65"
                stroke="#a855f7"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_12px_rgba(168,85,247,0.9)]"
              />

              <circle cx="60" cy="190" r="4.5" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="160" cy="168" r="4.5" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="260" cy="152" r="4.5" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="360" cy="140" r="4.5" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="460" cy="115" r="4.5" fill="#ffffff" stroke="#a855f7" strokeWidth="2.5" />
              <circle cx="560" cy="65" r="6" fill="#ffffff" stroke="#8b5cf6" strokeWidth="3.5" className="animate-pulse" />

              <text x="55" y="235" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Jan</text>
              <text x="155" y="235" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Feb</text>
              <text x="255" y="235" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Mar</text>
              <text x="355" y="235" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">Apr</text>
              <text x="455" y="235" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">May</text>
              <text x="550" y="235" fill="#c084fc" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Jun</text>
            </svg>
          </div>
        </div>

        {/* Right Column: Admin Operations Status */}
        <div className="lg:col-span-4 glass-card p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#12182d] to-[#0d1222] border-violet-500/25">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider">
            <span>🛡️</span> System Controls
          </div>

          <div className="my-3 space-y-2.5">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">Recurring Billing</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Automated
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">Role-Based Guards</span>
              <span className="text-indigo-300 font-semibold">Enforced (RBAC)</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">Audit & Invoicing</span>
              <span className="text-violet-300 font-semibold">Persisted</span>
            </div>
          </div>

          <Link
            href="/billing"
            className="w-full py-3 rounded-xl btn-neon text-xs font-bold text-center block mt-3"
          >
            Manage Billing Runs →
          </Link>
        </div>
      </div>

      {/* Bottom Grid: Recent Activity Timeline + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Activity Timeline */}
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <h3 className="text-base font-bold text-white tracking-tight">Recent Activity</h3>
            </div>
            <Link href="/subscriptions" className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition">
              View All →
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.04] transition">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white truncate">Subscription renewed</h4>
                  <span className="text-[11px] text-slate-400 shrink-0">2h ago</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Enterprise Plan • Automated run</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.04] transition">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm shrink-0 border border-indigo-500/30">
                💳
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white truncate">Payment of $49.00 received</h4>
                  <span className="text-[11px] text-slate-400 shrink-0">2h ago</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Invoice #INV-2025-006</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.04] transition">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm shrink-0 border border-cyan-500/30">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white truncate">Staff credential verified</h4>
                  <span className="text-[11px] text-slate-400 shrink-0">1d ago</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Admin access audit log</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-5 glass-card p-6 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-violet-400">⚡</span>
            <h3 className="text-base font-bold text-white tracking-tight">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Link
              href="/invoices"
              className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 border-white/10"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-lg border border-violet-500/30">
                💳
              </div>
              <span className="text-xs font-semibold text-white">View Invoices</span>
            </Link>

            <Link
              href="/plans"
              className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 border-white/10"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-lg border border-indigo-500/30">
                🗓️
              </div>
              <span className="text-xs font-semibold text-white">Manage Plans</span>
            </Link>

            <Link
              href="/users"
              className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 border-white/10"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-lg border border-cyan-500/30">
                🛡️
              </div>
              <span className="text-xs font-semibold text-white">Staff Users</span>
            </Link>

            <Link
              href="/customers"
              className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 border-white/10"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center text-lg border border-rose-500/30">
                👥
              </div>
              <span className="text-xs font-semibold text-white">Customers</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
