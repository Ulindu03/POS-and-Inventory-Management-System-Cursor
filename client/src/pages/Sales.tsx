
// This file shows the Sales page.
// In simple English:
// - Lets you view a list of sales, including invoice numbers, totals, and dates.
import { AppLayout } from '@/components/common/Layout/Layout';
import { useEffect, useState } from 'react';
import { salesApi } from '@/lib/api/sales.api';
import { formatLKR } from '@/lib/utils/currency';

const Sales = () => {
  const [rows, setRows] = useState<Array<{ _id: string; invoiceNo: string; total: number; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await salesApi.list();
        setRows(res.data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-4">Sales</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-2">Invoice</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-white/10">
                  <td className="px-4 py-2">{r.invoiceNo}</td>
                  <td className="px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{formatLKR(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Sales;


