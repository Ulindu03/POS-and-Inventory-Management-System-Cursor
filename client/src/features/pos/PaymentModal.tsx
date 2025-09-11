import { useCartStore } from '@/store/cart.store';
import { formatLKR } from '@/lib/utils/currency';
import { useState } from 'react';
import { toast } from 'sonner';
import { salesApi, PaymentMethod } from '@/lib/api/sales.api';
import client from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/token';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (sale: { invoiceNo: string; id: string; method: 'cash' | 'card' | 'digital'; customerId?: string | null }) => void;
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
  const [warrantySelections, setWarrantySelections] = useState<Record<string, { optionName?: string; additionalDays: number; fee: number }[]>>({});
  // Separate panels: existing lookup vs new retail registration
  const [lookupPhone, setLookupPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  // Retail quick capture requires only name + phone
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [linkedName, setLinkedName] = useState('');
  const [linkedType, setLinkedType] = useState<string | undefined>(undefined);
  const [saveHover, setSaveHover] = useState(false);
  let customerButtonLabel = 'Save Customer';
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
  async function createRetailCustomerIfNeeded(): Promise<string | null> {
    if (customerId || !newName || !newPhone) return customerId;
    setCreatingCustomer(true);
    try {
      const token = getAccessToken();
      // Normalize digits for phone storage
      let digits = newPhone.trim().replace(/\D/g, '');
      if (digits.startsWith('94') && digits.length >= 11) digits = '0' + digits.slice(2);
      try {
        const resp = await client.post('/customers', {
          name: newName,
          phone: digits,
          email: `${digits}@temp.local`,
          address: { street: '-', city: '-', province: '-', postalCode: '-' },
          type: 'retail',
          creditLimit: 0,
          loyaltyPoints: 0,
        }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const j: any = resp.data;
        if (j.success) {
          const newId = j.data._id;
          setCustomerId(newId);
          setLinkedName(newName);
          setLinkedType('retail');
          toast.success('Customer saved');
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
        if (e?.response?.status === 401) toast.error('Unauthorized: login required'); else toast.error('Customer create error');
        return null;
      }
    } finally { setCreatingCustomer(false); }
  }

  const completeSale = async () => {
    setLoading(true);
    try {
      const paid = payments.length ? payments : [{ method, amount: total }];
      // Auto-create retail customer if name + phone provided but not yet linked
      let customerIdToUse: string | null = customerId;
      if (!customerIdToUse && newName && newPhone) {
        customerIdToUse = await createRetailCustomerIfNeeded();
      }
      const res = await salesApi.create({
        items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })),
        discount,
        payments: paid,
        discountCode: promo || undefined,
        extendedWarrantySelections: warrantySelections,
        customer: customerIdToUse || undefined,
      });
      const sale = res.data.sale;
      onComplete({ invoiceNo: sale.invoiceNo, id: sale.id, method: paid[0].method as any, customerId: customerIdToUse });
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
      return;
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
                    const token = getAccessToken();
                    try {
                      const resp = await client.get('/customers/lookup/phone', { params: { phone: normalized }, headers: token ? { Authorization: `Bearer ${token}` } : {} });
                      const j: any = resp.data;
                      if(j.success){
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
                    } catch (e:any){
                      if(e?.response?.status === 401){
                        setLookupError('Unauthorized: please login again');
                      } else {
                        setLookupError('Lookup failed');
                      }
                    }
                  } catch { setLookupError('Unexpected error'); }
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
            <div className="text-xs opacity-80 mb-2">New retail customer</div>
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
                <button
                  type="button"
                  disabled={creatingCustomer || !newPhone || !newName}
                  onClick={async ()=>{ await createRetailCustomerIfNeeded(); }}
                  onMouseEnter={()=>setSaveHover(true)}
                  onMouseLeave={()=>setSaveHover(false)}
                  className="px-3 py-2 rounded disabled:opacity-40 text-xs w-full transition-colors"
                  style={{ backgroundColor: (!creatingCustomer && newPhone && newName) ? (saveHover ? '#97bde1' : 'rgba(255,255,255,0.10)') : 'rgba(255,255,255,0.10)', color: (!creatingCustomer && newPhone && newName && saveHover) ? '#000' : undefined }}
                >{customerButtonLabel}</button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Cancel</button>
          <button disabled={loading} onClick={completeSale} className="px-4 py-2 rounded-xl font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}>{loading ? 'Processing...' : 'Complete Sale'}</button>
        </div>
        {upsellItems.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="text-sm font-semibold mb-2 opacity-90">Extended Warranty Offers</div>
            <div className="space-y-3 max-h-56 overflow-auto pr-1">
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


