import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { inventoryApi } from '@/lib/api/inventory.api';
import { createPurchaseOrder, sendPurchaseOrderEmail } from '@/lib/api/purchaseOrders.api';
import { X, Loader2 } from 'lucide-react';

interface LowItem {
  _id: string;
  product: { _id: string; name: { en: string }; sku: string; supplier?: { _id: string; name: string; email?: string }; price?: { cost?: number } };
  currentStock: number;
  minimumStock: number;
  stockStatus: string;
  suggestedReorder?: number;
}

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

// Minimal panel styling consistent with dark inventory UI
export const PurchaseOrderQuickCreate: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [items, setItems] = useState<LowItem[]>([]);
  const [selected, setSelected] = useState<Record<string,{ qty:number; cost:number }>>({});
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss popup after 3 seconds
  useEffect(() => {
    if (emailStatus) {
      const t = setTimeout(() => setEmailStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }, [emailStatus]);

  useEffect(() => { if (open) load(); else reset(); }, [open]);

  const reset = () => {
    setItems([]); setSelected({}); setSupplierId(null); setSubmitting(false); setError(null);
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await inventoryApi.lowStock();
      const rows: any[] = (res as any)?.data?.items || [];
      const mapped: LowItem[] = rows.map(r => ({
        _id: r.product?._id || r._id,
        product: {
          _id: r.product?._id || r._id,
          name: r.product?.name || { en: r.name || 'Unknown' },
          sku: r.product?.sku || r.sku,
          supplier: r.product?.supplier || r.supplier,
          price: r.product?.price || r.price
        },
        currentStock: r.currentStock ?? r.stock?.current ?? 0,
        minimumStock: r.minimumStock ?? r.stock?.minimum ?? 0,
        stockStatus: r.stockStatus || 'low',
        suggestedReorder: r.suggestedReorder ?? Math.max(1,(r.reorderPoint ?? 0) - (r.currentStock ?? 0))
      }));
      // Only low/out items
      setItems(mapped.filter(m => m.currentStock === 0 || m.currentStock <= m.minimumStock));
    } catch (e:any) { setError('Failed loading products'); } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!supplierId) return items; return items.filter(i => (i.product as any).supplier?._id === supplierId);
  }, [items, supplierId]);

  const toggle = (id: string, item: LowItem) => {
    setSelected(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
        if (Object.keys(copy).length === 0) setSupplierId(null);
      } else {
        const sup = (item.product as any).supplier?._id;
        if (!supplierId) setSupplierId(sup);
        // Use product cost (fallback 0)
        const unitCost = item.product.price?.cost ?? 0;
        copy[id] = { qty: item.suggestedReorder || 1, cost: unitCost };
      }
      return copy;
    });
  };

  const updateQty = (id:string, qty:number) => setSelected(p => ({ ...p, [id]: { ...(p[id]||{}), qty } }));

  const canSubmit = Object.keys(selected).length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return; setSubmitting(true); setError(null);
    try {
      const first = items.find(i => selected[i._id]);
      const sup = (first?.product as any)?.supplier?._id;
      if (!sup) throw new Error('Missing supplier');
      // Build items including totalCost per line
      const itemsList = Object.entries(selected).map(([pid, cfg]) => ({ product: pid, quantity: cfg.qty, unitCost: cfg.cost, totalCost: cfg.qty * cfg.cost }));
      const subtotal = itemsList.reduce((s,i)=>s + i.totalCost,0);
      const poPayload: any = {
        supplier: sup,
        items: itemsList,
        subtotal,
        tax: { vat:0, nbt:0 }, discount:0,
        total: subtotal,
        status: 'draft'
      };
      let created = await createPurchaseOrder(poPayload);
      // If backend returns duplicate key (status 409 handled via axios error), catch below and retry once
      if (created.success) {
        const emailRes = await sendPurchaseOrderEmail(created.data._id);
        if (emailRes?.success) {
          setEmailStatus({ kind: 'success', message: 'Email sent successfully' });
          try { (window as any).toast?.success?.('Purchase order emailed successfully'); } catch {}
          // Delay close so user sees popup
          setTimeout(() => { onCreated(); onClose(); }, 1400);
        } else {
          setEmailStatus({ kind: 'error', message: emailRes?.message || 'Failed to send email' });
          try { (window as any).toast?.error?.(emailRes?.message || 'Email send failed'); } catch {}
          // Keep panel open for user to adjust / retry
        }
      } else {
        setError('Failed creating PO');
      }
    } catch (e:any) {
      // Duplicate key retry logic
      if (e?.response?.status === 409 && /Duplicate value/.test(e?.response?.data?.message || '')) {
        try {
          // request a fresh PO number by not setting it (server will auto-generate next)
            const first = items.find(i => selected[i._id]);
            const sup = (first?.product as any)?.supplier?._id;
            const itemsList = Object.entries(selected).map(([pid, cfg]) => ({ product: pid, quantity: cfg.qty, unitCost: cfg.cost, totalCost: cfg.qty * cfg.cost }));
            const subtotal = itemsList.reduce((s,i)=>s + i.totalCost,0);
            const retryPayload: any = { supplier: sup, items: itemsList, subtotal, tax:{vat:0,nbt:0}, discount:0, total: subtotal, status:'draft' };
            const created2 = await createPurchaseOrder(retryPayload);
              if (created2.success) {
                const emailRes = await sendPurchaseOrderEmail(created2.data._id);
                if (emailRes?.success) {
                  setEmailStatus({ kind: 'success', message: 'Email sent successfully' });
                  try { (window as any).toast?.success?.('Purchase order emailed successfully'); } catch {}
                  setTimeout(() => { onCreated(); onClose(); }, 1400);
                } else {
                  setEmailStatus({ kind: 'error', message: emailRes?.message || 'Failed to send email' });
                  try { (window as any).toast?.error?.(emailRes?.message || 'Email send failed'); } catch {}
                }
                return;
              }
        } catch (retryErr:any) {
          const rmsg = retryErr?.response?.data?.message || retryErr?.message;
          setError(rmsg || 'Retry failed');
          setSubmitting(false);
          return;
        }
      }
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message;
      setError(msg || 'Submit failed');
    }
    finally { setSubmitting(false); }
  };

  const toastNode = emailStatus && typeof document !== 'undefined' ? createPortal(
    <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg text-sm font-medium shadow-lg border backdrop-blur
      ${emailStatus.kind==='success' ? 'bg-green-500/20 text-green-200 border-green-400/40' : 'bg-red-500/20 text-red-200 border-red-400/40'}`}
      role="alert">
      {emailStatus.message}
    </div>, document.body) : null;

  if (!open) return <>{toastNode}</>;
  const modalNode = typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[1200] flex items-start md:items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 shadow-xl relative" style={{ background:'#0e0e0e' }}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Close"><X className="w-5 h-5"/></button>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Create & Send Purchase Order</h2>
            <p className="text-sm text-gray-400">Select products below. All must share the same supplier. Quantities default to suggested reorder.</p>
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {loading && <div className="text-gray-400 text-sm">Loading...</div>}
            {!loading && filtered.map(it => {
              const checked = Boolean(selected[it._id]);
              // Ensure disabled is a strict boolean (previously could be string|null|boolean)
              const disabled: boolean = !!(supplierId && ( (it.product as any).supplier?._id !== supplierId ));
              const sup: any = (it.product as any).supplier;
              return (
                <div key={it._id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border text-sm ${checked? 'border-blue-400/50 bg-blue-500/10':'border-white/10 hover:border-white/20'} ${disabled? 'opacity-40 cursor-not-allowed':''}`}> 
                  <input type="checkbox" disabled={disabled} checked={checked} onChange={() => toggle(it._id, it)} className="accent-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{it.product.name.en}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{it.product.sku}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${it.stockStatus==='critical'?'bg-orange-500/30 text-orange-300': it.currentStock===0? 'bg-red-500/30 text-red-300':'bg-yellow-500/30 text-yellow-300'}`}>{it.currentStock===0? 'OUT': it.stockStatus.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                      <span>Stock: {it.currentStock} / Min {it.minimumStock}</span>
                      {sup?.name && <span className="text-gray-300">Supplier: <span className="text-white/90">{sup.name}</span>{sup.email && <span className="text-gray-400"> ({sup.email})</span>}</span>}
                    </div>
                  </div>
                  {checked && (
                    <div className="flex items-center gap-2">
                      <label htmlFor={`qty_${it._id}`} className="text-[11px] uppercase tracking-wide text-gray-300 select-none">Quantity</label>
                      <input
                        id={`qty_${it._id}`}
                        type="number"
                        min={1}
                        value={selected[it._id]?.qty || 1}
                        onChange={e=>updateQty(it._id, Math.max(1, Number(e.target.value)||1))}
                        className="w-20 bg-[#2a2a2a] border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && filtered.length===0 && <div className="text-xs text-gray-500">No items available.</div>}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <div className="text-xs text-gray-400">{supplierId? (() => {
              const anyItem = items.find(i => (i.product as any).supplier?._id === supplierId);
              const sup: any = anyItem && (anyItem.product as any).supplier;
              return sup ? `Supplier locked: ${sup.name}${sup.email ? ' ('+sup.email+')' : ''}` : `Supplier locked (${supplierId})`;
            })() :'Select first product to lock supplier'}</div>
            <div className="flex items-center gap-2">
              <Link
                to="/purchase-orders"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
                title="View created purchase orders"
                style={{ color: '#e3effe' }}
              >
                View Orders
              </Link>
              <button disabled={!canSubmit} onClick={submit} className="px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-purple-500/30 text-white border border-blue-400/40 disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-500/40 hover:to-purple-500/40">
                {submitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                {submitting? 'Sending...' : 'Send Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>, document.body) : null;
  return <>{modalNode}{toastNode}</>;
};
