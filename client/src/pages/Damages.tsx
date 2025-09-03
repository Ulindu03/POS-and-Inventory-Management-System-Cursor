import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { damagesApi } from '@/lib/api/damages.api';
import QuickDamageModal from '@/features/damage/QuickDamageModal';

export default function DamagesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState('');
  const [openQuick, setOpenQuick] = useState(false);

  const load = () => {
    damagesApi.list({ page, limit: 20, reason: reason || undefined }).then((r) => {
      const d = (r.data && (r.data.data || r.data)) || {};
      setRows(d.items || []);
    });
  };
  useEffect(() => { load(); }, [page, reason]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Damaged Items</h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 rounded bg-white/10" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">All Reasons</option>
            <option value="broken">Broken</option>
            <option value="expired">Expired</option>
            <option value="defective">Defective</option>
            <option value="water_damage">Water Damage</option>
            <option value="crushed">Crushed</option>
            <option value="torn">Torn</option>
            <option value="other">Other</option>
          </select>
          <button onClick={() => setOpenQuick(true)} className="px-3 py-2 rounded bg-white/10">Record Damage</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="py-2 pr-4">Ref</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4">Cost</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d._id} className="border-t border-white/10">
                <td className="py-2 pr-4">{d.referenceNo}</td>
                <td className="py-2 pr-4">{d.type}</td>
                <td className="py-2 pr-4">{(d.items?.[0]?.reason || '').replace('_',' ')}</td>
                <td className="py-2 pr-4">{d.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0)}</td>
                <td className="py-2 pr-4">Rs {d.totalCost?.toLocaleString?.() || d.totalCost}</td>
                <td className="py-2 pr-4">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className="px-3 py-1 rounded bg-white/10 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
        <div className="opacity-70">Page {page}</div>
        <button className="px-3 py-1 rounded bg-white/10" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <QuickDamageModal open={openQuick} onClose={() => setOpenQuick(false)} />
    </AppLayout>
  );
}
