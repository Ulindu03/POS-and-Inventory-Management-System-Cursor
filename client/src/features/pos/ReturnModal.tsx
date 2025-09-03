import { useState } from 'react';
import { salesApi, PaymentMethod } from '@/lib/api/sales.api';

interface ReturnItem { product: string; quantity: number; amount: number }
interface Props {
  open: boolean;
  onClose: () => void;
  saleId: string;
  items: Array<{ product: string; name: string; price: number; qty: number }>
}

export const ReturnModal = ({ open, onClose, saleId, items }: Props) => {
  const [selected, setSelected] = useState<ReturnItem[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const toggle = (p: { product: string; price: number }) => {
    const idx = selected.findIndex((x) => x.product === p.product);
    if (idx >= 0) {
      const next = [...selected];
      next.splice(idx, 1);
      setSelected(next);
    } else {
      setSelected([...selected, { product: p.product, quantity: 1, amount: p.price }]);
    }
  };

  const total = selected.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8]">
        <div className="text-lg font-semibold mb-3">Return / Refund</div>
        <div className="space-y-2 max-h-60 overflow-auto mb-3">
          {items.map((i) => (
            <label key={i.product} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" onChange={() => toggle(i)} checked={!!selected.find((x) => x.product === i.product)} />
                <div>
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-xs opacity-80">Qty: {i.qty}</div>
                </div>
              </div>
              <div className="text-sm">LKR {i.price.toFixed(2)}</div>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {(['cash','card','digital'] as PaymentMethod[]).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`py-2 rounded-xl ${method===m ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>{m.toUpperCase()}</button>
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="opacity-80">Refund Total</div>
          <div className="font-semibold">LKR {total.toFixed(2)}</div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Cancel</button>
          <button
            disabled={!selected.length || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await salesApi.refund(saleId, { items: selected, method });
                onClose();
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            {loading ? 'Processing...' : 'Refund Selected'}
          </button>
        </div>
      </div>
    </div>
  );
};
