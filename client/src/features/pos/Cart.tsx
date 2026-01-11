import { useCartStore } from '@/store/cart.store';
import { formatLKR } from '@/lib/utils/currency';
import { Minus, Plus, Trash2, ScanBarcode, X } from '@/lib/safe-lucide-react';
import { useState, useRef } from 'react';
import { productsApi } from '@/lib/api/products.api';
import { usePosStore } from '@/store/pos.store';
import { toast } from 'sonner';

interface Props {
  onPay?: () => void;
  onClear?: () => void;
  onDamage?: () => void;
  onHold?: () => void;
  onExchange?: () => void;
}

export const Cart = ({ onPay, onClear, onDamage, onHold, onExchange }: Props) => {
  const { items, inc, dec, remove, subtotal, tax, total, autoDiscount, totalDiscount, exchangeSlip, clearExchangeSlip, addItem } = useCartStore();
  const customerType = usePosStore((s) => s.customerType);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const promoSavings = autoDiscount();
  const couponSavings = Math.max(0, totalDiscount() - promoSavings);
  const totalAmount = total();
  const slipValue = exchangeSlip?.totalValue ?? 0;
  const amountDue = Math.max(totalAmount - slipValue, 0);
  const slipOverage = Math.max(slipValue - totalAmount, 0);
  const expiryLabel = exchangeSlip?.expiryDate && !Number.isNaN(Date.parse(exchangeSlip.expiryDate))
    ? new Date(exchangeSlip.expiryDate).toLocaleDateString()
    : null;

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || loading) return;

    setLoading(true);
    try {
      const res = await productsApi.getByBarcode(barcode.trim());
      const product: any = res.data.product;
      
      if (!product) {
        toast.error('Product not found', { description: `Barcode: ${barcode}` });
        setBarcode('');
        inputRef.current?.focus();
        return;
      }

      const pricing = product.pricing as any;
      const retailTier = pricing?.retail;
      const wholesaleTier = pricing?.wholesale;
      const wholesaleAvailable = Boolean(wholesaleTier?.configured && wholesaleTier.base > 0);
      const prefersWholesale = customerType === 'wholesale' && wholesaleAvailable;
      const activeTier = prefersWholesale ? wholesaleTier : retailTier ?? wholesaleTier;
      const priceTier: 'retail' | 'wholesale' = prefersWholesale && activeTier ? 'wholesale' : 'retail';
      const basePrice = activeTier?.base ?? (priceTier === 'wholesale' ? wholesaleTier?.base : retailTier?.base) ?? product.price?.retail ?? 0;
      const finalPrice = activeTier?.final ?? basePrice;
      const discountAmount = Math.max(0, activeTier?.discountAmount ?? 0);
      const discountType = activeTier?.discountType ?? null;
      const discountValue = activeTier?.discountValue ?? null;

      addItem({
        id: product._id || product.id,
        name: product.name.en,
        price: finalPrice,
        basePrice,
        barcode: barcode.trim(),
        discountAmount,
        discountType: discountType ?? undefined,
        discountValue: discountValue ?? undefined,
        priceTier,
      });

      toast.success('Product added', { description: product.name.en });
      setBarcode('');
      setShowBarcodeInput(false);
      if (navigator.vibrate) navigator.vibrate(60);
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message;
      
      if (errorCode === 'BARCODE_ALREADY_SOLD') {
        toast.error('Barcode Already Sold', { 
          description: 'This item has already been sold and cannot be added again',
          duration: 4000
        });
      } else if (errorCode === 'BARCODE_RETURNED') {
        toast.error('Barcode Returned', { 
          description: 'This item was returned and cannot be sold again',
          duration: 4000
        });
      } else if (errorCode === 'BARCODE_DAMAGED') {
        toast.error('Barcode Damaged', { 
          description: 'This item is marked as damaged',
          duration: 4000
        });
      } else if (errorCode === 'BARCODE_WRITTEN_OFF') {
        toast.error('Barcode Written Off', { 
          description: 'This item has been written off from inventory',
          duration: 4000
        });
      } else if (errorMessage) {
        toast.error('Error adding product', { description: errorMessage });
      } else {
        toast.error('Error adding product', { description: 'Check barcode and try again' });
      }
      
      setBarcode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="p-4 border-b border-white/10 font-semibold shrink-0 flex items-center justify-between">
        <span>Cart</span>
        <button
          onClick={() => {
            setShowBarcodeInput(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          title="Add by barcode (manual)"
        >
          <ScanBarcode className="w-4 h-4" />
        </button>
      </div>

      {/* Manual Barcode Input Modal */}
      {showBarcodeInput && (
        <div className="p-3 border-b border-white/10 bg-blue-600/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enter Barcode</span>
            <button
              onClick={() => {
                setShowBarcodeInput(false);
                setBarcode('');
              }}
              className="p-1 rounded hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type or paste barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-[#F8F8F8] placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {loading ? '...' : 'Add'}
            </button>
          </form>
        </div>
      )}
  <div className="p-4 space-y-3 overflow-auto min-h-0 vz-scroll-gutter pr-fallback scrollbar-hide">
        {items.length === 0 && <div className="opacity-70">No items yet</div>}
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-[#F8F8F8]">{i.name}</div>
                {i.priceTier ? (
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      i.priceTier === 'wholesale'
                        ? 'border-emerald-400/60 text-emerald-200 bg-emerald-400/10'
                        : 'border-white/15 text-white/60 bg-white/5'
                    }`}
                  >
                    {i.priceTier === 'wholesale' ? 'Wholesale' : 'Retail'}
                  </span>
                ) : null}
              </div>
              <div className="text-xs opacity-80 space-y-0.5">
                {i.basePrice && i.basePrice > i.price ? (
                  <>
                    <span className="line-through text-white/40 block">{formatLKR(i.basePrice)}</span>
                    <span className="text-emerald-300 font-semibold block">{formatLKR(i.price)}</span>
                    <span>
                      × {i.qty} ={' '}
                      <span className="font-medium text-[#F8F8F8]">{formatLKR(i.price * i.qty)}</span>
                    </span>
                    {i.discountAmount && i.discountAmount > 0 && (
                      (!i.discountExpiry) // permanent discount
                      || (i.discountExpiry && !isNaN(Date.parse(i.discountExpiry)) && new Date(i.discountExpiry) > new Date()) // valid future expiry
                    ) ? (
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
        {exchangeSlip && (
          <div className="mt-2 rounded-xl border border-sky-300/30 bg-sky-500/10 px-3 py-2 text-xs space-y-2">
            <div className="flex items-center justify-between text-sky-100">
              <span>Exchange slip</span>
              <span className="font-semibold">#{exchangeSlip.slipNo}</span>
            </div>
            <div className="flex items-center justify-between text-sky-100/90">
              <span>Value</span>
              <span>{formatLKR(slipValue)}</span>
            </div>
            {expiryLabel && (
              <div className="flex items-center justify-between text-[11px] text-sky-100/70">
                <span>Expires</span>
                <span>{expiryLabel}</span>
              </div>
            )}
            {amountDue > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 text-xs font-medium text-yellow-100">
                <span>Still due</span>
                <span>{formatLKR(amountDue)}</span>
              </div>
            )}
            {slipOverage > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-100">
                <span>Over value</span>
                <span>{formatLKR(slipOverage)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={clearExchangeSlip}
              className="w-full rounded-lg border border-white/20 bg-white/10 py-1 text-[11px] text-white/80 hover:bg-white/20"
            >
              Remove slip
            </button>
          </div>
        )}
        <div className="space-y-2">
          <button
            disabled={!items.length || totalAmount <= 0}
            onClick={onPay}
            className="w-full py-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            Pay
          </button>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={onClear} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Clear</button>
            <button onClick={onExchange} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Exchange</button>
            <button onClick={onDamage} className="px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600">Damage</button>
            <button onClick={onHold} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">Hold</button>
          </div>
        </div>
      </div>
    </div>
  );
};


