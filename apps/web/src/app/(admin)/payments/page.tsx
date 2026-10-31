'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/payments');
      setPayments(res.data || []);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-1">Manual payment recording and allocation against invoices.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Payment #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Allocations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading payments...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No payments recorded.</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{p.number}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.customer?.user?.firstName} {p.customer?.user?.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {p.method.toLowerCase().replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">
                    ${Number(p.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {p.allocations?.length || 0} invoice(s)
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

