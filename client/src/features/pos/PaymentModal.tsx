import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { formatLKR } from '@/lib/utils/currency';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { salesApi, PaymentMethod } from '@/lib/api/sales.api';
import { returnsApi } from '@/lib/api/returns.api';
import { lookupCustomerByPhone, createCustomer as createCustomerApi } from '@/lib/api/customers.api';
import type { CreateCustomerData } from '@/lib/api/customers.api';

type CheckoutMethod = Extract<PaymentMethod, 'cash' | 'card'>;
type CardBrand = 'visa' | 'mastercard';

interface PaymentSummary {
  method: string;
  amount: number;
  tendered?: number;
  change?: number;
  cardBrand?: CardBrand | null;
  reference?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (sale: {
    invoiceNo: string;
    id: string;
    method: string;
    customerId?: string | null;
    payments: PaymentSummary[];
  }) => void;
}

export const PaymentModal = ({ open, onClose, onComplete }: Props) => {
  const cartTotal = useCartStore((s) => s.total());
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const exchangeSlip = useCartStore((s) => s.exchangeSlip);
  const customerType = usePosStore((s) => s.customerType);
  const isWholesaleMode = customerType === 'wholesale';
  const [method, setMethod] = useState<CheckoutMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [warrantySelections, setWarrantySelections] = useState<Record<string, { optionName?: string; additionalDays: number; fee: number }[]>>({});
  // Separate panels: existing lookup vs new retail registration
  const [lookupPhone, setLookupPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  // Retail quick capture now supports optional email
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [linkedName, setLinkedName] = useState('');
  const [linkedType, setLinkedType] = useState<string | undefined>(undefined);
  const [saveHover, setSaveHover] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [cardBrand, setCardBrand] = useState<CardBrand | null>(null);
  const cashReceivedNumber = useMemo(() => {
    const cleaned = cashReceived.replace(/,/g, '').trim();
    return cleaned ? Number(cleaned) : 0;
  }, [cashReceived]);
  const slipValue = exchangeSlip?.totalValue ?? 0;
  const amountDue = Math.max(cartTotal - slipValue, 0);
  const slipOverage = Math.max(slipValue - cartTotal, 0);
  const changeDue = amountDue > 0 ? cashReceivedNumber - amountDue : 0;
  const isCashValid = method !== 'cash' || amountDue <= 0 || cashReceivedNumber >= amountDue;
  const requireAdditionalPayment = amountDue > 0;
  const canComplete = requireAdditionalPayment ? (method === 'cash' ? isCashValid : method === 'card' ? Boolean(cardBrand) : true) : Boolean(exchangeSlip);
  const handleMethodSelect = (next: CheckoutMethod) => {
    if (!requireAdditionalPayment) return;
    setMethod(next);
    if (next === 'cash') {
      setCardBrand(null);
    } else {
      setCashReceived('');
    }
  };
  let customerButtonLabel = isWholesaleMode ? 'Save Wholesale Customer' : 'Save Customer';
  if (creatingCustomer) customerButtonLabel = 'Saving...';
  if (customerId) customerButtonLabel = 'Customer Linked';
  const toggleExtendedOption = (cartItemId: string, opt: any) => {
    setWarrantySelections(prev => {
      const list = prev[cartItemId] || [];
      const exists = list.find(l => l.optionName === opt.name);
      const nextList = exists ? list.filter(l => l.optionName !== opt.name) : [...list, { optionName: opt.name, additionalDays: opt.additionalPeriodDays || 0, fee: opt.price || 0 }];
      return { ...prev, [cartItemId]: nextList };
    });
  };
  async function createCustomerIfNeeded(): Promise<string | null> {
    if (customerId || !newName || !newPhone) return customerId;
    setCreatingCustomer(true);
    try {
      // Normalize digits for phone storage
      let digits = newPhone.trim().replace(/\D/g, '');
      if (digits.startsWith('94') && digits.length >= 11) digits = '0' + digits.slice(2);
      try {
        const payload: CreateCustomerData = {
          name: newName,
          phone: digits,
          email: newEmail || '',
          address: { street: '-', city: '-', province: '-', postalCode: '-' },
          type: (customerType as any) || 'retail',
          creditLimit: 0,
          loyaltyPoints: 0,
        };
        const j: any = await createCustomerApi(payload);
        if (j.success) {
          const newId = j.data._id || j.data.id;
          setCustomerId(newId);
          setLinkedName(newName);
          setLinkedType('retail');
          toast.success('Customer saved');
          // Clear quick-capture inputs to avoid confusion
          try { setNewPhone(''); setNewName(''); setNewEmail(''); } catch {}
          // notify others
          try { window.dispatchEvent(new CustomEvent('customers:changed', { detail: { type: 'created', id: newId } })); } catch {}
          try { const bc = (window as any).BroadcastChannel ? new BroadcastChannel('customers') : null; if (bc) { bc.postMessage({ type: 'created', id: newId, ts: Date.now() }); bc.close(); } } catch {}
          try { localStorage.setItem('customers:lastChanged', JSON.stringify({ type: 'created', id: newId, ts: Date.now() })); setTimeout(() => { try { localStorage.removeItem('customers:lastChanged'); } catch {} }, 250); } catch {}
          return newId;
        } else {
          toast.error(j.message || 'Failed to save customer');
          return null;
        }
      } catch (e: any) {
        if (e?.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
        } else {
          toast.error('Customer create error');
        }
        return null;
      }
    } finally { setCreatingCustomer(false); }
  }

  const completeSale = async () => {
    setLoading(true);
    try {
      const payments: Array<{ method: PaymentMethod; amount: number; reference?: string }> = [];
      const paymentSummaries: PaymentSummary[] = [];

      if (exchangeSlip) {
        const appliedAmount = Math.min(slipValue, cartTotal);
        payments.push({
          method: 'exchange_slip' as PaymentMethod,
          amount: appliedAmount,
          reference: exchangeSlip.slipNo,
        });
        paymentSummaries.push({
          method: 'exchange_slip',
          amount: appliedAmount,
          reference: exchangeSlip.slipNo,
        });
      }

      if (requireAdditionalPayment) {
        const payAmount = amountDue;
        payments.push({
          method,
          amount: payAmount,
          ...(method === 'card' && cardBrand ? { reference: cardBrand.toUpperCase() } : {}),
        });
        paymentSummaries.push({
          method,
          amount: payAmount,
          ...(method === 'cash'
            ? { tendered: cashReceivedNumber, change: Math.max(changeDue, 0) }
            : method === 'card'
              ? { cardBrand }
              : {}),
        });
      }

      if (!payments.length) {
        toast.error('No payment method selected');
        return;
      }
      // Auto-create retail customer if name + phone provided but not yet linked
      let customerIdToUse: string | null = customerId;
      if (!customerIdToUse && newName && newPhone) {
        customerIdToUse = await createCustomerIfNeeded();
      }
      const res = await salesApi.create({
        items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })),
        discount,
        payments,
        extendedWarrantySelections: warrantySelections,
        customer: customerIdToUse || undefined,
      });
      const sale = res.data.sale;

      if (exchangeSlip) {
        try {
          await returnsApi.exchangeSlip.redeem(exchangeSlip.slipNo, sale.id);
        } catch (redeemErr: any) {
          const message = redeemErr?.response?.data?.message || 'Exchange slip redemption failed; update manually.';
          toast.error(message);
        }
        if (slipOverage > 0) {
          toast.info(`Exchange slip exceeded total by ${formatLKR(slipOverage)}. Issue new slip or refund.`);
        }
      }

      onComplete({
        invoiceNo: sale.invoiceNo,
        id: sale.id,
        method: requireAdditionalPayment ? method : exchangeSlip ? 'exchange_slip' : method,
        customerId: customerIdToUse,
        payments: paymentSummaries,
      });
      toast.success('Sale completed');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to complete sale';
      if (status === 409) {
        const data = err?.response?.data;
        const pId = data?.data?.productId || data?.productId;
        const avail = data?.data?.available ?? data?.available;
        const name = items.find((i) => i.id === String(pId))?.name;
        const msg409 = name ? `Insufficient stock for ${name}. Available: ${avail ?? 0}.` : 'Insufficient stock for one or more items.';
        toast.error(msg409);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };
  // Build list of cart items that have extended warranty options defined on product (assumes product object carries warranty.extendedOptions)
  const upsellItems = items.filter((i: any) => i.product?.warranty?.enabled && i.product?.warranty?.allowExtendedUpsell && Array.isArray(i.product?.warranty?.extendedOptions) && i.product.warranty.extendedOptions.length > 0);
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
        <div className="opacity-80 mb-2">
          Amount due:&nbsp;
          <span className="font-semibold text-[#F8F8F8]">{formatLKR(amountDue)}</span>
        </div>
        {exchangeSlip && (
          <div className="mb-4 rounded-xl border border-sky-300/30 bg-sky-500/10 px-3 py-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-sky-100/90">
              <span>Sale total</span>
              <span>{formatLKR(cartTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sky-100">
              <span>Exchange slip #{exchangeSlip.slipNo}</span>
              <span>{formatLKR(slipValue)}</span>
            </div>
            <div className="flex items-center justify-between text-sky-100/90">
              <span>Applied now</span>
              <span>{formatLKR(Math.min(slipValue, cartTotal))}</span>
            </div>
            {requireAdditionalPayment && (
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 font-medium text-yellow-100">
                <span>Collect</span>
                <span>{formatLKR(amountDue)}</span>
              </div>
            )}
            {slipOverage > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/20 px-2 py-1 font-medium text-emerald-100">
                <span>Over value</span>
                <span>{formatLKR(slipOverage)}</span>
              </div>
            )}
          </div>
        )}
        {!exchangeSlip && (
          <div className="mb-4 text-xs text-yellow-200">
            Apply an exchange slip from the cart to accept store credit.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleMethodSelect('cash')}
            disabled={!requireAdditionalPayment}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              method === 'cash' && requireAdditionalPayment
                ? 'border-blue-400 bg-white/20 text-white shadow-[0_0_20px_rgba(0,102,255,0.32)]'
                : 'border-white/10 bg-white/10 text-[#F8F8F8] hover:border-blue-300/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span className="relative z-10 block px-6 py-2 font-medium tracking-wide">Cash</span>
            <span
              aria-hidden
              className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                method === 'cash' && requireAdditionalPayment
                  ? 'bg-gradient-to-r from-blue-400/20 via-purple-400/10 to-blue-500/20'
                  : 'bg-gradient-to-r from-blue-400/10 via-purple-400/5 to-blue-500/10'
              }`}
            />
            <span
              aria-hidden
              className={`absolute inset-[-3px] rounded-[18px] blur group-hover:opacity-100 transition-opacity duration-200 ${
                method === 'cash' && requireAdditionalPayment ? 'opacity-100 bg-blue-400/50' : 'opacity-0 bg-blue-400/40'
              }`}
            />
          </button>
          <button
            onClick={() => handleMethodSelect('card')}
            disabled={!requireAdditionalPayment}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              method === 'card' && requireAdditionalPayment
                ? 'border-blue-400 bg-white/20 text-white shadow-[0_0_20px_rgba(0,102,255,0.32)]'
                : 'border-white/10 bg-white/10 text-[#F8F8F8] hover:border-blue-300/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span className="relative z-10 block px-6 py-2 font-medium tracking-wide">Card</span>
            <span
              aria-hidden
              className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                method === 'card' && requireAdditionalPayment
                  ? 'bg-gradient-to-r from-blue-400/20 via-purple-400/10 to-blue-500/20'
                  : 'bg-gradient-to-r from-blue-400/10 via-purple-400/5 to-blue-500/10'
              }`}
            />
            <span
              aria-hidden
              className={`absolute inset-[-3px] rounded-[18px] blur group-hover:opacity-100 transition-opacity duration-200 ${
                method === 'card' && requireAdditionalPayment ? 'opacity-100 bg-blue-400/50' : 'opacity-0 bg-blue-400/40'
              }`}
            />
          </button>
        </div>
        {requireAdditionalPayment && method === 'cash' && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs opacity-80 mb-2">Cash received</div>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm"
              placeholder="Enter amount tendered"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
                <span>Amount due</span>
                <span className="font-semibold">{formatLKR(amountDue)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
                <span>Change</span>
                <span className={`font-semibold ${changeDue >= 0 ? 'text-emerald-300' : 'text-yellow-300'}`}>
                  {changeDue >= 0 ? formatLKR(changeDue) : formatLKR(0)}
                </span>
              </div>
            </div>
            {changeDue < 0 && (
              <div className="text-xs text-yellow-300 mt-2">
                Short by {formatLKR(Math.abs(changeDue))}
              </div>
            )}
          </div>
        )}
        {requireAdditionalPayment && method === 'card' && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs opacity-80 mb-2">Choose card network</div>
            <div className="grid grid-cols-2 gap-3">
              {([['visa', '/visa.png'], ['mastercard', '/mastercard.png']] as Array<[CardBrand, string]>).map(([brand, icon]) => {
                const active = cardBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setCardBrand(brand)}
                    className={`flex flex-col items-center justify-center rounded-xl border px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-yellow-200/70 ${
                      active
                        ? 'border-yellow-400 bg-white/20 text-white shadow-[0_0_15px_rgba(255,225,0,0.25)]'
                        : 'border-white/10 bg-white/5 text-[#F8F8F8] hover:bg-white/10'
                    }`}
                  >
                    <img src={icon} alt={`${brand} logo`} className="h-6 object-contain mb-1" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{brand}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-300/20 px-3 py-2 text-xs text-blue-100">
              {cardBrand
                ? `Ready to scan ${cardBrand.toUpperCase()} card. Ask the customer to tap, swipe, or insert when the terminal prompts.`
                : 'Select the card network, then prompt the customer to tap, swipe, or insert their card.'}
            </div>
          </div>
        )}
        {/* Customer section */}
        <div className="mb-4 space-y-3">
          <div className="text-sm font-semibold opacity-90">Customer</div>
          {/* Existing customer lookup (retail or wholesale) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs opacity-80 mb-2">Existing customer</div>
            <div className="flex gap-2 text-sm items-end">
              <div className="flex-1 space-y-1">
                <label htmlFor="pos-lookup-phone" className="block text-[11px] opacity-70">Phone</label>
                <input id="pos-lookup-phone" value={lookupPhone} onChange={e=>{ setLookupPhone(e.target.value); setLookupError(''); }} placeholder="Enter phone" className="w-full bg-white/10 border border-white/10 rounded-lg px-2 py-1" />
              </div>
              <button
                type="button"
                disabled={!lookupPhone || customerLookupLoading}
                onClick={async ()=>{
                  if(!lookupPhone) return;
                  setCustomerLookupLoading(true);
                  setLookupError('');
                  const raw = lookupPhone.trim();
                  // Normalize: keep digits only, convert leading country code 94 to 0
                  let normalized = raw.replace(/\D/g,'');
                  if(normalized.startsWith('94') && normalized.length >= 11) normalized = '0' + normalized.slice(2);
                  try {
                    const j: any = await lookupCustomerByPhone(normalized);
                    if(j?.success){
                      setCustomerId(j.data._id);
                      setLinkedName(j.data.name||'');
                      setLinkedType(j.data.type);
                      setLookupError('');
                      toast.success('Customer found & linked');
                    } else {
                      setCustomerId(null);
                      setLinkedName('');
                      setLinkedType(undefined);
                      setLookupError('Not found. Use New retail section below');
                    }
                  } catch (e:any) {
                    if(e?.response?.status === 401){
                      setLookupError('Session expired. Please log in again.');
                      window.dispatchEvent(new CustomEvent('auth:token-expired'));
                    } else {
                      setLookupError('Lookup failed');
                    }
                  }
                  finally { setCustomerLookupLoading(false); }
                }}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs"
              >{customerLookupLoading ? 'Searching...' : 'Find'}</button>
            </div>
            <div className="text-xs h-4">
              {customerId && <span className="text-emerald-400">Linked: {linkedName || lookupPhone} {linkedType ? `(${linkedType})` : ''}</span>}
              {!customerId && lookupError && <span className="text-yellow-300">{lookupError}</span>}
            </div>
          </div>

          {/* New retail customer registration */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs opacity-80 mb-2">New {isWholesaleMode ? 'wholesale' : 'retail'} customer</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-1 space-y-1">
                <label htmlFor="pos-new-phone" className="block text-[11px] opacity-70">Phone</label>
                <input id="pos-new-phone" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Enter phone" className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 w-full" />
              </div>
              <div className="col-span-1 space-y-1">
                <label htmlFor="pos-new-name" className="block text-[11px] opacity-70">Name</label>
                <input id="pos-new-name" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Name" className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 w-full" />
              </div>
              <div className="col-span-2 flex items-end">
                <div className="flex-1 mr-2 space-y-1">
                  <label htmlFor="pos-new-email" className="block text-[11px] opacity-70">Email (optional)</label>
                  <input id="pos-new-email" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="customer@example.com" className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 w-full" />
                </div>
                <button
                  type="button"
                  disabled={creatingCustomer || !newPhone || !newName}
                  onClick={async ()=>{ await createCustomerIfNeeded(); }}
                  onMouseEnter={()=>setSaveHover(true)}
                  onMouseLeave={()=>setSaveHover(false)}
                  className="px-3 py-2 rounded disabled:opacity-40 text-xs w-40 transition-colors"
                  style={{ backgroundColor: (!creatingCustomer && newPhone && newName) ? (saveHover ? '#97bde1' : 'rgba(255,255,255,0.10)') : 'rgba(255,255,255,0.10)', color: (!creatingCustomer && newPhone && newName && saveHover) ? '#000' : undefined }}
                >{customerButtonLabel}</button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Cancel</button>
          <button
            disabled={loading || !canComplete}
            onClick={completeSale}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
        {upsellItems.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="text-sm font-semibold mb-2 opacity-90">Extended Warranty Offers</div>
            <div className="space-y-3 max-h-56 overflow-auto pr-1 vz-scroll-gutter pr-fallback scrollbar-hide">
              {upsellItems.map((ci:any) => (
                <div key={ci.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs font-medium mb-1 flex justify-between items-center">
                    <span>{ci.name}</span>
                    <span className="opacity-60">Qty {ci.qty}</span>
                  </div>
                  <div className="grid gap-2">
                    {ci.product.warranty.extendedOptions.map((opt:any, idx:number) => {
                      const selected = (warrantySelections[ci.id]||[]).some(s => s.optionName === opt.name);
                      return (
                        <button type="button" key={`${ci.id}-opt-${idx}`} onClick={() => toggleExtendedOption(ci.id, opt)} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${selected ? 'bg-yellow-300 text-black border-yellow-200' : 'bg-white/10 hover:bg-white/20 border-white/10 text-[#F8F8F8]'}`}>
                          <div className="flex justify-between items-center"><span>{opt.name || `+${opt.additionalPeriodDays}d`}</span><span className="font-semibold">+{formatLKR(opt.price || 0)}</span></div>
                          <div className="opacity-60 mt-0.5">Adds {opt.additionalPeriodDays} days</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


