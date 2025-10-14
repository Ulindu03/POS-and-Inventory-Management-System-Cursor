import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { formatLKR } from '@/lib/utils/currency';
import { useState } from 'react';
import { toast } from 'sonner';
import { salesApi, PaymentMethod } from '@/lib/api/sales.api';
import client from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/token';

type CheckoutMethod = Extract<PaymentMethod, 'cash' | 'card'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (sale: { invoiceNo: string; id: string; method: CheckoutMethod; customerId?: string | null }) => void;
}

export const PaymentModal = ({ open, onClose, onComplete }: Props) => {
  const total = useCartStore((s) => s.total());
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
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
      const token = getAccessToken();
      // Normalize digits for phone storage
      let digits = newPhone.trim().replace(/\D/g, '');
      if (digits.startsWith('94') && digits.length >= 11) digits = '0' + digits.slice(2);
      try {
        const resp = await client.post('/customers', {
          name: newName,
          phone: digits,
          ...(newEmail ? { email: newEmail } : {}),
          address: { street: '-', city: '-', province: '-', postalCode: '-' },
            type: customerType,
          creditLimit: 0,
          loyaltyPoints: 0,
        }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const j: any = resp.data;
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
        if (e?.response?.status === 401) toast.error('Unauthorized: login required'); else toast.error('Customer create error');
        return null;
      }
    } finally { setCreatingCustomer(false); }
  }

  const completeSale = async () => {
    setLoading(true);
    try {
  const paid: Array<{ method: PaymentMethod; amount: number }> = [{ method, amount: total }];
      // Auto-create retail customer if name + phone provided but not yet linked
      let customerIdToUse: string | null = customerId;
      if (!customerIdToUse && newName && newPhone) {
        customerIdToUse = await createCustomerIfNeeded();
      }
      const res = await salesApi.create({
        items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })),
        discount,
  payments: paid,
        extendedWarrantySelections: warrantySelections,
        customer: customerIdToUse || undefined,
      });
      const sale = res.data.sale;
  onComplete({ invoiceNo: sale.invoiceNo, id: sale.id, method, customerId: customerIdToUse });
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
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setMethod('cash')}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
              method === 'cash'
                ? 'border-blue-400 bg-white/20 text-white shadow-[0_0_20px_rgba(0,102,255,0.32)]'
                : 'border-white/10 bg-white/10 text-[#F8F8F8] hover:border-blue-300/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span className="relative z-10 block px-6 py-2 font-medium tracking-wide">Cash</span>
            <span
              aria-hidden
              className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                method === 'cash'
                  ? 'bg-gradient-to-r from-blue-400/20 via-purple-400/10 to-blue-500/20'
                  : 'bg-gradient-to-r from-blue-400/10 via-purple-400/5 to-blue-500/10'
              }`}
            />
            <span
              aria-hidden
              className={`absolute inset-[-3px] rounded-[18px] blur group-hover:opacity-100 transition-opacity duration-200 ${
                method === 'cash' ? 'opacity-100 bg-blue-400/50' : 'opacity-0 bg-blue-400/40'
              }`}
            />
          </button>
          <button
            onClick={() => setMethod('card')}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
              method === 'card'
                ? 'border-blue-400 bg-white/20 text-white shadow-[0_0_20px_rgba(0,102,255,0.32)]'
                : 'border-white/10 bg-white/10 text-[#F8F8F8] hover:border-blue-300/60 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span className="relative z-10 block px-6 py-2 font-medium tracking-wide">Card</span>
            <span
              aria-hidden
              className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                method === 'card'
                  ? 'bg-gradient-to-r from-blue-400/20 via-purple-400/10 to-blue-500/20'
                  : 'bg-gradient-to-r from-blue-400/10 via-purple-400/5 to-blue-500/10'
              }`}
            />
            <span
              aria-hidden
              className={`absolute inset-[-3px] rounded-[18px] blur group-hover:opacity-100 transition-opacity duration-200 ${
                method === 'card' ? 'opacity-100 bg-blue-400/50' : 'opacity-0 bg-blue-400/40'
              }`}
            />
          </button>
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
          <button disabled={loading} onClick={completeSale} className="px-4 py-2 rounded-xl font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}>{loading ? 'Processing...' : 'Complete Sale'}</button>
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


