import { useEffect, useState } from 'react';
import { formatLKR } from '@/lib/utils/currency';
import { productsApi } from '@/lib/api/products.api';

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
}

export const ProductHistoryModal = ({ productId, productName, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ purchasedQty: number; purchasedCost: number; soldQty: number; revenue: number } | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await productsApi.getHistory(productId, { limit: 100 });
        if (!mounted) return;
        setSummary(res.data.summary);
        setPurchases(res.data.purchases);
        setSales(res.data.sales);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [productId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">History - {productName}</div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Close</button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-6">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs opacity-70">Purchased Qty</div>
                  <div className="text-xl font-semibold">{summary.purchasedQty}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs opacity-70">Purchased Cost</div>
                  <div className="text-xl font-semibold">{formatLKR(summary.purchasedCost)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs opacity-70">Sold Qty</div>
                  <div className="text-xl font-semibold">{summary.soldQty}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs opacity-70">Revenue</div>
                  <div className="text-xl font-semibold">{formatLKR(summary.revenue)}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-semibold mb-2">Recent Purchases</div>
                <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-3 py-2">PO #</th>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Unit Cost</th>
                        <th className="text-right px-3 py-2">Line Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {purchases.map((p) => (
                        <tr key={`${p.poNumber}-${p.date}`}>
                          <td className="px-3 py-2">{p.poNumber}</td>
                          <td className="px-3 py-2">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right">{p.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatLKR(p.unitCost)}</td>
                          <td className="px-3 py-2 text-right">{formatLKR(p.lineCost)}</td>
                        </tr>
                      ))}
                      {purchases.length === 0 && (
                        <tr><td className="px-3 py-4 text-center opacity-70" colSpan={5}>No purchase records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Recent Sales</div>
                <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-3 py-2">Invoice #</th>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Unit Price</th>
                        <th className="text-right px-3 py-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {sales.map((s) => (
                        <tr key={`${s.invoiceNo}-${s.date}`}>
                          <td className="px-3 py-2">{s.invoiceNo}</td>
                          <td className="px-3 py-2">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right">{s.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatLKR(s.unitPrice)}</td>
                          <td className="px-3 py-2 text-right">{formatLKR(s.lineTotal)}</td>
                        </tr>
                      ))}
                      {sales.length === 0 && (
                        <tr><td className="px-3 py-4 text-center opacity-70" colSpan={5}>No sales records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


