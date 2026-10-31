'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    type: 'SERVICE',
    salesPrice: '',
    costPrice: '',
    currency: 'USD',
    description: '',
    brandVariantName: 'Odoo Edition',
    brandVariantPrice: '560',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const salesPriceNum = parseFloat(form.salesPrice);
      const costPriceNum = form.costPrice ? parseFloat(form.costPrice) : salesPriceNum * 0.5;

      const newProduct: any = await apiClient.post('/products', {
        name: form.name.trim(),
        type: form.type,
        salesPrice: salesPriceNum,
        costPrice: costPriceNum,
        currency: form.currency,
        description: form.description?.trim(),
        status: 'ACTIVE',
      });

      // Optionally add variant (e.g., Odoo +560)
      if (form.brandVariantName && form.brandVariantPrice && newProduct?.id) {
        try {
          await apiClient.post(`/products/${newProduct.id}/variants`, {
            name: form.brandVariantName.trim(),
            brand: form.brandVariantName.trim(),
            priceAdjustment: parseFloat(form.brandVariantPrice),
          });
        } catch (vErr) {
          console.warn('Variant creation notice:', vErr);
        }
      }

      setSuccess(`Product "${form.name}" successfully added to catalog.`);
      setForm({
        name: '',
        type: 'SERVICE',
        salesPrice: '',
        costPrice: '',
        currency: 'USD',
        description: '',
        brandVariantName: 'Odoo Edition',
        brandVariantPrice: '560',
      });
      setShowAddModal(false);
      await fetchProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Products & Variants</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configurable catalog products and variants with explicit brand price adjustments (e.g. Odoo +$560).
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
            Total Products: {products.length}
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-neon px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
          >
            <span>+</span>
            <span>Add Product</span>
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

      {/* Glassmorphism Products Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-white/10">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Sales Price</th>
                <th className="px-6 py-4">Cost Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Configured Variants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                      Loading catalog products...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No products found. Click <strong>+ Add Product</strong> to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center font-bold text-sm border border-violet-500/25">
                          📦
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.description || 'Standard product specification'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white text-sm">
                      ${Number(p.salesPrice).toFixed(2)} <span className="text-[11px] text-slate-400 font-normal">{p.currency || 'USD'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      ${Number(p.costPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {p.variants?.length ? (
                        <div className="space-y-1">
                          {p.variants.map((v: any) => (
                            <span key={v.id} className="inline-block px-2 py-0.5 rounded bg-white/5 text-violet-300 border border-white/10 mr-1.5">
                              {v.name} (+${Number(v.priceAdjustment).toFixed(2)})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Base Edition</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Product</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure catalog product, base prices, and brand variants.</p>
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

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="e.g. Enterprise Cloud Subscription"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="SERVICE">SERVICE</option>
                    <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                    <option value="DIGITAL">DIGITAL</option>
                    <option value="PHYSICAL">PHYSICAL</option>
                  </select>
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
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Sales Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.salesPrice}
                    onChange={(e) => setForm({ ...form, salesPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="2000.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                    placeholder="1000.00"
                  />
                </div>
              </div>

              {/* Brand Variant Example from PDF (e.g. Odoo +560) */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-300">Configurable Variant (PDF Rule 3.3)</span>
                  <span className="text-[10px] text-slate-400">e.g. Brand Adjustment</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Brand / Variant Name</label>
                    <input
                      type="text"
                      value={form.brandVariantName}
                      onChange={(e) => setForm({ ...form, brandVariantName: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-white"
                      placeholder="Odoo Brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Price Adjustment ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.brandVariantPrice}
                      onChange={(e) => setForm({ ...form, brandVariantPrice: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-white"
                      placeholder="+560.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-white"
                  placeholder="Notes, service terms, and specifications"
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
                  {submitting ? 'Creating Product...' : 'Create Product →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
