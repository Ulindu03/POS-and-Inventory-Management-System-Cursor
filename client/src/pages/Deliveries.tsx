import { useEffect, useState } from 'react';
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

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Deliveries</h1>
        <button onClick={() => setShowCreate(true)} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">New Delivery</button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="px-3 py-2 rounded bg-white/10"
          placeholder="Search delivery/driver/vehicle"
          value={filters.q || ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          className="px-3 py-2 rounded bg-white/10"
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
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-6 text-center opacity-70">No deliveries yet. Click "New Delivery" to create one.</div>
          ) : null}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-4">Delivery No</th>
                <th className="py-2 pr-4">Vehicle</th>
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Scheduled</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d._id} className="border-t border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setOpenId(d._id)}>
                  <td className="py-2 pr-4">{d.deliveryNo}</td>
                  <td className="py-2 pr-4">{d.lorryDetails?.vehicleNo}</td>
                  <td className="py-2 pr-4">{d.lorryDetails?.driverName}</td>
                  <td className="py-2 pr-4 capitalize">{d.status?.replace('_', ' ')}</td>
                  <td className="py-2 pr-4">{d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex justify-end gap-2">
                      {d.status === 'scheduled' && (
                        <button
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
                          onClick={() => changeStatus(d._id, 'in_transit')}
                          disabled={updatingId === d._id}
                        >
                          Start
                        </button>
                      )}
                      {d.status === 'in_transit' && (
                        <>
                          <button
                            className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50"
                            onClick={() => changeStatus(d._id, 'completed')}
                            disabled={updatingId === d._id}
                          >
                            Complete
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
                            onClick={() => changeStatus(d._id, 'returned')}
                            disabled={updatingId === d._id}
                          >
                            Return
                          </button>
                        </>
                      )}
                      {(d.status === 'scheduled' || d.status === 'in_transit') && (
                        <button
                          className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 disabled:opacity-50"
                          onClick={() => changeStatus(d._id, 'cancelled')}
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
            <div className="mt-3 flex items-center gap-2">
              <button className="px-3 py-1 rounded bg-white/10 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <div className="opacity-70">Page {page}</div>
              <button className="px-3 py-1 rounded bg-white/10" onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
        </div>
      )}
  <DeliveryForm open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchPage} />
  <DeliveryDetailsDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppLayout>
  );
}
