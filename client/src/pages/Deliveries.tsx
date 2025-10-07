
// This file shows the Deliveries page.
// In simple English:
// - Lets you view, create, and manage product deliveries and see delivery details.
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { deliveriesApi } from '@/lib/api/deliveries.api';
import { useRealtime } from '@/hooks/useRealtime';
import DeliveryForm from '@/features/deliveries/DeliveryForm';
import DeliveryDetailsDrawer from '@/features/deliveries/DeliveryDetailsDrawer';

export default function DeliveriesPage() {
  const [rows, setRows] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ q?: string; status?: string }>(() => ({}));

  const fetchPage = () => {
    setLoading(true);
    deliveriesApi.list({ params: { page, limit: 20, ...filters } } as any).then((res) => {
      const d = res.data.data || res.data;
      setRows(d.items || d);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(); }, [page, filters]);

  useRealtime((s) => {
    s.on('delivery:created', fetchPage);
    s.on('delivery:updated', fetchPage);
    s.on('delivery:status', fetchPage);
  });

  const changeStatus = async (id: string, status: 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'returned') => {
    if (updatingId) return;
    // quick confirm for destructive statuses
    if ((status === 'cancelled' || status === 'returned') && !window.confirm(`Mark this delivery as ${status.replace('_', ' ')}?`)) {
      return;
    }
    try {
      setUpdatingId(id);
      await deliveriesApi.updateStatus(id, status);
      fetchPage();
    } finally {
      setUpdatingId(null);
    }
  };

  const statusClass = (s: string) => {
    switch (s) {
      case 'scheduled': return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      case 'in_transit': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'completed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'returned': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'cancelled': return 'bg-rose-500/20 text-rose-300 border-rose-400/30';
      default: return 'bg-white/10 text-gray-300 border-white/10';
    }
  };

  const headerStats = useMemo(() => {
    const counts = rows.reduce((acc: Record<string, number>, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    return [
      { key: 'scheduled', label: 'Scheduled', val: counts['scheduled'] || 0 },
      { key: 'in_transit', label: 'In Transit', val: counts['in_transit'] || 0 },
      { key: 'completed', label: 'Completed', val: counts['completed'] || 0 },
    ];
  }, [rows]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Deliveries</h1>
            <p className="text-gray-400">Plan, track and complete deliveries</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-yellow-300 to-amber-300 text-black hover:shadow-[0_6px_24px_-6px_rgba(234,179,8,0.6)]">
            New Delivery
          </button>
        </div>

        {/* Quick stats (current page) */}
        <div className="flex flex-wrap gap-3">
          {headerStats.map((s) => (
            <div key={s.key} className={`px-3 py-2 rounded-xl border ${statusClass(s.key)} text-sm`}>{s.label}: <span className="font-semibold">{s.val}</span></div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              className="pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              placeholder="Search delivery/driver/vehicle"
              value={filters.q || ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
          </div>
          <select
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 vz-select"
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {(filters.q || filters.status) && (
            <button
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
              onClick={() => setFilters({})}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="mt-6 grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-10 text-center opacity-70 border border-dashed border-white/10 rounded-2xl">No deliveries yet. Click "New Delivery" to create one.</div>
          ) : null}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-300 bg-white/5">
                  <th className="py-3 pl-4 pr-4">Delivery No</th>
                  <th className="py-3 pr-4">Vehicle</th>
                  <th className="py-3 pr-4">Driver</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Scheduled</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d._id} className="border-t border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setOpenId(d._id)}>
                    <td className="py-3 pl-4 pr-4 font-medium">{d.deliveryNo}</td>
                    <td className="py-3 pr-4">{d.lorryDetails?.vehicleNo}</td>
                    <td className="py-3 pr-4">{d.lorryDetails?.driverName}</td>
                    <td className="py-3 pr-4 capitalize">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass(d.status)}`}>
                        {d.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : '-'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        {d.status === 'scheduled' && (
                          <button
                            className="px-3 py-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-xs disabled:opacity-50"
                            onClick={(e) => { e.stopPropagation(); changeStatus(d._id, 'in_transit'); }}
                            disabled={updatingId === d._id}
                          >
                            Start
                          </button>
                        )}
                        {d.status === 'in_transit' && (
                          <>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs disabled:opacity-50"
                              onClick={(e) => { e.stopPropagation(); changeStatus(d._id, 'completed'); }}
                              disabled={updatingId === d._id}
                            >
                              Complete
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs disabled:opacity-50"
                              onClick={(e) => { e.stopPropagation(); changeStatus(d._id, 'returned'); }}
                              disabled={updatingId === d._id}
                            >
                              Return
                            </button>
                          </>
                        )}
                        {(d.status === 'scheduled' || d.status === 'in_transit') && (
                          <button
                            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs disabled:opacity-50"
                            onClick={(e) => { e.stopPropagation(); changeStatus(d._id, 'cancelled'); }}
                            disabled={updatingId === d._id}
                          >
                            Cancel
                          </button>
                        )}
                        {['completed', 'cancelled', 'returned'].includes(d.status) && (
                          <span className="opacity-50 text-xs">—</span>
                        )}
                      </div>
                    </td>
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
        </div>
      )}
      <DeliveryForm open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchPage} />
      <DeliveryDetailsDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppLayout>
  );
}
