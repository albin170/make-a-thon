'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Metrics {
  activeSubscriptions: number;
  revenueReceived: string;
  outstandingBalance: string;
  overdueInvoices: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time subscription and financial operations metrics.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{metrics?.activeSubscriptions ?? 0}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">Live</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue Received</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                ${Number(metrics?.revenueReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">Cash</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Invoices</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                ${Number(metrics?.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Receivable</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Invoices</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-red-600">{metrics?.overdueInvoices ?? 0}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Action</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 text-sm">Automated Billing Runs</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Trigger or inspect the recurring BullMQ billing scheduler engine.</p>
          <a href="/billing" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View runs →
          </a>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 text-sm">Subscription Lifecycle</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Manage customer subscriptions: pause, resume, early closure, renewal.</p>
          <a href="/subscriptions" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Manage subscriptions →
          </a>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 text-sm">Payment Reconciliation</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Record manual payments and allocate balances across outstanding invoices.</p>
          <a href="/payments" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Reconcile payments →
          </a>
        </div>
      </div>
    </div>
  );
}

