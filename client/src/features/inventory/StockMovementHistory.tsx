import React, { useCallback, useEffect, useState } from "react";
import reportsApi from '@/lib/api/reports.api';
import { usersApi } from '@/lib/api/users.api';
import { useRealtime } from '@/hooks/useRealtime';

interface MovementRow {
  _id: string;
  product?: { name?: { en?: string }; sku?: string } | string;
  type: 'add' | 'remove' | 'set' | 'increase' | 'decrease' | string;
  quantity: number;
  reason?: string;
  createdAt: string;
  performedBy?: string; // user id
}

export const StockMovementHistory: React.FC = () => {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsApi.stockMovements({ limit: 100 });
      // Expected shape from backend: { success, data: { movements: [...] } }
      const list: MovementRow[] = (res?.data?.movements || []).map((m: any) => ({
        _id: m._id,
        product: m.product,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        createdAt: m.createdAt,
        performedBy: m.performedBy || m.user || m.createdBy, // fallbacks
      }));
      // Collect unique user ids to resolve names
      const ids = Array.from(new Set(list.map(m => m.performedBy).filter(Boolean)));
      if (ids.length) {
        try {
          // Fetch first page of users (assumes small user base); could implement bulk endpoint later
          const resp = await usersApi.list({ params: { limit: 200 } });
          const arr = (resp.data?.data?.items) || resp.data?.items || resp.data?.data || resp.data || [];
          const map: Record<string,string> = {};
          for (const u of arr) {
            map[u._id] = u.username || [u.firstName,u.lastName].filter(Boolean).join(' ') || 'user';
          }
          setUserMap(map);
        } catch {
          // ignore user loading errors
        }
      }
      setRows(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh on inventory related realtime events
  useRealtime((socket) => {
    socket.on('inventory.updated', load);
    socket.on('inventory.low_stock', load);
  });

  const formatDate = (iso: string) => {
    try { return new Date(iso).toISOString().slice(0,16).replace('T',' '); } catch { return iso; }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#F8F8F8]">Stock Movement History</h2>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1 rounded-lg text-sm border border-white/10 bg-white/10 hover:bg-white/20 text-[#F8F8F8]/80 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-white/10">
              <th className="px-4 py-2 text-[#F8F8F8]/80">Date</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Product</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">SKU</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Type</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Quantity</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">Reason</th>
              <th className="px-4 py-2 text-[#F8F8F8]/80">User</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-red-400">{error}</td>
              </tr>
            )}
            {!error && rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[#F8F8F8]/60">No movements found</td>
              </tr>
            )}
            {!error && loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[#F8F8F8]/60 animate-pulse">Loading…</td>
              </tr>
            )}
            {rows.map((m) => {
              const productName = typeof m.product === 'string' ? m.product : (m.product as any)?.name?.en || '—';
              const sku = typeof m.product === 'string' ? '' : (m.product as any)?.sku || '';
              const displayType = (m.type === 'add') ? 'increase' : (m.type === 'remove') ? 'decrease' : m.type;
              const userName = m.performedBy ? userMap[m.performedBy] || '—' : '—';
              return (
                <tr key={m._id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-2 text-[#F8F8F8]/70 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-2 text-[#F8F8F8] max-w-[220px] truncate">{productName}</td>
                  <td className="px-4 py-2 text-[#F8F8F8]/70">{sku}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${displayType === 'increase' ? 'bg-green-500/20 text-green-400' : displayType === 'decrease' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{displayType}</span>
                  </td>
                  <td className="px-4 py-2 text-[#F8F8F8]">{m.quantity}</td>
                  <td className="px-4 py-2 text-[#F8F8F8]/70 max-w-[240px] truncate" title={m.reason}>{m.reason || '—'}</td>
                  <td className="px-4 py-2 text-[#F8F8F8]/70">{userName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
