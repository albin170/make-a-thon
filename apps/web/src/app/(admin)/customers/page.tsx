'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/customers');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer accounts and subscriptions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">Currency</th>
              <th className="px-6 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading customers...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No customers registered.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.user?.firstName} {c.user?.lastName}</td>
                  <td className="px-6 py-4 text-slate-600">{c.user?.email}</td>
                  <td className="px-6 py-4 text-slate-600">{c.companyName || '—'}</td>
                  <td className="px-6 py-4 font-mono text-xs">{c.currency}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
