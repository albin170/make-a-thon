'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StaffDashboardPage() {
  const [filterPeriod, setFilterPeriod] = useState('Last 30 days');

  const customers = [
    { name: 'Alex Johnson', email: 'alex.j@enterprise.io', plan: 'Enterprise Pro', status: 'Active', joined: 'Oct 12, 2026' },
    { name: 'Priya Sharma', email: 'priya@techscale.co', plan: 'Growth Tier', status: 'Active', joined: 'Oct 18, 2026' },
    { name: 'Mike Davis', email: 'mike.davis@soloventure.com', plan: 'Starter Pack', status: 'Pending', joined: 'Oct 25, 2026' },
    { name: 'Emily Wilson', email: 'emily@designcraft.io', plan: 'Enterprise Pro', status: 'Active', joined: 'Oct 29, 2026' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Row matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Staff Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage customers, subscriptions and operations.</p>
        </div>

        {/* Date Filter pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="glass-card px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
            <span>🗓️</span>
            <span>{filterPeriod}</span>
            <span className="text-[10px] text-slate-500">▾</span>
          </div>
        </div>
      </div>

      {/* 4 Metrics Cards matching Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Customers */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-lg border border-violet-500/20">
              👥
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ 12%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">4,820</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Total Customers</p>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20">
              ✓
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ 8%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">3,900</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Active Subscriptions</p>
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg border border-blue-500/20">
              $
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ↑ 14%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">$48,750</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Revenue</p>
          </div>
        </div>

        {/* Card 4: Pending Actions */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center text-lg border border-rose-500/20">
              🔔
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">24</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Pending Actions</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Customer Growth Bar Chart + Recent Customers Table (matching Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer Growth Glowing Bar Chart */}
        <div className="lg:col-span-6 glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white tracking-tight">Customer Growth</h3>
            <Link href="/reports" className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition">
              View Report →
            </Link>
          </div>

          <div className="relative h-60 w-full flex items-end justify-between gap-3 pt-6 px-2">
            {[
              { month: 'Jan', height: '35%', val: '1.2k' },
              { month: 'Feb', height: '52%', val: '2.1k' },
              { month: 'Mar', height: '40%', val: '1.6k' },
              { month: 'Apr', height: '70%', val: '3.0k' },
              { month: 'May', height: '62%', val: '2.7k' },
              { month: 'Jun', height: '90%', val: '4.8k' },
            ].map((col) => (
              <div key={col.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition duration-150">
                  {col.val}
                </span>
                <div
                  style={{ height: col.height }}
                  className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 to-violet-500 group-hover:from-indigo-500 group-hover:to-violet-400 transition-all duration-300 shadow-lg shadow-violet-500/20"
                />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition">
                  {col.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Customers Table */}
        <div className="lg:col-span-6 glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white tracking-tight">Recent Customers</h3>
            <Link href="/customers" className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {customers.map((c) => (
              <div
                key={c.email}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] transition border border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-white truncate">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      c.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {c.status}
                  </span>
                  <Link
                    href={`/customers`}
                    className="text-xs text-slate-400 hover:text-white p-1"
                  >
                    •••
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
