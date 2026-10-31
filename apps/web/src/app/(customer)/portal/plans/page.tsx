'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function CustomerPlansCataloguePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [intervalTab, setIntervalTab] = useState<'ALL' | 'MONTHLY' | 'YEARLY'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Checkout Modal State
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<any | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<any>('/plans');
      setPlans(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) {
      console.error('Failed to load catalogue plans', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load available plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!agreeTerms) {
      setCheckoutError('You must agree to the recurring billing subscription terms.');
      return;
    }

    setCheckoutError('');
    setPurchasing(true);

    try {
      const res = await apiClient.post<any>('/subscriptions/purchase', {
        planId: selectedPlan.id,
        paymentMethod,
        notes: `Customer purchased ${selectedPlan.name} via portal checkout`,
      });

      setPurchaseResult(res);
      setSuccess(`Subscription successfully activated! Invoice #${res?.invoice?.number || ''} generated.`);
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.message || err?.message || 'Checkout failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (intervalTab === 'ALL') return true;
    return p.billingInterval === intervalTab;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Subscription Catalogue
            </span>
            <span className="text-xs text-slate-400">• Official Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Choose Your Subscription Plan
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Select the tier that fits your business needs. Upgrade, pause, or cancel at any time with automated billing protection.
          </p>
        </div>

        {/* Interval Switcher */}
        <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10 self-start sm:self-auto">
          {(['ALL', 'MONTHLY', 'YEARLY'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setIntervalTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                intervalTab === tab
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All Frequencies' : tab === 'MONTHLY' ? 'Monthly Billing' : 'Annual Billing (Save ~15%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Global Notifications */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-base">✓</span>
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="glass-card p-8 rounded-3xl animate-pulse space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10" />
              <div className="w-2/3 h-6 rounded-lg bg-white/10" />
              <div className="w-1/2 h-10 rounded-lg bg-white/10" />
              <div className="w-full h-24 rounded-lg bg-white/5" />
              <div className="w-full h-10 rounded-xl bg-white/10" />
            </div>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center border border-dashed border-white/10 space-y-3">
          <span className="text-4xl">📦</span>
          <h3 className="text-base font-bold text-white">No Subscription Plans Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no active public plans matching this frequency filter. Check back soon or contact support for tailored enterprise access.
          </p>
          <button
            type="button"
            onClick={fetchPlans}
            className="mt-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
          >
            Refresh Plans
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan, idx) => {
            const isFeatured = idx === 1 || plan.name?.toLowerCase().includes('pro');
            const displayPrice = Number(plan.price || 0).toFixed(2);
            const intervalLabel = plan.billingInterval?.toLowerCase();

            return (
              <div
                key={plan.id}
                className={`glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between relative transition duration-300 hover:scale-[1.01] ${
                  isFeatured
                    ? 'border-violet-500/40 bg-gradient-to-b from-[#10142b] to-[#090d1e] shadow-xl shadow-violet-600/10 ring-1 ring-violet-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Popular Pill */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/40 border border-violet-400/30">
                      Most Popular Tier
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-300 flex items-center justify-center text-2xl border border-violet-500/30">
                      {isFeatured ? '👑' : '💎'}
                    </div>
                    {plan.trialDays > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                        {plan.trialDays}-day free trial
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px] leading-relaxed">
                    {plan.description || 'Full platform subscription with automated recurrent renewals and support.'}
                  </p>

                  {/* Price Header */}
                  <div className="mt-6 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {plan.intervalCount > 1 ? `${plan.intervalCount} ` : ''}{intervalLabel}
                    </span>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2.5 mb-8 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      <span>Automated recurring {intervalLabel} renewals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      <span>Itemized invoices & downloadable PDF receipts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      <span>{plan.allowPause ? 'Pause & resume flexibility included' : 'Continuous priority uptime'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">✓</span>
                      <span>Zero-friction cancellation at period end</span>
                    </div>
                  </div>
                </div>

                {/* Subscribe Action */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan);
                    setCheckoutError('');
                    setAgreeTerms(false);
                    setPurchaseResult(null);
                  }}
                  className={`w-full py-3 rounded-2xl text-xs font-bold text-center transition ${
                    isFeatured
                      ? 'btn-neon shadow-lg shadow-violet-600/40'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  Choose {plan.name} →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout & Purchase Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {purchaseResult ? (
              // Purchase Success Screen
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-500/30">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-white">Purchase Confirmed!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Your subscription to <strong className="text-violet-300">{selectedPlan.name}</strong> is now active.
                </p>

                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subscription #:</span>
                    <span className="font-mono font-bold text-violet-300">{purchaseResult.subscription?.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initial Invoice #:</span>
                    <span className="font-mono text-white">{purchaseResult.invoice?.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Settled:</span>
                    <span className="font-bold text-emerald-400">${Number(selectedPlan.price || 0).toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-semibold">ACTIVE</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/portal/subscriptions"
                    className="flex-1 py-2.5 rounded-xl btn-neon text-xs font-bold text-center"
                  >
                    View My Subscriptions →
                  </Link>
                  <Link
                    href="/portal/dashboard"
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold text-center border border-white/10 transition"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              // Checkout Order Review Screen
              <>
                <div className="flex items-start justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white">Review & Complete Purchase</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Authoritative order summary and recurring billing terms.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {checkoutError && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{checkoutError}</span>
                  </div>
                )}

                <form onSubmit={handleConfirmPurchase} className="mt-5 space-y-4">
                  {/* Itemized Order Breakdown */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedPlan.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          Every {selectedPlan.intervalCount || 1} {selectedPlan.billingInterval?.toLowerCase()}
                        </p>
                      </div>
                      <span className="text-base font-extrabold text-white">
                        ${Number(selectedPlan.price || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-white/5 pt-2 flex justify-between text-xs text-slate-400">
                      <span>Estimated Taxes (Included/Jurisdictional):</span>
                      <span>$0.00</span>
                    </div>

                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-extrabold text-white">
                      <span>Total Due Today:</span>
                      <span className="text-emerald-400">${Number(selectedPlan.price || 0).toFixed(2)} {selectedPlan.currency || 'USD'}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'CREDIT_CARD', label: 'Credit Card', icon: '💳' },
                        { id: 'BANK_TRANSFER', label: 'Bank Wire / ACH', icon: '🏦' },
                        { id: 'STRIPE', label: 'Stripe Pay', icon: '⚡' },
                      ].map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                            paymentMethod === pm.id
                              ? 'bg-violet-600/25 border-violet-500 text-white shadow-md shadow-violet-600/20'
                              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{pm.icon}</span>
                          <span className="text-[11px] font-semibold">{pm.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terms Acceptance */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded bg-slate-900 border-white/20 text-violet-600 focus:ring-0"
                      />
                      <span>
                        I authorize Brightloop to recurringly charge <strong>${Number(selectedPlan.price || 0).toFixed(2)}</strong> at the end of each billing cycle until I cancel. Cancellations take effect at the period end.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={purchasing || !agreeTerms}
                      className="btn-neon px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {purchasing ? 'Processing Subscription...' : `Confirm & Subscribe ($${Number(selectedPlan.price || 0).toFixed(2)}) →`}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
