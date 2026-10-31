'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomerSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/subscriptions');
      setSubs(res.data || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const handlePause = async (id: string) => {
    try {
      await apiClient.patch(`/subscriptions/${id}/pause`, { reason: 'Customer requested pause' });
      await loadSubs();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to pause');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await apiClient.patch(`/subscriptions/${id}/resume`, {});
      await loadSubs();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to resume');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">My Subscriptions</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your active plans, pausing, and renewal preferences.</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Subscription #</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Next Billing Date</th>
              <th className="px-6 py-3 text-right">Self-Service Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">You have no active subscriptions.</td></tr>
            ) : (
              subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{s.number}</td>
                  <td className="px-6 py-4 text-slate-700">{s.plan?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {s.status === 'ACTIVE' && (
                      <button
                        onClick={() => handlePause(s.id)}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Pause
                      </button>
                    )}
                    {s.status === 'PAUSED' && (
                      <button
                        onClick={() => handleResume(s.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Resume
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

