'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomerDashboardPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, i] = await Promise.all([
          apiClient.get<any>('/subscriptions'),
          apiClient.get<any>('/invoices'),
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">My Account Overview</h1>
      <p className="text-sm text-slate-500 mb-8">Access your active subscriptions and billing history.</p>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading your account details...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Active Subscriptions</h3>
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {subs.filter((s) => s.status === 'ACTIVE').length}
            </div>
            <a href="/portal/subscriptions" className="text-xs font-semibold text-emerald-600 hover:underline">
              View all subscriptions →
            </a>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Total Invoices</h3>
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {invoices.length}
            </div>
            <a href="/portal/invoices" className="text-xs font-semibold text-emerald-600 hover:underline">
              View invoice history & download PDFs →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

