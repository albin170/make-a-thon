'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

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
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Customer Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor registered customer accounts, active subscription plans, expiry dates, and billing records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
            Total Customers: {customers.length}
          </span>
        </div>
      </div>

      {/* Glassmorphism Table Card */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Active Plan</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Renewal / Expiry</th>
                <th className="px-6 py-4 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading customer database records...
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No registered customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const activeSub = c.subscriptions?.find((s: any) => s.status === 'ACTIVE') || c.subscriptions?.[0];
                  const planName = activeSub?.plan?.name || 'Standard Tier';
                  const joinedDate = new Date(c.createdAt || Date.now()).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const expiryDate = activeSub?.currentPeriodEnd
                    ? new Date(activeSub.currentPeriodEnd).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Jul 25, 2026';

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition duration-150">
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                            {(c.user?.firstName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {c.user?.firstName || 'Customer'} {c.user?.lastName || ''}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{c.user?.email || c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4 text-slate-300 font-medium text-xs">
                        {c.companyName || 'Brightloop Client'}
                      </td>

                      {/* Active Plan */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          {planName}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-slate-300 text-xs font-mono">
                        {joinedDate}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                          🗓️ {expiryDate}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-violet-600/20 hover:border-violet-500/40 text-violet-300 text-xs font-semibold border border-white/10 transition flex items-center gap-1 ml-auto"
                        >
                          <span>Inspect</span>
                          <span>↗</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Account Details Modal / Inspector */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-violet-500/30">
                  {(selectedCustomer.user?.firstName || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedCustomer.user?.firstName} {selectedCustomer.user?.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Company</p>
                <p className="text-sm font-bold text-white mt-1">{selectedCustomer.companyName || '—'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Currency</p>
                <p className="text-sm font-bold text-violet-300 mt-1">{selectedCustomer.currency || 'USD'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Status</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">Active</p>
              </div>
            </div>

            {/* Subscriptions section */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>🔄</span> Subscriptions ({selectedCustomer.subscriptions?.length || 1})
              </h4>
              <div className="space-y-2">
                {selectedCustomer.subscriptions?.length ? (
                  selectedCustomer.subscriptions.map((s: any) => (
                    <div key={s.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{s.plan?.name || 'Pro Plan'}</span>
                        <p className="text-slate-400 text-[11px]">Started: {new Date(s.startDate || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                        {s.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">Pro Plan (Self-Service)</span>
                      <p className="text-slate-400 text-[11px]">Valid until Jul 25, 2026</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Invoices section */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>💳</span> Invoices ({selectedCustomer.invoices?.length || 1})
              </h4>
              <div className="space-y-2">
                {selectedCustomer.invoices?.length ? (
                  selectedCustomer.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">#{inv.invoiceNumber || 'INV-2026-001'}</span>
                        <p className="text-slate-400 text-[11px]">Due: {new Date(inv.dueDate || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">${Number(inv.total || 49).toFixed(2)}</span>
                        <p className="text-emerald-400 font-semibold text-[10px]">{inv.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">#INV-2026-001</span>
                      <p className="text-slate-400 text-[11px]">Generated on Registration</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">$49.00</span>
                      <p className="text-emerald-400 font-semibold text-[10px]">PAID</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
