
// This file shows the Damages page.
// In simple English:
// - Lets you view and manage damaged products, add new damage records, and see reasons for damages.
import { useEffect, useMemo, useState } from 'react';
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

  const totalQty = useMemo(() => rows.reduce((s, d: any) => s + (d.items?.reduce((x: number, it: any) => x + (it.quantity || 0), 0) || 0), 0), [rows]);
  const totalCost = useMemo(() => rows.reduce((s, d: any) => s + (Number(d.totalCost || 0)), 0), [rows]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Damaged Items</h1>
            <p className="text-gray-400">Review and record product damages</p>
          </div>
          <div className="flex gap-2">
          <select className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 vz-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">All Reasons</option>
            <option value="broken">Broken</option>
            <option value="expired">Expired</option>
            <option value="defective">Defective</option>
            <option value="water_damage">Water Damage</option>
            <option value="crushed">Crushed</option>
            <option value="torn">Torn</option>
            <option value="other">Other</option>
          </select>
          <button onClick={() => setOpenQuick(true)} className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 text-black hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]">Record Damage</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-2 rounded-xl border bg-white/5 border-white/10 text-sm">Entries: <span className="font-semibold">{rows.length}</span></div>
          <div className="px-3 py-2 rounded-xl border bg-white/5 border-white/10 text-sm">Total Qty: <span className="font-semibold">{totalQty}</span></div>
          <div className="px-3 py-2 rounded-xl border bg-white/5 border-white/10 text-sm">Total Cost: <span className="font-semibold">Rs {totalCost.toLocaleString()}</span></div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden bg-white/5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-300 bg-white/5">
              <th className="py-3 pl-4 pr-4">Ref</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Reason</th>
              <th className="py-3 pr-4">Qty</th>
              <th className="py-3 pr-4">Cost</th>
              <th className="py-3 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d._id} className="border-t border-white/10 hover:bg-white/10 transition-colors">
                <td className="py-3 pl-4 pr-4 font-medium">{d.referenceNo}</td>
                <td className="py-3 pr-4">{d.type.replace('_',' ')}</td>
                <td className="py-3 pr-4 capitalize">{(d.items?.[0]?.reason || '').replace('_',' ')}</td>
                <td className="py-3 pr-4">{d.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0)}</td>
                <td className="py-3 pr-4">Rs {d.totalCost?.toLocaleString?.() || d.totalCost}</td>
                <td className="py-3 pr-4">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
        <div className="opacity-70">Page {page}</div>
        <button className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <QuickDamageModal open={openQuick} onClose={() => setOpenQuick(false)} />
    </AppLayout>
  );
}
