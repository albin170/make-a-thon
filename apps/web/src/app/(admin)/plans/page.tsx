'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    billingInterval: 'MONTHLY',
    intervalCount: 1,
    currency: 'USD',
    trialDays: 0,
    minQuantity: 1,
    allowPause: true,
    allowEarlyClosure: true,
    allowRenewal: true,
    autoCloseOnEnd: false,
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/plans');
      setPlans(res.data || []);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await apiClient.post('/plans', {
        name: form.name.trim(),
        description: form.description?.trim(),
        billingInterval: form.billingInterval,
        intervalCount: Number(form.intervalCount) || 1,
        currency: form.currency,
        trialDays: Number(form.trialDays) || 0,
        minQuantity: Number(form.minQuantity) || 1,
        allowPause: Boolean(form.allowPause),
        allowEarlyClosure: Boolean(form.allowEarlyClosure),
        allowRenewal: Boolean(form.allowRenewal),
        autoCloseOnEnd: Boolean(form.autoCloseOnEnd),
        status: 'ACTIVE',
      });

      setSuccess(`Subscription plan "${form.name}" successfully created.`);
      setForm({
        name: '',
        description: '',
        billingInterval: 'MONTHLY',
        intervalCount: 1,
        currency: 'USD',
        trialDays: 0,
        minQuantity: 1,
        allowPause: true,
        allowEarlyClosure: true,
        allowRenewal: true,
        autoCloseOnEnd: false,
      });
      setShowAddModal(false);
      await fetchPlans();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configurable billing intervals (daily, weekly, monthly, yearly), pausing rules, auto-closure, and renewals.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
            Total Plans: {plans.length}
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-neon px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
          >
            <span>+</span>
            <span>Add Plan</span>
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

      {/* Glassmorphism Plans Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Billing Schedule</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Pause Policy</th>
                <th className="px-6 py-4">Early Closure</th>
                <th className="px-6 py-4">Renewal Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading subscription plans...
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No subscription plans configured. Click <strong>+ Add Plan</strong> to configure one.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center font-bold text-sm border border-violet-500/25">
                          🗓️
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.description || 'Standard recurring plan'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        Every {p.intervalCount || 1} {p.billingInterval}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {p.allowPause ? (
                        <span className="text-emerald-400">✅ Permitted</span>
                      ) : (
                        <span className="text-slate-500">❌ Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {p.allowEarlyClosure ? (
                        <span className="text-emerald-400">✅ Allowed</span>
                      ) : (
                        <span className="text-slate-500">❌ Locked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {p.allowRenewal ? (
                        <span className="text-emerald-400">✅ Auto-Renew</span>
                      ) : (
                        <span className="text-slate-500">❌ Single Term</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Add Subscription Plan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Define billing cycle, cadence, pausing, and closure rules.</p>
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

            <form onSubmit={handleCreatePlan} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="e.g. Pro Growth Monthly Tier"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Interval</label>
                  <select
                    value={form.billingInterval}
                    onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Interval Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.intervalCount}
                    onChange={(e) => setForm({ ...form, intervalCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Trial Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.trialDays}
                    onChange={(e) => setForm({ ...form, trialDays: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Lifecycle & Policy Checkboxes (PDF Module 4) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <span className="block text-xs font-bold text-violet-300 mb-1">Lifecycle Rules (PDF Rule 4.2)</span>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowPause}
                    onChange={(e) => setForm({ ...form, allowPause: e.target.checked })}
                    className="rounded bg-slate-900 border-white/20 text-violet-600 focus:ring-0"
                  />
                  <span>Allow customer / staff to pause subscription</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowEarlyClosure}
                    onChange={(e) => setForm({ ...form, allowEarlyClosure: e.target.checked })}
                    className="rounded bg-slate-900 border-white/20 text-violet-600 focus:ring-0"
                  />
                  <span>Allow early termination / closure</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowRenewal}
                    onChange={(e) => setForm({ ...form, allowRenewal: e.target.checked })}
                    className="rounded bg-slate-900 border-white/20 text-violet-600 focus:ring-0"
                  />
                  <span>Allow automatic plan renewals</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="Service coverage and tier specifics"
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
                  {submitting ? 'Creating Plan...' : 'Create Plan →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
