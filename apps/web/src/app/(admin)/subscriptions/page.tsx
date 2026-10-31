'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/subscriptions');
      setSubscriptions(res.data || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      await apiClient.patch(`/subscriptions/${id}/${action}`, { reason: 'User initiated action' });
      await fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Action failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">Lifecycle: Draft → Quotation → Confirmed → Active → Closed.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Number</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Next Billing</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading subscriptions...</td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No subscriptions found.</td>
              </tr>
            ) : (
              subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{s.number}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {s.customer?.user?.firstName} {s.customer?.user?.lastName}
                    {s.customer?.companyName && ` (${s.customer.companyName})`}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.plan?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : s.status === 'PAUSED'
                        ? 'bg-amber-100 text-amber-800'
                        : s.status === 'CLOSED'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {s.status === 'DRAFT' && (
                      <button
                        onClick={() => handleAction(s.id, 'activate')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Activate
                      </button>
                    )}
                    {s.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => handleAction(s.id, 'pause')}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium py-1 px-2.5 rounded"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => handleAction(s.id, 'close')}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-2.5 rounded"
                        >
                          Close
                        </button>
                      </>
                    )}
                    {s.status === 'PAUSED' && (
                      <button
                        onClick={() => handleAction(s.id, 'resume')}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2.5 rounded"
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
