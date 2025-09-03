import { useCartStore } from '@/store/cart.store';
import { formatLKR } from '@/lib/utils/currency';
import { useState } from 'react';
import { toast } from 'sonner';
import { salesApi, PaymentMethod } from '@/lib/api/sales.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (sale: { invoiceNo: string; id: string; method: 'cash' | 'card' | 'digital' }) => void;
}

export const PaymentModal = ({ open, onClose, onComplete }: Props) => {
  const total = useCartStore((s) => s.total());
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([]);
  const [promo, setPromo] = useState('');
  const setDiscount = useCartStore((s) => s.setDiscount);
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8]">
        <div className="text-lg font-semibold mb-3">Payment</div>
        <div className="opacity-80 mb-4">Amount due: <span className="font-semibold text-[#F8F8F8]">{formatLKR(total)}</span></div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => setMethod('cash')} className={`py-2 rounded-xl ${method==='cash' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Cash</button>
          <button onClick={() => setMethod('card')} className={`py-2 rounded-xl ${method==='card' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Card</button>
          <button onClick={() => setMethod('digital')} className={`py-2 rounded-xl ${method==='digital' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>Digital</button>
        </div>
        {/* Multi-payment adder */}
        <div className="flex gap-2 mb-3">
          <input type="number" min={0} placeholder="Amount" className="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 focus:outline-none" id="pay-amount" />
          <button
            onClick={() => {
              const input = document.getElementById('pay-amount') as HTMLInputElement | null;
              const amt = Number(input?.value || 0);
              if (!amt || amt <= 0) return;
              setPayments((prev) => [...prev, { method, amount: amt }]);
              if (input) input.value = '';
            }}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
          >Add</button>
        </div>
        {payments.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="text-sm opacity-80">Applied payments</div>
            {payments.map((p, idx) => (
              <div key={`${p.method}-${idx}-${p.amount}`} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-2 py-1">
                <div className="opacity-90">{p.method.toUpperCase()}</div>
                <div className="font-medium">{formatLKR(p.amount)}</div>
                <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="text-xs opacity-70 hover:opacity-100">Remove</button>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-1 border-t border-white/10">
              <span>Total paid</span>
              <span className="font-semibold">{formatLKR(payments.reduce((s, p) => s + p.amount, 0))}</span>
            </div>
          </div>
        )}
        {/* Promo code */}
        <div className="flex gap-2 mb-4">
          <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" className="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 focus:outline-none" />
          <button
            onClick={async () => {
              if (!promo) return;
              const res = await salesApi.validateDiscount({ code: promo, subtotal: useCartStore.getState().subtotal() });
              if (res.data.valid && res.data.amount != null) setDiscount(res.data.amount);
            }}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
          >Apply</button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Cancel</button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const paid = payments.length ? payments : [{ method, amount: total }];
                const res = await salesApi.create({
                  items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })),
                  discount,
                  payments: paid,
                  discountCode: promo || undefined,
                });
                const sale = res.data.sale; // salesApi.create returns { success, data: { sale } }
                onComplete({ invoiceNo: sale.invoiceNo, id: sale.id, method: paid[0].method as any });
                toast.success('Sale completed');
              } catch (err: any) {
                // Show friendly error when stock is insufficient or any other issue occurs
                const status = err?.response?.status;
                const msg = err?.response?.data?.message || err?.message || 'Failed to complete sale';
                if (status === 409) {
                  const data = err?.response?.data as any;
                  const pId = data?.data?.productId || data?.productId;
                  const avail = data?.data?.available ?? data?.available;
                  const name = items.find((i) => i.id === String(pId))?.name;
                  const msg409 = name ? `Insufficient stock for ${name}. Available: ${avail ?? 0}.` : 'Insufficient stock for one or more items.';
                  toast.error(msg409);
                } else {
                  toast.error(msg);
                }
                return; // keep modal open for correction
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


