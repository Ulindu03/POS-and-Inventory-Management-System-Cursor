import { useCartStore } from '@/store/cart.store';
import { formatLKR } from '@/lib/utils/currency';
import { useState } from 'react';
import { salesApi } from '@/lib/api/sales.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (sale: { invoiceNo: string; id: string; method: 'cash' | 'card' | 'digital' }) => void;
}

export const PaymentModal = ({ open, onClose, onComplete }: Props) => {
  const total = useCartStore((s) => s.total());
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const [method, setMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8]">
        <div className="text-lg font-semibold mb-3">Payment</div>
        <div className="opacity-80 mb-4">Amount due: <span className="font-semibold text-[#F8F8F8]">{formatLKR(total)}</span></div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => setMethod('cash')} className={`py-2 rounded-xl ${method==='cash' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Cash</button>
          <button onClick={() => setMethod('card')} className={`py-2 rounded-xl ${method==='card' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Card</button>
          <button onClick={() => setMethod('digital')} className={`py-2 rounded-xl ${method==='digital' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Digital</button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Cancel</button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await salesApi.create({
                  items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })),
                  discount,
                  payment: { method, amount: total },
                });
                onComplete({ invoiceNo: res.data.sale.invoiceNo, id: res.data.sale.id, method });
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};


