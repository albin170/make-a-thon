'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ReportsPage() {
  const [aging, setAging] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [a, g, r] = await Promise.all([
          apiClient.get<any>('/reports/invoice-aging'),
          apiClient.get<any[]>('/reports/subscription-growth'),
          apiClient.get<any[]>('/reports/revenue-by-period'),
        ]);
        setAging(a);
        setGrowth(g);
        setRevenue(r);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial & Lifecycle Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Aggregated live transactional data with zero client-side mock calculation.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading reports...</div>
      ) : (
        <div className="space-y-8">
          {/* Invoice Aging */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Invoice Receivables Aging</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Current (Not Due)</span>
                <p className="text-xl font-bold text-slate-800 mt-1">${(aging?.current || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-xs text-amber-700 font-medium">1 - 30 Days</span>
                <p className="text-xl font-bold text-amber-900 mt-1">${(aging?.days1_30 || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-xs text-orange-700 font-medium">31 - 60 Days</span>
                <p className="text-xl font-bold text-orange-900 mt-1">${(aging?.days31_60 || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                <span className="text-xs text-rose-700 font-medium">61 - 90 Days</span>
                <p className="text-xl font-bold text-rose-900 mt-1">${(aging?.days61_90 || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs text-red-700 font-medium">90+ Days</span>
                <p className="text-xl font-bold text-red-900 mt-1">${(aging?.days90Plus || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Revenue by Period */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Cash Revenue By Period</h2>
            {revenue.length === 0 ? (
              <p className="text-xs text-slate-400">No revenue data yet.</p>
            ) : (
              <div className="space-y-2">
                {revenue.map((r) => (
                  <div key={r.period} className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                    <span className="font-mono text-slate-600">{r.period}</span>
                    <span className="font-bold text-emerald-600">${Number(r.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
