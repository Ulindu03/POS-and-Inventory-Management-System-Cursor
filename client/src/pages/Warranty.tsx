// This file shows the Warranty page.
// In simple English: It helps users manage and track product warranties in the POS system.
import { AppLayout } from '@/components/common/Layout/Layout';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getAccessToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import {
  Search,
  RefreshCcw,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  X
} from '@/lib/safe-lucide-react';

interface WarrantyItem {
  _id: string;
  warrantyNo: string;
  status: string;
  periodDays?: number;
  endDate?: string;
  productSnapshot?: any;
  customerSnapshot?: any;
  saleSnapshot?: any;
  product?: any;
  customer?: any;
  barcode?: string;
  barcodes?: string[];
}

interface WarrantyClaimItem {
  _id: string;
  claimNo: string;
  status: string;
  issueCategory: string;
  issueDescription: string;
  createdAt: string;
  warrantySnapshot?: any;
  productSnapshot?: any;
  customerSnapshot?: any;
  resolution?: any;
}

const CLAIM_STATUS_CHOICES = [
  { id: 'pending', label: 'Pending', color: 'bg-amber-500/15 text-amber-200 border-amber-400/40', backend: 'open' },
  { id: 'in_progress', label: 'In-Progress', color: 'bg-sky-500/15 text-sky-200 border-sky-400/40', backend: 'repair_in_progress' },
  { id: 'repaired', label: 'Repaired', color: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40', backend: 'resolved' },
  { id: 'repair_failed', label: 'Repair Failed', color: 'bg-rose-500/15 text-rose-200 border-rose-400/40', backend: 'closed' },
  { id: 'not_repairable', label: 'Not Repairable', color: 'bg-zinc-500/20 text-zinc-200 border-zinc-400/40', backend: 'rejected' },
  { id: 'replaced', label: 'Replaced', color: 'bg-purple-500/15 text-purple-200 border-purple-400/40', backend: 'resolved' },
  { id: 'returned', label: 'Returned', color: 'bg-blue-500/15 text-blue-200 border-blue-400/40', backend: 'resolved' }
] as const;

type ClaimStatusBucket = (typeof CLAIM_STATUS_CHOICES)[number]['id'];

const getClaimStatusBucket = (c: WarrantyClaimItem): ClaimStatusBucket => {
  const s = (c.status || '').toString();
  const resType = c.resolution?.type;
  if (['inspection','validation','awaiting_customer','approved','repair_in_progress','replacement_pending'].includes(s)) return 'in_progress';
  if (s === 'rejected') return 'not_repairable';
  if (s === 'resolved' || s === 'closed') {
    if (resType === 'repair') return 'repaired';
    if (resType === 'replace') return 'replaced';
    if (resType === 'refund') return 'returned';
    return 'repaired';
  }
  return 'pending';
};

// Generate a short 4-character claim code from the backend claim number
const getShortClaimCode = (claimNo?: string) => {
  if (!claimNo) return '';
  const clean = claimNo.toString().replace(/[^A-Za-z0-9]/g, '');
  if (!clean) return '';
  return clean.slice(-4).toUpperCase();
};

// A more elegant & user‑friendly Warranty Management UI
const WarrantyPage = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [activating, setActivating] = useState<Record<string, string>>({}); // warrantyId -> serial
  const [error, setError] = useState<string | null>(null);
  const [creatingClaim, setCreatingClaim] = useState<string | null>(null);
  const [claimDesc, setClaimDesc] = useState('');
  const [claimCategory, setClaimCategory] = useState('mechanical');
  const [filters, setFilters] = useState({ invoiceNo:'', phone:'', nic:'', barcode:'' });
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claims, setClaims] = useState<WarrantyClaimItem[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [statusModalClaim, setStatusModalClaim] = useState<WarrantyClaimItem | null>(null);
  const [statusModalStatus, setStatusModalStatus] = useState<ClaimStatusBucket>('pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [claimSearch, setClaimSearch] = useState('');

  const accessToken = useAuthStore((s) => s.accessToken);

  // Derived groupings memoized for performance & readability
  const pending = useMemo(()=>items.filter(w=>w.status==='pending_activation'),[items]);
  const active  = useMemo(()=>items.filter(w=>w.status==='active'),[items]);
  const soonExpiring = useMemo(()=>{
    const now = Date.now();
    const in7 = now + 7*24*3600*1000;
    return active.filter(w=> w.endDate && new Date(w.endDate).getTime() < in7 );
  },[active]);
  const stats = useMemo(()=>({
    total: items.length,
    pending: pending.length,
    active: active.length,
    expiringSoon: soonExpiring.length
  }),[items, pending, active, soonExpiring]);
  const activateWarranty = async (id: string, serial: string) => {
    try {
      const token = accessToken || getAccessToken();
      const r = await fetch(`/api/warranty/${id}/activate`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ serialNumber: serial, userId: 'system' })
      });
      const j = await r.json();
      if(j.success){
        toast.success('Warranty activated');
        setItems(prev=>prev.map(x=>x._id===id?j.data:x));
        window.dispatchEvent(new Event('warranty:updated'));
      } else toast.error(j.message||'Activation failed');
    } catch { toast.error('Activation error'); }
  };
  const loadingRef = useRef(false);

  const devFallback = async () => {
    try {
      const token = accessToken || getAccessToken();
      const d = await fetch('/api/warranty/__dev/diag', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const dj = await d.json();
      if(dj?.success && dj.data?.recent?.length){
        setItems(dj.data.recent.map((r:any)=>({
          _id:r._id||r.id||r.warrantyNo,
          warrantyNo:r.warrantyNo,
          status:r.status,
          periodDays:r.periodDays,
          productSnapshot:r.productSnapshot||{},
          customerSnapshot:r.customerSnapshot||{},
          saleSnapshot:r.saleSnapshot||{},
          endDate:r.endDate
        })));
      }
    } catch {/* ignore */}
  };

  const fetchWarranties = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (filters.invoiceNo) params.append('invoiceNo', filters.invoiceNo.trim());
    if (filters.phone) params.append('phone', filters.phone.trim());
    if (filters.nic) params.append('nic', filters.nic.trim());
    if (filters.barcode) params.append('barcode', filters.barcode.trim());
    const token = accessToken || getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 8000);
    try {
      const res = await fetch(`/api/warranty?${params.toString()}`, { headers: token? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
      const json = await res.json();
      if(json?.success) {
        setItems(json.data.items || []);
        if((!json.data.items || json.data.items.length===0) && !filters.invoiceNo && !filters.phone && !filters.nic && !filters.barcode){ await devFallback(); }
      } else {
        setError(json?.message || 'Failed to load');
      }
    } catch(e:any) {
      if(e?.name==='AbortError') setError('Request timed out'); else setError('Network error');
    } finally { clearTimeout(timeout); setLoading(false); loadingRef.current = false; }
  };
  const fetchClaims = async () => {
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const token = accessToken || getAccessToken();
      const res = await fetch('/api/warranty-claims?page=1&pageSize=50', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json();
      if (json?.success) {
        setClaims(json.data.items || []);
      } else {
        setClaimsError(json?.message || 'Failed to load claims');
      }
    } catch {
      setClaimsError('Network error while loading claims');
    } finally {
      setClaimsLoading(false);
    }
  };

  const filteredClaims = useMemo(() => {
    const query = claimSearch.trim().toLowerCase();
    if (!query) return claims;
    return claims.filter(c => {
      const full = (c.claimNo || '').toLowerCase();
      const shortCode = getShortClaimCode(c.claimNo).toLowerCase();
      return full.includes(query) || shortCode.includes(query);
    });
  }, [claims, claimSearch]);

  const reload = () => {
    fetchWarranties();
    fetchClaims();
  };
  useEffect(() => { fetchWarranties(); fetchClaims(); /* eslint-disable-next-line */ }, []);
  useEffect(()=>{ const h=()=>fetchWarranties(); window.addEventListener('warranty:updated',h); const i=setInterval(h,30000); return ()=>{ window.removeEventListener('warranty:updated',h); clearInterval(i);} },[]);

  const generateClaimSlip = (claim: any, warranty: WarrantyItem, targetWin?: Window | null) => {
    const today = new Date().toLocaleString();
    const shortCode = getShortClaimCode(claim?.claimNo || '');
    const ticketNo = shortCode || claim?.claimNo || '—';
    const productName = claim?.productSnapshot?.name || warranty?.productSnapshot?.name || warranty?.product?.name || 'Product';
    const customerName = claim?.customerSnapshot?.name || warranty?.customerSnapshot?.name || 'Customer';
    const customerPhone = claim?.customerSnapshot?.phone || warranty?.customerSnapshot?.phone || '';
    const warrantyStatus = (warranty?.status || '—').toString().replace(/_/g,' ').toUpperCase();
    const issue = claim?.issueDescription || claimDesc || '—';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Claim Slip ${claim?.claimNo || ''}</title><style>
    body{font-family:Consolas,monospace,Arial,sans-serif;color:#111;background:#f5f5f5;margin:0;padding:12px}
    .slip{width:320px;margin:0 auto;padding:14px 10px;background:#fff;font-size:13px;border:1px dashed #bbb;border-radius:8px;box-shadow:0 0 4px rgba(0,0,0,0.12)}
    .header{text-align:center;margin-bottom:8px}
    .logo{display:block;margin:0 auto 6px auto;height:32px;max-width:120px;object-fit:contain}
    .title{font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
    .subtitle{font-size:11px;opacity:0.7;margin-top:2px}
    .divider{border-top:1px dashed #bbb;margin:8px 0}
    .section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px}
    .row{display:flex;justify-content:space-between;align-items:flex-start;margin:2px 0}
    .label{font-weight:600;margin-right:4px}
    .value{text-align:right;max-width:60%;word-wrap:break-word}
    .box{border:1px solid #eee;padding:6px 8px;border-radius:4px;margin-top:2px;background:#fafafa}
    .terms{font-size:11px;margin-top:10px;line-height:1.4}
    .footer{text-align:center;margin-top:10px;font-size:11px;opacity:0.8}
    </style></head><body><div class="slip">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Store Logo" onerror="this.style.display='none'">
        <div class="title">Claim Slip</div>
        <div class="subtitle">Warranty claim customer copy</div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="section-title">Ticket</div>
        <div class="row"><span class="label">Ticket No</span><span class="value">${ticketNo}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${today}</span></div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="section-title">Customer</div>
        <div class="row"><span class="label">Name</span><span class="value">${customerName}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${customerPhone || '—'}</span></div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="section-title">Product & Warranty</div>
        <div class="row"><span class="label">Product</span><span class="value">${productName}</span></div>
        <div class="row"><span class="label">Warranty No</span><span class="value">${warranty?.warrantyNo || '—'}</span></div>
        <div class="row"><span class="label">Status</span><span class="value">${warrantyStatus}</span></div>
        <div class="row"><span class="label">Coverage Ends</span><span class="value">${warranty?.endDate ? new Date(warranty.endDate).toLocaleDateString() : '—'}</span></div>
      </div>
      <div class="divider"></div>
      <div>
        <div class="section-title">Issue</div>
        <div class="box">${issue}</div>
      </div>
      <div class="divider"></div>
      <div class="terms">
        <div>• Keep this slip to collect your item.</div>
        <div>• The store is not responsible for unclaimed items after 30 days.</div>
      </div>
      <div class="footer">Thank you!</div>
    </div></body></html>`;

    const win = targetWin || window.open('', 'claim-slip', 'width=380,height=600');
    if (!win) {
      toast.error('Popup blocked: allow popups for this site to print slips');
      return;
    }

    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      try {
        win.focus();
      } catch {/* ignore */}
    } catch {
      toast.error('Failed to render claim slip');
    }
  };

  const statusChip = (status:string) => {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide';
    const map: Record<string,string> = {
      pending_activation: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
      active: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
      expired: 'bg-zinc-600/20 text-zinc-300 ring-1 ring-zinc-500/30',
      claimed: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30'
    };
    return <span className={base+ ' ' + (map[status]||'bg-zinc-700/40 text-zinc-300')}>{status.replace('_',' ')}</span>;
  };

  // Skeleton moved outside component

  return (
    <AppLayout className="bg-[#242424]">
      <div className="h-full overflow-auto space-y-6 pb-10 bg-[#242424]">
        {/* Page Header & Filters */}
        <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-[#242424]/90 bg-[#242424] border-b border-white/5 px-2 sm:px-4 py-4 flex flex-col gap-4 shadow-lg">
          <div className="flex items-start gap-3 justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-wide flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-300" />
                <span>Warranty Management</span>
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs opacity-70">
                Track active warranties, create claims, and follow up repairs in one place.
              </p>
            </div>
            <button onClick={reload} className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-end text-xs bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <div className="flex flex-col min-w-[120px]">
                <label htmlFor="flt-invoice" className="mb-1 opacity-70 text-[10px] uppercase tracking-wide">Invoice</label>
                <input
                  id="flt-invoice"
                  placeholder="Invoice #"
                  value={filters.invoiceNo}
                  onChange={e=>setFilters(f=>({...f,invoiceNo:e.target.value}))}
                  className="bg-[#242424] border border-white/15 rounded-lg px-2 py-1.5 w-32 sm:w-40 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                />
              </div>
              <div className="flex flex-col min-w-[140px]">
                <label htmlFor="flt-phone" className="mb-1 opacity-70 text-[10px] uppercase tracking-wide">Phone</label>
                <input
                  id="flt-phone"
                  placeholder="Customer phone"
                  value={filters.phone}
                  onChange={e=>setFilters(f=>({...f,phone:e.target.value}))}
                  className="bg-[#242424] border border-white/15 rounded-lg px-2 py-1.5 w-36 sm:w-44 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                />
              </div>
              <div className="flex flex-col min-w-[120px]">
                <label htmlFor="flt-nic" className="mb-1 opacity-70 text-[10px] uppercase tracking-wide">NIC</label>
                <input
                  id="flt-nic"
                  placeholder="NIC"
                  value={filters.nic}
                  onChange={e=>setFilters(f=>({...f,nic:e.target.value}))}
                  className="bg-[#242424] border border-white/15 rounded-lg px-2 py-1.5 w-32 sm:w-40 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                />
              </div>
              <div className="flex flex-col min-w-[140px]">
                <label htmlFor="flt-barcode" className="mb-1 opacity-70 text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <img src="/scanning.png" alt="" className="w-3 h-3 opacity-70" />
                  Barcode
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="flt-barcode"
                    placeholder="Scan or enter barcode"
                    value={filters.barcode}
                    onChange={e=>setFilters(f=>({...f,barcode:e.target.value}))}
                    className="bg-[#242424] border border-white/15 rounded-lg px-2 py-1.5 w-40 sm:w-48 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40 font-mono"
                  />
                  <button
                    onClick={reload}
                    className="h-8 inline-flex items-center gap-1 px-3 rounded-lg bg-yellow-300 text-black font-medium text-xs shadow hover:shadow-md transition-shadow whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" /> Find
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-auto mt-2 sm:mt-4">
                {(filters.invoiceNo||filters.phone||filters.nic||filters.barcode) && (
                  <button
                    onClick={()=>{setFilters({invoiceNo:'',phone:'',nic:'',barcode:''}); reload();}}
                    className="h-8 text-xs px-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5"/> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <StatCard label="Total" value={stats.total} icon={<Tag className='w-4 h-4' />} />
            <StatCard label="Pending" value={stats.pending} icon={<Clock className='w-4 h-4' />} tone="amber" />
            <StatCard label="Active" value={stats.active} icon={<CheckCircle className='w-4 h-4' />} tone="emerald" />
            <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={<AlertCircle className='w-4 h-4' />} tone="rose" />
          </div>
        </div>

        {/* Body */}
        {error && (
          <div className="mx-1 sm:mx-2 md:mx-0 text-red-400 text-sm flex items-center gap-2 bg-red-500/10 border border-red-400/20 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <button onClick={reload} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 px-1 sm:px-2 md:px-0">
            <Panel title="Pending Activation" subtitle="Newly issued warranties awaiting serial number">
              <Skeleton rows={3} />
            </Panel>
            <Panel title="Active" subtitle="Currently in coverage window">
              <Skeleton rows={3} />
            </Panel>
            <Panel title="All Warranties" subtitle="Full list (latest first)">
              <Skeleton rows={4} />
            </Panel>
          </div>
        )}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 px-1 sm:px-2 md:px-0">
            <Panel title="Pending Activation" subtitle="New warranties awaiting serial" emptyLabel="No pending" count={pending.length}>
              <div className="space-y-3 max-h-80 overflow-auto pr-1 custom-scroll">
                {pending.map(w => (
                  <div key={w._id} className="group border border-white/10 hover:border-yellow-300/40 transition-colors rounded-lg p-3 space-y-2 bg-white/[0.02] hover:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[11px] tracking-wide flex items-center gap-2">
                          {statusChip(w.status)}
                          <span className="text-xs font-mono">{w.warrantyNo}</span>
                        </div>
                        <div className="opacity-60 text-[11px] mt-1">{w.productSnapshot?.name || w.product?.name || 'Product'} · {w.periodDays}d</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Serial number"
                        value={activating[w._id]||''}
                        onChange={(e)=>setActivating(p=>({...p,[w._id]:e.target.value}))}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                      />
                      <button
                        onClick={() => {
                          const serial = activating[w._id];
                          if(!serial) { return; }
                          activateWarranty(w._id, serial);
                        }}
                        className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-medium shadow hover:shadow-md disabled:opacity-40"
                        disabled={!activating[w._id]}
                      >Activate</button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Active" subtitle="In coverage window" emptyLabel="None active" count={active.length}>
              <div className="space-y-3 max-h-80 overflow-auto pr-1 custom-scroll">
                {active.map(w => {
                  const itemBarcode = w.barcode || w.barcodes?.[0] || w.productSnapshot?.barcode || w.saleSnapshot?.items?.[0]?.barcode;
                  return (
                  <div key={w._id} className="border border-white/10 rounded-lg p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors relative group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-[11px] tracking-wide flex items-center gap-2">
                          {statusChip(w.status)}
                          <span className="text-xs font-mono">{w.warrantyNo}</span>
                        </div>
                        <div className="opacity-60 text-[11px]">Item: {w.productSnapshot?.name || w.product?.name || 'Product'}</div>
                        {itemBarcode && (
                          <div className="opacity-70 text-[11px] flex items-center gap-1">
                            <img src="/scanning.png" alt="" className="w-3 h-3 opacity-60" />
                            <span className="font-mono text-emerald-300">{itemBarcode}</span>
                          </div>
                        )}
                        <div className="opacity-60 text-[11px]">Period: {w.periodDays}d</div>
                        <div className="opacity-60 text-[11px]">Ends: {w.endDate?new Date(w.endDate).toLocaleDateString(): '-'}</div>
                      </div>
                      <button onClick={()=>{setCreatingClaim(w._id); setClaimDesc('');}} className="text-[10px] underline opacity-70 hover:opacity-100">Claim</button>
                    </div>
                    {w.endDate && (()=>{ const daysLeft = Math.ceil((new Date(w.endDate).getTime()-Date.now())/86400000); return daysLeft<=7 ? <div className="absolute bottom-1 right-1 text-[10px] text-amber-300 pointer-events-none">{daysLeft>0?daysLeft+'d left':'expiring'}</div> : null; })()}
                  </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="All Warranties" subtitle="Most recent first" emptyLabel="No records" count={items.length}>
              <div className="space-y-2 max-h-80 overflow-auto pr-1 custom-scroll">
                {items.slice().sort((a,b)=> (b.endDate?new Date(b.endDate).getTime():0) - (a.endDate?new Date(a.endDate).getTime():0)).map(w => {
                  const itemBarcode = w.barcode || w.barcodes?.[0] || w.productSnapshot?.barcode || w.saleSnapshot?.items?.[0]?.barcode;
                  return (
                  <div key={w._id} className="flex items-center gap-3 border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono truncate">{w.warrantyNo}</span>
                        {statusChip(w.status)}
                      </div>
                      <div className="opacity-50 text-[10px] mt-1">
                        Item: {w.productSnapshot?.name || w.product?.name || 'Product'}
                        {itemBarcode && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <img src="/scanning.png" alt="" className="w-2.5 h-2.5 opacity-60 inline" />
                            <span className="font-mono text-emerald-300">{itemBarcode}</span>
                          </span>
                        )}
                        <br/>Ends {w.endDate?new Date(w.endDate).toLocaleDateString():'—'}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </Panel>
            {/* Claims panel with status + slip details */}
            <div className="md:col-span-2 xl:col-span-3">
              <Panel
                title="Recent Claims"
                subtitle="Latest warranty claims and their status"
                emptyLabel="No claims yet"
                count={claimsLoading ? undefined : claims.length}
              >
                {claimsLoading ? (
                  <Skeleton rows={3} />
                ) : claimsError ? (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded px-3 py-2">
                    {claimsError}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        placeholder="Search by claim slip #"
                        value={claimSearch}
                        onChange={e => setClaimSearch(e.target.value)}
                        className="flex-1 bg-[#242424] border border-white/15 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                      />
                      {claimSearch && (
                        <button
                          onClick={() => setClaimSearch('')}
                          className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto pr-1 custom-scroll">
                      {filteredClaims.length > 0 ? (
                        <>
                          <div className="flex items-center text-[11px] uppercase tracking-wide opacity-60 bg-[#242424] px-3 py-2 border-b border-white/10 rounded-t-lg">
                            <span className="flex-[1.1]">Ticket</span>
                            <span className="flex-[1.6]">Customer & Product</span>
                            <span className="w-32 text-right">Created</span>
                            <span className="w-24 text-right">Actions</span>
                          </div>
                          {filteredClaims.map(c => {
                            const createdAt = c.createdAt ? new Date(c.createdAt) : null;
                            const createdDate = createdAt ? createdAt.toLocaleDateString() : '';
                            const createdTime = createdAt ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                            const customer = c.customerSnapshot?.name || 'Customer';
                            const product = c.productSnapshot?.name || 'Product';
                            const bucket = getClaimStatusBucket(c);
                            const choice = CLAIM_STATUS_CHOICES.find(x => x.id === bucket) || CLAIM_STATUS_CHOICES[0];
                            const shortCode = getShortClaimCode(c.claimNo) || c.claimNo;

                            return (
                              <div
                                key={c._id}
                                className="border border-white/10 rounded-xl px-3.5 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors flex items-center gap-4"
                              >
                                <div className="flex-[1.1] min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono truncate max-w-[80px]">{shortCode}</span>
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${choice.color}`}>
                                      {choice.label}
                                    </span>
                                  </div>
                                  <div className="text-[11px] opacity-70 mt-1 line-clamp-1">
                                    Issue: {c.issueDescription || '—'}
                                  </div>
                                </div>

                                <div className="flex-[1.6] min-w-0 text-[11px] opacity-80 space-y-0.5">
                                  <div className="truncate">Customer: {customer}</div>
                                  <div className="truncate">Product: {product}</div>
                                </div>

                                <div className="w-32 text-right text-[11px] opacity-70">
                                  <div>{createdDate}</div>
                                  <div>{createdTime}</div>
                                </div>

                                <div className="w-24 text-right">
                                  <button
                                    onClick={() => setStatusModalClaim(c)}
                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-[11px]"
                                  >
                                    Update
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="text-[11px] opacity-60 px-2 py-4 text-center">
                          {claimSearch ? 'No claims found for this slip number.' : 'No claims yet.'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Panel>
            </div>
          </div>
        )}

        {creatingClaim && typeof document !== 'undefined'
          ? createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <button className="absolute inset-0 bg-[#242424]/80 backdrop-blur-sm" onClick={()=>!submittingClaim && setCreatingClaim(null)} />
                <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-5 text-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-base">New Claim</h3>
                    <button onClick={()=>!submittingClaim && setCreatingClaim(null)} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="claim-category" className="text-xs uppercase tracking-wide opacity-70">Issue Category</label>
                      <select id="claim-category" value={claimCategory} onChange={(e)=>setClaimCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40">
                        <option value="mechanical">Mechanical</option>
                        <option value="electrical">Electrical</option>
                        <option value="software">Software</option>
                        <option value="cosmetic">Cosmetic</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="claim-desc" className="text-xs uppercase tracking-wide opacity-70">Description</label>
                      <textarea id="claim-desc" value={claimDesc} onChange={(e)=>setClaimDesc(e.target.value)} rows={4} className="w-full resize-none bg-white/5 border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40" placeholder="Describe the issue in detail" />
                      <div className="text-[10px] opacity-50 text-right">{claimDesc.length}/500</div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button disabled={submittingClaim} onClick={()=>setCreatingClaim(null)} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs disabled:opacity-40">Cancel</button>
                      <button
                        disabled={submittingClaim || claimDesc.trim().length<4}
                        onClick={async ()=>{
                          try {
                            setSubmittingClaim(true);
                            const previewWin = window.open('', 'claim-slip', 'width=380,height=600');
                            if (!previewWin) {
                              toast.error('Popup blocked: allow popups for this site to print slips');
                              setSubmittingClaim(false);
                              return;
                            }

                            const w = items.find(i=>i._id===creatingClaim);
                            if (!w) {
                              setCreatingClaim(null);
                              return;
                            }

                            const payload = {
                              warrantyId: w._id,
                              customerId: String(w.customer),
                              productId: String(w.product),
                              issueCategory: claimCategory,
                              issueDescription: claimDesc.trim(),
                              reportedBy: 'system'
                            };

                            const token = accessToken || getAccessToken?.();
                            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                            if (token) headers.Authorization = `Bearer ${token}`;

                            const r = await fetch('/api/warranty-claims', {
                              method: 'POST',
                              headers,
                              body: JSON.stringify(payload)
                            });
                            const j = await r.json();

                            if (j?.success) {
                              toast.success('Claim created');
                              // Add new claim to recent list so it appears immediately
                              setClaims(prev => [j.data, ...prev]);
                              generateClaimSlip(j.data, w, previewWin);
                              setCreatingClaim(null);
                              setClaimDesc('');
                              setClaimCategory('mechanical');
                            } else {
                              toast.error(j?.message || 'Failed');
                            }
                          } catch {
                            toast.error('Error');
                          } finally {
                            setSubmittingClaim(false);
                          }
                        }}
                        className="px-5 py-1.5 rounded bg-yellow-300 text-black font-medium text-xs inline-flex items-center gap-2 disabled:opacity-40"
                      >{submittingClaim && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} Submit</button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}

        {statusModalClaim && typeof document !== 'undefined'
          ? createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <button className="absolute inset-0 bg-[#242424]/80 backdrop-blur-sm" onClick={()=>!updatingStatus && setStatusModalClaim(null)} />
                <div className="relative w-full max-w-sm bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-5 text-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">Update Claim Status</h3>
                      <div className="mt-1 text-[11px] opacity-70">
                        {getShortClaimCode(statusModalClaim.claimNo) || statusModalClaim.claimNo} · {statusModalClaim.customerSnapshot?.name || 'Customer'}
                      </div>
                    </div>
                    <button onClick={()=>!updatingStatus && setStatusModalClaim(null)} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-[11px] uppercase tracking-wide opacity-70">Status</label>
                      <select
                        value={statusModalStatus}
                        onChange={e=>setStatusModalStatus(e.target.value as ClaimStatusBucket)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                      >
                        {CLAIM_STATUS_CHOICES.map(opt=>(
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[11px] opacity-60 bg-white/5 border border-white/10 rounded px-2 py-1.5">
                      <div className="font-semibold text-[11px] mb-1">Issue</div>
                      <div className="line-clamp-3 break-words">{statusModalClaim.issueDescription}</div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        disabled={updatingStatus}
                        onClick={()=>setStatusModalClaim(null)}
                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={updatingStatus}
                        onClick={async ()=>{
                          if (!statusModalClaim) return;
                          const choice = CLAIM_STATUS_CHOICES.find(x=>x.id===statusModalStatus) || CLAIM_STATUS_CHOICES[0];
                          try {
                            setUpdatingStatus(true);
                            const token = accessToken || getAccessToken();
                            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                            if (token) headers.Authorization = `Bearer ${token}`;
                            const res = await fetch(`/api/warranty-claims/${statusModalClaim._id}/status`, {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({ status: choice.backend })
                            });
                            const json = await res.json();
                            if (json?.success) {
                              toast.success('Claim status updated');
                              setClaims(prev=>prev.map(c=>c._id===statusModalClaim._id ? json.data : c));
                              setStatusModalClaim(null);
                            } else {
                              toast.error(json?.message || 'Failed to update status');
                            }
                          } catch {
                            toast.error('Error updating status');
                          } finally {
                            setUpdatingStatus(false);
                          }
                        }}
                        className="px-5 py-1.5 rounded bg-yellow-300 text-black font-medium text-xs inline-flex items-center gap-2 disabled:opacity-40"
                      >
                        {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    </AppLayout>
  );
};

// Simple stat card component
const StatCard = ({ label, value, icon, tone }: { label:string; value:number; icon:React.ReactNode; tone?:'amber'|'emerald'|'rose'; }) => {
  const palette: Record<string,string> = {
    amber: 'from-amber-400/30 via-amber-400/10 to-transparent border-amber-400/30',
    emerald:'from-emerald-400/30 via-emerald-400/10 to-transparent border-emerald-400/30',
    rose:  'from-rose-400/30 via-rose-400/10 to-transparent border-rose-400/30'
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${tone?palette[tone]:''} p-3 sm:p-4 flex flex-col gap-1 shadow-[0_14px_30px_rgba(0,0,0,0.45)]`}> 
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] uppercase tracking-wide opacity-75">
        <span>{label}</span>
        <span className="opacity-90">{icon}</span>
      </div>
      <div className="text-lg sm:text-xl font-semibold leading-none mt-1">{value}</div>
    </div>
  );
};

// Panel wrapper used for sections
const Panel = ({ title, subtitle, children, emptyLabel, count }: { title:string; subtitle?:string; children:React.ReactNode; emptyLabel?:string; count?:number; }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-black/40 backdrop-blur-sm p-4 sm:p-5 flex flex-col min-h-[260px] shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
    <div className="mb-3 border-b border-white/5 pb-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm sm:text-[15px] tracking-wide flex items-center gap-2">{title}{typeof count==='number' && <span className="text-[10px] font-normal opacity-60">{count}</span>}</h2>
      </div>
      {subtitle && <p className="text-[11px] opacity-60 mt-0.5 leading-snug">{subtitle}</p>}
    </div>
    <div className="flex-1 relative">
      {count===0 && emptyLabel ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40 select-none">{emptyLabel}</div>
      ) : children}
    </div>
  </div>
);

export default WarrantyPage;

// Lightweight skeleton list used during loading states
const Skeleton = ({ rows=3 }:{rows?:number}) => {
  const arr = Array.from({length:rows});
  return (
    <div className="animate-pulse space-y-3">
      {arr.map((_,idx)=>(
        <div key={`sk-${rows}-${idx}`} className="h-14 rounded-lg bg-white/5 border border-white/5" />
      ))}
    </div>
  );
};