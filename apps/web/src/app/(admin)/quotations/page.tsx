'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/quotations');
      setQuotations(res.data || []);
    } catch (err) {
      console.error('Failed to load quotations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleSend = async (id: string) => {
    try {
      await apiClient.patch(`/quotations/${id}/send`, {});
      await fetchQuotations();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Send failed');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await apiClient.patch(`/quotations/${id}/accept`, {});
      alert('Quotation accepted! Draft subscription created.');
      await fetchQuotations();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Accept failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">Lifecycle: Draft → Sent → Accepted (converts to Subscription) or Rejected.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Number</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Valid Until</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading quotations...</td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No quotations found.</td>
              </tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{q.number}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {q.customer?.user?.firstName} {q.customer?.user?.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{new Date(q.validTo).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">${Number(q.total).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      q.status === 'ACCEPTED'
                        ? 'bg-green-100 text-green-800'
                        : q.status === 'SENT'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {q.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSend(q.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Send
                      </button>
                    )}
                    {q.status === 'SENT' && (
                      <button
                        onClick={() => handleAccept(q.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Convert to Sub
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
