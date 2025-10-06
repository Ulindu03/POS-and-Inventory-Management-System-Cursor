import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatLKR } from '@/lib/utils/currency';
import { Minus, Plus, Trash2 } from 'lucide-react';

export const Cart = ({ onPay, onClear, onDamage, onHold }: { onPay?: () => void; onClear?: () => void; onDamage?: () => void; onHold?: () => void }) => {
  const { items, inc, dec, remove, subtotal, tax, total, autoDiscount, totalDiscount } = useCartStore();
  const promoSavings = autoDiscount();
  const couponSavings = Math.max(0, totalDiscount() - promoSavings);
  const totalAmount = total();

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="p-4 border-b border-white/10 font-semibold shrink-0">Cart</div>
      <div className="p-4 space-y-3 overflow-auto min-h-0">
        {items.length === 0 && <div className="opacity-70">No items yet</div>}
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[#F8F8F8]">{i.name}</div>
              <div className="text-xs opacity-80 space-y-0.5">
                {i.basePrice && i.basePrice > i.price ? (
                  <>
                    <span className="line-through text-white/40 block">{formatLKR(i.basePrice)}</span>
                    <span className="text-emerald-300 font-semibold block">{formatLKR(i.price)}</span>
                    <span>
                      × {i.qty} ={' '}
                      <span className="font-medium text-[#F8F8F8]">{formatLKR(i.price * i.qty)}</span>
                    </span>
                    {i.discountAmount && i.discountAmount > 0 ? (
                      <span className="block text-emerald-300">Saving {formatLKR(i.discountAmount * i.qty)}</span>
                    ) : null}
                  </>
                ) : (
                  <span>
                    {formatLKR(i.price)} x {i.qty} ={' '}
                    <span className="font-medium text-[#F8F8F8]">{formatLKR(i.price * i.qty)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => dec(i.id)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-8 text-center">{i.qty}</div>
              <button onClick={() => inc(i.id)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => remove(i.id)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
  <div className="mt-auto p-4 border-t border-white/10 space-y-2 shrink-0">
        <div className="flex justify-between text-sm opacity-90"><span>Subtotal</span><span>{formatLKR(subtotal())}</span></div>
        {promoSavings > 0 && (
          <div className="flex justify-between text-sm text-emerald-300">
            <span>Promo savings</span>
            <span>-{formatLKR(promoSavings)}</span>
          </div>
        )}
        {couponSavings > 0 && (
          <div className="flex justify-between text-sm text-emerald-200">
            <span>Coupon discount</span>
            <span>-{formatLKR(couponSavings)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm opacity-90"><span>Tax</span><span>{formatLKR(tax())}</span></div>
        <div className="flex justify-between font-semibold text-[#F8F8F8] pt-2 border-t border-white/10">
          <span>Total</span><span>{formatLKR(totalAmount)}</span>
        </div>
        <div className="space-y-2">
          <button
            disabled={!items.length || totalAmount <= 0}
            onClick={onPay}
            className="w-full py-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            Pay
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onClear} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Clear</button>
            <button onClick={onDamage} className="px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600">Damage</button>
            <button onClick={onHold} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Hold</button>
          </div>
        </div>
      </div>
    </div>
  );
};


