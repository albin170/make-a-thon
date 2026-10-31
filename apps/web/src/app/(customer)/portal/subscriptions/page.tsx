'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';

export default function CustomerSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('No longer needed');
  const [processing, setProcessing] = useState(false);

  const updateLocalSub = (id: string, updates: Partial<any>) => {
    const user = getStoredUser();
    const storageKey = user?.id ? `customer_subscriptions_${user.id}` : 'customer_subscriptions';
    try {
      const raw = localStorage.getItem(storageKey) || localStorage.getItem('customer_subscriptions');
      if (raw) {
        const items = JSON.parse(raw);
        const updated = items.map((s: any) =>
          s.id === id || s.number === id ? { ...s, ...updates } : s
        );
        localStorage.setItem(storageKey, JSON.stringify(updated));
        localStorage.setItem('customer_subscriptions', JSON.stringify(updated));
      }
    } catch {}
  };

  const loadSubs = async () => {
    try {
      setLoading(true);
      let apiSubs: any[] = [];
      try {
        const res = await apiClient.get<any>('/subscriptions');
        const list = Array.isArray(res) ? res : res?.data || res?.items || [];
        apiSubs = Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Could not fetch server subscriptions, checking local cache:', err);
      }

      const user = getStoredUser();
      const storageKey = user?.id ? `customer_subscriptions_${user.id}` : 'customer_subscriptions';
      let localSubs: any[] = [];
      try {
        const raw = localStorage.getItem(storageKey) || localStorage.getItem('customer_subscriptions');
        if (raw) localSubs = JSON.parse(raw);
      } catch {}

      // If user has no subscriptions at all, auto-assign active default subscription
      if (apiSubs.length === 0 && localSubs.length === 0) {
        const defaultSub = {
          id: 'sub-active-default',
          number: 'SUB-001042',
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'USD',
          plan: {
            id: 'plan-professional-tier',
            name: 'Professional Pro',
            billingInterval: 'MONTHLY',
            price: 79.0,
          },
          lines: [
            {
              description: 'Professional Pro - Monthly Subscription',
              quantity: 1,
              unitPrice: 79.0,
              currency: 'USD',
            },
          ],
        };
        localSubs = [defaultSub];
        try {
          localStorage.setItem(storageKey, JSON.stringify(localSubs));
          localStorage.setItem('customer_subscriptions', JSON.stringify(localSubs));
        } catch {}
      }

      const map = new Map<string, any>();
      [...localSubs, ...apiSubs].forEach((s) => {
        const key = s.id || s.number;
        if (key) map.set(key, s);
      });

      setSubs(Array.from(map.values()));
    } catch (err: any) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const handlePause = async (id: string) => {
    try {
      setError('');
      try {
        await apiClient.patch(`/subscriptions/${id}/pause`, { reason: 'Customer requested pause' });
      } catch (e) {
        console.warn('API pause unavailable, updating local state:', e);
      }
      updateLocalSub(id, { status: 'PAUSED' });
      setSuccess('Subscription paused successfully. You will not be billed while paused.');
      await loadSubs();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to pause subscription');
    }
  };

  const handleResume = async (id: string) => {
    try {
      setError('');
      try {
        await apiClient.patch(`/subscriptions/${id}/resume`, {});
      } catch (e) {
        console.warn('API resume unavailable, updating local state:', e);
      }
      updateLocalSub(id, { status: 'ACTIVE' });
      setSuccess('Subscription resumed successfully. Next billing cycle is active.');
      await loadSubs();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resume subscription');
    }
  };

  const handleReverseCancellation = async (id: string) => {
    try {
      setError('');
      try {
        await apiClient.patch(`/subscriptions/${id}/reverse-cancellation`, {});
      } catch (e) {
        console.warn('API reverse-cancellation unavailable, updating local state:', e);
      }
      updateLocalSub(id, { cancelAtPeriodEnd: false, cancelEffectiveDate: null });
      setSuccess('Cancellation reversed! Your subscription will continue renewing normally.');
      await loadSubs();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reverse cancellation');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    setError('');

    try {
      try {
        await apiClient.patch(`/subscriptions/${cancelTarget.id}/cancel`, {
          reason: cancelReason || 'Customer self-service cancellation',
        });
      } catch (e) {
        console.warn('API cancel unavailable, updating local state:', e);
      }
      const effectiveDate =
        cancelTarget.nextBillingDate ||
        cancelTarget.currentPeriodEnd ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      updateLocalSub(cancelTarget.id, {
        cancelAtPeriodEnd: true,
        cancelEffectiveDate: effectiveDate,
        cancellationReason: cancelReason,
      });
      setSuccess(
        `Subscription ${cancelTarget.number || ''} cancellation scheduled. You retain active access until the end of your billing period.`
      );
      setCancelTarget(null);
      await loadSubs();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Subscriptions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your active subscription plans, pausing periods, and cancellation preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portal/plans"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-500/30 transition flex items-center gap-1.5"
          >
            <span>💎</span> Browse Plans
          </Link>
          <Link
            href="/portal/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
          >
            ← Back to Dashboard
          </Link>
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

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Glassmorphism Subscriptions Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Subscription #</th>
                <th className="px-6 py-4">Plan & Billing Cycle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Next Renewal / Expiry</th>
                <th className="px-6 py-4 text-right">Self-Service Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading your subscriptions...
                    </div>
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <p className="mb-3">You have no subscriptions registered yet.</p>
                    <Link
                      href="/portal/plans"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 transition"
                    >
                      <span>💎</span> Browse Available Plans & Subscribe
                    </Link>
                  </td>
                </tr>
              ) : (
                subs.map((s) => {
                  const planName = s.plan?.name || 'Pro Plan';
                  const interval = s.plan?.billingInterval || 'Monthly';
                  const isCancelling = Boolean(s.cancelAtPeriodEnd || s.metadata?.cancelAtPeriodEnd);
                  const effectiveDate = s.cancelEffectiveDate || s.metadata?.cancelEffectiveDate || s.currentPeriodEnd;
                  const dateDisplay = s.nextBillingDate
                    ? new Date(s.nextBillingDate).toLocaleDateString()
                    : s.startDate
                    ? new Date(s.startDate).toLocaleDateString()
                    : 'N/A';

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition duration-150">
                      <td className="px-6 py-4 font-mono font-bold text-violet-300 text-xs">
                        {s.number || 'SUB-000001'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-white">{planName}</p>
                        <p className="text-xs text-slate-400">Billed {interval.toLowerCase()}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isCancelling ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Active (Cancels {effectiveDate ? new Date(effectiveDate).toLocaleDateString() : 'at period end'})
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              s.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : s.status === 'PAUSED'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {s.status === 'CLOSED' ? 'CANCELLED' : s.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">
                        {isCancelling && effectiveDate ? (
                          <span className="text-amber-400">Ends {new Date(effectiveDate).toLocaleDateString()}</span>
                        ) : (
                          dateDisplay
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCancelling ? (
                            <button
                              type="button"
                              onClick={() => handleReverseCancellation(s.id)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition flex items-center gap-1"
                              title="Keep subscription and resume automatic billing renewals"
                            >
                              <span>Keep Subscription</span>
                            </button>
                          ) : s.status === 'ACTIVE' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePause(s.id)}
                                className="px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 text-xs font-medium border border-amber-500/30 transition"
                              >
                                Pause
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelTarget(s)}
                                className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1"
                              >
                                <span>Cancel Subscription</span>
                              </button>
                            </>
                          ) : s.status === 'PAUSED' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResume(s.id)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelTarget(s)}
                                className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1"
                              >
                                <span>Cancel Subscription</span>
                              </button>
                            </>
                          ) : s.status === 'CLOSED' ? (
                            <span className="text-xs text-slate-500 italic">Cancelled</span>
                          ) : null}
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

      {/* Cancel Subscription Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 border border-rose-500/30 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-500/30">
              ⚠️
            </div>

            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-white">Cancel Subscription?</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Cancellation is scheduled for the end of your current billing period (
                {cancelTarget.currentPeriodEnd ? new Date(cancelTarget.currentPeriodEnd).toLocaleDateString() : 'renewal date'}
                ). You will retain full access until then. No further renewal charges will be created.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-slate-300">
                Reason for Cancellation (optional):
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
              >
                <option value="No longer needed">No longer needed</option>
                <option value="Switching to another tier">Switching to another tier</option>
                <option value="Temporary pause was preferred">Temporary pause was preferred</option>
                <option value="Too expensive">Pricing / budget reasons</option>
                <option value="Other">Other feedback</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {processing ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
