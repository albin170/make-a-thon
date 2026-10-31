'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/plans');
      setPlans(res.data || []);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Configurable billing intervals, pausing, auto-closure, and renewal rules.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Plan Name</th>
              <th className="px-6 py-3">Interval</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Allow Pause</th>
              <th className="px-6 py-3">Allow Early Closure</th>
              <th className="px-6 py-3">Allow Renewal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading plans...</td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No plans configured.</td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600">{p.intervalCount} {p.billingInterval}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{p.allowPause ? '✅ Yes' : '❌ No'}</td>
                  <td className="px-6 py-4 text-slate-700">{p.allowEarlyClosure ? '✅ Yes' : '❌ No'}</td>
                  <td className="px-6 py-4 text-slate-700">{p.allowRenewal ? '✅ Yes' : '❌ No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

