'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [inspectedSubscriptions, setInspectedSubscriptions] = useState<any[]>([]);
  const [inspectedInvoices, setInspectedInvoices] = useState<any[]>([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Add Customer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: 'Customer@123',
    currency: 'USD',
    notes: '',
  });

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

  useEffect(() => {
    if (!selectedCustomer) {
      setInspectedSubscriptions([]);
      setInspectedInvoices([]);
      return;
    }

    let cancelled = false;
    const loadInspectorData = async () => {
      setInspectorLoading(true);
      try {
        const customerId = encodeURIComponent(selectedCustomer.id);
        const [subscriptionsResponse, invoicesResponse] = await Promise.all([
          apiClient.get<any>(`/subscriptions?customerId=${customerId}&limit=100`),
          apiClient.get<any>(`/invoices?customerId=${customerId}&limit=100`),
        ]);

        if (!cancelled) {
          setInspectedSubscriptions(Array.isArray(subscriptionsResponse?.data) ? subscriptionsResponse.data : []);
          setInspectedInvoices(Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load customer billing details', err);
          setInspectedSubscriptions([]);
          setInspectedInvoices([]);
        }
      } finally {
        if (!cancelled) setInspectorLoading(false);
      }
    };

    loadInspectorData();
    return () => {
      cancelled = true;
    };
  }, [selectedCustomer]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setSubmitting(true);

    try {
      try {
        await apiClient.post('/customers', form);
      } catch (err: any) {
        // Fallback to /auth/register if backend hasn't re-deployed yet
        await apiClient.post('/auth/register', {
          firstName: form.firstName,
          lastName: form.lastName,
          companyName: form.companyName,
          email: form.email,
          phone: form.phone,
          password: form.password || 'Customer@123',
        });
      }

      setAddSuccess(`Customer "${form.firstName} ${form.lastName}" (${form.email}) created successfully.`);
      setForm({
        firstName: '',
        lastName: '',
        companyName: '',
        email: '',
        phone: '',
        password: 'Customer@123',
        currency: 'USD',
        notes: '',
      });
      setShowAddModal(false);
      await fetchCustomers();
    } catch (err: any) {
      setAddError(err?.response?.data?.message || err?.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
            Total Customers: {customers.length}
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-neon px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
          >
            <span>+</span>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {addSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{addSuccess}</span>
          </div>
          <button type="button" onClick={() => setAddSuccess('')} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

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
                    No registered customers found. Click <strong>+ Add Customer</strong> to create one.
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

      {/* Modal: Add New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Customer</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create customer record and user credentials directly in the database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="Emma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="Watson"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="Acme Global Inc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="emma@acme.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (optional)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="+1 (555) 019-2834"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password <span className="text-slate-500 font-normal">(Customer can change later)</span>
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="Customer@123"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-neon px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {submitting ? 'Creating Customer...' : 'Create Customer Account →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <span>🔄</span> Subscriptions ({inspectedSubscriptions.length})
              </h4>
              <div className="space-y-2">
                {inspectorLoading ? (
                  <p className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400">Loading subscriptions...</p>
                ) : inspectedSubscriptions.length ? (
                  inspectedSubscriptions.map((s: any) => (
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
                  <p className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400">No subscriptions recorded.</p>
                )}
              </div>
            </div>

            {/* Invoices section */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>💳</span> Invoices ({inspectedInvoices.length})
              </h4>
              <div className="space-y-2">
                {inspectorLoading ? (
                  <p className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400">Loading invoices...</p>
                ) : inspectedInvoices.length ? (
                  inspectedInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">#{inv.number}</span>
                        <p className="text-slate-400 text-[11px]">Due: {new Date(inv.dueDate || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">${Number(inv.total || 0).toFixed(2)}</span>
                        <p className="text-emerald-400 font-semibold text-[10px]">{inv.paymentStatus || inv.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400">No invoices recorded.</p>
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
