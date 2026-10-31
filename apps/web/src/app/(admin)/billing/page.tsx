'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function BillingPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/billing/runs');
      setRuns(res.data || []);
    } catch (err) {
      console.error('Failed to load billing runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      await apiClient.post('/billing/trigger', {});
      alert('Manual billing run initiated.');
      await fetchRuns();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Billing Runs</h1>
          <p className="text-sm text-slate-500 mt-1">BullMQ queue execution and billing period idempotency tracking.</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm disabled:opacity-50"
        >
          {triggering ? 'Triggering...' : '⚡ Trigger Billing Run'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Run ID</th>
              <th className="px-6 py-3">Run Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Processed</th>
              <th className="px-6 py-3">Succeeded</th>
              <th className="px-6 py-3">Failed</th>
              <th className="px-6 py-3">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading runs...</td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No billing runs recorded yet. Click "Trigger Billing Run" to execute now.</td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">{r.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(r.runDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.totalProcessed}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{r.totalSucceeded}</td>
                  <td className="px-6 py-4 text-red-600 font-medium">{r.totalFailed}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : '—'}
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

