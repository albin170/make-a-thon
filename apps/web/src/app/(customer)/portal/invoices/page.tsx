'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>('/invoices');
        setInvoices(res.data || []);
      } catch (err) {
        console.error('Failed to load invoices', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDownloadPdf = async (id: string, num: string) => {
    try {
      await apiClient.post(`/invoices/${id}/generate-pdf`, {});
      alert(`PDF for invoice ${num} generated and ready.`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Download failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">My Invoices</h1>
      <p className="text-sm text-slate-500 mb-6">Review your statements, payment statuses, and downloadable invoice PDFs.</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Invoice #</th>
              <th className="px-6 py-3">Invoice Date</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Payment Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading invoices...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No invoices on file.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.number}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      inv.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownloadPdf(inv.id, inv.number)}
                      className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium py-1 px-3 rounded"
                    >
                      Download PDF
                    </button>
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
