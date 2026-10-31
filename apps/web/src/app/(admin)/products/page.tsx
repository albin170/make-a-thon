'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Variants</h1>
          <p className="text-sm text-slate-500 mt-1">Configurable products and variants with brand price adjustments (e.g. Odoo +560).</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Sales Price</th>
              <th className="px-6 py-3">Cost Price</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Variants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading products...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No products configured.</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600">{p.type}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">${Number(p.salesPrice).toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-600">${Number(p.costPrice).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {p.variants?.length ? (
                      <div className="space-y-1">
                        {p.variants.map((v: any) => (
                          <div key={v.id} className="inline-block bg-slate-100 rounded px-2 py-0.5 mr-1">
                            {v.name} (+${Number(v.priceAdjustment).toFixed(2)})
                          </div>
                        ))}
                      </div>
                    ) : (
                      'None'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

