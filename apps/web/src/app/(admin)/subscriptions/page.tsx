'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    customerId: '',
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentTerms: 'Due on Receipt',
    description: 'Core Subscription Line',
    quantity: 1,
    unitPrice: 49.0,
    currency: 'USD',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, cRes, pRes] = await Promise.all([
        apiClient.get<any>('/subscriptions').catch(() => ({ data: [] })),
        apiClient.get<any>('/customers').catch(() => ({ data: [] })),
        apiClient.get<any>('/plans').catch(() => ({ data: [] })),
      ]);

      const subList = sRes.data || [];
      const custList = cRes.data || [];
      const planList = pRes.data || [];

      setSubscriptions(subList);
      setCustomers(custList);
      setPlans(planList);

      if (custList.length > 0 && !form.customerId) {
        setForm((prev) => ({ ...prev, customerId: custList[0].id }));
      }
      if (planList.length > 0 && !form.planId) {
        setForm((prev) => ({ ...prev, planId: planList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load subscriptions data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (!form.customerId) {
        throw new Error('Please select a customer.');
      }
      if (!form.planId) {
        throw new Error('Please select a subscription plan.');
      }

      await apiClient.post('/subscriptions', {
        customerId: form.customerId,
        planId: form.planId,
        startDate: form.startDate,
        paymentTerms: form.paymentTerms,
        currency: form.currency,
        lines: [
          {
            description: form.description || 'Subscription Line',
            quantity: Number(form.quantity) || 1,
            unitPrice: Number(form.unitPrice) || 49.0,
            currency: form.currency,
          },
        ],
      });

      setSuccess('Subscription created successfully.');
      setShowAddModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await apiClient.patch(`/subscriptions/${id}/${action}`, { reason: 'Admin triggered lifecycle transition' });
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Subscriptions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enforce lifecycle transitions: Draft → Quotation → Confirmed → Active → Closed.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
            Total: {subscriptions.length}
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-neon px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
          >
            <span>+</span>
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Glassmorphism Subscriptions Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Subscription #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Start / Renewal Date</th>
                <th className="px-6 py-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading active subscriptions...
                    </div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No subscriptions found. Click <strong>+ Add Subscription</strong> to create one.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => {
                  const customerName = s.customer?.user
                    ? `${s.customer.user.firstName} ${s.customer.user.lastName}`
                    : 'Registered Client';
                  const planName = s.plan?.name || 'Pro Plan';
                  const dateDisplay = s.nextBillingDate
                    ? new Date(s.nextBillingDate).toLocaleDateString()
                    : s.startDate
                    ? new Date(s.startDate).toLocaleDateString()
                    : 'Jul 25, 2026';

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition duration-150">
                      <td className="px-6 py-4 font-mono font-bold text-violet-300 text-xs">
                        {s.number || 'SUB-000001'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-white">{customerName}</p>
                        <p className="text-xs text-slate-400">{s.customer?.companyName || 'Brightloop Account'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          {planName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : s.status === 'PAUSED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              : s.status === 'CLOSED'
                              ? 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">
                        {dateDisplay}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === 'DRAFT' && (
                            <button
                              onClick={() => handleAction(s.id, 'confirm')}
                              className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-medium border border-indigo-500/30 transition"
                            >
                              Confirm
                            </button>
                          )}
                          {(s.status === 'CONFIRMED' || s.status === 'DRAFT') && (
                            <button
                              onClick={() => handleAction(s.id, 'activate')}
                              className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-medium border border-emerald-500/30 transition"
                            >
                              Activate
                            </button>
                          )}
                          {s.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => handleAction(s.id, 'pause')}
                                className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs font-medium border border-amber-500/30 transition"
                              >
                                Pause
                              </button>
                              <button
                                onClick={() => handleAction(s.id, 'close')}
                                className="px-2 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs font-medium border border-red-500/30 transition"
                              >
                                Close
                              </button>
                            </>
                          )}
                          {s.status === 'PAUSED' && (
                            <button
                              onClick={() => handleAction(s.id, 'resume')}
                              className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-medium border border-emerald-500/30 transition"
                            >
                              Resume
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Subscription</h3>
                <p className="text-xs text-slate-400 mt-0.5">Link a customer to an active plan and generate recurring schedule.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubscription} className="mt-4 space-y-3.5">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Customer</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.user?.firstName ? `${c.user.firstName} ${c.user.lastName}` : c.companyName || c.email} ({c.user?.email || c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Plan</label>
                <select
                  required
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billingInterval} - {p.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Terms</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
              </div>

              {/* Initial Line Items */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <span className="block text-xs font-bold text-violet-300">Default Subscription Line (PDF Rule 4.4)</span>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Line Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-white"
                    placeholder="Monthly Base Access Line"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.unitPrice}
                      onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-white"
                    />
                  </div>
                </div>
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
                  {submitting ? 'Creating Subscription...' : 'Create Subscription →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
