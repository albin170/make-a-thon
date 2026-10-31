'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Plan {
  id: string;
  name: string;
  description?: string;
  billingInterval: string;
  intervalCount: number;
  currency: string;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  products: Array<{ unitPrice: string | number; product?: { name: string } }>;
}

function planPrice(plan: Plan): number {
  return plan.products.reduce((sum, product) => sum + Number(product.unitPrice || 0), 0);
}

export default function CustomerPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [quantity, setQuantity] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await apiClient.get<{ data: Plan[] }>('/plans?status=ACTIVE&limit=100');
        setPlans(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        setError(err?.message || 'Unable to load available plans.');
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const buyPlan = async (plan: Plan) => {
    setBuyingPlanId(plan.id);
    setError('');
    try {
      await apiClient.post('/subscriptions/purchase', {
        planId: plan.id,
        quantity: quantity[plan.id] || plan.minQuantity || 1,
      });
      router.push('/portal/subscriptions');
    } catch (err: any) {
      setError(err?.message || 'Unable to purchase this plan.');
      setBuyingPlanId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Choose a Plan</h1>
          <p className="text-sm text-slate-400 mt-1">Select a plan to start your Brightloop subscription.</p>
        </div>
        <Link href="/portal/subscriptions" className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold border border-white/10">
          My Subscriptions
        </Link>
      </div>

      {error && <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold">{error}</div>}

      {loading ? (
        <div className="glass-card rounded-3xl p-12 text-center text-slate-400">Loading available plans...</div>
      ) : plans.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center text-slate-400">No plans are currently available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const selectedQuantity = quantity[plan.id] || plan.minQuantity || 1;
            const price = planPrice(plan) * selectedQuantity;
            return (
              <article key={plan.id} className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col gap-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-violet-300">{plan.billingInterval}</div>
                  <h2 className="mt-2 text-xl font-extrabold text-white">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-400 min-h-10">{plan.description || 'Flexible subscription plan with automated recurring billing.'}</p>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white">{plan.currency} {price.toFixed(2)}</span>
                  <span className="text-xs text-slate-400"> / billing period</span>
                </div>
                <label className="text-xs font-semibold text-slate-300">
                  Quantity
                  <input
                    type="number"
                    min={plan.minQuantity || 1}
                    max={plan.maxQuantity || undefined}
                    value={selectedQuantity}
                    onChange={(event) => setQuantity((current) => ({ ...current, [plan.id]: Number(event.target.value) || 1 }))}
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => buyPlan(plan)}
                  disabled={buyingPlanId !== null}
                  className="w-full py-3 rounded-xl btn-neon text-xs font-bold disabled:opacity-50"
                >
                  {buyingPlanId === plan.id ? 'Activating...' : 'Buy This Plan →'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
