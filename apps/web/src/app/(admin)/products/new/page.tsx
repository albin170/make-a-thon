'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    type: 'SERVICE',
    description: '',
    salesPrice: 99.00,
    costPrice: 50.00,
    currency: 'USD',
    notes: '',
  });
  const [variant, setVariant] = useState({
    name: '',
    priceAdjustment: 0,
    sku: '',
  });
  const [hasVariant, setHasVariant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const product = await apiClient.post<any>('/products', form);
      if (hasVariant && variant.name) {
        await apiClient.post(`/products/${product.id}/variants`, variant);
      }
      router.push('/products');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Product</h1>
        <p className="text-sm text-slate-500 mt-1">Add a new service or subscription offering with optional variants.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Enterprise Cloud Suite"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SERVICE">Service</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="DIGITAL">Digital</option>
              <option value="PHYSICAL">Physical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Currency</label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Sales Price</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.salesPrice}
              onChange={(e) => setForm({ ...form, salesPrice: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cost Price</label>
            <input
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Key product features and scope..."
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVariant}
              onChange={(e) => setHasVariant(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Add Brand Variant (e.g. Odoo brand pricing +$560)</span>
          </label>

          {hasVariant && (
            <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Variant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Odoo Integration"
                  value={variant.name}
                  onChange={(e) => setVariant({ ...variant, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Price Adjustment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="560.00"
                  value={variant.priceAdjustment}
                  onChange={(e) => setVariant({ ...variant, priceAdjustment: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">SKU</label>
                <input
                  type="text"
                  placeholder="ODOO-VAR-01"
                  value={variant.sku}
                  onChange={(e) => setVariant({ ...variant, sku: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

