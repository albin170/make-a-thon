'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/invoices');
      setInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      await apiClient.patch(`/invoices/${id}/confirm`, {});
      await fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Confirmation failed');
    }
  };

  const handleSend = async (id: string) => {
    try {
      await apiClient.post(`/invoices/${id}/send`, {});
      alert('Invoice queued for email delivery.');
      await fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Send failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Lifecycle: Draft → Confirmed → Paid (or Cancelled).</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Invoice #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Balance</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Payment</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-400">Loading invoices...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-400">No invoices generated yet.</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.number}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {inv.customer?.user?.firstName} {inv.customer?.user?.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(inv.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    ${Number(inv.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-slate-900">
                    ${Number(inv.amountDue).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      inv.paymentStatus === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : inv.paymentStatus === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {inv.status === 'DRAFT' && (
                      <button
                        onClick={() => handleConfirm(inv.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Confirm
                      </button>
                    )}
                    {inv.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleSend(inv.id)}
                        className="text-xs bg-slate-700 hover:bg-slate-800 text-white font-medium py-1 px-2.5 rounded"
                      >
                        Email PDF
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
