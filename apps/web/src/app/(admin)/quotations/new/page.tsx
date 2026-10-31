'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [lines, setLines] = useState<any[]>([
    { productId: '', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [c, p] = await Promise.all([
          apiClient.get<any>('/customers'),
          apiClient.get<any>('/products'),
        ]);
        setCustomers(c.data || []);
        setProducts(p.data || []);
        if (c.data?.length) setCustomerId(c.data[0].id);
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    }
    load();
  }, []);

  const handleProductSelect = (index: number, pId: string) => {
    const selected = products.find((p) => p.id === pId);
    const updated = [...lines];
    updated[index].productId = pId;
    updated[index].description = selected?.name || '';
    updated[index].unitPrice = Number(selected?.salesPrice || 0);
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { productId: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const calculateSubtotal = () => {
    return lines.reduce((acc, l) => acc + (Number(l.quantity) * Number(l.unitPrice)), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validTo = new Date();
      validTo.setDate(validTo.getDate() + validDays);

      await apiClient.post('/quotations', {
        customerId,
        validTo,
        currency: 'USD',
        lines: lines.map((l) => ({
          productId: l.productId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      });

      router.push('/quotations');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Quotation</h1>
        <p className="text-sm text-slate-500 mt-1">Generate a proposal that can convert into an active subscription.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.firstName} {c.user?.lastName} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
            <input
              type="number"
              min={1}
              value={validDays}
              onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase">Quotation Line Items</label>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="w-1/3">
                  <select
                    value={line.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (${Number(p.salesPrice).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].description = e.target.value;
                      setLines(updated);
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].quantity = parseFloat(e.target.value) || 1;
                      setLines(updated);
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Qty"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                      setLines(updated);
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Price"
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="text-red-500 hover:text-red-700 text-xs px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
          <div className="text-sm font-semibold text-slate-700">
            Total Quotation Amount: <span className="text-lg font-bold text-slate-900">${calculateSubtotal().toFixed(2)}</span>
          </div>

          <div className="flex gap-3">
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
              {loading ? 'Creating...' : 'Create Quotation'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

